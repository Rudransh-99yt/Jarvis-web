// Email Provider Interfaces and Result Types for Jarvis OTP Delivery (Milestone 2.2)

export type EmailErrorCode =
  | 'PROVIDER_REJECTED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_CONFIGURATION'
  | 'INTERNAL_ERROR';

export interface EmailDispatchPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: EmailErrorCode;
    message: string;
    rawStatus?: number;
  };
}

export interface IEmailProvider {
  readonly name: string;
  send(payload: EmailDispatchPayload): Promise<EmailDispatchResult>;
}

export interface EmailConfig {
  provider: 'resend' | 'smtp' | 'console' | 'mock';
  apiKey?: string;
  smtpUser?: string;
  smtpPass?: string;
  from: string;
  timeoutMs: number;
  devLogOtpCode?: boolean;
}
