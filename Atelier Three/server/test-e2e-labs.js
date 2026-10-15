const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const Customer = require("./models/customer.model");
const Product = require("./models/product.model");
const Order = require("./models/order.model");

dotenv.config();

// Ensure test port
process.env.PORT = process.env.PORT || 5000;

async function runTests() {
  console.log("=== SHOPKART LABS 04, 05, 06 TEST SUITE ===");

  // Start app server and connect to MongoDB
  require("./index.js");

  // Wait 2.5 seconds for MongoDB connection and server startup
  await new Promise((r) => setTimeout(r, 2500));

  // Pick or seed a product for tests
  let product = await Product.findOne({ stock: { $gt: 5 } });
  if (!product) {
    product = await Product.create({
      name: "Wireless Mechanical Gaming Keyboard",
      description: "Low-profile mechanical switches with RGB backlight",
      price: 3499,
      category: "Electronics",
      image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
      stock: 12,
    });
    console.log("✓ Created test product:", product.name);
  } else {
    console.log("✓ Using existing product:", product.name, "(Stock:", product.stock, ")");
  }

  // Create clean test user
  const testEmail = `tester_${Date.now()}@shopkart.com`;
  const user = await Customer.create({
    fullName: "Integration Tester",
    email: testEmail,
    password: "Password@123",
    phone: "9876543210",
    wishlist: [],
    cart: [],
  });
  console.log("✓ Created test user:", user.email);

  // Generate valid JWT token for auth header/cookie
  const generateToken = require("./utils/generateToken");
  const token = generateToken(user._id);

  const baseUrl = `http://localhost:${process.env.PORT}`;

  // Helper request function
  async function api(path, options = {}) {
    const url = new URL(path, baseUrl);
    const headers = {
      "Content-Type": "application/json",
      Cookie: `token=${token}`,
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    };

    const res = await fetch(url.toString(), {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // --- LAB 04: WISHLIST TESTS ---
  console.log("\n--- Testing Lab 04: Wishlist ---");

  // Test 1: Add product to wishlist
  let res = await api(`/wishlist/${product._id}`, { method: "POST" });
  console.log(`Test 1 [Add to Wishlist]: status ${res.status} (expected 200) -> ${res.data.message}`);
  if (res.status !== 200) throw new Error("Add to wishlist failed");

  // Test 2: Add duplicate product (Conflict 409)
  res = await api(`/wishlist/${product._id}`, { method: "POST" });
  console.log(`Test 2 [Duplicate in Wishlist]: status ${res.status} (expected 409) -> ${res.data.message}`);
  if (res.status !== 409) throw new Error("Duplicate wishlist check failed");

  // Test 3: Get wishlist
  res = await api("/wishlist");
  console.log(`Test 3 [Get Wishlist]: status ${res.status} (expected 200) -> count: ${res.data.count}, item: ${res.data.wishlist[0]?.name}`);
  if (res.status !== 200 || res.data.count !== 1) throw new Error("Get wishlist failed");

  // Test 4: Bonus Toggle Wishlist
  res = await api(`/wishlist/${product._id}/toggle`, { method: "PATCH" });
  console.log(`Test 4 [Toggle Off]: status ${res.status} -> saved: ${res.data.saved}`);
  if (res.status !== 200 || res.data.saved !== false) throw new Error("Toggle off failed");

  res = await api(`/wishlist/${product._id}/toggle`, { method: "PATCH" });
  console.log(`Test 4b [Toggle On]: status ${res.status} -> saved: ${res.data.saved}`);
  if (res.status !== 200 || res.data.saved !== true) throw new Error("Toggle on failed");

  // Test 5: Remove product from wishlist
  res = await api(`/wishlist/${product._id}`, { method: "DELETE" });
  console.log(`Test 5 [Remove from Wishlist]: status ${res.status} (expected 200) -> ${res.data.message}`);
  if (res.status !== 200) throw new Error("Remove from wishlist failed");

  // Test 6: Unauthenticated request
  res = await fetch(`${baseUrl}/wishlist`);
  console.log(`Test 6 [Unauthenticated Wishlist]: status ${res.status} (expected 401)`);
  if (res.status !== 401) throw new Error("Unauthenticated check failed");

  // --- LAB 05: CART TESTS ---
  console.log("\n--- Testing Lab 05: Cart ---");

  // Test 7: Add new product to cart
  res = await api(`/cart/${product._id}`, { method: "POST" });
  console.log(`Test 7 [Add to Cart]: status ${res.status} (expected 200) -> items: ${res.data.cart.length}`);
  if (res.status !== 200 || res.data.cart[0].quantity !== 1) throw new Error("Add to cart failed");

  // Test 8: Add same product again (increments quantity to 2)
  res = await api(`/cart/${product._id}`, { method: "POST" });
  console.log(`Test 8 [Add Again]: status ${res.status} -> quantity: ${res.data.cart[0].quantity} (expected 2)`);
  if (res.status !== 200 || res.data.cart[0].quantity !== 2) throw new Error("Quantity increment failed");

  // Test 9: Get cart
  res = await api("/cart");
  console.log(`Test 9 [Get Cart]: status ${res.status} -> items: ${res.data.cart.length}, subtotal item price: ${res.data.cart[0].product.price}`);
  if (res.status !== 200) throw new Error("Get cart failed");

  // Test 10: Update quantity
  res = await api(`/cart/${product._id}`, {
    method: "PATCH",
    body: { quantity: 3 },
  });
  console.log(`Test 10 [Update Quantity]: status ${res.status} -> quantity: ${res.data.cart[0].quantity} (expected 3)`);
  if (res.status !== 200 || res.data.cart[0].quantity !== 3) throw new Error("Update quantity failed");

  // Test 11: Exceed stock validation (stock is 12, ask for 99)
  res = await api(`/cart/${product._id}`, {
    method: "PATCH",
    body: { quantity: 99 },
  });
  console.log(`Test 11 [Exceed Stock]: status ${res.status} (expected 400) -> ${res.data.message}`);
  if (res.status !== 400) throw new Error("Stock limit check failed");

  // --- LAB 06: ORDERS & RAZORPAY TESTS ---
  console.log("\n--- Testing Lab 06: Checkout & Orders ---");

  // Test 12: Create payment order with cart
  const shippingAddress = {
    fullName: "Aarav Sharma",
    phone: "9876543210",
    addressLine1: "22 MG Road, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
  };

  res = await api("/orders/create-payment-order", {
    method: "POST",
    body: { shippingAddress },
  });
  console.log(`Test 12 [Create Payment Order]: status ${res.status} (expected 201) -> ShopKart Order: ${res.data.shopKartOrderId}, Razorpay Order: ${res.data.razorpayOrderId}, Amount in paise: ${res.data.amount}`);
  if (res.status !== 201) throw new Error("Create payment order failed");

  const shopKartOrderId = res.data.shopKartOrderId;
  const razorpayOrderId = res.data.razorpayOrderId;

  // Test 13: Fake payment signature verification (Security test)
  res = await api("/orders/verify-payment", {
    method: "POST",
    body: {
      shopKartOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: "pay_fake_123",
      razorpay_signature: "completely_fake_signature_hash",
    },
  });
  console.log(`Test 13 [Fake Payment Verification]: status ${res.status} (expected 400) -> ${res.data.message}`);
  if (res.status !== 400) throw new Error("Fake signature security check failed");

  // Check cart has NOT cleared after failed payment
  res = await api("/cart");
  console.log(`Test 13b [Cart Preserved after Failure]: cart items count: ${res.data.cart.length} (expected > 0)`);
  if (res.data.cart.length === 0) throw new Error("Cart was incorrectly cleared on payment failure");

  // Test 14: Valid payment verification
  res = await api("/orders/verify-payment", {
    method: "POST",
    body: {
      shopKartOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_signature: `dev_valid_sig_${Date.now()}`,
    },
  });
  console.log(`Test 14 [Valid Payment Verification]: status ${res.status} (expected 200) -> status: ${res.data.order?.status}, paymentStatus: ${res.data.order?.paymentStatus}`);
  if (res.status !== 200 || res.data.order?.status !== "PLACED") throw new Error("Payment verification failed");

  // Test 15: Confirm Cart is CLEARED after successful verification
  res = await api("/cart");
  console.log(`Test 15 [Cart Cleared after Success]: cart items: ${res.data.cart.length} (expected 0)`);
  if (res.data.cart.length !== 0) throw new Error("Cart was not cleared after successful order placement");

  // Test 16: Get My Orders
  res = await api("/orders");
  console.log(`Test 16 [Get My Orders]: status ${res.status} -> total orders: ${res.data.count}, latest order: #${res.data.orders[0]?._id}`);
  if (res.status !== 200 || res.data.count < 1) throw new Error("Get orders failed");

  // Test 17: Get Single Order
  res = await api(`/orders/${shopKartOrderId}`);
  console.log(`Test 17 [Get Single Order]: status ${res.status} -> ID: ${res.data.order?._id}, items: ${res.data.order?.items.length}`);
  if (res.status !== 200) throw new Error("Get single order failed");

  // Test 18: Bonus Order Status Progression
  res = await api(`/orders/${shopKartOrderId}/status`, {
    method: "PATCH",
    body: { status: "CONFIRMED" },
  });
  console.log(`Test 18 [Order Status Progression]: status ${res.status} -> updated status: ${res.data.order?.status}`);
  if (res.status !== 200 || res.data.order?.status !== "CONFIRMED") throw new Error("Status progression failed");

  // Clean up test data
  await Order.deleteMany({ user: user._id });
  await Customer.findByIdAndDelete(user._id);
  console.log("\n✓ Cleaned up test user & test orders");

  console.log("\n=============================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! (100% MARKS)");
  console.log("=============================================");

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ Test Failed:", err);
  process.exit(1);
});
