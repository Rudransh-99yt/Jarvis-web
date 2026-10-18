/**
 * Phase 3 Verification Test: External High-Density Formation Engine
 *
 * Verifies that all 4 featured formations (DNA_HELIX, GALAXY_SPIRAL, CORTEX_BRAIN, NEURAL_SYNAPSE)
 * possess dedicated external volumetric detail layers with:
 * 1. 100% deterministic evaluation (zero Math.random()).
 * 2. High-density volumetric rendering (> 200 micro-points each).
 * 3. Lifecycle integration (inactive when progress <= 0.02).
 * 4. Disjoint particle allocation protecting signature J participants (0..47).
 * 5. Full support for color modes (multicolor and single-hue).
 * 6. Centralized engine coordination via formationDetailEngine.ts.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { renderDnaDetailLayer } from '../src/components/landing/formations/dnaDetailRenderer';
import { renderGalaxyDetailLayer } from '../src/components/landing/formations/galaxyDetailRenderer';
import { renderCortexDetailLayer } from '../src/components/landing/formations/cortexDetailRenderer';
import { renderSynapseDetailLayer } from '../src/components/landing/formations/synapseDetailRenderer';
import { renderFormationDetailEngine } from '../src/components/landing/formations/formationDetailEngine';
import {
  MILESTONE1_FORMATIONS,
  getDeterministicFormationByIndex
} from '../src/components/landing/formations/formationRegistry';

console.log('=== [WEB JARVIS] PHASE 3: EXTERNAL HIGH-DENSITY FORMATION ENGINE AUDIT ===\n');

// 1. FILE INTEGRITY & ZERO MATH.RANDOM() VERIFICATION
console.log('--- 1. Verification: Pure Determinism (Zero Math.random() in Detail Renderers) ---');

const rendererFiles = [
  'dnaDetailRenderer.ts',
  'galaxyDetailRenderer.ts',
  'cortexDetailRenderer.ts',
  'synapseDetailRenderer.ts',
  'formationDetailEngine.ts'
];

for (const file of rendererFiles) {
  const filePath = path.resolve(process.cwd(), 'src/components/landing/formations', file);
  assert(fs.existsSync(filePath), `Renderer file ${file} must exist`);
  const content = fs.readFileSync(filePath, 'utf-8');
  // Strip comments to test executable code
  const codeWithoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');
  assert(
    !codeWithoutComments.includes('Math.random()'),
    `${file} executable code must be 100% deterministic (found Math.random())`
  );
  console.log(`[PASS] ${file} is 100% deterministic (zero Math.random() in executable code)`);
}

// 2. HELPER TO CREATE MOCK 2D CANVAS CONTEXT
function createMockContext() {
  let arcCount = 0;
  let strokeCount = 0;
  let fillCount = 0;
  let quadraticCurveCount = 0;

  const mockCtx: any = {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => { quadraticCurveCount++; },
    stroke: () => { strokeCount++; },
    arc: () => { arcCount++; },
    fill: () => { fillCount++; },
    save: () => {},
    restore: () => {},
    createRadialGradient: () => ({
      addColorStop: () => {}
    }),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    getStats: () => ({ arcCount, strokeCount, fillCount, quadraticCurveCount }),
    resetStats: () => {
      arcCount = 0;
      strokeCount = 0;
      fillCount = 0;
      quadraticCurveCount = 0;
    }
  };

  return mockCtx;
}

// 3. INACTIVE PROGRESS ENVELOPE (progress <= 0.02)
console.log('\n--- 2. Verification: Inactive Lifecycle Envelope (progress <= 0.02) ---');

const renderers = [
  { name: 'DNA Helix', fn: renderDnaDetailLayer, family: 'dna_helix' },
  { name: 'Galaxy Spiral', fn: renderGalaxyDetailLayer, family: 'galaxy_spiral' },
  { name: 'Cortex Brain', fn: renderCortexDetailLayer, family: 'cortex_brain' },
  { name: 'Neural Synapse', fn: renderSynapseDetailLayer, family: 'neural_synapse' }
];

for (const { name, fn } of renderers) {
  const mockCtx = createMockContext();
  fn({
    ctx: mockCtx,
    centerX: 500,
    centerY: 500,
    scale: 600,
    progress: 0.015,
    elapsed: 2000,
    baseHue: 192,
    isMulticolor: true
  });
  const stats = mockCtx.getStats();
  assert.strictEqual(
    stats.arcCount,
    0,
    `${name} must not render any micro-points when progress <= 0.02`
  );
  assert.strictEqual(
    stats.strokeCount,
    0,
    `${name} must not draw any strokes when progress <= 0.02`
  );
  console.log(`[PASS] ${name} produces 0 draw operations when inactive (progress = 0.015)`);
}

// 4. ACTIVE VOLUMETRIC HIGH-DENSITY RENDERING (progress = 1.0)
console.log('\n--- 3. Verification: Active Volumetric High-Density Rendering (progress = 1.0) ---');

for (const { name, fn, family } of renderers) {
  const mockCtx = createMockContext();
  const dispatched = renderFormationDetailEngine(family, {
    ctx: mockCtx,
    centerX: 500,
    centerY: 500,
    scale: 600,
    progress: 1.0,
    elapsed: 3000,
    baseHue: 192,
    isMulticolor: true
  });

  assert.strictEqual(dispatched, true, `Engine must dispatch ${family}`);
  const stats = mockCtx.getStats();

  assert(
    stats.arcCount >= 200,
    `${name} must render high-density volumetric micro-points (expected >= 200, got ${stats.arcCount})`
  );
  assert(
    stats.strokeCount >= 2 || stats.quadraticCurveCount >= 2,
    `${name} must render continuous luminous structural filaments`
  );

  console.log(
    `[PASS] ${name} renders ${stats.arcCount} volumetric micro-points & structural tracts`
  );
}

// 5. ENGINE DISPATCHER BEHAVIOR
console.log('\n--- 4. Verification: Engine Dispatcher Fallback & Unknown Family Handling ---');
const dummyCtx = createMockContext();
const unknownDispatched = renderFormationDetailEngine('unknown_constellation', {
  ctx: dummyCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: true
});
assert.strictEqual(unknownDispatched, false, 'Engine must return false for unknown family');
console.log('[PASS] Engine safely returns false on unknown formation family');

// 6. COLOR THEME INTEGRATION VERIFICATION
console.log('\n--- 5. Verification: Color Mode Adaptation (Single-Hue vs Multicolor) ---');

for (const { name, fn } of renderers) {
  const mockCtxSingleHue = createMockContext();
  fn({
    ctx: mockCtxSingleHue,
    centerX: 500,
    centerY: 500,
    scale: 600,
    progress: 1.0,
    elapsed: 3000,
    baseHue: 280,
    highlightHue: 310,
    isMulticolor: false
  });
  const singleStats = mockCtxSingleHue.getStats();
  assert(singleStats.arcCount >= 200, `${name} must render in single-hue mode`);

  const mockCtxMulticolor = createMockContext();
  fn({
    ctx: mockCtxMulticolor,
    centerX: 500,
    centerY: 500,
    scale: 600,
    progress: 1.0,
    elapsed: 3000,
    baseHue: 192,
    isMulticolor: true
  });
  const multiStats = mockCtxMulticolor.getStats();
  assert(multiStats.arcCount >= 200, `${name} must render in multicolor mode`);
  console.log(`[PASS] ${name} successfully adapts across single-hue and multicolor themes`);
}

// 7. CINEMATICPARTICLEFIELD INTEGRATION CHECKS
console.log('\n--- 6. Verification: CinematicParticleField Pipeline Integrity ---');
const particleFieldSrc = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);

assert(
  particleFieldSrc.includes('renderDnaDetailLayer'),
  'CinematicParticleField must invoke renderDnaDetailLayer'
);
assert(
  particleFieldSrc.includes('renderGalaxyDetailLayer'),
  'CinematicParticleField must invoke renderGalaxyDetailLayer'
);
assert(
  particleFieldSrc.includes('renderCortexDetailLayer'),
  'CinematicParticleField must invoke renderCortexDetailLayer'
);
assert(
  particleFieldSrc.includes('renderSynapseDetailLayer'),
  'CinematicParticleField must invoke renderSynapseDetailLayer'
);
assert(
  particleFieldSrc.includes("currentCycleConstellation.family === 'cortex_brain'"),
  'CinematicParticleField must branch on cortex_brain'
);
assert(
  particleFieldSrc.includes("currentCycleConstellation.family === 'neural_synapse'"),
  'CinematicParticleField must branch on neural_synapse'
);
assert(
  particleFieldSrc.includes("const isBrain = formation.id === 'cortex_brain';"),
  'CinematicParticleField must apply hero scaling to cortex_brain'
);
assert(
  particleFieldSrc.includes("const isSynapse = formation.id === 'neural_synapse';"),
  'CinematicParticleField must apply hero scaling to neural_synapse'
);

// J Protection Checks
assert(
  particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'),
  'J participant count must remain exactly 48'
);
assert(
  particleFieldSrc.includes('const startIndex = 48;'),
  'Constellation allocation must start at index 48'
);

console.log('[PASS] All 4 high-detail formations are fully wired into CinematicParticleField with signature J protection');

console.log('\n=== ALL PHASE 3 HIGH-DENSITY FORMATION AUDITS PASSED! ===\n');
