import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Package,
  ArrowRight,
  ShoppingBag,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";
import { getOrderById } from "../services/api";

export default function OrderSuccess({ user }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!order && id) {
      const fetchOrder = async () => {
        try {
          setLoading(true);
          const data = await getOrderById(id);
          setOrder(data.order);
        } catch (err) {
          setError(err.response?.data?.message || "Order not found");
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [id, order, user, navigate]);

  const formatPrice = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  if (loading) {
    return (
      <div className="order-success-page" id="order-success-loading">
        <div className="state-panel loading-state-panel">
          <div className="spinner-large" />
          <h2 className="state-title">Retrieving order details...</h2>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-success-page" id="order-success-error">
        <div className="state-panel error-state-panel">
          <h2 className="state-title">Order Not Found</h2>
          <p className="state-desc">{error || "Could not retrieve order details."}</p>
          <Link to="/orders" className="btn-primary" style={{ marginTop: "1rem" }}>
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-page" id="order-success-page">
      <div className="success-card">
        {/* Success Header Banner */}
        <div className="success-header">
          <div className="success-icon-badge">
            <CheckCircle size={56} className="text-emerald" />
          </div>
          <span className="success-pill">Payment Verified</span>
          <h1 className="success-title">Order Placed Successfully!</h1>
          <p className="success-subtitle">
            Thank you for acquiring with Atelier Three. Your object order has been registered and is being prepared for dispatch.
          </p>
        </div>

        {/* Order Quick Metadata */}
        <div className="order-meta-grid">
          <div className="meta-block">
            <span className="meta-label">Order Reference</span>
            <span className="meta-value font-mono" id="confirmed-order-id">
              #{order._id}
            </span>
          </div>

          <div className="meta-block">
            <span className="meta-label">Payment Status</span>
            <span className="meta-status-paid font-semibold">
              {order.paymentStatus || "PAID"}
            </span>
          </div>

          <div className="meta-block">
            <span className="meta-label">Order Status</span>
            <span className="meta-status-placed font-semibold">
              {order.status || "PLACED"}
            </span>
          </div>

          <div className="meta-block">
            <span className="meta-label">Total Amount</span>
            <span className="meta-total-amount" id="confirmed-total-amount">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Purchased Items List */}
        <div className="purchased-items-section">
          <h3 className="section-heading">Items in this Order</h3>
          <div className="purchased-items-list">
            {(order.items || []).map((item, index) => (
              <div key={item._id || index} className="purchased-item-row">
                <img
                  src={item.image}
                  alt={item.name}
                  className="purchased-item-image"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80";
                  }}
                />
                <div className="purchased-item-info">
                  <h4 className="purchased-item-name">{item.name}</h4>
                  <span className="purchased-item-qty">
                    Quantity: {item.quantity} × {formatPrice(item.price)}
                  </span>
                </div>
                <span className="purchased-item-subtotal">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address Snapshot */}
        {order.shippingAddress && (
          <div className="shipping-snapshot-card">
            <div className="snapshot-header">
              <MapPin size={18} className="text-amber-400" />
              <h4>Delivery Destination</h4>
            </div>
            <p className="shipping-text">
              <strong>{order.shippingAddress.fullName}</strong> ({order.shippingAddress.phone})<br />
              {order.shippingAddress.addressLine1}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="success-actions-row">
          <Link
            to="/orders"
            className="btn-primary btn-view-orders"
            id="view-orders-btn"
          >
            <Package size={18} />
            <span>View My Orders</span>
          </Link>

          <Link
            to="/products"
            className="btn-secondary-link"
            id="continue-shopping-btn"
          >
            <span>Continue Shopping</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
