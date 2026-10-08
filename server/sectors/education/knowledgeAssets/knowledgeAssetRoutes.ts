import { Router, type Request, type Response } from 'express';
import { requirePrincipal, type AuthenticatedPrincipal } from '../../../auth/principal.ts';
import { knowledgeAssetStore } from './knowledgeAssetStore.ts';
import { reuseDecisionEngine } from './reuseDecisionEngine.ts';
import { artifactRegistrationService } from './artifactRegistrationService.ts';
import { questionEngine } from '../questionIntelligence/questionEngine.ts';
import { storageManager } from '../../../storage/providerManager.ts';
import type { QuestionSetReuseRequest, AssetSearchCriteria } from '../../../../src/types/knowledgeAsset.ts';
import type { LearnerMasteryContext } from '../../../../src/types/questionIntelligence.ts';

export const knowledgeAssetRouter = Router();

// Mount mandatory authentication: every endpoint enforces authenticated principal
knowledgeAssetRouter.use(requirePrincipal);

/**
 * GET /api/education/knowledge-assets
 * Search and retrieve accessible knowledge assets for the authenticated principal
 */
knowledgeAssetRouter.get('/', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const query = req.query;

    const criteria: AssetSearchCriteria = {
      subject: typeof query.subject === 'string' ? query.subject : undefined,
      topic: typeof query.topic === 'string' ? query.topic : undefined,
      educationLevel: typeof query.educationLevel === 'string' ? query.educationLevel : undefined,
      difficulty: typeof query.difficulty === 'string' ? query.difficulty : undefined,
      assetType: typeof query.assetType === 'string' ? (query.assetType as any) : undefined,
      contextId: typeof query.contextId === 'string' ? query.contextId : undefined,
      minQuestionCount: typeof query.minQuestionCount === 'string' ? parseInt(query.minQuestionCount, 10) : undefined,
      reusableOnly: query.reusableOnly === 'true'
    };

    const assets = await knowledgeAssetStore.searchAssets(criteria, principal);
    res.json({
      success: true,
      assets,
      count: assets.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search knowledge assets', details: err?.message });
  }
});

/**
 * GET /api/education/knowledge-assets/:id
 * Retrieve a specific asset if authorized
 */
knowledgeAssetRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const asset = await knowledgeAssetStore.getAssetById(assetId, principal);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or access unauthorized' });
    }

    res.json({
      success: true,
      asset
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve asset', details: err?.message });
  }
});

/**
 * POST /api/education/knowledge-assets
 * Create a new knowledge asset
 */
knowledgeAssetRouter.post('/', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const asset = await knowledgeAssetStore.createAsset(req.body, principal);

    res.status(201).json({
      success: true,
      asset
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to create knowledge asset', details: err?.message });
  }
});

/**
 * POST /api/education/knowledge-assets/evaluate-reuse
 * Deterministically evaluate whether a question set request can REUSE, ADAPT, or must GENERATE
 */
knowledgeAssetRouter.post('/evaluate-reuse', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const body = req.body || {};

    const request: QuestionSetReuseRequest = {
      subject: body.subject || 'Mathematics',
      topic: body.topic || 'Quadratic Equations',
      educationLevel: body.educationLevel || 'Class 10',
      difficulty: body.difficulty,
      questionCount: typeof body.questionCount === 'number' ? body.questionCount : 10,
      contextId: body.contextId,
      sourceMode: body.sourceMode
    };

    const decision = await reuseDecisionEngine.evaluateQuestionSetRequest(request, principal);
    res.json({
      success: true,
      decision
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to evaluate reuse decision', details: err?.message });
  }
});

/**
 * POST /api/education/knowledge-assets/practice-set
 * Generate practice set with automated verified Knowledge Asset reuse
 */
knowledgeAssetRouter.post('/practice-set', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const body = req.body || {};

    const context: LearnerMasteryContext = {
      overallMastery: typeof body.overallMastery === 'number' ? body.overallMastery : 0.65,
      conceptMastery: body.conceptMastery || { [body.targetConcept || 'Quadratic Equations']: 0.65 },
      prerequisiteMastery: body.prerequisiteMastery || {},
      recentAccuracy: typeof body.recentAccuracy === 'number' ? body.recentAccuracy : 0.7,
      recentMistakes: Array.isArray(body.recentMistakes) ? body.recentMistakes : [],
      difficultyHistory: body.difficultyHistory || { beginner: 1, intermediate: 3, advanced: 0, challenge: 0 },
      questionHistory: Array.isArray(body.questionHistory) ? body.questionHistory : [],
      confidence: typeof body.confidence === 'number' ? body.confidence : 0.7,
      subject: body.subject || 'Mathematics',
      targetConcept: body.targetConcept || 'Quadratic Equations',
      learningObjective: body.learningObjective,
      sourceMode: body.sourceMode || 'FULL_ADAPTIVE',
      targetCount: typeof body.targetCount === 'number' ? body.targetCount : 10,
      currentLessonId: body.currentLessonId
    };

    const result = await questionEngine.getPracticeSetWithReuse(context, principal);
    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate practice set with reuse', details: err?.message });
  }
});

