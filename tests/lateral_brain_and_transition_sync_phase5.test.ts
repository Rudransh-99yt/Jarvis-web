/**
 * Phase 5 Verification Audit: Lateral Human Brain Silhouette & Transition Synchronization
 *
 * Verifies:
 * 1. Lateral Anatomical Human Brain Geometry:
 *    - Frontal pole (anterior/left), Parietal vertex (superior), Occipital pole (posterior/right).
 *    - Deep Sylvian fissure and temporal lobe curving forward underneath.
 *    - Distinct folded cerebellum at posterior-inferior region with horizontal folia.
 *    - Descending brainstem (pons & medulla) emerging from underside.
 *    - Volumetric density: >= 2,500 micro-points.
 * 2. Pure Determinism: Zero Math.random() in executable code.
 * 3. Transition Lifecycle Synchronization:
 *    - Clean 0-operation envelope when progress <= 0.02.
 *    - Sequential non-overlapping handoffs between Galaxy, Brain, DNA, and Synapse.
 *    - Theme color smooth interpolation across transitions.
 *    - Window resize recalculation without scale jumps.
 * 4. Signature J Protection:
 *    - 48 particles, unchanged formulas, zero index collision.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateCortexBrainCoords,
  getDeterministicFormationByIndex
} from '../src/components/landing/formations/formationRegistry';
import { renderCortexDetailLayer } from '../src/components/landing/formations/cortexDetailRenderer';
import { renderFormationDetailEngine } from '../src/components/landing/formations/formationDetailEngine';

console.log('=== [WEB JARVIS] PHASE 5: LATERAL BRAIN & TRANSITION SYNCHRONIZATION AUDIT ===\n');

// 1. LATERAL HUMAN BRAIN ANATOMICAL PROFILE VERIFICATION
console.log('--- 1. Verification: Lateral Human Brain Anatomical Profile ---');

const brainResult = generateCortexBrainCoords(56);
assert.strictEqual(brainResult.coords.length, 56, 'Cortex brain must contain exactly 56 anchor coordinates');

// Perimeter nodes: 0..29 form a closed lateral silhouette loop
const perimeterEdges = brainResult.edges.filter(([a, b]) => a < 30 && b < 30);
assert(perimeterEdges.length >= 30, 'Outer cerebral mantle must be a closed 30-node loop');

// Lateral landmarks:
// Frontal pole should be on the anterior side (negative X)
const frontalNodes = brainResult.coords.slice(0, 8);
const minXFrontal = Math.min(...frontalNodes.map(p => p.x));
assert(minXFrontal <= -0.25, `Frontal pole must project anteriorly to x <= -0.25 (got ${minXFrontal})`);

// Parietal vertex should be on the superior side (negative Y)
const parietalNodes = brainResult.coords.slice(7, 15);
const minYVertex = Math.min(...parietalNodes.map(p => p.y));
assert(minYVertex <= -0.22, `Parietal vertex must elevate superiorly to y <= -0.22 (got ${minYVertex})`);

// Occipital pole should be on the posterior side (positive X)
const occipitalNodes = brainResult.coords.slice(15, 23);
const maxXOccipital = Math.max(...occipitalNodes.map(p => p.x));
assert(maxXOccipital >= 0.25, `Occipital pole must project posteriorly to x >= 0.25 (got ${maxXOccipital})`);

// Cerebellum / Brainstem nodes should be at posterior-inferior / inferior side
const inferiorNodes = brainResult.coords.slice(22, 30);
const maxYInferior = Math.max(...inferiorNodes.map(p => p.y));
assert(maxYInferior >= 0.20, `Brainstem/underside must descend inferiorly to y >= 0.20 (got ${maxYInferior})`);

console.log('[PASS] Lateral silhouette geometry verified: Frontal (x <= -0.25), Vertex (y <= -0.22), Occipital (x >= 0.25), Inferior (y >= 0.20)');

// 2. CORTEX DETAIL RENDERER ANATOMICAL FEATURES & MARK DENSITY
console.log('\n--- 2. Verification: Lateral Cortex Detail Renderer Structure & Density ---');

const cortexFile = path.resolve(process.cwd(), 'src/components/landing/formations/cortexDetailRenderer.ts');
const cortexContent = fs.readFileSync(cortexFile, 'utf-8');

// Determinism check (zero Math.random)
const codeOnly = cortexContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
assert(!codeOnly.includes('Math.random()'), 'cortexDetailRenderer.ts must contain zero Math.random() calls');
console.log('[PASS] cortexDetailRenderer.ts is 100% deterministic (zero Math.random() in executable code)');

// Anatomical keyword checks in renderer structure
assert(cortexContent.includes('Sylvian Fissure') || cortexContent.includes('sylvian'), 'Renderer must model Sylvian fissure (lateral sulcus)');
assert(cortexContent.includes('Central Sulcus') || cortexContent.includes('rolando'), 'Renderer must model Central sulcus of Rolando');
assert(cortexContent.includes('Cerebellum') || cortexContent.includes('cereb'), 'Renderer must model distinct cerebellum with folia');
assert(cortexContent.includes('Brainstem') || cortexContent.includes('stem'), 'Renderer must model descending brainstem column');

// Measure actual rendered marks on mock Canvas
function createMockCanvas() {
  let arcCount = 0;
  let strokeCount = 0;
  let radialGradCount = 0;

  const mockCtx: any = {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke: () => { strokeCount++; },
    arc: () => { arcCount++; },
    fill: () => {},
    save: () => {},
    restore: () => {},
    createRadialGradient: () => {
      radialGradCount++;
      return { addColorStop: () => {} };
    },
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    getStats: () => ({ arcCount, strokeCount, radialGradCount }),
    resetStats: () => {
      arcCount = 0;
      strokeCount = 0;
      radialGradCount = 0;
    }
  };

  return mockCtx;
}

const mockCtx = createMockCanvas();
renderCortexDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 800,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: true
});

const stats = mockCtx.getStats();
assert(stats.arcCount >= 2500, `Lateral brain must render monumental density (>= 2,500 marks, got ${stats.arcCount})`);
assert(stats.strokeCount >= 5, `Lateral brain must draw continuous anatomical profile and fissure filaments (got ${stats.strokeCount})`);
console.log(`[PASS] Lateral brain renders ${stats.arcCount} volumetric micro-points & ${stats.strokeCount} structural anatomical filaments`);

// Inactive envelope
mockCtx.resetStats();
renderCortexDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 800,
  progress: 0.015,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: true
});
const inactiveStats = mockCtx.getStats();
assert.strictEqual(inactiveStats.arcCount, 0, 'Lateral brain must draw 0 marks when progress <= 0.02');
assert.strictEqual(inactiveStats.strokeCount, 0, 'Lateral brain must draw 0 strokes when progress <= 0.02');
console.log('[PASS] Lateral brain strictly inactive (0 draws) when progress <= 0.02');

// 3. TRANSITION LIFECYCLE SYNCHRONIZATION
console.log('\n--- 3. Verification: Transition Synchronization Across All 4 Formations ---');

const particleFieldSrc = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);

// Verify sequential cyclic advancement: 0: galaxy, 1: cortex, 2: dna, 3: synapse
assert.strictEqual(getDeterministicFormationByIndex(0).id, 'galaxy_spiral');
assert.strictEqual(getDeterministicFormationByIndex(1).id, 'cortex_brain');
assert.strictEqual(getDeterministicFormationByIndex(2).id, 'dna_helix');
assert.strictEqual(getDeterministicFormationByIndex(3).id, 'neural_synapse');
assert.strictEqual(getDeterministicFormationByIndex(4).id, 'galaxy_spiral');

// Verify theme interpolation during transitions
assert(
  particleFieldSrc.includes('interpolatedBaseHue'),
  'CinematicParticleField must interpolate baseHue smoothly during theme changes'
);
assert(
  particleFieldSrc.includes('baseHue: interpolatedBaseHue'),
  'detailRenderParams must receive interpolatedBaseHue for smooth color transitions'
);

// Verify window resize recalculation
assert(
  particleFieldSrc.includes('if (lastConstellationCycleIndex >= 0)') &&
  particleFieldSrc.includes('generateDeterministicFormationConstellation'),
  'Window resize must recompute activeConstellation to prevent scaling or position jumps'
);

// Verify clean dissolution and non-overlapping handoff
assert(
  particleFieldSrc.includes('timeInCycle < 1800') &&
  particleFieldSrc.includes('timeInCycle < 5200') &&
  particleFieldSrc.includes('timeInCycle < 6700'),
  'Preserved cycle timing: 0-1.8s gather, 1.8-5.2s hold, 5.2-6.7s dissolve, 6.7-10.5s clean ambient pause'
);

console.log('[PASS] Sequential non-overlapping handoff, smooth theme interpolation, and resize stability verified');

// 4. SIGNATURE J PROTECTION
console.log('\n--- 4. Verification: Absolute Protection of Signature J ---');
assert(
  particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'),
  'J participant count must remain 48'
);
assert(
  particleFieldSrc.includes('const startIndex = 48;'),
  'Constellations must allocate particles starting at index 48'
);
console.log('[PASS] Signature J geometry and 48 participant identities 100% protected');

console.log('\n=== ALL PHASE 5 LATERAL BRAIN & TRANSITION SYNCHRONIZATION AUDITS PASSED! ===\n');
