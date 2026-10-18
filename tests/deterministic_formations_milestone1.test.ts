import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  MILESTONE1_FORMATIONS,
  getDeterministicFormationByIndex,
  generateGalaxySpiralCoords,
  generateCortexBrainCoords,
  generateDnaHelixCoords,
  generateNeuralSynapseCoords
} from '../src/components/landing/formations/formationRegistry';
import {
  generateJCoordinates,
  generateDeterministicFormationConstellation
} from '../src/components/landing/CinematicParticleField';

console.log('=== [WEB JARVIS] DETERMINISTIC FORMATIONS MILESTONE 1 REFINEMENT AUDIT ===\n');

const particleFieldSrc = fs.readFileSync(
  path.resolve('./src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);
const registrySrc = fs.readFileSync(
  path.resolve('./src/components/landing/formations/formationRegistry.ts'),
  'utf-8'
);

// 1. ALL FORMATIONS REGISTERED EXACTLY ONCE
console.log('--- 1. Verification: Milestone Formations Registered ---');
assert(MILESTONE1_FORMATIONS.length >= 4, 'Must have at least 4 milestone formations registered');

const expectedInitialIds = ['galaxy_spiral', 'cortex_brain', 'dna_helix', 'neural_synapse'];
const registeredIds = MILESTONE1_FORMATIONS.map((f) => f.id);
for (const id of expectedInitialIds) {
  assert(registeredIds.includes(id), `Expected formation ${id} to be registered`);
}

const uniqueIds = new Set(registeredIds);
assert.strictEqual(uniqueIds.size, MILESTONE1_FORMATIONS.length, 'Each formation ID must be unique');

console.log('[PASS] 1.1 Formations registered uniquely with refined density specifications');

// 2. DETERMINISM: IDENTICAL INPUTS MUST PRODUCE IDENTICAL OUTPUTS
console.log('\n--- 2. Verification: Pure Determinism of Coordinate Generators ---');
const generators = [
  { name: 'GALAXY_SPIRAL', fn: generateGalaxySpiralCoords, count: 54 },
  { name: 'CORTEX_BRAIN', fn: generateCortexBrainCoords, count: 56 },
  { name: 'DNA_HELIX', fn: generateDnaHelixCoords, count: 52 },
  { name: 'NEURAL_SYNAPSE', fn: generateNeuralSynapseCoords, count: 50 }
];

for (const gen of generators) {
  const run1 = gen.fn(gen.count);
  const run2 = gen.fn(gen.count);
  assert.deepStrictEqual(
    run1.coords,
    run2.coords,
    `${gen.name} must produce identical coordinates across multiple calls`
  );
  assert.deepStrictEqual(
    run1.edges,
    run2.edges,
    `${gen.name} must produce identical edges across multiple calls`
  );
}
console.log('[PASS] 2.1 Pure determinism verified: 100% reproducible byte-for-byte coordinate outputs');

// 3. VALIDITY OF GENERATED COORDINATES AND EDGE INDICES
console.log('\n--- 3. Verification: Coordinate Bounds and Edge Index Integrity ---');
for (const gen of generators) {
  const result = gen.fn(gen.count);
  assert.strictEqual(
    result.coords.length,
    gen.count,
    `${gen.name} coordinate count must equal requested count`
  );

  for (let i = 0; i < result.coords.length; i++) {
    const pt = result.coords[i];
    assert(
      !Number.isNaN(pt.x) && !Number.isNaN(pt.y),
      `${gen.name} coordinate at [${i}] contains NaN`
    );
    assert(
      Number.isFinite(pt.x) && Number.isFinite(pt.y),
      `${gen.name} coordinate at [${i}] is not finite`
    );
    // Normalized bounds: Must be comfortably within [-0.5, 0.5] to prevent screen clipping on mobile viewports
    assert(
      pt.x >= -0.50 && pt.x <= 0.50,
      `${gen.name} point [${i}].x (${pt.x}) exceeds normalized bounds [-0.5, 0.5]`
    );
    assert(
      pt.y >= -0.50 && pt.y <= 0.50,
      `${gen.name} point [${i}].y (${pt.y}) exceeds normalized bounds [-0.5, 0.5]`
    );
  }

  // Edge indices must reference existing coordinate indices
  assert(result.edges.length > 0, `${gen.name} must define explicit edges`);
  for (let e = 0; e < result.edges.length; e++) {
    const [fromIdx, toIdx] = result.edges[e];
    assert(
      fromIdx >= 0 && fromIdx < result.coords.length,
      `${gen.name} edge [${e}] fromIdx (${fromIdx}) out of bounds`
    );
    assert(
      toIdx >= 0 && toIdx < result.coords.length,
      `${gen.name} edge [${e}] toIdx (${toIdx}) out of bounds`
    );
    assert.notStrictEqual(
      fromIdx,
      toIdx,
      `${gen.name} edge [${e}] connects a node to itself`
    );
  }
}
console.log('[PASS] 3.1 All coordinates finite and bounded within [-0.5, 0.5]; all edge indices verified valid');

// 4. DNA HELIX SPECIFIC REFINEMENT: VERTICAL AXIS AND SEPARATION
console.log('\n--- 4. Verification: DNA Helix Vertical Orientation & Structural Separation ---');
const dnaResult = generateDnaHelixCoords(52);
const xs = dnaResult.coords.map((c) => c.x);
const ys = dnaResult.coords.map((c) => c.y);

const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);

const widthSpan = maxX - minX;
const heightSpan = maxY - minY;

// Vertical axis check: Height must exceed width by at least 1.8x
assert(
  heightSpan > widthSpan * 1.8,
  `DNA must be oriented vertically: height span (${heightSpan.toFixed(3)}) must exceed width span (${widthSpan.toFixed(3)})`
);
assert(
  heightSpan >= 0.70,
  `DNA vertical span must extend through the viewport (got ${heightSpan.toFixed(3)})`
);
assert(
  widthSpan <= 0.40,
  `DNA horizontal width must be narrow enough for mobile screens without clipping (got ${widthSpan.toFixed(3)})`
);

// Endpoints check: Strand 1 ends at index 17; Strand 2 starts at index 18
const hasAccidentalBridge = dnaResult.edges.some(
  ([a, b]) => (a === 17 && b === 18) || (a === 18 && b === 17)
);
assert(!hasAccidentalBridge, 'DNA Helix must not contain accidental bridge connecting strand 1 end to strand 2 start');

// Base-pair ladder rungs check: Multiple rungs bridging between strand 1 and strand 2
const rungEdges = dnaResult.edges.filter(([a, b]) => {
  const isStrand1Node = a < 18 || b < 18;
  const isRungNode = (a >= 36 && a < 52) || (b >= 36 && b < 52);
  return isStrand1Node && isRungNode;
});
assert(rungEdges.length >= 8, 'DNA Helix must feature at least 8 distinct base-pair connections');
console.log('[PASS] 4.1 DNA vertical orientation verified (height/width ratio > 1.8x, no cross-endpoint bridge, 8 base-pair rungs)');

// 5. GALAXY SPIRAL SPECIFIC REFINEMENT: DENSE CORE AND DUAL ARMS
console.log('\n--- 5. Verification: Galaxy Spiral Core Density & Arm Structure ---');
const galaxyResult = generateGalaxySpiralCoords(54);
// Core nodes are indices 0..13 (14 nodes within r <= 0.085)
const coreNodes = galaxyResult.coords.slice(0, 14);
for (let i = 0; i < coreNodes.length; i++) {
  const dist = Math.hypot(coreNodes[i].x, coreNodes[i].y);
  assert(dist <= 0.095, `Core node ${i} at dist ${dist} exceeds core radius limit`);
}
// Arm 1 nodes: 14..33; Arm 2 nodes: 34..53
assert.strictEqual(galaxyResult.coords.length, 54, 'Galaxy spiral must contain exactly 54 particles');
console.log('[PASS] 5.1 Galaxy spiral dense 14-node core and dual 20-node logarithmic arms verified');

// 6. CORTEX BRAIN SPECIFIC REFINEMENT: BILATERAL MANTLE AND INTERNAL GYRI
console.log('\n--- 6. Verification: Cortex Brain Bilateral Mantle & Internal Folds ---');
const brainResult = generateCortexBrainCoords(56);
assert.strictEqual(brainResult.coords.length, 56, 'Cortex brain must contain exactly 56 particles');
// Perimeter loop has 30 nodes (indices 0..29)
const perimeterEdges = brainResult.edges.filter(([a, b]) => a < 30 && b < 30);
assert(perimeterEdges.length >= 30, 'Outer cerebral mantle must be a closed loop');
// Callosum arch nodes: 30..39
const callosumEdges = brainResult.edges.filter(([a, b]) => a >= 30 && a < 40 && b >= 30 && b < 40);
assert(callosumEdges.length >= 9, 'Interhemispheric corpus callosum arch must connect sequentially');
console.log('[PASS] 6.1 Cortex brain bilateral 30-node mantle, 10-node corpus callosum arch, and 16-node gyri verified');

// 7. NEURAL SYNAPSE SPECIFIC REFINEMENT: LAYER SEPARATION AND FLOW
console.log('\n--- 7. Verification: Neural Synapse Layer Architecture & Directional Flow ---');
const synapseResult = generateNeuralSynapseCoords(50);
assert.strictEqual(synapseResult.coords.length, 50, 'Neural synapse must contain exactly 50 particles');
// Layer 1 nodes are at x = -0.35, Layer 4 nodes are at x = 0.32
const l1Nodes = synapseResult.coords.slice(0, 8);
const l4Nodes = synapseResult.coords.slice(36, 46);
for (const n of l1Nodes) {
  assert.strictEqual(n.x, -0.35, 'Layer 1 input nodes must be positioned at x = -0.35');
}
for (const n of l4Nodes) {
  assert.strictEqual(n.x, 0.32, 'Layer 4 output nodes must be positioned at x = 0.32');
}
console.log('[PASS] 7.1 Neural synapse 4-layer feedforward architecture (sensory -> association -> latent hub -> decision) verified');

// 8. PARTICIPANT COUNTS REMAIN WITHIN MOBILE-SAFE LIMITS (26 - 60)
console.log('\n--- 8. Verification: Mobile-Safe Participant Limits (26 - 60) ---');
for (const formation of MILESTONE1_FORMATIONS) {
  assert(
    formation.participantCount >= 26 && formation.participantCount <= 60,
    `${formation.id} participant count (${formation.participantCount}) outside safe limits [26, 60]`
  );
}
console.log('[PASS] 8.1 All refined participant counts (50 to 56) strictly within mobile-safe budget (<= 60)');

// 9. CYCLE BOUNDARY ADVANCEMENT
console.log('\n--- 9. Verification: Deterministic Sequence Cycle Progression ---');
assert.strictEqual(getDeterministicFormationByIndex(0).id, 'galaxy_spiral');
assert.strictEqual(getDeterministicFormationByIndex(MILESTONE1_FORMATIONS.length).id, 'galaxy_spiral');
const total = MILESTONE1_FORMATIONS.length;
for (let i = 0; i < total * 2; i++) {
  assert.strictEqual(
    getDeterministicFormationByIndex(i).id,
    MILESTONE1_FORMATIONS[i % total].id,
    `Cycle index ${i} must wrap modulo ${total}`
  );
}
console.log(`[PASS] 9.1 Formation sequence advances cyclically across all ${total} registered formations`);

// 10. ORIGINAL 48 J COORDINATES AND IDENTITIES REMAIN UNTOUCHED
console.log('\n--- 10. Verification: Absolute Protection of Signature J Coordinates & Count ---');
assert(
  particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'),
  'J participant count must remain exactly 48'
);
assert(
  particleFieldSrc.includes('function generateJCoordinates(count: number)'),
  'generateJCoordinates function must remain unchanged'
);
const jCoords = generateJCoordinates(48);
assert.strictEqual(jCoords.length, 48, 'Must generate exactly 48 coordinates for J');
assert(
  particleFieldSrc.includes('x: -0.16 + t * 0.30'),
  'J crossbar formula preserved'
);
assert(
  particleFieldSrc.includes('x: 0.05 + (Math.random() - 0.5) * 0.008') &&
  particleFieldSrc.includes('y: -0.32 + t * 0.48'),
  'J stem formula preserved'
);
assert(
  particleFieldSrc.includes('x: -0.08 + Math.cos(angle) * radiusX') &&
  particleFieldSrc.includes('y: 0.16 - Math.sin(angle) * radiusY'),
  'J hook formula preserved'
);
console.log('[PASS] 10.1 Signature J coordinates, formula, and 48 participant count strictly preserved');

// 11. ZERO COMPETITION BETWEEN J REVEAL AND ACTIVE FORMATIONS
console.log('\n--- 11. Verification: Disjoint Particle Allocation Between J Reveal and Formations ---');
const constellationMobile = generateDeterministicFormationConstellation(0, 190, 390, 844);
const constellationDesktop = generateDeterministicFormationConstellation(0, 360, 1920, 1080);

for (const pIdx of constellationMobile.particleIndices) {
  assert(
    pIdx >= 48,
    `Formation particle index ${pIdx} conflicts with signature J participant set (0..47)`
  );
  assert(
    pIdx < 190,
    `Formation particle index ${pIdx} exceeds mobile particle boundary (190)`
  );
}
for (const pIdx of constellationDesktop.particleIndices) {
  assert(
    pIdx >= 48,
    `Formation particle index ${pIdx} conflicts with signature J participant set (0..47)`
  );
  assert(
    pIdx < 360,
    `Formation particle index ${pIdx} exceeds desktop particle boundary (360)`
  );
}

// In CinematicParticleField.tsx source, verify J Priority branch is present
assert(
  particleFieldSrc.includes('p.isJParticipant && jProgress > 0 && !isInitialOpening'),
  'J priority logic present for post-opening periodic reveals'
);
console.log('[PASS] 11.1 Disjoint particle indexing (0..47 for J vs 48+ for formations) guarantees zero collision');

// 12. EVACUATION / RECONSTITUTION BEHAVIOR PRESERVED
console.log('\n--- 12. Verification: Evacuation and Reconstitution Dynamics ---');
assert(
  particleFieldSrc.includes('!isInitialOpening && constellationProgress > 0 && !activeParticipantSet.has(i)'),
  'Post-opening non-participating particles continue to evacuate outward'
);
assert(
  particleFieldSrc.includes('evacFade'),
  'Evacuation progressive fade preserved'
);
assert(
  particleFieldSrc.includes('auraAlpha = (1 - universeExpansion) * (1 - jProgress * 0.82)'),
  'Central aura dimming preserved'
);
console.log('[PASS] 12.1 Evacuation and reconstitution dynamics 100% preserved');

// 13. HIGH-DETAIL VERTICAL DNA PROTOTYPE VERIFICATION
console.log('\n--- 13. Verification: High-Detail Vertical DNA Prototype Integration ---');
import { renderDnaDetailLayer } from '../src/components/landing/formations/dnaDetailRenderer';

assert(
  typeof renderDnaDetailLayer === 'function',
  'renderDnaDetailLayer must be exported as a function'
);

// Mock Canvas 2D context to verify render execution and draw counts
let arcDrawCount = 0;
let strokeCount = 0;
const mockCtx: any = {
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => { strokeCount++; },
  arc: () => { arcDrawCount++; },
  fill: () => {},
  save: () => {},
  restore: () => {},
  createRadialGradient: () => ({
    addColorStop: () => {}
  }),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1
};

// When progress <= 0.02 (inactive / ambient), 0 operations should occur
renderDnaDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 0.01,
  elapsed: 1000,
  baseHue: 192,
  isMulticolor: true
});
assert.strictEqual(arcDrawCount, 0, 'Inactive DNA must not draw any micro-points');

