const mongoose = require("mongoose");
const Product = require("../models/product.model");

/**
 * @desc    Task 2: Create a new product
 * @route   POST /products
 * @access  Public
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    // Validation 1: All required fields must be present and not empty
    if (
      name === undefined ||
      name === null ||
      String(name).trim() === "" ||
      description === undefined ||
      description === null ||
      String(description).trim() === "" ||
      price === undefined ||
      price === null ||
      category === undefined ||
      category === null ||
      String(category).trim() === "" ||
      image === undefined ||
      image === null ||
      String(image).trim() === "" ||
      stock === undefined ||
      stock === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields. name, description, price, category, image, and stock are mandatory.",
      });
    }

    // Validation 2: Price must be a valid number and greater than 0
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid price. Price must be a positive number greater than 0.",
      });
    }

    // Validation 3: Stock must be a valid number and cannot be negative
    const numericStock = Number(stock);
    if (isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock. Stock cannot be negative.",
      });
    }

    // Create product in database
    const newProduct = await Product.create({
      name: String(name).trim(),
      description: String(description).trim(),
      price: numericPrice,
      category: String(category).trim(),
      image: String(image).trim(),
      stock: numericStock,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating product",
    });
  }
};

/**
 * @desc    Task 3 & 5 & Bonus: Get all products with dynamic search, category filtering & sorting
 * @route   GET /products
 * @query   search (string), category (string), sort (price_asc | price_desc | newest)
 * @access  Public
 */
const getAllProducts = async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    // Dynamic MongoDB Query builder
    const query = {};

    // Task 5: Search filter on product name (case-insensitive)
    if (search && search.trim() !== "") {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    // Task 5: Category filter (case-insensitive exact match, skip if 'all')
    if (category && category.trim() !== "" && category.toLowerCase() !== "all") {
      query.category = { $regex: `^${category.trim()}$`, $options: "i" };
    }

    // Bonus Challenge: Sorting by query parameters
    let sortOptions = { createdAt: -1 }; // default: newest first
    if (sort === "price_asc") {
      sortOptions = { price: 1 };
    } else if (sort === "price_desc") {
      sortOptions = { price: -1 };
    } else if (sort === "newest") {
      sortOptions = { createdAt: -1 };
    }

    // Execute query
    const products = await Product.find(query).sort(sortOptions);

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching products",
    });
  }
};

/**
 * @desc    Task 4: Get single product by MongoDB ID
 * @route   GET /products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Failure Case 1: Invalid MongoDB ObjectId format -> 400
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    // Failure Case 2: Product not found -> 404
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching product",
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
};
