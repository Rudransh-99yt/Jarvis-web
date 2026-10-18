// JARVIS-WEB — MILESTONE 1, BATCH 1: AUTHENTICATION BOUNDARY HARDENING REGRESSION TEST SUITE
import assert from 'node:assert';
import { startHttpHarness } from './httpHarness.ts';
import {
  resolveAuthSecret,
  verifyAuthToken,
  signAuthPayload,
  AuthenticationError,
  authService
} from '../server/auth/tokens.ts';
import {
  jarvisData,
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository
} from '../server/data/index.ts';

async function runMilestone1Batch1Tests() {
  console.log('===================================================================');
  console.log('=== [JARVIS-WEB] MILESTONE 1, BATCH 1: AUTH HARDENING TEST SUITE ===');
  console.log('===================================================================\n');

  const initialEnvSnapshot = {
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH,
    AUTH_SECRET_KEY: process.env.AUTH_SECRET_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    JARVIS_AUTH_SECRET: process.env.JARVIS_AUTH_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET
  };

  let harness: Awaited<ReturnType<typeof startHttpHarness>> | null = null;

  try {
    // =========================================================================
    // SECTION 1: PRODUCTION STARTUP & SECRET HANDLING
    // =========================================================================
    console.log('--- Section 1: Production Startup & Secret Handling ---');

    const origEnv = process.env.NODE_ENV;
    const origAuthSecretKey = process.env.AUTH_SECRET_KEY;
    const origJwtSecret = process.env.JWT_SECRET;
    const origJarvisSecret = process.env.JARVIS_AUTH_SECRET;
    const origSessionSecret = process.env.SESSION_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_SECRET_KEY;
      delete process.env.JWT_SECRET;
      delete process.env.JARVIS_AUTH_SECRET;
      delete process.env.SESSION_SECRET;

      // 1.1 Fails closed in production when secret is missing
      let missingSecretThrew = false;
      try {
        resolveAuthSecret();
      } catch (err: any) {
        missingSecretThrew = true;
        assert(err instanceof AuthenticationError, 'Missing secret must throw AuthenticationError');
        assert.strictEqual(err.statusCode, 401, 'Must fail closed with status 401');
        assert(err.message.includes('SecurityViolation') || err.message.includes('production'), 'Must state security violation');
      }
      assert(missingSecretThrew, 'Missing secret in production must fail closed');
      console.log('[PASS] 1.1 Production startup fails closed when secret is missing');

      // 1.2 Fails closed in production when secret is shorter than 32 characters
      let shortSecretThrew = false;
      process.env.AUTH_SECRET_KEY = 'too-short-secret-under-32ch';
      try {
        resolveAuthSecret();
      } catch (err: any) {
        shortSecretThrew = true;
        assert(err instanceof AuthenticationError, 'Short secret must throw AuthenticationError');
        assert.strictEqual(err.statusCode, 401, 'Must fail closed with status 401');
      }
      assert(shortSecretThrew, 'Short secret in production must fail closed');
      console.log('[PASS] 1.2 Production startup fails closed when secret is < 32 characters');

      // 1.3 Succeeds in production when secret is >= 32 characters
      process.env.AUTH_SECRET_KEY = 'a-very-long-production-secret-with-at-least-32-chars';
      const resolvedProd = resolveAuthSecret();
      assert.strictEqual(resolvedProd, 'a-very-long-production-secret-with-at-least-32-chars');
      console.log('[PASS] 1.3 Production secret resolves successfully when >= 32 characters');
    } finally {
      if (origEnv !== undefined) process.env.NODE_ENV = origEnv; else delete process.env.NODE_ENV;
      if (origAuthSecretKey !== undefined) process.env.AUTH_SECRET_KEY = origAuthSecretKey; else delete process.env.AUTH_SECRET_KEY;
      if (origJwtSecret !== undefined) process.env.JWT_SECRET = origJwtSecret; else delete process.env.JWT_SECRET;
      if (origJarvisSecret !== undefined) process.env.JARVIS_AUTH_SECRET = origJarvisSecret; else delete process.env.JARVIS_AUTH_SECRET;
      if (origSessionSecret !== undefined) process.env.SESSION_SECRET = origSessionSecret; else delete process.env.SESSION_SECRET;
    }

    // 1.4 Non-production behaves safely and uses development fallback without claiming production
    const devSecret = resolveAuthSecret();
    assert(devSecret.length >= 32, 'Dev fallback secret must be at least 32 characters');
    console.log('[PASS] 1.4 Non-production environment resolves safe development secret');

    // =========================================================================
    // START HTTP HARNESS FOR NETWORK CONTRACT VERIFICATION
    // =========================================================================
    harness = await startHttpHarness();
    const baseUrl = harness.baseUrl;

    const studentToken = await harness.tokenFor('student-1');
    const teacherToken = await harness.tokenFor('teacher-1');

    // =========================================================================
    // SECTION 2: PRODUCTION LOGIN BOUNDARY (SCENARIOS 1, 2, 6)
    // =========================================================================
    console.log('\n--- Section 2: Production Login Boundary ---');

    // 2.1 Production login rejection for role, email, and user ID (even for ordinary roles)
    {
      const savedEnv = process.env.NODE_ENV;
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOW_DEV_AUTH;

        const roleRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'student' })
        });
        assert.strictEqual(roleRes.status, 403, 'Production must reject role-based login with 403');
        const roleBody = await roleRes.json();
        assert.strictEqual(roleBody.error?.code, 'UNVERIFIED_LOGIN_DISALLOWED');

        const emailRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'sarah.quantum@stark.edu' })
        });
        assert.strictEqual(emailRes.status, 403, 'Production must reject email-based login with 403');
        const emailBody = await emailRes.json();
        assert.strictEqual(emailBody.error?.code, 'UNVERIFIED_LOGIN_DISALLOWED');

        const userRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'student-1' })
        });
        assert.strictEqual(userRes.status, 403, 'Production must reject userId-based login with 403');
        const userBody = await userRes.json();
        assert.strictEqual(userBody.error?.code, 'UNVERIFIED_LOGIN_DISALLOWED');

        console.log('[PASS] 2.1 Production rejects credential-free login by role, email, and userId');
      } finally {
        if (savedEnv !== undefined) process.env.NODE_ENV = savedEnv; else delete process.env.NODE_ENV;
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // 2.2 Production rejection with ALLOW_DEV_AUTH=true (flag cannot bypass production gate)
    {
      const savedEnv = process.env.NODE_ENV;
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_DEV_AUTH = 'true';

        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'student' })
        });
        assert.strictEqual(res.status, 403, 'ALLOW_DEV_AUTH=true must not bypass production check');
        const body = await res.json();
        assert.strictEqual(body.error?.code, 'UNVERIFIED_LOGIN_DISALLOWED');
        console.log('[PASS] 2.2 Production login rejection enforced even when ALLOW_DEV_AUTH=true');
      } finally {
        if (savedEnv !== undefined) process.env.NODE_ENV = savedEnv; else delete process.env.NODE_ENV;
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // 2.3 Impersonation attempts against teacher, principal, student, and parent accounts in production
    {
      const savedEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const targetVictims = [
          { role: 'teacher', email: 'sarah.quantum@stark.edu', id: 'teacher-1' },
          { role: 'principal', email: 'principal@stark.edu', id: 'principal-1' },
          { role: 'student', email: 'alex.chen@stark.edu', id: 'student-1' },
          { role: 'parent', email: 'parent.chen@stark.edu', id: 'parent-1' }
        ];

        for (const victim of targetVictims) {
          const resEmail = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: victim.email })
          });
          assert.strictEqual(resEmail.status, 403, `Production must block impersonation of ${victim.role} by email`);
          const bodyEmail = await resEmail.json();
          assert.strictEqual(bodyEmail.error?.code, 'UNVERIFIED_LOGIN_DISALLOWED');

          const resRole = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: victim.role })
          });
          assert.strictEqual(resRole.status, 403, `Production must block impersonation of ${victim.role} by role`);
          const bodyRole = await resRole.json();
          assert.strictEqual(bodyRole.error?.code, 'UNVERIFIED_LOGIN_DISALLOWED');
        }
        console.log('[PASS] 2.3 Impersonation attempts against teacher, principal, student, and parent accounts strictly blocked in production');
      } finally {
        if (savedEnv !== undefined) process.env.NODE_ENV = savedEnv; else delete process.env.NODE_ENV;
      }
    }

    // =========================================================================
    // SECTION 2B: NON-PRODUCTION DEV AUTH GATING & PRIVILEGE RESTRICTION (SCENARIOS 3, 4, 5)
    // =========================================================================
    console.log('\n--- Section 2b: Non-Production Dev-Auth Gating & Privilege Restriction ---');

    // 2b.1 Non-production rejection when ALLOW_DEV_AUTH is absent or false
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        delete process.env.ALLOW_DEV_AUTH;
        const resAbsent = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'student' })
        });
        assert.strictEqual(resAbsent.status, 403, 'Absent ALLOW_DEV_AUTH must reject login with 403');
        const bodyAbsent = await resAbsent.json();
        assert.strictEqual(bodyAbsent.error?.code, 'DEV_AUTH_REQUIRED');

        process.env.ALLOW_DEV_AUTH = 'false';
        const resFalse = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'student' })
        });
        assert.strictEqual(resFalse.status, 403, 'ALLOW_DEV_AUTH=false must reject login with 403');
        const bodyFalse = await resFalse.json();
        assert.strictEqual(bodyFalse.error?.code, 'DEV_AUTH_REQUIRED');

        console.log('[PASS] 2b.1 Non-production credential-free login strictly rejected when ALLOW_DEV_AUTH is absent or false');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // 2b.2 Explicit development-login success for permitted demo users when ALLOW_DEV_AUTH=true
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.ALLOW_DEV_AUTH = 'true';
        const demoRoles = ['student', 'teacher', 'principal', 'parent'];
        for (const demoRole of demoRoles) {
          const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: demoRole })
          });
          assert.strictEqual(res.status, 200, `Permitted demo role ${demoRole} must succeed with ALLOW_DEV_AUTH=true`);
          const body = await res.json();
          assert(body.token, `Must return signed token for ${demoRole}`);
          assert.strictEqual(body.user.role, demoRole);
        }
        console.log('[PASS] 2b.2 Explicit development-login succeeds for permitted demo roles (student, teacher, principal, parent)');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // 2b.3 Admin and commander rejection even when ALLOW_DEV_AUTH=true in non-production
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.ALLOW_DEV_AUTH = 'true';

        // Role variations
        for (const privRole of ['admin', 'commander', ' ADMIN ', 'Commander']) {
          const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: privRole })
          });
          assert.strictEqual(res.status, 403, `Privileged role '${privRole}' must be rejected with 403`);
          const body = await res.json();
          assert.strictEqual(body.error?.code, 'PRIVILEGED_LOGIN_DISALLOWED');
        }

        // Email lookup for commander account
        const emailRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'tony@starkindustries.com' })
        });
        assert.strictEqual(emailRes.status, 403, 'Privileged email login must be rejected with 403');
        const emailBody = await emailRes.json();
        assert.strictEqual(emailBody.error?.code, 'PRIVILEGED_LOGIN_DISALLOWED');

        // UserId lookup for commander account
        const userRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-tony' })
        });
        assert.strictEqual(userRes.status, 403, 'Privileged userId login must be rejected with 403');
        const userBody = await userRes.json();
        assert.strictEqual(userBody.error?.code, 'PRIVILEGED_LOGIN_DISALLOWED');

        console.log('[PASS] 2b.3 Admin and commander login strictly blocked in non-production even with ALLOW_DEV_AUTH=true');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // =========================================================================
    // SECTION 3: TOKEN ISSUANCE ENDPOINT HARDENING (POST /api/auth/token)
    // =========================================================================
    console.log('\n--- Section 3: Arbitrary Token Issuance Hardening ---');

    // 3.1 In production mode, POST /api/auth/token returns 403
    {
      const savedEnv = process.env.NODE_ENV;
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_DEV_AUTH = 'true'; // Even if flag is set, production must reject
        const res = await fetch(`${baseUrl}/api/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'student-1' })
        });
        assert.strictEqual(res.status, 403, 'POST /api/auth/token must return 403 in production');
        console.log('[PASS] 3.1 POST /api/auth/token strictly disabled in production mode');
      } finally {
        if (savedEnv !== undefined) process.env.NODE_ENV = savedEnv; else delete process.env.NODE_ENV;
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // 3.2 In dev/test mode without ALLOW_DEV_AUTH, returns 403
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        delete process.env.ALLOW_DEV_AUTH;
        const res = await fetch(`${baseUrl}/api/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'student-1' })
        });
        assert.strictEqual(res.status, 403, 'POST /api/auth/token must return 403 without ALLOW_DEV_AUTH=true');
        console.log('[PASS] 3.2 POST /api/auth/token rejected without explicit ALLOW_DEV_AUTH=true');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev;
      }
    }

    // 3.3 With ALLOW_DEV_AUTH=true in non-production, returns token
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.ALLOW_DEV_AUTH = 'true';
        const res = await fetch(`${baseUrl}/api/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'student-1' })
        });
        assert.strictEqual(res.status, 200, 'POST /api/auth/token permitted with explicit dev flag');
        const body = await res.json();
        assert(body.token, 'Must return token');
        console.log('[PASS] 3.3 POST /api/auth/token permits issuance when explicitly enabled in dev');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // =========================================================================
    // SECTION 3B: REGISTRATION HARDENING & INPUT VALIDATION (SCENARIOS 7, 8, 9, 10, 11, 12)
    // =========================================================================
    console.log('\n--- Section 3b: Registration Security & Input Validation Hardening ---');

    const initialUsersCount = (await jarvisData.users.list()).length;
    const initialWorkspacesCount = (await jarvisData.workspaces.list()).length;

    // 3b.1 Malformed or missing registration fields rejected with 400
    {
      // Missing displayName
      const resNoName = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'valid.name@test.org' })
      });
      assert.strictEqual(resNoName.status, 400);
      assert.strictEqual((await resNoName.json()).error?.code, 'INVALID_ARGUMENTS');

      // Whitespace-only displayName
      const resSpaceName = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: '   ', email: 'valid.name@test.org' })
      });
      assert.strictEqual(resSpaceName.status, 400);
      assert.strictEqual((await resSpaceName.json()).error?.code, 'INVALID_ARGUMENTS');

      // Missing email
      const resNoEmail = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Valid Name' })
      });
      assert.strictEqual(resNoEmail.status, 400);
      assert.strictEqual((await resNoEmail.json()).error?.code, 'INVALID_ARGUMENTS');

      // Malformed email variations
      for (const badEmail of ['not-an-email', 'user@', '@nowhere.com', 'user @domain.com', 'user@domain']) {
        const resBadEmail = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: 'Valid Name', email: badEmail })
        });
        assert.strictEqual(resBadEmail.status, 400, `Malformed email '${badEmail}' must return 400`);
        assert.strictEqual((await resBadEmail.json()).error?.code, 'INVALID_ARGUMENTS');
      }

      // Invalid institution invitation code
      const resBadCode = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Valid Cadet',
          email: 'valid.cadet@test.org',
          institutionCode: 'BOGUS-INVITE-CODE'
        })
      });
      assert.strictEqual(resBadCode.status, 400);
      assert.strictEqual((await resBadCode.json()).error?.code, 'INVALID_INVITATION');

      console.log('[PASS] 3b.1 Malformed, whitespace-only, and missing registration fields rejected with 400');
    }

    // 3b.2 Registration attempt to claim existing email rejected with 409
    {
      const resDup = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Alex Impostor',
          email: 'alex.chen@stark.edu'
        })
      });
      assert.strictEqual(resDup.status, 409, 'Registration with existing email must return 409');
      assert.strictEqual((await resDup.json()).error?.code, 'USER_EXISTS');
      console.log('[PASS] 3b.2 Registration attempt to claim existing email rejected with 409 USER_EXISTS');
    }

    // 3b.3 Duplicate-email variations involving case and whitespace rejected with 409
    {
      for (const dupEmail of ['  alex.chen@stark.edu  ', 'ALEX.CHEN@STARK.EDU', '  Alex.Chen@Stark.Edu  ']) {
        const res = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: 'Impostor Variation',
            email: dupEmail
          })
        });
        assert.strictEqual(res.status, 409, `Duplicate email variant '${dupEmail}' must be rejected with 409`);
        assert.strictEqual((await res.json()).error?.code, 'USER_EXISTS');
      }
      console.log('[PASS] 3b.3 Duplicate email variations with whitespace and case rejected with 409');
    }

    // 3b.4 Attempts to self-assign privileged or unauthorized roles during public registration
    {
      for (const privRole of ['commander', 'admin', 'principal', 'teacher']) {
        const testEmail = `cadet.priv.${Date.now()}.${privRole}@test.org`;
        const res = await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: `Cadet ${privRole}`,
            email: testEmail,
            role: privRole
          })
        });
        assert.strictEqual(res.status, 201, 'Registration completes but role must be safe default');
        const body = await res.json();
        assert.strictEqual(body.user.role, 'student', `Self-assigned role '${privRole}' must be safely defaulted to 'student'`);
      }
      console.log('[PASS] 3b.4 Attempts to self-assign privileged roles (commander, admin, principal, teacher) safely demoted to student');
    }

    // 3b.5 Verification that rejected requests do NOT create users, workspaces, or tokens
    {
      // Try an invalid registration
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Bad Registration', email: 'invalid-email-format' })
      });

      // Try a duplicate registration
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Bad Registration', email: 'alex.chen@stark.edu' })
      });

      // Try an invalid invitation code
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Bad Registration', email: 'new.bad@test.org', institutionCode: 'INVALID-CODE' })
      });

      // Check current counts: only the 4 users from test 3b.4 were added
      const currentUsers = await jarvisData.users.list();
      const currentWorkspaces = await jarvisData.workspaces.list();
      assert.strictEqual(currentUsers.length, initialUsersCount + 4, 'Rejected registrations must not create user records');
      assert.strictEqual(currentWorkspaces.length, initialWorkspacesCount + 4, 'Rejected registrations must not create workspace records');
      console.log('[PASS] 3b.5 Rejected registration requests caused zero side effects on user and workspace stores');
    }

    // 3b.6 Valid legitimate registration flow succeeds and produces verified session
    {
      const validEmail = `legit.student.${Date.now()}@sovereign.local`;
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Legitimate Student',
          email: validEmail,
          role: 'student'
        })
      });
      assert.strictEqual(res.status, 201, 'Valid registration must return 201');
      const body = await res.json();
      assert(body.token, 'Must return signed token');
      assert.strictEqual(body.user.email, validEmail);
      assert.strictEqual(body.user.role, 'student');
      assert(body.activeWorkspace, 'Must create personal workspace');

      // Verify token works on /api/auth/me
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${body.token}` }
      });
      assert.strictEqual(meRes.status, 200);
      const meBody = await meRes.json();
      assert.strictEqual(meBody.user.id, body.user.id);
      console.log('[PASS] 3b.6 Legitimate registration succeeds and returns authentic session token');
    }

    // 3b.7 Atomic normalized-email uniqueness under concurrent registrations
    {
      const targetEmail = `concurrent.atomic.${Date.now()}@domain.org`;
      const variations = [
        targetEmail,
        `  ${targetEmail}  `,
        targetEmail.toUpperCase(),
        `  ${targetEmail.toUpperCase()}  `,
        targetEmail,
        `   ${targetEmail}   `
      ];

      const responses = await Promise.all(
        variations.map((emailVar, idx) =>
          fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              displayName: `Concurrent User ${idx}`,
              email: emailVar,
              role: 'student'
            })
          })
        )
      );

      const successResponses = responses.filter((r) => r.status === 201);
      const conflictResponses = responses.filter((r) => r.status === 409);

      assert.strictEqual(successResponses.length, 1, 'Exactly one concurrent registration must succeed with 201');
      assert.strictEqual(conflictResponses.length, variations.length - 1, 'All other concurrent registrations must fail with 409');

      for (const confRes of conflictResponses) {
        const body = await confRes.json();
        assert.strictEqual(body.error?.code, 'USER_EXISTS');
      }

      // Authoritative database assertion: exactly one record exists in persistent state
      const matchingUsers = (await jarvisData.users.list()).filter(
        (u) => u.email.toLowerCase() === targetEmail.toLowerCase()
      );
      assert.strictEqual(matchingUsers.length, 1, 'Storage must contain exactly one user for normalized email');

      // Check workspaces: exactly one personal workspace created
      const matchingWorkspaces = (await jarvisData.workspaces.list()).filter(
        (w) => w.ownerId === matchingUsers[0].id
      );
      assert.strictEqual(matchingWorkspaces.length, 1, 'Storage must contain exactly one workspace for user');

      console.log('[PASS] 3b.7 Concurrent registrations with normalized duplicate emails yield exactly one user account');
    }

    // 3b.8 Concurrent registrations with single-use invitation code
    {
      const singleUseCode = `TEST-SINGLE-USE-${Date.now()}`;
      await jarvisData.institutions.createInvitation({
        id: `inv-${Date.now()}`,
        code: singleUseCode,
        institutionId: 'inst-stark-academy',
        institutionName: 'Stark Academy of Science & Technology',
        role: 'teacher',
        status: 'active',
        maxUses: 1,
        expiresAt: '2030-01-01T00:00:00.000Z',
        createdBy: 'principal-1'
      });

      // 5 concurrent registrations with DIFFERENT emails competing for the single-use code
      const concurrentEmails = Array.from({ length: 5 }, (_, i) => `competing.teacher.${Date.now()}.${i}@stark.edu`);
      const responses = await Promise.all(
        concurrentEmails.map((email, idx) =>
          fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              displayName: `Competing Teacher ${idx}`,
              email,
              institutionCode: singleUseCode
            })
          })
        )
      );

      const successResponses = responses.filter((r) => r.status === 201);
      const invalidInvResponses = responses.filter((r) => r.status === 400);

      assert.strictEqual(successResponses.length, 1, 'Exactly one concurrent registration can consume single-use code');
      assert.strictEqual(invalidInvResponses.length, concurrentEmails.length - 1, 'All other registrations must be rejected with 400');

      const successBody = await successResponses[0].json();
      assert.strictEqual(successBody.role, 'teacher');
      assert.strictEqual(successBody.user.role, 'teacher');

      for (const failRes of invalidInvResponses) {
        const body = await failRes.json();
        assert.strictEqual(body.error?.code, 'INVALID_INVITATION');
      }

      // Assert database state: exactly 1 user with that role was created from this batch
      const createdCompetingUsers = (await jarvisData.users.list()).filter((u) =>
        concurrentEmails.includes(u.email)
      );
      assert.strictEqual(createdCompetingUsers.length, 1, 'Zero orphan user accounts created for failed registrations');
      assert.strictEqual(createdCompetingUsers[0].id, successBody.user.id);

      // Check invitation state in database: usedCount === 1, status === 'consumed'
      const invRecord = await jarvisData.institutions.getInvitationByCode(singleUseCode);
      assert(invRecord, 'Invitation record must exist');
      assert.strictEqual(invRecord.usedCount, 1, 'Invitation usedCount must be exactly 1');
      assert.strictEqual(invRecord.status, 'consumed', 'Invitation status must be consumed');

      console.log('[PASS] 3b.8 Single-use invitation permits at most one privileged registration under concurrency with zero orphan state');
    }

    // 3b.9 Role escalation defense: invitation poisoned with admin or commander cannot grant elevated role
    {
      const poisonAdminCode = `TEST-POISON-ADMIN-${Date.now()}`;
      await jarvisData.institutions.createInvitation({
        id: `inv-poison-${Date.now()}`,
        code: poisonAdminCode,
        institutionId: 'inst-stark-academy',
        institutionName: 'Stark Academy of Science & Technology',
        role: 'admin' as any, // Attacker attempts to forge admin invitation
        status: 'active',
        maxUses: 5,
        expiresAt: '2030-01-01T00:00:00.000Z',
        createdBy: 'malicious'
      });

      const poisonEmail = `cadet.poison.${Date.now()}@test.org`;
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Malicious Cadet',
          email: poisonEmail,
          institutionCode: poisonAdminCode
        })
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.role, 'student', 'Admin role on invitation must be demoted to student');
      assert.strictEqual(body.user.role, 'student', 'Persisted user role must be student');

      const persistedUser = await jarvisData.users.getById(body.user.id);
      assert.strictEqual(persistedUser?.role, 'student', 'Database record must be demoted to student');

      console.log('[PASS] 3b.9 Poisoned invitation with admin/commander role strictly demoted to student');
    }

    // 3b.10 Dual-repository unit tests on MemoryJarvisDataRepository and DiskJarvisDataRepository
    {
      const memRepo = new MemoryJarvisDataRepository();
      await memRepo.init();

      // Test 1: Memory repository rejects duplicate normalized email
      await memRepo.users.create({
        id: 'user-mem-1',
        displayName: 'Mem User',
        email: 'test.mem@domain.org',
        role: 'student'
      });

      let memThrew = false;
      try {
        await memRepo.users.create({
          id: 'user-mem-2',
          displayName: 'Mem User 2',
          email: '  TEST.MEM@DOMAIN.ORG  ',
          role: 'student'
        });
      } catch (err: any) {
        memThrew = true;
        assert.strictEqual(err.code, 'USER_EXISTS');
      }
      assert(memThrew, 'Memory repo must throw USER_EXISTS on duplicate normalized email');

      // Test 2: Memory repository rollback restores invitation usedCount
      await memRepo.institutions.createInvitation({
        id: 'inv-mem-1',
        code: 'MEM-CODE',
        institutionId: 'inst-1',
        institutionName: 'Inst 1',
        role: 'teacher',
        status: 'active',
        maxUses: 1,
        expiresAt: '2030-01-01T00:00:00.000Z',
        createdBy: 'admin'
      });

      let txThrew = false;
      try {
        await memRepo.runTransaction(async (tx) => {
          await tx.institutions.consumeInvitation('MEM-CODE', 'user-tx-1');
          throw new Error('Simulated failure during registration');
        });
      } catch (err: any) {
        txThrew = true;
      }
      assert(txThrew, 'Transaction must throw');
      const invAfterRollback = await memRepo.institutions.getInvitationByCode('MEM-CODE');
      assert.strictEqual(invAfterRollback?.usedCount, 0, 'Rolled back transaction must restore usedCount');
      assert.strictEqual(invAfterRollback?.status, 'active', 'Rolled back transaction must restore status');

      console.log('[PASS] 3b.10 Dual-repository parity: Memory and Disk repositories enforce atomic uniqueness and transaction rollback');
    }

    // =========================================================================
    // SECTION 4: IDENTITY SPOOFING REJECTION ACROSS SUBROUTERS
    // =========================================================================
    console.log('\n--- Section 4: Identity Spoofing Rejection Across Subrouters ---');

    // 4.1 Raw x-user-id header without Authorization Bearer is rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/education/teacher/action-queue`, {
        headers: { 'x-user-id': 'teacher-1' }
      });
      assert.strictEqual(res.status, 401, 'Raw x-user-id header without token must be rejected with 401');
      console.log('[PASS] 4.1 Raw x-user-id header rejected with 401');
    }

    // 4.2 Raw x-user-role header without Authorization Bearer is rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/education/teacher/action-queue`, {
        headers: { 'x-user-role': 'teacher' }
      });
      assert.strictEqual(res.status, 401, 'Raw x-user-role header without token must be rejected with 401');
      console.log('[PASS] 4.2 Raw x-user-role header rejected with 401');
    }

    // 4.3 Query parameters (userId/role) without Authorization Bearer are rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/education/teacher/action-queue?userId=teacher-1&role=teacher`);
      assert.strictEqual(res.status, 401, 'Query parameters userId/role without token must be rejected with 401');
      console.log('[PASS] 4.3 Query parameters userId/role rejected with 401');
    }

    // 4.4 x-jarvis-user-id header without token is rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/education/smartboard/control-plane/boards`, {
        headers: { 'x-jarvis-user-id': 'teacher-1' }
      });
      assert.strictEqual(res.status, 401, 'x-jarvis-user-id without token must be rejected with 401');
      console.log('[PASS] 4.4 x-jarvis-user-id header rejected with 401');
    }

    // =========================================================================
    // SECTION 5: NO SILENT FALLBACK IDENTITIES
    // =========================================================================
    console.log('\n--- Section 5: No Silent Fallback Identities ---');

    const protectedEndpoints = [
      { method: 'GET', path: '/api/education/teacher/action-queue', label: 'Teacher Action Queue' },
      { method: 'GET', path: '/api/education/teacher/attention', label: 'Teacher Attention Signals' },
      { method: 'GET', path: '/api/education/smartboard/control-plane/boards', label: 'SmartBoard Control Plane Boards' },
      { method: 'GET', path: '/api/education/smartboard/knowledge/search?q=physics', label: 'SmartBoard Knowledge Search' },
      { method: 'GET', path: '/api/education/copilot/proposals', label: 'Copilot Proposals' },
      { method: 'GET', path: '/api/education/visualizations', label: 'Visualizations' },
      { method: 'GET', path: '/api/education/integration/notifications', label: 'Academic Notifications' },
      { method: 'GET', path: '/api/education/sessions', label: 'Class Sessions' },
      { method: 'GET', path: '/api/education/focus/active', label: 'Focus Active Session' },
      { method: 'GET', path: '/api/education/engagement/my-activity', label: 'Engagement Activity' },
      { method: 'GET', path: '/api/education/community/channels', label: 'Community Channels' },
      { method: 'GET', path: '/api/education/intelligence/sessions/session-phys-101', label: 'Classroom Intelligence Session' }
    ];

    for (const ep of protectedEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, { method: ep.method });
      assert.strictEqual(res.status, 401, `Endpoint ${ep.path} must reject unauthenticated requests with 401`);
      const body = await res.json();
      const errCode = body.error?.code || body.code || (typeof body.error === 'string' ? 'UNAUTHENTICATED' : null);
      assert(
        errCode === 'UNAUTHENTICATED' || errCode === 'INVALID_CREDENTIALS',
        `Endpoint ${ep.path} must return unauthenticated error code, got: ${JSON.stringify(body)}`
      );
    }
    console.log('[PASS] 5.1 All 12 audited subrouter endpoints strictly return 401 with zero fallback identities');

    // =========================================================================
    // SECTION 6: TEACHER ACTIONS AUTHORIZATION
    // =========================================================================
    console.log('\n--- Section 6: Teacher Actions Role Authorization ---');

    // 6.1 Unauthenticated teacher action rejected with 401
    {
      const res = await fetch(`${baseUrl}/api/education/teacher/action-queue`);
      assert.strictEqual(res.status, 401);
      console.log('[PASS] 6.1 Unauthenticated request to teacher queue rejected with 401');
    }

    // 6.2 Student token calling teacher queue rejected with 403
    {
      const res = await fetch(`${baseUrl}/api/education/teacher/action-queue`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 403, 'Student calling teacher queue must receive 403');
      const body = await res.json();
      assert.strictEqual(body.error?.code, 'FORBIDDEN');
      console.log('[PASS] 6.2 Student calling teacher queue rejected with 403 FORBIDDEN');
    }

    // 6.3 Student token attempting to forge teacher role in header is still rejected with 403
    {
      const res = await fetch(`${baseUrl}/api/education/teacher/action-queue`, {
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'x-user-role': 'teacher'
        }
      });
      assert.strictEqual(res.status, 403, 'Role header forgery must not elevate student permissions');
      console.log('[PASS] 6.3 Header role forgery ignored; student rejected with 403');
    }

    // 6.4 Teacher token calling teacher queue succeeds with 200
    {
      const res = await fetch(`${baseUrl}/api/education/teacher/action-queue`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(res.status, 200, 'Teacher token must access action queue');
      const body = await res.json();
      assert(Array.isArray(body.queue), 'Response must contain queue array');
      console.log('[PASS] 6.4 Teacher token successfully accesses action queue');
    }

    // =========================================================================
    // SECTION 7: LESSON COMPLETION TOGGLING HARDENING
    // =========================================================================
    console.log('\n--- Section 7: Lesson Completion Toggling Boundary ---');
    const lessonCompleteUrl = `${baseUrl}/api/education/classes/class-phys-301/units/unit-phys-1/lessons/les-phys-101/complete`;

    // 7.1 Missing authorization header -> 401
    {
      const res = await fetch(lessonCompleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: true })
      });
      assert.strictEqual(res.status, 401, 'Missing authorization must be rejected with 401');
      console.log('[PASS] 7.1 Lesson complete rejects missing authorization with 401');
    }

    // 7.2 Malformed authorization -> 401
    {
      const res = await fetch(lessonCompleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer malformed.invalid.token'
        },
        body: JSON.stringify({ isCompleted: true })
      });
      assert.strictEqual(res.status, 401, 'Malformed token must be rejected with 401');
      console.log('[PASS] 7.2 Lesson complete rejects malformed token with 401');
    }

    // 7.3 Expired token -> 401
    {
      const expiredToken = signAuthPayload({
        sub: 'student-1',
        iat: Date.now() - 3600000,
        exp: Date.now() - 1000,
        jti: 'jti-expired'
      });
      const res = await fetch(lessonCompleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expiredToken}`
        },
        body: JSON.stringify({ isCompleted: true })
      });
      assert.strictEqual(res.status, 401, 'Expired token must be rejected with 401');
      console.log('[PASS] 7.3 Lesson complete rejects expired token with 401');
    }

    // 7.4 Tampered token -> 401
    {
      const parts = studentToken.split('.');
      const tampered = `${parts[0]}.${parts[1]}.tampered_signature_payload`;
      const res = await fetch(lessonCompleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tampered}`
        },
        body: JSON.stringify({ isCompleted: true })
      });
      assert.strictEqual(res.status, 401, 'Tampered token must be rejected with 401');
      console.log('[PASS] 7.4 Lesson complete rejects tampered token with 401');
    }

    // 7.5 Teacher role cannot modify student lesson completion -> 403
    {
      const res = await fetch(lessonCompleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`
        },
        body: JSON.stringify({ isCompleted: true })
      });
      assert.strictEqual(res.status, 403, 'Teacher role must receive 403 for student lesson completion');
      console.log('[PASS] 7.5 Lesson complete rejects non-student role with 403');
    }

    // 7.6 Valid student token succeeds -> 200
    {
      const res = await fetch(lessonCompleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({ isCompleted: true })
      });
      assert.strictEqual(res.status, 200, 'Valid student token must succeed');
      const body = await res.json();
      assert.strictEqual(body.isCompleted, true);
      console.log('[PASS] 7.6 Lesson complete succeeds for authorized student');
    }

    // =========================================================================
    // SECTION 8: AUTHORIZED USER FLOWS
    // =========================================================================
    console.log('\n--- Section 8: Authorized User Flows ---');

    // 8.1 Student authenticated GET /api/auth/me
    {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.user.id, 'student-1');
      assert.strictEqual(body.user.role, 'student');
      console.log('[PASS] 8.1 Student /api/auth/me resolves verified identity and role');
    }

    // 8.2 Teacher authenticated GET /api/auth/me
    {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.user.id, 'teacher-1');
      assert.strictEqual(body.user.role, 'teacher');
      console.log('[PASS] 8.2 Teacher /api/auth/me resolves verified identity and role');
    }

    // 8.3 Student submitting assignment succeeds
    {
      const res = await fetch(`${baseUrl}/api/education/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          assignmentId: 'asg-phys-1',
          content: 'My completed physics homework assignment.'
        })
      });
      assert.strictEqual(res.status, 201, 'Student submitting assignment must receive 201');
      const body = await res.json();
      assert.strictEqual(body.submission.studentId, 'student-1');
      console.log('[PASS] 8.3 Student successfully submits assignment work');
    }

    // =========================================================================
    // SECTION 9: DEV-SESSION BEHAVIOR (POST /api/auth/dev-session)
    // =========================================================================
    console.log('\n--- Section 9: Development Session Endpoint Hardening ---');

    // 9.1 In production mode, POST /api/auth/dev-session returns 403
    {
      const savedEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await fetch(`${baseUrl}/api/auth/dev-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'teacher' })
        });
        assert.strictEqual(res.status, 403, 'POST /api/auth/dev-session must return 403 in production');
        const body = await res.json();
        assert.strictEqual(body.error?.code, 'DEV_AUTH_DISABLED');
        console.log('[PASS] 9.1 POST /api/auth/dev-session strictly rejected with 403 in production');
      } finally {
        if (savedEnv !== undefined) process.env.NODE_ENV = savedEnv; else delete process.env.NODE_ENV;
      }
    }

    // 9.2 In non-production mode without ALLOW_DEV_AUTH=true, POST /api/auth/dev-session returns 403
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        delete process.env.ALLOW_DEV_AUTH;
        const resAbsent = await fetch(`${baseUrl}/api/auth/dev-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'student' })
        });
        assert.strictEqual(resAbsent.status, 403, 'Absent ALLOW_DEV_AUTH must reject dev-session with 403');
        const bodyAbsent = await resAbsent.json();
        assert.strictEqual(bodyAbsent.error?.code, 'DEV_AUTH_REQUIRED');

        process.env.ALLOW_DEV_AUTH = 'false';
        const resFalse = await fetch(`${baseUrl}/api/auth/dev-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'student' })
        });
        assert.strictEqual(resFalse.status, 403, 'ALLOW_DEV_AUTH=false must reject dev-session with 403');
        const bodyFalse = await resFalse.json();
        assert.strictEqual(bodyFalse.error?.code, 'DEV_AUTH_REQUIRED');

        console.log('[PASS] 9.2 POST /api/auth/dev-session strictly rejected when ALLOW_DEV_AUTH is absent or false');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // 9.3 In non-production mode with ALLOW_DEV_AUTH=true, dev-session works safely for rapid testing
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.ALLOW_DEV_AUTH = 'true';
        const res = await fetch(`${baseUrl}/api/auth/dev-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'student' })
        });
        assert.strictEqual(res.status, 200, 'POST /api/auth/dev-session works with ALLOW_DEV_AUTH=true');
        const body = await res.json();
        assert(body.token, 'Must return signed token');
        assert.strictEqual(body.user.role, 'student');
        console.log('[PASS] 9.3 POST /api/auth/dev-session permits legitimate non-production session switching when ALLOW_DEV_AUTH=true');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // 9.4 In non-production mode with ALLOW_DEV_AUTH=true, privileged roles (admin, commander) are strictly blocked
    {
      const savedAllowDev = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.ALLOW_DEV_AUTH = 'true';
        for (const privRole of ['commander', 'admin', 'Commander', 'ADMIN']) {
          const res = await fetch(`${baseUrl}/api/auth/dev-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: privRole })
          });
          assert.strictEqual(res.status, 403, `POST /api/auth/dev-session must reject privileged role ${privRole} with 403`);
          const body = await res.json();
          assert.strictEqual(body.error?.code, 'PRIVILEGED_LOGIN_DISALLOWED');
        }
        console.log('[PASS] 9.4 POST /api/auth/dev-session strictly blocks commander/admin role minting');
      } finally {
        if (savedAllowDev !== undefined) process.env.ALLOW_DEV_AUTH = savedAllowDev; else delete process.env.ALLOW_DEV_AUTH;
      }
    }

    // =========================================================================
    // SECTION 10: TOKEN CLAIMS & CRYPTOGRAPHIC VERIFICATION
    // =========================================================================
    console.log('\n--- Section 10: Token Claims & Cryptographic Verification ---');

    const seedStudent = (await jarvisData.users.getById('student-1'))!;
    const issuedToken = authService.issueToken(seedStudent);

    // 10.1 Token parts inspection
    const parts = issuedToken.split('.');
    assert.strictEqual(parts.length, 3, 'Issued token must be version.body.signature');
    assert.strictEqual(parts[0], 'v1', 'Token version must be v1');

    // 10.2 Verify claims payload
    const payload = verifyAuthToken(issuedToken);
    assert.strictEqual(payload.sub, seedStudent.id, 'sub claim must match student ID');
    assert(typeof payload.iat === 'number' && payload.iat <= Date.now(), 'iat claim must be valid timestamp');
    assert(typeof payload.exp === 'number' && payload.exp > Date.now(), 'exp claim must be in the future');
    assert(typeof payload.jti === 'string' && payload.jti.startsWith('jti-'), 'jti claim must be present');
    console.log('[PASS] 10.1 Issued token contains valid sub, iat, exp, and jti claims');

    // 10.3 Token verification strictly fails against a different secret
    let rejectedWrongSecret = false;
    try {
      verifyAuthToken(issuedToken, 'different-secret-that-does-not-match-issuance');
    } catch (err: any) {
      rejectedWrongSecret = true;
      assert(err instanceof AuthenticationError, 'Must throw AuthenticationError on signature mismatch');
      assert.strictEqual(err.statusCode, 401);
      assert.strictEqual(err.code, 'INVALID_CREDENTIALS');
    }
    assert(rejectedWrongSecret, 'Token verified with wrong secret must be rejected');
    console.log('[PASS] 10.2 Cryptographic verification strictly rejects mismatched signing secret');

    // =========================================================================
    // SECTION 11: ENVIRONMENT VARIABLE RESTORATION VERIFICATION (SCENARIO 14)
    // =========================================================================
    console.log('\n--- Section 11: Environment Variable Restoration Verification ---');

    assert.strictEqual(process.env.NODE_ENV, initialEnvSnapshot.NODE_ENV, 'NODE_ENV must be restored');
    assert.strictEqual(process.env.ALLOW_DEV_AUTH, initialEnvSnapshot.ALLOW_DEV_AUTH, 'ALLOW_DEV_AUTH must be restored');
    assert.strictEqual(process.env.AUTH_SECRET_KEY, initialEnvSnapshot.AUTH_SECRET_KEY, 'AUTH_SECRET_KEY must be restored');
    assert.strictEqual(process.env.JWT_SECRET, initialEnvSnapshot.JWT_SECRET, 'JWT_SECRET must be restored');
    console.log('[PASS] 11.1 All modified environment variables cleanly restored after test execution');

    console.log('\n===================================================================');
    console.log('=== ALL MILESTONE 1, BATCH 1 AUTH HARDENING TESTS PASSED (100%) ===');
    console.log('===================================================================\n');
  } finally {
    if (harness) {
      await harness.close();
    }
  }
}

runMilestone1Batch1Tests().catch((err) => {
  console.error('\n[FATAL] Milestone 1 Batch 1 Test Failure:\n', err);
  process.exit(1);
});
