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

/**
 * Authentic Apple Activity Rings component.
 * Features:
 * - Radiant Apple neon gradients
 * - Luminous luminance-matched background grooves
 * - Authentic tangential drop shadow on overfill (>100%) cast behind the leading cap
 * - Perfect round stroke caps without clipping or overlap artefacts
 * - Clean deep black void center
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
              <linearGradient
                key={gradId}
                id={gradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={ring.gradientStart} />
                <stop offset="100%" stopColor={ring.gradientEnd} />
              </linearGradient>
            );
          })}

          {rings.map((_, idx) => {
            const shadowFilterId = `ring-shadow-filter-${compId}-${idx}`;
            return (
              <filter
                key={shadowFilterId}
                id={shadowFilterId}
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="0" dy="0" result="offsetblur" />
                <feFlood floodColor="#000000" floodOpacity="0.85" />
                <feComposite in2="offsetblur" operator="in" />
                <feMerge>
                  <feMergeNode />
                </feMerge>
              </filter>
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
          const clampedRatio = Math.max(0, ratio);
          const firstLap = Math.min(clampedRatio, 1.0);

          const gradId = `url(#ring-grad-${compId}-${idx})`;
          const clipId = `ring-clip-${compId}-${idx}`;
          const shadowFilterId = `url(#ring-shadow-filter-${compId}-${idx})`;

          // Overfill calculation (> 100%)
          const hasOverfill = clampedRatio > 1.0;
          const overfillAngle = (clampedRatio - 1.0) * 2 * Math.PI;

          // Tip position on the circle (angle theta measured clockwise from 12 o'clock)
          // For base lap < 1.0, tip is at firstLap * 2 * PI
          // For overfill > 1.0, tip is at overfillAngle
          const activeAngle = hasOverfill ? overfillAngle : firstLap * 2 * Math.PI;
          const tipX = center + radius * Math.sin(activeAngle);
          const tipY = center - radius * Math.cos(activeAngle);

          // Backward tangent vector for overfill shadow:
          // Moving counter-clockwise from (tipX, tipY):
          // dx = -cos(theta), dy = -sin(theta)
          const shadowOffset = 3;
          const shadowX = tipX - shadowOffset * Math.cos(activeAngle);
          const shadowY = tipY - shadowOffset * Math.sin(activeAngle);

          // Arc for overfill (> 100%)
          const largeArcFlag = (overfillAngle % (2 * Math.PI)) > Math.PI ? 1 : 0;
          const overfillArcPath = `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;

          return (
            <g key={ring.id || idx}>
              <clipPath id={clipId}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="#ffffff"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
              </clipPath>

              {/* 1. Track Groove (Apple luminance matched) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={ring.trackColor || ring.gradientStart}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={0.2}
              />

              {/* 2. Base Lap (0% to 100%) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={gradId}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={
                  loading ? circumference : circumference * (1 - firstLap)
                }
                transform={`rotate(-90 ${center} ${center})`}
                style={{
                  transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />

              {/* 3. Authentic Apple Tangential Drop Shadow (Only on Overfill > 100%) */}
              {hasOverfill && !loading && (
                <g clipPath={`url(#${clipId})`}>
                  <circle
                    cx={shadowX}
                    cy={shadowY}
                    r={strokeWidth / 2 + 2}
                    fill="#000000"
                    filter={shadowFilterId}
                  />
                </g>
              )}

              {/* 4. Overfill Lap (> 100%) */}
              {hasOverfill && !loading && (
                <path
                  d={overfillArcPath}
                  stroke={gradId}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  fill="none"
                />
              )}

              {/* 5. Leading Round Cap over the shadow on Overfill */}
              {hasOverfill && !loading && (
                <circle
                  cx={tipX}
                  cy={tipY}
                  r={strokeWidth / 2}
                  fill={ring.gradientEnd}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Clean Apple Deep Black Center Void */}
      <div
        className="absolute rounded-full bg-[#0a0c10] border border-white/[0.06] shadow-inner flex items-center justify-center pointer-events-none"
        style={{
          width: size * 0.22,
          height: size * 0.22,
        }}
      />
    </div>
  );
}

// ─── Standard Apple Fitness / Recompass Macro Palettes ───────────────
export const APPLE_FITNESS_MACRO_PALETTES = {
  calories: {
    gradientStart: "#FF2D55",
    gradientEnd: "#FA114F",
    trackColor: "#FF2D55",
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
