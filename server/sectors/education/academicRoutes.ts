// REST API Endpoints for Jarvis Education OS Integration Layer (Phase D)
import { Router, type Request, type Response } from 'express';
import { academicIntegrationService } from './academicIntegrationService.ts';
import { classSessionStore } from './classSessions/classSessionStore.ts';
import { classSessionPolicy } from './classSessions/classSessionPolicy.ts';
import { authenticateRequest } from '../../auth/index.ts';
import { jarvisData } from '../../data/index.ts';
import type { User } from '../../data/types.ts';
import type { LearningObjectType } from '../../../src/types/academicContext.ts';

export const academicIntegrationRouter = Router();

async function resolveUser(req: Request): Promise<User> {
  try {
    return await authenticateRequest(req, jarvisData);
  } catch {
    const roleHeader = (req.headers['x-user-role'] as string) || 'student';
    const userIdHeader = (req.headers['x-user-id'] as string) || (roleHeader === 'teacher' ? 'teacher-1' : 'student-1');
    const existing = await jarvisData.users.getById(userIdHeader);
    if (existing) return existing;
    return {
      id: userIdHeader,
      displayName: roleHeader === 'teacher' ? 'Dr. Helen Cho' : 'Alex Mercer',
      email: `${userIdHeader}@starkacademy.edu`,
      role: roleHeader as any,
      createdAt: new Date().toISOString()
    };
  }
}

// 1. GET /api/education/integration/context - Resolve academic context by entity
academicIntegrationRouter.get('/context', (req: Request, res: Response) => {
  const entityType = (req.query.type as LearningObjectType) || 'classSession';
  const entityId = (req.query.id as string) || 'session-phys-101';

  const context = academicIntegrationService.resolveContext(entityType, entityId);
  res.json({ context });
});

// 2. GET /api/education/integration/links - Query learning links
academicIntegrationRouter.get('/links', (req: Request, res: Response) => {
  const { sourceType, sourceId, targetType, targetId, entityType, entityId } = req.query as any;

  const links = academicIntegrationService.getLinks({
    sourceType,
    sourceId,
    targetType,
    targetId,
    entityType,
    entityId
  });
  res.json({ links, count: links.length });
});

// 3. POST /api/education/integration/links - Create learning link
academicIntegrationRouter.post('/links', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  const { workspaceId, sourceType, sourceId, targetType, targetId, relation, title, context, metadata } = req.body;

  if (!sourceType || !sourceId || !targetType || !targetId || !relation) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'sourceType, sourceId, targetType, targetId, relation required.' } });
    return;
  }

  const link = academicIntegrationService.createLink({
    workspaceId: workspaceId || 'ws-stark-core',
    sourceType,
    sourceId,
    targetType,
    targetId,
    relation,
    title,
    context,
    metadata,
    createdBy: user.id
  });

  res.status(201).json({ link });
});

// 4. DELETE /api/education/integration/links/:id - Delete learning link
academicIntegrationRouter.delete('/links/:id', (req: Request, res: Response) => {
  const success = academicIntegrationService.deleteLink(req.params.id as string);
  res.json({ success });
});

// 5. GET /api/education/integration/events - List domain events
academicIntegrationRouter.get('/events', (req: Request, res: Response) => {
  const { workspaceId, actorId, entityId, type, limit } = req.query as any;
  const events = academicIntegrationService.getEvents({
    workspaceId,
    actorId,
    entityId,
    type,
    limit: limit ? parseInt(limit, 10) : 50
  });
  res.json({ events, count: events.length });
});

// 6. POST /api/education/integration/events - Publish domain event
academicIntegrationRouter.post('/events', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  const { type, workspaceId, context, entityType, entityId, metadata } = req.body;

  if (!type || !entityType || !entityId) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'type, entityType, and entityId are required.' } });
    return;
  }

  const event = academicIntegrationService.publishEvent({
    type,
    actorId: user.id,
    workspaceId: workspaceId || 'ws-stark-core',
    context: context || { institutionId: 'inst-stark-academy' },
    entityType,
    entityId,
    metadata
  });

  res.status(201).json({ event });
});

// 7. GET /api/education/integration/notifications - User notifications
academicIntegrationRouter.get('/notifications', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  const notifications = academicIntegrationService.getNotifications(user.id);
  res.json({ notifications, count: notifications.length });
});

// 8. PATCH /api/education/integration/notifications/:id/read - Mark notification read
academicIntegrationRouter.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  const success = academicIntegrationService.markNotificationRead(req.params.id as string, user.id);
  res.json({ success });
});

// 9. GET /api/education/integration/calendar - Unified calendar feed
academicIntegrationRouter.get('/calendar', async (req: Request, res: Response) => {
  const workspaceId = (req.query.workspaceId as string) || 'ws-stark-core';
  const classId = req.query.classId as string | undefined;

  const items = await academicIntegrationService.getCalendarFeed(workspaceId, classId);
  res.json({ items, count: items.length });
});

// 10. POST /api/education/integration/sessions/:id/link-all - Teacher workflow to link approved session
academicIntegrationRouter.post('/sessions/:id/link-all', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  const sessionId = req.params.id as string;

  // Authorization check: User must be teacher or admin
  const session = await classSessionStore.getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    return;
  }

  const auth = await classSessionPolicy.canManageSession(user, session, session.workspaceId || 'ws-stark-core');
  if (!auth.allowed) {
    res.status(auth.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: auth.reason } });
    return;
  }

  try {
    const result = await academicIntegrationService.linkAllForClassSession(sessionId, user);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'INTEGRATION_ERROR', message: err.message || 'Failed to link session.' } });
  }
});

// 11. POST /api/education/integration/quizzes/results - Record structured quiz result
academicIntegrationRouter.post('/quizzes/results', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  const { quizId, quizTitle, classSessionId, lessonId, concepts, score, totalQuestions, percentage } = req.body;

  if (!quizId || score === undefined || totalQuestions === undefined) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'quizId, score, and totalQuestions are required.' } });
    return;
  }

  const result = academicIntegrationService.recordQuizResult({
    studentId: user.id,
    studentName: user.displayName,
    quizId,
    quizTitle: quizTitle || 'Formative In-Class Assessment',
    classSessionId,
    lessonId,
    concepts: concepts || ['Core Concept Review'],
    score: Number(score),
    totalQuestions: Number(totalQuestions),
    percentage: percentage !== undefined ? Number(percentage) : Math.round((Number(score) / Number(totalQuestions)) * 100),
    completed: true
  });

  res.status(201).json({ result });
});

// 12. GET /api/education/integration/quizzes/results - List quiz results
academicIntegrationRouter.get('/quizzes/results', (req: Request, res: Response) => {
  const { studentId, lessonId, quizId } = req.query as any;
  const results = academicIntegrationService.getQuizResults({ studentId, lessonId, quizId });
  res.json({ results, count: results.length });
});

// 13. POST /api/education/integration/ai-context - Build bounded AI context
academicIntegrationRouter.post('/ai-context', async (req: Request, res: Response) => {
  const user = await resolveUser(req);
  const { academicContext, activeTask } = req.body;

  const boundedContext = academicIntegrationService.buildAiContext(
    { id: user.id, role: user.role, displayName: user.displayName },
    academicContext,
    activeTask
  );

  res.json({ boundedContext });
});
