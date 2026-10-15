const express = require("express");
const {
  createProduct,
  getAllProducts,
  getProductById,
} = require("../controllers/product.controller");

const router = express.Router();

// Task 2: Create Product API
router.post("/", createProduct);

// Task 3 & 5 & Bonus: Get All Products (supports ?search=..., ?category=..., ?sort=...)
router.get("/", getAllProducts);

// Task 4: Get Single Product API
router.get("/:id", getProductById);

module.exports = router;
