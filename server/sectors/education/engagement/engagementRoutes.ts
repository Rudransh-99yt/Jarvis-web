// JARVIS EDUCATION OS — PHASE D.5: SERVER ENGAGEMENT ROUTES (Phase P0-2 Hardened)
// Authoritative point recording, leaderboard queries, and activity feeds.

import { Router, type Request, type Response } from 'express';
import { engagementStore } from './engagementStore.ts';
import { academicIntegrationService } from '../academicIntegrationService.ts';
import { educationPolicy } from '../educationPolicy.ts';
import { familyService } from '../family/familyService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { LeaderboardScope } from '../../../../src/types/engagement.ts';

export const engagementRouter = Router();

// 1. POST /api/education/engagement/events - Record a student engagement event
engagementRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const {
      type,
      title,
      description,
      sourceEntityType,
      sourceEntityId,
      classId,
      courseCode,
      institutionId,
      metadata
    } = req.body;

    if (!type || !sourceEntityType || !sourceEntityId) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'type, sourceEntityType, and sourceEntityId are required.' }
      });
      return;
    }

    // Security: Target student ID comes strictly from req.auth for students
    let targetStudentId = user.id;
    let targetStudentName = user.displayName || 'Alex Chen';

    if (user.role === 'teacher' || user.role === 'admin' || user.role === 'commander') {
      if (req.body.studentId && typeof req.body.studentId === 'string') {
        targetStudentId = req.body.studentId;
        targetStudentName = req.body.studentName || 'Student';
      }
    }

    const recordResult = engagementStore.recordEvent({
      studentId: targetStudentId,
      studentName: targetStudentName,
      institutionId: institutionId || 'inst-stark-academy',
      classId: classId || 'class-phys-301',
      courseCode: courseCode || 'PHYS-301',
      type,
      title: title || 'Academic Activity Completed',
      description: description || 'Earned verified engagement points.',
      sourceEntityType,
      sourceEntityId,
      metadata
    });

    // Emit event to academic integration service event bus if points were awarded
    if (!recordResult.isDuplicate && recordResult.pointsAwarded > 0) {
      try {
        academicIntegrationService.publishEvent({
          type: type === 'lesson_completed' ? 'lesson.completed' : type === 'quiz_completed' ? 'quiz.completed' : 'assignment.submitted',
          actorId: targetStudentId,
          workspaceId: 'ws-stark-core',
          entityType: sourceEntityType as any,
          entityId: sourceEntityId,
          context: {
            institutionId: institutionId || 'inst-stark-academy',
            workspaceId: 'ws-stark-core',
            classId: classId || 'class-phys-301',
            courseCode: courseCode || 'PHYS-301'
          },
          metadata: {
            points: recordResult.pointsAwarded,
            eventId: recordResult.event.id
          }
        });
      } catch (_err) {
        // Event emission is non-blocking
      }
    }

    res.status(recordResult.isDuplicate ? 200 : 201).json({
      event: recordResult.event,
      isDuplicate: recordResult.isDuplicate,
      pointsAwarded: recordResult.pointsAwarded
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 2. GET /api/education/engagement/leaderboard - Get leaderboard with requested scope
engagementRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const scope = (req.query.scope as LeaderboardScope) || 'class';
    const classId = (req.query.classId as string) || 'class-phys-301';

    if (!['class', 'cohort', 'school'].includes(scope)) {
      res.status(400).json({ error: { code: 'INVALID_SCOPE', message: 'Scope must be class, cohort, or school.' } });
      return;
    }

    if (scope === 'class') {
      const accessCheck = await educationPolicy.canAccessClass(user, classId);
      if (!accessCheck.allowed) {
        res.status(accessCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: accessCheck.reason } });
        return;
      }
    }

    const entries = engagementStore.getLeaderboard(scope, classId, user.id);
    res.json({
      scope,
      classId,
      entries,
      privacyScope: engagementStore.getPrivacyScope(),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 3. GET /api/education/engagement/my-activity - Chronological activity history for student
engagementRouter.get('/my-activity', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    let targetStudentId = user.id;

    if (req.query.studentId && typeof req.query.studentId === 'string') {
      const requestedId = req.query.studentId;
      if (user.role === 'student' && requestedId !== user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Privacy Violation: Student '${user.id}' cannot query activity of student '${requestedId}'.`
          }
        });
        return;
      }
      if (user.role === 'parent') {
        const isLinked = await familyService.verifyParentChildAccess(user.id, requestedId);
        if (!isLinked) {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: `Family Boundary: Parent '${user.id}' has no linked child '${requestedId}'.`
            }
          });
          return;
        }
      }
      targetStudentId = requestedId;
    }

    const activity = engagementStore.getStudentActivity(targetStudentId);
    res.json({
      studentId: targetStudentId,
      activity,
      count: activity.length
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 4. GET /api/education/engagement/stats - Get personal overview and breakdown
engagementRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const classId = (req.query.classId as string) || 'class-phys-301';
    let targetStudentId = user.id;

    if (req.query.studentId && typeof req.query.studentId === 'string') {
      const requestedId = req.query.studentId;
      if (user.role === 'student' && requestedId !== user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Privacy Violation: Student '${user.id}' cannot query stats of student '${requestedId}'.`
          }
        });
        return;
      }
      if (user.role === 'parent') {
        const isLinked = await familyService.verifyParentChildAccess(user.id, requestedId);
        if (!isLinked) {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: `Family Boundary: Parent '${user.id}' has no linked child '${requestedId}'.`
            }
          });
          return;
        }
      }
      targetStudentId = requestedId;
    }

    const stats = engagementStore.getStudentStats(targetStudentId, classId);
    res.json({ stats });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// 5. GET /api/education/engagement/config - Transparent points rules
engagementRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    config: engagementStore.getPointsConfig(),
    privacyScope: engagementStore.getPrivacyScope()
  });
});
