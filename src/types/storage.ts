// Domain Types and Contracts for Unified File & Storage Foundation (Milestone 10)

export type FileStatus = 'uploading' | 'stored' | 'validating' | 'ready' | 'failed' | 'deleted';

export interface FileRecord {
  id: string; // e.g. "file-1720000000000-abcd"
  workspaceId: string;
  ownerUserId: string;
  originalName: string;
  storageKey: string; // e.g. "obj-a1b2c3d4e5f6-uuid"
  mimeType: string;
  sizeBytes: number;
  extension: string; // e.g. "pdf", "png", "docx", "txt", "md"
  sha256: string;
  status: FileStatus;

  // Domain Relational Associations (nullable / optional)
  classId?: string;
  assignmentId?: string;
  submissionId?: string;
  knowledgeSpaceId?: string;
  knowledgeSourceId?: string;
  conversationId?: string;
  messageId?: string;
  researchProjectId?: string;

  // Additional Metadata
  description?: string;
  tags?: string[];
  validationError?: string;
  downloadCount: number;
  isPublicInWorkspace?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageObjectMetadata {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoragePutResult {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
}

export interface FileUploadPayload {
  originalName: string;
  mimeType?: string;
  buffer: Buffer | Uint8Array;
  workspaceId: string;
  ownerUserId: string;
  classId?: string;
  assignmentId?: string;
  submissionId?: string;
  knowledgeSpaceId?: string;
  researchProjectId?: string;
  conversationId?: string;
  messageId?: string;
  tags?: string[];
  description?: string;
  isPublicInWorkspace?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  sanitizedName: string;
  detectedMime: string;
  extension: string;
  error?: string;
}

export interface FileListFilter {
  workspaceId: string;
  ownerUserId?: string;
  classId?: string;
  assignmentId?: string;
  submissionId?: string;
  knowledgeSpaceId?: string;
  researchProjectId?: string;
  conversationId?: string;
  status?: FileStatus;
  extension?: string;
}

export interface FileAttachmentRef {
  fileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  downloadUrl?: string;
}
