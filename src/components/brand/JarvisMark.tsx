import React from 'react';

export type JarvisMarkSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
export type JarvisMarkVariant = 'default' | 'monochrome' | 'aurora' | 'light' | 'pulse';

export interface JarvisMarkProps extends React.SVGAttributes<SVGSVGElement> {
  size?: JarvisMarkSize | number;
  variant?: JarvisMarkVariant;
  className?: string;
  glow?: boolean;
}

const SIZE_MAP: Record<JarvisMarkSize, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 72,
  hero: 96
};

/**
 * Jarvis Identity Mark (Vector Geometry Architecture)
 * 
 * Fuses the geometric letter 'J' with a quantum orbital ring, neural signal node,
 * and knowledge focal point. Scales from 16px micro-icon to 96px+ hero mark.
 */
export const JarvisMark: React.FC<JarvisMarkProps> = ({
  size = 'md',
  variant = 'default',
  className = '',
  glow = false,
  ...props
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 32;
  const uniqueId = React.useId().replace(/:/g, '');

  const strokeColor = {
    default: `url(#jarvis-grad-${uniqueId})`,
    monochrome: 'currentColor',
    aurora: `url(#jarvis-aurora-${uniqueId})`,
    light: '#0a0f1d',
    pulse: '#06b6d4'
  }[variant];

  const nodeColor = {
    default: '#38bdf8',
    monochrome: 'currentColor',
    aurora: '#c084fc',
    light: '#0284c7',
    pulse: '#22d3ee'
  }[variant];

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${glow ? 'drop-shadow-[0_0_12px_rgba(6,182,212,0.45)]' : ''} ${className}`}
      aria-label="JARVIS Intelligent OS Mark"
      role="img"
      {...props}
    >
      <defs>
        {/* Core Cyan-Indigo Jarvis Energy Gradient */}
        <linearGradient id={`jarvis-grad-${uniqueId}`} x1="16" y1="14" x2="84" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        {/* Aurora Deep Spectrum Gradient */}
        <linearGradient id={`jarvis-aurora-${uniqueId}`} x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="85%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      {/* 1. Precision Orbital Halo (Outer Lens Arc) */}
      <path
        d="M50 12 A 38 38 0 1 1 20 74"
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        opacity={variant === 'monochrome' ? 0.95 : 0.85}
      />

      {/* 2. Iconic Architectural 'J' Stem & Loop */}
      <path
        d="M56 16 V56 C56 66.5 47.5 75 37 75 C26.5 75 18 66.5 18 56 V50"
        stroke={strokeColor}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Singularity Intelligence Focal Apex (Orbital Aperture Node) */}
      <circle
        cx="72"
        cy="28"
        r="4.5"
        fill={nodeColor}
      />
      <circle
        cx="72"
        cy="28"
        r="2"
        fill="#ffffff"
      />
    </svg>
  );
};
