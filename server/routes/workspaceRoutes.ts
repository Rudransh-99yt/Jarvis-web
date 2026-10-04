// Workspaces REST API Routes
import { Router, type Request, type Response } from 'express';
import { jarvisData } from '../data/index.ts';

export const workspaceRouter = Router();

// GET /api/workspaces
workspaceRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const workspaces = await jarvisData.workspaces.list();
    res.json({
      workspaces,
      count: workspaces.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list workspaces' } });
  }
});

// GET /api/workspaces/:id
workspaceRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ws = await jarvisData.workspaces.getById(id);
    if (!ws) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found.' } });
      return;
    }
    const members = await jarvisData.workspaces.getMembers(id);
    res.json({
      workspace: ws,
      members,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to get workspace' } });
  }
});
