// Core Data Models and Schema Definitions for Jarvis Platform
import type { EducationClass, Assignment, StudentSubmission, StudyArtifact } from '../../src/types/education.ts';
import type { ConversationMessage } from '../../src/types/api.ts';
import type {
  ResearchProject,
  ResearchQuestion,
  EvidenceRecord,
  ResearchNote,
  ResearchReport
} from '../../src/types/research.ts';
import type { FileRecord } from '../../src/types/storage.ts';

export * from '../../src/types/research.ts';
export * from '../../src/types/storage.ts';
export * from '../../src/types/classroom.ts';
export * from '../../src/types/quiz.ts';
export * from '../../src/types/video.ts';
export * from '../../src/types/academicContext.ts';

// 1. User
export type UserRole = 'admin' | 'commander' | 'principal' | 'teacher' | 'parent' | 'student' | 'guest';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  createdAt: string;
}

// 2. Workspace
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  activeSectors: string[];
  createdAt: string;
  updatedAt: string;
}

// 3. Workspace Membership
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

// 4. Conversation & Message (Extended for M11 Class Messaging)
export interface Conversation {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  sector?: string;
  classId?: string;
  participantIds?: string[];
  type?: 'direct' | 'class_channel' | 'ai_chat';
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: Message;
}

export interface Message extends ConversationMessage {
  conversationId: string;
  workspaceId?: string;
  classId?: string;
  senderUserId?: string;
  senderName?: string;
  senderRole?: 'teacher' | 'student' | 'commander' | 'admin' | 'system';
  body?: string;
  attachmentFileIds?: string[];
  attachments?: FileRecord[];
  readBy?: string[];
  createdAt?: string;
  updatedAt?: string;
}


// 5. Knowledge Space, Sources, & Chunks (RAG Layer)
export type KnowledgeSourceType = 'pdf' | 'notes' | 'lecture' | 'dataset' | 'web' | 'code' | 'transcript' | 'markdown' | 'text';
export type KnowledgeSourceStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type EmbeddingStatus = 'pending' | 'embedded' | 'ready' | 'failed';

export interface KnowledgeSourceRecord {
  id: string;
  workspaceId: string;
  knowledgeSpaceId: string;
  name: string;
  type: KnowledgeSourceType;
  mimeType: string;
  size: string;
  sizeBytes?: number;
  status: KnowledgeSourceStatus;
  ingestionStatus?: KnowledgeSourceStatus;
  chunkCount?: number;
  embeddingStatus?: EmbeddingStatus;
  contentHash?: string;
  author?: string;
  summary: string;
  fullText: string;
  tokenCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunkRecord {
  id: string; // chunk-${sourceId}-${chunkIndex}
  sourceId: string;
  knowledgeSpaceId: string;
  workspaceId: string;
  sourceTitle: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  page?: number;
  section?: string;
  contentHash: string;
  embedding?: number[];
  createdAt: string;
}

export interface KnowledgeSpaceRecord {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  ownerId: string;
  classId?: string;
  tags: string[];
  suggestedQuestions: string[];
  createdAt: string;
  updatedAt: string;
}

// 6. Audit / Tool Execution Event
export interface ToolAuditEvent {
  id: string;
  workspaceId: string;
  sessionId: string;
  toolName: string;
  sector: string;
  args: Record<string, unknown>;
  ok: boolean;
  executionTimeMs: number;
  timestamp: string;
  errorMessage?: string;
}

// 7. Full Database State Snapshot (for local durable storage)
export interface DatabaseSchema {
  version: number;
  users: User[];
  workspaces: Workspace[];
  memberships: WorkspaceMembership[];
  conversations: Conversation[];
  messages: Message[];
  knowledgeSpaces: KnowledgeSpaceRecord[];
  knowledgeSources: KnowledgeSourceRecord[];
  knowledgeChunks: KnowledgeChunkRecord[];
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  studyArtifacts: StudyArtifact[];
  auditEvents: ToolAuditEvent[];
  researchProjects: ResearchProject[];
  researchQuestions: ResearchQuestion[];
  evidenceRecords: EvidenceRecord[];
  researchNotes: ResearchNote[];
  researchReports: ResearchReport[];
  files: FileRecord[];
  classroomSessions: import('../../src/types/classroom.ts').ClassroomSession[];
  classroomParticipants: import('../../src/types/classroom.ts').ClassroomParticipant[];
  quizzes?: import('../../src/types/quiz.ts').Quiz[];
  quizQuestions?: import('../../src/types/quiz.ts').QuizQuestion[];
  quizResponses?: import('../../src/types/quiz.ts').QuizResponse[];
  quizParticipantStates?: import('../../src/types/quiz.ts').QuizParticipantState[];
  videos?: import('../../src/types/video.ts').VideoRecord[];
  learningLinks?: import('../../src/types/academicContext.ts').LearningLink[];
  academicEvents?: import('../../src/types/academicContext.ts').AcademicEvent[];
  academicNotifications?: import('../../src/types/academicContext.ts').AcademicNotification[];
  quizResults?: import('../../src/types/academicContext.ts').QuizResult[];
}
