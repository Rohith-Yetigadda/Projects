
export interface LogoProps {
  size?: number;
  className?: string;
  variant?: "white" | "emerald" | "accent";
}

/**
 * OPTION 1: The Precision Meridian
 * Modernist compass needle pointing North-East (Zenith / Growth).
 * Dual-tone diamond facet with subtle precision ticks.
 */
export function LogoOption1({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" />
      <circle cx="20" cy="20" r="13" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" strokeOpacity="0.25" />
      {/* 4 Cardinal Marks */}
      <line x1="20" y1="3" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="37" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="20" y1="37" x2="20" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="3" y1="20" x2="6" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Precision Needle angled 45deg toward growth */}
      <g transform="rotate(45 20 20)">
        <polygon points="20,6 24,20 20,18" fill="currentColor" />
        <polygon points="20,6 16,20 20,18" fill="currentColor" fillOpacity="0.4" />
        <polygon points="20,34 24,20 20,22" fill="currentColor" fillOpacity="0.3" />
        <polygon points="20,34 16,20 20,22" fill="currentColor" fillOpacity="0.15" />
      </g>
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 2: The Recomp Orbit (Transformation Loop)
 * Two interlocking minimalist arcs forming a continuous body transformation cycle
 * terminating in a clean directional arrow.
 */
export function LogoOption2({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Continuous Transformation Loop */}
      <path
        d="M 20 6 A 14 14 0 1 1 7.2 26"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 20 34 A 14 14 0 0 1 32.8 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />
      {/* Directional Needle Arrow at Apex */}
      <polygon points="24,4 32,8 26,14 26,9 20,9" fill="currentColor" />
      <circle cx="20" cy="20" r="3" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 3: The Monogram 'R' Compass
 * Architectural capital 'R' fused seamlessly with a precision compass needle.
 */
export function LogoOption3({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      {/* Spine of R */}
      <line x1="12" y1="10" x2="12" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Loop of R */}
      <path
        d="M 12 10 L 22 10 C 26.5 10 26.5 20 22 20 L 12 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Diagonal Needle leg of R pointing down-right to calibrate balance */}
      <polygon points="18,19 31,31 24,31 15,22" fill="currentColor" />
      <circle cx="28" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 4: The Calibrated Reticle / Swiss Target
 * Clean chronograph ring with North-accentuated tick and floating diamond pivot.
 */
export function LogoOption4({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      {/* Tick Marks */}
      <line x1="20" y1="4" x2="20" y2="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="20" y1="36" x2="20" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="4" y1="20" x2="8" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Inner Floating Target Needle */}
      <polygon points="20,10 24.5,20 20,18" fill="currentColor" />
      <polygon points="20,10 15.5,20 20,18" fill="currentColor" fillOpacity="0.4" />
      <polygon points="20,30 24.5,20 20,22" fill="currentColor" fillOpacity="0.3" />
      <polygon points="20,30 15.5,20 20,22" fill="currentColor" fillOpacity="0.15" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 5: The North Star Prism (Zenith Facet)
 * An 8-point faceted modernist compass star. Sharp, architectural, athletic.
 */
export function LogoOption5({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* North Ray */}
      <polygon points="20,4 23,17 20,20" fill="currentColor" />
      <polygon points="20,4 17,17 20,20" fill="currentColor" fillOpacity="0.4" />
      {/* East Ray */}
      <polygon points="36,20 23,23 20,20" fill="currentColor" fillOpacity="0.3" />
      <polygon points="36,20 23,17 20,20" fill="currentColor" fillOpacity="0.6" />
      {/* South Ray */}
      <polygon points="20,36 17,23 20,20" fill="currentColor" fillOpacity="0.25" />
      <polygon points="20,36 23,23 20,20" fill="currentColor" fillOpacity="0.1" />
      {/* West Ray */}
      <polygon points="4,20 17,17 20,20" fill="currentColor" fillOpacity="0.3" />
      <polygon points="4,20 17,23 20,20" fill="currentColor" fillOpacity="0.15" />
      {/* 4 Diagonal Mini Spikes */}
      <polygon points="30,10 22,18 20,20" fill="currentColor" fillOpacity="0.4" />
      <polygon points="10,30 18,22 20,20" fill="currentColor" fillOpacity="0.2" />
      <polygon points="30,30 22,22 20,20" fill="currentColor" fillOpacity="0.2" />
      <polygon points="10,10 18,18 20,20" fill="currentColor" fillOpacity="0.3" />
      {/* Core Center Dot */}
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 6: The Apex Compass (Forward Chevron Through Horizon)
 * Clean upward chevron needle breaking through an open horizon arc.
 * Symbolizes exceeding targets and continuous elevation.
 */
export function LogoOption6({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Open Arc Horizon */}
      <path
        d="M 8 24 A 15 15 0 1 1 32 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      {/* Floating Base Notch */}
      <path
        d="M 14 30 L 26 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.15"
      />
      {/* Apex Chevron Needle */}
      <polygon points="20,6 28,22 20,18" fill="currentColor" />
      <polygon points="20,6 12,22 20,18" fill="currentColor" fillOpacity="0.4" />
      <circle cx="20" cy="18" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 7: The Dual-Axis Caliper
 * Two razor-thin nested circular calipers intersecting at 45°.
 * High-fashion / luxury sports nutrition aesthetic.
 */
export function LogoOption7({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="2" />
      {/* Inner Elliptical Compass Ring */}
      <ellipse cx="20" cy="20" rx="17" ry="7" transform="rotate(-45 20 20)" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Central Axis Point */}
      <line x1="8" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polygon points="32,32 30,24 24,30" fill="currentColor" />
      <circle cx="20" cy="20" r="3.5" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 8: The Quantum Macro Rings Compass
 * Concentric activity rings cut by a sharp directional indicator.
 * Ties directly to the Apple Activity Rings in Daily Log & Progress.
 */
export function LogoOption8({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer Calorie Ring */}
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      {/* Middle Protein Ring */}
      <circle cx="20" cy="20" r="11" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
      {/* Inner Ring */}
      <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      {/* 45° Directional Arrow Ray */}
      <path
        d="M 20 20 L 32 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <polygon points="34,6 26,7 33,14" fill="currentColor" />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * OPTION 9: The Kinetic Minimalist Silhouette
 * Solid squircle container with a clean subtracted negative-space compass needle.
 * Ideal for modern iOS app icons, pwa icons, and sleek monochrome badges.
 */
export function LogoOption9({ size = 32, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* App Squircle Shape */}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="currentColor" />
      {/* Negative Space Cutout Needle */}
      <g transform="rotate(45 20 20)">
        <polygon points="20,8 25,20 20,18" fill="#0c0e12" />
        <polygon points="20,8 15,20 20,18" fill="#181b22" />
        <polygon points="20,32 25,20 20,22" fill="#181b22" fillOpacity="0.7" />
        <polygon points="20,32 15,20 20,22" fill="#0c0e12" />
        <circle cx="20" cy="20" r="2.5" fill="#0c0e12" />
      </g>
    </svg>
  );
}

export const LOGO_OPTIONS = [
  { id: 1, name: "The Precision Meridian", desc: "45° Zenith diamond needle with Swiss quadrant tick-marks. Elegant, high-precision guidance.", Component: LogoOption1 },
  { id: 2, name: "The Recomp Orbit", desc: "Continuous dual-arc transformation loop with an apex directional arrow. Symbolizes body recomposition.", Component: LogoOption2 },
  { id: 3, name: "The Monogram 'R' Compass", desc: "Architectural capital 'R' seamlessly morphing into a sharp directional compass vector.", Component: LogoOption3 },
  { id: 4, name: "The Calibrated Reticle", desc: "Precision chronograph ring with North priority marker and dual-tone floating diamond needle.", Component: LogoOption4 },
  { id: 5, name: "The North Star Prism", desc: "8-point faceted modernist star. Architectural, athletic, and razor-sharp clarity.", Component: LogoOption5 },
  { id: 6, name: "The Apex Compass", desc: "Upward chevron needle breaking through an open horizon arc. Forward momentum and elevation.", Component: LogoOption6 },
  { id: 7, name: "The Dual-Axis Caliper", desc: "Intersecting elliptical rings and directional caliper axis. High-end luxury sports aesthetic.", Component: LogoOption7 },
  { id: 8, name: "The Quantum Macro Ring", desc: "Concentric target rings sliced by a northeast compass ray. Direct homage to Apple Fitness rings.", Component: LogoOption8 },
  { id: 9, name: "The Kinetic Squircle", desc: "Solid modern squircle icon with high-contrast negative-space needle cutout. Premium iOS app icon.", Component: LogoOption9 },
];
