// REST API Routes for AI Teacher Preparation & Classroom Session System
import { Router, type Request, type Response } from 'express';
import { classSessionStore } from './classSessionStore.ts';
import { classSessionPolicy } from './classSessionPolicy.ts';
import { classSessionGenerator } from './classSessionGenerator.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';

export const classSessionRouter = Router();

import type { User, UserRole } from '../../../data/types.ts';

/**
 * Helper to resolve user from request with fallback for standard dev identity
 */
async function resolveUser(req: Request): Promise<User> {
  try {
    return await authenticateRequest(req, jarvisData);
  } catch {
    // Development fallback for browser UI without strict auth token
    const roleHeader = (req.headers['x-user-role'] as string) || 'teacher';
    const userIdHeader = (req.headers['x-user-id'] as string) || (roleHeader === 'student' ? 'student-1' : 'teacher-1');
    const existing = await jarvisData.users.getById(userIdHeader);
    if (existing) return existing;
    
    const validRole: UserRole = (['admin', 'commander', 'teacher', 'student', 'guest'].includes(roleHeader)
      ? roleHeader
      : 'teacher') as UserRole;

    return {
      id: userIdHeader,
      displayName: roleHeader === 'student' ? 'Alex Mercer' : 'Dr. Helen Cho',
      email: `${userIdHeader}@starkacademy.edu`,
      role: validRole,
      department: 'Physics',
      avatarUrl: undefined,
      createdAt: new Date().toISOString()
    };
  }
}

// 1. GET /api/education/sessions - List sessions
classSessionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { classId, status } = req.query;

    const list = await classSessionStore.listSessions({
      classId: classId as string,
      status: status as any
    });

    // If caller is student, sanitize every session (strip answer keys & unreleased sections)
    if (user.role === 'student') {
      const sanitized = list.map((s) => classSessionPolicy.sanitizeForStudent(s));
      res.json({ sessions: sanitized });
      return;
    }

    res.json({ sessions: list });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 2. GET /api/education/sessions/smartboard/active - SmartBoard retrieval of today's approved session
classSessionRouter.get('/smartboard/active', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { classId } = req.query;

    // Verify teacher or admin identity
    if (user.role === 'student') {
      res.status(403).json({ error: { code: 'UNAUTHORIZED', message: 'SmartBoard authentication requires teacher identity.' } });
      return;
    }

    const session = await classSessionStore.getActiveSmartboardSession(user.id, classId as string);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No approved or scheduled session found for this classroom today.' } });
      return;
    }

    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 3. GET /api/education/sessions/:id - Get session details
classSessionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    // Student access sanitization
    if (user.role === 'student') {
      const sanitized = classSessionPolicy.sanitizeForStudent(session);
      res.json({ session: sanitized });
      return;
    }

    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 4. POST /api/education/sessions - Create new session draft
classSessionRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { classId, topic, unitId, unitTitle, lessonId, lessonTitle, durationMinutes, generationConfig } = req.body;

    if (!classId || !topic) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'classId and topic are required.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canCreateSession(user, classId, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const cls = authCheck.cls!;

    const session = await classSessionStore.createSession({
      workspaceId: 'ws-stark-core',
      schoolId: 'inst-stark-academy',
      classId: cls.id,
      courseCode: cls.code,
      courseName: cls.name,
      subject: cls.department || 'Physics',
      unitId,
      unitTitle,
      lessonId,
      lessonTitle,
      topic,
      teacherId: user.id,
      teacherName: user.displayName || 'Instructor',
      durationMinutes: durationMinutes || 45,
      status: 'DRAFT',
      generationConfig: generationConfig || {
        targetDurationMinutes: durationMinutes || 45,
        desiredOutputs: {
          lessonPlan: true,
          presentation: true,
          quiz: true,
          flashcards: true,
          homework: true,
          teacherNotes: true,
          studentNotes: true,
          answerKey: true
        }
      }
    });

    res.status(201).json({ session });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 5. POST /api/education/sessions/:id/sources - Attach source documents
