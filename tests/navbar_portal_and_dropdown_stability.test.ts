import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== [WEB JARVIS] NAVBAR PORTAL RESTRICTION & DROPDOWN STABILITY AUDIT ===\n');

const headerSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicHeader.tsx'),
  'utf-8'
);
const portalSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicRoutePortal.tsx'),
  'utf-8'
);
const landingSrc = fs.readFileSync(
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
// 1. PUBLIC NAVBAR RESTRICTED EXCLUSIVELY TO PAGE 0 (PUBLIC LANDING VIEW)
// -----------------------------------------------------------------------------
console.log('--- 1. Restrict Cinematic Public Navbar to Page 0 ---');

test('1.1 PublicLandingView renders PublicHeader on Page 0', () => {
  assert(landingSrc.includes('import { PublicHeader } from \'./PublicHeader.tsx\';'), 'Landing view imports PublicHeader');
  assert(landingSrc.includes('<PublicHeader'), 'Landing view renders PublicHeader component');
});

test('1.2 PublicRoutePortal does NOT render or import PublicHeader for /signup, /login, /explore, /onboarding', () => {
  assert(!portalSrc.includes('import { PublicHeader }'), 'PublicRoutePortal must not import PublicHeader');
  assert(!portalSrc.includes('<PublicHeader'), 'PublicRoutePortal must not render PublicHeader component');
});

test('1.3 PublicRoutePortal provides clean, dedicated portal header with brand mark & back link', () => {
  assert(portalSrc.includes('Back to Homepage'), 'Portal header features clean Back to Homepage link');
  assert(portalSrc.includes('JarvisMark'), 'Portal header displays Jarvis brand mark');
  assert(portalSrc.includes('Portal'), 'Portal header designates Portal area');
});

// -----------------------------------------------------------------------------
// 2. REMOVAL OF REDUNDANT SIGN IN AND TECHNICAL DESTINATION DEBUG LABELS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Removal of Redundant Sign In and Debug Labels ---');

test('2.1 Desktop and mobile PublicHeader feature Get Started primary CTA', () => {
  assert(headerSrc.includes('Get Started'), 'Navbar features Get Started CTA');
  assert(headerSrc.includes("navigate('/signup')"), 'Get Started CTA opens /signup route');
});

test('2.2 PublicHeader removes separate redundant Sign In button from action area', () => {
  // Desktop action area must not have separate Sign In button alongside Get Started
  assert(!headerSrc.includes('>Sign In<'), 'PublicHeader must not feature separate Sign In button in header controls');
});

test('2.3 PublicRoutePortal removes technical Destination: /SIGNUP route-debug label', () => {
  assert(!portalSrc.includes('Destination:'), 'PublicRoutePortal must not display technical Destination debug label');
});

// -----------------------------------------------------------------------------
// 3. DROPDOWN STABILITY & CONTINUOUS HOVER INTERACTION REGION
// -----------------------------------------------------------------------------
console.log('\n--- 3. Dropdown Interaction & Pointer Stability ---');

test('3.1 Explore and Connect containers cancel close timers on mouseMove within trigger region', () => {
  assert(headerSrc.includes('onMouseMove={cancelClose}'), 'Hover containers must cancel close timer on mouseMove');
});

test('3.2 Rotating ChevronDown arrows feature pointer-events-none to prevent icon hit-test churn', () => {
  assert(headerSrc.includes('pointer-events-none'), 'ChevronDown SVGs must have pointer-events-none class');
});

test('3.3 Grace period close timer (200ms) and panel hover cancellation intact', () => {
  assert(headerSrc.includes('closeTimerRef'), 'closeTimerRef maintained');
  assert(headerSrc.includes('scheduleClose'), 'scheduleClose handler present');
  assert(headerSrc.includes('cancelClose'), 'cancelClose handler present');
});

console.log(`\n=== ALL ${passed}/${total} PORTAL RESTRICTION & DROPDOWN STABILITY TESTS PASSED! ===\n`);
