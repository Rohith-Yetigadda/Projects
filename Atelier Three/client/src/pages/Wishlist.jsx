import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Package,
  Sparkles,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "../context/CartContext";

export default function Wishlist({ user }) {
  const navigate = useNavigate();
  const {
    wishlist,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
    removeFromWishlist,
    addToCart,
    isInCart,
  } = useCart();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      refreshWishlist();
    }
  }, [user, navigate, refreshWishlist]);

  const handleMoveToCart = async (product) => {
    try {
      await addToCart(product._id);
      await removeFromWishlist(product._id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
    } catch (err) {
      alert(err.message);
    }
  };

  if (wishlistLoading && wishlist.length === 0) {
    return (
      <div className="wishlist-page-container" id="wishlist-loading-view">
        <div className="state-panel loading-state-panel">
          <div className="spinner-large" />
          <h2 className="state-title">Loading your wishlist...</h2>
          <p className="state-desc">Fetching saved items from database</p>
        </div>
      </div>
    );
  }

  if (wishlistError) {
    return (
      <div className="wishlist-page-container" id="wishlist-error-view">
        <div className="state-panel error-state-panel">
          <div className="error-icon-box">
            <AlertCircle size={36} />
          </div>
          <h2 className="state-title">Unable to Load Wishlist</h2>
          <p className="state-desc">{wishlistError}</p>
          <button
            type="button"
            onClick={refreshWishlist}
            className="btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page-container" id="wishlist-page">
      {/* Header Banner */}
      <div className="wishlist-header">
        <div className="wishlist-header-content">
          <div className="wishlist-title-group">
            <div className="icon-badge-glow">
              <Heart className="fill-rose-500 text-rose-500" size={24} />
            </div>
            <div>
              <h1 className="wishlist-page-title">My Wishlist</h1>
              <p className="wishlist-subtitle">
                {wishlist.length} {wishlist.length === 1 ? "product" : "products"} saved for later
              </p>
            </div>
          </div>

          <Link to="/products" className="btn-secondary-link">
            <span>Continue Shopping</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Empty State (Lab 04 Task 7) */}
      {wishlist.length === 0 ? (
        <div className="empty-wishlist-panel" id="wishlist-empty-state">
          <div className="empty-icon-bubble">
            <Heart size={44} className="text-zinc-500" />
          </div>
          <h2 className="empty-title">Your Wishlist is Empty</h2>
          <p className="empty-subtitle">
            Explore our curated catalog and tap the heart icon on any item you love to save it here.
          </p>
          <Link to="/products" className="btn-primary btn-explore" id="wishlist-explore-btn">
            <Sparkles size={18} />
            <span>Discover Products</span>
          </Link>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="wishlist-grid" id="wishlist-items-grid">
          {wishlist.map((item) => {
            const isOutOfStock = (item.stock || 0) <= 0;
            const inCart = isInCart(item._id);

            const formattedPrice = new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(item.price || 0);

            return (
              <div
                key={item._id}
                className="wishlist-card"
                id={`wishlist-item-${item._id}`}
              >
                <div className="wishlist-card-media">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="wishlist-card-image"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80";
                    }}
                  />
                  <span className="wishlist-category-tag">{item.category}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item._id)}
                    className="btn-wishlist-remove"
                    title="Remove from wishlist"
                    id={`remove-wishlist-${item._id}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="wishlist-card-details">
                  <h3 className="wishlist-item-title" title={item.name}>
                    {item.name}
                  </h3>

                  <div className="wishlist-meta-row">
                    <span className="wishlist-item-price">{formattedPrice}</span>
                    <span
                      className={`wishlist-stock-status ${
                        isOutOfStock ? "status-out" : "status-in"
                      }`}
                    >
                      {isOutOfStock ? "Out of Stock" : `${item.stock} in stock`}
                    </span>
                  </div>

                  <div className="wishlist-actions-row">
                    <button
                      type="button"
                      onClick={() => handleMoveToCart(item)}
                      disabled={isOutOfStock}
                      className={`btn-move-cart ${inCart ? "already-in" : ""}`}
                      id={`move-to-cart-${item._id}`}
                    >
                      <ShoppingBag size={16} />
                      <span>{inCart ? "In Cart • Add Again" : "Move to Cart"}</span>
                    </button>

                    <Link
                      to={`/products/${item._id}`}
                      className="btn-wishlist-view"
                      title="View product specifications"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
