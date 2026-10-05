// SmartBoard REST API Endpoints (D.8)
import express, { type Request, type Response } from 'express';
import { smartboardService } from './smartboardService.ts';
import { authenticateRequest, AuthenticationError } from '../../../auth/index.ts';
import type { User } from '../../../data/types.ts';
import { controlPlaneRouter } from './controlPlaneRoutes.ts';
import { boardKnowledgeRouter } from './knowledge/boardKnowledgeRoutes.ts';

export const smartboardRouter = express.Router();

// Phase D.12: SmartBoard ↔ Teacher Mobile Control Plane
smartboardRouter.use('/control-plane', controlPlaneRouter);

// Phase D.13: SmartBoard Board Knowledge Engine
smartboardRouter.use('/knowledge', boardKnowledgeRouter);

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

function handleRouteError(err: any, res: Response) {
  if (res.headersSent) return;

  if (
    err instanceof AuthenticationError ||
    err?.statusCode === 401 ||
    err?.code === 'UNAUTHENTICATED' ||
    err?.message?.includes('Unauthenticated') ||
    err?.message?.includes('Authentication required')
  ) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: err.message } });
    return;
  }

  const msg = err.message || '';
  if (
    err?.statusCode === 403 ||
    msg.includes('Forbidden') ||
    msg.includes('Unauthorized') ||
    msg.includes('Access denied') ||
    msg.includes('not assigned') ||
    msg.includes('not enrolled')
  ) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: msg } });
    return;
  }

  if (
    err?.statusCode === 409 ||
    err?.code === 'VERSION_CONFLICT' ||
    msg.includes('conflict') ||
    msg.includes('Version conflict')
  ) {
    res.status(409).json({
      error: {
        code: 'VERSION_CONFLICT',
        message: msg,
        currentVersion: err?.currentVersion
      }
    });
    return;
  }

  if (err?.statusCode === 400 || msg.includes('Invalid') || msg.includes('not found')) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: msg } });
    return;
  }

  console.error('[SmartBoard API Error]:', err);
  res.status(500).json({ error: { code: 'SMARTBOARD_ERROR', message: msg || 'Internal smartboard server error' } });
}

// 1. List SmartBoard devices
smartboardRouter.get('/devices', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const classroomId = typeof req.query.classroomId === 'string' ? req.query.classroomId : undefined;
    const devices = await smartboardService.listDevices(user, classroomId);
    res.json({ devices, count: devices.length });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 2. Get specific SmartBoard device
smartboardRouter.get('/devices/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const boardId = getParam(req.params.id);
    const device = await smartboardService.getDevice(user, boardId);
    res.json({ device });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 3. Generate pairing PIN code for a board
smartboardRouter.post('/devices/:id/pair-code', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'commander' && user.role !== 'principal') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only faculty can generate board pair codes.' } });
      return;
    }
    const boardId = getParam(req.params.id);
    const result = await smartboardService.generatePairCode(boardId);
    res.json(result);
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 4. Pair teacher with board
smartboardRouter.post('/pair', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { boardId, pairCode, sessionId } = req.body;
    if (!boardId || !pairCode) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'boardId and pairCode are required.' } });
      return;
    }
    const result = await smartboardService.pairWithCode(user, boardId, pairCode, sessionId);
    res.json(result);
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 5. Send ClassSession to SmartBoard
smartboardRouter.post('/send-session', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { boardId, sessionId } = req.body;
    if (!boardId || !sessionId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'boardId and sessionId are required.' } });
      return;
    }
    const result = await smartboardService.sendSessionToBoard(user, boardId, sessionId);
    res.json(result);
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 6. Launch / Open ClassSession on SmartBoard (LIVE)
smartboardRouter.post('/launch', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { boardId, sessionId } = req.body;
    if (!boardId || !sessionId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'boardId and sessionId are required.' } });
      return;
    }
    const result = await smartboardService.launchSessionOnBoard(user, boardId, sessionId);
    res.json(result);
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 7. Get Board Document for a session or document ID
smartboardRouter.get('/sessions/:sessionId/document', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const sessionId = getParam(req.params.sessionId);
    const document = await smartboardService.getBoardDocument(user, sessionId);
    res.json({ document });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 8. Autosave Board Document
smartboardRouter.put('/documents/:docId/autosave', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const docId = getParam(req.params.docId);
    const { pages, activePageIndex, title, expectedVersion } = req.body;
    const document = await smartboardService.autosaveDocument(user, docId, {
      pages,
      activePageIndex,
      title,
      expectedVersion
    });
    res.json({ ok: true, document });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 9. Release Board Document to Students
smartboardRouter.post('/documents/:docId/release', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const docId = getParam(req.params.docId);
    const { isReleased = true } = req.body;
    const document = await smartboardService.releaseDocument(user, docId, isReleased);
    res.json({ ok: true, document });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 10. Complete SmartBoard Session
smartboardRouter.post('/devices/:id/complete', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const boardId = getParam(req.params.id);
    const { sessionId } = req.body;
    const result = await smartboardService.completeSession(user, boardId, sessionId);
    res.json({ ok: true, result });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 11. Get Board History for a Class / Course
smartboardRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const classId = typeof req.query.classId === 'string' ? req.query.classId : 'class-phys-301';
    const documents = await smartboardService.getBoardHistory(user, classId);
    res.json({ documents, count: documents.length });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 12. Vision Board: Recognize elements (Equation, Diagram, Text)
smartboardRouter.post('/vision/recognize', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { elements, type = 'equation', options = {} } = req.body;
    if (!Array.isArray(elements) || elements.length === 0) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'elements array is required.' } });
      return;
    }
    const { boardRecognitionService } = await import('./vision/boardRecognitionService.ts');
    const candidate = await boardRecognitionService.createSemanticCandidate(elements, type, options);
    res.json({ ok: true, candidate });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 13. Vision Board: Generate Bounded BoardAIContext
smartboardRouter.post('/vision/context', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { page, selectedElementIds = [], academicContext = {}, classSessionId = 'session-phys-101' } = req.body;
    if (!page) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'page object is required.' } });
      return;
    }
    const { boardRecognitionService } = await import('./vision/boardRecognitionService.ts');
    const aiContext = boardRecognitionService.buildAIContext(page, selectedElementIds, academicContext, classSessionId);
    res.json({ ok: true, aiContext });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 14. Vision Board: Spatial Analysis & Handwriting Grouping
smartboardRouter.post('/vision/spatial', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const { elements = [] } = req.body;
    const { SpatialEngine } = await import('./vision/spatialEngine.ts');
    const relationships = SpatialEngine.computePageSpatialRelationships(elements);
    const clusters = SpatialEngine.groupStrokesIntoCandidateClusters(elements);
    res.json({ ok: true, relationships, clustersCount: clusters.length, clusters });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});

// 15. Vision Board: Ingest Released Board Document to RAG
smartboardRouter.post('/documents/:docId/rag-ingest', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const docId = getParam(req.params.docId);
    const { targetSpaceId } = req.body;
    const doc = await smartboardService.getBoardDocument(user, docId);
    const { boardRagBridge } = await import('./vision/boardRagBridge.ts');
    const result = await boardRagBridge.ingestBoardDocumentToRag(user, doc, targetSpaceId);
    res.json({ ok: true, result });
  } catch (err: any) {
    handleRouteError(err, res);
  }
});
