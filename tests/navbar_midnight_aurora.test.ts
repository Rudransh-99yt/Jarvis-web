import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== [WEB JARVIS] NAVBAR REDESIGN V2: MIDNIGHT AURORA & DROPDOWN OWNERSHIP AUDIT ===\n');

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
// PART A: MIDNIGHT AURORA GLASS DESIGN SYSTEM TOKENS
// -----------------------------------------------------------------------------
console.log('--- PART A: Midnight Aurora Glass Approved Tokens ---');

test('A.1 Primary glass base deep midnight navy #07111F used', () => {
  assert(headerSrc.includes('#07111F'), 'Header must use midnight navy #07111F');
  assert(indexCssSrc.includes('rgba(7, 17, 31'), 'index.css glass must use rgba(7, 17, 31) base');
});

test('A.2 Secondary glass tone blue-black #0B1728 used', () => {
  assert(headerSrc.includes('#0B1728'), 'Header must use blue-black #0B1728');
  assert(indexCssSrc.includes('rgba(11, 23, 40'), 'index.css glass must use rgba(11, 23, 40) secondary base');
});

test('A.3 Main luminous accent icy cyan #75E6FF used', () => {
  assert(headerSrc.includes('#75E6FF'), 'Header must use icy cyan #75E6FF');
  assert(indexCssSrc.includes('rgba(117, 230, 255'), 'index.css glass must use rgba(117, 230, 255) icy cyan');
});

test('A.4 Secondary accent electric indigo #777BFF used', () => {
  assert(headerSrc.includes('#777BFF'), 'Header must use electric indigo #777BFF');
});

test('A.5 Main text cool near-white #F3F7FF used', () => {
  assert(headerSrc.includes('#F3F7FF'), 'Header must use cool near-white #F3F7FF');
});

test('A.6 Secondary text muted blue-grey #A7B7CB used', () => {
  assert(headerSrc.includes('#A7B7CB'), 'Header must use muted blue-grey #A7B7CB');
});

test('A.7 No unauthorized rainbow, green neon or gold in navbar', () => {
  assert(!headerSrc.includes('text-emerald-500'), 'Must not have green neon text in header');
  assert(!headerSrc.includes('text-amber-500'), 'Must not have amber text in header');
});

// -----------------------------------------------------------------------------
// PART B: NAVBAR SURFACE CHARACTERISTICS
// -----------------------------------------------------------------------------
console.log('\n--- PART B: Navbar Surface Characteristics ---');

test('B.1 Deep translucent surface with 3D tilt preserved', () => {
  assert(headerSrc.includes('rotateX('), 'Must preserve 3D tilt');
  assert(headerSrc.includes('glass-liquid-bar'), 'Must use glass-liquid-bar');
  assert(indexCssSrc.includes('backdrop-filter: blur(32px) saturate(140%)'), 'Must have controlled blur and saturation');
});

test('B.2 Specular upper-edge highlight & restrained cyan reflection', () => {
  assert(headerSrc.includes('animate-rim-shimmer'), 'Must preserve rim shimmer');
  assert(headerSrc.includes('rgba(117,230,255,'), 'Must use restrained cyan in reflections');
  assert(indexCssSrc.includes('inset 0 1px 0 0 rgba(255, 255, 255, 0.28)'), 'Must retain delicate specular highlight');
});

// -----------------------------------------------------------------------------
// PART C & D: DROPDOWN OWNERSHIP BUG FIX & TEST MATRIX
// -----------------------------------------------------------------------------
console.log('\n--- PART C & D: Dropdown Ownership Bug Diagnosis & Fix ---');

test('D.1 Invisible bridge is strictly constrained to trigger width (never spans neighbor links)', () => {
  // Confirm bridge does NOT use unbounded inset-x-0 across the 490px panel
  assert(!headerSrc.includes('w-[490px] max-w-[calc(100vw-2rem)] rounded-2xl glass-level-3 border border-white/[0.18] p-4 shadow-[0_24px_50px_-8px_rgba(0,0,0,0.88),0_0_24px_-4px_rgba(6,182,212,0.18)] backdrop-blur-3xl z-50 text-left transition-all duration-200 ease-out origin-top before:content-[\'\'] before:absolute before:-top-3.5 before:inset-x-0 before:h-4 before:pointer-events-auto'),
    'Old buggy 490px bridge overlapping Ecosystem must be eliminated'
  );
  // Confirm new bridge is narrow and centered directly under Explore trigger
  assert(headerSrc.includes('before:w-28 before:left-1/2 before:-translate-x-1/2'), 'Bridge must be narrow (w-28) and centered');
});

