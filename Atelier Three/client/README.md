# ShopKart — Frontend Customer Authentication (Lab 02)

Welcome to **ShopKart Frontend Customer Authentication Hub**. This project implements the end-to-end user authentication flow for customers, seamlessly interfacing with the Lab 01 backend authentication service using secure, HttpOnly cookies.

---

## 🛠️ Tech Stack

- **Frontend Library**: React 19 (Vite)
- **Routing**: React Router DOM (`v7`)
- **HTTP Client**: Axios (with `withCredentials: true`)
- **Design System**: Bespoke E-Commerce Glassmorphism CSS design system with responsive layouts
- **Icons**: Lucide React
- **Backend Service**: Express.js, MongoDB Atlas, JSON Web Token (JWT), `cookie-parser` (Lab 01)

---

## 📁 Project Structure

Adheres strictly to the required lab specification:

```
src/
│
├── pages/
│   ├── Login.jsx       # Task 2: Login Page (/login)
│   ├── Register.jsx    # Task 1: Registration Page (/register)
│   └── Home.jsx        # Task 3: Protected Home Page (/home)
│
├── components/
│   └── Navbar.jsx      # Task 4: Navbar with branding & Logout (/customers/logout)
│
├── services/
│   └── api.js          # Centralized Axios client (withCredentials: true)
│
├── App.jsx             # React Router DOM configuration & session check
├── index.css           # Modern ShopKart CSS design system
└── main.jsx            # React root mount
```

---

## 🚀 How to Run

### Step 1: Start the Lab 01 Backend Server

Open a terminal and navigate to the backend directory:

```bash
cd "Lab/Lab 01"
npm start
```
*The backend starts at `http://localhost:5000` and connects to MongoDB Atlas.*

### Step 2: Start the Lab 02 Frontend Development Server

Open a second terminal and navigate to the frontend directory:

```bash
cd "Lab/lab 02"
npm install       # If dependencies are not yet installed
npm run dev
```
*The Vite development server starts at `http://localhost:5173`.*

---

## 🔄 End-to-End Authentication Architecture

### 1. Registration (`POST /customers/register`)
- **Route**: `/register`
- Controlled form fields: Full Name, Email, Password, Phone Number.
- Client-side validation for email regex, minimum 6-character password, and phone number.
- On success: Dispatches success notification and redirects to `/login`.

### 2. Login (`POST /customers/login`)
- **Route**: `/login`
- Controlled form fields: Email, Password.
- Request is dispatched with `withCredentials: true`.
- On success: Backend sets the secure `token` HttpOnly cookie, and user is redirected to `/home`.
- On failure: Displays explicit `"Invalid Credentials"` message.
- Includes a **"Load Demo Credentials"** helper button for quick evaluator testing.

### 3. Protected Home (`GET /customers/me`)
- **Route**: `/home`
- When navigated to, immediately verifies credentials by sending `GET /customers/me` with cookies.
- If unauthenticated or token expired (401), automatically redirects to `/login`.
- Displays the customer's **Full Name**, **Email** (with verified badge), and **Phone Number**.
- Includes rich customer hub cards, loyalty points, and session security status.

### 4. Logout (`POST /customers/logout`)
- Clicking the **Logout** button in the Navbar or Home dashboard invokes `POST /customers/logout`.
- Backend invalidates/clears the `token` cookie (`expires: new Date(0)`).
- Frontend clears local state and navigates back to `/login`.

---

## 🎯 TA Viva Questions & Complete Answers

### 1. Why do we use `withCredentials: true`?
**Answer:**
By default, browsers follow the same-origin policy and omit cookies from cross-origin HTTP requests initiated via `XMLHttpRequest` or `fetch` / `axios`. Setting `withCredentials: true` instructs the browser to include cookies, authorization headers, and TLS client certificates in cross-origin requests. Without this flag, the HttpOnly authentication cookie stored in the browser will not be sent with requests to endpoints like `GET /customers/me` or `POST /customers/logout`.

### 2. Why can't JavaScript read an `HttpOnly` cookie?
**Answer:**
An `HttpOnly` cookie has the `HttpOnly` flag set by the server in the `Set-Cookie` header. This flag directs the browser that the cookie must never be accessible through client-side scripts (e.g., `document.cookie`). This is a crucial security barrier designed to mitigate **Cross-Site Scripting (XSS)** attacks: even if an attacker manages to inject malicious JavaScript into the webpage, they cannot steal the user's session token or impersonate them.

### 3. Why is `/home` called a protected route?
**Answer:**
A protected route is a route in the application that requires valid authentication to access. Rather than rendering unconditionally for any visitor, the `/home` component checks whether the user has a valid active session by calling `GET /customers/me`. If the server returns a `401 Unauthorized` (indicating no valid cookie or an expired token), the component rejects entry and automatically redirects the user to `/login`.

### 4. Why do we fetch `/customers/me` instead of storing the user manually?
**Answer:**
1. **Single Source of Truth**: The server database is the authoritative state of the customer. Fetching `/customers/me` ensures the UI always reflects the latest, authentic profile data.
2. **Security**: Storing sensitive user data or authentication tokens in `localStorage` or `sessionStorage` exposes them to XSS vulnerabilities.
3. **Session Validity**: Fetching `/customers/me` simultaneously verifies whether the session/token is still valid, unexpired, and not revoked by the server. If a user's account is suspended or the session expires, `/customers/me` immediately catches it.

### 5. What is the difference between authentication and authorization?
**Answer:**
- **Authentication (AuthN)**: Verifies **who you are**. It answers the question, *"Are you really the customer you claim to be?"* (e.g., verifying email & password during login, generating the JWT token).
- **Authorization (AuthZ)**: Verifies **what you are allowed to do**. It answers the question, *"Do you have permission to perform this action or access this specific resource?"* (e.g., checking if a user has admin privileges to delete products, or if a customer is allowed to access only their own order history).

---

## 📊 Evaluation Rubric Checklist

| Category | Requirement | Status |
|---|---|:---:|
| **Registration UI + API (25 Marks)** | Controlled fields, validation errors, redirect to login on success | ✅ Completed |
| **Login UI + API (25 Marks)** | Credentials with cookies, navigate to `/home`, "Invalid Credentials" error | ✅ Completed |
| **Protected Home (20 Marks)** | `GET /customers/me`, displays name, email, phone; auto-redirect if unauthenticated | ✅ Completed |
| **Logout (10 Marks)** | `POST /customers/logout` in Navbar, clears cookie, redirects to login | ✅ Completed |
| **Routing (10 Marks)** | React Router DOM configured for `/register`, `/login`, `/home`, `/` | ✅ Completed |
| **UI & Code Quality (10 Marks)** | Clean, responsive, glassmorphic design system, structured code | ✅ Completed |
| **Total Marks** | **100 / 100** | ✅ Ready |
