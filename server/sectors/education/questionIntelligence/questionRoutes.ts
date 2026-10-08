import { Router, type Request, type Response } from 'express';
import { questionEngine } from './questionEngine.ts';
import { learnerExposureStore } from './learnerExposureStore.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import type { AuthenticatedPrincipal } from '../../../auth/principal.ts';
import type { LearnerMasteryContext, QuestionEvaluationRequest } from './types.ts';
import type { QuestionNoveltyMode } from '../../../../src/types/questionExposure.ts';

export const questionIntelligenceRouter = Router();

async function getPrincipal(req: Request, res: Response): Promise<AuthenticatedPrincipal> {
  if (res.locals.principal) return res.locals.principal;
  const user = await authenticateRequest(req);
  const principal: AuthenticatedPrincipal = {
    userId: user.id,
    role: user.role,
    institutionId: user.institutionId,
    workspaceId: user.workspaceId,
    provenance: 'signed-hmac'
  };
  res.locals.principal = principal;
  return principal;
}


/**
 * POST /api/education/question-intelligence/practice-set
 * Generates an adaptive, explainable practice set honoring learner mastery and sourceMode.
 */
questionIntelligenceRouter.post('/practice-set', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const context: LearnerMasteryContext = {
      overallMastery: typeof body.overallMastery === 'number' ? body.overallMastery : 0.65,
      conceptMastery: body.conceptMastery || { "Newton's Laws": 0.65 },
      prerequisiteMastery: body.prerequisiteMastery || { 'Mass and Inertia': 0.8, 'Vector Decomposition': 0.5 },
      recentAccuracy: typeof body.recentAccuracy === 'number' ? body.recentAccuracy : 0.7,
      recentMistakes: Array.isArray(body.recentMistakes) ? body.recentMistakes : [],
      difficultyHistory: body.difficultyHistory || { beginner: 3, intermediate: 4, advanced: 1, challenge: 0 },
      questionHistory: Array.isArray(body.questionHistory) ? body.questionHistory : [],
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.7,
      subject: body.subject || 'Physics',
      targetConcept: body.targetConcept || "Newton's Laws",
      learningObjective: body.learningObjective,
      sourceMode: body.sourceMode || 'FULL_ADAPTIVE',
      targetCount: typeof body.targetCount === 'number' ? body.targetCount : 10
    };

    const practiceSet = await questionEngine.getPracticeSet(context);
    res.json({
      success: true,
      practiceSet
    });
  } catch (err: any) {
    console.error('[QuestionIntelligence] Error generating practice set:', err);
    res.status(500).json({ error: 'Failed to generate practice set', details: err?.message });
  }
});

/**
 * POST /api/education/question-intelligence/evaluate
 * Evaluates student response and returns mastery evidence with metacognitive calibration.
 */
questionIntelligenceRouter.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    let learnerId = body.learnerId;
    if (!learnerId && req.headers.authorization) {
      try {
        const principal = await getPrincipal(req, res);
        learnerId = principal.userId;
      } catch {}
    }


    const request: QuestionEvaluationRequest = {
      questionId: body.questionId,
      learnerAnswer: body.learnerAnswer,
      timeSpentSeconds: typeof body.timeSpentSeconds === 'number' ? body.timeSpentSeconds : 30,
      learnerConfidence: typeof body.learnerConfidence === 'number' ? body.learnerConfidence : 0.7,
      previousAttempts: typeof body.previousAttempts === 'number' ? body.previousAttempts : 0,
      learnerId,
      contextId: body.contextId
    };

    const currentMastery = typeof body.currentConceptMastery === 'number' ? body.currentConceptMastery : 0.5;
    const evidence = await questionEngine.evaluateQuestion(request, currentMastery);

    res.json({
      success: true,
      evidence
    });
  } catch (err: any) {
    console.error('[QuestionIntelligence] Error evaluating question:', err);
    res.status(500).json({ error: 'Failed to evaluate question', details: err?.message });
  }
});

/**
 * GET /api/education/question-intelligence/questions
 * Look up questions by subject, concept, or difficulty
 */
questionIntelligenceRouter.get('/questions', async (req: Request, res: Response) => {
  try {
    const subject = typeof req.query.subject === 'string' ? req.query.subject : '';
    const concept = typeof req.query.concept === 'string' ? req.query.concept : '';
    const difficulty = typeof req.query.difficulty === 'string' ? (req.query.difficulty as any) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    const questions = await questionEngine.listQuestions({
      subject,
      concept,
      difficulty,
      limit
    });

    res.json({
      success: true,
      count: questions.length,
      questions
    });
  } catch (err: any) {
    console.error('[QuestionIntelligence] Error listing questions:', err);
    res.status(500).json({ error: 'Failed to list questions', details: err?.message });
  }
});

/**
 * GET /api/education/question-intelligence/providers
 * Returns registry of active question providers
 */
questionIntelligenceRouter.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = await questionEngine.getProviders();
    res.json({
      success: true,
      providers
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get providers', details: err?.message });
  }
});

/**
 * GET /api/education/question-intelligence/source-modes
 * Returns supported source modes and explanations
 */
questionIntelligenceRouter.get('/source-modes', (_req: Request, res: Response) => {
  res.json({
    success: true,
    sourceModes: questionEngine.getSourceModes()
  });
});

