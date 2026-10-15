import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  AlertTriangle,
  RotateCw,
  PlusCircle,
  X,
  CheckCircle2,
  PackageSearch,
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { getProducts, createProduct } from "../services/api";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, Category, and Sorting Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");

  // Add Product Modal State (Bonus convenience for testing Task 2)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Electronics",
    image: "",
    stock: "",
  });

  // Fetch products from backend
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts({
        search,
        category,
        sort,
      });

      if (data && data.success) {
        setProducts(data.products || []);
      } else {
        setProducts(data?.products || []);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(
        err.response?.data?.message ||
          "Something went wrong while loading products."
      );
    } finally {
      setLoading(false);
    }
  }, [search, category, sort]);

  // Effect to load products on search/filter/sort changes
  useEffect(() => {
    // Debounce search typing slightly to prevent flickering
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleResetFilters = () => {
    setSearch("");
    setCategory("All");
    setSort("newest");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (
      !formData.name ||
      !formData.description ||
      !formData.price ||
      !formData.category ||
      !formData.image ||
      !formData.stock
    ) {
      setCreateError("All fields are mandatory.");
      return;
    }

    if (Number(formData.price) <= 0) {
      setCreateError("Price must be greater than 0.");
      return;
    }

    if (Number(formData.stock) < 0) {
      setCreateError("Stock cannot be negative.");
      return;
    }

    try {
      setCreateSubmitting(true);
      await createProduct({
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
      });

      setCreateSuccess("Product added successfully to catalog!");
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "Electronics",
        image: "",
        stock: "",
      });
      // Refresh catalog
      fetchProducts();
      setTimeout(() => {
        setIsModalOpen(false);
        setCreateSuccess("");
      }, 1200);
    } catch (err) {
      setCreateError(
        err.response?.data?.message || "Failed to create product. Check all inputs."
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="products-page-container">
      {/* Authentic Future Three Studio Editorial Header (as on futurethree.studio) */}
      <div className="f3-catalog-top-header">
        <div className="f3-top-row">
          <div className="f3-headline-block">
            <span className="f3-head-line">THE BEST</span>
            <span className="f3-head-line">OF THREE</span>
          </div>

          <div className="f3-center-serif">
            /Catalogue
          </div>

          <div className="f3-right-actions">
            <button
              type="button"
              className="f3-view-all-link"
              id="open-add-product-modal-btn"
              onClick={() => setIsModalOpen(true)}
            >
              ENLIST OBJECT ↗
            </button>
          </div>
        </div>
      </div>

      {/* Task 7: Search and Filter Bar */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
        categories={["All", "Electronics", "Fashion", "Books", "Home"]}
        onResetFilters={handleResetFilters}
        resultCount={products.length}
      />

      {/* UI State Handling */}
      {loading ? (
        /* Loading State */
        <div className="state-panel loading-state-panel" id="products-loading-state">
          <div className="spinner-large" />
          <h2 className="state-title">Loading products...</h2>
          <p className="state-desc">Connecting to MongoDB product catalog database...</p>
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="product-skeleton-card">
                <div className="skeleton-thumb" />
                <div className="skeleton-line full" />
                <div className="skeleton-line half" />
                <div className="skeleton-line quarter" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="state-panel error-state-panel" id="products-error-state">
          <div className="error-icon-box">
            <AlertTriangle size={36} />
          </div>
          <h2 className="state-title">Something went wrong while loading products.</h2>
          <p className="state-desc">{error}</p>
          <button
            type="button"
            className="btn-retry"
            id="retry-fetch-products-btn"
            onClick={fetchProducts}
          >
            <RotateCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="state-panel empty-state-panel" id="products-empty-state">
          <div className="empty-icon-box">
            <PackageSearch size={40} />
          </div>
          <h2 className="state-title">No products found.</h2>
          <p className="state-desc">
            We couldn&apos;t find any products matching your current search or category filter.
          </p>
          {(search || category !== "All") && (
            <button
              type="button"
              className="btn-clear-filters"
              id="clear-empty-filters-btn"
              onClick={handleResetFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        /* Task 6: Dynamic Product Cards Grid using .map() */
        <div className="studio-products-grid" id="products-grid">
          {products.map((product, idx) => (
            <ProductCard key={product._id} product={product} index={idx} />
          ))}
        </div>
      )}

      {/* Add Product Modal (Task 2 in UI) */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-title-group">
                <PlusCircle size={20} className="text-primary" />
                <h3>Add New Product (POST /products)</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="modal-form">
              {createError && (
                <div className="form-alert error-alert">
                  <AlertTriangle size={16} />
                  <span>{createError}</span>
                </div>
              )}
              {createSuccess && (
                <div className="form-alert success-alert">
                  <CheckCircle2 size={16} />
                  <span>{createSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="prod-name">Product Name *</label>
                <input
                  type="text"
                  id="prod-name"
                  name="name"
                  required
                  placeholder="e.g. Mechanical Keyboard"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-desc">Description *</label>
                <textarea
                  id="prod-desc"
                  name="description"
                  required
                  rows={3}
                  placeholder="e.g. RGB mechanical keyboard with blue switches."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="prod-price">Price (₹) * (&gt; 0)</label>
                  <input
                    type="number"
                    id="prod-price"
                    name="price"
                    required
                    min="1"
                    placeholder="2999"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-stock">Stock Quantity * (≥ 0)</label>
                  <input
                    type="number"
                    id="prod-stock"
                    name="stock"
                    required
                    min="0"
                    placeholder="10"
                    value={formData.stock}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prod-category">Category *</label>
                <select
                  id="prod-category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Books">Books</option>
                  <option value="Home">Home</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prod-image">Image URL *</label>
                <input
                  type="url"
                  id="prod-image"
                  name="image"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={handleInputChange}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? "Creating Product..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
