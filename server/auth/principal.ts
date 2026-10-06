import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../data/types.ts';
import { jarvisData } from '../data/index.ts';
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
  // Allow downstream routers to handle SSE tickets
  if (req.path.endsWith('/stream') && req.query.ticket) {
    return next();
  }

  try {

    const user = await authenticateRequest(req);
    res.locals.principal = { userId: user.id, role: user.role, institutionId: user.institutionId, workspaceId: user.workspaceId, provenance: 'signed-hmac' };
    next();
  } catch (error: any) {
    const authError = error as AuthenticationError;
    console.log('requirePrincipal rejected:', error);
    res.status(authError.statusCode || 401).json({ error: { code: authError.code || 'UNAUTHENTICATED', message: authError.message } });
  }
}
