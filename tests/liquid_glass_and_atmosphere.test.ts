import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== [WEB JARVIS] LIQUID GLASS 3.0 & PAGE ZERO ATMOSPHERE VERIFICATION ===');

const indexCss = fs.readFileSync(path.resolve('./src/index.css'), 'utf-8');
const publicHeader = fs.readFileSync(path.resolve('./src/components/landing/PublicHeader.tsx'), 'utf-8');
const publicLanding = fs.readFileSync(path.resolve('./src/components/landing/PublicLandingView.tsx'), 'utf-8');
const appShell = fs.readFileSync(path.resolve('./src/components/layout/AppShell.tsx'), 'utf-8');
const tokens = fs.readFileSync(path.resolve('./src/design-system/tokens.ts'), 'utf-8');

// 1. LIQUID GLASS 3.0 MATERIAL TOKENS & STYLES
console.log('--- 1. Liquid Glass 3.0 Optical Physics & Tokens ---');
assert(tokens.includes("liquidBar: 'glass-liquid-bar'"), 'Tokens must define liquidBar');
assert(indexCss.includes('.glass-liquid-bar'), 'index.css must define .glass-liquid-bar class');
assert(indexCss.includes('backdrop-filter: blur(32px)'), 'Liquid Glass 3.0 must have rich 32px backdrop blur');
assert(indexCss.includes('inset 0 1px 0 0 rgba(255, 255, 255, 0.28)'), 'Liquid Glass 3.0 must have delicate specular upper-edge highlight');
assert(indexCss.includes('inset 0 -1px 0 0 rgba(0, 0, 0, 0.40)'), 'Liquid Glass 3.0 must have physical lower-edge shadow for depth');
console.log('[PASS] 1.1 Liquid Glass 3.0 tokens and optical physics verified');

// 2. TOP-BAR OVERLAP & SCROLL CLEARANCE
console.log('--- 2. Top-Bar Overlap & Scroll Offset Clearance ---');
assert(indexCss.includes('scroll-padding-top: 6rem'), 'html element must have scroll-padding-top offset');
assert(publicHeader.includes('offsetPosition'), 'PublicHeader must calculate scroll offset for floating bar');
assert(publicHeader.includes('headerOffset = 88'), 'PublicHeader scroll calculation must account for floating bar height');
assert(publicLanding.includes('scroll-mt-24 sm:scroll-mt-28'), 'Sections in landing page must declare scroll-mt clearance');
assert(publicLanding.includes('id="vision"') && publicLanding.includes('id="sovereignty"') && publicLanding.includes('id="ecosystem"') && publicLanding.includes('id="architecture"'), 'Landing page sections must be present');
console.log('[PASS] 2.1 Anchor link and programmatic scroll offsets account for navigation footprint');

// 3. MONUMENTAL ARCHITECTURAL GHOST TYPOGRAPHY
console.log('--- 3. Page Zero Monumental Ghost Typography ---');
assert(publicLanding.includes('JARVIS'), 'Atmospheric background must include oversized JARVIS motif');
assert(publicLanding.includes('INTELLIGENCE'), 'Atmospheric background must include INTELLIGENCE motif');
assert(publicLanding.includes('PERSONAL OS'), 'Atmospheric background must include PERSONAL OS motif');
assert(publicLanding.includes('THINK / LEARN / CREATE'), 'Atmospheric background must include THINK / LEARN / CREATE motif');
assert(publicLanding.includes('YOUR WORLD'), 'Atmospheric background must include YOUR WORLD motif');
assert(publicLanding.includes('pointer-events-none select-none'), 'Ghost typography container must be non-interactive');
assert(publicLanding.includes('opacity-[0.032]') || publicLanding.includes('opacity-[0.038]'), 'Ghost typography must have low opacity');
console.log('[PASS] 3.1 Monumental ghost typography motifs properly composed without competing with content');

// 4. FLOATING NAVIGATION DIMENSIONS & RESPONSIVE REFLOW
console.log('--- 4. Navigation Dimensions & Responsive Breakpoints ---');
assert(publicHeader.includes('rounded-lg'), 'PublicHeader must use slim rectangular board with modest rounding');
assert(publicHeader.includes('max-w-7xl'), 'PublicHeader must maintain comfortable wide desktop footprint');
assert(publicHeader.includes('min-h-[36px]'), 'Buttons and triggers must have comfortable touch targets');
assert(publicHeader.includes('mobileMenuOpen'), 'Mobile menu drawer must exist');
assert(appShell.includes('glass-liquid-bar'), 'AppShell top bar must use Liquid Glass 3.0 material');
assert(appShell.includes('hidden xl:flex'), 'AppShell Zone 2 segmented tabs must use xl:flex to prevent tablet collisions');
assert(appShell.includes('xl:hidden'), 'AppShell quick sector dropdown must be active below xl breakpoint');
console.log('[PASS] 4.1 Responsive breakpoints prevent brand and controls from colliding');

// 5. STACKING ORDER & OVERLAY INTEGRITY
console.log('--- 5. Stacking Contexts & Overlay Hierarchy ---');
assert(publicHeader.includes('z-40'), 'PublicHeader must reside in z-40 tier');
assert(appShell.includes('z-30'), 'AppShell header must reside in z-30 tier');
assert(appShell.includes('z-50'), 'Modal and dialog layers must reside in z-50 tier above header');
console.log('[PASS] 5.1 Deliberate stacking order maintains modal and dropdown hierarchy');

console.log('=== ALL LIQUID GLASS 3.0 & ATMOSPHERE TESTS PASSED! ===');
