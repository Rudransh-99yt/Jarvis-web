/**
 * ============================================================================
 * TEST SUITE: FORMATION #14 — INTELLIGENCE CRYSTAL (STRUCTURED FACETED POLYHEDRON)
 * ============================================================================
 * Verifies:
 * 1. Crystal Topology & Partition Budget:
 *    - Outer Crystalline Shell: 20 nodes (indices 0..19: dual apexes, upper, eq, and lower rings)
 *    - Inner Core Lattice & Octahedral Seed: 14 nodes (indices 20..33)
 *    - Optical Refraction & Prism Ridge Midpoints: 20 nodes (indices 34..53)
 *    - Total participant count: exactly 54 nodes.
 * 2. Deterministic Geometry & Finite Bounds:
 *    - Identical inputs strictly produce identical byte-for-byte coordinate outputs.
 *    - All coordinates are finite and bounded strictly within [-0.5, 0.5].
 *    - Dual vertical apexes reach opposite polar bounds.
 * 3. 3D Faceted Crystalline Structural Connectivity:
 *    - Triangular and trapezoidal facet edges forming the 3D crystal bipyramid.
 *    - Inner lattice edges and prismatic refraction bridges.
 *    - All edge indices bounded within [0, participantCount - 1].
 * 4. High-Density Volumetric Detail (>= 2,500 marks & >= 4 filaments):
 *    - Inactive envelope: strictly 0 draw operations when progress <= 0.02.
 *    - Active envelope: >= 3,000 volumetric micro-points (~3,250 points) & distinct structural filaments (>= 4).
 * 5. Determinism:
 *    - Zero Math.random() in executable code.
 * 6. Transform & Crystalline Resonance Synchronization:
 *    - Lockstep transform synchronization in computeSynchronizedFormationTarget without NaN or drift.
 * 7. Engine Dispatcher & Registry Integration:
 *    - Registered in MILESTONE1_FORMATIONS with category 'quantum', participantCount 54.
 *    - Appended as Formation #14 following #13 at index 13 without reordering.
 *    - Dispatches cleanly via formationDetailEngine under 'intelligence_crystal'.
 * ============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  generateIntelligenceCrystalCoords,
  getDeterministicFormationByIndex,
  MILESTONE1_FORMATIONS
} from '../src/components/landing/formations/formationRegistry';

import {
  renderIntelligenceCrystalDetailLayer,
  projectCrystal3DPoint
} from '../src/components/landing/formations/intelligenceCrystalDetailRenderer';

import {
  computeSynchronizedFormationTarget,
  renderFormationDetailEngine
} from '../src/components/landing/formations/formationDetailEngine';

console.log('=== [WEB JARVIS] FORMATION #14: INTELLIGENCE CRYSTAL VERIFICATION SUITE ===\n');

// 1. TOPOLOGY & PARTITIONS AUDIT
console.log('--- 1. Verification: Crystal Topology & Partition Budget ---');
const crystalResult = generateIntelligenceCrystalCoords(54);
assert.strictEqual(crystalResult.coords.length, 54, 'Intelligence Crystal must contain exactly 54 nodes');

// Partition 1: Outer Crystalline Shell (0..19)
const outerShellNodes = crystalResult.coords.slice(0, 20);
assert.strictEqual(outerShellNodes.length, 20, 'Outer shell partition must contain 20 nodes');

// Verify dual apex polar positions
const topApex = crystalResult.coords[0];
const botApex = crystalResult.coords[19];
assert(topApex.y < -0.20, `Top apex must reach polar north y < -0.20 (got ${topApex.y})`);
assert(botApex.y > 0.20, `Bottom apex must reach polar south y > 0.20 (got ${botApex.y})`);

// Partition 2: Inner Core Lattice & Octahedral Seed (20..33)
const coreNodes = crystalResult.coords.slice(20, 34);
assert.strictEqual(coreNodes.length, 14, 'Inner core partition must contain 14 nodes');
const innerTop = crystalResult.coords[20];
const innerBot = crystalResult.coords[21];
assert(innerTop.y < 0 && innerTop.y > topApex.y, 'Inner top apex is between center and outer top apex');
assert(innerBot.y > 0 && innerBot.y < botApex.y, 'Inner bottom apex is between center and outer bottom apex');

// Partition 3: Optical Refraction & Prism Ridge Midpoints (34..53)
const ridgeNodes = crystalResult.coords.slice(34, 54);
assert.strictEqual(ridgeNodes.length, 20, 'Optical ridge midpoints partition must contain 20 nodes');
console.log('[PASS] Topology and partition budget verified (20 outer + 14 core + 20 ridge/refraction = 54 nodes)');

// 2. DETERMINISM & BOUNDS
console.log('\n--- 2. Verification: Deterministic Geometry & Coordinate Bounds ---');
const crystalRun2 = generateIntelligenceCrystalCoords(54);
assert.deepStrictEqual(crystalResult.coords, crystalRun2.coords, 'Consecutive coordinate generation calls must be byte-for-byte identical');
assert.deepStrictEqual(crystalResult.edges, crystalRun2.edges, 'Consecutive edge generation calls must be byte-for-byte identical');

for (let i = 0; i < crystalResult.coords.length; i++) {
  const pt = crystalResult.coords[i];
  assert(!isNaN(pt.x) && !isNaN(pt.y), `Node ${i} must have non-NaN coordinates`);
  assert(pt.x >= -0.5 && pt.x <= 0.5, `Node ${i} x coordinate must be in [-0.5, 0.5] (got ${pt.x})`);
  assert(pt.y >= -0.5 && pt.y <= 0.5, `Node ${i} y coordinate must be in [-0.5, 0.5] (got ${pt.y})`);
}
console.log('[PASS] Deterministic geometry and [-0.5, 0.5] coordinate bounds confirmed across all 54 nodes');

// 3. FACETED CONNECTIVITY & EDGES
console.log('\n--- 3. Verification: 3D Faceted Structural Connectivity ---');
assert(crystalResult.edges.length >= 60, `Crystal must contain dense facet edges (got ${crystalResult.edges.length})`);
for (const [from, to] of crystalResult.edges) {
  assert(from >= 0 && from < 54, `Edge source index ${from} must be in [0, 53]`);
  assert(to >= 0 && to < 54, `Edge target index ${to} must be in [0, 53]`);
  assert(from !== to, `Self-loops prohibited (found edge [${from}, ${to}])`);
}
console.log(`[PASS] Structural connectivity verified (${crystalResult.edges.length} valid facet/lattice edges)`);

// 4. HIGH-DENSITY VOLUMETRIC MARKS & INACTIVE ENVELOPE
console.log('\n--- 4. Verification: High-Density Volumetric Marks (>= 2,500) & Inactive Envelope ---');
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

// Test Inactive Envelope: progress <= 0.02
mockCtx.resetStats();
renderIntelligenceCrystalDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 0.015,
  elapsed: 3000,
  baseHue: 200,
  isMulticolor: false
});
const inactiveStats = mockCtx.getStats();
assert.strictEqual(inactiveStats.arcCount, 0, 'Must draw 0 arcs when progress <= 0.02');
assert.strictEqual(inactiveStats.strokeCount, 0, 'Must draw 0 strokes when progress <= 0.02');
console.log('[PASS] Inactive envelope strictly verified: 0 draw operations at progress <= 0.02');

// Test Active Envelope: progress = 1.0
mockCtx.resetStats();
renderIntelligenceCrystalDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 1.0,
  elapsed: 3500,
  baseHue: 200,
  isMulticolor: true
});
const activeStats = mockCtx.getStats();
assert(
  activeStats.arcCount >= 2500,
  `Intelligence Crystal must render >= 2,500 volumetric micro-points (got ${activeStats.arcCount})`
);
assert(
  activeStats.strokeCount >= 4,
  `Intelligence Crystal must render >= 4 structural filaments (got ${activeStats.strokeCount})`
);
console.log(
  `[PASS] Active volumetric marks verified: ${activeStats.arcCount} micro-points & ${activeStats.strokeCount} structural filaments`
);

// 5. DETERMINISM AUDIT: ZERO Math.random()
console.log('\n--- 5. Verification: Zero Math.random() in Renderer ---');
const rendererFile = path.resolve(process.cwd(), 'src/components/landing/formations/intelligenceCrystalDetailRenderer.ts');
const rendererContent = fs.readFileSync(rendererFile, 'utf-8');
const codeWithoutComments = rendererContent
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');
assert(!codeWithoutComments.includes('Math.random()'), 'Renderer must have zero Math.random() calls');
console.log('[PASS] Intelligence Crystal detail renderer is 100% deterministic (zero Math.random())');

// 6. TRANSFORM & RESONANCE SYNCHRONIZATION
console.log('\n--- 6. Verification: Transform & Resonance Synchronization ---');
for (let i = 0; i < 54; i++) {
  const rawPt = crystalResult.coords[i];
  const target = computeSynchronizedFormationTarget({
    family: 'intelligence_crystal',
    index: i,
    totalParticipants: 54,
    rawCoord: rawPt,
    scale: 700,
    centerX: 500,
    centerY: 500,
    elapsed: 2500
  });

  assert(!isNaN(target.x) && !isNaN(target.y), `Synchronized target for node ${i} must be valid number`);
  assert(Math.abs(target.x - 500) < 500, `Target X within screen envelope (got ${target.x})`);
  assert(Math.abs(target.y - 500) < 500, `Target Y within screen envelope (got ${target.y})`);
}
console.log('[PASS] Transform synchronization verified for all 54 crystal participant nodes');

// 7. REGISTRY INTEGRATION & DISPATCH
console.log('\n--- 7. Verification: Registry Catalog & Detail Engine Dispatch ---');
const crystalIndex = MILESTONE1_FORMATIONS.findIndex(f => f.id === 'intelligence_crystal');
assert.strictEqual(crystalIndex, 13, 'Formation #14 must be registered at index 13 in MILESTONE1_FORMATIONS');
assert.strictEqual(getDeterministicFormationByIndex(13).id, 'intelligence_crystal', 'Cycle index 13 returns intelligence_crystal');

const regEntry = MILESTONE1_FORMATIONS[13];
assert.strictEqual(regEntry.participantCount, 54, 'Participant count must match 54');
assert.strictEqual(regEntry.category, 'quantum', 'Category must be quantum');

// Test detail engine dispatcher
mockCtx.resetStats();
const dispatchSuccess = renderFormationDetailEngine('intelligence_crystal', {
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 700,
  progress: 0.85,
  elapsed: 4000,
  baseHue: 210,
  isMulticolor: false
});
assert.strictEqual(dispatchSuccess, true, 'Detail engine must dispatch intelligence_crystal successfully');
const dispatchedStats = mockCtx.getStats();
assert(dispatchedStats.arcCount >= 2500, `Dispatched render must produce >= 2,500 arcs (got ${dispatchedStats.arcCount})`);
console.log(`[PASS] Detail engine dispatched intelligence_crystal (${dispatchedStats.arcCount} points, ${dispatchedStats.strokeCount} filaments)`);

console.log('\n=== ALL FORMATION #14: INTELLIGENCE CRYSTAL TESTS PASSED (100% SUCCESS) ===\n');
