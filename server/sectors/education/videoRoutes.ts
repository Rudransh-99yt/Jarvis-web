// Milestone 14: REST API Routes for Video Library & Media Knowledge
import { Router } from 'express';
import type { Request, Response } from 'express';
import { smartVideoService } from './videoService.ts';
import { authenticateRequest } from '../../auth/index.ts';
import type { VideoListFilter } from '../../../src/types/video.ts';

export const videoRouter = Router();

function handleVideoError(res: Response, err: any, fallbackCode = 'VIDEO_ERROR') {
  if (err.statusCode === 401 || err.message?.includes('Unauthenticated') || err.message?.includes('missing userId')) {
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
    msg.includes('Cannot publish') ||
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
      // Default minimal valid video buffer for testing / metadata mock:
      // Minimum MP4 box header: [0, 0, 0, 24, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', ...]
      const ftyp = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // ftyp
        0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, // isom
        0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32  // isomiso2
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

// 3. GET /api/education/videos/:id - Get video details and playback metadata
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

// 6. GET /api/education/videos/:id/playback - Get playback metadata and transcript
videoRouter.get('/:id/playback', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);

    const video = await smartVideoService.getVideo(id, currentUser, workspaceId);
    const streamUrl = `/api/education/videos/${video.id}/stream?workspaceId=${workspaceId}`;

    res.json({
      video,
      streamUrl,
      hasTranscript: Boolean(video.transcript && video.transcript.trim()),
      transcriptExcerpt: video.transcript ? video.transcript.slice(0, 300) : undefined
    });
  } catch (err: any) {
    handleVideoError(res, err, 'PLAYBACK_METADATA_FAILED');
  }
});

// 7. GET /api/education/videos/:id/stream - HTTP Range partial content binary streaming
videoRouter.get('/:id/stream', async (req: Request, res: Response) => {
  try {
    const currentUser = await authenticateRequest(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';
    const id = String(req.params.id);

    const { video, fileRecord, buffer } = await smartVideoService.getPlaybackData(
      id,
      currentUser,
      workspaceId
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

      if (start >= totalSize || end >= totalSize) {
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
