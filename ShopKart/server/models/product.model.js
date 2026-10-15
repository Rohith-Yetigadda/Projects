const mongoose = require("mongoose");

/**
 * Product Schema
 * Represents products catalog items in the ShopKart e-commerce ecosystem.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0.01, "Price must be greater than 0"],
      validate: {
        validator: function (value) {
          return typeof value === "number" && value > 0;
        },
        message: "Price must be greater than 0",
      },
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Product stock is required"],
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: function (value) {
          return typeof value === "number" && value >= 0;
        },
        message: "Stock cannot be negative",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
