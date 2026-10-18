import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== [WEB JARVIS] NAVBAR EVOLUTION: CINEMATIC GLASS & INTELLIGENT DROPDOWNS AUDIT ===\n');

const headerSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicHeader.tsx'),
  'utf-8'
);
const landingSrc = fs.readFileSync(
  path.resolve('./src/components/landing/PublicLandingView.tsx'),
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
// 1. LIQUID-GLASS SILHOUETTE & DESIGN COHESION
// -----------------------------------------------------------------------------
console.log('--- 1. Liquid-Glass Silhouette & Design Tokens ---');

test('1.1 Uses glass-liquid-bar material with curved-to-straight 3D perspective', () => {
  assert(headerSrc.includes('glass-liquid-bar'), 'PublicHeader must use glass-liquid-bar class');
  assert(headerSrc.includes('rotateX('), 'PublicHeader must feature inward-tilted 3D perspective');
  assert(headerSrc.includes('max-w-7xl'), 'Header must retain wide max-w-7xl baseline footprint');
  assert(headerSrc.includes('z-40'), 'Header must reside in z-40 stacking layer');
});

test('1.2 Specular upper-contour luminous shimmer rim preserved', () => {
  assert(headerSrc.includes('animate-rim-shimmer'), 'Header must have animated rim shimmer');
  assert(headerSrc.includes('linear-gradient(90deg, transparent 0%'), 'Rim must have refined linear-gradient');
});

test('1.3 Dropdown panels use glass-level-3 with deep backdrop blur and specular highlights', () => {
  assert(headerSrc.includes('glass-level-3'), 'Dropdown panels must use glass-level-3 floating material');
  assert(headerSrc.includes('backdrop-blur-3xl'), 'Dropdown panels must apply backdrop-blur-3xl');
  assert(indexCssSrc.includes('.glass-level-3'), 'index.css must define .glass-level-3');
});

// -----------------------------------------------------------------------------
// 2. HOVER-ACTIVATED DROPDOWN NAVIGATION & COLD SWITCHING
// -----------------------------------------------------------------------------
console.log('\n--- 2. Dropdown Interaction Engine & Grace Period ---');

test('2.1 Rotating chevrons with smooth CSS transition', () => {
  assert(headerSrc.includes('rotate-180 text-cyan-300'), 'Chevron must rotate 180 degrees and illuminate when open');
  assert(headerSrc.includes('transition-transform duration-200'), 'Chevron must animate smoothly over 200ms');
});

test('2.2 Hover opening with graceful close delay timer (200ms)', () => {
  assert(headerSrc.includes('closeTimerRef'), 'Must maintain closeTimerRef for grace-period delay');
  assert(headerSrc.includes('setTimeout(() => {\n      setActiveDropdown(null);\n    }, 200)'), 'Must use 200ms grace period');
  assert(headerSrc.includes('cancelClose'), 'Entering dropdown panel must cancel close timer');
});

test('2.3 Continuous pointer path with invisible bridge', () => {
  assert(
    headerSrc.includes("before:content-['']") &&
    headerSrc.includes('before:-top-3.5') &&
    headerSrc.includes('before:pointer-events-auto'),
    'Dropdown panels must include invisible hover bridge to prevent cursor dropout'
  );
});

test('2.4 Trigger click toggles dropdown without navigating away', () => {
  assert(headerSrc.includes('handleTriggerClick'), 'Must have handleTriggerClick');
  assert(headerSrc.includes('e.preventDefault()') && headerSrc.includes('e.stopPropagation()'), 'Trigger click must prevent default navigation');
  assert(headerSrc.includes('setActiveDropdown((prev) => (prev === id ? null : id))'), 'Trigger click must toggle active state');
});

// -----------------------------------------------------------------------------
// 3. EXPLORE DROPDOWN CONTENT & DESTINATIONS
// -----------------------------------------------------------------------------
console.log('\n--- 3. Explore Dropdown Real Content & Routes ---');

test('3.1 Contains all 4 real sectors with clear descriptions and icons', () => {
  assert(headerSrc.includes('/app/education'), 'Explore dropdown must link to /app/education');
  assert(headerSrc.includes('/app/research'), 'Explore dropdown must link to /app/research');
  assert(headerSrc.includes('/app/command'), 'Explore dropdown must link to /app/command');
  assert(headerSrc.includes('/app/personal'), 'Explore dropdown must link to /app/personal');
});

test('3.2 Contains quick actions for Platform Explorer and Guided Onboarding', () => {
  assert(headerSrc.includes('/explore'), 'Explore footer must link to /explore');
  assert(headerSrc.includes('/onboarding'), 'Explore footer must link to /onboarding');
  assert(headerSrc.includes('Platform Environments'), 'Explore dropdown must have clear section title');
});

// -----------------------------------------------------------------------------
// 4. CONNECT DROPDOWN CONTENT & REAL ACTIONS
// -----------------------------------------------------------------------------
console.log('\n--- 4. Connect Dropdown Real Content & Capabilities ---');

test('4.1 Interactive Share Platform link with clipboard copy and live feedback', () => {
  assert(headerSrc.includes('handleShareApp'), 'Connect must have handleShareApp');
  assert(headerSrc.includes('navigator.clipboard.writeText'), 'Must use clipboard API');
  assert(headerSrc.includes('copySuccess'), 'Must track copySuccess state for live feedback');
  assert(headerSrc.includes('Link Copied to Clipboard!'), 'Must display confirmed copy feedback');
});

test('4.2 Institution token redemption link routes to /signup', () => {
  assert(headerSrc.includes('Redeem Institution Token'), 'Connect must feature Redeem Institution Token');
  assert(headerSrc.includes("navigate('/signup')"), 'Token action must navigate to /signup');
});

test('4.3 Real gateway health telemetry indicator', () => {
  assert(headerSrc.includes('gatewayOnline'), 'Must track gatewayOnline telemetry state');
  assert(headerSrc.includes("fetch('/api/health')"), 'Must silently check /api/health endpoint');
  assert(headerSrc.includes('Gateway Live'), 'Must display Gateway Live status');
});

// -----------------------------------------------------------------------------
// 5. DIRECT NAVIGATION ITEMS (VISION, ECOSYSTEM, ARCHITECTURE)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Direct Navigation Links Integrity ---');

test('5.1 Vision and About Us remain direct anchor links, Ecosystem replaced by About Us', () => {
  assert(headerSrc.includes("handleNavClick('vision')"), 'Vision must navigate to vision section');
  assert(headerSrc.includes("handleNavClick('sovereignty')"), 'About Us must navigate to sovereignty section');
  assert(headerSrc.includes('>About Us<'), 'Navbar must feature About Us button');
  assert(!headerSrc.includes('>Ecosystem<'), 'Ecosystem top-level navbar button must be replaced by About Us');
  assert(!headerSrc.includes('>Architecture<'), 'Architecture navbar button must be removed for minimal initial view');
  assert(headerSrc.includes('headerOffset = 88'), 'Scroll offset calculation must clear 88px floating bar');
  assert(headerSrc.includes('offsetPosition'), 'Must compute offsetPosition');
});

// -----------------------------------------------------------------------------
// 6. ACCESSIBILITY & KEYBOARD NAVIGATION
// -----------------------------------------------------------------------------
console.log('\n--- 6. Accessibility & ARIA Compliance ---');

test('6.1 ARIA attributes on triggers and menus', () => {
  assert(headerSrc.includes('aria-haspopup="true"'), 'Triggers must declare aria-haspopup');
  assert(headerSrc.includes('aria-expanded={activeDropdown === \'explore\'}'), 'Explore trigger must report aria-expanded');
  assert(headerSrc.includes('aria-expanded={activeDropdown === \'connect\'}'), 'Connect trigger must report aria-expanded');
  assert(headerSrc.includes('role="menu"'), 'Dropdown panels must declare role="menu"');
  assert(headerSrc.includes('role="menuitem"'), 'Dropdown entries must declare role="menuitem"');
});

test('6.2 Escape key dismisses active dropdowns and mobile drawer', () => {
  assert(headerSrc.includes("e.key === 'Escape'"), 'Must handle Escape key on window');
  assert(headerSrc.includes('setActiveDropdown(null)'), 'Escape must close active dropdown');
  assert(headerSrc.includes('setMobileMenuOpen(false)'), 'Escape must close mobile drawer');
});

test('6.3 Outside click dismisses active dropdown', () => {
  assert(headerSrc.includes('handleClickOutside'), 'Must register outside click handler');
  assert(headerSrc.includes('mousedown'), 'Must attach mousedown listener');
});

// -----------------------------------------------------------------------------
// 7. RESPONSIVE MOBILE DRAWER
// -----------------------------------------------------------------------------
console.log('\n--- 7. Responsive Mobile Drawer ---');

test('7.1 Mobile drawer provides structured access to all destinations with comfortable touch targets', () => {
  assert(headerSrc.includes('mobileMenuOpen'), 'Mobile drawer state must exist');
  assert(headerSrc.includes('min-h-[44px]'), 'Touch targets must be at least 44px');
  assert(headerSrc.includes('mobileExpandedSection'), 'Mobile drawer must feature collapsible accordion sections');
});

// -----------------------------------------------------------------------------
// 8. NON-REGRESSION OF LANDING PAGE AND ENTRANCE TIMING
// -----------------------------------------------------------------------------
console.log('\n--- 8. Landing Page Living Universe Non-Regression ---');

test('8.1 Navbar entrance timing preserved at 7800ms', () => {
  assert(landingSrc.includes('setIsNavbarVisible(true);\n    }, 7800);'), 'Navbar entrance timing must remain at 7800ms');
  assert(headerSrc.includes('isVisible = true'), 'Header must accept isVisible prop');
});

test('8.2 Headline, tagline, and particle universe completely untouched', () => {
  assert(landingSrc.includes("HEADLINE_WORDS = ['Your', 'mind', 'with', 'more', 'possibilities', 'everyday']"), 'Headline words preserved');
  assert(landingSrc.includes('Intelligence your way') || landingSrc.includes('Intelligence ur way'), 'Tagline preserved');
  assert(landingSrc.includes('<CinematicParticleField opacity={particleOpacity} />'), 'Particle field preserved');
});

test('8.3 Inactive navbar is strictly non-interactive and invisible to pointer events', () => {
  assert(
    headerSrc.includes("opacity-0 pointer-events-none invisible"),
    'Floating control bar must be pointer-events-none and invisible when isVisible is false'
  );
  assert(
    headerSrc.includes("opacity-100 pointer-events-auto visible"),
    'Floating control bar must be pointer-events-auto and visible when isVisible is true'
  );
  assert(
    headerSrc.includes('aria-hidden={!isVisible}'),
    'Header must declare aria-hidden when not visible'
  );
  assert(
    headerSrc.includes('mobileMenuOpen && isVisible'),
    'Mobile drawer must require isVisible to mount'
  );
});

// -----------------------------------------------------------------------------
// 9. TWO-STATE CINEMATIC TRANSFORMATION & SUSPENSION HARDWARE
// -----------------------------------------------------------------------------
console.log('\n--- 9. Two-State Transformation & Physical Suspension ---');

test('9.1 State A engraved navigation and State B suspension hardware verified', () => {
  assert(headerSrc.includes('transition'), 'Must calculate scroll transition progress');
  assert(headerSrc.includes('bump'), 'Must feature controlled magnification bump');
  assert(headerSrc.includes('cableOpacity'), 'Must track suspension cable opacity');
  assert(headerSrc.includes('hidden md:block pointer-events-none select-none'), 'Suspension cables must be pointer-events-none and hidden on mobile');
  assert(headerSrc.includes('Left Suspension Cable & Mounting Lug'), 'Left suspension cable and lug present');
  assert(headerSrc.includes('Right Suspension Cable & Mounting Lug'), 'Right suspension cable and lug present');
});

console.log(`\n=== ALL ${passed}/${total} NAVBAR EVOLUTION TESTS PASSED! ===\n`);
