import { authorizationPolicy } from '../../auth/authorizationPolicy.ts';
import { requirePrincipal } from '../../auth/principal.ts';
// Milestone 13: Deterministic Smart Quiz REST API Routes
import express, { type Request, type Response } from 'express';
import { jarvisData } from '../../data/index.ts';
import { smartQuizService } from './quizService.ts';
import { authenticateRequest, AuthenticationError } from '../../auth/index.ts';

export const quizRouter = express.Router();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

function handleQuizError(err: any, res: Response, fallbackCode = 'QUIZ_ERROR') {
  if (res.headersSent) return;

  if (err instanceof AuthenticationError || err.statusCode === 401 || err.code === 'UNAUTHENTICATED') {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: err.message } });
    return;
  }

  const msg = err.message || '';
  if (
    msg.includes('Unauthorized') ||
    msg.includes('Forbidden') ||
    msg.includes('Access denied') ||
    msg.includes('denied') ||
    msg.includes('not enrolled') ||
    msg.includes('Only course instructor') ||
    msg.includes('Instructor authorization') ||
    msg.includes('Only enrolled students')
  ) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: msg } });
    return;
  }

  if (msg.includes('not found') || msg.includes('does not exist')) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: msg } });
    return;
  }

  res.status(400).json({ error: { code: fallbackCode, message: msg } });
}

// 1. POST /api/classroom/quizzes - Create Quiz (Teacher)
quizRouter.post('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const {
      classId,
      classroomSessionId,
      title,
      description,
      status = 'draft',
      workspaceId = 'ws-stark-core'
    } = req.body || {};

    if (!classId || !classroomSessionId || !title) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Parameters classId, classroomSessionId, and title are required.' }
      });
      return;
    }

    const quiz = await smartQuizService.createQuiz(
      { classId, classroomSessionId, workspaceId, title, description, status },
      currentUser
    );

    res.status(201).json({ quiz });
  } catch (err: any) {
    handleQuizError(err, res, 'CREATE_QUIZ_FAILED');
  }
});

// 2. GET /api/classroom/quizzes - List Quizzes
quizRouter.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;

    // Verify workspace membership
    if (!classId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'classId is required to list quizzes.' } });
      return;
    }
    const cls = await jarvisData.education.getClassById(classId);
    const memberships: any[] = [];
    const decision = authorizationPolicy.canReadClass(res.locals.principal, cls || undefined, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not authorized for this class.' } });
      return;
    }

    const quizzes = await jarvisData.quizzes.listQuizzes({
      classId,
      sessionId,
      workspaceId,
      status
    });

    res.json({ quizzes, count: quizzes.length });
  } catch (err: any) {
    handleQuizError(err, res, 'LIST_QUIZZES_FAILED');
  }
});

// 3. GET /api/classroom/quizzes/:id - Get Quiz Details
quizRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const quiz = await jarvisData.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Quiz '${quizId}' not found.` } });
      return;
    }

    const classCheck = await smartQuizService.getPolicy().canReadActiveSession(currentUser, quiz.classId, workspaceId);
    if (!classCheck.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: classCheck.reason || 'Course access denied.' } });
      return;
    }

    const questions = await jarvisData.quizzes.listQuestions(quizId);

    // Sanitize questions for student role if quiz is not completed
    const isTeacher = currentUser.role === 'teacher' || currentUser.role === 'commander' || currentUser.role === 'admin';
    const sanitizedQuestions = questions.map((q) => {
      if (!isTeacher && q.status !== 'locked' && q.status !== 'completed') {
        const { correctOption: _hidden, ...rest } = q;
        return rest;
      }
      return q;
    });

    res.json({ quiz, questions: sanitizedQuestions });
  } catch (err: any) {
    handleQuizError(err, res, 'GET_QUIZ_FAILED');
  }
});

// 4. PUT /api/classroom/quizzes/:id - Update Quiz Title/Description
quizRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';
    const { title, description } = req.body || {};

    const quiz = await jarvisData.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Quiz '${quizId}' not found.` } });
      return;
    }

    const session = await jarvisData.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    const authCheck = await smartQuizService.getPolicy().canControlSession(currentUser, session!, workspaceId);
    if (!authCheck.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: authCheck.reason || 'Instructor authorization required.' } });
      return;
    }

    const updated = await jarvisData.quizzes.updateQuiz(quizId, {
      title: title ? title.trim() : quiz.title,
      description: description !== undefined ? description.trim() : quiz.description
    }, workspaceId);

    res.json({ quiz: updated });
  } catch (err: any) {
    handleQuizError(err, res, 'UPDATE_QUIZ_FAILED');
  }
});

