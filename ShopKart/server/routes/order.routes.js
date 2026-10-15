const express = require("express");
const {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/order.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// All order routes are protected by auth middleware
router.use(protect);

// Lab 06 Task 4: Create ShopKart & Razorpay payment order
router.post("/create-payment-order", createPaymentOrder);

// Lab 06 Step 11 & 12: Verify Razorpay signature & place order
router.post("/verify-payment", verifyPayment);

// Lab 06 Task 7: Get current user's orders
router.get("/", getMyOrders);

// Lab 06 Task 17: Get single order details
router.get("/:id", getOrderById);

// Lab 06 Bonus: Update order status progression
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
