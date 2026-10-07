import React from 'react';

export type JarvisCoreState = 'idle' | 'thinking' | 'speaking' | 'listening' | 'success' | 'warning';
export type JarvisCoreSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

export interface JarvisCoreProps {
  state?: JarvisCoreState;
  size?: JarvisCoreSize;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  label?: string;
}

const SIZE_MAP: Record<JarvisCoreSize, { container: string; orb: string; rings: string }> = {
  xs: { container: 'w-5 h-5', orb: 'w-3 h-3', rings: 'w-5 h-5' },
  sm: { container: 'w-7 h-7', orb: 'w-4 h-4', rings: 'w-7 h-7' },
  md: { container: 'w-10 h-10', orb: 'w-6 h-6', rings: 'w-10 h-10' },
  lg: { container: 'w-16 h-16', orb: 'w-10 h-10', rings: 'w-16 h-16' },
  hero: { container: 'w-24 h-24', orb: 'w-16 h-16', rings: 'w-24 h-24' }
};

/**
 * Jarvis Living Intelligence Core
 * 
 * A subtle, alive physical presence with breathing light, specular rim,
 * and contextual state reactivity (idle, thinking, speaking, listening, success, warning).
 */
export const JarvisCore: React.FC<JarvisCoreProps> = ({
  state = 'idle',
  size = 'md',
  interactive = false,
  onClick,
  className = '',
  label
}) => {
  const config = SIZE_MAP[size] || SIZE_MAP.md;

  const stateColors = {
    idle: {
      core: 'from-cyan-400 via-sky-500 to-indigo-600',
      glow: 'rgba(6, 182, 212, 0.35)',
      rim: 'border-cyan-400/40',
      pulseSpeed: 'duration-[3500ms]'
    },
    thinking: {
      core: 'from-violet-400 via-indigo-500 to-cyan-500',
      glow: 'rgba(139, 92, 246, 0.45)',
      rim: 'border-violet-400/50',
      pulseSpeed: 'duration-[1200ms]'
    },
    speaking: {
      core: 'from-cyan-300 via-teal-400 to-blue-600',
      glow: 'rgba(20, 184, 166, 0.45)',
      rim: 'border-cyan-300/60',
      pulseSpeed: 'duration-[1600ms]'
    },
    listening: {
      core: 'from-amber-300 via-cyan-400 to-sky-600',
      glow: 'rgba(245, 158, 11, 0.40)',
      rim: 'border-amber-400/50',
      pulseSpeed: 'duration-[1800ms]'
    },
    success: {
      core: 'from-emerald-300 via-teal-400 to-cyan-600',
      glow: 'rgba(52, 211, 153, 0.45)',
      rim: 'border-emerald-400/60',
      pulseSpeed: 'duration-[2000ms]'
    },
    warning: {
      core: 'from-amber-400 via-rose-500 to-indigo-600',
      glow: 'rgba(244, 63, 94, 0.45)',
      rim: 'border-amber-400/50',
      pulseSpeed: 'duration-[1500ms]'
    }
  }[state];

  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${config.container} ${
        interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      } ${className}`}
      title={label || `Jarvis Neural Core: ${state}`}
      aria-label={label || `Jarvis Neural Core: ${state}`}
    >
      {/* 1. Deep Atmospheric Halos (Volumetric Light Bleed) */}
      <div
        className={`absolute inset-0 rounded-full blur-[10px] pointer-events-none transition-all ${stateColors.pulseSpeed} animate-pulse`}
        style={{ backgroundColor: stateColors.glow }}
        aria-hidden="true"
      />

      {/* 2. Outer Specular Latitude Ring */}
      <div
        className={`absolute inset-0.5 rounded-full border border-dashed ${stateColors.rim} opacity-40 pointer-events-none ${
          state === 'thinking' ? 'animate-spin' : ''
        }`}
        style={{ animationDuration: state === 'thinking' ? '6s' : undefined }}
        aria-hidden="true"
      />

      {/* 3. Equatorial Orbital Ring with Hairline Gap */}
      <div
        className={`absolute inset-1 rounded-full border ${stateColors.rim} opacity-60 pointer-events-none`}
        aria-hidden="true"
      />

      {/* 4. The Optical Fluid Core (Living Sphere) */}
      <div
        className={`relative rounded-full bg-gradient-to-tr ${stateColors.core} ${config.orb} shadow-inner overflow-hidden transition-all duration-500`}
      >
        {/* Specular Glint (Top-left refraction highlight) */}
        <div
          className="absolute -top-[15%] -left-[15%] w-[65%] h-[65%] rounded-full bg-gradient-to-br from-white/90 via-white/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Ambient Occlusion Base shadow */}
        <div
          className="absolute -bottom-[20%] -right-[20%] w-[75%] h-[75%] rounded-full bg-black/40 blur-[2px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Central Pulse Singularity */}
        <div
          className="absolute inset-[30%] rounded-full bg-white/60 blur-[1px] animate-ping pointer-events-none"
          style={{ animationDuration: '3s' }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
