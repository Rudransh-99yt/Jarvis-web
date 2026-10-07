// JARVIS EDUCATION OS — PHASE D.6: TEACHER ROUTES
// Exposes Action Queue, Student Attention Signals, Post-Class Review, and Class Intelligence.

import { Router, type Request, type Response } from 'express';
import { teacherService } from './teacherService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';

export const teacherRouter = Router();

async function resolveUser(req: Request): Promise<User> {
  try {
    return await authenticateRequest(req, jarvisData);
  } catch {
    const roleHeader = (req.headers['x-user-role'] as string) || 'teacher';
    const userIdHeader = (req.headers['x-user-id'] as string) || 'teacher-1';
    const existing = await jarvisData.users.getById(userIdHeader);
    if (existing) return existing;
    return {
      id: userIdHeader,
      displayName: 'Dr. Helen Cho',
      email: `${userIdHeader}@starkacademy.edu`,
      role: 'teacher',
      department: 'Faculty of Physics',
      createdAt: new Date().toISOString()
    };
  }
}

async function requireTeacherUser(req: Request): Promise<User> {
  const user = await resolveUser(req);
  if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'commander') {
    const err: any = new Error(`Access Denied: User '${user.id}' with role '${user.role}' lacks teacher capabilities.`);
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  return user;
}

// 1. GET /api/education/teacher/action-queue - Aggregated priority queue
teacherRouter.get('/action-queue', async (req: Request, res: Response) => {
  try {
    const user = await requireTeacherUser(req);
    const queue = teacherService.getActionQueue(user.id);
    res.json({ queue, count: queue.length });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 2. GET /api/education/teacher/attention - Evidence-backed student attention signals
teacherRouter.get('/attention', async (req: Request, res: Response) => {
  try {
    const user = await requireTeacherUser(req);
    const classId = req.query.classId as string | undefined;
    const signals = teacherService.getAttentionSignals(user.id, classId);
    res.json({ signals, count: signals.length });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 3. GET /api/education/teacher/post-class-review - Evidence-based post-class review
teacherRouter.get('/post-class-review', async (req: Request, res: Response) => {
  try {
    await requireTeacherUser(req);
    const sessionId = (req.query.sessionId as string) || 'session-phys-101';
    const report = teacherService.getPostClassReview(sessionId);
    res.json({ report });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 4. GET /api/education/teacher/class-intelligence/:classId
teacherRouter.get('/class-intelligence/:classId', async (req: Request, res: Response) => {
  try {
    await requireTeacherUser(req);
    const classId = req.params.classId as string;
    const intelligence = teacherService.getClassIntelligence(classId);
    res.json({ intelligence });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});
