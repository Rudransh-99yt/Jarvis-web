// Knowledge Spaces REST API Routes
import { Router, Request, Response } from 'express';
import { jarvisData } from '../data/index.ts';

export const knowledgeRouter = Router();

// GET /api/knowledge-spaces
knowledgeRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const spaces = await jarvisData.knowledge.listSpaces(workspaceId);
    
    // Enrich with sources
    const enriched = await Promise.all(
      spaces.map(async (space) => {
        const sources = await jarvisData.knowledge.listSourcesForSpace(space.id, workspaceId);
        return {
          ...space,
          sources,
          sourceCount: sources.length
        };
      })
    );

    res.json({
      knowledgeSpaces: enriched,
      count: enriched.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list knowledge spaces' } });
  }
});

// POST /api/knowledge-spaces
knowledgeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, title, description, category, tags, classId, workspaceId, ownerId } = req.body;
    const spaceName = name || title;
    if (!spaceName || typeof spaceName !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'name is required.' } });
      return;
    }

    const id = `ks-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const created = await jarvisData.knowledge.createSpace({
      id,
      workspaceId: workspaceId || 'ws-stark-core',
      name: spaceName.trim(),
      description: description || '',
      category: category || 'General',
      ownerId: ownerId || 'user-tony',
      classId,
      tags: Array.isArray(tags) ? tags : [],
      suggestedQuestions: []
    });

    res.status(201).json({ knowledgeSpace: created });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to create knowledge space' } });
  }
});

// GET /api/knowledge-spaces/:id
knowledgeRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const space = await jarvisData.knowledge.getSpaceById(id, workspaceId);
    if (!space) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Knowledge space not found.' } });
      return;
    }

    const sources = await jarvisData.knowledge.listSourcesForSpace(id, workspaceId);
    res.json({
      knowledgeSpace: {
        ...space,
        sources
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to get knowledge space' } });
  }
});
