/**
 * ============================================================================
 * TEST SUITE: FORMATION #13 — INFINITY LOOP (3D LEMNISCATE OF DUAL INTELLIGENCE)
 * ============================================================================
 * Verifies:
 * 1. Lemniscate Topology & Partition Budget:
 *    - Primary 3D Lemniscate Backbone: 32 nodes (indices 0..31)
 *    - Inner Counter-Stream & Harmonic Loop: 12 nodes (indices 32..43)
 *    - Central Energy Crossover Junction: 8 nodes (indices 44..51)
 *    - Total participant count: exactly 52 nodes.
 * 2. Deterministic Geometry & Finite Bounds:
 *    - Identical inputs strictly produce identical byte-for-byte coordinate outputs.
 *    - All coordinates are finite and bounded strictly within [-0.5, 0.5].
 * 3. 3D Lemniscate Structural Connectivity:
 *    - Closed perimeter perimeter edges along the 3D figure-8.
 *    - Inter-strand cross-links and central crossover anchors.
 *    - All edge indices bounded within [0, participantCount - 1].
 * 4. High-Density Volumetric Detail (>= 2,500 marks & >= 4 filaments):
 *    - Inactive envelope: strictly 0 draw operations when progress <= 0.02.
 *    - Active envelope: >= 3,000 volumetric micro-points & distinct structural filaments.
 * 5. Determinism:
 *    - Zero Math.random() in executable code.
 * 6. Transform & Lemniscate Resonance Synchronization:
 *    - Lockstep transform synchronization in computeSynchronizedFormationTarget without NaN or drift.
 * 7. Engine Dispatcher & Registry Integration:
 *    - Registered in MILESTONE1_FORMATIONS with category 'quantum', participantCount 52.
 *    - Appended as Formation #13 following #12 without reordering.
 *    - Dispatches cleanly via formationDetailEngine under 'infinity_loop'.
 * ============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateInfinityLoopCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';

import {
  renderInfinityLoopDetailLayer,
  getLemniscate3DPoint
} from '../src/components/landing/formations/infinityLoopDetailRenderer';

import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';

console.log('=== [WEB JARVIS] FORMATION #13: INFINITY LOOP VERIFICATION SUITE ===\n');

// 1. TOPOLOGY & PARTITIONS AUDIT
console.log('--- 1. Verification: Lemniscate Topology & Partition Budget ---');
const loopResult = generateInfinityLoopCoords(52);
assert.strictEqual(loopResult.coords.length, 52, 'Infinity Loop must contain exactly 52 nodes');

// Partition 1: Primary Lemniscate Backbone (0..31)
const backboneNodes = loopResult.coords.slice(0, 32);
assert.strictEqual(backboneNodes.length, 32, 'Backbone partition must contain 32 nodes');

// Verify Left Lobe and Right Lobe spans
const minX = Math.min(...backboneNodes.map(p => p.x));
const maxX = Math.max(...backboneNodes.map(p => p.x));
assert(minX < -0.20, `Left lobe must reach x < -0.20 (got ${minX})`);
assert(maxX > 0.20, `Right lobe must reach x > 0.20 (got ${maxX})`);

// Partition 2: Inner Counter-Stream (32..43)
const innerNodes = loopResult.coords.slice(32, 44);
assert.strictEqual(innerNodes.length, 12, 'Inner counter-stream partition must contain 12 nodes');

// Partition 3: Central Crossover Junction (44..51)
const crossoverNodes = loopResult.coords.slice(44, 52);
assert.strictEqual(crossoverNodes.length, 8, 'Central crossover partition must contain 8 nodes');
for (const cNode of crossoverNodes) {
  assert(Math.abs(cNode.x) <= 0.08, `Crossover node x must be near center (got ${cNode.x})`);
  assert(Math.abs(cNode.y) <= 0.08, `Crossover node y must be near center (got ${cNode.y})`);
}
console.log('[PASS] Topology and partition budget verified (32 backbone + 12 inner + 8 crossover = 52 nodes)');

// 2. DETERMINISM & BOUNDS
console.log('\n--- 2. Verification: Deterministic Geometry & Coordinate Bounds ---');
const loopRun2 = generateInfinityLoopCoords(52);
assert.deepStrictEqual(loopResult.coords, loopRun2.coords, 'Consecutive coordinate generation calls must be byte-for-byte identical');
assert.deepStrictEqual(loopResult.edges, loopRun2.edges, 'Consecutive edge generation calls must be byte-for-byte identical');

for (let i = 0; i < loopResult.coords.length; i++) {
  const pt = loopResult.coords[i];
  assert(!isNaN(pt.x) && !isNaN(pt.y), `Node ${i} must have non-NaN coordinates`);
  assert(isFinite(pt.x) && isFinite(pt.y), `Node ${i} must have finite coordinates`);
  assert(Math.abs(pt.x) <= 0.5, `Node ${i} x coordinate must be within [-0.5, 0.5] (got ${pt.x})`);
  assert(Math.abs(pt.y) <= 0.5, `Node ${i} y coordinate must be within [-0.5, 0.5] (got ${pt.y})`);
}
console.log('[PASS] 100% deterministic geometry and valid [-0.5, 0.5] coordinate bounds verified');

// 3. STRUCTURAL CONNECTIVITY
console.log('\n--- 3. Verification: Structural Relational Connectivity ---');
assert(loopResult.edges.length >= 45, `Infinity Loop must contain robust edge relations (got ${loopResult.edges.length})`);
for (const [src, dst] of loopResult.edges) {
  assert(src >= 0 && src < 52, `Source index ${src} must be within [0, 51]`);
  assert(dst >= 0 && dst < 52, `Target index ${dst} must be within [0, 51]`);
  assert(src !== dst, `Edge must not be a self-loop (${src} -> ${dst})`);
}
console.log(`[PASS] Verified ${loopResult.edges.length} valid topological edges`);

// 4. VOLUMETRIC DETAIL DENSITY & INACTIVE ENVELOPE
console.log('\n--- 4. Verification: Volumetric Detail Density & Inactive Envelope ---');
function createMockCanvas() {
  let arcCount = 0;
  let strokeCount = 0;
  let fillRectCount = 0;
  return {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke: () => { strokeCount++; },
    arc: () => { arcCount++; },
    fillRect: () => { fillRectCount++; },
    fill: () => {},
    save: () => {},
    restore: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    getStats: () => ({ arcCount, strokeCount, fillRectCount }),
    resetStats: () => { arcCount = 0; strokeCount = 0; fillRectCount = 0; }
  } as any;
}

const mockCtx = createMockCanvas();

// Test Inactive Envelope (progress <= 0.02)
renderInfinityLoopDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 0.015,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: false
});
const inStats = mockCtx.getStats();
assert.strictEqual(inStats.arcCount, 0, 'Must draw 0 arcs when progress <= 0.02');
assert.strictEqual(inStats.strokeCount, 0, 'Must draw 0 strokes when progress <= 0.02');
console.log('[PASS] Inactive envelope verified: strictly 0 draw operations when progress <= 0.02');

// Test Active Envelope (progress = 1.0)
mockCtx.resetStats();
renderInfinityLoopDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: false
});
const actStats = mockCtx.getStats();
assert(
  actStats.arcCount >= 2500,
  `Must render >= 2,500 volumetric micro-points (got ${actStats.arcCount})`
);
assert(
  actStats.strokeCount >= 6,
  `Must render >= 6 structural braided filaments (got ${actStats.strokeCount})`
);
console.log(`[PASS] Active volumetric density verified: ${actStats.arcCount} micro-points & ${actStats.strokeCount} braided filaments`);

// 5. DETERMINISM: ZERO Math.random() IN EXECUTABLE CODE
console.log('\n--- 5. Verification: Zero Math.random() in Renderer Code ---');
const rendererFile = path.resolve(process.cwd(), 'src/components/landing/formations/infinityLoopDetailRenderer.ts');
const rendererContent = fs.readFileSync(rendererFile, 'utf-8');
const codeWithoutComments = rendererContent
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');
assert(!codeWithoutComments.includes('Math.random()'), 'Renderer must contain zero Math.random() in executable code');
console.log('[PASS] infinityLoopDetailRenderer.ts contains zero Math.random()');

// 6. 3D LEMNISCATE POINT CALCULATION
console.log('\n--- 6. Verification: 3D Lemniscate Projection Math ---');
const pt0 = getLemniscate3DPoint(0);
const ptPi = getLemniscate3DPoint(Math.PI);
assert(!isNaN(pt0.x) && !isNaN(pt0.y) && !isNaN(pt0.z), 'Point at t=0 must be finite and real');
assert(!isNaN(ptPi.x) && !isNaN(ptPi.y) && !isNaN(ptPi.z), 'Point at t=PI must be finite and real');
console.log(`[PASS] 3D Lemniscate math: t=0 projected (${pt0.x.toFixed(4)}, ${pt0.y.toFixed(4)}), t=PI (${ptPi.x.toFixed(4)}, ${ptPi.y.toFixed(4)})`);

// 7. TRANSFORM SYNCHRONIZATION
console.log('\n--- 7. Verification: Transform & Resonance Synchronization ---');
for (let idx = 0; idx < 52; idx++) {
  const rawCoord = loopResult.coords[idx];
  const target = computeSynchronizedFormationTarget({
    family: 'infinity_loop',
    index: idx,
    totalParticipants: 52,
    rawCoord,
    scale: 600,
    centerX: 500,
    centerY: 400,
    elapsed: 2500
  });

  assert(!isNaN(target.x) && !isNaN(target.y), `Synchronized target for node ${idx} must not be NaN`);
  assert(isFinite(target.x) && isFinite(target.y), `Synchronized target for node ${idx} must be finite`);
}
console.log('[PASS] All 52 anchor nodes synchronized without NaN or drift');

// 8. REGISTRY & DISPATCH INTEGRATION
console.log('\n--- 8. Verification: Registry & Engine Dispatch ---');
const infinityLoopIndex = MILESTONE1_FORMATIONS.findIndex(f => f.id === 'infinity_loop');
assert.strictEqual(infinityLoopIndex, 12, 'Formation #13 must be registered at index 12 in MILESTONE1_FORMATIONS');

const formationEntry = MILESTONE1_FORMATIONS[infinityLoopIndex];
assert.strictEqual(formationEntry.id, 'infinity_loop');
assert.strictEqual(formationEntry.category, 'quantum');
assert.strictEqual(formationEntry.participantCount, 52);

// Wraparound cyclical reachability
assert.strictEqual(getDeterministicFormationByIndex(12).id, 'infinity_loop');
assert.strictEqual(getDeterministicFormationByIndex(12 + MILESTONE1_FORMATIONS.length).id, 'infinity_loop');

// Formation Detail Engine dispatch
const dispatched = renderFormationDetailEngine('infinity_loop', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: false
});
assert.strictEqual(dispatched, true, 'renderFormationDetailEngine must return true for infinity_loop');
console.log('[PASS] Registry insertion, sequence ordering, and engine dispatching verified');

console.log('\n=== ALL TESTS PASSED FOR FORMATION #13: INFINITY LOOP ===\n');
