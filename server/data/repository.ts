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
import type {
  ResearchProject,
  ResearchQuestion,
  EvidenceRecord,
  ResearchNote,
  ResearchReport,
  ResearchProjectStatus,
  ResearchQuestionStatus
} from '../../src/types/research.ts';
import type { FileRecord, FileListFilter } from '../../src/types/storage.ts';

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

export interface MessageFilter {
  workspaceId?: string;
  classId?: string;
  conversationId?: string;
  senderUserId?: string;
  limit?: number;
}

export interface CreateMessageInput {
  id?: string;
  workspaceId: string;
  classId: string;
  conversationId?: string;
  senderUserId: string;
  senderName?: string;
  senderRole?: 'teacher' | 'student' | 'commander' | 'admin' | 'system';
  body: string;
  attachmentFileIds?: string[];
  readBy?: string[];
  createdAt?: string;
}

export interface IConversationRepository {
  getById(id: string, workspaceId?: string): Promise<Conversation | null>;
  list(workspaceId?: string, limit?: number): Promise<Conversation[]>;
  create(conversation: {
    id?: string;
    workspaceId: string;
    userId: string;
    title: string;
    sector?: string;
    classId?: string;
    participantIds?: string[];
    type?: 'direct' | 'class_channel' | 'ai_chat';
  }): Promise<Conversation>;
  updateTitle(id: string, title: string, workspaceId?: string): Promise<Conversation | null>;
  delete(id: string, workspaceId?: string): Promise<boolean>;
  
  // Legacy & AI Chat Messages
  appendMessage(conversationId: string, role: MessageRole, content: string, extra?: { toolCall?: any; toolResult?: any }): Promise<Message>;
  getMessages(conversationId: string, limit?: number): Promise<Message[]>;
  clearMessages(conversationId: string): Promise<boolean>;

  // Milestone 11: Teacher ↔ Student Class Messaging & Attachments
  createMessage(input: CreateMessageInput): Promise<Message>;
  listMessages(filter: MessageFilter): Promise<Message[]>;
  getMessageById(id: string, workspaceId?: string): Promise<Message | null>;
  markMessageRead(id: string, userId: string): Promise<Message | null>;
  listThreads(classId: string, workspaceId?: string): Promise<Conversation[]>;
  getOrCreateClassThread(classId: string, workspaceId: string, participantIds?: string[], title?: string): Promise<Conversation>;
}


