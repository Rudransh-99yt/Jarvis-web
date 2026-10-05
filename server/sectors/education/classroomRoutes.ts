// Milestone 12: Smart Classroom REST & Realtime API Routes (Hardened & Secure)
import express, { type Request, type Response } from 'express';
import { jarvisData, INITIAL_DATABASE_SCHEMA } from '../../data/index.ts';
import { classroomService } from './classroomService.ts';
import { classroomEventBus } from './classroomEventBus.ts';
import { AuthenticationError, ticketService } from '../../auth/index.ts';
import { requirePrincipal, type AuthenticatedPrincipal } from '../../auth/principal.ts';
import { authorizationPolicy } from '../../auth/authorizationPolicy.ts';
import type { User, InstitutionMembership } from '../../data/types.ts';

export const classroomRouter = express.Router();

classroomRouter.use(requirePrincipal);

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

function getMemberships(): InstitutionMembership[] {
  return (jarvisData as any).store?.state?.institutionMemberships || (INITIAL_DATABASE_SCHEMA.institutionMemberships || []);
}

function handleRouteError(err: any, res: Response, fallbackCode = 'CLASSROOM_ERROR') {
  if (res.headersSent) return;

  if (
    err instanceof AuthenticationError ||
    err?.statusCode === 401 ||
    err?.code === 'UNAUTHENTICATED' ||
    err?.message?.includes('Authentication required') ||
    err?.message?.includes('Missing credentials') ||
    err?.message?.includes('not recognized') ||
    err?.message?.includes('Unauthenticated')
  ) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: err.message } });
    return;
  }

  const msg = err.message || '';
  if (
    msg.includes('Unauthorized') ||
    msg.includes('Forbidden') ||
    msg.includes('Access denied') ||
    msg.includes('denied') ||
    msg.includes('not assigned') ||
    msg.includes('not enrolled') ||
    msg.includes('Only authorized')
  ) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: msg } });
    return;
  }

  if (msg.includes('not found') || msg.includes('does not exist')) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: msg } });
    return;
  }

  res.status(400).json({ error: { code: fallbackCode, message: msg } });
}

// 1. GET /api/classroom/sessions/active - Query active live session for a course
classroomRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not found.' } });
      return;
    }

    const classId = typeof req.query.classId === 'string' ? req.query.classId : 'class-phys-301';
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Class '${classId}' not found.` } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
      return;
    }

    const session = await classroomService.getActiveSession(classId, workspaceId, currentUser);
    res.json({ session });
  } catch (err: any) {
    handleRouteError(err, res, 'ACTIVE_SESSION_ERROR');
  }
});

// 2. GET /api/classroom/sessions/:id/stream - Server-Sent Events (SSE) Real-Time Uplink for Classroom
classroomRouter.get('/:id/stream', async (req: Request, res: Response) => {
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  try {
    const sessionId = getParam(req.params.id);
    const actor = res.locals.principal as AuthenticatedPrincipal;
    let currentUser: User | null = null;

    // 1. Authenticate via short-lived SSE ticket or verified principal
    if (typeof req.query.ticket === 'string' && req.query.ticket.trim().length > 0) {
      const verified = await ticketService.verifySSETicket(req.query.ticket.trim(), sessionId);
      currentUser = verified.user;
    } else {
      currentUser = await jarvisData.users.getById(actor.userId);
      if (!currentUser) {
        res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' }
        });
        return;
      }
    }

    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    // 2. Look up session
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({
        error: { code: 'SESSION_NOT_FOUND', message: `Classroom session '${sessionId}' not found in workspace '${workspaceId}'.` }
      });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Class '${session.classId}' not found.` }
      });
      return;
    }

    const memberships = getMemberships();
    const principal: AuthenticatedPrincipal = {
      userId: currentUser.id,
      role: currentUser.role,
      provenance: 'signed-hmac'
    };
    const classCheck = authorizationPolicy.canReadClass(principal, cls, memberships);
    if (!classCheck.allowed) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: classCheck.reason }
      });
      return;
    }

    // 3. Evaluate service-level stream policy
    const authCheck = await classroomService.getPolicy().canSubscribeStream(currentUser, session, workspaceId);
    if (!authCheck.allowed) {
      const statusCode = authCheck.statusCode || 403;
      res.status(statusCode).json({
        error: { code: 'FORBIDDEN', message: authCheck.reason || 'Stream access denied.' }
      });
      return;
    }

    // 4. Set SSE Headers now that authorization is strictly confirmed
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // 5. Send initial connected event with full session & board state
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

    // 6. Subscribe to Real-Time EventBus for this specific classroom session channel
    unsubscribe = classroomEventBus.subscribeToSession(sessionId, workspaceId, (event) => {
      if (res.writableEnded) return;
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    });

    // 7. Periodic Heartbeat
    heartbeatTimer = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      }
    }, 20000);

    req.on('close', () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });
  } catch (err: any) {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (unsubscribe) unsubscribe();
    handleRouteError(err, res, 'CLASSROOM_STREAM_ERROR');
  }
});

