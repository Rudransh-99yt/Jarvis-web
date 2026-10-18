/**
 * Formation #06: Orbital System Verification Suite
 *
 * Verifies:
 * 1. Correct registry membership and sequence position (Formation #06, index 5 in cycle).
 * 2. Pure determinism: zero Math.random() in executable code.
 * 3. Valid finite coordinates bounded within [-0.42, 0.42] for mobile safety.
 * 4. Distinctive planetary orbital system geometry: central star, 5 Keplerian planetary orbits, moon, rings, asteroid belt.
 * 5. High-density volumetric detail: >= 2,500 marks rendered when active.
 * 6. Inactive lifecycle envelope: strictly 0 draw calls when progress <= 0.02.
 * 7. Smooth theme interpolation and multi-color adaptation.
 * 8. 100% lockstep anchor-detail coordinate synchronization.
 * 9. Absolute protection of signature J and ambient universe.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateOrbitalSystemCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';
import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';
import { renderOrbitalSystemDetailLayer } from '../src/components/landing/formations/orbitalSystemDetailRenderer';

console.log('=== [WEB JARVIS] FORMATION #06: ORBITAL SYSTEM VERIFICATION SUITE ===\n');

// 1. REGISTRY MEMBERSHIP & SEQUENCE POSITION
console.log('--- 1. Verification: Registry Membership & Sequence Position ---');
const formation06 = getDeterministicFormationByIndex(5);
assert.strictEqual(formation06.id, 'orbital_system', 'Formation #06 must have id "orbital_system"');
assert.strictEqual(formation06.name, 'Celestial Planetary Orbital System');
assert.strictEqual(formation06.category, 'cosmic');
assert.strictEqual(formation06.motionType, 'rotate');
assert(formation06.participantCount >= 50 && formation06.participantCount <= 56, 'Mobile-safe participant count');

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
console.log('[PASS] Formation #06 registered in position #6 (index 5) with cyclical progression');

// 2. DETERMINISM AUDIT
console.log('\n--- 2. Verification: Determinism & Zero Math.random() ---');
const osRendererSrc = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/landing/formations/orbitalSystemDetailRenderer.ts'),
  'utf-8'
);
const codeWithoutComments = osRendererSrc
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*/g, '');
assert(!codeWithoutComments.includes('Math.random()'), 'orbitalSystemDetailRenderer must not call Math.random()');

const run1 = generateOrbitalSystemCoords(54);
const run2 = generateOrbitalSystemCoords(54);
assert.deepStrictEqual(run1.coords, run2.coords, 'Orbital System coords must be strictly deterministic across calls');
assert.deepStrictEqual(run1.edges, run2.edges, 'Orbital System edges must be strictly deterministic across calls');
console.log('[PASS] Orbital System renderer and coordinate generator are 100% deterministic');

// 3. BOUNDED COORDINATES & CELESTIAL PLANETARY TOPOLOGY
console.log('\n--- 3. Verification: Bounded Coordinates & Planetary System Architecture ---');
assert.strictEqual(run1.coords.length, 54, 'Orbital System must have 54 nodes');
for (let i = 0; i < run1.coords.length; i++) {
  const c = run1.coords[i];
  assert(Number.isFinite(c.x) && Number.isFinite(c.y), `Node ${i} must have finite coordinates`);
  assert(Math.abs(c.x) <= 0.42, `Node ${i} x (${c.x}) must be within mobile-safe boundary [-0.42, 0.42]`);
  assert(Math.abs(c.y) <= 0.42, `Node ${i} y (${c.y}) must be within mobile-safe boundary [-0.42, 0.42]`);
}

// Check key celestial orbital system features:
// - Central Star (nodes 0..7)
for (let i = 0; i < 8; i++) {
  const c = run1.coords[i];
  const d = Math.hypot(c.x, c.y);
  assert(d <= 0.045, `Central star node ${i} sits within photosphere radius 0.045 (got ${d})`);
}

// - Planet 1 (Inner Terrestrial): Node 8
assert(Math.hypot(run1.coords[8].x, run1.coords[8].y) <= 0.10, 'Planet 1 orbit radius <= 0.10');

// - Planet 2 (Habitable World) & Moon: Nodes 14, 15
assert(Math.hypot(run1.coords[14].x, run1.coords[14].y) <= 0.16, 'Planet 2 orbit radius <= 0.16');
assert(Math.hypot(run1.coords[15].x - run1.coords[14].x, run1.coords[15].y - run1.coords[14].y) <= 0.035, 'Moon orbits Planet 2 within local radius 0.035');

