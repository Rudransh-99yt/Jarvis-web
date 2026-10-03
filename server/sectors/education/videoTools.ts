// Milestone 14: Deterministic Video Library Tools for Education Sector
import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../tools/types.ts';
import { smartVideoService } from './videoService.ts';
import { jarvisData } from '../../data/index.ts';
import type { User } from '../../data/types.ts';

async function resolveUserFromContext(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId;
  if (!userId) {
    throw new Error('Tool execution error: Unauthenticated tool context (missing userId).');
  }
  const existing = await jarvisData.users.getById(userId);
  if (!existing) {
    throw new Error(`Tool execution error: User '${userId}' is not a registered user.`);
  }
  return existing;
}

// 1. Tool: video.list
interface ListVideosArgs {
  classId?: string;
  workspaceId?: string;
  search?: string;
}

export const listVideosTool: ToolDefinition<ListVideosArgs> = {
  name: 'video.list',
  sector: 'education',
  aliases: ['list_videos', 'get_class_videos'],
  description: 'Lists educational videos accessible to the current user within a class or workspace.',
  declaration: {
    name: 'video_list',
    description: 'List accessible video records.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Optional course identifier' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace identifier' },
        search: { type: Type.STRING, description: 'Optional search keyword' }
      }
    }
  },
  validate(args: unknown): ValidationResult<ListVideosArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    return {
      valid: true,
      data: {
        classId: typeof a.classId === 'string' ? a.classId.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined,
        search: typeof a.search === 'string' ? a.search.trim() : undefined
      }
    };
  },
  async execute(args: ListVideosArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const videos = await smartVideoService.listVideos(
        {
          classId: args.classId,
          workspaceId: args.workspaceId || context.workspaceId,
          search: args.search
        },
        user
      );
      return {
        ok: true,
        data: {
          videos,
          count: videos.length
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'LIST_VIDEOS_ERROR', message: err.message || 'Failed to list videos.' }
      };
    }
  }
};

// 2. Tool: video.get
interface GetVideoArgs {
  videoId: string;
  workspaceId?: string;
}

export const getVideoTool: ToolDefinition<GetVideoArgs> = {
  name: 'video.get',
  sector: 'education',
  aliases: ['get_video', 'fetch_video_details'],
  description: 'Retrieves metadata, transcript details, and stream availability for a video.',
  declaration: {
    name: 'video_get',
    description: 'Retrieve video details by ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        videoId: { type: Type.STRING, description: 'Unique video identifier' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['videoId']
    }
  },
  validate(args: unknown): ValidationResult<GetVideoArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.videoId || typeof a.videoId !== 'string') return { valid: false, error: "Parameter 'videoId' is required." };
    return {
      valid: true,
      data: {
        videoId: a.videoId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: GetVideoArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const video = await smartVideoService.getVideo(
        args.videoId,
        user,
        args.workspaceId || context.workspaceId
      );
      return {
        ok: true,
        data: { video }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'GET_VIDEO_ERROR', message: err.message || 'Failed to get video.' }
      };
    }
  }
};

// 3. Tool: video.upload
interface UploadVideoArgs {
  classId: string;
  title: string;
  filename: string;
  description?: string;
  transcript?: string;
  durationSeconds?: number;
  knowledgeSpaceId?: string;
  workspaceId?: string;
}