/**
 * POST /api/education/question-intelligence/novel-practice-set
 * Generates an adaptive practice set respecting individual learner exposure history,
 * novelty modes (NEW, MORE, REVIEW, WEAKNESS_PRACTICE, MIXED), and verified Knowledge Asset reuse.
 */
questionIntelligenceRouter.post('/novel-practice-set', async (req: Request, res: Response) => {
  try {
    const principal = await getPrincipal(req, res);
    const body = req.body || {};

    const subject = body.subject || 'Mathematics';
    const topic = body.topic || 'Quadratic Equations';
    const educationLevel = body.educationLevel || 'Class 10';
    const difficulty = body.difficulty || 'intermediate';
    const questionCount = typeof body.questionCount === 'number' ? body.questionCount : 10;
    const contextId = body.contextId || 'ctx-default';
    const noveltyMode: QuestionNoveltyMode = body.noveltyMode || 'NEW';
    const conceptMasteries = body.conceptMasteries;
    const weaknessConcepts = Array.isArray(body.weaknessConcepts) ? body.weaknessConcepts : undefined;
    const generatePdf = body.generatePdf === true;
    const sharedWithInstitution = body.sharedWithInstitution === true;

    const result = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject,
        topic,
        educationLevel,
        difficulty,
        questionCount,
        contextId,
        noveltyMode,
        conceptMasteries,
        weaknessConcepts,
        generatePdf,
        sharedWithInstitution
      },
      principal
    );

    res.json({
      success: true,
      decision: result.decision,
      noveltyResult: result.noveltyResult,
      questions: result.questions,
      practiceSet: result.practiceSet,
      pdfStorageKey: result.pdfStorageKey,
      reusedExistingAsset: result.reusedExistingAsset,
      exposureSummary: result.exposureSummary
    });
  } catch (err: any) {
    console.error('[QuestionIntelligence] Error generating novel practice set:', err);
    res.status(500).json({ error: 'Failed to generate novel practice set', details: err?.message });
  }
});

/**
 * GET /api/education/question-intelligence/exposure-summary
 * Returns aggregated exposure stats and weakness concepts for the authenticated learner.
 */
questionIntelligenceRouter.get('/exposure-summary', async (req: Request, res: Response) => {
  try {
    const principal = await getPrincipal(req, res);
    const contextId = typeof req.query.contextId === 'string' ? req.query.contextId : undefined;
    const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;

    const summary = await learnerExposureStore.getSummary(principal.userId, contextId, topic);

    res.json({
      success: true,
      summary
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve exposure summary', details: err?.message });
  }
});

/**
 * GET /api/education/question-intelligence/exposure-history
 * Returns detailed question exposure logs for the authenticated learner.
 */
questionIntelligenceRouter.get('/exposure-history', async (req: Request, res: Response) => {
  try {
    const principal = await getPrincipal(req, res);
    const contextId = typeof req.query.contextId === 'string' ? req.query.contextId : undefined;
    const topic = typeof req.query.topic === 'string' ? req.query.topic : undefined;
    const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;

    const exposures = await learnerExposureStore.getExposures(principal.userId, contextId, {
      topic,
      subject
    });

    res.json({
      success: true,
      count: exposures.length,
      exposures
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve exposure history', details: err?.message });
  }
});

/**
 * POST /api/education/question-intelligence/record-exposure
 * Records batch or single question exposure for the authenticated learner.
 */
questionIntelligenceRouter.post('/record-exposure', async (req: Request, res: Response) => {
  try {
    const principal = await getPrincipal(req, res);
    const body = req.body || {};
    const questions = Array.isArray(body.questions) ? body.questions : [];
    const contextId = body.contextId || 'ctx-default';
    const status = body.status || 'SEEN';
    const assetId = body.assetId;
    const subject = body.subject;
    const topic = body.topic;

    await learnerExposureStore.recordExposures({
      userId: principal.userId,
      contextId,
      questions,
      status,
      assetId,
      subject,
      topic
    });

    res.json({
      success: true,
      recordedCount: questions.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record question exposure', details: err?.message });
  }
});

/**
 * POST /api/education/question-intelligence/record-attempt
 * Records learner attempt and correctness evaluation for a question.
 */
questionIntelligenceRouter.post('/record-attempt', async (req: Request, res: Response) => {
  try {
    const principal = await getPrincipal(req, res);
    const body = req.body || {};

    if (!body.questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    const exposure = await learnerExposureStore.recordAttempt({
      userId: principal.userId,
      contextId: body.contextId || 'ctx-default',
      questionId: body.questionId,
      isCorrect: !!body.isCorrect,
      score: typeof body.score === 'number' ? body.score : (body.isCorrect ? 1.0 : 0.0),
      concept: body.concept,
      subject: body.subject,
      topic: body.topic,
      assetId: body.assetId
    });

    res.json({
      success: true,
      exposure
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record attempt', details: err?.message });
  }
});

/**
 * POST /api/education/question-intelligence/record-skip
 * Records that a learner explicitly skipped a question.
 */
questionIntelligenceRouter.post('/record-skip', async (req: Request, res: Response) => {
  try {
    const principal = await getPrincipal(req, res);
    const body = req.body || {};

    if (!body.questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    const exposure = await learnerExposureStore.recordSkip({
      userId: principal.userId,
      contextId: body.contextId || 'ctx-default',
      questionId: body.questionId,
      concept: body.concept,
      subject: body.subject,
      topic: body.topic,
      assetId: body.assetId
    });

    res.json({
      success: true,
      exposure
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record skip', details: err?.message });
  }
});