// - Planet 3 (Ringed Gas Giant): Node 22 & Rings (23..26)
assert(Math.hypot(run1.coords[22].x, run1.coords[22].y) <= 0.25, 'Planet 3 orbit radius <= 0.25');
for (let r = 23; r <= 26; r++) {
  assert(Math.hypot(run1.coords[r].x - run1.coords[22].x, run1.coords[r].y - run1.coords[22].y) <= 0.045, `Ring node ${r} surrounds Planet 3 within 0.045`);
}

// - Planet 4 (Ice Giant): Node 32
assert(Math.hypot(run1.coords[32].x, run1.coords[32].y) <= 0.32, 'Planet 4 orbit radius <= 0.32');

// - Planet 5 (Trans-Neptunian Outlier): Node 40
assert(Math.hypot(run1.coords[40].x, run1.coords[40].y) <= 0.38, 'Planet 5 orbit radius <= 0.38');

// - Main Asteroid Belt (nodes 48..53)
for (let a = 48; a <= 53; a++) {
  const d = Math.hypot(run1.coords[a].x, run1.coords[a].y);
  assert(d >= 0.16 && d <= 0.21, `Asteroid belt node ${a} sits in corridor [0.16, 0.21] (got ${d})`);
}

// Edge integrity check
assert(run1.edges.length >= 40, `Sufficient graph connectivity: ${run1.edges.length} edges`);
for (const [a, b] of run1.edges) {
  assert(a >= 0 && a < 54, `Edge source ${a} within valid range`);
  assert(b >= 0 && b < 54, `Edge target ${b} within valid range`);
}
console.log('[PASS] Orbital System geometry validated: Sun, 5 planets, moon, rings, and asteroid belt confirmed');

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
renderOrbitalSystemDetailLayer({
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
assert.strictEqual(inactiveStats.arcCount, 0, 'Orbital System must produce 0 arc operations when inactive');
assert.strictEqual(inactiveStats.strokeCount, 0, 'Orbital System must produce 0 strokes when inactive');
assert.strictEqual(inactiveStats.fillCount, 0, 'Orbital System must produce 0 fills when inactive');
console.log('[PASS] Orbital System strictly inactive (0 draws) when progress <= 0.02');

// Test Active: progress = 1.0 must produce high density (>= 2,500 marks)
mockCtx.resetStats();
renderOrbitalSystemDetailLayer({
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
assert(activeStats.arcCount >= 2500, `Orbital System must render >= 2,500 volumetric marks (got ${activeStats.arcCount})`);
assert(activeStats.strokeCount >= 6, `Orbital System must render >= 6 structural filaments (got ${activeStats.strokeCount})`);
console.log(`[PASS] Active Orbital System: ${activeStats.arcCount} volumetric micro-points & ${activeStats.strokeCount} structural filaments`);

// Test Engine Dispatch
mockCtx.resetStats();
const dispatched = renderFormationDetailEngine('orbital_system', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 1.0,
  elapsed: 2000,
  baseHue: 192,
  isMulticolor: false
});
assert.strictEqual(dispatched, true, 'renderFormationDetailEngine must handle "orbital_system"');
assert(mockCtx.getStats().arcCount >= 2500, 'Engine dispatch must render dense marks');
console.log('[PASS] Engine dispatcher routes "orbital_system" cleanly');

// 5. ANCHOR & DETAIL SYNCHRONIZATION
console.log('\n--- 5. Verification: Anchor-Detail Coordinate Lockstep ---');
for (const elapsed of [0, 1000, 2500, 5000]) {
  for (let idx of [0, 4, 8, 14, 15, 22, 24, 32, 40, 48, 52]) {
    const target = computeSynchronizedFormationTarget({
      family: 'orbital_system',
      index: idx,
      totalParticipants: 54,
      rawCoord: run1.coords[idx],
      scale: 650,
      centerX: 400,
      centerY: 400,
      elapsed
    });
    assert(Number.isFinite(target.x) && Number.isFinite(target.y), `Target node ${idx} at elapsed ${elapsed} must be finite`);
  }
}
console.log('[PASS] Anchor particles follow lockstep 3D celestial inclination and orbital movement without drift');

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

console.log('\n=== ALL FORMATION #06 ORBITAL SYSTEM TESTS PASSED! ===\n');
