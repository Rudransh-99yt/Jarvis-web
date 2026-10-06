import type { Request } from 'express';
import type { User } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';
import { AuthService, AuthenticationError } from './tokens.ts';
export * from './tokens.ts';
export * from './capabilities.ts';
export * from './principal.ts';
export * from './classroomPolicy.ts';
export * from './tickets.ts';

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
    const parts = authHeader.trim().split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1].trim();
    }
    return authHeader.trim();
  }
  return null;
}

export async function authenticateRequest(
  req: Request,
  repo: IJarvisDataRepository = jarvisData
): Promise<User> {
  const token = extractAuthToken(req);

  if (!token) {
    throw new AuthenticationError('Authentication required: Missing credentials.', 401, 'UNAUTHENTICATED');
  }

  return new AuthService(repo).authenticateToken(token);
}
