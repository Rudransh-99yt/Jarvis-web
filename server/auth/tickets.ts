// Milestone 14.2: Cryptographically Scoped Playback & SSE Ticket Engine
import crypto from 'node:crypto';
import type { User } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';

// Ephemeral server-side secret for ticket HMAC signing
const TICKET_SECRET = process.env.JARVIS_AUTH_SECRET || crypto.randomBytes(32).toString('hex');

export interface PlaybackTicketPayload {
  type: 'video_playback';
  ticketId: string;
  userId: string;
  videoId: string;
  fileId: string;
  workspaceId: string;
  classId: string;
  expiresAt: number; // Unix epoch ms
}

export interface SSETicketPayload {
  type: 'sse_stream';
  ticketId: string;
  userId: string;
  workspaceId: string;
  sessionId?: string;
  classId?: string;
  expiresAt: number; // Unix epoch ms
}

export interface SmartBoardTicketPayload {
  type: 'smartboard_auth';
  ticketId: string;
  boardId: string;
  teacherId: string;
  institutionId: string;
  classroomId: string;
  classSessionId: string;
  expiresAt: number; // Unix epoch ms
}

export class TicketAuthenticationError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 401, code = 'INVALID_TICKET') {
    super(message);
    this.name = 'TicketAuthenticationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Signs payload into a base64url-encoded ticket string with HMAC-SHA256.
 */
function signPayload(payload: Record<string, any>): string {
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', TICKET_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${hmac}`;
}

/**
 * Verifies base64url-encoded ticket string and parses payload.
 */
function verifySignature<T = any>(ticketString: string): T {
  if (!ticketString || typeof ticketString !== 'string' || !ticketString.includes('.')) {
    throw new TicketAuthenticationError('Malformed playback ticket format.', 401, 'MALFORMED_TICKET');
  }

  const parts = ticketString.split('.');
  if (parts.length !== 2) {
    throw new TicketAuthenticationError('Invalid ticket structure.', 401, 'MALFORMED_TICKET');
  }

  const [dataB64, hmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', TICKET_SECRET).update(dataB64).digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const hmacBuf = Buffer.from(hmac);
  const expectedBuf = Buffer.from(expectedHmac);
  if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
    throw new TicketAuthenticationError('Ticket cryptographic signature verification failed.', 403, 'INVALID_TICKET_SIGNATURE');
  }

  try {
    const jsonStr = Buffer.from(dataB64, 'base64url').toString('utf8');
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new TicketAuthenticationError('Failed to decode ticket payload.', 400, 'CORRUPTED_TICKET');
  }
}

export class TicketService {
  private repo: IJarvisDataRepository;

  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  /**
   * 1. Issues a short-lived, narrowly scoped video playback ticket.
   */
  createPlaybackTicket(params: {
    userId: string;
    videoId: string;
    fileId: string;
    workspaceId: string;
    classId: string;
    ttlSeconds?: number;
  }): { ticket: string; expiresAt: string; ttlSeconds: number } {
    const ttl = params.ttlSeconds || 120; // Default 2 minutes TTL
    const exp = Date.now() + ttl * 1000;

    const payload: PlaybackTicketPayload = {
      type: 'video_playback',
      ticketId: `tkt-${crypto.randomUUID()}`,
      userId: params.userId,
      videoId: params.videoId,
      fileId: params.fileId,
      workspaceId: params.workspaceId,
      classId: params.classId,
      expiresAt: exp
    };

    const ticket = signPayload(payload);
    return {
      ticket,
      expiresAt: new Date(exp).toISOString(),
      ttlSeconds: ttl
    };
  }

  /**
   * 2. Validates video playback ticket against the target video resource and database.
   */
  async verifyPlaybackTicket(
    ticketString: string,
    expectedVideoId: string
  ): Promise<{ user: User; payload: PlaybackTicketPayload }> {
    const payload = verifySignature<PlaybackTicketPayload>(ticketString);

    // Verify ticket type
    if (payload.type !== 'video_playback') {
      throw new TicketAuthenticationError('Invalid ticket category: Expected video_playback.', 403, 'TICKET_TYPE_MISMATCH');
    }

    // Verify expiration
    if (Date.now() > payload.expiresAt) {
      throw new TicketAuthenticationError('Playback ticket has expired. Please request a fresh playback ticket.', 401, 'TICKET_EXPIRED');
    }

    // Verify strict resource scoping (ticket for video A cannot stream video B)
    if (payload.videoId !== expectedVideoId) {
      throw new TicketAuthenticationError(
        `Ticket scope mismatch: Ticket is bound to video '${payload.videoId}', but requested '${expectedVideoId}'.`,
        403,
        'TICKET_RESOURCE_MISMATCH'
      );
    }

    // Verify user exists and is valid in database
    const user = await this.repo.users.getById(payload.userId);
    if (!user) {
      throw new TicketAuthenticationError(`User '${payload.userId}' associated with ticket not found in database.`, 401, 'USER_NOT_FOUND');
    }

    return { user, payload };
  }

