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
 * Exact replication of Apple Watch / Fitness Move Goal rings:
 * - 0% to 100%: Pure circular arc with round stroke caps, zero shadow, zero dots.
 * - >100% (Overfill): Seamless second lap with round stroke cap; a smooth tangential
 *   drop shadow is cast strictly beneath the advancing cap onto the underlying track.
 * - Fixes inverted clipPath bounds bursting outside the viewBox area.
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
            const shadowFilterId = `ring-shadow-${compId}-${idx}`;
            const gradId = `ring-grad-${compId}-${idx}`;
            const clipId = `ring-track-clip-${compId}-${idx}`;
            
            const radius =
              center -
              outerPadding -
              strokeWidth / 2 -
              idx * (strokeWidth + ringGap);

            return (
              <React.Fragment key={idx}>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ring.gradientStart || "#FF2D55"} />
                  <stop offset="100%" stopColor={ring.gradientEnd || ring.gradientStart || "#FF2D55"} />
                </linearGradient>

                {/* FIX: Simplified clean circular mask clip boundary for the shadow */}
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

                <filter
                  id={shadowFilterId}
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
                  <feOffset dx="0" dy="1.5" result="offset" />
                  <feFlood floodColor="#000000" floodOpacity="0.75" result="color" />
                  <feComposite in="color" in2="offset" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </React.Fragment>
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

          const trackClipId = `ring-track-clip-${compId}-${idx}`;
          const shadowFilterId = `url(#ring-shadow-${compId}-${idx})`;
          const gradUrl = `url(#ring-grad-${compId}-${idx})`;
          const ringColor = ring.gradientStart || "#FF2D55";

          // Overfill calculation (> 100%)
          const hasOverfill = clampedRatio > 1.0;
          const overfillLap = Math.min(clampedRatio - 1.0, 0.999);
          const overfillAngle = overfillLap * 2 * Math.PI;

          // Tip position of the advancing overfill cap
          const tipX = center + radius * Math.sin(overfillAngle);
          const tipY = center - radius * Math.cos(overfillAngle);

          // Overlap Cushion: Backtrack the start of the overfill path slightly (-0.08 rad)
          // to completely cover the 12 o'clock seam, eliminating any pinch or gap
          const backtrackAngle = -0.08;
          const startX = center + radius * Math.sin(backtrackAngle);
          const startY = center - radius * Math.cos(backtrackAngle);
          const largeArcFlag = overfillAngle - backtrackAngle > Math.PI ? 1 : 0;
          const overfillArcPath = `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;

          const arrowY = center - radius;

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

              {/* 2. Base Lap (0% to 100%) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={gradUrl}
                strokeWidth={strokeWidth}
                strokeLinecap={hasOverfill ? "butt" : "round"}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={
                  loading
                    ? circumference
                    : hasOverfill
                    ? 0
                    : circumference * (1 - firstLap)
                }
                transform={`rotate(-90 ${center} ${center})`}
                style={{
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />

              {/* 3. Overfill Lap (> 100%) with Native Shadow Injection */}
              {/* FIX: Swapped out complex separate shadow paths for a clean SVG-filtered group layer */}
              {hasOverfill && !loading && (
                <g clipPath={`url(#${trackClipId})`}>
                  <path
                    d={overfillArcPath}
                    stroke={ring.gradientEnd || ringColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="none"
                    filter={shadowFilterId}
                  />
                </g>
              )}

              {/* 5. Authentic Apple Watch Directional Icon at 12 o'clock */}
              {firstLap > 0.05 && (
                <g
                  transform={`translate(${center}, ${arrowY})`}
                  className="pointer-events-none select-none opacity-50"
                >
                  {idx === 0 && (
                    // Move Ring Arrow: →
                    <path
                      d="M -2.5 0 L 2.5 0 M 0.5 -2 L 2.5 0 L 0.5 2"
                      stroke="#000000"
                      strokeWidth={1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                </g>
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
