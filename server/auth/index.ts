// Centralized Authentication Layer (Milestone 12 & 14.2 Hardening)
import type { Request } from 'express';
import type { User } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';
import { AuthService, AuthenticationError, authService } from './tokens.ts';
import { checkPrivateAlphaAccess, getAlphaAllowlistConfig } from './alphaAllowlist.ts';
export { AuthenticationError, AuthService, authService } from './tokens.ts';
export { checkPrivateAlphaAccess, getAlphaAllowlistConfig } from './alphaAllowlist.ts';

export * from './classroomPolicy.ts';
export * from './tickets.ts';
export * from './capabilities.ts';
export * from './authRoutes.ts';

/**
 * Extracts identity tokens / user identifiers from request headers.
 * 
 * SECURITY HARDENING (Milestone 14.2):
 * - Arbitrary query parameters (such as ?userId=...) MUST NOT be treated as proof of authentication.
 * - Authenticated requests MUST use 'Authorization: Bearer <token/userId>' or verified session header.
 * - Ephemeral media streaming uses cryptographically signed playback tickets (?ticket=...).
 */
export function extractAuthToken(req: Request): string | null {
  // Credentials can be opaque signed tokens or verified session headers
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
    const parts = authHeader.trim().split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1].trim();
    }
    return authHeader.trim();
  }

  const userIdHeader = req.headers['x-user-id'];
  if (typeof userIdHeader === 'string' && userIdHeader.trim().length > 0) {
    return userIdHeader.trim();
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

  // Token payload identity is verified cryptographically and attributes are then
  // reloaded from the repository; client headers never establish authority.
  const user = await new AuthService(repo).authenticateToken(token);

  // Private Alpha access enforcement: if allowlist is active, reject unlisted accounts
  const alphaCheck = checkPrivateAlphaAccess(user);
  if (!alphaCheck.allowed) {
    throw new AuthenticationError(
      alphaCheck.reason || `Access denied: Account '${user.email || user.id}' is not authorized for this Private Alpha environment.`,
      403,
      'PRIVATE_ALPHA_RESTRICTED'
    );
  }

  return user;
}
