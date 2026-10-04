// Cryptographic Token & Server-Verified Identity Engine (Phase P0-1 Hardening)
import crypto from 'node:crypto';
import type { User, UserRole } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';

// Ephemeral or environment-backed secret for HMAC-SHA256 token signing
function resolveAuthSecret(): string {
  if (process.env.JARVIS_AUTH_SECRET) return process.env.JARVIS_AUTH_SECRET;
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    // Generate secure random runtime key in production if no secret was supplied
    return crypto.randomBytes(32).toString('hex');
  }
  return 'jarvis-secure-auth-secret-key-2026';
}

const AUTH_SECRET = resolveAuthSecret();

export interface AuthTokenPayload {
  sub: string;            // Authenticated user ID
  role: UserRole;         // User role
  email: string;          // User email
  displayName: string;    // Display name
  department?: string;    // User department
  iat: number;            // Issued-at (epoch ms)
  exp: number;            // Expires-at (epoch ms)
  jti: string;            // Unique token identifier
  isDev?: boolean;        // Explicit development flag
}

export interface AuthPrincipal {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt: string;
}

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

/**
 * Signs a payload into a verifiable compact token: `v1.<base64url(payload)>.<base64url(signature)>`
 */
export function signAuthPayload(payload: AuthTokenPayload, secret: string = AUTH_SECRET): string {
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`v1.${dataB64}`)
    .digest('base64url');
  return `v1.${dataB64}.${signature}`;
}

/**
 * Verifies a compact token, checks HMAC cryptographic integrity and expiration.
 */
export function verifyAuthToken(tokenString: string, secret: string = AUTH_SECRET): AuthTokenPayload {
  if (!tokenString || typeof tokenString !== 'string') {
    throw new AuthenticationError('Authentication failed: Missing token.', 401, 'INVALID_CREDENTIALS');
  }

  const parts = tokenString.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new AuthenticationError(
      'Authentication failed: Invalid credential format. Raw user identifiers are not valid credentials.',
      401,
      'INVALID_CREDENTIALS'
    );
  }

  const [version, dataB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${version}.${dataB64}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new AuthenticationError(
      'Authentication failed: Cryptographic signature verification failed (tampered credential).',
      401,
      'INVALID_SIGNATURE'
    );
  }

  let payload: AuthTokenPayload;
  try {
    const jsonStr = Buffer.from(dataB64, 'base64url').toString('utf8');
    payload = JSON.parse(jsonStr) as AuthTokenPayload;
  } catch {
    throw new AuthenticationError('Authentication failed: Corrupted token payload.', 401, 'CORRUPTED_CREDENTIALS');
  }

  // Validate payload fields
  if (!payload.sub || typeof payload.sub !== 'string' || !payload.exp || typeof payload.exp !== 'number') {
    throw new AuthenticationError('Authentication failed: Incomplete token payload.', 401, 'MALFORMED_PAYLOAD');
  }

  // Check expiration
  if (Date.now() > payload.exp) {
    throw new AuthenticationError(
      `Authentication failed: Credential expired at ${new Date(payload.exp).toISOString()}.`,
      401,
      'EXPIRED_CREDENTIALS'
    );
  }

  return payload;
}

export class AuthService {
  private repo: IJarvisDataRepository;
  private secret: string;

  constructor(repo: IJarvisDataRepository = jarvisData, secret: string = AUTH_SECRET) {
    this.repo = repo;
    this.secret = secret;
  }

  /**
   * Issues a signed credential for a verified user.
   */
  public issueToken(
    user: User,
    options?: { expiresInMs?: number; isDev?: boolean }
  ): string {
    const now = Date.now();
    const expiresInMs = options?.expiresInMs ?? 24 * 60 * 60 * 1000; // 24 hours default
    const payload: AuthTokenPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      department: user.department,
      iat: now,
      exp: now + expiresInMs,
      jti: `tok-${now}-${crypto.randomBytes(8).toString('hex')}`,
      isDev: options?.isDev ?? false
    };

    return signAuthPayload(payload, this.secret);
  }

  /**
   * Authenticates a token against the repository.
   * Derives role and attributes STRICTLY from the authoritative user database record.
   */
  public async authenticateToken(tokenString: string): Promise<User> {
    const payload = verifyAuthToken(tokenString, this.secret);

    // Look up the user in the trusted persistent database
    const user = await this.repo.users.getById(payload.sub);
    if (!user) {
      throw new AuthenticationError(
        `Authentication failed: Subject '${payload.sub}' is not a registered user in this system.`,
        401,
        'INVALID_CREDENTIALS'
      );
    }

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role, // Always server-authoritative
      department: user.department,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt
    };
  }
}

export const authService = new AuthService();
