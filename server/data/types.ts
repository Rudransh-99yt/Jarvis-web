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
export * from '../../src/types/smartboard.ts';
export * from '../../src/types/personalIdentity.ts';
export * from '../../src/types/actionExperience.ts';
export * from '../../src/types/knowledgeAsset.ts';
export * from '../../src/types/questionExposure.ts';

import type {
  PersonalJarvisIdentity,
  PersonalMemoryItem,
  PersonalKnowledgeState,
  PersonalStudyNote,
  PersonalFlashcard,
  PersonalStudySessionPlan,
  UserContextType
} from '../../src/types/personalIdentity.ts';
import type { ActionActivityItem } from '../../src/types/actionExperience.ts';
import type { KnowledgeAsset } from '../../src/types/knowledgeAsset.ts';
import type { LearnerQuestionExposure } from '../../src/types/questionExposure.ts';
import type {
  DiagnosticQuestion,
  CheckpointEvaluationResult,
  DiagnosticSession
} from '../personal/diagnosticService.ts';
export type {
  DiagnosticQuestion,
  CheckpointEvaluationResult,
  DiagnosticSession
} from '../personal/diagnosticService.ts';

// 1. User
export type UserRole = 'admin' | 'commander' | 'principal' | 'teacher' | 'parent' | 'student' | 'guest';

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  institutionId?: string;
  workspaceId?: string;
  createdAt: string;
}

/** Canonical tenant records used exclusively for server-side authorization. */
export interface Institution { id: string; name: string; createdAt: string; }
export interface InstitutionMembership { id: string; institutionId: string; userId: string; role: UserRole; joinedAt: string; }

export interface InstitutionInvitation {
  id: string;
  code: string;
  institutionId: string;
  institutionName: string;
  role: UserRole;
  status: 'active' | 'expired' | 'revoked' | 'consumed';
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}

// 1.8. Email Authentication OTP Foundation (Milestone 2.1)
export type AuthOtpIntent = 'login' | 'register';
export type AuthOtpStatus = 'pending' | 'verified' | 'expired' | 'locked' | 'invalidated';

export interface AuthOtpMetadata {
  displayName?: string;
  institutionCode?: string;
  ageRange?: string;
  country?: string;
  [key: string]: any;
}

export interface AuthOtpRecord {
  id: string;
  email: string; // Normalized lowercase and trimmed
  intent: AuthOtpIntent;
  otpHash: string; // Salted HMAC-SHA256 hex string
  salt: string; // 16-byte cryptographically random hex salt
  expiresAt: string; // ISO 8601 string (10 minutes from creation)
  attemptsRemaining: number; // starts at 5
  resendAvailableAt: string; // ISO 8601 string (60 seconds from creation)
  status: AuthOtpStatus;
  metadata?: AuthOtpMetadata;
  createdAt: string; // ISO 8601 string
  verifiedAt?: string; // ISO 8601 string
}

// 2. Workspace
export interface Workspace {
  id: string;
  institutionId?: string;
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

// 7. Diagnostic Session Record (Durable JSON-serializable snapshot of DiagnosticSession)
export interface DiagnosticSessionRecord {
  sessionId: string;
  actionId?: string;
  userId: string;
  contextId?: string;
  contextType?: UserContextType;
  conceptName: string;
  subject: string;
  status: 'started' | 'in_progress' | 'completed';
  completed: boolean;
  questions: DiagnosticQuestion[];
  evaluatedCheckpoints: Record<string, CheckpointEvaluationResult>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** Converts an in-memory DiagnosticSession (with Map) to a durable serializable DiagnosticSessionRecord. */
export function serializeDiagnosticSession(session: DiagnosticSession): DiagnosticSessionRecord {
  const checkpointsRecord: Record<string, CheckpointEvaluationResult> = {};
  if (session.evaluatedCheckpoints) {
    if (session.evaluatedCheckpoints instanceof Map) {
      for (const [key, val] of session.evaluatedCheckpoints.entries()) {
        checkpointsRecord[key] = { ...val };
      }
    } else if (typeof session.evaluatedCheckpoints === 'object') {
      Object.assign(checkpointsRecord, session.evaluatedCheckpoints);
    }
  }

  return {
    sessionId: session.sessionId,
    actionId: session.actionId,
    userId: session.userId,
    contextId: session.contextId,
    contextType: session.contextType,
    conceptName: session.conceptName,
    subject: session.subject,
    status: session.status,
    completed: session.completed,
    questions: session.questions.map((q: DiagnosticQuestion) => ({ ...q })),
    evaluatedCheckpoints: checkpointsRecord,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt
  };
}

/** Converts a persisted DiagnosticSessionRecord into a runtime DiagnosticSession (with Map). */
export function deserializeDiagnosticSession(record: DiagnosticSessionRecord): DiagnosticSession {
  const checkpointsMap = new Map<string, CheckpointEvaluationResult>();
  if (record.evaluatedCheckpoints && typeof record.evaluatedCheckpoints === 'object') {
    for (const [key, val] of Object.entries(record.evaluatedCheckpoints)) {
      checkpointsMap.set(key, { ...val });
    }
  }

  return {
    sessionId: record.sessionId,
    actionId: record.actionId,
    userId: record.userId,
    contextId: record.contextId,
    contextType: record.contextType,
    conceptName: record.conceptName,
    subject: record.subject,
    status: record.status,
    completed: record.completed,
    questions: record.questions.map((q) => ({ ...q })),
    evaluatedCheckpoints: checkpointsMap,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt
  };
}

// 8. Schema Version & Compatibility Strategy Metadata
export const CURRENT_DATABASE_SCHEMA_VERSION = 3;

export interface DatabaseSchemaMeta {
  version: number;
  migratedAt?: string;
  previousVersion?: number;
  compatibilityLevel: 'strict' | 'backwards_compatible';
  supportedDomains: string[];
}

// 9. Full Database State Snapshot (for local durable storage)
export interface DatabaseSchema {
  version: number;
  meta?: DatabaseSchemaMeta;
  users: User[];
  institutions: Institution[];
  institutionMemberships: InstitutionMembership[];
  institutionInvitations?: InstitutionInvitation[];
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
  smartboardDevices?: import('../../src/types/smartboard.ts').SmartBoardDevice[];
  boardDocuments?: import('../../src/types/smartboard.ts').BoardDocument[];

  // Stage 6.4.1 Expanded Data Foundation Domains (Optional for v1 backwards compatibility)
  personalIdentities?: PersonalJarvisIdentity[];
  personalMemories?: PersonalMemoryItem[];
  personalKnowledgeStates?: PersonalKnowledgeState[];
  personalStudyNotes?: PersonalStudyNote[];
  personalFlashcards?: PersonalFlashcard[];
  personalStudyPlans?: PersonalStudySessionPlan[];
  activityTimeline?: ActionActivityItem[];
  diagnosticSessions?: DiagnosticSessionRecord[];
  knowledgeAssets?: KnowledgeAsset[];
  learnerExposures?: LearnerQuestionExposure[];

  // Milestone 2.1 Email Authentication OTPs
  authOtps?: AuthOtpRecord[];
}
