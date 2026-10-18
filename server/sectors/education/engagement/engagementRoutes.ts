// JARVIS EDUCATION OS — PHASE D.5: SERVER ENGAGEMENT ROUTES
// Authoritative point recording, leaderboard queries, and activity feeds.

import { Router, type Request, type Response } from 'express';
import { engagementStore } from './engagementStore.ts';
import { academicIntegrationService } from '../academicIntegrationService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';
import type { LeaderboardScope } from '../../../../src/types/engagement.ts';

export const engagementRouter = Router();

async function resolveUser(req: Request): Promise<User> {
  return authenticateRequest(req, jarvisData);
}

function handleEngagementError(err: any, res: Response, fallback = 'Operation failed') {
  const isUnauth = err.statusCode === 401 || err.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
  const isForbidden = err.statusCode === 403 || err.code === 'FORBIDDEN' || err.message?.includes('Forbidden');
  const status = isUnauth ? 401 : isForbidden ? 403 : (err.statusCode || 500);
  res.status(status).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : (err.code || 'SERVER_ERROR'), message: err.message || fallback } });
}

// 1. POST /api/education/engagement/events - Record a student engagement event
engagementRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
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

    // Security: Students cannot award points to arbitrary user accounts
    const targetStudentId = user.role === 'teacher' && req.body.studentId ? req.body.studentId : user.id;
    const targetStudentName = user.role === 'teacher' && req.body.studentName ? req.body.studentName : (user.displayName || 'Alex Chen');

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
    handleEngagementError(err, res, 'Failed to record engagement event.');
  }
});

// 2. GET /api/education/engagement/leaderboard - Get leaderboard with requested scope
engagementRouter.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const scope = (req.query.scope as LeaderboardScope) || 'class';
    const classId = (req.query.classId as string) || 'class-phys-301';

    // Authorization check on scope
    if (!['class', 'cohort', 'school'].includes(scope)) {
      res.status(400).json({ error: { code: 'INVALID_SCOPE', message: 'Scope must be class, cohort, or school.' } });
      return;
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
    handleEngagementError(err, res, 'Failed to get leaderboard.');
  }
});

// 3. GET /api/education/engagement/my-activity - Chronological activity history for student
engagementRouter.get('/my-activity', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const studentId = req.query.studentId && user.role === 'teacher' ? (req.query.studentId as string) : user.id;

    const activity = engagementStore.getStudentActivity(studentId);
    res.json({
      studentId,
      activity,
      count: activity.length
    });
  } catch (err: any) {
    handleEngagementError(err, res, 'Failed to get student activity.');
  }
});

// 4. GET /api/education/engagement/stats - Get personal overview and breakdown
engagementRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const classId = (req.query.classId as string) || 'class-phys-301';
    const studentId = req.query.studentId && user.role === 'teacher' ? (req.query.studentId as string) : user.id;

    const stats = engagementStore.getStudentStats(studentId, classId);
    res.json({ stats });
  } catch (err: any) {
    handleEngagementError(err, res, 'Failed to get stats.');
  }
});

// 5. GET /api/education/engagement/config - Transparent points rules
engagementRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    config: engagementStore.getPointsConfig(),
    privacyScope: engagementStore.getPrivacyScope()
  });
});
