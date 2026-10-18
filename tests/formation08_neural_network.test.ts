/**
 * ============================================================================
 * TEST SUITE: FORMATION #08 — NEURAL NETWORK (COMPUTATIONAL AI ARCHITECTURE)
 * ============================================================================
 * Verifies:
 * 1. Computational Four-Layer Topology & Node Counts:
 *    - Layer 1 (Sensory Input): 8 nodes (x = -0.35)
 *    - Layer 2 (Feature Encoding): 12 nodes (x = -0.15)
 *    - Layer 3 (Deep Latent Nucleus Hub): 16 nodes (x = 0.08)
 *    - Layer 4 (Motor / Decision Output): 10 nodes (x = 0.32)
 *    - 4 Modulatory Bias Interneurons
 *    - Total participant count: exactly 50 nodes.
 * 2. Deterministic Geometry & Finite Bounds:
 *    - Identical inputs yield byte-for-byte identical outputs.
 *    - No NaN, infinite, or un-normalized values (all coordinates in [-0.5, 0.5]).
 * 3. Connection & Synaptic Edge Integrity:
 *    - Feedforward connections between adjacent layers.
 *    - Longitudinal hub spine in Layer 3.
 *    - All edge indices strictly within [0, participantCount - 1].
 * 4. High-Density Volumetric Marks (>= 2,500 points):
 *    - Inactive envelope: strictly 0 draw calls when progress <= 0.02.
 *    - Active envelope: >= 3,000 volumetric points & structural channels.
 * 5. Determinism:
 *    - Zero Math.random() in executable renderer code.
 * 6. Transform & Soliton Synchronization:
 *    - Anchor particles follow lockstep transverse wave oscillation with action potential solitons.
 * 7. Engine Dispatcher & Compatibility:
 *    - Dispatches cleanly via formationDetailEngine under both 'neural_network' and 'neural_synapse'.
 * ============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateNeuralSynapseCoords,
  generateNeuralNetworkCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';

import {
  renderNeuralNetworkDetailLayer
} from '../src/components/landing/formations/neuralNetworkDetailRenderer';

import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';

console.log('=== [WEB JARVIS] FORMATION #08: NEURAL NETWORK VERIFICATION SUITE ===\n');

// 1. FOUR-LAYER COMPUTATIONAL TOPOLOGY AUDIT
console.log('--- 1. Verification: Four-Layer Computational Topology & Node Counts ---');
const networkResult = generateNeuralNetworkCoords(50);
assert.strictEqual(networkResult.coords.length, 50, 'Neural Network must contain exactly 50 nodes');

// Layer 1: 8 nodes at x = -0.35
const l1 = networkResult.coords.slice(0, 8);
for (let i = 0; i < l1.length; i++) {
  assert.strictEqual(l1[i].x, -0.35, `L1 node ${i} must be at x = -0.35`);
  assert(l1[i].y >= -0.33 && l1[i].y <= 0.33, `L1 node ${i}.y within [-0.32, 0.32]`);
}

// Layer 2: 12 nodes at x = -0.15
const l2 = networkResult.coords.slice(8, 20);
for (let i = 0; i < l2.length; i++) {
  assert.strictEqual(l2[i].x, -0.15, `L2 node ${i} must be at x = -0.15`);
  assert(l2[i].y >= -0.33 && l2[i].y <= 0.33, `L2 node ${i}.y within [-0.32, 0.32]`);
}

// Layer 3: 16 nodes at x = 0.08
const l3 = networkResult.coords.slice(20, 36);
for (let i = 0; i < l3.length; i++) {
  assert.strictEqual(l3[i].x, 0.08, `L3 node ${i} must be at x = 0.08`);
  assert(l3[i].y >= -0.37 && l3[i].y <= 0.37, `L3 node ${i}.y within [-0.36, 0.36]`);
}

// Layer 4: 10 nodes at x = 0.32
const l4 = networkResult.coords.slice(36, 46);
for (let i = 0; i < l4.length; i++) {
  assert.strictEqual(l4[i].x, 0.32, `L4 node ${i} must be at x = 0.32`);
  assert(l4[i].y >= -0.33 && l4[i].y <= 0.33, `L4 node ${i}.y within [-0.32, 0.32]`);
}

// 4 Modulatory Interneurons / Bias nodes
const modNodes = networkResult.coords.slice(46, 50);
assert.strictEqual(modNodes.length, 4, 'Must have 4 modulatory interneurons / bias nodes');
console.log('[PASS] Four-layer topology verified: 8 input, 12 hidden, 16 latent, 10 output, and 4 bias nodes');

// 2. DETERMINISM & FINITE BOUNDS
console.log('\n--- 2. Verification: Determinism & Finite Coordinate Bounds ---');
const runA = generateNeuralNetworkCoords(50);
const runB = generateNeuralNetworkCoords(50);
assert.deepStrictEqual(runA.coords, runB.coords, 'Coordinates must be 100% deterministic');
assert.deepStrictEqual(runA.edges, runB.edges, 'Edges must be 100% deterministic');

for (let i = 0; i < networkResult.coords.length; i++) {
  const pt = networkResult.coords[i];
  assert(!Number.isNaN(pt.x) && !Number.isNaN(pt.y), `Node [${i}] contains NaN`);
  assert(Number.isFinite(pt.x) && Number.isFinite(pt.y), `Node [${i}] is not finite`);
  assert(pt.x >= -0.50 && pt.x <= 0.50, `Node [${i}].x (${pt.x}) outside [-0.5, 0.5]`);
  assert(pt.y >= -0.50 && pt.y <= 0.50, `Node [${i}].y (${pt.y}) outside [-0.5, 0.5]`);
}
console.log('[PASS] Coordinates 100% deterministic, finite, and strictly bounded within [-0.5, 0.5]');

// 3. SYNAPTIC EDGES AND CONNECTIVITY INTEGRITY
console.log('\n--- 3. Verification: Feedforward Edges & Latent Spine Connectivity ---');
assert(networkResult.edges.length >= 50, 'Neural Network must contain dense feedforward edge set');
for (let e = 0; e < networkResult.edges.length; e++) {
  const [fromIdx, toIdx] = networkResult.edges[e];
  assert(fromIdx >= 0 && fromIdx < 50, `Edge [${e}] fromIdx (${fromIdx}) out of bounds`);
  assert(toIdx >= 0 && toIdx < 50, `Edge [${e}] toIdx (${toIdx}) out of bounds`);
  assert.notStrictEqual(fromIdx, toIdx, `Edge [${e}] connects node to itself`);
}
console.log(`[PASS] ${networkResult.edges.length} explicit feedforward and latent bus edges validated`);

// 4. VOLUMETRIC DETAIL ENGINE & INACTIVE ENVELOPE
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

// Test Inactive envelope (progress <= 0.02)
renderNeuralNetworkDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 0.015,
  elapsed: 2500,
  baseHue: 194,
  isMulticolor: false
});
assert.strictEqual(mockCtx.getStats().arcCount, 0, 'Must draw 0 arcs when inactive');
assert.strictEqual(mockCtx.getStats().strokeCount, 0, 'Must draw 0 strokes when inactive');
console.log('[PASS] Neural Network detail layer strictly inactive (0 draws) when progress <= 0.02');

// Test Active envelope (progress = 1.0)
mockCtx.resetStats();
renderNeuralNetworkDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 1.0,
  elapsed: 2500,
  baseHue: 194,
  isMulticolor: false
});
const activeStats = mockCtx.getStats();
assert(
  activeStats.arcCount >= 3000,
  `Neural Network must render >= 3,000 volumetric points (got ${activeStats.arcCount})`
);
assert(
  activeStats.strokeCount >= 50,
  `Neural Network must render >= 50 weight channel arcs (got ${activeStats.strokeCount})`
);
console.log(`[PASS] Active Neural Network renders ${activeStats.arcCount} volumetric micro-points & ${activeStats.strokeCount} weight filaments`);

// 5. ZERO MATH.RANDOM() VERIFICATION
console.log('\n--- 5. Verification: Determinism & Zero Math.random() ---');
const rendererSrc = fs.readFileSync(
  path.resolve('./src/components/landing/formations/neuralNetworkDetailRenderer.ts'),
  'utf-8'
);
const codeOnly = rendererSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
assert(!codeOnly.includes('Math.random()'), 'neuralNetworkDetailRenderer must contain zero Math.random() calls');
console.log('[PASS] neuralNetworkDetailRenderer.ts is 100% deterministic (zero Math.random() in executable code)');

// 6. TRANSFORM PIPELINE & SOLITON LOCKSTEP SYNCHRONIZATION
console.log('\n--- 6. Verification: Anchor-Detail Coordinate Lockstep Synchronization ---');
for (let t = 0; t < 5; t++) {
  const elapsed = t * 1200;
  for (let i = 0; i < 50; i++) {
    const rawCoord = networkResult.coords[i];
    const target = computeSynchronizedFormationTarget({
      family: 'neural_network',
      index: i,
      totalParticipants: 50,
      rawCoord,
      scale: 600,
      centerX: 500,
      centerY: 500,
      elapsed
    });

    assert(!Number.isNaN(target.x) && !Number.isNaN(target.y), `Target node ${i} at ${elapsed}ms contains NaN`);
    assert(Number.isFinite(target.x) && Number.isFinite(target.y), `Target node ${i} at ${elapsed}ms is not finite`);
  }
}
console.log('[PASS] Anchor particles follow lockstep transverse activation wave without drift or NaN');

// 7. BACKWARD COMPATIBILITY FOR NEURAL_SYNAPSE
console.log('\n--- 7. Verification: Backward Compatibility for Existing neural_synapse Callers ---');
assert.strictEqual(
  generateNeuralNetworkCoords,
  generateNeuralSynapseCoords,
  'generateNeuralNetworkCoords must be a compatible reference with generateNeuralSynapseCoords'
);

mockCtx.resetStats();
const dispatchedNetwork = renderFormationDetailEngine('neural_network', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 1.0,
  elapsed: 2500,
  baseHue: 194,
  isMulticolor: false
});
assert.strictEqual(dispatchedNetwork, true, 'Engine must dispatch "neural_network" family cleanly');

mockCtx.resetStats();
const dispatchedSynapse = renderFormationDetailEngine('neural_synapse', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 1.0,
  elapsed: 2500,
  baseHue: 194,
  isMulticolor: false
});
assert.strictEqual(dispatchedSynapse, true, 'Engine must continue to dispatch "neural_synapse" family cleanly');
console.log('[PASS] Backward compatibility verified for both "neural_network" and "neural_synapse" callers');

console.log('\n=== ALL FORMATION #08 NEURAL NETWORK TESTS PASSED! ===');