classSessionRouter.post('/:id/sources', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;
    const { title, type, rawText, fileSize, pageCount, storageFileId } = req.body;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const newSource = {
      id: `src-${Date.now()}`,
      title: title || 'Uploaded Document',
      type: type || 'curriculum_doc',
      storageFileId,
      extractedTextSnippet: rawText ? rawText.slice(0, 300) : 'Text extracted from document.',
      rawText: rawText || '',
      fileSize: fileSize || '1.2 MB',
      pageCount: pageCount || 1,
      uploadedAt: new Date().toISOString()
    };

    const updated = await classSessionStore.updateSession(sessionId, {
      sourceMaterials: [...(session.sourceMaterials || []), newSource]
    });

    res.status(201).json({ session: updated, source: newSource });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 6. POST /api/education/sessions/:id/generate - Execute AI generation pipeline
classSessionRouter.post('/:id/generate', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;
    const { desiredOutputs, customInstructions } = req.body;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    // Set status to GENERATING
    await classSessionStore.updateSession(sessionId, { status: 'GENERATING' });

    const outputsConfig = desiredOutputs || session.generationConfig.desiredOutputs;
    const generated = await classSessionGenerator.generateSessionContent(session, outputsConfig, customInstructions);

    const updated = await classSessionStore.updateSession(sessionId, {
      lessonPlan: generated.lessonPlan || session.lessonPlan,
      presentation: generated.presentation || session.presentation,
      quiz: generated.quiz || session.quiz,
      flashcards: generated.flashcards || session.flashcards,
      homework: generated.homework || session.homework,
      answerKey: generated.answerKey || session.answerKey,
      teacherNotes: generated.teacherNotes || session.teacherNotes,
      studentMaterials: generated.studentMaterials || session.studentMaterials,
      generationLog: generated.generationLog,
      status: 'READY_FOR_REVIEW'
    });

    res.json({ session: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 7. POST /api/education/sessions/:id/regenerate-section - Regenerate single section
classSessionRouter.post('/:id/regenerate-section', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;
    const { sectionName, customPrompt } = req.body;

    if (!sectionName) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'sectionName is required.' } });
      return;
    }

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const regeneratedSection = await classSessionGenerator.regenerateSection(session, sectionName, customPrompt);
    const updated = await classSessionStore.updateSection(sessionId, sectionName, regeneratedSection);

    res.json({ session: updated, [sectionName]: regeneratedSection });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 8. PATCH /api/education/sessions/:id/sections/:section - Teacher edits section content
classSessionRouter.patch('/:id/sections/:section', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;
    const section = req.params.section as string;
    const payload = req.body;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const updated = await classSessionStore.updateSection(sessionId, section, payload);
    res.json({ session: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 9. POST /api/education/sessions/:id/approve-section - Approve individual section
classSessionRouter.post('/:id/approve-section', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;
    const { section } = req.body;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const updated = await classSessionStore.approveSection(sessionId, section);
    res.json({ session: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10. POST /api/education/sessions/:id/approve-all - Approve entire session
classSessionRouter.post('/:id/approve-all', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const updated = await classSessionStore.approveAll(sessionId);
    res.json({ session: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 11. POST /api/education/sessions/:id/schedule - Schedule session
classSessionRouter.post('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;
    const { scheduledAt } = req.body;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const updated = await classSessionStore.scheduleSession(sessionId, scheduledAt || new Date().toISOString());
    res.json({ session: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 12. POST /api/education/sessions/:id/release-controls - Update student visibility
classSessionRouter.post('/:id/release-controls', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;
    const controls = req.body;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const updated = await classSessionStore.updateReleaseControls(sessionId, controls);
    res.json({ session: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 13. POST /api/education/sessions/:id/launch-classroom - Launch session live on SmartBoard
classSessionRouter.post('/:id/launch-classroom', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const sessionId = req.params.id as string;

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ClassSession not found.' } });
      return;
    }

    const authCheck = await classSessionPolicy.canManageSession(user, session, 'ws-stark-core');
    if (!authCheck.allowed) {
      res.status(authCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: authCheck.reason } });
      return;
    }

    const updated = await classSessionStore.updateSession(sessionId, {
      status: 'LIVE',
      releaseControls: {
        ...session.releaseControls,
        presentationReleased: true
      }
    });

    res.json({ session: updated, liveUrl: `/education?view=classroom&sessionId=${sessionId}` });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});
