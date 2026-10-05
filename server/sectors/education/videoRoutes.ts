import { requirePrincipal } from '../../auth/principal.ts';
// Milestone 14 & 14.2: REST API Routes for Video Library & Media Knowledge
import { Router } from 'express';
import type { Request, Response } from 'express';
import { smartVideoService } from './videoService.ts';
import { authenticateRequest, ticketService, TicketAuthenticationError } from '../../auth/index.ts';
import type { VideoListFilter } from '../../../src/types/video.ts';
import type { User } from '../../data/types.ts';

export const videoRouter = Router();

function handleVideoError(res: Response, err: any, fallbackCode = 'VIDEO_ERROR') {
  if (
    err.statusCode === 401 ||
    err instanceof TicketAuthenticationError ||
    err.message?.includes('Unauthenticated') ||
    err.message?.includes('Authentication required') ||
    err.message?.includes('expired') ||
    err.message?.includes('Missing credentials')
  ) {
    res.status(401).json({ error: { code: err.code || 'UNAUTHENTICATED', message: err.message } });
    return;
  }

  const msg = err.message || '';
  if (
    err.statusCode === 403 ||
    msg.includes('Unauthorized') ||
    msg.includes('Forbidden') ||
    msg.includes('Access denied') ||
    msg.includes('denied') ||
    msg.includes('not assigned') ||
    msg.includes('not enrolled') ||
    msg.includes('Cannot publish') ||
    msg.includes('Only authorized') ||
    msg.includes('mismatch') ||
    msg.includes('signature')
  ) {
    res.status(403).json({ error: { code: err.code || 'FORBIDDEN', message: msg } });
    return;
  }

  if (err.statusCode === 404 || msg.includes('not found') || msg.includes('does not exist')) {
    res.status(404).json({ error: { code: err.code || 'NOT_FOUND', message: msg } });
    return;
  }

  res.status(400).json({ error: { code: fallbackCode, message: msg } });
}

// 1. GET /api/education/videos - List accessible course videos
videoRouter.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const filter: VideoListFilter = {
      workspaceId: typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core',
      classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
      uploaderId: typeof req.query.uploaderId === 'string' ? req.query.uploaderId : undefined,
      knowledgeSpaceId: typeof req.query.knowledgeSpaceId === 'string' ? req.query.knowledgeSpaceId : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined
    };

    const videos = await smartVideoService.listVideos(filter, currentUser);
    res.json({ videos, count: videos.length });
  } catch (err: any) {
    handleVideoError(res, err, 'LIST_VIDEOS_FAILED');
  }
});

// 1.1 GET /api/education/videos/search - Search across videos, transcripts, and timestamped segments
videoRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const query = typeof req.query.q === 'string' ? req.query.q : (typeof req.query.query === 'string' ? req.query.query : '');
    const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const topK = typeof req.query.topK === 'string' ? parseInt(req.query.topK, 10) : 10;

    const results = await smartVideoService.searchVideos(query, { classId, workspaceId, topK }, currentUser);
    res.json({ query, results, count: results.length });
  } catch (err: any) {
    handleVideoError(res, err, 'SEARCH_VIDEOS_FAILED');
  }
});

// 1.2 POST /api/education/videos/search - Search POST alternative
videoRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const { query, q, classId, workspaceId = 'ws-stark-core', topK = 10 } = req.body;
    const cleanQuery = typeof query === 'string' ? query : (typeof q === 'string' ? q : '');

    const results = await smartVideoService.searchVideos(cleanQuery, { classId, workspaceId, topK }, currentUser);
    res.json({ query: cleanQuery, results, count: results.length });
  } catch (err: any) {
    handleVideoError(res, err, 'SEARCH_VIDEOS_FAILED');
  }
});

// 1.3 POST /api/education/videos/ask - Course/Workspace-wide Grounded Video Q&A
videoRouter.post('/ask', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const { question, classId, workspaceId = 'ws-stark-core' } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_ARGUMENTS', message: "Parameter 'question' is required." } });
      return;
    }

    const qaResult = await smartVideoService.askCourseVideos(question, { classId, workspaceId }, currentUser);
    res.json(qaResult);
  } catch (err: any) {
    handleVideoError(res, err, 'ASK_COURSE_VIDEOS_FAILED');
  }
});

// 2. POST /api/education/videos - Upload / publish a video (Teacher/Instructor)
videoRouter.post('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const {
      classId,
      workspaceId = 'ws-stark-core',
      title,
      description,
      filename,
      mimeType = 'video/mp4',
      base64Data,
      durationSeconds,
      thumbnailUrl,
      transcript,
      knowledgeSpaceId,
      tags,
      visibility = 'class'
    } = req.body;

    if (!classId || !title || !filename) {
      res.status(400).json({ error: { code: 'INVALID_ARGUMENTS', message: 'Parameters classId, title, and filename are required.' } });
      return;
    }

    let buffer: Buffer;
    if (base64Data) {
      buffer = Buffer.from(base64Data, 'base64');
    } else if (req.body.content) {
      buffer = Buffer.from(req.body.content);
    } else {
      // Minimal valid MP4 box header for mock uploads
      const ftyp = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
        0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
        0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32
      ]);
      buffer = ftyp;
    }

    const result = await smartVideoService.uploadVideo(
      {
        classId,
        workspaceId,
        title,
        description,
        filename,
        mimeType,
        buffer,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
        thumbnailUrl,
        transcript,
        knowledgeSpaceId,
        tags: Array.isArray(tags) ? tags : [],
        visibility
      },
      currentUser
    );

    res.status(201).json({ video: result.video, file: result.file });
  } catch (err: any) {
    handleVideoError(res, err, 'UPLOAD_VIDEO_FAILED');
  }
});

