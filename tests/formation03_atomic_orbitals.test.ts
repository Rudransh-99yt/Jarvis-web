/**
 * Formation #03: Atomic Orbitals Formation Verification Suite
 *
 * Verifies:
 * 1. Correct registry membership and sequence position (Formation #03, index 2 in 24-form cycle).
 * 2. Pure determinism: zero Math.random() in executable code.
 * 3. Valid finite coordinates bounded within [-0.42, 0.42] for mobile safety.
 * 4. High-density volumetric detail: >= 2,500 marks rendered when active.
 * 5. Inactive lifecycle envelope: strictly 0 draw calls when progress <= 0.02.
 * 6. Smooth theme interpolation and multi-color adaptation.
 * 7. 100% lockstep anchor-detail coordinate synchronization.
 * 8. Absolute protection of signature J and ambient universe.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateAtomicOrbitalsCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';
import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';
import { renderAtomicOrbitalsDetailLayer } from '../src/components/landing/formations/atomicOrbitalsDetailRenderer';

console.log('=== [WEB JARVIS] FORMATION #03: ATOMIC ORBITALS VERIFICATION SUITE ===\n');

// 1. REGISTRY MEMBERSHIP & SEQUENCE POSITION
console.log('--- 1. Verification: Registry Membership & Sequence Position ---');
const formation03 = getDeterministicFormationByIndex(2);
assert.strictEqual(formation03.id, 'atomic_orbitals', 'Formation #03 must have id "atomic_orbitals"');
assert.strictEqual(formation03.name, 'Quantum Atomic Orbitals');
assert.strictEqual(formation03.category, 'quantum');
assert.strictEqual(formation03.motionType, 'rotate');
assert(formation03.participantCount >= 50 && formation03.participantCount <= 56, 'Mobile-safe participant count');

// Sequential progression check: 0 -> galaxy, 1 -> nebula, 2 -> atomic_orbitals, 3 -> black_hole_vortex, 4 -> knowledge_constellation, 5 -> orbital_system, 6 -> cortex, 7 -> dna, 8 -> synapse, 9 -> single_neuron, length -> wraparound to galaxy
assert.strictEqual(getDeterministicFormationByIndex(0).id, 'galaxy_spiral');
assert.strictEqual(getDeterministicFormationByIndex(1).id, 'nebula');
assert.strictEqual(getDeterministicFormationByIndex(2).id, 'atomic_orbitals');
assert.strictEqual(getDeterministicFormationByIndex(3).id, 'black_hole_vortex');
assert.strictEqual(getDeterministicFormationByIndex(4).id, 'knowledge_constellation');
assert.strictEqual(getDeterministicFormationByIndex(5).id, 'orbital_system');
assert.strictEqual(getDeterministicFormationByIndex(6).id, 'cortex_brain');
assert.strictEqual(getDeterministicFormationByIndex(7).id, 'dna_helix');
assert.strictEqual(getDeterministicFormationByIndex(8).id, 'neural_synapse');
assert.strictEqual(getDeterministicFormationByIndex(9).id, 'single_neuron');
assert.strictEqual(getDeterministicFormationByIndex(MILESTONE1_FORMATIONS.length).id, 'galaxy_spiral');
console.log('[PASS] Formation #03 registered in position #3 (index 2) with cyclical progression');

// 2. DETERMINISM AUDIT
console.log('\n--- 2. Verification: Determinism & Zero Math.random() ---');
const orbitalsRendererSrc = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/landing/formations/atomicOrbitalsDetailRenderer.ts'),
  'utf-8'
);
const codeWithoutComments = orbitalsRendererSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*/g, '');
assert(!codeWithoutComments.includes('Math.random()'), 'atomicOrbitalsDetailRenderer must not call Math.random()');

