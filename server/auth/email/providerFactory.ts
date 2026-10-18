// Email Provider Resolution and Production Fail-Closed Boundary (Milestone 2.2)
import type { IEmailProvider } from './types.ts';
import { ResendEmailProvider } from './resendProvider.ts';
import { GmailSmtpEmailProvider, extractEmailAddress } from './gmailSmtpProvider.ts';
import { ConsoleEmailProvider, MockEmailProvider } from './devProvider.ts';

let activeProvider: IEmailProvider | null = null;

/**
 * Validates production email configuration.
 * Enforces strict fail-closed security invariants:
 * 1. Must use a verified delivery provider ('smtp' or 'resend') in production.
 *    Silent mock or console fallback is strictly forbidden.
 * 2. If 'resend': RESEND_API_KEY is mandatory, must begin with "re_", and have valid length (>= 10).
 * 3. If 'smtp' (or 'gmail'): SMTP_USER and SMTP_PASS are mandatory.
 * 4. JARVIS_EMAIL_FROM is mandatory and must contain a valid email address matching the SMTP sender or authorized domain.
 */
export function validateProductionEmailConfig(): void {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const rawProvider = (process.env.JARVIS_EMAIL_PROVIDER || '').trim().toLowerCase();
  const provider = rawProvider || 'resend';

  if (provider === 'console' || provider === 'mock') {
    throw new Error(
      `CONFIGURATION_ERROR: In production, JARVIS_EMAIL_PROVIDER cannot be '${provider}'. A verified delivery provider ('smtp' or 'resend') is required. Silent fallbacks are strictly disallowed.`
    );
  }

  if (provider !== 'resend' && provider !== 'smtp' && provider !== 'gmail') {
    throw new Error(
      `CONFIGURATION_ERROR: Unsupported email provider "${provider}". In production, JARVIS_EMAIL_PROVIDER must be 'smtp' or 'resend'. Silent fallbacks are strictly disallowed.`
    );
  }

  const from = (process.env.JARVIS_EMAIL_FROM || '').trim();
  if (!from || !from.includes('@')) {
    throw new Error(
      `CONFIGURATION_ERROR: JARVIS_EMAIL_FROM is required in production and must be a valid email address or sender identity (e.g. 'J.A.R.V.I.S. <auth@yourdomain.com>').`
    );
  }

  const emailMatch = from.match(/<([^>]+)>/) || [null, from];
  const emailAddr = (emailMatch[1] || '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailAddr || !emailPattern.test(emailAddr)) {
    throw new Error(
      `CONFIGURATION_ERROR: JARVIS_EMAIL_FROM contains an invalid email address format: "${from}".`
    );
  }

  if (provider === 'resend') {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!apiKey || !apiKey.startsWith('re_') || apiKey.length < 10) {
      throw new Error(
        `CONFIGURATION_ERROR: RESEND_API_KEY is required in production and must be a valid Resend API key starting with "re_".`
      );
    }
  }

  if (provider === 'smtp' || provider === 'gmail') {
    const user = (process.env.SMTP_USER || '').trim();
    if (!user || !user.includes('@')) {
      throw new Error(
        `CONFIGURATION_ERROR: SMTP_USER is required in production and must be a valid email address (e.g. yourname@gmail.com).`
      );
    }

    const pass = (process.env.SMTP_PASS || '').trim();
    if (!pass) {
      throw new Error(
        `CONFIGURATION_ERROR: SMTP_PASS is required in production and must be a valid Google App Password.`
      );
    }

    const userEmail = extractEmailAddress(user);
    if (emailAddr.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error(
        `CONFIGURATION_ERROR: JARVIS_EMAIL_FROM address ("${emailAddr}") must match the authenticated Gmail sender ("${userEmail}") or an authorized alias.`
      );
    }
  }
}

/**
 * Resolves the configured email delivery provider.
 * Follows strict environment constraints and supports test injection.
 */
