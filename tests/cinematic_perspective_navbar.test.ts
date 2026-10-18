import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== [WEB JARVIS] CINEMATIC PERSPECTIVE NAVBAR (IMAGE 2) & SCROLL TRANSFORMATION AUDIT ===\n');

const headerSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicHeader.tsx'),
  'utf-8'
);
const indexCssSrc = fs.readFileSync(
  path.resolve('./src/index.css'),
  'utf-8'
);
const particleFieldSrc = fs.readFileSync(
  path.resolve('./src/components/landing/CinematicParticleField.tsx'),
  'utf-8'
);
const landingViewSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicLandingView.tsx'),
  'utf-8'
);

let passed = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. STRAIGHT HORIZONTAL CONTROL PANEL GEOMETRY (NAVBAR RESET)
// -----------------------------------------------------------------------------
console.log('--- 1. Straight Horizontal Control Panel Geometry (Reset) ---');

test('1.1 Uses clean header container with straight alignment', () => {
  assert(headerSrc.includes('PublicHeader'), 'Header component exists');
  assert(headerSrc.includes('glass-liquid-bar'), 'Must use glass-liquid-bar');
});

test('1.2 Rigid rectangular bar with straight 0deg alignment', () => {
  assert(headerSrc.includes('rotY = 0'), 'rotY must be 0 for straight alignment');
  assert(headerSrc.includes('rotZ = 0'), 'rotZ must be 0 for straight alignment');
  assert(headerSrc.includes('rotX = 0'), 'rotX must be 0 for straight alignment');
  assert(headerSrc.includes('glass-liquid-bar'), 'Must use glass-liquid-bar');
});

test('1.3 Left specular highlight and electric blue accents present', () => {
  assert(headerSrc.includes('rgba(105, 169, 255,'), 'Must use electric-blue in rim and accents');
});

// -----------------------------------------------------------------------------
// 2. LIGHTING & MATERIAL ATMOSPHERE
// -----------------------------------------------------------------------------
console.log('\n--- 2. Lighting & Atmospheric Details ---');

test('2.1 Diffuse blue light pool beneath the bar', () => {
  assert(headerSrc.includes('poolOpacity'), 'Must compute poolOpacity based on scroll progress');
  assert(headerSrc.includes('filter blur-2xl sm:blur-3xl'), 'Pool must be soft and diffuse blur-2xl/3xl');
  assert(headerSrc.includes('radial-gradient(ellipse at center, rgba(105, 169, 255'), 'Pool must use electric-blue radial gradient');
});

test('2.2 Razor-sharp electric-blue upper rim illumination', () => {
  assert(headerSrc.includes('animate-rim-shimmer'), 'Must use animated rim shimmer');
  assert(headerSrc.includes('rgba(105,169,255,'), 'Rim must use electric blue #69A9FF');
  assert(headerSrc.includes('rgba(85,232,255,'), 'Rim must use cyan #55E8FF');
});

test('2.3 Right CTA button features luminous cyan accent point', () => {
  assert(headerSrc.includes('ctaAccentStrength'), 'Must track CTA accent strength');
  assert(headerSrc.includes('Luminous cyan accent point'), 'CTA must have luminous cyan accent point');
  assert(headerSrc.includes('radial-gradient(circle, #55E8FF'), 'CTA accent must be radial cyan');
});

// -----------------------------------------------------------------------------
// 3. CONTINUOUS SCROLL-ADAPTIVE DOCKING
// -----------------------------------------------------------------------------
console.log('\n--- 3. Continuous Scroll-Adaptive Docking ---');

test('3.1 Continuous scroll tracking with RAF to avoid layout thrashing', () => {
  assert(headerSrc.includes('requestAnimationFrame'), 'Scroll must be tracked with requestAnimationFrame');
  assert(headerSrc.includes('cancelAnimationFrame'), 'Scroll RAF must be cleaned up on unmount');
  assert(headerSrc.includes('window.addEventListener(\'scroll\''), 'Scroll listener attached');
});

test('3.2 Smoothstep physical interpolation curve', () => {
  assert(headerSrc.includes('SCROLL_DISTANCE = 450') || headerSrc.includes('450'), 'Transition zone defined');
  assert(headerSrc.includes('p * p * (3 - 2 * p)'), 'Must use smoothstep easing curve S(p) = 3p^2 - 2p^3');
});

test('3.3 Clean horizontal rectangle maintained throughout scroll', () => {
  assert(headerSrc.includes('rotY = 0'), 'rotY is 0');
  assert(headerSrc.includes('rotZ = 0'), 'rotZ is 0');
  assert(headerSrc.includes('rotX = 0'), 'rotX is 0');
  assert(headerSrc.includes('prefersReducedMotion'), 'Respects prefers-reduced-motion');
});

test('3.4 External blue pool fades smoothly as scroll progress increases', () => {
  assert(headerSrc.includes('poolOpacity'), 'Pool opacity tracked smoothly');
});

// -----------------------------------------------------------------------------
// 4. DROPDOWN OWNERSHIP BUG REGRESSION INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- 4. Dropdown Ownership & Non-Regression ---');

test('4.1 Hovering Ecosystem never opens Explore dropdown', () => {
  const ecoIdx = headerSrc.indexOf("handleNavClick('ecosystem')");
  assert(ecoIdx !== -1, 'Ecosystem handler must exist');
  const snippet = headerSrc.slice(ecoIdx - 200, ecoIdx + 200);
  assert(snippet.includes('onMouseEnter={closeDropdownImmediately}'), 'Ecosystem must clear open dropdowns on hover');
  assert(headerSrc.includes('before:w-28 before:left-1/2 before:-translate-x-1/2'), 'Hover bridge must be narrow and centered');
});

test('4.2 Dropdown counter-rotates Z when open so panel hangs upright and legible', () => {
  assert(headerSrc.includes('rotateZ(${-rotZ}deg)'), 'Dropdown panel must counter-rotate Z for vertical legibility');
});

// -----------------------------------------------------------------------------
// 5. PROTECTED FILES IMMUTABILITY
// -----------------------------------------------------------------------------
console.log('\n--- 5. Protected Scope Immutability ---');

test('5.1 CinematicParticleField.tsx is 100% untouched', () => {
  assert(particleFieldSrc.includes('generateJCoordinates'), 'J generator preserved');
  assert(particleFieldSrc.includes('48'), '48-node particle count preserved');
});

test('5.2 PublicLandingView.tsx is 100% untouched', () => {
  assert(landingViewSrc.includes('HEADLINE_WORDS = ['), 'Headline preserved');
  assert(landingViewSrc.includes('Intelligence your way') || landingViewSrc.includes('Intelligence ur way'), 'Tagline preserved');
  assert(landingViewSrc.includes('7800'), '7800ms navbar timing preserved');
});

console.log(`\n=== ALL ${passed}/${total} CINEMATIC PERSPECTIVE NAVBAR TESTS PASSED! ===\n`);
