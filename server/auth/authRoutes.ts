// Authentication & Session Endpoints (Phase P0-1 Hardening)
import { Router, type Request, type Response } from 'express';
import { jarvisData } from '../data/index.ts';
import { authService, authenticateRequest, AuthenticationError } from './index.ts';

export const authRouter = Router();

/**
 * Checks whether development authentication mode is allowed.
 * Strictly disabled in production unless ALLOW_DEV_AUTH='true' is explicitly set.
 */
function isDevAuthAllowed(): boolean {
  if (process.env.ALLOW_DEV_AUTH === 'true') return true;
  if (process.env.NODE_ENV === 'production') return false;
  return true; // Default allow in non-production local/test environment
}

// 1. POST /api/auth/dev-session - Secure development/demo identity session issuer
authRouter.post('/dev-session', async (req: Request, res: Response) => {
  try {
    if (!isDevAuthAllowed()) {
      res.status(403).json({
        error: {
          code: 'DEV_AUTH_DISABLED',
          message: 'Development authentication is strictly disabled in production mode.'
        }
      });
      return;
    }

    const { userId, role } = req.body || {};
    let targetUser = null;

    if (userId && typeof userId === 'string') {
      targetUser = await jarvisData.users.getById(userId.trim());
    } else if (role && typeof role === 'string') {
      const allUsers = await jarvisData.users.list();
      targetUser = allUsers.find((u: any) => u.role === role.trim()) || null;
    }

    if (!targetUser) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: `Demo user matching ${userId ? `id '${userId}'` : `role '${role}'`} was not found.`
        }
      });
      return;
    }

    // Issue genuine, cryptographically signed development token
    const token = authService.issueToken(targetUser, {
      expiresInMs: 24 * 60 * 60 * 1000,
      isDev: true
    });

    res.json({
      token,
      user: {
        id: targetUser.id,
        displayName: targetUser.displayName,
        email: targetUser.email,
        role: targetUser.role,
        department: targetUser.department
      },
      expiresIn: 24 * 60 * 60 * 1000
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 2. GET /api/auth/me - Retrieve current verified authenticated user principal
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    res.json({ user });
  } catch (err: any) {
    const statusCode = err.statusCode || 401;
    res.status(statusCode).json({
      error: {
        code: err.code || 'UNAUTHENTICATED',
        message: err.message
      }
    });
  }
});

// 3. POST /api/auth/verify - Verify credential validity
authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    res.json({ valid: true, user });
  } catch (err: any) {
    const statusCode = err.statusCode || 401;
    res.status(statusCode).json({
      valid: false,
      error: {
        code: err.code || 'INVALID_CREDENTIALS',
        message: err.message
      }
    });
  }
});
