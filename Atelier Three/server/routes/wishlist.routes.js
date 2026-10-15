const express = require("express");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
} = require("../controllers/wishlist.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// All wishlist routes are protected by auth middleware
router.use(protect);

// Lab 04 Task 3: Get current user's wishlist
router.get("/", getWishlist);

// Lab 04 Task 2: Add product to wishlist
router.post("/:productId", addToWishlist);

// Lab 04 Task 4: Remove product from wishlist
router.delete("/:productId", removeFromWishlist);

// Lab 04 Bonus: Toggle wishlist item
router.patch("/:productId/toggle", toggleWishlist);

module.exports = router;