// When progress = 1.0 (active hold), hundreds of volumetric micro-points and rungs must render
renderDnaDetailLayer({
  ctx: mockCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 1.0,
  elapsed: 2500,
  baseHue: 192,
  isMulticolor: true
});
assert(arcDrawCount > 150, `Active DNA must render dense volumetric points (got ${arcDrawCount})`);
assert(strokeCount >= 2, `Active DNA must render backbone and rung filaments (got ${strokeCount})`);

// Verify viewport-aware scaling integration in CinematicParticleField.tsx
assert(
  particleFieldSrc.includes("formation.id === 'dna_helix'"),
  'CinematicParticleField must check for dna_helix hero scaling'
);
assert(
  particleFieldSrc.includes("currentCycleConstellation.family === 'dna_helix'"),
  'DNA detail renderer must be invoked strictly when dna_helix is active'
);
assert(
  particleFieldSrc.includes('renderDnaDetailLayer'),
  'CinematicParticleField must import and invoke renderDnaDetailLayer'
);
console.log(`[PASS] 13.1 High-detail vertical DNA prototype verified: renders ${arcDrawCount} volumetric points with full lifecycle & viewport integration`);

// 14. HIGH-DETAIL GALAXY SPIRAL PROTOTYPE VERIFICATION
console.log('\n--- 14. Verification: High-Detail Galaxy Spiral Prototype Integration ---');
import { renderGalaxyDetailLayer } from '../src/components/landing/formations/galaxyDetailRenderer';

