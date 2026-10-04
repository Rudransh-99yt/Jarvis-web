// JARVIS EDUCATION OS — PHASE D.6: TEACHER ROUTES (Phase P0-2 Hardened)
// Exposes Action Queue, Student Attention Signals, Post-Class Review, and Class Intelligence.

import { Router, type Request, type Response } from 'express';
import { teacherService } from './teacherService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import { educationPolicy } from '../educationPolicy.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';
import type { User } from '../../../data/types.ts';

export const teacherRouter = Router();

// Middleware: Require Teacher or Leadership
async function requireTeacherOrLeadership(req: Request): Promise<User> {
  const user = await authenticateRequest(req, jarvisData);
  if (user.role !== 'teacher' && user.role !== 'principal' && user.role !== 'admin' && user.role !== 'commander') {
    const err: any = new Error(`Access Forbidden: User '${user.id}' with role '${user.role}' is not authorized for teacher OS.`);
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  return user;
}

// 1. GET /api/education/teacher/action-queue - Aggregated priority queue for authenticated instructor
teacherRouter.get('/action-queue', async (req: Request, res: Response) => {
  try {
    const user = await requireTeacherOrLeadership(req);
    const queue = teacherService.getActionQueue(user.id);
    res.json({ queue, count: queue.length });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.code === 'FORBIDDEN' ? 403 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 2. GET /api/education/teacher/attention - Evidence-backed student attention signals
teacherRouter.get('/attention', async (req: Request, res: Response) => {
  try {
    const user = await requireTeacherOrLeadership(req);
    const classId = req.query.classId as string | undefined;

    if (classId) {
      const check = await educationPolicy.canAccessClass(user, classId);
      if (!check.allowed) {
        res.status(check.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: check.reason } });
        return;
      }
    }

    const signals = teacherService.getAttentionSignals(user.id, classId);
    res.json({ signals, count: signals.length });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.code === 'FORBIDDEN' ? 403 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 3. GET /api/education/teacher/post-class-review - Evidence-based post-class review
teacherRouter.get('/post-class-review', async (req: Request, res: Response) => {
  try {
    const user = await requireTeacherOrLeadership(req);
    const sessionId = (req.query.sessionId as string) || 'session-phys-101';

    const session = await classSessionStore.getSession(sessionId);
    if (session) {
      const check = await educationPolicy.canAccessClass(user, session.classId);
      if (!check.allowed) {
        res.status(check.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: check.reason } });
        return;
      }
    }

    const report = teacherService.getPostClassReview(sessionId);
    res.json({ report });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.code === 'FORBIDDEN' ? 403 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 4. GET /api/education/teacher/class-intelligence/:classId - Class intelligence
teacherRouter.get('/class-intelligence/:classId', async (req: Request, res: Response) => {
  try {
    const user = await requireTeacherOrLeadership(req);
    const classId = req.params.classId as string;

    const check = await educationPolicy.canAccessClass(user, classId);
    if (!check.allowed) {
      res.status(check.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: check.reason } });
      return;
    }

    const intelligence = teacherService.getClassIntelligence(classId);
    res.json({ intelligence });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.code === 'FORBIDDEN' ? 403 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});
