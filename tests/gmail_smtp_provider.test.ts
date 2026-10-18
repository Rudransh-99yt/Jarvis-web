// Test Suite for Gmail SMTP Email Provider (Local Development OTP Delivery)
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Transporter } from 'nodemailer';
import {
  GmailSmtpEmailProvider,
  extractEmailAddress
} from '../server/auth/email/gmailSmtpProvider.ts';
import {
  resolveEmailProvider,
  validateProductionEmailConfig,
  resetEmailProvider
} from '../server/auth/email/providerFactory.ts';

// Mock Transporter implementation for deterministic offline testing
class MockSmtpTransporter {
  public dispatched: any[] = [];
  public mockBehavior?: (mailOptions: any) => Promise<any>;

  async sendMail(mailOptions: any): Promise<any> {
    this.dispatched.push(mailOptions);
    if (this.mockBehavior) {
      return this.mockBehavior(mailOptions);
    }
    return {
      messageId: `<mock-smtp-${Date.now()}@mail.gmail.com>`,
      response: '250 2.0.0 OK mock message accepted'
    };
  }
}

async function runGmailSmtpTestSuite() {
  console.log('===================================================================');
  console.log('=== [JARVIS] GMAIL SMTP EMAIL PROVIDER TEST SUITE (MOCKED)      ===');
  console.log('===================================================================\n');

  // Verify real database file presence and baseline hash
  const dbPath = path.resolve('./data/jarvis-db.json');
  assert(fs.existsSync(dbPath), 'data/jarvis-db.json must exist');
  const initialDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');

  // Preserve initial environment
  const originalEnv = { ...process.env };

  try {
    // =========================================================================
    // SECTION 1: SENDER & ADDRESS PARSING
    // =========================================================================
    console.log('--- Section 1: Sender & Address Parsing ---');

    assert.strictEqual(extractEmailAddress('developer@gmail.com'), 'developer@gmail.com');
    assert.strictEqual(extractEmailAddress('  User@Gmail.COM  '), 'user@gmail.com');
    assert.strictEqual(
      extractEmailAddress('J.A.R.V.I.S. <auth.dev@gmail.com>'),
      'auth.dev@gmail.com'
    );
    assert.strictEqual(
      extractEmailAddress('"Tony Stark" <tony@starkindustries.org>'),
      'tony@starkindustries.org'
    );
    console.log('[PASS] 1.1 Address parsing extracts normalized lowercase email correctly');

    // =========================================================================
    // SECTION 2: CONFIGURATION VALIDATION
    // =========================================================================
    console.log('\n--- Section 2: Configuration Validation ---');

    // 2.1 Missing or invalid SMTP_USER
    assert.throws(
      () =>
        new GmailSmtpEmailProvider({
          user: '',
          pass: 'abcdefghijklmnop',
          from: 'dev@gmail.com'
        }),
      /INVALID_CONFIGURATION: SMTP_USER is required/
    );

    assert.throws(
      () =>
        new GmailSmtpEmailProvider({
          user: 'not-an-email',
          pass: 'abcdefghijklmnop',
          from: 'dev@gmail.com'
        }),
      /INVALID_CONFIGURATION: SMTP_USER is required/
    );
    console.log('[PASS] 2.1 Missing or invalid SMTP_USER throws INVALID_CONFIGURATION');

    // 2.2 Missing SMTP_PASS
    assert.throws(
      () =>
        new GmailSmtpEmailProvider({
          user: 'dev@gmail.com',
          pass: '',
          from: 'dev@gmail.com'
        }),
      /INVALID_CONFIGURATION: SMTP_PASS is required/
    );
    console.log('[PASS] 2.2 Missing SMTP_PASS throws INVALID_CONFIGURATION');

    // 2.3 Sender mismatch: JARVIS_EMAIL_FROM does not match SMTP_USER
    assert.throws(
      () =>
        new GmailSmtpEmailProvider({
          user: 'dev@gmail.com',
          pass: 'abcdefghijklmnop',
          from: 'impostor@otherdomain.com'
        }),
      /INVALID_CONFIGURATION: JARVIS_EMAIL_FROM address \("impostor@otherdomain.com"\) must match the authenticated Gmail sender \("dev@gmail.com"\)/
    );

    // 2.4 Formatted matching sender accepted
    const validProvider = new GmailSmtpEmailProvider({
      user: 'developer@gmail.com',
      pass: 'abcd efgh ijkl mnop', // with spaces
      from: 'J.A.R.V.I.S. Auth <developer@gmail.com>',
      transporter: new MockSmtpTransporter() as unknown as Transporter
    });
    assert.strictEqual(validProvider.name, 'smtp');
    console.log('[PASS] 2.3 Sender address matching and Google App Password formatting validated');

    // =========================================================================
    // SECTION 3: PRODUCTION FAIL-CLOSED BOUNDARY
    // =========================================================================
    console.log('\n--- Section 3: Production Fail-Closed Boundary ---');

    process.env.NODE_ENV = 'production';
    process.env.JARVIS_EMAIL_PROVIDER = 'smtp';
    process.env.SMTP_USER = 'dev@gmail.com';
    process.env.SMTP_PASS = 'abcdefghijklmnop';
    process.env.JARVIS_EMAIL_FROM = 'dev@gmail.com';

    // 3.1 Valid Gmail SMTP configuration succeeds in production
    resetEmailProvider();
    validateProductionEmailConfig();
    const prodSmtp = resolveEmailProvider();
    assert.strictEqual(prodSmtp.name, 'smtp');
    assert(prodSmtp instanceof GmailSmtpEmailProvider);
    console.log('[PASS] 3.1 Valid Gmail SMTP provider supported and resolved in production');

    // 3.2 Missing SMTP_PASS fails closed in production
    resetEmailProvider();
    delete process.env.SMTP_PASS;
    assert.throws(
      () => validateProductionEmailConfig(),
      /CONFIGURATION_ERROR: SMTP_PASS is required in production/
    );
    assert.throws(
      () => resolveEmailProvider(),
      /CONFIGURATION_ERROR: SMTP_PASS is required in production/
    );
    console.log('[PASS] 3.2 Missing SMTP_PASS strictly fails closed in production');

    // 3.3 Dev fallbacks (console / mock) strictly disallowed in production
    resetEmailProvider();
    process.env.JARVIS_EMAIL_PROVIDER = 'console';
    assert.throws(
      () => validateProductionEmailConfig(),
      /CONFIGURATION_ERROR: In production, JARVIS_EMAIL_PROVIDER cannot be 'console'/
    );
    console.log('[PASS] 3.3 Silent console fallback strictly disallowed in production');

    // =========================================================================
    // SECTION 4: PROVIDER SELECTION & LOCAL ENVIRONMENT RESOLUTION
    // =========================================================================
    console.log('\n--- Section 4: Provider Selection in Development ---');

    process.env.NODE_ENV = 'development';
    process.env.JARVIS_EMAIL_PROVIDER = 'smtp';
    process.env.SMTP_USER = 'dev.jarvis@gmail.com';
    process.env.SMTP_PASS = 'mockpassword1234';
    process.env.JARVIS_EMAIL_FROM = 'J.A.R.V.I.S. <dev.jarvis@gmail.com>';

    resetEmailProvider();
    const resolvedSmtp = resolveEmailProvider();
    assert.strictEqual(resolvedSmtp.name, 'smtp');
    assert(resolvedSmtp instanceof GmailSmtpEmailProvider);
    console.log('[PASS] 4.1 JARVIS_EMAIL_PROVIDER=smtp resolves to GmailSmtpEmailProvider');

    // Alias 'gmail' resolves to same provider
    resetEmailProvider();
    process.env.JARVIS_EMAIL_PROVIDER = 'gmail';
    const resolvedGmail = resolveEmailProvider();
    assert.strictEqual(resolvedGmail.name, 'smtp');
    console.log('[PASS] 4.2 JARVIS_EMAIL_PROVIDER=gmail alias resolves correctly');

    // Missing required credentials in development fails closed without fallback
    resetEmailProvider();
    delete process.env.SMTP_PASS;
    assert.throws(
      () => resolveEmailProvider(),
      /INVALID_CONFIGURATION: SMTP_PASS is required when JARVIS_EMAIL_PROVIDER is set to "smtp"/
    );

    resetEmailProvider();
    delete process.env.SMTP_USER;
    assert.throws(
      () => resolveEmailProvider(),
      /INVALID_CONFIGURATION: SMTP_USER is required when JARVIS_EMAIL_PROVIDER is set to "smtp"/
    );
    console.log('[PASS] 4.3 Missing SMTP credentials fail closed without silent fallback');

    // =========================================================================
    // SECTION 5: MESSAGE MAPPING & SUCCESSFUL MOCK DISPATCH
    // =========================================================================
    console.log('\n--- Section 5: Message Mapping & Mock Delivery ---');

    const mockTransporter = new MockSmtpTransporter();
    const testProvider = new GmailSmtpEmailProvider({
      user: 'auth@gmail.com',
      pass: 'secretpassword12',
      from: 'J.A.R.V.I.S. <auth@gmail.com>',
      transporter: mockTransporter as unknown as Transporter
    });

    const dispatchPayload = {
      to: 'student@example.com',
      subject: 'Your J.A.R.V.I.S. Verification Code: 482910',
      html: '<h1>482910</h1>',
      text: 'Your code is: 482910',
      tag: 'otp-login'
    };

    const sendResult = await testProvider.send(dispatchPayload);

    assert.strictEqual(sendResult.success, true);
    assert(sendResult.messageId?.includes('mock-smtp'));
    assert.strictEqual(mockTransporter.dispatched.length, 1);

    const sentMail = mockTransporter.dispatched[0];
    assert.strictEqual(sentMail.from, 'J.A.R.V.I.S. <auth@gmail.com>');
    assert.strictEqual(sentMail.to, 'student@example.com');
    assert.strictEqual(sentMail.subject, 'Your J.A.R.V.I.S. Verification Code: 482910');
    assert.strictEqual(sentMail.html, '<h1>482910</h1>');
    assert.strictEqual(sentMail.text, 'Your code is: 482910');
    assert.strictEqual(sentMail.headers?.['X-Jarvis-Tag'], 'otp-login');
    console.log('[PASS] 5.1 Message payload mapped correctly to SMTP transporter (MOCKED - No real network call)');

    // =========================================================================
    // SECTION 6: SAFE ERROR MAPPING & CREDENTIAL ISOLATION
    // =========================================================================
    console.log('\n--- Section 6: Safe Error Mapping & Secret Protection ---');

    // 6.1 Authentication Error (e.g. invalid App Password)
    mockTransporter.mockBehavior = async () => {
      const err: any = new Error('Invalid login: 535-5.7.8 Username and Password not accepted.');
      err.code = 'EAUTH';
      err.responseCode = 535;
      throw err;
    };

    const authErrResult = await testProvider.send(dispatchPayload);
    assert.strictEqual(authErrResult.success, false);
    assert.strictEqual(authErrResult.error?.code, 'INVALID_CONFIGURATION');
    assert.strictEqual(authErrResult.error?.rawStatus, 535);
    assert(
      authErrResult.error?.message.includes('Google App Password'),
      'Must suggest Google App Password'
    );
    assert(!authErrResult.error?.message.includes('secretpassword12'), 'Must never leak password');
    console.log('[PASS] 6.1 Authentication failure mapped to INVALID_CONFIGURATION (535) with credential redaction');

    // 6.2 Quota / Rate Limiting Error
    mockTransporter.mockBehavior = async () => {
      const err: any = new Error('452 4.2.2 The email account that you tried to reach is over quota.');
      err.responseCode = 452;
      throw err;
    };

    const quotaErrResult = await testProvider.send(dispatchPayload);
    assert.strictEqual(quotaErrResult.success, false);
    assert.strictEqual(quotaErrResult.error?.code, 'RATE_LIMITED');
    assert.strictEqual(quotaErrResult.error?.rawStatus, 452);
    console.log('[PASS] 6.2 Quota/rate-limit error mapped to RATE_LIMITED');

    // 6.3 Timeout Error
    const timeoutProvider = new GmailSmtpEmailProvider({
      user: 'auth@gmail.com',
      pass: 'secretpassword12',
      from: 'auth@gmail.com',
      timeoutMs: 50,
      transporter: {
        sendMail: () => new Promise((resolve) => setTimeout(resolve, 200))
      } as unknown as Transporter
    });

    const timeoutResult = await timeoutProvider.send(dispatchPayload);
    assert.strictEqual(timeoutResult.success, false);
    assert.strictEqual(timeoutResult.error?.code, 'TIMEOUT');
    assert(timeoutResult.error?.message.includes('timed out'));
    console.log('[PASS] 6.3 AbortController enforces timeout handling correctly (TIMEOUT)');

    // 6.4 Network Error
    mockTransporter.mockBehavior = async () => {
      const err: any = new Error('getaddrinfo ENOTFOUND smtp.gmail.com');
      err.code = 'ENOTFOUND';
      throw err;
    };

    const netErrResult = await testProvider.send(dispatchPayload);
    assert.strictEqual(netErrResult.success, false);
    assert.strictEqual(netErrResult.error?.code, 'NETWORK_ERROR');
    console.log('[PASS] 6.4 Socket/DNS error mapped to NETWORK_ERROR');

    // 6.5 Provider Rejection Error (550 Unknown Recipient)
    mockTransporter.mockBehavior = async () => {
      const err: any = new Error('550-5.1.1 The email account that you tried to reach does not exist.');
      err.responseCode = 550;
      throw err;
    };

    const rejectErrResult = await testProvider.send(dispatchPayload);
    assert.strictEqual(rejectErrResult.success, false);
    assert.strictEqual(rejectErrResult.error?.code, 'PROVIDER_REJECTED');
    assert.strictEqual(rejectErrResult.error?.rawStatus, 550);
    console.log('[PASS] 6.5 Recipient/mailbox rejection mapped to PROVIDER_REJECTED (550)');

    // 6.6 Generic Exception
    mockTransporter.mockBehavior = async () => {
      throw new Error('Unchecked runtime transport failure with internal sensitive stack data');
    };

    const genericErrResult = await testProvider.send(dispatchPayload);
    assert.strictEqual(genericErrResult.success, false);
    assert.strictEqual(genericErrResult.error?.code, 'INTERNAL_ERROR');
    assert(!genericErrResult.error?.message.includes('internal sensitive stack data'));
    console.log('[PASS] 6.6 Generic error masked safely with INTERNAL_ERROR');

    // =========================================================================
    // SECTION 7: DATABASE FILE INTEGRITY CHECK
    // =========================================================================
    console.log('\n--- Section 7: Database File Preservation ---');
    const finalDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
    assert.strictEqual(finalDbHash, initialDbHash, 'data/jarvis-db.json MUST NOT be modified');
    console.log(`[PASS] 7.1 Real database preserved (SHA-256: ${finalDbHash})`);

    console.log('\n===================================================================');
    console.log('>>> ALL 7 GMAIL SMTP TEST SECTIONS PASSED SUCCESSFULLY! <<<');
    console.log('>>> NOTE: All tests used mocked transporters; NO real emails sent.<<<');
    console.log('===================================================================');
  } finally {
    process.env = originalEnv;
    resetEmailProvider();
  }
}

runGmailSmtpTestSuite().catch((err) => {
  console.error('\n[FATAL] Test failed:', err);
  process.exit(1);
});
