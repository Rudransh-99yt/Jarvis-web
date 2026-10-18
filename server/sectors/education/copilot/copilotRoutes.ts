// REST routes for D.11 Real-Time Teaching Copilot

import { Router, type Request, type Response } from 'express';
import { copilotService } from './copilotService.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User } from '../../../data/types.ts';

export const copilotRouter = Router();

async function getAuthUser(req: Request): Promise<User> {
  return authenticateRequest(req, jarvisData);
}

function handleCopilotError(err: any, res: Response, fallback = 'Copilot command failed') {
  const isUnauth = err.statusCode === 401 || err.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
  const isForbidden = err.statusCode === 403 || err.code === 'FORBIDDEN' || err.message?.includes('Forbidden') || err.message?.includes('403');
  const status = isUnauth ? 401 : isForbidden ? 403 : 500;
  res.status(status).json({ ok: false, error: err.message || fallback });
}

// POST /api/education/copilot/command - Execute or propose an action
copilotRouter.post('/command', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { command, context, options } = req.body;
    if (!command || typeof command !== 'string') {
      res.status(400).json({ ok: false, error: 'command string is required' });
      return;
    }

    const boundedContext = copilotService.buildContext(context || {});
    const result = await copilotService.processCommand(user, command, boundedContext, options);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    handleCopilotError(err, res, 'Copilot command failed');
  }
});

// POST /api/education/copilot/proposals/:id/review - Approve or reject proposal
copilotRouter.post('/proposals/:id/review', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    const { decision, rejectionReason } = req.body;
    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      res.status(400).json({ ok: false, error: 'decision must be APPROVE or REJECT' });
      return;
    }

    const proposalId = String(req.params.id);
    const updated = await copilotService.reviewProposal(user, proposalId, decision, { rejectionReason });
    res.json({ ok: true, proposal: updated });
  } catch (err: any) {
    handleCopilotError(err, res, 'Review failed');
  }
});

// GET /api/education/copilot/proposals - List proposals for session
copilotRouter.get('/proposals', async (req: Request, res: Response) => {
  try {
    await getAuthUser(req);
    const sessionId = (req.query.sessionId as string) || 'session-phys-101';
    const list = copilotService.listProposals(sessionId);
    res.json({ ok: true, proposals: list, count: list.length });
  } catch (err: any) {
    handleCopilotError(err, res, 'Failed to list proposals');
  }
});

// GET /api/education/copilot/audit - Immutable audit trail
copilotRouter.get('/audit', async (req: Request, res: Response) => {
  try {
    await getAuthUser(req);
    const sessionId = req.query.sessionId as string;
    const events = copilotService.getAuditEvents(sessionId);
    res.json({ ok: true, auditEvents: events, count: events.length });
  } catch (err: any) {
    handleCopilotError(err, res, 'Failed to get audit log');
  }
});
