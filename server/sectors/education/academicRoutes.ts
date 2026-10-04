// REST API Endpoints for Jarvis Education OS Integration Layer (Phase P0-2 Hardened)
import { Router, type Request, type Response } from 'express';
import { academicIntegrationService } from './academicIntegrationService.ts';
import { classSessionStore } from './classSessions/classSessionStore.ts';
import { classSessionPolicy } from './classSessions/classSessionPolicy.ts';
import { educationPolicy } from './educationPolicy.ts';
import { familyService } from './family/familyService.ts';
import { authenticateRequest } from '../../auth/index.ts';
import { jarvisData } from '../../data/index.ts';
import type { LearningObjectType } from '../../../src/types/academicContext.ts';

export const academicIntegrationRouter = Router();

// Helper error responder
function handleAcademicError(err: any, res: Response, fallbackCode = 'INTEGRATION_ERROR') {
  if (res.headersSent) return;
  const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.code === 'FORBIDDEN' ? 403 : 500);
  res.status(statusCode).json({
    error: {
      code: err.code || (statusCode === 401 ? 'UNAUTHENTICATED' : statusCode === 403 ? 'FORBIDDEN' : fallbackCode),
      message: err.message || 'Operation failed.'
    }
  });
}

// 1. GET /api/education/integration/context - Resolve academic context by entity
academicIntegrationRouter.get('/context', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const entityType = (req.query.type as LearningObjectType) || 'classSession';
    const entityId = (req.query.id as string) || 'session-phys-101';

    const context = academicIntegrationService.resolveContext(entityType, entityId);
    res.json({ context });
  } catch (err: any) {
    handleAcademicError(err, res, 'CONTEXT_ERROR');
  }
});

// 2. GET /api/education/integration/links - Query learning links
academicIntegrationRouter.get('/links', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
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
  } catch (err: any) {
    handleAcademicError(err, res, 'LINKS_ERROR');
  }
});

// 3. POST /api/education/integration/links - Create learning link
academicIntegrationRouter.post('/links', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { workspaceId, sourceType, sourceId, targetType, targetId, relation, title, context, metadata } = req.body;

    if (!sourceType || !sourceId || !targetType || !targetId || !relation) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'sourceType, sourceId, targetType, targetId, relation required.' } });
      return;
    }

    // Security check: only teacher/admin can create official curriculum, homework, or session links
    if (user.role === 'student') {
      if (['curriculum', 'homework'].includes(relation) || sourceType === 'classSession' || targetType === 'classSession') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Students cannot create official curriculum or teacher session links.' } });
        return;
      }
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
  } catch (err: any) {
    handleAcademicError(err, res, 'LINK_CREATE_ERROR');
  }
});

// 4. DELETE /api/education/integration/links/:id - Delete learning link
academicIntegrationRouter.delete('/links/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const success = academicIntegrationService.deleteLink(req.params.id as string, { id: user.id, role: user.role });
    if (!success) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized or link not found.' } });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    handleAcademicError(err, res, 'LINK_DELETE_ERROR');
  }
});

// 5. GET /api/education/integration/events - List domain events
academicIntegrationRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { workspaceId, actorId, entityId, type, limit } = req.query as any;

    // Student privacy: student can only query own actor events
    let effectiveActorId = actorId;
    if (user.role === 'student') {
      if (actorId && actorId !== user.id) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Students cannot query events of other actors.' } });
        return;
      }
      effectiveActorId = user.id;
    }

    const events = academicIntegrationService.getEvents({
      workspaceId,
      actorId: effectiveActorId,
      entityId,
      type,
      limit: limit ? parseInt(limit, 10) : 50
    });
    res.json({ events, count: events.length });
  } catch (err: any) {
    handleAcademicError(err, res, 'EVENTS_ERROR');
  }
});

// 6. POST /api/education/integration/events - Publish domain event
academicIntegrationRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { type, workspaceId, context, entityType, entityId, metadata } = req.body;

    if (!type || !entityType || !entityId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'type, entityType, and entityId are required.' } });
      return;
    }

    if (user.role === 'student') {
      const studentAllowedEvents = ['quiz.completed', 'focus.completed', 'assignment.submitted', 'study_group.joined'];
      if (!studentAllowedEvents.includes(type)) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: `Students cannot publish event '${type}'.` } });
        return;
      }
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
  } catch (err: any) {
    handleAcademicError(err, res, 'EVENT_PUBLISH_ERROR');
  }
});

