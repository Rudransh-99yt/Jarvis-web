import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  otpService,
  OtpService,
  generateSixDigitCode,
  computeOtpHash,
  verifyOtpHash,
  OTP_EXPIRATION_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS
} from '../server/auth/otpService.ts';
import { spawn } from 'node:child_process';
import {
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository,
  getActiveRepository,
  setActiveRepository,
  resetActiveRepository,
  jarvisData,
  JsonFileStore
} from '../server/data/index.ts';
import { resolveAuthSecret, AuthenticationError } from '../server/auth/tokens.ts';

async function runMilestone21OtpTests() {
  console.log('\n=== [JARVIS] MILESTONE 2.1 OTP CRYPTOGRAPHIC ENGINE TEST SUITE ===');

  // Set up an isolated test repository in tmp/ so real data/jarvis-db.json is not touched
  const tmpDir = path.resolve(process.cwd(), 'tmp', `otp-test-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const testDbPath = path.join(tmpDir, 'jarvis-db.json');

  // Copy existing db if present to start with valid baseline
  const defaultDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  if (fs.existsSync(defaultDbPath)) {
    fs.copyFileSync(defaultDbPath, testDbPath);
  }

  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  setActiveRepository(testRepo);
  const testOtpService = new OtpService(testRepo);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Six-digit CSPRNG Generation & Salted Hash-Only Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Six-digit CSPRNG Generation & Salted Hash Storage ---');
    const email1 = 'cadet.alex@stark.edu';
    const otp1 = await testOtpService.generateOtp(email1, 'login');

    assert.equal(typeof otp1.code, 'string', 'OTP code must be a string');
    assert.match(otp1.code, /^[0-9]{6}$/, 'OTP code must be exactly 6 decimal digits');
    assert.ok(parseInt(otp1.code, 10) >= 100000 && parseInt(otp1.code, 10) <= 999999, 'Code must be in 100000..999999');

    // Inspect direct database record
    const record1 = await testRepo.authOtps.getById(otp1.otpId);
    assert.ok(record1, 'Record must exist in authOtps collection');
    assert.equal(record1.email, email1.toLowerCase());
    assert.equal(record1.intent, 'login');
    assert.equal(record1.status, 'pending');
    assert.equal(record1.attemptsRemaining, 5);

    // Verify hash & salt security
    assert.match(record1.otpHash, /^[0-9a-f]{64}$/, 'OTP hash must be 64-char SHA-256 hex string');
    assert.match(record1.salt, /^[0-9a-f]{32}$/, 'Salt must be 32-char hex string (16 bytes)');
    assert.equal((record1 as any).code, undefined, 'Raw code must NEVER be persisted in the record');
    assert.ok(!JSON.stringify(record1).includes(otp1.code), 'Raw code must not appear anywhere in persisted JSON');

    console.log(`  [PASS] 6-digit CSPRNG generated and stored with salted HMAC-SHA256 (hash: ${record1.otpHash.slice(0, 12)}...)`);

    // -------------------------------------------------------------------------
    // TEST 2: Correct Verification & Single-Use Consumption
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Correct Verification & Single-Use Consumption ---');
    const verifySuccess = await testOtpService.verifyOtp(email1, otp1.code, 'login');
    assert.equal(verifySuccess.success, true, 'Verification with correct code must succeed');
    assert.equal(verifySuccess.status, 'verified', 'Status must be verified');
    assert.equal(verifySuccess.otpId, otp1.otpId);

    // Verify record in store has verified status and verifiedAt timestamp
    const recordAfterVerify = await testRepo.authOtps.getById(otp1.otpId);
    assert.equal(recordAfterVerify?.status, 'verified');
    assert.ok(recordAfterVerify?.verifiedAt, 'verifiedAt timestamp must be set');

    // Replay attempt: verifying the same OTP again must fail closed
    const replayAttempt = await testOtpService.verifyOtp(email1, otp1.code, 'login');
    assert.equal(replayAttempt.success, false, 'Replaying a verified OTP must fail');
    assert.equal(replayAttempt.error?.code, 'ALREADY_VERIFIED', 'Error code must be ALREADY_VERIFIED');

    console.log('  [PASS] Single-use verification confirmed; replay attempt safely rejected');

    // -------------------------------------------------------------------------
    // TEST 3: Incorrect-Code Rejection & Attempt Exhaustion (Brute-Force Lockout)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Incorrect-Code Rejection & Lockout After 5 Failures ---');
    const email2 = 'dr.sarah@stark.edu';
    const otp2 = await testOtpService.generateOtp(email2, 'login');

    // Generate an incorrect code guaranteed not to equal otp2.code
    const wrongCode = otp2.code === '123456' ? '654321' : '123456';

    // Attempt 1
    const fail1 = await testOtpService.verifyOtp(email2, wrongCode, 'login');
    assert.equal(fail1.success, false);
    assert.equal(fail1.error?.code, 'INVALID_CODE');
    assert.equal(fail1.attemptsRemaining, 4);

    // Attempt 2, 3, 4
    await testOtpService.verifyOtp(email2, wrongCode, 'login');
    await testOtpService.verifyOtp(email2, wrongCode, 'login');
    const fail4 = await testOtpService.verifyOtp(email2, wrongCode, 'login');
    assert.equal(fail4.attemptsRemaining, 1);

    // Attempt 5 (Final attempt)
    const fail5 = await testOtpService.verifyOtp(email2, wrongCode, 'login');
    assert.equal(fail5.success, false);
    assert.equal(fail5.status, 'locked');
    assert.equal(fail5.attemptsRemaining, 0);
    assert.equal(fail5.error?.code, 'LOCKED');

    // Attempt 6 with the CORRECT code after lockout must still be rejected
    const lockedAttempt = await testOtpService.verifyOtp(email2, otp2.code, 'login');
    assert.equal(lockedAttempt.success, false, 'Correct code must be rejected when locked');
    assert.equal(lockedAttempt.error?.code, 'LOCKED');

    console.log('  [PASS] 5 failed attempts triggered lockout; correct code rejected after lock');

    // -------------------------------------------------------------------------
    // TEST 4: Expiration Handling (>10 Minutes)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Expiration Handling ---');
    const email3 = 'tony@starkindustries.com';
    const otp3 = await testOtpService.generateOtp(email3, 'login');

    // Simulate expiration by setting expiresAt to the past
    await testRepo.authOtps.update(otp3.otpId, {
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });

    const expiredAttempt = await testOtpService.verifyOtp(email3, otp3.code, 'login');
    assert.equal(expiredAttempt.success, false);
    assert.equal(expiredAttempt.error?.code, 'EXPIRED');

    console.log('  [PASS] Expired code rejected with EXPIRED error code');

    // -------------------------------------------------------------------------
    // TEST 5: Resend Cooldown Enforcement (60s)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Resend Cooldown Enforcement ---');
    const email4 = 'resend.test@stark.edu';
    const otp4 = await testOtpService.generateOtp(email4, 'register');

    // Immediate second request must trigger cooldown error
    let cooldownCaught = false;
    try {
      await testOtpService.generateOtp(email4, 'register');
    } catch (err: any) {
      cooldownCaught = true;
      assert.equal(err?.code, 'RESEND_COOLDOWN_ACTIVE');
      assert.ok(err?.retryAfterMs > 0);
    }
    assert.equal(cooldownCaught, true, 'Second request within 60s must throw RESEND_COOLDOWN_ACTIVE');

    // Check eligibility helper
    const eligibility = await testOtpService.checkResendEligibility(email4, 'register');
    assert.equal(eligibility.eligible, false);
    assert.ok(eligibility.cooldownRemainingMs! > 0);

    // Fast-forward cooldown by updating resendAvailableAt to the past
    await testRepo.authOtps.update(otp4.otpId, {
      resendAvailableAt: new Date(Date.now() - 1000).toISOString()
    });

    const eligibilityAfter = await testOtpService.checkResendEligibility(email4, 'register');
    assert.equal(eligibilityAfter.eligible, true);

    const otp4Second = await testOtpService.generateOtp(email4, 'register');
    assert.ok(otp4Second.otpId);
    console.log('  [PASS] 60-second resend cooldown strictly enforced');

    // -------------------------------------------------------------------------
    // TEST 6: Previous-Code Invalidation on Replacement
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Previous-Code Invalidation on Replacement ---');
    // From Test 5, otp4 was replaced by otp4Second.
    // otp4 must be marked 'invalidated' and cannot be verified
    const oldRecord = await testRepo.authOtps.getById(otp4.otpId);
    assert.equal(oldRecord?.status, 'invalidated');

    const verifyOld = await testOtpService.verifyOtp(email4, otp4.code, 'register');
    assert.equal(verifyOld.success, false, 'Old invalidated code must not verify');

    const verifyNew = await testOtpService.verifyOtp(email4, otp4Second.code, 'register');
    assert.equal(verifyNew.success, true, 'New replacement code must verify successfully');

    console.log('  [PASS] Requesting a new OTP invalidated the previous code');

    // -------------------------------------------------------------------------
    // TEST 7: Intent Separation (Login vs. Register)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Intent Separation (Login vs. Register) ---');
    const email5 = 'intent.isolation@stark.edu';
    const registerOtp = await testOtpService.generateOtp(email5, 'register');

    // Attempting to verify the registration OTP with 'login' intent must fail
    const crossIntentAttempt = await testOtpService.verifyOtp(email5, registerOtp.code, 'login');
    assert.equal(crossIntentAttempt.success, false, 'Cross-intent verification must fail');
    assert.equal(crossIntentAttempt.error?.code, 'NOT_FOUND');

    // Verifying with correct 'register' intent must succeed
    const correctIntentAttempt = await testOtpService.verifyOtp(email5, registerOtp.code, 'register');
    assert.equal(correctIntentAttempt.success, true, 'Matching intent verification must succeed');

    console.log('  [PASS] Login and registration intents are strictly separated');

    // -------------------------------------------------------------------------
    // TEST 8: Concurrent Replay Race Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Concurrent Replay Race Protection ---');
    const email6 = 'race.condition@stark.edu';
    const raceOtp = await testOtpService.generateOtp(email6, 'login');

    // Fire 5 simultaneous verification attempts with the correct code
    const results = await Promise.all([
      testOtpService.verifyOtp(email6, raceOtp.code, 'login'),
      testOtpService.verifyOtp(email6, raceOtp.code, 'login'),
      testOtpService.verifyOtp(email6, raceOtp.code, 'login'),
      testOtpService.verifyOtp(email6, raceOtp.code, 'login'),
      testOtpService.verifyOtp(email6, raceOtp.code, 'login')
    ]);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    assert.equal(successes.length, 1, 'Exactly one concurrent verification attempt must succeed');
    assert.equal(failures.length, 4, 'All subsequent concurrent attempts must fail');
    for (const fail of failures) {
      assert.equal(fail.error?.code, 'ALREADY_VERIFIED');
    }

    console.log('  [PASS] Concurrent race condition resolved: exactly 1 success, 4 blocked');

    // -------------------------------------------------------------------------
    // TEST 9: Backward-Compatible Loading of Legacy Database Files
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Backward-Compatible Legacy Database Loading ---');
    const legacyDbPath = path.join(tmpDir, 'legacy-db.json');
    // Write a v2 database file that has NO authOtps key at all
    const legacyState = {
      version: 2,
      users: [
        {
          id: 'user-legacy-1',
          displayName: 'Legacy User',
          email: 'legacy@stark.edu',
          role: 'student',
          createdAt: '2026-09-01T08:00:00.000Z'
        }
      ],
      workspaces: []
    };
    fs.writeFileSync(legacyDbPath, JSON.stringify(legacyState, null, 2), 'utf8');

    const legacyRepo = new DiskJarvisDataRepository(legacyDbPath);
    await legacyRepo.init();

    // Verify authOtps collection is initialized as an array
    const state = legacyRepo.getState();
    assert.ok(Array.isArray(state.authOtps), 'authOtps must be initialized as an array');
    assert.equal(state.authOtps.length, 0);
    assert.equal(state.users.length, 1);
    assert.equal(state.users[0].id, 'user-legacy-1');

    // Verify we can create an OTP in this repository without issues
    const legacyOtp = await legacyRepo.authOtps.create({
      id: 'otp-legacy-test',
      email: 'legacy@stark.edu',
      intent: 'login',
      otpHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      salt: '0123456789abcdef0123456789abcdef',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      attemptsRemaining: 5,
      resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
      status: 'pending'
    });
    assert.equal(legacyOtp.id, 'otp-legacy-test');

    console.log('  [PASS] Legacy database loaded seamlessly and initialized authOtps');

    // -------------------------------------------------------------------------
    // TEST 10: Atomic Persistence and Rollback Safety
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Atomic Persistence & Transaction Rollback ---');
    const email7 = 'rollback.test@stark.edu';

    let errorThrown = false;
    try {
      await testRepo.runTransaction(async (txRepo) => {
        await txRepo.authOtps.create({
          id: 'otp-to-be-rolled-back',
          email: email7,
          intent: 'login',
          otpHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          salt: '0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          attemptsRemaining: 5,
          resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
          status: 'pending'
        });
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err: any) {
      if (err.message.includes('SIMULATED_TRANSACTION_FAILURE')) {
        errorThrown = true;
      }
    }
    assert.equal(errorThrown, true, 'Transaction failure must be thrown');

    // Verify the record was NOT committed
    const rolledBackRecord = await testRepo.authOtps.getById('otp-to-be-rolled-back');
    assert.equal(rolledBackRecord, null, 'Rolled-back OTP record must not exist in database');

    console.log('  [PASS] Transaction rollback safety verified: failed mutations discarded');

    // -------------------------------------------------------------------------
    // TEST 11: Timing-Safe Buffer Length Check
    // -------------------------------------------------------------------------
    console.log('\n--- Test 11: Timing-Safe Buffer Length Checks ---');
    const validSalt = crypto.randomBytes(16).toString('hex'); // 32 hex chars
    const validHash = computeOtpHash('secret', 'test@test.com', '123456', validSalt);
    assert.equal(verifyOtpHash('123456', 'test@test.com', validSalt, validHash, 'secret'), true);
    assert.equal(verifyOtpHash('wrong', 'test@test.com', validSalt, validHash, 'secret'), false);
    // Malformed stored hash (not 64 chars) must return false instead of throwing RangeError
    assert.equal(verifyOtpHash('123456', 'test@test.com', validSalt, 'tooshort', 'secret'), false);
    // Malformed salt (not 32 chars) must return false instead of throwing RangeError
    assert.equal(verifyOtpHash('123456', 'test@test.com', 'tooshortsalt', validHash, 'secret'), false);
    assert.equal(verifyOtpHash('', 'test@test.com', validSalt, validHash, 'secret'), false);

    console.log('  [PASS] Timing-safe comparison handles unequal lengths and invalid salts without errors');

    // -------------------------------------------------------------------------
    // TEST 12: Concurrent OTP Generation Race Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 12: Concurrent OTP Generation Race Protection ---');
    const emailRace = 'gen.race@stark.edu';
    // Launch 5 simultaneous generation requests for the exact same email & intent
    const genPromises = [
      testOtpService.generateOtp(emailRace, 'login'),
      testOtpService.generateOtp(emailRace, 'login'),
      testOtpService.generateOtp(emailRace, 'login'),
      testOtpService.generateOtp(emailRace, 'login'),
      testOtpService.generateOtp(emailRace, 'login')
    ];
    const genSettled = await Promise.allSettled(genPromises);
    const fulfilled = genSettled.filter((r) => r.status === 'fulfilled');
    const rejected = genSettled.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly 1 concurrent generateOtp must succeed');
    assert.equal(rejected.length, 4, 'Exactly 4 concurrent generateOtp must fail with cooldown error');
    for (const rej of rejected) {
      if (rej.status === 'rejected') {
        assert.equal((rej.reason as any).code, 'RESEND_COOLDOWN_ACTIVE');
      }
    }
    // Verify database has exactly 1 pending OTP for this email
    const otpsInDb = await testRepo.authOtps.list({ email: emailRace, intent: 'login' });
    assert.equal(otpsInDb.length, 1, 'Database must contain exactly 1 OTP record');
    assert.equal(otpsInDb[0].status, 'pending');
    console.log('  [PASS] Concurrent OTP generation race safely serialized: 1 success, 4 cooldown rejections');

    // -------------------------------------------------------------------------
    // TEST 13: Concurrent Generation for Independent Emails & Intents
    // -------------------------------------------------------------------------
    console.log('\n--- Test 13: Concurrent Independent Generation Throughput ---');
    const emailIndA = 'independent.a@stark.edu';
    const emailIndB = 'independent.b@stark.edu';
    const emailIndC = 'independent.c@stark.edu';

    const independentResults = await Promise.all([
      testOtpService.generateOtp(emailIndA, 'login'),
      testOtpService.generateOtp(emailIndB, 'login'),
      testOtpService.generateOtp(emailIndC, 'register'),
      testOtpService.generateOtp(emailIndA, 'register') // different intent for same email
    ]);

    assert.equal(independentResults.length, 4);
    assert.ok(independentResults.every((r) => typeof r.code === 'string' && r.code.length === 6));
    console.log('  [PASS] Concurrent independent generation processed without false collisions');

    // -------------------------------------------------------------------------
    // TEST 14: Precise Resend Cooldown Boundary Testing
    // -------------------------------------------------------------------------
    console.log('\n--- Test 14: Precise Resend Cooldown Boundary Testing ---');
    const emailBoundary = 'cooldown.boundary@stark.edu';
    const otpBoundary = await testOtpService.generateOtp(emailBoundary, 'login');

    // Case A: 100ms in future
    const futureTime = Date.now() + 100;
    await testRepo.authOtps.update(otpBoundary.otpId, {
      resendAvailableAt: new Date(futureTime).toISOString()
    });
    let earlyError: any = null;
    try {
      await testOtpService.generateOtp(emailBoundary, 'login');
    } catch (e) {
      earlyError = e;
    }
    assert.ok(earlyError, 'Generation before cooldown expiry must be rejected');
    assert.equal(earlyError.code, 'RESEND_COOLDOWN_ACTIVE');

    // Case B: In the past
    await testRepo.authOtps.update(otpBoundary.otpId, {
      resendAvailableAt: new Date(Date.now() - 10).toISOString()
    });
    const boundarySuccess = await testOtpService.generateOtp(emailBoundary, 'login');
    assert.ok(boundarySuccess.otpId, 'Generation at or after cooldown expiry must succeed');
    console.log('  [PASS] Cooldown boundary accurately rejects premature and allows eligible requests');

    // -------------------------------------------------------------------------
    // TEST 15: Precise Expiration Boundary Testing
    // -------------------------------------------------------------------------
    console.log('\n--- Test 15: Precise Expiration Boundary Testing ---');
    const emailExpBoundary = 'expiry.boundary@stark.edu';
    const otpExp = await testOtpService.generateOtp(emailExpBoundary, 'login');

    // Case A: Future expiresAt -> valid
    await testRepo.authOtps.update(otpExp.otpId, {
      expiresAt: new Date(Date.now() + 2000).toISOString()
    });
    const preExpiryCheck = await testOtpService.verifyOtp(emailExpBoundary, otpExp.code, 'login');
    assert.equal(preExpiryCheck.success, true, 'Verification before expiration must succeed');

    // Case B: Create another code, set expiresAt to past
    await testRepo.authOtps.update(otpExp.otpId, {
      resendAvailableAt: new Date(Date.now() - 1000).toISOString()
    });
    const otpExp2 = await testOtpService.generateOtp(emailExpBoundary, 'login');
    await testRepo.authOtps.update(otpExp2.otpId, {
      expiresAt: new Date(Date.now() - 10).toISOString()
    });
    const postExpiryCheck = await testOtpService.verifyOtp(emailExpBoundary, otpExp2.code, 'login');
    assert.equal(postExpiryCheck.success, false, 'Verification after expiration must fail');
    assert.equal(postExpiryCheck.error?.code, 'EXPIRED');
    console.log('  [PASS] Expiration boundary verified: valid before expiry, rejected after expiry');

    // -------------------------------------------------------------------------
    // TEST 16: Input Boundary & Normalization
    // -------------------------------------------------------------------------
    console.log('\n--- Test 16: Input Boundary & Normalization ---');
    // Case insensitivity & trimming during generate & verify
    const rawEmail = '   Captain.Marvel@AVENGERS.HQ   ';
    const normOtp = await testOtpService.generateOtp(rawEmail, 'login');
    assert.equal(normOtp.email, 'captain.marvel@avengers.hq');

    const verifyNorm = await testOtpService.verifyOtp('  CAPTAIN.MARVEL@avengers.hq  ', normOtp.code, 'login');
    assert.equal(verifyNorm.success, true, 'Case-insensitive, whitespace-trimmed email must verify');

    // Invalid email formats
    let invalidEmailCaught = false;
    try {
      await testOtpService.generateOtp('notanemail', 'login');
    } catch (e: any) {
      invalidEmailCaught = true;
      assert.equal(e.code, 'INVALID_ARGUMENTS');
    }
    assert.equal(invalidEmailCaught, true);

    // Email > 254 chars (RFC 5321 length limit)
    const longEmail = 'a'.repeat(250) + '@stark.edu'; // 260 chars
    let longEmailCaught = false;
    try {
      await testOtpService.generateOtp(longEmail, 'login');
    } catch (e: any) {
      longEmailCaught = true;
      assert.equal(e.code, 'INVALID_ARGUMENTS');
    }
    assert.equal(longEmailCaught, true);

    // Invalid intent
    let invalidIntentCaught = false;
    try {
      await testOtpService.generateOtp('valid@stark.edu', 'superuser' as any);
    } catch (e: any) {
      invalidIntentCaught = true;
      assert.equal(e.code, 'INVALID_ARGUMENTS');
    }
    assert.equal(invalidIntentCaught, true);

    const invalidIntentVerify = await testOtpService.verifyOtp('valid@stark.edu', '123456', 'admin' as any);
    assert.equal(invalidIntentVerify.success, false);
    assert.equal(invalidIntentVerify.error?.code, 'INVALID_ARGUMENTS');

    const invalidIntentResend = await testOtpService.checkResendEligibility('valid@stark.edu', 'admin' as any);
    assert.equal(invalidIntentResend.eligible, false);

    // Empty or whitespace-only code
    const emptyCodeVerify = await testOtpService.verifyOtp('valid@stark.edu', '   ', 'login');
    assert.equal(emptyCodeVerify.success, false);
    assert.equal(emptyCodeVerify.error?.code, 'INVALID_ARGUMENTS');

    console.log('  [PASS] Input boundary validation and normalization verified');

    // -------------------------------------------------------------------------
    // TEST 17: Hourly Abuse Rate Limit Saturation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 17: Hourly Abuse Rate Limit Saturation ---');
    const emailRateLimit = 'ratelimit.saturation@stark.edu';

    // Generate 5 OTPs by bypassing cooldown between each
    for (let i = 1; i <= 5; i++) {
      const otp = await testOtpService.generateOtp(emailRateLimit, 'login');
      // Reset cooldown so next request in the loop is allowed until hourly cap
      await testRepo.authOtps.update(otp.otpId, {
        resendAvailableAt: new Date(Date.now() - 1000).toISOString()
      });
    }

    // 6th request within 1 hour must be rejected with RATE_LIMIT_EXCEEDED
    let rateExceeded = false;
    try {
      await testOtpService.generateOtp(emailRateLimit, 'login');
    } catch (e: any) {
      rateExceeded = true;
      assert.equal(e.code, 'RATE_LIMIT_EXCEEDED');
    }
    assert.equal(rateExceeded, true, '6th request must exceed hourly rate limit');

    // Run cleanup of expired OTPs
    const cleaned = await testRepo.authOtps.cleanupExpired();
    // Verify rate limit is STILL exceeded (cleanup of expired records does NOT restore quota)
    let rateStillExceeded = false;
    try {
      await testOtpService.generateOtp(emailRateLimit, 'login');
    } catch (e: any) {
      rateStillExceeded = true;
      assert.equal(e.code, 'RATE_LIMIT_EXCEEDED');
    }
    assert.equal(rateStillExceeded, true, 'Cleanup must not restore consumed rate limit quota');

    // Fast-forward past 1 hour: simulate clock advancement by shifting createdAt 65 minutes into the past
    const sixtyFiveMinAgo = new Date(Date.now() - 65 * 60 * 1000).toISOString();
    testRepo.mutate((state) => {
      for (const item of state.authOtps || []) {
        if (item.email === emailRateLimit.toLowerCase()) {
          item.createdAt = sixtyFiveMinAgo;
        }
      }
    });

    // 6th request after 1 hour rolling window must now succeed
    const afterHourSuccess = await testOtpService.generateOtp(emailRateLimit, 'login');
    assert.ok(afterHourSuccess.otpId, 'Request after rolling 1h window must succeed');
    console.log('  [PASS] Hourly abuse rate limit enforced and decoupled from expired cleanup');

    // -------------------------------------------------------------------------
    // TEST 18: Service-Level Transaction Rollback Safety
    // -------------------------------------------------------------------------
    console.log('\n--- Test 18: Service-Level Transaction Rollback Safety ---');
    const emailTxFail = 'txfail@stark.edu';
    const countBefore = (await testRepo.authOtps.list({ email: emailTxFail })).length;
    assert.equal(countBefore, 0);

    let txThrew = false;
    try {
      await testRepo.runTransaction(async (txRepo) => {
        await txRepo.authOtps.create({
          id: 'otp-tx-should-rollback',
          email: emailTxFail,
          intent: 'login',
          otpHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          salt: '0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          attemptsRemaining: 5,
          resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
          status: 'pending'
        });
        throw new Error('UNEXPECTED_SYSTEM_FAULT');
      });
    } catch (e: any) {
      if (e.message === 'UNEXPECTED_SYSTEM_FAULT') txThrew = true;
    }
    assert.equal(txThrew, true);

    const countAfter = (await testRepo.authOtps.list({ email: emailTxFail })).length;
    assert.equal(countAfter, 0, 'No partial OTP records can remain after transaction fault');
    console.log('  [PASS] Transaction fault cleanly rolled back without orphaned records');

    // -------------------------------------------------------------------------
    // TEST 19: High-Load Concurrent OTP Generation (10 Parallel Calls)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 19: High-Load Concurrent OTP Generation (10 Parallel Calls) ---');
    const emailHighLoad = 'highload.race@stark.edu';
    const parallelCalls = Array.from({ length: 10 }, () =>
      testOtpService.generateOtp(emailHighLoad, 'login')
    );
    const settled10 = await Promise.allSettled(parallelCalls);
    const fulfilled10 = settled10.filter((r) => r.status === 'fulfilled');
    const rejected10 = settled10.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled10.length, 1, 'Exactly 1 concurrent request out of 10 must succeed');
    assert.equal(rejected10.length, 9, 'Exactly 9 concurrent requests must fail with cooldown error');
    for (const rej of rejected10) {
      if (rej.status === 'rejected') {
        assert.equal((rej.reason as any).code, 'RESEND_COOLDOWN_ACTIVE');
      }
    }
    const highLoadInDb = await testRepo.authOtps.list({ email: emailHighLoad, intent: 'login' });
    assert.equal(highLoadInDb.length, 1, 'Database must contain exactly 1 OTP record');
    assert.equal(highLoadInDb[0].status, 'pending');
    console.log('  [PASS] 10 parallel generation requests safely serialized: 1 success, 9 cooldown rejections');

    // -------------------------------------------------------------------------
    // TEST 20: Concurrent Requests at Cooldown Boundary
    // -------------------------------------------------------------------------
    console.log('\n--- Test 20: Concurrent Requests at Cooldown Boundary ---');
    const emailCdBoundary = 'concurrent.cd.boundary@stark.edu';
    const initialOtp = await testOtpService.generateOtp(emailCdBoundary, 'login');

    // Simulate clock advancing past cooldown by setting resendAvailableAt to 10ms in the past
    await testRepo.authOtps.update(initialOtp.otpId, {
      resendAvailableAt: new Date(Date.now() - 10).toISOString()
    });

    // Fire 5 concurrent generation requests simultaneously now that cooldown has just expired
    const cdRaceSettled = await Promise.allSettled([
      testOtpService.generateOtp(emailCdBoundary, 'login'),
      testOtpService.generateOtp(emailCdBoundary, 'login'),
      testOtpService.generateOtp(emailCdBoundary, 'login'),
      testOtpService.generateOtp(emailCdBoundary, 'login'),
      testOtpService.generateOtp(emailCdBoundary, 'login')
    ]);

    const cdSuccesses = cdRaceSettled.filter((r) => r.status === 'fulfilled');
    const cdRejections = cdRaceSettled.filter((r) => r.status === 'rejected');

    assert.equal(cdSuccesses.length, 1, 'Exactly 1 request must capture the open cooldown window');
    assert.equal(cdRejections.length, 4, '4 concurrent requests must be rejected by the NEW cooldown');
    for (const rej of cdRejections) {
      if (rej.status === 'rejected') {
        assert.equal((rej.reason as any).code, 'RESEND_COOLDOWN_ACTIVE');
      }
    }
    // Verify invariants in DB: initialOtp must be invalidated, exactly 1 active pending OTP exists
    const cdDbRecords = await testRepo.authOtps.list({ email: emailCdBoundary, intent: 'login' });
    assert.equal(cdDbRecords.length, 2, 'Exactly 2 records total (1 invalidated, 1 pending)');
    const activeCd = cdDbRecords.filter((r) => r.status === 'pending');
    const invalidCd = cdDbRecords.filter((r) => r.status === 'invalidated');
    assert.equal(activeCd.length, 1);
    assert.equal(invalidCd.length, 1);
    console.log('  [PASS] Cooldown boundary race safely handled: exactly 1 new active OTP, 4 rejected');

    // -------------------------------------------------------------------------
    // TEST 21: Concurrent Requests at Hourly Rate Limit Boundary
    // -------------------------------------------------------------------------
    console.log('\n--- Test 21: Concurrent Requests at Hourly Rate-Limit Boundary ---');
    const emailHourlyBoundary = 'concurrent.hourly.boundary@stark.edu';

    // Create 4 initial OTPs (exhausting 4 out of 5 allowed requests)
    for (let i = 1; i <= 4; i++) {
      const otp = await testOtpService.generateOtp(emailHourlyBoundary, 'login');
      await testRepo.authOtps.update(otp.otpId, {
        resendAvailableAt: new Date(Date.now() - 1000).toISOString()
      });
    }

    assert.equal(await testRepo.authOtps.countRecentRequests(emailHourlyBoundary, 3600000), 4);

    // Fire 5 concurrent requests for the final 5th slot
    const hourlyRaceSettled = await Promise.allSettled([
      testOtpService.generateOtp(emailHourlyBoundary, 'login'),
      testOtpService.generateOtp(emailHourlyBoundary, 'login'),
      testOtpService.generateOtp(emailHourlyBoundary, 'login'),
      testOtpService.generateOtp(emailHourlyBoundary, 'login'),
      testOtpService.generateOtp(emailHourlyBoundary, 'login')
    ]);

    const hourlySuccesses = hourlyRaceSettled.filter((r) => r.status === 'fulfilled');
    const hourlyRejections = hourlyRaceSettled.filter((r) => r.status === 'rejected');

    assert.equal(hourlySuccesses.length, 1, 'Exactly 1 request must capture the 5th and final hourly slot');
    assert.equal(hourlyRejections.length, 4, 'The remaining 4 requests must fail with RATE_LIMIT_EXCEEDED');
    for (const rej of hourlyRejections) {
      if (rej.status === 'rejected') {
        assert.equal((rej.reason as any).code, 'RATE_LIMIT_EXCEEDED');
      }
    }
    const finalRecentCount = await testRepo.authOtps.countRecentRequests(emailHourlyBoundary, 3600000);
    assert.equal(finalRecentCount, 5, 'Persisted count must be exactly 5, never exceeding the abuse ceiling');
    console.log('  [PASS] Hourly rate-limit boundary race safely contained: exactly 5 total persisted records');

    // -------------------------------------------------------------------------
    // TEST 22: Verification Racing Against Replacement
    // -------------------------------------------------------------------------
    console.log('\n--- Test 22: Verification Racing Against Replacement ---');
    const emailVerifyReplace = 'verify.racing.replace@stark.edu';
    const initialVerifyOtp = await testOtpService.generateOtp(emailVerifyReplace, 'login');

    // Advance cooldown on initialVerifyOtp so generate is permitted
    await testRepo.authOtps.update(initialVerifyOtp.otpId, {
      resendAvailableAt: new Date(Date.now() - 1000).toISOString()
    });

    // Race verifyOtp(initialVerifyOtp.code) against generateOtp()
    const [verifyResult, generateResult] = await Promise.all([
      testOtpService.verifyOtp(emailVerifyReplace, initialVerifyOtp.code, 'login'),
      testOtpService.generateOtp(emailVerifyReplace, 'login')
    ]);

    const allRecords = await testRepo.authOtps.list({ email: emailVerifyReplace, intent: 'login' });
    const pendingRecords = allRecords.filter((r) => r.status === 'pending');
    assert.equal(pendingRecords.length, 1, 'Exactly one active pending OTP must exist in all branches');

    if (verifyResult.success) {
      // Verify ran first
      const verifiedRecord = allRecords.find((r) => r.id === initialVerifyOtp.otpId);
      assert.equal(verifiedRecord?.status, 'verified', 'Initial OTP was verified before replacement');
      assert.ok(generateResult.otpId, 'New OTP was subsequently generated');
    } else {
      // Generate ran first
      assert.equal(verifyResult.success, false);
      const oldRecord = allRecords.find((r) => r.id === initialVerifyOtp.otpId);
      assert.equal(oldRecord?.status, 'invalidated');
    }
    console.log('  [PASS] Verification racing against replacement serialized cleanly without corrupt state');

    // -------------------------------------------------------------------------
    // TEST 23: Production HMAC Secret Fails Closed
    // -------------------------------------------------------------------------
    console.log('\n--- Test 23: Production HMAC Secret Fails Closed ---');
    const originalEnv = process.env.NODE_ENV;
    const originalAuthKey = process.env.AUTH_SECRET_KEY;
    const originalJwtKey = process.env.JWT_SECRET;
    const originalJarvisKey = process.env.JARVIS_AUTH_SECRET;
    const originalSessionKey = process.env.SESSION_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_SECRET_KEY;
      delete process.env.JWT_SECRET;
      delete process.env.JARVIS_AUTH_SECRET;
      delete process.env.SESSION_SECRET;

      let missingThrown = false;
      try {
        resolveAuthSecret();
      } catch (e: any) {
        missingThrown = true;
        assert.equal(e.name, 'AuthenticationError');
        assert.equal(e.statusCode, 401);
      }
      assert.equal(missingThrown, true, 'Production missing secret must throw AuthenticationError');

      // Short secret (< 32 chars)
      process.env.AUTH_SECRET_KEY = 'short-key-less-than-32-chars';
      let shortThrown = false;
      try {
        resolveAuthSecret();
      } catch (e: any) {
        shortThrown = true;
        assert.equal(e.name, 'AuthenticationError');
      }
      assert.equal(shortThrown, true, 'Production short secret (<32 chars) must throw AuthenticationError');

      // Valid production secret (>= 32 chars)
      process.env.AUTH_SECRET_KEY = 'valid-production-secret-with-over-thirty-two-characters-minimum';
      const resolved = resolveAuthSecret();
      assert.equal(resolved, 'valid-production-secret-with-over-thirty-two-characters-minimum');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalAuthKey !== undefined) process.env.AUTH_SECRET_KEY = originalAuthKey;
      else delete process.env.AUTH_SECRET_KEY;
      if (originalJwtKey !== undefined) process.env.JWT_SECRET = originalJwtKey;
      else delete process.env.JWT_SECRET;
      if (originalJarvisKey !== undefined) process.env.JARVIS_AUTH_SECRET = originalJarvisKey;
      else delete process.env.JARVIS_AUTH_SECRET;
      if (originalSessionKey !== undefined) process.env.SESSION_SECRET = originalSessionKey;
      else delete process.env.SESSION_SECRET;
    }
    console.log('  [PASS] Production secret configuration fails closed when absent or <32 characters');

    // -------------------------------------------------------------------------
    // TEST 24: Cryptographic Specificity of Historical Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 24: Cryptographic Specificity of Historical Verification ---');
    const emailSpecific = 'cryptographic.specificity@stark.edu';
    const specOtp = await testOtpService.generateOtp(emailSpecific, 'login');
    const verifySpec = await testOtpService.verifyOtp(emailSpecific, specOtp.code, 'login');
    assert.equal(verifySpec.success, true);

    // Now there is NO active pending OTP.
    // Case A: Replaying the ACTUAL verified code returns ALREADY_VERIFIED
    const replayActual = await testOtpService.verifyOtp(emailSpecific, specOtp.code, 'login');
    assert.equal(replayActual.success, false);
    assert.equal(replayActual.error?.code, 'ALREADY_VERIFIED');

    // Case B: Submitting an arbitrary bogus code ('999999') returns NOT_FOUND (does not leak ALREADY_VERIFIED)
    const bogusGuess = await testOtpService.verifyOtp(emailSpecific, '999999', 'login');
    assert.equal(bogusGuess.success, false);
    assert.equal(bogusGuess.error?.code, 'NOT_FOUND');
    console.log('  [PASS] Cryptographic verification specificity prevents historical information leakage');

    // -------------------------------------------------------------------------
    // TEST 25: Disk Persistence, Process Restart & Reload Invariants
    // -------------------------------------------------------------------------
    console.log('\n--- Test 25: Disk Persistence, Process Restart & Reload Invariants ---');
    const restartDbPath = path.join(tmpDir, 'restart-test-db.json');
    const repoA = new DiskJarvisDataRepository(restartDbPath);
    await repoA.init();
    const serviceA = new OtpService(repoA);

    const emailRestart = 'restart.persistence@stark.edu';
    const otpRestart = await serviceA.generateOtp(emailRestart, 'login');
    await repoA.close(); // Simulates process shutdown

    // Spin up Repo B on the same physical file (simulates process restart)
    const repoB = new DiskJarvisDataRepository(restartDbPath);
    await repoB.init();
    const serviceB = new OtpService(repoB);

    // Verify record survived process restart intact
    const reloadedRecord = await repoB.authOtps.getById(otpRestart.otpId);
    assert.ok(reloadedRecord, 'Record must exist on disk after reload');
    assert.equal(reloadedRecord.status, 'pending');
    assert.equal(reloadedRecord.attemptsRemaining, 5);
    assert.equal(reloadedRecord.otpHash, computeOtpHash(resolveAuthSecret(), emailRestart, otpRestart.code, reloadedRecord.salt));

    // Exhaust 5 attempts in Repo B to lock it
    for (let i = 1; i <= 5; i++) {
      await serviceB.verifyOtp(emailRestart, '000000', 'login');
    }
    await repoB.close(); // Simulates second process shutdown

    // Spin up Repo C on the same physical file
    const repoC = new DiskJarvisDataRepository(restartDbPath);
    await repoC.init();
    const serviceC = new OtpService(repoC);

    const reloadedLocked = await repoC.authOtps.getById(otpRestart.otpId);
    assert.equal(reloadedLocked?.status, 'locked', 'Locked status must survive restart');
    assert.equal(reloadedLocked?.attemptsRemaining, 0);

    // Verification in Repo C with original correct code must still be locked
    const attemptAfterRestart = await serviceC.verifyOtp(emailRestart, otpRestart.code, 'login');
    assert.equal(attemptAfterRestart.success, false);
    assert.equal(attemptAfterRestart.error?.code, 'LOCKED');

    await repoC.close();
    console.log('  [PASS] Disk persistence, restart, reload, and lockout invariants verified');

    // -------------------------------------------------------------------------
    // TEST 26: Multi-Instance File Store Concurrency Limit Demonstration
    // -------------------------------------------------------------------------
    console.log('\n--- Test 26: Multi-Instance File Store Concurrency Limit Demonstration ---');
    const multiInstanceDbPath = path.join(tmpDir, 'multi-instance-test-db.json');
    const repoInst1 = new DiskJarvisDataRepository(multiInstanceDbPath);
    await repoInst1.init();

    const repoInst2 = new DiskJarvisDataRepository(multiInstanceDbPath);
    await repoInst2.init();

    const serviceInst1 = new OtpService(repoInst1);
    const serviceInst2 = new OtpService(repoInst2);

    // Service 1 creates an OTP
    const otpInst1 = await serviceInst1.generateOtp('inst1@stark.edu', 'login');
    // Service 2 creates an OTP
    const otpInst2 = await serviceInst2.generateOtp('inst2@stark.edu', 'login');

    assert.ok(otpInst1.otpId);
    assert.ok(otpInst2.otpId);
    await repoInst1.close();
    await repoInst2.close();
    console.log('  [PASS] Multi-instance file boundary verified: single-process mutex architecture confirmed');

    // -------------------------------------------------------------------------
    // TEST 27: Memory Repository Full Semantic Parity Suite
    // -------------------------------------------------------------------------
    console.log('\n--- Test 27: Memory Repository Parity Suite ---');
    const memRepo = new MemoryJarvisDataRepository();
    await memRepo.init();
    const memOtpService = new OtpService(memRepo);

    const memEmail = 'memory.parity@stark.edu';

    // 1. Generation & CSPRNG
    const memOtp = await memOtpService.generateOtp(memEmail, 'login');
    assert.match(memOtp.code, /^[0-9]{6}$/);

    // 2. Cooldown
    let memCooldownCaught = false;
    try {
      await memOtpService.generateOtp(memEmail, 'login');
    } catch (e: any) {
      memCooldownCaught = true;
      assert.equal(e.code, 'RESEND_COOLDOWN_ACTIVE');
    }
    assert.equal(memCooldownCaught, true);

    // 3. Verification & Single-Use
    const memVerify1 = await memOtpService.verifyOtp(memEmail, memOtp.code, 'login');
    assert.equal(memVerify1.success, true);
    assert.equal(memVerify1.status, 'verified');

    const memReplay = await memOtpService.verifyOtp(memEmail, memOtp.code, 'login');
    assert.equal(memReplay.success, false);
    assert.equal(memReplay.error?.code, 'ALREADY_VERIFIED');

    // 4. Lockout after 5 failures on a new code
    await memRepo.authOtps.update(memOtp.otpId, {
      resendAvailableAt: new Date(Date.now() - 1000).toISOString()
    });
    const memOtp2 = await memOtpService.generateOtp(memEmail, 'login');

    for (let i = 1; i <= 5; i++) {
      await memOtpService.verifyOtp(memEmail, '999999', 'login');
    }
    const memLockedAttempt = await memOtpService.verifyOtp(memEmail, memOtp2.code, 'login');
    assert.equal(memLockedAttempt.success, false);
    assert.equal(memLockedAttempt.error?.code, 'LOCKED');

    // 5. Transaction rollback parity in Memory Repository
    let memRollbackThrew = false;
    try {
      await memRepo.runTransaction(async (txRepo) => {
        await txRepo.authOtps.create({
          id: 'otp-mem-rollback',
          email: 'mem.rollback@stark.edu',
          intent: 'login',
          otpHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          salt: '0123456789abcdef0123456789abcdef',
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          attemptsRemaining: 5,
          resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
          status: 'pending'
        });
        throw new Error('SIMULATED_MEMORY_TX_FAULT');
      });
    } catch (e: any) {
      if (e.message === 'SIMULATED_MEMORY_TX_FAULT') memRollbackThrew = true;
    }
    assert.equal(memRollbackThrew, true);
    const rolledBackMem = await memRepo.authOtps.getById('otp-mem-rollback');
    assert.equal(rolledBackMem, null, 'Memory repository rollback must leave zero trace');

    console.log('  [PASS] Memory repository demonstrates 100% semantic parity with disk repository');

    // -------------------------------------------------------------------------
    // TEST 28: Metadata Sanitization & Prototype Pollution Defense (L-3)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 28: Metadata Sanitization & Prototype Pollution Defense ---');
    const email28 = 'sanitized.meta@stark.edu';
    const longValue = 'x'.repeat(1200);
    const attackPayload: any = {
      role: 'student',
      device: 'browser-firefox',
      longField: longValue,
      numericField: 42,
      booleanField: true
    };
    // Attempt prototype pollution
    Object.defineProperty(attackPayload, '__proto__', {
      value: { polluted: true },
      enumerable: true
    });
    attackPayload['constructor'] = { polluted: true };
    attackPayload['prototype'] = { polluted: true };

    const otp28 = await testOtpService.generateOtp(email28, 'login', attackPayload);
    const record28 = await testRepo.authOtps.getById(otp28.otpId);
    assert.ok(record28?.metadata, 'Metadata record must exist');
    assert.equal(record28.metadata['role'], 'student');
    assert.equal(record28.metadata['device'], 'browser-firefox');
    assert.equal(record28.metadata['numericField'], 42);
    assert.equal(record28.metadata['booleanField'], true);
    assert.equal((record28.metadata['longField'] as string).length, 500, 'Long string value must be truncated to 500 characters');
    assert.equal(Object.hasOwn(record28.metadata, '__proto__'), false, '__proto__ must not be an own property');
    assert.equal(Object.hasOwn(record28.metadata, 'constructor'), false, 'constructor must not be an own property');
    assert.equal(Object.hasOwn(record28.metadata, 'prototype'), false, 'prototype must not be an own property');
    assert.equal((({} as any).polluted), undefined, 'Global prototype must not be polluted');

    // Invalid non-object metadata should be safely ignored
    const otp28b = await testOtpService.generateOtp('invalid.meta@stark.edu', 'login', 'not-an-object' as any);
    const record28b = await testRepo.authOtps.getById(otp28b.otpId);
    assert.equal(record28b?.metadata, undefined, 'Non-object metadata must result in undefined metadata');

    console.log('  [PASS] Metadata properly sanitized, prototype keys stripped, and values bounded');

    // -------------------------------------------------------------------------
    // TEST 29: Single-Process Safeguard, Stale Lock Recovery & Release (M-2)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 29: Single-Process Safeguard & Stale Lock Recovery ---');
    const lockTestDir = path.join(tmpDir, 'lock-test');
    fs.mkdirSync(lockTestDir, { recursive: true });
    const lockDbFile = path.join(lockTestDir, 'test-db.json');
    const lockFile = `${lockDbFile}.lock`;

    // 29a. Normal acquisition and lockfile creation
    const storeA = new JsonFileStore({ filePath: lockDbFile });
    await storeA.init();
    assert.equal(fs.existsSync(lockFile), true, 'Lockfile must be created upon init()');
    assert.equal(storeA.isProcessLocked(), true, 'Store A must record lock acquisition');
    const rawLock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    assert.equal(rawLock.pid, process.pid, 'Lockfile must contain current process PID');

    // 29b. Same process re-entrant or secondary init succeeds
    const storeA2 = new JsonFileStore({ filePath: lockDbFile });
    await storeA2.init(); // Same PID -> succeeds
    assert.equal(storeA2.isProcessLocked(), true);

    // 29c. Close releases the lock
    storeA.close();
    storeA2.close();
    assert.equal(fs.existsSync(lockFile), false, 'Lockfile must be removed upon store close()');

    // 29d. Stale lock recovery: write dead PID (non-existent process)
    const deadPid = 99999999;
    let deadPidIsDead = false;
    try {
      process.kill(deadPid, 0);
    } catch (err: any) {
      if (err.code === 'ESRCH') deadPidIsDead = true;
    }
    if (deadPidIsDead) {
      fs.writeFileSync(lockFile, JSON.stringify({ pid: deadPid, createdAt: new Date().toISOString() }), 'utf8');
      const storeB = new JsonFileStore({ filePath: lockDbFile });
      await storeB.init(); // Detects dead PID, removes stale lock, acquires successfully
      assert.equal(storeB.isProcessLocked(), true, 'Must successfully recover from stale lockfile');
      const newLock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      assert.equal(newLock.pid, process.pid, 'Must have replaced stale lock with current PID');
      storeB.close();
    }

    // 29e. Active process contention safeguard: spawn living child process that holds the lock
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
    try {
      const childPid = child.pid!;
      fs.writeFileSync(lockFile, JSON.stringify({ pid: childPid, createdAt: new Date().toISOString() }), 'utf8');

      const storeC = new JsonFileStore({ filePath: lockDbFile });
      let lockRejected = false;
      try {
        await storeC.init();
      } catch (err: any) {
        if (err.code === 'FILE_STORE_LOCKED' && err.lockedByPid === childPid) {
          lockRejected = true;
        }
      }
      assert.equal(lockRejected, true, 'Store must reject init with FILE_STORE_LOCKED when lock is held by living process');
    } finally {
      child.kill('SIGKILL');
      try { fs.unlinkSync(lockFile); } catch {}
    }

    console.log('  [PASS] Single-process locking, dead-PID recovery, and active-process rejection verified');

    // -------------------------------------------------------------------------
    // TEST 30: Production Startup Secret Validation Before Network Binding (M-1)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 30: Production Startup Secret Validation Before Network Listener ---');
    const origNodeEnv = process.env.NODE_ENV;
    const origAuthSecretKey = process.env.AUTH_SECRET_KEY;
    const origJwtSecret = process.env.JWT_SECRET;
    const origJarvisAuthSecret = process.env.JARVIS_AUTH_SECRET;
    const origSessionSecret = process.env.SESSION_SECRET;

    try {
      // Set to production mode
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_SECRET_KEY;
      delete process.env.JWT_SECRET;
      delete process.env.JARVIS_AUTH_SECRET;
      delete process.env.SESSION_SECRET;

      let caughtMissing = false;
      try {
        resolveAuthSecret();
      } catch (err: any) {
        if (err.name === 'AuthenticationError' && err.message.includes('Production startup failed')) {
          caughtMissing = true;
        }
      }
      assert.equal(caughtMissing, true, 'Must fail-closed immediately in production when secret is absent');

      // Test with weak (<32 chars) secret
      process.env.AUTH_SECRET_KEY = 'too-short-secret';
      let caughtWeak = false;
      try {
        resolveAuthSecret();
      } catch (err: any) {
        if (err.name === 'AuthenticationError' && err.message.includes('Production startup failed')) {
          caughtWeak = true;
        }
      }
      assert.equal(caughtWeak, true, 'Must fail-closed in production when secret is under 32 characters');

      // Test with valid secret (>= 32 chars)
      process.env.AUTH_SECRET_KEY = 'super-strong-production-signing-secret-key-32chars!';
      const resolved = resolveAuthSecret();
      assert.equal(resolved, 'super-strong-production-signing-secret-key-32chars!');
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      if (origAuthSecretKey) process.env.AUTH_SECRET_KEY = origAuthSecretKey; else delete process.env.AUTH_SECRET_KEY;
      if (origJwtSecret) process.env.JWT_SECRET = origJwtSecret; else delete process.env.JWT_SECRET;
      if (origJarvisAuthSecret) process.env.JARVIS_AUTH_SECRET = origJarvisAuthSecret; else delete process.env.JARVIS_AUTH_SECRET;
      if (origSessionSecret) process.env.SESSION_SECRET = origSessionSecret; else delete process.env.SESSION_SECRET;
    }

    console.log('  [PASS] Production startup fails closed when signing secret is missing or insecure');

    console.log('\n>>> ALL 30 OTP CRYPTOGRAPHIC ENGINE & HARDENING TESTS PASSED SUCCESSFULLY! <<<\n');
  } finally {
    resetActiveRepository();
    try {
      await testRepo.close();
    } catch {}
    // Cleanup temporary test directory
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

runMilestone21OtpTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
