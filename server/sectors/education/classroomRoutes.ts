// Milestone 12: Smart Classroom REST & Realtime API Routes
import { Router, Request, Response } from 'express';
import { jarvisData } from '../../data/index.ts';
import { classroomService } from './classroomService.ts';
import { classroomEventBus } from './classroomEventBus.ts';
import type { User } from '../../data/types.ts';

export const classroomRouter = Router();

async function resolveUser(req: Request): Promise<User> {
  const userId =
    (typeof req.headers['x-user-id'] === 'string' && req.headers['x-user-id']) ||
    (typeof req.query.userId === 'string' && req.query.userId) ||
    'teacher-1';

  const user = await jarvisData.users.getById(userId);
  if (user) return user;

  const role =
    (typeof req.headers['x-user-role'] === 'string' && req.headers['x-user-role']) ||
    (userId.startsWith('student') ? 'student' : 'teacher');

  return {
    id: userId,
    displayName: userId.startsWith('student') ? 'Student User' : 'Teacher User',
    email: `${userId}@stark.local`,
    role: role as any,
    createdAt: new Date().toISOString()
  };
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

// 1. GET /api/classroom/sessions/active - Query active live session for a course
classroomRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const classId = typeof req.query.classId === 'string' ? req.query.classId : 'class-phys-301';
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const session = await classroomService.getActiveSession(classId, workspaceId, currentUser);
    res.json({ session });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') || err.message?.includes('Access denied') ? 403 : 500;
    res.status(status).json({ error: { code: 'ACTIVE_SESSION_ERROR', message: err.message } });
  }
});

