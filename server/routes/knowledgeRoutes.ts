// Knowledge Spaces & Grounded RAG REST API Routes
import { Router, Request, Response } from 'express';
import { jarvisData } from '../data/index.ts';
import { ingestionPipeline } from '../rag/ingestionPipeline.ts';
import { retrievalService } from '../rag/retrievalService.ts';
import { groundingService } from '../rag/groundingService.ts';

export const knowledgeRouter = Router();

// GET /api/knowledge-spaces - List spaces
knowledgeRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const spaces = await jarvisData.knowledge.listSpaces(workspaceId);

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

// POST /api/knowledge-spaces - Create space
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
      ownerId: ownerId || 'teacher-1',
      classId,
      tags: Array.isArray(tags) ? tags : [],
      suggestedQuestions: []
    });

    res.status(201).json({ knowledgeSpace: created });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to create knowledge space' } });
  }
});

// GET /api/knowledge-spaces/:id - Get space details with sources
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

// GET /api/knowledge-spaces/:id/sources - List sources for space
knowledgeRouter.get('/:id/sources', async (req: Request, res: Response) => {
  try {
    const spaceId = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;

    const sources = await jarvisData.knowledge.listSourcesForSpace(spaceId, workspaceId);
    res.json({
      spaceId,
      sources,
      count: sources.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list space sources' } });
  }
});

// POST /api/knowledge-spaces/:id/sources - Add source & run ingestion pipeline
knowledgeRouter.post('/:id/sources', async (req: Request, res: Response) => {
  try {
    const spaceId = req.params.id as string;
    const { name, title, content, fullText, type, author, workspaceId } = req.body;
    const sourceName = name || title;
    const textContent = content || fullText;

    if (!sourceName || typeof sourceName !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'name or title is required.' } });
      return;
    }

    if (!textContent || typeof textContent !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'content or fullText is required.' } });
      return;
    }

    const space = await jarvisData.knowledge.getSpaceById(spaceId, workspaceId);
    if (!space) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Knowledge space not found.' } });
      return;
    }

    const ingestionResult = await ingestionPipeline.ingestSource({
      workspaceId: workspaceId || space.workspaceId,
      knowledgeSpaceId: spaceId,
      name: sourceName.trim(),
      rawContent: textContent,
      type: type || 'notes',
      author: author || 'User'
    });

    const createdSource = await jarvisData.knowledge.getSourceById(ingestionResult.sourceId);

    res.status(201).json({
      source: createdSource,
      ingestion: ingestionResult,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to ingest knowledge source' } });
  }
});

// POST /api/knowledge-spaces/:id/sources/:sourceId/ingest - Trigger/Re-run ingestion
knowledgeRouter.post('/:id/sources/:sourceId/ingest', async (req: Request, res: Response) => {
  try {
    const { id: spaceId, sourceId } = req.params as { id: string; sourceId: string };
    const forceReindex = req.body.forceReindex === true;

    const source = await jarvisData.knowledge.getSourceById(sourceId);
    if (!source || source.knowledgeSpaceId !== spaceId) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Knowledge source not found in this space.' } });
      return;
    }

    const ingestionResult = await ingestionPipeline.ingestSource(
      {
        id: source.id,
        workspaceId: source.workspaceId,
        knowledgeSpaceId: spaceId,
        name: source.name,
        rawContent: source.fullText,
        type: source.type,
        author: source.author
      },
      { forceReindex }
    );

    res.json({
      sourceId,
      ingestion: ingestionResult,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to re-index source' } });
  }
});

// DELETE /api/knowledge-spaces/:id/sources/:sourceId - Delete source & chunks
knowledgeRouter.delete('/:id/sources/:sourceId', async (req: Request, res: Response) => {
  try {
    const { sourceId } = req.params as { id: string; sourceId: string };
    const deleted = await jarvisData.knowledge.deleteSource(sourceId);

    if (!deleted) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Knowledge source not found.' } });
      return;
    }

    res.json({
      deleted: true,
      sourceId,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to delete source' } });
  }
});

// POST /api/knowledge-spaces/:id/retrieve - Hybrid vector + lexical retrieval
knowledgeRouter.post('/:id/retrieve', async (req: Request, res: Response) => {
  try {
    const spaceId = req.params.id as string;
    const { query, topK, workspaceId, sourceIds } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'query parameter is required.' } });
      return;
    }

    const chunks = await retrievalService.retrieve(spaceId, query.trim(), {
      topK: typeof topK === 'number' ? topK : 5,
      workspaceId,
      sourceIds
    });

    res.json({
      spaceId,
      query: query.trim(),
      count: chunks.length,
      chunks,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Hybrid retrieval failed' } });
  }
});

// POST /api/knowledge-spaces/:id/query - Grounded Q&A with synthesis & citations
knowledgeRouter.post('/:id/query', async (req: Request, res: Response) => {
  try {
    const spaceId = req.params.id as string;
    const { query, workspaceId, userId, userRole, topK } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'query parameter is required.' } });
      return;
    }

    const groundedResult = await groundingService.answerQuery(spaceId, query.trim(), {
      topK,
      workspaceId,
      userId,
      userRole
    });

    res.json({
      ...groundedResult,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const statusCode = err.message?.includes('Access denied') ? 403 : err.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: { code: 'GROUNDING_ERROR', message: err.message || 'Grounded query failed' } });
  }
});
