import React, { useId } from "react";

export interface RingData {
  id: string;
  label: string;
  current: number;
  target: number;
  unit?: string;
  gradientStart: string;
  gradientEnd: string;
  trackColor: string;
  icon?: React.ReactNode;
}

interface AppleActivityRingProps {
  rings: RingData[];
  size?: number; // Outer dimension (square)
  strokeWidth?: number;
  ringGap?: number;
  className?: string;
  loading?: boolean;
  showCenterIcon?: boolean;
}

export interface MacroCue {
  pct: number;
  arrow: string;
  label: string;
  shortCue: string;
  colorClasses: string;
  isGood: boolean;
}

/**
 * Intelligent Status Cue Evaluator
 * Evaluates macro percentage against nutritional logic:
 * - Protein: High/Surplus is GREAT (green optimal), Low is bad.
 * - Calories: Over budget is BAD (rose surplus/warning), within target is good.
 * - Carbs/Fats: Balanced within target is good, excess is warning.
 */
export function getMacroStatusCue(key: string, current: number, target: number): MacroCue {
  const pct = Math.round((current / Math.max(1, target)) * 100);

  if (key === "calories") {
    if (pct > 110) {
      return {
        pct,
        arrow: "↑",
        label: "Over Budget",
        shortCue: "Over",
        colorClasses: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        isGood: false,
      };
    }
    if (pct > 100) {
      return {
        pct,
        arrow: "↑",
        label: "Slight Surplus",
        shortCue: "Surplus",
        colorClasses: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        isGood: false,
      };
    }
    if (pct >= 85) {
      return {
        pct,
        arrow: "✓",
        label: "On Target",
        shortCue: "Good",
        colorClasses: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        isGood: true,
      };
    }
    return {
      pct,
      arrow: "↓",
      label: "Under Budget",
      shortCue: "Left",
      colorClasses: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
      isGood: true,
    };
  }

  if (key === "protein") {
    // For protein, meeting or exceeding target is GREAT!
    if (pct >= 100) {
      return {
        pct,
        arrow: pct > 100 ? "↑" : "✓",
        label: "Optimal",
        shortCue: "Good",
        colorClasses: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        isGood: true,
      };
    }
    if (pct >= 80) {
      return {
        pct,
        arrow: "↑",
        label: "On Track",
        shortCue: "Track",
        colorClasses: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
        isGood: true,
      };
    }
    return {
      pct,
      arrow: "↓",
      label: "Low Protein",
      shortCue: "Low",
      colorClasses: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
      isGood: false,
    };
  }

  // Carbs & Fats
  if (pct > 115) {
    return {
      pct,
      arrow: "↑",
      label: "High",
      shortCue: "High",
      colorClasses: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
      isGood: false,
    };
  }
  if (pct >= 75) {
    return {
      pct,
      arrow: "✓",
      label: "Balanced",
      shortCue: "Good",
      colorClasses: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      isGood: true,
    };
  }
  return {
    pct,
    arrow: "↓",
    label: "Low",
    shortCue: "Low",
    colorClasses: "bg-white/[0.04] text-white/50 border border-white/[0.08]",
    isGood: true,
  };
}

/**
 * Authentic Apple Activity Rings component (100% Capped).
 * Clean, solid, and reliable concentric progress rings:
 * - 0% to 100% cap (zero overfill clipping, zero shadow glitches).
 * - Smooth circular arcs with Apple-grade luminous linear gradients.
 * - Under-lap threshold to avoid 0% ghost dots.
 * - Solid 360-degree seamless closure when target is reached.
 */
export function AppleActivityRing({
  rings,
  size = 200,
  strokeWidth = 14,
  ringGap = 3.5,
  className = "",
  loading = false,
}: AppleActivityRingProps) {
  const compId = useId().replace(/:/g, "_");
  const viewBoxSize = 200;
  const center = viewBoxSize / 2;
  const outerPadding = 9;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full overflow-visible"
        style={{ transform: "translateZ(0)" }}
      >
        <defs>
          {rings.map((ring, idx) => {
            const gradId = `ring-grad-${compId}-${idx}`;
            return (
              <linearGradient key={idx} id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={ring.gradientStart || "#FF2D55"} />
                <stop offset="100%" stopColor={ring.gradientEnd || ring.gradientStart || "#FF2D55"} />
              </linearGradient>
            );
          })}
        </defs>

        {rings.map((ring, idx) => {
          const radius =
            center -
            outerPadding -
            strokeWidth / 2 -
            idx * (strokeWidth + ringGap);
          if (radius <= 0) return null;

          const circumference = 2 * Math.PI * radius;
          const ratio = ring.target > 0 ? ring.current / ring.target : 0;
          // Strictly capped at 1.0 (100%)
          const clampedRatio = Math.min(Math.max(0, ratio), 1.0);
          const isComplete = clampedRatio >= 0.999;
          const hasProgress = clampedRatio > 0.005;

          const gradUrl = `url(#ring-grad-${compId}-${idx})`;
          const ringColor = ring.gradientStart || "#FF2D55";

          return (
            <g key={ring.id || idx}>
              {/* 1. Track Groove (Apple Fitness deep luminescent canal) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={ring.trackColor || ringColor}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={0.16}
              />

              {/* 2. Concentric Ring (0% to 100% Capped) */}
              {hasProgress && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={gradUrl}
                  strokeWidth={strokeWidth}
                  strokeLinecap={isComplete ? "butt" : "round"}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={
                    loading
                      ? circumference
                      : isComplete
                      ? 0
                      : circumference * (1 - clampedRatio)
                  }
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{
                    transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Standard Apple Fitness Macro Palettes ───────────────
export const APPLE_FITNESS_MACRO_PALETTES = {
  calories: {
    gradientStart: "#FA114F",
    gradientEnd: "#FF2D55",
    trackColor: "#FA114F",
  },
  protein: {
    gradientStart: "#A1FF00",
    gradientEnd: "#00E599",
    trackColor: "#A1FF00",
  },
  carbs: {
    gradientStart: "#00F0FF",
    gradientEnd: "#007AFF",
    trackColor: "#00F0FF",
  },
  fats: {
    gradientStart: "#FFD600",
    gradientEnd: "#FF9500",
    trackColor: "#FFD600",
  },
};
