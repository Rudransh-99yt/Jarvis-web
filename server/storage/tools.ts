// Unified Storage & File Sector Tools (Milestone 10)
import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../tools/types.ts';
import { jarvisData } from '../data/index.ts';
import { fileService } from './fileService.ts';
import { ragStorageBridge } from './ragBridge.ts';
import type { FileListFilter } from '../../src/types/storage.ts';

// 1. Tool: storage.file.list
interface ListFilesArgs {
  workspaceId?: string;
  classId?: string;
  assignmentId?: string;
  knowledgeSpaceId?: string;
  researchProjectId?: string;
  extension?: string;
}

export const listFilesTool: ToolDefinition<ListFilesArgs> = {
  name: 'storage.file.list',
  sector: 'storage',
  aliases: ['list_files', 'get_files', 'file.list'],
  description: 'Lists persistent stored files across educational courses, assignments, research projects, and knowledge spaces.',
  declaration: {
    name: 'storage_file_list',
    description: 'Lists persistent files filtered by workspace, class, assignment, or project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        workspaceId: { type: Type.STRING, description: 'Workspace ID (defaults to active workspace)' },
        classId: { type: Type.STRING, description: 'Optional class ID filter' },
        assignmentId: { type: Type.STRING, description: 'Optional assignment ID filter' },
        knowledgeSpaceId: { type: Type.STRING, description: 'Optional knowledge space ID filter' },
        researchProjectId: { type: Type.STRING, description: 'Optional research project filter' },
        extension: { type: Type.STRING, description: 'Optional file extension filter (e.g. "pdf", "png")' }
      }
    }
  },
  validate(args: unknown): ValidationResult<ListFilesArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: true, data: {} };
    }
    const a = args as any;
    return {
      valid: true,
      data: {
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId : undefined,
        classId: typeof a.classId === 'string' ? a.classId : undefined,
        assignmentId: typeof a.assignmentId === 'string' ? a.assignmentId : undefined,
        knowledgeSpaceId: typeof a.knowledgeSpaceId === 'string' ? a.knowledgeSpaceId : undefined,
        researchProjectId: typeof a.researchProjectId === 'string' ? a.researchProjectId : undefined,
        extension: typeof a.extension === 'string' ? a.extension : undefined
      }
    };
  },
  async execute(args: ListFilesArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const workspaceId = args.workspaceId || 'ws-stark-core';
      if (!context.userId) throw new Error("Missing authenticated context.userId.");
      const currentUser = await jarvisData.users.getById(context.userId);
      if (!currentUser) throw new Error("Authenticated actor not found.");

      const filter: FileListFilter = {
        workspaceId,
        classId: args.classId,
        assignmentId: args.assignmentId,
        knowledgeSpaceId: args.knowledgeSpaceId,
        researchProjectId: args.researchProjectId,
        extension: args.extension
      };

      const files = await fileService.listFiles(filter, currentUser);

      return {
        ok: true,
        data: {
          count: files.length,
          files: files.map((f) => ({
            id: f.id,
            name: f.originalName,
            extension: f.extension,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            status: f.status,
            classId: f.classId,
            assignmentId: f.assignmentId,
            knowledgeSpaceId: f.knowledgeSpaceId,
            researchProjectId: f.researchProjectId,
            createdAt: f.createdAt
          }))
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'LIST_FAILED', message: err.message || 'Failed to list files' } };
    }
  }
};

// 2. Tool: storage.file.get
interface GetFileArgs {
  fileId: string;
  workspaceId?: string;
}

export const getFileTool: ToolDefinition<GetFileArgs> = {
  name: 'storage.file.get',
  sector: 'storage',
  aliases: ['get_file', 'file.get', 'storage_file_get'],
  description: 'Retrieves metadata, relational associations, and download reference for a stored file.',
  declaration: {
    name: 'storage_file_get',
    description: 'Retrieves metadata and download URL for a specific file by ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: { type: Type.STRING, description: 'ID of the file to inspect' },
        workspaceId: { type: Type.STRING, description: 'Workspace ID' }
      },
      required: ['fileId']
    }
  },
  validate(args: unknown): ValidationResult<GetFileArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.fileId !== 'string' || !a.fileId.trim()) {
      return { valid: false, error: 'fileId is required.' };
    }
    return {
      valid: true,
      data: {
        fileId: a.fileId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId : undefined
      }
    };
  },
  async execute(args: GetFileArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      if (!context.userId) throw new Error("Missing authenticated context.userId.");
      const currentUser = await jarvisData.users.getById(context.userId);
      if (!currentUser) throw new Error("Authenticated actor not found.");

      const file = await fileService.getFileMetadata(args.fileId, currentUser, args.workspaceId);

      return {
        ok: true,
        data: {
          file,
          downloadUrl: `/api/files/${file.id}/download`,
          inlineUrl: `/api/files/${file.id}/download?inline=true`
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'GET_FAILED', message: err.message || 'Failed to get file' } };
    }
  }
};