export interface IKnowledgeRepository {
  getSpaceById(id: string, workspaceId?: string): Promise<KnowledgeSpaceRecord | null>;
  listSpaces(workspaceId?: string): Promise<KnowledgeSpaceRecord[]>;
  createSpace(space: Omit<KnowledgeSpaceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSpaceRecord>;
  updateSpace(id: string, updates: Partial<Omit<KnowledgeSpaceRecord, 'id' | 'workspaceId' | 'createdAt'>>, workspaceId?: string): Promise<KnowledgeSpaceRecord | null>;
  deleteSpace(id: string, workspaceId?: string): Promise<boolean>;

  // Sources
  getSourceById(id: string): Promise<KnowledgeSourceRecord | null>;
  getSourceByHash(contentHash: string, spaceId?: string): Promise<KnowledgeSourceRecord | null>;
  listSourcesForSpace(spaceId: string, workspaceId?: string): Promise<KnowledgeSourceRecord[]>;
  createSource(source: Omit<KnowledgeSourceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSourceRecord>;
  updateSource(id: string, updates: Partial<Omit<KnowledgeSourceRecord, 'id' | 'createdAt'>>): Promise<KnowledgeSourceRecord | null>;
  updateSourceStatus(id: string, status: KnowledgeSourceRecord['status'], errorMessage?: string): Promise<KnowledgeSourceRecord | null>;
  deleteSource(id: string): Promise<boolean>;

  // Chunks & Local Vector Storage
  upsertChunks(chunks: import('./types.ts').KnowledgeChunkRecord[]): Promise<void>;
  getChunksForSource(sourceId: string): Promise<import('./types.ts').KnowledgeChunkRecord[]>;
  getChunksForSpace(spaceId: string, workspaceId?: string): Promise<import('./types.ts').KnowledgeChunkRecord[]>;
  deleteChunksBySourceId(sourceId: string): Promise<number>;
  deleteChunksBySpaceId(spaceId: string): Promise<number>;
  
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

export interface IResearchRepository {
  // Projects
  getProjectById(id: string, workspaceId?: string): Promise<ResearchProject | null>;
  listProjects(workspaceId?: string, status?: ResearchProjectStatus): Promise<ResearchProject[]>;
  createProject(project: Omit<ResearchProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ResearchProject>;
  updateProject(id: string, updates: Partial<Omit<ResearchProject, 'id' | 'workspaceId' | 'createdAt'>>, workspaceId?: string): Promise<ResearchProject | null>;
  deleteProject(id: string, workspaceId?: string): Promise<boolean>;

  // Questions
  getQuestionById(id: string, projectId?: string): Promise<ResearchQuestion | null>;
  listQuestions(projectId: string, workspaceId?: string): Promise<ResearchQuestion[]>;
  createQuestion(question: Omit<ResearchQuestion, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ResearchQuestion>;
  updateQuestion(id: string, updates: Partial<Omit<ResearchQuestion, 'id' | 'projectId' | 'workspaceId' | 'createdAt'>>): Promise<ResearchQuestion | null>;
  deleteQuestion(id: string): Promise<boolean>;

  // Evidence
  getEvidenceById(id: string): Promise<EvidenceRecord | null>;
  listEvidence(projectId: string, questionId?: string): Promise<EvidenceRecord[]>;
  createEvidence(evidence: Omit<EvidenceRecord, 'id' | 'createdAt'>): Promise<EvidenceRecord>;
  deleteEvidence(id: string): Promise<boolean>;

  // Notes
  getNoteById(id: string): Promise<ResearchNote | null>;
  listNotes(projectId: string): Promise<ResearchNote[]>;
  createNote(note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ResearchNote>;
  updateNote(id: string, updates: Partial<Omit<ResearchNote, 'id' | 'projectId' | 'workspaceId' | 'createdAt'>>): Promise<ResearchNote | null>;
  deleteNote(id: string): Promise<boolean>;

  // Reports
  getReportById(id: string): Promise<ResearchReport | null>;
  listReports(projectId: string): Promise<ResearchReport[]>;
  createReport(report: Omit<ResearchReport, 'id' | 'generatedAt'> & { id?: string }): Promise<ResearchReport>;
  deleteReport(id: string): Promise<boolean>;
}

export interface IFileRepository {
  getById(id: string, workspaceId?: string): Promise<FileRecord | null>;
  getByStorageKey(storageKey: string): Promise<FileRecord | null>;
  list(filter?: FileListFilter): Promise<FileRecord[]>;
  create(file: Omit<FileRecord, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'> & { id?: string }): Promise<FileRecord>;
  update(id: string, updates: Partial<Omit<FileRecord, 'id' | 'workspaceId' | 'createdAt'>>, workspaceId?: string): Promise<FileRecord | null>;
  delete(id: string, workspaceId?: string): Promise<boolean>;
  findBySha256(sha256: string, workspaceId: string): Promise<FileRecord | null>;
  incrementDownloadCount(id: string): Promise<void>;
}

// Milestone 12: Smart Classroom Session & Presence Repository
export interface IClassroomRepository {
  getSessionById(id: string, workspaceId?: string): Promise<import('../../src/types/classroom.ts').ClassroomSession | null>;
  getActiveSessionForClass(classId: string, workspaceId?: string): Promise<import('../../src/types/classroom.ts').ClassroomSession | null>;
  listSessions(classId?: string, workspaceId?: string, status?: import('../../src/types/classroom.ts').ClassroomSessionStatus): Promise<import('../../src/types/classroom.ts').ClassroomSession[]>;
  createSession(input: import('../../src/types/classroom.ts').CreateClassroomSessionInput): Promise<import('../../src/types/classroom.ts').ClassroomSession>;
  updateSession(id: string, updates: Partial<import('../../src/types/classroom.ts').ClassroomSession>, workspaceId?: string): Promise<import('../../src/types/classroom.ts').ClassroomSession | null>;
  deleteSession(id: string, workspaceId?: string): Promise<boolean>;

  upsertParticipant(participant: import('../../src/types/classroom.ts').ClassroomParticipant): Promise<import('../../src/types/classroom.ts').ClassroomParticipant>;
  getParticipant(sessionId: string, studentId: string): Promise<import('../../src/types/classroom.ts').ClassroomParticipant | null>;
  listParticipants(sessionId: string, onlyConnected?: boolean): Promise<import('../../src/types/classroom.ts').ClassroomParticipant[]>;
  updateParticipantStatus(sessionId: string, studentId: string, status: import('../../src/types/classroom.ts').ParticipantConnectionStatus): Promise<import('../../src/types/classroom.ts').ClassroomParticipant | null>;
  removeParticipant(sessionId: string, studentId: string): Promise<boolean>;
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
  research: IResearchRepository;
  files: IFileRepository;
  classroom: IClassroomRepository;

  init(): Promise<void>;
  seed(force?: boolean): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
}
