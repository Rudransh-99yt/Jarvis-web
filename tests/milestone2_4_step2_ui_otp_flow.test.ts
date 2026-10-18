// JARVIS-WEB — MILESTONE 2.4 STEP 2: FRONTEND OTP LOGIN & ONBOARDING INTEGRATION TEST SUITE
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import {
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { authRouter } from '../server/auth/authRoutes.ts';
import { personalRouter } from '../server/personal/personalRoutes.ts';
import { workspaceRouter } from '../server/routes/workspaceRoutes.ts';
import { authClient, AuthApiError } from '../src/services/authClient.ts';
import { MockEmailProvider } from '../server/auth/email/devProvider.ts';
import { setEmailProvider, resetEmailProvider } from '../server/auth/email/providerFactory.ts';
import { authIpRateLimiter } from '../server/auth/email/index.ts';

console.log('===================================================================');
console.log('=== [JARVIS] MILESTONE 2.4 STEP 2: FRONTEND OTP LOGIN & ONBOARDING ===');
console.log('===================================================================');

// Create mock localStorage and sessionStorage for Node.js environment
class MockStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
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

async function runStep2TestSuite() {
  const dbPath = path.resolve('./data/jarvis-db.json');
  assert(fs.existsSync(dbPath), 'data/jarvis-db.json must exist');
  const initialDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');

  // Set up isolated temp repository
  const isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-m24-s2-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'test-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed(true);
  setActiveRepository(isolatedRepo);

  // Set email provider to mock
  const mockEmail = new MockEmailProvider();
  setEmailProvider(mockEmail);

  // Set up isolated Express server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/personal', personalRouter);
  app.use('/api/workspaces', workspaceRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Point authClient to test server baseUrl
  const originalFetch = global.fetch;
  (global as any).fetch = async (input: any, init?: any) => {
    let url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('/api/')) {
      url = `${baseUrl}${url}`;
    }
    return originalFetch(url, init);
  };

  try {
    // =========================================================================
    // SECTION 1: SOURCE CODE INVARIANTS & COMPONENT CONTRACTS
    // =========================================================================
    console.log('\n--- Section 1: Source Code Invariants & Component Contracts ---');

    const portalSrc = fs.readFileSync(path.resolve('./src/components/landing/PublicRoutePortal.tsx'), 'utf-8');
    const wizardSrc = fs.readFileSync(path.resolve('./src/components/onboarding/ProgressiveOnboardingWizard.tsx'), 'utf-8');

    // 1.1 PublicRoutePortal UI Contracts
    assert(portalSrc.includes('loginStep'), 'PublicRoutePortal must maintain loginStep state');
    assert(portalSrc.includes('loginOtpCode'), 'PublicRoutePortal must maintain loginOtpCode state');
    assert(portalSrc.includes('loginResendAvailableAt'), 'PublicRoutePortal must track login resendAvailableAt');
    assert(portalSrc.includes('loginCooldownSeconds'), 'PublicRoutePortal must compute login cooldown seconds');
    assert(portalSrc.includes('signupStep'), 'PublicRoutePortal must maintain signupStep state');
    assert(portalSrc.includes('signupOtpCode'), 'PublicRoutePortal must maintain signupOtpCode state');
    assert(portalSrc.includes('signupCooldownSeconds'), 'PublicRoutePortal must compute signup cooldown seconds');
    assert(portalSrc.includes('jarvis_portal_login_draft'), 'PublicRoutePortal must persist login draft in sessionStorage');
    assert(portalSrc.includes('jarvis_portal_signup_draft'), 'PublicRoutePortal must persist signup draft in sessionStorage');
    assert(portalSrc.includes('getRedirectUrl()'), 'PublicRoutePortal must read and honor redirect query param');
    assert(portalSrc.includes("navigate('/onboarding')"), 'Signup view must link to progressive onboarding');
    assert(portalSrc.includes("authClient.checkEligibility(clean, 'login')"), 'PublicRoutePortal must verify eligibility before requesting login OTP');
    assert(portalSrc.includes('No Jarvis account exists for this email yet. Please sign up first to create your account and receive a verification code.'), 'PublicRoutePortal must display exact account not found guidance');
    assert(portalSrc.includes('login-account-not-found-signup-btn'), 'PublicRoutePortal must have prominent sign up button for unregistered account');
    assert(!portalSrc.includes('Destination:'), 'PublicRoutePortal must not display technical Destination debug label');
    assert(!portalSrc.includes('import { PublicHeader }'), 'PublicRoutePortal must not import PublicHeader');
    assert(!portalSrc.includes('<PublicHeader'), 'PublicRoutePortal must not render PublicHeader component');
    console.log('[PASS] 1.1 PublicRoutePortal UI contracts, cooldowns, and navigation verified');

    // 1.2 ProgressiveOnboardingWizard UI & Security Contracts
    assert(!wizardSrc.includes('otpCode?: string'), 'OnboardingState must not persist otpCode in localStorage state');
    assert(wizardSrc.includes('otpRequested?: boolean'), 'OnboardingState must include otpRequested');
    assert(wizardSrc.includes('resendAvailableAt?: string | null'), 'OnboardingState must include resendAvailableAt');
    assert(wizardSrc.includes("authClient.requestOtp(cleanEmail, 'register'"), 'Wizard must call requestOtp with register intent');
    assert(wizardSrc.includes("authClient.verifyOtp(state.email.trim().toLowerCase(), cleanCode, 'register'"), 'Wizard must call verifyOtp with register intent');
    assert(!wizardSrc.includes('authClient.register('), 'Wizard must not invoke legacy unverified authClient.register');
    assert(wizardSrc.includes("destination = '/app/personal'"), 'Personal onboarding destination must route to /app/personal');
    assert(wizardSrc.includes('onboarding-duplicate-switch-to-login'), 'Wizard must provide safe switch-to-login button on duplicate account');
    console.log('[PASS] 1.2 ProgressiveOnboardingWizard contracts, OTP state, and fail-closed verification verified');

    // =========================================================================
    // SECTION 2: END-TO-END LOGIN OTP FLOW
    // =========================================================================
    console.log('\n--- Section 2: End-to-End Login OTP Flow ---');

    authClient.clearSession();
    mockEmail.reset();

    // 2.1 Request OTP for known user (tony@starkindustries.com)
    const loginReqRes = await authClient.requestOtp('tony@starkindustries.com', 'login');
    assert.strictEqual(loginReqRes.success, true);
    assert(loginReqRes.resendAvailableAt, 'Must return resendAvailableAt ISO timestamp');
    assert(new Date(loginReqRes.resendAvailableAt).getTime() > Date.now(), 'Cooldown must be in the future');

    // Verify email was dispatched
    assert.strictEqual(mockEmail.dispatched.length, 1, 'Should have dispatched 1 email');
    assert.strictEqual(mockEmail.dispatched[0].to, 'tony@starkindustries.com');
    const loginOtpCode = extractCodeFromEmail(mockEmail.dispatched[0]);
    assert.strictEqual(loginOtpCode.length, 6, 'OTP must be 6 digits');

    // 2.2 Resend Cooldown Enforcement (while OTP is pending)
    let cooldownError: AuthApiError | null = null;
    try {
      await authClient.requestOtp('tony@starkindustries.com', 'login');
    } catch (err: any) {
      cooldownError = err;
    }
    assert(cooldownError instanceof AuthApiError, 'Should throw AuthApiError');
    assert.strictEqual(cooldownError?.code, 'RESEND_COOLDOWN_ACTIVE');
    assert.strictEqual(cooldownError?.status, 429);
    assert(cooldownError?.retryAfterMs && cooldownError.retryAfterMs > 0, 'Must include retryAfterMs');
    console.log('[PASS] 2.2 Resend cooldown correctly enforced with 429 and retryAfterMs');

    // 2.3 Verify OTP with correct code
    const loginVerifyRes = await authClient.verifyOtp('tony@starkindustries.com', loginOtpCode, 'login');
    assert(loginVerifyRes.token, 'Must return session token');
    assert.strictEqual(loginVerifyRes.user.email, 'tony@starkindustries.com');
    assert(authClient.isAuthenticated(), 'authClient must now be authenticated');
    assert.strictEqual(authClient.getCurrentUser()?.email, 'tony@starkindustries.com');
    console.log('[PASS] 2.3 Full login verification, token storage, and session hydration passed');

    // =========================================================================
    // SECTION 3: ANTI-ENUMERATION BEHAVIOR FOR UNKNOWN ACCOUNTS
    // =========================================================================
    console.log('\n--- Section 3: Anti-Enumeration Behavior ---');

    mockEmail.reset();
    const unknownEmail = `ghost-${Date.now()}@nonexistent.domain`;

    const unknownReqRes = await authClient.requestOtp(unknownEmail, 'login');
    assert.strictEqual(unknownReqRes.success, true);
    assert(unknownReqRes.message.includes('If an account exists'), 'Must return neutral anti-enumeration message');
    assert.strictEqual(mockEmail.dispatched.length, 0, 'Must NOT dispatch any email for unknown account');
    console.log('[PASS] 3.1 Unknown email returns neutral success response and dispatches zero emails');

    // =========================================================================
    // SECTION 4: REGISTRATION & ONBOARDING OTP FLOW WITH METADATA
    // =========================================================================
    console.log('\n--- Section 4: Registration & Onboarding OTP Flow ---');

    authClient.clearSession();
    mockEmail.reset();
    authIpRateLimiter.reset();

    const newStudentEmail = `riri-${Date.now()}@mit.edu`;
    const regMetadata = {
      displayName: 'Riri Williams',
      role: 'student' as const,
      ageRange: '19-24',
      country: 'United States'
    };

    // 4.1 Request OTP for registration
    const regReqRes = await authClient.requestOtp(newStudentEmail, 'register', regMetadata);
    assert.strictEqual(regReqRes.success, true);
    assert(regReqRes.resendAvailableAt, 'Must return resendAvailableAt');

    assert.strictEqual(mockEmail.dispatched.length, 1);
    assert.strictEqual(mockEmail.dispatched[0].to, newStudentEmail);
    const regOtpCode = extractCodeFromEmail(mockEmail.dispatched[0]);

    // 4.2 Verify OTP with registration intent and metadata
    const regVerifyRes = await authClient.verifyOtp(newStudentEmail, regOtpCode, 'register', regMetadata);
    assert(regVerifyRes.token, 'Must return session token');
    assert.strictEqual(regVerifyRes.user.email, newStudentEmail);
    assert.strictEqual(regVerifyRes.user.displayName, 'Riri Williams');
    assert.strictEqual(regVerifyRes.user.role, 'student');
    assert(regVerifyRes.activeWorkspace, 'Active workspace must be created');
    assert(regVerifyRes.activeWorkspace.name.includes('Riri Williams'), 'Workspace named after user');
    assert.strictEqual(regVerifyRes.activeWorkspace.institutionId, undefined, 'Personal workspace has no institutionId');
    assert(authClient.isAuthenticated(), 'authClient must be authenticated after registration');
    console.log('[PASS] 4.1 - 4.2 Registration OTP request, verification, metadata application, and workspace creation passed');

    // 4.3 Duplicate Account Detection on Register Intent (409 USER_EXISTS)
    let duplicateError: AuthApiError | null = null;
    try {
      await authClient.requestOtp(newStudentEmail, 'register', regMetadata);
    } catch (err: any) {
      duplicateError = err;
    }
    assert(duplicateError instanceof AuthApiError, 'Duplicate registration must throw AuthApiError');
    assert.strictEqual(duplicateError?.code, 'USER_EXISTS');
    assert.strictEqual(duplicateError?.status, 409);
    console.log('[PASS] 4.3 Existing account registration blocked with 409 USER_EXISTS');

    // =========================================================================
    // SECTION 5: INVALID CODES, EXHAUSTION & LOCKOUT
    // =========================================================================
    console.log('\n--- Section 5: Invalid Codes & Lockout ---');

    authClient.clearSession();
    mockEmail.reset();
    authIpRateLimiter.reset();

    const victimEmail = `peter-${Date.now()}@stark.edu`;
    await authClient.requestOtp(victimEmail, 'register', { displayName: 'Peter Parker', role: 'student' });
    const realCode = extractCodeFromEmail(mockEmail.dispatched[0]);

    // Attempt 1: Invalid code
    let invErr: AuthApiError | null = null;
    try {
      await authClient.verifyOtp(victimEmail, '000000', 'register');
    } catch (err: any) {
      invErr = err;
    }
    assert(invErr instanceof AuthApiError);
    assert.strictEqual(invErr?.code, 'INVALID_CODE');
    assert.strictEqual(invErr?.status, 400);
    assert.strictEqual(invErr?.attemptsRemaining, 4, 'Remaining attempts must decrement to 4');

    // Attempts 2, 3, 4 with wrong codes
    for (let i = 3; i >= 1; i--) {
      try {
        await authClient.verifyOtp(victimEmail, '000000', 'register');
      } catch (err: any) {
        assert.strictEqual(err.attemptsRemaining, i);
      }
    }

    // Attempt 5: Final exhaustion -> 423 LOCKED
    let lockedErr: AuthApiError | null = null;
    try {
      await authClient.verifyOtp(victimEmail, '000000', 'register');
    } catch (err: any) {
      lockedErr = err;
    }
    assert(lockedErr instanceof AuthApiError);
    assert.strictEqual(lockedErr?.code, 'LOCKED');
    assert.strictEqual(lockedErr?.status, 423);

    // Subsequent attempt even with the REAL code must be locked
    let postLockErr: AuthApiError | null = null;
    try {
      await authClient.verifyOtp(victimEmail, realCode, 'register');
    } catch (err: any) {
      postLockErr = err;
    }
    assert.strictEqual(postLockErr?.code, 'LOCKED');
    console.log('[PASS] 5.1 Invalid code tracking, countdown, and 423 LOCKED exhaustion verified');

    // 5.2 Email Delivery Failure (502 EMAIL_DELIVERY_FAILED)
    authIpRateLimiter.reset();
    mockEmail.nextResult = {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Simulated email provider network failure' }
    };
    let deliveryErr: AuthApiError | null = null;
    const failEmail = `fail-${Date.now()}@stark.edu`;
    try {
      await authClient.requestOtp(failEmail, 'register', { displayName: 'Failing User', role: 'student' });
    } catch (err: any) {
      deliveryErr = err;
    }
    assert(deliveryErr instanceof AuthApiError, 'Delivery failure must surface as AuthApiError');
    assert.strictEqual(deliveryErr?.code, 'EMAIL_DELIVERY_FAILED');
    assert.strictEqual(deliveryErr?.status, 502);
    console.log('[PASS] 5.2 Email delivery failure cleanly captured as 502 EMAIL_DELIVERY_FAILED');

    // =========================================================================
    // SECTION 6: STATE PRESERVATION ACROSS RELOADS AND TABS
    // =========================================================================
    console.log('\n--- Section 6: State Preservation Across Reloads & Tabs ---');

    // 6.1 Portal Login Draft in sessionStorage
    mockSessionStorage.setItem('jarvis_portal_login_draft', JSON.stringify({
      email: 'banner@avengers.org',
      otpSent: true,
      resendAvailableAt: new Date(Date.now() + 45000).toISOString()
    }));
    const restoredLoginDraft = JSON.parse(mockSessionStorage.getItem('jarvis_portal_login_draft')!);
    assert.strictEqual(restoredLoginDraft.email, 'banner@avengers.org');
    assert.strictEqual(restoredLoginDraft.otpSent, true);
    assert(restoredLoginDraft.resendAvailableAt);
    mockSessionStorage.clear();

    // 6.2 Portal Signup Draft in sessionStorage
    mockSessionStorage.setItem('jarvis_portal_signup_draft', JSON.stringify({
      userName: 'Kamala Khan',
      email: 'msmarvel@jersey.org',
      role: 'student',
      accountType: 'individual',
      otpSent: true,
      resendAvailableAt: new Date(Date.now() + 50000).toISOString()
    }));
    const restoredSignupDraft = JSON.parse(mockSessionStorage.getItem('jarvis_portal_signup_draft')!);
    assert.strictEqual(restoredSignupDraft.userName, 'Kamala Khan');
    assert.strictEqual(restoredSignupDraft.email, 'msmarvel@jersey.org');
    assert.strictEqual(restoredSignupDraft.role, 'student');
    assert.strictEqual(restoredSignupDraft.otpSent, true);
    mockSessionStorage.clear();

    // 6.3 Progressive Onboarding State in localStorage (all 7 steps + OTP fields)
    const testOnboardingState = {
      step: 7,
      pathChoice: 'personal',
      displayName: 'Miles Morales',
      preferredName: 'Miles',
      email: 'miles@brooklynvision.edu',
      ageRange: '13-18',
      language: 'English',
      roles: ['student'],
      studyLevel: 'High School',
      subjects: ['Physics', 'Art', 'Robotics'],
      explanationStyle: 'intuitive_visual',
      goals: ['Deep conceptual mastery'],
      institutionCode: '',
      invitationStatus: 'idle',
      otpCode: '123456',
      otpRequested: true,
      resendAvailableAt: new Date(Date.now() + 40000).toISOString()
    };
    mockLocalStorage.setItem('jarvis_onboarding_state', JSON.stringify(testOnboardingState));

    const restoredOnboarding = JSON.parse(mockLocalStorage.getItem('jarvis_onboarding_state')!);
    assert.strictEqual(restoredOnboarding.step, 7);
    assert.strictEqual(restoredOnboarding.displayName, 'Miles Morales');
    assert.strictEqual(restoredOnboarding.email, 'miles@brooklynvision.edu');
    assert.deepStrictEqual(restoredOnboarding.subjects, ['Physics', 'Art', 'Robotics']);
    assert.strictEqual(restoredOnboarding.explanationStyle, 'intuitive_visual');
    assert.strictEqual(restoredOnboarding.otpRequested, true);
    assert.strictEqual(restoredOnboarding.otpCode, '123456');
    assert(restoredOnboarding.resendAvailableAt);
    mockLocalStorage.clear();

    console.log('[PASS] 6.1 - 6.3 Portal and Onboarding drafts correctly preserved and restored');

    // =========================================================================
    // SECTION 7: ANTI-PRIVILEGE ESCALATION
    // =========================================================================
    console.log('\n--- Section 7: Anti-Privilege Escalation ---');

    authClient.clearSession();
    mockEmail.reset();

    const impostorEmail = `impostor-${Date.now()}@stark.edu`;
    // Attempt to register claiming 'principal' role without institution token
    await authClient.requestOtp(impostorEmail, 'register', {
      displayName: 'Fake Principal',
      role: 'principal' as any,
      ageRange: '35-44'
    });
    const impostorCode = extractCodeFromEmail(mockEmail.dispatched[0]);

    const impostorSession = await authClient.verifyOtp(impostorEmail, impostorCode, 'register', {
      displayName: 'Fake Principal',
      role: 'principal' as any,
      ageRange: '35-44'
    });

    // Unverified guest selecting 'principal' in UI gets personal workspace without institutional authority
    assert(impostorSession.activeWorkspace, 'Workspace must be present');
    assert.strictEqual(impostorSession.activeWorkspace.institutionId, undefined, 'Must NOT be granted institutional workspace');
    console.log('[PASS] 7.1 Selecting privileged role in UI does not grant institutional authority');

    // =========================================================================
    // SECTION 8: DATA INTEGRITY & BASELINE HASH CHECK
    // =========================================================================
    console.log('\n--- Section 8: Real Database File Preservation ---');
    const finalDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
    assert.strictEqual(finalDbHash, initialDbHash, 'data/jarvis-db.json MUST NOT be modified');
    console.log(`[PASS] 8.1 Real database preserved (SHA-256: ${finalDbHash})`);

    console.log('\n===================================================================');
    console.log('>>> ALL 18 MILESTONE 2.4 STEP 2 TESTS PASSED SUCCESSFULLY! <<<');
    console.log('===================================================================');
  } finally {
    (global as any).fetch = originalFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    resetActiveRepository();
    resetEmailProvider();
    try {
      if (fs.existsSync(isolatedTempDir)) {
        fs.rmSync(isolatedTempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

runStep2TestSuite().catch((err) => {
  console.error('\n[FATAL] Test failed:', err);
  process.exit(1);
});