// 5. DELETE /api/classroom/quizzes/:id - Delete Quiz (Teacher)
quizRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const quiz = await jarvisData.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Quiz '${quizId}' not found.` } });
      return;
    }

    const session = await jarvisData.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    const authCheck = await smartQuizService.getPolicy().canControlSession(currentUser, session!, workspaceId);
    if (!authCheck.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: authCheck.reason || 'Instructor authorization required.' } });
      return;
    }

    await jarvisData.quizzes.deleteQuiz(quizId, workspaceId);
    res.json({ ok: true, message: `Quiz '${quizId}' deleted.` });
  } catch (err: any) {
    handleQuizError(err, res, 'DELETE_QUIZ_FAILED');
  }
});

// 6. POST /api/classroom/quizzes/:id/questions - Add Question (Teacher)
quizRouter.post('/:id/questions', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const {
      questionText,
      options,
      correctOption,
      points,
      timeLimitSeconds,
      order,
      workspaceId = 'ws-stark-core'
    } = req.body || {};

    if (!questionText || !options || !correctOption) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Parameters questionText, options, and correctOption are required.' }
      });
      return;
    }

    const question = await smartQuizService.addQuestion(
      quizId,
      { questionText, options, correctOption, points, timeLimitSeconds, order },
      currentUser,
      workspaceId
    );

    res.status(201).json({ question });
  } catch (err: any) {
    handleQuizError(err, res, 'ADD_QUESTION_FAILED');
  }
});

// 7. PUT /api/classroom/quizzes/:id/questions/:questionId - Update Question (Teacher)
quizRouter.put('/:id/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const questionId = getParam(req.params.questionId);
    const { updates, workspaceId = 'ws-stark-core' } = req.body || {};

    const updated = await smartQuizService.updateQuestion(
      quizId,
      questionId,
      updates || req.body,
      currentUser,
      workspaceId
    );

    res.json({ question: updated });
  } catch (err: any) {
    handleQuizError(err, res, 'UPDATE_QUESTION_FAILED');
  }
});

// 8. DELETE /api/classroom/quizzes/:id/questions/:questionId - Remove Question (Teacher)
quizRouter.delete('/:id/questions/:questionId', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const questionId = getParam(req.params.questionId);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const ok = await smartQuizService.removeQuestion(quizId, questionId, currentUser, workspaceId);
    res.json({ ok, message: `Question '${questionId}' removed from quiz.` });
  } catch (err: any) {
    handleQuizError(err, res, 'REMOVE_QUESTION_FAILED');
  }
});

// 9. POST /api/classroom/quizzes/:id/ready - Mark Quiz as Ready (Teacher)
quizRouter.post('/:id/ready', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const quiz = await smartQuizService.readyQuiz(quizId, currentUser, workspaceId);
    res.json({ quiz, message: 'Quiz marked as READY.' });
  } catch (err: any) {
    handleQuizError(err, res, 'READY_QUIZ_FAILED');
  }
});

// 10. POST /api/classroom/quizzes/:id/start - Start Quiz (Teacher)
quizRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const result = await smartQuizService.startQuiz(quizId, currentUser, workspaceId);
    res.json({
      quiz: result.quiz,
      activeQuestion: result.activeQuestion,
      aggregate: result.aggregate,
      message: 'Quiz is now LIVE.'
    });
  } catch (err: any) {
    handleQuizError(err, res, 'START_QUIZ_FAILED');
  }
});

// 11. POST /api/classroom/quizzes/:id/questions/:questionId/start - Start Specific Question (Teacher)
quizRouter.post('/:id/questions/:questionId/start', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const questionId = getParam(req.params.questionId);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const result = await smartQuizService.startQuestion(quizId, questionId, currentUser, workspaceId);
    res.json({
      quiz: result.quiz,
      activeQuestion: result.activeQuestion,
      aggregate: result.aggregate
    });
  } catch (err: any) {
    handleQuizError(err, res, 'START_QUESTION_FAILED');
  }
});

// 12. POST /api/classroom/quizzes/:id/questions/:questionId/lock - Lock Question (Teacher)
quizRouter.post('/:id/questions/:questionId/lock', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const questionId = getParam(req.params.questionId);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const aggregate = await smartQuizService.lockQuestion(quizId, questionId, currentUser, workspaceId);
    res.json({ aggregate, message: 'Question locked.' });
  } catch (err: any) {
    handleQuizError(err, res, 'LOCK_QUESTION_FAILED');
  }
});

// 13. POST /api/classroom/quizzes/:id/advance - Advance Question (Teacher)
quizRouter.post('/:id/advance', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const result = await smartQuizService.advanceQuestion(quizId, currentUser, workspaceId);
    res.json(result);
  } catch (err: any) {
    handleQuizError(err, res, 'ADVANCE_QUESTION_FAILED');
  }
});

// 14. POST /api/classroom/quizzes/:id/pause - Pause Quiz (Teacher)
quizRouter.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const quiz = await smartQuizService.pauseQuiz(quizId, currentUser, workspaceId);
    res.json({ quiz, message: 'Quiz paused.' });
  } catch (err: any) {
    handleQuizError(err, res, 'PAUSE_QUIZ_FAILED');
  }
});

// 15. POST /api/classroom/quizzes/:id/resume - Resume Quiz (Teacher)
quizRouter.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const quiz = await smartQuizService.resumeQuiz(quizId, currentUser, workspaceId);
    res.json({ quiz, message: 'Quiz resumed.' });
  } catch (err: any) {
    handleQuizError(err, res, 'RESUME_QUIZ_FAILED');
  }
});

// 16. POST /api/classroom/quizzes/:id/complete - Complete Quiz (Teacher)
quizRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const results = await smartQuizService.completeQuiz(quizId, currentUser, workspaceId);
    res.json({ results, message: 'Quiz completed.' });
  } catch (err: any) {
    handleQuizError(err, res, 'COMPLETE_QUIZ_FAILED');
  }
});

// 17. POST /api/classroom/quizzes/:id/cancel - Cancel Quiz (Teacher)
quizRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || 'ws-stark-core';

    const quiz = await smartQuizService.cancelQuiz(quizId, currentUser, workspaceId);
    res.json({ quiz, message: 'Quiz cancelled.' });
  } catch (err: any) {
    handleQuizError(err, res, 'CANCEL_QUIZ_FAILED');
  }
});

// 18. POST /api/classroom/quizzes/:id/responses - Submit Student Response (Student Remote)
quizRouter.post('/:id/responses', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const { questionId, selectedOption, workspaceId = 'ws-stark-core' } = req.body || {};

    if (!questionId || !selectedOption) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Parameters questionId and selectedOption are required.' }
      });
      return;
    }

    const result = await smartQuizService.submitResponse(
      quizId,
      { questionId, selectedOption, workspaceId },
      currentUser
    );

    res.status(201).json({
      response: result.response,
      aggregate: result.aggregate,
      message: 'Response recorded successfully.'
    });
  } catch (err: any) {
    handleQuizError(err, res, 'SUBMIT_RESPONSE_FAILED');
  }
});

// 19. GET /api/classroom/quizzes/:id/active-question - Active Question State (Recovery / Reconnect)
quizRouter.get('/:id/active-question', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const state = await smartQuizService.getActiveQuestionState(quizId, currentUser, workspaceId);
    res.json(state);
  } catch (err: any) {
    handleQuizError(err, res, 'GET_ACTIVE_QUESTION_FAILED');
  }
});

// 20. GET /api/classroom/quizzes/:id/results - Final Results & Summary
quizRouter.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const quizId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const quiz = await jarvisData.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Quiz '${quizId}' not found.` } });
      return;
    }

    const classCheck = await smartQuizService.getPolicy().canReadActiveSession(currentUser, quiz.classId, workspaceId);
    if (!classCheck.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: classCheck.reason || 'Course access denied.' } });
      return;
    }

    const results = await smartQuizService.computeResults(quiz);
    res.json({ results });
  } catch (err: any) {
    handleQuizError(err, res, 'GET_RESULTS_FAILED');
  }
});
