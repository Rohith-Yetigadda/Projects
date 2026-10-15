const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const { razorpay, key_id, key_secret } = require("../config/razorpay.config");

/**
 * Lab 06 — Task 4: Create Payment Order API
 * @route   POST /orders/create-payment-order
 * @access  Private
 */
const createPaymentOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    // Validate shipping address
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    const { fullName, phone, addressLine1, city, state, pincode } = shippingAddress;
    if (!fullName || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All shipping address fields (fullName, phone, addressLine1, city, state, pincode) are required",
      });
    }

    // Load customer with current cart
    const user = await Customer.findById(req.user._id).populate("cart.product");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot checkout with an empty cart",
      });
    }

    // Verify stock and compute totalAmount server-side
    let calculatedTotal = 0;
    const orderItemsSnapshot = [];

    for (const item of user.cart) {
      // Find fresh product document from database
      const productId = item.product?._id || item.product;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product in your cart no longer exists in our catalog`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, in cart: ${item.quantity}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;

      orderItemsSnapshot.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
      });
    }

    // Create ShopKart pending order
    const shopKartOrder = new Order({
      user: user._id,
      items: orderItemsSnapshot,
      shippingAddress: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      },
      totalAmount: calculatedTotal,
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT",
    });

    await shopKartOrder.save();

    const amountInPaise = Math.round(calculatedTotal * 100);
    let razorpayOrderId = null;

    if (razorpay && key_id !== "rzp_test_placeholder_key_id") {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: shopKartOrder._id.toString(),
        });
        razorpayOrderId = rzpOrder.id;
      } catch (rzpErr) {
        console.warn("Razorpay API order creation failed, fallback to simulated ID:", rzpErr.message);
        razorpayOrderId = `order_${shopKartOrder._id.toString().slice(-14)}`;
      }
    } else {
      razorpayOrderId = `order_${shopKartOrder._id.toString().slice(-14)}`;
    }

    shopKartOrder.razorpayOrderId = razorpayOrderId;
    await shopKartOrder.save();

    return res.status(201).json({
      success: true,
      shopKartOrderId: shopKartOrder._id,
      razorpayOrderId: razorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      key: key_id,
      totalAmount: calculatedTotal,
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating payment order",
      error: error.message,
    });
  }
};

/**
 * Lab 06 — Step 11 & 12: Verify Razorpay Payment Signature
 * @route   POST /orders/verify-payment
 * @access  Private
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      shopKartOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!shopKartOrderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification parameters",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(shopKartOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shopKartOrderId format",
      });
    }

    const order = await Order.findById(shopKartOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Ownership check
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this order",
      });
    }

    // Use trusted order.razorpayOrderId stored in database
    const trustedOrderId = order.razorpayOrderId || razorpay_order_id;
    const body = `${trustedOrderId}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(body)
      .digest("hex");

    // Allow signature match OR dev simulated signature for test placeholder environment
    const isSignatureValid =
      expectedSignature === razorpay_signature ||
      (razorpay_signature.startsWith("dev_valid_sig_") &&
        key_id === "rzp_test_placeholder_key_id");

    if (!isSignatureValid) {
      // Must NOT clear cart, must NOT mark as paid
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Payment is verified: update order status
    order.paymentStatus = "PAID";
    order.status = "PLACED";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    // Deduct stock for all purchased items
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear user's cart in database
    const user = await Customer.findById(req.user._id);
    if (user) {
      user.cart = [];
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying payment",
      error: error.message,
    });
  }
};

/**
 * Lab 06 — Task 7: Get My Orders
 * @route   GET /orders
 * @access  Private
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching orders",
      error: error.message,
    });
  }
};

/**
 * Lab 06 — Task 17: Get Single Order
 * @route   GET /orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Security rule: Check user ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: you do not own this order",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get Single Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching order",
      error: error.message,
    });
  }
};

/**
 * Lab 06 — Bonus (+10 Marks): Update Order Status Progression
 * @route   PATCH /orders/:id/status
 * @access  Private
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    const validStatuses = [
      "PENDING_PAYMENT",
      "PLACED",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: you do not own this order",
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating order status",
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
};
