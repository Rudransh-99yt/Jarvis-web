import React, { useState, useEffect } from 'react';
import { PublicHeader } from './PublicHeader.tsx';
import { CinematicParticleField } from './CinematicParticleField.tsx';
import { JarvisCore, type JarvisCoreState } from '../brand/JarvisCore.tsx';
import { JarvisMark } from '../brand/JarvisMark.tsx';
import { GlassCard } from '../ui/GlassCard.tsx';
import { Button } from '../ui/Button.tsx';
import { useRouter } from '../../services/router.ts';
import { useMagnificationRail } from '../../design-system/useMagnification.ts';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  GraduationCap,
  FlaskConical,
  ShieldAlert,
  Flame,
  Radio,
  Bookmark,
  Users,
  Brain,
  CheckCircle2,
  Lock,
  Cpu,
  Compass,
  Zap,
  Globe
} from 'lucide-react';

const HEADLINE_WORDS = ['Your', 'mind', 'with', 'more', 'possibilities', 'everyday'];

export const PublicLandingView: React.FC = () => {
  const { navigate } = useRouter();
  const [coreState, setCoreState] = useState<JarvisCoreState>('idle');
  const [activeEcosystemTab, setActiveEcosystemTab] = useState<'education' | 'research' | 'command'>('education');

  // Page 0 Opening animation sequence states (Merged 6-Phase Lifecycle)
  const [particleOpacity, setParticleOpacity] = useState(1);
  const [visibleWordsCount, setVisibleWordsCount] = useState(0);
  const [isSupportingLineVisible, setIsSupportingLineVisible] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setParticleOpacity(1);
      setVisibleWordsCount(HEADLINE_WORDS.length);
      setIsSupportingLineVisible(true);
      setIsNavbarVisible(true);
      return;
    }

    // Phase 1 (0 - 1000ms): Black void & central particle bubble emerges
    // Phase 2 (1000ms+): Headline starts appearing first, followed 100-150ms later by the tagline
    const headlineStartMs = 1000;
    const wordIntervalMs = 240;
    const wordTimers: NodeJS.Timeout[] = [];

    HEADLINE_WORDS.forEach((_, idx) => {
      const timer = setTimeout(() => {
        setVisibleWordsCount(idx + 1);
      }, headlineStartMs + idx * wordIntervalMs);
      wordTimers.push(timer);
    });

    // Tagline begins appearing 120ms after the headline visibly starts
    const tSupporting = setTimeout(() => {
      setIsSupportingLineVisible(true);
    }, headlineStartMs + 120);

    // Navbar enters smoothly as particle universe establishes (preserved timing)
    const tNavbar = setTimeout(() => {
      setIsNavbarVisible(true);
    }, 7800);

    return () => {
      clearTimeout(tSupporting);
      wordTimers.forEach((t) => clearTimeout(t));
      clearTimeout(tNavbar);
    };
  }, []);

  // Interactive live Proximity Magnification Rail demo
  const {
    containerRef: dockContainerRef,
    registerItem: registerDockRef,
    handlePointerMove: handleDockPointerMove,
    handlePointerLeave: handleDockPointerLeave
  } = useMagnificationRail('quickActions');

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-100 font-sans relative">
      {/* Level 0: Living Atmospheric Environment & Monumental Architectural Ghost Typography */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden" aria-hidden="true">
        {/* Soft radial focal light specifically positioned behind the JarvisCore hero */}
        <div className="absolute top-[80px] sm:top-[120px] left-1/2 -translate-x-1/2 w-[520px] sm:w-[680px] h-[440px] sm:h-[520px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.075)_0%,rgba(14,165,233,0.025)_45%,transparent_72%)] rounded-full blur-[35px]" />
        
        {/* Deep navy-to-black atmospheric illumination fields */}
        <div className="absolute top-[-15%] left-[8%] w-[55vw] h-[45vh] bg-cyan-500/[0.035] rounded-full blur-[150px]" />
        <div className="absolute top-[12%] right-[-10%] w-[50vw] h-[42vh] bg-indigo-500/[0.025] rounded-full blur-[160px]" />
        <div className="absolute top-[45%] left-[-12%] w-[48vw] h-[36vh] bg-teal-500/[0.02] rounded-full blur-[170px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[52vw] h-[40vh] bg-cyan-600/[0.028] rounded-full blur-[160px]" />

        {/* =========================================================================
            MONUMENTAL ARCHITECTURAL GHOST TYPOGRAPHY LAYER
            Low-opacity, oversized editorial letterforms embedded in the deep environment
           ========================================================================= */}
        
        {/* Motif 1: 'JARVIS' — Anchoring the upper horizon and peeking through the floating Liquid Glass 3.0 nav */}
        <div className="absolute top-[8px] sm:top-[20px] left-1/2 -translate-x-1/2 w-full max-w-[1440px] px-4 flex justify-center pointer-events-none select-none">
          <span className="font-orbitron font-black text-[18vw] sm:text-[16vw] lg:text-[195px] xl:text-[230px] leading-none tracking-[-0.05em] uppercase select-none opacity-[0.032] sm:opacity-[0.038] text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-300/40 to-transparent">
            JARVIS
          </span>
        </div>

        {/* Motif 2: 'INTELLIGENCE' — Spanning across the transition zone toward Sovereign Identity */}
        <div className="absolute top-[480px] sm:top-[580px] -right-[5%] lg:right-[2%] pointer-events-none select-none">
          <span className="font-orbitron font-extrabold text-[12vw] sm:text-[11vw] lg:text-[145px] leading-none tracking-[-0.04em] uppercase select-none opacity-[0.022] sm:opacity-[0.028] text-transparent bg-clip-text bg-gradient-to-br from-white/80 via-cyan-400/30 to-transparent">
            INTELLIGENCE
          </span>
        </div>

        {/* Motif 3: 'PERSONAL OS' — Watermarked behind the Sovereign Pillars & Ecosystem */}
        <div className="absolute top-[1250px] sm:top-[1400px] -left-[4%] pointer-events-none select-none">
          <span className="font-orbitron font-extrabold text-[13vw] sm:text-[10vw] lg:text-[135px] leading-none tracking-[-0.04em] uppercase select-none opacity-[0.020] sm:opacity-[0.026] text-transparent bg-clip-text bg-gradient-to-r from-white/70 via-indigo-300/30 to-transparent">
            PERSONAL OS
          </span>
        </div>

        {/* Motif 4: 'THINK · LEARN · CREATE' — Behind the Platform Ecosystem */}
        <div className="absolute top-[2100px] sm:top-[2350px] right-0 max-w-[90vw] text-right pointer-events-none select-none pr-4 lg:pr-12">
          <span className="font-orbitron font-bold text-[8vw] sm:text-[6.5vw] lg:text-[95px] leading-none tracking-[-0.03em] uppercase select-none opacity-[0.018] sm:opacity-[0.024] text-transparent bg-clip-text bg-gradient-to-b from-white/60 via-cyan-400/20 to-transparent">
            THINK / LEARN / CREATE
          </span>
        </div>

        {/* Motif 5: 'YOUR WORLD' — Low horizon signature mark */}
        <div className="absolute bottom-[350px] sm:bottom-[450px] left-[3%] pointer-events-none select-none">
          <span className="font-orbitron font-black text-[12vw] sm:text-[9vw] lg:text-[120px] leading-none tracking-[-0.04em] uppercase select-none opacity-[0.016] sm:opacity-[0.022] text-transparent bg-clip-text bg-gradient-to-tr from-white/50 via-teal-300/20 to-transparent">
            YOUR WORLD
          </span>
        </div>
      </div>

      {/* Public Header with Smooth Entrance Transition */}
      <PublicHeader isVisible={isNavbarVisible} />

      {/* Main Content Sections with Generous Top Spacing and Anchor Clearance */}
      <main className="relative z-10 flex-1 pb-24 space-y-28 sm:space-y-36">
        
        {/* =========================================================================
            PAGE 0: OPENING HERO EXPERIENCE
            Deep black background, living multi-colour neon particle field,
            word-by-word headline reveal, and secondary supporting line.
           ========================================================================= */}
        <section
          id="vision"
          className="relative min-h-screen w-full flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-20 pb-16 scroll-mt-24 sm:scroll-mt-28 overflow-hidden bg-black select-none"
        >
          {/* Original Cinematic Multi-Colour Neon Particle Field */}
          <CinematicParticleField opacity={particleOpacity} />

          {/* Opening Hero Typography Presentation */}
          <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center pointer-events-auto px-4 py-8">
            {/* Prominent, large, bright, visually striking headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.5rem] font-extrabold text-white tracking-[-0.035em] leading-[1.08] drop-shadow-[0_0_45px_rgba(255,255,255,0.32)] select-none">
              {HEADLINE_WORDS.map((word, idx) => (
                <span
                  key={idx}
                  className={`inline-block mr-[0.24em] last:mr-0 transition-all duration-700 ease-out select-none ${
                    visibleWordsCount > idx
                      ? 'opacity-100 translate-y-0 filter-none'
                      : 'opacity-0 translate-y-6 blur-[3px]'
                  }`}
                >
                  {word}
                </span>
              ))}
            </h1>

            {/* Restored Liquid-Glass Tagline — Letterforms with specular highlights, refraction & reflection sweep */}
            <p
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              className={`text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide mt-6 sm:mt-8 transition-all duration-1000 ease-out select-none liquid-glass-text ${
                isSupportingLineVisible
                  ? 'opacity-100 translate-y-0 filter-none'
                  : 'opacity-0 translate-y-4 blur-[2px]'
              }`}
            >
              Intelligence your way
            </p>
          </div>
        </section>

        {/* =========================================================================
            2. THE THREE SOVEREIGN PILLARS
           ========================================================================= */}
        <section id="sovereignty" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24 sm:scroll-mt-28">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold">
              The Architecture of Autonomy
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              One persistent identity. Free from institutional lock-in.
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Traditional academic and enterprise platforms delete or revoke your workspace when you graduate or change teams. Jarvis reverses this hierarchy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <GlassCard level="2" className="p-6 sm:p-7 space-y-4 border-t border-t-white/[0.16]">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Sovereign Personal Identity</h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Your memory vault, preferred cognitive styles, personal formulas, and long-term goals belong to you. When you switch universities or join a research institute, your Jarvis seamlessly travels with you.
                </p>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-white/[0.06] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Persistent across life stages</span>
              </div>
            </GlassCard>

            {/* Pillar 2 */}
            <GlassCard level="2" className="p-6 sm:p-7 space-y-4 border-t border-t-white/[0.16]">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">Context-Isolated Workspaces</h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Strict cryptographic boundaries partition your personal study notes from school courses and enterprise research. School administrators and teachers can never access your private personal memories.
                </p>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-white/[0.06] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Zero cross-tenant memory leakage</span>
              </div>
            </GlassCard>

            {/* Pillar 3 */}
            <GlassCard level="2" className="p-6 sm:p-7 space-y-4 border-t border-t-white/[0.16]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">First-Principles Intelligence</h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Jarvis never acts as a lazy answer-generator. Through cognitive diagnostic checkpoints, step-by-step mathematical proofs, and grounded lecture waveforms, Jarvis builds genuine comprehension.
                </p>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-white/[0.06] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active pedagogical mastery</span>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* =========================================================================
            3. INTERACTIVE ECOSYSTEM SHOWCASE
           ========================================================================= */}
        <section id="ecosystem" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24 sm:scroll-mt-28">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold">
                Connected Spheres of Operating System
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                Explore the platform ecosystem
              </h2>
            </div>

            {/* Ecosystem Selector Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md self-start md:self-auto text-xs font-medium">
              <button
                onClick={() => setActiveEcosystemTab('education')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeEcosystemTab === 'education'
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.16] shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-cyan-300" />
                <span>Education OS</span>
              </button>
              <button
                onClick={() => setActiveEcosystemTab('research')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeEcosystemTab === 'research'
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.16] shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-emerald-300" />
                <span>Research & Labs</span>
              </button>
              <button
                onClick={() => setActiveEcosystemTab('command')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeEcosystemTab === 'command'
                    ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.16] shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                <span>Command Deck</span>
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          {activeEcosystemTab === 'education' && (
            <GlassCard level="elevated" className="p-6 sm:p-8 space-y-6 animate-reveal-soft">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    <span className="uppercase font-semibold">Flagship Sector: Education OS</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Academic Workspace & Smart Classroom</h3>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/app/education')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Enter Education Workspace
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Radio className="w-4 h-4 text-cyan-300" />
                    <span>SmartBoard OS</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Real-time synchronous collaborative canvas with vector drawing, multi-page spatial notebooks, and zero-latency teacher remote controls.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Zap className="w-4 h-4 text-cyan-300" />
                    <span>Teaching Copilot</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Context-aware copilot with teacher-in-the-loop confirmation policies for safe in-class formula plotting, quizzes, and live checkpoints.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Flame className="w-4 h-4 text-cyan-300" />
                    <span>Focus Workspace</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Distraction-free 25-minute focus locks, ambient binaural frequencies, and zero-friction note synchronization.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {activeEcosystemTab === 'research' && (
            <GlassCard level="elevated" className="p-6 sm:p-8 space-y-6 animate-reveal-soft">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
                    <FlaskConical className="w-4 h-4 text-emerald-400" />
                    <span className="uppercase font-semibold">Specialized Sector: Research & Labs</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Grounded Scientific Synthesis & Evidence Locker</h3>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/app/research')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Enter Research Labs
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Layers className="w-4 h-4 text-emerald-300" />
                    <span>Evidence Locker</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Ingests multi-page PDFs, technical documents, and textbooks into dense vector indices with exact paragraph-level citation traceability.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Brain className="w-4 h-4 text-emerald-300" />
                    <span>Hypothesis Engine</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Synthesizes cross-paper insights without hallucination by grounding claims exclusively within verified research corpora.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Bookmark className="w-4 h-4 text-emerald-300" />
                    <span>Structured Reports</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Exports comprehensive academic findings, methodology evaluations, and literature matrices into reproducible notebooks.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {activeEcosystemTab === 'command' && (
            <GlassCard level="elevated" className="p-6 sm:p-8 space-y-6 animate-reveal-soft">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span className="uppercase font-semibold">Core Operations: Command Deck</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Tactical Telemetry & System Protocols</h3>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/app/command')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Enter Command Deck
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Cpu className="w-4 h-4 text-amber-300" />
                    <span>Arc Reactor Core</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Live telemetry tracking core power output, plasma containment stability, temperature thermals, and overclock metrics.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Shield className="w-4 h-4 text-amber-300" />
                    <span>Security Protocols</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Directives for House Party, Defense Matrix, Stealth Camouflage, and Clean Slate emergency data purging.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                  <div className="font-semibold text-neutral-100 flex items-center gap-1.5 text-sm">
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Armor Matrix</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Real-time status diagnostics across Iron Man armor suites from Mark III Classic to Mark 85 Cosmic Nanotech Pinnacle.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </section>

        {/* =========================================================================
            4. LIVE PROXIMITY MAGNIFICATION DOCK PREVIEW
           ========================================================================= */}
        <section id="interactive-dock" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 scroll-mt-24 sm:scroll-mt-28">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold">
              Physical Interaction Engine
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
              Liquid Glass 3.0 & Proximity Magnification
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
              Hover across the physical dock below to feel the GPU-accelerated proximity magnification physics in real-time.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-ambient border border-white/[0.08] text-center space-y-4">
            <div
              ref={dockContainerRef}
              onPointerMove={handleDockPointerMove}
              onPointerLeave={handleDockPointerLeave}
              className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar py-4 px-2"
            >
              {[
                { id: 'dock-focus', label: 'Focus Lock', icon: Flame, color: 'text-amber-400' },
                { id: 'dock-room', label: 'Live Classroom', icon: Radio, color: 'text-cyan-400' },
                { id: 'dock-notes', label: 'Formula Notes', icon: Bookmark, color: 'text-indigo-400' },
                { id: 'dock-spaces', label: 'Knowledge Vault', icon: Brain, color: 'text-emerald-400' },
                { id: 'dock-copilot', label: 'Copilot Tray', icon: Zap, color: 'text-sky-400' }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    ref={registerDockRef(item.id)}
                    className="dock-magnifiable-horizontal shrink-0"
                  >
                    <button
                      onClick={() => navigate('/app/education')}
                      className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl glass-btn-secondary text-xs font-medium cursor-pointer overflow-hidden group select-none text-neutral-200 hover:text-white"
                    >
                      <div className="dock-specular-sheen" aria-hidden="true" />
                      <Icon className={`w-4 h-4 ${item.color} shrink-0 group-hover:scale-110 transition-transform`} />
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] font-mono text-neutral-500">
              Apple-grade optical physics · Smooth cosine handover curve · Zero layout shift
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. THE SOVEREIGN COMPACT — PRIVACY & ARCHITECTURE
           ========================================================================= */}
        <section id="architecture" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-24 sm:scroll-mt-28">
          <div className="text-center space-y-2">
            <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold">
              Security Guarantee
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
              The Sovereign Compact
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
              How Jarvis protects your personal intellectual property by fundamental design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-neutral-100 text-sm">Signed HMAC-SHA256 Sessions</div>
                <p className="text-neutral-400 leading-relaxed">
                  Every request requires cryptographically signed session tokens. Client headers or request bodies never dictate system privileges.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-neutral-100 text-sm">No Commercial Model Training</div>
                <p className="text-neutral-400 leading-relaxed">
                  Your private study sessions, research hypotheses, and personal notes are never harvested to train foundation models.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-300 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-neutral-100 text-sm">Institution Invitation Redemptions</div>
                <p className="text-neutral-400 leading-relaxed">
                  Schools provide 8-character invitation codes. Joining an academy grants access to course syllabi without surrendering your private sovereign vault.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-neutral-100 text-sm">Server-Authoritative RBAC Guard</div>
                <p className="text-neutral-400 leading-relaxed">
                  Role capabilities (Student, Teacher, Principal, Parent, Commander) are strictly resolved on the server. Cross-institution access is rejected with HTTP 403.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. CLOSING CALL TO ACTION
           ========================================================================= */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard level="elevated" className="p-8 sm:p-12 text-center space-y-6 relative overflow-hidden border-t border-t-white/[0.22]">
            <div className="flex justify-center">
              <JarvisCore size="md" state="idle" label="Jarvis Core Waiting" />
            </div>

            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Ready to initialize your personal intelligence?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Step into the cybernetic operating system built for true intellectual sovereignty. No credit card required.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                size="lg"
                variant="primary"
                onClick={() => navigate('/signup')}
                iconRight={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto text-sm px-8 font-semibold"
              >
                Get Started
              </Button>

              <Button
                size="lg"
                variant="glass"
                onClick={() => navigate('/explore')}
                icon={<Sparkles className="w-4 h-4 text-cyan-300" />}
                className="w-full sm:w-auto text-sm px-6"
              >
                Explore Jarvis
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto text-sm px-6 text-neutral-300 hover:text-white"
              >
                Sign In
              </Button>
            </div>

            <div className="text-[11px] font-mono text-neutral-500 pt-3">
              J.A.R.V.I.S. Web · Stark Industries & Academic Architecture · 2026
            </div>
          </GlassCard>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-white/[0.08] glass-level-1 py-8 relative z-20 text-xs text-neutral-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-black/60 border border-white/[0.14] flex items-center justify-center shrink-0">
              <JarvisMark size={14} variant="default" glow />
            </div>
            <span className="font-mono text-neutral-300 font-bold tracking-wider">J.A.R.V.I.S. OS</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400">Sovereign Personal Intelligence</span>
          </div>

          <div className="flex items-center gap-5 font-mono text-[11px]">
            <button onClick={() => navigate('/app/education')} className="hover:text-white transition-colors cursor-pointer">
              Education Sector
            </button>
            <button onClick={() => navigate('/app/research')} className="hover:text-white transition-colors cursor-pointer">
              Research Labs
            </button>
            <button onClick={() => navigate('/app/command')} className="hover:text-white transition-colors cursor-pointer">
              Command Deck
            </button>
          </div>

          <div className="font-mono text-[10px] text-neutral-500 tabular-nums">
            Build 2026.10 · Powered by Gemini 3.8 Flash
          </div>
        </div>
      </footer>
    </div>
  );
};
