// Approved Tokens: #F3F7FF #A7B7CB rgba(117,230,255,0.05)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavbarSignatureJMark } from './NavbarSignatureJMark.tsx';
import { Button } from '../ui/Button.tsx';
import { useRouter } from '../../services/router.ts';
import {
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  Share2,
  GraduationCap,
  FlaskConical,
  ShieldAlert,
  Brain,
  Sparkles,
  Compass,
  Check,
  Copy,
  Users,
  KeyRound
} from 'lucide-react';

interface PublicHeaderProps {
  onScrollToSection?: (sectionId: string) => void;
  isVisible?: boolean;
}

type DropdownId = 'explore' | 'connect';

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onScrollToSection,
  isVisible = true
}) => {
  const { navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownId | null>(null);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<DropdownId | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [gatewayOnline, setGatewayOnline] = useState(true);
  const [hasRevealed, setHasRevealed] = useState(false);

  const exploreRef = useRef<HTMLDivElement | null>(null);
  const connectRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track initial reveal completion so scroll updates are instantaneous and critically damped
  useEffect(() => {
    if (isVisible && !hasRevealed) {
      const timer = setTimeout(() => {
        setHasRevealed(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [isVisible, hasRevealed]);

  // Check backend health telemetry silently on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/health')
      .then((res) => {
        if (res.ok && isMounted) {
          setGatewayOnline(true);
        }
      })
      .catch(() => {
        // Silently retain status
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth scroll progress tracker with RAF for continuous 60fps/120fps physical interpolation
  useEffect(() => {
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          rafId = null;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    setScrollY(window.scrollY);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Automatically dismiss active dropdown when user scrolls past transition zone
  useEffect(() => {
    if (scrollY > 350 && activeDropdown) {
      setActiveDropdown(null);
    }
  }, [scrollY, activeDropdown]);

  // Click outside and escape handler for dropdowns & mobile drawer
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inExplore = exploreRef.current && exploreRef.current.contains(target);
      const inConnect = connectRef.current && connectRef.current.contains(target);
      if (!inExplore && !inConnect) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Grace-period hover coordination for desktop dropdowns
  const openDropdown = useCallback((id: DropdownId) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveDropdown(id);
  }, []);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    // 200ms grace period allows smooth travel across button and panel without closing prematurely
    closeTimerRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Immediately close dropdown when moving to unrelated direct links (Ecosystem, Vision, Architecture) handleNavClick('ecosystem') onMouseEnter={closeDropdownImmediately}
  const closeDropdownImmediately = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveDropdown(null);
  }, []);

  // Handle direct keyboard navigation on triggers
  const handleKeyDownTrigger = (e: React.KeyboardEvent, id: DropdownId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveDropdown((prev) => (prev === id ? null : id));
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDropdown(id);
    }
  };

  const handleTriggerClick = (e: React.MouseEvent, id: DropdownId) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown((prev) => (prev === id ? null : id));
  };

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    if (onScrollToSection) {
      onScrollToSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        // Calculate offset accounting for floating bar height
        const headerOffset = 88;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      }
    }
  };

  // Real Share Platform handler with clipboard fallback and immediate feedback
  const handleShareApp = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://jarvis-web.app';
    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'J.A.R.V.I.S. OS — Sovereign Personal Intelligence',
          text: 'Explore the cybernetic AI operating system inspired by Stark Industries.',
          url
        });
        return;
      } catch {
        // Fallback gracefully to clipboard
      }
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2200);
      }
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  // =========================================================================
  // SCROLL-RESPONSIVE DYNAMIC EXPANSION ENGINE (0px -> 500px):
  // At the very top (0px, initial cinematic animation & signature J moment):
  // The navbar is compact, minimal, and unobtrusive:
  // - Compact width: ~820px max-width on desktop
  // - Compact height: 50px (desktop) / 46px (mobile)
  // - Clean, balanced padding & spacing
  // - Refined smoothly curved corners (rounded-2xl)
  // - Elegant dark obsidian styling with zero harsh neon outlines or heavy glare
  //
  // As the user scrolls past the opening animation section (0px -> 500px):
  // The navbar gradually and smoothly expands into its normal, full-sized state:
  // - Expands smoothly in width (820px -> 1240px, up to max-w-7xl baseline footprint)
  // - Expands smoothly in height (50px -> 62px)
  // - Expands internal padding (px-3.5 sm:px-5 -> px-4 sm:px-6)
  // - Restores generous spacing for navigation items and controls
  // =========================================================================
  // TWO-STATE CINEMATIC TRANSFORMATION ENGINE:
  // State A — Engraved Hero Navigation (Top of page: scrollY <= 40px)
  //   - Integrated flush into #000000 hero void (no floating pill or blur)
  //   - Recessed trench relief via inset micro-shadows & 1px dark hairline
  //   - Crisp letterpress etched typography relief
  //   - Suspension cables fully retracted / hidden (opacity: 0)
  //   - Reveals gracefully at 7,800ms
  // Transition Zone: scrollY 40px -> 220px (180px span)
  //   - Smoothstep physical interpolation: S(p) = 3p^2 - 2p^3
  //   - Cinematic BOOM scale transformation (peak ~1.32x mid-transition)
  //   - Physical dimension expansion: 860px -> 1120px width, 48px -> 70px height
  //   - Metallic suspension cables visibly extend from ceiling and lock into board
  // State B — Suspended Liquid Glass Navigation Board (Scrolled: scrollY > 220px)
  //   - Translucent smoked obsidian liquid glass (28px-32px blur, refractive optical depth)
  //   - Commanding, premium-sized hanging board (1120px × 70px)
  //   - Physically suspended by dual metallic cables (hidden on mobile)
  //   - Settles smoothly back to 1.0x scale with damped landing
  //   - Restrained cyan / ice-blue specular edge highlights
  //   - Reverses naturally on scroll-up
  // =========================================================================
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SCROLL_START = 40; // SCROLL_DISTANCE = 450 p * p * (3 - 2 * p)
  const SCROLL_RANGE = 180;
  const scrollRatio = Math.min(1, Math.max(0, (scrollY - SCROLL_START) / SCROLL_RANGE));
  // Smoothstep easing: S(p) = 3p^2 - 2p^3 for natural, fluid growth
  const transition = prefersReducedMotion ? (scrollY > SCROLL_START ? 1 : 0) : scrollRatio * scrollRatio * (3 - 2 * scrollRatio);
  const expansion = transition;

  // Cinematic BOOM scale peak (~1.32x peak scale mid-transition, settling back to 1.0x at rest)
  const bump = prefersReducedMotion ? 0 : Math.sin(transition * Math.PI) * 0.32;
  const currentScale = (1 + bump).toFixed(4);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  // Straight horizontal alignment:
  // Reset: All rotation values rotX, rotY, rotZ, and transZ are set to 0deg (no tilt or slant)
  // rotateX(0deg), rotateY(0deg), rotateZ(0deg) for straight control panel alignment.
  const rotY = 0;
  const rotZ = 0;
  const rotX = 0; // rotateX(0deg) - straight horizontal
  const transZ = 0;
  const scale = 1;
  const deltaX = 0;

  // Dynamic vertical placement:
  // Smooth physical descent from engraved top (20px) to suspended hanging gap (40px)
  const currentTop = isMobile ? 16 : Math.round(20 + 20 * transition);

  // Perceptible physical dimension expansion:
  // State A compact engraved footprint (860px × 48px) -> State B commanding suspended board (1120px × 70px)
  // Mid-transition peak balloons visually to ~1307px × 78px at 1.32x scale for the BOOM moment!
  const currentMaxWidth = isMobile ? '100%' : `${Math.round(860 + 260 * transition)}px`;
  const currentHeight = isMobile ? 48 : Math.round(48 + 22 * transition);

  // Exact sub-pixel tracking for suspension hardware alignment:
  // As the board magnifies, the cables track the mounting lugs in mechanical lockstep.
  const currentBoardWidth = Math.round(860 + 260 * transition) - (isMobile ? 28 : 48);
  const halfBoardW = currentBoardWidth / 2;
  const leftCablePx = Math.round(halfBoardW - (halfBoardW - 44) * Number(currentScale));
  const rightCablePx = leftCablePx;

  // Suspension Cable Opacity & Extension:
  // Smoothly unfurls downwards from ceiling as board magnifies and descends; hidden on mobile for clean vertical space
  const rawCableT = Math.min(1, Math.max(0, (transition - 0.08) / 0.82));
  const cableSmoothT = rawCableT * rawCableT * (3 - 2 * rawCableT);
  const cableOpacity = !isVisible || isMobile || prefersReducedMotion ? 0 : cableSmoothT;
  const cableExtensionProgress = prefersReducedMotion ? 1 : cableSmoothT;

  // Atmospheric lighting intensities & Material States:
  const groundShadowOpacity = isVisible ? Math.max(0, 0.28 * transition) : 0;
  const poolOpacity = groundShadowOpacity; // filter blur-2xl sm:blur-3xl radial-gradient(ellipse at center, rgba(105, 169, 255, 0.20)
  // Delicate upper rim brightness
  const electricRimStrength = transition < 0.05 ? 0 : 0.65 + transition * 0.30;
  // Right CTA luminous accent intensity (Luminous cyan accent point radial-gradient(circle, #55E8FF)
  const ctaAccentStrength = 0.55 + transition * 0.40;

  const isScrolled = transition > 0.45;
  const isStateA = transition < 0.04;

  // Surface Material:
  // State A (isStateA): Transparent, zero blur (backdrop-blur-0), engraved micro-inset shadow trench
  // State B (Scrolled): Clear smoked liquid glass (0.34 - 0.42 opacity, 26px optical blur, 180% saturation)
  const surfaceBg = isStateA
    ? 'transparent'
    : `linear-gradient(180deg, rgba(14, 20, 32, ${(0.34 * transition).toFixed(3)}) 0%, rgba(7, 10, 16, ${(0.38 * transition).toFixed(3)}) 55%, rgba(4, 7, 14, ${(0.42 * transition).toFixed(3)}) 100%)`;

  const surfaceBackdropBlur = isStateA ? '0px' : `${Math.round(26 * transition)}px`;

  // Refined neutral specular glass edge with brighter upper edge and darker lower edge
  const surfaceSideBorderColor = isStateA
    ? 'rgba(255, 255, 255, 0.045)'
    : `rgba(255, 255, 255, ${(0.045 + 0.085 * transition).toFixed(3)})`;

  const surfaceShadow = isStateA
    ? 'inset 0 1px 1px rgba(0, 0, 0, 0.95), inset 0 -1px 1px rgba(255, 255, 255, 0.05), 0 1px 0 rgba(255, 255, 255, 0.02)'
    : `0 ${Math.round(16 * transition)}px ${Math.round(38 * transition)}px -8px rgba(0, 0, 0, 0.45), 0 4px 12px -2px rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, ${(0.25 * transition).toFixed(2)}), inset 0 0 20px 0 rgba(255, 255, 255, ${(0.018 * transition).toFixed(3)}), inset 0 -1px 0 0 rgba(255, 255, 255, ${(0.04 * transition).toFixed(2)})`;

  return (
    <>
      {/* Viewport Ceiling Dissolve — Subtle atmospheric top edge shadow */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none select-none z-20 transition-opacity duration-300"
        style={{ opacity: transition }}
      />

      <header
        style={{
          top: `${currentTop}px`,
          maxWidth: currentMaxWidth
        }}
        className={`fixed inset-x-0 z-40 mx-auto pointer-events-none px-3.5 sm:px-6 w-[94%] sm:w-[90%] lg:w-[88%] max-w-7xl overflow-visible ${
          isVisible ? 'visible' : 'invisible'
        }`}
        aria-hidden={!isVisible}
      >
        {/* Ground Contact Shadow (Under-bar depth occlusion) - strictly tied to navbar visibility */}
        <div
          aria-hidden="true"
          className={`absolute -bottom-6 sm:-bottom-8 left-[6%] w-[88%] h-8 sm:h-10 pointer-events-none transition-opacity duration-500 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            opacity: groundShadowOpacity,
            background:
              'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.45) 0%, rgba(2, 6, 17, 0.20) 50%, transparent 80%)',
            filter: 'blur(14px)'
          }}
        />

      {/* Suspended Board & Hardware Assembly Wrapper:
          Keeps cables anchored flush to the ceiling while maintaining exact lockstep with board lugs */}
      <div className="relative w-full overflow-visible">
        {/* Dual Metallic Suspension Cables — physically anchored to board top edge near both ends.
            Each cable connects visibly to a ceiling anchor plate above and a mounting bracket on the board.
            Cables and board share the exact coordinate system and horizontal alignment. */}

        {/* Left Suspension Cable & Mounting Lug */}
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none select-none absolute"
          style={{
            left: `${leftCablePx}px`,
            top: `-${currentTop}px`,
            width: '24px',
            height: `${currentTop}px`,
            opacity: cableOpacity,
            clipPath: `inset(0 0 ${((1 - cableExtensionProgress) * 100).toFixed(1)}% 0)`
          }}
        >
          {/* Viewport Ceiling Mounting Bracket (Machined steel anchor flush with ceiling) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[5px] bg-[#1E293B] border-b border-x border-[#64748B]/70 rounded-b-xs shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center justify-center">
            <div className="w-2 h-[1.5px] rounded-full bg-[#94A3B8]" />
          </div>

          {/* High-Tensile Stainless Steel Aircraft Cable (Taut wire with axial specular catch) */}
          <div
            className="absolute top-[5px] bottom-[5px] left-1/2 -translate-x-1/2 w-[2px] nav-suspension-cable"
            style={{
              background:
                'linear-gradient(90deg, #475569 0%, #FFFFFF 50%, #334155 100%)',
              boxShadow: '0 0 2px rgba(255, 255, 255, 0.45)'
            }}
          />

          {/* Board Top Mounting Bracket / Clevis Fastener (Anchored directly onto board top frame) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[6px] -mb-[1px] bg-gradient-to-b from-[#334155] to-[#0F172A] border-t border-x border-[#64748B]/70 rounded-t-xs shadow-[0_1px_3px_rgba(0,0,0,0.8)] flex items-center justify-center z-20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]/90" />
          </div>
        </div>

        {/* Right Suspension Cable & Mounting Lug */}
        <div
          aria-hidden="true"
          className="hidden md:block pointer-events-none select-none absolute"
          style={{
            right: `${rightCablePx}px`,
            top: `-${currentTop}px`,
            width: '24px',
            height: `${currentTop}px`,
            opacity: cableOpacity,
            clipPath: `inset(0 0 ${((1 - cableExtensionProgress) * 100).toFixed(1)}% 0)`
          }}
        >
          {/* Viewport Ceiling Mounting Bracket (Machined steel anchor flush with ceiling) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[5px] bg-[#1E293B] border-b border-x border-[#64748B]/70 rounded-b-xs shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center justify-center">
            <div className="w-2 h-[1.5px] rounded-full bg-[#94A3B8]" />
          </div>

          {/* High-Tensile Stainless Steel Aircraft Cable (Taut wire with axial specular catch) */}
          <div
            className="absolute top-[5px] bottom-[5px] left-1/2 -translate-x-1/2 w-[2px] nav-suspension-cable"
            style={{
              background:
                'linear-gradient(90deg, #475569 0%, #FFFFFF 50%, #334155 100%)',
              boxShadow: '0 0 2px rgba(255, 255, 255, 0.45)'
            }}
          />

          {/* Board Top Mounting Bracket / Clevis Fastener (Anchored directly onto board top frame) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[6px] -mb-[1px] bg-gradient-to-b from-[#334155] to-[#0F172A] border-t border-x border-[#64748B]/70 rounded-t-xs shadow-[0_1px_3px_rgba(0,0,0,0.8)] flex items-center justify-center z-20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]/90" />
          </div>
        </div>

        {/* Suspended Board Assembly:
            The board is a slim rectangular panel, not a pill or capsule. */}
        <div
          style={{
            background: surfaceBg,
            backdropFilter: `blur(${surfaceBackdropBlur}) saturate(180%) brightness(109%) contrast(104%)`,
            WebkitBackdropFilter: `blur(${surfaceBackdropBlur}) saturate(180%) brightness(109%) contrast(104%)`,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderLeftColor: surfaceSideBorderColor,
            borderRightColor: surfaceSideBorderColor,
            borderTopColor: isStateA ? 'rgba(255, 255, 255, 0.05)' : `rgba(255, 255, 255, ${(0.05 + 0.17 * transition).toFixed(2)})`,
            borderBottomColor: isStateA ? 'rgba(255, 255, 255, 0.02)' : `rgba(255, 255, 255, ${(0.02 + 0.03 * transition).toFixed(2)})`,
            boxShadow: surfaceShadow,
            height: `${currentHeight}px`,
            transformOrigin: '50% 0',
            transform: isVisible
              ? `translateY(0) scale(${currentScale})`
              : 'translateY(-18px) scale(0.98)',
            transition: !hasRevealed
              ? 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'none'
          }}
          className={`w-full glass-liquid-bar relative flex items-center justify-between rounded-lg overflow-visible ${
            isStateA ? 'bg-transparent backdrop-blur-0 shadow-inner-trench' : 'backdrop-blur-2xl'
          } ${
            expansion > 0.4 ? 'px-4 sm:px-6' : 'px-3 sm:px-4.5'
          } ${
            isVisible
              ? 'opacity-100 pointer-events-auto visible'
              : 'opacity-0 pointer-events-none invisible'
          }`}
        >
        {/* Layer 1: Razor-sharp specular shimmer rim along the top edge */}
        <div
          aria-hidden="true"
          className="absolute inset-x-4 sm:inset-x-8 top-0 h-[1px] rounded-full pointer-events-none transition-all duration-150 animate-rim-shimmer"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 15%, rgba(241,245,249,0.7) 45%, rgba(186,230,253,0.50) 50%, rgba(241,245,249,0.7) 55%, rgba(255,255,255,0.06) 85%, transparent 100%)',
            boxShadow: `0 0 2px rgba(186,230,253,${(0.12 * transition).toFixed(2)})`,
            opacity: Number((transition * 0.80).toFixed(3))
          }}
        />

        {/* Left specular edge highlight (Precision-machined left side accent) */}
        <div
          aria-hidden="true"
          className="absolute left-0 inset-y-2 w-[1px] rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
            boxShadow: '0 0 3px rgba(255, 255, 255, 0.15)'
          }}
        />

        {/* Right subtle edge highlight (Precision-machined right side accent) */}
        <div
          aria-hidden="true"
          className="absolute right-0 inset-y-2 w-[1px] rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.03) 50%, transparent 100%)',
            boxShadow: '0 0 3px rgba(255, 255, 255, 0.10)'
          }}
        />

        {/* Bottom precision chamfer rim (Subtle underside accent for solid grounding) */}
        <div
          aria-hidden="true"
          className="absolute inset-x-6 sm:inset-x-12 bottom-0 h-[1px] rounded-full pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.90)'
          }}
        />

        {/* Subtle interior specular sheen */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] pointer-events-none overflow-hidden"
        >
          <div
            className="absolute -top-[40%] -left-[10%] w-[120%] h-[100%] pointer-events-none opacity-10"
            style={{
              background:
                'linear-gradient(135deg, rgba(241,246,255,0.08) 0%, rgba(243,247,255,0.02) 25%, transparent 55%)'
            }}
          />
        </div>

        {/* Brand Identity — Adapted for JARVIS */}
        <div
          onClick={() => {
            if (window.location.pathname !== '/') {
              navigate('/');
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none shrink-0 relative z-10"
          title="J.A.R.V.I.S. OS Home"
        >
          <div
            className={`relative flex items-center justify-center rounded-xl shrink-0 overflow-hidden group-hover:border-[#69A9FF]/70 transition-all ${
              transition < 0.1
                ? 'bg-black/60 border border-white/[0.08]'
                : 'bg-[#020611]/90 border border-[#F1F6FF]/[0.15]'
            } ${
              expansion > 0.4 ? 'h-7.5 w-7.5 sm:h-8 sm:w-8' : 'h-7 w-7 sm:h-7.5 sm:w-7.5'
            }`}
            style={{
              boxShadow:
                transition < 0.1
                  ? 'inset 0 1px 1px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 0 10px rgba(105,169,255,0.20), inset 0 1px 0 rgba(241,246,255,0.20)'
            }}
          >
            <NavbarSignatureJMark size={expansion > 0.4 ? 18 : 16} />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              style={{
                textShadow:
                  transition < 0.1
                    ? '0 -1px 0 rgba(0,0,0,0.95), 0 1px 1px rgba(255,255,255,0.12)'
                    : 'none'
              }}
              className={`font-bold font-mono tracking-widest text-[#F1F6FF] group-hover:text-[#75E6FF] transition-colors ${
                isStateA ? 'nav-engraved-text' : ''
              } ${
                expansion > 0.4 ? 'text-xs sm:text-sm' : 'text-xs'
              }`}
            >
              J.A.R.V.I.S.
            </span>
            <span className="text-[9px] font-mono px-1.2 py-0.2 rounded bg-[#020611]/80 border border-[#69A9FF]/35 text-[#69A9FF] font-semibold uppercase shadow-[0_0_6px_rgba(105,169,255,0.25)]">
              OS
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links — Vision, Explore, Ecosystem, Connect */}
        <nav
          className={`hidden lg:flex items-center text-xs font-medium ${
            isStateA ? 'text-[#A5B7D0]' : 'text-[#E2E8F0]'
          } relative z-10 transition-all duration-300 ${
            expansion > 0.4 ? 'gap-3.5 xl:gap-5' : 'gap-2.5 xl:gap-3.5'
          }`}
        >
          {/* 1. Vision (Direct Anchor) - hover immediately clears any open dropdown */}
          <button
            onClick={() => {
              if (window.location.pathname !== '/') navigate('/');
              handleNavClick('vision');
            }}
            onMouseEnter={closeDropdownImmediately}
            className="hover:text-[#F1F6FF] transition-colors cursor-pointer py-1.5 px-2 relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]/60 rounded-lg text-xs font-medium"
          >
            <span
              className="group-hover:text-[#F1F6FF] transition-colors"
              style={{ textShadow: !isStateA ? '0 1px 2px rgba(0,0,0,0.85)' : undefined }}
            >Vision</span>
            <span className="absolute bottom-0 left-1 right-1 h-[1.5px] bg-[#69A9FF]/0 group-hover:bg-[#69A9FF]/70 rounded-full transition-all" />
          </button>

          {/* 2. Explore (Hover & Click Dropdown) — Scoped strictly to Explore */}
          <div
            className="relative"
            ref={exploreRef}
            onMouseEnter={() => openDropdown('explore')}
            onMouseLeave={scheduleClose}
            onMouseMove={cancelClose}
          >
            <button
              type="button"
              onClick={(e) => handleTriggerClick(e, 'explore')}
              onKeyDown={(e) => handleKeyDownTrigger(e, 'explore')}
              onMouseEnter={() => openDropdown('explore')}
              onMouseMove={cancelClose}
              aria-haspopup="true"
              aria-expanded={activeDropdown === 'explore'}
              aria-controls="explore-dropdown-panel"
              className={`hover:text-[#F1F6FF] transition-colors cursor-pointer py-1.5 px-2 flex items-center gap-1.5 relative group rounded-lg text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]/60 ${
                activeDropdown === 'explore' ? 'text-[#F1F6FF]' : isStateA ? 'text-[#A5B7D0]' : 'text-[#E2E8F0]'
              }`}
            >
              <span
                className="group-hover:text-[#F1F6FF] transition-colors"
                style={{ textShadow: !isStateA ? '0 1px 2px rgba(0,0,0,0.85)' : undefined }}
              >Explore</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 pointer-events-none ${
                  activeDropdown === 'explore'
                    ? 'rotate-180 text-cyan-300 text-[#55E8FF]'
                    : isStateA ? 'text-[#A5B7D0] group-hover:text-[#55E8FF]' : 'text-[#CBD5E1] group-hover:text-[#55E8FF]'
                }`}
              />
              <span
                className={`absolute bottom-0 left-1 right-1 h-[1.5px] rounded-full transition-all ${
                  activeDropdown === 'explore'
                    ? 'bg-[#55E8FF]/80 shadow-[0_0_8px_rgba(85,232,255,0.6)]'
                    : 'bg-[#55E8FF]/0 group-hover:bg-[#55E8FF]/60'
                }`}
              />
            </button>

            {/* Explore Liquid-Glass Panel:
                Continuous pointer path with bridge and Z-counter-rotation */}
            <div
              id="explore-dropdown-panel"
              role="menu"
              aria-label="Explore Platform Spheres"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onMouseMove={cancelClose}
              style={{
                transform:
                  activeDropdown === 'explore'
                    ? `rotateZ(${-rotZ}deg) translateY(0)`
                    : 'scale(0.98) translateY(-6px)'
              }}
              className={`absolute top-full mt-2.5 left-1/2 -translate-x-1/2 w-[490px] max-w-[calc(100vw-2rem)] rounded-2xl glass-level-3 border border-[#F1F6FF]/[0.12] p-4 shadow-[0_24px_50px_-8px_rgba(2,6,17,0.92),0_0_24px_-4px_rgba(105,169,255,0.14)] backdrop-blur-3xl z-50 text-left transition-all duration-200 ease-out origin-top before:content-[''] before:absolute before:-top-3.5 before:w-28 before:left-1/2 before:-translate-x-1/2 before:h-4 ${
                activeDropdown === 'explore'
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto before:pointer-events-auto'
                  : 'opacity-0 scale-[0.98] -translate-y-1.5 pointer-events-none invisible before:pointer-events-none'
              }`}
            >
              {/* Specular top rim shine */}
              <div
                aria-hidden="true"
                className="absolute inset-x-4 top-0 h-[1px] rounded-full pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(241,246,255,0.3) 25%, rgba(105,169,255,0.85) 50%, rgba(119,123,255,0.4) 75%, transparent 100%)',
                  boxShadow: '0 0 10px rgba(105,169,255,0.3)'
                }}
              />

              {/* Dropdown Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F1F6FF]/[0.08]">
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-[#55E8FF]" />
                  <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-[#F1F6FF]">
                    Platform Environments
                  </span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#020611]/80 border border-[#69A9FF]/30 text-[#69A9FF] font-semibold uppercase tracking-wider">
                  4 Live Sectors
                </span>
              </div>

              {/* Sectors Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Sector 1: Education OS */}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/app/education');
                  }}
                  className="group/item flex items-start gap-3 p-2.5 rounded-xl border border-[#F1F6FF]/[0.08] bg-[#0B1728]/50 hover:bg-[#07111F]/90 hover:border-[#69A9FF]/40 hover:shadow-[0_4px_16px_-2px_rgba(2,6,17,0.8),0_0_12px_-2px_rgba(105,169,255,0.14)] transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#69A9FF]/[0.08] border border-[#69A9FF]/25 flex items-center justify-center text-[#55E8FF] shrink-0 group-hover/item:border-[#69A9FF]/60 group-hover/item:bg-[#69A9FF]/[0.16] transition-all">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#F1F6FF] group-hover/item:text-[#55E8FF] transition-colors truncate">
                        Education OS
                      </span>
                      <span className="text-[9px] font-mono text-[#55E8FF] font-semibold">Flagship</span>
                    </div>
                    <p className="text-[11px] text-[#A5B7D0] leading-snug line-clamp-2">
                      SmartBoard canvas, teaching copilot & collaborative matrix
                    </p>
                  </div>
                </button>

                {/* Sector 2: Research & Labs */}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/app/research');
                  }}
                  className="group/item flex items-start gap-3 p-2.5 rounded-xl border border-[#F1F6FF]/[0.08] bg-[#0B1728]/50 hover:bg-[#07111F]/90 hover:border-[#69A9FF]/40 hover:shadow-[0_4px_16px_-2px_rgba(2,6,17,0.8),0_0_12px_-2px_rgba(105,169,255,0.14)] transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#69A9FF]/[0.08] border border-[#69A9FF]/25 flex items-center justify-center text-[#55E8FF] shrink-0 group-hover/item:border-[#69A9FF]/60 group-hover/item:bg-[#69A9FF]/[0.16] transition-all">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#F1F6FF] group-hover/item:text-[#55E8FF] transition-colors truncate">
                        Research & Labs
                      </span>
                      <span className="text-[9px] font-mono text-[#55E8FF] font-semibold">Scientific</span>
                    </div>
                    <p className="text-[11px] text-[#A5B7D0] leading-snug line-clamp-2">
                      7-stage RAG ingestion, citations & hypothesis synthesis
                    </p>
                  </div>
                </button>

                {/* Sector 3: Command Deck */}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/app/command');
                  }}
                  className="group/item flex items-start gap-3 p-2.5 rounded-xl border border-[#F1F6FF]/[0.08] bg-[#0B1728]/50 hover:bg-[#07111F]/90 hover:border-[#69A9FF]/40 hover:shadow-[0_4px_16px_-2px_rgba(2,6,17,0.8),0_0_12px_-2px_rgba(105,169,255,0.14)] transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#69A9FF]/[0.08] border border-[#69A9FF]/25 flex items-center justify-center text-[#55E8FF] shrink-0 group-hover/item:border-[#69A9FF]/60 group-hover/item:bg-[#69A9FF]/[0.16] transition-all">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#F1F6FF] group-hover/item:text-[#55E8FF] transition-colors truncate">
                        Command Deck
                      </span>
                      <span className="text-[9px] font-mono text-[#55E8FF] font-semibold">Tactical</span>
                    </div>
                    <p className="text-[11px] text-[#A5B7D0] leading-snug line-clamp-2">
                      Arc Reactor telemetry, armor matrix HUD & voice sensory
                    </p>
                  </div>
                </button>

                {/* Sector 4: Personal Workspace */}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/app/personal');
                  }}
                  className="group/item flex items-start gap-3 p-2.5 rounded-xl border border-[#F1F6FF]/[0.08] bg-[#0B1728]/50 hover:bg-[#07111F]/90 hover:border-[#777BFF]/40 hover:shadow-[0_4px_16px_-2px_rgba(2,6,17,0.8),0_0_12px_-2px_rgba(119,123,255,0.14)] transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#777BFF]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#777BFF]/[0.08] border border-[#777BFF]/25 flex items-center justify-center text-[#777BFF] shrink-0 group-hover/item:border-[#777BFF]/60 group-hover/item:bg-[#777BFF]/[0.16] transition-all">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#F1F6FF] group-hover/item:text-[#777BFF] transition-colors truncate">
                        Personal Vault
                      </span>
                      <span className="text-[9px] font-mono text-[#777BFF] font-semibold">Sovereign</span>
                    </div>
                    <p className="text-[11px] text-[#A5B7D0] leading-snug line-clamp-2">
                      Isolated personal memory, study notes & persistent identity
                    </p>
                  </div>
                </button>
              </div>

              {/* Dropdown Footer Actions */}
              <div className="pt-3 mt-3 border-t border-[#F1F6FF]/[0.08] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/explore');
                  }}
                  className="inline-flex items-center gap-1.5 text-[#55E8FF] hover:text-[#F1F6FF] transition-colors cursor-pointer font-medium hover:underline text-[11px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#55E8FF]" />
                  <span>Interactive Platform Explorer →</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/onboarding');
                  }}
                  className="text-[11px] font-mono text-[#A5B7D0] hover:text-[#F1F6FF] transition-colors cursor-pointer"
                >
                  7-Stage Onboarding
                </button>
              </div>
            </div>
          </div>

          {/* 3. About Us (Direct Anchor to Sovereignty/Philosophy Section) - hover immediately clears any open dropdown */}
          <button
            onClick={() => {
              if (window.location.pathname !== '/') navigate('/');
              handleNavClick('sovereignty');
            }}
            onMouseEnter={closeDropdownImmediately}
            className="hover:text-[#F1F6FF] transition-colors cursor-pointer py-1.5 px-2 relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]/60 rounded-lg text-xs font-medium"
          >
            <span
              style={{
                textShadow:
                  transition < 0.1
                    ? '0 -1px 0 rgba(0,0,0,0.95), 0 1px 1px rgba(255,255,255,0.12)'
                    : '0 1px 2px rgba(0,0,0,0.85)'
              }}
              className="group-hover:text-[#F1F6FF] transition-colors"
            >About Us</span>
            <span className="absolute bottom-0 left-1 right-1 h-[1.5px] bg-[#69A9FF]/0 group-hover:bg-[#69A9FF]/70 rounded-full transition-all" />
          </button>

          {/* 4. Connect (Hover & Click Dropdown) — Scoped strictly to Connect */}
          <div
            className="relative"
            ref={connectRef}
            onMouseEnter={() => openDropdown('connect')}
            onMouseLeave={scheduleClose}
            onMouseMove={cancelClose}
          >
            <button
              type="button"
              onClick={(e) => handleTriggerClick(e, 'connect')}
              onKeyDown={(e) => handleKeyDownTrigger(e, 'connect')}
              onMouseEnter={() => openDropdown('connect')}
              onMouseMove={cancelClose}
              aria-haspopup="true"
              aria-expanded={activeDropdown === 'connect'}
              aria-controls="connect-dropdown-panel"
              className={`hover:text-[#F1F6FF] transition-colors cursor-pointer py-1.5 px-2 flex items-center gap-1.5 relative group rounded-lg text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]/60 ${
                activeDropdown === 'connect' ? 'text-[#F1F6FF]' : isStateA ? 'text-[#A5B7D0]' : 'text-[#E2E8F0]'
              }`}
            >
              <span
                className="group-hover:text-[#F1F6FF] transition-colors"
                style={{ textShadow: !isStateA ? '0 1px 2px rgba(0,0,0,0.85)' : undefined }}
              >Connect</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 pointer-events-none ${
                  activeDropdown === 'connect'
                    ? 'rotate-180 text-cyan-300 text-[#55E8FF]'
                    : isStateA ? 'text-[#A5B7D0] group-hover:text-[#55E8FF]' : 'text-[#CBD5E1] group-hover:text-[#55E8FF]'
                }`}
              />
              <span
                className={`absolute bottom-0 left-1 right-1 h-[1.5px] rounded-full transition-all ${
                  activeDropdown === 'connect'
                    ? 'bg-[#55E8FF]/80 shadow-[0_0_8px_rgba(85,232,255,0.6)]'
                    : 'bg-[#55E8FF]/0 group-hover:bg-[#55E8FF]/60'
                }`}
              />
            </button>

            {/* Connect Liquid-Glass Panel:
                Continuous pointer path with bridge, counter-rotates Z when active */}
            <div
              id="connect-dropdown-panel"
              role="menu"
              aria-label="Connect and Verified Channels"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              onMouseMove={cancelClose}
              style={{
                transform:
                  activeDropdown === 'connect'
                    ? `rotateZ(${-rotZ}deg) translateY(0)`
                    : 'scale(0.98) translateY(-6px)'
              }}
              className={`absolute top-full mt-2.5 left-1/2 -translate-x-1/2 w-[390px] max-w-[calc(100vw-2rem)] rounded-2xl glass-level-3 border border-[#F1F6FF]/[0.12] p-4 shadow-[0_24px_50px_-8px_rgba(2,6,17,0.92),0_0_24px_-4px_rgba(105,169,255,0.14)] backdrop-blur-3xl z-50 text-left transition-all duration-200 ease-out origin-top before:content-[''] before:absolute before:-top-3.5 before:w-44 before:left-1/2 before:-translate-x-1/2 before:h-4 ${
                activeDropdown === 'connect'
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto before:pointer-events-auto'
                  : 'opacity-0 scale-[0.98] -translate-y-1.5 pointer-events-none invisible before:pointer-events-none'
              }`}
            >
              {/* Specular top rim shine */}
              <div
                aria-hidden="true"
                className="absolute inset-x-4 top-0 h-[1px] rounded-full pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(241,246,255,0.3) 25%, rgba(105,169,255,0.85) 50%, rgba(119,123,255,0.4) 75%, transparent 100%)',
                  boxShadow: '0 0 10px rgba(105,169,255,0.3)'
                }}
              />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F1F6FF]/[0.08]">
                <div className="flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-[#55E8FF]" />
                  <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-[#F1F6FF]">
                    Network & Channels
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#55E8FF]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      gatewayOnline
                        ? 'bg-[#55E8FF] shadow-[0_0_6px_rgba(85,232,255,0.8)] animate-pulse'
                        : 'bg-[#A5B7D0]'
                    }`}
                  />
                  <span>{gatewayOnline ? 'Gateway Live' : 'Standby'}</span>
                </div>
              </div>

              {/* Real Action List */}
              <div className="space-y-2">
                {/* 1. Share Platform Link */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleShareApp}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#F1F6FF]/[0.08] bg-[#0B1728]/50 hover:bg-[#07111F]/90 hover:border-[#69A9FF]/40 hover:shadow-[0_4px_16px_-2px_rgba(2,6,17,0.8),0_0_12px_-2px_rgba(105,169,255,0.14)] transition-all text-left cursor-pointer group/action focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#69A9FF]/[0.08] border border-[#69A9FF]/25 flex items-center justify-center text-[#55E8FF] shrink-0 group-hover/action:bg-[#69A9FF]/[0.16] group-hover/action:border-[#69A9FF]/60 transition-all">
                      {copySuccess ? <Check className="w-4 h-4 text-[#55E8FF]" /> : <Copy className="w-4 h-4 text-[#55E8FF]" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#F1F6FF] group-hover/action:text-[#55E8FF] transition-colors">
                        {copySuccess ? 'Link Copied to Clipboard!' : 'Share J.A.R.V.I.S. Platform'}
                      </div>
                      <div className="text-[11px] text-[#A5B7D0]">
                        {copySuccess ? 'Direct URL ready to share' : 'Copy public link or invoke native share'}
                      </div>
                    </div>
                  </div>
                  <div className="text-[#A5B7D0] group-hover/action:text-[#55E8FF]">
                    {copySuccess ? (
                      <span className="text-[10px] font-mono text-[#55E8FF] font-semibold px-2 py-0.5 rounded bg-[#020611]/80 border border-[#69A9FF]/40">
                        COPIED
                      </span>
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                {/* 2. Redeem Institution Invitation Token */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/signup');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#F1F6FF]/[0.08] bg-[#0B1728]/50 hover:bg-[#07111F]/90 hover:border-[#777BFF]/40 hover:shadow-[0_4px_16px_-2px_rgba(2,6,17,0.8),0_0_12px_-2px_rgba(119,123,255,0.14)] transition-all text-left cursor-pointer group/action focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#777BFF]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#777BFF]/[0.08] border border-[#777BFF]/25 flex items-center justify-center text-[#777BFF] shrink-0 group-hover/action:bg-[#777BFF]/[0.16] group-hover/action:border-[#777BFF]/60 transition-all">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#F1F6FF] group-hover/action:text-[#777BFF] transition-colors">
                        Redeem Institution Token
                      </div>
                      <div className="text-[11px] text-[#A5B7D0]">
                        Join Stanford, MIT, or Stark-2026 academic cohort
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#A5B7D0] group-hover/action:text-[#777BFF] group-hover/action:translate-x-0.5 transition-all" />
                </button>

                {/* 3. Academic Community */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveDropdown(null);
                    navigate('/app/education');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#F1F6FF]/[0.08] bg-[#0B1728]/50 hover:bg-[#07111F]/90 hover:border-[#69A9FF]/40 hover:shadow-[0_4px_16px_-2px_rgba(2,6,17,0.8),0_0_12px_-2px_rgba(105,169,255,0.14)] transition-all text-left cursor-pointer group/action focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#69A9FF]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#69A9FF]/[0.08] border border-[#69A9FF]/25 flex items-center justify-center text-[#55E8FF] shrink-0 group-hover/action:bg-[#69A9FF]/[0.16] group-hover/action:border-[#69A9FF]/60 transition-all">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#F1F6FF] group-hover/action:text-[#55E8FF] transition-colors">
                        Academic Community Hub
                      </div>
                      <div className="text-[11px] text-[#A5B7D0]">
                        Collaborate across study spaces & faculties
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#A5B7D0] group-hover/action:text-[#55E8FF] group-hover/action:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* Verified Architecture info notice */}
              <div className="mt-3 pt-3 border-t border-[#F1F6FF]/[0.08] p-2.5 rounded-xl bg-[#020611]/60 border border-[#F1F6FF]/[0.06] space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#A5B7D0]">
                  <span>Verified Architecture</span>
                  <span className="text-[#55E8FF] font-semibold">HMAC-SHA256 Protected</span>
                </div>
                <p className="text-[10px] text-[#A5B7D0]/80 font-sans leading-relaxed">
                  Official Discord & Matrix federation channels launching with Phase 7. Zero third-party telemetry.
                </p>
              </div>
            </div>
          </div>
        </nav>

        {/* Action Buttons — polished primary Get Started CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative z-10">
          {/* Primary Action */}
          <button
            onClick={() => navigate('/signup')}
            className={`relative inline-flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl px-3 sm:px-3.5 cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-[0.98] overflow-hidden ${
              expansion > 0.4 ? 'h-8.5 min-h-[36px]' : 'h-7.5 min-h-[30px] text-[11px]'
            }`}
            style={{
              background:
                transition < 0.1
                  ? 'linear-gradient(135deg, rgba(85, 232, 255, 0.15) 0%, rgba(105, 169, 255, 0.10) 50%, rgba(119, 123, 255, 0.08) 100%)'
                  : 'linear-gradient(135deg, #55E8FF 0%, #69A9FF 50%, #777BFF 100%)',
              boxShadow:
                transition < 0.1
                  ? 'inset 0 1px 1px rgba(255, 255, 255, 0.20), inset 0 -1px 1px rgba(0, 0, 0, 0.60)'
                  : `0 0 ${Math.round(14 * ctaAccentStrength)}px -2px rgba(85, 232, 255, ${(0.55 * ctaAccentStrength).toFixed(2)}), inset 0 1px 0 rgba(241, 246, 255, 0.65)`,
              border:
                transition < 0.1
                  ? '1px solid rgba(85, 232, 255, 0.25)'
                  : '1px solid rgba(241, 246, 255, 0.40)',
              color: transition < 0.1 ? '#F1F6FF' : '#020611'
            }}
          >
            <span
              className={`relative z-10 font-bold tracking-tight transition-colors ${
                transition < 0.1 ? 'text-[#F1F6FF]' : 'text-[#020611]'
              }`}
            >
              Get Started
            </span>
            <ArrowRight
              className={`w-3 h-3 relative z-10 font-bold transition-colors ${
                transition < 0.1 ? 'text-[#55E8FF]' : 'text-[#020611]'
              }`}
            />
          </button>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-xl border border-[#F1F6FF]/[0.12] bg-[#0B1728]/60 text-[#F1F6FF] hover:text-white hover:bg-[#07111F]/80 cursor-pointer focus-ring ml-0.5"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>
      </div>

      {/* Floating Mobile Drawer */}
      {mobileMenuOpen && isVisible && (
        <div className="pointer-events-auto mt-2 w-full rounded-2xl glass-level-3 border border-[#F1F6FF]/[0.14] p-4 space-y-3 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto">
          <div className="flex flex-col space-y-1.5 text-sm font-medium text-[#A5B7D0]">
            {/* Direct Link: Vision */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (window.location.pathname !== '/') navigate('/');
                handleNavClick('vision');
              }}
              className="text-left py-2 px-3 rounded-lg hover:bg-white/[0.06] hover:text-[#F1F6FF] cursor-pointer min-h-[44px] flex items-center"
            >
              Vision
            </button>

            {/* Mobile Explore Accordion */}
            <div className="border border-[#F1F6FF]/[0.08] rounded-xl overflow-hidden bg-[#0B1728]/40">
              <button
                type="button"
                onClick={() =>
                  setMobileExpandedSection((prev) => (prev === 'explore' ? null : 'explore'))
                }
                className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-white/[0.04] text-[#F1F6FF] cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#55E8FF]" />
                  <span className="font-semibold text-xs">Explore Sectors</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#A5B7D0] transition-transform duration-200 ${
                    mobileExpandedSection === 'explore' ? 'rotate-180 text-cyan-300 text-[#55E8FF]' : ''
                  }`}
                />
              </button>

              {mobileExpandedSection === 'explore' && (
                <div className="p-2 space-y-1 bg-[#020611]/70 border-t border-[#F1F6FF]/[0.06] text-xs">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/app/education');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-white/[0.06] text-[#A5B7D0] hover:text-[#F1F6FF] flex items-center gap-2.5 min-h-[40px]"
                  >
                    <GraduationCap className="w-4 h-4 text-[#55E8FF] shrink-0" />
                    <div>
                      <div className="font-medium text-[#F1F6FF]">Education OS</div>
                      <div className="text-[10px] text-[#A5B7D0]">SmartBoard & Copilot</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/app/research');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-white/[0.06] text-[#A5B7D0] hover:text-[#F1F6FF] flex items-center gap-2.5 min-h-[40px]"
                  >
                    <FlaskConical className="w-4 h-4 text-[#55E8FF] shrink-0" />
                    <div>
                      <div className="font-medium text-[#F1F6FF]">Research & Labs</div>
                      <div className="text-[10px] text-[#A5B7D0]">RAG Ingestion & Evidence</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/app/command');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-white/[0.06] text-[#A5B7D0] hover:text-[#F1F6FF] flex items-center gap-2.5 min-h-[40px]"
                  >
                    <ShieldAlert className="w-4 h-4 text-[#55E8FF] shrink-0" />
                    <div>
                      <div className="font-medium text-[#F1F6FF]">Command Deck</div>
                      <div className="text-[10px] text-[#A5B7D0]">Telemetry & Armor Matrix</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/app/personal');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-white/[0.06] text-[#A5B7D0] hover:text-[#F1F6FF] flex items-center gap-2.5 min-h-[40px]"
                  >
                    <Brain className="w-4 h-4 text-[#777BFF] shrink-0" />
                    <div>
                      <div className="font-medium text-[#F1F6FF]">Personal Workspace</div>
                      <div className="text-[10px] text-[#A5B7D0]">Sovereign Memory Vault</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/explore');
                    }}
                    className="w-full text-left py-2 px-3 rounded-lg hover:bg-white/[0.06] text-[#55E8FF] flex items-center gap-2 font-medium border-t border-[#F1F6FF]/[0.06] mt-1 pt-2 min-h-[40px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Platform Explorer Overview →</span>
                  </button>
                </div>
              )}
            </div>

            {/* Direct Link: About Us */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (window.location.pathname !== '/') navigate('/');
                handleNavClick('sovereignty');
              }}
              className="text-left py-2 px-3 rounded-lg hover:bg-white/[0.06] hover:text-[#F1F6FF] cursor-pointer min-h-[44px] flex items-center"
            >About Us</button>

            {/* Mobile Connect Accordion */}
            <div className="border border-[#F1F6FF]/[0.08] rounded-xl overflow-hidden bg-[#0B1728]/40">
              <button
                type="button"
                onClick={() =>
                  setMobileExpandedSection((prev) => (prev === 'connect' ? null : 'connect'))
                }
                className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-white/[0.04] text-[#F1F6FF] cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#55E8FF]" />
                  <span className="font-semibold text-xs">Connect & Network</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#A5B7D0] transition-transform duration-200 ${
                    mobileExpandedSection === 'connect' ? 'rotate-180 text-cyan-300 text-[#55E8FF]' : ''
                  }`}
                />
              </button>

              {mobileExpandedSection === 'connect' && (
                <div className="p-2 space-y-2 bg-[#020611]/70 border-t border-[#F1F6FF]/[0.06] text-xs">
                  <button
                    type="button"
                    onClick={handleShareApp}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#0B1728]/60 border border-[#F1F6FF]/[0.08] hover:bg-[#07111F]/90 text-[#F1F6FF] min-h-[44px]"
                  >
                    <div className="flex items-center gap-2">
                      {copySuccess ? <Check className="w-4 h-4 text-[#55E8FF]" /> : <Copy className="w-4 h-4 text-[#55E8FF]" />}
                      <span>{copySuccess ? 'Link Copied!' : 'Share Public Link'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#55E8FF]">{copySuccess ? 'COPIED' : 'TAP'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/signup');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#0B1728]/60 border border-[#F1F6FF]/[0.08] hover:bg-[#07111F]/90 text-[#F1F6FF] min-h-[44px]"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#777BFF]" />
                      <span>Redeem Institution Token</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#A5B7D0]" />
                  </button>

                  <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-mono text-[#A5B7D0]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#55E8FF]" />
                      <span>Gateway Active</span>
                    </span>
                    <span>HMAC-SHA256 Protected</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F6FF]/[0.08]">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/signup');
              }}
              className="w-full text-xs min-h-[44px]"
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
    </>
  );
};
