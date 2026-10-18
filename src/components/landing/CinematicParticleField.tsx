import React, { useEffect, useRef } from 'react';
import {
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS,
  type ParticleFormation
} from './formations/formationRegistry.ts';
import { renderDnaDetailLayer } from './formations/dnaDetailRenderer.ts';
import { renderGalaxyDetailLayer } from './formations/galaxyDetailRenderer.ts';
import { renderNebulaDetailLayer } from './formations/nebulaDetailRenderer.ts';
import { renderAtomicOrbitalsDetailLayer } from './formations/atomicOrbitalsDetailRenderer.ts';
import { renderBlackHoleVortexDetailLayer } from './formations/blackHoleVortexDetailRenderer.ts';
import { renderKnowledgeConstellationDetailLayer } from './formations/knowledgeConstellationDetailRenderer.ts';
import { renderOrbitalSystemDetailLayer } from './formations/orbitalSystemDetailRenderer.ts';
import { renderCortexDetailLayer } from './formations/cortexDetailRenderer.ts';
import { renderSynapseDetailLayer } from './formations/synapseDetailRenderer.ts';
import { renderSingleNeuronDetailLayer } from './formations/singleNeuronDetailRenderer.ts';
import { renderSynapticWebDetailLayer } from './formations/synapticWebDetailRenderer.ts';
import { renderKnowledgeGraphDetailLayer } from './formations/knowledgeGraphDetailRenderer.ts';
import { renderInfinityLoopDetailLayer } from './formations/infinityLoopDetailRenderer.ts';
import { renderIntelligenceCrystalDetailLayer } from './formations/intelligenceCrystalDetailRenderer.ts';
import { renderGeometricMandalaDetailLayer } from './formations/geometricMandalaDetailRenderer.ts';
import {
  renderFormationDetailEngine,
  computeSynchronizedFormationTarget
} from './formations/formationDetailEngine.ts';

export interface CinematicParticleFieldProps {
  className?: string;
  opacity?: number;
  onPhaseCReached?: () => void;
}

export interface ParticleUniverseNode {
  // 3D Spherical Central Bubble Coordinates
  bubbleRadius: number;
  theta: number;
  phi: number;
  dTheta: number;
  dPhi: number;

  // Viewport Ambient Coordinates (Full screen: edges, corners, center)
  ambX: number;
  ambY: number;
  vx: number;
  vy: number;

  // Initial J-Constellation Participant Parameters
  isJParticipant: boolean;
  jTargetX: number;
  jTargetY: number;

  // Visual & Physical Properties
  layer: number; // 0: background mist mote, 1: mid-field star, 2: foreground focal star
  baseRadius: number;
  baseHue: number;
  hueSpeed: number;
  baseAlpha: number;
  pulseSpeed: number;
  phase: number;

  // Evacuation & Reconstitution Spiral Parameters (for unused particles)
  spiralAngleOffset: number;
  spiralArmTurns: number;
  spiralDistanceFactor: number;
  spiralSpeedVariance: number;
  isPerimeterDweller: boolean;

  // Current Screen Render Coordinates
  screenX: number;
  screenY: number;
}

// Restrained neon palette: blue, cyan, violet, magenta, subtle mint, warm gold
export const NEON_PALETTE_HUES = [
  192, // Electric Cyan
  216, // Royal Azure / Blue
  268, // Deep Neon Violet
  318, // Radiant Magenta
  198, // Bright Cyan-Teal
  156, // Subtle Mint-Emerald (accent)
  42   // Subtle Warm Gold (rare accent)
];

// Curated premium neon color modes for the interactive particle universe:
// Exact 5-state ordered palette cycle:
// State 1 — Original Living Constellation (multicolor)
// State 2 — Emerald Pulse (rich emerald green dominant, subtle mint-green highlights)
// State 3 — Arctic Intelligence (electric cyan dominant, subtle ice-blue highlights)
// State 4 — Quantum Violet (deep neon violet dominant, subtle ultraviolet highlights)
// State 5 — Solar Gold (rich amber dominant, subtle warm champagne-gold highlights)
export interface JColorMode {
  id: string;
  name: string;
  isMulticolor: boolean;
  baseHue: number;
  highlightHue?: number;
}

export const J_COLOR_MODES: JColorMode[] = [
  { id: 'original', name: 'Original Living Constellation', isMulticolor: true, baseHue: 192 },
  { id: 'emerald', name: 'Emerald Pulse', isMulticolor: false, baseHue: 154, highlightHue: 168 },
  { id: 'cyan', name: 'Arctic Intelligence', isMulticolor: false, baseHue: 190, highlightHue: 206 },
  { id: 'violet', name: 'Quantum Violet', isMulticolor: false, baseHue: 270, highlightHue: 296 },
  { id: 'amber', name: 'Solar Gold', isMulticolor: false, baseHue: 38, highlightHue: 48 }
];

// Precision distance helper from 2D point to line segment
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Precision hit-test against signature J particles and connecting filaments
export function isJHit(
  clickX: number,
  clickY: number,
  jParticles: Array<{ screenX: number; screenY: number }>,
  hitTolerance = 60
): boolean {
  if (!jParticles || jParticles.length === 0) return false;
  for (let i = 0; i < jParticles.length; i++) {
    const p1 = jParticles[i];
    if (!p1) continue;
    if (Math.hypot(clickX - p1.screenX, clickY - p1.screenY) <= hitTolerance) {
      return true;
    }
    if (i < jParticles.length - 1) {
      const p2 = jParticles[i + 1];
      if (p2 && distToSegment(clickX, clickY, p1.screenX, p1.screenY, p2.screenX, p2.screenY) <= hitTolerance) {
        return true;
      }
    }
  }
  return false;
}

// Helper to cycle smoothly to next curated neon color mode
export function cycleNextJColorMode(currentIndex: number): number {
  return (currentIndex + 1) % J_COLOR_MODES.length;
}

