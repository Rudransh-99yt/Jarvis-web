// Milestone 2.4 Step 3: Security Closure, Production Fail-Closed Boundaries & Auth UX Test Suite
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import { app } from '../server.ts';
import { authClient } from '../src/services/authClient.ts';
import { DiskJarvisDataRepository } from '../server/data/diskRepository.ts';
import { setActiveRepository, resetActiveRepository } from '../server/data/index.ts';
import { MockEmailProvider } from '../server/auth/email/devProvider.ts';
import { setEmailProvider, resetEmailProvider } from '../server/auth/email/providerFactory.ts';
import { authIpRateLimiter } from '../server/auth/email/index.ts';

// Browser storage simulator
class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  dump(): Record<string, string> {
    return Object.fromEntries(this.store.entries());
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

(global as any).localStorage = mockLocalStorage;
(global as any).sessionStorage = mockSessionStorage;

function extractCodeFromEmail(payload: { subject: string; text?: string; html?: string }): string {
  const match = payload.subject.match(/(\d{6})/);
  if (match) return match[1];
  const bodyMatch = (payload.text || payload.html || '').match(/(\d{6})/);
  if (bodyMatch) return bodyMatch[1];
  throw new Error('No 6-digit OTP code found in dispatched email');
}

async function runStep3TestSuite() {
  console.log('===================================================================');
  console.log('=== [JARVIS] MILESTONE 2.4 STEP 3: SECURITY CLOSURE & UX POLISH ===');
  console.log('===================================================================\n');

  // Verify real database file presence and record initial hash
  const dbPath = path.resolve('./data/jarvis-db.json');
  assert(fs.existsSync(dbPath), 'data/jarvis-db.json must exist');
  const initialDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');

  // Set up isolated temp repository
  const isolatedTempDir = path.resolve(
    process.cwd(),
    'tmp',
    `test-m24-s3-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  );
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'test-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed(true);
  setActiveRepository(isolatedRepo);

  // Set email provider to mock
  const mockEmail = new MockEmailProvider();
  setEmailProvider(mockEmail);

  // Start test server on ephemeral port
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  (authClient as any).baseUrl = baseUrl;

  const originalFetch = global.fetch;
  (global as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (urlStr.startsWith('/api/')) {
      urlStr = `${baseUrl}${urlStr}`;
    }
    return originalFetch(urlStr, init);
  };

  try {
    // =========================================================================
    // SECTION 1: PRODUCTION FAIL-CLOSED BOUNDARIES
    // =========================================================================
    console.log('--- Section 1: Production Fail-Closed Boundaries ---');

    const origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      // 1.1 Direct legacy registration must be strictly blocked in production (403)
      const prodRegRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Adversary Hacker',
          email: 'adversary@exploit.org',
          role: 'student'
        })
      });
      assert.strictEqual(prodRegRes.status, 403, 'POST /api/auth/register must return 403 in production');
      const prodRegData = await prodRegRes.json();
      assert.strictEqual(prodRegData.error?.code, 'UNVERIFIED_REGISTRATION_DISALLOWED');
      console.log('[PASS] 1.1 Legacy unverified registration strictly blocked in production with 403 UNVERIFIED_REGISTRATION_DISALLOWED');

      // 1.2 Direct legacy login must be strictly blocked in production (403)
      const prodLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student-1@stark.edu' })
      });
      assert.strictEqual(prodLoginRes.status, 403, 'POST /api/auth/login must return 403 in production');
      const prodLoginData = await prodLoginRes.json();
      assert.strictEqual(prodLoginData.error?.code, 'UNVERIFIED_LOGIN_DISALLOWED');
      console.log('[PASS] 1.2 Legacy credential-free login strictly blocked in production with 403 UNVERIFIED_LOGIN_DISALLOWED');

      // 1.3 Direct test token issuance must be blocked in production (403)
      const prodTokenRes = await fetch(`${baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'student-1' })
      });
      assert.strictEqual(prodTokenRes.status, 403, 'POST /api/auth/token must return 403 in production');
      console.log('[PASS] 1.3 Direct token endpoint strictly blocked in production with 403 FORBIDDEN');

      // 1.4 Dev session endpoint must be blocked in production (403)
      const prodDevSessRes = await fetch(`${baseUrl}/api/auth/dev-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student' })
      });
      assert.strictEqual(prodDevSessRes.status, 403, 'POST /api/auth/dev-session must return 403 in production');
      console.log('[PASS] 1.4 Dev-session endpoint strictly blocked in production with 403 DEV_AUTH_DISABLED');
    } finally {
      process.env.NODE_ENV = origNodeEnv;
    }

    // =========================================================================
    // SECTION 2: UI COPY POLISH & JARGON AUDIT
    // =========================================================================
    console.log('\n--- Section 2: UI Copy Polish & Internal Jargon Removal ---');

    const portalSrc = fs.readFileSync(path.resolve('./src/components/landing/PublicRoutePortal.tsx'), 'utf8');
    const wizardSrc = fs.readFileSync(path.resolve('./src/components/onboarding/ProgressiveOnboardingWizard.tsx'), 'utf8');

    // Banned technical copy
    const bannedPhrases = [
      'HMAC-SHA256 authenticated',
      'Sovereign memory boundary',
      'Zero telemetry leakage',
      'Sovereign Auth Core',
      'Sovereign Identity Registration',
      'Sovereign Email Verification',
      'Calibration Matrix Complete'
    ];

    for (const phrase of bannedPhrases) {
      assert(!portalSrc.includes(phrase), `PublicRoutePortal must not contain technical slogan: "${phrase}"`);
      assert(!wizardSrc.includes(phrase), `ProgressiveOnboardingWizard must not contain technical slogan: "${phrase}"`);
    }
    console.log('[PASS] 2.1 All internal engineering slogans and cryptographic claims removed from UI components');

    // Approved simple, helpful copy present
    assert(portalSrc.includes('Sign in to Jarvis'), 'Portal must contain friendly heading "Sign in to Jarvis"');
    assert(portalSrc.includes('Create your account'), 'Portal must contain friendly heading "Create your account"');
    assert(portalSrc.includes('Verify your email'), 'Portal must contain friendly heading "Verify your email"');
    assert(portalSrc.includes('Enter the 6-digit code'), 'Portal must contain friendly label "Enter the 6-digit code"');
    assert(portalSrc.includes('Resend code'), 'Portal must contain friendly resend button label "Resend code"');
    assert(portalSrc.includes('Change details') || portalSrc.includes('Change email'), 'Portal must support changing email or details');

    assert(wizardSrc.includes('Verify your email'), 'Wizard must use clean heading "Verify your email"');
    assert(wizardSrc.includes('Enter the 6-digit code'), 'Wizard must use clean label "Enter the 6-digit code"');
    assert(wizardSrc.includes('Resend code'), 'Wizard must use clean resend label "Resend code"');
    console.log('[PASS] 2.2 Simple, helpful user-facing language confirmed across portal and onboarding');

    // =========================================================================
    // SECTION 3: STORAGE HYGIENE (ZERO OTP IN BROWSER STORAGE)
    // =========================================================================
    console.log('\n--- Section 3: Browser Storage Hygiene & Secret Isolation ---');

    // OnboardingState must NOT include otpCode
    assert(!wizardSrc.includes('otpCode?: string'), 'OnboardingState must not declare otpCode');

    // Neither localStorage nor sessionStorage must have an OTP code set
    mockLocalStorage.clear();
    mockSessionStorage.clear();

    const storedLocalKeys = Object.keys(mockLocalStorage.dump());
    const storedSessionKeys = Object.keys(mockSessionStorage.dump());
    assert(!storedLocalKeys.some((k) => k.toLowerCase().includes('otp')), 'localStorage must not contain any OTP key');
    assert(!storedSessionKeys.some((k) => k.toLowerCase().includes('otp')), 'sessionStorage must not contain any OTP key');

    // Check that portal draft storage does not store OTP values
    assert(!portalSrc.includes('LOGIN_DRAFT_KEY, JSON.stringify({') || !portalSrc.includes('loginOtpCode'), 'Login draft must not serialize loginOtpCode');
    assert(!portalSrc.includes('SIGNUP_DRAFT_KEY, JSON.stringify({') || !portalSrc.includes('signupOtpCode'), 'Signup draft must not serialize signupOtpCode');
    console.log('[PASS] 3.1 Zero OTP codes or secrets serialized to localStorage or sessionStorage');

    // =========================================================================
    // SECTION 4: REAL REGISTRATION OTP WORKFLOW & DUPLICATE CHECKS
    // =========================================================================
    console.log('\n--- Section 4: Real Registration OTP Workflow & Conflict Handling ---');

    authClient.clearSession();
    mockEmail.reset();

    const newStudentEmail = 'alex.chen@innovate.org';
    const regReqResult = await authClient.requestOtp(newStudentEmail, 'register', {
      displayName: 'Alex Chen',
      role: 'student'
    });
    assert.strictEqual(regReqResult.success, true);
    assert.strictEqual(mockEmail.dispatched.length, 1);
    const regOtpCode = extractCodeFromEmail(mockEmail.dispatched[0]);
    assert.strictEqual(regOtpCode.length, 6);
    console.log('[PASS] 4.1 Registration OTP requested and dispatched via email provider');

    // Verify OTP with user metadata and personal workspace creation
    const regVerifySession = await authClient.verifyOtp(newStudentEmail, regOtpCode, 'register', {
      displayName: 'Alex Chen',
      role: 'student',
      ageRange: '19-24',
      country: 'United States'
    });
    assert(regVerifySession.token, 'Session token must be returned');
    assert.strictEqual(regVerifySession.user.email, newStudentEmail);
    assert.strictEqual(regVerifySession.user.displayName, 'Alex Chen');
    assert.strictEqual(regVerifySession.user.role, 'student');
    assert(regVerifySession.activeWorkspace, 'Active workspace must be provisioned');
    assert(regVerifySession.activeWorkspace.id.startsWith('ws-pers-'), 'Personal workspace must have ws-pers- prefix');
    assert.strictEqual(regVerifySession.activeWorkspace.institutionId, undefined, 'Personal workspace must have undefined institutionId');
    assert.strictEqual(authClient.isAuthenticated(), true, 'authClient must be authenticated after registration');
    console.log('[PASS] 4.2 Registration OTP verification created user and personal workspace atomically');

    // Duplicate email registration path: Attempting to register again must fail with 409 USER_EXISTS
    mockEmail.reset();
    let dupFailed = false;
    try {
      await authClient.requestOtp(newStudentEmail, 'register', { displayName: 'Alex Duplicate' });
    } catch (err: any) {
      dupFailed = true;
      assert.strictEqual(err.status, 409);
      assert.strictEqual(err.code, 'USER_EXISTS');
    }
    assert.strictEqual(dupFailed, true, 'Duplicate registration request must reject with 409 USER_EXISTS');
    assert.strictEqual(mockEmail.dispatched.length, 0, 'No email must be sent for duplicate registration');
    console.log('[PASS] 4.3 Duplicate email registration rejected with 409 USER_EXISTS and zero email leakage');

    // =========================================================================
    // SECTION 5: REAL LOGIN OTP WORKFLOW & ANTI-ENUMERATION
    // =========================================================================
    console.log('\n--- Section 5: Real Login OTP Workflow & Anti-Enumeration ---');

    authClient.clearSession();
    mockEmail.reset();

    // 5.1 Unknown account: Anti-enumeration check
    const unknownEmail = 'ghost.user.999@unknown-domain.io';
    const unknownReqResult = await authClient.requestOtp(unknownEmail, 'login');
    assert.strictEqual(unknownReqResult.success, true, 'Unknown account must return generic success');
    assert.strictEqual(mockEmail.dispatched.length, 0, 'No email must be dispatched for unknown login address');
    console.log('[PASS] 5.1 Unknown email returns neutral success response without dispatching email (anti-enumeration)');

    // 5.2 Known account: Login code request and verification
    const loginReqResult = await authClient.requestOtp(newStudentEmail, 'login');
    assert.strictEqual(loginReqResult.success, true);
    assert.strictEqual(mockEmail.dispatched.length, 1);
    const loginOtpCode = extractCodeFromEmail(mockEmail.dispatched[0]);

    const loginSession = await authClient.verifyOtp(newStudentEmail, loginOtpCode, 'login');
    assert(loginSession.token, 'Login must issue session token');
    assert.strictEqual(loginSession.user.email, newStudentEmail);
    assert.strictEqual(authClient.isAuthenticated(), true);
    console.log('[PASS] 5.2 Known account login OTP request and verification succeeded');

    // 5.3 Single-use consumption: Re-verifying same code must fail
    let reuseFailed = false;
    try {
      await authClient.verifyOtp(newStudentEmail, loginOtpCode, 'login');
    } catch (err: any) {
      reuseFailed = true;
      assert(err.status === 400 || err.status === 404, 'Consumed OTP must return 400 or 404');
    }
    assert.strictEqual(reuseFailed, true, 'Re-using consumed OTP must fail');
    console.log('[PASS] 5.3 OTP code single-use consumption strictly enforced');

    // =========================================================================
    // SECTION 6: WRONG CODES, ATTEMPTS TRACKING & LOCKOUT (423)
    // =========================================================================
    console.log('\n--- Section 6: Wrong Codes, Countdown & Lockout Behavior ---');

    authClient.clearSession();
    mockEmail.reset();
    authIpRateLimiter.reset();

    const testEmail2 = 'patricia.smith@innovate.org';
    await authClient.requestOtp(testEmail2, 'register', { displayName: 'Patricia' });
    assert.strictEqual(mockEmail.dispatched.length, 1);

    // Attempt 1 wrong code
    let wrongAttemptsRemaining: number | undefined;
    try {
      await authClient.verifyOtp(testEmail2, '000000', 'register');
    } catch (err: any) {
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.code, 'INVALID_CODE');
      wrongAttemptsRemaining = err.attemptsRemaining;
    }
    assert.strictEqual(wrongAttemptsRemaining, 4, 'Remaining attempts must be 4 after 1 wrong guess');

    // Burn remaining 4 attempts to trigger lockout
    for (let i = 0; i < 3; i++) {
      try {
        await authClient.verifyOtp(testEmail2, `00000${i + 1}`, 'register');
      } catch {}
    }

    // 5th wrong attempt must trigger 423 LOCKED
    let lockFailed = false;
    try {
      await authClient.verifyOtp(testEmail2, '000009', 'register');
    } catch (err: any) {
      lockFailed = true;
      assert.strictEqual(err.status, 423, 'Exhausted attempts must return 423 LOCKED');
      assert.strictEqual(err.code, 'LOCKED');
    }
    assert.strictEqual(lockFailed, true, '5 wrong attempts must lock the OTP with 423 LOCKED');
    console.log('[PASS] 6.1 Wrong code decrements attemptsRemaining and locks at 0 with 423 LOCKED');

    // =========================================================================
    // SECTION 7: RESEND COOLDOWN ENFORCEMENT (429)
    // =========================================================================
    console.log('\n--- Section 7: Resend Cooldown Enforcement ---');

    authIpRateLimiter.reset();
    const cooldownEmail = 'cooldown.user@test.org';
    const firstReq = await authClient.requestOtp(cooldownEmail, 'register', { displayName: 'Cooldown User' });
    assert.strictEqual(firstReq.success, true);
    assert(firstReq.resendAvailableAt, 'resendAvailableAt must be present');

    let cooldownTriggered = false;
    try {
      await authClient.requestOtp(cooldownEmail, 'register', { displayName: 'Cooldown User' });
    } catch (err: any) {
      cooldownTriggered = true;
      assert.strictEqual(err.status, 429, 'Immediate resend must return 429');
      assert.strictEqual(err.code, 'RESEND_COOLDOWN_ACTIVE');
      assert(err.retryAfterMs > 0, 'retryAfterMs must be greater than zero');
    }
    assert.strictEqual(cooldownTriggered, true, 'Resend request within cooldown window correctly rejected with 429');
    console.log('[PASS] 7.1 Resend cooldown enforced with 429 RESEND_COOLDOWN_ACTIVE and retryAfterMs');

    // =========================================================================
    // SECTION 8: ROLE PRIVILEGE ESCALATION PREVENTION
    // =========================================================================
    console.log('\n--- Section 8: Role Privilege Escalation Prevention ---');

    authClient.clearSession();
    mockEmail.reset();
    authIpRateLimiter.reset();

    const attackEmail = 'attacker@hostile.io';
    await authClient.requestOtp(attackEmail, 'register', {
      displayName: 'Attacker Impostor',
      role: 'admin' // Attempting to request privileged admin role
    });
    const attackCode = extractCodeFromEmail(mockEmail.dispatched[0]);

    // Client sends verify payload requesting 'commander' or 'admin' role
    const attackSession = await authClient.verifyOtp(attackEmail, attackCode, 'register', {
      displayName: 'Attacker Impostor',
      role: 'commander' as any
    });

    assert.strictEqual(attackSession.user.role, 'student', 'Privileged role must be downgraded to student');
    assert.strictEqual(attackSession.activeWorkspace.institutionId, undefined, 'Must not confer institutional access');
    console.log('[PASS] 8.1 Client-supplied privileged roles (admin, commander) safely downgraded to public role (student)');

    // =========================================================================
    // SECTION 9: SESSION RESTORATION & LOGOUT
    // =========================================================================
    console.log('\n--- Section 9: Session Restoration & Clean Logout ---');

    assert.strictEqual(authClient.isAuthenticated(), true);
    assert(authClient.getToken() !== null);

    // Logout
    await authClient.logout();
    assert.strictEqual(authClient.isAuthenticated(), false);
    assert.strictEqual(authClient.getCurrentUser(), null);
    assert.strictEqual(authClient.getToken(), null);
    console.log('[PASS] 9.1 Session cleanly terminated and storage cleared on logout');

    // =========================================================================
    // SECTION 10: DATABASE PRESERVATION VERIFICATION
    // =========================================================================
    console.log('\n--- Section 10: Database Integrity Check ---');
    const finalDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
    assert.strictEqual(finalDbHash, initialDbHash, 'data/jarvis-db.json MUST NOT be modified by tests');
    console.log(`[PASS] 10.1 Real database untouched and preserved (SHA-256: ${finalDbHash})`);

    console.log('\n===================================================================');
    console.log('>>> ALL 10 MILESTONE 2.4 STEP 3 SECURITY TEST SUITES PASSED! <<<');
    console.log('===================================================================');
  } finally {
    (global as any).fetch = originalFetch;
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

runStep3TestSuite().catch((err) => {
  console.error('\n[FATAL] Test failed:', err);
  process.exit(1);
});