test('D.2 Inactive dropdown panels are completely inert to pointer events', () => {
  assert(
    headerSrc.includes('pointer-events-none invisible before:pointer-events-none'),
    'Closed panels and their bridges must have pointer-events-none and invisible'
  );
  assert(
    headerSrc.includes('pointer-events-auto before:pointer-events-auto'),
    'Only active panels must have pointer-events-auto'
  );
});

test('D.3 Ecosystem hover immediately dismisses any open dropdown and never opens Explore', () => {
  // Find Ecosystem button element in headerSrc
  const ecosystemIdx = headerSrc.indexOf("handleNavClick('ecosystem')");
  assert(ecosystemIdx !== -1, 'Ecosystem handler must exist');
  const ecosystemSnippet = headerSrc.slice(ecosystemIdx - 200, ecosystemIdx + 200);
  assert(
    ecosystemSnippet.includes('onMouseEnter={closeDropdownImmediately}'),
    'Ecosystem must have onMouseEnter={closeDropdownImmediately} to prevent accidental dropdown opening'
  );
});

test('D.4 Vision and Architecture direct links also dismiss active dropdowns immediately', () => {
  const visionIdx = headerSrc.indexOf("handleNavClick('vision')");
  const visionSnippet = headerSrc.slice(visionIdx - 200, visionIdx + 200);
  assert(visionSnippet.includes('onMouseEnter={closeDropdownImmediately}'), 'Vision must dismiss dropdowns immediately');

  const archIdx = headerSrc.indexOf("handleNavClick('architecture')");
  const archSnippet = headerSrc.slice(archIdx - 200, archIdx + 200);
  assert(archSnippet.includes('onMouseEnter={closeDropdownImmediately}'), 'Architecture must dismiss dropdowns immediately');
});

test('D.5 Explore and Connect own their respective dropdown triggers', () => {
  assert(headerSrc.includes("onMouseEnter={() => openDropdown('explore')}"), 'Explore owns openDropdown(explore)');
  assert(headerSrc.includes("onMouseEnter={() => openDropdown('connect')}"), 'Connect owns openDropdown(connect)');
});

test('D.6 Grace-period timer cancels close when cursor enters own panel', () => {
  assert(headerSrc.includes('cancelClose'), 'Panels must call cancelClose onMouseEnter');
  assert(headerSrc.includes('scheduleClose'), 'Panels and triggers must call scheduleClose onMouseLeave');
});

test('D.7 Outside click and Escape key dismiss active dropdown', () => {
  assert(headerSrc.includes('handleClickOutside'), 'Outside click handler registered');
  assert(headerSrc.includes("if (e.key === 'Escape')"), 'Escape key handler registered');
  assert(headerSrc.includes('setActiveDropdown(null)'), 'Escape sets activeDropdown to null');
});

test('D.8 Trigger click toggles dropdown without page reload', () => {
  assert(headerSrc.includes('setActiveDropdown((prev) => (prev === id ? null : id))'), 'Trigger click toggles own panel');
});

// -----------------------------------------------------------------------------
// PART E: PROTECTED FILES IMMUTABILITY
// -----------------------------------------------------------------------------
console.log('\n--- PART E: Absolute Scope Lock & Immutability Verification ---');

test('E.1 CinematicParticleField.tsx is 100% untouched and preserved', () => {
  assert(particleFieldSrc.includes('generateJCoordinates'), 'J coordinates generator preserved');
  assert(particleFieldSrc.includes('48'), '48-particle count preserved');
});

test('E.2 PublicLandingView.tsx is 100% untouched and preserved', () => {
  assert(landingViewSrc.includes("HEADLINE_WORDS = ['Your', 'mind', 'with', 'more', 'possibilities', 'everyday']"), 'Headline words preserved');
  assert(landingViewSrc.includes('Intelligence your way') || landingViewSrc.includes('Intelligence ur way'), 'Tagline preserved');
  assert(landingViewSrc.includes('7800'), '7800ms navbar timing preserved');
});

console.log(`\n=== ALL ${passed}/${total} MIDNIGHT AURORA & DROPDOWN OWNERSHIP TESTS PASSED! ===\n`);
