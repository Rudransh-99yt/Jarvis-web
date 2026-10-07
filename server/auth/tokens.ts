import crypto from 'node:crypto';
import type { User } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';
export class AuthenticationError extends Error {
  public statusCode: number;
  public code: string;
  constructor(message: string, statusCode = 401, code = 'UNAUTHENTICATED') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface AuthTokenPayload { sub: string; iat: number; exp: number; jti: string; }

export function resolveAuthSecret(): string {
  const value = process.env.JARVIS_AUTH_SECRET || process.env.SESSION_SECRET || 'jarvis-default-development-auth-secret-key-32chars';
  return value;
}

function secret(): string {
  return resolveAuthSecret();
}

export function signAuthPayload(payload: AuthTokenPayload, signingSecret = secret()): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', signingSecret).update(`v1.${body}`).digest('base64url');
  return `v1.${body}.${signature}`;
}

export function verifyAuthToken(value: string, signingSecret = secret()): AuthTokenPayload {
  const [version, body, signature] = value.split('.');
  if (version !== 'v1' || !body || !signature) throw new AuthenticationError('Invalid signed credential.', 401, 'INVALID_CREDENTIALS');
  const expected = crypto.createHmac('sha256', signingSecret).update(`v1.${body}`).digest('base64url');
  const actualBytes = Buffer.from(signature); const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes)) throw new AuthenticationError('Invalid signed credential.', 401, 'INVALID_CREDENTIALS');
  let payload: AuthTokenPayload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { throw new AuthenticationError('Invalid signed credential.', 401, 'INVALID_CREDENTIALS'); }
  if (!payload.sub || !Number.isFinite(payload.exp) || Date.now() > payload.exp) throw new AuthenticationError('Expired or malformed credential.', 401, 'INVALID_CREDENTIALS');
  return payload;
}

export class AuthService {
  private readonly repo: IJarvisDataRepository;
  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }
  issueToken(user: { id: string }, expiresInMs = 3600000): string {
    const now = Date.now();
    return signAuthPayload({
      sub: user.id,
      iat: now,
      exp: now + expiresInMs,
      jti: `jti-${now}-${Math.random().toString(36).substring(2, 8)}`
    });
  }
  async authenticateToken(token: string): Promise<User> {
    const payload = verifyAuthToken(token);
    const user = await this.repo.users.getById(payload.sub);
    if (!user) throw new AuthenticationError('Unknown credential subject.', 401, 'INVALID_CREDENTIALS');
    return user;
  }
}
export const authService = new AuthService();
