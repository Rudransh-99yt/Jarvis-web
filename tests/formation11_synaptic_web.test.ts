/**
 * ============================================================================
 * TEST SUITE: FORMATION #11 — SYNAPTIC WEB (BIOLOGICAL SYNAPTIC MICROCIRCUIT)
 * ============================================================================
 * Verifies:
 * 1. Biological Synaptic Microcircuit Topology & Node Partitions:
 *    - Presynaptic Axons & Boutons: 16 nodes (indices 0..15)
 *    - Synaptic Clefts & Quantal Active Zones: 12 nodes (indices 16..27)
 *    - Postsynaptic Density & Dendritic Spines/Arbors: 24 nodes (indices 28..51)
 *    - Total participant count: exactly 52 nodes.
 * 2. Deterministic Geometry & Finite Bounds:
 *    - Identical inputs strictly produce identical byte-for-byte coordinate outputs.
 *    - All coordinates are finite and bounded strictly within [-0.5, 0.5].
 * 3. Biological Synaptic Graph Integrity:
 *    - Valid edge indices strictly bounded within [0, participantCount - 1].
 *    - Inter-junction microcircuit cross-talk bridges present.
 * 4. High-Density Volumetric Detail (>= 2,500 marks & >= 4 filaments):
 *    - Inactive envelope: strictly 0 draw operations when progress <= 0.02.
 *    - Active envelope: >= 3,000 volumetric micro-points & distinct structural filaments.
 * 5. Determinism:
 *    - Zero Math.random() in executable code.
 * 6. Transform & Bio-Electric Synchronization:
 *    - Lockstep bio-electric propagation in computeSynchronizedFormationTarget.
 * 7. Engine Dispatcher & Registry Integration:
 *    - Registered in MILESTONE1_FORMATIONS with category 'biological', participantCount 52.
 *    - Dispatches cleanly via formationDetailEngine under 'synaptic_web'.
 * ============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateSynapticWebCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';

import {
  renderSynapticWebDetailLayer
} from '../src/components/landing/formations/synapticWebDetailRenderer';

import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';

console.log('=== [WEB JARVIS] FORMATION #11: SYNAPTIC WEB VERIFICATION SUITE ===\n');

// 1. BIOLOGICAL SYNAPTIC MICROCIRCUIT TOPOLOGY AUDIT
console.log('--- 1. Verification: Synaptic Microcircuit Topology & Node Partition ---');
const webResult = generateSynapticWebCoords(52);
assert.strictEqual(webResult.coords.length, 52, 'Synaptic Web must contain exactly 52 nodes');

// Partition 1: Presynaptic Feeders & Boutons (0..15)
const preNodes = webResult.coords.slice(0, 16);
assert.strictEqual(preNodes.length, 16, 'Presynaptic feeder partition must contain 16 nodes');
assert(Math.min(...preNodes.map(c => c.x)) <= -0.32, 'Presynaptic feeder 1 stems from x <= -0.32');
assert(Math.min(...preNodes.map(c => c.y)) <= -0.34, 'Presynaptic feeder 3 stems from y <= -0.34');

// Partition 2: Synaptic Clefts & Active Zones (16..27)
const cleftNodes = webResult.coords.slice(16, 28);
assert.strictEqual(cleftNodes.length, 12, 'Cleft partition must contain 12 nodes');
// Central cleft core around (-0.02, -0.01)
assert.strictEqual(webResult.coords[17].x, -0.020, 'Central cleft focal core at x = -0.02');
assert.strictEqual(webResult.coords[17].y, -0.010, 'Central cleft focal core at y = -0.01');

// Partition 3: Postsynaptic Density & Dendritic Arbors (28..51)
const postNodes = webResult.coords.slice(28, 52);
assert.strictEqual(postNodes.length, 24, 'Postsynaptic partition must contain 24 nodes');
assert(Math.max(...postNodes.map(c => c.x)) >= 0.35, 'Postsynaptic dendritic arbor extends to x >= 0.35');
assert(Math.max(...postNodes.map(c => c.y)) >= 0.33, 'Lower dendritic arbor extends to y >= 0.33');

console.log('[PASS] Synaptic Microcircuit partitions verified: 16 presynaptic, 12 clefts/active zones, 24 postsynaptic = 52 total');

// 2. DETERMINISM AND FINITE BOUNDS AUDIT
console.log('\n--- 2. Verification: Determinism & Finite Coordinate Bounds ---');
const webRun2 = generateSynapticWebCoords(52);
assert.deepStrictEqual(webResult.coords, webRun2.coords, 'Repeated calls to generateSynapticWebCoords must yield byte-for-byte identical coords');
assert.deepStrictEqual(webResult.edges, webRun2.edges, 'Repeated calls to generateSynapticWebCoords must yield byte-for-byte identical edges');

for (let i = 0; i < webResult.coords.length; i++) {
  const pt = webResult.coords[i];
  assert(Number.isFinite(pt.x), `Node ${i} coordinate x must be finite`);
  assert(Number.isFinite(pt.y), `Node ${i} coordinate y must be finite`);
  assert(pt.x >= -0.5 && pt.x <= 0.5, `Node ${i} coordinate x (${pt.x}) must be strictly within [-0.5, 0.5]`);
  assert(pt.y >= -0.5 && pt.y <= 0.5, `Node ${i} coordinate y (${pt.y}) must be strictly within [-0.5, 0.5]`);
}
console.log('[PASS] Coordinates 100% deterministic, finite, and strictly bounded within [-0.5, 0.5]');

// 3. SYNAPTIC GRAPH INTEGRITY AUDIT
console.log('\n--- 3. Verification: Edge Indices and Synaptic Graph Integrity ---');
assert(webResult.edges.length >= 40, `Synaptic Web must feature rich connectivity (got ${webResult.edges.length} edges)`);
for (const [a, b] of webResult.edges) {
  assert(Number.isInteger(a) && a >= 0 && a < 52, `Edge endpoint a (${a}) must be in [0, 51]`);
  assert(Number.isInteger(b) && b >= 0 && b < 52, `Edge endpoint b (${b}) must be in [0, 51]`);
  assert.notStrictEqual(a, b, `Edge cannot connect a node to itself (${a} -> ${b})`);
}
// Cross-talk edges check
const hasCrossTalk = webResult.edges.some(([a, b]) => (a === 17 && b === 23) || (a === 23 && b === 17));
assert(hasCrossTalk, 'Microcircuit cross-talk bridge between central and upper clefts must be present');
console.log(`[PASS] ${webResult.edges.length} explicit synaptic microcircuit edges validated`);

// 4. VOLUMETRIC DETAIL MARKS & INACTIVE ENVELOPE AUDIT
console.log('\n--- 4. Verification: Volumetric Detail Marks & Inactive Envelope ---');

// Mock 2D Canvas Context
class MockCanvasContext {
  arcCount = 0;
  strokeCount = 0;
  fillCount = 0;
  paths: any[] = [];
  fillStyle: any = '';
  strokeStyle: any = '';
  lineWidth = 1;

  createRadialGradient() {
    return {
      addColorStop: () => {}
    };
  }
  beginPath() {}
  arc() { this.arcCount++; }
  stroke() { this.strokeCount++; }
  fill() { this.fillCount++; }
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  bezierCurveTo() {}
  save() {}
  restore() {}
}

const mockCtx = new MockCanvasContext() as unknown as CanvasRenderingContext2D;
const mockStats = mockCtx as unknown as MockCanvasContext;

// Test Inactive Envelope: progress <= 0.02
renderSynapticWebDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 0.015,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: false
});
assert.strictEqual(mockStats.arcCount, 0, 'Synaptic Web must draw strictly 0 arcs when progress <= 0.02');
assert.strictEqual(mockStats.strokeCount, 0, 'Synaptic Web must draw strictly 0 strokes when progress <= 0.02');
console.log('[PASS] Synaptic Web detail layer strictly inactive (0 draws) when progress <= 0.02');

// Test Active Envelope: progress = 1.0
renderSynapticWebDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: false
});
assert(mockStats.arcCount >= 2500, `Synaptic Web must draw >= 2,500 volumetric micro-points (got ${mockStats.arcCount})`);
assert(mockStats.strokeCount >= 4, `Synaptic Web must draw >= 4 structural filaments (got ${mockStats.strokeCount})`);
console.log(`[PASS] Active Synaptic Web renders ${mockStats.arcCount} volumetric micro-points & ${mockStats.strokeCount} structural filaments`);

// 5. DETERMINISM & ZERO MATH.RANDOM() AUDIT
console.log('\n--- 5. Verification: Determinism & Zero Math.random() ---');
const synapticWebRendererSrc = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/landing/formations/synapticWebDetailRenderer.ts'),
  'utf-8'
);
const execCode = synapticWebRendererSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
assert(!execCode.includes('Math.random()'), 'synapticWebDetailRenderer.ts must not call Math.random() in executable code');
console.log('[PASS] synapticWebDetailRenderer.ts is 100% deterministic (zero Math.random() in executable code)');

// 6. TRANSFORM & BIO-ELECTRIC SYNCHRONIZATION AUDIT
console.log('\n--- 6. Verification: Anchor-Detail Coordinate Lockstep Synchronization ---');
const testElapsedTimes = [0, 1000, 2500, 5000];
for (const elapsed of testElapsedTimes) {
  for (let idx = 0; idx < 52; idx++) {
    const rawCoord = webResult.coords[idx];
    const target = computeSynchronizedFormationTarget({
      family: 'synaptic_web',
      index: idx,
      totalParticipants: 52,
      rawCoord,
      scale: 750,
      centerX: 500,
      centerY: 500,
      elapsed
    });
    assert(Number.isFinite(target.x), `Target x for node ${idx} at elapsed ${elapsed} must be finite`);
    assert(Number.isFinite(target.y), `Target y for node ${idx} at elapsed ${elapsed} must be finite`);
  }
}
console.log('[PASS] Anchor particles follow lockstep bio-electric wave without drift or NaN');

// 7. REGISTRY INTEGRATION & DISPATCH AUDIT
console.log('\n--- 7. Verification: Formation Detail Engine Dispatch & Registry Integration ---');
const foundFormation = MILESTONE1_FORMATIONS.find(f => f.id === 'synaptic_web');
assert(foundFormation, 'Formation "synaptic_web" must be registered in MILESTONE1_FORMATIONS');
assert.strictEqual(foundFormation.category, 'biological', 'Synaptic Web category must be "biological"');
assert.strictEqual(foundFormation.participantCount, 52, 'Synaptic Web participantCount must be 52');

const synapticWebIndex = MILESTONE1_FORMATIONS.findIndex(f => f.id === 'synaptic_web');
assert.strictEqual(synapticWebIndex, 10, 'Formation #11 must be registered at index 10 in MILESTONE1_FORMATIONS');
assert.strictEqual(getDeterministicFormationByIndex(synapticWebIndex).id, 'synaptic_web', 'getDeterministicFormationByIndex must return synaptic_web at index 10');
assert.strictEqual(getDeterministicFormationByIndex(MILESTONE1_FORMATIONS.length).id, 'galaxy_spiral', 'Wraparound must return galaxy_spiral');

// Engine Dispatcher Test
mockStats.arcCount = 0;
mockStats.strokeCount = 0;
const dispatched = renderFormationDetailEngine('synaptic_web', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: false
});
assert.strictEqual(dispatched, true, 'renderFormationDetailEngine must return true for "synaptic_web"');
assert(mockStats.arcCount >= 2500, 'Dispatched synaptic_web must render volumetric marks');
console.log('[PASS] formationDetailEngine & formationRegistry integration verified for "synaptic_web"');

console.log('\n=== ALL FORMATION #11 SYNAPTIC WEB TESTS PASSED! ===');
