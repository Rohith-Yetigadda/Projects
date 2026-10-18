import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { FOOD_CATEGORIES, type FoodCategory } from "@/lib/geminiClassifier";

interface CategoryDropdownProps {
  category: string;
  onChange: (newCategory: FoodCategory) => void;
  className?: string;
}

export const getCategoryBadgeStyle = (cat: string) => {
  switch (cat) {
    case "Protein": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "Produce": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "Dairy": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "Snacks": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    case "Supplements": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    case "Grains": return "text-yellow-200 bg-yellow-200/10 border-yellow-200/20";
    case "Spreads": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "Spices": return "text-orange-300 bg-orange-300/10 border-orange-300/20";
    case "Oils": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    default: return "text-white/60 bg-white/5 border-white/10";
  }
};

export const getCategoryDot = (cat: string) => {
  switch (cat) {
    case "Protein": return "bg-orange-400";
    case "Produce": return "bg-emerald-400";
    case "Dairy": return "bg-amber-400";
    case "Snacks": return "bg-rose-400";
    case "Supplements": return "bg-purple-400";
    case "Grains": return "bg-yellow-200";
    case "Spreads": return "bg-amber-500";
    case "Spices": return "bg-orange-300";
    case "Oils": return "bg-yellow-400";
    default: return "bg-white/40";
  }
};

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  category,
  onChange,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Dynamic Sized & Centered Pill Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer select-none hover:brightness-110 active:scale-95 ${getCategoryBadgeStyle(category)}`}
        title="Click to change category"
      >
        <span className="text-center">{category}</span>
        <ChevronDown
          className={`w-2.5 h-2.5 opacity-50 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Luxury Custom Floating Popover (Apple Health / Mobbin style) */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 w-44 rounded-2xl bg-[#14161b] border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.85)] p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[9px] font-bold text-white/30 uppercase tracking-widest border-b border-white/[0.06] mb-1">
            Category
          </div>
          {FOOD_CATEGORIES.map((cat) => {
            const isSelected = cat.toLowerCase() === category.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onChange(cat);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isSelected
                    ? "bg-white/[0.10] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDot(cat)}`} />
                  <span>{cat}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
