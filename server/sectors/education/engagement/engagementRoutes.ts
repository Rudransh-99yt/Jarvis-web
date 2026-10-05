import { requirePrincipal } from '../../../auth/principal.ts';
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

async function resolveUser(req: Request, res: any) {
  const user = await jarvisData.users.getById(res.locals.principal!.userId);
  if (!user) throw new Error('User not found');
  return user;
}

// 1. POST /api/education/engagement/events - Record a student engagement event
engagementRouter.post('/events', async (req: Request, res: Response) => {
  const user = await resolveUser(req, res);
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
});

// 2. GET /api/education/engagement/leaderboard - Get leaderboard with requested scope
engagementRouter.get('/leaderboard', async (req: Request, res: Response) => {
  const user = await resolveUser(req, res);
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
});

// 3. GET /api/education/engagement/my-activity - Chronological activity history for student
engagementRouter.get('/my-activity', async (req: Request, res: Response) => {
  const user = await resolveUser(req, res);
  const studentId = req.query.studentId && user.role === 'teacher' ? (req.query.studentId as string) : user.id;

  const activity = engagementStore.getStudentActivity(studentId);
  res.json({
    studentId,
    activity,
    count: activity.length
  });
});

// 4. GET /api/education/engagement/stats - Get personal overview and breakdown
engagementRouter.get('/stats', async (req: Request, res: Response) => {
  const user = await resolveUser(req, res);
  const classId = (req.query.classId as string) || 'class-phys-301';
  const studentId = req.query.studentId && user.role === 'teacher' ? (req.query.studentId as string) : user.id;

  const stats = engagementStore.getStudentStats(studentId, classId);
  res.json({ stats });
});

// 5. GET /api/education/engagement/config - Transparent points rules
engagementRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    config: engagementStore.getPointsConfig(),
    privacyScope: engagementStore.getPrivacyScope()
  });
});
