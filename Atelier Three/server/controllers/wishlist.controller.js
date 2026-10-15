const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

/**
 * Lab 04 — Task 2: Add Product to Wishlist
 * @route   POST /wishlist/:productId
 * @access  Private
 */
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Verify product exists in catalog
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Load authenticated customer
    const user = await Customer.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Ensure wishlist array is initialized
    if (!user.wishlist) {
      user.wishlist = [];
    }

    // Check for duplicate in wishlist
    const isAlreadyWishlisted = user.wishlist.some(
      (id) => id.toString() === productId.toString()
    );

    if (isAlreadyWishlisted) {
      return res.status(409).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    // Add product reference to wishlist
    user.wishlist.push(productId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
    });
  } catch (error) {
    console.error("Add to Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding to wishlist",
      error: error.message,
    });
  }
};

/**
 * Lab 04 — Task 3: Get Current User's Wishlist
 * @route   GET /wishlist
 * @access  Private
 */
const getWishlist = async (req, res) => {
  try {
    const user = await Customer.findById(req.user._id).populate({
      path: "wishlist",
      select: "name price category image stock description",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wishlistItems = user.wishlist || [];

    return res.status(200).json({
      success: true,
      count: wishlistItems.length,
      wishlist: wishlistItems,
    });
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching wishlist",
      error: error.message,
    });
  }
};

/**
 * Lab 04 — Task 4: Remove Product from Wishlist
 * @route   DELETE /wishlist/:productId
 * @access  Private
 */
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
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

    // Check if product is present in user's wishlist
    const itemIndex = user.wishlist.findIndex(
      (id) => id.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in wishlist",
      });
    }

    // Remove the product from wishlist
    user.wishlist.splice(itemIndex, 1);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error) {
    console.error("Remove from Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while removing from wishlist",
      error: error.message,
    });
  }
};

/**
 * Lab 04 — Bonus: Toggle Wishlist Action (+10 Marks)
 * @route   PATCH /wishlist/:productId/toggle
 * @access  Private
 */
const toggleWishlist = async (req, res) => {
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

    if (!user.wishlist) user.wishlist = [];

    const itemIndex = user.wishlist.findIndex(
      (id) => id.toString() === productId.toString()
    );

    if (itemIndex > -1) {
      // Remove
      user.wishlist.splice(itemIndex, 1);
      await user.save();
      return res.status(200).json({
        success: true,
        saved: false,
        message: "Product removed from wishlist",
      });
    } else {
      // Check product existence before adding
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      user.wishlist.push(productId);
      await user.save();
      return res.status(200).json({
        success: true,
        saved: true,
        message: "Product added to wishlist",
      });
    }
  } catch (error) {
    console.error("Toggle Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while toggling wishlist",
      error: error.message,
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
};
