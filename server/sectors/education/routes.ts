// JARVIS EDUCATION OS — REST & Realtime API Routes (Phase P0-2 Hardened)
import { Router, type Request, type Response } from 'express';
import { educationStore } from './educationStore.ts';
import { educationPolicy } from './educationPolicy.ts';
import { videoRouter } from './videoRoutes.ts';
import { classSessionRouter } from './classSessions/classSessionRoutes.ts';
import { communityRouter } from './community/communityRoutes.ts';
import { focusRouter } from './focus/focusRoutes.ts';
import { academicIntegrationRouter } from './academicRoutes.ts';
import { engagementRouter } from './engagement/engagementRoutes.ts';
import { teacherRouter } from './teacher/teacherRoutes.ts';
import { familyRouter } from './family/familyRoutes.ts';
import { institutionalRouter } from './institutional/institutionalRoutes.ts';
import { smartboardRouter } from './smartboard/smartboardRoutes.ts';
import { visualizationRouter } from './visualization/visualizationRoutes.ts';
import { familyService } from './family/familyService.ts';
import { authenticateRequest } from '../../auth/index.ts';
import { jarvisData } from '../../data/index.ts';
import type { User } from '../../data/types.ts';
import type { StudentSubmission } from '../../../src/types/education.ts';

export const educationRouter = Router();

// Phase D.10: AI Visualization Engine Routes
educationRouter.use('/visualizations', visualizationRouter);

// Phase D.8: SmartBoard OS & Physical Classroom Surface Routes
educationRouter.use('/smartboard', smartboardRouter);

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

// Helper error responder
function handleEducationError(err: any, res: Response, fallbackCode = 'EDUCATION_ERROR') {
  if (res.headersSent) return;
  const statusCode = err.statusCode || (err.code === 'UNAUTHENTICATED' ? 401 : err.code === 'FORBIDDEN' ? 403 : 500);
  if (statusCode === 500 && err && err.stack) {
    console.error('[Education Internal Error]', err);
  }
  res.status(statusCode).json({
    error: {
      code: err.code || (statusCode === 401 ? 'UNAUTHENTICATED' : statusCode === 403 ? 'FORBIDDEN' : fallbackCode),
      message: err.message || 'Operation failed.'
    }
  });
}

// 1. GET /api/education/state - Hydrate authenticated Education sector state (Strictly Scoped)
educationRouter.get('/state', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const scopedState = await educationPolicy.filterStateForUser(user);
    res.json(scopedState);
  } catch (err: any) {
    handleEducationError(err, res, 'STATE_ERROR');
  }
});

// 2. GET /api/education/institution - Institution metadata
educationRouter.get('/institution', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const instCheck = educationPolicy.canAccessInstitution(user);
    if (!instCheck.allowed) {
      res.status(instCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: instCheck.reason } });
      return;
    }
    res.json({
      institution: educationStore.getInstitution()
    });
  } catch (err: any) {
    handleEducationError(err, res, 'INSTITUTION_ERROR');
  }
});

// 3. GET /api/education/classes - List authorized courses/classes
educationRouter.get('/classes', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const allClasses = educationStore.getClasses();

    // Filter by user role & assignment
    const accessibleClasses = [];
    for (const cls of allClasses) {
      const check = await educationPolicy.canAccessClass(user, cls.id);
      if (check.allowed) {
        accessibleClasses.push(cls);
      }
    }

    res.json({ classes: accessibleClasses });
  } catch (err: any) {
    handleEducationError(err, res, 'CLASSES_ERROR');
  }
});

// 4. GET /api/education/classes/:id - Get single class by ID
educationRouter.get('/classes/:id', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const classId = req.params.id as string;

    const accessCheck = await educationPolicy.canAccessClass(user, classId);
    if (!accessCheck.allowed) {
      res.status(accessCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: accessCheck.reason } });
      return;
    }

    const cls = educationStore.getClass(classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }
    res.json({ class: cls });
  } catch (err: any) {
    handleEducationError(err, res, 'CLASS_ERROR');
  }
});

