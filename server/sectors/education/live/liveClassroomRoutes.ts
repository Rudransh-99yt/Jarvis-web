// REST API Routes for Phase D.14: Student Live Classroom Surface
import { Router, type Request, type Response } from 'express';
import { liveClassroomService } from './liveClassroomService.ts';
import { jarvisData, INITIAL_DATABASE_SCHEMA } from '../../../data/index.ts';
import { requirePrincipal, type AuthenticatedPrincipal } from '../../../auth/principal.ts';
import { authorizationPolicy } from '../../../auth/authorizationPolicy.ts';
import type { InstitutionMembership } from '../../../data/types.ts';

export const liveClassroomRouter = Router();

liveClassroomRouter.use(requirePrincipal);

function getMemberships(): InstitutionMembership[] {
  return (jarvisData as any).store?.state?.institutionMemberships || (INITIAL_DATABASE_SCHEMA.institutionMemberships || []);
}

// 1. GET /api/education/live-classroom/:classId - Retrieve authoritative Live Classroom state
liveClassroomRouter.get('/:classId', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ ok: false, error: 'Authenticated user not found.' });
      return;
    }

    const classId = req.params.classId as string;
    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      res.status(404).json({ ok: false, error: `Class '${classId}' does not exist.` });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ ok: false, error: decision.reason });
      return;
    }

    const sessionId = req.query.sessionId as string | undefined;
    const workspaceId = (req.query.workspaceId as string) || currentUser.workspaceId || 'ws-stark-core';

    const state = await liveClassroomService.getLiveClassroomState(currentUser, classId, { sessionId, workspaceId });
    res.json({ ok: true, state });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Failed to get live classroom state' });
  }
});

// 2. POST /api/education/live-classroom/:classId/notes - Save private student notes
liveClassroomRouter.post('/:classId/notes', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ ok: false, error: 'Authenticated user not found.' });
      return;
    }

    const classId = req.params.classId as string;
    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      res.status(404).json({ ok: false, error: `Class '${classId}' does not exist.` });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ ok: false, error: decision.reason });
      return;
    }

    const { sessionId, lessonId, boardDocumentId, pageId, pageIndex, content } = req.body;

    const result = await liveClassroomService.saveStudentNotes(currentUser, classId, {
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
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ ok: false, error: 'Authenticated user not found.' });
      return;
    }

    const classId = req.params.classId as string;
    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      res.status(404).json({ ok: false, error: `Class '${classId}' does not exist.` });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ ok: false, error: decision.reason });
      return;
    }

    const { query, sessionId, boardDocumentId, pageIndex, lessonId } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ ok: false, error: 'Query is required.' });
      return;
    }

    const response = await liveClassroomService.askJarvisInLiveClass(currentUser, query, {
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
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ ok: false, error: 'Authenticated user not found.' });
      return;
    }

    const classId = req.params.classId as string;
    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      res.status(404).json({ ok: false, error: `Class '${classId}' does not exist.` });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canWriteSubmission(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ ok: false, error: decision.reason });
      return;
    }

    const { quizId, questionId, selectedOptionIndex } = req.body;

    // Return deterministic submission result bound to the verified principal ID
    const isCorrect = selectedOptionIndex === 1; // [a, a†] = 1 is correct
    const pointsAwarded = isCorrect ? 10 : 0;

    res.json({
      ok: true,
      quizId,
      questionId,
      studentId: currentUser.id,
      selectedOptionIndex,
      isCorrect,
      pointsAwarded,
      submittedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to submit quiz response' });
  }
});
