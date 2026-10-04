// REST routes for SmartBoard Board Knowledge Engine (D.13)

import { Router, type Request, type Response } from 'express';
import { boardKnowledgeService } from './boardKnowledgeService.ts';
import type { User } from '../../../../data/types.ts';

export const boardKnowledgeRouter = Router();

function getAuthUser(req: Request): User {
  const userId = (req.headers['x-jarvis-user-id'] as string) || (req.query.userId as string) || 'teacher-1';
  const role = (req.headers['x-jarvis-user-role'] as string) || (req.query.role as string) || (userId.startsWith('student') ? 'student' : 'teacher');

  return {
    id: userId,
    displayName: role === 'student' ? 'Cadet Student' : 'Instructor',
    email: `${userId}@starkacademy.edu`,
    role: role as any,
    institutionId: 'inst-stark-academy',
    createdAt: new Date().toISOString()
  };
}

// POST /api/education/smartboard/knowledge/summarize - Generate structured post-class notes
boardKnowledgeRouter.post('/summarize', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { boardDocId } = req.body;
    if (!boardDocId) {
      res.status(400).json({ ok: false, error: 'boardDocId is required' });
      return;
    }
    const summary = await boardKnowledgeService.generatePostClassSummary(user, boardDocId);
    res.json({ ok: true, summary });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Summarization failed' });
  }
});

// POST /api/education/smartboard/knowledge/summaries/:id/approve - Teacher approves summary
boardKnowledgeRouter.post('/summaries/:id/approve', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const summary = await boardKnowledgeService.approveSummary(user, String(req.params.id));
    res.json({ ok: true, summary });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Approval failed' });
  }
});

// GET /api/education/smartboard/knowledge/search - Natural language search over historical boards
boardKnowledgeRouter.get('/search', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const q = (req.query.q as string) || '';
    const classId = (req.query.classId as string) || 'class-phys-301';
    const results = boardKnowledgeService.searchBoardHistory(user, q, classId);
    res.json({ ok: true, results, count: results.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Search failed' });
  }
});
