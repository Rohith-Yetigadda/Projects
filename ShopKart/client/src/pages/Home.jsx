import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Package,
  Heart,
  LogOut,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { getCustomerProfile, logoutCustomer } from "../services/api";
import { useCart } from "../context/CartContext";

export default function Home({ user, setUser }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const { cartCount, wishlistCount } = useCart();

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await getCustomerProfile();
        if (isMounted) {
          setProfile(data);
          if (setUser) setUser(data);
        }
      } catch (err) {
        if (isMounted) {
          if (setUser) setUser(null);
          navigate("/login", { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [navigate, setUser]);

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

  if (loading) {
    return (
      <div className="studio-loader-page" id="home-loading">
        <div className="studio-loader-inner">
          <span className="loader-mono">[ SYSTEM // AUTHENTICATING ]</span>
          <div className="loader-line-progress" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="studio-dashboard-view">
      {/* Editorial Studio Hero */}
      <section className="studio-hero-section" id="welcome-hero">
        <div className="hero-top-meta">
          <span className="meta-tag">[ IDENTITY // VERIFIED ]</span>
          <span className="meta-date">SESSION ACTIVE • 2026</span>
        </div>

        <div className="hero-typography-block">
          <h1 className="hero-giant-heading" id="welcome-heading">
            WELCOME, <span className="text-stroke">{profile.fullName.toUpperCase()}</span>
          </h1>
          <p className="hero-manifesto">
            PRECISION COMMERCE ARCHIVE. CONNECTED VIA HTTPONLY SECURE PROTOCOL.
            EXPLORE THE CURATED HARDWARE CATALOG, MANAGE YOUR BAG, AND INSPECT HISTORICAL ORDERS.
          </p>
        </div>

        <div className="hero-actions-row">
          <Link to="/products" className="studio-btn-primary" id="hero-browse-products-btn">
            <span>EXPLORE CATALOG</span>
            <ArrowUpRight size={15} />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="studio-btn-outline"
          >
            <span>{loggingOut ? "EXITING..." : "DISCONNECT SESSION"}</span>
          </button>
        </div>
      </section>

      {/* Marquee Ticker */}
      <div className="studio-ticker-tape">
        <div className="ticker-track">
          <span>CURATED ARTIFACTS</span>
          <span className="separator">/</span>
          <span>RAZORPAY VERIFIED CHECKOUT</span>
          <span className="separator">/</span>
          <span>MONGODB PERSISTENCE</span>
          <span className="separator">/</span>
          <span>STUDIO THREE AESTHETICS</span>
          <span className="separator">/</span>
          <span>WORLDWIDE DISPATCH</span>
          <span className="separator">/</span>
          <span>CURATED ARTIFACTS</span>
          <span className="separator">/</span>
          <span>RAZORPAY VERIFIED CHECKOUT</span>
          <span className="separator">/</span>
          <span>MONGODB PERSISTENCE</span>
        </div>
      </div>

      {/* Dossier Grid */}
      <section className="studio-dossier-grid">
        {/* Left Column: Account Specs */}
        <div className="dossier-card" id="customer-profile-card">
          <div className="card-top-header">
            <span className="card-index-mono">[ 01 ]</span>
            <span className="card-title-mono">MEMBER DOSSIER</span>
          </div>

          <div className="dossier-table">
            <div className="dossier-row">
              <span className="dossier-key">FULL NAME</span>
              <span className="dossier-val" id="profile-fullname">{profile.fullName}</span>
            </div>
            <div className="dossier-row">
              <span className="dossier-key">EMAIL</span>
              <span className="dossier-val" id="profile-email">{profile.email}</span>
            </div>
            <div className="dossier-row">
              <span className="dossier-key">TELEPHONE</span>
              <span className="dossier-val" id="profile-phone">{profile.phone}</span>
            </div>
            <div className="dossier-row">
              <span className="dossier-key">CUSTOMER ID</span>
              <span className="dossier-val-mono" id="profile-id">{profile._id}</span>
            </div>
            <div className="dossier-row">
              <span className="dossier-key">AUTH METHOD</span>
              <span className="dossier-val-tag">HTTPONLY JWT COOKIE</span>
            </div>
          </div>
        </div>

        {/* Right Column: Portal Shortcuts */}
        <div className="dossier-shortcuts-column">
          {/* Wishlist module */}
          <Link to="/wishlist" className="shortcut-card">
            <div className="shortcut-top">
              <span className="shortcut-idx">[ 02 ]</span>
              <Heart size={16} />
            </div>
            <div className="shortcut-body">
              <span className="shortcut-count-mono">{wishlistCount} SAVED</span>
              <h3 className="shortcut-title">SAVED OBJECTS</h3>
            </div>
            <div className="shortcut-arrow">
              <ArrowUpRight size={18} />
            </div>
          </Link>

          {/* Cart module */}
          <Link to="/cart" className="shortcut-card">
            <div className="shortcut-top">
              <span className="shortcut-idx">[ 03 ]</span>
              <ShoppingBag size={16} />
            </div>
            <div className="shortcut-body">
              <span className="shortcut-count-mono">{cartCount} IN BAG</span>
              <h3 className="shortcut-title">SHOPPING BAG</h3>
            </div>
            <div className="shortcut-arrow">
              <ArrowUpRight size={18} />
            </div>
          </Link>

          {/* Orders module */}
          <Link to="/orders" className="shortcut-card highlight-card">
            <div className="shortcut-top">
              <span className="shortcut-idx">[ 04 ]</span>
              <Package size={16} />
            </div>
            <div className="shortcut-body">
              <span className="shortcut-count-mono">CONFIRMED ORDERS</span>
              <h3 className="shortcut-title">ORDER LEDGER</h3>
            </div>
            <div className="shortcut-arrow">
              <ArrowUpRight size={18} />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
