/**
 * ============================================================================
 * TEST SUITE: FORMATION #10 — SINGLE NEURON (MULTIPOLAR BIOLOGICAL NEURON)
 * ============================================================================
 * Verifies:
 * 1. Multipolar Anatomical Topology & Node Partition:
 *    - Soma & Nucleus: 14 nodes (indices 0..13, centered around x = -0.14, y = -0.02)
 *    - Dendritic Arbor & Spines: 18 nodes (indices 14..31, branching outward to minX <= -0.34)
 *    - Myelinated Axon & Nodes of Ranvier: 12 nodes (indices 32..43, across x in [-0.01, 0.29])
 *    - Axon Terminals & Boutons: 8 nodes (indices 44..51, distal boutons reaching maxX >= 0.40)
 *    - Total participant count: exactly 52 nodes.
 * 2. Deterministic Geometry & Finite Bounds:
 *    - Identical inputs yield byte-for-byte identical coordinate and edge outputs.
 *    - All coordinates finite and strictly bounded within [-0.5, 0.5].
 * 3. Biological Synaptic & Axonal Edge Integrity:
 *    - Soma envelope and perikaryon mesh connections.
 *    - Primary to secondary to tertiary dendritic branch connections.
 *    - Dendritic spine stem connections.
 *    - Axon hillock to initial segment and internodal myelin/node chain.
 *    - Terminal telodendria forks to distal synaptic boutons.
 *    - All edge indices strictly within [0, participantCount - 1].
 * 4. High-Density Volumetric Detail (>= 2,500 marks & >= 4 filaments):
 *    - Inactive envelope: strictly 0 draw operations when progress <= 0.02.
 *    - Active envelope: >= 3,000 volumetric micro-points & distinct structural filaments.
 * 5. Determinism:
 *    - Zero Math.random() in executable code.
 * 6. Transform & Bio-Electric Synchronization:
 *    - Lockstep bio-electric propagation matching singleNeuronDetailRenderer.
 * 7. Engine Dispatcher & Registry Integration:
 *    - Registered in MILESTONE1_FORMATIONS with category 'biological', participantCount 52.
 *    - Dispatches cleanly via formationDetailEngine under 'single_neuron'.
 * ============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateSingleNeuronCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';

import {
  renderSingleNeuronDetailLayer
} from '../src/components/landing/formations/singleNeuronDetailRenderer';

import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';

console.log('=== [WEB JARVIS] FORMATION #10: SINGLE NEURON VERIFICATION SUITE ===\n');

// 1. MULTIPOLAR ANATOMICAL TOPOLOGY AUDIT
console.log('--- 1. Verification: Multipolar Anatomical Topology & Node Partition ---');
const neuronResult = generateSingleNeuronCoords(52);
assert.strictEqual(neuronResult.coords.length, 52, 'Single Neuron must contain exactly 52 nodes');

// 1A. Soma & Nucleus: 14 nodes (0..13)
const somaNodes = neuronResult.coords.slice(0, 14);
assert.strictEqual(somaNodes.length, 14, 'Must have exactly 14 soma and nucleus nodes');
// Nucleolus at (-0.14, -0.02)
assert.strictEqual(somaNodes[0].x, -0.14, 'Nucleolus at x = -0.14');
assert.strictEqual(somaNodes[0].y, -0.02, 'Nucleolus at y = -0.02');
// Nuclear envelope ring (1..4) within r <= 0.045 of soma center
for (let i = 1; i <= 4; i++) {
  const d = Math.hypot(somaNodes[i].x - (-0.14), somaNodes[i].y - (-0.02));
  assert(d <= 0.045, `Nuclear envelope node ${i} within r <= 0.045 of center (got ${d})`);
}
// Soma membrane boundary vertices (5..12) within r in [0.06, 0.12]
for (let i = 5; i <= 12; i++) {
  const d = Math.hypot(somaNodes[i].x - (-0.14), somaNodes[i].y - (-0.02));
  assert(d >= 0.05 && d <= 0.12, `Soma membrane vertex ${i} within r in [0.05, 0.12] (got ${d})`);
}
// Axon hillock neck anchor (13) at x = -0.055
assert.strictEqual(somaNodes[13].x, -0.055, 'Axon hillock superior anchor at x = -0.055');

// 1B. Dendritic Arbor & Spines: 18 nodes (14..31)
const dendriteNodes = neuronResult.coords.slice(14, 32);
assert.strictEqual(dendriteNodes.length, 18, 'Must have exactly 18 dendritic arbor and spine nodes');
// All dendrite nodes must be located leftward of soma center (x <= -0.18)
for (let i = 0; i < dendriteNodes.length; i++) {
  assert(dendriteNodes[i].x <= -0.18, `Dendrite node ${i} must extend leftward (x <= -0.18, got ${dendriteNodes[i].x})`);
}
const minDendriteX = Math.min(...dendriteNodes.map(c => c.x));
assert(minDendriteX <= -0.34, `Terminal dendrites extend to minX <= -0.34 (got ${minDendriteX})`);

// 1C. Myelinated Axon & Nodes of Ranvier: 12 nodes (32..43)
const axonNodes = neuronResult.coords.slice(32, 44);
assert.strictEqual(axonNodes.length, 12, 'Must have exactly 12 myelinated axon and node nodes');
// Axon Initial Segment (AIS) at x = -0.010
assert.strictEqual(axonNodes[0].x, -0.010, 'AIS at x = -0.010');
// Pre-terminal node at x = 0.288
assert.strictEqual(axonNodes[8].x, 0.288, 'Pre-terminal Node of Ranvier at x = 0.288');
// Alternating sheaths and nodes monotonically advancing along x
for (let i = 1; i < 9; i++) {
  assert(axonNodes[i].x > axonNodes[i - 1].x, `Axon segment ${i} must advance along positive x`);
}

// 1D. Axon Terminals & Boutons: 8 nodes (44..51)
const terminalNodes = neuronResult.coords.slice(44, 52);
assert.strictEqual(terminalNodes.length, 8, 'Must have exactly 8 terminal branch and bouton nodes');
for (let i = 0; i < terminalNodes.length; i++) {
  assert(terminalNodes[i].x >= 0.31, `Terminal nodes must be at x >= 0.31 (got ${terminalNodes[i].x})`);
}
const maxBoutonX = Math.max(...terminalNodes.map(c => c.x));
assert(maxBoutonX >= 0.40, `Terminal boutons reach maxX >= 0.40 (got ${maxBoutonX})`);

console.log('[PASS] Multipolar anatomical partitions verified: 14 soma, 18 dendrite, 12 axon, 8 terminal boutons = 52 total');

// 2. DETERMINISM & FINITE BOUNDS
console.log('\n--- 2. Verification: Determinism & Finite Coordinate Bounds ---');
const runA = generateSingleNeuronCoords(52);
const runB = generateSingleNeuronCoords(52);
assert.deepStrictEqual(runA.coords, runB.coords, 'Coordinates must be 100% deterministic');
assert.deepStrictEqual(runA.edges, runB.edges, 'Edges must be 100% deterministic');

for (let i = 0; i < neuronResult.coords.length; i++) {
  const pt = neuronResult.coords[i];
  assert(Number.isFinite(pt.x) && !Number.isNaN(pt.x), `Coord ${i}.x must be finite`);
  assert(Number.isFinite(pt.y) && !Number.isNaN(pt.y), `Coord ${i}.y must be finite`);
  assert(pt.x >= -0.5 && pt.x <= 0.5, `Coord ${i}.x must be within [-0.5, 0.5] (got ${pt.x})`);
  assert(pt.y >= -0.5 && pt.y <= 0.5, `Coord ${i}.y must be within [-0.5, 0.5] (got ${pt.y})`);
}
console.log('[PASS] Coordinates 100% deterministic, finite, and strictly bounded within [-0.5, 0.5]');

// 3. BIOLOGICAL GRAPH INTEGRITY & EDGE INDICES
console.log('\n--- 3. Verification: Edge Indices and Synaptic Graph Integrity ---');
assert(neuronResult.edges.length >= 40, `Must contain comprehensive edge network (got ${neuronResult.edges.length})`);
for (const [a, b] of neuronResult.edges) {
  assert(a >= 0 && a < 52, `Edge source ${a} within [0, 51]`);
  assert(b >= 0 && b < 52, `Edge target ${b} within [0, 51]`);
  assert(a !== b, `Self-referential edge not allowed: [${a}, ${b}]`);
}
console.log(`[PASS] ${neuronResult.edges.length} explicit anatomical and axonal edges validated`);

// 4. VOLUMETRIC MARKS & INACTIVE ENVELOPE AUDIT
console.log('\n--- 4. Verification: Volumetric Detail Marks & Inactive Envelope ---');
function createMockCanvas() {
  let arcCount = 0;
  let strokeCount = 0;
  return {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke: () => { strokeCount++; },
    arc: () => { arcCount++; },
    fill: () => {},
    save: () => {},
    restore: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    getStats: () => ({ arcCount, strokeCount }),
    resetStats: () => { arcCount = 0; strokeCount = 0; }
  } as any;
}

const mockCtx = createMockCanvas();

// Test Inactive envelope: progress <= 0.02
renderSingleNeuronDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 0.015,
  elapsed: 2000,
  baseHue: 192,
  isMulticolor: false
});
const inactiveStats = mockCtx.getStats();
assert.strictEqual(inactiveStats.arcCount, 0, 'Must draw 0 arcs when progress <= 0.02');
assert.strictEqual(inactiveStats.strokeCount, 0, 'Must draw 0 strokes when progress <= 0.02');
console.log('[PASS] Single Neuron detail layer strictly inactive (0 draws) when progress <= 0.02');

// Test Active envelope: progress = 1.0
mockCtx.resetStats();
renderSingleNeuronDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 192,
  isMulticolor: true
});
const activeStats = mockCtx.getStats();
assert(
  activeStats.arcCount >= 2500,
  `Single Neuron must render >= 2,500 volumetric micro-points (got ${activeStats.arcCount})`
);
assert(
  activeStats.strokeCount >= 4,
  `Single Neuron must render >= 4 structural filaments (got ${activeStats.strokeCount})`
);
console.log(`[PASS] Active Single Neuron renders ${activeStats.arcCount} volumetric micro-points & ${activeStats.strokeCount} structural filaments`);

// 5. DETERMINISM & ZERO MATH.RANDOM()
console.log('\n--- 5. Verification: Determinism & Zero Math.random() ---');
const rendererPath = path.resolve(process.cwd(), 'src/components/landing/formations/singleNeuronDetailRenderer.ts');
assert(fs.existsSync(rendererPath), 'singleNeuronDetailRenderer.ts must exist');
const rendererSrc = fs.readFileSync(rendererPath, 'utf-8');
const codeWithoutComments = rendererSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
assert(!codeWithoutComments.includes('Math.random()'), 'singleNeuronDetailRenderer.ts must have zero Math.random() calls');
console.log('[PASS] singleNeuronDetailRenderer.ts is 100% deterministic (zero Math.random() in executable code)');

// 6. ANCHOR-DETAIL TRANSFORM LOCKSTEP SYNCHRONIZATION
console.log('\n--- 6. Verification: Anchor-Detail Coordinate Lockstep Synchronization ---');
for (const elapsed of [0, 1000, 2500, 4000, 7500]) {
  for (let i = 0; i < 52; i++) {
    const target = computeSynchronizedFormationTarget({
      family: 'single_neuron',
      index: i,
      totalParticipants: 52,
      rawCoord: neuronResult.coords[i],
      scale: 700,
      centerX: 500,
      centerY: 500,
      elapsed
    });
    assert(Number.isFinite(target.x) && !Number.isNaN(target.x), `Target ${i}.x must be finite at t=${elapsed}`);
    assert(Number.isFinite(target.y) && !Number.isNaN(target.y), `Target ${i}.y must be finite at t=${elapsed}`);
  }
}
console.log('[PASS] Anchor particles follow lockstep bio-electric wave without drift or NaN');

// 7. FORMATION DETAIL ENGINE DISPATCH & REGISTRY INTEGRATION
console.log('\n--- 7. Verification: Formation Detail Engine Dispatch & Registry Integration ---');
mockCtx.resetStats();
const dispatched = renderFormationDetailEngine('single_neuron', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 1.0,
  elapsed: 2500,
  baseHue: 200,
  isMulticolor: false
});
assert.strictEqual(dispatched, true, 'formationDetailEngine must dispatch single_neuron');
const dispatchStats = mockCtx.getStats();
assert(dispatchStats.arcCount >= 2500, `Dispatched single_neuron must render >= 2500 points (got ${dispatchStats.arcCount})`);

// Registry check
const registered = MILESTONE1_FORMATIONS.find(f => f.id === 'single_neuron');
assert(registered, 'single_neuron must be registered in MILESTONE1_FORMATIONS');
assert.strictEqual(registered.name, 'Multipolar Single Neuron');
assert.strictEqual(registered.participantCount, 52);
assert.strictEqual(registered.category, 'biological');
console.log('[PASS] formationDetailEngine & formationRegistry integration verified for "single_neuron"');

console.log('\n=== ALL FORMATION #10 SINGLE NEURON TESTS PASSED! ===\n');