/**
 * POST /api/education/knowledge-assets/generate-or-reuse
 * High-level endpoint for Student A / Student B workflow:
 * Searches existing assets, reuses verified items if present, adapts or generates when needed,
 * and registers new artifacts into KnowledgeAssetStore.
 */
knowledgeAssetRouter.post('/generate-or-reuse', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const body = req.body || {};

    if (!body.subject || !body.topic) {
      return res.status(400).json({ error: 'subject and topic are required' });
    }

    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: body.subject,
        topic: body.topic,
        educationLevel: body.educationLevel || 'Class 10',
        difficulty: body.difficulty || 'intermediate',
        questionCount: typeof body.questionCount === 'number' ? body.questionCount : 10,
        contextId: body.contextId,
        institutionId: body.institutionId,
        generatePdf: body.generatePdf ?? false,
        sharedWithInstitution: body.sharedWithInstitution ?? false
      },
      principal
    );

    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process generate-or-reuse request', details: err?.message });
  }
});

/**
 * POST /api/education/knowledge-assets/register-artifact
 * Registers a generated question set artifact with deduplication and validation gating
 */
knowledgeAssetRouter.post('/register-artifact', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const body = req.body || {};

    if (!body.title || !body.subject || !body.topic || !Array.isArray(body.questions)) {
      return res.status(400).json({ error: 'title, subject, topic, and questions array are required' });
    }

    const result = await artifactRegistrationService.registerQuestionSet(
      {
        title: body.title,
        description: body.description,
        subject: body.subject,
        topic: body.topic,
        subtopics: body.subtopics,
        concepts: body.concepts,
        educationLevel: body.educationLevel || 'Class 10',
        difficulty: body.difficulty || 'intermediate',
        questions: body.questions,
        validation: body.validation,
        provenance: body.provenance,
        contextId: body.contextId,
        institutionId: body.institutionId,
        workspaceId: body.workspaceId,
        generatePdfArtifact: body.generatePdfArtifact ?? false,
        existingStorageKey: body.existingStorageKey,
        metadata: body.metadata,
        sharedWithInstitution: body.sharedWithInstitution ?? false
      },
      principal
    );

    res.status(result.isExistingDuplicate ? 200 : 201).json({
      success: true,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register artifact', details: err?.message });
  }
});

/**
 * POST /api/education/knowledge-assets/:id/pdf
 * Generates or retrieves a PDF directly from an existing verified KnowledgeAsset
 * without regenerating questions!
 */
knowledgeAssetRouter.post('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const requestedCount = typeof req.body?.questionCount === 'number' ? req.body.questionCount : 20;

    const asset = await knowledgeAssetStore.getAssetById(assetId, principal);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or access unauthorized' });
    }

    const result = await artifactRegistrationService.generatePdfFromAsset(
      asset,
      requestedCount,
      principal
    );

    res.json({
      success: true,
      assetId: asset.id,
      storageKey: result.storageKey,
      questionCount: result.questionCount,
      sizeBytes: result.buffer.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate PDF from asset', details: err?.message });
  }
});

/**
 * GET /api/education/knowledge-assets/:id/pdf
 * Streams or downloads the PDF of a Knowledge Asset
 */
knowledgeAssetRouter.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const principal = res.locals.principal as AuthenticatedPrincipal;
    const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const download = req.query.download === 'true';

    const asset = await knowledgeAssetStore.getAssetById(assetId, principal);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or access unauthorized' });
    }

    let buffer: Buffer | null = null;
    const filename = `${asset.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    // Try reading existing storage object if available
    const storageKey = asset.metadata?.storageKey || (asset.contentReference?.startsWith('obj-pdf-') ? asset.contentReference : undefined);
    if (storageKey) {
      try {
        buffer = await storageManager.getProvider().getObject(storageKey);
      } catch {}
    }

    // If buffer not found or asset has questions, render PDF on the fly
    if (!buffer && Array.isArray(asset.items) && asset.items.length > 0) {
      const result = await artifactRegistrationService.generatePdfFromAsset(asset, asset.items.length, principal);
      buffer = result.buffer;
    }

    if (!buffer) {
      return res.status(404).json({ error: 'PDF content unavailable for this asset' });
    }

    const disposition = download ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to stream PDF', details: err?.message });
  }
});

