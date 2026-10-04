// Milestone 11 & 14.2: Real-Time Class Messaging & Notifications REST API
import { Router, type Request, type Response } from 'express';
import { jarvisData } from '../data/index.ts';
import { messagingService } from '../sectors/education/messagingService.ts';
import { messageEventBus } from '../sectors/education/messageEventBus.ts';
import { authenticateRequest, ticketService } from '../auth/index.ts';
import type { User } from '../data/types.ts';

export const messagingRouter = Router();

// GET /api/messages/stream - Server-Sent Events (SSE) Real-Time Uplink
messagingRouter.get('/stream', async (req: Request, res: Response) => {
  try {
    const classId = typeof req.query.classId === 'string' ? req.query.classId : 'class-phys-301';
    let currentUser: User;

    // Authenticate via SSE ticket or standard auth header
    if (typeof req.query.ticket === 'string' && req.query.ticket.trim().length > 0) {
      const verified = await ticketService.verifySSETicket(req.query.ticket.trim(), classId);
      currentUser = verified.user;
    } else {
      currentUser = await authenticateRequest(req);
    }

    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    // 1. Authorization check before establishing stream
    const authCheck = await messagingService.verifyClassAccess(currentUser, classId, workspaceId);
    if (!authCheck.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: authCheck.reason || 'Class stream access denied.' } });
      return;
    }

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

    // 3. Send initial connected event
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        status: 'connected',
        classId,
        workspaceId,
        userId: currentUser.id,
        role: currentUser.role,
        timestamp: new Date().toISOString()
      })}\n\n`
    );

    // 4. Subscribe to Real-Time EventBus for this specific class and workspace
    const unsubscribe = messageEventBus.subscribeToClass(classId, workspaceId, (event) => {
      if (res.writableEnded) return;
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    });

    // 5. Periodic Heartbeat to maintain connection through proxies
    const heartbeatTimer = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`: heartbeat ${Date.now()}\n\n`);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      unsubscribe();
    });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
    const statusCode = isUnauth ? 401 : 500;
    if (!res.headersSent) {
      res.status(statusCode).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : 'STREAM_ERROR', message: err.message || 'Failed to open event stream.' } });
    }
  }
});

// GET /api/messages - List messages for class or thread
messagingRouter.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const classId = typeof req.query.classId === 'string' ? req.query.classId : 'class-phys-301';
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const threadId = typeof req.query.threadId === 'string' ? req.query.threadId : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 100;

    const messages = await messagingService.listMessages(classId, workspaceId, currentUser, {
      threadId,
      limit
    });

    res.json({
      messages,
      count: messages.length,
      classId,
      workspaceId,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
    const isAuth = err.message?.includes('Unauthorized') || err.message?.includes('denied');
    const statusCode = isUnauth ? 401 : isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : 'LIST_FAILED', message: err.message || 'Failed to list messages.' } });
  }
});

// POST /api/messages - Send message with optional FileRecord attachments
messagingRouter.post('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const {
      classId,
      workspaceId = 'ws-stark-core',
      body,
      threadId,
      attachmentFileIds
    } = req.body || {};

    if (!classId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'classId is required.' } });
      return;
    }

    const result = await messagingService.sendMessage(
      {
        classId,
        workspaceId,
        body: body || '',
        threadId,
        attachmentFileIds: Array.isArray(attachmentFileIds) ? attachmentFileIds : []
      },
      currentUser
    );

    res.status(201).json({
      message: result.message,
      notification: result.notification,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
    const isAuth = err.message?.includes('Unauthorized') || err.message?.includes('denied') || err.message?.includes('Cross-workspace');
    const isVal = err.message?.includes('required') || err.message?.includes('exist');
    const statusCode = isUnauth ? 401 : isAuth ? 403 : isVal ? 400 : 500;
    res.status(statusCode).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : 'SEND_FAILED', message: err.message || 'Failed to send message.' } });
  }
});

// GET /api/messages/threads - List discussion threads for a class
messagingRouter.get('/threads', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const classId = typeof req.query.classId === 'string' ? req.query.classId : 'class-phys-301';
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const threads = await messagingService.listThreads(classId, workspaceId, currentUser);
    res.json({
      threads,
      count: threads.length,
      classId,
      workspaceId,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
    const isAuth = err.message?.includes('Unauthorized') || err.message?.includes('denied');
    const statusCode = isUnauth ? 401 : isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : 'THREADS_FAILED', message: err.message || 'Failed to list threads.' } });
  }
});

// POST /api/messages/threads - Create a discussion thread for class
messagingRouter.post('/threads', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const { classId, workspaceId = 'ws-stark-core', title, participantIds } = req.body || {};

    if (!classId || !title) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'classId and title are required.' } });
      return;
    }

    const authCheck = await messagingService.verifyClassAccess(currentUser, classId, workspaceId);
    if (!authCheck.allowed) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: authCheck.reason || 'Class access denied.' } });
      return;
    }

    const thread = await jarvisData.conversations.create({
      workspaceId,
      classId,
      userId: currentUser.id,
      title: title.trim(),
      sector: 'education',
      type: 'class_channel',
      participantIds: Array.isArray(participantIds) ? participantIds : [currentUser.id]
    });

    res.status(201).json({ thread });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
    const statusCode = isUnauth ? 401 : 500;
    res.status(statusCode).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : 'CREATE_THREAD_FAILED', message: err.message || 'Failed to create thread.' } });
  }
});

// PATCH /api/messages/:id/read - Mark message as read
messagingRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const id = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;

    const updated = await messagingService.markRead(id, currentUser, workspaceId);
    res.json({
      success: true,
      message: updated,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
    const isNotFound = err.message?.includes('not found');
    const isAuth = err.message?.includes('Unauthorized') || err.message?.includes('denied');
    const statusCode = isUnauth ? 401 : isNotFound ? 404 : isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : 'READ_FAILED', message: err.message || 'Failed to mark message as read.' } });
  }
});

// GET /api/messages/:id - Get single message
messagingRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const id = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;

    const message = await messagingService.getMessageById(id, currentUser, workspaceId);
    res.json({
      message,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isUnauth = err.statusCode === 401 || err.message?.includes('Authentication required') || err.message?.includes('Missing credentials');
    const isNotFound = err.message?.includes('not found');
    const isAuth = err.message?.includes('Unauthorized') || err.message?.includes('denied');
    const statusCode = isUnauth ? 401 : isNotFound ? 404 : isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: isUnauth ? 'UNAUTHENTICATED' : 'GET_FAILED', message: err.message || 'Failed to get message.' } });
  }
});
