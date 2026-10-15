const Customer = require("../models/customer.model");
const generateToken = require("../utils/generateToken");

/**
 * @desc    Task 1: Register a new customer
 * @route   POST /customers/register
 * @access  Public
 */
const registerCustomer = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // Validation 1: All fields are mandatory
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields (fullName, email, password, phone) are required",
      });
    }

    // Validation 2: Password must contain at least 6 characters
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    // Validation 3: Check if email already exists
    const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Create new customer (password will be automatically hashed via pre-save hook)
    const customer = await Customer.create({
      fullName,
      email: email.toLowerCase(),
      password,
      phone,
    });

    // Return success response with customer details (excluding password)
    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

/**
 * @desc    Task 2: Authenticate customer & get token via HttpOnly cookie
 * @route   POST /customers/login
 * @access  Public
 */
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation: Check for email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find customer by email
    const customer = await Customer.findOne({ email: email.toLowerCase() });

    // Verify customer exists and password matches
    // Note: Do NOT reveal whether email or password was incorrect (security best practice)
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = generateToken(customer._id);

    // Cookie configuration: HttpOnly cookie
    const cookieOptions = {
      httpOnly: true, // Inaccessible to client-side JavaScript (prevents XSS attacks)
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Mitigates CSRF attacks
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    };

    // Store JWT inside HttpOnly cookie
    res.cookie("token", token, cookieOptions);

    // Return success response with customer info (excluding password)
    return res.status(200).json({
      success: true,
      message: "Login successful",
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

/**
 * @desc    Task 3: Get current authenticated customer profile
 * @route   GET /customers/me
 * @access  Private (Protected by auth middleware)
 */
const getCustomerProfile = async (req, res) => {
  try {
    // req.user was attached by auth middleware (password already excluded)
    return res.status(200).json({
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
    });
  } catch (error) {
    console.error("Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile",
      error: error.message,
    });
  }
};

/**
 * @desc    Task 4: Logout customer (Clear HttpOnly cookie)
 * @route   POST /customers/logout
 * @access  Private (Protected)
 */
const logoutCustomer = async (req, res) => {
  try {
    // Clear the authentication cookie
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0), // Set expiration date to the past to immediately expire
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during logout",
      error: error.message,
    });
  }
};

/**
 * @desc    Bonus Challenge: Change customer password
 * @route   PATCH /customers/change-password
 * @access  Private (Protected)
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both oldPassword and newPassword are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Find the customer from database including the password field
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Verify old password
    const isMatch = await customer.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect old password",
      });
    }

    // Update password (pre-save hook will hash the new password)
    customer.password = newPassword;
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error changing password",
      error: error.message,
    });
  }
};

module.exports = {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  logoutCustomer,
  changePassword,
};
