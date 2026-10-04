// REST API Routes for JARVIS AI Visualization Engine (D.10)
import { Router, type Request, type Response } from 'express';
import { visualizationService } from './visualizationService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';

export const visualizationRouter = Router();

// GET /api/education/visualizations - List visualizations
visualizationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { type, classSessionId, lessonId } = req.query;

    const list = await visualizationService.listVisualizations(user, {
      type: type as string,
      classSessionId: classSessionId as string,
      lessonId: lessonId as string
    });

    res.json({
      visualizations: list,
      count: list.length
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/education/visualizations/:id - Get single visualization
visualizationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const vis = visualizationService.getById(req.params.id as string);
    if (!vis) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Visualization not found.' } });
      return;
    }
    res.json({ visualization: vis });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 500);
    res.status(statusCode).json({ error: { code: err.code || 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/education/visualizations - Create visualization
visualizationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const doc = await visualizationService.createVisualization(req.body, user);
    res.status(201).json({ visualization: doc });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 400);
    res.status(statusCode).json({ error: { code: err.code || 'BAD_REQUEST', message: err.message } });
  }
});

// POST /api/education/visualizations/generate - Natural language generation
visualizationRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { prompt, courseCode, topic, classSessionId } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'prompt is required.' } });
      return;
    }

    const doc = await visualizationService.generateFromPrompt(prompt, {
      user,
      courseCode,
      topic,
      classSessionId
    });

    res.status(201).json({ visualization: doc });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 400);
    res.status(statusCode).json({ error: { code: err.code || 'GENERATION_ERROR', message: err.message } });
  }
});

// POST /api/education/visualizations/from-equation - Recognition -> Graph Flow
visualizationRouter.post('/from-equation', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { candidate, confirmLowConfidence, courseCode, topic } = req.body;

    if (!candidate || !candidate.expression) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Valid equation candidate required.' } });
      return;
    }

    const result = await visualizationService.generateFromEquation(candidate, {
      confirmLowConfidence: Boolean(confirmLowConfidence),
      user,
      courseCode,
      topic
    });

    res.json({
      visualization: result.document,
      needsConfirmation: result.needsConfirmation,
      warning: result.warning
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 400);
    res.status(statusCode).json({ error: { code: err.code || 'EQUATION_GRAPH_ERROR', message: err.message } });
  }
});

// POST /api/education/visualizations/preview - Preview without saving
visualizationRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { prompt, expression, courseCode } = req.body;
    const promptToUse = prompt || (expression ? `Plot ${expression}` : 'Quadratic parabola y = x^2 - 4');
    const doc = await visualizationService.generateFromPrompt(promptToUse, { user, courseCode });

    res.json({
      preview: {
        id: doc.id,
        type: doc.type,
        title: doc.title,
        description: doc.description,
        parameters: doc.parameters,
        accessibility: doc.accessibility,
        needsApproval: true
      }
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : 400);
    res.status(statusCode).json({ error: { code: err.code || 'PREVIEW_ERROR', message: err.message } });
  }
});

// POST /api/education/visualizations/:id/attach - Attach to Classroom resource
visualizationRouter.post('/:id/attach', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { boardDocId, pageId, classSessionId, lessonId } = req.body;

    const attached = await visualizationService.attachVisualization(
      req.params.id as string,
      { boardDocId, pageId, classSessionId, lessonId },
      user
    );

    res.json({
      visualization: attached,
      attachedTo: {
        boardDocId: attached.provenance.boardDocumentId,
        pageId: attached.provenance.boardPageId,
        classSessionId: attached.provenance.classSessionId,
        lessonId: attached.provenance.lessonId
      }
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.message.includes('not authorized') ? 403 : 400);
    res.status(statusCode).json({ error: { code: err.code || 'ATTACH_ERROR', message: err.message } });
  }
});

// PUT /api/education/visualizations/:id/parameters - Update parameters
visualizationRouter.put('/:id/parameters', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { parameters } = req.body;

    if (!parameters || typeof parameters !== 'object') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'parameters object required.' } });
      return;
    }

    const updated = await visualizationService.updateParameters(req.params.id as string, parameters, user);
    res.json({ visualization: updated });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.message.includes('not authorized') ? 403 : 400);
    res.status(statusCode).json({ error: { code: err.code || 'UPDATE_ERROR', message: err.message } });
  }
});

// DELETE /api/education/visualizations/:id - Delete visualization
visualizationRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const success = await visualizationService.deleteVisualization(req.params.id as string, user);
    if (!success) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Visualization not found.' } });
      return;
    }
    res.json({ deleted: true, id: req.params.id });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.message.includes('cannot delete') || err.message.includes('not authorized') ? 403 : 400);
    res.status(statusCode).json({ error: { code: err.code || 'DELETE_ERROR', message: err.message } });
  }
});
