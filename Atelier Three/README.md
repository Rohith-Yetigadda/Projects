# ATELIER THREE // STUDIO COMMERCE

> **Architectural MERN E-Commerce Platform inspired by Future Three Studio, featuring Lenis Smooth Momentum Scrolling, Warm Stone Editorial Design System, and Cryptographic Razorpay Verification.**
> *(ShopKart Full-Stack Lab Trimester Submission)*

[![MERN Stack](https://img.shields.io/badge/Stack-MongoDB%20%7C%20Express%20%7C%20React%20%7C%20Node-black?style=for-the-badge&logo=mongodb)](https://github.com)
[![Vite](https://img.shields.io/badge/Bundler-Vite%208.3-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![Lenis Scroll](https://img.shields.io/badge/Scroll-Lenis%20Smooth%20Momentum-f12a2d?style=for-the-badge)](https://lenis.darkroom.engineering/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20HMAC%20SHA--256-0C2340?style=for-the-badge&logo=razorpay)](https://razorpay.com/)

---

## 🏛️ Design Language & Manifesto

**Atelier Three** rejects generic, cookie-cutter e-commerce templates in favor of an **authentic editorial, architectural studio aesthetic** directly inspired by [Future Three Studio](https://www.futurethree.studio/).

* **Kinetic Momentum Scrolling:** Powered by **Lenis**, delivering silky, inertial 60fps wheel and touch dynamics across all catalog views.
* **Studio Palette:** Warm off-white stone canvas (`#f1f1f1`), deep off-black architectural ink (`#242021`), hairline borders (`rgba(36, 32, 33, 0.12)`), and vivid signal red accents (`#f12a2d`).
* **Editorial Typography:**
  * **Headers:** Condensed bold sans typography (`THE BEST OF THREE`) paired with Italianate serif italics (`Playfair Display` for `/Catalogue`).
  * **Studio Technical Meta:** `JetBrains Mono` for index badges (`[ 01 ]`), prices, live timestamps, and order tracking.
  * **Body:** Clean contemporary sans (`Plus Jakarta Sans`).
* **Live Studio Telemetry:** Real-time IST studio clock, active order ticker marquee, tactile interactive hover states, and live stock synchronisation.

---

## 📦 Project Architecture & Labs Overview

Atelier Three implements the complete 6-phase Full-Stack curriculum:

```
Atelier Three/
├── server/                         # Express.js & MongoDB Atlas REST API
│   ├── config/                     # Database & Razorpay configurations
│   ├── controllers/                # Business logic (Auth, Catalog, Wishlist, Cart, Orders)
│   ├── middlewares/                # HttpOnly JWT Authentication & Input Validation
│   ├── models/                     # Mongoose Schemas (Customer, Product, Order)
│   ├── routes/                     # Modular Express Router bindings
│   ├── utils/                      # Response formatters & signature validators
│   ├── seed-products.js            # Catalog seeding utility
│   ├── test-e2e-labs.js            # Automated 18-step E2E integration test suite
│   ├── package.json                # Dependencies (express, mongoose, bcrypt, jwt, razorpay)
│   └── .env.example                # Sanitized environment template
│
├── client/                         # React 19 + Vite Studio Client
│   ├── public/                     # Static assets & favicon
│   ├── src/
│   │   ├── components/             # Navbar (with live clock), ProductCard, SearchBar, etc.
│   │   ├── context/                # CartContext (Wishlist & Cart state with live backend sync)
│   │   ├── pages/                  # Home, Products, ProductDetails, Wishlist, Cart, Checkout, Orders, OrderSuccess, Login, Register
│   │   ├── services/               # Axios API client configured with withCredentials: true
│   │   ├── App.jsx                 # Main router with Lenis momentum scroll initialization
│   │   ├── index.css               # Future Three architectural CSS design system
│   │   └── main.jsx                # React root bootstrap
│   ├── index.html                  # Studio font imports & metadata
│   ├── vite.config.js              # Vite configuration with API proxy support & HTML route bypass
│   └── package.json                # Dependencies (react 19, react-router-dom, lenis, lucide-react)
│
├── .gitignore                      # Clean gitignore excluding node_modules, dist, and .env
└── README.md                       # Master documentation & setup guide
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
* **MongoDB Atlas** connection URI (or local MongoDB daemon)
* (Optional) **Razorpay** test keys for payment simulation

---

### 2. Server Setup (Backend)
1. Navigate to the backend directory:
   ```bash
   cd "Atelier Three/server"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your MongoDB Atlas URI and JWT secret:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopkart?retryWrites=true&w=majority
   JWT_SECRET=super_secure_jwt_secret_key_shopkart_2026
   RAZORPAY_KEY_ID=rzp_test_your_id
   RAZORPAY_KEY_SECRET=your_secret
   ```
4. (Optional) Seed the catalog with initial objects:
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
1. Open a new terminal and navigate to the client directory:
   ```bash
   cd "Atelier Three/client"
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
   http://localhost:5174
   ```

---

## 🔒 Security & Cryptographic Verifications

* **HttpOnly JWT Cookie Storage:** Tokens are stored exclusively in HttpOnly cookies, completely eliminating client-side XSS token exfiltration risks.
* **Password Hashing:** Passwords are salted and hashed using `bcryptjs` with a cost factor of 10 prior to database persistence.
* **Server-Side Price Calculation:** Checkout totals are calculated on the server from active database product prices, preventing DevTools client-side price tampering.
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

### Authentication (`/customers`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/customers/register` | Public | Register new customer account |
| `POST` | `/customers/login` | Public | Validate credentials & set HttpOnly JWT cookie |
| `POST` | `/customers/logout` | Authenticated | Invalidate HttpOnly cookie |
| `GET` | `/customers/me` | Authenticated | Retrieve authenticated user profile |

### Object Catalog (`/products`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Public | Fetch catalog with optional `?category=` and `?search=` |
| `GET` | `/products/:id` | Public | Fetch detailed specifications for single item |
| `POST` | `/products` | Public/Admin | Create new catalog item |

### Saved Objects (`/wishlist`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/wishlist` | Authenticated | Retrieve customer's saved items (populated) |
| `POST` | `/wishlist/:productId` | Authenticated | Add item to customer wishlist |
| `DELETE` | `/wishlist/:productId` | Authenticated | Remove item from customer wishlist |
| `POST` | `/wishlist/toggle/:productId` | Authenticated | Atomic toggle wishlist status |

### Shopping Bag (`/cart`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Authenticated | Retrieve current cart items & computed total |
| `POST` | `/cart` | Authenticated | Add item to cart with stock validation |
| `PUT` | `/cart/:productId` | Authenticated | Update item quantity in cart |
| `DELETE` | `/cart/:productId` | Authenticated | Remove specific item from cart |
| `DELETE` | `/cart` | Authenticated | Clear all items from cart |

### Orders & Payments (`/orders`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/orders/create-payment` | Authenticated | Validate cart, check stock, create Razorpay Order |
| `POST` | `/orders/verify-payment` | Authenticated | Verify HMAC SHA-256 signature, mark PAID, decrement stock |
| `GET` | `/orders/my-orders` | Authenticated | Retrieve customer's historical order ledger |
| `GET` | `/orders/:orderId` | Authenticated | Retrieve single order invoice snapshot |
| `PATCH` | `/orders/:orderId/status` | Authenticated | Advance status progression (`PLACED` -> `CONFIRMED` -> `SHIPPED` -> `DELIVERED`) |

---

## 🧪 Automated Testing

The backend includes a standalone integration runner:
```bash
cd server
node test-e2e-labs.js
```
Runs **18 automated integration tests** covering registration, login, catalog retrieval, wishlist CRUD, cart stock limits, order creation, signature verification, and delivery progression with 100% pass rate.
