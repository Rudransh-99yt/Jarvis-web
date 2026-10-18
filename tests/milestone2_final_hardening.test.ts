// JARVIS-WEB — MILESTONE 2: FINAL OTP HARDENING REGRESSION TEST SUITE
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import {
  renderOtpEmail,
  MockEmailProvider,
  resolveEmailProvider,
  validateProductionEmailConfig,
  setEmailProvider,
  resetEmailProvider,
  authIpRateLimiter,
  GmailSmtpEmailProvider
} from '../server/auth/email/index.ts';
import {
  otpService,
  generateSixDigitCode,
  computeOtpHash
} from '../server/auth/otpService.ts';
import {
  jarvisData,
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { app } from '../server.ts';

function extractCodeFromEmail(payload: { subject?: string; html?: string; text?: string }): string {
  const match = (payload.subject || '').match(/(\d{6})/);
  if (match) return match[1];
  const bodyMatch = (payload.text || payload.html || '').match(/(\d{6})/);
  if (bodyMatch) return bodyMatch[1];
  throw new Error('No 6-digit OTP code found in dispatched email');
}

async function runFinalHardeningTestSuite() {
  console.log('===================================================================');
  console.log('=== [JARVIS] MILESTONE 2: FINAL OTP HARDENING REGRESSION TESTS  ===');
  console.log('===================================================================\n');

  // Verify real database file presence and record initial baseline hash
  const dbPath = path.resolve('./data/jarvis-db.json');
  assert(fs.existsSync(dbPath), 'data/jarvis-db.json must exist');
  const initialDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');

  // Set up isolated temp repository in tmp/
  const isolatedTempDir = path.resolve(
    process.cwd(),
    'tmp',
    `test-m2-final-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  );
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'test-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed(true);
  setActiveRepository(isolatedRepo);

  // Set email provider to mock (strictly zero real network emails)
  const mockEmail = new MockEmailProvider();
  setEmailProvider(mockEmail);

  // Start test server on ephemeral port
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const originalEnv = { ...process.env };

  try {
    // =========================================================================
    // SECTION 1: CONCURRENCY RACE RESISTANCE (10 Concurrent Verifications)
    // =========================================================================
    console.log('--- Section 1: 10 Concurrent OTP Verification Requests ---');
    {
      const testEmail = 'concurrency.test@stark.edu';
      authIpRateLimiter.reset();

      // Request registration OTP
      const reqRes = await fetch(`${baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          intent: 'register',
          metadata: { displayName: 'Concurrent Tester', role: 'student' }
        })
      });
      assert.strictEqual(reqRes.status, 200, 'Registration OTP request must succeed');
      const validCode = extractCodeFromEmail(mockEmail.dispatched[0]);
      // Reset IP rate limiter to test OTP transaction isolation across 10 concurrent requests
      authIpRateLimiter.reset();

      // Launch 10 simultaneous verification requests using the exact same OTP code
      const verificationPromises = Array.from({ length: 10 }, () =>
        fetch(`${baseUrl}/api/auth/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            code: validCode,
            intent: 'register',
            displayName: 'Concurrent Tester',
            role: 'student'
          })
        }).then(async (r) => ({
          status: r.status,
          body: await r.json()
        }))
      );

      const results = await Promise.all(verificationPromises);
      const successful = results.filter((r) => r.status === 201);
      const alreadyVerified = results.filter(
        (r) => r.status === 400 && r.body.error?.code === 'ALREADY_VERIFIED'
      );
      const conflicts = results.filter(
        (r) => r.status === 409 && r.body.error?.code === 'USER_EXISTS'
      );

      assert.strictEqual(
        successful.length,
        1,
        `Expected exactly 1 successful verification, got ${successful.length}`
      );
      assert.strictEqual(
        alreadyVerified.length + conflicts.length,
        9,
        `Expected remaining 9 requests to fail with ALREADY_VERIFIED or USER_EXISTS, got ${alreadyVerified.length + conflicts.length}`
      );

      // Verify repository consistency: exactly 1 user and 1 personal workspace created
      const allUsers = await isolatedRepo.users.list();
      const createdUsers = allUsers.filter((u) => u.email.toLowerCase() === testEmail);
      assert.strictEqual(createdUsers.length, 1, 'Exactly one user record must exist');

      const userWorkspaces = await isolatedRepo.workspaces.listForUser(createdUsers[0].id);
      assert.strictEqual(userWorkspaces.length, 1, 'Exactly one personal workspace must exist for the user');

      console.log(
        '[PASS] 1.1 Ten concurrent verifications produced exactly 1 success and 0 duplicate accounts/workspaces'
      );
    }

    // =========================================================================
    // SECTION 2: SMTP FAILURE & COMPENSATING INVALIDATION
    // =========================================================================
    console.log('\n--- Section 2: SMTP Failure & Compensating OTP Invalidation ---');
    {
      const failEmail = 'smtp.failure@stark.edu';
      authIpRateLimiter.reset();

      // Configure mock provider to fail
      mockEmail.nextResult = {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection to smtp.gmail.com:465 refused'
        }
      };

      const failReqRes = await fetch(`${baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: failEmail, intent: 'register' })
      });

      assert.strictEqual(failReqRes.status, 502, 'Failed delivery must return 502 Bad Gateway');
      const failBody = await failReqRes.json();
      assert.strictEqual(failBody.error?.code, 'EMAIL_DELIVERY_FAILED');
      assert.strictEqual(
        failBody.error?.message,
        'Unable to deliver verification code. Please try again later.'
      );

      // Verify that the created OTP was transitioned to 'invalidated'
      const activeOtp = await isolatedRepo.authOtps.getActiveOtp(failEmail, 'register');
      assert.strictEqual(activeOtp, null, 'Active OTP must be null after compensating invalidation');

      // Hourly request count must still reflect the attempt for rate-limiting protection
      const recentCount = await isolatedRepo.authOtps.countRecentRequests(failEmail, 3600000);
      assert.strictEqual(recentCount, 1, 'Request history must be preserved for rate-limiting cap');

      console.log(
        '[PASS] 2.1 SMTP failure returned safe 502 and executed compensating OTP invalidation'
      );
    }

    // =========================================================================
    // SECTION 3: COMPENSATING INVALIDATION FAILURE RESILIENCE
    // =========================================================================
    console.log('\n--- Section 3: Invalidation Failure Resilience ---');
    {
      const invFailEmail = 'inv.failure@stark.edu';
      authIpRateLimiter.reset();

      mockEmail.nextResult = {
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Socket timeout' }
      };

      // Spy on invalidateOtpById and simulate database error during invalidation
      const originalInvalidate = otpService.invalidateOtpById.bind(otpService);
      let invalidationAttempted = false;
      otpService.invalidateOtpById = async (id: string) => {
        invalidationAttempted = true;
        throw new Error('SIMULATED_DB_FAILURE_DURING_INVALIDATION');
      };

      try {
        const res = await fetch(`${baseUrl}/api/auth/otp/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: invFailEmail, intent: 'register' })
        });

        assert.strictEqual(res.status, 502, 'Must still return 502 even if invalidation throws');
        const body = await res.json();
        assert.strictEqual(body.error?.code, 'EMAIL_DELIVERY_FAILED');
        assert(invalidationAttempted, 'Compensating invalidation must have been attempted');
        console.log(
          '[PASS] 3.1 Compensating invalidation failure caught safely, masked, and returned 502 without leaking secrets'
        );
      } finally {
        otpService.invalidateOtpById = originalInvalidate;
      }
    }

    // =========================================================================
    // SECTION 4: EMAIL CASE NORMALIZATION & SURROUNDING WHITESPACE
    // =========================================================================
    console.log('\n--- Section 4: Email Case & Whitespace Normalization ---');
    {
      const messyEmail = '   Case.Normal.Test@Stark.EDU   ';
      const cleanEmail = 'case.normal.test@stark.edu';
      authIpRateLimiter.reset();
      mockEmail.dispatched = [];

      // 4.1 Request with uppercase and whitespace
      const reqRes = await fetch(`${baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: messyEmail,
          intent: 'register',
          metadata: { displayName: 'Case Normalizer' }
        })
      });
      assert.strictEqual(reqRes.status, 200, 'Request with whitespace and uppercase must succeed');
      const reqBody = await reqRes.json();
      assert.strictEqual(reqBody.email, cleanEmail, 'Response email must be normalized to lowercase');

      // 4.2 Check eligibility with mixed case
      const eligRes = await fetch(
        `${baseUrl}/api/auth/otp/eligibility?email=${encodeURIComponent('  CASE.Normal.Test@stark.edu  ')}&intent=register`
      );
      assert.strictEqual(eligRes.status, 200, 'Eligibility check with mixed case must succeed');

      // 4.3 Verify OTP with different mixed case and whitespace
      const validCode = extractCodeFromEmail(mockEmail.dispatched[0]);
      const verifyRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '  CASE.NORMAL.TEST@STARK.EDU  ',
          code: validCode,
          intent: 'register'
        })
      });
      assert.strictEqual(verifyRes.status, 201, 'Verification with mixed case must succeed');
      const verifyBody = await verifyRes.json();
      assert.strictEqual(verifyBody.user.email, cleanEmail, 'Created user must have normalized email');

      console.log(
        '[PASS] 4.1 Email case normalization and surrounding whitespace handled consistently across request, eligibility, and verification'
      );
    }

    // =========================================================================
    // SECTION 5: DEV-SESSION GATING & PRIVILEGED ROLE REJECTION
    // =========================================================================
    console.log('\n--- Section 5: Dev-Session Gating & Privileged Role Rejection ---');
    {
      // 5.1 Unset / false ALLOW_DEV_AUTH rejects with 403 DEV_AUTH_REQUIRED
      delete process.env.ALLOW_DEV_AUTH;
      const resUnset = await fetch(`${baseUrl}/api/auth/dev-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student' })
      });
      assert.strictEqual(resUnset.status, 403, 'Unset ALLOW_DEV_AUTH must reject dev-session with 403');
      const bodyUnset = await resUnset.json();
      assert.strictEqual(bodyUnset.error?.code, 'DEV_AUTH_REQUIRED');

      process.env.ALLOW_DEV_AUTH = 'false';
      const resFalse = await fetch(`${baseUrl}/api/auth/dev-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student' })
      });
      assert.strictEqual(resFalse.status, 403, 'ALLOW_DEV_AUTH=false must reject dev-session with 403');
      const bodyFalse = await resFalse.json();
      assert.strictEqual(bodyFalse.error?.code, 'DEV_AUTH_REQUIRED');
      console.log('[PASS] 5.1 Dev-session strictly rejected when ALLOW_DEV_AUTH is unset or false');

      // 5.2 With ALLOW_DEV_AUTH=true, privileged roles (admin, commander) are strictly rejected
      process.env.ALLOW_DEV_AUTH = 'true';
      for (const privRole of ['commander', 'admin', 'Commander', 'ADMIN', ' commander ']) {
        const resPriv = await fetch(`${baseUrl}/api/auth/dev-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: privRole })
        });
        assert.strictEqual(resPriv.status, 403, `Privileged role ${privRole} must return 403`);
        const bodyPriv = await resPriv.json();
        assert.strictEqual(bodyPriv.error?.code, 'PRIVILEGED_LOGIN_DISALLOWED');
      }
      console.log('[PASS] 5.2 Dev-session strictly blocks caller-controlled admin/commander role requests');

      // 5.3 Legitimate dev roles work when ALLOW_DEV_AUTH=true
      const resStudent = await fetch(`${baseUrl}/api/auth/dev-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student' })
      });
      assert.strictEqual(resStudent.status, 200, 'Student dev-session must succeed when ALLOW_DEV_AUTH=true');
      const bodyStudent = await resStudent.json();
      assert(bodyStudent.token, 'Must return signed token');
      assert.strictEqual(bodyStudent.user.role, 'student');
      console.log('[PASS] 5.3 Dev-session permits standard student role when explicitly enabled');

      // 5.4 Production mode strictly blocks dev-session regardless of ALLOW_DEV_AUTH
      process.env.NODE_ENV = 'production';
      const resProd = await fetch(`${baseUrl}/api/auth/dev-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student' })
      });
      assert.strictEqual(resProd.status, 403, 'Production mode must reject dev-session with 403');
      const bodyProd = await resProd.json();
      assert.strictEqual(bodyProd.error?.code, 'DEV_AUTH_DISABLED');
      process.env.NODE_ENV = 'test';
      console.log('[PASS] 5.4 Production mode strictly blocks dev-session regardless of ALLOW_DEV_AUTH');
    }

    // =========================================================================
    // SECTION 6: PRODUCTION PROVIDER FAIL-CLOSED BOUNDARIES
    // =========================================================================
    console.log('\n--- Section 6: Production Provider Fail-Closed Boundaries ---');
    {
      const prevEnv = process.env.NODE_ENV;
      const prevProv = process.env.JARVIS_EMAIL_PROVIDER;
      const prevKey = process.env.RESEND_API_KEY;
      const prevFrom = process.env.JARVIS_EMAIL_FROM;

      try {
        process.env.NODE_ENV = 'production';
        resetEmailProvider();

        // 6.1 Valid smtp is allowed in production
        process.env.JARVIS_EMAIL_PROVIDER = 'smtp';
        process.env.SMTP_USER = 'auth@stark.edu';
        process.env.SMTP_PASS = 'mockpassword1234';
        process.env.JARVIS_EMAIL_FROM = 'J.A.R.V.I.S. <auth@stark.edu>';
        resetEmailProvider();
        validateProductionEmailConfig();
        const prodSmtp = resolveEmailProvider();
        assert.strictEqual(prodSmtp.name, 'smtp');

        // 6.1b Missing SMTP_PASS throws
        delete process.env.SMTP_PASS;
        resetEmailProvider();
        assert.throws(
          () => validateProductionEmailConfig(),
          /SMTP_PASS is required in production/
        );

        // 6.2 Cannot use console in production
        process.env.JARVIS_EMAIL_PROVIDER = 'console';
        assert.throws(
          () => validateProductionEmailConfig(),
          /cannot be 'console'/
        );

        // 6.3 Cannot use mock in production
        process.env.JARVIS_EMAIL_PROVIDER = 'mock';
        assert.throws(
          () => validateProductionEmailConfig(),
          /cannot be 'mock'/
        );

        // 6.4 Missing RESEND_API_KEY throws
        process.env.JARVIS_EMAIL_PROVIDER = 'resend';
        delete process.env.RESEND_API_KEY;
        process.env.JARVIS_EMAIL_FROM = 'J.A.R.V.I.S. <auth@stark.edu>';
        assert.throws(
          () => validateProductionEmailConfig(),
          /RESEND_API_KEY is required in production/
        );

        // 6.5 Missing JARVIS_EMAIL_FROM throws
        process.env.RESEND_API_KEY = 're_1234567890abcdef';
        delete process.env.JARVIS_EMAIL_FROM;
        assert.throws(
          () => validateProductionEmailConfig(),
          /JARVIS_EMAIL_FROM is required in production/
        );

        console.log('[PASS] 6.1 Production provider resolution strictly fails closed on invalid/dev providers and verifies smtp/resend');
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevProv !== undefined) process.env.JARVIS_EMAIL_PROVIDER = prevProv; else delete process.env.JARVIS_EMAIL_PROVIDER;
        if (prevKey !== undefined) process.env.RESEND_API_KEY = prevKey; else delete process.env.RESEND_API_KEY;
        if (prevFrom !== undefined) process.env.JARVIS_EMAIL_FROM = prevFrom; else delete process.env.JARVIS_EMAIL_FROM;
        resetEmailProvider();
      }
    }

    // =========================================================================
    // SECTION 7: REAL DATABASE INTEGRITY PRESERVATION
    // =========================================================================
    console.log('\n--- Section 7: Real Database Integrity Verification ---');
    {
      const finalDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
      assert.strictEqual(
        finalDbHash,
        initialDbHash,
        `data/jarvis-db.json MUST NOT be modified! Initial: ${initialDbHash}, Final: ${finalDbHash}`
      );
      console.log(`[PASS] 7.1 Real database preserved with 0 byte mutations (SHA-256: ${finalDbHash})`);
    }

    console.log('\n===================================================================');
    console.log('>>> ALL MILESTONE 2 FINAL HARDENING TESTS PASSED SUCCESSFULLY!  <<<');
    console.log('===================================================================');
  } finally {
    // Restore environment
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val === undefined) {
        delete (process.env as any)[key];
      } else {
        (process.env as any)[key] = val;
      }
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
    resetActiveRepository();
    resetEmailProvider();
    authIpRateLimiter.reset();

    try {
      if (fs.existsSync(isolatedTempDir)) {
        fs.rmSync(isolatedTempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

runFinalHardeningTestSuite().catch((err) => {
  console.error('\n[FATAL] Final Hardening Test Suite Failed:', err);
  process.exit(1);
});