// Preserved original first-version parametric normalized coordinates for the J-constellation
export function generateJCoordinates(count: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  // Top horizontal bar: ~12 points (normalized from -0.16 to 0.14 at y = -0.32)
  const topCount = Math.floor(count * 0.25);
  for (let i = 0; i < topCount; i++) {
    const t = i / (topCount - 1);
    points.push({
      x: -0.16 + t * 0.30,
      y: -0.32 + (Math.sin(t * Math.PI) * 0.015)
    });
  }

  // Vertical stem: ~16 points (from x = 0.05, y = -0.32 to y = 0.16)
  const stemCount = Math.floor(count * 0.35);
  for (let i = 0; i < stemCount; i++) {
    const t = i / (stemCount - 1);
    points.push({
      x: 0.05 + (Math.random() - 0.5) * 0.008,
      y: -0.32 + t * 0.48
    });
  }

  // Smooth bottom hook curving left and up: ~remaining points
  // Center around (-0.08, 0.16), radius ~0.13, angle from 0 down to PI + small curl
  const hookCount = count - topCount - stemCount;
  for (let i = 0; i < hookCount; i++) {
    const t = i / (hookCount - 1);
    // Angle from 0 down through -PI/2 (bottom) to -PI - 0.3 (curl up)
    const angle = 0 - t * (Math.PI * 1.15);
    const radiusX = 0.13;
    const radiusY = 0.14;
    points.push({
      x: -0.08 + Math.cos(angle) * radiusX,
      y: 0.16 - Math.sin(angle) * radiusY
    });
  }

  return points;
}

export interface ProceduralConstellation {
  family: string;
  particleIndices: number[];
  targetCoords: Array<{ x: number; y: number }>;
  edges?: Array<[number, number]>;
  motionType: 'rotate' | 'pulse' | 'wave' | 'drift';
  motionParam: number;
  centerOffsetX: number;
  centerOffsetY: number;
  scale: number;
}

// Milestone 1 Deterministic Formation Generator
// Builds target coordinates and explicit edges for curated formations
// Assigns participant indices starting at 48 so 48 signature J particles (0..47) are never overtaken
export function generateDeterministicFormationConstellation(
  cycleIndex: number,
  totalParticles: number,
  viewWidth: number,
  viewHeight: number
): ProceduralConstellation {
  const formation = getDeterministicFormationByIndex(cycleIndex);
  const targetResult = formation.generateCoords(formation.participantCount);

  // Allocate participant indices deterministically starting at index 48
  // This guarantees that signature J participants (0..47) are never part of this constellation
  const startIndex = 48;
  const count = targetResult.coords.length;
  const particleIndices: number[] = [];
  const maxAvailable = Math.max(1, totalParticles - startIndex);
  for (let i = 0; i < count; i++) {
    particleIndices.push(startIndex + (i % maxAvailable));
  }

  const isDna = formation.id === 'dna_helix';
  const isGalaxy = formation.id === 'galaxy_spiral';
  const isNebula = formation.id === 'nebula';
  const isOrbitals = formation.id === 'atomic_orbitals';
  const isBlackHole = formation.id === 'black_hole_vortex';
  const isKnowledge = formation.id === 'knowledge_constellation';
  const isOrbital = formation.id === 'orbital_system';
  const isBrain = formation.id === 'cortex_brain';
  const isSynapse = formation.id === 'neural_synapse';
  const isNeuron = formation.id === 'single_neuron';
  const isMobile = viewWidth < 768;
  const baseScale = isMobile
    ? isDna
      ? Math.min(viewWidth * 1.15, viewHeight * 0.78)
      : isGalaxy
      ? Math.min(viewWidth * 1.10, viewHeight * 0.76)
      : isNebula
      ? Math.min(viewWidth * 1.12, viewHeight * 0.78)
      : isOrbitals
      ? Math.min(viewWidth * 1.10, viewHeight * 0.76)
      : isBlackHole
      ? Math.min(viewWidth * 1.10, viewHeight * 0.76)
      : isKnowledge
      ? Math.min(viewWidth * 1.10, viewHeight * 0.76)
      : isOrbital
      ? Math.min(viewWidth * 1.10, viewHeight * 0.76)
      : isBrain
      ? Math.min(viewWidth * 1.10, viewHeight * 0.76)
      : isSynapse
      ? Math.min(viewWidth * 1.12, viewHeight * 0.76)
      : isNeuron
      ? Math.min(viewWidth * 1.12, viewHeight * 0.76)
      : Math.min(viewWidth, viewHeight) * 0.72
    : isDna
    ? Math.min(viewWidth * 1.55, viewHeight * 1.12)
    : isGalaxy
    ? Math.min(viewWidth * 1.35, viewHeight * 1.16)
    : isNebula
    ? Math.min(viewWidth * 1.35, viewHeight * 1.15)
    : isOrbitals
    ? Math.min(viewWidth * 1.32, viewHeight * 1.14)
    : isBlackHole
    ? Math.min(viewWidth * 1.34, viewHeight * 1.15)
    : isKnowledge
    ? Math.min(viewWidth * 1.34, viewHeight * 1.14)
    : isOrbital
    ? Math.min(viewWidth * 1.34, viewHeight * 1.14)
    : isBrain
    ? Math.min(viewWidth * 1.30, viewHeight * 1.12)
    : isSynapse
    ? Math.min(viewWidth * 1.38, viewHeight * 1.10)
    : isNeuron
    ? Math.min(viewWidth * 1.35, viewHeight * 1.12)
    : Math.min(viewWidth, viewHeight) * 0.78;
  const scale = baseScale * (formation.scaleMultiplier ?? 1.0);

  return {
    family: formation.id,
    particleIndices,
    targetCoords: targetResult.coords,
    edges: targetResult.edges,
    motionType: formation.motionType,
    motionParam: formation.motionParam,
    centerOffsetX: 0,
    centerOffsetY: (formation.centerOffsetY ?? 0) * viewHeight,
    scale
  };
}

// Procedural formation generator capable of producing hundreds of distinct geometric,
// organic, and mathematical formations for the evolving constellation universe.
// The signature J identity is strictly excluded from this procedural pool and reserved exclusively
// for the initial opening cinematic sequence.
export const PROCEDURAL_CONSTELLATION_FAMILIES = [
  'spiral',
  'wave',
  'orbital',
  'geometric',
  'lissajous',
  'branching'
] as const;

