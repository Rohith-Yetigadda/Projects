import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Tag,
  Package,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Heart,
  Plus,
  Minus,
} from "lucide-react";
import { getProductById } from "../services/api";
import { useCart } from "../context/CartContext";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const {
    addToCart,
    updateQuantity: updateCartQty,
    isInCart,
    getCartItemQuantity,
    isWishlisted,
    toggleWishlist,
  } = useCart();

  const wishlisted = isWishlisted(id);
  const inCart = isInCart(id);
  const currentCartQty = getCartItemQuantity(id);

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        // Requirement: GET /products/:id
        const data = await getProductById(id);

        if (isMounted) {
          if (data && data.product) {
            setProduct(data.product);
          } else {
            setProduct(data);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching product details:", err);
          setError(
            err.response?.data?.message ||
              "Could not find the requested product or an error occurred."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchProduct();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      await addToCart(id);
      if (quantity > 1) {
        await updateCartQty(id, quantity);
      }
      setAddedNotice(true);
      setTimeout(() => {
        setAddedNotice(false);
      }, 3000);
    } catch (err) {
      if (err.message && err.message.includes("log in")) {
        navigate("/login");
      } else {
        alert(err.message);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    try {
      setTogglingWishlist(true);
      await toggleWishlist(id);
    } catch (err) {
      if (err.message && err.message.includes("log in")) {
        navigate("/login");
      } else {
        alert(err.message);
      }
    } finally {
      setTogglingWishlist(false);
    }
  };

  const incrementQty = () => {
    if (product && quantity < product.stock) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  if (loading) {
    return (
      <div className="product-details-container" id="product-details-loading">
        <div className="details-breadcrumb">
          <Link to="/products" className="breadcrumb-back-btn">
            <ArrowLeft size={16} />
            <span>Back to Products</span>
          </Link>
        </div>
        <div className="state-panel loading-state-panel">
          <div className="spinner-large" />
          <h2 className="state-title">Loading product details...</h2>
          <p className="state-desc">Fetching specifications from GET /products/{id}</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-details-container" id="product-details-error">
        <div className="details-breadcrumb">
          <Link to="/products" className="breadcrumb-back-btn">
            <ArrowLeft size={16} />
            <span>Back to Products</span>
          </Link>
        </div>
        <div className="state-panel error-state-panel">
          <div className="error-icon-box">
            <AlertTriangle size={36} />
          </div>
          <h2 className="state-title">Product Not Found</h2>
          <p className="state-desc">
            {error || "The product you requested does not exist or has been removed."}
          </p>
          <Link to="/products" className="btn-primary" style={{ marginTop: "1rem" }}>
            Return to Products Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <div className="product-details-container" id="product-details-page">
      {/* Navigation Breadcrumb */}
      <div className="details-breadcrumb">
        <button
          type="button"
          onClick={() => navigate("/products")}
          className="breadcrumb-back-btn"
          id="back-to-products-btn"
        >
          <ArrowLeft size={16} />
          <span>Back to Products</span>
        </button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-category">{product.category}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </div>

      {/* Main Details Presentation */}
      <div className="details-card-grid">
        {/* Left Column: Large Product Image */}
        <div className="details-image-panel">
          <div className="details-image-frame">
            <img
              src={product.image}
              alt={product.name}
              className="large-product-image"
              id="large-product-image"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80";
              }}
            />
            <span className="details-image-tag">
              <Tag size={13} />
              {product.category}
            </span>
          </div>

          <div className="guarantees-grid">
            <div className="guarantee-pill">
              <Truck size={18} className="text-primary" />
              <div>
                <strong>Express Delivery</strong>
                <span>Dispatch within 24h</span>
              </div>
            </div>
            <div className="guarantee-pill">
              <ShieldCheck size={18} className="text-emerald" />
              <div>
                <strong>Authentic Product</strong>
                <span>100% Genuine ShopKart</span>
              </div>
            </div>
            <div className="guarantee-pill">
              <RotateCcw size={18} className="text-amber" />
              <div>
                <strong>7 Days Return</strong>
                <span>Hassle-free replacement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Product Specifications & Add to Cart */}
        <div className="details-info-panel">
          <div className="details-header-meta">
            <span className="category-pill-badge">{product.category}</span>
            <span className="product-id-subtext">ID: {product._id}</span>
          </div>

          {/* Product Name */}
          <h1 className="details-product-title" id="product-detail-name">
            {product.name}
          </h1>

          {/* Price */}
          <div className="details-price-box">
            <span className="details-price-label">Price</span>
            <div className="details-price-row">
              <span className="details-current-price" id="product-detail-price">
                {formattedPrice}
              </span>
              <span className="details-taxes-note">Inclusive of all taxes</span>
            </div>
          </div>

          {/* Stock Status */}
          <div className="details-stock-card">
            <div className="stock-info-left">
              <Package size={20} className={isOutOfStock ? "text-red" : "text-emerald"} />
              <div>
                <span className="stock-title" id="product-detail-stock">
                  {isOutOfStock
                    ? "Out of Stock"
                    : `${product.stock} units currently available`}
                </span>
                <span className="stock-sub">
                  {isOutOfStock
                    ? "Check back soon for restock"
                    : "Ready to ship from nearby fulfillment hub"}
                </span>
              </div>
            </div>
            <span
              className={`stock-badge-tag ${
                isOutOfStock ? "tag-out-of-stock" : "tag-in-stock"
              }`}
            >
              {isOutOfStock ? "Unavailable" : "In Stock"}
            </span>
          </div>

          {/* Description */}
          <div className="details-section">
            <h3 className="section-title">About this item</h3>
            <p className="details-description-text" id="product-detail-description">
              {product.description}
            </p>
          </div>

          {/* Quantity Selector & Add to Cart Action */}
          <div className="details-actions-panel">
            {!isOutOfStock && (
              <div className="quantity-selector-box">
                <span className="qty-label">Quantity:</span>
                <div className="qty-counter">
                  <button
                    type="button"
                    onClick={decrementQty}
                    disabled={quantity <= 1}
                    className="qty-btn"
                    title="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-display">{quantity}</span>
                  <button
                    type="button"
                    onClick={incrementQty}
                    disabled={quantity >= product.stock}
                    className="qty-btn"
                    title="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Task 8: Add to Cart button (UI only for now) */}
            <div className="cta-buttons-row">
              <button
                type="button"
                className={`btn-add-to-cart ${isOutOfStock ? "btn-disabled" : ""} ${inCart ? "in-cart" : ""}`}
                id="add-to-cart-btn"
                disabled={isOutOfStock || addingToCart}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={18} />
                <span>
                  {addingToCart
                    ? "Adding..."
                    : isOutOfStock
                    ? "Out of Stock"
                    : inCart
                    ? `In Cart (${currentCartQty})`
                    : "Add to Cart"}
                </span>
              </button>

              <button
                type="button"
                className={`btn-wishlist ${wishlisted ? "active-wishlist" : ""}`}
                title={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                id="details-wishlist-btn"
                disabled={togglingWishlist}
                onClick={handleToggleWishlist}
              >
                <Heart
                  size={18}
                  className={wishlisted ? "fill-rose-500 text-rose-500" : ""}
                />
              </button>

              <button
                type="button"
                className="btn-wishlist"
                title="Share product"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: product.name,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Product link copied to clipboard!");
                  }
                }}
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Feedback notification when Add to Cart is clicked */}
            {addedNotice && (
              <div className="cart-feedback-banner">
                <CheckCircle2 size={18} className="text-emerald" />
                <span>
                  Added {quantity} × &quot;{product.name}&quot; to your bag successfully.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
