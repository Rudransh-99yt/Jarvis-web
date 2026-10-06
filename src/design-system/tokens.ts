/**
 * JARVIS-WEB — Design System Tokens & Semantic Utilities
 * 
 * Provides consistent tokens for:
 * - Liquid-Glass Material Levels (Level 0 Environment -> Level 3 Floating)
 * - Semantic Palette (Background, Surface, Border, Text, Accent, Status)
 * - Typography Hierarchy (Display, Page Title, Section, Body, Caption, Tabular)
 * - Radius, Spacing, and Elevation math
 */

export const glassTokens = {
  // Level 0: Atmospheric environment canvas
  level0: 'glass-level-0',
  
  // Level 1: Primary shell chrome (Sidebar, Top Navigation)
  level1: 'glass-level-1',
  
  // Level 2: Content containers (Cards, Lists, Panels, Stats)
  level2: 'glass-level-2',
  level2Interactive: 'glass-level-2-interactive',
  
  // Level 3: Elevated floating surfaces (Modals, Dropdowns, Flyouts, Popovers)
  level3: 'glass-level-3',
} as const;

export const colorTokens = {
  bg: {
    base: '#050811',
    surface: '#0b1120',
    elevated: '#111a2e',
  },
  text: {
    primary: 'text-slate-100',
    secondary: 'text-slate-400',
    muted: 'text-slate-500',
    accent: 'text-cyan-400',
  },
  border: {
    subtle: 'border-white/[0.08]',
    strong: 'border-white/[0.15]',
    accent: 'border-cyan-500/30',
    accentActive: 'border-cyan-400/60',
  },
  status: {
    success: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      dot: 'bg-emerald-400',
    },
    warning: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/25',
      dot: 'bg-amber-400',
    },
    danger: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      dot: 'bg-rose-400',
    },
    info: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/25',
      dot: 'bg-cyan-400',
    },
  },
} as const;

export const typographyTokens = {
  display: 'text-2xl sm:text-3xl font-bold tracking-tight text-slate-100',
  pageTitle: 'text-xl sm:text-2xl font-bold tracking-tight text-slate-100',
  sectionTitle: 'text-base sm:text-lg font-semibold tracking-tight text-slate-100',
  cardTitle: 'text-sm sm:text-base font-semibold text-slate-100',
  body: 'text-sm text-slate-300 leading-relaxed',
  secondary: 'text-xs sm:text-sm text-slate-400 leading-normal',
  caption: 'text-xs text-slate-400 font-normal',
  metadata: 'text-xs font-mono text-slate-400 tracking-wide',
  tabular: 'font-mono tabular-nums',
} as const;

export const radiusTokens = {
  controlSm: 'rounded-md',      // 6px
  controlMd: 'rounded-lg',      // 8px-10px
  card: 'rounded-xl',           // 12px
  panel: 'rounded-2xl',         // 16px
  full: 'rounded-full',
} as const;