export function generateProceduralConstellation(
  totalParticles: number,
  viewWidth: number,
  viewHeight: number,
  lastFamily?: string
): ProceduralConstellation {
  // Explicitly ensure the signature J is strictly excluded from procedural selection
  const EXCLUDED_PATTERNS = new Set(['j', 'signature', 'signature_j', 'signatureJ']);
  const families = PROCEDURAL_CONSTELLATION_FAMILIES.filter(
    (f) => !EXCLUDED_PATTERNS.has(f)
  );
  const eligibleFamilies = families.filter((f) => f !== lastFamily);
  const family = eligibleFamilies[Math.floor(Math.random() * eligibleFamilies.length)];

  // Varied participant count between 26 and 54
  const count = 26 + Math.floor(Math.random() * 28);

  // Pick random subset of particle indices to vary participants each cycle
  const availableIndices = Array.from({ length: totalParticles }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (totalParticles - i));
    const temp = availableIndices[i];
    availableIndices[i] = availableIndices[j];
    availableIndices[j] = temp;
  }
  const particleIndices = availableIndices.slice(0, count);

  const coords: Array<{ x: number; y: number }> = [];
  const rotAngle = Math.random() * Math.PI * 2;
  const cosR = Math.cos(rotAngle);
  const sinR = Math.sin(rotAngle);

  switch (family) {
    case 'spiral': {
      // 2 or 3 arm logarithmic/Archimedean galaxy spiral (multi-arm spiral ensuring distinct cosmic galaxy geometry that never resembles the single-stroke signature J)
      const arms = Math.random() > 0.5 ? 2 : 3;
      const turns = 1.2 + Math.random() * 1.4;
      for (let i = 0; i < count; i++) {
        const armIndex = i % arms;
        const t = Math.floor(i / arms) / Math.max(1, Math.floor(count / arms) - 1);
        const theta = t * Math.PI * 2 * turns + (armIndex * Math.PI * 2) / arms;
        const r = 0.05 + Math.pow(t, 0.85) * 0.38;
        coords.push({
          x: r * Math.cos(theta),
          y: r * Math.sin(theta) * (0.85 + Math.random() * 0.25)
        });
      }
      break;
    }
    case 'wave': {
      // Flowing sinusoidal ribbon / braid
      const strands = Math.random() > 0.5 ? 2 : 1;
      const freq = 1.4 + Math.random() * 1.8;
      const amp = 0.12 + Math.random() * 0.12;
      for (let i = 0; i < count; i++) {
        const strand = i % strands;
        const t = Math.floor(i / strands) / Math.max(1, Math.floor(count / strands) - 1);
        const normX = (t - 0.5) * 0.85;
        const phase = strand * Math.PI * 0.75;
        const normY =
          Math.sin(t * Math.PI * 2 * freq + phase) * amp +
          Math.cos(t * Math.PI * 3 + phase) * (amp * 0.35);
        coords.push({ x: normX, y: normY });
      }
      break;
    }
    case 'orbital': {
      // Lemniscate of Bernoulli or intersecting planetary rings
      const isLemniscate = Math.random() > 0.45;
      if (isLemniscate) {
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          const denom = 1 + Math.sin(t) * Math.sin(t);
          const r = 0.42;
          coords.push({
            x: (r * Math.cos(t)) / denom,
            y: (r * Math.sin(t) * Math.cos(t) * 1.35) / denom
          });
        }
      } else {
        // Intersecting dual elliptical orbits
        for (let i = 0; i < count; i++) {
          const orbit = i % 2;
          const t = ((Math.floor(i / 2) / Math.max(1, Math.floor(count / 2) - 1)) * Math.PI * 2);
          const rx = 0.38;
          const ry = 0.18 + (orbit === 1 ? 0.08 : 0);
          const tilt = orbit === 1 ? 0.65 : -0.65;
          const ox = rx * Math.cos(t);
          const oy = ry * Math.sin(t);
          coords.push({
            x: ox * Math.cos(tilt) - oy * Math.sin(tilt),
            y: ox * Math.sin(tilt) + oy * Math.cos(tilt)
          });
        }
      }
      break;
    }
    case 'geometric': {
      // Astroid or faceted polygon
      const isAstroid = Math.random() > 0.5;
      if (isAstroid) {
        const rad = 0.35;
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          coords.push({
            x: rad * Math.pow(Math.cos(t), 3),
            y: rad * Math.pow(Math.sin(t), 3)
          });
        }
      } else {
        const points = Math.random() > 0.5 ? 5 : 6;
        const outerR = 0.38;
        const innerR = 0.16 + Math.random() * 0.06;
        for (let i = 0; i < count; i++) {
          const isOuter = i % 2 === 0;
          const r = isOuter ? outerR : innerR;
          const angle = (i / count) * Math.PI * 2;
          coords.push({
            x: r * Math.cos(angle),
            y: r * Math.sin(angle)
          });
        }
      }
      break;
    }
    case 'lissajous': {
      // Lissajous curve
      const aVals = [2, 3, 3, 4, 5];
      const bVals = [3, 2, 4, 3, 4];
      const pIdx = Math.floor(Math.random() * aVals.length);
      const a = aVals[pIdx];
      const b = bVals[pIdx];
      const delta = Math.random() * Math.PI;
      const rx = 0.36;
      const ry = 0.32;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        coords.push({
          x: rx * Math.sin(a * t + delta),
          y: ry * Math.sin(b * t)
        });
      }
      break;
    }
    case 'branching':
    default: {
      // Asymmetric radiating starburst or neural tree
      const arms = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const arm = i % arms;
        const t = Math.floor(i / arms) / Math.max(1, Math.floor(count / arms) - 1);
        const armAngle = (arm / arms) * Math.PI * 2 + Math.sin(arm) * 0.2;
        const r = 0.06 + t * 0.34;
        const jitter = Math.sin(i * 1.7) * 0.02;
        coords.push({
          x: r * Math.cos(armAngle) + jitter,
          y: r * Math.sin(armAngle) + jitter
        });
      }
      break;
    }
  }

  // Rotate points into final relative orientation
  const finalCoords = coords.map((pt) => ({
    x: pt.x * cosR - pt.y * sinR,
    y: pt.x * sinR + pt.y * cosR
  }));

  const motionTypes: Array<'rotate' | 'pulse' | 'wave' | 'drift'> = [
    'rotate',
    'pulse',
    'wave',
    'drift'
  ];
  const motionType = motionTypes[Math.floor(Math.random() * motionTypes.length)];

  return {
    family,
    particleIndices,
    targetCoords: finalCoords,
    motionType,
    motionParam: (Math.random() - 0.5) * 0.0035,
    centerOffsetX: (Math.random() - 0.5) * 0.10 * viewWidth,
    centerOffsetY: (Math.random() - 0.5) * 0.08 * viewHeight,
    scale: Math.min(viewWidth, viewHeight) * (0.65 + Math.random() * 0.15)
  };
}

