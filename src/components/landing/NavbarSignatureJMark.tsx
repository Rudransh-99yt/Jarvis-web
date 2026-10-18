import React, { useId } from 'react';

export interface NavbarSignatureJMarkProps {
  size?: number;
  className?: string;
}

/**
 * Isolated Navbar Signature J Brand Mark
 * 
 * Compact, precision vector representation matching the signature J identity:
 * - Prominent horizontal top crossbar
 * - Descending vertical stem
 * - Smooth sweeping lower hook curling left and up
 * 
 * Completely decoupled and isolated from the central particle engine.
 */
export const NavbarSignatureJMark: React.FC<NavbarSignatureJMarkProps> = ({
  size = 20,
  className = ''
}) => {
  const rawId = useId();
  const gradId = `nav-signature-j-grad-${rawId.replace(/:/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="J.A.R.V.I.S. Signature J Mark"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F1F6FF" />
          <stop offset="25%" stopColor="#55E8FF" />
          <stop offset="65%" stopColor="#69A9FF" />
          <stop offset="100%" stopColor="#777BFF" />
        </linearGradient>
      </defs>

      {/* Subtle restrained glow backdrop */}
      <g opacity="0.3" filter="drop-shadow(0 0 3px rgba(85,232,255,0.7))">
        {/* Horizontal top crossbar */}
        <path
          d="M 6.5 7.5 H 25.5"
          stroke={`url(#${gradId})`}
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        {/* Descending vertical stem & curved lower hook */}
        <path
          d="M 20.5 7.5 V 19 C 20.5 23.5 16.5 26.2 12.2 26.2 C 8.2 26.2 5.5 23.5 5.5 19.8"
          stroke={`url(#${gradId})`}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Crisp foreground geometry */}
      {/* 1. Horizontal top crossbar */}
      <path
        d="M 6.5 7.5 H 25.5"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 2. Descending vertical stem & curved lower hook */}
      <path
        d="M 20.5 7.5 V 19 C 20.5 23.5 16.5 26.2 12.2 26.2 C 8.2 26.2 5.5 23.5 5.5 19.8"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Subtle cybernetic precision focal node at stem apex */}
      <circle
        cx="20.5"
        cy="7.5"
        r="1.2"
        fill="#FFFFFF"
        opacity="0.95"
      />
    </svg>
  );
};
