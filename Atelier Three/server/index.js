const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

const customerRoutes = require("./routes/customer.routes");
const productRoutes = require("./routes/product.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");

const app = express();

// CORS Middleware (enables credentialed requests from frontend)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Body Parser Middleware (parses incoming JSON payloads)
app.use(express.json());

// Cookie Parser Middleware (parses cookies attached to the client request)
app.use(cookieParser());

// Base Route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to ShopKart Customer Authentication API",
    status: "API is active",
  });
});

// Mount Customer Routes at /customers
app.use("/customers", customerRoutes);

// Mount Product Routes at /products
app.use("/products", productRoutes);

// Mount Wishlist Routes at /wishlist (Lab 04)
app.use("/wishlist", wishlistRoutes);

// Mount Cart Routes at /cart (Lab 05)
app.use("/cart", cartRoutes);

// Mount Order Routes at /orders (Lab 06)
app.use("/orders", orderRoutes);

// 404 Not Found Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });

module.exports = app;
