// JARVIS-WEB — STAGE 3: AUTH CLIENT HARDENING, HMAC TOKENS & PROTECTED ROUTE GUARDS TEST SUITE
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
import { authService, verifyAuthToken, signAuthPayload, AuthenticationError } from '../server/auth/tokens.ts';
import { extractAuthToken, authenticateRequest } from '../server/auth/index.ts';
import { AuthorizationPolicy } from '../server/auth/authorizationPolicy.ts';
import type { Request } from 'express';

console.log('=== [WEB JARVIS] STAGE 3: AUTH CLIENT HARDENING & PROTECTED ROUTE GUARDS TEST SUITE ===');

async function runStage3AuthTests() {
  process.env.JARVIS_AUTH_SECRET ||= 'stage3-harness-secret-at-least-32-chars-long';
  const isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-stage3-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'stage3-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed();
  setActiveRepository(isolatedRepo);
  const repo = jarvisData;
  const policy = new AuthorizationPolicy();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const authUrl = `http://127.0.0.1:${port}/api/auth`;

  try {
    // =========================================================================
    // SECTION 1: HMAC-SHA256 SIGNATURE CRYPTOGRAPHY & VERIFICATION
    // =========================================================================
    console.log('\n--- Section 1: Cryptographic Token Signing & Verification ---');

    const seedStudent = (await repo.users.getById('student-1'))!;
    assert(seedStudent, 'Seed user student-1 must exist');

    // 1.1 Token issuance produces valid v1.<base64url>.<hmac> format
    const validToken = authService.issueToken(seedStudent);
    const parts = validToken.split('.');
    assert.strictEqual(parts.length, 3, 'Token must have exactly 3 parts separated by dots');
    assert.strictEqual(parts[0], 'v1', 'Token version must be v1');
    console.log('[PASS] 1.1 Token issued with versioned HMAC v1 signature format');

    // 1.2 Valid token verifies payload correctly
    const payload = verifyAuthToken(validToken);
    assert.strictEqual(payload.sub, seedStudent.id, 'Token subject must match user ID');
    assert(payload.exp > Date.now(), 'Token expiration must be in the future');
    console.log('[PASS] 1.2 Valid token payload verified and decoded cryptographically');

    // 1.3 Tampered signature is strictly rejected
    const tamperedToken = `${parts[0]}.${parts[1]}.tampered_signature_bytes`;
    let rejectedTampered = false;
    try {
      verifyAuthToken(tamperedToken);
    } catch (err: any) {
      rejectedTampered = true;
      assert.strictEqual(err.statusCode, 401);
      assert.strictEqual(err.code, 'INVALID_CREDENTIALS');
    }
    assert(rejectedTampered, 'Tampered token must be rejected');
    console.log('[PASS] 1.3 Tampered token signature rejected with 401 INVALID_CREDENTIALS');

    // 1.4 Expired token is strictly rejected
    const expiredPayload = {
      sub: seedStudent.id,
      iat: Date.now() - 100000,
      exp: Date.now() - 1000,
      jti: 'jti-expired'
    };
    const expiredToken = signAuthPayload(expiredPayload);
    let rejectedExpired = false;
    try {
      verifyAuthToken(expiredToken);
    } catch (err: any) {
      rejectedExpired = true;
      assert.strictEqual(err.statusCode, 401);
    }
    assert(rejectedExpired, 'Expired token must be rejected');
    console.log('[PASS] 1.4 Expired token rejected with 401');

    // =========================================================================
    // SECTION 2: PRODUCTION VS DEVELOPMENT AUTHENTICATION SAFETY
    // =========================================================================
    console.log('\n--- Section 2: Production vs Development Authentication Safety ---');

    // 2.1 In production mode, unverified plain user IDs are rejected
    const origEnv = process.env.NODE_ENV;
    const origAllowDev = process.env.ALLOW_DEV_AUTH;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_DEV_AUTH;

      let rejectedProdPlain = false;
      try {
        await authService.authenticateToken('student-1');
      } catch (err: any) {
        rejectedProdPlain = true;
        assert.strictEqual(err.statusCode, 401);
      }
      assert(rejectedProdPlain, 'Plain user ID must be rejected as token in production');
      console.log('[PASS] 2.1 Plain user ID strictly rejected in production environment');

      // Valid HMAC token still authenticates cleanly in production
      const prodAuthUser = await authService.authenticateToken(validToken);
      assert.strictEqual(prodAuthUser.id, 'student-1');
      console.log('[PASS] 2.2 Valid HMAC token authenticates cleanly in production environment');
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = origAllowDev;
    }

    // =========================================================================
    // SECTION 3: HTTP SESSION & /ME ENDPOINTS
    // =========================================================================
    console.log('\n--- Section 3: Session Verification Endpoints ---');

    // 3.1 GET /api/auth/me with Bearer token
    {
      const res = await fetch(`${authUrl}/me`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.id, 'student-1');
      assert.strictEqual(data.role, 'student');
      assert(Array.isArray(data.capabilities), 'Capabilities must be returned');
      assert(Array.isArray(data.workspaces), 'User workspaces must be returned');
      console.log('[PASS] 3.1 GET /api/auth/me returns verified user, workspaces, and capabilities');
    }

    // 3.2 GET /api/auth/session alias
    {
      const res = await fetch(`${authUrl}/session`, {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.id, 'student-1');
      console.log('[PASS] 3.2 GET /api/auth/session alias returns complete session state');
    }

    // 3.3 Request without credentials rejected with 401
    {
      const res = await fetch(`${authUrl}/me`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'UNAUTHENTICATED');
      console.log('[PASS] 3.3 Unauthenticated /me request rejected with 401 UNAUTHENTICATED');
    }

    // =========================================================================
    // SECTION 4: LOGIN FLOW WITH REAL HMAC ISSUANCE
    // =========================================================================
    console.log('\n--- Section 4: Login Endpoint & HMAC Credential Issuance ---');

    const prevStage3DevAuth = process.env.ALLOW_DEV_AUTH;
    try {
      process.env.ALLOW_DEV_AUTH = 'true';
      // 4.1 Login by role (e.g. teacher)
      {
        const res = await fetch(`${authUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'teacher' })
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert(data.token, 'Must return signed HMAC token');
        assert.strictEqual(data.user.id, 'teacher-1');
        assert.strictEqual(data.role, 'teacher');
        assert(data.activeWorkspace, 'Must return active workspace');

        // Verify returned token is genuine HMAC
        const tokenPayload = verifyAuthToken(data.token);
        assert.strictEqual(tokenPayload.sub, 'teacher-1');
        console.log('[PASS] 4.1 POST /api/auth/login issues valid HMAC token for seed role');
      }

      // 4.2 Login with invalid credentials rejected with 401
      {
        const res = await fetch(`${authUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@nowhere.com' })
        });
        assert.strictEqual(res.status, 401);
        const data = await res.json();
        assert.strictEqual(data.error.code, 'INVALID_CREDENTIALS');
        console.log('[PASS] 4.2 POST /api/auth/login with invalid email returns 401 INVALID_CREDENTIALS');
      }
    } finally {
      if (prevStage3DevAuth !== undefined) process.env.ALLOW_DEV_AUTH = prevStage3DevAuth;
      else delete process.env.ALLOW_DEV_AUTH;
    }

    // =========================================================================
    // SECTION 5: INDIVIDUAL REGISTRATION & ISOLATED PERSONAL WORKSPACE
    // =========================================================================
    console.log('\n--- Section 5: Individual Registration & Workspace Isolation ---');

    const testUserEmail = `cadet.alex.${Date.now()}@sovereign.local`;
    let newAlexToken = '';
    let newAlexUserId = '';
    let newAlexWorkspaceId = '';

    // 5.1 Register individual standalone user (no institution affiliation)
    {
      const res = await fetch(`${authUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Alex Sovereign',
          email: testUserEmail,
          role: 'student',
          ageRange: '19-24',
          country: 'Canada'
        })
      });
      assert.strictEqual(res.status, 201, 'Individual registration must return 201 Created');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.token, 'Must return signed HMAC token');
      assert.strictEqual(data.user.displayName, 'Alex Sovereign');
      assert.strictEqual(data.user.email, testUserEmail);
      assert.strictEqual(data.user.institutionId, undefined, 'Individual user must have no institutionId');
      assert(data.activeWorkspace, 'Must create personal workspace');
      assert.strictEqual(data.activeWorkspace.ownerId, data.user.id);
      assert.strictEqual(data.activeWorkspace.institutionId, undefined);

      newAlexToken = data.token;
      newAlexUserId = data.user.id;
      newAlexWorkspaceId = data.activeWorkspace.id;

      // Verify token authenticity
      const tokenPayload = verifyAuthToken(newAlexToken);
      assert.strictEqual(tokenPayload.sub, newAlexUserId);
      console.log('[PASS] 5.1 Individual registration succeeds with dedicated personal workspace & signed token');
    }

    // 5.2 Duplicate email registration rejected with 409
    {
      const res = await fetch(`${authUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Alex Duplicate',
          email: testUserEmail,
          role: 'student'
        })
      });
      assert.strictEqual(res.status, 409, 'Duplicate email registration must return 409');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'USER_EXISTS');
      console.log('[PASS] 5.2 Duplicate email registration rejected with 409 USER_EXISTS');
    }

    // 5.3 Registration with invalid payload rejected with 400
    {
      const res = await fetch(`${authUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'A', // too short
          email: 'not-an-email'
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'INVALID_ARGUMENTS');
      console.log('[PASS] 5.3 Malformed registration payload rejected with 400 INVALID_ARGUMENTS');
    }

    // 5.4 Newly registered user can authenticate and retrieve their profile
    {
      const res = await fetch(`${authUrl}/me`, {
        headers: { Authorization: `Bearer ${newAlexToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.id, newAlexUserId);
      assert.strictEqual(data.user.displayName, 'Alex Sovereign');
      assert.strictEqual(data.activeWorkspace.id, newAlexWorkspaceId);
      console.log('[PASS] 5.4 Newly registered user authenticates and verifies isolated personal workspace');
    }

    // 5.5 Tenant isolation: User B cannot access User A's private workspace
    {
      const alexWs = await repo.workspaces.getById(newAlexWorkspaceId);
      assert(alexWs, 'Alex workspace must exist in repository');

      // Student-1 attempts to access Alex's private workspace
      const student1Principal = {
        userId: 'student-1',
        role: 'student' as const,
        provenance: 'signed-hmac' as const
      };
      const isMember = (await repo.workspaces.getMembers(newAlexWorkspaceId)).some((m) => m.userId === 'student-1');
      assert.strictEqual(isMember, false, 'Student-1 must not be member of Alex workspace');

      const accessDecision = policy.canAccessWorkspace(student1Principal, alexWs, isMember);
      assert.strictEqual(accessDecision.allowed, false, 'Cross-user workspace access must be denied');
      console.log('[PASS] 5.5 Tenant isolation strictly enforced: external user denied access to private workspace');
    }

    // =========================================================================
    // SECTION 6: LOGOUT ENDPOINT
    // =========================================================================
    console.log('\n--- Section 6: Logout Endpoint ---');

    {
      const res = await fetch(`${authUrl}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      console.log('[PASS] 6.1 POST /api/auth/logout responds successfully');
    }

    console.log('\n===================================================================');
    console.log(' STAGE 3 AUTH & PROTECTED ROUTE GUARDS SUITE: ALL TESTS PASSED! ');
    console.log('===================================================================\n');
  } finally {
    try {
      await new Promise((resolve) => server.close(resolve));
    } finally {
      resetActiveRepository();
      if (isolatedTempDir && fs.existsSync(isolatedTempDir)) {
        fs.rmSync(isolatedTempDir, { recursive: true, force: true });
      }
    }
  }
}

runStage3AuthTests().catch((err) => {
  console.error('[FAIL] Stage 3 Auth Test Suite Failure:', err);
  process.exit(1);
});
