const jwt = require("jsonwebtoken");

/**
 * Generates a signed JSON Web Token (JWT)
 * @param {string} customerId - MongoDB _id of the customer
 * @returns {string} Signed JWT token
 */
const generateToken = (customerId) => {
  return jwt.sign(
    { id: customerId },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d", // Token valid for 1 day (24 hours)
    }
  );
};

module.exports = generateToken;
