import React from "react";
import { Search, X, RotateCcw, SlidersHorizontal } from "lucide-react";

export default function SearchBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  categories = ["All", "Electronics", "Fashion", "Books", "Home"],
  onResetFilters,
  resultCount = 0,
}) {
  const hasActiveFilters = Boolean(
    (search && search.trim() !== "") ||
      (category && category !== "All") ||
      (sort && sort !== "newest")
  );

  return (
    <div className="studio-filter-shelf" id="search-filter-panel">
      {/* Top Search Line */}
      <div className="filter-search-row">
        <div className="studio-search-wrapper">
          <Search size={15} className="studio-search-icon" />
          <input
            type="text"
            id="product-search-input"
            className="studio-search-field"
            placeholder="SEARCH CATALOG BY NAME, MODEL, OR MATERIAL..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="studio-clear-btn"
              onClick={() => onSearchChange("")}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="studio-sort-wrapper">
          <SlidersHorizontal size={14} className="sort-icon" />
          <select
            id="sort-filter-select"
            className="studio-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="newest">SORT: NEWEST RELEASES</option>
            <option value="price-asc">PRICE: ASCENDING (LOW → HIGH)</option>
            <option value="price-desc">PRICE: DESCENDING (HIGH → LOW)</option>
          </select>
        </div>
      </div>

      {/* Category Horizontal Pills */}
      <div className="filter-category-row">
        <div className="category-pills-list">
          {categories.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`studio-category-pill ${isSelected ? "selected" : ""}`}
              >
                <span className="pill-dot" />
                <span className="pill-name">{cat.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        <div className="filter-meta-actions">
          <span className="result-counter-mono">
            COUNT: <strong>{resultCount}</strong> {resultCount === 1 ? "OBJECT" : "OBJECTS"}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="studio-reset-btn"
              id="reset-filters-btn"
            >
              <RotateCcw size={12} />
              <span>RESET</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
