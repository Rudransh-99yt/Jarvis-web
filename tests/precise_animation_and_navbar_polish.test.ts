import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateJCoordinates,
  generateProceduralConstellation,
  PROCEDURAL_CONSTELLATION_FAMILIES
} from '../src/components/landing/CinematicParticleField';

console.log('=== [WEB JARVIS] PRECISE ANIMATION & NAVBAR POLISH AUDIT ===\n');

const particleFieldSrc = fs.readFileSync(
  path.resolve('./src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);
const headerSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicHeader.tsx'),
  'utf-8'
);

// 1. ABSOLUTE PRESERVATION OF THE SIGNATURE J
console.log('--- 1. Absolute Preservation of Signature J Pattern ---');
assert(
  particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'),
  'J participant count must remain exactly 48'
);
assert(
  particleFieldSrc.includes('x: -0.16 + t * 0.30'),
  'Crossbar geometry must be preserved byte-for-byte'
);
assert(
  particleFieldSrc.includes('x: 0.05 + (Math.random() - 0.5) * 0.008') &&
  particleFieldSrc.includes('y: -0.32 + t * 0.48'),
  'Stem geometry must be preserved byte-for-byte'
);
assert(
  particleFieldSrc.includes('x: -0.08 + Math.cos(angle) * radiusX') &&
  particleFieldSrc.includes('y: 0.16 - Math.sin(angle) * radiusY'),
  'Curved lower hook geometry must be preserved byte-for-byte'
);
const coords = generateJCoordinates(48);
assert.strictEqual(coords.length, 48, 'generateJCoordinates must return 48 points');
console.log('[PASS] 1.1 Signature J pattern, geometry, and participant identities are 100% untouched');

// 2. EXCLUSION OF SIGNATURE J FROM PROCEDURAL CONSTELLATION SELECTION
console.log('\n--- 2. Signature J Excluded From Procedural Cycles ---');
assert(
  particleFieldSrc.includes('EXCLUDED_PATTERNS') &&
  particleFieldSrc.includes('PROCEDURAL_CONSTELLATION_FAMILIES'),
  'Procedural selection must explicitly exclude signature J from recurring cycles'
);
// Test 50 procedural generations: NONE must ever be a J or contain J coordinates
for (let i = 0; i < 50; i++) {
  const constellation = generateProceduralConstellation(360, 1920, 1080);
  assert(
    constellation.family !== 'j' &&
    constellation.family !== 'signature' &&
    constellation.family !== 'signature_j',
    `Procedural constellation must never be signature J. Got: ${constellation.family}`
  );
  assert(
    PROCEDURAL_CONSTELLATION_FAMILIES.includes(constellation.family as any),
    `Family must be in allowed procedural pool. Got: ${constellation.family}`
  );
}
console.log('[PASS] 2.1 50/50 procedural cycles confirmed to never select or repeat signature J');

// 3. MULTI-ARM COSMIC SPIRALS
console.log('\n--- 3. Multi-Arm Cosmic Spirals In Procedural Pool ---');
assert(
  particleFieldSrc.includes('arms = Math.random() > 0.5 ? 2 : 3'),
  'Procedural spiral must use multi-arm galaxy geometry preventing single-stroke hook appearance'
);
console.log('[PASS] 3.1 Procedural spirals confirmed to use balanced multi-arm galaxy formations');

// 4. SCROLL-RESPONSIVE DYNAMIC EXPANSION (COMPACT AT TOP -> GROWS NATURALLY)
console.log('\n--- 4. Scroll-Responsive Navbar Growth ---');
assert(
  headerSrc.includes('SCROLL_EXPANSION_THRESHOLD') &&
  headerSrc.includes('expansion = prefersReducedMotion ? 1 : scrollRatio * scrollRatio * (3 - 2 * scrollRatio)'),
  'Navbar must smoothly interpolate expansion using smoothstep easing'
);
assert(
  headerSrc.includes('currentMaxWidth') &&
  headerSrc.includes('currentHeight'),
  'Navbar must dynamically scale both max-width and height based on scroll expansion'
);
assert(
  headerSrc.includes('rounded-2xl'),
  'Navbar must feature smoothly curved rounded-2xl corners'
);
console.log('[PASS] 4.1 Scroll-responsive compact-at-top to expanded-on-scroll verified');

// 5. REMOVAL OF ARCHITECTURE FROM NAVBAR
console.log('\n--- 5. Removal of "Architecture" From Landing Navbar ---');
assert(
  !headerSrc.includes('>Architecture<'),
  'Architecture button must not exist in desktop or mobile navbar'
);
assert(
  headerSrc.includes('handleNavClick(\'vision\')') &&
  headerSrc.includes('handleNavClick(\'ecosystem\')'),
  'Vision and Ecosystem navigation items must be preserved'
);
console.log('[PASS] 5.1 Architecture removed from navbar for minimal initial viewport; Vision and Ecosystem preserved');

console.log('\n=== ALL PRECISE ANIMATION & NAVBAR POLISH AUDITS PASSED! ===\n');
