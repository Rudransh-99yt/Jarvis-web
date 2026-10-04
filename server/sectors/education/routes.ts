import { Router, type Request, type Response } from 'express';
import { educationStore } from './educationStore.ts';
import { videoRouter } from './videoRoutes.ts';
import { classSessionRouter } from './classSessions/classSessionRoutes.ts';
import { communityRouter } from './community/communityRoutes.ts';
import { focusRouter } from './focus/focusRoutes.ts';
import { academicIntegrationRouter } from './academicRoutes.ts';
import { engagementRouter } from './engagement/engagementRoutes.ts';
import { teacherRouter } from './teacher/teacherRoutes.ts';
import { familyRouter } from './family/familyRoutes.ts';
import { institutionalRouter } from './institutional/institutionalRoutes.ts';

export const educationRouter = Router();

// Phase D.7: Family & Parent Intelligence Routes
educationRouter.use('/family', familyRouter);

// Phase D.7: Principal & Institutional Intelligence Routes
educationRouter.use('/institutional', institutionalRouter);

// Phase D.6: Teacher Operating System Routes (Action Queue, Attention, Post-Class Review, Class Intelligence)
educationRouter.use('/teacher', teacherRouter);

// Phase D: Education OS Shared Academic Integration & Context Routes
educationRouter.use('/integration', academicIntegrationRouter);

// Phase D.5: Student Personal OS Engagement & Leaderboard Routes
educationRouter.use('/engagement', engagementRouter);

// Pro Focus / Pomodoro + Focus Lock Routes
educationRouter.use('/focus', focusRouter);

// Discord-Style Academic Community Routes
educationRouter.use('/community', communityRouter);

// AI Teacher Preparation & Class Session Routes
educationRouter.use('/sessions', classSessionRouter);

// Milestone 14: Video Library & Media Knowledge Routes
educationRouter.use('/videos', videoRouter);

// GET /api/education/state - Hydrate entire Education sector state
educationRouter.get('/state', (_req: Request, res: Response) => {
  res.json({
    institution: educationStore.getInstitution(),
    classes: educationStore.getClasses(),
    assignments: educationStore.getAssignments(),
    submissions: educationStore.getSubmissions(),
    knowledgeSpaces: educationStore.getKnowledgeSpaces(),
    timestamp: new Date().toISOString()
  });
});

// GET /api/education/institution
educationRouter.get('/institution', (_req: Request, res: Response) => {
  res.json({
    institution: educationStore.getInstitution()
  });
});

// GET /api/education/classes
educationRouter.get('/classes', (_req: Request, res: Response) => {
  res.json({
    classes: educationStore.getClasses()
  });
});

// GET /api/education/classes/:id
educationRouter.get('/classes/:id', (req: Request, res: Response) => {
  const classId = req.params.id as string;
  const cls = educationStore.getClass(classId);
  if (!cls) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
    return;
  }
  res.json({ class: cls });
});

// GET /api/education/classes/:id/units
educationRouter.get('/classes/:id/units', (req: Request, res: Response) => {
  const classId = req.params.id as string;
  res.json({
    units: educationStore.getUnits(classId)
  });
});

// POST /api/education/classes/:id/units - Teacher creates unit
educationRouter.post('/classes/:id/units', (req: Request, res: Response) => {
  const classId = req.params.id as string;
  const { title, description, learningObjectives, estimatedHours, number } = req.body;
  if (!title) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title is required.' } });
    return;
  }
  const unit = educationStore.addUnitToCourse(classId, {
    courseId: classId,
    number: number || 1,
    title,
    description: description || '',
    learningObjectives: learningObjectives || [],
    estimatedHours: estimatedHours || 10,
    lessons: []
  });
  res.status(201).json({ unit });
});

// POST /api/education/classes/:id/units/:unitId/lessons - Teacher creates lesson
educationRouter.post('/classes/:id/units/:unitId/lessons', (req: Request, res: Response) => {
  const classId = req.params.id as string;
  const unitId = req.params.unitId as string;
  const { title, description, durationMinutes, videoId, videoTimestampSeconds, notes, keyTakeaways, number } = req.body;
  if (!title) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title is required.' } });
    return;
  }
  const lesson = educationStore.addLessonToUnit(classId, unitId, {
    number: number || 1,
    title,
    description: description || '',
    durationMinutes: durationMinutes || 45,
    videoId,
    videoTimestampSeconds,
    notes,
    keyTakeaways: keyTakeaways || [],
    isCompleted: false
  });
  res.status(201).json({ lesson });
});

// POST /api/education/classes/:id/units/:unitId/lessons/:lessonId/complete - Toggle lesson completion
educationRouter.post('/classes/:id/units/:unitId/lessons/:lessonId/complete', (req: Request, res: Response) => {
  const { isCompleted } = req.body;
  const classId = req.params.id as string;
  const unitId = req.params.unitId as string;
  const lessonId = req.params.lessonId as string;

  const success = educationStore.toggleLessonCompletion(classId, unitId, lessonId, Boolean(isCompleted));
  res.json({ success, isCompleted: Boolean(isCompleted) });
});

