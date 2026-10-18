import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AuthClient,
  authClient,
  requestOtp,
  verifyOtp,
  checkEligibility,
  AuthApiError
} from '../src/services/authClient.ts';
import {
  MockEmailProvider,
  setEmailProvider,
  resetEmailProvider,
  authIpRateLimiter
} from '../server/auth/email/index.ts';
import { startHttpHarness } from './httpHarness.ts';
import { jarvisData } from '../server/data/index.ts';

async function runMilestone24AuthClientOtpTests() {
  console.log('\n=== [JARVIS] MILESTONE 2.4 STEP 1: AUTH CLIENT OTP TEST SUITE ===');

  const baselineDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbSha256 = fs.existsSync(baselineDbPath)
    ? crypto.createHash('sha256').update(fs.readFileSync(baselineDbPath)).digest('hex')
    : null;

  // Mock localStorage in global scope for session storage verification
  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, value: string) => storageMap.set(key, String(value)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear()
  };
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = mockLocalStorage;

  // --- Test 1: Method Signatures, Exports & Custom Error Typing ---
  console.log('\n--- Test 1: Method Signatures, Exports & Custom Error Typing ---');
  assert.equal(typeof authClient.requestOtp, 'function', 'authClient.requestOtp must be a function');
  assert.equal(typeof authClient.verifyOtp, 'function', 'authClient.verifyOtp must be a function');
  assert.equal(typeof authClient.checkEligibility, 'function', 'authClient.checkEligibility must be a function');
  assert.equal(typeof requestOtp, 'function', 'Exported requestOtp must be a function');
  assert.equal(typeof verifyOtp, 'function', 'Exported verifyOtp must be a function');
  assert.equal(typeof checkEligibility, 'function', 'Exported checkEligibility must be a function');

  const sampleError = new AuthApiError('Test error message', {
    code: 'RESEND_COOLDOWN_ACTIVE',
    status: 429,
    attemptsRemaining: 2,
    retryAfterMs: 45000
  });
  assert.ok(sampleError instanceof Error, 'AuthApiError must inherit from Error');
  assert.ok(sampleError instanceof AuthApiError, 'sampleError must be instance of AuthApiError');
  assert.equal(sampleError.name, 'AuthApiError');
  assert.equal(sampleError.message, 'Test error message');
  assert.equal(sampleError.code, 'RESEND_COOLDOWN_ACTIVE');
  assert.equal(sampleError.status, 429);
  assert.equal(sampleError.attemptsRemaining, 2);
  assert.equal(sampleError.retryAfterMs, 45000);
  console.log('  [PASS] Method signatures, top-level exports, and AuthApiError typed properties verified');

  // --- Test 2: Client-Side Input Pre-Validation ---
  console.log('\n--- Test 2: Client-Side Input Pre-Validation ---');
  await assert.rejects(
    async () => authClient.requestOtp('', 'login'),
    (err: any) => err instanceof AuthApiError && err.code === 'INVALID_ARGUMENTS' && err.status === 400
  );
  await assert.rejects(
    async () => authClient.requestOtp('invalid-email-no-at', 'login'),
    (err: any) => err instanceof AuthApiError && err.code === 'INVALID_ARGUMENTS' && err.status === 400
  );
  await assert.rejects(
    async () => authClient.requestOtp('user@test.com', 'invalid-intent' as any),
    (err: any) => err instanceof AuthApiError && err.code === 'INVALID_ARGUMENTS' && err.status === 400
  );
  await assert.rejects(
    async () => authClient.verifyOtp('', '123456', 'login'),
    (err: any) => err instanceof AuthApiError && err.code === 'INVALID_ARGUMENTS' && err.status === 400
  );
  await assert.rejects(
    async () => authClient.verifyOtp('user@test.com', '', 'login'),
    (err: any) => err instanceof AuthApiError && err.code === 'INVALID_ARGUMENTS' && err.status === 400
  );
  await assert.rejects(
    async () => authClient.checkEligibility('bad-email'),
    (err: any) => err instanceof AuthApiError && err.code === 'INVALID_ARGUMENTS' && err.status === 400
  );
  console.log('  [PASS] Client-side input pre-validation throws typed AuthApiError without unnecessary round-trips');

  // --- Test 3: Network Error Safety Without Leaking Details ---
  console.log('\n--- Test 3: Network Error Safety ---');
  const unreachableClient = new AuthClient('http://127.0.0.1:59999');
  await assert.rejects(
    async () => unreachableClient.requestOtp('user@test.com', 'login'),
    (err: any) => {
      assert.ok(err instanceof AuthApiError, 'Must throw AuthApiError');
      assert.equal(err.code, 'NETWORK_ERROR');
      assert.ok(err.message.includes('Unable to connect'), 'Sanitized friendly error message');
      return true;
    }
  );
  console.log('  [PASS] Network disruption safely handled as NETWORK_ERROR without exposing internal details');

  // --- Start HTTP Harness for E2E Client Testing ---
  const harness = await startHttpHarness();
  const mockEmailProvider = new MockEmailProvider();
  setEmailProvider(mockEmailProvider);

  try {
    const testClient = new AuthClient(harness.baseUrl);

    // --- Test 4: checkEligibility API Contract ---
    console.log('\n--- Test 4: checkEligibility API Contract ---');
    const eligibleRes = await testClient.checkEligibility('tony@starkindustries.com', 'login');
    assert.equal(eligibleRes.success, true);
    assert.equal(eligibleRes.eligible, true);

    const newEmailEligibleRes = await testClient.checkEligibility('unknown-new-user@stark.edu', 'login');
    assert.equal(newEmailEligibleRes.success, true);
    assert.equal(newEmailEligibleRes.eligible, true);
    console.log('  [PASS] checkEligibility returns expected shape { success: true, eligible: true }');

    // --- Test 5: requestOtp Anti-Enumeration for Unknown Accounts ---
    console.log('\n--- Test 5: requestOtp Anti-Enumeration for Unknown Accounts ---');
    mockEmailProvider.reset();
    const unknownRes = await testClient.requestOtp('ghost-user-999@stark.edu', 'login');
    assert.equal(unknownRes.success, true);
    assert.equal(unknownRes.email, 'ghost-user-999@stark.edu');
    assert.equal(unknownRes.intent, 'login');
    assert.ok(unknownRes.message.includes('verification code has been dispatched'));
    assert.equal(mockEmailProvider.dispatched.length, 0, 'Zero emails dispatched for unknown account');
    console.log('  [PASS] requestOtp preserves anti-enumeration for unknown login accounts');

    // --- Test 6: requestOtp Success & Resend Cooldown Enforcement ---
    console.log('\n--- Test 6: requestOtp Success & Resend Cooldown Enforcement ---');
    mockEmailProvider.reset();
    const knownEmail = 'tony@starkindustries.com';
    const reqRes = await testClient.requestOtp(knownEmail, 'login');
    assert.equal(reqRes.success, true);
    assert.equal(reqRes.email, knownEmail);
    assert.equal(reqRes.intent, 'login');
    assert.ok(reqRes.resendAvailableAt, 'resendAvailableAt must be populated');
    assert.equal(mockEmailProvider.dispatched.length, 1, 'Email dispatched to known user');

    // Immediate second request must trigger cooldown
    await assert.rejects(
      async () => testClient.requestOtp(knownEmail, 'login'),
      (err: any) => {
        assert.ok(err instanceof AuthApiError, 'Must be AuthApiError');
        assert.equal(err.status, 429);
        assert.equal(err.code, 'RESEND_COOLDOWN_ACTIVE');
        assert.ok(typeof err.retryAfterMs === 'number' && err.retryAfterMs > 0, 'retryAfterMs must be positive number');
        return true;
      }
    );
    console.log('  [PASS] requestOtp returns resendAvailableAt and correctly surfaces 429 RESEND_COOLDOWN_ACTIVE with retryAfterMs');

    // --- Test 7: verifyOtp Incorrect Code & Lockout Behavior ---
    console.log('\n--- Test 7: verifyOtp Incorrect Code & Lockout Behavior ---');
    // First failed attempt (5 - 1 = 4 remaining):
    await assert.rejects(
      async () => testClient.verifyOtp(knownEmail, '000000', 'login'),
      (err: any) => {
        assert.ok(err instanceof AuthApiError, 'Must be AuthApiError');
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_CODE');
        assert.equal(err.attemptsRemaining, 4);
        return true;
      }
    );

    // Three more failed attempts (remaining: 3, 2, 1)
    for (let expectedRemaining = 3; expectedRemaining >= 1; expectedRemaining--) {
      await assert.rejects(
        async () => testClient.verifyOtp(knownEmail, '000000', 'login'),
        (err: any) => {
          assert.equal(err.status, 400);
          assert.equal(err.attemptsRemaining, expectedRemaining);
          return true;
        }
      );
    }

    // 5th failed attempt (locks out OTP):
    await assert.rejects(
      async () => testClient.verifyOtp(knownEmail, '000000', 'login'),
      (err: any) => {
        assert.ok(err instanceof AuthApiError, 'Must be AuthApiError');
        assert.equal(err.status, 423);
        assert.equal(err.code, 'LOCKED');
        assert.equal(err.attemptsRemaining, 0);
        return true;
      }
    );
    console.log('  [PASS] verifyOtp captures 400 INVALID_CODE with attemptsRemaining and 423 LOCKED on exhaustion');

    // --- Test 8: verifyOtp Successful Login & Storage Hydration ---
    console.log('\n--- Test 8: verifyOtp Successful Login & Storage Hydration ---');
    authIpRateLimiter.reset();
    // Request a fresh OTP for a known user (Alex Chen, student-1)
    const loginEmail = 'alex.chen@stark.edu';
    mockEmailProvider.reset();
    storageMap.clear();

    let subscriberNotified = false;
    const unsub = testClient.subscribe(() => {
      subscriberNotified = true;
    });

    await testClient.requestOtp(loginEmail, 'login');
    assert.equal(mockEmailProvider.dispatched.length, 1);
    const sentEmail = mockEmailProvider.dispatched[0];
    const codeMatch = sentEmail.html.match(/\b(\d{6})\b/);
    assert.ok(codeMatch, 'Must find 6-digit code in email template');
    const validCode = codeMatch[1];

    const session = await testClient.verifyOtp(loginEmail, validCode, 'login');
    assert.ok(session.token, 'Session must include token');
    assert.equal(session.user.email, loginEmail);
    assert.ok(session.user.id, 'Session must include user ID');
    assert.ok(Array.isArray(session.user.capabilities), 'User must have capabilities');
    assert.ok(testClient.isAuthenticated(), 'Client must now report isAuthenticated() = true');
    assert.equal(testClient.getToken(), session.token);
    assert.equal(testClient.getCurrentUser()?.email, loginEmail);
    assert.equal(subscriberNotified, true, 'Subscribers must be notified upon session change');

    // Check localStorage persistence
    assert.equal(storageMap.get('jarvis_auth_token'), session.token);
    const storedUserJson = storageMap.get('jarvis_auth_user');
    assert.ok(storedUserJson);
    const storedUser = JSON.parse(storedUserJson);
    assert.equal(storedUser.email, loginEmail);

    unsub();
    console.log('  [PASS] verifyOtp authenticates session, stores credentials to storage, and notifies subscribers');

    // --- Test 9: verifyOtp Registration Flow with Metadata ---
    console.log('\n--- Test 9: verifyOtp Registration Flow with Metadata ---');
    authIpRateLimiter.reset();
    const newRegEmail = `cadet-${Date.now()}@stark.edu`;
    mockEmailProvider.reset();

    // 1. requestOtp for register
    const regReq = await testClient.requestOtp(newRegEmail, 'register', {
      displayName: 'Gwen Stacy',
      role: 'student'
    });
    assert.equal(regReq.success, true);
    assert.equal(regReq.intent, 'register');

    assert.equal(mockEmailProvider.dispatched.length, 1);
    const regCodeMatch = mockEmailProvider.dispatched[0].html.match(/\b(\d{6})\b/);
    assert.ok(regCodeMatch);
    const regCode = regCodeMatch[1];

    // 2. verifyOtp for register
    const regSession = await testClient.verifyOtp(newRegEmail, regCode, 'register', {
      displayName: 'Gwen Stacy',
      role: 'student'
    });
    assert.ok(regSession.token);
    assert.equal(regSession.user.email, newRegEmail);
    assert.equal(regSession.user.displayName, 'Gwen Stacy');
    assert.equal(regSession.user.role, 'student');
    assert.ok(regSession.activeWorkspace, 'New registered user has personal workspace');
    assert.equal(storageMap.get('jarvis_auth_token'), regSession.token);
    console.log('  [PASS] verifyOtp registers new account, applies metadata, and returns initialized session');

    // --- Test 10: Regression — Conflicting Metadata Cannot Overwrite Auth Fields or Inject Arbitrary Keys ---
    console.log('\n--- Test 10: Regression — Conflicting Metadata Cannot Overwrite Auth Fields or Inject Arbitrary Keys ---');
    authIpRateLimiter.reset();
    const conflictEmail = `conflict-${Date.now()}@stark.edu`;
    mockEmailProvider.reset();

    await testClient.requestOtp(conflictEmail, 'register');
    assert.equal(mockEmailProvider.dispatched.length, 1);
    const conflictCode = mockEmailProvider.dispatched[0].html.match(/\b(\d{6})\b/)![1];

    // Spy on global fetch to inspect outbound payload to /api/auth/otp/verify
    const originalFetch = globalThis.fetch;
    let interceptedPayload: any = null;
    (globalThis as any).fetch = async (input: any, init: any) => {
      if (typeof input === 'string' && input.includes('/api/auth/otp/verify')) {
        interceptedPayload = JSON.parse(init.body);
      }
      return originalFetch(input, init);
    };

    let conflictSession: any = null;
    try {
      conflictSession = await testClient.verifyOtp(conflictEmail, conflictCode, 'register', {
        email: 'attacker@malicious-override.com',
        code: '999999',
        intent: 'login' as any,
        arbitraryInjection: 'should_be_stripped',
        roleOverride: 'admin',
        displayName: 'Protected User',
        role: 'student',
        institutionCode: 'INST-STARK',
        ageRange: '18-25',
        country: 'US'
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Invariant 1: Validated parameters were preserved and NOT overwritten by metadata
    assert.ok(interceptedPayload, 'Outbound verify payload was captured');
    assert.equal(interceptedPayload.email, conflictEmail, 'Payload email must equal validated cleanEmail');
    assert.equal(interceptedPayload.code, conflictCode, 'Payload code must equal validated cleanCode');
    assert.equal(interceptedPayload.intent, 'register', 'Payload intent must equal validated intent');

    // Invariant 2: Allowed metadata fields are retained
    assert.equal(interceptedPayload.displayName, 'Protected User');
    assert.equal(interceptedPayload.role, 'student');
    assert.equal(interceptedPayload.institutionCode, 'INST-STARK');
    assert.equal(interceptedPayload.ageRange, '18-25');
    assert.equal(interceptedPayload.country, 'US');

    // Invariant 3: Arbitrary keys are stripped
    assert.equal(interceptedPayload.arbitraryInjection, undefined, 'Arbitrary keys must not be in payload');
    assert.equal(interceptedPayload.roleOverride, undefined, 'Arbitrary roleOverride must not be in payload');

    // Invariant 4: Session issued is for the real email, not conflicting metadata email
    assert.ok(conflictSession.token);
    assert.equal(conflictSession.user.email, conflictEmail);
    assert.equal(conflictSession.user.displayName, 'Protected User');
    console.log('  [PASS] Conflicting metadata cannot alter validated auth fields and arbitrary keys are stripped');

    // --- Test 11: Register Intent Conflict (409 USER_EXISTS) ---
    console.log('\n--- Test 11: Register Intent Conflict (409 USER_EXISTS) ---');
    authIpRateLimiter.reset();
    await assert.rejects(
      async () => testClient.requestOtp(newRegEmail, 'register'),
      (err: any) => {
        assert.ok(err instanceof AuthApiError, 'Must be AuthApiError');
        assert.equal(err.status, 409);
        assert.equal(err.code, 'USER_EXISTS');
        return true;
      }
    );
    console.log('  [PASS] requestOtp with register intent for existing user throws 409 USER_EXISTS');

    // --- Test 12: Email Delivery Failure (502 EMAIL_DELIVERY_FAILED) ---
    console.log('\n--- Test 12: Email Delivery Failure (502 EMAIL_DELIVERY_FAILED) ---');
    authIpRateLimiter.reset();
    // Set a failing email provider
    const failingProvider = {
      name: 'mock' as const,
      send: async () => ({
        success: false as const,
        error: { code: 'NETWORK_ERROR' as const, message: 'Simulated downstream delivery outage' }
      })
    };
    setEmailProvider(failingProvider as any);

    const deliveryFailEmail = `fail-${Date.now()}@stark.edu`;
    await assert.rejects(
      async () => testClient.requestOtp(deliveryFailEmail, 'register'),
      (err: any) => {
        assert.ok(err instanceof AuthApiError, 'Must be AuthApiError');
        assert.equal(err.status, 502);
        assert.equal(err.code, 'EMAIL_DELIVERY_FAILED');
        return true;
      }
    );
    console.log('  [PASS] Email delivery failure returns 502 EMAIL_DELIVERY_FAILED cleanly without leaking details');

    // --- Test 13: Top-Level Exported Functions Delegate to Singleton ---
    console.log('\n--- Test 13: Top-Level Exported Functions Delegate to Singleton ---');
    authIpRateLimiter.reset();
    authClient.setBaseUrl(harness.baseUrl);
    setEmailProvider(mockEmailProvider);
    mockEmailProvider.reset();

    const topEligible = await checkEligibility('tony@starkindustries.com', 'login');
    assert.equal(topEligible.success, true);
    assert.equal(topEligible.eligible, true);

    const topReq = await requestOtp('top-level-test@stark.edu', 'register');
    assert.equal(topReq.success, true);
    assert.equal(topReq.email, 'top-level-test@stark.edu');

    assert.equal(mockEmailProvider.dispatched.length, 1);
    const topCode = mockEmailProvider.dispatched[0].html.match(/\b(\d{6})\b/)![1];

    const topSession = await verifyOtp('top-level-test@stark.edu', topCode, 'register', {
      displayName: 'Top User',
      role: 'student'
    });
    assert.ok(topSession.token);
    assert.equal(topSession.user.displayName, 'Top User');
    assert.equal(authClient.isAuthenticated(), true);
    console.log('  [PASS] Top-level helper functions correctly delegate to authClient singleton');

    // --- Test 14: IP Rate Limiting Surfaces 429 TOO_MANY_REQUESTS with retryAfterMs ---
    console.log('\n--- Test 14: IP Rate Limiting Surfaces 429 TOO_MANY_REQUESTS ---');
    authIpRateLimiter.reset();
    // Exhaust the 10-request window
    for (let i = 0; i < 10; i++) {
      await testClient.checkEligibility('flood@stark.edu', 'login');
    }
    // 11th request must fail with 429 TOO_MANY_REQUESTS
    await assert.rejects(
      async () => testClient.checkEligibility('flood@stark.edu', 'login'),
      (err: any) => {
        assert.ok(err instanceof AuthApiError, 'Must be AuthApiError');
        assert.equal(err.status, 429);
        assert.equal(err.code, 'TOO_MANY_REQUESTS');
        assert.ok(typeof err.retryAfterMs === 'number' && err.retryAfterMs > 0);
        return true;
      }
    );
    authIpRateLimiter.reset();
    console.log('  [PASS] IP rate limiting correctly surfaces typed 429 TOO_MANY_REQUESTS error with retryAfterMs');

  } finally {
    resetEmailProvider();
    await harness.close();
  }

  // --- Test 15: Database File Integrity Preservation ---
  console.log('\n--- Test 15: Database File Integrity Preservation ---');
  const finalDbSha256 = fs.existsSync(baselineDbPath)
    ? crypto.createHash('sha256').update(fs.readFileSync(baselineDbPath)).digest('hex')
    : null;
  assert.equal(
    finalDbSha256,
    initialDbSha256,
    `Database at data/jarvis-db.json MUST NOT be modified! Initial: ${initialDbSha256}, Final: ${finalDbSha256}`
  );
  console.log(`  [PASS] data/jarvis-db.json preserved (SHA-256: ${finalDbSha256})`);

  console.log('\n>>> ALL 15 MILESTONE 2.4 STEP 1 AUTH CLIENT OTP TESTS PASSED SUCCESSFULLY! <<<\n');
}

runMilestone24AuthClientOtpTests().catch((err) => {
  console.error('\n[FAIL] Test suite execution failed:', err);
  process.exit(1);
});