export function resolveEmailProvider(): IEmailProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const hasSmtpConfig = Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
  const defaultNonProd = hasSmtpConfig ? 'smtp' : (process.env.NODE_ENV === 'test' ? 'mock' : 'console');

  const rawProvider = (process.env.JARVIS_EMAIL_PROVIDER || '').trim().toLowerCase();
  const providerType = (
    rawProvider ||
    (isProd ? 'resend' : defaultNonProd)
  )
    .trim()
    .toLowerCase();

  if (isProd) {
    validateProductionEmailConfig();
    const timeoutMs = process.env.JARVIS_EMAIL_TIMEOUT_MS
      ? parseInt(process.env.JARVIS_EMAIL_TIMEOUT_MS, 10)
      : (providerType === 'smtp' || providerType === 'gmail' ? 10000 : 5000);

    if (providerType === 'smtp' || providerType === 'gmail') {
      const user = process.env.SMTP_USER!.trim();
      const pass = process.env.SMTP_PASS!.trim();
      const from = (process.env.JARVIS_EMAIL_FROM || user).trim();
      activeProvider = new GmailSmtpEmailProvider({ user, pass, from, timeoutMs });
      return activeProvider;
    }

    if (providerType === 'resend') {
      activeProvider = new ResendEmailProvider({
        apiKey: process.env.RESEND_API_KEY!,
        from: process.env.JARVIS_EMAIL_FROM!,
        timeoutMs
      });
      return activeProvider;
    }
  }

  // Non-production resolution
  if (providerType === 'resend') {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    const from = (process.env.JARVIS_EMAIL_FROM || 'onboarding@resend.dev').trim();
    if (!apiKey) {
      throw new Error(
        'INVALID_CONFIGURATION: RESEND_API_KEY is required when JARVIS_EMAIL_PROVIDER is set to "resend".'
      );
    }
    const timeoutMs = process.env.JARVIS_EMAIL_TIMEOUT_MS
      ? parseInt(process.env.JARVIS_EMAIL_TIMEOUT_MS, 10)
      : 5000;

    activeProvider = new ResendEmailProvider({ apiKey, from, timeoutMs });
    return activeProvider;
  }

  if (providerType === 'smtp' || providerType === 'gmail') {
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim();
    const from = (process.env.JARVIS_EMAIL_FROM || user).trim();
    const timeoutMs = process.env.JARVIS_EMAIL_TIMEOUT_MS
      ? parseInt(process.env.JARVIS_EMAIL_TIMEOUT_MS, 10)
      : 10000;

    if (!user) {
      throw new Error(
        'INVALID_CONFIGURATION: SMTP_USER is required when JARVIS_EMAIL_PROVIDER is set to "smtp". Must be your Gmail address.'
      );
    }
    if (!pass) {
      throw new Error(
        'INVALID_CONFIGURATION: SMTP_PASS is required when JARVIS_EMAIL_PROVIDER is set to "smtp". Must be a 16-character Google App Password.'
      );
    }
    if (!from) {
      throw new Error(
        'INVALID_CONFIGURATION: JARVIS_EMAIL_FROM is required when JARVIS_EMAIL_PROVIDER is set to "smtp".'
      );
    }

    activeProvider = new GmailSmtpEmailProvider({ user, pass, from, timeoutMs });
    return activeProvider;
  }

  if (providerType === 'mock') {
    activeProvider = new MockEmailProvider();
    return activeProvider;
  }

  if (providerType === 'console') {
    const allowLogging = process.env.JARVIS_DEV_LOG_OTP_CODE === 'true';
    activeProvider = new ConsoleEmailProvider(allowLogging);
    return activeProvider;
  }

  throw new Error(
    `INVALID_CONFIGURATION: Unsupported email provider "${providerType}". Must be 'resend', 'smtp', 'console', or 'mock'.`
  );
}

/**
 * Injects a specific provider for testing.
 */
export function setEmailProvider(provider: IEmailProvider | null): void {
  activeProvider = provider;
}

/**
 * Clears active provider reference, returning to environment-based resolution.
 */
export function resetEmailProvider(): void {
  activeProvider = null;
}