// 5. GET /api/education/classes/:id/units - Get units for class
educationRouter.get('/classes/:id/units', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const classId = req.params.id as string;

    const accessCheck = await educationPolicy.canAccessClass(user, classId);
    if (!accessCheck.allowed) {
      res.status(accessCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: accessCheck.reason } });
      return;
    }

    res.json({
      units: educationStore.getUnits(classId)
    });
  } catch (err: any) {
    handleEducationError(err, res, 'UNITS_ERROR');
  }
});

// 6. POST /api/education/classes/:id/units - Teacher creates unit
educationRouter.post('/classes/:id/units', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const classId = req.params.id as string;

    const manageCheck = educationPolicy.canManageClass(user, classId);
    if (!manageCheck.allowed) {
      res.status(manageCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: manageCheck.reason } });
      return;
    }

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
  } catch (err: any) {
    handleEducationError(err, res, 'UNIT_CREATE_ERROR');
  }
});

// 7. POST /api/education/classes/:id/units/:unitId/lessons - Teacher creates lesson
educationRouter.post('/classes/:id/units/:unitId/lessons', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const classId = req.params.id as string;
    const unitId = req.params.unitId as string;

    const manageCheck = educationPolicy.canManageClass(user, classId);
    if (!manageCheck.allowed) {
      res.status(manageCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: manageCheck.reason } });
      return;
    }

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
  } catch (err: any) {
    handleEducationError(err, res, 'LESSON_CREATE_ERROR');
  }
});

// 8. POST /api/education/classes/:id/units/:unitId/lessons/:lessonId/complete - Toggle lesson completion
educationRouter.post('/classes/:id/units/:unitId/lessons/:lessonId/complete', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const classId = req.params.id as string;
    const unitId = req.params.unitId as string;
    const lessonId = req.params.lessonId as string;
    const { isCompleted } = req.body;

    const accessCheck = await educationPolicy.canAccessClass(user, classId);
    if (!accessCheck.allowed) {
      res.status(accessCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: accessCheck.reason } });
      return;
    }

    const success = educationStore.toggleLessonCompletion(classId, unitId, lessonId, Boolean(isCompleted));
    res.json({ success, isCompleted: Boolean(isCompleted) });
  } catch (err: any) {
    handleEducationError(err, res, 'LESSON_COMPLETE_ERROR');
  }
});

// 9. GET /api/education/assignments - Query assignments (scoped)
educationRouter.get('/assignments', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const queryClassId = typeof req.query.classId === 'string' ? req.query.classId : undefined;

    if (queryClassId) {
      const accessCheck = await educationPolicy.canAccessClass(user, queryClassId);
      if (!accessCheck.allowed) {
        res.status(accessCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: accessCheck.reason } });
        return;
      }
      res.json({ assignments: educationStore.getAssignments(queryClassId) });
      return;
    }

    // Return all assignments matching user's accessible classes
    const state = await educationPolicy.filterStateForUser(user);
    res.json({ assignments: state.assignments });
  } catch (err: any) {
    handleEducationError(err, res, 'ASSIGNMENTS_ERROR');
  }
});

// 10. POST /api/education/assignments - Teacher creates assignment
educationRouter.post('/assignments', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { classId, title, description, instructions, dueDate, maxScore, category } = req.body;

    if (!classId || !title || !instructions || !dueDate) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'classId, title, instructions, and dueDate are required.' }
      });
      return;
    }

    const manageCheck = educationPolicy.canManageClass(user, classId);
    if (!manageCheck.allowed) {
      res.status(manageCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: manageCheck.reason } });
      return;
    }

    // Teacher ID is derived STRICTLY from req.auth.id
    const created = educationStore.createAssignment({
      classId,
      title,
      description: description || title,
      instructions,
      dueDate,
      maxScore: Number(maxScore) || 100,
      category,
      teacherId: user.id
    });

    res.status(201).json({ assignment: created });
  } catch (err: any) {
    handleEducationError(err, res, 'ASSIGNMENT_CREATE_ERROR');
  }
});