// 3. Tool: storage.file.delete
interface DeleteFileArgs {
  fileId: string;
  workspaceId?: string;
}

export const deleteFileTool: ToolDefinition<DeleteFileArgs> = {
  name: 'storage.file.delete',
  sector: 'storage',
  aliases: ['delete_file', 'file.delete', 'storage_file_delete'],
  description: 'Deletes a stored file and cleans up any derived RAG knowledge sources and vector chunks.',
  declaration: {
    name: 'storage_file_delete',
    description: 'Deletes a file by ID and cleans up associated RAG data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: { type: Type.STRING, description: 'ID of the file to delete' },
        workspaceId: { type: Type.STRING, description: 'Workspace ID' }
      },
      required: ['fileId']
    }
  },
  validate(args: unknown): ValidationResult<DeleteFileArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.fileId !== 'string' || !a.fileId.trim()) {
      return { valid: false, error: 'fileId is required.' };
    }
    return {
      valid: true,
      data: {
        fileId: a.fileId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId : undefined
      }
    };
  },
  async execute(args: DeleteFileArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      if (!context.userId) throw new Error("Missing authenticated context.userId.");
      const currentUser = await jarvisData.users.getById(context.userId);
      if (!currentUser) throw new Error("Authenticated actor not found.");

      const file = await jarvisData.files.getById(args.fileId, args.workspaceId);
      if (!file) {
        return { ok: false, error: { code: 'NOT_FOUND', message: `File '${args.fileId}' not found.` } };
      }

      const deleted = await fileService.deleteFile(args.fileId, currentUser, args.workspaceId);

      return {
        ok: true,
        data: {
          success: deleted,
          fileId: args.fileId
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'DELETE_FAILED', message: err.message || 'Failed to delete file' } };
    }
  }
};

// 4. Tool: storage.file.ingest
interface IngestFileArgs {
  fileId: string;
  knowledgeSpaceId: string;
}

export const ingestFileTool: ToolDefinition<IngestFileArgs> = {
  name: 'storage.file.ingest',
  sector: 'storage',
  aliases: ['ingest_file', 'file.ingest', 'storage_file_ingest'],
  description: 'Ingests a stored PDF, Markdown, or text file into a Knowledge Space, triggering extraction, chunking, and embedding generation.',
  declaration: {
    name: 'storage_file_ingest',
    description: 'Ingest a stored file into a Knowledge Space for RAG synthesis.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: { type: Type.STRING, description: 'File ID to ingest' },
        knowledgeSpaceId: { type: Type.STRING, description: 'Target Knowledge Space ID' }
      },
      required: ['fileId', 'knowledgeSpaceId']
    }
  },
  validate(args: unknown): ValidationResult<IngestFileArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.fileId !== 'string' || !a.fileId.trim() || typeof a.knowledgeSpaceId !== 'string' || !a.knowledgeSpaceId.trim()) {
      return { valid: false, error: 'fileId and knowledgeSpaceId are required.' };
    }
    return {
      valid: true,
      data: {
        fileId: a.fileId.trim(),
        knowledgeSpaceId: a.knowledgeSpaceId.trim()
      }
    };
  },
  async execute(args: IngestFileArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      if (!context.userId) throw new Error("Missing authenticated context.userId.");
      const currentUser = await jarvisData.users.getById(context.userId);
      if (!currentUser) throw new Error("Authenticated actor not found.");

      const result = await ragStorageBridge.ingestFileToKnowledgeSpace(args.fileId, args.knowledgeSpaceId, currentUser);

      return {
        ok: true,
        data: {
          fileId: result.file.id,
          sourceId: result.sourceId,
          chunksIndexed: result.chunksIndexed,
          contentHash: result.contentHash
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'INGEST_FAILED', message: err.message || 'Failed to ingest file into Knowledge Space' } };
    }
  }
};
