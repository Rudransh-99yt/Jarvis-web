// Repository Interfaces for Core Platform Data Foundation
import type {
  User,
  UserRole,
  DatabaseSchema,
  Institution,
  InstitutionMembership,
  InstitutionInvitation,
  Workspace,
  WorkspaceMembership,
  Conversation,
  Message,
  KnowledgeSpaceRecord,
  KnowledgeSourceRecord,
  ToolAuditEvent,
  PersonalJarvisIdentity,
  PersonalMemoryItem,
  PersonalKnowledgeState,
  PersonalKnowledgeConceptState,
  PersonalKnowledgeSignal,
  PersonalStudyNote,
  PersonalFlashcard,
  PersonalStudySessionPlan,
  MemoryCategory,
  MemoryVisibility,
  MemorySourceType,
  UserContextType,
  ActionActivityItem,
  DiagnosticSessionRecord,
  CheckpointEvaluationResult,
  KnowledgeAsset,
  AssetSearchCriteria,
  LearnerQuestionExposure,
  LearnerExposureSummary,
  QuestionExposureStatus,
  AuthOtpRecord,
  AuthOtpIntent,
  AuthOtpStatus
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

  // Session Management
  getOrCreateSession(sessionId: string | undefined, workspaceId: string, userId: string): Promise<import('../session/sessionStore.ts').ConversationSession>;
  addSessionMessage(sessionId: string, role: MessageRole, content: string, extra?: { toolCall?: any; toolResult?: any }): Promise<import('../../src/types/api.ts').ConversationMessage>;
  getSessionMessages(sessionId: string, limit?: number): Promise<import('../../src/types/api.ts').ConversationMessage[]>;
  clearSession(sessionId: string): Promise<boolean>;
  getActiveSessionCount(): Promise<number>;
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

  // Curriculum & Learning Links
  toggleLessonCompletion(classId: string, unitId: string, lessonId: string, isCompleted: boolean): Promise<boolean>;
  addUnitToCourse(classId: string, unit: Omit<import('../../src/types/education.ts').CourseUnit, 'id'>): Promise<import('../../src/types/education.ts').CourseUnit>;
  addLessonToUnit(classId: string, unitId: string, lesson: Omit<import('../../src/types/education.ts').CourseLesson, 'id' | 'unitId' | 'courseId'>): Promise<import('../../src/types/education.ts').CourseLesson>;
  createLearningLink(link: import('../../src/types/academicContext.ts').LearningLink): Promise<import('../../src/types/academicContext.ts').LearningLink>;
  deleteLearningLink(id: string): Promise<boolean>;
  listLearningLinks(filter?: { entityId?: string; entityType?: string }): Promise<import('../../src/types/academicContext.ts').LearningLink[]>;
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

// Milestone 13: Smart Quiz & Live Responses Repository
export interface IQuizRepository {
  getQuizById(id: string, workspaceId?: string): Promise<import('../../src/types/quiz.ts').Quiz | null>;
  listQuizzes(filter?: { classId?: string; sessionId?: string; workspaceId?: string; status?: import('../../src/types/quiz.ts').QuizStatus }): Promise<import('../../src/types/quiz.ts').Quiz[]>;
  createQuiz(input: {
    id?: string;
    workspaceId: string;
    classId: string;
    classroomSessionId: string;
    teacherId: string;
    title: string;
    description?: string;
    status?: import('../../src/types/quiz.ts').QuizStatus;
  }): Promise<import('../../src/types/quiz.ts').Quiz>;
  updateQuiz(id: string, updates: Partial<import('../../src/types/quiz.ts').Quiz>, workspaceId?: string): Promise<import('../../src/types/quiz.ts').Quiz | null>;
  deleteQuiz(id: string, workspaceId?: string): Promise<boolean>;

  // Questions
  getQuestionById(questionId: string, quizId?: string): Promise<import('../../src/types/quiz.ts').QuizQuestion | null>;
  listQuestions(quizId: string): Promise<import('../../src/types/quiz.ts').QuizQuestion[]>;
  addQuestion(input: {
    id?: string;
    quizId: string;
    order?: number;
    questionText: string;
    options: string[];
    correctOption: string;
    points?: number;
    timeLimitSeconds?: number;
  }): Promise<import('../../src/types/quiz.ts').QuizQuestion>;
  updateQuestion(questionId: string, updates: Partial<import('../../src/types/quiz.ts').QuizQuestion>, quizId?: string): Promise<import('../../src/types/quiz.ts').QuizQuestion | null>;
  removeQuestion(questionId: string, quizId?: string): Promise<boolean>;

  // Responses
  saveResponse(response: import('../../src/types/quiz.ts').QuizResponse): Promise<import('../../src/types/quiz.ts').QuizResponse>;
  getResponse(quizId: string, questionId: string, studentId: string): Promise<import('../../src/types/quiz.ts').QuizResponse | null>;
  listResponses(quizId: string, questionId?: string): Promise<import('../../src/types/quiz.ts').QuizResponse[]>;

  // Participant States
  upsertParticipantState(state: import('../../src/types/quiz.ts').QuizParticipantState): Promise<import('../../src/types/quiz.ts').QuizParticipantState>;
  getParticipantState(quizId: string, studentId: string): Promise<import('../../src/types/quiz.ts').QuizParticipantState | null>;
  listParticipantStates(quizId: string): Promise<import('../../src/types/quiz.ts').QuizParticipantState[]>;
}

export interface IVideoRepository {
  getVideoById(id: string, workspaceId?: string): Promise<import('../../src/types/video.ts').VideoRecord | null>;
  listVideos(filter?: import('../../src/types/video.ts').VideoListFilter): Promise<import('../../src/types/video.ts').VideoRecord[]>;
  createVideo(input: import('../../src/types/video.ts').CreateVideoInput): Promise<import('../../src/types/video.ts').VideoRecord>;
  updateVideo(id: string, updates: import('../../src/types/video.ts').UpdateVideoInput, workspaceId?: string): Promise<import('../../src/types/video.ts').VideoRecord | null>;
  deleteVideo(id: string, workspaceId?: string): Promise<boolean>;
}

export interface IInstitutionRepository {
  getById(id: string): Promise<Institution | null>;
  list(): Promise<Institution[]>;
  create(institution: Institution): Promise<Institution>;
  getMembership(institutionId: string, userId: string): Promise<InstitutionMembership | null>;
  listMemberships(): Promise<InstitutionMembership[]>;
  listMembershipsForUser(userId: string): Promise<InstitutionMembership[]>;
  listMembershipsForInstitution(institutionId: string): Promise<InstitutionMembership[]>;
  addMembership(institutionId: string, userId: string, role: UserRole): Promise<InstitutionMembership>;
  removeMembership(institutionId: string, userId: string): Promise<boolean>;
  getInvitationByCode(code: string): Promise<InstitutionInvitation | null>;
  listInvitations(institutionId?: string): Promise<InstitutionInvitation[]>;
  createInvitation(invitation: Omit<InstitutionInvitation, 'usedCount' | 'createdAt'>): Promise<InstitutionInvitation>;
  consumeInvitation(code: string, userId: string): Promise<{ invitation: InstitutionInvitation; membership: InstitutionMembership }>;
  revokeInvitation(code: string): Promise<boolean>;
}

// ============================================================================
// Stage 6.4.1 Expanded Data Foundation Sub-Repositories
// ============================================================================

export interface IPersonalIdentityRepository {
  getById(userId: string): Promise<PersonalJarvisIdentity | null>;
  list(): Promise<PersonalJarvisIdentity[]>;
  create(identity: PersonalJarvisIdentity): Promise<PersonalJarvisIdentity>;
  update(userId: string, updates: Partial<PersonalJarvisIdentity>): Promise<PersonalJarvisIdentity | null>;
  delete(userId: string): Promise<boolean>;
  updateStats(userId: string, statsUpdates: Partial<PersonalJarvisIdentity['stats']>): Promise<PersonalJarvisIdentity | null>;
  setActiveContext(userId: string, contextId: string): Promise<PersonalJarvisIdentity | null>;
}

export interface IPersonalMemoryRepository {
  getById(id: string): Promise<PersonalMemoryItem | null>;
  listForUser(userId: string, options?: { contextId?: string; category?: MemoryCategory; visibility?: MemoryVisibility; source?: MemorySourceType; limit?: number }): Promise<PersonalMemoryItem[]>;
  create(memory: Omit<PersonalMemoryItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }): Promise<PersonalMemoryItem>;
  update(id: string, updates: Partial<Omit<PersonalMemoryItem, 'id' | 'userId' | 'createdAt'>>, userId?: string): Promise<PersonalMemoryItem | null>;
  delete(id: string, userId: string): Promise<boolean>;
  deleteForUser(userId: string): Promise<number>;
}