// 11. GET /api/education/submissions - Query submissions (privacy & scope enforced)
educationRouter.get('/submissions', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const requestedStudentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined;

    // Student Privacy Rule: Students can NEVER view other students' submissions
    if (user.role === 'student') {
      if (requestedStudentId && requestedStudentId !== user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Privacy Violation: Student '${user.id}' is not authorized to access submissions for student '${requestedStudentId}'.`
          }
        });
        return;
      }
      res.json({ submissions: educationStore.getSubmissions(user.id, assignmentId) });
      return;
    }

    // Teacher Rule: Can only view submissions for assigned classes
    if (user.role === 'teacher') {
      const assignedClasses = educationStore.getClasses().filter((c) => (c.instructorId || (c as any).teacherId) === user.id);
      const assignedClassIds = new Set(assignedClasses.map((c) => c.id));
      const submissions = educationStore.getSubmissions(requestedStudentId, assignmentId)
        .filter((s) => assignedClassIds.has(s.classId));
      res.json({ submissions });
      return;
    }

    // Parent Rule: Can only view submissions for linked children
    if (user.role === 'parent') {
      const children = await familyService.getChildrenForParent(user.id);
      const childIds = new Set(children.map((c) => c.studentId));

      if (requestedStudentId && !childIds.has(requestedStudentId)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Privacy Violation: Parent '${user.id}' has no linked child '${requestedStudentId}'.`
          }
        });
        return;
      }

      const submissions = educationStore.getSubmissions(requestedStudentId, assignmentId)
        .filter((s) => childIds.has(s.studentId));
      res.json({ submissions });
      return;
    }

    // Leadership / Admin
    res.json({ submissions: educationStore.getSubmissions(requestedStudentId, assignmentId) });
  } catch (err: any) {
    handleEducationError(err, res, 'SUBMISSIONS_ERROR');
  }
});

// 12. POST /api/education/submissions - Student submits work (Server-Derived Identity)
educationRouter.post('/submissions', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { assignmentId, content, attachments } = req.body;

    if (!assignmentId || !content) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'assignmentId and content are required.' }
      });
      return;
    }

    const submitCheck = educationPolicy.canSubmitAssignment(user, assignmentId);
    if (!submitCheck.allowed) {
      res.status(submitCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: submitCheck.reason } });
      return;
    }

    // Student identity comes STRICTLY from req.auth
    const submission = educationStore.createOrUpdateSubmission({
      assignmentId,
      studentId: user.id,
      studentName: user.displayName || 'Student',
      content,
      attachments
    });

    res.status(201).json({ submission });
  } catch (err: any) {
    handleEducationError(err, res, 'SUBMISSION_CREATE_ERROR');
  }
});

// 13. POST /api/education/submissions/:id/grade - Teacher grades submission
educationRouter.post('/submissions/:id/grade', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { grade, feedback } = req.body;

    if (typeof grade !== 'number') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'grade must be a number.' } });
      return;
    }

    const submissionId = req.params.id as string;
    const allSubs = educationStore.getSubmissions();
    const targetSub = allSubs.find((s) => s.id === submissionId);

    if (!targetSub) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Submission not found.' } });
      return;
    }

    const gradeCheck = educationPolicy.canGradeSubmission(user, targetSub);
    if (!gradeCheck.allowed) {
      res.status(gradeCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: gradeCheck.reason } });
      return;
    }

    const graded = educationStore.gradeSubmission(submissionId, grade, feedback || 'Good work.');
    res.json({ submission: graded });
  } catch (err: any) {
    handleEducationError(err, res, 'GRADE_ERROR');
  }
});

// 14. GET /api/education/knowledge-spaces - List knowledge spaces
educationRouter.get('/knowledge-spaces', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    res.json({
      knowledgeSpaces: educationStore.getKnowledgeSpaces()
    });
  } catch (err: any) {
    handleEducationError(err, res, 'KNOWLEDGE_SPACES_ERROR');
  }
});

