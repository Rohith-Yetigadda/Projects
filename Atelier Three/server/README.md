# Atelier Three — Backend Core Service (ShopKart Lab 01)

## 📌 Project Overview
A secure, production-ready Customer Authentication REST API backend built for **ShopKart** following the **MVC (Model-View-Controller)** architecture using **Node.js, Express.js, MongoDB, Mongoose, bcryptjs, jsonwebtoken**, and **cookie-parser**.

---

## 📁 Project Structure (MVC Architecture)

```text
Lab 01/
│
├── controllers/
│   └── customer.controller.js     # Business logic for all customer routes
│
├── models/
│   └── customer.model.js          # Mongoose schema, validation & bcrypt hashing hooks
│
├── routes/
│   └── customer.routes.js         # API route definitions and middleware bindings
│
├── middlewares/
│   └── auth.middleware.js         # JWT cookie verification & route protection
│
├── utils/
│   └── generateToken.js           # Helper to sign JSON Web Tokens
│
├── .env                           # Environment configurations
├── index.js                       # Express app entry point & DB connection
├── package.json                   # Project dependencies and npm scripts
├── test-suite.js                  # Automated test verification suite
└── ShopKart_Auth.postman_collection.json # Ready-to-import Postman collection
```

---

## 🚀 How to Run the Project

1. **Open Terminal** in the `Lab 01` directory:
   ```bash
   cd "c:\Users\ADMIN\OneDrive\Desktop\New folder\MERN\Lab\Lab 01"
   ```

2. **Install Dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the Server**:
   ```bash
   npm start
   # Or for development with automatic restart:
   npm run dev
   ```

4. **Run the Automated Test Suite**:
   ```bash
   node test-suite.js
   ```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Protected | Description | Status Code |
|:---|:---|:---:|:---|:---:|
| `POST` | `/customers/register` | ❌ | Register a new customer | `201 Created` / `400` / `409` |
| `POST` | `/customers/login` | ❌ | Authenticate & set HttpOnly cookie | `200 OK` / `401 Unauthorized` |
| `GET` | `/customers/me` | ✅ | Get profile of logged-in customer | `200 OK` / `401 Unauthorized` |
| `PATCH` | `/customers/change-password` | ✅ | **Bonus (+10 Marks):** Change password | `200 OK` / `400` / `401` |
| `POST` | `/customers/logout` | ✅ | Clear HttpOnly authentication cookie | `200 OK` |

---

## 🧪 Postman Testing Instructions

1. Open **Postman**.
2. Click **Import** (top-left) and select `ShopKart_Auth.postman_collection.json`.
3. Test in the following sequence:
   - **Step 1:** Run `1. Register Customer (Success 201)`.
   - **Step 2:** Run `2. Register - Missing Field (Validation 400)`.
   - **Step 3:** Run `3. Register - Duplicate Email (Conflict 409)`.
   - **Step 4:** Run `4. Login Customer (Success 200 + HttpOnly Cookie)`. Postman automatically saves the cookie.
   - **Step 5:** Run `6. Get My Profile (Protected 200)`.
   - **Step 6:** Run `7. Change Password - Bonus Challenge (Protected 200)`.
   - **Step 7:** Run `8. Logout (Protected 200 + Cookie Cleared)`.
   - **Step 8:** Run `9. Profile After Logout (Unauthorized 401)` — confirms cookie was invalidated.

---

## 🎓 TA Viva Questions & Answers (Compulsory for Marks)

### Q1: Why do we use bcrypt instead of encrypting passwords?
> **Answer:**
> - **Hashing is one-way:** Unlike encryption (which is two-way and can be decrypted with a key), hashing cannot be reversed. Even if the database is breached, attackers cannot decrypt the passwords.
> - **Salting:** `bcrypt` automatically generates a random cryptographic salt for each password, preventing rainbow table attacks (precomputed hash lookups).
> - **Configurable work factor (cost):** `bcrypt` is deliberately slow and computationally intensive, protecting against brute-force and dictionary attacks.

### Q2: What information is typically stored inside a JWT payload?
> **Answer:**
> - Non-sensitive, identifying user claims such as the user ID (`id: customer._id`) and token expiration metadata (`exp`, `iat`).
> - **Never** store sensitive data like raw passwords, credit card numbers, or confidential personal data in a JWT payload because the payload is only base64Url-encoded (not encrypted) and can be easily decoded by anyone who inspects the token.

### Q3: Why is the HttpOnly flag important for cookies?
> **Answer:**
> - The `httpOnly: true` flag instructs the browser that the cookie cannot be accessed or read by client-side JavaScript (e.g., via `document.cookie`).
> - This provides critical protection against **Cross-Site Scripting (XSS)** attacks, preventing malicious scripts injected into the frontend from stealing session tokens.

### Q4: Why should passwords never be returned to the frontend?
> **Answer:**
> - Returning even hashed passwords exposes them unnecessarily over the network and in client browser memory/developer tools.
> - Attackers with network sniffing tools or physical/browser access can take the hashes offline to run dictionary or brute-force cracking attacks.
> - Filtering out passwords (`select("-password")`) enforces the principle of least privilege and strict data privacy.

### Q5: What is the purpose of authentication middleware?
> **Answer:**
> - Authentication middleware sits between the incoming request and the protected controller handler.
> - It intercepts the request, checks for the presence of the authentication token (from cookies or headers), validates the token's cryptographic signature and expiration, fetches the authenticated user from the database, and attaches it to `req.user`.
> - If authentication fails, it terminates the request with a `401 Unauthorized` response immediately, keeping private routes secure without repeating verification code in every controller.
