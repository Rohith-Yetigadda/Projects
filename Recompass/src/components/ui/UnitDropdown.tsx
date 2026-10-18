import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export const ALLOWED_UNITS = [
  { value: "pcs", label: "pcs", desc: "pieces / items" },
  { value: "g", label: "g", desc: "grams" },
  { value: "ml", label: "ml", desc: "milliliters" },
  { value: "kg", label: "kg", desc: "kilograms" },
  { value: "l", label: "l", desc: "liters" },
  { value: "slices", label: "slices", desc: "bread/cheese" },
  { value: "packs", label: "packs", desc: "packets" },
  { value: "scoops", label: "scoops", desc: "protein/powders" },
  { value: "servings", label: "servings", desc: "portions" },
  { value: "tbsp", label: "tbsp", desc: "tablespoons (~15g)" },
  { value: "tsp", label: "tsp", desc: "teaspoons (~5g)" },
] as const;

export type AllowedUnit = typeof ALLOWED_UNITS[number]["value"];

interface UnitDropdownProps {
  unit: string;
  onChange: (newUnit: string) => void;
  className?: string;
  disabled?: boolean;
}

export const UnitDropdown: React.FC<UnitDropdownProps> = ({
  unit,
  onChange,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = (unit || "pcs").toLowerCase().trim();
  const currentUnit = ALLOWED_UNITS.find(u => u.value.toLowerCase() === normalized) || {
    value: unit,
    label: unit,
    desc: ""
  };

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
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-white/80 hover:text-white text-xs font-semibold tracking-wide transition-all select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          isOpen ? "border-white/30 bg-white/[0.08] text-white" : ""
        }`}
        title="Select measurement unit"
      >
        <span>{currentUnit.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-white/40 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-white/80" : ""
          }`}
        />
      </button>

      {/* Floating Custom Popover */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-2xl bg-[#14161b] border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.85)] p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl max-h-60 overflow-y-auto no-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[9px] font-bold text-white/30 uppercase tracking-widest border-b border-white/[0.06] mb-1">
            Measurement Unit
          </div>
          {ALLOWED_UNITS.map((u) => {
            const isSelected = u.value.toLowerCase() === normalized;
            return (
              <button
                key={u.value}
                type="button"
                onClick={() => {
                  onChange(u.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold transition-all ${
                  isSelected
                    ? "bg-white/[0.10] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-sans font-bold text-white">{u.label}</span>
                  {u.desc && <span className="text-[9px] font-normal text-white/40">{u.desc}</span>}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