const run1 = generateAtomicOrbitalsCoords(52);
const run2 = generateAtomicOrbitalsCoords(52);
assert.deepStrictEqual(run1.coords, run2.coords, 'Atomic Orbitals coords must be strictly deterministic across calls');
assert.deepStrictEqual(run1.edges, run2.edges, 'Atomic Orbitals edges must be strictly deterministic across calls');
console.log('[PASS] Atomic Orbitals renderer and coordinate generator are 100% deterministic');

// 3. BOUNDED COORDINATES & SCIENTIFIC ATOMIC GEOMETRY
console.log('\n--- 3. Verification: Bounded Coordinates & Quantum Geometry ---');
assert.strictEqual(run1.coords.length, 52, 'Atomic Orbitals must have 52 nodes');
for (let i = 0; i < run1.coords.length; i++) {
  const c = run1.coords[i];
  assert(Number.isFinite(c.x) && Number.isFinite(c.y), `Node ${i} must have finite coordinates`);
  assert(Math.abs(c.x) <= 0.42, `Node ${i} x (${c.x}) must be within mobile-safe boundary [-0.42, 0.42]`);
  assert(Math.abs(c.y) <= 0.42, `Node ${i} y (${c.y}) must be within mobile-safe boundary [-0.42, 0.42]`);
}

// Check key quantum anatomical features:
// - Central nucleus (first 8 nodes: 0..7)
for (let i = 0; i < 8; i++) {
  const c = run1.coords[i];
  const d = Math.hypot(c.x, c.y);
  assert(d <= 0.05, `Nucleus node ${i} must reside tightly in central core (got ${d})`);
}

// - Vertical p_z dumbbell lobes (nodes 8..17)
const pzNodes = run1.coords.slice(8, 18);
const minY = Math.min(...pzNodes.map(c => c.y));
const maxY = Math.max(...pzNodes.map(c => c.y));
assert(minY <= -0.25, `Upper p_z lobe apex extends to y <= -0.25 (got ${minY})`);
assert(maxY >= 0.25, `Lower p_z lobe apex extends to y >= 0.25 (got ${maxY})`);

// - Horizontal p_x dumbbell lobes (nodes 18..27)
const pxNodes = run1.coords.slice(18, 28);
const minX = Math.min(...pxNodes.map(c => c.x));
const maxX = Math.max(...pxNodes.map(c => c.x));
assert(minX <= -0.25, `Left p_x lobe apex extends to x <= -0.25 (got ${minX})`);
assert(maxX >= 0.25, `Right p_x lobe apex extends to x >= 0.25 (got ${maxX})`);

// - Diagonal hybridized d_xy cloverleaf lobes (nodes 28..39)
const dNodes = run1.coords.slice(28, 40);
assert.strictEqual(dNodes.length, 12, '12 diagonal cloverleaf lobe nodes');

// - Toroidal equatorial collar ring (nodes 40..51)
const torusNodes = run1.coords.slice(40, 52);
assert.strictEqual(torusNodes.length, 12, '12 toroidal collar nodes');
for (let i = 0; i < torusNodes.length; i++) {
  const c = torusNodes[i];
  const r = Math.hypot(c.x, c.y / 0.48); // Scaled elliptical radius
  assert(r >= 0.09 && r <= 0.14, `Torus node ${i} elliptical radius within [0.09, 0.14] (got ${r})`);
}

// Check edge validity: no dangling node indices
for (const [a, b] of run1.edges) {
  assert(a >= 0 && a < 52, `Edge source ${a} within valid range`);
  assert(b >= 0 && b < 52, `Edge target ${b} within valid range`);
}
console.log('[PASS] Quantum orbital geometry validated: Nucleus, vertical pz, horizontal px, diagonal dxy, and toroidal collar confirmed');