export const uploadVideoTool: ToolDefinition<UploadVideoArgs> = {
  name: 'video.upload',
  sector: 'education',
  aliases: ['upload_video', 'publish_video'],
  description: 'Publishes a course video with metadata and optional transcript into course storage.',
  declaration: {
    name: 'video_upload',
    description: 'Upload a course video.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Course identifier' },
        title: { type: Type.STRING, description: 'Title of the video' },
        filename: { type: Type.STRING, description: 'Video filename (e.g. "lecture.mp4")' },
        description: { type: Type.STRING, description: 'Optional description' },
        transcript: { type: Type.STRING, description: 'Optional speech transcript' },
        durationSeconds: { type: Type.NUMBER, description: 'Optional duration in seconds' },
        knowledgeSpaceId: { type: Type.STRING, description: 'Optional Knowledge Space ID for RAG indexing' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace identifier' }
      },
      required: ['classId', 'title', 'filename']
    }
  },
  validate(args: unknown): ValidationResult<UploadVideoArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.classId || typeof a.classId !== 'string') return { valid: false, error: "Parameter 'classId' is required." };
    if (!a.title || typeof a.title !== 'string') return { valid: false, error: "Parameter 'title' is required." };
    if (!a.filename || typeof a.filename !== 'string') return { valid: false, error: "Parameter 'filename' is required." };
    return {
      valid: true,
      data: {
        classId: a.classId.trim(),
        title: a.title.trim(),
        filename: a.filename.trim(),
        description: typeof a.description === 'string' ? a.description.trim() : undefined,
        transcript: typeof a.transcript === 'string' ? a.transcript.trim() : undefined,
        durationSeconds: typeof a.durationSeconds === 'number' ? a.durationSeconds : undefined,
        knowledgeSpaceId: typeof a.knowledgeSpaceId === 'string' ? a.knowledgeSpaceId.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: UploadVideoArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      // Construct valid MP4 mock container bytes
      const ftyp = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
        0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
        0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32
      ]);

      const result = await smartVideoService.uploadVideo(
        {
          classId: args.classId,
          workspaceId: args.workspaceId || context.workspaceId || 'ws-stark-core',
          title: args.title,
          description: args.description,
          filename: args.filename,
          mimeType: 'video/mp4',
          buffer: ftyp,
          durationSeconds: args.durationSeconds,
          transcript: args.transcript,
          knowledgeSpaceId: args.knowledgeSpaceId
        },
        user
      );

      return {
        ok: true,
        data: {
          video: result.video,
          fileId: result.file.id
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'UPLOAD_VIDEO_ERROR', message: err.message || 'Failed to upload video.' }
      };
    }
  }
};

// 4. Tool: video.update
interface UpdateVideoArgs {
  videoId: string;
  title?: string;
  description?: string;
  transcript?: string;
  workspaceId?: string;
}

export const updateVideoTool: ToolDefinition<UpdateVideoArgs> = {
  name: 'video.update',
  sector: 'education',
  aliases: ['update_video_metadata'],
  description: 'Modifies title, description, or transcript for an existing video.',
  declaration: {
    name: 'video_update',
    description: 'Update video details.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        videoId: { type: Type.STRING, description: 'Video ID to update' },
        title: { type: Type.STRING, description: 'Updated title' },
        description: { type: Type.STRING, description: 'Updated description' },
        transcript: { type: Type.STRING, description: 'Updated speech transcript' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['videoId']
    }
  },
  validate(args: unknown): ValidationResult<UpdateVideoArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.videoId || typeof a.videoId !== 'string') return { valid: false, error: "Parameter 'videoId' is required." };
    return {
      valid: true,
      data: {
        videoId: a.videoId.trim(),
        title: typeof a.title === 'string' ? a.title.trim() : undefined,
        description: typeof a.description === 'string' ? a.description.trim() : undefined,
        transcript: typeof a.transcript === 'string' ? a.transcript.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: UpdateVideoArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const updated = await smartVideoService.updateVideo(
        args.videoId,
        {
          title: args.title,
          description: args.description,
          transcript: args.transcript
        },
        user,
        args.workspaceId || context.workspaceId
      );
      return {
        ok: true,
        data: { video: updated }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'UPDATE_VIDEO_ERROR', message: err.message || 'Failed to update video.' }
      };
    }
  }
};

// 5. Tool: video.delete
interface DeleteVideoArgs {
  videoId: string;
  workspaceId?: string;
}

export const deleteVideoTool: ToolDefinition<DeleteVideoArgs> = {
  name: 'video.delete',
  sector: 'education',
  aliases: ['delete_video', 'purge_video'],
  description: 'Deletes a video record and permanently cleans up underlying binary storage.',
  declaration: {
    name: 'video_delete',
    description: 'Delete video record and stored binary.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        videoId: { type: Type.STRING, description: 'Video ID to delete' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['videoId']
    }
  },
  validate(args: unknown): ValidationResult<DeleteVideoArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.videoId || typeof a.videoId !== 'string') return { valid: false, error: "Parameter 'videoId' is required." };
    return {
      valid: true,
      data: {
        videoId: a.videoId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: DeleteVideoArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const success = await smartVideoService.deleteVideo(
        args.videoId,
        user,
        args.workspaceId || context.workspaceId
      );
      return {
        ok: true,
        data: { success, videoId: args.videoId }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'DELETE_VIDEO_ERROR', message: err.message || 'Failed to delete video.' }
      };
    }
  }
};

