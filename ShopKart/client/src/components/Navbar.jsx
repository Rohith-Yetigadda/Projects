import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  LogOut,
  User,
  Heart,
  Package,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { logoutCustomer } from "../services/api";
import { useCart } from "../context/CartContext";

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [timeString, setTimeString] = useState("");
  const { cartCount, wishlistCount } = useCart();

  // Studio live clock UTC+05:30
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logoutCustomer();
    } catch (err) {
      console.warn("Logout error:", err.message);
    } finally {
      if (setUser) setUser(null);
      setLoggingOut(false);
      navigate("/login");
    }
  };

  return (
    <header className="studio-navbar" id="studio-header">
      {/* Top micro-bar: Studio ticker */}
      <div className="studio-topbar-strip">
        <div className="strip-container">
          <div className="strip-left">
            <span className="live-dot" />
            <span className="strip-text">FUTURE THREE ARCHIVE / EDITION 2026</span>
          </div>
          <div className="strip-center">
            <span className="strip-text-dim">WORLDWIDE DISPATCH • 256-BIT ENCRYPTED RAZORPAY CHECKOUT</span>
          </div>
          <div className="strip-right">
            <span className="strip-mono-time">IST {timeString || "12:00:00"}</span>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="studio-nav-main">
        <div className="nav-grid">
          {/* Brand */}
          <Link to={user ? "/home" : "/products"} className="studio-brand" id="nav-brand-logo">
            <span className="brand-primary">SHOPKART<span className="brand-dot">®</span></span>
            <span className="brand-sub">STUDIO EDITION</span>
          </Link>

          {/* Center Navigation */}
          <nav className="studio-nav-links">
            {user && (
              <NavLink
                to="/home"
                id="nav-link-dashboard"
                className={({ isActive }) =>
                  `studio-link ${isActive ? "active" : ""}`
                }
              >
                <span className="link-index">[ 01 ]</span>
                <span className="link-title">DASHBOARD</span>
              </NavLink>
            )}

            <NavLink
              to="/products"
              id="nav-link-products"
              className={({ isActive }) =>
                `studio-link ${isActive ? "active" : ""}`
              }
            >
              <span className="link-index">{user ? "[ 02 ]" : "[ 01 ]"}</span>
              <span className="link-title">CATALOG</span>
            </NavLink>

            {user && (
              <NavLink
                to="/wishlist"
                id="nav-link-wishlist"
                className={({ isActive }) =>
                  `studio-link ${isActive ? "active" : ""}`
                }
              >
                <span className="link-index">[ 03 ]</span>
                <span className="link-title">WISHLIST</span>
                {wishlistCount > 0 && (
                  <span className="studio-badge" id="nav-wishlist-count">
                    {wishlistCount}
                  </span>
                )}
              </NavLink>
            )}

            <NavLink
              to="/cart"
              id="nav-link-cart"
              className={({ isActive }) =>
                `studio-link ${isActive ? "active" : ""}`
              }
            >
              <span className="link-index">{user ? "[ 04 ]" : "[ 02 ]"}</span>
              <span className="link-title">BAG</span>
              {cartCount > 0 && (
                <span className="studio-badge studio-badge-red" id="nav-cart-count">
                  {cartCount}
                </span>
              )}
            </NavLink>

            {user && (
              <NavLink
                to="/orders"
                id="nav-link-orders"
                className={({ isActive }) =>
                  `studio-link ${isActive ? "active" : ""}`
                }
              >
                <span className="link-index">[ 05 ]</span>
                <span className="link-title">LEDGER</span>
              </NavLink>
            )}
          </nav>

          {/* User actions */}
          <div className="studio-nav-auth">
            {user ? (
              <div className="auth-chip-group">
                <div className="studio-user-chip" id="nav-user-chip">
                  <span className="status-indicator-green" />
                  <span className="user-name-text">{user.fullName}</span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="studio-btn-logout"
                  id="nav-logout-btn"
                  title="Sign out of archive"
                >
                  <span>{loggingOut ? "EXITING..." : "DISCONNECT"}</span>
                </button>
              </div>
            ) : (
              <div className="guest-chip-group">
                <NavLink to="/login" className="studio-btn-ghost" id="nav-login-link">
                  SIGN IN
                </NavLink>
                <NavLink to="/register" className="studio-btn-solid" id="nav-register-link">
                  <span>ENTER STUDIO</span>
                  <ArrowUpRight size={13} />
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