export const CinematicParticleField: React.FC<CinematicParticleFieldProps> = ({
  className = '',
  opacity = 1,
  onPhaseCReached
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let particles: ParticleUniverseNode[] = [];
    const J_PARTICIPANT_COUNT = 48;
    let phaseNotified = false;

    // Interactive Universe Color Mode State (cycles smoothly across full particle universe)
    let activeColorModeIndex = 0;
    let colorTransitionStartTime = 0;
    const COLOR_TRANSITION_DURATION = 650;
    let lastColorCycleTime = 0;
    let currentJProgress = 0;
    let successfulThemeChangeCount = 0;
    let triggeredJRevealTime = 0;

    let currentUniverseHues: number[] = [];
    let startUniverseHues: number[] = [];

    // Evolving constellation state (for post-opening cycles)
    let activeConstellation: ProceduralConstellation | null = null;
    let lastConstellationCycleIndex = -1;
    let lastConstellationFamily = '';

    const initDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    const createParticles = () => {
      const count = width < 768 ? 190 : 360;
      particles = [];
      currentUniverseHues = new Array(count).fill(192);
      startUniverseHues = new Array(count).fill(192);

      const jCoordinates = generateJCoordinates(J_PARTICIPANT_COUNT);

      for (let i = 0; i < count; i++) {
        const isJParticipant = i < J_PARTICIPANT_COUNT;
        const jCoord = isJParticipant ? jCoordinates[i] : { x: 0, y: 0 };

        // Layer distribution for depth variation
        const layer = i % 3; // 0: background mist mote, 1: mid-field, 2: foreground focal star
        const baseRadius =
          layer === 0
            ? 0.9 + Math.random() * 0.6
            : layer === 1
            ? 1.6 + Math.random() * 0.9
            : 2.6 + Math.random() * 1.3;

        // Central spherical bubble dynamics (dimensional cluster, not flat)
        const bubbleRadius = isJParticipant ? 28 + Math.random() * 32 : 25 + Math.random() * 55;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const dTheta = (Math.random() - 0.5) * 0.016;
        const dPhi = (Math.random() - 0.5) * 0.012;

        // Viewport ambient distributed coordinates (dispersed across full screen: corners, edges, center)
        const ambX = Math.random() * width;
        const ambY = Math.random() * height;
        const vx = (Math.random() - 0.5) * 0.38;
        const vy = (Math.random() - 0.5) * 0.38;

        const hue = NEON_PALETTE_HUES[Math.floor(Math.random() * NEON_PALETTE_HUES.length)];

        // Deterministic outward evacuation and reconstitution spiral parameters
        const spiralAngleOffset = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const spiralArmTurns = 1.35 + ((i % 6) / 6) * 0.75 + Math.random() * 0.30;
        const spiralSpeedVariance = 0.90 + ((i % 8) / 8) * 0.20;
        const isPerimeterDweller = !isJParticipant && (i % 28 === 0);
        const spiralDistanceFactor = isPerimeterDweller
          ? 0.86 + Math.random() * 0.08
          : 1.18 + ((i % 5) / 5) * 0.16 + Math.random() * 0.12;

        particles.push({
          bubbleRadius,
          theta,
          phi,
          dTheta,
          dPhi,
          ambX,
          ambY,
          vx,
          vy,
          isJParticipant,
          jTargetX: jCoord.x,
          jTargetY: jCoord.y,
          layer,
          baseRadius,
          baseHue: hue,
          hueSpeed: 0.008 + Math.random() * 0.014,
          baseAlpha: layer === 0 ? 0.38 : layer === 1 ? 0.64 : 0.88,
          pulseSpeed: 0.0012 + Math.random() * 0.002,
          phase: Math.random() * Math.PI * 2,
          screenX: width / 2,
          screenY: height / 2,
          spiralAngleOffset,
          spiralArmTurns,
          spiralDistanceFactor,
          spiralSpeedVariance,
          isPerimeterDweller
        });

        currentUniverseHues[i] = hue;
        startUniverseHues[i] = hue;
      }
    };

    initDimensions();
    createParticles();

    const handleResize = () => {
      initDimensions();
      if (lastConstellationCycleIndex >= 0) {
        activeConstellation = generateDeterministicFormationConstellation(
          lastConstellationCycleIndex,
          particles.length,
          width,
          height
        );
      }
    };

    window.addEventListener('resize', handleResize);

    // Cursor reactivity listeners (desktop mouse/trackpad & mobile touch)
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      };
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    let pointerDownPos: { x: number; y: number; time: number } | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY, time: performance.now() };
    };

    const handlePointerUp = (e?: PointerEvent) => {
      mouseRef.current.active = false;
      if (!e || !pointerDownPos) return;

      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      const dist = Math.hypot(dx, dy);
      const pressDuration = performance.now() - pointerDownPos.time;
      pointerDownPos = null;

      // Deliberate click/tap check: ignore scroll swipes and long presses
      if (dist < 18 && pressDuration < 800) {
        // Prevent accidental triggering from unrelated page interactions
        const target = e.target as HTMLElement | null;
        if (
          target &&
          target.closest('button, a, input, select, textarea, [role="button"], nav, header, [role="dialog"]')
        ) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const isTouch = e.pointerType === 'touch';
        const hitTolerance = isTouch ? 75 : 55;

        // Particle universe interaction area tap/click check
        if (clickX >= 0 && clickX <= rect.width && clickY >= 0 && clickY <= rect.height) {
          const now = performance.now();
          if (now - lastColorCycleTime >= 150) {
            lastColorCycleTime = now;
            activeColorModeIndex = (activeColorModeIndex + 1) % J_COLOR_MODES.length;
            colorTransitionStartTime = now;
            successfulThemeChangeCount++;

            for (let i = 0; i < particles.length; i++) {
              startUniverseHues[i] = currentUniverseHues[i];
            }

            // Every 5 successful theme changes, trigger signature J reveal
            if (successfulThemeChangeCount % 5 === 0) {
              triggeredJRevealTime = now;
            }
          }
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointerdown', handlePointerDown);

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;

      // =========================================================================
      // COHERENT OPENING & EVOLVING CONSTELLATION STATE MACHINE:
      //
      // Phase 1 (0ms -> 1000ms): Black void & central particle bubble emerges
      // Phase 2 & 3 (1000ms -> 2600ms): J forms between bubble and text
      // Phase 3 Hold (2600ms -> 4200ms): J holds deliberately while bubble remains alive
      // Phase 4 (4200ms -> 5500ms): J dissolves smoothly back into the central bubble
      // Phase 5 (5500ms -> 8000ms): Bubble naturally disperses across the entire viewport
      // Phase 6 (8000ms+): Evolving Constellation Universe with ~10s procedural cycles
      // =========================================================================

      let bubbleScale = 1.0;
      let bubbleBrightness = 1.0;
      let jProgress = 0;
      let universeExpansion = 0;
      let isInitialOpening = true;

      // Evolving constellation parameters
      let constellationProgress = 0;
      let currentCycleConstellation: ProceduralConstellation | null = null;

      let triggeredJProgress = 0;
      if (triggeredJRevealTime > 0) {
        const jElapsed = now - triggeredJRevealTime;
        const REVEAL_DURATION = 3500;
        if (jElapsed < REVEAL_DURATION) {
          if (jElapsed < 1200) {
            const t = jElapsed / 1200;
            triggeredJProgress = t * t * (3 - 2 * t);
          } else if (jElapsed < 2400) {
            triggeredJProgress = 1.0;
          } else {
            const t = (jElapsed - 2400) / 1100;
            const ease = t * t * (3 - 2 * t);
            triggeredJProgress = 1.0 - ease;
          }
        } else {
          triggeredJRevealTime = 0;
        }
      }

      if (!prefersReducedMotion) {
        if (elapsed < 1000) {
          // Phase 1: Pure black background, central luminous bubble emerges
          const t = Math.max(0, elapsed / 1000);
          const ease = t * t * (3 - 2 * t);
          bubbleScale = 0.25 + ease * 0.75;
          bubbleBrightness = Math.min(1, elapsed / 600);
          jProgress = 0;
          universeExpansion = 0;
        } else if (elapsed < 2600) {
          // Phase 2 & 3: J forms between central bubble and emerging text
          bubbleScale = 1.0;
          bubbleBrightness = 1.0;
          const t = Math.max(0, (elapsed - 1200) / 1400);
          jProgress = Math.min(1, t * t * (3 - 2 * t));
          universeExpansion = 0;
        } else if (elapsed < 4200) {
          // Phase 3 Hold: J holds for viewer appreciation; bubble stays active
          bubbleScale = 1.0;
          bubbleBrightness = 1.0;
          jProgress = 1.0;
          universeExpansion = 0;
        } else if (elapsed < 5500) {
          // Phase 4: J gracefully dissolves back into the central bubble
          bubbleScale = 1.0;
          bubbleBrightness = 1.0;
          const t = (elapsed - 4200) / 1300;
          const ease = Math.max(0, Math.min(1, t * t * (3 - 2 * t)));
          jProgress = 1.0 - ease;
          universeExpansion = 0;
        } else if (elapsed < 8000) {
          // Phase 5: Bubble disperses outward across the entire viewport
          bubbleScale = 1.0;
          bubbleBrightness = 1.0;
          jProgress = 0;
          const t = (elapsed - 5500) / 2500;
          universeExpansion = Math.min(1, t * t * (3 - 2 * t));
          if (!phaseNotified && onPhaseCReached) {
            phaseNotified = true;
            onPhaseCReached();
          }
        } else {
          // Phase 6: Full universe dispersion complete; evolve through procedural constellation cycles
          isInitialOpening = false;
          bubbleScale = 1.0;
          bubbleBrightness = 1.0;
          jProgress = 0;
          universeExpansion = 1.0;

          // Approximately every 10 seconds (~10,500ms cycle), initiate a new constellation cycle
          const CYCLE_PERIOD = 10500;
          const postOpeningElapsed = elapsed - 8000;
          // Initial ~1.5s peaceful free drift after dispersion before first procedural cycle begins
          const cycleTimeOffset = postOpeningElapsed - 1500;

          if (cycleTimeOffset > 0) {
            const cycleIndex = Math.floor(cycleTimeOffset / CYCLE_PERIOD);
            const timeInCycle = cycleTimeOffset % CYCLE_PERIOD;

            // When entering a new cycle, select deterministic formation from catalog
            if (cycleIndex !== lastConstellationCycleIndex) {
              lastConstellationCycleIndex = cycleIndex;
              activeConstellation = generateDeterministicFormationConstellation(
                cycleIndex,
                particles.length,
                width,
                height
              );
              lastConstellationFamily = activeConstellation.family;
            }

            currentCycleConstellation = activeConstellation;

            // Phasing within each 10.5s cycle:
            // 0 - 1800ms: Natural gathering into formation
            // 1800 - 5200ms: Hold & coordinated motion/rotation/pulse (3.4s)
            // 5200 - 6700ms: Graceful dissolution back to independent drift (1.5s)
            // 6700 - 10500ms: Pure independent ambient drift until next cycle (3.8s)
            if (timeInCycle < 1800) {
              const t = timeInCycle / 1800;
              const ease = t * t * (3 - 2 * t);
              constellationProgress = ease;
            } else if (timeInCycle < 5200) {
              constellationProgress = 1.0;
            } else if (timeInCycle < 6700) {
              const t = (timeInCycle - 5200) / 1500;
              const ease = t * t * (3 - 2 * t);
              constellationProgress = 1.0 - ease;
            } else {
              constellationProgress = 0;
            }
          }
        }
      } else {
        // Reduced motion: instant full ambient state, no active cycles
        isInitialOpening = false;
        bubbleScale = 1.0;
        bubbleBrightness = 1.0;
        jProgress = 0;
        universeExpansion = 1.0;
      }

      if (triggeredJProgress > 0) {
        jProgress = Math.max(jProgress, triggeredJProgress);
      }

      currentJProgress = jProgress;

      // 1. Clear Canvas with deep black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Soft ambient aura for the central bubble during initial Phases 1 - 4
      if (universeExpansion < 0.98) {
        const auraAlpha = (1 - universeExpansion) * (1 - jProgress * 0.82) * 0.16 * bubbleBrightness;
        const auraRadius = Math.max(30, 80 * bubbleScale);
        const auraGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          auraRadius
        );
        auraGrad.addColorStop(0, `rgba(6, 182, 212, ${auraAlpha * 0.8})`);
        auraGrad.addColorStop(0.45, `rgba(139, 92, 246, ${auraAlpha * 0.4})`);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // PRIORITY 1: Substantially larger J formation scale (dominant hero visual, no clipping)
      const jScale =
        width < 768
          ? Math.min(width * 1.85, height * 1.05)
          : Math.min(width * 1.25, height * 1.15);

      // Map participant index to target coordinates for the active constellation (if any)
      const constellationTargetMap = new Map<number, { x: number; y: number }>();
      const activeParticipantSet = new Set<number>();

      if (currentCycleConstellation && constellationProgress > 0) {
        const {
          family,
          particleIndices,
          targetCoords,
          centerOffsetX,
          centerOffsetY,
          scale
        } = currentCycleConstellation;

        const constCenterX = centerX + centerOffsetX;
        const constCenterY = centerY + centerOffsetY;

        for (let k = 0; k < particleIndices.length; k++) {
          const pIdx = particleIndices[k];
          activeParticipantSet.add(pIdx);
          const rawCoord = targetCoords[k];
          if (!rawCoord) continue;

          // Unified transformation: guarantees 100% mathematical lockstep
          // between constellation anchor particles and volumetric detail renderers
          const target = computeSynchronizedFormationTarget({
            family,
            index: k,
            totalParticipants: particleIndices.length,
            rawCoord,
            scale,
            centerX: constCenterX,
            centerY: constCenterY,
            elapsed
          });

          constellationTargetMap.set(pIdx, target);
        }
      }

      const mouse = mouseRef.current;
      const mouseActive = mouse.active && !prefersReducedMotion;

      // 2. Continuous Particle Position Simulation (Independent drift across viewport)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // A. Bubble coordinate evolution (spherical 3D orbit)
        if (!prefersReducedMotion) {
          p.theta += p.dTheta;
          p.phi += p.dPhi;
        }

        const sinPhi = Math.sin(p.phi);
        const cosPhi = Math.cos(p.phi);
        const sinTheta = Math.sin(p.theta);
        const cosTheta = Math.cos(p.theta);

        const r = p.bubbleRadius * bubbleScale;
        const bX = centerX + r * sinPhi * cosTheta;
        const bY = centerY + r * (cosPhi * 0.88 + sinPhi * sinTheta * 0.32);

        // B. Viewport ambient coordinate evolution (independent smooth drift across full screen)
        if (!prefersReducedMotion && universeExpansion > 0.05) {
          p.ambX += p.vx + Math.cos(elapsed * 0.0006 + p.phase) * 0.32;
          p.ambY += p.vy + Math.sin(elapsed * 0.0006 + p.phase) * 0.32;

          // Seamless boundary wrapping across full screen
          if (p.ambX < -30) p.ambX = width + 25;
          if (p.ambX > width + 30) p.ambX = -25;
          if (p.ambY < -30) p.ambY = height + 25;
          if (p.ambY > height + 30) p.ambY = -25;
        }

        // C. Initial Opening: Interpolation Bubble -> J -> Bubble (Centered with slight +0.035 correction)
        let intermX = bX;
        let intermY = bY;

        if (p.isJParticipant && jProgress > 0) {
          const targetJX = centerX + (p.jTargetX + 0.035) * jScale;
          const targetJY = centerY + (p.jTargetY + 0.01) * jScale;
          intermX = bX * (1 - jProgress) + targetJX * jProgress;
          intermY = bY * (1 - jProgress) + targetJY * jProgress;
        } else if (!p.isJParticipant && isInitialOpening && jProgress > 0) {
          // Outward spiral evacuation during J formation, smooth inward reconstitution during dissolution
          const dx = bX - centerX;
          const dy = bY - centerY;
          const baseDist = Math.hypot(dx, dy);
          const baseAngle = baseDist > 0.5 ? Math.atan2(dy, dx) : p.spiralAngleOffset;
          const maxScreenDist = Math.hypot(width / 2, height / 2);
          const exitDist = (maxScreenDist + 140) * p.spiralDistanceFactor;

          const t = jProgress;
          const ease = t * t * (3 - 2 * t);
          const spiralEase = Math.pow(ease, p.spiralSpeedVariance);

          const currentDist = baseDist + (exitDist - baseDist) * spiralEase;
          const angleTravel = p.spiralArmTurns * Math.pow(spiralEase, 0.88);
          const currentAngle = baseAngle + angleTravel;

          intermX = centerX + currentDist * Math.cos(currentAngle);
          intermY = centerY + currentDist * Math.sin(currentAngle);
        }

        // D. Initial Opening: Interpolation Bubble -> Viewport Universe
        let curX = intermX * (1 - universeExpansion) + p.ambX * universeExpansion;
        let curY = intermY * (1 - universeExpansion) + p.ambY * universeExpansion;

        // E. Post-Opening Participation Flag
        const isPostOpeningParticipant = !isInitialOpening && constellationProgress > 0 && activeParticipantSet.has(i);

        // J Priority: If signature J is actively revealing post-opening via periodic theme change,
        // J participants (indices 0..47) smoothly form the signature J without fighting the formation.
        if (p.isJParticipant && jProgress > 0 && !isInitialOpening) {
          const targetJX = centerX + (p.jTargetX + 0.035) * jScale;
          const targetJY = centerY + (p.jTargetY + 0.01) * jScale;
          curX = p.ambX * (1 - jProgress) + targetJX * jProgress;
          curY = p.ambY * (1 - jProgress) + targetJY * jProgress;
        } else if (isPostOpeningParticipant) {
          const cTarget = constellationTargetMap.get(i);
          if (cTarget) {
            curX = p.ambX * (1 - constellationProgress) + cTarget.x * constellationProgress;
            curY = p.ambY * (1 - constellationProgress) + cTarget.y * constellationProgress;
          }
        } else if (!isInitialOpening && constellationProgress > 0 && !activeParticipantSet.has(i)) {
            // Post-opening: Unused particles organically evacuate away from the active procedural formation
            const constCenterRefX = currentCycleConstellation ? centerX + currentCycleConstellation.centerOffsetX : centerX;
            const constCenterRefY = currentCycleConstellation ? centerY + currentCycleConstellation.centerOffsetY : centerY;
            const dx = p.ambX - constCenterRefX;
            const dy = p.ambY - constCenterRefY;
            const baseDist = Math.hypot(dx, dy);
            const baseAngle = baseDist > 0.5 ? Math.atan2(dy, dx) : p.spiralAngleOffset;
            const maxScreenDist = Math.hypot(width / 2, height / 2);
            const exitDist = (maxScreenDist + 140) * p.spiralDistanceFactor;

            const t = constellationProgress;
            const ease = t * t * (3 - 2 * t);
            const spiralEase = Math.pow(ease, p.spiralSpeedVariance);

            const currentDist = baseDist + (exitDist - baseDist) * spiralEase;
            const angleTravel = p.spiralArmTurns * Math.pow(spiralEase, 0.88);
            const currentAngle = baseAngle + angleTravel;

            curX = constCenterRefX + currentDist * Math.cos(currentAngle);
            curY = constCenterRefY + currentDist * Math.sin(currentAngle);
          }

        // F. PRIORITY 3: Restored Cursor Reactivity (Smooth localized deflection, no stickiness, no permanent mesh)
        if (mouseActive) {
          const dx = curX - mouse.x;
          const dy = curY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 140;

          if (dist < maxDist && dist > 1) {
            const factor = Math.cos((dist / maxDist) * (Math.PI / 2));
            const isParticipant = (isInitialOpening && p.isJParticipant && jProgress > 0) || isPostOpeningParticipant;
            const force = factor * 22 * (isParticipant ? 0.45 : 1.0);
            curX += (dx / dist) * force;
            curY += (dy / dist) * force;
          }
        }

        p.screenX = curX;
        p.screenY = curY;
      }

      // Interactive Universe Color Transition Processing across ALL particles
      const activeMode = J_COLOR_MODES[activeColorModeIndex];
      const timeSinceColorChange = colorTransitionStartTime > 0 ? now - colorTransitionStartTime : Infinity;
      const colorProgress = Math.min(1.0, timeSinceColorChange / COLOR_TRANSITION_DURATION);
      const colorEase = colorProgress * colorProgress * (3 - 2 * colorProgress);

      let interpolatedBaseHue = activeMode.baseHue;
      if (colorProgress < 1.0) {
        const prevModeIndex = (activeColorModeIndex - 1 + J_COLOR_MODES.length) % J_COLOR_MODES.length;
        const prevBaseHue = J_COLOR_MODES[prevModeIndex].baseHue;
        let diff = (activeMode.baseHue - prevBaseHue) % 360;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        interpolatedBaseHue = (prevBaseHue + diff * colorEase + 360) % 360;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;
        let targetHue: number;
        if (activeMode.isMulticolor) {
          targetHue = (p.baseHue + elapsed * p.hueSpeed) % 360;
        } else {
          // Curated neon single-hue mode with subtle organic crystal shimmering and highlight variation
          const highlightFactor =
            i % 5 === 0 && activeMode.highlightHue !== undefined
              ? activeMode.highlightHue
              : activeMode.baseHue;
          const crystalOffset = ((i * 7) % 17 - 8) * 1.15;
          targetHue = (highlightFactor + crystalOffset + elapsed * p.hueSpeed * 0.4 + 360) % 360;
        }

        if (colorProgress < 1.0) {
          // Shortest angular interpolation
          let diff = (targetHue - (startUniverseHues[i] ?? p.baseHue)) % 360;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          currentUniverseHues[i] = ((startUniverseHues[i] ?? p.baseHue) + diff * colorEase + 360) % 360;
        } else {
          currentUniverseHues[i] = targetHue;
        }
      }

      // 3. Delicate Constellation Connective Lines (Drawn ONLY for actively participating formations)
      // A. Opening / Periodic J constellation filaments
      if ((isInitialOpening || jProgress > 0) && jProgress > 0.15) {
        ctx.beginPath();
        const jAlpha = Math.min(0.40, jProgress * 0.45) * bubbleBrightness;
        if (activeMode.isMulticolor && colorProgress >= 1.0) {
          ctx.strokeStyle = `rgba(6, 214, 240, ${jAlpha})`;
        } else {
          const filHue = currentUniverseHues[Math.floor(J_PARTICIPANT_COUNT / 2)] ?? activeMode.baseHue;
          ctx.strokeStyle = `hsla(${filHue}, 96%, 66%, ${jAlpha})`;
        }
        ctx.lineWidth = 1.2;

        for (let i = 0; i < J_PARTICIPANT_COUNT - 1; i++) {
          const p1 = particles[i];
          const p2 = particles[i + 1];
          if (p1 && p2) {
            ctx.moveTo(p1.screenX, p1.screenY);
            ctx.lineTo(p2.screenX, p2.screenY);
          }
        }
        ctx.stroke();
      }

      // B. Post-opening procedural constellation filaments (ONLY while formation is active)
      if (
        !isInitialOpening &&
        currentCycleConstellation &&
        constellationProgress > 0.05
      ) {
        const { particleIndices, edges } = currentCycleConstellation;
        ctx.beginPath();
        const filAlpha = Math.min(0.35, constellationProgress * 0.38);
        const filHue = activeMode.isMulticolor ? 192 : interpolatedBaseHue;
        ctx.strokeStyle = `hsla(${filHue}, 88%, 68%, ${filAlpha})`;
        ctx.lineWidth = Math.max(1.1, Math.min(1.8, currentCycleConstellation.scale * 0.0016));

        if (edges && edges.length > 0) {
          for (let e = 0; e < edges.length; e++) {
            const edge = edges[e];
            const p1 = particles[particleIndices[edge[0]]];
            const p2 = particles[particleIndices[edge[1]]];
            if (p1 && p2) {
              ctx.moveTo(p1.screenX, p1.screenY);
              ctx.lineTo(p2.screenX, p2.screenY);
            }
          }
        } else {
          for (let k = 0; k < particleIndices.length - 1; k++) {
            const p1 = particles[particleIndices[k]];
            const p2 = particles[particleIndices[k + 1]];
            if (p1 && p2) {
              ctx.moveTo(p1.screenX, p1.screenY);
              ctx.lineTo(p2.screenX, p2.screenY);
            }
          }
        }
        ctx.stroke();

        // High-detail volumetric rendering layers for featured formations
        const detailRenderParams = {
          ctx,
          centerX: centerX + currentCycleConstellation.centerOffsetX,
          centerY: centerY + currentCycleConstellation.centerOffsetY,
          scale: currentCycleConstellation.scale,
          progress: constellationProgress,
          elapsed,
          baseHue: interpolatedBaseHue,
          highlightHue: activeMode.highlightHue,
          isMulticolor: activeMode.isMulticolor
        };

        if (currentCycleConstellation.family === 'dna_helix') {
          renderDnaDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'galaxy_spiral') {
          renderGalaxyDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'nebula') {
          renderNebulaDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'atomic_orbitals') {
          renderAtomicOrbitalsDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'black_hole_vortex') {
          renderBlackHoleVortexDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'knowledge_constellation') {
          renderKnowledgeConstellationDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'orbital_system') {
          renderOrbitalSystemDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'cortex_brain') {
          renderCortexDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'neural_synapse') {
          renderSynapseDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'single_neuron') {
          renderSingleNeuronDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'synaptic_web') {
          renderSynapticWebDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'knowledge_graph') {
          renderKnowledgeGraphDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'infinity_loop') {
          renderInfinityLoopDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'intelligence_crystal') {
          renderIntelligenceCrystalDetailLayer(detailRenderParams);
        } else if (currentCycleConstellation.family === 'geometric_mandala') {
          renderGeometricMandalaDetailLayer(detailRenderParams);
        }
      }

      // 4. Render Glowing Neon Particles (PRIORITY 2: Clearly larger particles for active constellations)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const currentHue = currentUniverseHues[i] ?? p.baseHue;
        const pulse = Math.sin(elapsed * p.pulseSpeed + p.phase) * 0.14;

        // Determine active constellation participation and size boost
        const isOpeningJParticipant = isInitialOpening && p.isJParticipant && jProgress > 0;
        const isLaterConstellationParticipant =
          !isInitialOpening && constellationProgress > 0 && activeParticipantSet.has(i);

        let sizeMultiplier = 1.0;
        let brightnessBoost = 0.0;
        let glowMultiplier = 1.0;

        if (isOpeningJParticipant) {
          // Priority 1: Opening J receives significant particle-size and brightness boost
          sizeMultiplier = 1.0 + 1.15 * jProgress;
          brightnessBoost = 0.28 * jProgress;
          glowMultiplier = 1.0 + 0.65 * jProgress;
        } else if (isLaterConstellationParticipant) {
          // Priority 2: Later constellations use visibly larger particles during active formation
          sizeMultiplier = 1.0 + 0.90 * constellationProgress;
          brightnessBoost = 0.24 * constellationProgress;
          glowMultiplier = 1.0 + 0.50 * constellationProgress;
        }

        // Progressive evacuation fade for unused particles to clear the stage for the constellation
        const activeEvacProgress = isInitialOpening ? jProgress : constellationProgress;
        let evacFade = 1.0;

        if (!isOpeningJParticipant && !isLaterConstellationParticipant && activeEvacProgress > 0) {
          if (p.isPerimeterDweller) {
            evacFade = Math.max(0.12, 1.0 - activeEvacProgress * 0.85);
          } else {
            if (activeEvacProgress < 0.25) {
              evacFade = 1.0 - activeEvacProgress * 0.40;
            } else if (activeEvacProgress < 0.80) {
              const f = (activeEvacProgress - 0.25) / 0.55;
              const ease = f * f * (3 - 2 * f);
              evacFade = (1.0 - ease) * 0.90;
            } else {
              evacFade = 0.0;
            }
          }
        }

        const currentAlpha = Math.max(
          0.0,
          Math.min(1.0, (p.baseAlpha + pulse + brightnessBoost) * bubbleBrightness * evacFade)
        );

        if (currentAlpha <= 0.005) {
          continue;
        }

        // Actual rendered radius scaling (visibly larger for active constellations, normal otherwise)
        const radius = Math.max(0.75, p.baseRadius * sizeMultiplier);
        const glowRadius = radius * (3.2 * glowMultiplier);

        // Outer radial glow halo
        const gradient = ctx.createRadialGradient(
          p.screenX,
          p.screenY,
          0,
          p.screenX,
          p.screenY,
          glowRadius
        );
        gradient.addColorStop(0, `hsla(${currentHue}, 100%, 75%, ${currentAlpha})`);
        gradient.addColorStop(0.35, `hsla(${currentHue}, 95%, 60%, ${currentAlpha * 0.45})`);
        gradient.addColorStop(1, `hsla(${currentHue}, 90%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // High-luminance crystalline core
        ctx.fillStyle = `hsla(${currentHue}, 100%, 94%, ${Math.min(1, currentAlpha + 0.22)})`;
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(startTime);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [onPhaseCReached]);

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-1000 ease-out ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block bg-black"
        style={{ display: 'block' }}
      />
    </div>
  );
};
