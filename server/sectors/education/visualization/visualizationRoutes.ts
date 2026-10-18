// REST routes for D.10 AI Visualization Engine

import { Router, type Request, type Response } from 'express';
import { visualizationService } from './visualizationService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';

export const visualizationRouter = Router();

async function getAuthUser(req: Request): Promise<User> {
  return authenticateRequest(req, jarvisData);
}

function handleVisError(err: any, res: Response, fallback = 'Visualization error') {
  const isUnauth = err.statusCode === 401 || err.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
  const isForbidden = err.statusCode === 403 || err.code === 'FORBIDDEN' || err.message?.includes('Forbidden') || err.message?.includes('403');
  const isNotFound = err.statusCode === 404 || err.message?.includes('not found');
  const status = isUnauth ? 401 : isForbidden ? 403 : isNotFound ? 404 : 500;
  res.status(status).json({ ok: false, error: err.message || fallback });
}

// GET /api/education/visualizations
visualizationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const docs = await visualizationService.listVisualizations(user, {
      classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
      courseCode: typeof req.query.courseCode === 'string' ? req.query.courseCode : undefined,
      type: typeof req.query.type === 'string' ? req.query.type as any : undefined
    });
    res.json({ ok: true, visualizations: docs, count: docs.length });
  } catch (err: any) {
    handleVisError(err, res, 'Failed to list visualizations');
  }
});

// POST /api/education/visualizations/validate
visualizationRouter.post('/validate', (req: Request, res: Response) => {
  try {
    const result = visualizationService.validatePayload(req.body.payload);
    res.json({ ok: result.isValid, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message || 'Validation failed' });
  }
});

// POST /api/education/visualizations
visualizationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const doc = await visualizationService.createVisualization(user, req.body);
    res.status(201).json({ ok: true, visualization: doc });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.code === 'UNAUTHENTICATED';
    res.status(isUnauth ? 401 : 400).json({ ok: false, error: err?.message || 'Failed to create visualization' });
  }
});

// GET /api/education/visualizations/:id
visualizationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const doc = await visualizationService.getVisualization(user, String(req.params.id));
    res.json({ ok: true, visualization: doc });
  } catch (err: any) {
    handleVisError(err, res, 'Visualization not accessible');
  }
});

// PATCH /api/education/visualizations/:id
visualizationRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const doc = await visualizationService.updateVisualization(user, String(req.params.id), req.body);
    res.json({ ok: true, visualization: doc });
  } catch (err: any) {
    handleVisError(err, res, 'Update failed');
  }
});

// DELETE /api/education/visualizations/:id
visualizationRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const success = await visualizationService.deleteVisualization(user, String(req.params.id));
    res.json({ ok: success, deleted: success });
  } catch (err: any) {
    handleVisError(err, res, 'Deletion failed');
  }
});

// POST /api/education/visualizations/:id/attach
visualizationRouter.post('/:id/attach', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const result = await visualizationService.attachToSmartBoard(
      user,
      req.body.boardId,
      req.body.pageId,
      String(req.params.id),
      req.body.position
    );
    res.json({ ok: true, ...result });
  } catch (err: any) {
    handleVisError(err, res, 'Attach failed');
  }
});