export interface IPersonalKnowledgeRepository {
  getState(userId: string): Promise<PersonalKnowledgeState | null>;
  upsertState(state: PersonalKnowledgeState): Promise<PersonalKnowledgeState>;
  getConcept(userId: string, conceptId: string): Promise<PersonalKnowledgeConceptState | null>;
  recordConceptMastery(userId: string, concept: PersonalKnowledgeConceptState, signal?: PersonalKnowledgeSignal): Promise<PersonalKnowledgeConceptState>;
  rollbackConceptMastery(userId: string, conceptId: string, previousState: PersonalKnowledgeConceptState | null, signalIdToRemove?: string): Promise<void>;
  listSignals(userId: string, limit?: number): Promise<PersonalKnowledgeSignal[]>;
}

export interface IPersonalStudyRepository {
  // Notes
  getNoteById(id: string, userId?: string): Promise<PersonalStudyNote | null>;
  listNotes(userId: string, options?: { subject?: string; contextId?: string; tag?: string }): Promise<PersonalStudyNote[]>;
  createNote(note: Omit<PersonalStudyNote, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): Promise<PersonalStudyNote>;
  updateNote(id: string, updates: Partial<Omit<PersonalStudyNote, 'id' | 'userId' | 'createdAt'>>, userId?: string): Promise<PersonalStudyNote | null>;
  deleteNote(id: string, userId: string): Promise<boolean>;
  deleteAllNotes(userId: string, subject?: string): Promise<number>;

