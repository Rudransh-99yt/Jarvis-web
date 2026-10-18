// Native Fetch Resend Email Provider for Jarvis Platform (Milestone 2.2)
import type { IEmailProvider, EmailDispatchPayload, EmailDispatchResult } from './types.ts';

export interface ResendProviderOptions {
  apiKey: string;
  from: string;
  timeoutMs?: number;
}

export class ResendEmailProvider implements IEmailProvider {
  readonly name = 'resend';
  private readonly apiKey: string;
  private readonly from: string;
  private readonly timeoutMs: number;

  constructor(options: ResendProviderOptions) {
    if (!options.apiKey || typeof options.apiKey !== 'string' || !options.apiKey.trim().startsWith('re_') || options.apiKey.trim().length < 10) {
      throw new Error('INVALID_CONFIGURATION: Resend API key is required and must be a valid key starting with "re_".');
    }
    if (!options.from || typeof options.from !== 'string' || !options.from.trim() || !options.from.includes('@')) {
      throw new Error('INVALID_CONFIGURATION: A valid sender address (from) is required (e.g., "J.A.R.V.I.S. <auth@yourdomain.com>").');
    }
    this.apiKey = options.apiKey.trim();
    this.from = options.from.trim();
    this.timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 5000;
  }

  async send(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutHandle);

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Malformed response received from email delivery service.',
            rawStatus: response.status
          }
        };
      }

      if (response.ok && data?.id) {
        // Treat provider acceptance as queued/accepted, not guaranteed inbox delivery
        return {
          success: true,
          messageId: data.id
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Email delivery rate limit exceeded. Please try again later.',
            rawStatus: 429
          }
        };
      }

      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          error: {
            code: 'PROVIDER_REJECTED',
            message: 'Email delivery was rejected by the provider configuration.',
            rawStatus: response.status
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Email delivery service temporarily unavailable.',
          rawStatus: response.status
        }
      };
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `Email delivery request timed out after ${this.timeoutMs}ms.`
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error connecting to email delivery service.'
        }
      };
    }
  }
}
