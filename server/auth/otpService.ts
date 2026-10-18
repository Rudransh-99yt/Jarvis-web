// Cryptographic One-Time Password (OTP) Engine for Jarvis Authentication (Milestone 2.1)
import crypto from 'node:crypto';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';
import { resolveAuthSecret } from './tokens.ts';
import type {
  AuthOtpRecord,
  AuthOtpIntent,
  AuthOtpStatus,
  AuthOtpMetadata
} from '../data/types.ts';

/**
 * Standard OTP Configuration Constants:
 * - 10-minute expiry window for verification codes
 * - 5 maximum incorrect verification attempts before account lockout
 * - 60-second cooldown between resend requests for the same identity & intent
 * - 5 requests/hour durable email abuse cap
 */
export const OTP_EXPIRATION_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_HOURLY_REQUESTS_PER_EMAIL = 5;

export interface GenerateOtpResult {
  otpId: string;
  email: string;
  intent: AuthOtpIntent;
  code: string; // Plain text code returned transiently to caller for dispatch ONLY. NEVER persist or log.
  expiresAt: string;
  resendAvailableAt: string;
}

export interface VerifyOtpResult {
  success: boolean;
  status: AuthOtpStatus;
  otpId?: string;
  email?: string;
  intent?: AuthOtpIntent;
  metadata?: AuthOtpMetadata;
  attemptsRemaining?: number;
  error?: {
    code: 'NOT_FOUND' | 'EXPIRED' | 'LOCKED' | 'INVALID_CODE' | 'ALREADY_VERIFIED' | 'INVALID_ARGUMENTS';
    message: string;
  };
}

export interface ResendEligibilityResult {
  eligible: boolean;
  cooldownRemainingMs?: number;
  hourlyRequestsRemaining?: number;
  reason?: string;
}

/**
 * Generates an integer between 100000 and 999999 inclusive using OS entropy.
 * Guarantees a six-digit string.
 */
export function generateSixDigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a salted HMAC-SHA256 hex digest for an OTP code.
 * The raw code is never stored; only this salted digest is persisted.
 */
