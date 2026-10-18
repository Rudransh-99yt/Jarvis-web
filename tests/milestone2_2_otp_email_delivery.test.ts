import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  renderOtpEmail,
  ResendEmailProvider,
  ConsoleEmailProvider,
  MockEmailProvider,
  resolveEmailProvider,
  validateProductionEmailConfig,
  setEmailProvider,
  resetEmailProvider,
  IpRateLimiter,
  authIpRateLimiter
} from '../server/auth/email/index.ts';
import {
  otpService,
  OtpService,
  generateSixDigitCode,
  computeOtpHash
} from '../server/auth/otpService.ts';
import {
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository,
  jarvisData
} from '../server/data/index.ts';
import { startHttpHarness } from './httpHarness.ts';
import { app, startServer } from '../server.ts';

async function runMilestone22OtpEmailDeliveryTests() {
  console.log('\n=== [JARVIS] MILESTONE 2.2 OTP EMAIL DELIVERY TEST SUITE ===');

  const baselineDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbSha256 = fs.existsSync(baselineDbPath)
    ? crypto.createHash('sha256').update(fs.readFileSync(baselineDbPath)).digest('hex')
    : null;

  // Set up an isolated test repository in tmp/
  const tmpDir = path.resolve(process.cwd(), 'tmp', `otp-email-test-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const testDbPath = path.join(tmpDir, 'jarvis-db.json');

  if (fs.existsSync(baselineDbPath)) {
    fs.copyFileSync(baselineDbPath, testDbPath);
  }

  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  setActiveRepository(testRepo);
  const testOtpService = new OtpService(testRepo);

  const initialEnv = {
    NODE_ENV: process.env.NODE_ENV,
    JARVIS_EMAIL_PROVIDER: process.env.JARVIS_EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    JARVIS_EMAIL_FROM: process.env.JARVIS_EMAIL_FROM,
    JARVIS_DEV_LOG_OTP_CODE: process.env.JARVIS_DEV_LOG_OTP_CODE
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Email Template Content, Security Warnings, and Formatting
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Email Template Content & Security Formatting ---');
    const sampleCode = '849201';
    const recipient = 'cadet.alex@stark.edu';

    // 1.1 Login template
    const loginRendered = renderOtpEmail({
      code: sampleCode,
      intent: 'login',
      recipientEmail: recipient
    });

    assert.equal(loginRendered.subject, `Your J.A.R.V.I.S. Login Verification Code: ${sampleCode}`);
    assert.ok(loginRendered.html.includes(sampleCode), 'HTML must contain the 6-digit OTP code');
    assert.ok(loginRendered.text.includes(sampleCode), 'Plain text must contain the 6-digit OTP code');
    assert.ok(loginRendered.html.includes('10 minutes'), 'HTML must specify 10-minute expiry');
    assert.ok(loginRendered.text.includes('10 minutes'), 'Plain text must specify 10-minute expiry');
    assert.ok(loginRendered.html.includes('Security Advisory'), 'HTML must include security advisory');
    assert.ok(loginRendered.text.includes('Never share this code with anyone'), 'Plain text must warn against sharing');
    assert.ok(loginRendered.html.includes(recipient), 'HTML must state recipient email');
    assert.ok(loginRendered.text.includes(recipient), 'Plain text must state recipient email');

    // 1.2 Registration template
    const regRendered = renderOtpEmail({
      code: '123456',
      intent: 'register',
      recipientEmail: 'newuser@stark.edu'
    });

    assert.equal(regRendered.subject, 'Welcome to J.A.R.V.I.S. — Your Verification Code: 123456');
    assert.ok(regRendered.html.includes('Welcome to J.A.R.V.I.S.'), 'Must include registration welcome');
    assert.ok(regRendered.text.includes('Welcome to J.A.R.V.I.S.'), 'Plain text must include registration welcome');

    console.log('  [PASS] Email templates contain security advisory, expiry, and clean HTML/text formatting');

    // -------------------------------------------------------------------------
    // TEST 2: Native Fetch Resend Provider & Response Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Native Fetch Resend Provider & Error Categorization ---');
    const originalFetch = globalThis.fetch;

    try {
      // 2.1 Success (200 OK)
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ id: 'msg_resend_test_12345' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const resendProvider = new ResendEmailProvider({
        apiKey: 're_test_mock_secret_key_12345',
        from: 'J.A.R.V.I.S. <auth@starkindustries.com>',
        timeoutMs: 1000
      });

      const successResult = await resendProvider.send({
        to: recipient,
        subject: loginRendered.subject,
        html: loginRendered.html,
        text: loginRendered.text
      });

      assert.equal(successResult.success, true);
      assert.equal(successResult.messageId, 'msg_resend_test_12345');

      // 2.2 Rate Limited (HTTP 429)
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ statusCode: 429, message: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const rateLimitResult = await resendProvider.send({
        to: recipient,
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test'
      });

      assert.equal(rateLimitResult.success, false);
      assert.equal(rateLimitResult.error?.code, 'RATE_LIMITED');
      assert.equal(rateLimitResult.error?.rawStatus, 429);

      // 2.3 Provider Rejected (HTTP 422 Unprocessable Entity or 401 Unauthorized)
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ statusCode: 422, message: 'Domain not verified' }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const rejectedResult = await resendProvider.send({
        to: recipient,
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test'
      });

      assert.equal(rejectedResult.success, false);
      assert.equal(rejectedResult.error?.code, 'PROVIDER_REJECTED');
      assert.equal(rejectedResult.error?.rawStatus, 422);

      // 2.4 Malformed JSON response
      globalThis.fetch = async () => {
        return new Response('<html>502 Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' }
        });
      };

      const malformedResult = await resendProvider.send({
        to: recipient,
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test'
      });

      assert.equal(malformedResult.success, false);
      assert.equal(malformedResult.error?.code, 'NETWORK_ERROR');

      // 2.5 Request Timeout
      globalThis.fetch = async (_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const abortErr = new Error('The operation was aborted');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          }
        });
      };

      const fastTimeoutProvider = new ResendEmailProvider({
        apiKey: 're_test_mock_secret_key_12345',
        from: 'J.A.R.V.I.S. <auth@starkindustries.com>',
        timeoutMs: 50
      });

      const timeoutResult = await fastTimeoutProvider.send({
        to: recipient,
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test'
      });

      assert.equal(timeoutResult.success, false);
      assert.equal(timeoutResult.error?.code, 'TIMEOUT');

      // 2.6 Network Connection Error
      globalThis.fetch = async () => {
        throw new TypeError('fetch failed: ECONNREFUSED');
      };

      const netErrResult = await resendProvider.send({
        to: recipient,
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test'
      });

      assert.equal(netErrResult.success, false);
      assert.equal(netErrResult.error?.code, 'NETWORK_ERROR');

      // 2.7 Verify no secret leakage in error returns
      const stringifiedErrors = JSON.stringify([rateLimitResult, rejectedResult, malformedResult, timeoutResult, netErrResult]);
      assert.ok(!stringifiedErrors.includes('re_test_mock_secret_key_12345'), 'Provider errors must never leak the API key');

      console.log('  [PASS] Resend provider handles 200, 429, 422, timeouts, malformed JSON, and network errors safely');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Production Configuration Fail-Closed Validation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Production Fail-Closed Configuration Boundaries ---');

    // 3.1 Missing API key in production
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    process.env.JARVIS_EMAIL_FROM = 'J.A.R.V.I.S. <auth@starkindustries.com>';
    process.env.JARVIS_EMAIL_PROVIDER = 'resend';

    assert.throws(
      () => validateProductionEmailConfig(),
      /RESEND_API_KEY is required in production/
    );

    // 3.2 Invalid API key (not starting with re_)
    process.env.RESEND_API_KEY = 'invalid_key_format_12345';
    assert.throws(
      () => validateProductionEmailConfig(),
      /valid Resend API key starting with "re_"/
    );

    // 3.3 Missing sender (JARVIS_EMAIL_FROM)
    process.env.RESEND_API_KEY = 're_live_valid_format_test_key_12345';
    delete process.env.JARVIS_EMAIL_FROM;
    assert.throws(
      () => validateProductionEmailConfig(),
      /JARVIS_EMAIL_FROM is required in production/
    );

    // 3.4 Invalid sender format (missing @)
    process.env.JARVIS_EMAIL_FROM = 'not-a-valid-email';
    assert.throws(
      () => validateProductionEmailConfig(),
      /JARVIS_EMAIL_FROM is required in production/
    );

    // 3.4b Malformed sender format (has @ but invalid email regex)
    process.env.JARVIS_EMAIL_FROM = 'J.A.R.V.I.S. <invalid@>';
    assert.throws(
      () => validateProductionEmailConfig(),
      /invalid email address format/
    );

    // 3.5 Disallow silent console/mock fallback in production
    process.env.JARVIS_EMAIL_FROM = 'auth@starkindustries.com';
    process.env.JARVIS_EMAIL_PROVIDER = 'console';
    assert.throws(
      () => validateProductionEmailConfig(),
      /JARVIS_EMAIL_PROVIDER/
    );

    // 3.6 ConsoleEmailProvider constructor strictly throws in production
    assert.throws(
      () => new ConsoleEmailProvider(),
      /SECURITY_VIOLATION: ConsoleEmailProvider cannot be used in production/
    );

    console.log('  [PASS] Production configuration strictly fails closed on missing/invalid keys, sender, or dev fallback');

    // Restore environment
    process.env.NODE_ENV = 'test';
    delete process.env.RESEND_API_KEY;
    delete process.env.JARVIS_EMAIL_FROM;
    delete process.env.JARVIS_EMAIL_PROVIDER;

    // -------------------------------------------------------------------------
    // TEST 4: Development and Test Providers Safe Behavior
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Dev & Mock Provider Safety (No Raw OTP Logged by Default) ---');

    // 4.1 ConsoleEmailProvider with code logging disabled by default
    const originalConsoleLog = console.log;
    let loggedMessages: string[] = [];
    console.log = (...args: any[]) => {
      loggedMessages.push(args.map(String).join(' '));
    };

    try {
      const safeDevProvider = new ConsoleEmailProvider(false);
      await safeDevProvider.send({
        to: 'student@stark.edu',
        subject: 'Verification Code: 998877',
        html: '<p>Code: 998877</p>',
        text: 'Your code is 998877'
      });

      const joinedLogs = loggedMessages.join('\n');
      assert.ok(!joinedLogs.includes('998877'), 'Raw OTP code must NOT be logged when allowCodeLogging is false');
      assert.ok(joinedLogs.includes('content redacted by default'), 'Must state that content is redacted by default');

      // 4.2 Explicit opt-in dev logging
      loggedMessages = [];
      const optInDevProvider = new ConsoleEmailProvider(true);
      await optInDevProvider.send({
        to: 'student@stark.edu',
        subject: 'Verification Code: 998877',
        html: '<p>Code: 998877</p>',
        text: 'Your code is 998877'
      });

      const joinedOptInLogs = loggedMessages.join('\n');
      assert.ok(joinedOptInLogs.includes('998877'), 'Code visible only when explicitly enabled');
    } finally {
      console.log = originalConsoleLog;
    }

    // 4.3 Mock provider for deterministic offline testing
    const mockProvider = new MockEmailProvider();
    await mockProvider.send({
      to: 'cadet@stark.edu',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
      text: 'Hello'
    });

    assert.equal(mockProvider.dispatched.length, 1);
    assert.equal(mockProvider.dispatched[0].to, 'cadet@stark.edu');
    mockProvider.reset();
    assert.equal(mockProvider.dispatched.length, 0);

    console.log('  [PASS] Console provider redacts OTP by default; mock provider records in-memory offline');

    // -------------------------------------------------------------------------
    // TEST 5: Delivery-Failure Compensation & Invalidation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Delivery-Failure Compensation & Rate-Limit History Preservation ---');

    const testEmailDeliveryFail = 'fail.delivery@stark.edu';

    // Generate initial OTP (as done prior to sending email)
    const otpToFail = await testOtpService.generateOtp(testEmailDeliveryFail, 'login');
    assert.equal(typeof otpToFail.otpId, 'string');

    // Verify record in store is 'pending'
    const recordBefore = await testRepo.authOtps.getById(otpToFail.otpId);
    assert.equal(recordBefore?.status, 'pending');

    // Simulate email delivery failure compensating transaction
    const invalidated = await testOtpService.invalidateOtpById(otpToFail.otpId);
    assert.equal(invalidated, true, 'invalidateOtpById must return true on successful transition');

    // Verify record status transitioned to 'invalidated'
    const recordAfter = await testRepo.authOtps.getById(otpToFail.otpId);
    assert.equal(recordAfter?.status, 'invalidated', 'OTP record must now have status "invalidated"');

    // Attempting to verify with this code must fail closed
    const verifyAttempt = await testOtpService.verifyOtp(testEmailDeliveryFail, otpToFail.code, 'login');
    assert.equal(verifyAttempt.success, false);
    assert.equal(verifyAttempt.status, 'invalidated');
    assert.equal(verifyAttempt.error?.code, 'NOT_FOUND');

    // Rate-limiting history MUST be preserved: countRecentRequests still includes this OTP
    const recentCount = await testRepo.authOtps.countRecentRequests(testEmailDeliveryFail, 60 * 60 * 1000);
    assert.equal(recentCount, 1, 'Invalidated OTP must remain counted in rolling hourly rate limit');

    console.log('  [PASS] Delivery failure invalidates the exact OTP while preserving rate-limit history');

    // -------------------------------------------------------------------------
    // TEST 6: Concurrency Safety of Delivery-Failure Invalidation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Concurrency Safety (Failing Delivery Cannot Invalidate Newer OTP) ---');

    const testEmailConcurrent = 'concurrent.user@stark.edu';
    const otp1 = await testOtpService.generateOtp(testEmailConcurrent, 'login');

    // Advance mock time or simulate replacement
    await testRepo.authOtps.update(otp1.otpId, {
      resendAvailableAt: new Date(Date.now() - 1000).toISOString()
    });

    // Request newer OTP (otp2)
    const otp2 = await testOtpService.generateOtp(testEmailConcurrent, 'login');
    assert.notEqual(otp1.otpId, otp2.otpId, 'Newer OTP must have distinct ID');

    // Delayed compensating transaction from otp1's delivery failure arrives now
    const invalidateOtp1Again = await testOtpService.invalidateOtpById(otp1.otpId);
    // Since otp1 was already replaced/invalidated, invalidateOtpById safely returns false
    assert.equal(invalidateOtp1Again, false, 'Invalidating already non-pending OTP must safely return false');

    // Check that otp2 was NOT affected and remains pending
    const recordOtp2 = await testRepo.authOtps.getById(otp2.otpId);
    assert.equal(recordOtp2?.status, 'pending', 'Newer OTP must remain untouched and pending');

    // otp2 can be verified successfully with otp2.code
    const verifyOtp2 = await testOtpService.verifyOtp(testEmailConcurrent, otp2.code, 'login');
    assert.equal(verifyOtp2.success, true, 'Newer OTP must verify successfully');

    console.log('  [PASS] Concurrent delivery failure cannot invalidate newer or distinct OTPs');

    // -------------------------------------------------------------------------
    // TEST 7: In-Memory IP Rate Limiter
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Single-Process In-Memory IP Rate Limiter ---');

    const testLimiter = new IpRateLimiter(5, 1000);
    const testIp = '198.51.100.42';

    for (let i = 1; i <= 5; i++) {
      const res = testLimiter.check(testIp);
      assert.equal(res.allowed, true, `Request ${i} must be allowed`);
      assert.equal(res.remaining, 5 - i);
    }

    const blocked = testLimiter.check(testIp);
    assert.equal(blocked.allowed, false, '6th request must be blocked');
    assert.ok(blocked.retryAfterMs > 0, 'retryAfterMs must be greater than 0');
    testLimiter.close();

    console.log('  [PASS] IP rate limiter strictly enforces sliding window cap');

    // -------------------------------------------------------------------------
    // TEST 8: HTTP Route Integration (Generic Public Response for Unknown Accounts)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: HTTP Route Anti-Enumeration for Unknown Accounts ---');

    const harness = await startHttpHarness();
    const mockEmailDouble = new MockEmailProvider();
    setEmailProvider(mockEmailDouble);
    authIpRateLimiter.reset();

    try {
      // 8.1 Unknown account login request
      const unknownEmail = 'completely.unknown.account@stark.edu';
      const unknownResp = await fetch(`${harness.baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unknownEmail,
          intent: 'login'
        })
      });

      assert.equal(unknownResp.status, 200, 'Unknown login request must return 200 OK');
      const unknownJson = await unknownResp.json();
      assert.equal(unknownJson.success, true);
      assert.equal(
        unknownJson.message,
        'If an account exists for this email address, a verification code has been dispatched.'
      );
      assert.equal(unknownJson.email, unknownEmail);
      assert.equal(unknownJson.intent, 'login');
      assert.ok(unknownJson.resendAvailableAt, 'Must include resendAvailableAt for identical response shape');

      // Verify ZERO emails dispatched
      assert.equal(mockEmailDouble.dispatched.length, 0, 'No email must be dispatched for unknown accounts');

      // Verify ZERO records created in database
      const dbOtps = await jarvisData.authOtps.list({ email: unknownEmail });
      assert.equal(dbOtps.length, 0, 'No OTP record must be persisted for unknown login requests');

      // 8.2 Known account login request has the exact same message and schema
      // Seed a known test user
      const knownEmail = 'known.officer@stark.edu';
      const existingUser = await jarvisData.users.getByEmail(knownEmail);
      if (!existingUser) {
        await jarvisData.users.create({
          id: 'user-known-officer-test',
          displayName: 'Known Officer',
          email: knownEmail,
          role: 'teacher'
        });
      }

      const knownResp = await fetch(`${harness.baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: knownEmail,
          intent: 'login'
        })
      });

      assert.equal(knownResp.status, 200);
      const knownJson = await knownResp.json();
      assert.equal(knownJson.success, true);
      assert.equal(knownJson.message, unknownJson.message, 'Message must be identical between known and unknown');
      assert.deepEqual(
        Object.keys(knownJson).sort(),
        Object.keys(unknownJson).sort(),
        'Response keys must be identical to prevent schema-based enumeration'
      );

      // Known account DOES dispatch an email
      assert.equal(mockEmailDouble.dispatched.length, 1);
      assert.equal(mockEmailDouble.dispatched[0].to, knownEmail);

      console.log('  [PASS] Unknown login email returns identical public response shape and dispatches zero emails');

      // -----------------------------------------------------------------------
      // TEST 9: HTTP Route Delivery Failure Compensation
      // -----------------------------------------------------------------------
      console.log('\n--- Test 9: HTTP Route Delivery Failure 502 & Invalidation ---');

      mockEmailDouble.reset();
      mockEmailDouble.nextResult = {
        success: false,
        error: {
          code: 'PROVIDER_REJECTED',
          message: 'Simulated Resend API rejection'
        }
      };

      const failEmail = 'delivery.failure.test@stark.edu';
      const userFail = await jarvisData.users.getByEmail(failEmail);
      if (!userFail) {
        await jarvisData.users.create({
          id: 'user-fail-delivery-test',
          displayName: 'Fail Officer',
          email: failEmail,
          role: 'teacher'
        });
      }

      const failResp = await fetch(`${harness.baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: failEmail,
          intent: 'login'
        })
      });

      assert.equal(failResp.status, 502, 'Delivery failure must return 502 Bad Gateway');
      const failJson = await failResp.json();
      assert.equal(failJson.error?.code, 'EMAIL_DELIVERY_FAILED');
      assert.equal(failJson.error?.message, 'Unable to deliver verification code. Please try again later.');
      // No raw provider error or secrets leaked
      assert.ok(!JSON.stringify(failJson).includes('Simulated Resend API rejection'));

      // Verify the generated OTP was invalidated
      const otpsForFail = await jarvisData.authOtps.list({ email: failEmail });
      assert.equal(otpsForFail.length, 1);
      assert.equal(otpsForFail[0].status, 'invalidated');

      console.log('  [PASS] Route delivery failure returns safe 502 and invalidates generated OTP');

      // -----------------------------------------------------------------------
      // TEST 10: Complete Register and Verify Flow via Route
      // -----------------------------------------------------------------------
      console.log('\n--- Test 10: Complete Registration & Verification E2E Route Flow ---');

      mockEmailDouble.reset();
      const newEmail = `cadet.${Date.now()}@stark.edu`;

      const regReqResp = await fetch(`${harness.baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          intent: 'register',
          metadata: { displayName: 'Cadet Stark', role: 'student' }
        })
      });

      assert.equal(regReqResp.status, 200);
      assert.equal(mockEmailDouble.dispatched.length, 1);
      const dispatchedText = mockEmailDouble.dispatched[0].text;
      const codeMatch = dispatchedText.match(/YOUR VERIFICATION CODE: (\d{6})/);
      assert.ok(codeMatch, 'Must find 6-digit code in dispatched email text');
      const extractedCode = codeMatch[1];

      // Verify OTP
      const verifyResp = await fetch(`${harness.baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          code: extractedCode,
          intent: 'register',
          displayName: 'Cadet Stark'
        })
      });

      assert.equal(verifyResp.status, 201, 'Registration verification must return 201 Created');
      const verifyJson = await verifyResp.json();
      assert.equal(verifyJson.success, true);
      assert.ok(verifyJson.token, 'Must return session token');
      assert.equal(verifyJson.user.email, newEmail);
      assert.ok(verifyJson.activeWorkspace, 'Must provision active workspace');

      console.log('  [PASS] Full registration request -> email dispatch -> verification -> session issuance passed');

      // -----------------------------------------------------------------------
      // TEST 11: Rate Limiter on Verification Route
      // -----------------------------------------------------------------------
      console.log('\n--- Test 11: IP Rate Limiting Enforcement on Auth Route ---');

      // authIpRateLimiter allows 10 req/min. Trigger 11 requests from simulated IP
      authIpRateLimiter.reset();
      let wasRateLimited = false;

      for (let i = 0; i < 12; i++) {
        const r = await fetch(`${harness.baseUrl}/api/auth/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'any@stark.edu',
            code: '000000',
            intent: 'login'
          })
        });

        if (r.status === 429) {
          wasRateLimited = true;
          const json = await r.json();
          assert.equal(json.error?.code, 'TOO_MANY_REQUESTS');
          break;
        }
      }

      assert.equal(wasRateLimited, true, '11th request must be blocked by IP rate limiter with 429');
      console.log('  [PASS] Auth route rate limiter protects against rapid abuse (429 TOO_MANY_REQUESTS)');
    } finally {
      resetEmailProvider();
      await harness.close();
    }

    // -------------------------------------------------------------------------
    // TEST 12: Scope A — Fail-Closed Production Startup Before Listener
    // -------------------------------------------------------------------------
    console.log('\n--- Test 12: Scope A — Fail-Closed Production Startup Before Listener ---');
    {
      const prevEnv = {
        NODE_ENV: process.env.NODE_ENV,
        AUTH_SECRET_KEY: process.env.AUTH_SECRET_KEY,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        JARVIS_EMAIL_FROM: process.env.JARVIS_EMAIL_FROM,
        JARVIS_EMAIL_PROVIDER: process.env.JARVIS_EMAIL_PROVIDER
      };

      try {
        process.env.NODE_ENV = 'production';
        process.env.AUTH_SECRET_KEY = 'valid-production-signing-secret-key-32chars!';
        delete process.env.RESEND_API_KEY;
        process.env.JARVIS_EMAIL_FROM = 'J.A.R.V.I.S. <auth@starkindustries.com>';
        delete process.env.JARVIS_EMAIL_PROVIDER;
        setActiveRepository(testRepo);

        let listenCalled = false;
        const originalListen = app.listen;
        app.listen = ((...args: any[]) => {
          listenCalled = true;
          return originalListen.apply(app, args as any);
        }) as any;

        let startupErr: any = null;
        try {
          await startServer(0, '127.0.0.1');
        } catch (err: any) {
          startupErr = err;
        } finally {
          app.listen = originalListen;
        }

        assert.ok(startupErr, 'startServer must throw in production when RESEND_API_KEY is missing');
        assert.match(startupErr.message, /RESEND_API_KEY is required in production/);
        assert.equal(listenCalled, false, 'app.listen() must NEVER be called if email config validation fails');

        // Test with invalid RESEND_API_KEY format
        process.env.RESEND_API_KEY = 'invalid_not_re_key';
        listenCalled = false;
        app.listen = ((...args: any[]) => {
          listenCalled = true;
          return originalListen.apply(app, args as any);
        }) as any;

        let startupErrInvalidKey: any = null;
        try {
          await startServer(0, '127.0.0.1');
        } catch (err: any) {
          startupErrInvalidKey = err;
        } finally {
          app.listen = originalListen;
        }

        assert.ok(startupErrInvalidKey, 'startServer must throw when RESEND_API_KEY is invalid format');
        assert.match(startupErrInvalidKey.message, /valid Resend API key starting with "re_"/);
        assert.equal(listenCalled, false, 'app.listen() must NEVER be called if key format is invalid');

        console.log('  [PASS] Production startup fails closed before network listener when email config is missing/invalid');
      } finally {
        for (const [k, v] of Object.entries(prevEnv)) {
          if (v === undefined) delete (process.env as any)[k];
          else (process.env as any)[k] = v;
        }
      }
    }

    // -------------------------------------------------------------------------
    // TEST 13: Scope B — Safe OTP Request Failure Handling & Invalidation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 13: Scope B — Safe OTP Request Failure Handling ---');
    {
      const harnessB = await startHttpHarness();
      authIpRateLimiter.reset();

      try {
        // 13.1 Provider resolution failure (misconfiguration) fails before creating an OTP
        const prevEmailProvider = process.env.JARVIS_EMAIL_PROVIDER;
        try {
          process.env.JARVIS_EMAIL_PROVIDER = 'unsupported_test_provider';
          resetEmailProvider();

          const resp = await fetch(`${harnessB.baseUrl}/api/auth/otp/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'misconfigured.provider@stark.edu',
              intent: 'register'
            })
          });

          assert.equal(resp.status, 500);
          const body = await resp.json();
          assert.equal(body.error?.code, 'INTERNAL_ERROR');
          assert.equal(
            body.error?.message,
            'Email delivery service is currently unavailable. Please try again later.'
          );
          // Confirm NO OTP was created in database
          const otps = await jarvisData.authOtps.list({ email: 'misconfigured.provider@stark.edu' });
          assert.equal(otps.length, 0, 'No OTP must be created when provider cannot be resolved');
          console.log('  [PASS] Provider resolution failure fails fast with safe 500 without creating orphaned OTP');
        } finally {
          if (prevEmailProvider === undefined) delete process.env.JARVIS_EMAIL_PROVIDER;
          else process.env.JARVIS_EMAIL_PROVIDER = prevEmailProvider;
          resetEmailProvider();
        }

        // 13.2 Unexpected provider dispatch exception
        const mockThrowDouble = new MockEmailProvider();
        mockThrowDouble.throwError = new Error('SIMULATED_NETWORK_SOCKET_CRASH_SECRET_LEAK_CHECK');
        setEmailProvider(mockThrowDouble);

        const throwEmail = 'dispatch.exception@stark.edu';
        const throwResp = await fetch(`${harnessB.baseUrl}/api/auth/otp/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: throwEmail,
            intent: 'register'
          })
        });

        assert.equal(throwResp.status, 502);
        const throwBody = await throwResp.json();
        assert.equal(throwBody.error?.code, 'EMAIL_DELIVERY_FAILED');
        assert.equal(throwBody.error?.message, 'Unable to deliver verification code. Please try again later.');
        // Verify no leak of the raw error message or internal details
        assert.ok(!JSON.stringify(throwBody).includes('SIMULATED_NETWORK_SOCKET_CRASH_SECRET_LEAK_CHECK'));

        // Verify the created OTP was safely invalidated
        const throwOtps = await jarvisData.authOtps.list({ email: throwEmail });
        assert.equal(throwOtps.length, 1);
        assert.equal(throwOtps[0].status, 'invalidated', 'OTP must be invalidated following dispatch exception');
        console.log('  [PASS] Provider dispatch exception invalidates exact OTP and masks internal error');

        // 13.3 Invalidation cleanup failure resilience
        // If invalidateOtpById itself throws an error during cleanup, the route must not crash or leak
        const origInvalidate = otpService.invalidateOtpById;
        try {
          (otpService as any).invalidateOtpById = async () => {
            throw new Error('SIMULATED_DB_CLEANUP_FAILURE');
          };

          const cleanupFailEmail = 'cleanup.failure@stark.edu';
          const cleanupResp = await fetch(`${harnessB.baseUrl}/api/auth/otp/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanupFailEmail,
              intent: 'register'
            })
          });

          assert.equal(cleanupResp.status, 502, 'Must still return 502 even if cleanup throws');
          const cleanupBody = await cleanupResp.json();
          assert.equal(cleanupBody.error?.code, 'EMAIL_DELIVERY_FAILED');
          assert.equal(cleanupBody.error?.message, 'Unable to deliver verification code. Please try again later.');
          assert.ok(!JSON.stringify(cleanupBody).includes('SIMULATED_DB_CLEANUP_FAILURE'));
          console.log('  [PASS] Compensating invalidation failure does not crash or mask delivery failure');
        } finally {
          otpService.invalidateOtpById = origInvalidate;
        }
      } finally {
        resetEmailProvider();
        await harnessB.close();
      }
    }

    // -------------------------------------------------------------------------
    // TEST 14: Scope C — Eligibility Endpoint Rate Limiting & Sensitive Data Masking
    // -------------------------------------------------------------------------
    console.log('\n--- Test 14: Scope C — Eligibility Endpoint Security ---');
    {
      const harnessC = await startHttpHarness();
      authIpRateLimiter.reset();

      try {
        // 14.1 Anti-enumeration for login intent with unknown account
        const unknownCheck = await fetch(`${harnessC.baseUrl}/api/auth/otp/eligibility?email=completely.unknown@stark.edu&intent=login`);
        assert.equal(unknownCheck.status, 200);
        const unknownCheckBody = await unknownCheck.json();
        assert.equal(unknownCheckBody.success, true);
        assert.equal(unknownCheckBody.eligible, true);
        assert.equal(unknownCheckBody.hourlyRequestsRemaining, undefined, 'Must not disclose remaining quota to unauthenticated caller');

        // 14.2 Known account eligibility check does not disclose hourlyRequestsRemaining
        const knownEmail = 'known.officer@stark.edu';
        const knownCheck = await fetch(`${harnessC.baseUrl}/api/auth/otp/eligibility?email=${knownEmail}&intent=login`);
        assert.equal(knownCheck.status, 200);
        const knownCheckBody = await knownCheck.json();
        assert.equal(knownCheckBody.success, true);
        assert.equal(knownCheckBody.hourlyRequestsRemaining, undefined, 'Must not disclose quota counts');

        // 14.3 IP Rate Limiting on Eligibility Endpoint
        let eligRateLimited = false;
        for (let i = 0; i < 12; i++) {
          const r = await fetch(`${harnessC.baseUrl}/api/auth/otp/eligibility?email=flood@stark.edu&intent=login`);
          if (r.status === 429) {
            eligRateLimited = true;
            const b = await r.json();
            assert.equal(b.error?.code, 'TOO_MANY_REQUESTS');
            break;
          }
        }
        assert.equal(eligRateLimited, true, '11th request to eligibility endpoint must be rate-limited with 429');
        console.log('  [PASS] Eligibility endpoint rate-limited and omits sensitive quota enumeration fields');
      } finally {
        await harnessC.close();
      }
    }

    // -------------------------------------------------------------------------
    // TEST 15: Scope D — Registration Intent Boundary Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 15: Scope D — Registration Intent Boundary ---');
    {
      const harnessD = await startHttpHarness();
      const mockD = new MockEmailProvider();
      setEmailProvider(mockD);
      authIpRateLimiter.reset();

      try {
        const racingEmail = 'race.register@stark.edu';
        // Request registration OTP when account does not exist yet
        const reqResp = await fetch(`${harnessD.baseUrl}/api/auth/otp/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: racingEmail,
            intent: 'register'
          })
        });
        assert.equal(reqResp.status, 200);
        assert.equal(mockD.dispatched.length, 1);
        const codeMatch = mockD.dispatched[0].text.match(/YOUR VERIFICATION CODE: (\d{6})/);
        assert.ok(codeMatch);
        const regCode = codeMatch[1];

        // Simulate concurrent registration creating user before verification
        await jarvisData.users.create({
          id: 'user-created-before-verify',
          displayName: 'First Registered User',
          email: racingEmail,
          role: 'student'
        });

        // Attempt to verify with intent: 'register'
        const verifyExistingResp = await fetch(`${harnessD.baseUrl}/api/auth/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: racingEmail,
            code: regCode,
            intent: 'register',
            displayName: 'Imposter'
          })
        });

        // MUST be rejected with 409 USER_EXISTS and NEVER issue a session token
        assert.equal(verifyExistingResp.status, 409, 'Registration verification for existing email must be rejected with 409');
        const verifyExistingBody = await verifyExistingResp.json();
        assert.equal(verifyExistingBody.error?.code, 'USER_EXISTS');
        assert.equal(verifyExistingBody.token, undefined, 'Must NEVER issue session token for existing account on register intent');
        console.log('  [PASS] Registration OTP cannot be used as a backdoor login for existing accounts (409 USER_EXISTS)');
      } finally {
        resetEmailProvider();
        await harnessD.close();
      }
    }

    // -------------------------------------------------------------------------
    // TEST 16: Scope E — Header Spoofing Resistance (trust proxy: false)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 16: Scope E — Proxy Header Spoofing Resistance ---');
    {
      const harnessE = await startHttpHarness();
      authIpRateLimiter.reset();

      try {
        // Attempt to bypass rate limit by sending varying X-Forwarded-For headers
        let blockedCount = 0;
        for (let i = 0; i < 15; i++) {
          const fakeIp = `198.51.100.${i + 1}`;
          const res = await fetch(`${harnessE.baseUrl}/api/auth/otp/eligibility?email=spoof@stark.edu&intent=login`, {
            headers: {
              'X-Forwarded-For': fakeIp,
              'X-Real-IP': fakeIp
            }
          });
          if (res.status === 429) {
            blockedCount++;
          }
        }

        assert.ok(blockedCount >= 4, 'Express must ignore spoofed X-Forwarded-For headers when trust proxy is false');
        console.log('  [PASS] Default trust proxy: false configuration resists X-Forwarded-For spoofing');
      } finally {
        await harnessE.close();
      }
    }

    // -------------------------------------------------------------------------
    // TEST 17: Strict Real Database Integrity Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 17: Real Database File Preservation ---');
    if (initialDbSha256) {
      const finalDbSha256 = crypto.createHash('sha256').update(fs.readFileSync(baselineDbPath)).digest('hex');
      assert.equal(
        finalDbSha256,
        initialDbSha256,
        'data/jarvis-db.json must remain 100% byte-for-byte identical'
      );
      console.log(`  [PASS] data/jarvis-db.json preserved (SHA-256: ${finalDbSha256})`);
    }

    console.log('\n>>> ALL 17 MILESTONE 2.2 OTP EMAIL DELIVERY TESTS PASSED SUCCESSFULLY! <<<\n');
  } finally {
    // Restore environment variables
    for (const [key, val] of Object.entries(initialEnv)) {
      if (val === undefined) {
        delete (process.env as any)[key];
      } else {
        (process.env as any)[key] = val;
      }
    }

    // Clean up temporary directory
    resetActiveRepository();
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

runMilestone22OtpEmailDeliveryTests().catch((err) => {
  console.error('\n❌ Milestone 2.2 Test Suite Failed:', err);
  process.exit(1);
});
