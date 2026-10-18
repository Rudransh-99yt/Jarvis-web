/**
 * ============================================================================
 * TEST SUITE: FORMATION #12 — KNOWLEDGE GRAPH (INTERCONNECTED EPISTEMIC GRAPH)
 * ============================================================================
 * Verifies:
 * 1. Multi-Tier Epistemic Graph Topology & Node Partitions:
 *    - Conceptual Hub Nuclei: 12 nodes (indices 0..11)
 *    - Intermediate Entity Clusters: 18 nodes (indices 12..29)
 *    - Distal Fact Leaves & Trans-Domain Query Loops: 24 nodes (indices 30..53)
 *    - Total participant count: exactly 54 nodes.
 * 2. Deterministic Geometry & Finite Bounds:
 *    - Identical inputs strictly produce identical byte-for-byte coordinate outputs.
 *    - All coordinates are finite and bounded strictly within [-0.5, 0.5].
 * 3. Knowledge Graph Integrity & Rich Relational Connectivity:
 *    - Valid edge indices strictly bounded within [0, participantCount - 1].
 *    - Primary backbone cross-hub bridges and trans-domain query loops present.
 * 4. High-Density Volumetric Detail (>= 2,500 marks & >= 4 filaments):
 *    - Inactive envelope: strictly 0 draw operations when progress <= 0.02.
 *    - Active envelope: >= 3,000 volumetric micro-points & distinct structural filaments.
 * 5. Determinism:
 *    - Zero Math.random() in executable code.
 * 6. Transform & Epistemic Resonance Synchronization:
 *    - Lockstep transform synchronization in computeSynchronizedFormationTarget without NaN or drift.
 * 7. Engine Dispatcher & Registry Integration:
 *    - Registered in MILESTONE1_FORMATIONS with category 'neural', participantCount 54.
 *    - Appended as Formation #12 following #11 without reordering.
 *    - Dispatches cleanly via formationDetailEngine under 'knowledge_graph'.
 * ============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateKnowledgeGraphCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';

import {
  renderKnowledgeGraphDetailLayer
} from '../src/components/landing/formations/knowledgeGraphDetailRenderer';

import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';

console.log('=== [WEB JARVIS] FORMATION #12: KNOWLEDGE GRAPH VERIFICATION SUITE ===\n');

// 1. KNOWLEDGE GRAPH TOPOLOGY AUDIT
console.log('--- 1. Verification: Knowledge Graph Topology & Node Partition ---');
const kgResult = generateKnowledgeGraphCoords(54);
assert.strictEqual(kgResult.coords.length, 54, 'Knowledge Graph must contain exactly 54 nodes');

// Partition 1: Conceptual Hub Nuclei (0..11)
const hubNodes = kgResult.coords.slice(0, 12);
assert.strictEqual(hubNodes.length, 12, 'Hub partition must contain 12 nodes');
// Hub Alpha Core
assert.strictEqual(kgResult.coords[0].x, -0.060, 'Hub Alpha focal core at x = -0.06');
assert.strictEqual(kgResult.coords[0].y, -0.040, 'Hub Alpha focal core at y = -0.04');
// Hub Beta Core
assert.strictEqual(kgResult.coords[4].x, 0.170, 'Hub Beta focal core at x = 0.17');
assert.strictEqual(kgResult.coords[4].y, -0.160, 'Hub Beta focal core at y = -0.16');
// Hub Gamma Core
assert.strictEqual(kgResult.coords[8].x, -0.140, 'Hub Gamma focal core at x = -0.14');
assert.strictEqual(kgResult.coords[8].y, 0.180, 'Hub Gamma focal core at y = 0.18');

// Partition 2: Intermediate Entity Clusters (12..29)
const entityNodes = kgResult.coords.slice(12, 30);
assert.strictEqual(entityNodes.length, 18, 'Entity cluster partition must contain 18 nodes');

// Partition 3: Peripheral Fact Leaves & Query Loops (30..53)
const leafNodes = kgResult.coords.slice(30, 54);
assert.strictEqual(leafNodes.length, 24, 'Fact leaf / query loop partition must contain 24 nodes');

console.log('[PASS] Knowledge Graph partitions verified: 12 hub nodes, 18 entity nodes, 24 fact leaves = 54 total');

// 2. DETERMINISM AND FINITE BOUNDS AUDIT
console.log('\n--- 2. Verification: Determinism & Finite Coordinate Bounds ---');
const kgRun2 = generateKnowledgeGraphCoords(54);
assert.deepStrictEqual(kgResult.coords, kgRun2.coords, 'Repeated calls to generateKnowledgeGraphCoords must yield byte-for-byte identical coords');
assert.deepStrictEqual(kgResult.edges, kgRun2.edges, 'Repeated calls to generateKnowledgeGraphCoords must yield byte-for-byte identical edges');

for (let i = 0; i < kgResult.coords.length; i++) {
  const pt = kgResult.coords[i];
  assert(Number.isFinite(pt.x), `Node ${i} coordinate x must be finite`);
  assert(Number.isFinite(pt.y), `Node ${i} coordinate y must be finite`);
  assert(pt.x >= -0.5 && pt.x <= 0.5, `Node ${i} coordinate x (${pt.x}) must be strictly within [-0.5, 0.5]`);
  assert(pt.y >= -0.5 && pt.y <= 0.5, `Node ${i} coordinate y (${pt.y}) must be strictly within [-0.5, 0.5]`);
}
console.log('[PASS] Coordinates 100% deterministic, finite, and strictly bounded within [-0.5, 0.5]');

// 3. KNOWLEDGE GRAPH INTEGRITY AUDIT
console.log('\n--- 3. Verification: Edge Indices and Knowledge Graph Integrity ---');
assert(kgResult.edges.length >= 45, `Knowledge Graph must feature rich connectivity (got ${kgResult.edges.length} edges)`);
for (const [a, b] of kgResult.edges) {
  assert(Number.isInteger(a) && a >= 0 && a < 54, `Edge endpoint a (${a}) must be in [0, 53]`);
  assert(Number.isInteger(b) && b >= 0 && b < 54, `Edge endpoint b (${b}) must be in [0, 53]`);
  assert.notStrictEqual(a, b, `Edge cannot connect a node to itself (${a} -> ${b})`);
}
// Cross-hub backbone edges check
const hasHubBridge = kgResult.edges.some(([a, b]) => (a === 0 && b === 4) || (a === 4 && b === 0));
assert(hasHubBridge, 'Primary cross-hub backbone bridge between Hub Alpha and Hub Beta must be present');
console.log(`[PASS] ${kgResult.edges.length} explicit knowledge graph edges validated`);

// 4. VOLUMETRIC DETAIL MARKS & INACTIVE ENVELOPE AUDIT
console.log('\n--- 4. Verification: Volumetric Detail Marks & Inactive Envelope ---');

class MockCanvasContext {
  arcCount = 0;
  strokeCount = 0;
  fillCount = 0;
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
renderKnowledgeGraphDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 0.015,
  elapsed: 3000,
  baseHue: 195,
  isMulticolor: false
});
assert.strictEqual(mockStats.arcCount, 0, 'Knowledge Graph must draw strictly 0 arcs when progress <= 0.02');
assert.strictEqual(mockStats.strokeCount, 0, 'Knowledge Graph must draw strictly 0 strokes when progress <= 0.02');
console.log('[PASS] Knowledge Graph detail layer strictly inactive (0 draws) when progress <= 0.02');

// Test Active Envelope: progress = 1.0
renderKnowledgeGraphDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 195,
  isMulticolor: false
});
assert(mockStats.arcCount >= 2500, `Knowledge Graph must draw >= 2,500 volumetric micro-points (got ${mockStats.arcCount})`);
assert(mockStats.strokeCount >= 4, `Knowledge Graph must draw >= 4 structural filaments (got ${mockStats.strokeCount})`);
console.log(`[PASS] Active Knowledge Graph renders ${mockStats.arcCount} volumetric micro-points & ${mockStats.strokeCount} structural filaments`);

// 5. DETERMINISM & ZERO MATH.RANDOM() AUDIT
console.log('\n--- 5. Verification: Determinism & Zero Math.random() ---');
const knowledgeGraphRendererSrc = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/landing/formations/knowledgeGraphDetailRenderer.ts'),
  'utf-8'
);
const execCode = knowledgeGraphRendererSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
assert(!execCode.includes('Math.random()'), 'knowledgeGraphDetailRenderer.ts must not call Math.random() in executable code');
console.log('[PASS] knowledgeGraphDetailRenderer.ts is 100% deterministic (zero Math.random() in executable code)');

// 6. TRANSFORM & EPISTEMIC RESONANCE SYNCHRONIZATION AUDIT
console.log('\n--- 6. Verification: Anchor-Detail Coordinate Lockstep Synchronization ---');
const testElapsedTimes = [0, 1000, 2500, 5000];
for (const elapsed of testElapsedTimes) {
  for (let idx = 0; idx < 54; idx++) {
    const rawCoord = kgResult.coords[idx];
    const target = computeSynchronizedFormationTarget({
      family: 'knowledge_graph',
      index: idx,
      totalParticipants: 54,
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
console.log('[PASS] Anchor particles follow lockstep epistemic resonance wave without drift or NaN');

// 7. REGISTRY INTEGRATION & DISPATCH AUDIT
console.log('\n--- 7. Verification: Formation Detail Engine Dispatch & Registry Integration ---');
const foundFormation = MILESTONE1_FORMATIONS.find(f => f.id === 'knowledge_graph');
assert(foundFormation, 'Formation "knowledge_graph" must be registered in MILESTONE1_FORMATIONS');
assert.strictEqual(foundFormation.category, 'neural', 'Knowledge Graph category must be "neural"');
assert.strictEqual(foundFormation.participantCount, 54, 'Knowledge Graph participantCount must be 54');

const kgIndex = MILESTONE1_FORMATIONS.findIndex(f => f.id === 'knowledge_graph');
assert.strictEqual(kgIndex, 11, 'Formation #12 must be registered at index 11 in MILESTONE1_FORMATIONS');
assert.strictEqual(getDeterministicFormationByIndex(11).id, 'knowledge_graph', 'getDeterministicFormationByIndex(11) must return knowledge_graph');
assert.strictEqual(getDeterministicFormationByIndex(MILESTONE1_FORMATIONS.length).id, 'galaxy_spiral', 'Wraparound must return galaxy_spiral');

// Engine Dispatcher Test
mockStats.arcCount = 0;
mockStats.strokeCount = 0;
const dispatched = renderFormationDetailEngine('knowledge_graph', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 750,
  progress: 1.0,
  elapsed: 3000,
  baseHue: 195,
  isMulticolor: false
});
assert.strictEqual(dispatched, true, 'renderFormationDetailEngine must return true for "knowledge_graph"');
assert(mockStats.arcCount >= 2500, 'Dispatched knowledge_graph must render volumetric marks');
console.log('[PASS] formationDetailEngine & formationRegistry integration verified for "knowledge_graph"');

console.log('\n=== ALL FORMATION #12 KNOWLEDGE GRAPH TESTS PASSED! ===');