// 2. GET /api/classroom/sessions/:id/stream - Server-Sent Events (SSE) Real-Time Uplink for Classroom
classroomRouter.get('/:id/stream', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    // 1. Check session existence & authorization
    const session = await classroomService.getSession(sessionId, workspaceId, currentUser);

    // 2. Set SSE Headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // 3. Send initial connected event with full session & board state
    const participants = await jarvisData.classroom.listParticipants(sessionId, true);
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        status: 'connected',
        sessionId: session.id,
        classId: session.classId,
        workspaceId: session.workspaceId,
        sessionStatus: session.status,
        boardState: session.boardState,
        activeStudentCount: participants.length,
        currentUser: { id: currentUser.id, role: currentUser.role, displayName: currentUser.displayName },
        timestamp: new Date().toISOString()
      })}\n\n`
    );

    // 4. Subscribe to Real-Time EventBus for this specific classroom session
    const unsubscribe = classroomEventBus.subscribeToSession(sessionId, workspaceId, (event) => {
      if (res.writableEnded) return;
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    });

    // 5. Periodic Heartbeat
    const heartbeatTimer = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      unsubscribe();
    });
  } catch (err: any) {
    if (!res.headersSent) {
      const status = err.message?.includes('Unauthorized') || err.message?.includes('Access denied') ? 403 : 500;
      res.status(status).json({ error: { code: 'CLASSROOM_STREAM_ERROR', message: err.message || 'Stream failed.' } });
    }
  }
});

// 3. POST /api/classroom/sessions - Create / Start Classroom Session (Teacher)
classroomRouter.post('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const { classId, workspaceId = 'ws-stark-core', title, status = 'scheduled', boardTopic } = req.body || {};

    if (!classId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Parameter classId is required.' } });
      return;
    }

    const session = await classroomService.createSession(
      { classId, workspaceId, title, status, boardTopic },
      currentUser
    );

    res.status(201).json({ session });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('Only authorized') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'SESSION_CREATE_FAILED', message: err.message } });
  }
});

// 4. GET /api/classroom/sessions - List Sessions (with optional filters)
classroomRouter.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;

    const sessions = await classroomService.listSessions(classId, workspaceId, currentUser, status);
    res.json({ sessions, count: sessions.length });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') ? 403 : 500;
    res.status(statusCode).json({ error: { code: 'LIST_SESSIONS_FAILED', message: err.message } });
  }
});

// 5. GET /api/classroom/sessions/:id - Get session details
classroomRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const session = await classroomService.getSession(sessionId, workspaceId, currentUser);
    const participants = await jarvisData.classroom.listParticipants(sessionId, true);

    res.json({
      session,
      activeStudentCount: participants.length,
      participants
    });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') ? 403 : err.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: { code: 'GET_SESSION_FAILED', message: err.message } });
  }
});

// 6. POST /api/classroom/sessions/:id/start - Start Session
classroomRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await classroomService.startSession(sessionId, currentUser, workspaceId);
    res.json({ session, message: 'Classroom session is now LIVE.' });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('denied') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'START_SESSION_FAILED', message: err.message } });
  }
});

// 7. POST /api/classroom/sessions/:id/pause - Pause Session
classroomRouter.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await classroomService.pauseSession(sessionId, currentUser, workspaceId);
    res.json({ session, message: 'Classroom session paused.' });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('denied') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'PAUSE_SESSION_FAILED', message: err.message } });
  }
});

// 8. POST /api/classroom/sessions/:id/resume - Resume Session
classroomRouter.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await classroomService.resumeSession(sessionId, currentUser, workspaceId);
    res.json({ session, message: 'Classroom session resumed.' });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('denied') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'RESUME_SESSION_FAILED', message: err.message } });
  }
});

// 9. POST /api/classroom/sessions/:id/end - End Session
classroomRouter.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await classroomService.endSession(sessionId, currentUser, workspaceId);
    res.json({ session, message: 'Classroom session concluded.' });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('denied') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'END_SESSION_FAILED', message: err.message } });
  }
});

// 10. POST /api/classroom/sessions/:id/join - Student Join Session
classroomRouter.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const { workspaceId = 'ws-stark-core', deviceType = 'web' } = req.body || {};

    const result = await classroomService.joinSession(sessionId, currentUser, workspaceId, deviceType);
    res.json({
      session: result.session,
      participant: result.participant,
      message: `Enrolled student '${currentUser.displayName}' connected to session '${sessionId}'.`
    });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('Access denied') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'JOIN_SESSION_FAILED', message: err.message } });
  }
});

// 11. POST /api/classroom/sessions/:id/leave - Student Leave Session
classroomRouter.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const result = await classroomService.leaveSession(sessionId, currentUser, workspaceId);
    res.json({
      session: result.session,
      participant: result.participant,
      message: `Student '${currentUser.displayName}' disconnected from session.`
    });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'LEAVE_SESSION_FAILED', message: err.message } });
  }
});

// 12. POST /api/classroom/sessions/:id/presence - Student Heartbeat
classroomRouter.post('/:id/presence', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const result = await classroomService.recordPresence(sessionId, currentUser, workspaceId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: { code: 'PRESENCE_FAILED', message: err.message } });
  }
});

// 13. GET /api/classroom/sessions/:id/presence - List Participants
classroomRouter.get('/:id/presence', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const onlyConnected = req.query.connected === 'true';

    const participants = await classroomService.listParticipants(sessionId, workspaceId, currentUser, onlyConnected);
    res.json({
      sessionId,
      participants,
      totalCount: participants.length,
      connectedCount: participants.filter((p) => p.connectionStatus === 'connected').length
    });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') ? 403 : 500;
    res.status(statusCode).json({ error: { code: 'LIST_PARTICIPANTS_FAILED', message: err.message } });
  }
});

// 14. GET /api/classroom/sessions/:id/state - Get Board State
classroomRouter.get('/:id/state', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const session = await classroomService.getSession(sessionId, workspaceId, currentUser);
    res.json({
      sessionId: session.id,
      boardState: session.boardState,
      status: session.status,
      activeStudentCount: session.activeStudentCount
    });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') ? 403 : 404;
    res.status(statusCode).json({ error: { code: 'GET_STATE_FAILED', message: err.message } });
  }
});

// 15. PUT /api/classroom/sessions/:id/state - Update Smart Board State (Teacher)
classroomRouter.put('/:id/state', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const { state, currentTopic, activeSlideIndex, message, workspaceId = 'ws-stark-core' } = req.body || {};

    if (!state) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Parameter state is required.' } });
      return;
    }

    const updatedState = await classroomService.updateBoardState(
      sessionId,
      { state, currentTopic, activeSlideIndex, message },
      currentUser,
      workspaceId
    );

    res.json({ boardState: updatedState });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('denied') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'UPDATE_STATE_FAILED', message: err.message } });
  }
});

// Also support POST on state for flexibility
classroomRouter.post('/:id/state', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const sessionId = getParam(req.params.id);
    const { state, currentTopic, activeSlideIndex, message, workspaceId = 'ws-stark-core' } = req.body || {};

    if (!state) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Parameter state is required.' } });
      return;
    }

    const updatedState = await classroomService.updateBoardState(
      sessionId,
      { state, currentTopic, activeSlideIndex, message },
      currentUser,
      workspaceId
    );

    res.json({ boardState: updatedState });
  } catch (err: any) {
    const statusCode = err.message?.includes('Unauthorized') || err.message?.includes('denied') ? 403 : 400;
    res.status(statusCode).json({ error: { code: 'UPDATE_STATE_FAILED', message: err.message } });
  }
});
