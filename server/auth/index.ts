// Centralized Authentication Layer (Milestone 12 & 14.2 Hardening)
import type { Request } from 'express';
import type { User } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';

export * from './classroomPolicy.ts';
export * from './tickets.ts';

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
 * Extracts identity tokens / user identifiers from request headers.
 * 
 * SECURITY HARDENING (Milestone 14.2):
 * - Arbitrary query parameters (such as ?userId=...) MUST NOT be treated as proof of authentication.
 * - Authenticated requests MUST use 'Authorization: Bearer <token/userId>' or verified session header.
 * - Ephemeral media streaming uses cryptographically signed playback tickets (?ticket=...).
 */
export function extractAuthToken(req: Request): string | null {
  // 1. Authorization header: "Bearer <token/userId>"
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
    const parts = authHeader.trim().split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1].trim();
    }
    return authHeader.trim();
  }

  // 2. Custom header: x-user-id
  const xUserId = req.headers['x-user-id'];
  if (typeof xUserId === 'string' && xUserId.trim().length > 0) {
    return xUserId.trim();
  }

  // 3. Custom token header: x-auth-token
  const xAuthToken = req.headers['x-auth-token'];
  if (typeof xAuthToken === 'string' && xAuthToken.trim().length > 0) {
    return xAuthToken.trim();
  }

  return null;
}

/**
 * Authenticates the incoming request against the trusted database.
 * 
 * HARDENING RULES:
 * 1. Deny by default: If no credentials provided, rejects immediately with 401.
 * 2. Never default to 'teacher-1' or any arbitrary identity.
 * 3. Never trust client-supplied 'x-user-role' or body role; the role is ALWAYS taken from the database record.
 * 4. Never synthesize unknown users on the fly.
 * 5. If user is not found in database, rejects immediately with 401.
 */
export async function authenticateRequest(
  req: Request,
  repo: IJarvisDataRepository = jarvisData
): Promise<User> {
  const token = extractAuthToken(req);

  if (!token) {
    throw new AuthenticationError('Authentication required: Missing credentials.', 401, 'UNAUTHENTICATED');
  }

  // Verify that the user actually exists in the persistent user repository
  const user = await repo.users.getById(token);
  if (!user) {
    throw new AuthenticationError(
      `Authentication failed: Identity '${token}' is not a recognized or registered user.`,
      401,
      'INVALID_CREDENTIALS'
    );
  }

  // Strict: role MUST come from the trusted database record, never client headers
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    department: user.department,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt
  };
}
