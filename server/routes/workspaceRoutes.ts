// Workspaces REST API Routes
import { Router, type Request, type Response } from 'express';
import { jarvisData } from '../data/index.ts';
import { authenticateRequest } from '../auth/index.ts';

export const workspaceRouter = Router();

// GET /api/workspaces/my
// Returns all authorized workspaces for the authenticated caller
workspaceRouter.get('/my', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const workspaces = await jarvisData.workspaces.listForUser(user.id);
    const enriched = workspaces.map((w) => ({
      ...w,
      isPersonal: !w.institutionId,
      isActive: w.id === user.workspaceId
    }));
    const activeWorkspace = enriched.find((w) => w.isActive) || enriched[0] || null;

    res.json({
      success: true,
      activeWorkspace,
      workspaces: enriched,
      count: enriched.length
    });
  } catch (err: any) {
    res.status(err?.statusCode || 401).json({
      error: { code: err?.code || 'UNAUTHENTICATED', message: err?.message || 'Authentication required' }
    });
  }
});

// POST /api/workspaces/switch
// Authoritatively switches caller's active workspace with strict server-side authorization
workspaceRouter.post('/switch', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { workspaceId } = req.body || {};

    if (!workspaceId || typeof workspaceId !== 'string' || !workspaceId.trim()) {
      return res.status(400).json({
        error: { code: 'INVALID_ARGUMENTS', message: 'workspaceId is required.' }
      });
    }

    const targetWs = await jarvisData.workspaces.getById(workspaceId.trim());
    if (!targetWs) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Requested workspace does not exist.' }
      });
    }

    // Server-side authorization check: Caller MUST be a verified member or owner
    const members = await jarvisData.workspaces.getMembers(targetWs.id);
    const isMember = members.some((m) => m.userId === user.id) || targetWs.ownerId === user.id;

    if (!isMember) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: You are not an authorized member of this workspace.'
        }
      });
    }

    // Persist active workspace switch
    await jarvisData.users.update(user.id, { workspaceId: targetWs.id });
    user.workspaceId = targetWs.id;

    const allWorkspaces = await jarvisData.workspaces.listForUser(user.id);
    const enriched = allWorkspaces.map((w) => ({
      ...w,
      isPersonal: !w.institutionId,
      isActive: w.id === targetWs.id
    }));

    res.json({
      success: true,
      activeWorkspace: {
        ...targetWs,
        isPersonal: !targetWs.institutionId,
        isActive: true
      },
      workspaces: enriched
    });
  } catch (err: any) {
    res.status(err?.statusCode || 500).json({
      error: { code: err?.code || 'INTERNAL_ERROR', message: err?.message || 'Failed to switch workspace' }
    });
  }
});

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
    const user = await authenticateRequest(req, jarvisData);
    const id = req.params.id as string;
    const ws = await jarvisData.workspaces.getById(id);
    if (!ws) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found.' } });
      return;
    }
    const members = await jarvisData.workspaces.getMembers(id);
    const isMember = members.some((m) => m.userId === user.id) || ws.ownerId === user.id || ['commander', 'admin'].includes(user.role);
    if (!isMember) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied: You do not have access to this workspace.' } });
    }
    res.json({
      workspace: ws,
      members,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(err?.statusCode || 500).json({ error: { code: err?.code || 'SERVER_ERROR', message: err.message || 'Failed to get workspace' } });
  }
});
