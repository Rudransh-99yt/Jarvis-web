// Repository Interfaces for Core Platform Data Foundation
import type {
  User,
  Workspace,
  WorkspaceMembership,
  Conversation,
  Message,
  KnowledgeSpaceRecord,
  KnowledgeSourceRecord,
  ToolAuditEvent
} from './types.ts';
import type {
  EducationClass,
  Assignment,
  StudentSubmission,
  GroundedQueryResponse
} from '../../src/types/education.ts';
import type { MessageRole } from '../../src/types/api.ts';

export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
  create(user: Omit<User, 'createdAt'>): Promise<User>;
  update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

export interface IWorkspaceRepository {
  getById(id: string): Promise<Workspace | null>;
  list(): Promise<Workspace[]>;
  listForUser(userId: string): Promise<Workspace[]>;
  create(workspace: Omit<Workspace, 'createdAt' | 'updatedAt'>): Promise<Workspace>;
  update(id: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>): Promise<Workspace | null>;
  delete(id: string): Promise<boolean>;
  
  // Membership
  addMember(workspaceId: string, userId: string, role: WorkspaceMembership['role']): Promise<WorkspaceMembership>;
  getMembers(workspaceId: string): Promise<WorkspaceMembership[]>;
  removeMember(workspaceId: string, userId: string): Promise<boolean>;
}

export interface IConversationRepository {
  getById(id: string, workspaceId?: string): Promise<Conversation | null>;
  list(workspaceId?: string, limit?: number): Promise<Conversation[]>;
  create(conversation: { id?: string; workspaceId: string; userId: string; title: string; sector?: string }): Promise<Conversation>;
  updateTitle(id: string, title: string, workspaceId?: string): Promise<Conversation | null>;
  delete(id: string, workspaceId?: string): Promise<boolean>;
  
  // Messages
  appendMessage(conversationId: string, role: MessageRole, content: string, extra?: { toolCall?: any; toolResult?: any }): Promise<Message>;
  getMessages(conversationId: string, limit?: number): Promise<Message[]>;
  clearMessages(conversationId: string): Promise<boolean>;
}

export interface IKnowledgeRepository {
  getSpaceById(id: string, workspaceId?: string): Promise<KnowledgeSpaceRecord | null>;
  listSpaces(workspaceId?: string): Promise<KnowledgeSpaceRecord[]>;
  createSpace(space: Omit<KnowledgeSpaceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSpaceRecord>;
  updateSpace(id: string, updates: Partial<Omit<KnowledgeSpaceRecord, 'id' | 'workspaceId' | 'createdAt'>>, workspaceId?: string): Promise<KnowledgeSpaceRecord | null>;
  deleteSpace(id: string, workspaceId?: string): Promise<boolean>;

  // Sources
  getSourceById(id: string): Promise<KnowledgeSourceRecord | null>;
  listSourcesForSpace(spaceId: string, workspaceId?: string): Promise<KnowledgeSourceRecord[]>;
  createSource(source: Omit<KnowledgeSourceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSourceRecord>;
  updateSourceStatus(id: string, status: KnowledgeSourceRecord['status'], errorMessage?: string): Promise<KnowledgeSourceRecord | null>;
  deleteSource(id: string): Promise<boolean>;
  
  // Grounded search across indexed sources
  queryGrounded(spaceId: string, query: string, workspaceId?: string): Promise<GroundedQueryResponse>;
}

export interface IEducationRepository {
  getClassById(id: string): Promise<EducationClass | null>;
  listClasses(): Promise<EducationClass[]>;
  createClass(cls: EducationClass): Promise<EducationClass>;
  updateClass(id: string, updates: Partial<EducationClass>): Promise<EducationClass | null>;
  deleteClass(id: string): Promise<boolean>;

  getAssignmentById(id: string): Promise<Assignment | null>;
  listAssignments(classId?: string): Promise<Assignment[]>;
  createAssignment(asg: Omit<Assignment, 'id' | 'assignedDate' | 'totalEnrolled' | 'submittedCount' | 'gradedCount'>): Promise<Assignment>;
  updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment | null>;

  getSubmissionById(id: string): Promise<StudentSubmission | null>;
  listSubmissions(studentId?: string, assignmentId?: string): Promise<StudentSubmission[]>;
  createOrUpdateSubmission(sub: {
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    attachments?: Array<{ name: string; size: string }>;
  }): Promise<StudentSubmission>;
  gradeSubmission(submissionId: string, grade: number, feedback: string): Promise<StudentSubmission | null>;
}

export interface IAuditRepository {
  logToolExecution(event: Omit<ToolAuditEvent, 'id' | 'timestamp'>): Promise<ToolAuditEvent>;
  listRecentEvents(limit?: number, workspaceId?: string): Promise<ToolAuditEvent[]>;
}

export interface IJarvisDataRepository {
  readonly isPersistent: boolean;
  readonly storagePath?: string;

  users: IUserRepository;
  workspaces: IWorkspaceRepository;
  conversations: IConversationRepository;
  knowledge: IKnowledgeRepository;
  education: IEducationRepository;
  audit: IAuditRepository;

  init(): Promise<void>;
  seed(force?: boolean): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
}