// 3. POST /api/classroom/sessions - Create / Start Classroom Session (Teacher)
classroomRouter.post('/', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const { classId, workspaceId = 'ws-stark-core', title, status = 'scheduled', boardTopic } = req.body || {};

    if (!classId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Parameter classId is required.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Class '${classId}' not found.` } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canManageClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
      return;
    }

    const session = await classroomService.createSession(
      { classId, workspaceId, title, status, boardTopic },
      currentUser
    );

    res.status(201).json({ session });
  } catch (err: any) {
    handleRouteError(err, res, 'SESSION_CREATE_FAILED');
  }
});

// 4. GET /api/classroom/sessions - List Sessions (with optional filters)
classroomRouter.get('/', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const status = typeof req.query.status === 'string' ? (req.query.status as any) : undefined;

    if (classId) {
      const cls = await jarvisData.education.getClassById(classId);
      if (cls) {
        const memberships = getMemberships();
        const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
        if (!decision.allowed) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
          return;
        }
      }
    }

    const sessions = await classroomService.listSessions(classId, workspaceId, currentUser, status);
    res.json({ sessions, count: sessions.length });
  } catch (err: any) {
    handleRouteError(err, res, 'LIST_SESSIONS_FAILED');
  }
});

// 5. GET /api/classroom/sessions/:id - Get session details
classroomRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const session = await classroomService.getSession(sessionId, workspaceId, currentUser);
    const cls = await jarvisData.education.getClassById(session.classId);
    if (cls) {
      const memberships = getMemberships();
      const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
      if (!decision.allowed) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
        return;
      }
    }

    const participants = await jarvisData.classroom.listParticipants(sessionId, true);

    res.json({
      session,
      activeStudentCount: participants.length,
      participants
    });
  } catch (err: any) {
    handleRouteError(err, res, 'GET_SESSION_FAILED');
  }
});

// 6. POST /api/classroom/sessions/:id/start - Start Session
classroomRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canManageClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
      return;
    }

    const started = await classroomService.startSession(sessionId, currentUser, workspaceId);
    res.json({ session: started, message: 'Classroom session is now LIVE.' });
  } catch (err: any) {
    handleRouteError(err, res, 'START_SESSION_FAILED');
  }
});

// 7. POST /api/classroom/sessions/:id/pause - Pause Session
classroomRouter.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canManageClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
      return;
    }

    const paused = await classroomService.pauseSession(sessionId, currentUser, workspaceId);
    res.json({ session: paused, message: 'Classroom session paused.' });
  } catch (err: any) {
    handleRouteError(err, res, 'PAUSE_SESSION_FAILED');
  }
});

// 8. POST /api/classroom/sessions/:id/resume - Resume Session
classroomRouter.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canManageClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
      return;
    }

    const resumed = await classroomService.resumeSession(sessionId, currentUser, workspaceId);
    res.json({ session: resumed, message: 'Classroom session resumed.' });
  } catch (err: any) {
    handleRouteError(err, res, 'RESUME_SESSION_FAILED');
  }
});

// 9. POST /api/classroom/sessions/:id/end - End Session
classroomRouter.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canManageClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
      return;
    }

    const ended = await classroomService.endSession(sessionId, currentUser, workspaceId);
    res.json({ session: ended, message: 'Classroom session concluded.' });
  } catch (err: any) {
    handleRouteError(err, res, 'END_SESSION_FAILED');
  }
});

// 10. POST /api/classroom/sessions/:id/join - Student Join Session
classroomRouter.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const { workspaceId = 'ws-stark-core', deviceType = 'web' } = req.body || {};

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
      return;
    }

    const result = await classroomService.joinSession(sessionId, currentUser, workspaceId, deviceType);
    res.json({
      session: result.session,
      participant: result.participant,
      message: `Enrolled student '${currentUser.displayName}' connected to session '${sessionId}'.`
    });
  } catch (err: any) {
    handleRouteError(err, res, 'JOIN_SESSION_FAILED');
  }
});

// 11. POST /api/classroom/sessions/:id/leave - Student Leave Session
classroomRouter.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const result = await classroomService.leaveSession(sessionId, currentUser, workspaceId);
    res.json({
      session: result.session,
      participant: result.participant,
      message: `Student '${currentUser.displayName}' disconnected from session.`
    });
  } catch (err: any) {
    handleRouteError(err, res, 'LEAVE_SESSION_FAILED');
  }
});

// 12. POST /api/classroom/sessions/:id/presence - Student Heartbeat
classroomRouter.post('/:id/presence', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = req.body?.workspaceId || (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core');

    const result = await classroomService.recordPresence(sessionId, currentUser, workspaceId);
    res.json(result);
  } catch (err: any) {
    handleRouteError(err, res, 'PRESENCE_FAILED');
  }
});

// 13. GET /api/classroom/sessions/:id/presence - List Participants
classroomRouter.get('/:id/presence', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const onlyConnected = req.query.connected === 'true';

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (session) {
      const cls = await jarvisData.education.getClassById(session.classId);
      if (cls) {
        const memberships = getMemberships();
        const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
        if (!decision.allowed) {
          res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
          return;
        }
      }
    }

    const participants = await classroomService.listParticipants(sessionId, workspaceId, currentUser, onlyConnected);
    res.json({
      sessionId,
      participants,
      totalCount: participants.length,
      connectedCount: participants.filter((p) => p.connectionStatus === 'connected').length
    });
  } catch (err: any) {
    handleRouteError(err, res, 'LIST_PARTICIPANTS_FAILED');
  }
});

// 14. GET /api/classroom/sessions/:id/state - Get Board State
classroomRouter.get('/:id/state', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const session = await classroomService.getSession(sessionId, workspaceId, currentUser);
    const cls = await jarvisData.education.getClassById(session.classId);
    if (cls) {
      const memberships = getMemberships();
      const decision = authorizationPolicy.canReadClass(actor, cls, memberships);
      if (!decision.allowed) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
        return;
      }
    }

    res.json({
      sessionId: session.id,
      boardState: session.boardState,
      status: session.status,
      activeStudentCount: session.activeStudentCount
    });
  } catch (err: any) {
    handleRouteError(err, res, 'GET_STATE_FAILED');
  }
});

// 15. PUT /api/classroom/sessions/:id/state - Update Smart Board State (Teacher)
classroomRouter.put('/:id/state', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const { state, currentTopic, activeSlideIndex, message, workspaceId = 'ws-stark-core' } = req.body || {};

    if (!state) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Parameter state is required.' } });
      return;
    }

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canManageClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
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
    handleRouteError(err, res, 'UPDATE_STATE_FAILED');
  }
});

// Also support POST on state for flexibility
classroomRouter.post('/:id/state', async (req: Request, res: Response) => {
  try {
    const actor = res.locals.principal as AuthenticatedPrincipal;
    const currentUser = await jarvisData.users.getById(actor.userId);
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'User not recognized.' } });
      return;
    }

    const sessionId = getParam(req.params.id);
    const { state, currentTopic, activeSlideIndex, message, workspaceId = 'ws-stark-core' } = req.body || {};

    if (!state) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Parameter state is required.' } });
      return;
    }

    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
      return;
    }

    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Class not found.' } });
      return;
    }

    const memberships = getMemberships();
    const decision = authorizationPolicy.canManageClass(actor, cls, memberships);
    if (!decision.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: decision.reason } });
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
    handleRouteError(err, res, 'UPDATE_STATE_FAILED');
  }
});
