// Conversations REST API Routes

import { Router, type Request, type Response } from 'express';
import { jarvisData } from '../data/index.ts';
import { requirePrincipal } from '../auth/principal.ts';

export const conversationRouter = Router();

conversationRouter.use(requirePrincipal);


// GET /api/conversations
conversationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
    const conversations = await jarvisData.conversations.list(workspaceId, limit);
    res.json({
      conversations,
      count: conversations.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list conversations' } });
  }
});

// POST /api/conversations
conversationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, workspaceId, userId, sector } = req.body;
    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title is required.' } });
      return;
    }

    const conv = await jarvisData.conversations.create({
      title: title.trim(),
      workspaceId: workspaceId || res.locals.principal!.workspaceId || 'ws-stark-core',
      userId: res.locals.principal!.userId,
      sector: sector || 'command'
    });

    res.status(201).json({ conversation: conv });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to create conversation' } });
  }
});

// GET /api/conversations/:id
conversationRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const conv = await jarvisData.conversations.getById(id, workspaceId);
    if (!conv) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found.' } });
      return;
    }

    const messages = await jarvisData.conversations.getMessages(id);
    res.json({
      conversation: conv,
      messages,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve conversation' } });
  }
});
