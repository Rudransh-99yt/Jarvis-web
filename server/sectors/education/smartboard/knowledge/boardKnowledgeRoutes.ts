// REST routes for SmartBoard Board Knowledge Engine (D.13)

import { Router, type Request, type Response } from 'express';
import { boardKnowledgeService } from './boardKnowledgeService.ts';
import { authenticateRequest } from '../../../../auth/index.ts';
import { jarvisData } from '../../../../data/index.ts';
import type { User } from '../../../../data/types.ts';

export const boardKnowledgeRouter = Router();

async function getAuthUser(req: Request): Promise<User> {
  return authenticateRequest(req, jarvisData);
}

function handleBoardKnowledgeError(err: any, res: Response, fallback = 'Operation failed') {
  const isUnauth = err.statusCode === 401 || err.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
  const isForbidden = err.statusCode === 403 || err.code === 'FORBIDDEN' || err.message?.includes('Forbidden') || err.message?.includes('403');
  const status = isUnauth ? 401 : isForbidden ? 403 : 500;
  res.status(status).json({ ok: false, error: err.message || fallback });
}

// POST /api/education/smartboard/knowledge/index - Trigger structured board indexing
boardKnowledgeRouter.post('/index', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { boardDocId, triggerRagIngest } = req.body;
    if (!boardDocId) {
      res.status(400).json({ ok: false, error: 'boardDocId is required' });
      return;
    }
    const doc = await boardKnowledgeService.indexBoardDocument(user, boardDocId, { triggerRagIngest });
    res.json({ ok: true, boardDoc: doc, lifecycle: doc.lifecycle });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Indexing failed');
  }
});

// POST /api/education/smartboard/knowledge/release - Release/Unrelease board to students
boardKnowledgeRouter.post('/release', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { boardDocId, isReleased } = req.body;
    if (!boardDocId) {
      res.status(400).json({ ok: false, error: 'boardDocId is required' });
      return;
    }
    const doc = await boardKnowledgeService.releaseBoardDocument(user, boardDocId, Boolean(isReleased));
    res.json({ ok: true, boardDoc: doc, isReleasedToStudents: doc.isReleasedToStudents });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Release failed');
  }
});

// GET /api/education/smartboard/knowledge/search - Natural language search over historical boards
boardKnowledgeRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const q = (req.query.q as string) || '';
    const classId = (req.query.classId as string) || 'class-phys-301';
    const courseCode = req.query.courseCode as string | undefined;
    const results = boardKnowledgeService.searchBoardKnowledge(user, q, { classId, courseCode });
    res.json({ ok: true, results, count: results.length });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Search failed');
  }
});

// POST /api/education/smartboard/knowledge/ask - Ask Jarvis about the whiteboard session
boardKnowledgeRouter.post('/ask', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { query, classSessionId, courseCode, boardDocumentId, pageIndex } = req.body;
    if (!query) {
      res.status(400).json({ ok: false, error: 'query is required' });
      return;
    }
    const response = await boardKnowledgeService.askJarvisAboutBoard(user, query, {
      classSessionId,
      courseCode,
      boardDocumentId,
      pageIndex
    });
    res.json({ ok: true, ...response });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Board Q&A failed');
  }
});

// POST /api/education/smartboard/knowledge/notes/derive - Generate derived Workspace note
boardKnowledgeRouter.post('/notes/derive', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { boardDocId, pageIndex, customTitle } = req.body;
    if (!boardDocId) {
      res.status(400).json({ ok: false, error: 'boardDocId is required' });
      return;
    }
    const result = await boardKnowledgeService.createDerivedNotes(user, boardDocId, {
      pageIndex,
      customTitle
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Notes creation failed');
  }
});

// POST /api/education/smartboard/knowledge/homework/derive - Generate derived homework draft
boardKnowledgeRouter.post('/homework/derive', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { boardDocId, type = 'homework' } = req.body;
    if (!boardDocId) {
      res.status(400).json({ ok: false, error: 'boardDocId is required' });
      return;
    }
    const result = await boardKnowledgeService.createDerivedHomeworkOrRevision(user, boardDocId, type);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Homework derivation failed');
  }
});

// POST /api/education/smartboard/knowledge/summarize - Generate structured post-class notes
boardKnowledgeRouter.post('/summarize', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { boardDocId } = req.body;
    if (!boardDocId) {
      res.status(400).json({ ok: false, error: 'boardDocId is required' });
      return;
    }
    const summary = await boardKnowledgeService.generatePostClassSummary(user, boardDocId);
    res.json({ ok: true, summary });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Summarization failed');
  }
});

// POST /api/education/smartboard/knowledge/summaries/:id/approve - Teacher approves summary
boardKnowledgeRouter.post('/summaries/:id/approve', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const summary = await boardKnowledgeService.approveSummary(user, String(req.params.id));
    res.json({ ok: true, summary });
  } catch (err: any) {
    handleBoardKnowledgeError(err, res, 'Approval failed');
  }
});
