# SHOPKART STUDIO EDITION // ISSUE NO. 04

> **Architectural MERN E-Commerce Platform with Lenis Smooth Momentum Scrolling, High-Contrast Obsidian Design System, and Cryptographic Payment Verification.**

[![MERN Stack](https://img.shields.io/badge/Stack-MongoDB%20%7C%20Express%20%7C%20React%20%7C%20Node-black?style=for-the-badge&logo=mongodb)](https://github.com)
[![Vite](https://img.shields.io/badge/Bundler-Vite%208.3-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![Lenis Scroll](https://img.shields.io/badge/Scroll-Lenis%20Smooth%20Momentum-f12a2d?style=for-the-badge)](https://lenis.darkroom.engineering/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20HMAC%20SHA--256-0C2340?style=for-the-badge&logo=razorpay)](https://razorpay.com/)

---

## 🏛️ Design Language & Manifesto

ShopKart Studio Edition rejects standard, generic "AI-slop" e-commerce layouts in favor of an **editorial, architectural, and brutalist-minimalist studio aesthetic** inspired by [Future Three Studio](https://www.futurethree.studio/).

* **Kinetic Momentum Scrolling:** Powered by **Lenis**, delivering silky, inertial 60fps wheel and touch dynamics.
* **Palette:** Deep obsidian canvas (`#09090b`), elevated surfaces (`#101014`), crisp hairline architectural borders (`rgba(255,255,255,0.08)`), and vivid signal red accents (`#f12a2d`).
* **Studio Typography:** `Syne` (800) for display headers, `Space Grotesk` (700) for section titles, `JetBrains Mono` for index numbers (`[ 01 ]`), prices, timestamps, and order statuses, and `Plus Jakarta Sans` for body text.
* **Live Studio Telemetry:** Real-time IST studio clock, active order ticker tape marquee, tactile interactive states, and live stock synchronisation.

---

## 📦 Project Architecture & Labs Overview

ShopKart represents a complete 6-phase Full-Stack curriculum implementation:

```
ShopKart/
├── server/                         # Express.js & MongoDB Atlas REST API
│   ├── config/                      # Database & Razorpay configurations
│   ├── controllers/                 # Business logic (Auth, Catalog, Wishlist, Cart, Orders)
│   ├── middlewares/                 # HttpOnly JWT Authentication & Input Validation
│   ├── models/                      # Mongoose Schemas (Customer, Product, Order)
│   ├── routes/                      # Modular Express Router bindings
│   ├── utils/                       # Response formatters & signature validators
│   ├── seed-products.js             # Catalog seeding utility
│   ├── test-e2e-labs.js             # Automated 18-step E2E integration test suite
│   ├── package.json                 # Backend dependencies (express, mongoose, bcrypt, jwt, razorpay)
│   └── .env.example                 # Sanitized environment template
│
├── client/                        # React 19 + Vite Studio Client
│   ├── public/                      # Static assets & favicon
│   ├── src/
│   │   ├── components/              # Navbar (with live clock), ProductCard, SearchBar, etc.
│   │   ├── context/                 # CartContext (Wishlist & Cart state with live backend sync)
│   │   ├── pages/                   # Home, Products, ProductDetails, Wishlist, Cart, Checkout, Orders, OrderSuccess, Login, Register
│   │   ├── services/                # Axios API client configured with withCredentials: true
│   │   ├── App.jsx                  # Main router with Lenis momentum scroll initialization
│   │   ├── index.css                # FutureThree architectural CSS design system
│   │   └── main.jsx                 # React root bootstrap
│   ├── index.html                   # Studio font imports (Syne, Space Grotesk, JetBrains Mono)
│   ├── vite.config.js               # Vite configuration with API proxy support
│   └── package.json                 # Frontend dependencies (react 19, react-router-dom, lenis, lucide-react)
│
├── .gitignore                       # Clean gitignore excluding node_modules, dist, and .env
└── README.md                        # Documentation & setup instructions
```

### Curriculum Matrix
| Phase | Milestone | Core Implementation |
| :--- | :--- | :--- |
| **Lab 01** | **Customer Authentication** | Signup, Bcrypt hashing, HttpOnly JWT cookies, strict session verification |
| **Lab 02** | **Frontend Foundation** | React SPA router, Protected routes, HttpOnly cookie credential forwarding |
| **Lab 03** | **Hardware Catalog** | MongoDB Product model, Dynamic category shelf, search filter, responsive cards |
| **Lab 04** | **Saved Objects (Wishlist)** | Customer embedded ObjectId wishlist array, toggle API, optimistic UI badges |
| **Lab 05** | **Shopping Bag (Cart)** | Subdocument cart schema, real-time stock boundary checks, live subtotal computation |
| **Lab 06** | **Checkout & Payments** | Shipping form validation, Razorpay Order creation, HMAC SHA-256 signature verification, historical order snapshots |

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
* **Node.js** v18.0.0 or higher
* **npm** v9.0.0 or higher
* **MongoDB Atlas** cluster URI (or local MongoDB daemon)
* (Optional) **Razorpay** test keys for live payment popup simulation

---

### 2. Server Setup (Backend)
1. Navigate to the backend directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your MongoDB Atlas connection string and JWT secret:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopkart?retryWrites=true&w=majority
   JWT_SECRET=super_secure_jwt_secret_key_shopkart_2026
   RAZORPAY_KEY_ID=rzp_test_your_id
   RAZORPAY_KEY_SECRET=your_secret
   ```
4. (Optional) Seed the hardware catalog:
   ```bash
   node seed-products.js
   ```
5. Start the backend server:
   ```bash
   npm run dev
   # or
   node index.js
   ```
   Server will boot on `http://localhost:5000`.

---

### 3. Client Setup (Frontend)
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 🔒 Security & Cryptographic Verifications

* **HttpOnly JWT Cookie Storage:** Tokens are never stored in `localStorage` or `sessionStorage`, preventing client-side Cross-Site Scripting (XSS) token theft.
* **Password Hashing:** Passwords are salted and hashed using `bcryptjs` with a cost factor of 10 prior to persistence.
* **Server-Side Price Calculation:** Checkout totals are calculated exclusively on the server from active database product prices, preventing DevTools client-side price tampering.
* **Cryptographic HMAC SHA-256 Signature Verification:**
  ```javascript
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  ```
  Payment confirmation strictly requires matching cryptographic digest from Razorpay servers.

---

## 📡 REST API Reference

### Authentication (`/api/customers`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/customers/register` | Public | Register new customer account |
| `POST` | `/api/customers/login` | Public | Validate credentials & set HttpOnly JWT cookie |
| `POST` | `/api/customers/logout` | Authenticated | Invalidate HttpOnly cookie |
| `GET` | `/api/customers/me` | Authenticated | Retrieve authenticated user profile |

### Hardware Catalog (`/api/products`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | Fetch catalog with optional `?category=` and `?search=` |
| `GET` | `/api/products/:id` | Public | Fetch detailed specifications for single item |
| `POST` | `/api/products` | Public/Admin | Create new product catalog item |

### Saved Objects (`/api/wishlist`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/wishlist` | Authenticated | Retrieve customer's saved items (populated) |
| `POST` | `/api/wishlist/:productId` | Authenticated | Add item to customer wishlist |
| `DELETE` | `/api/wishlist/:productId` | Authenticated | Remove item from customer wishlist |
| `POST` | `/api/wishlist/toggle/:productId` | Authenticated | Atomic toggle wishlist status |

### Shopping Bag (`/api/cart`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Authenticated | Retrieve current cart items & computed total |
| `POST` | `/api/cart` | Authenticated | Add item to cart with stock validation |
| `PUT` | `/api/cart/:productId` | Authenticated | Update item quantity in cart |
| `DELETE` | `/api/cart/:productId` | Authenticated | Remove specific item from cart |
| `DELETE` | `/api/cart` | Authenticated | Clear all items from cart |

### Orders & Payments (`/api/orders`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders/create-payment` | Authenticated | Validate cart, check stock, create Razorpay Order |
| `POST` | `/api/orders/verify-payment` | Authenticated | Verify HMAC SHA-256 signature, mark PAID, decrement stock |
| `GET` | `/api/orders/my-orders` | Authenticated | Retrieve customer's historical order ledger |
| `GET` | `/api/orders/:orderId` | Authenticated | Retrieve single order invoice snapshot |
| `PATCH` | `/api/orders/:orderId/status` | Authenticated | Advance status progression (`PLACED` -> `CONFIRMED` -> `SHIPPED` -> `DELIVERED`) |

---

## 🧪 Automated Testing

The backend includes a standalone integration runner:
```bash
cd server
node test-e2e-labs.js
```
Runs **18 automated integration tests** covering registration, login, catalog retrieval, wishlist CRUD, cart stock limits, order creation, signature verification, and delivery progression with 100% pass rate.

---
