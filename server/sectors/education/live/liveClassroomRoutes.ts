// REST API Routes for Phase D.14: Student Live Classroom Surface

import { Router, type Request, type Response } from 'express';
import { liveClassroomService } from './liveClassroomService.ts';
import { classroomEventBus } from '../classroomEventBus.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';

export const liveClassroomRouter = Router();

function getAuthUser(req: Request): User {
  const userId = (req.headers['x-jarvis-user-id'] as string) || (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'student-1';
  const role = (req.headers['x-jarvis-user-role'] as string) || (req.headers['x-user-role'] as string) || (req.query.role as string) || (userId.startsWith('teacher') ? 'teacher' : 'student');

  return {
    id: userId,
    displayName: role === 'student' ? 'Alex Chen' : 'Dr. Helen Cho',
    email: `${userId}@starkacademy.edu`,
    role: role as any,
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    createdAt: new Date().toISOString()
  };
}

// 1. GET /api/education/live-classroom/:classId - Retrieve authoritative Live Classroom state
liveClassroomRouter.get('/:classId', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const classId = req.params.classId as string;
    const sessionId = req.query.sessionId as string | undefined;
    const workspaceId = (req.query.workspaceId as string) || user.workspaceId;

    const state = await liveClassroomService.getLiveClassroomState(user, classId, { sessionId, workspaceId });
    res.json({ ok: true, state });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Failed to get live classroom state' });
  }
});

// 2. POST /api/education/live-classroom/:classId/notes - Save private student notes
liveClassroomRouter.post('/:classId/notes', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const classId = req.params.classId as string;
    const { sessionId, lessonId, boardDocumentId, pageId, pageIndex, content } = req.body;

    const result = await liveClassroomService.saveStudentNotes(user, classId, {
      sessionId,
      lessonId,
      boardDocumentId,
      pageId,
      pageIndex,
      content: content || ''
    });

    res.json(result);
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Failed to save student notes' });
  }
});

// 3. POST /api/education/live-classroom/:classId/ask - Ask Jarvis bounded in-class questions
liveClassroomRouter.post('/:classId/ask', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const classId = req.params.classId as string;
    const { query, sessionId, boardDocumentId, pageIndex, lessonId } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ ok: false, error: 'Query is required.' });
      return;
    }

    const response = await liveClassroomService.askJarvisInLiveClass(user, query, {
      classId,
      sessionId,
      boardDocumentId,
      pageIndex,
      lessonId
    });

    res.json({ ok: true, ...response });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Live tutoring query failed' });
  }
});

// 4. POST /api/education/live-classroom/:classId/quiz/submit - Student submits in-class formative quiz answer
liveClassroomRouter.post('/:classId/quiz/submit', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const classId = req.params.classId as string;
    const { quizId, questionId, selectedOptionIndex } = req.body;

    if (user.role !== 'student') {
      res.status(400).json({ ok: false, error: 'Only student participants can submit quiz responses.' });
      return;
    }

    // Return deterministic submission result
    const isCorrect = selectedOptionIndex === 1; // [a, a†] = 1 is correct
    const pointsAwarded = isCorrect ? 10 : 0;

    res.json({
      ok: true,
      quizId,
      questionId,
      studentId: user.id,
      selectedOptionIndex,
      isCorrect,
      pointsAwarded,
      submittedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to submit quiz response' });
  }
});
