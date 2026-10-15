import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { loginCustomer } from "../services/api";

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Controlled form state
  const [formData, setFormData] = useState({
    email: location.state?.registeredEmail || "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successBanner, setSuccessBanner] = useState(
    location.state?.successBanner || ""
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error message when typing
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessBanner("");

    try {
      // POST /customers/login with credentials automatically via api.js
      const result = await loginCustomer({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (setUser && result.customer) {
        setUser(result.customer);
      }

      // Requirement: On success -> Navigate to /home
      navigate("/home");
    } catch (err) {
      // Requirement: Show "Invalid Credentials" on failure
      const status = err.response?.status;
      const backendMsg = err.response?.data?.message;

      if (status === 401 || backendMsg === "Invalid credentials") {
        setErrorMessage("Invalid Credentials");
      } else {
        setErrorMessage(
          backendMsg || "Invalid Credentials"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick helper to fill test credentials for fast evaluation
  const handleFillDemo = () => {
    setFormData({
      email: "alex.turner@shopkart.com",
      password: "password123",
    });
    setErrorMessage("");
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            <LogIn size={28} />
          </div>
          <h1 className="auth-title">Welcome back to Atelier Three</h1>
          <p className="auth-subtitle">
            Sign in to access your orders, profile, and secure checkout
          </p>
        </div>

        {/* Redirect Success Banner (e.g. from registration) */}
        {successBanner && (
          <div className="alert-box alert-success" id="login-success-banner">
            <CheckCircle2 size={20} className="alert-icon" />
            <div className="alert-text">{successBanner}</div>
          </div>
        )}

        {/* Failure Banner: Requirement -> Show "Invalid Credentials" */}
        {errorMessage && (
          <div className="alert-box alert-error" id="login-error-alert">
            <AlertCircle size={20} className="alert-icon" />
            <div className="alert-text" id="login-error-text">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon-left" />
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                autoComplete="email"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
            </div>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon-left" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                autoComplete="current-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-password-toggle"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="login-submit-btn"
            disabled={isLoading}
            className="btn-primary-auth"
          >
            {isLoading ? (
              <>
                <span className="spinner-small" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Helper Button */}
        <div className="demo-helper-box">
          <div className="demo-helper-text">
            <span>Quick Evaluation:</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="btn-demo-helper"
            id="btn-fill-demo"
            title="Pre-fill sample credentials for quick testing"
          >
            <Sparkles size={14} />
            <span>Load Demo Credentials</span>
          </button>
        </div>

        {/* Security Assurance */}
        <div className="security-notice">
          <ShieldCheck size={16} />
          <span>Protected with HttpOnly Cookie Authentication</span>
        </div>

        {/* Footer Link */}
        <div className="auth-footer-text">
          <span>New to Atelier Three?</span>
          <Link to="/register" id="link-goto-register" className="auth-switch-link">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