// 15. POST /api/education/knowledge-spaces - Create knowledge space
educationRouter.post('/knowledge-spaces', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { title, description, category, tags, classId } = req.body;

    if (!title) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title is required.' } });
      return;
    }

    if (classId) {
      const accessCheck = await educationPolicy.canAccessClass(user, classId);
      if (!accessCheck.allowed) {
        res.status(accessCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: accessCheck.reason } });
        return;
      }
    }

    const created = educationStore.createKnowledgeSpace({
      title,
      description: description || '',
      category,
      tags,
      classId
    });

    res.status(201).json({ knowledgeSpace: created });
  } catch (err: any) {
    handleEducationError(err, res, 'KNOWLEDGE_SPACE_CREATE_ERROR');
  }
});

// 16. POST /api/education/knowledge-spaces/:id/sources - Add source document & trigger RAG ingestion
educationRouter.post('/knowledge-spaces/:id/sources', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { title, name, type, summary, fullText, content } = req.body;
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
      author: user.displayName || user.id
    });

    const sources = educationStore.getKnowledgeSpace(spaceId)?.sources || [];
    const createdSource = sources.find((s) => s.id === ingestionResult.sourceId) || {
      id: ingestionResult.sourceId,
      spaceId,
      title: sourceName,
      type: type || 'notes',
      author: user.displayName || user.id,
      dateAdded: new Date().toISOString().split('T')[0],
      summary: summary || rawText.slice(0, 150),
      fullText: rawText,
      tokenCount: ingestionResult.tokenCount
    };

    res.status(201).json({ source: createdSource, ingestion: ingestionResult });
  } catch (err: any) {
    handleEducationError(err, res, 'SOURCE_INGESTION_ERROR');
  }
});

// 17. POST /api/education/knowledge-spaces/:id/query - Grounded retrieval Q&A
educationRouter.post('/knowledge-spaces/:id/query', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'query string is required.' } });
      return;
    }

    const spaceId = req.params.id as string;

    try {
      const { groundingService } = await import('../../rag/groundingService.ts');
      const result = await groundingService.answerQuery(spaceId, query, {
        workspaceId: 'ws-stark-core',
        userId: user.id,
        userRole: user.role
      });
      res.json(result);
    } catch (_err: any) {
      const fallbackResult = educationStore.queryGrounded(spaceId, query);
      res.json(fallbackResult);
    }
  } catch (err: any) {
    handleEducationError(err, res, 'QUERY_ERROR');
  }
});

// ==========================================
// NOTION-STYLE MY WORKSPACE REST ROUTES (Scoped to req.auth)
// ==========================================

// GET /api/education/workspace/pages - List user workspace pages
educationRouter.get('/workspace/pages', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    res.json({
      pages: educationStore.getWorkspacePages(false)
    });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_PAGES_ERROR');
  }
});

// GET /api/education/workspace/trash - List trash
educationRouter.get('/workspace/trash', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    res.json({
      pages: educationStore.getWorkspacePages(true)
    });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_TRASH_ERROR');
  }
});

// GET /api/education/workspace/pages/:id - Get single page
educationRouter.get('/workspace/pages/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const pageId = req.params.id as string;
    const page = educationStore.getWorkspacePage(pageId);
    if (!page) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found.' } });
      return;
    }
    res.json({ page });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_PAGE_ERROR');
  }
});

// POST /api/education/workspace/pages - Create new workspace page
educationRouter.post('/workspace/pages', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const page = educationStore.createWorkspacePage({
      ...req.body,
      ownerId: user.id,
      ownerName: user.displayName || user.id,
      ownerRole: user.role
    });
    res.status(201).json({ page });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_CREATE_ERROR');
  }
});

// PUT /api/education/workspace/pages/:id - Update page metadata
educationRouter.put('/workspace/pages/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const pageId = req.params.id as string;
    const updated = educationStore.updateWorkspacePage(pageId, req.body);
    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found.' } });
      return;
    }
    res.json({ page: updated });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_UPDATE_ERROR');
  }
});