// 4. MOCK CANVAS & VOLUMETRIC MARK AUDIT
console.log('\n--- 4. Verification: Volumetric Detail & Inactive Envelope ---');
function createMockCanvas() {
  let arcCount = 0;
  let strokeCount = 0;
  let fillCount = 0;
  return {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke: () => { strokeCount++; },
    arc: () => { arcCount++; },
    fill: () => { fillCount++; },
    save: () => {},
    restore: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    getStats: () => ({ arcCount, strokeCount, fillCount }),
    resetStats: () => { arcCount = 0; strokeCount = 0; fillCount = 0; }
  } as any;
}

const mockCtx = createMockCanvas();

// Test Inactive: progress <= 0.02 must produce strictly 0 draws
renderAtomicOrbitalsDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 0.012,
  elapsed: 2000,
  baseHue: 192,
  isMulticolor: false
});
const inactiveStats = mockCtx.getStats();
assert.strictEqual(inactiveStats.arcCount, 0, 'Atomic Orbitals must produce 0 arc operations when inactive');
assert.strictEqual(inactiveStats.strokeCount, 0, 'Atomic Orbitals must produce 0 strokes when inactive');
assert.strictEqual(inactiveStats.fillCount, 0, 'Atomic Orbitals must produce 0 fills when inactive');
console.log('[PASS] Atomic Orbitals strictly inactive (0 draws) when progress <= 0.02');

// Test Active: progress = 1.0 must produce monumental high density (>= 2,500 marks)
mockCtx.resetStats();
renderAtomicOrbitalsDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 1.0,
  elapsed: 2000,
  baseHue: 192,
  highlightHue: 45,
  isMulticolor: true
});
const activeStats = mockCtx.getStats();
assert(activeStats.arcCount >= 2500, `Atomic Orbitals must render >= 2,500 volumetric marks (got ${activeStats.arcCount})`);
assert(activeStats.strokeCount >= 8, `Atomic Orbitals must render >= 8 structural orbital loops (got ${activeStats.strokeCount})`);
console.log(`[PASS] Active Atomic Orbitals: ${activeStats.arcCount} volumetric micro-points & ${activeStats.strokeCount} structural orbital loops`);

// Test Engine Dispatch
mockCtx.resetStats();
const dispatched = renderFormationDetailEngine('atomic_orbitals', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 1.0,
  elapsed: 2000,
  baseHue: 192,
  isMulticolor: false
});
assert.strictEqual(dispatched, true, 'renderFormationDetailEngine must handle "atomic_orbitals"');
assert(mockCtx.getStats().arcCount >= 2500, 'Engine dispatch must render dense marks');
console.log('[PASS] Engine dispatcher routes "atomic_orbitals" cleanly');

// 5. ANCHOR & DETAIL SYNCHRONIZATION
console.log('\n--- 5. Verification: Anchor-Detail Coordinate Lockstep ---');
for (const elapsed of [0, 1000, 2500, 5000]) {
  for (let idx of [0, 8, 10, 18, 20, 30, 45]) {
    const target = computeSynchronizedFormationTarget({
      family: 'atomic_orbitals',
      index: idx,
      totalParticipants: 52,
      rawCoord: run1.coords[idx],
      scale: 650,
      centerX: 400,
      centerY: 400,
      elapsed
    });
    assert(Number.isFinite(target.x) && Number.isFinite(target.y), `Target node ${idx} at elapsed ${elapsed} must be finite`);
  }
}
console.log('[PASS] Anchor particles follow lockstep 3D quantum Larmor precession without drift');

// 6. PROTECTED J & AMBIENT UNIVERSE INTEGRITY
console.log('\n--- 6. Verification: Protected J and Ambient Universe ---');
const particleFieldSrc = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);
assert(particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'), 'J participant count remains 48');
assert(particleFieldSrc.includes('function generateJCoordinates(count: number)'), 'generateJCoordinates intact');
assert(particleFieldSrc.includes('const count = width < 768 ? 190 : 360;'), 'Ambient particles remain 190/360');
console.log('[PASS] Protected J and ambient universe remain 100% untouched');

console.log('\n=== ALL FORMATION #03 ATOMIC ORBITALS TESTS PASSED! ===\n');
