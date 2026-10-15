import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Package,
  AlertCircle,
  Truck,
  Sparkles,
} from "lucide-react";
import { useCart } from "../context/CartContext";

export default function Cart({ user }) {
  const navigate = useNavigate();
  const {
    cart,
    cartLoading,
    cartError,
    cartCount,
    cartSubtotal,
    refreshCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      refreshCart();
    }
  }, [user, navigate, refreshCart]);

  // Derived values
  const shippingFee = cartSubtotal >= 999 || cartSubtotal === 0 ? 0 : 99;
  const grandTotal = cartSubtotal + shippingFee;

  const formatPrice = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const handleQuantityChange = async (productId, currentQty, delta, maxStock) => {
    const nextQty = currentQty + delta;
    if (nextQty < 1) return;
    if (nextQty > maxStock) {
      alert(`Cannot exceed available stock of ${maxStock} units.`);
      return;
    }
    try {
      await updateQuantity(productId, nextQty);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
    } catch (err) {
      alert(err.message);
    }
  };

  if (cartLoading && cart.length === 0) {
    return (
      <div className="cart-page-container" id="cart-loading-view">
        <div className="state-panel loading-state-panel">
          <div className="spinner-large" />
          <h2 className="state-title">Loading your cart...</h2>
          <p className="state-desc">Synchronising cart data with backend</p>
        </div>
      </div>
    );
  }

  if (cartError && cart.length === 0) {
    return (
      <div className="cart-page-container" id="cart-error-view">
        <div className="state-panel error-state-panel">
          <div className="error-icon-box">
            <AlertCircle size={36} />
          </div>
          <h2 className="state-title">Could not load cart</h2>
          <p className="state-desc">{cartError}</p>
          <button
            type="button"
            onClick={refreshCart}
            className="btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container" id="cart-page">
      {/* Header */}
      <div className="cart-header">
        <div className="cart-title-group">
          <div className="icon-badge-glow">
            <ShoppingBag className="text-amber-400" size={24} />
          </div>
          <div>
            <h1 className="cart-page-title">Shopping Cart</h1>
            <p className="cart-subtitle">
              {cartCount} {cartCount === 1 ? "item" : "items"} selected
            </p>
          </div>
        </div>

        <Link to="/products" className="btn-secondary-link">
          <span>Continue Shopping</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Empty State (Lab 05 Task 17) */}
      {cart.length === 0 ? (
        <div className="empty-cart-panel" id="cart-empty-state">
          <div className="empty-icon-bubble">
            <ShoppingBag size={48} className="text-zinc-500" />
          </div>
          <h2 className="empty-title">Your Cart is Empty</h2>
          <p className="empty-subtitle">
            Looks like you haven't added anything to your cart yet. Explore our latest electronics, gadgets, and accessories.
          </p>
          <Link to="/products" className="btn-primary btn-explore" id="cart-explore-btn">
            <Sparkles size={18} />
            <span>Start Shopping</span>
          </Link>
        </div>
      ) : (
        /* Cart Content Grid */
        <div className="cart-layout-grid">
          {/* Left Column: Cart Items List */}
          <div className="cart-items-column" id="cart-items-list">
            {cart.map((item) => {
              const product = item.product || {};
              const itemTotal = (product.price || 0) * (item.quantity || 1);
              const maxStock = product.stock || 1;
              const isAtMaxStock = item.quantity >= maxStock;

              return (
                <div
                  key={product._id || item._id}
                  className="cart-item-card"
                  id={`cart-item-${product._id}`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="cart-item-image"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80";
                    }}
                  />

                  <div className="cart-item-details">
                    <div className="cart-item-top-row">
                      <div>
                        <span className="cart-item-category">{product.category}</span>
                        <h3 className="cart-item-title">
                          <Link to={`/products/${product._id}`}>{product.name}</Link>
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(product._id)}
                        className="btn-cart-remove"
                        title="Remove product from cart"
                        id={`remove-cart-item-${product._id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="cart-item-bottom-row">
                      <div className="cart-item-unit-price">
                        <span className="unit-price-label">Price per unit:</span>
                        <span className="unit-price-val">
                          {formatPrice(product.price || 0)}
                        </span>
                      </div>

                      {/* Quantity Controls (Lab 05 Task 14) */}
                      <div className="cart-qty-controller">
                        <span className="qty-tag-label">Qty:</span>
                        <div className="qty-btn-group">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(product._id, item.quantity, -1, maxStock)
                            }
                            disabled={item.quantity <= 1}
                            className="qty-action-btn"
                            id={`qty-minus-${product._id}`}
                            title="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="qty-action-value">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(product._id, item.quantity, 1, maxStock)
                            }
                            disabled={isAtMaxStock}
                            className="qty-action-btn"
                            id={`qty-plus-${product._id}`}
                            title={isAtMaxStock ? "Max stock reached" : "Increase quantity"}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        {isAtMaxStock && (
                          <span className="max-stock-hint">Max stock</span>
                        )}
                      </div>

                      <div className="cart-item-total-col">
                        <span className="item-total-label">Subtotal</span>
                        <span className="item-total-amount">{formatPrice(itemTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Order Summary (Lab 05 Task 15) */}
          <div className="cart-summary-column">
            <div className="order-summary-card">
              <h2 className="summary-title">Order Summary</h2>

              <div className="summary-rows-group">
                <div className="summary-row">
                  <span className="summary-label">Items Subtotal ({cartCount})</span>
                  <span className="summary-val">{formatPrice(cartSubtotal)}</span>
                </div>

                <div className="summary-row">
                  <span className="summary-label flex-row-center">
                    <Truck size={14} className="mr-1" /> Delivery Charges
                  </span>
                  <span className="summary-val">
                    {shippingFee === 0 ? (
                      <span className="text-emerald font-semibold">FREE</span>
                    ) : (
                      formatPrice(shippingFee)
                    )}
                  </span>
                </div>

                {cartSubtotal < 999 && (
                  <p className="free-shipping-tip">
                    Add {formatPrice(999 - cartSubtotal)} more for <strong>FREE Delivery</strong>!
                  </p>
                )}

                <div className="summary-divider" />

                <div className="summary-row summary-total-row">
                  <span className="total-label">Grand Total</span>
                  <span className="total-val" id="cart-grand-total">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="btn-primary btn-checkout-cta"
                id="proceed-to-checkout-btn"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </button>

              <div className="security-badges-row">
                <ShieldCheck size={16} className="text-emerald" />
                <span>SSL Encrypted Checkout • Razorpay Test Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
