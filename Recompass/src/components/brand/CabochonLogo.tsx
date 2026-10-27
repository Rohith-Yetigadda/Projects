export interface CabochonLogoProps {
  size?: number;
  className?: string;
}

export function CabochonLogo({ size = 32, className = "" }: CabochonLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Tier 1: Deep Forest Base */}
      <rect x="6" y="6" width="36" height="36" rx="11" fill="#082b20" />
      {/* Tier 2: Rich Jade Layer */}
      <rect x="11.5" y="11.5" width="25" height="25" rx="8" fill="#0a7a53" />
      {/* Tier 3: Luminous Mint Core */}
      <rect x="17" y="17" width="14" height="14" rx="4.5" fill="#4ade80" />
      {/* Specular Catchlight */}
      <circle cx="20.5" cy="20.5" r="2.5" fill="#ffffff" fillOpacity="0.95" />
    </svg>
  );
}
