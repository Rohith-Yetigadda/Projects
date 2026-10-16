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
 * - No stamped circular dots or harsh gradient cut seams.
 * - Luminous track grooves with deep black void center.
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
          {rings.map((_, idx) => {
            const shadowFilterId = `ring-shadow-${compId}-${idx}`;
            return (
              <filter
                key={shadowFilterId}
                id={shadowFilterId}
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="blur" />
                <feOffset dx="0" dy="0" result="offset" />
                <feFlood floodColor="#000000" floodOpacity="0.95" result="color" />
                <feComposite in="color" in2="offset" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
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

          const clipId = `ring-annular-clip-${compId}-${idx}`;
          const shadowFilterId = `url(#ring-shadow-${compId}-${idx})`;
          const ringColor = ring.gradientStart || "#FF2D55";
          const endColor = ring.gradientEnd || ringColor;

          // Annular track boundaries (ensures shadow strictly hugs the track without bleeding)
          const outerR = radius + strokeWidth / 2;
          const innerR = radius - strokeWidth / 2;
          const annularClipPath = `M ${center} ${center - outerR} A ${outerR} ${outerR} 0 1 0 ${center} ${center + outerR} A ${outerR} ${outerR} 0 1 0 ${center} ${center - outerR} Z M ${center} ${center - innerR} A ${innerR} ${innerR} 0 1 0 ${center} ${center + innerR} A ${innerR} ${innerR} 0 1 0 ${center} ${center - innerR} Z`;

          // Overfill calculation (> 100%)
          const hasOverfill = clampedRatio > 1.0;
          // Beyond 100%, calculate the advancing lap (up to 200%+ progress)
          const overfillLap = Math.min(clampedRatio - 1.0, 0.999);
          const overfillAngle = overfillLap * 2 * Math.PI;

          // Tip position of the advancing overfill cap
          const tipX = center + radius * Math.sin(overfillAngle);
          const tipY = center - radius * Math.cos(overfillAngle);

          // Tangential shadow placement:
          // Positioned immediately behind the advancing round cap along the circumference
          const arcBackAngle = overfillAngle - (strokeWidth * 0.45) / radius;
          const shadowX = center + radius * Math.sin(arcBackAngle);
          const shadowY = center - radius * Math.cos(arcBackAngle);

          // Overfill Arc SVG Path from 12 o'clock clockwise to (tipX, tipY)
          const largeArcFlag = overfillAngle > Math.PI ? 1 : 0;
          const overfillArcPath = `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;

          // 12 o'clock position for authentic Apple Watch arrow glyphs
          const arrowY = center - radius;

          return (
            <g key={ring.id || idx}>
              {/* Annular Clip Path for this ring track (proper evenodd fill rule) */}
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
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={
                  loading ? circumference : circumference * (1 - firstLap)
                }
                transform={`rotate(-90 ${center} ${center})`}
                style={{
                  transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />

              {/* 3. Authentic Tangential Shadow (ONLY on Overfill > 100%) */}
              {/* Soft dark shadow trailing backwards strictly within this ring's annular track */}
              {hasOverfill && !loading && (
                <g clipPath={`url(#${clipId})`}>
                  <circle
                    cx={shadowX}
                    cy={shadowY}
                    r={strokeWidth * 0.54}
                    fill="#000000"
                    filter={shadowFilterId}
                    opacity={0.92}
                  />
                  {/* Secondary soft penumbra along the track */}
                  <circle
                    cx={shadowX}
                    cy={shadowY}
                    r={strokeWidth * 0.42}
                    fill="#000000"
                    opacity={0.7}
                  />
                </g>
              )}

              {/* 4. Overfill Lap (> 100%) */}
              {/* Rendered directly on top of the shadow with strokeLinecap="round". */}
              {/* The advancing round cap terminates at (tipX, tipY), casting the shadow behind it. */}
              {/* ZERO separate dot stickers! Smooth continuous Apple Watch ribbon geometry. */}
              {hasOverfill && !loading && (
                <path
                  d={overfillArcPath}
                  stroke={endColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                />
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
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                  {idx === 1 && (
                    // Exercise Ring Double Chevron: ⇉
                    <path
                      d="M -3 -2 L -1 0 L -3 2 M 0.5 -2 L 2.5 0 L 0.5 2"
                      stroke="#000000"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                  {idx === 2 && (
                    // Stand Ring Up Arrow: ↑
                    <path
                      d="M 0 2.5 L 0 -2.5 M -2 -0.5 L 0 -2.5 L 2 -0.5"
                      stroke="#000000"
                      strokeWidth="1.3"
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