// PUT /api/education/workspace/pages/:id/blocks - Update block content
educationRouter.put('/workspace/pages/:id/blocks', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
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
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_BLOCKS_ERROR');
  }
});

// DELETE /api/education/workspace/pages/:id - Soft or permanent delete
educationRouter.delete('/workspace/pages/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const pageId = req.params.id as string;
    const permanent = req.query.permanent === 'true';
    const success = educationStore.deleteWorkspacePage(pageId, permanent);
    if (!success) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found.' } });
      return;
    }
    res.json({ success: true, pageId, permanent });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_DELETE_ERROR');
  }
});

// POST /api/education/workspace/pages/:id/restore - Restore from trash
educationRouter.post('/workspace/pages/:id/restore', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const pageId = req.params.id as string;
    const success = educationStore.restoreWorkspacePage(pageId);
    if (!success) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace page not found in trash.' } });
      return;
    }
    res.json({ success: true, page: educationStore.getWorkspacePage(pageId) });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_RESTORE_ERROR');
  }
});

// GET /api/education/workspace/databases - List database collections
educationRouter.get('/workspace/databases', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    res.json({
      databases: educationStore.getWorkspaceDatabases()
    });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_DATABASES_ERROR');
  }
});

// GET /api/education/workspace/databases/:id - Get database
educationRouter.get('/workspace/databases/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const dbId = req.params.id as string;
    const db = educationStore.getWorkspaceDatabase(dbId);
    if (!db) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Database collection not found.' } });
      return;
    }
    res.json({ database: db });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_DB_ERROR');
  }
});

// POST /api/education/workspace/databases - Create database collection
educationRouter.post('/workspace/databases', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const db = educationStore.createWorkspaceDatabase(req.body);
    res.status(201).json({ database: db });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_DB_CREATE_ERROR');
  }
});

// PUT /api/education/workspace/databases/:id - Update database collection
educationRouter.put('/workspace/databases/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const dbId = req.params.id as string;
    const updated = educationStore.updateWorkspaceDatabase(dbId, req.body);
    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Database collection not found.' } });
      return;
    }
    res.json({ database: updated });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_DB_UPDATE_ERROR');
  }
});

// GET /api/education/workspace/templates - List templates
educationRouter.get('/workspace/templates', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    res.json({
      templates: educationStore.getWorkspaceTemplates()
    });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_TEMPLATES_ERROR');
  }
});

// POST /api/education/workspace/pages/from-template - Instantiate page from template
educationRouter.post('/workspace/pages/from-template', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const { templateId, customTitle, academicLink } = req.body;
    if (!templateId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'templateId is required.' } });
      return;
    }
    const page = educationStore.createPageFromTemplate(templateId, customTitle, academicLink);
    res.status(201).json({ page });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_FROM_TEMPLATE_ERROR');
  }
});

// GET /api/education/workspace/search - Search pages, blocks, and tags
educationRouter.get('/workspace/search', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req, jarvisData);
    const q = (req.query.q as string) || '';
    const results = educationStore.searchWorkspace(q);
    res.json({ results, query: q });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_SEARCH_ERROR');
  }
});

// GET /api/education/workspace/by-lesson/:courseId/:lessonId - Find notes linked to an academic lesson
educationRouter.get('/workspace/by-lesson/:courseId/:lessonId', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req, jarvisData);
    const { courseId, lessonId } = req.params;

    const accessCheck = await educationPolicy.canAccessClass(user, courseId as string);
    if (!accessCheck.allowed) {
      res.status(accessCheck.statusCode || 403).json({ error: { code: 'FORBIDDEN', message: accessCheck.reason } });
      return;
    }

    const pages = educationStore.getWorkspacePagesForLesson(courseId as string, lessonId as string);
    res.json({ pages });
  } catch (err: any) {
    handleEducationError(err, res, 'WORKSPACE_LESSON_PAGES_ERROR');
  }
});
