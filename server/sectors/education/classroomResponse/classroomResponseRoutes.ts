import { Router, type Request, type Response } from 'express';
import { classroomResponseService } from './classroomResponseService.ts';
import { authenticateRequest, AuthenticationError } from '../../../auth/index.ts';
import type { AuthenticatedPrincipal } from '../../../auth/principal.ts';

export const classroomResponseRouter = Router();

function getPrincipal(user: any, req: Request): AuthenticatedPrincipal {
  const workspaceId = req.body?.workspaceId || (req.query?.workspaceId as string) || 'ws-stark-core';
  return {
    userId: user.id,
    role: user.role,
    institutionId: user.institutionId || 'inst-stark-academy',
    workspaceId,
    provenance: 'signed-hmac'
  };
}

function getSessionId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : (id || '');
}

function handleRouteError(res: Response, err: any) {
  const msg = err?.message || 'Operation failed';
  let statusCode = 400;

  if (err instanceof AuthenticationError || msg.includes('Authentication required') || msg.includes('Missing credentials')) {
    statusCode = 401;
  } else if (
    msg.includes('Unauthorized') ||
    msg.includes('access denied') ||
    msg.includes('Cross-user') ||
    msg.includes('Cross-classroom') ||
    msg.includes('Impersonation rejected') ||
    msg.includes('cannot submit response as participant')
  ) {
    statusCode = 403;
  } else if (msg.includes('not found')) {
    statusCode = 404;
  } else if (
    msg.includes('Cannot activate a completed') ||
    msg.includes('Cannot complete a cancelled') ||
    msg.includes('Cannot cancel a completed')
  ) {
    statusCode = 409;
  }

  return res.status(statusCode).json({
    error: {
      message: msg,
      code: statusCode === 401 ? 'UNAUTHENTICATED' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST'
    }
  });
}

// GET /status (Health check)
classroomResponseRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'active',
    service: 'classroom-response-foundation',
    timestamp: new Date().toISOString()
  });
});

// GET /sessions — list sessions
classroomResponseRouter.get('/sessions', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req);
    const classId = req.query.classId as string | undefined;
    const sessions = classId
      ? await classroomResponseService.getSessionsByClass(classId)
      : await classroomResponseService.getAllSessions();
    res.json({ sessions });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions — Create a classroom response session
classroomResponseRouter.post('/sessions', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);

    const { classId, workspaceId, sessionType, title, questions, activeQuestionId, config, initialRemotes } = req.body;
    const session = await classroomResponseService.createSession(
      {
        classId,
        workspaceId: workspaceId || principal.workspaceId,
        sessionType,
        title,
        questions,
        activeQuestionId,
        config,
        initialRemotes
      },
      principal
    );

    res.status(201).json({ session });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// GET /sessions/:id — Retrieve session details
classroomResponseRouter.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    await authenticateRequest(req);
    const id = getSessionId(req);
    const session = await classroomResponseService.getSession(id);
    if (!session) {
      return res.status(404).json({ error: { message: `Session '${id}' not found.`, code: 'NOT_FOUND' } });
    }
    res.json({ session });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions/:id/activate — Activate session
classroomResponseRouter.post('/sessions/:id/activate', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);
    const session = await classroomResponseService.activateSession(getSessionId(req), principal);
    res.json({ session });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions/:id/pause — Pause session
classroomResponseRouter.post('/sessions/:id/pause', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);
    const session = await classroomResponseService.pauseSession(getSessionId(req), principal);
    res.json({ session });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions/:id/participants — Join / add participant
classroomResponseRouter.post('/sessions/:id/participants', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);

    const { userId, displayName, remoteId, metadata } = req.body;
    const participant = await classroomResponseService.joinSession(
      getSessionId(req),
      {
        userId: userId || principal.userId,
        displayName,
        remoteId,
        metadata
      },
      principal
    );

    res.status(201).json({ participant });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions/:id/remotes — Register remote mapping
classroomResponseRouter.post('/sessions/:id/remotes', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);

    const { remoteId, participantId } = req.body;
    await classroomResponseService.registerRemote(getSessionId(req), remoteId, participantId, principal);
    res.json({ success: true, remoteId, participantId });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions/:id/events — Receive response event
classroomResponseRouter.post('/sessions/:id/events', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);

    const { eventId, participantId, remoteId, questionId, responseValue, sequenceNumber, source, metadata } = req.body;
    const result = await classroomResponseService.receiveResponseEvent(
      getSessionId(req),
      {
        eventId,
        participantId,
        remoteId,
        questionId,
        responseValue,
        sequenceNumber,
        source,
        metadata
      },
      principal
    );

    res.status(result.duplicate ? 200 : 201).json({
      event: result.event,
      duplicate: result.duplicate
    });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions/:id/complete — Complete session
classroomResponseRouter.post('/sessions/:id/complete', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);
    const session = await classroomResponseService.completeSession(getSessionId(req), principal);
    res.json({ session });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /sessions/:id/cancel — Cancel session
classroomResponseRouter.post('/sessions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);
    const session = await classroomResponseService.cancelSession(getSessionId(req), principal);
    res.json({ session });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// GET /sessions/:id/summary — Get live/completed session summary
classroomResponseRouter.get('/sessions/:id/summary', async (req: Request, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const principal = getPrincipal(user, req);
    const summary = await classroomResponseService.getSessionSummary(getSessionId(req), principal);
    res.json({ summary });
  } catch (err) {
    handleRouteError(res, err);
  }
});
