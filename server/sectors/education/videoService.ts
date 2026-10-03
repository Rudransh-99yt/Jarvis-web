// Milestone 14: Video Library & Media Knowledge Service Orchestrator
import { jarvisData } from '../../data/index.ts';
import type { IJarvisDataRepository } from '../../data/repository.ts';
import { FileService } from '../../storage/fileService.ts';
import { storageManager } from '../../storage/providerManager.ts';
import { ClassroomAuthorizationPolicy } from '../../auth/classroomPolicy.ts';
import { classroomEventBus, ClassroomEventBus } from './classroomEventBus.ts';
import type { User } from '../../data/types.ts';
import type {
  VideoRecord,
  CreateVideoInput,
  UpdateVideoInput,
  VideoListFilter,
  VideoPlaybackMetadata
} from '../../../src/types/video.ts';
import type { FileRecord } from '../../../src/types/storage.ts';

export interface VideoUploadRequest {
  classId: string;
  workspaceId: string;
  title: string;
  description?: string;
  filename: string;
  mimeType: string;
  buffer: Buffer | Uint8Array;
  durationSeconds?: number;
  thumbnailUrl?: string;
  transcript?: string;
  knowledgeSpaceId?: string;
  tags?: string[];
  visibility?: 'class' | 'workspace' | 'public';
}

export class SmartVideoService {
  private repo: IJarvisDataRepository;
  private fileService: FileService;
  private policy: ClassroomAuthorizationPolicy;
  private eventBus: ClassroomEventBus;

  constructor(
    repo: IJarvisDataRepository = jarvisData,
    fileService: FileService = new FileService(),
    policy?: ClassroomAuthorizationPolicy,
    eventBus: ClassroomEventBus = classroomEventBus
  ) {
    this.repo = repo;
    this.fileService = fileService;
    this.policy = policy || new ClassroomAuthorizationPolicy(repo);
    this.eventBus = eventBus;
  }

