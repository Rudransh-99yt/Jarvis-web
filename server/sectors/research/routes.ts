// Research & Labs Sector REST API Routes
import { Router, type Request, type Response } from 'express';
import { jarvisData } from '../../data/index.ts';
import { researchAssistant } from './researchAssistant.ts';
import type { ResearchAssistantMode, ResearchProjectStatus } from '../../../src/types/research.ts';

export const researchRouter = Router();

// GET /api/research/projects - List research projects
researchRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as ResearchProjectStatus) : undefined;
    const projects = await jarvisData.research.listProjects(workspaceId, status);
    res.json({
      projects,
      count: projects.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to list projects' } });
  }
});

// POST /api/research/projects - Create a new research project
researchRouter.post('/projects', async (req: Request, res: Response) => {
  try {
    const { title, description, researchQuestion, workspaceId, ownerId, knowledgeSpaceIds, status } = req.body;
    if (!title || !researchQuestion) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title and researchQuestion are required.' } });
      return;
    }

    const project = await jarvisData.research.createProject({
      title: title.trim(),
      description: (description || '').trim(),
      researchQuestion: researchQuestion.trim(),
      workspaceId: workspaceId || 'ws-stark-core',
      ownerId: ownerId || 'user-tony',
      knowledgeSpaceIds: Array.isArray(knowledgeSpaceIds) ? knowledgeSpaceIds : [],
      status: status || 'active'
    });

    res.status(201).json({
      project,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'CREATION_FAILED', message: err.message || 'Failed to create project' } });
  }
});

// GET /api/research/projects/:id - Get project with sub-entities
researchRouter.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const project = await jarvisData.research.getProjectById(projectId, workspaceId);

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } });
      return;
    }

    const [questions, evidence, notes, reports] = await Promise.all([
      jarvisData.research.listQuestions(projectId, project.workspaceId),
      jarvisData.research.listEvidence(projectId),
      jarvisData.research.listNotes(projectId),
      jarvisData.research.listReports(projectId)
    ]);

    res.json({
      project,
      questions,
      evidence,
      notes,
      reports,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message || 'Failed to retrieve project' } });
  }
});

// PATCH /api/research/projects/:id - Update project
researchRouter.patch('/projects/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const updated = await jarvisData.research.updateProject(projectId, req.body, workspaceId);

    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } });
      return;
    }

    res.json({ project: updated, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: err.message || 'Failed to update project' } });
  }
});

// DELETE /api/research/projects/:id - Delete project
researchRouter.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const ok = await jarvisData.research.deleteProject(projectId, workspaceId);

    if (!ok) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } });
      return;
    }

    res.json({ success: true, projectId, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DELETE_FAILED', message: err.message || 'Failed to delete project' } });
  }
});

// QUESTIONS
researchRouter.get('/projects/:id/questions', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const questions = await jarvisData.research.listQuestions(projectId);
    res.json({ questions, count: questions.length });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

researchRouter.post('/projects/:id/questions', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { title, question, priority, status, notes } = req.body;
    if (!title || !question) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title and question are required.' } });
      return;
    }

    const project = await jarvisData.research.getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } });
      return;
    }

    const created = await jarvisData.research.createQuestion({
      projectId,
      workspaceId: project.workspaceId,
      title: title.trim(),
      question: question.trim(),
      priority: priority || 'medium',
      status: status || 'open',
      notes: notes || '',
      linkedEvidenceIds: []
    });

    res.status(201).json({ question: created });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'CREATION_FAILED', message: err.message } });
  }
});

// EVIDENCE
researchRouter.get('/projects/:id/evidence', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const questionId = typeof req.query.questionId === 'string' ? req.query.questionId : undefined;
    const evidence = await jarvisData.research.listEvidence(projectId, questionId);
    res.json({ evidence, count: evidence.length });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

researchRouter.post('/projects/:id/evidence', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { knowledgeSourceId, knowledgeSpaceId, sourceTitle, chunkId, chunkText, citation, relevance, userNote, tags, questionId } = req.body;

    const project = await jarvisData.research.getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } });
      return;
    }

    const evidence = await jarvisData.research.createEvidence({
      projectId,
      workspaceId: project.workspaceId,
      questionId,
      knowledgeSourceId: knowledgeSourceId || '',
      knowledgeSpaceId: knowledgeSpaceId || '',
      sourceTitle: sourceTitle || 'Indexed Source',
      chunkId: chunkId || `chunk-${Date.now()}`,
      chunkText: chunkText || '',
      citation: citation || {
        sourceId: knowledgeSourceId || '',
        sourceTitle: sourceTitle || '',
        excerpt: (chunkText || '').slice(0, 200)
      },
      relevance: typeof relevance === 'number' ? relevance : 0.9,
      userNote,
      tags: Array.isArray(tags) ? tags : []
    });

    res.status(201).json({ evidence });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'CREATION_FAILED', message: err.message } });
  }
});

// NOTES
researchRouter.get('/projects/:id/notes', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const notes = await jarvisData.research.listNotes(projectId);
    res.json({ notes, count: notes.length });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

researchRouter.post('/projects/:id/notes', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { title, content, linkedQuestionIds, linkedEvidenceIds, tags, authorId } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title and content are required.' } });
      return;
    }

    const project = await jarvisData.research.getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Project '${projectId}' not found.` } });
      return;
    }

    const note = await jarvisData.research.createNote({
      projectId,
      workspaceId: project.workspaceId,
      authorId: authorId || 'user-tony',
      title: title.trim(),
      content: content.trim(),
      linkedQuestionIds: Array.isArray(linkedQuestionIds) ? linkedQuestionIds : [],
      linkedEvidenceIds: Array.isArray(linkedEvidenceIds) ? linkedEvidenceIds : [],
      tags: Array.isArray(tags) ? tags : []
    });

    res.status(201).json({ note });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'CREATION_FAILED', message: err.message } });
  }
});

// REPORTS
researchRouter.get('/projects/:id/reports', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const reports = await jarvisData.research.listReports(projectId);
    res.json({ reports, count: reports.length });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

researchRouter.post('/projects/:id/reports', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { title, questionId, workspaceId, userId, userRole } = req.body;

    const report = await researchAssistant.generateReport(projectId, {
      title,
      questionId,
      workspaceId,
      userId,
      userRole
    });

    res.status(201).json({ report, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'REPORT_GENERATION_FAILED', message: err.message || 'Report generation failed' } });
  }
});

// AI RESEARCH ASSISTANT INVESTIGATE
researchRouter.post('/projects/:id/investigate', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id as string;
    const { query, mode, questionId, workspaceId, userId, userRole, topK } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'query string is required.' } });
      return;
    }

    const result = await researchAssistant.investigate(projectId, query, {
      mode: mode as ResearchAssistantMode,
      questionId,
      workspaceId,
      userId,
      userRole,
      topK
    });

    res.json(result);
  } catch (err: any) {
    const statusCode = err.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: { code: 'INVESTIGATION_ERROR', message: err.message || 'Investigation failed' } });
  }
});