// GET /api/education/assignments
educationRouter.get('/assignments', (req: Request, res: Response) => {
  const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
  res.json({
    assignments: educationStore.getAssignments(classId)
  });
});

// POST /api/education/assignments - Teacher creates assignment
educationRouter.post('/assignments', (req: Request, res: Response) => {
  const { classId, title, description, instructions, dueDate, maxScore, category, teacherId } = req.body;

  if (!classId || !title || !instructions || !dueDate) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'classId, title, instructions, and dueDate are required.' }
    });
    return;
  }

  const created = educationStore.createAssignment({
    classId,
    title,
    description: description || title,
    instructions,
    dueDate,
    maxScore: Number(maxScore) || 100,
    category,
    teacherId
  });

  res.status(201).json({ assignment: created });
});

// GET /api/education/submissions
educationRouter.get('/submissions', (req: Request, res: Response) => {
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
  const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined;
  res.json({
    submissions: educationStore.getSubmissions(studentId, assignmentId)
  });
});

// POST /api/education/submissions - Student submits work
educationRouter.post('/submissions', (req: Request, res: Response) => {
  const { assignmentId, studentId, studentName, content, attachments } = req.body;

  if (!assignmentId || !studentId || !content) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'assignmentId, studentId, and content are required.' }
    });
    return;
  }

  const submission = educationStore.createOrUpdateSubmission({
    assignmentId,
    studentId,
    studentName,
    content,
    attachments
  });

  res.status(201).json({ submission });
});

// POST /api/education/submissions/:id/grade - Teacher grades submission
educationRouter.post('/submissions/:id/grade', (req: Request, res: Response) => {
  const { grade, feedback } = req.body;
  if (typeof grade !== 'number') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'grade must be a number.' } });
    return;
  }

  const submissionId = req.params.id as string;
  const graded = educationStore.gradeSubmission(submissionId, grade, feedback || 'Good work.');
  if (!graded) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Submission not found.' } });
    return;
  }

  res.json({ submission: graded });
});

// GET /api/education/knowledge-spaces
educationRouter.get('/knowledge-spaces', (_req: Request, res: Response) => {
  res.json({
    knowledgeSpaces: educationStore.getKnowledgeSpaces()
  });
});

// POST /api/education/knowledge-spaces
educationRouter.post('/knowledge-spaces', (req: Request, res: Response) => {
  const { title, description, category, tags, classId } = req.body;
  if (!title) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title is required.' } });
    return;
  }

  const created = educationStore.createKnowledgeSpace({
    title,
    description: description || '',
    category,
    tags,
    classId
  });

  res.status(201).json({ knowledgeSpace: created });
});

// POST /api/education/knowledge-spaces/:id/sources - Add source document & trigger RAG ingestion
educationRouter.post('/knowledge-spaces/:id/sources', async (req: Request, res: Response) => {
  const { title, name, type, author, summary, fullText, content } = req.body;
  const sourceName = title || name;
  const rawText = fullText || content;

  if (!sourceName || !rawText) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title and fullText/content are required.' } });
    return;
  }

  const spaceId = req.params.id as string;
  const space = educationStore.getKnowledgeSpace(spaceId);
  if (!space) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Knowledge Space not found.' } });
    return;
  }

  const { ingestionPipeline } = await import('../../rag/ingestionPipeline.ts');
  const ingestionResult = await ingestionPipeline.ingestSource({
    workspaceId: 'ws-stark-core',
    knowledgeSpaceId: spaceId,
    name: sourceName.trim(),
    rawContent: rawText,
    type: type || 'notes',
    author: author || 'User'
  });

  const sources = educationStore.getKnowledgeSpace(spaceId)?.sources || [];
  const createdSource = sources.find((s) => s.id === ingestionResult.sourceId) || {
    id: ingestionResult.sourceId,
    spaceId,
    title: sourceName,
    type: type || 'notes',
    author: author || 'User',
    dateAdded: new Date().toISOString().split('T')[0],
    summary: summary || rawText.slice(0, 150),
    fullText: rawText,
    tokenCount: ingestionResult.tokenCount
  };

  res.status(201).json({ source: createdSource, ingestion: ingestionResult });
});

// POST /api/education/knowledge-spaces/:id/query - Grounded retrieval Q&A
educationRouter.post('/knowledge-spaces/:id/query', async (req: Request, res: Response) => {
  const { query, userId, userRole } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'query string is required.' } });
    return;
  }

  const spaceId = req.params.id as string;

  try {
    const { groundingService } = await import('../../rag/groundingService.ts');
    const result = await groundingService.answerQuery(spaceId, query, {
      workspaceId: 'ws-stark-core',
      userId,
      userRole
    });
    res.json(result);
  } catch (err: any) {
    const fallbackResult = educationStore.queryGrounded(spaceId, query);
    res.json(fallbackResult);
  }
});

// ==========================================
// NOTION-STYLE MY WORKSPACE REST ROUTES
// ==========================================

