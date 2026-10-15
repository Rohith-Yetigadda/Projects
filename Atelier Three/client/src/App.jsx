import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import { CartProvider } from "./context/CartContext";
import { getCustomerProfile } from "./services/api";
import Lenis from "lenis";

export default function App() {
  const [user, setUser] = useState(null);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Initialize Lenis smooth scroll for FutureThree studio feel
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.8,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const animId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animId);
      lenis.destroy();
    };
  }, []);

  // Check on initial app load whether customer has an active HttpOnly session
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const profile = await getCustomerProfile();
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setInitialCheckComplete(true);
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <Router>
      <CartProvider user={user}>
        <div className="app-shell">
          <Navbar user={user} setUser={setUser} />
          <main className="main-viewport">
            <Routes>
              {/* Task 1: Registration Page */}
              <Route
                path="/register"
                element={user ? <Navigate to="/home" replace /> : <Register />}
              />

              {/* Task 2: Login Page */}
              <Route
                path="/login"
                element={
                  user ? <Navigate to="/home" replace /> : <Login setUser={setUser} />
                }
              />

              {/* Task 3: Protected Home Page */}
              <Route
                path="/home"
                element={<Home user={user} setUser={setUser} />}
              />

              {/* Lab 03: Product Discovery & Catalog */}
              <Route path="/products" element={<Products />} />

              {/* Lab 03: Dynamic Product Details Route */}
              <Route path="/products/:id" element={<ProductDetails />} />

              {/* Lab 04: Wishlist Page */}
              <Route
                path="/wishlist"
                element={<Wishlist user={user} />}
              />

              {/* Lab 05: Shopping Cart Page */}
              <Route
                path="/cart"
                element={<Cart user={user} />}
              />

              {/* Lab 06: Checkout Page */}
              <Route
                path="/checkout"
                element={<Checkout user={user} />}
              />

              {/* Lab 06: Order Success Confirmation */}
              <Route
                path="/order-success/:id"
                element={<OrderSuccess user={user} />}
              />

              {/* Lab 06: My Orders Page */}
              <Route
                path="/orders"
                element={<Orders user={user} />}
              />

              {/* Default Route: Redirect to /products or /home */}
              <Route
                path="/"
                element={
                  initialCheckComplete ? (
                    user ? (
                      <Navigate to="/home" replace />
                    ) : (
                      <Navigate to="/products" replace />
                    )
                  ) : (
                    <div className="app-init-loader">
                      <span className="spinner-small" />
                    </div>
                  )
                }
              />

              {/* Catch-all unknown routes */}
              <Route path="*" element={<Navigate to="/products" replace />} />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </Router>
  );
}