// 3. GET /api/education/videos/:id - Get video details and metadata
videoRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);

    const video = await smartVideoService.getVideo(id, currentUser, workspaceId);
    res.json({ video });
  } catch (err: any) {
    handleVideoError(res, err, 'GET_VIDEO_FAILED');
  }
});

// 4. PATCH /api/education/videos/:id - Update video metadata
videoRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);

    const updated = await smartVideoService.updateVideo(id, req.body, currentUser, workspaceId);
    res.json({ video: updated });
  } catch (err: any) {
    handleVideoError(res, err, 'UPDATE_VIDEO_FAILED');
  }
});

// 5. DELETE /api/education/videos/:id - Delete video & underlying storage
videoRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);

    const deleted = await smartVideoService.deleteVideo(id, currentUser, workspaceId);
    res.json({ success: deleted, id });
  } catch (err: any) {
    handleVideoError(res, err, 'DELETE_VIDEO_FAILED');
  }
});

// 5.1 POST /api/education/videos/:id/ask - Grounded Video-Scoped Q&A
videoRouter.post('/:id/ask', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.body.workspaceId === 'string' ? req.body.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_ARGUMENTS', message: "Parameter 'question' is required." } });
      return;
    }

    const qaResult = await smartVideoService.askVideo(id, question, currentUser, workspaceId);
    res.json(qaResult);
  } catch (err: any) {
    handleVideoError(res, err, 'ASK_VIDEO_FAILED');
  }
});

// 6. POST /api/education/videos/:id/ticket - Issue short-lived, cryptographically scoped playback ticket
videoRouter.post('/:id/ticket', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);

    // Verify authorized access to video
    const video = await smartVideoService.getVideo(id, currentUser, workspaceId);

    // Generate short-lived (120s) scoped ticket
    const ticketInfo = ticketService.createPlaybackTicket({
      userId: currentUser.id,
      videoId: video.id,
      fileId: video.fileId,
      workspaceId,
      classId: video.classId,
      ttlSeconds: 120
    });

    res.json({
      videoId: video.id,
      ticket: ticketInfo.ticket,
      expiresAt: ticketInfo.expiresAt,
      ttlSeconds: ticketInfo.ttlSeconds,
      streamUrl: `/api/education/videos/${video.id}/stream?ticket=${ticketInfo.ticket}`
    });
  } catch (err: any) {
    handleVideoError(res, err, 'ISSUE_TICKET_FAILED');
  }
});

// 7. GET /api/education/videos/:id/playback - Get playback metadata, transcript, and fresh playback ticket
videoRouter.get('/:id/playback', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);

    const video = await smartVideoService.getVideo(id, currentUser, workspaceId);
    const ticketInfo = ticketService.createPlaybackTicket({
      userId: currentUser.id,
      videoId: video.id,
      fileId: video.fileId,
      workspaceId,
      classId: video.classId,
      ttlSeconds: 120
    });

    res.json({
      video,
      ticket: ticketInfo.ticket,
      streamUrl: `/api/education/videos/${video.id}/stream?ticket=${ticketInfo.ticket}`,
      expiresAt: ticketInfo.expiresAt,
      ttlSeconds: ticketInfo.ttlSeconds,
      hasTranscript: Boolean(video.transcript && video.transcript.trim()),
      transcriptExcerpt: video.transcript ? video.transcript.slice(0, 300) : undefined
    });
  } catch (err: any) {
    handleVideoError(res, err, 'PLAYBACK_METADATA_FAILED');
  }
});

// 8. GET /api/education/videos/:id/stream - HTTP Range binary streaming authenticated via ticket or auth header
videoRouter.get('/:id/stream', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    let currentUser: User;
    let targetWorkspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    // 1. Authenticate either via short-lived playback ticket or standard auth header
    const ticketQuery = req.query.ticket;
    if (typeof ticketQuery === 'string' && ticketQuery.trim().length > 0) {
      const verified = await ticketService.verifyPlaybackTicket(ticketQuery.trim(), id);
      currentUser = verified.user;
      targetWorkspaceId = verified.payload.workspaceId;
    } else {
      // Check if standard authorization header is present
      currentUser = await authenticateRequest(req);
    }

    // 2. Load playback data (enforces workspace membership, class enrollment, file authorization)
    const { video, fileRecord, buffer } = await smartVideoService.getPlaybackData(
      id,
      currentUser,
      targetWorkspaceId
    );

    if (!buffer) {
      res.status(404).json({ error: { code: 'VIDEO_BYTES_NOT_FOUND', message: 'Binary video data not found in storage.' } });
      return;
    }

    const totalSize = buffer.length;
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      // Support HTTP 206 Partial Content Range streaming for video seeking
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || isNaN(start) || start < 0) {
        res.status(416).set('Content-Range', `bytes */${totalSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      const chunk = buffer.subarray(start, end + 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimeType || fileRecord.mimeType || 'video/mp4'
      });

      res.end(chunk);
    } else {
      // Stream entire buffer
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': video.mimeType || fileRecord.mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes'
      });

      res.end(buffer);
    }
  } catch (err: any) {
    handleVideoError(res, err, 'STREAM_VIDEO_FAILED');
  }
});
