import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../data/types.ts';
import { authenticateRequest, AuthenticationError } from './index.ts';

export interface AuthenticatedPrincipal {
  userId: string;
  role: UserRole;
  institutionId?: string;
  workspaceId?: string;
  provenance: 'signed-hmac';
}

declare global { namespace Express { interface Locals { principal?: AuthenticatedPrincipal; } } }

export async function requirePrincipal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authenticateRequest(req);
    res.locals.principal = { userId: user.id, role: user.role, institutionId: user.institutionId, workspaceId: user.workspaceId, provenance: 'signed-hmac' };
    next();
  } catch (error: any) {
    const authError = error as AuthenticationError;
    res.status(authError.statusCode || 401).json({ error: { code: authError.code || 'UNAUTHENTICATED', message: authError.message } });
  }
}
