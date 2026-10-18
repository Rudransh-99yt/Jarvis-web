// JARVIS-WEB — STAGE 4: PROGRESSIVE ONBOARDING, SOVEREIGN IDENTITY & WORKSPACE CONTEXT TEST SUITE
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
import type { UserRole } from '../server/data/types.ts';

console.log('=== [WEB JARVIS] STAGE 4: PROGRESSIVE ONBOARDING, SOVEREIGN IDENTITY & WORKSPACE CONTEXT ===');

async function runStage4Tests() {
  const isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-stage4-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'stage4-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed(true);
  setActiveRepository(isolatedRepo);
  const repo = jarvisData;

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
    // SECTION 1: INVITATION CODE VALIDATION & INTEGRITY
    // =========================================================================
    console.log('\n--- Section 1: Invitation Code Validation & Integrity ---');

    // 1.1 Valid active invitation returns valid: true with metadata
    const validRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'STARK-2026' })
    });
    const validData = await validRes.json();
    assert.strictEqual(validRes.status, 200, 'Valid code should return 200');
    assert.strictEqual(validData.valid, true, 'valid flag must be true');
    assert.strictEqual(validData.role, 'student', 'Role must match invitation role');
    assert(validData.institutionName.includes('Stark Academy'), 'Institution name must be included');
    console.log('[PASS] 1.1 Active invitation code verified successfully');

    // 1.2 Non-existent invitation code rejected
    const nonExistentRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BOGUS-CODE-999' })
    });
    const nonExistentData = await nonExistentRes.json();
    assert.strictEqual(nonExistentData.valid, false, 'Invalid code must return valid: false');
    console.log('[PASS] 1.2 Non-existent invitation code properly rejected');

    // 1.3 Expired invitation code rejected
    const expiredRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'EXPIRED-2024' })
    });
    const expiredData = await expiredRes.json();
    assert.strictEqual(expiredData.valid, false, 'Expired code must return valid: false');
    const expMsg = typeof expiredData.error === 'object' ? expiredData.error.message : expiredData.error;
    assert(expMsg.includes('expired'), 'Error message must specify code has expired');
    console.log('[PASS] 1.3 Expired invitation code properly rejected');

    // 1.4 Revoked invitation code rejected
    const revokedRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'REVOKED-CODE' })
    });
    const revokedData = await revokedRes.json();
    assert.strictEqual(revokedData.valid, false, 'Revoked code must return valid: false');
    const revMsg = typeof revokedData.error === 'object' ? revokedData.error.message : revokedData.error;
    assert(revMsg.includes('revoked'), 'Error message must specify code has been revoked');
    console.log('[PASS] 1.4 Revoked invitation code properly rejected');

    // 1.5 Consumed / maxed invitation code rejected
    const maxedRes = await fetch(`${baseUrl}/api/auth/invitation/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'MAXED-SINGLE-USE' })
    });
    const maxedData = await maxedRes.json();
    assert.strictEqual(maxedData.valid, false, 'Consumed code must return valid: false');
    const maxMsg = typeof maxedData.error === 'object' ? maxedData.error.message : maxedData.error;
    assert(maxMsg.includes('capacity') || maxMsg.includes('limit') || maxMsg.includes('consumed') || maxMsg.includes('longer active'), 'Must indicate capacity reached');
    console.log('[PASS] 1.5 Maxed/consumed invitation code properly rejected');

    // =========================================================================
    // SECTION 2: INDIVIDUAL REGISTRATION & SOVEREIGN PERSONAL WORKSPACE
    // =========================================================================
    console.log('\n--- Section 2: Individual Registration & Sovereign Workspace Isolation ---');

    const indEmail = `sovereign.learner.${Date.now()}@example.org`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Aria Sovereign',
        email: indEmail,
        role: 'student',
        ageRange: '19-24',
        country: 'Canada'
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201, 'Registration should return 201 Created');
    assert(regData.token, 'Registration must issue a signed HMAC token');
    assert(regData.user.id, 'User record must exist');
    assert.strictEqual(regData.user.institutionId, undefined, 'Independent individual must NOT have an institutionId');
    assert(regData.activeWorkspace, 'Active personal workspace must be returned');
    assert.strictEqual(regData.activeWorkspace.institutionId, undefined, 'Personal workspace must not be tied to an institution');
    assert.strictEqual(regData.activeWorkspace.ownerId, regData.user.id, 'User must be the owner of their personal workspace');
    console.log('[PASS] 2.1 Individual registered with isolated personal workspace');

    // 2.2 Verify identity store calibration
    const ariaIdentity = await personalIdentityStore.getIdentity(regData.user.id);
    assert(ariaIdentity, 'Personal identity record must be initialized');
    assert.strictEqual(ariaIdentity.profile.displayName, 'Aria Sovereign');
    console.log('[PASS] 2.2 Sovereign personal identity record calibrated');

    // 2.3 Verify session token contains valid HMAC signature
    const verifiedTokenPayload = verifyAuthToken(regData.token);
    assert.strictEqual(verifiedTokenPayload.sub, regData.user.id);
    console.log('[PASS] 2.3 Registered session token cryptographically validated');

    // =========================================================================
    // SECTION 3: INVITATION REGISTRATION & ANTI-PRIVILEGE ESCALATION
    // =========================================================================
    console.log('\n--- Section 3: Invitation-Linked Registration & Anti-Escalation ---');

    const studentWithCodeEmail = `student.enrolled.${Date.now()}@stark.edu`;
    const codeRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Lucas Vance',
        email: studentWithCodeEmail,
        // Attempt to escalate role to principal, but invitation is for student!
        role: 'principal',
        institutionCode: 'STARK-2026'
      })
    });
    const codeRegData = await codeRegRes.json();
    assert.strictEqual(codeRegRes.status, 201, 'Registration with code should succeed');
    assert.strictEqual(codeRegData.user.institutionId, 'inst-stark-academy', 'User should be affiliated with Stark Academy');
    // Anti-privilege escalation check: Role must be forced to 'student' from the invitation, NOT 'principal'
    assert.strictEqual(codeRegData.user.role, 'student', 'Privilege escalation prevented: role must match invitation role');
    console.log('[PASS] 3.1 Invitation registration enforces authorized role (anti-privilege escalation)');

    // 3.2 Verify user has both personal workspace and access to institution workspace
    const userWorkspaces = await repo.workspaces.listForUser(codeRegData.user.id);
    assert(userWorkspaces.length >= 2, 'User should have access to at least personal and institution workspace');
    const personalWs = userWorkspaces.find((w) => !w.institutionId);
    const instWs = userWorkspaces.find((w) => w.institutionId === 'inst-stark-academy');
    assert(personalWs, 'User must retain their sovereign personal workspace');
    assert(instWs, 'User must have membership in institutional workspace');
    console.log('[PASS] 3.2 User holds both isolated personal workspace and institutional workspace');

    // =========================================================================
    // SECTION 4: AUTHENTICATED INVITATION REDEMPTION
    // =========================================================================
    console.log('\n--- Section 4: Authenticated Invitation Redemption ---');

    const ariaTokenHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${regData.token}`
    };

    const joinRes = await fetch(`${baseUrl}/api/auth/invitation/join`, {
      method: 'POST',
      headers: ariaTokenHeaders,
      body: JSON.stringify({ code: 'STARK-2026' })
    });
    const joinData = await joinRes.json();
    assert.strictEqual(joinRes.status, 200, 'Authenticated join should succeed');
    assert.strictEqual(joinData.membership.institutionId, 'inst-stark-academy');
    assert(joinData.workspaces.some((w: any) => w.institutionId === 'inst-stark-academy'), 'Must now include institutional workspace');
    console.log('[PASS] 4.1 Authenticated individual successfully linked institution via invitation code');

    // =========================================================================
    // SECTION 5: WORKSPACE SWITCHER & AUTHORIZATION BOUNDARIES
    // =========================================================================
    console.log('\n--- Section 5: Workspace Switcher & Authorization Boundaries ---');

    // 5.1 GET /api/workspaces/my returns user workspaces with isPersonal and isActive
    const myWsRes = await fetch(`${baseUrl}/api/workspaces/my`, {
      headers: ariaTokenHeaders
    });
    const myWsData = await myWsRes.json();
    assert.strictEqual(myWsRes.status, 200);
    assert.strictEqual(myWsData.success, true);
    assert(Array.isArray(myWsData.workspaces), 'workspaces array must be returned');
    const ariaPersonal = myWsData.workspaces.find((w: any) => w.isPersonal);
    const ariaInst = myWsData.workspaces.find((w: any) => !w.isPersonal);
    assert(ariaPersonal, 'Personal workspace must have isPersonal = true');
    assert(ariaInst, 'Institutional workspace must have isPersonal = false');
    console.log('[PASS] 5.1 GET /api/workspaces/my returns enriched workspaces list');

    // 5.2 Switch to institutional workspace
    const switchToInstRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: ariaTokenHeaders,
      body: JSON.stringify({ workspaceId: ariaInst.id })
    });
    const switchToInstData = await switchToInstRes.json();
    assert.strictEqual(switchToInstRes.status, 200, 'Switch to authorized workspace should succeed');
    assert.strictEqual(switchToInstData.activeWorkspace.id, ariaInst.id, 'Active workspace must match target');
    assert.strictEqual(switchToInstData.activeWorkspace.isActive, true);
    console.log('[PASS] 5.2 Authoritatively switched active workspace to institutional workspace');

    // 5.3 Switch back to personal workspace
    const switchToPersRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: ariaTokenHeaders,
      body: JSON.stringify({ workspaceId: ariaPersonal.id })
    });
    const switchToPersData = await switchToPersRes.json();
    assert.strictEqual(switchToPersRes.status, 200, 'Switch back to personal workspace should succeed');
    assert.strictEqual(switchToPersData.activeWorkspace.id, ariaPersonal.id);
    console.log('[PASS] 5.3 Authoritatively switched back to sovereign personal workspace');

    // 5.4 Switch to an unauthorized / non-member workspace is strictly FORBIDDEN (403)
    const unauthorizedWsRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: ariaTokenHeaders,
      // Target a workspace that Aria is NOT a member of: create a private workspace for tony
      body: JSON.stringify({ workspaceId: 'ws-tony-classified' })
    });
    // First, let's create a private workspace that aria is not a member of
    await repo.workspaces.create({
      id: 'ws-classified-isolated',
      name: 'Classified Defense Ops',
      ownerId: 'user-tony',
      activeSectors: ['command'],
      institutionId: 'inst-classified'
    });
    const forbiddenSwitchRes = await fetch(`${baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: ariaTokenHeaders,
      body: JSON.stringify({ workspaceId: 'ws-classified-isolated' })
    });
    assert.strictEqual(forbiddenSwitchRes.status, 403, 'Switch to non-member workspace must return 403 FORBIDDEN');
    const forbiddenData = await forbiddenSwitchRes.json();
    assert.strictEqual(forbiddenData.error.code, 'FORBIDDEN');
    console.log('[PASS] 5.4 Unauthorized workspace switch rejected with 403 FORBIDDEN');

    // 5.5 Accessing unauthorized workspace details via GET /api/workspaces/:id is FORBIDDEN (403)
    const forbiddenGetRes = await fetch(`${baseUrl}/api/workspaces/ws-classified-isolated`, {
      headers: ariaTokenHeaders
    });
    assert.strictEqual(forbiddenGetRes.status, 403, 'GET /api/workspaces/:id must return 403 FORBIDDEN when not a member');
    console.log('[PASS] 5.5 GET /api/workspaces/:id enforces workspace authorization boundary');

    // =========================================================================
    // SECTION 6: CONTEXT ENGINE & PERSONAL DATA ISOLATION
    // =========================================================================
    console.log('\n--- Section 6: Context Engine & Personal Data Isolation ---');

    // Aria adds a private personal memory
    const addMemRes = await fetch(`${baseUrl}/api/personal/memories`, {
      method: 'POST',
      headers: ariaTokenHeaders,
      body: JSON.stringify({
        category: 'UserGoal',
        key: 'personal_learning_goal',
        value: 'Master General Relativity without institutional oversight'
      })
    });
    assert.strictEqual(addMemRes.status, 200, 'Should save personal memory');
    const memData = await addMemRes.json();
    assert.strictEqual(memData.memory.key, 'personal_learning_goal');

    // Retrieve memories
    const listMemRes = await fetch(`${baseUrl}/api/personal/memories`, {
      headers: ariaTokenHeaders
    });
    const listMemData = await listMemRes.json();
    assert.strictEqual(listMemData.memories.length, 1);
    assert.strictEqual(listMemData.memories[0].value, 'Master General Relativity without institutional oversight');
    console.log('[PASS] 6.1 Private memory vault functions independently of institution');

    console.log('\n=== ALL STAGE 4 TESTS PASSED PERFECTLY ===\n');
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

runStage4Tests().catch((err) => {
  console.error('\n❌ STAGE 4 TEST SUITE FAILED:', err);
  process.exit(1);
});
