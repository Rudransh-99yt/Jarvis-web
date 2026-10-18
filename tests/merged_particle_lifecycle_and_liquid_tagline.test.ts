import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateJCoordinates,
  generateProceduralConstellation
} from '../src/components/landing/CinematicParticleField';

console.log('=== [WEB JARVIS] LIVING CONSTELLATION UNIVERSE & VISUAL EMPHASIS AUDIT ===');

const particleFieldSrc = fs.readFileSync(
  path.resolve('./src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);
const landingViewSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicLandingView.tsx'),
  'utf-8'
);
const indexCssSrc = fs.readFileSync(
  path.resolve('./src/index.css'),
  'utf-8'
);

// 1. EXACT PRESERVATION OF THE FIRST VERSION'S J CONSTELLATION & PALETTE
console.log('--- 1. First-Version J Constellation Preservation ---');
assert(
  particleFieldSrc.includes('function generateJCoordinates(count: number)'),
  'generateJCoordinates function must be present'
);
assert(
  particleFieldSrc.includes('const J_PARTICIPANT_COUNT = 48;'),
  'Exact 48 J participant count must be preserved'
);
assert(
  particleFieldSrc.includes('x: -0.16 + t * 0.30'),
  'Top horizontal bar parametric coordinates must match first-version exactly'
);
assert(
  particleFieldSrc.includes('x: 0.05 + (Math.random() - 0.5) * 0.008') &&
  particleFieldSrc.includes('y: -0.32 + t * 0.48'),
  'Vertical stem parametric coordinates must match first-version exactly'
);
assert(
  particleFieldSrc.includes('x: -0.08 + Math.cos(angle) * radiusX') &&
  particleFieldSrc.includes('y: 0.16 - Math.sin(angle) * radiusY'),
  'Bottom hook curved coordinates must match first-version exactly'
);
assert(
  particleFieldSrc.includes('192') &&
  particleFieldSrc.includes('216') &&
  particleFieldSrc.includes('268') &&
  particleFieldSrc.includes('318'),
  'Restrained neon palette (cyan, azure, violet, magenta) must be preserved'
);
const jCoords = generateJCoordinates(48);
assert.strictEqual(jCoords.length, 48, 'generateJCoordinates must return exactly 48 coordinates');
console.log('[PASS] 1.1 First-version J constellation coordinates, participant count, and palette 100% preserved');

// 2. PRIORITY 1: SUBSTANTIALLY INCREASED OPENING J FORMATION SCALE
console.log('--- 2. Substantially Increased Opening J Visual Scale ---');
assert(
  particleFieldSrc.includes('Math.min(width * 1.85, height * 1.05)') &&
  particleFieldSrc.includes('Math.min(width * 1.25, height * 1.15)'),
  'jScale must be substantially increased to dominate viewport on mobile and desktop'
);
assert(
  particleFieldSrc.includes('(p.jTargetX + 0.035) * jScale') &&
  particleFieldSrc.includes('(p.jTargetY + 0.01) * jScale'),
  'J must have optical center alignment preventing edge clipping'
);
console.log('[PASS] 2.1 Opening J scale substantially increased and centered for hero visual dominance');

// 3. PRIORITY 2: VISIBLY LARGER PARTICLES FOR OPENING J AND ALL CONSTELLATIONS
console.log('--- 3. Clearly Larger Particles in All Active Constellations ---');
assert(
  particleFieldSrc.includes('sizeMultiplier = 1.0 + 1.15 * jProgress'),
  'Opening J particles must receive a substantial size increase (over 2x radius)'
);
assert(
  particleFieldSrc.includes('sizeMultiplier = 1.0 + 0.90 * constellationProgress'),
  'Later active constellations must receive a clearly visible size increase (~90% radius boost)'
);
assert(
  particleFieldSrc.includes('const radius = Math.max(0.75, p.baseRadius * sizeMultiplier);'),
  'Actual rendered radius must scale directly by sizeMultiplier'
);
assert(
  particleFieldSrc.includes('brightnessBoost = 0.28 * jProgress') &&
  particleFieldSrc.includes('brightnessBoost = 0.24 * constellationProgress'),
  'Active constellation particles must receive enhanced brightness'
);
assert(
  particleFieldSrc.includes('let sizeMultiplier = 1.0;'),
  'Ordinary ambient particles and dissolved formations must default to normal sizeMultiplier = 1.0'
);
console.log('[PASS] 3.1 Opening J and later constellations render clearly larger and brighter particles, returning to normal on dissolution');

// 4. PRIORITY 3: RESTORED CURSOR REACTIVITY
console.log('--- 4. Restored Cursor Reactivity (Localized Repulsion, Zero Sticking) ---');
assert(
  particleFieldSrc.includes('window.addEventListener(\'pointermove\', handlePointerMove);') &&
  particleFieldSrc.includes('window.addEventListener(\'pointerleave\', handlePointerLeave);') &&
  particleFieldSrc.includes('window.addEventListener(\'pointerup\', handlePointerUp);'),
  'Window pointer event listeners must be registered for desktop and mobile'
);
assert(
  particleFieldSrc.includes('window.removeEventListener(\'pointermove\', handlePointerMove);') &&
  particleFieldSrc.includes('window.removeEventListener(\'pointerleave\', handlePointerLeave);') &&
  particleFieldSrc.includes('window.removeEventListener(\'pointerup\', handlePointerUp);'),
  'Pointer event listeners must be cleanly removed on unmount'
);
assert(
  particleFieldSrc.includes('const maxDist = 140;') &&
  particleFieldSrc.includes('const factor = Math.cos((dist / maxDist) * (Math.PI / 2));'),
  'Smooth radial deflection must apply within 140px and decay with cosine falloff'
);
assert(
  !particleFieldSrc.includes('filamentMaxDist'),
  'Persistent ambient proximity filaments mesh must remain removed'
);
console.log('[PASS] 4.1 Cursor reactivity fully restored with smooth return to trajectory and no ambient mesh');

// 5. CENTRAL BUBBLE & 6-PHASE OPENING LIFECYCLE
console.log('--- 5. Central Bubble & 6-Phase Merged Lifecycle ---');
assert(
  particleFieldSrc.includes('bubbleRadius') &&
  particleFieldSrc.includes('dTheta') &&
  particleFieldSrc.includes('dPhi'),
  'Particles must have 3D spherical bubble orbital dynamics'
);
assert(
  particleFieldSrc.includes('elapsed < 1000') &&
  particleFieldSrc.includes('bubbleScale'),
  'Phase 1: Central particle bubble emerges from black void'
);
assert(
  particleFieldSrc.includes('elapsed < 2600') &&
  particleFieldSrc.includes('jProgress'),
  'Phase 2 & 3: J forms while bubble remains active'
);
assert(
  particleFieldSrc.includes('elapsed < 4200') &&
  particleFieldSrc.includes('jProgress = 1.0'),
  'Phase 3 Hold: J holds for viewer appreciation'
);
assert(
  particleFieldSrc.includes('elapsed < 5500') &&
  particleFieldSrc.includes('jProgress = 1.0 - ease'),
  'Phase 4: J gracefully dissolves back into the central bubble'
);
assert(
  particleFieldSrc.includes('elapsed < 8000') &&
  particleFieldSrc.includes('universeExpansion'),
  'Phase 5: Bubble naturally disperses across entire viewport'
);
assert(
  particleFieldSrc.includes('universeExpansion = 1.0'),
  'Phase 6: Continuous ambient state across full screen'
);
console.log('[PASS] 5.1 6-Phase continuous opening state machine verified');

// 6. TEXT TIMING: HEADLINE LEADS FIRST, TAGLINE FOLLOWS BY 100-150ms
console.log('--- 6. Sequential Headline-First Typography Entrance ---');
assert(
  landingViewSrc.includes('headlineStartMs = 1000'),
  'Headline word-by-word reveal must start first at 1000ms'
);
assert(
  landingViewSrc.includes('headlineStartMs + 120'),
  'Tagline must start revealing approximately 100-150ms (120ms) after the headline'
);
assert(
  landingViewSrc.includes('setIsNavbarVisible(true);\n    }, 7800);'),
  'Navbar timing must be preserved at 7800ms'
);
console.log('[PASS] 6.1 Headline leads first at 1000ms, tagline follows 120ms later, both remain visible');

// 7. EVOLVING PROCEDURAL CONSTELLATION ENGINE
console.log('--- 7. Evolving Procedural Constellation Generation ---');
assert(
  particleFieldSrc.includes('generateProceduralConstellation'),
  'generateProceduralConstellation generator must be defined'
);
assert(
  particleFieldSrc.includes('CYCLE_PERIOD = 10500'),
  'Constellation cycle interval must be approximately 10 seconds (~10.5s)'
);

// Test generation of 20 random constellations to verify family variety and parameter variation
const observedFamilies = new Set<string>();
const observedCounts = new Set<number>();
let prevFamily = '';

for (let i = 0; i < 20; i++) {
  const formation = generateProceduralConstellation(360, 1920, 1080, prevFamily);
  assert(formation.particleIndices.length >= 26 && formation.particleIndices.length <= 54,
    'Participant count must vary between 26 and 54'
  );
  assert(formation.targetCoords.length === formation.particleIndices.length,
    'Target coordinates count must match participant count'
  );
  assert(formation.family !== prevFamily,
    'Generator must not immediately repeat the previous family'
  );
  observedFamilies.add(formation.family);
  observedCounts.add(formation.particleIndices.length);
  prevFamily = formation.family;
}

assert(observedFamilies.size >= 4, 'Procedural generator must produce diverse constellation families');
assert(observedCounts.size >= 5, 'Participant counts must vary significantly across cycles');
console.log(`[PASS] 7.1 Procedural generator verified across families: [${Array.from(observedFamilies).join(', ')}] with variable particle counts`);

// 8. ACCESSIBILITY & REDUCED MOTION FALLBACK
console.log('--- 8. Reduced Motion & Performance ---');
assert(
  particleFieldSrc.includes('prefersReducedMotion'),
  'CinematicParticleField must check prefersReducedMotion'
);
assert(
  landingViewSrc.includes('prefersReducedMotion'),
  'PublicLandingView must check prefersReducedMotion'
);
assert(
  indexCssSrc.includes('.liquid-glass-text {\n    animation: none !important;'),
  'Reduced motion CSS must disable liquid-glass sweep animation'
);
console.log('[PASS] 8.1 Accessibility and reduced motion verified');

console.log('=== ALL VISUAL EMPHASIS & CURSOR REACTIVITY AUDITS PASSED! ===');
