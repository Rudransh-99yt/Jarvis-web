import { Router } from 'express';
import { jarvisData } from '../data/index.ts';
import { authService } from './tokens.ts';
import { requirePrincipal } from './principal.ts';

export const authRouter = Router();

authRouter.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    res.status(403).json({ error: { code: 'DEV_AUTH_DISABLED', message: 'Endpoint only available in development/test environments' } });
    return;
  }
  try {
    const { userId } = req.body;
    const user = await jarvisData.users.getById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const token = await authService.issueToken(user);
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


authRouter.get('/me', requirePrincipal, async (req, res) => {
  try {
    const principal = res.locals.principal!;
    const user = await jarvisData.users.getById(principal.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { resolveCapabilities } = await import('./capabilities.ts');
    const capabilities = resolveCapabilities(user);
    res.json({
      user,
      role: user.role,
      institution: { id: user.institutionId },
      capabilities
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});
authRouter.get('/sse-ticket', requirePrincipal, async (req, res) => {
  try {
    const principal = res.locals.principal!;
    const user = await jarvisData.users.getById(principal.userId);
    const scope = (req.query.scope as string) || 'user';
    const resourceId = (req.query.resourceId as string);
    const { ticketService } = await import('./tickets.ts');
    const params: any = { userId: user!.id, workspaceId: 'ws-stark-core' };
    if (scope === 'class') params.classId = resourceId;
    if (scope === 'session') params.sessionId = resourceId;
    const { ticket } = ticketService.createSSETicket(params);
    res.json({ ticket });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

