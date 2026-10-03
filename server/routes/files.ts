// Unified File & Storage REST API Routes (Milestone 10)
import { Router, Request, Response } from 'express';
import { jarvisData } from '../data/index.ts';
import { fileService } from '../storage/fileService.ts';
import { ragStorageBridge } from '../storage/ragBridge.ts';
import type { User } from '../data/types.ts';
import type { FileListFilter } from '../../src/types/storage.ts';

export const filesRouter = Router();

/**
 * Resolves current user from request context (Header, Query, or fallback).
 */
async function resolveUser(req: Request): Promise<User> {
  const userId =
    (typeof req.headers['x-user-id'] === 'string' && req.headers['x-user-id']) ||
    (typeof req.query.userId === 'string' && req.query.userId) ||
    'user-tony';

  const user = await jarvisData.users.getById(userId);
  if (user) return user;

  return {
    id: userId,
    displayName: 'Authorized User',
    email: `${userId}@stark.local`,
    role: 'commander',
    createdAt: new Date().toISOString()
  };
}

// POST /api/files - Upload a file (JSON base64 or binary buffer)
filesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const {
      originalName,
      mimeType,
      base64Data,
      workspaceId = 'ws-stark-core',
      classId,
      assignmentId,
      submissionId,
      knowledgeSpaceId,
      researchProjectId,
      conversationId,
      messageId,
      description,
      tags,
      isPublicInWorkspace
    } = req.body || {};

    if (!originalName) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'originalName is required.' } });
      return;
    }

    let buffer: Buffer;

    if (base64Data) {
      // Clean possible data URI prefix (e.g. "data:image/png;base64,....")
      const pureBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      buffer = Buffer.from(pureBase64, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (typeof req.body === 'string') {
      buffer = Buffer.from(req.body, 'utf-8');
    } else {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'base64Data or raw body buffer is required.' } });
      return;
    }

    const fileRecord = await fileService.uploadFile(
      {
        originalName,
        mimeType,
        buffer,
        workspaceId,
        ownerUserId: currentUser.id,
        classId,
        assignmentId,
        submissionId,
        knowledgeSpaceId,
        researchProjectId,
        conversationId,
        messageId,
        description,
        tags: Array.isArray(tags) ? tags : [],
        isPublicInWorkspace: isPublicInWorkspace !== false
      },
      currentUser
    );

    res.status(201).json({
      file: fileRecord,
      downloadUrl: `/api/files/${fileRecord.id}/download`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isAuthError = err.message?.includes('Unauthorized') || err.message?.includes('Access denied');
    const isValError = err.message?.includes('Validation failed') || err.message?.includes('exceeds maximum');
    const statusCode = isAuthError ? 403 : isValError ? 400 : 500;
    res.status(statusCode).json({ error: { code: 'UPLOAD_FAILED', message: err.message || 'File upload failed.' } });
  }
});

// GET /api/files - List files matching filter criteria
filesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : 'ws-stark-core';

    const filter: FileListFilter = {
      workspaceId,
      ownerUserId: typeof req.query.ownerUserId === 'string' ? req.query.ownerUserId : undefined,
      classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
      assignmentId: typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined,
      submissionId: typeof req.query.submissionId === 'string' ? req.query.submissionId : undefined,
      knowledgeSpaceId: typeof req.query.knowledgeSpaceId === 'string' ? req.query.knowledgeSpaceId : undefined,
      researchProjectId: typeof req.query.researchProjectId === 'string' ? req.query.researchProjectId : undefined,
      conversationId: typeof req.query.conversationId === 'string' ? req.query.conversationId : undefined,
      extension: typeof req.query.extension === 'string' ? req.query.extension : undefined,
      status: typeof req.query.status === 'string' ? (req.query.status as any) : undefined
    };

    const files = await fileService.listFiles(filter, currentUser);

    res.json({
      files,
      count: files.length,
      workspaceId,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const statusCode = err.message?.includes('authorized') ? 403 : 500;
    res.status(statusCode).json({ error: { code: 'LIST_FAILED', message: err.message || 'Failed to list files.' } });
  }
});

// GET /api/files/:id - Get file metadata & controlled access reference
filesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const id = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;

    const file = await fileService.getFileMetadata(id, currentUser, workspaceId);

    res.json({
      file,
      downloadUrl: `/api/files/${file.id}/download`,
      inlineUrl: `/api/files/${file.id}/download?inline=true`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isNotFound = err.message?.includes('not found');
    const isAuth = err.message?.includes('denied') || err.message?.includes('permission');
    const statusCode = isNotFound ? 404 : isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: 'METADATA_ERROR', message: err.message || 'Failed to get file metadata.' } });
  }
});

// GET /api/files/:id/download - Authorized file streaming / download
filesRouter.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const id = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const inline = req.query.inline === 'true';

    const { file, buffer } = await fileService.getFileContent(id, currentUser, workspaceId);

    const safeFilename = encodeURIComponent(file.originalName);
    const dispositionType = inline ? 'inline' : 'attachment';

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${file.originalName}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.send(buffer);
  } catch (err: any) {
    const isNotFound = err.message?.includes('not found') || err.message?.includes('missing');
    const isAuth = err.message?.includes('denied') || err.message?.includes('permission') || err.message?.includes('Cross-workspace');
    const statusCode = isNotFound ? 404 : isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: 'DOWNLOAD_FAILED', message: err.message || 'Failed to download file.' } });
  }
});

// DELETE /api/files/:id - Authorized file deletion
filesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const id = req.params.id as string;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;

    const file = await jarvisData.files.getById(id, workspaceId);
    if (!file) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `File '${id}' not found.` } });
      return;
    }

    const deleted = await fileService.deleteFile(id, currentUser, workspaceId);

    res.json({
      success: deleted,
      id,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('Unauthorized') || err.message?.includes('forbidden') || err.message?.includes('denied');
    const statusCode = isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: 'DELETE_FAILED', message: err.message || 'Failed to delete file.' } });
  }
});

// POST /api/files/:id/ingest-to-knowledge - Ingest stored file into Knowledge Space
filesRouter.post('/:id/ingest-to-knowledge', async (req: Request, res: Response) => {
  try {
    const currentUser = await resolveUser(req);
    const id = req.params.id as string;
    const { knowledgeSpaceId } = req.body || {};

    if (!knowledgeSpaceId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'knowledgeSpaceId is required.' } });
      return;
    }

    const result = await ragStorageBridge.ingestFileToKnowledgeSpace(id, knowledgeSpaceId, currentUser);

    res.json({
      success: true,
      file: result.file,
      sourceId: result.sourceId,
      chunksIndexed: result.chunksIndexed,
      contentHash: result.contentHash,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('denied') || err.message?.includes('permission');
    const statusCode = isAuth ? 403 : 500;
    res.status(statusCode).json({ error: { code: 'INGEST_FAILED', message: err.message || 'Failed to ingest file into Knowledge Space.' } });
  }
});
