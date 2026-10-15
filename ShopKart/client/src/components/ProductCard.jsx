import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ArrowUpRight, Check, Plus, Package } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const {
    isWishlisted,
    toggleWishlist,
    addToCart,
    isInCart,
    getCartItemQuantity,
  } = useCart();

  const [wishlistUpdating, setWishlistUpdating] = useState(false);
  const [cartAdding, setCartAdding] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 4;
  const wishlisted = isWishlisted(product._id);
  const itemInCart = isInCart(product._id);
  const cartQty = getCartItemQuantity(product._id);

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.price);

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setWishlistUpdating(true);
      await toggleWishlist(product._id);
      showNotice(wishlisted ? "REMOVED FROM SAVED" : "SAVED TO ARCHIVE");
    } catch (err) {
      if (err.message.includes("log in")) {
        navigate("/login");
      } else {
        showNotice(err.message, true);
      }
    } finally {
      setWishlistUpdating(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    try {
      setCartAdding(true);
      await addToCart(product._id);
      showNotice("ADDED TO BAG");
    } catch (err) {
      if (err.message.includes("log in")) {
        navigate("/login");
      } else {
        showNotice(err.message, true);
      }
    } finally {
      setCartAdding(false);
    }
  };

  const showNotice = (msg, isErr = false) => {
    setActionNotice({ text: msg, isErr });
    setTimeout(() => {
      setActionNotice(null);
    }, 2200);
  };

  const padIndex = (num) => String(num + 1).padStart(2, "0");

  return (
    <article className="studio-card" id={`product-card-${product._id}`}>
      {/* Media Canvas */}
      <div className="card-media-wrapper">
        <Link to={`/products/${product._id}`} className="card-image-link">
          <img
            src={product.image}
            alt={product.name}
            className="card-media-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80";
            }}
          />
        </Link>

        {/* Top Floating Tag Row */}
        <div className="card-top-tag-row">
          <span className="card-mono-idx">{padIndex(index)}</span>
          <button
            type="button"
            onClick={handleWishlistClick}
            disabled={wishlistUpdating}
            className={`card-wishlist-toggle ${wishlisted ? "active" : ""}`}
            id={`wishlist-btn-${product._id}`}
            title={wishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
          >
            <Heart
              size={15}
              className={wishlisted ? "heart-active" : "heart-idle"}
            />
          </button>
        </div>

        {/* Stock status indicator pill */}
        <div className="card-stock-pill-wrapper">
          {isOutOfStock ? (
            <span className="studio-pill-status out-of-stock">
              <span className="dot" /> OUT OF STOCK
            </span>
          ) : isLowStock ? (
            <span className="studio-pill-status low-stock">
              <span className="dot" /> {product.stock} REMAINING
            </span>
          ) : null}
        </div>

        {/* Micro Notice */}
        {actionNotice && (
          <div
            className={`card-micro-notice ${
              actionNotice.isErr ? "notice-err" : "notice-ok"
            }`}
          >
            {actionNotice.text}
          </div>
        )}
      </div>

      {/* Card Metadata */}
      <div className="card-meta-body">
        <div className="card-meta-header">
          <span className="card-category-label">CAT. // {product.category}</span>
          <span className="card-price-mono">{formattedPrice}</span>
        </div>

        <h3 className="card-product-title">
          <Link to={`/products/${product._id}`} title={product.name}>
            {product.name} <span className="arrow-diagonal" style={{ display: 'inline-block', transition: 'transform 0.2s ease' }}>↗</span>
          </Link>
        </h3>

        {/* Card Interactive Actions */}
        <div className="card-actions-strip">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || cartAdding}
            className={`studio-btn-add ${itemInCart ? "in-bag" : ""}`}
            id={`add-to-cart-btn-${product._id}`}
          >
            {cartAdding ? (
              <span className="btn-loading-txt">ACQUIRING...</span>
            ) : isOutOfStock ? (
              <span>UNAVAILABLE</span>
            ) : itemInCart ? (
              <>
                <Check size={13} />
                <span>IN BAG ({cartQty})</span>
              </>
            ) : (
              <>
                <Plus size={13} />
                <span>ADD TO BAG</span>
              </>
            )}
          </button>

          <Link
            to={`/products/${product._id}`}
            className="studio-btn-inspect"
            id={`view-details-btn-${product._id}`}
            title="Inspect specifications"
          >
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