// GET /api/education/workspace/pages - List non-deleted workspace pages
educationRouter.get('/workspace/pages', (_req: Request, res: Response) => {
  res.json({
    pages: educationStore.getWorkspacePages(false)
  });
});

// GET /api/education/workspace/trash - List deleted workspace pages
educationRouter.get('/workspace/trash', (_req: Request, res: Response) => {
  res.json({
    pages: educationStore.getWorkspacePages(true)
  });
});

// GET /api/education/workspace/pages/:id - Get single page
educationRouter.get('/workspace/pages/:id', (req: Request, res: Response) => {
  const pageId = req.params.id as string;
  const page = educationStore.getWorkspacePage(pageId);
  if (!page) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found.' } });
    return;
  }
  res.json({ page });
});

// POST /api/education/workspace/pages - Create new workspace page
educationRouter.post('/workspace/pages', (req: Request, res: Response) => {
  const page = educationStore.createWorkspacePage(req.body);
  res.status(201).json({ page });
});

// PUT /api/education/workspace/pages/:id - Update page metadata/properties
educationRouter.put('/workspace/pages/:id', (req: Request, res: Response) => {
  const pageId = req.params.id as string;
  const updated = educationStore.updateWorkspacePage(pageId, req.body);
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found.' } });
    return;
  }
  res.json({ page: updated });
});

// PUT /api/education/workspace/pages/:id/blocks - Update block content
educationRouter.put('/workspace/pages/:id/blocks', (req: Request, res: Response) => {
  const pageId = req.params.id as string;
  const { blocks } = req.body;
  if (!Array.isArray(blocks)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'blocks array is required.' } });
    return;
  }
  const updated = educationStore.updateWorkspacePageBlocks(pageId, blocks);
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found.' } });
    return;
  }
  res.json({ page: updated });
});

// DELETE /api/education/workspace/pages/:id - Soft delete (trash) or permanent delete
educationRouter.delete('/workspace/pages/:id', (req: Request, res: Response) => {
  const pageId = req.params.id as string;
  const permanent = req.query.permanent === 'true';
  const success = educationStore.deleteWorkspacePage(pageId, permanent);
  if (!success) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found.' } });
    return;
  }
  res.json({ success: true, pageId, permanent });
});

// POST /api/education/workspace/pages/:id/restore - Restore from trash
educationRouter.post('/workspace/pages/:id/restore', (req: Request, res: Response) => {
  const pageId = req.params.id as string;
  const success = educationStore.restoreWorkspacePage(pageId);
  if (!success) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found in trash.' } });
    return;
  }
  res.json({ success: true, page: educationStore.getWorkspacePage(pageId) });
});

// GET /api/education/workspace/databases - List all database collections
educationRouter.get('/workspace/databases', (_req: Request, res: Response) => {
  res.json({
    databases: educationStore.getWorkspaceDatabases()
  });
});

// GET /api/education/workspace/databases/:id - Get database
educationRouter.get('/workspace/databases/:id', (req: Request, res: Response) => {
  const dbId = req.params.id as string;
  const db = educationStore.getWorkspaceDatabase(dbId);
  if (!db) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Database collection not found.' } });
    return;
  }
  res.json({ database: db });
});

// POST /api/education/workspace/databases - Create database collection
educationRouter.post('/workspace/databases', (req: Request, res: Response) => {
  const db = educationStore.createWorkspaceDatabase(req.body);
  res.status(201).json({ database: db });
});

// PUT /api/education/workspace/databases/:id - Update database collection / items
educationRouter.put('/workspace/databases/:id', (req: Request, res: Response) => {
  const dbId = req.params.id as string;
  const updated = educationStore.updateWorkspaceDatabase(dbId, req.body);
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Database collection not found.' } });
    return;
  }
  res.json({ database: updated });
});

// GET /api/education/workspace/templates - List built-in workspace templates
educationRouter.get('/workspace/templates', (_req: Request, res: Response) => {
  res.json({
    templates: educationStore.getWorkspaceTemplates()
  });
});

// POST /api/education/workspace/pages/from-template - Instantiate page from template
educationRouter.post('/workspace/pages/from-template', (req: Request, res: Response) => {
  const { templateId, customTitle, academicLink } = req.body;
  if (!templateId) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'templateId is required.' } });
    return;
  }
  const page = educationStore.createPageFromTemplate(templateId, customTitle, academicLink);
  res.status(201).json({ page });
});

// GET /api/education/workspace/search - Search pages, blocks, and tags
educationRouter.get('/workspace/search', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const results = educationStore.searchWorkspace(q);
  res.json({ results, query: q });
});

// GET /api/education/workspace/by-lesson/:courseId/:lessonId - Find notes linked to an academic lesson
educationRouter.get('/workspace/by-lesson/:courseId/:lessonId', (req: Request, res: Response) => {
  const { courseId, lessonId } = req.params;
  const pages = educationStore.getWorkspacePagesForLesson(courseId as string, lessonId as string);
  res.json({ pages });
});
