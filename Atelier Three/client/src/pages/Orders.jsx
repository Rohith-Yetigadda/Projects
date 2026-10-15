import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Calendar,
  Clock,
  ArrowRight,
  Truck,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Eye,
} from "lucide-react";
import { getMyOrders, updateOrderStatus } from "../services/api";

export default function Orders({ user }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyOrders();
        setOrders(data.orders || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate]);

  const formatPrice = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return "Recent";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Lab 06 Bonus: Order Status Progression
  const statusSteps = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];

  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const currentIndex = statusSteps.indexOf(currentStatus);
    if (currentIndex < statusSteps.length - 1) {
      const nextStatus = statusSteps[currentIndex + 1];
      try {
        setUpdatingOrderId(orderId);
        const res = await updateOrderStatus(orderId, nextStatus);
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
        );
      } catch (err) {
        alert(err.message || "Failed to update status");
      } finally {
        setUpdatingOrderId(null);
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "DELIVERED":
        return "badge-status-delivered";
      case "SHIPPED":
        return "badge-status-shipped";
      case "CONFIRMED":
        return "badge-status-confirmed";
      case "PLACED":
      default:
        return "badge-status-placed";
    }
  };

  if (loading) {
    return (
      <div className="orders-page-container" id="orders-loading-view">
        <div className="state-panel loading-state-panel">
          <div className="spinner-large" />
          <h2 className="state-title">Loading order history...</h2>
          <p className="state-desc">Retrieving records from database</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-page-container" id="orders-error-view">
        <div className="state-panel error-state-panel">
          <div className="error-icon-box">
            <AlertCircle size={36} />
          </div>
          <h2 className="state-title">Error Loading Orders</h2>
          <p className="state-desc">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page-container" id="orders-page">
      {/* Page Header */}
      <div className="orders-header">
        <div className="orders-title-group">
          <div className="icon-badge-glow">
            <Package className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="orders-page-title">My Orders</h1>
            <p className="orders-subtitle">
              {orders.length} {orders.length === 1 ? "order" : "orders"} placed
            </p>
          </div>
        </div>

        <Link to="/products" className="btn-secondary-link">
          <span>Explore More Products</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Empty State (Lab 06 Task 8) */}
      {orders.length === 0 ? (
        <div className="empty-orders-panel" id="orders-empty-state">
          <div className="empty-icon-bubble">
            <Package size={48} className="text-zinc-500" />
          </div>
          <h2 className="empty-title">You Have Not Placed Any Orders Yet</h2>
          <p className="empty-subtitle">
            Once you complete a purchase, your order status, items snapshot, and delivery tracking details will appear here.
          </p>
          <Link to="/products" className="btn-primary btn-explore" id="start-shopping-btn">
            <Sparkles size={18} />
            <span>Start Shopping</span>
          </Link>
        </div>
      ) : (
        /* Orders List */
        <div className="orders-list-wrapper" id="orders-list">
          {orders.map((order) => {
            const currentStepIndex = statusSteps.indexOf(order.status || "PLACED");
            const isCompleted = order.status === "DELIVERED";

            return (
              <div
                key={order._id}
                className="order-history-card"
                id={`order-card-${order._id}`}
              >
                {/* Order Top Bar */}
                <div className="order-top-bar">
                  <div className="order-identity">
                    <span className="order-id-label">ORDER #</span>
                    <span className="order-id-value">{order._id}</span>
                    <span className="order-date-text">
                      <Calendar size={13} /> {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="order-status-badge-container">
                    <span
                      className={`order-status-pill ${getStatusBadgeClass(
                        order.status
                      )}`}
                    >
                      {order.status || "PLACED"}
                    </span>
                  </div>
                </div>

                {/* Status Progression Stepper (Lab 06 Bonus) */}
                <div className="status-progression-stepper">
                  {statusSteps.map((step, idx) => {
                    const stepDone = idx <= currentStepIndex;
                    const stepCurrent = idx === currentStepIndex;

                    return (
                      <div
                        key={step}
                        className={`stepper-step ${
                          stepDone ? "step-done" : "step-pending"
                        } ${stepCurrent ? "step-current" : ""}`}
                      >
                        <div className="step-circle">
                          {stepDone ? <CheckCircle2 size={14} /> : idx + 1}
                        </div>
                        <span className="step-label">{step}</span>
                        {idx < statusSteps.length - 1 && (
                          <div
                            className={`step-connector ${
                              idx < currentStepIndex ? "connector-active" : ""
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Items in this order */}
                <div className="order-items-grid">
                  {(order.items || []).map((item, idx) => (
                    <div key={item._id || idx} className="order-item-chip">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="order-item-chip-img"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      <div className="order-item-chip-info">
                        <span className="chip-name">{item.name}</span>
                        <span className="chip-meta">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </span>
                      </div>
                      <span className="chip-total">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Order Footer & Actions */}
                <div className="order-footer-bar">
                  <div className="order-shipping-summary">
                    {order.shippingAddress && (
                      <span className="shipping-hint">
                        <MapPin size={14} /> Delivering to{" "}
                        <strong>{order.shippingAddress.fullName}</strong> in{" "}
                        {order.shippingAddress.city}, {order.shippingAddress.pincode}
                      </span>
                    )}
                  </div>

                  <div className="order-pricing-and-controls">
                    <div className="order-total-block">
                      <span className="total-title">Total Paid</span>
                      <span className="total-figure">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>

                    {/* Task 17: Get Single Order / View Invoice Details */}
                    <Link
                      to={`/order-success/${order._id}`}
                      className="btn-view-details"
                      id={`view-order-details-${order._id}`}
                      title="View full order invoice snapshot"
                    >
                      <Eye size={14} />
                      <span>View Details</span>
                    </Link>

                    {/* Bonus: Advance Status Button */}
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStatus(order._id, order.status)}
                        disabled={updatingOrderId === order._id}
                        className="btn-advance-status"
                        title="Simulate dispatch / delivery progression"
                        id={`advance-status-${order._id}`}
                      >
                        <Truck size={14} />
                        <span>
                          {updatingOrderId === order._id
                            ? "Updating..."
                            : `Advance: ${statusSteps[currentStepIndex + 1]}`}
                        </span>
                      </button>
                    )}
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
