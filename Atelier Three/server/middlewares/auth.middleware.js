const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");

/**
 * Authentication Middleware
 * Protects private routes by verifying the JWT stored in the HttpOnly cookie.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Read JWT token from cookies (HttpOnly cookie: 'token')
    let token = req.cookies ? req.cookies.token : null;


    // 2. If token is missing, reject request
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    // 3. Verify the token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find the customer in MongoDB (exclude password field)
    const customer = await Customer.findById(decoded.id).select("-password");

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Customer does not exist",
      });
    }

    // 5. Attach the authenticated customer object to req.user
    req.user = customer;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

module.exports = { protect };
