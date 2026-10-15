import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { registerCustomer } from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  // Controlled form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });

  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Validation helper
  const validate = () => {
    const errors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email address is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email.trim())
    ) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation (Backend requires >= 6 chars)
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-]{10,15}$/.test(formData.phone.trim())) {
      errors.phone = "Please enter a valid phone number (10-15 digits)";
    }

    return errors;
  };

  const validationErrors = validate();
  const isValid = Object.keys(validationErrors).length === 0;

  // Change handler for controlled inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear previous server error on typing
    if (serverError) setServerError("");
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields touched to trigger error display
    setTouched({
      fullName: true,
      email: true,
      password: true,
      phone: true,
    });

    if (!isValid) {
      return;
    }

    setIsLoading(true);
    setServerError("");
    setSuccessMessage("");

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
      };

      const result = await registerCustomer(payload);

      setSuccessMessage(
        result.message || "Account created successfully! Redirecting to login..."
      );

      // Redirect to Login page after a brief delay for user feedback
      setTimeout(() => {
        navigate("/login", {
          state: {
            registeredEmail: payload.email,
            successBanner: "Account created successfully! Please sign in.",
          },
        });
      }, 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed. Please check your network and try again.";
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            <UserPlus size={28} />
          </div>
          <h1 className="auth-title">Create your Atelier Three account</h1>
          <p className="auth-subtitle">
            Join thousands of collectors and enjoy seamless checkout & order tracking
          </p>
        </div>

        {/* Server Success Alert */}
        {successMessage && (
          <div className="alert-box alert-success" id="register-success-alert">
            <CheckCircle2 size={20} className="alert-icon" />
            <div className="alert-text">{successMessage}</div>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div className="alert-box alert-error" id="register-error-alert">
            <ShieldAlert size={20} className="alert-icon" />
            <div className="alert-text">{serverError}</div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="register-fullName" className="form-label">
              Full Name
            </label>
            <div
              className={`input-wrapper ${
                touched.fullName && validationErrors.fullName ? "input-invalid" : ""
              }`}
            >
              <User size={18} className="input-icon-left" />
              <input
                id="register-fullName"
                type="text"
                name="fullName"
                placeholder="e.g. Jane Doe"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                className="form-input"
                autoComplete="name"
                disabled={isLoading}
              />
            </div>
            {touched.fullName && validationErrors.fullName && (
              <span className="field-error-msg" id="register-error-fullName">
                <AlertCircle size={13} />
                {validationErrors.fullName}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="register-email" className="form-label">
              Email Address
            </label>
            <div
              className={`input-wrapper ${
                touched.email && validationErrors.email ? "input-invalid" : ""
              }`}
            >
              <Mail size={18} className="input-icon-left" />
              <input
                id="register-email"
                type="email"
                name="email"
                placeholder="e.g. jane@example.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className="form-input"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
            {touched.email && validationErrors.email && (
              <span className="field-error-msg" id="register-error-email">
                <AlertCircle size={13} />
                {validationErrors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="register-password" className="form-label">
              Password
            </label>
            <div
              className={`input-wrapper ${
                touched.password && validationErrors.password ? "input-invalid" : ""
              }`}
            >
              <Lock size={18} className="input-icon-left" />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className="form-input"
                autoComplete="new-password"
                disabled={isLoading}
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
            {touched.password && validationErrors.password && (
              <span className="field-error-msg" id="register-error-password">
                <AlertCircle size={13} />
                {validationErrors.password}
              </span>
            )}
            <p className="field-hint">Minimum 6 characters required</p>
          </div>

          {/* Phone Number */}
          <div className="form-group">
            <label htmlFor="register-phone" className="form-label">
              Phone Number
            </label>
            <div
              className={`input-wrapper ${
                touched.phone && validationErrors.phone ? "input-invalid" : ""
              }`}
            >
              <Phone size={18} className="input-icon-left" />
              <input
                id="register-phone"
                type="tel"
                name="phone"
                placeholder="e.g. +91 9876543210"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className="form-input"
                autoComplete="tel"
                disabled={isLoading}
              />
            </div>
            {touched.phone && validationErrors.phone && (
              <span className="field-error-msg" id="register-error-phone">
                <AlertCircle size={13} />
                {validationErrors.phone}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="register-submit-btn"
            disabled={isLoading}
            className="btn-primary-auth"
          >
            {isLoading ? (
              <>
                <span className="spinner-small" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="auth-footer-text">
          <span>Already have an account?</span>
          <Link to="/login" id="link-goto-login" className="auth-switch-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
