import { jarvisData } from '../../../data/index.ts';
import { requirePrincipal } from '../../../auth/principal.ts';
// REST routes for SmartBoard ↔ Teacher Mobile Control Plane (D.12)

import { Router, type Request, type Response } from 'express';
import { controlPlaneService } from './controlPlaneService.ts';
import type { User } from '../../../data/types.ts';

export const controlPlaneRouter = Router();

async function getAuthUser(req: Request, res: any) {
  const user = await jarvisData.users.getById(res.locals.principal!.userId);
  if (!user) throw new Error('User not found');
  return user;
}

// GET /api/education/smartboard/control-plane/boards - List teacher's authorized classroom boards
controlPlaneRouter.get('/boards', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    const boards = controlPlaneService.listMySmartBoards(user);
    res.json({ ok: true, boards, count: boards.length });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Failed to list boards' });
  }
});

// POST /api/education/smartboard/control-plane/pairing/challenge - Generate ephemeral pairing code on board
controlPlaneRouter.post('/pairing/challenge', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    const { boardId } = req.body;
    if (!boardId) {
      res.status(400).json({ ok: false, error: 'boardId is required' });
      return;
    }
    const challenge = controlPlaneService.generatePairingChallenge(user, boardId);
    res.json({ ok: true, ...challenge });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 500).json({ ok: false, error: err?.message || 'Failed to generate pairing challenge' });
  }
});

// POST /api/education/smartboard/control-plane/pairing/claim - Mobile claims pairing PIN
controlPlaneRouter.post('/pairing/claim', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    const { boardId, pinCode, sessionId } = req.body;
    if (!boardId || !pinCode) {
      res.status(400).json({ ok: false, error: 'boardId and pinCode are required' });
      return;
    }
    const result = controlPlaneService.claimPairing(user, boardId, pinCode, sessionId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 400).json({ ok: false, error: err?.message || 'Pairing claim failed' });
  }
});

// POST /api/education/smartboard/control-plane/send-session - Send approved session to classroom board
controlPlaneRouter.post('/send-session', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    const { boardId, sessionId } = req.body;
    if (!boardId || !sessionId) {
      res.status(400).json({ ok: false, error: 'boardId and sessionId are required' });
      return;
    }
    const record = controlPlaneService.sendSessionToClassroom(user, boardId, sessionId);
    res.json({ ok: true, delivery: record });
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 400).json({ ok: false, error: err?.message || 'Send session failed' });
  }
});

// POST /api/education/smartboard/control-plane/remote-action - Teacher mobile remote controls
controlPlaneRouter.post('/remote-action', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    const { boardId, action, payload } = req.body;
    if (!boardId || !action) {
      res.status(400).json({ ok: false, error: 'boardId and action are required' });
      return;
    }
    const result = controlPlaneService.executeRemoteAction(user, boardId, action, payload);
    res.json(result);
  } catch (err: any) {
    const is403 = err?.message?.includes('403') || err?.message?.includes('Forbidden');
    res.status(is403 ? 403 : 400).json({ ok: false, error: err?.message || 'Remote action failed' });
  }
});
