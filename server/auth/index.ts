// Centralized Authentication Layer (Phase P0-1 Hardening)
import type { Request, Response, NextFunction } from 'express';
import type { User } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';
import { authService, AuthenticationError } from './tokens.ts';

export * from './classroomPolicy.ts';
export * from './tickets.ts';
export * from './tokens.ts';

/**
 * Extracts signed authorization credentials from request headers.
 *
 * SECURITY HARDENING (Phase P0-1):
 * - Raw user identifiers (e.g. 'student-1', 'teacher-1', 'principal-1') are NEVER valid credentials.
 * - 'x-user-id' is REMOVED as an authentication mechanism.
 * - Credentials MUST be signed tokens supplied via 'Authorization: Bearer <signed_token>'
 *   or 'x-auth-token: <signed_token>'.
 */
export function extractAuthToken(req: Request): string | null {
  // 1. Authorization header: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
    const parts = authHeader.trim().split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1].trim();
    }
    return authHeader.trim();
  }

  // 2. Custom token header: x-auth-token (must be a valid token string)
  const xAuthToken = req.headers['x-auth-token'];
  if (typeof xAuthToken === 'string' && xAuthToken.trim().length > 0) {
    return xAuthToken.trim();
  }

  return null;
}

/**
 * Authenticates the incoming request against server-signed credentials and the trusted database.
 *
 * HARDENING RULES (Phase P0-1):
 * 1. Deny by default: If no credentials provided, rejects immediately with 401 UNAUTHENTICATED.
 * 2. Cryptographic verification: Validates token HMAC signature and expiration.
 * 3. Identity verification: Resolves user from trusted database using token subject (`sub`).
 * 4. Never trust client-supplied 'x-user-role', 'x-user-id', or body fields; the role is ALWAYS server-authoritative.
 * 5. Attaches trusted principal to `req.auth`.
 */
export async function authenticateRequest(
  req: Request,
  repo: IJarvisDataRepository = jarvisData
): Promise<User> {
  const token = extractAuthToken(req);

  if (!token) {
    throw new AuthenticationError('Authentication required: Missing credentials.', 401, 'UNAUTHENTICATED');
  }

  // Authenticate token cryptographically and verify against user database
  const user = await authService.authenticateToken(token);

  // Attach verified principal to request object
  (req as any).auth = user;

  return user;
}

/**
 * Express middleware to strictly require verified authentication.
 */
export function requireAuth(repo: IJarvisDataRepository = jarvisData) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authenticateRequest(req, repo);
      (req as any).auth = user;
      next();
    } catch (err: any) {
      const statusCode = err.statusCode || 401;
      const code = err.code || 'UNAUTHENTICATED';
      res.status(statusCode).json({
        error: {
          code,
          message: err.message || 'Authentication required.'
        }
      });
    }
  };
}
