const express = require("express");
const {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  logoutCustomer,
  changePassword,
} = require("../controllers/customer.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// Task 1: Public Registration Route
router.post("/register", registerCustomer);

// Task 2: Public Login Route
router.post("/login", loginCustomer);

// Task 3: Protected Profile Route
router.get("/me", protect, getCustomerProfile);

// Task 4: Protected Logout Route
router.post("/logout", protect, logoutCustomer);

// Bonus Challenge: Protected Change Password Route
router.patch("/change-password", protect, changePassword);

module.exports = router;
