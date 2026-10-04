// REST routes for D.11 Real-Time Teaching Copilot

import { Router, type Request, type Response } from 'express';
import { copilotService } from './copilotService.ts';
import type { User } from '../../../data/types.ts';

export const copilotRouter = Router();

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

// POST /api/education/copilot/command - Execute or propose an action
copilotRouter.post('/command', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { command, context, options } = req.body;
    if (!command || typeof command !== 'string') {
      res.status(400).json({ ok: false, error: 'command string is required' });
      return;
    }

    const boundedContext = copilotService.buildContext(context || {});
    const result = await copilotService.processCommand(user, command, boundedContext, options);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Copilot command failed' });
  }
});

// POST /api/education/copilot/proposals/:id/review - Approve or reject proposal
copilotRouter.post('/proposals/:id/review', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { decision, rejectionReason } = req.body;
    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      res.status(400).json({ ok: false, error: 'decision must be APPROVE or REJECT' });
      return;
    }

    const proposalId = String(req.params.id);
    const updated = await copilotService.reviewProposal(user, proposalId, decision, { rejectionReason });
    res.json({ ok: true, proposal: updated });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Review failed' });
  }
});

// GET /api/education/copilot/proposals - List proposals for session
copilotRouter.get('/proposals', (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.sessionId as string) || 'session-phys-101';
    const list = copilotService.listProposals(sessionId);
    res.json({ ok: true, proposals: list, count: list.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to list proposals' });
  }
});

// GET /api/education/copilot/audit - Immutable audit trail
copilotRouter.get('/audit', (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const events = copilotService.getAuditEvents(sessionId);
    res.json({ ok: true, auditEvents: events, count: events.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to get audit log' });
  }
});
