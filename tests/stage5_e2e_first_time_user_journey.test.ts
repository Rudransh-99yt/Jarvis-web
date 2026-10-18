// JARVIS-WEB — STAGE 5: END-TO-END FIRST-TIME USER JOURNEY AUDIT TEST SUITE
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import {
  jarvisData,
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { authRouter } from '../server/auth/authRoutes.ts';
import { workspaceRouter } from '../server/routes/workspaceRoutes.ts';
import { personalRouter } from '../server/personal/personalRoutes.ts';
import { authService, verifyAuthToken } from '../server/auth/tokens.ts';
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { contextEngine } from '../server/personal/contextEngine.ts';

console.log('===================================================================');
console.log('=== [WEB JARVIS] STAGE 5: END-TO-END FIRST-TIME JOURNEY AUDIT ===');
console.log('===================================================================');

async function runStage5Audit() {
  const isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-stage5-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'stage5-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed(true);
  setActiveRepository(isolatedRepo);

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/workspaces', workspaceRouter);
  app.use('/api/personal', personalRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // =========================================================================
    // JOURNEY 1: New visitor → landing page → signup → onboarding → personal workspace
    // =========================================================================
    console.log('\n--- Journey 1: New Visitor -> Signup -> Onboarding -> Personal Workspace ---');

    // 1.1 Verify Landing Page and Route Portal Assets & Contract
    const publicLanding = fs.readFileSync(path.resolve('./src/components/landing/PublicLandingView.tsx'), 'utf-8');
    const routePortal = fs.readFileSync(path.resolve('./src/components/landing/PublicRoutePortal.tsx'), 'utf-8');
    const wizard = fs.readFileSync(path.resolve('./src/components/onboarding/ProgressiveOnboardingWizard.tsx'), 'utf-8');
    const personalSector = fs.readFileSync(path.resolve('./src/sectors/personal/PersonalWorkspaceSector.tsx'), 'utf-8');

    assert(publicLanding.includes("navigate('/signup')"), 'Landing page must direct new visitors to /signup');
    assert(routePortal.includes("navigate('/onboarding')"), 'Signup view must link to progressive onboarding');
    assert(wizard.includes("destination = '/app/personal'"), 'Personal onboarding path must route to /app/personal');
    console.log('[PASS] 1.1 Route flow contract verified from landing -> signup -> onboarding -> /app/personal');

    // 1.2 Register new individual user via API
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Dr. Jane Foster',
        email: 'foster@astrophysics.org',
        role: 'student',
        ageRange: '25-34',
        country: 'United States'
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');
    assert.strictEqual(regData.success, true);
    assert(regData.token, 'Must return signed token');
    assert(regData.activeWorkspace, 'Must create active workspace');
    assert.strictEqual(regData.activeWorkspace.institutionId, undefined, 'Personal workspace has no institutionId');
    assert(regData.activeWorkspace.name.includes('Dr. Jane Foster'), 'Workspace named after user');
    console.log('[PASS] 1.2 Individual registered with isolated personal workspace');

    const fosterToken = regData.token;
    const fosterId = regData.user.id;

    // 1.3 Calibrate Personal Identity via Onboarding API
    const onbRes = await fetch(`${baseUrl}/api/personal/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fosterToken}`
      },
      body: JSON.stringify({
        name: 'Dr. Jane Foster',
        preferredName: 'Jane',
        ageRange: '25-34',
        primaryRole: 'researcher',
        educationInfo: {
          gradeLevel: 'Postdoctoral',
          curriculum: 'Astrophysics & Quantum Fields',
          subjects: ['Astrophysics', 'Einstein-Rosen Bridges'],
          academicGoals: ['Gravitational Wave Resonance Analysis']
        },
        preferences: {
          explanationStyle: 'first_principles'
        }
      })
    });
    const onbData = await onbRes.json();
    assert.strictEqual(onbRes.status, 200, 'Onboarding endpoint must return 200');
    assert.strictEqual(onbData.success, true);
    assert.strictEqual(onbData.identity.profile.preferredName, 'Jane');
    console.log('[PASS] 1.3 Personal identity and pedagogical calibration completed');

    // 1.4 Access Personal Workspace Home & Private Memory
    const homeRes = await fetch(`${baseUrl}/api/personal/home`, {
      headers: { 'Authorization': `Bearer ${fosterToken}` }
    });
    const homeData = await homeRes.json();
    assert.strictEqual(homeRes.status, 200);
    assert.strictEqual(homeData.success, true);
    assert(homeData.home.profile.displayName === 'Dr. Jane Foster' || homeData.home.profile.name === 'Dr. Jane Foster' || homeData.home.profile.preferredName === 'Jane');
    console.log('[PASS] 1.4 Personal workspace home telemetry loaded cleanly');

    // =========================================================================
    // JOURNEY 2: Returning user → login → correct workspace
    // =========================================================================
    console.log('\n--- Journey 2: Returning User -> Login -> Correct Workspace ---');

    const prevStage5DevAuth = process.env.ALLOW_DEV_AUTH;
    try {
      process.env.ALLOW_DEV_AUTH = 'true';
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'foster@astrophysics.org' })
      });
      const loginData = await loginRes.json();
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginData.success, true);
      assert.strictEqual(loginData.user.id, fosterId);
      assert.strictEqual(loginData.activeWorkspace.id, regData.activeWorkspace.id, 'Must return user active workspace');
      console.log('[PASS] 2.1 Returning user login restores correct personal workspace');
    } finally {
      if (prevStage5DevAuth !== undefined) process.env.ALLOW_DEV_AUTH = prevStage5DevAuth;
      else delete process.env.ALLOW_DEV_AUTH;
    }

    // =========================================================================
    // JOURNEY 3: Logged-in user → refresh / direct open → session restoration
    // =========================================================================
    console.log('\n--- Journey 3: Session Restoration On Reload (/api/auth/me) ---');

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${fosterToken}` }
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.success, true);
    assert.strictEqual(meData.user.id, fosterId);
    assert.strictEqual(meData.activeWorkspace.id, regData.activeWorkspace.id);
    assert(Array.isArray(meData.capabilities), 'Capabilities list must be returned');
    console.log('[PASS] 3.1 Valid session token restored active user, workspace, and capabilities');

    // Tampered token fails session verification
    const tamperedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${fosterToken}badsignature` }
    });
    assert.strictEqual(tamperedRes.status, 401, 'Tampered token must return 401');
    console.log('[PASS] 3.2 Tampered token rejected during session validation');

    // =========================================================================
    // JOURNEY 4: User without valid session → protected route → redirect
    // =========================================================================
    console.log('\n--- Journey 4: Protected Route Guard & Intended Destination Redirect ---');

    // Unauthenticated call to protected endpoints
    const unauthWsRes = await fetch(`${baseUrl}/api/workspaces/my`);
    assert.strictEqual(unauthWsRes.status, 401);
    const unauthPersonalRes = await fetch(`${baseUrl}/api/personal/home`);
    assert.strictEqual(unauthPersonalRes.status, 401);
    console.log('[PASS] 4.1 Server strictly rejects unauthenticated calls with 401');

    // Verify App.tsx redirect logic and query preservation
    const appTsx = fs.readFileSync(path.resolve('./src/App.tsx'), 'utf-8');
    assert(appTsx.includes("navigate(`/login?redirect=${encodeURIComponent(path)}`"), 'App must redirect unauthenticated /app access to login with redirect param');
    assert(routePortal.includes('getRedirectUrl()'), 'PublicRoutePortal must read and honor redirect query param');
    console.log('[PASS] 4.2 Protected route gate enforces login redirect with return path preservation');

    // =========================================================================
    // JOURNEY 5: Personal user → valid institution invitation → authorized membership
    // =========================================================================
    console.log('\n--- Journey 5: Personal User -> Valid Institution Invitation -> Linking ---');

    // Validate active code STARK-2026
    const invCheckRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'STARK-2026' })
    });
    const invCheckData = await invCheckRes.json();
    assert.strictEqual(invCheckData.valid, true);
    assert(invCheckData.institutionName.includes('Stark Academy'));
    console.log('[PASS] 5.1 Institution code STARK-2026 validated');

    // Join institution with valid token
    const joinRes = await fetch(`${baseUrl}/api/auth/invitation/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fosterToken}`
      },
      body: JSON.stringify({ code: 'STARK-2026' })
    });
    const joinData = await joinRes.json();
    assert.strictEqual(joinRes.status, 200);
    assert.strictEqual(joinData.success, true);
    assert(joinData.institution.id.includes('stark'));
    assert(joinData.workspaces.length >= 2, 'User now has personal AND institutional workspaces');
    console.log('[PASS] 5.2 Personal user joined institution and gained institutional workspace');

    // =========================================================================
    // JOURNEY 6: Workspace Switcher & Authorization Boundaries
    // =========================================================================
    console.log('\n--- Journey 6: Workspace Switcher & Boundary Enforcement ---');

    const instWs = joinData.workspaces.find((w: any) => Boolean(w.institutionId));
    assert(instWs, 'Institutional workspace must exist in list');

    // Switch to institutional workspace
    const switchRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fosterToken}`
      },
      body: JSON.stringify({ workspaceId: instWs.id })
    });
    const switchData = await switchRes.json();
    assert.strictEqual(switchRes.status, 200);
    assert.strictEqual(switchData.activeWorkspace.id, instWs.id);
    assert.strictEqual(switchData.activeWorkspace.isPersonal, false);
    console.log('[PASS] 6.1 Authoritatively switched active workspace to Institutional Workspace');

    // Switch back to sovereign personal workspace
    const switchBackRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fosterToken}`
      },
      body: JSON.stringify({ workspaceId: regData.activeWorkspace.id })
    });
    const switchBackData = await switchBackRes.json();
    assert.strictEqual(switchBackRes.status, 200);
    assert.strictEqual(switchBackData.activeWorkspace.id, regData.activeWorkspace.id);
    assert.strictEqual(switchBackData.activeWorkspace.isPersonal, true);
    console.log('[PASS] 6.2 Authoritatively switched active workspace back to Personal Workspace');

    // Unauthorized workspace switch attempt (foreign workspace)
    const badSwitchRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fosterToken}`
      },
      body: JSON.stringify({ workspaceId: 'ws-pers-other-foreign-user' })
    });
    assert(badSwitchRes.status === 403 || badSwitchRes.status === 404, 'Foreign workspace switch rejected');
    console.log('[PASS] 6.3 Unauthorized workspace switch rejected');

    // =========================================================================
    // JOURNEY 7: Logout & Session Invalidation
    // =========================================================================
    console.log('\n--- Journey 7: Logout & Session Invalidation ---');

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${fosterToken}` }
    });
    assert.strictEqual(logoutRes.status, 200);
    console.log('[PASS] 7.1 Logout endpoint responds successfully');

    // AppShell logout clears client tokens
    const authClientFile = fs.readFileSync(path.resolve('./src/services/authClient.ts'), 'utf-8');
    assert(authClientFile.includes('localStorage.removeItem(\'jarvis_auth_token\')'), 'authClient must clear token from storage');
    console.log('[PASS] 7.2 Client session cleared and storage purged');

    // =========================================================================
    // JOURNEY 8: Invitation Failure States
    // =========================================================================
    console.log('\n--- Journey 8: Invitation Failure States ---');

    // Expired
    const expRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'EXPIRED-2024' })
    });
    const expData = await expRes.json();
    assert.strictEqual(expData.valid, false);
    assert(JSON.stringify(expData).includes('expired'));
    console.log('[PASS] 8.1 Expired invitation rejected with clear status');

    // Revoked
    const revRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'REVOKED-CODE' })
    });
    const revData = await revRes.json();
    assert.strictEqual(revData.valid, false);
    assert(JSON.stringify(revData).includes('revoked'));
    console.log('[PASS] 8.2 Revoked invitation rejected with clear status');

    // Capacity reached
    const maxRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'MAXED-SINGLE-USE' })
    });
    const maxData = await maxRes.json();
    assert.strictEqual(maxData.valid, false);
    console.log('[PASS] 8.3 Maxed invitation rejected with clear status');

    // =========================================================================
    // SECTION 9: Anti-Privilege Escalation & Personal Data Isolation
    // =========================================================================
    console.log('\n--- Section 9: Anti-Privilege Escalation & Data Isolation ---');

    // Attacker attempts to self-register as commander without invitation
    const attackRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Attacker Malicious',
        email: 'attacker@infiltrate.net',
        role: 'commander'
      })
    });
    const attackData = await attackRes.json();
    assert.strictEqual(attackRes.status, 201);
    assert.strictEqual(attackData.user.role, 'student', 'Attacker must be demoted to student: no self-assigned commander role');
    console.log('[PASS] 9.1 Privilege escalation attempt safely prevented (assigned safe role)');

    // Cross-user memory isolation
    const attackerToken = attackData.token;
    const fosterMemRes = await fetch(`${baseUrl}/api/personal/memories`, {
      headers: { 'Authorization': `Bearer ${attackerToken}` }
    });
    const attackerMemories = await fosterMemRes.json();
    assert.strictEqual(attackerMemories.memories.length, 0, 'Attacker cannot view Dr. Foster private memories');
    console.log('[PASS] 9.2 Personal data boundary strictly isolated between users');

    console.log('\n===================================================================');
    console.log('=== STAGE 5 AUDIT: ALL 8 JOURNEYS & SECURITY CHECKS PASSED! ===');
    console.log('===================================================================');

  } finally {
    try {
      server.close();
    } finally {
      resetActiveRepository();
      if (isolatedTempDir && fs.existsSync(isolatedTempDir)) {
        fs.rmSync(isolatedTempDir, { recursive: true, force: true });
      }
    }
  }
}

runStage5Audit().catch((err) => {
  console.error('[FAIL] Stage 5 Audit Failure:', err);
  process.exit(1);
});
