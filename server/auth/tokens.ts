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
  const value = process.env.JARVIS_AUTH_SECRET || process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return 'jarvis-default-development-auth-secret-key-32chars';
    }
    throw new Error('FATAL: Missing authentication secret in production. System fails closed.');
  }
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
  if (!value || typeof value !== 'string') throw new AuthenticationError('Missing credential.', 401, 'INVALID_CREDENTIALS');
  const [version, body, signature] = value.split('.');
  if (version !== 'v1' || !body || !signature) throw new AuthenticationError('Invalid signed credential.', 401, 'INVALID_CREDENTIALS');
  const expected = crypto.createHmac('sha256', signingSecret).update(`v1.${body}`).digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes)) {
    throw new AuthenticationError('Invalid signed credential.', 401, 'INVALID_CREDENTIALS');
  }
  let payload: AuthTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new AuthenticationError('Invalid signed credential.', 401, 'INVALID_CREDENTIALS');
  }
  if (!payload.sub || !Number.isFinite(payload.exp) || Date.now() > payload.exp) {
    throw new AuthenticationError('Expired or malformed credential.', 401, 'INVALID_CREDENTIALS');
  }
  return payload;
}

export class AuthService {
  private readonly repo: IJarvisDataRepository;
  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  async issueToken(user: User, expiresInMs = 24 * 60 * 60 * 1000): Promise<string> {
    const payload: AuthTokenPayload = {
      sub: user.id,
      iat: Date.now(),
      exp: Date.now() + expiresInMs,
      jti: crypto.randomUUID()
    };
    return signAuthPayload(payload);
  }

  async authenticateToken(token: string): Promise<User> {
    const payload = verifyAuthToken(token);
    const user = await this.repo.users.getById(payload.sub);
    if (!user) {
      throw new AuthenticationError('Unknown credential subject.', 401, 'INVALID_CREDENTIALS');
    }
    return user;
  }
}
export const authService = new AuthService();
