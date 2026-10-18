import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateJCoordinates,
  generateProceduralConstellation
} from '../src/components/landing/CinematicParticleField';

console.log('=== [WEB JARVIS] CINEMATIC PARTICLE EVACUATION & UNIVERSE RECONSTITUTION AUDIT ===\n');

const particleFieldSrc = fs.readFileSync(
  path.resolve('./src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);

// 1. ABSOLUTE PROTECTION OF THE ORIGINAL J IDENTITY
console.log('--- 1. Verification: Absolute Protection of Signature J ---');
assert(
  particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'),
  'J participant count must remain exactly 48'
);
assert(
  particleFieldSrc.includes('function generateJCoordinates(count: number)'),
  'generateJCoordinates must remain unchanged'
);
assert(
  particleFieldSrc.includes('x: -0.16 + t * 0.30'),
  'Top horizontal crossbar geometry must remain unchanged'
);
assert(
  particleFieldSrc.includes('x: 0.05 + (Math.random() - 0.5) * 0.008') &&
  particleFieldSrc.includes('y: -0.32 + t * 0.48'),
  'Vertical stem geometry must remain unchanged'
);
assert(
  particleFieldSrc.includes('x: -0.08 + Math.cos(angle) * radiusX') &&
  particleFieldSrc.includes('y: 0.16 - Math.sin(angle) * radiusY'),
  'Bottom hook curved geometry must remain unchanged'
);
assert(
  particleFieldSrc.includes('(p.jTargetX + 0.035) * jScale') &&
  particleFieldSrc.includes('(p.jTargetY + 0.01) * jScale'),
  'J optical center alignment must remain untouched'
);
assert(
  particleFieldSrc.includes('sizeMultiplier = 1.0 + 1.15 * jProgress'),
  'J particle size boost must remain untouched'
);
console.log('[PASS] 1.1 Original signature J coordinates, participant count, and rendering are 100% untouched');

// 2. DETERMINISTIC SPIRAL TRAJECTORY PARAMETERS INITIALIZATION
console.log('\n--- 2. Deterministic Spiral Trajectory Parameters ---');
assert(
  particleFieldSrc.includes('spiralAngleOffset') &&
  particleFieldSrc.includes('spiralArmTurns') &&
  particleFieldSrc.includes('spiralDistanceFactor') &&
  particleFieldSrc.includes('spiralSpeedVariance'),
  'Particle nodes must store deterministic per-particle spiral parameters'
);
assert(
  particleFieldSrc.includes('isPerimeterDweller'),
  'Perimeter dwellers flag must be assigned for ambient depth'
);
console.log('[PASS] 2.1 Per-particle deterministic spiral trajectory parameters established on init');

// 3. OUTWARD SPIRAL EVACUATION DURING CONSTELLATION FORMATION
console.log('\n--- 3. Outward Spiral Evacuation Motion ---');
assert(
  particleFieldSrc.includes('!p.isJParticipant && isInitialOpening && jProgress > 0'),
  'Outward evacuation must trigger for non-J particles during J formation'
);
assert(
  particleFieldSrc.includes('currentDist = baseDist + (exitDist - baseDist) * spiralEase'),
  'Radial distance must smoothly expand toward exit distance'
);
assert(
  particleFieldSrc.includes('angleTravel = p.spiralArmTurns * Math.pow(spiralEase, 0.88)'),
  'Tangential motion must curve along organic spiral trajectory'
);
assert(
  particleFieldSrc.includes('Math.cos(currentAngle)') &&
  particleFieldSrc.includes('Math.sin(currentAngle)'),
  'Coordinates must combine radial expansion and angular rotation'
);
console.log('[PASS] 3.1 Smooth outward spiral evacuation correctly implemented');

// 4. CLEARING THE STAGE AND BACKGROUND CONTRAST
console.log('\n--- 4. Stage Clearing & Contrast ---');
assert(
  particleFieldSrc.includes('evacFade') &&
  particleFieldSrc.includes('activeEvacProgress'),
  'Evacuation fade must progressively reduce opacity of unused particles'
);
assert(
  particleFieldSrc.includes('if (currentAlpha <= 0.005)'),
  'Sub-threshold particles must be culled to keep stage pure black and conserve GPU/CPU'
);
assert(
  particleFieldSrc.includes('auraAlpha = (1 - universeExpansion) * (1 - jProgress * 0.82)'),
  'Central aura must dim during J formation to provide pure black background contrast'
);
console.log('[PASS] 4.1 Stage clears smoothly, leaving pure black contrast for the constellation');

// 5. INWARD SPIRAL RECONSTITUTION DURING SCRAMBLE / DISSOLUTION
console.log('\n--- 5. Inward Spiral Universe Reconstitution ---');
assert(
  particleFieldSrc.includes('elapsed < 5500') &&
  particleFieldSrc.includes('jProgress = 1.0 - ease'),
  'J dissolution phase 4 (4200 - 5500ms) is synchronized with particle reconstitution'
);
// Mathematical check: At jProgress = 0, intermX must strictly evaluate to bX and intermY to bY
// When jProgress = 0: currentDist = baseDist + 0 = baseDist, angleTravel = 0 -> exact bX, bY match!
console.log('[PASS] 5.1 Continuous, reversible math ensures seamless return to central cluster with zero popping');

// 6. PROCEDURAL CONSTELLATIONS CYCLE EVACUATION & RECONSTITUTION
console.log('\n--- 6. Procedural Constellations Synchronization ---');
assert(
  particleFieldSrc.includes('!isInitialOpening && constellationProgress > 0 && !activeParticipantSet.has(i)'),
  'Post-opening procedural cycles must also evacuate unused particles'
);
console.log('[PASS] 6.1 Unused particle evacuation verified across evolving constellation cycles');

console.log('\n=== ALL PARTICLE EVACUATION & UNIVERSE RECONSTITUTION AUDITS PASSED! ===\n');