  /**
   * 1. UPLOAD VIDEO (Teacher only)
   * Stores binary via StorageProvider, creates FileRecord and VideoRecord,
   * and optionally indexes transcript into RAG knowledge space.
   */
  async uploadVideo(
    payload: VideoUploadRequest,
    currentUser: User
  ): Promise<{ video: VideoRecord; file: FileRecord }> {
    const workspaceId = payload.workspaceId || 'ws-stark-core';

    // 1. Authorization: Only instructors, commanders, or admins can upload course videos
    const wsCheck = await this.policy.verifyWorkspaceMembership(currentUser, workspaceId);
    if (!wsCheck.isMember) {
      throw new Error(`Cross-workspace access denied: User '${currentUser.id}' is not a member of '${workspaceId}'.`);
    }

    const cls = await this.repo.education.getClassById(payload.classId);
    if (!cls) {
      throw new Error(`Class '${payload.classId}' not found.`);
    }

    if (currentUser.role === 'student') {
      throw new Error('Unauthorized: Students cannot publish course lecture videos.');
    }

    if (currentUser.role === 'teacher' && cls.instructorId !== currentUser.id) {
      throw new Error(`Forbidden: Teacher '${currentUser.id}' is not assigned to course '${cls.code}'.`);
    }

    // 2. Validate input parameters
    if (!payload.title || !payload.title.trim()) {
      throw new Error("Parameter 'title' is required.");
    }
    if (!payload.filename || !payload.filename.trim()) {
      throw new Error("Parameter 'filename' is required.");
    }

    // 3. Delegate binary upload to M10 FileService (validates, deduplicates, stores in StorageProvider)
    const buf = Buffer.isBuffer(payload.buffer) ? payload.buffer : Buffer.from(payload.buffer);
    const fileRecord = await this.fileService.uploadFile(
      {
        workspaceId,
        ownerUserId: currentUser.id,
        originalName: payload.filename,
        buffer: buf,
        mimeType: payload.mimeType,
        classId: payload.classId,
        knowledgeSpaceId: payload.knowledgeSpaceId,
        description: payload.description || payload.title,
        tags: payload.tags || ['video', cls.code],
        isPublicInWorkspace: payload.visibility !== 'class'
      },
      currentUser
    );

    // 4. Ingest transcript into RAG if specified
    let knowledgeSourceId: string | undefined;
    if (payload.transcript && payload.transcript.trim() && payload.knowledgeSpaceId) {
      try {
        const sourceName = `${payload.title} (Video Transcript)`;
        const source = await this.repo.knowledge.createSource({
          id: `src-vid-trans-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          workspaceId,
          knowledgeSpaceId: payload.knowledgeSpaceId,
          name: sourceName,
          type: 'notes',
          mimeType: 'text/markdown',
          sizeBytes: Buffer.byteLength(payload.transcript, 'utf8'),
          size: `${(Buffer.byteLength(payload.transcript, 'utf8') / 1024).toFixed(1)} KB`,
          status: 'ready',
          author: currentUser.displayName,
          summary: `Official audio transcript for lecture: ${payload.title}`,
          fullText: payload.transcript,
          tokenCount: Math.ceil(payload.transcript.split(/\s+/).length * 1.3)
        });
        knowledgeSourceId = source.id;
      } catch (err) {
        console.warn('[SmartVideoService] Failed to ingest transcript into RAG knowledge space:', err);
      }
    }

    // 5. Create VideoRecord
    const video = await this.repo.videos.createVideo({
      workspaceId,
      classId: payload.classId,
      uploaderId: currentUser.id,
      fileId: fileRecord.id,
      title: payload.title.trim(),
      description: payload.description || '',
      filename: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
      sizeBytes: fileRecord.sizeBytes,
      durationSeconds: payload.durationSeconds,
      thumbnailUrl: payload.thumbnailUrl,
      status: 'ready',
      visibility: payload.visibility || 'class',
      transcript: payload.transcript,
      knowledgeSpaceId: payload.knowledgeSpaceId,
      tags: payload.tags || []
    });

    // 6. Realtime event notification
    this.eventBus.publishEvent({
      type: 'classroom.session.started', // Scope to classroom channel
      sessionId: payload.classId,
      classId: payload.classId,
      workspaceId,
      data: {
        event: 'video.uploaded',
        video
      },
      timestamp: new Date().toISOString()
    });

    return { video, file: fileRecord };
  }

  /**
   * 2. LIST VIDEOS (Role & Class Scoped)
   */
  async listVideos(filter: VideoListFilter, currentUser: User): Promise<VideoRecord[]> {
    const workspaceId = filter.workspaceId || 'ws-stark-core';

    const wsCheck = await this.policy.verifyWorkspaceMembership(currentUser, workspaceId);
    if (!wsCheck.isMember) {
      throw new Error(`Cross-workspace access denied: User '${currentUser.id}' is not in '${workspaceId}'.`);
    }

    const allVideos = await this.repo.videos.listVideos(filter);

    // Role-based visibility filtering
    if (currentUser.role === 'admin' || currentUser.role === 'commander') {
      return allVideos;
    }

    const allClasses = await this.repo.education.listClasses();

    if (currentUser.role === 'student') {
      // Students only see videos for classes they are enrolled in
      const enrolledClassIds = new Set(allClasses.filter((c) => c.studentIds?.includes(currentUser.id)).map((c) => c.id));
      return allVideos.filter((v) => enrolledClassIds.has(v.classId) || v.visibility === 'public');
    }

    if (currentUser.role === 'teacher') {
      // Teachers see videos for classes they teach, or public videos
      const taughtClassIds = new Set(allClasses.filter((c) => c.instructorId === currentUser.id).map((c) => c.id));
      return allVideos.filter((v) => taughtClassIds.has(v.classId) || v.uploaderId === currentUser.id || v.visibility === 'public');
    }

    return [];
  }

  /**
   * 3. GET VIDEO BY ID (Authorization Enforced)
   */
  async getVideo(id: string, currentUser: User, workspaceId = 'ws-stark-core'): Promise<VideoRecord> {
    const wsCheck = await this.policy.verifyWorkspaceMembership(currentUser, workspaceId);
    if (!wsCheck.isMember) {
      throw new Error(`Access denied: User '${currentUser.id}' is not a member of '${workspaceId}'.`);
    }

    const video = await this.repo.videos.getVideoById(id, workspaceId);
    if (!video) {
      throw new Error(`Video '${id}' not found in workspace '${workspaceId}'.`);
    }

    // Verify course access
    const cls = await this.repo.education.getClassById(video.classId);
    if (cls) {
      if (currentUser.role === 'student') {
        const isEnrolled = cls.studentIds && cls.studentIds.includes(currentUser.id);
        if (!isEnrolled && video.visibility === 'class') {
          throw new Error(`Forbidden: Student '${currentUser.id}' is not enrolled in course '${cls.code}'.`);
        }
      } else if (currentUser.role === 'teacher') {
        if (cls.instructorId !== currentUser.id && video.uploaderId !== currentUser.id) {
          // Permitted if public in workspace
          if (video.visibility === 'class') {
            throw new Error(`Forbidden: Teacher '${currentUser.id}' is not assigned to course '${cls.code}'.`);
          }
        }
      }
    }

    return video;
  }

  /**
   * 4. UPDATE VIDEO METADATA (Instructor / Admin only)
   */
  async updateVideo(
    id: string,
    updates: UpdateVideoInput,
    currentUser: User,
    workspaceId = 'ws-stark-core'
  ): Promise<VideoRecord> {
    const video = await this.getVideo(id, currentUser, workspaceId);

    // Only video uploader, assigned instructor, or admin can update
    const cls = await this.repo.education.getClassById(video.classId);
    const isOwner = video.uploaderId === currentUser.id;
    const isInstructor = cls ? cls.instructorId === currentUser.id : false;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'commander';

    if (!isOwner && !isInstructor && !isAdmin) {
      throw new Error('Forbidden: Only the video uploader or course instructor can modify video details.');
    }

    const updated = await this.repo.videos.updateVideo(id, updates, workspaceId);
    return updated!;
  }

  /**
   * 5. DELETE VIDEO (Instructor / Admin only)
   * Removes VideoRecord and safely cleans up underlying FileRecord.
   */
  async deleteVideo(id: string, currentUser: User, workspaceId = 'ws-stark-core'): Promise<boolean> {
    const video = await this.getVideo(id, currentUser, workspaceId);

    const cls = await this.repo.education.getClassById(video.classId);
    const isOwner = video.uploaderId === currentUser.id;
    const isInstructor = cls ? cls.instructorId === currentUser.id : false;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'commander';

    if (!isOwner && !isInstructor && !isAdmin) {
      throw new Error('Forbidden: Only the video uploader or course instructor can delete videos.');
    }

    // Delete video record
    const deleted = await this.repo.videos.deleteVideo(id, workspaceId);
    if (deleted && video.fileId) {
      try {
        await this.fileService.deleteFile(video.fileId, currentUser);
      } catch (err) {
        console.warn(`[SmartVideoService] Non-fatal: Underlying file '${video.fileId}' cleanup skipped:`, err);
      }
    }

    return deleted;
  }

  /**
   * 6. GET PLAYBACK METADATA & STREAM BINARY
   */
  async getPlaybackData(
    id: string,
    currentUser: User,
    workspaceId = 'ws-stark-core'
  ): Promise<{
    video: VideoRecord;
    fileRecord: FileRecord;
    buffer: Buffer | null;
  }> {
    const video = await this.getVideo(id, currentUser, workspaceId);
    const fileRecord = await this.repo.files.getById(video.fileId);
    if (!fileRecord) {
      throw new Error(`Underlying video file '${video.fileId}' not found.`);
    }

    const provider = storageManager.getProvider();
    const buffer = await provider.getObject(fileRecord.storageKey);

    return {
      video,
      fileRecord,
      buffer
    };
  }
}

export const smartVideoService = new SmartVideoService();
