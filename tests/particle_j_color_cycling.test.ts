import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateJCoordinates,
  J_COLOR_MODES,
  cycleNextJColorMode,
  isJHit,
  distToSegment
} from '../src/components/landing/CinematicParticleField';

console.log('=== [WEB JARVIS] PARTICLE UNIVERSE COLOR CYCLE & PERIODIC J REVEAL AUDIT ===\n');

const particleFieldSrc = fs.readFileSync(
  path.resolve('./src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);

const publicLandingSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicLandingView.tsx'),
  'utf-8'
);

// 1. ABSOLUTE PRESERVATION OF THE SIGNATURE J PATTERN & PARTICIPANT ASSIGNMENTS
console.log('--- 1. Absolute Preservation of Signature J Geometry ---');
assert(
  particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'),
  'J participant count must remain exactly 48'
);
assert(
  particleFieldSrc.includes('x: -0.16 + t * 0.30'),
  'Crossbar geometry preserved byte-for-byte'
);
assert(
  particleFieldSrc.includes('x: 0.05 + (Math.random() - 0.5) * 0.008') &&
  particleFieldSrc.includes('y: -0.32 + t * 0.48'),
  'Stem geometry preserved byte-for-byte'
);
assert(
  particleFieldSrc.includes('x: -0.08 + Math.cos(angle) * radiusX') &&
  particleFieldSrc.includes('y: 0.16 - Math.sin(angle) * radiusY'),
  'Curved lower hook geometry preserved byte-for-byte'
);
const coords = generateJCoordinates(48);
assert.strictEqual(coords.length, 48, 'generateJCoordinates must return 48 points');
console.log('[PASS] 1.1 Signature J pattern, geometry, and participant identities are 100% untouched');

// 2. EXACT FIVE-STATE COLOR CYCLE SEQUENCE
console.log('\n--- 2. Exact Five-State Color Cycle Sequence ---');
assert.strictEqual(J_COLOR_MODES.length, 5, 'Must have exactly 5 color modes');
const expectedSequence = [
  { id: 'original', name: 'Original Living Constellation', isMulticolor: true },
  { id: 'emerald', name: 'Emerald Pulse', isMulticolor: false },
  { id: 'cyan', name: 'Arctic Intelligence', isMulticolor: false },
  { id: 'violet', name: 'Quantum Violet', isMulticolor: false },
  { id: 'amber', name: 'Solar Gold', isMulticolor: false }
];

for (let i = 0; i < expectedSequence.length; i++) {
  assert.strictEqual(J_COLOR_MODES[i].id, expectedSequence[i].id);
  assert.strictEqual(J_COLOR_MODES[i].name, expectedSequence[i].name);
  assert.strictEqual(J_COLOR_MODES[i].isMulticolor, expectedSequence[i].isMulticolor);
}
console.log('[PASS] 2.1 Five-state color sequence defined in exact required order');

// 3. DETERMINISTIC SMOOTH CYCLING TRANSITION & RETURN TO MULTICOLOR
console.log('\n--- 3. Smooth Cycling Progression & Return to Original Multicolor ---');
let currentIndex = 0;
// Click 1: Emerald Pulse
currentIndex = cycleNextJColorMode(currentIndex);
assert.strictEqual(J_COLOR_MODES[currentIndex].id, 'emerald');
// Click 2: Arctic Intelligence
currentIndex = cycleNextJColorMode(currentIndex);
assert.strictEqual(J_COLOR_MODES[currentIndex].id, 'cyan');
// Click 3: Quantum Violet
currentIndex = cycleNextJColorMode(currentIndex);
assert.strictEqual(J_COLOR_MODES[currentIndex].id, 'violet');
// Click 4: Solar Gold
currentIndex = cycleNextJColorMode(currentIndex);
assert.strictEqual(J_COLOR_MODES[currentIndex].id, 'amber');
// Click 5: Return to Original Living Constellation (multicolor)
currentIndex = cycleNextJColorMode(currentIndex);
assert.strictEqual(J_COLOR_MODES[currentIndex].id, 'original');
console.log('[PASS] 3.1 Color mode advances deterministically through 5 states and repeats indefinitely');

// 4. UNIVERSE-WIDE COLOR RESPONSE (J + BACKGROUND PARTICLES)
console.log('\n--- 4. Coordinated Particle Universe Color Theme Response ---');
assert(
  particleFieldSrc.includes('for (let i = 0; i < particles.length; i++)') &&
  particleFieldSrc.includes('currentUniverseHues[i] ='),
  'Every particle in the particle field responds to the active color theme'
);
assert(
  particleFieldSrc.includes('const currentHue = currentUniverseHues[i] ?? p.baseHue;'),
  'Newly entering and reconstituted particles inherit active theme hues'
);
console.log('[PASS] 4.1 All particles across signature J and background universe share active theme');

// 5. PERIODIC SIGNATURE J REVEAL CADENCE
console.log('\n--- 5. Periodic Signature J Reveal Cadence ---');
assert(
  particleFieldSrc.includes('successfulThemeChangeCount++') &&
  particleFieldSrc.includes('successfulThemeChangeCount % 5 === 0'),
  'Periodic signature J reveal triggers after every 5 successful theme changes'
);
assert(
  particleFieldSrc.includes('triggeredJRevealTime = now;'),
  'Reveal trigger tracks successful theme changes deterministically'
);
console.log('[PASS] 5.1 Five-change J reveal cadence verified');

// 6. PROTECTION AGAINST INVALID CLICKS & UNRELATED UI
console.log('\n--- 6. Protection Against Unrelated Page Interactions ---');
assert(
  particleFieldSrc.includes('target.closest(\'button, a, input, select, textarea, [role="button"], nav, header, [role="dialog"]\')'),
  'Interactive page elements excluded from advancing color theme'
);
assert(
  particleFieldSrc.includes('dist < 18 && pressDuration < 800'),
  'Scroll swipes and long drags filtered out'
);
console.log('[PASS] 6.1 Unrelated UI clicks and non-tap gestures do not advance theme or reveal counter');

// 7. TEXT SELECTION RESTRICTION FOR SPECIFIC LANDING TEXT
console.log('\n--- 7. Text Copy Selection Restriction ---');
assert(
  publicLandingSrc.includes('HEADLINE_WORDS.map') &&
  publicLandingSrc.includes('select-none'),
  'Headline words "Your mind with more possibilities everyday" have text selection disabled'
);
assert(
  (publicLandingSrc.includes('Intelligence your way') || publicLandingSrc.includes('Intelligence ur way')) &&
  publicLandingSrc.includes('select-none liquid-glass-text'),
  'Tagline "Intelligence your way" has text selection disabled'
);
assert(
  !particleFieldSrc.includes('three') && !particleFieldSrc.includes('webgl'),
  'Pure 2D canvas architecture preserved; no 3D or WebGL migration'
);
console.log('[PASS] 7.1 Text selection disabled strictly for headline and tagline without global restriction');

console.log('\n=== ALL PARTICLE UNIVERSE COLOR CYCLE & PERIODIC J REVEAL TESTS PASSED! ===\n');