export function computeOtpHash(
  secret: string,
  email: string,
  code: string,
  salt: string
): string {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();
  const payload = `${normalizedEmail}:${cleanCode}:${salt}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies a candidate OTP against a stored salted hash.
 * Enforces constant-time comparison via crypto.timingSafeEqual with buffer length verification.
 */
export function verifyOtpHash(
  candidateCode: string,
  email: string,
  salt: string,
  storedHash: string,
  secret?: string
): boolean {
  if (
    !candidateCode ||
    typeof candidateCode !== 'string' ||
    !email ||
    typeof email !== 'string' ||
    !salt ||
    typeof salt !== 'string' ||
    salt.length !== 32 ||
    !storedHash ||
    typeof storedHash !== 'string' ||
    storedHash.length !== 64
  ) {
    return false;
  }
  const secretToUse = secret || resolveAuthSecret();
  const candidateHash = computeOtpHash(secretToUse, email, candidateCode, salt);
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');

  // Guard: crypto.timingSafeEqual throws if buffer lengths do not match
  if (candidateBuf.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}

/**
 * Sovereign OTP Service:
 * Coordinates generation, salted hashing, rate-limiting, and single-use verification.
 *
 * DURABILITY & CONCURRENCY ARCHITECTURE:
 * - Email-level rate limiting is backed by persistent database history (countRecentRequests).
 * - OTP generation and verification serialize safely via repository transaction mutexes.
 * - Single-use consumption is enforced inside an atomic transaction, preventing replay attacks.
 * - Distributed multi-instance IP rate limiting requires an external coordinated store (e.g. Redis
 *   or API Gateway edge throttler) and is deferred until multi-container deployments.
 */
export class OtpService {
  private readonly repo: IJarvisDataRepository;

  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  /**
   * Generates a new 6-digit OTP code, invalidates any existing pending codes for this email and intent,
   * hashes it with a random 16-byte salt, and saves the record in durable storage.
   *
   * CONCURRENCY HARDENING:
   * Cooldown check, rate limit calculation, prior code invalidation, and record insertion
   * execute inside an atomic repository transaction. Concurrent requests for the same email
   * serialize on the transaction mutex and strictly enforce cooldown and abuse limits.
   */
  async generateOtp(
    email: string,
    intent: AuthOtpIntent,
    metadata?: AuthOtpMetadata
  ): Promise<GenerateOtpResult> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || cleanEmail.length > 254 || !emailPattern.test(cleanEmail)) {
      const err = new Error('INVALID_ARGUMENTS: A valid email address (up to 254 characters) is required.');
      (err as any).code = 'INVALID_ARGUMENTS';
      throw err;
    }

    if (intent !== 'login' && intent !== 'register') {
      const err = new Error(`INVALID_ARGUMENTS: Invalid OTP intent '${intent}'. Must be 'login' or 'register'.`);
      (err as any).code = 'INVALID_ARGUMENTS';
      throw err;
    }

    // Generate cryptographic code, salt, and hash outside the lock
    const code = generateSixDigitCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const secret = resolveAuthSecret();
    const otpHash = computeOtpHash(secret, cleanEmail, code, salt);

    // Sanitize metadata: must be a plain object, discard prototype keys, truncate strings > 500 chars
    let cleanMetadata: AuthOtpMetadata | undefined = undefined;
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      cleanMetadata = {};
      for (const [key, val] of Object.entries(metadata)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        if (typeof val === 'string') {
          cleanMetadata[key] = val.slice(0, 500);
        } else if (typeof val === 'number' || typeof val === 'boolean') {
          cleanMetadata[key] = val;
        }
      }
    }

    return this.repo.runTransaction(async (txRepo) => {
      const now = Date.now();

      // 1. Durable email-level rate limiting: max 5 requests per rolling 60 minutes
      const recentRequests = await txRepo.authOtps.countRecentRequests(cleanEmail, 60 * 60 * 1000);
      if (recentRequests >= OTP_MAX_HOURLY_REQUESTS_PER_EMAIL) {
        const err = new Error('RATE_LIMIT_EXCEEDED: Too many verification requests for this email. Please try again later.');
        (err as any).code = 'RATE_LIMIT_EXCEEDED';
        throw err;
      }

      // 2. Check resend cooldown on currently active OTP
      const active = await txRepo.authOtps.getActiveOtp(cleanEmail, intent);
      if (active && new Date(active.resendAvailableAt).getTime() > now) {
        const waitMs = new Date(active.resendAvailableAt).getTime() - now;
        const waitSec = Math.ceil(waitMs / 1000);
        const err = new Error(`RESEND_COOLDOWN_ACTIVE: Please wait ${waitSec} seconds before requesting a new code.`);
        (err as any).code = 'RESEND_COOLDOWN_ACTIVE';
        (err as any).retryAfterMs = waitMs;
        throw err;
      }

      const otpId = `otp-${now}-${crypto.randomBytes(4).toString('hex')}`;
      const expiresAt = new Date(now + OTP_EXPIRATION_MS).toISOString();
      const resendAvailableAt = new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString();

      const record = await txRepo.authOtps.create({
        id: otpId,
        email: cleanEmail,
        intent,
        otpHash,
        salt,
        expiresAt,
        attemptsRemaining: OTP_MAX_ATTEMPTS,
        resendAvailableAt,
        status: 'pending',
        metadata: cleanMetadata
      });

      return {
        otpId: record.id,
        email: cleanEmail,
        intent,
        code, // Raw code returned ONLY to caller for email dispatch
        expiresAt,
        resendAvailableAt
      };
    });
  }

  /**
   * Atomically verifies a candidate OTP code inside a transaction.
   * If code is valid, marks it 'verified' immediately, preventing concurrent reuse.
   * If code is incorrect, decrements attemptsRemaining and locks after 5 failures.
   */
  async verifyOtp(
    email: string,
    candidateCode: string,
    intent: AuthOtpIntent
  ): Promise<VerifyOtpResult> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !cleanEmail ||
      cleanEmail.length > 254 ||
      !emailPattern.test(cleanEmail) ||
      !candidateCode ||
      typeof candidateCode !== 'string' ||
      candidateCode.trim().length === 0 ||
      (intent !== 'login' && intent !== 'register')
    ) {
      return {
        success: false,
        status: 'pending',
        error: {
          code: 'INVALID_ARGUMENTS',
          message: 'A valid email address (up to 254 characters), non-empty verification code, and valid intent are required.'
        }
      };
    }

    return this.repo.runTransaction(async (txRepo) => {
      // 1. Check if an active pending OTP exists for this email and intent
      const activeOtp = await txRepo.authOtps.getActiveOtp(cleanEmail, intent);

      if (activeOtp) {
        // Cryptographic timing-safe comparison against the active OTP
        const isValid = verifyOtpHash(candidateCode, cleanEmail, activeOtp.salt, activeOtp.otpHash);

        if (!isValid) {
          const remaining = activeOtp.attemptsRemaining - 1;
          const newStatus: AuthOtpStatus = remaining <= 0 ? 'locked' : 'pending';
          await txRepo.authOtps.update(activeOtp.id, {
            attemptsRemaining: remaining,
            status: newStatus
          });

          return {
            success: false,
            status: newStatus,
            otpId: activeOtp.id,
            attemptsRemaining: remaining,
            error: {
              code: remaining <= 0 ? 'LOCKED' : 'INVALID_CODE',
              message: remaining <= 0
                ? 'Maximum verification attempts exceeded. Please request a new code.'
                : `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            }
          };
        }

        // Single-use verification consumption
        const nowIso = new Date().toISOString();
        await txRepo.authOtps.update(activeOtp.id, {
          status: 'verified',
          verifiedAt: nowIso
        });

        return {
          success: true,
          status: 'verified',
          otpId: activeOtp.id,
          email: cleanEmail,
          intent: activeOtp.intent,
          metadata: activeOtp.metadata
        };
      }

      // 2. If no active pending OTP, inspect historical records to provide accurate feedback
      const allOtps = await txRepo.authOtps.list({ email: cleanEmail, intent });
      if (allOtps.length === 0) {
        return {
          success: false,
          status: 'pending',
          error: {
            code: 'NOT_FOUND',
            message: 'No verification code found for this email. Please request a new code.'
          }
        };
      }

      allOtps.sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (diff !== 0) return diff;
        return b.id.localeCompare(a.id);
      });
      const latest = allOtps[0];

      // A. If the latest attempt sequence was locked due to attempt exhaustion, fail closed with LOCKED
      if (latest.status === 'locked' || latest.attemptsRemaining <= 0) {
        return {
          success: false,
          status: 'locked',
          attemptsRemaining: 0,
          error: {
            code: 'LOCKED',
            message: 'Maximum verification attempts exceeded. Please request a new code.'
          }
        };
      }

      // B. If candidate code matches any already verified OTP for this identity, report ALREADY_VERIFIED
      const alreadyVerified = allOtps.find(
        (o) => o.status === 'verified' && verifyOtpHash(candidateCode, cleanEmail, o.salt, o.otpHash)
      );
      if (alreadyVerified) {
        return {
          success: false,
          status: 'verified',
          error: {
            code: 'ALREADY_VERIFIED',
            message: 'This verification code has already been consumed.'
          }
        };
      }

      // C. If the latest code has expired
      const now = Date.now();
      if (new Date(latest.expiresAt).getTime() <= now || latest.status === 'expired') {
        if (latest.status !== 'expired') {
          await txRepo.authOtps.update(latest.id, { status: 'expired' });
        }
        return {
          success: false,
          status: 'expired',
          error: {
            code: 'EXPIRED',
            message: 'This verification code has expired. Please request a new code.'
          }
        };
      }

      // D. If the candidate code was invalidated by a replacement
      const wasInvalidated = allOtps.find(
        (o) => o.status === 'invalidated' && verifyOtpHash(candidateCode, cleanEmail, o.salt, o.otpHash)
      );
      if (wasInvalidated) {
        return {
          success: false,
          status: 'invalidated',
          error: {
            code: 'NOT_FOUND',
            message: 'Verification code is no longer active because a newer code was requested.'
          }
        };
      }

      return {
        success: false,
        status: latest.status,
        error: {
          code: 'NOT_FOUND',
          message: 'Verification code is no longer active. Please request a new code.'
        }
      };
    });
  }

  /**
   * Checks whether an identity is eligible to receive another verification email.
   */
  async checkResendEligibility(
    email: string,
    intent: AuthOtpIntent
  ): Promise<ResendEligibilityResult> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !cleanEmail ||
      cleanEmail.length > 254 ||
      !emailPattern.test(cleanEmail) ||
      (intent !== 'login' && intent !== 'register')
    ) {
      return {
        eligible: false,
        reason: 'Invalid email address or intent.'
      };
    }

    const recent = await this.repo.authOtps.countRecentRequests(cleanEmail, 60 * 60 * 1000);
    const remaining = Math.max(0, OTP_MAX_HOURLY_REQUESTS_PER_EMAIL - recent);
    if (remaining === 0) {
      return {
        eligible: false,
        hourlyRequestsRemaining: 0,
        reason: 'Too many verification requests for this email. Please try again later.'
      };
    }

    const active = await this.repo.authOtps.getActiveOtp(cleanEmail, intent);
    const now = Date.now();

    if (active) {
      const resendAt = new Date(active.resendAvailableAt).getTime();
      if (resendAt > now) {
        const remainingMs = resendAt - now;
        return {
          eligible: false,
          cooldownRemainingMs: remainingMs,
          hourlyRequestsRemaining: remaining,
          reason: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before requesting a new code.`
        };
      }
    }

    return {
      eligible: true,
      cooldownRemainingMs: 0,
      hourlyRequestsRemaining: remaining
    };
  }

  /**
   * Invalidates a specific OTP record by its unique ID (e.g., when email delivery fails).
   *
   * CONCURRENCY & COMPENSATING SAFETY:
   * Only transitions the record from 'pending' to 'invalidated' if the exact ID matches
   * and its status is currently 'pending'.
   *
   * A concurrent request for a newer OTP (which has a distinct ID) will NOT be affected.
   * The record remains in durable storage so that hourly rate limiting history is preserved.
   */
  async invalidateOtpById(otpId: string): Promise<boolean> {
    if (!otpId || typeof otpId !== 'string') {
      return false;
    }
    return this.repo.runTransaction(async (txRepo) => {
      const record = await txRepo.authOtps.getById(otpId);
      if (!record || record.status !== 'pending') {
        return false;
      }
      await txRepo.authOtps.update(otpId, { status: 'invalidated' });
      return true;
    });
  }
}

export const otpService = new OtpService();