  /**
   * 3. Issues a short-lived SSE real-time stream ticket.
   */
  createSSETicket(params: {
    userId: string;
    workspaceId: string;
    sessionId?: string;
    classId?: string;
    ttlSeconds?: number;
  }): { ticket: string; expiresAt: string; ttlSeconds: number } {
    const ttl = params.ttlSeconds || 90; // Default 90s TTL to establish connection
    const exp = Date.now() + ttl * 1000;

    const payload: SSETicketPayload = {
      type: 'sse_stream',
      ticketId: `sse-${crypto.randomUUID()}`,
      userId: params.userId,
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      classId: params.classId,
      expiresAt: exp
    };

    const ticket = signPayload(payload);
    return {
      ticket,
      expiresAt: new Date(exp).toISOString(),
      ttlSeconds: ttl
    };
  }

  /**
   * 4. Validates SSE stream ticket.
   */
  async verifySSETicket(
    ticketString: string,
    expectedSessionOrClassId?: string
  ): Promise<{ user: User; payload: SSETicketPayload }> {
    const payload = verifySignature<SSETicketPayload>(ticketString);

    if (payload.type !== 'sse_stream') {
      throw new TicketAuthenticationError('Invalid ticket category: Expected sse_stream.', 403, 'TICKET_TYPE_MISMATCH');
    }

    if (Date.now() > payload.expiresAt) {
      throw new TicketAuthenticationError('SSE connection ticket has expired.', 401, 'TICKET_EXPIRED');
    }

    if (expectedSessionOrClassId) {
      const match =
        payload.sessionId === expectedSessionOrClassId ||
        payload.classId === expectedSessionOrClassId;
      if (!match) {
        throw new TicketAuthenticationError('SSE ticket is not authorized for this session channel.', 403, 'TICKET_CHANNEL_MISMATCH');
      }
    }

    const user = await this.repo.users.getById(payload.userId);
    if (!user) {
      throw new TicketAuthenticationError(`User '${payload.userId}' associated with ticket not found.`, 401, 'USER_NOT_FOUND');
    }

    return { user, payload };
  }

  /**
   * 5. Issues a short-lived scoped SmartBoard hardware authentication ticket.
   */
  createBoardTicket(params: {
    boardId: string;
    teacherId: string;
    institutionId: string;
    classroomId: string;
    classSessionId: string;
    ttlSeconds?: number;
  }): { ticket: string; expiresAt: string; ttlSeconds: number } {
    const ttl = params.ttlSeconds || 300; // Default 5 minutes TTL
    const exp = Date.now() + ttl * 1000;

    const payload: SmartBoardTicketPayload = {
      type: 'smartboard_auth',
      ticketId: `sbt-${crypto.randomUUID()}`,
      boardId: params.boardId,
      teacherId: params.teacherId,
      institutionId: params.institutionId,
      classroomId: params.classroomId,
      classSessionId: params.classSessionId,
      expiresAt: exp
    };

    const ticket = signPayload(payload);
    return {
      ticket,
      expiresAt: new Date(exp).toISOString(),
      ttlSeconds: ttl
    };
  }

  /**
   * 6. Validates SmartBoard authentication ticket against expected board and session.
   */
  async verifyBoardTicket(
    ticketString: string,
    expectedBoardId?: string,
    expectedSessionId?: string
  ): Promise<{ user: User; payload: SmartBoardTicketPayload }> {
    const payload = verifySignature<SmartBoardTicketPayload>(ticketString);

    if (payload.type !== 'smartboard_auth') {
      throw new TicketAuthenticationError('Invalid ticket category: Expected smartboard_auth.', 403, 'TICKET_TYPE_MISMATCH');
    }

    if (Date.now() > payload.expiresAt) {
      throw new TicketAuthenticationError('SmartBoard authentication ticket has expired.', 401, 'TICKET_EXPIRED');
    }

    if (expectedBoardId && payload.boardId !== expectedBoardId) {
      throw new TicketAuthenticationError(
        `Ticket scope mismatch: Ticket bound to board '${payload.boardId}', requested '${expectedBoardId}'.`,
        403,
        'TICKET_BOARD_MISMATCH'
      );
    }

    if (expectedSessionId && payload.classSessionId !== expectedSessionId) {
      throw new TicketAuthenticationError(
        `Ticket scope mismatch: Ticket bound to session '${payload.classSessionId}', requested '${expectedSessionId}'.`,
        403,
        'TICKET_SESSION_MISMATCH'
      );
    }

    const user = await this.repo.users.getById(payload.teacherId);
    if (!user) {
      throw new TicketAuthenticationError(`Teacher '${payload.teacherId}' associated with board ticket not found.`, 401, 'USER_NOT_FOUND');
    }

    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'commander') {
      throw new TicketAuthenticationError('Unauthorized: Only teachers may pair or control SmartBoard devices.', 403, 'FORBIDDEN_ROLE');
    }

    return { user, payload };
  }
}

export const ticketService = new TicketService();
