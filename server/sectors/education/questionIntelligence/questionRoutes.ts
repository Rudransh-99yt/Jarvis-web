import { Router, type Request, type Response } from 'express';
import { questionEngine } from './questionEngine.ts';
import type { LearnerMasteryContext, QuestionEvaluationRequest } from './types.ts';

export const questionIntelligenceRouter = Router();

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

    const request: QuestionEvaluationRequest = {
      questionId: body.questionId,
      learnerAnswer: body.learnerAnswer,
      timeSpentSeconds: typeof body.timeSpentSeconds === 'number' ? body.timeSpentSeconds : 30,
      learnerConfidence: typeof body.learnerConfidence === 'number' ? body.learnerConfidence : 0.7,
      previousAttempts: typeof body.previousAttempts === 'number' ? body.previousAttempts : 0
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
