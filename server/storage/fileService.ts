// Unified File Service Orchestrator (Milestone 10)
import crypto from 'node:crypto';
import { jarvisData } from '../data/index.ts';
import { storageManager } from './providerManager.ts';
import { validateUpload } from './validator.ts';
import { fileAuth } from './fileAuth.ts';
import { ragStorageBridge } from './ragBridge.ts';
import type { FileRecord, FileUploadPayload, FileListFilter } from '../../src/types/storage.ts';
import type { User } from '../data/types.ts';

export class FileService {
  /**
   * Process a complete secure upload lifecycle.
   */
  async uploadFile(payload: FileUploadPayload, currentUser: User): Promise<FileRecord> {
    const startTime = Date.now();
    const buf = Buffer.isBuffer(payload.buffer) ? payload.buffer : Buffer.from(payload.buffer);

    // 1. Authorization Pre-Check
    const authCheck = await fileAuth.canUploadFile(currentUser, payload);
    if (!authCheck.allowed) {
      await this.logAuditEvent(payload.workspaceId, 'file.upload.rejected', {
        originalName: payload.originalName,
        reason: authCheck.reason,
        userId: currentUser.id
      }, false, Date.now() - startTime, authCheck.reason);
      throw new Error(`Unauthorized upload: ${authCheck.reason}`);
    }

    // 2. Audit: file.upload.started
    await this.logAuditEvent(payload.workspaceId, 'file.upload.started', {
      originalName: payload.originalName,
      claimedMime: payload.mimeType,
      sizeBytes: buf.length,
      userId: currentUser.id
    }, true, 1);

    // 3. Secure Validation (allowlists, magic bytes, size limits)
    const valResult = validateUpload(payload.originalName, buf, payload.mimeType);
    if (!valResult.valid) {
      await this.logAuditEvent(payload.workspaceId, 'file.validation.failed', {
        originalName: payload.originalName,
        error: valResult.error,
        userId: currentUser.id
      }, false, Date.now() - startTime, valResult.error);
      throw new Error(`Validation failed: ${valResult.error}`);
    }

    // 4. Compute SHA-256 Content Hash
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

    // 5. Tenant-Safe Deduplication Check within same workspace
    const candidateFiles = (await jarvisData.files.list({ workspaceId: payload.workspaceId }))
      .filter((f) => f.sha256 === sha256 && f.status !== 'deleted');

    let storageKey: string | null = null;
    const provider = storageManager.getProvider();

    for (const candidate of candidateFiles) {
      if (await provider.hasObject(candidate.storageKey)) {
        storageKey = candidate.storageKey;
        break;
      }
    }

    if (!storageKey) {
      // Generate safe internal key: obj-<sha256Prefix>-<uuid>
      const hashPrefix = sha256.substring(0, 12);
      const randSuffix = crypto.randomUUID().substring(0, 8);
      storageKey = `obj-${hashPrefix}-${randSuffix}.${valResult.extension}`;

      await provider.putObject(storageKey, buf, { mimeType: valResult.detectedMime });
    }

    // 6. Create Persistent Database Record with 'ready' status
    const fileRecord = await jarvisData.files.create({
      workspaceId: payload.workspaceId,
      ownerUserId: payload.ownerUserId || currentUser.id,
      originalName: valResult.sanitizedName,
      storageKey,
      mimeType: valResult.detectedMime,
      sizeBytes: buf.length,
      extension: valResult.extension,
      sha256,
      status: 'ready',
      classId: payload.classId,
      assignmentId: payload.assignmentId,
      submissionId: payload.submissionId,
      knowledgeSpaceId: payload.knowledgeSpaceId,
      researchProjectId: payload.researchProjectId,
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      description: payload.description,
      tags: payload.tags || [],
      isPublicInWorkspace: payload.isPublicInWorkspace ?? true
    });

    // 7. Audit: file.upload.completed
    await this.logAuditEvent(payload.workspaceId, 'file.upload.completed', {
      fileId: fileRecord.id,
      storageKey,
      sizeBytes: buf.length,
      sha256,
      mimeType: valResult.detectedMime,
      userId: currentUser.id
    }, true, Date.now() - startTime);

    return fileRecord;
  }

