const express = require("express");
const {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
} = require("../controllers/cart.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// All cart routes are protected
router.use(protect);

// Lab 05 Task 3: Get current user cart
router.get("/", getCart);

// Lab 05 Task 2: Add product to cart
router.post("/:productId", addToCart);

// Lab 05 Task 4: Update product quantity
router.patch("/:productId", updateCartQuantity);

// Lab 05 Task 5: Remove product from cart
router.delete("/:productId", removeFromCart);

module.exports = router;