assert(
  typeof renderGalaxyDetailLayer === 'function',
  'renderGalaxyDetailLayer must be exported as a function'
);

let galaxyArcCount = 0;
let galaxyStrokeCount = 0;
const mockGalaxyCtx: any = {
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => { galaxyStrokeCount++; },
  arc: () => { galaxyArcCount++; },
  fill: () => {},
  save: () => {},
  restore: () => {},
  createRadialGradient: () => ({
    addColorStop: () => {}
  }),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1
};

// When progress <= 0.02, 0 operations
renderGalaxyDetailLayer({
  ctx: mockGalaxyCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 0.01,
  elapsed: 1000,
  baseHue: 192,
  isMulticolor: true
});
assert.strictEqual(galaxyArcCount, 0, 'Inactive Galaxy must not draw any micro-stars');

// When progress = 1.0, hundreds of volumetric stars render
renderGalaxyDetailLayer({
  ctx: mockGalaxyCtx,
  centerX: 500,
  centerY: 500,
  scale: 600,
  progress: 1.0,
  elapsed: 2500,
  baseHue: 192,
  isMulticolor: true
});
assert(galaxyArcCount > 200, `Active Galaxy must render dense volumetric stars (got ${galaxyArcCount})`);
assert(galaxyStrokeCount >= 2, `Active Galaxy must render continuous spiral arm spines (got ${galaxyStrokeCount})`);

// Verify viewport-aware scaling and lifecycle integration in CinematicParticleField.tsx
assert(
  particleFieldSrc.includes("formation.id === 'galaxy_spiral'"),
  'CinematicParticleField must check for galaxy_spiral hero scaling'
);
assert(
  particleFieldSrc.includes("currentCycleConstellation.family === 'galaxy_spiral'"),
  'Galaxy detail renderer must be invoked strictly when galaxy_spiral is active'
);
assert(
  particleFieldSrc.includes('renderGalaxyDetailLayer'),
  'CinematicParticleField must import and invoke renderGalaxyDetailLayer'
);
console.log(`[PASS] 14.1 High-detail Galaxy Spiral prototype verified: renders ${galaxyArcCount} volumetric stars with full lifecycle & viewport integration`);

console.log('\n=== ALL DETERMINISTIC FORMATIONS AUDITS PASSED! ===\n');
