/**
 * JARVIS-WEB — Design System Tokens & Semantic Utilities
 * 
 * Provides consistent tokens for:
 * - Neutral Liquid-Glass Material Levels (Level 0 Environment -> Level 3 Floating)
 * - Semantic Neutral Palette (Background, Surface, Border, Text, Accent, Status)
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
  lessonCard: 'glass-lesson-card',
  scheduleCard: 'glass-schedule-card',
  
  // Level 3: Elevated floating surfaces (Modals, Dropdowns, Flyouts, Popovers)
  level3: 'glass-level-3',

  // Interactive Glass Buttons
  btnPrimary: 'glass-btn-primary',
  btnSecondary: 'glass-btn-secondary',
} as const;

export const colorTokens = {
  bg: {
    base: '#07090e',
    surface: 'rgba(18, 22, 33, 0.48)',
    elevated: 'rgba(25, 31, 46, 0.65)',
  },
  text: {
    primary: 'text-neutral-100',
    secondary: 'text-neutral-400',
    muted: 'text-neutral-500',
    accent: 'text-cyan-400',
  },
  border: {
    subtle: 'border-white/[0.08]',
    specular: 'border-white/[0.16]',
    strong: 'border-white/[0.22]',
    accent: 'border-cyan-500/30',
    accentActive: 'border-cyan-400/60',
  },
  accent: {
    cyan: '#06b6d4',
    cyanGlow: 'rgba(6, 182, 212, 0.25)',
    cyanSoft: 'rgba(6, 182, 212, 0.1)',
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
      text: 'text-neutral-200',
      bg: 'bg-white/[0.06]',
      border: 'border-white/[0.12]',
      dot: 'bg-cyan-400',
    },
  },
} as const;

export const typographyTokens = {
  display: 'text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100',
  pageTitle: 'text-xl sm:text-2xl font-bold tracking-tight text-neutral-100',
  sectionTitle: 'text-base sm:text-lg font-semibold tracking-tight text-neutral-100',
  cardTitle: 'text-sm sm:text-base font-semibold text-neutral-100',
  body: 'text-sm text-neutral-300 leading-relaxed',
  secondary: 'text-xs sm:text-sm text-neutral-400 leading-normal',
  caption: 'text-xs text-neutral-400 font-normal',
  metadata: 'text-xs font-mono text-neutral-400 tracking-wide',
  tabular: 'font-mono tabular-nums',
} as const;

export const radiusTokens = {
  controlSm: 'rounded-md',      // 6px
  controlMd: 'rounded-lg',      // 8px-10px
  card: 'rounded-xl',           // 12px
  panel: 'rounded-2xl',         // 16px
  full: 'rounded-full',
} as const;
