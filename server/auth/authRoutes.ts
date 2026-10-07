import { Router, type Request, type Response } from 'express';
import { authenticateRequest } from './index.ts';
import { resolveCapabilities } from './capabilities.ts';
import { jarvisData } from '../data/index.ts';
import { authService } from './tokens.ts';

export const authRouter = Router();

// GET /api/auth/me
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const capabilities = resolveCapabilities(user);
    res.json({
      user,
      role: user.role,
      institution: {
        id: 'inst-stark-academy',
        name: 'Stark Academy of Science & Technology'
      },
      capabilities
    });
  } catch (err: any) {
    res.status(err?.statusCode || 401).json({
      error: {
        code: err?.code || 'UNAUTHENTICATED',
        message: err?.message || 'Authentication required'
      }
    });
  }
});

// POST /api/auth/token
authRouter.post('/token', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: { code: 'INVALID_ARGUMENTS', message: 'userId is required' } });
    }
    const user = await jarvisData.users.getById(userId);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `User '${userId}' not found` } });
    }
    const token = authService.issueToken(user);
    res.json({ success: true, token, user, role: user.role });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message } });
  }
});

// POST /api/auth/dev-session
authRouter.post('/dev-session', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_AUTH) {
    return res.status(403).json({
      error: {
        code: 'DEV_AUTH_DISABLED',
        message: 'Dev session initialization is strictly disabled in production environments.'
      }
    });
  }
  try {
    const { role } = req.body || {};
    const targetRole = role || 'student';
    const roleUserMap: Record<string, string> = {
      student: 'student-1',
      teacher: 'teacher-1',
      principal: 'principal-1',
      parent: 'parent-1',
      commander: 'user-tony',
      admin: 'user-tony'
    };
    const userId = roleUserMap[targetRole] || 'student-1';
    const user = await jarvisData.users.getById(userId);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    const token = authService.issueToken(user);
    const capabilities = resolveCapabilities(user);
    res.json({
      success: true,
      token,
      user,
      role: user.role,
      capabilities
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message } });
  }
});
