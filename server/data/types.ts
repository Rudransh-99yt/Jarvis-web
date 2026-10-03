// Core Data Models and Schema Definitions for Jarvis Platform
import type { EducationClass, Assignment, StudentSubmission, StudyArtifact } from '../../src/types/education.ts';
import type { ConversationMessage } from '../../src/types/api.ts';

// 1. User
export type UserRole = 'admin' | 'commander' | 'teacher' | 'student' | 'guest';

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

// 4. Conversation & Message
export interface Conversation {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  sector?: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface Message extends ConversationMessage {
  conversationId: string;
}

// 5. Knowledge Space & Knowledge Source
export type KnowledgeSourceType = 'pdf' | 'notes' | 'lecture' | 'dataset' | 'web' | 'code' | 'transcript';
export type KnowledgeSourceStatus = 'pending' | 'processing' | 'ready' | 'failed';

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
  author?: string;
  summary: string;
  fullText: string;
  tokenCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
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
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  studyArtifacts: StudyArtifact[];
  auditEvents: ToolAuditEvent[];
}
