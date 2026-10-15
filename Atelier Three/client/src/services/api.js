import axios from "axios";

/**
 * Axios instance configured for ShopKart API communication.
 * 
 * Key configuration:
 * - baseURL: Uses relative path by default to leverage Vite proxy,
 *   or custom API URL defined in environment variables.
 * - withCredentials: true ensures the browser automatically sends and receives
 *   HttpOnly cookies (e.g., the 'token' cookie) across all requests.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Task 1: Register Customer
 * @route POST /customers/register
 * @param {Object} data - { fullName, email, password, phone }
 */
export const registerCustomer = async (data) => {
  const response = await api.post("/customers/register", data);
  return response.data;
};

/**
 * Task 2: Customer Login
 * @route POST /customers/login
 * @param {Object} credentials - { email, password }
 */
export const loginCustomer = async (credentials) => {
  const response = await api.post("/customers/login", credentials);
  return response.data;
};

/**
 * Task 3: Fetch Current Authenticated Customer Profile
 * @route GET /customers/me
 */
export const getCustomerProfile = async () => {
  const response = await api.get("/customers/me");
  return response.data;
};

/**
 * Task 4: Logout Customer (Clears HttpOnly Cookie)
 * @route POST /customers/logout
 */
export const logoutCustomer = async () => {
  const response = await api.post("/customers/logout");
  return response.data;
};

/**
 * Task 3 & 5 & Bonus: Fetch all products with optional search, category, and sort parameters
 * @route GET /products
 * @param {Object} params - { search, category, sort }
 */
export const getProducts = async (params = {}) => {
  // Clean empty params so query string stays clean
  const cleanParams = {};
  if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
  if (params.category && params.category !== "All" && params.category.trim()) {
    cleanParams.category = params.category.trim();
  }
  if (params.sort && params.sort.trim()) cleanParams.sort = params.sort.trim();

  const response = await api.get("/products", { params: cleanParams });
  return response.data;
};

/**
 * Task 4 & 8: Fetch single product details by MongoDB ID
 * @route GET /products/:id
 * @param {string} id - MongoDB ObjectId
 */
export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

/**
 * Task 2: Create a new product (admin / open catalog insertion)
 * @route POST /products
 * @param {Object} productData - { name, description, price, category, image, stock }
 */
export const createProduct = async (productData) => {
  const response = await api.post("/products", productData);
  return response.data;
};

// ==========================================
// LAB 04: WISHLIST APIS
// ==========================================

/**
 * Get current user's wishlist
 * @route GET /wishlist
 */
export const getWishlist = async () => {
  const response = await api.get("/wishlist");
  return response.data;
};

/**
 * Add product to wishlist
 * @route POST /wishlist/:productId
 */
export const addToWishlist = async (productId) => {
  const response = await api.post(`/wishlist/${productId}`);
  return response.data;
};

/**
 * Remove product from wishlist
 * @route DELETE /wishlist/:productId
 */
export const removeFromWishlist = async (productId) => {
  const response = await api.delete(`/wishlist/${productId}`);
  return response.data;
};

/**
 * Bonus: Toggle product in wishlist
 * @route PATCH /wishlist/:productId/toggle
 */
export const toggleWishlist = async (productId) => {
  const response = await api.patch(`/wishlist/${productId}/toggle`);
  return response.data;
};

// ==========================================
// LAB 05: CART APIS
// ==========================================

/**
 * Get current user's cart
 * @route GET /cart
 */
export const getCart = async () => {
  const response = await api.get("/cart");
  return response.data;
};

/**
 * Add product to cart (or increment quantity by 1)
 * @route POST /cart/:productId
 */
export const addToCart = async (productId) => {
  const response = await api.post(`/cart/${productId}`);
  return response.data;
};

/**
 * Update quantity of a product in cart
 * @route PATCH /cart/:productId
 * @param {string} productId
 * @param {number} quantity
 */
export const updateCartQuantity = async (productId, quantity) => {
  const response = await api.patch(`/cart/${productId}`, { quantity });
  return response.data;
};

/**
 * Remove product from cart
 * @route DELETE /cart/:productId
 */
export const removeFromCart = async (productId) => {
  const response = await api.delete(`/cart/${productId}`);
  return response.data;
};

// ==========================================
// LAB 06: ORDERS & PAYMENT APIS
// ==========================================

/**
 * Create ShopKart pending order and Razorpay order
 * @route POST /orders/create-payment-order
 * @param {Object} shippingAddress - { fullName, phone, addressLine1, city, state, pincode }
 */
export const createPaymentOrder = async (shippingAddress) => {
  const response = await api.post("/orders/create-payment-order", {
    shippingAddress,
  });
  return response.data;
};

/**
 * Verify Razorpay payment signature and confirm order
 * @route POST /orders/verify-payment
 * @param {Object} paymentData - { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPayment = async (paymentData) => {
  const response = await api.post("/orders/verify-payment", paymentData);
  return response.data;
};

/**
 * Fetch all orders for current user
 * @route GET /orders
 */
export const getMyOrders = async () => {
  const response = await api.get("/orders");
  return response.data;
};

/**
 * Fetch single order by ID
 * @route GET /orders/:id
 */
export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

/**
 * Bonus: Update order progression status
 * @route PATCH /orders/:id/status
 */
export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`/orders/${id}/status`, { status });
  return response.data;
};

export default api;
