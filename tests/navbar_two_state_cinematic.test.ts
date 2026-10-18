import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== [WEB JARVIS] TWO-STATE CINEMATIC NAVBAR DEDICATED AUDIT ===\n');

const headerSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicHeader.tsx'),
  'utf-8'
);
const landingSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicLandingView.tsx'),
  'utf-8'
);
const tokensSrc = fs.readFileSync(
  path.resolve('./src/design-system/tokens.ts'),
  'utf-8'
);
const indexCssSrc = fs.readFileSync(
  path.resolve('./src/index.css'),
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
// 1. STATE A: ENGRAVED SURFACE AT SCROLL TOP
// -----------------------------------------------------------------------------
console.log('--- 1. State A: Engraved Surface at Scroll Top ---');

test('1.1 Design tokens include navEngravedText and engraved styling', () => {
  assert(tokensSrc.includes('navEngravedText:'), 'tokens.ts must define navEngravedText token');
  assert(tokensSrc.includes('navSuspensionCable:'), 'tokens.ts must define navSuspensionCable token');
  assert(indexCssSrc.includes('.nav-engraved-text'), 'index.css must define .nav-engraved-text');
  assert(indexCssSrc.includes('text-shadow:'), 'index.css must define letterpress shadow relief for engraved text');
});

test('1.2 PublicHeader incorporates State A zero-blur, transparent background, and border trench', () => {
  assert(headerSrc.includes('backdrop-blur-0'), 'Must support zero blur at State A');
  assert(headerSrc.includes('bg-transparent'), 'Must support transparent surface at State A');
  assert(headerSrc.includes('shadow-inner-trench') || headerSrc.includes('inset 0 1px 1px'), 'Must feature micro-inset border trench at State A');
  assert(headerSrc.includes('isStateA'), 'Must compute isStateA boolean based on transition progress');
});

test('1.3 Nav elements apply engraved text relief at State A', () => {
  assert(headerSrc.includes('nav-engraved-text'), 'Brand and buttons must apply nav-engraved-text class at State A');
});

// -----------------------------------------------------------------------------
// 2. STATE B: SUSPENDED LIQUID-GLASS BOARD WHILE SCROLLING
// -----------------------------------------------------------------------------
console.log('\n--- 2. State B: Suspended Liquid-Glass Board While Scrolling ---');

test('2.1 State B applies liquid-glass smoked background and 32px backdrop blur', () => {
  assert(headerSrc.includes('backdrop-blur-2xl'), 'State B must apply 32px backdrop blur (backdrop-blur-2xl)');
  assert(headerSrc.includes('rgba(7, 10, 16,'), 'State B must apply smoked liquid-glass background');
  assert(headerSrc.includes('rgba(255, 255, 255,') || headerSrc.includes('rgba(56, 189, 248'), 'State B must apply optical glass border');
});

test('2.2 State B preserves specular top rim shimmer', () => {
  assert(headerSrc.includes('animate-rim-shimmer'), 'Liquid-glass board must retain luminous specular top rim shimmer');
  assert(headerSrc.includes('linear-gradient(90deg, transparent 0%'), 'Shimmer must feature restrained cyan highlight gradient');
});

// -----------------------------------------------------------------------------
// 3. PHYSICAL SUSPENSION HARDWARE (DUAL CABLES & LUGS)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Physical Suspension Hardware ---');

test('3.1 Dual suspension cable elements are present and anchored above board', () => {
  assert(headerSrc.includes('Left Suspension Cable & Mounting Lug'), 'Left suspension cable must be defined');
  assert(headerSrc.includes('Right Suspension Cable & Mounting Lug'), 'Right suspension cable must be defined');
  assert(tokensSrc.includes('navSuspensionCable:'), 'tokens.ts must define navSuspensionCable');
  assert(indexCssSrc.includes('.nav-suspension-cable'), 'index.css must define .nav-suspension-cable');
});

test('3.2 Suspension cables are hidden on mobile and non-interactive', () => {
  const matches = headerSrc.match(/hidden md:block pointer-events-none select-none/g);
  assert(matches && matches.length >= 2, 'Both suspension cables must be hidden md:block, pointer-events-none, and select-none');
});

test('3.3 Suspension cables smoothly fade in with scroll progression', () => {
  assert(headerSrc.includes('opacity: cableOpacity'), 'Cables must bind opacity to cableOpacity');
  assert(headerSrc.includes('cableOpacity ='), 'cableOpacity must be computed dynamically from scroll transition');
});

// -----------------------------------------------------------------------------
// 4. CINEMATIC MAGNIFICATION BUMP TRANSITION ENGINE
// -----------------------------------------------------------------------------
console.log('\n--- 4. Cinematic Magnification Bump Transition Engine ---');

test('4.1 Scroll progression uses continuous interpolation in range 40px -> 220px', () => {
  assert(headerSrc.includes('SCROLL_START = 40'), 'Scroll transition must begin at 40px');
  assert(headerSrc.includes('SCROLL_RANGE = 180'), 'Scroll transition range must be 180px (40px -> 220px)');
  assert(headerSrc.includes('scrollRatio * scrollRatio * (3 - 2 * scrollRatio)'), 'Transition must use smoothstep curve');
});

test('4.2 Peak magnification bump occurs mid-transition and settles to 1.0 at rest', () => {
  assert(headerSrc.includes('Math.sin(transition * Math.PI) * 0.32'), 'Bump must follow half-sine wave with cinematic peak ~+32% scale (~1.32x)');
  assert(headerSrc.includes('translateY(0) scale(${currentScale})'), 'Transform must apply scale smoothly via CSS transform');
  assert(headerSrc.includes('860 + 260 * transition'), 'Board must physically expand width from 860px to 1120px');
  assert(headerSrc.includes('48 + 22 * transition'), 'Board must physically expand height from 48px to 70px (68-72px range)');
  
  // Mathematical simulation of the bump logic
  const bump = (t: number) => Math.sin(t * Math.PI) * 0.32;
  const scale = (t: number) => 1.0 + bump(t);
  
  // At rest (t = 0 and t = 1), scale must be exactly 1.0
  assert.strictEqual(scale(0), 1.0, 'Scale at t=0 must be exactly 1.0');
  assert.ok(Math.abs(scale(1) - 1.0) < 0.0001, 'Scale at t=1 must settle back to 1.0');
  
  // Midpoint t = 0.5 must peak at 1.32 (+32%) within the required 1.30x - 1.35x range
  const peak = scale(0.5);
  assert.ok(peak >= 1.30 && peak <= 1.35, `Peak scale must be between 1.30x and 1.35x, got ${peak}`);
});

// -----------------------------------------------------------------------------
// 5. NAVIGATION STRUCTURE & ROUTING
// -----------------------------------------------------------------------------
console.log('\n--- 5. Navigation Structure & Routing ---');

test('5.1 "About Us" replaces "Ecosystem" across desktop and mobile', () => {
  assert(headerSrc.includes('>About Us</span>'), 'Desktop navbar must include About Us');
  assert(headerSrc.includes('>About Us</button>'), 'Mobile drawer must include About Us');
  assert(!headerSrc.includes('>Ecosystem<'), 'Ecosystem must not appear in navbar buttons');
  assert(headerSrc.includes("handleNavClick('sovereignty')"), 'About Us must route smoothly to sovereignty anchor');
});

// -----------------------------------------------------------------------------
// 6. INITIAL LOAD SAFEGUARD & ACCESSIBILITY
// -----------------------------------------------------------------------------
console.log('\n--- 6. Initial Load Safeguard & Accessibility ---');

test('6.1 Navbar remains strictly hidden and non-interactive until cinematic reveal completes', () => {
  assert(landingSrc.includes('7800'), 'Cinematic reveal timer must be 7800ms');
  assert(headerSrc.includes('opacity-0 pointer-events-none invisible'), 'Hidden state must have opacity-0, pointer-events-none, invisible');
  assert(headerSrc.includes('opacity-100 pointer-events-auto visible'), 'Revealed state must have opacity-100, pointer-events-auto, visible');
  assert(headerSrc.includes('aria-hidden={!isVisible}'), 'Header must toggle aria-hidden based on isVisible');
});

test('6.2 Keyboard and touch accessibility targets meet standards', () => {
  assert(headerSrc.includes("e.key === 'Escape'"), 'Escape key must close overlays');
  assert(headerSrc.includes('min-h-[44px]'), 'Mobile touch targets must adhere to 44px minimum');
  assert(headerSrc.includes('aria-haspopup="true"'), 'Dropdown menus must declare aria-haspopup');
});

console.log(`\n=== ALL ${passed}/${total} TWO-STATE CINEMATIC TESTS PASSED! ===\n`);