  // Flashcards
  getFlashcardById(id: string, userId?: string): Promise<PersonalFlashcard | null>;
  listFlashcards(userId: string, options?: { subject?: string; conceptId?: string }): Promise<PersonalFlashcard[]>;
  createFlashcard(card: Omit<PersonalFlashcard, 'createdAt'> & { createdAt?: string }): Promise<PersonalFlashcard>;
  updateFlashcard(id: string, updates: Partial<Omit<PersonalFlashcard, 'id' | 'userId' | 'createdAt'>>, userId?: string): Promise<PersonalFlashcard | null>;
  deleteFlashcard(id: string, userId: string): Promise<boolean>;

  // Study Plans
  listStudyPlans(userId: string): Promise<PersonalStudySessionPlan[]>;
  createStudyPlan(plan: Omit<PersonalStudySessionPlan, 'createdAt'> & { createdAt?: string }): Promise<PersonalStudySessionPlan>;
  updateStudyPlan(id: string, updates: Partial<PersonalStudySessionPlan>, userId?: string): Promise<PersonalStudySessionPlan | null>;
  deleteStudyPlan(id: string, userId: string): Promise<boolean>;
}

export interface IActivityTimelineRepository {
  getActivity(userId: string, options?: { contextId?: string; contextType?: string; limit?: number }): Promise<ActionActivityItem[]>;
  getById(id: string, userId?: string): Promise<ActionActivityItem | null>;
  recordActivity(item: Omit<ActionActivityItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<ActionActivityItem>;
  updateActivity(id: string, updates: Partial<ActionActivityItem>, userId?: string): Promise<ActionActivityItem | null>;
  deleteActivity(id: string, userId: string): Promise<boolean>;
}

export interface IDiagnosticSessionRepository {
  getSessionById(sessionId: string, userId?: string): Promise<DiagnosticSessionRecord | null>;
  listSessionsForUser(userId: string, options?: { conceptName?: string; completed?: boolean; limit?: number }): Promise<DiagnosticSessionRecord[]>;
  createSession(session: DiagnosticSessionRecord): Promise<DiagnosticSessionRecord>;
  updateSession(sessionId: string, updates: Partial<DiagnosticSessionRecord>, userId?: string): Promise<DiagnosticSessionRecord | null>;
  recordCheckpointEvaluation(sessionId: string, checkpoint: CheckpointEvaluationResult, userId?: string): Promise<DiagnosticSessionRecord | null>;
  deleteSession(sessionId: string, userId?: string): Promise<boolean>;
}

export interface IKnowledgeAssetRepository {
  getById(id: string, callerContext?: { userId?: string; institutionId?: string; workspaceId?: string }): Promise<KnowledgeAsset | null>;
  list(filter?: AssetSearchCriteria): Promise<KnowledgeAsset[]>;
  create(asset: KnowledgeAsset): Promise<KnowledgeAsset>;
  update(id: string, updates: Partial<Omit<KnowledgeAsset, 'id' | 'createdAt'>>, callerUserId?: string): Promise<KnowledgeAsset | null>;
  delete(id: string, callerUserId?: string): Promise<boolean>;
}

export interface ILearnerExposureRepository {
  getExposure(userId: string, contextId: string, questionId: string): Promise<LearnerQuestionExposure | null>;
  listExposuresForLearner(userId: string, options?: { contextId?: string; subject?: string; topic?: string; status?: QuestionExposureStatus }): Promise<LearnerQuestionExposure[]>;
  recordExposures(params: { userId: string; contextId?: string; exposures: LearnerQuestionExposure[] }): Promise<void>;
  recordAttempt(params: { userId: string; contextId?: string; questionId: string; exposure: LearnerQuestionExposure }): Promise<LearnerQuestionExposure>;
  getExposureSummary(userId: string, contextId?: string, subject?: string): Promise<LearnerExposureSummary>;
}

/**
 * Operations requiring atomic multi-domain synchronization:
 *
 * 1. Diagnostic Evaluation Checkpoint:
 *    - Updates diagnostic session evaluation state (`diagnosticSessions`)
 *    - Modifies concept mastery and emits signal (`personalKnowledge`)
 *    - Updates study time minutes and stats (`personalIdentities`)
 *    - Appends activity history event (`activityTimeline`)
 *
 * 2. Learner Question Exposure & Mastery Progression:
 *    - Updates exposure status (`learnerExposures`)
 *    - If contributing to concept mastery, updates `personalKnowledge`
 *    - Emits activity event (`activityTimeline`)
 *
 * 3. Activity Timeline Undo / Rollback:
 *    - Reverts the underlying target (e.g. removes note or reverts practice draft)
 *    - Marks activity item `undone: true`
 */

import type { TransactionOptions } from './transaction.ts';
export type { TransactionOptions } from './transaction.ts';

export interface IAuthOtpRepository {
  getById(id: string): Promise<AuthOtpRecord | null>;
  getActiveOtp(email: string, intent: AuthOtpIntent): Promise<AuthOtpRecord | null>;
  create(record: Omit<AuthOtpRecord, 'createdAt'>): Promise<AuthOtpRecord>;
  update(id: string, updates: Partial<Omit<AuthOtpRecord, 'id' | 'createdAt'>>): Promise<AuthOtpRecord | null>;
  invalidateActiveOtps(email: string, intent?: AuthOtpIntent): Promise<number>;
  cleanupExpired(): Promise<number>;
  list(filter?: { email?: string; intent?: AuthOtpIntent; status?: AuthOtpStatus }): Promise<AuthOtpRecord[]>;
  countRecentRequests(email: string, windowMs: number): Promise<number>;
}

export interface IJarvisDataRepository {
  readonly isPersistent: boolean;
  readonly storagePath?: string;