  /**
   * Get file metadata with authorization check.
   */
  async getFileMetadata(id: string, currentUser: User, workspaceId?: string): Promise<FileRecord> {
    const file = await jarvisData.files.getById(id, workspaceId);
    if (!file) {
      throw new Error(`File '${id}' not found.`);
    }

    const authCheck = await fileAuth.canAccessFile(currentUser, file);
    if (!authCheck.allowed) {
      throw new Error(`Access denied: ${authCheck.reason || 'Unauthorized'}`);
    }

    return file;
  }

  /**
   * Retrieve file content buffer with authorization check and download count increment.
   */
  async getFileContent(id: string, currentUser: User, workspaceId?: string): Promise<{ file: FileRecord; buffer: Buffer }> {
    const startTime = Date.now();
    const file = await this.getFileMetadata(id, currentUser, workspaceId);

    const provider = storageManager.getProvider();
    const buffer = await provider.getObject(file.storageKey);

    if (!buffer) {
      throw new Error(`Underlying physical storage object for file '${id}' was not found.`);
    }

    // Increment download counter
    await jarvisData.files.incrementDownloadCount(file.id);

    // Audit download
    await this.logAuditEvent(file.workspaceId, 'file.downloaded', {
      fileId: file.id,
      originalName: file.originalName,
      userId: currentUser.id,
      sizeBytes: file.sizeBytes
    }, true, Date.now() - startTime);

    return { file, buffer };
  }

  /**
   * List files matching filter with tenant boundary check.
   */
  async listFiles(filter: FileListFilter, currentUser: User): Promise<FileRecord[]> {
    // Check workspace membership
    const memberships = await jarvisData.workspaces.getMembers(filter.workspaceId);
    const isMember = memberships.some((m) => m.userId === currentUser.id);
    if (!isMember) {
      throw new Error('User is not authorized to list files in this workspace.');
    }

    const all = await jarvisData.files.list(filter);

    // Filter by individual file access permissions for non-admin users
    if (currentUser.role === 'admin' || currentUser.role === 'commander') {
      return all;
    }

    const accessible: FileRecord[] = [];
    for (const f of all) {
      const check = await fileAuth.canAccessFile(currentUser, f);
      if (check.allowed) {
        accessible.push(f);
      }
    }
    return accessible;
  }

  /**
   * Delete a file with authorization check and cleanup.
   */
  async deleteFile(id: string, currentUser: User, workspaceId?: string): Promise<boolean> {
    const startTime = Date.now();
    const file = await jarvisData.files.getById(id, workspaceId);
    if (!file) {
      return false;
    }

    const authCheck = await fileAuth.canDeleteFile(currentUser, file);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized deletion: ${authCheck.reason}`);
    }

    // Clean up derived RAG sources and vector chunks if associated
    if (file.knowledgeSourceId) {
      await ragStorageBridge.cleanupRagOnDeletion(file);
    }

    // Delete database record
    await jarvisData.files.delete(id, file.workspaceId);

    // Check if other files reference the same storageKey before physical deletion
    const provider = storageManager.getProvider();
    const siblingWithKey = await jarvisData.files.getByStorageKey(file.storageKey);
    if (!siblingWithKey) {
      await provider.deleteObject(file.storageKey);
    }

    // Audit deletion
    await this.logAuditEvent(file.workspaceId, 'file.deleted', {
      fileId: file.id,
      originalName: file.originalName,
      storageKey: file.storageKey,
      userId: currentUser.id
    }, true, Date.now() - startTime);

    return true;
  }

  private async logAuditEvent(
    workspaceId: string,
    toolName: string,
    args: Record<string, unknown>,
    ok: boolean,
    executionTimeMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await jarvisData.audit.logToolExecution({
        workspaceId,
        sessionId: 'storage-service-session',
        toolName,
        sector: 'storage',
        args,
        ok,
        executionTimeMs,
        errorMessage
      });
    } catch {
      // Non-blocking audit failure
    }
  }
}

export const fileService = new FileService();
