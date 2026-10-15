const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

/**
 * Helper to fetch populated cart for response
 */
const getPopulatedCart = async (userId) => {
  const user = await Customer.findById(userId).populate({
    path: "cart.product",
    select: "name price category image stock",
  });
  // Filter out any items whose product reference no longer exists
  if (!user || !user.cart) return [];
  return user.cart.filter((item) => item.product !== null);
};

/**
 * Lab 05 — Task 2: Add Product to Cart
 * @route   POST /cart/:productId
 * @access  Private
 */
const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "This product is currently out of stock",
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.cart) user.cart = [];

    const existingItemIndex = user.cart.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      const nextQuantity = user.cart[existingItemIndex].quantity + 1;
      if (nextQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot exceed available stock of ${product.stock} units`,
        });
      }
      user.cart[existingItemIndex].quantity = nextQuantity;
    } else {
      user.cart.push({
        product: productId,
        quantity: 1,
      });
    }

    await user.save();

    const populatedCart = await getPopulatedCart(user._id);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: populatedCart,
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding to cart",
      error: error.message,
    });
  }
};

/**
 * Lab 05 — Task 3: Get Current User's Cart
 * @route   GET /cart
 * @access  Private
 */
const getCart = async (req, res) => {
  try {
    const populatedCart = await getPopulatedCart(req.user._id);

    return res.status(200).json({
      success: true,
      cart: populatedCart,
    });
  } catch (error) {
    console.error("Get Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching cart",
      error: error.message,
    });
  }
};

/**
 * Lab 05 — Task 4: Update Product Quantity
 * @route   PATCH /cart/:productId
 * @access  Private
 */
const updateCartQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    if (quantity === undefined || typeof quantity !== "number" || isNaN(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid number",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Quantity exceeds available stock of ${product.stock} units`,
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.cart) user.cart = [];

    const itemIndex = user.cart.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    user.cart[itemIndex].quantity = quantity;
    await user.save();

    const populatedCart = await getPopulatedCart(user._id);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: populatedCart,
    });
  } catch (error) {
    console.error("Update Cart Quantity Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating cart quantity",
      error: error.message,
    });
  }
};

/**
 * Lab 05 — Task 5: Remove Product from Cart
 * @route   DELETE /cart/:productId
 * @access  Private
 */
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.cart) user.cart = [];

    const itemIndex = user.cart.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    user.cart.splice(itemIndex, 1);
    await user.save();

    const populatedCart = await getPopulatedCart(user._id);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: populatedCart,
    });
  } catch (error) {
    console.error("Remove from Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while removing from cart",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
};