  users: IUserRepository;
  institutions: IInstitutionRepository;
  workspaces: IWorkspaceRepository;
  conversations: IConversationRepository;
  knowledge: IKnowledgeRepository;
  education: IEducationRepository;
  audit: IAuditRepository;
  research: IResearchRepository;
  files: IFileRepository;
  classroom: IClassroomRepository;
  quizzes: IQuizRepository;
  videos: IVideoRepository;

  // Milestone 2.1 Email Authentication OTPs
  authOtps: IAuthOtpRepository;

  // Stage 6.4.1 Expanded Data Foundation Sub-Repositories
  personalIdentities: IPersonalIdentityRepository;
  personalMemories: IPersonalMemoryRepository;
  personalKnowledge: IPersonalKnowledgeRepository;
  personalStudy: IPersonalStudyRepository;
  activityTimeline: IActivityTimelineRepository;
  diagnosticSessions: IDiagnosticSessionRepository;
  knowledgeAssets: IKnowledgeAssetRepository;
  learnerExposures: ILearnerExposureRepository;

  init(): Promise<void>;
  seed(force?: boolean): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
  getState(): DatabaseSchema;
  mutate<T>(fn: (state: DatabaseSchema) => T): T;

  /**
   * Stage 6.4.4: Executes a coordinated unit of work across one or more sub-repositories.
   * Guarantees bounded process-local atomicity, isolated snapshot rollback on failure,
   * and single-operation disk flush on successful commit.
   */
  runTransaction<T>(
    work: (txRepo: IJarvisDataRepository) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
}
