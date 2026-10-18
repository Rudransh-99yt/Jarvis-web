import nodemailer, { type Transporter } from 'nodemailer';
import type { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from './types.ts';

export interface GmailSmtpProviderOptions {
  user: string;
  pass: string;
  from: string;
  host?: string;
  port?: number;
  timeoutMs?: number;
  transporter?: Transporter;
}

/**
 * Extracts and normalizes the raw email address from a sender or user string.
 * Handles both plain "name@domain.com" and format "Display Name <name@domain.com>".
 */
export function extractEmailAddress(input: string): string {
  const match = input.match(/<([^>]+)>/);
  return (match ? match[1] : input).trim().toLowerCase();
}

/**
 * GmailSmtpEmailProvider:
 * Delivers transactional OTP emails via Gmail SMTP using a Google App Password.
 * Intended for local development where developers need real email delivery without purchasing a domain.
 */
export class GmailSmtpEmailProvider implements IEmailProvider {
  readonly name = 'smtp';
  private readonly user: string;
  private readonly pass: string;
  private readonly from: string;
  private readonly timeoutMs: number;
  private readonly transporter: Transporter;

  constructor(options: GmailSmtpProviderOptions) {
    if (!options.user || typeof options.user !== 'string' || !options.user.trim() || !options.user.includes('@')) {
      throw new Error(
        'INVALID_CONFIGURATION: SMTP_USER is required and must be a valid email address (e.g., yourname@gmail.com).'
      );
    }

    if (!options.pass || typeof options.pass !== 'string' || !options.pass.trim()) {
      throw new Error(
        'INVALID_CONFIGURATION: SMTP_PASS is required and must be a valid 16-character Google App Password.'
      );
    }

    if (!options.from || typeof options.from !== 'string' || !options.from.trim() || !options.from.includes('@')) {
      throw new Error(
        'INVALID_CONFIGURATION: JARVIS_EMAIL_FROM is required and must contain a valid email address or sender identity.'
      );
    }

    const cleanUser = options.user.trim();
    // Google App Passwords may be entered with or without spaces (e.g. "abcd efgh ijkl mnop")
    const cleanPass = options.pass.trim().replace(/\s+/g, '');
    const cleanFrom = options.from.trim();

    const fromEmail = extractEmailAddress(cleanFrom);
    const userEmail = extractEmailAddress(cleanUser);

    if (fromEmail !== userEmail) {
      throw new Error(
        `INVALID_CONFIGURATION: JARVIS_EMAIL_FROM address ("${fromEmail}") must match the authenticated Gmail sender ("${userEmail}") or an authorized alias.`
      );
    }

    this.user = cleanUser;
    this.pass = cleanPass;
    this.from = cleanFrom;
    this.timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 10000;

    if (options.transporter) {
      this.transporter = options.transporter;
    } else {
      const port = options.port || 465;
      const host = options.host || 'smtp.gmail.com';
      const secure = port === 465;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: this.user,
          pass: this.pass
        },
        // Strict TLS configuration: Never disable certificate verification
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: this.timeoutMs,
        greetingTimeout: this.timeoutMs,
        socketTimeout: this.timeoutMs
      });
    }
  }

  async send(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    const cleanTo = (payload?.to || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanTo || cleanTo.length > 254 || !emailPattern.test(cleanTo)) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_REJECTED',
          message: 'Recipient email address is invalid or missing.',
          rawStatus: 550
        }
      };
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const info = await Promise.race([
        this.transporter.sendMail({
          from: this.from,
          to: cleanTo,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          headers: payload.tag ? { 'X-Jarvis-Tag': payload.tag } : undefined
        }),
        new Promise<never>((_, reject) => {
          const onAbort = () => {
            const err = new Error(`Email delivery request timed out after ${this.timeoutMs}ms.`);
            err.name = 'TimeoutError';
            (err as any).code = 'ETIMEDOUT';
            reject(err);
          };
          if (controller.signal.aborted) {
            onAbort();
          } else {
            controller.signal.addEventListener('abort', onAbort, { once: true });
          }
        })
      ]);

      clearTimeout(timeoutHandle);

      // Verify SMTP acceptance: Check if recipient was rejected by server
      const rejectedList = Array.isArray((info as any)?.rejected) ? (info as any).rejected : [];
      const acceptedList = Array.isArray((info as any)?.accepted) ? (info as any).accepted : [];

      if (rejectedList.length > 0 && acceptedList.length === 0) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_REJECTED',
            message: 'Email delivery was rejected by the Gmail SMTP server for the recipient address.',
            rawStatus: (info as any)?.responseCode || 550
          }
        };
      }

      return {
        success: true,
        messageId: (info && ((info as any).messageId || (info as any).response)) || `smtp-${Date.now()}`
      };
    } catch (rawErr: any) {
      clearTimeout(timeoutHandle);
      return this.mapSmtpError(rawErr);
    }
  }

  /**
   * Sanitizes and maps transport errors into standard safe EmailDispatchResult errors.
   * Strips out raw socket details, credentials, or internal payload representations.
   */
  private mapSmtpError(err: any): EmailDispatchResult {
    const code = String(err?.code || '').toUpperCase();
    const responseCode =
      typeof err?.responseCode === 'number'
        ? err.responseCode
        : parseInt(err?.responseCode, 10) || undefined;
    const errMsg = String(err?.message || '').toLowerCase();
    const isAborted =
      err?.name === 'TimeoutError' ||
      err?.name === 'AbortError' ||
      code === 'ETIMEDOUT' ||
      code === 'ETIME';

    // 1. Timeout
    if (isAborted || errMsg.includes('timed out') || errMsg.includes('timeout')) {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: `SMTP email delivery timed out after ${this.timeoutMs}ms.`
        }
      };
    }

    // 2. Authentication failure (Invalid credentials / App Password required)
    if (
      code === 'EAUTH' ||
      responseCode === 535 ||
      errMsg.includes('invalid login') ||
      errMsg.includes('badcredentials') ||
      errMsg.includes('username and password not accepted') ||
      errMsg.includes('please log in via your web browser')
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONFIGURATION',
          message:
            'SMTP authentication failed. Verify that SMTP_USER is your full Gmail address and SMTP_PASS is a valid 16-character Google App Password.',
          rawStatus: 535
        }
      };
    }

    // 3. Quota / Rate Limiting (Gmail sending limit or temporary rate limit)
    if (
      responseCode === 421 ||
      responseCode === 452 ||
      responseCode === 450 ||
      errMsg.includes('daily user sending limit') ||
      errMsg.includes('quota') ||
      errMsg.includes('rate limit') ||
      errMsg.includes('too many')
    ) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Gmail SMTP rate limit or daily sending quota exceeded. Please try again later.',
          rawStatus: responseCode || 421
        }
      };
    }

    // 4. Network / Socket connection error
    if (
      code === 'ESOCKET' ||
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'EHOSTUNREACH' ||
      code === 'ECONNRESET' ||
      code === 'ENETUNREACH' ||
      errMsg.includes('getaddrinfo')
    ) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error connecting to Gmail SMTP server (smtp.gmail.com).'
        }
      };
    }

    // 5. Provider / Recipient rejection
    if (
      (responseCode && responseCode >= 500 && responseCode < 600) ||
      errMsg.includes('recipient rejected') ||
      errMsg.includes('mailbox unavailable') ||
      errMsg.includes('user not found') ||
      errMsg.includes('invalid recipient')
    ) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_REJECTED',
          message: 'Email delivery was rejected by the Gmail SMTP server.',
          rawStatus: responseCode || 550
        }
      };
    }

    // 6. Generic safe fallback
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during SMTP email dispatch.'
      }
    };
  }
}
