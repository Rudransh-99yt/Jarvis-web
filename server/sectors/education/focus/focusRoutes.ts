import { requirePrincipal } from '../../../auth/principal.ts';
// REST API Routes for Pro Focus / Pomodoro + Focus Lock Engine
import { Router, type Request, type Response } from 'express';
import { focusStore } from './focusStore.ts';
import { FocusPolicyEngine } from './focusPolicy.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User, UserRole } from '../../../data/types.ts';

export const focusRouter = Router();


async function resolveUser(req: Request, res: any) {
  const user = await jarvisData.users.getById(res.locals.principal!.userId);
  if (!user) throw new Error('User not found');
  if (user.role !== 'student') {
    const error: any = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    error.statusCode = 403;
    throw error;
  }
  return user;
}


// 1. GET /api/education/focus/active - Get active session
focusRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const session = await focusStore.getActiveSession(user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 2. POST /api/education/focus/sessions - Create/draft session
focusRouter.post('/sessions', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const session = await focusStore.createSession(req.body, user);
    res.status(201).json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 3. POST /api/education/focus/sessions/:id/start - Start session
focusRouter.post('/sessions/:id/start', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const session = await focusStore.startSession(req.params.id as string, user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 4. POST /api/education/focus/sessions/:id/pause - Pause session
focusRouter.post('/sessions/:id/pause', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const session = await focusStore.pauseSession(req.params.id as string, user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 5. POST /api/education/focus/sessions/:id/resume - Resume session
focusRouter.post('/sessions/:id/resume', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const session = await focusStore.resumeSession(req.params.id as string, user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 6. POST /api/education/focus/sessions/:id/break - Start break
focusRouter.post('/sessions/:id/break', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const { breakType } = req.body;
    const session = await focusStore.startBreak(req.params.id as string, breakType || 'short', user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 7. POST /api/education/focus/sessions/:id/skip-break - Skip break
focusRouter.post('/sessions/:id/skip-break', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const session = await focusStore.skipBreak(req.params.id as string, user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 8. POST /api/education/focus/sessions/:id/complete - Complete session
focusRouter.post('/sessions/:id/complete', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const session = await focusStore.completeSession(req.params.id as string, user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 9. POST /api/education/focus/sessions/:id/cancel - Emergency exit / Cancel
focusRouter.post('/sessions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const { reason } = req.body;
    const session = await focusStore.cancelSession(req.params.id as string, reason || 'User requested exit', user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 10. POST /api/education/focus/sessions/:id/notes - Update notes
focusRouter.post('/sessions/:id/notes', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const { notes } = req.body;
    const session = await focusStore.updateNotes(req.params.id as string, notes || '', user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 11. POST /api/education/focus/sessions/:id/tasks - Update tasks
focusRouter.post('/sessions/:id/tasks', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const { tasks } = req.body;
    const session = await focusStore.updateTasks(req.params.id as string, tasks || [], user.id);
    res.json({ session });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: { code: err.code || 'ACTION_FAILED', message: err.message } });
  }
});

// 12. POST /api/education/focus/sessions/:id/evaluate-navigation - Navigation guard
focusRouter.post('/sessions/:id/evaluate-navigation', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const { targetRoute, targetCourseId, targetWorkspacePageId } = req.body;
    const session = await focusStore.getActiveSession(user.id);

    const evalResult = FocusPolicyEngine.evaluateNavigation(
      session,
      targetRoute,
      targetCourseId,
      targetWorkspacePageId
    );

    if (!evalResult.allowed && session) {
      focusStore.recordEvent(session.id, user.id, 'focus.route.blocked', {
        targetRoute,
        reason: evalResult.reason
      });
    }

    res.json(evalResult);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 13. GET /api/education/focus/statistics - Analytics
focusRouter.get('/statistics', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const stats = await focusStore.getStatistics(user.id);
    res.json({ statistics: stats });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 14. GET /api/education/focus/events - History
focusRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req, res);
    const { sessionId } = req.query;
    const events = await focusStore.getEvents(user.id, sessionId as string);
    res.json({ events });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});
