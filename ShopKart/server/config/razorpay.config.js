const Razorpay = require("razorpay");

const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key_id";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_placeholder_secret";

let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id,
    key_secret,
  });
} catch (err) {
  console.warn("Razorpay initialization warning:", err.message);
}

module.exports = {
  razorpay: razorpayInstance,
  key_id,
  key_secret,
};
