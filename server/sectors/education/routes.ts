import { Router, Request, Response } from 'express';
import { educationStore } from './educationStore.ts';

export const educationRouter = Router();

// GET /api/education/state - Hydrate entire Education sector state
educationRouter.get('/state', (_req: Request, res: Response) => {
  res.json({
    classes: educationStore.getClasses(),
    assignments: educationStore.getAssignments(),
    submissions: educationStore.getSubmissions(),
    knowledgeSpaces: educationStore.getKnowledgeSpaces(),
    timestamp: new Date().toISOString()
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

// POST /api/education/knowledge-spaces/:id/sources - Add source document
educationRouter.post('/knowledge-spaces/:id/sources', (req: Request, res: Response) => {
  const { title, type, author, summary, fullText, tokenCount } = req.body;
  if (!title || !fullText) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title and fullText are required.' } });
    return;
  }

  const spaceId = req.params.id as string;
  const newSource = educationStore.addSourceToSpace(spaceId, {
    title,
    type: type || 'notes',
    author: author || 'User',
    summary: summary || fullText.slice(0, 150),
    fullText,
    tokenCount: tokenCount || Math.round(fullText.split(/\s+/).length * 1.3)
  });

  if (!newSource) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Knowledge Space not found.' } });
    return;
  }

  res.status(201).json({ source: newSource });
});

// POST /api/education/knowledge-spaces/:id/query - Grounded retrieval Q&A
educationRouter.post('/knowledge-spaces/:id/query', (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'query string is required.' } });
    return;
  }

  const spaceId = req.params.id as string;
  const result = educationStore.queryGrounded(spaceId, query);
  res.json(result);
});
