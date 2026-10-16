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
 * - Under 100%: Single clean arc with strokeLinecap="round", zero shadow.
 * - Over 100%: 
 *     1. Base circle is a solid closed 360-degree ring (strokeLinecap="butt", zero seam at 12 o'clock).
 *     2. Overfill arc starts flat at 12 o'clock (strokeLinecap="butt", zero lump at 12 o'clock).
 *     3. Moving tip has a round cap circle placed at (tipX, tipY).
 *     4. A soft tangential drop shadow is cast strictly behind the round tip cap onto the track.
 *     5. Annular clipPath (evenodd fill rule) keeps shadow strictly inside the track.
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
            return (
              <React.Fragment key={idx}>
                {/* Luminous Apple Watch Linear Gradient */}
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ring.gradientStart || "#FF2D55"} />
                  <stop offset="100%" stopColor={ring.gradientEnd || ring.gradientStart || "#FF2D55"} />
                </linearGradient>

                {/* Soft Drop Shadow Filter for the advancing tip */}
                <filter
                  id={shadowFilterId}
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3.0" result="blur" />
                  <feOffset dx="0" dy="0" result="offset" />
                  <feFlood floodColor="#000000" floodOpacity="0.85" result="color" />
                  <feComposite in="color" in2="offset" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
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

          const clipId = `ring-annular-clip-${compId}-${idx}`;
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

          // Tangential shadow placement:
          // Positioned immediately behind the advancing round cap along the track
          const arcBackAngle = overfillAngle - (strokeWidth * 0.42) / radius;
          const shadowX = center + radius * Math.sin(arcBackAngle);
          const shadowY = center - radius * Math.cos(arcBackAngle);
          // Softly fade in shadow as overfill advances past 12 o'clock
          const shadowFade = Math.max(0, Math.min(1, (overfillLap - 0.005) / 0.025));

          // Annular track clip path (proper SVG evenodd fill rule)
          // Strictly confines the shadow to this ring's channel so it never bleeds into adjacent rings
          const outerR = radius + strokeWidth / 2;
          const innerR = radius - strokeWidth / 2;
          const annularClipPath = `M ${center} ${center - outerR} A ${outerR} ${outerR} 0 1 0 ${center} ${center + outerR} A ${outerR} ${outerR} 0 1 0 ${center} ${center - outerR} Z M ${center} ${center - innerR} A ${innerR} ${innerR} 0 1 0 ${center} ${center + innerR} A ${innerR} ${innerR} 0 1 0 ${center} ${center - innerR} Z`;

          // Overfill Arc SVG Path: from 12 o'clock (center, center - radius) clockwise to (tipX, tipY)
          const largeArcFlag = overfillAngle > Math.PI ? 1 : 0;
          const overfillArcPath = `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;

          return (
            <g key={ring.id || idx}>
              {/* Annular Clip Path for this ring's track groove */}
              <clipPath id={clipId}>
                <path d={annularClipPath} fillRule="evenodd" fill="#ffffff" />
              </clipPath>

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
              {/* Under 100%: strokeLinecap="round" */}
              {/* Over 100%: strokeLinecap="butt", strokeDashoffset=0 (100% solid, closed, seamless circle with zero seam at 12 o'clock) */}
              {firstLap > 0.002 && (
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
              )}

              {/* 3. Authentic Tangential Shadow (ONLY on Overfill > 100%) */}
              {/* Soft dark shadow trailing backwards strictly within this ring's annular track */}
              {hasOverfill && !loading && shadowFade > 0 && (
                <g clipPath={`url(#${clipId})`}>
                  <circle
                    cx={shadowX}
                    cy={shadowY}
                    r={strokeWidth * 0.48}
                    fill="#000000"
                    filter={shadowFilterId}
                    opacity={0.82 * shadowFade}
                  />
                </g>
              )}

              {/* 4. Overfill Lap (> 100%) */}
              {/* Flat stroke starting at 12 o'clock with strokeLinecap="butt" */}
              {/* NO round cap at 12 o'clock, completely flush and seamless! */}
              {hasOverfill && !loading && (
                <path
                  d={overfillArcPath}
                  stroke={gradUrl}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  fill="none"
                />
              )}

              {/* 5. Moving Round Tip Cap (> 100%) */}
              {/* A single clean round cap circle placed at (tipX, tipY) on top of the shadow */}
              {hasOverfill && !loading && (
                <circle
                  cx={tipX}
                  cy={tipY}
                  r={strokeWidth / 2}
                  fill={ring.gradientEnd || ringColor}
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