// 6. Tool: video.search
interface SearchVideoArgs {
  query: string;
  classId?: string;
  workspaceId?: string;
  topK?: number;
}

export const searchVideoTool: ToolDefinition<SearchVideoArgs> = {
  name: 'video.search',
  sector: 'education',
  aliases: ['search_videos', 'discover_lectures', 'find_video_concepts'],
  description: 'Searches across lecture transcripts and timestamped segments for concepts or topics.',
  declaration: {
    name: 'video_search',
    description: 'Search lecture video transcripts and timestamped segments.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Concept or topic keyword to search for' },
        classId: { type: Type.STRING, description: 'Optional class identifier filter' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace identifier' },
        topK: { type: Type.NUMBER, description: 'Maximum number of results to return' }
      },
      required: ['query']
    }
  },
  validate(args: unknown): ValidationResult<SearchVideoArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.query || typeof a.query !== 'string') return { valid: false, error: "Parameter 'query' is required." };
    return {
      valid: true,
      data: {
        query: a.query.trim(),
        classId: typeof a.classId === 'string' ? a.classId.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined,
        topK: typeof a.topK === 'number' ? a.topK : undefined
      }
    };
  },
  async execute(args: SearchVideoArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const results = await smartVideoService.searchVideos(
        args.query,
        {
          classId: args.classId,
          workspaceId: args.workspaceId || context.workspaceId,
          topK: args.topK
        },
        user
      );
      return {
        ok: true,
        data: {
          query: args.query,
          results,
          count: results.length
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SEARCH_VIDEO_ERROR', message: err.message || 'Failed to search videos.' }
      };
    }
  }
};

// 7. Tool: video.ask
interface AskVideoArgs {
  question: string;
  videoId?: string;
  classId?: string;
  workspaceId?: string;
}

export const askVideoTool: ToolDefinition<AskVideoArgs> = {
  name: 'video.ask',
  sector: 'education',
  aliases: ['ask_video_question', 'lecture_qa', 'query_video_content'],
  description: 'Answers student questions strictly grounded in lecture transcripts and video materials with exact citations.',
  declaration: {
    name: 'video_ask',
    description: 'Ask a grounded question about a specific video lecture or course lectures.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'Question to answer from lecture material' },
        videoId: { type: Type.STRING, description: 'Optional specific video ID to query' },
        classId: { type: Type.STRING, description: 'Optional course ID filter' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['question']
    }
  },
  validate(args: unknown): ValidationResult<AskVideoArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments object required.' };
    const a = args as any;
    if (!a.question || typeof a.question !== 'string') return { valid: false, error: "Parameter 'question' is required." };
    return {
      valid: true,
      data: {
        question: a.question.trim(),
        videoId: typeof a.videoId === 'string' ? a.videoId.trim() : undefined,
        classId: typeof a.classId === 'string' ? a.classId.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: AskVideoArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      let result;
      if (args.videoId) {
        result = await smartVideoService.askVideo(
          args.videoId,
          args.question,
          user,
          args.workspaceId || context.workspaceId
        );
      } else {
        result = await smartVideoService.askCourseVideos(
          args.question,
          {
            classId: args.classId,
            workspaceId: args.workspaceId || context.workspaceId
          },
          user
        );
      }
      return {
        ok: true,
        data: result as unknown as Record<string, unknown>
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'ASK_VIDEO_ERROR', message: err.message || 'Failed to answer video question.' }
      };
    }
  }
};

export const videoTools = [
  listVideosTool,
  getVideoTool,
  uploadVideoTool,
  updateVideoTool,
  deleteVideoTool,
  searchVideoTool,
  askVideoTool
];
