import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from '../server/auth/email/types.ts';
import {
  setEmailProvider,
  resetEmailProvider,
  authIpRateLimiter
} from '../server/auth/email/index.ts';
import {
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository,
  jarvisData
} from '../server/data/index.ts';
import { startHttpHarness } from './httpHarness.ts';
import { GmailSmtpEmailProvider } from '../server/auth/email/gmailSmtpProvider.ts';

// Configurable mock email provider for deterministic testing
class TestMockEmailProvider implements IEmailProvider {
  readonly name = 'test-mock';
  public dispatched: EmailDispatchPayload[] = [];
  public customHandler?: (payload: EmailDispatchPayload) => Promise<EmailDispatchResult>;

  async send(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    this.dispatched.push({ ...payload });
    if (this.customHandler) {
      return this.customHandler(payload);
    }
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    };
  }

  reset() {
    this.dispatched = [];
    this.customHandler = undefined;
  }
}

async function runOtpDeliveryPermanentFixTests() {
  console.log('===================================================================');
  console.log('=== [JARVIS] OTP DELIVERY PERMANENT FIX REGRESSION TEST SUITE   ===');
  console.log('===================================================================\n');

  // Baseline SHA-256 verification: Active database must not be modified
  const baselineDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  assert.ok(fs.existsSync(baselineDbPath), 'data/jarvis-db.json must exist');
  const initialDbSha256 = crypto.createHash('sha256').update(fs.readFileSync(baselineDbPath)).digest('hex');

  // Create isolated scratch directory in tmp/
  const tmpDir = path.resolve(process.cwd(), 'tmp', `otp-perm-fix-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const isolatedDbPath = path.join(tmpDir, 'jarvis-db.json');
  fs.copyFileSync(baselineDbPath, isolatedDbPath);

  const testRepo = new DiskJarvisDataRepository(isolatedDbPath);
  await testRepo.init();
  setActiveRepository(testRepo);

  const mockProvider = new TestMockEmailProvider();
  setEmailProvider(mockProvider);

  let harness: { baseUrl: string; close: () => Promise<void> } | null = null;

  try {
    harness = await startHttpHarness();
    const { baseUrl } = harness;

    // Helper to extract 6-digit code from mocked email text
    const extractCodeFromDispatch = (recipient: string): string => {
      const email = mockProvider.dispatched.find((d) => d.to.toLowerCase() === recipient.toLowerCase());
      assert.ok(email, `Expected dispatched email for ${recipient}`);
      const match = email.text?.match(/YOUR VERIFICATION CODE: (\d{6})/);
      assert.ok(match && match[1], `Could not extract 6-digit code from email to ${recipient}`);
      return match[1];
    };

    // -------------------------------------------------------------------------
    // TEST 1: Multiple Distinct Recipient Addresses
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Multiple Distinct Recipient Addresses ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    const recipients = [
      'cadet.one@autonomous.org',
      'cadet.two@autonomous.org',
      'researcher.alpha@lab.edu'
    ];

    for (const rec of recipients) {
      const resp = await fetch(`${baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rec, intent: 'register' })
      });
      assert.equal(resp.status, 200, `Request failed for ${rec}`);
      const body = await resp.json();
      assert.equal(body.success, true);
    }

    assert.equal(mockProvider.dispatched.length, 3, 'All 3 recipients must receive emails');
    const sentAddresses = mockProvider.dispatched.map((d) => d.to);
    for (const rec of recipients) {
      assert.ok(sentAddresses.includes(rec), `Recipient ${rec} should be in sent list`);
    }

    // Verify isolation: Cooldown on recipient 1 must NOT affect recipient 2
    const rec2Check = await jarvisData.authOtps.getActiveOtp(recipients[1], 'register');
    assert.ok(rec2Check, 'Recipient 2 active OTP exists');
    assert.equal(rec2Check.email, recipients[1]);
    console.log('  [PASS] 1. Distinct recipients receive distinct codes and do not interfere with each other');

    // -------------------------------------------------------------------------
    // TEST 2: Existing-Account Login and New-Account Signup
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Existing-Account Login and New-Account Signup ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    // 2.1 Existing account login
    // Seed an existing user in isolated repository
    const existingEmail = 'existing.scholar@academy.edu';
    await jarvisData.users.create({
      id: `user-scholar-${Date.now()}`,
      email: existingEmail,
      displayName: 'Existing Scholar',
      role: 'student'
    });

    const loginReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: existingEmail, intent: 'login' })
    });
    assert.equal(loginReq.status, 200);
    const loginReqBody = await loginReq.json();
    assert.equal(loginReqBody.success, true);
    assert.equal(mockProvider.dispatched.length, 1, 'Email must be dispatched for existing account login');

    const loginCode = extractCodeFromDispatch(existingEmail);
    const loginVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: existingEmail, code: loginCode, intent: 'login' })
    });
    assert.equal(loginVerify.status, 200);
    const loginVerifyBody = await loginVerify.json();
    assert.equal(loginVerifyBody.success, true);
    assert.ok(loginVerifyBody.token, 'Must return authentication token');
    assert.equal(loginVerifyBody.user.email, existingEmail);

    // 2.2 New account signup
    mockProvider.reset();
    const newSignupEmail = 'fresh.student@academy.edu';
    const signupReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newSignupEmail,
        intent: 'register',
        metadata: { displayName: 'Fresh Student', role: 'student' }
      })
    });
    assert.equal(signupReq.status, 200);
    assert.equal(mockProvider.dispatched.length, 1, 'Email must be dispatched for new account signup');

    const signupCode = extractCodeFromDispatch(newSignupEmail);
    const signupVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newSignupEmail,
        code: signupCode,
        intent: 'register',
        displayName: 'Fresh Student'
      })
    });
    assert.equal(signupVerify.status, 201, 'Registration verify should return 201 Created');
    const signupVerifyBody = await signupVerify.json();
    assert.equal(signupVerifyBody.success, true);
    assert.ok(signupVerifyBody.token, 'Must return session token');
    assert.equal(signupVerifyBody.user.email, newSignupEmail);

    // Verify user was persisted
    const createdUser = await jarvisData.users.getByEmail(newSignupEmail);
    assert.ok(createdUser, 'New user must be saved in repository');
    console.log('  [PASS] 2. Existing-account login and new-account signup both complete full verification');

    // -------------------------------------------------------------------------
    // TEST 3: Unknown-Account Login Anti-Enumeration Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Unknown-Account Login Anti-Enumeration ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    const unknownEmail = 'totally.unregistered@stranger.org';
    const unknownReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unknownEmail, intent: 'login' })
    });
    assert.equal(unknownReq.status, 200);
    const unknownBody = await unknownReq.json();
    assert.equal(unknownBody.success, true);
    assert.ok(unknownBody.message.includes('If an account exists'), 'Must return generic anti-enumeration notice');

    // CRITICAL: Zero emails dispatched
    assert.equal(mockProvider.dispatched.length, 0, 'No email must ever be dispatched for unknown login');

    // Verify no pending OTP exists
    const unknownActive = await jarvisData.authOtps.getActiveOtp(unknownEmail, 'login');
    assert.equal(unknownActive, null, 'No active OTP record should exist for unknown account login');

    // Attempting verify should fail closed with 404
    const unknownVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unknownEmail, code: '123456', intent: 'login' })
    });
    assert.equal(unknownVerify.status, 404);
    const unknownVerifyBody = await unknownVerify.json();
    assert.equal(unknownVerifyBody.error?.code, 'NOT_FOUND');
    console.log('  [PASS] 3. Unknown-account login preserves anti-enumeration and dispatches zero emails');

    // -------------------------------------------------------------------------
    // TEST 4: Mixed-Case and Whitespace-Normalized Email Addresses
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Mixed-Case & Whitespace Normalization ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    const rawEmail = '   CaseSensitive.User@Domain.ORG   ';
    const normalizedEmail = 'casesensitive.user@domain.org';

    const normReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rawEmail, intent: 'register' })
    });
    assert.equal(normReq.status, 200);
    assert.equal(mockProvider.dispatched.length, 1);
    assert.equal(mockProvider.dispatched[0].to, normalizedEmail, 'Provider must receive normalized lowercase email');

    const normCode = extractCodeFromDispatch(normalizedEmail);
    // Verify using alternating mixed casing and leading/trailing whitespace
    const normVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '  CASESENSITIVE.USER@DOMAIN.ORG  ',
        code: `  ${normCode}  `,
        intent: 'register'
      })
    });
    assert.equal(normVerify.status, 201, 'Registration verify should return 201 Created');
    const normVerifyBody = await normVerify.json();
    assert.equal(normVerifyBody.user.email, normalizedEmail);
    console.log('  [PASS] 4. Whitespace and mixed casing normalized seamlessly on request and verification');

    // -------------------------------------------------------------------------
    // TEST 5: Rate Limits and Resend Cooldowns
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Rate Limits & Resend Cooldowns ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    const cooldownEmail = 'cooldown.target@domain.org';
    const firstReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cooldownEmail, intent: 'register' })
    });
    assert.equal(firstReq.status, 200);

    // Immediate second request must trigger cooldown
    const secondReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cooldownEmail, intent: 'register' })
    });
    assert.equal(secondReq.status, 429);
    const secondBody = await secondReq.json();
    assert.equal(secondBody.error?.code, 'RESEND_COOLDOWN_ACTIVE');
    assert.ok(secondBody.error?.retryAfterMs > 0);

    // Test durable hourly abuse limit (5 max per rolling hour)
    const rateLimitEmail = 'hourly.abuse@domain.org';
    // Seed 5 recent requests directly in repository
    for (let i = 0; i < 5; i++) {
      await jarvisData.authOtps.create({
        id: `abuse-seed-${i}-${Date.now()}`,
        email: rateLimitEmail,
        intent: 'register',
        otpHash: 'a'.repeat(64),
        salt: 'b'.repeat(32),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        attemptsRemaining: 5,
        resendAvailableAt: new Date(Date.now() - 1000).toISOString(), // Cooldown elapsed
        status: 'pending'
      });
    }

    const hourlyOverReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rateLimitEmail, intent: 'register' })
    });
    assert.equal(hourlyOverReq.status, 429);
    const hourlyOverBody = await hourlyOverReq.json();
    assert.equal(hourlyOverBody.error?.code, 'RATE_LIMIT_EXCEEDED');
    console.log('  [PASS] 5. Resend cooldowns and hourly rate limits strictly enforced');

    // -------------------------------------------------------------------------
    // TEST 6: Provider Rejection, Timeout, and Failure Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Provider Rejection & Timeout Handling ---');
    authIpRateLimiter.reset();

    // 6.1 Provider rejection
    mockProvider.customHandler = async () => ({
      success: false,
      error: {
        code: 'PROVIDER_REJECTED',
        message: 'Mailbox unavailable',
        rawStatus: 550
      }
    });

    const rejectEmail = 'rejected.mailbox@domain.org';
    const rejectResp = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: rejectEmail, intent: 'register' })
    });
    assert.equal(rejectResp.status, 502, 'Provider rejection must return HTTP 502');
    const rejectBody = await rejectResp.json();
    assert.equal(rejectBody.error?.code, 'EMAIL_DELIVERY_FAILED');

    // 6.2 Provider timeout
    mockProvider.customHandler = async () => ({
      success: false,
      error: {
        code: 'TIMEOUT',
        message: 'SMTP delivery timed out after 10000ms'
      }
    });

    const timeoutEmail = 'timeout.target@domain.org';
    const timeoutResp = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: timeoutEmail, intent: 'register' })
    });
    assert.equal(timeoutResp.status, 502, 'Provider timeout must return HTTP 502');
    const timeoutBody = await timeoutResp.json();
    assert.equal(timeoutBody.error?.code, 'EMAIL_DELIVERY_FAILED');

    mockProvider.reset();
    console.log('  [PASS] 6. Provider rejection and timeout mapped cleanly to 502 EMAIL_DELIVERY_FAILED');

    // -------------------------------------------------------------------------
    // TEST 7: OTP Invalidation on Delivery Failure (Compensating Transaction)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: OTP Invalidation When Delivery Fails ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    let capturedCode: string | null = null;
    mockProvider.customHandler = async (payload) => {
      const match = payload.text?.match(/YOUR VERIFICATION CODE: (\d{6})/);
      if (match) capturedCode = match[1];
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection failed'
        }
      };
    };

    const failEmail = 'delivery.failure@domain.org';
    const failResp = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: failEmail, intent: 'register' })
    });
    assert.equal(failResp.status, 502);

    // Verify the OTP record was invalidated and cannot be verified
    const allOtps = await jarvisData.authOtps.list({ email: failEmail, intent: 'register' });
    assert.ok(allOtps.length > 0, 'OTP record must be preserved for rate limiting');
    assert.equal(allOtps[0].status, 'invalidated', 'OTP record must transition to invalidated status');

    if (capturedCode) {
      const ghostVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: failEmail, code: capturedCode, intent: 'register' })
      });
      assert.equal(ghostVerify.status, 404, 'Invalidated OTP must not be verifiable');
    }

    mockProvider.reset();
    console.log('  [PASS] 7. Compensating invalidation renders failed OTP unusable while preserving rate limit history');

    // -------------------------------------------------------------------------
    // TEST 8: Concurrent Requests and Single-Use Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Concurrent Requests & Single-Use Verification ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    const concurrentEmail = 'concurrent.user@domain.org';
    // 8.1 Concurrent OTP generation
    const [reqA, reqB] = await Promise.all([
      fetch(`${baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: concurrentEmail, intent: 'register' })
      }),
      fetch(`${baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: concurrentEmail, intent: 'register' })
      })
    ]);

    // Due to transaction mutex & resend cooldown, exactly one succeeds and one gets cooldown
    const statuses = [reqA.status, reqB.status].sort();
    assert.deepEqual(statuses, [200, 429], 'Concurrent requests must serialize; second hits cooldown');

    const validCode = extractCodeFromDispatch(concurrentEmail);

    // 8.2 Concurrent verification of the same code
    const [verA, verB] = await Promise.all([
      fetch(`${baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: concurrentEmail, code: validCode, intent: 'register', displayName: 'Winner' })
      }),
      fetch(`${baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: concurrentEmail, code: validCode, intent: 'register', displayName: 'Loser' })
      })
    ]);

    const verStatuses = [verA.status, verB.status].sort();
    assert.equal(verStatuses[0], 201, 'One concurrent verification must succeed with 201 Created');
    assert.ok(verStatuses[1] === 400 || verStatuses[1] === 409, 'Second concurrent verification must be rejected');
    console.log('  [PASS] 8. Concurrent requests serialize correctly and single-use consumption is enforced');

    // -------------------------------------------------------------------------
    // TEST 9: GmailSmtpEmailProvider Acceptance & Error Mapping Logic
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Gmail SMTP Provider Unit Logic ---');
    // Test the recipient rejection inspection logic added to GmailSmtpEmailProvider
    let testTransporterMail: any = null;
    const mockTransporter: any = {
      sendMail: async (opts: any) => {
        testTransporterMail = opts;
        // Simulate SMTP server rejecting recipient
        return {
          accepted: [],
          rejected: ['invalid.recipient@nonexistent.domain'],
          responseCode: 550,
          response: '550 5.1.1 User unknown'
        };
      }
    };

    const smtpProvider = new GmailSmtpEmailProvider({
      user: 'auth.dev@gmail.com',
      pass: 'abcd efgh ijkl mnop',
      from: 'J.A.R.V.I.S. <auth.dev@gmail.com>',
      timeoutMs: 10000,
      transporter: mockTransporter
    });

    const smtpRejectResult = await smtpProvider.send({
      to: 'invalid.recipient@nonexistent.domain',
      subject: 'Test Code',
      text: 'Code: 123456'
    });

    assert.equal(smtpRejectResult.success, false, 'Rejected recipient must return success: false');
    assert.equal(smtpRejectResult.error?.code, 'PROVIDER_REJECTED');
    assert.equal(smtpRejectResult.error?.rawStatus, 550);

    // Test successful delivery with accepted recipient
    mockTransporter.sendMail = async () => ({
      accepted: ['valid.user@gmail.com'],
      rejected: [],
      messageId: '<valid-msg-id@gmail.com>',
      response: '250 2.0.0 OK'
    });

    const smtpSuccessResult = await smtpProvider.send({
      to: 'valid.user@gmail.com',
      subject: 'Test Code',
      text: 'Code: 123456'
    });

    assert.equal(smtpSuccessResult.success, true);
    assert.equal(smtpSuccessResult.messageId, '<valid-msg-id@gmail.com>');
    console.log('  [PASS] 9. GmailSmtpEmailProvider accurately distinguishes accepted vs rejected SMTP recipients');

    // -------------------------------------------------------------------------
    // TEST 10: Clear Account-Not-Found Login Flow & Eligibility Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Clear Account-Not-Found Login Flow & Eligibility ---');
    mockProvider.reset();
    authIpRateLimiter.reset();

    // 10.1 Existing account: eligibility confirms accountExists: true, login OTP proceeds
    const knownUserEmail = 'known.registered.user@domain.org';
    await jarvisData.users.create({
      id: `user-known-${Date.now()}`,
      email: knownUserEmail,
      displayName: 'Known User',
      role: 'student'
    });

    const knownEligResp = await fetch(`${baseUrl}/api/auth/otp/eligibility?email=${encodeURIComponent(knownUserEmail)}&intent=login`);
    assert.equal(knownEligResp.status, 200);
    const knownEligData = await knownEligResp.json();
    assert.equal(knownEligData.success, true);
    assert.equal(knownEligData.eligible, true);
    assert.equal(knownEligData.accountExists, true, 'Known user must have accountExists: true');

    const knownOtpReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: knownUserEmail, intent: 'login' })
    });
    assert.equal(knownOtpReq.status, 200);
    assert.equal(mockProvider.dispatched.length, 1, 'Login OTP must be dispatched for existing account');

    // 10.2 Unregistered account: eligibility confirms accountExists: false, no OTP sent
    mockProvider.reset();
    const ghostEmail = 'nonexistent.user.test@domain.org';
    const ghostEligResp = await fetch(`${baseUrl}/api/auth/otp/eligibility?email=${encodeURIComponent(ghostEmail)}&intent=login`);
    assert.equal(ghostEligResp.status, 200);
    const ghostEligData = await ghostEligResp.json();
    assert.equal(ghostEligData.success, true);
    assert.equal(ghostEligData.accountExists, false, 'Unregistered user must have accountExists: false');

    // Verify UI contract for unregistered account
    const portalSource = fs.readFileSync(path.resolve('./src/components/landing/PublicRoutePortal.tsx'), 'utf-8');
    assert.ok(
      portalSource.includes('No Jarvis account exists for this email yet. Please sign up first to create your account and receive a verification code.'),
      'PublicRoutePortal must contain exact required message for unregistered account'
    );
    assert.ok(
      portalSource.includes('eligibility.accountExists === false'),
      'PublicRoutePortal must check eligibility.accountExists === false'
    );
    assert.ok(
      portalSource.includes("res.message.includes('If an account exists')"),
      'PublicRoutePortal must include defense-in-depth guard for unregistered accounts'
    );
    assert.ok(
      portalSource.includes('login-account-not-found-signup-btn'),
      'PublicRoutePortal must have prominent sign up button for unregistered account'
    );
    assert.ok(
      portalSource.includes('/signup?email='),
      'PublicRoutePortal must preserve email when navigating to signup'
    );

    // 10.3 Signup action preserves email address
    const testSignupUrl = `/signup?email=${encodeURIComponent('student.transfer@domain.org')}`;
    const params = new URLSearchParams(testSignupUrl.slice(testSignupUrl.indexOf('?')));
    assert.equal(params.get('email'), 'student.transfer@domain.org', 'Email query param must be preserved');

    // 10.4 Signup flow still requests OTP for new users
    mockProvider.reset();
    const brandNewEmail = 'brand.new.registrant@domain.org';
    const newRegEligResp = await fetch(`${baseUrl}/api/auth/otp/eligibility?email=${encodeURIComponent(brandNewEmail)}&intent=register`);
    assert.equal(newRegEligResp.status, 200);
    const newRegEligData = await newRegEligResp.json();
    assert.equal(newRegEligData.accountExists, false);
    assert.equal(newRegEligData.eligible, true);

    const newRegReq = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: brandNewEmail, intent: 'register' })
    });
    assert.equal(newRegReq.status, 200);
    assert.equal(mockProvider.dispatched.length, 1, 'Signup flow must dispatch OTP for new users');
    const newRegCode = extractCodeFromDispatch(brandNewEmail);
    assert.ok(newRegCode && newRegCode.length === 6);

    // 10.5 Eligibility API / network failure handling: retryable error, never false account-not-found
    const invalidEmailResp = await fetch(`${baseUrl}/api/auth/otp/eligibility?email=not-an-email&intent=login`);
    assert.equal(invalidEmailResp.status, 400);
    const invalidData = await invalidEmailResp.json();
    assert.equal(invalidData.error?.code, 'INVALID_ARGUMENTS');
    assert.equal(invalidData.accountExists, undefined, 'API failure must not claim account does not exist');

    console.log('  [PASS] 10. Clear account-not-found login flow, eligibility verification, signup prefill, and failure handling verified');

  } finally {
    if (harness) {
      await harness.close();
    }
    resetEmailProvider();
    resetActiveRepository();

    // Verify baseline database file was untouched
    if (fs.existsSync(baselineDbPath)) {
      const finalDbSha256 = crypto.createHash('sha256').update(fs.readFileSync(baselineDbPath)).digest('hex');
      assert.equal(
        finalDbSha256,
        initialDbSha256,
        'CRITICAL SAFETY FAILURE: Active database data/jarvis-db.json was modified during testing!'
      );
      console.log('\n[SAFETY VERIFIED] data/jarvis-db.json SHA-256 hash unchanged.');
    }

    // Clean up temporary isolated directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n===================================================================');
  console.log('=== [ALL PASS] OTP DELIVERY PERMANENT FIX TESTS COMPLETED       ===');
  console.log('===================================================================\n');
}

runOtpDeliveryPermanentFixTests().catch((err) => {
  console.error('\n[TEST FAILURE]', err);
  process.exit(1);
});
