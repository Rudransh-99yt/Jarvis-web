import React, { useEffect } from 'react';
import { JarvisCore } from '../../../components/brand/JarvisCore.tsx';
import { JarvisMark } from '../../../components/brand/JarvisMark.tsx';
import { PlayCircle, ArrowRight, Flame, Trophy, Sparkles, X, Compass } from 'lucide-react';

export interface MilestoneMoment {
  type: 'streak' | 'readiness' | 'mastery' | 'breakthrough';
  badge: string;
  headline: string;
  description: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  metricLabel?: string;
  metricValue?: string;
}

export interface JarvisOpeningExperienceProps {
  isOpen: boolean;
  onDismiss: () => void;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  moment?: MilestoneMoment;
}

const DEFAULT_MOMENT: MilestoneMoment = {
  type: 'streak',
  badge: 'DAILY SYNC PROTOCOL · DAY 5 STREAK',
  headline: 'Harmonic Oscillator Spectrum Ready',
  description:
    'You have locked in 5 consecutive days of verified study. Quantum Ladder Operators [a, a†] = 1 are synthesized. Lecture 2 awaits your focus session.',
  primaryActionLabel: 'Enter Lesson 2 · Start Focus (25m)',
  secondaryActionLabel: 'View Schedule & Tasks',
  metricLabel: 'PHYS-301 Mastery',
  metricValue: '78%'
};

/**
 * Jarvis Opening Experience
 * 
 * An intentional, focused milestone moment when entering the Education OS.
 * Answers: "What is the most important thing I should notice?" -> "What should I do next?"
 * 
 * ONE VISUAL · ONE MESSAGE · ONE DETAIL · ONE PRIMARY ACTION · ONE SECONDARY ACTION
 */
export const JarvisOpeningExperience: React.FC<JarvisOpeningExperienceProps> = ({
  isOpen,
  onDismiss,
  onPrimaryAction,
  onSecondaryAction,
  moment = DEFAULT_MOMENT
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      } else if (e.key === 'Enter') {
        onPrimaryAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss, onPrimaryAction]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="opening-moment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in"
    >
      {/* 1. Volumetric Environmental Lighting Behind the Moment Surface */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[25%] left-[20%] w-[55%] h-[45%] bg-cyan-500/[0.04] rounded-full blur-[160px]" />
        <div className="absolute top-[35%] right-[25%] w-[45%] h-[40%] bg-violet-600/[0.03] rounded-full blur-[180px]" />
        <div className="absolute bottom-[20%] left-[35%] w-[40%] h-[35%] bg-teal-500/[0.03] rounded-full blur-[160px]" />
      </div>

      {/* 2. Focused Liquid Glass Capsule (Level 5 Special Jarvis Moment) */}
      <div className="relative w-full max-w-xl rounded-3xl glass-level-3 border-t border-t-white/[0.22] border-x border-x-white/[0.10] border-b border-b-white/[0.05] p-7 sm:p-10 shadow-[0_32px_96px_-12px_rgba(0,0,0,0.9),0_0_32px_rgba(6,182,212,0.08),inset_0_1px_0_0_rgba(255,255,255,0.30)] animate-scale-in text-center flex flex-col items-center space-y-6">
        {/* Close / Dismiss Escape Hatch */}
        <button
          onClick={onDismiss}
          title="Skip to Workspace (Esc)"
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-ring"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ONE VISUAL: Living Jarvis Neural Core & Brand Mark Emblem */}
        <div className="relative flex items-center justify-center pt-2">
          <div className="relative">
            <JarvisCore size="hero" state="thinking" label="Jarvis Daily Protocol Core" />
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-black/70 border border-white/[0.15] backdrop-blur-md shadow-md">
              <JarvisMark size="sm" variant="default" glow />
            </div>
          </div>
        </div>

        {/* Milestone Category & Protocol Metadata (Clean Unboxed Typography) */}
        <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-neutral-300 uppercase font-medium">
          {moment.type === 'streak' && <Flame className="w-3.5 h-3.5 text-amber-400/90" />}
          {moment.type === 'mastery' && <Trophy className="w-3.5 h-3.5 text-neutral-300" />}
          {moment.type === 'breakthrough' && <Sparkles className="w-3.5 h-3.5 text-neutral-300" />}
          {moment.type === 'readiness' && <Compass className="w-3.5 h-3.5 text-neutral-300" />}
          <span>{moment.badge}</span>
        </div>

        {/* ONE MESSAGE: Strong, Confident, Large Typography */}
        <div className="space-y-3 max-w-md">
          <h2
            id="opening-moment-title"
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug"
          >
            {moment.headline}
          </h2>

          {/* ONE SUPPORTING DETAIL: Clean, High Readability */}
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
            {moment.description}
          </p>
        </div>

        {/* Key Metric Spotlight (If Available) */}
        {moment.metricLabel && moment.metricValue && (
          <div className="flex items-center gap-4 py-2.5 px-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-xs font-mono">
            <span className="text-neutral-400 uppercase tracking-wider">{moment.metricLabel}</span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span className="text-white font-semibold text-sm tabular-nums">{moment.metricValue}</span>
          </div>
        )}

        {/* ACTION CLUSTER: One Primary Action + One Secondary Action */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onPrimaryAction}
            className="w-full sm:w-auto min-w-[220px] px-6 py-3 rounded-xl glass-btn-primary font-semibold text-xs sm:text-sm tracking-wide cursor-pointer flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(6,182,212,0.25)] focus-ring group"
          >
            <PlayCircle className="w-4 h-4 text-cyan-200 group-hover:scale-110 transition-transform" />
            <span>{moment.primaryActionLabel}</span>
          </button>

          <button
            onClick={onSecondaryAction || onDismiss}
            className="w-full sm:w-auto px-5 py-3 rounded-xl glass-btn-secondary text-xs sm:text-sm text-neutral-300 hover:text-white cursor-pointer flex items-center justify-center gap-1.5 focus-ring"
          >
            <span>{moment.secondaryActionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="text-[10px] font-mono text-neutral-500 pt-1">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-300">Enter</kbd> to launch or <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-300">Esc</kbd> to skip
        </div>
      </div>
    </div>
  );
};
