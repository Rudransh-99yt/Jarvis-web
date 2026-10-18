// Development and Test Email Providers for Jarvis Platform (Milestone 2.2)
import type { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from './types.ts';

/**
 * ConsoleEmailProvider:
 * Safe development provider for local developer environments.
 *
 * SECURITY INVARIANTS:
 * 1. Strictly forbidden in production (throws on instantiation).
 * 2. Raw OTP visibility is DISABLED BY DEFAULT.
 * 3. Raw OTP code is logged ONLY when JARVIS_DEV_LOG_OTP_CODE === 'true' and NODE_ENV !== 'production'.
 * 4. Never logs API keys, session tokens, or sensitive payloads.
 */
export class ConsoleEmailProvider implements IEmailProvider {
  readonly name = 'console';
  private readonly allowCodeLogging: boolean;

  constructor(allowCodeLogging: boolean = false) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY_VIOLATION: ConsoleEmailProvider cannot be used in production.');
    }
    this.allowCodeLogging = allowCodeLogging;
  }

  async send(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: {
          code: 'INVALID_CONFIGURATION',
          message: 'Console email delivery is disabled in production.'
        }
      };
    }

    if (this.allowCodeLogging) {
      console.log(`[EmailProvider:dev] Dispatched OTP email to ${payload.to} | Subject: "${payload.subject}"`);
      console.log(`[EmailProvider:dev] Body preview:\n${payload.text}`);
    } else {
      console.log(
        `[EmailProvider:dev] Dispatched OTP email to ${payload.to} (content redacted by default; enable JARVIS_DEV_LOG_OTP_CODE=true in dev to inspect)`
      );
    }

    return {
      success: true,
      messageId: `dev-msg-${Date.now()}`
    };
  }
}

/**
 * MockEmailProvider:
 * In-memory provider for deterministic offline testing.
 * Makes no real network calls and performs no external I/O.
 */
export class MockEmailProvider implements IEmailProvider {
  readonly name = 'mock';
  public dispatched: EmailDispatchPayload[] = [];
  public nextResult?: EmailDispatchResult;
  public throwError?: Error;
  public delayMs?: number;

  async send(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    if (this.delayMs && this.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.delayMs));
    }

    if (this.throwError) {
      throw this.throwError;
    }

    this.dispatched.push({ ...payload });

    if (this.nextResult) {
      const res = this.nextResult;
      this.nextResult = undefined;
      return res;
    }

    return {
      success: true,
      messageId: `mock-msg-${this.dispatched.length}`
    };
  }

  reset(): void {
    this.dispatched = [];
    this.nextResult = undefined;
    this.throwError = undefined;
    this.delayMs = undefined;
  }
}