// 7. GET /api/education/integration/notifications - User notifications (strictly req.auth.id)
academicIntegrationRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const notifications = academicIntegrationService.getNotifications(user.id);
    res.json({ notifications, count: notifications.length });
  } catch (err: any) {
    handleAcademicError(err, res, 'NOTIFICATIONS_ERROR');
  }
});

// 8. PATCH /api/education/integration/notifications/:id/read - Mark notification read
academicIntegrationRouter.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const success = academicIntegrationService.markNotificationRead(req.params.id as string, user.id);
    res.json({ success });
  } catch (err: any) {
    handleAcademicError(err, res, 'NOTIFICATION_READ_ERROR');
  }
});

// 9. GET /api/education/integration/calendar - Unified calendar feed (access checked)
academicIntegrationRouter.get('/calendar', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const workspaceId = (req.query.workspaceId as string) || 'ws-stark-core';
    const classId = req.query.classId as string | undefined;

    if (classId) {
      const check = await educationPolicy.canAccessClass(user, classId);
      if (!check.allowed) {
        res.status(check.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: check.reason } });
        return;
      }
    }

    const items = await academicIntegrationService.getCalendarFeed(workspaceId, classId);
    res.json({ items, count: items.length });
  } catch (err: any) {
    handleAcademicError(err, res, 'CALENDAR_ERROR');
  }
});

// 10. POST /api/education/integration/sessions/:id/link-all - Teacher workflow to link approved session
academicIntegrationRouter.post('/sessions/:id/link-all', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const sessionId = req.params.id as string;

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

    const result = await academicIntegrationService.linkAllForClassSession(sessionId, user);
    res.json(result);
  } catch (err: any) {
    handleAcademicError(err, res, 'LINK_ALL_ERROR');
  }
});

// 11. POST /api/education/integration/quizzes/results - Record structured quiz result
academicIntegrationRouter.post('/quizzes/results', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
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
  } catch (err: any) {
    handleAcademicError(err, res, 'RECORD_QUIZ_ERROR');
  }
});

// 12. GET /api/education/integration/quizzes/results - List quiz results (privacy & scope enforced)
academicIntegrationRouter.get('/quizzes/results', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { studentId, lessonId, quizId } = req.query as any;

    if (user.role === 'student') {
      if (studentId && studentId !== user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Privacy Violation: Student '${user.id}' cannot query quiz results for student '${studentId}'.`
          }
        });
        return;
      }
      const results = academicIntegrationService.getQuizResults({ studentId: user.id, lessonId, quizId });
      res.json({ results, count: results.length });
      return;
    }

    if (user.role === 'parent') {
      const children = await familyService.getChildrenForParent(user.id);
      const childIds = new Set(children.map((c) => c.studentId));

      if (studentId && !childIds.has(studentId)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Family Boundary: Parent '${user.id}' cannot query quiz results for unlinked student '${studentId}'.`
          }
        });
        return;
      }

      const results = academicIntegrationService.getQuizResults({ studentId, lessonId, quizId })
        .filter((r) => childIds.has(r.studentId));
      res.json({ results, count: results.length });
      return;
    }

    // Teacher / Principal / Admin
    const results = academicIntegrationService.getQuizResults({ studentId, lessonId, quizId });
    res.json({ results, count: results.length });
  } catch (err: any) {
    handleAcademicError(err, res, 'QUIZ_RESULTS_ERROR');
  }
});

// 13. POST /api/education/integration/ai-context - Build bounded AI context
academicIntegrationRouter.post('/ai-context', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { academicContext, activeTask } = req.body;

    const boundedContext = academicIntegrationService.buildAiContext(
      { id: user.id, role: user.role, displayName: user.displayName },
      academicContext,
      activeTask
    );

    res.json({ boundedContext });
  } catch (err: any) {
    handleAcademicError(err, res, 'AI_CONTEXT_ERROR');
  }
});
