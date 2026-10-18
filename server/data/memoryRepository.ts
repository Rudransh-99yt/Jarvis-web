// Pure In-Memory Repository Implementation for Unit Testing
import { AsyncMutex, transactionStorage, mergeThreeWaySchemas, TransactionTimeoutError, type TransactionOptions, type TransactionContext } from './transaction.ts';
import type {
  IJarvisDataRepository,
  IUserRepository,
  IInstitutionRepository,
  IWorkspaceRepository,
  IConversationRepository,
  IKnowledgeRepository,
  IEducationRepository,
  IAuditRepository,
  IResearchRepository,
  IFileRepository,
  IClassroomRepository,
  IQuizRepository,
  IVideoRepository,
  IPersonalIdentityRepository,
  IPersonalMemoryRepository,
  IPersonalKnowledgeRepository,
  IPersonalStudyRepository,
  IActivityTimelineRepository,
  IDiagnosticSessionRepository,
  IKnowledgeAssetRepository,
  ILearnerExposureRepository,
  IAuthOtpRepository,
  CreateMessageInput,
  MessageFilter
} from './repository.ts';

import type {
  CourseUnit,
  CourseLesson
} from '../../src/types/education.ts';
import type { LearningLink } from '../../src/types/academicContext.ts';
import type { ConversationSession } from '../session/sessionStore.ts';
import type { ConversationMessage, MessageRole } from '../../src/types/api.ts';
import { DEFAULT_COURSE_UNITS } from '../sectors/education/curriculumData.ts';

import type {
  User,
  UserRole,
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
  DatabaseSchema,
  ResearchProject,
  ResearchQuestion,
  EvidenceRecord,
  ResearchNote,
  ResearchReport,
  ResearchProjectStatus,
  ResearchQuestionStatus,
  FileRecord,
  FileListFilter,
  ClassroomSession,
  ClassroomParticipant,
  ClassroomSessionStatus,
  ParticipantConnectionStatus,
  CreateClassroomSessionInput,
  Quiz,
  QuizQuestion,
  QuizResponse,
  QuizParticipantState,
  QuizStatus,
  VideoRecord,
  CreateVideoInput,
  UpdateVideoInput,
  VideoListFilter,
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
import { INITIAL_DATABASE_SCHEMA } from './seedData.ts';

export class MemoryJarvisDataRepository implements IJarvisDataRepository {
  public readonly isPersistent = false;
  private _state!: DatabaseSchema;
  private mutex: AsyncMutex = new AsyncMutex();
  private transactionDepth = 0;
  private transactionStates: DatabaseSchema[] = [];
  private baseStates: DatabaseSchema[] = [];

  public users: IUserRepository;
  public institutions: IInstitutionRepository;
  public workspaces: IWorkspaceRepository;
  public conversations: IConversationRepository;
  public knowledge: IKnowledgeRepository;
  public education: IEducationRepository;
  public audit: IAuditRepository;
  public research: IResearchRepository;
  public files: IFileRepository;
  public classroom: IClassroomRepository;
  public quizzes: IQuizRepository;
  public videos: IVideoRepository;
  public authOtps: IAuthOtpRepository;
  public personalIdentities: IPersonalIdentityRepository;
  public personalMemories: IPersonalMemoryRepository;
  public personalKnowledge: IPersonalKnowledgeRepository;
  public personalStudy: IPersonalStudyRepository;
  public activityTimeline: IActivityTimelineRepository;
  public diagnosticSessions: IDiagnosticSessionRepository;
  public knowledgeAssets: IKnowledgeAssetRepository;
  public learnerExposures: ILearnerExposureRepository;

  constructor() {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));

    // 1. Users Sub-Repository
    this.users = {
      getById: async (id: string): Promise<User | null> => {
        const u = this.state.users.find((user) => user.id === id);
        return u ? { ...u } : null;
      },
      getByEmail: async (email: string): Promise<User | null> => {
        const lower = email.trim().toLowerCase();
        const u = this.state.users.find((user) => user.email.toLowerCase() === lower);
        return u ? { ...u } : null;
      },
      list: async (): Promise<User[]> => {
        return this.state.users.map((u) => ({ ...u }));
      },
      create: async (user: Omit<User, 'createdAt'>): Promise<User> => {
        const normalizedEmail = user.email ? user.email.trim().toLowerCase() : '';
        const record: User = {
          ...user,
          email: normalizedEmail,
          createdAt: new Date().toISOString()
        };
        this.mutate((state) => {
          if (!state.users) state.users = [];
          if (normalizedEmail) {
            const exists = state.users.some((u) => u.email.trim().toLowerCase() === normalizedEmail);
            if (exists) {
              const err = new Error('USER_EXISTS: A user with this email address already exists.');
              (err as any).code = 'USER_EXISTS';
              throw err;
            }
          }
          state.users.push(record);
        });
        return { ...record };
      },
      update: async (id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> => {
        const index = this.state.users.findIndex((u) => u.id === id);
        if (index === -1) return null;
        this.state.users[index] = {
          ...this.state.users[index],
          ...updates
        };
        return { ...this.state.users[index] };
      },
      delete: async (id: string): Promise<boolean> => {
        const prev = this.state.users.length;
        this.state.users = this.state.users.filter((u) => u.id !== id);
        return this.state.users.length < prev;
      }
    };

    // 1.2 Auth OTP Sub-Repository (Milestone 2.1)
    this.authOtps = {
      getById: async (id: string): Promise<AuthOtpRecord | null> => {
        const otp = (this.state.authOtps || []).find((o) => o.id === id);
        return otp ? JSON.parse(JSON.stringify(otp)) : null;
      },
      getActiveOtp: async (email: string, intent: AuthOtpIntent): Promise<AuthOtpRecord | null> => {
        const normalized = email.trim().toLowerCase();
        const now = Date.now();
        const otp = (this.state.authOtps || []).find(
          (o) =>
            o.email === normalized &&
            o.intent === intent &&
            o.status === 'pending' &&
            new Date(o.expiresAt).getTime() > now &&
            o.attemptsRemaining > 0
        );
        return otp ? JSON.parse(JSON.stringify(otp)) : null;
      },
      create: async (record: Omit<AuthOtpRecord, 'createdAt'>): Promise<AuthOtpRecord> => {
        const normalizedEmail = record.email.trim().toLowerCase();
        const newRecord: AuthOtpRecord = {
          ...record,
          email: normalizedEmail,
          createdAt: new Date().toISOString()
        };

        if (!this.state.authOtps) this.state.authOtps = [];
        // Enforce one active OTP per email and intent:
        for (const item of this.state.authOtps) {
          if (item.email === normalizedEmail && item.intent === record.intent && item.status === 'pending') {
            item.status = 'invalidated';
          }
        }
        this.state.authOtps.push(JSON.parse(JSON.stringify(newRecord)));
        return JSON.parse(JSON.stringify(newRecord));
      },
      update: async (
        id: string,
        updates: Partial<Omit<AuthOtpRecord, 'id' | 'createdAt'>>
      ): Promise<AuthOtpRecord | null> => {
        if (!this.state.authOtps) this.state.authOtps = [];
        const idx = this.state.authOtps.findIndex((o) => o.id === id);
        if (idx === -1) return null;
        this.state.authOtps[idx] = {
          ...this.state.authOtps[idx],
          ...updates,
          id: this.state.authOtps[idx].id,
          createdAt: this.state.authOtps[idx].createdAt
        };
        return JSON.parse(JSON.stringify(this.state.authOtps[idx]));
      },
      invalidateActiveOtps: async (email: string, intent?: AuthOtpIntent): Promise<number> => {
        const normalized = email.trim().toLowerCase();
        let count = 0;
        if (!this.state.authOtps) return 0;
        for (const item of this.state.authOtps) {
          if (
            item.email === normalized &&
            (!intent || item.intent === intent) &&
            item.status === 'pending'
          ) {
            item.status = 'invalidated';
            count++;
          }
        }
        return count;
      },
      cleanupExpired: async (): Promise<number> => {
        const now = Date.now();
        let count = 0;
        if (!this.state.authOtps) return 0;
        for (const item of this.state.authOtps) {
          if (item.status === 'pending' && new Date(item.expiresAt).getTime() <= now) {
            item.status = 'expired';
            count++;
          }
        }
        return count;
      },
      list: async (filter?: { email?: string; intent?: AuthOtpIntent; status?: AuthOtpStatus }): Promise<AuthOtpRecord[]> => {
        let list = this.state.authOtps || [];
        if (filter?.email) {
          const norm = filter.email.trim().toLowerCase();
          list = list.filter((o) => o.email === norm);
        }
        if (filter?.intent) {
          list = list.filter((o) => o.intent === filter.intent);
        }
        if (filter?.status) {
          list = list.filter((o) => o.status === filter.status);
        }
        return list.map((o) => JSON.parse(JSON.stringify(o)));
      },
      countRecentRequests: async (email: string, windowMs: number): Promise<number> => {
        const normalized = email.trim().toLowerCase();
        const cutoff = Date.now() - windowMs;
        const list = this.state.authOtps || [];
        return list.filter(
          (o) => o.email === normalized && new Date(o.createdAt).getTime() >= cutoff
        ).length;
      }
    };

    // 1.5 Institutions Sub-Repository
    this.institutions = {
      getById: async (id: string): Promise<Institution | null> => {
        const inst = (this.state.institutions || []).find((i) => i.id === id);
        return inst ? { ...inst } : null;
      },
      list: async (): Promise<Institution[]> => {
        return (this.state.institutions || []).map((i) => ({ ...i }));
      },
      create: async (institution: Institution): Promise<Institution> => {
        if (!this.state.institutions) this.state.institutions = [];
        this.state.institutions.push({ ...institution });
        return { ...institution };
      },
      getMembership: async (institutionId: string, userId: string): Promise<InstitutionMembership | null> => {
        const mem = (this.state.institutionMemberships || []).find(
          (m) => m.institutionId === institutionId && m.userId === userId
        );
        return mem ? { ...mem } : null;
      },
      listMemberships: async (): Promise<InstitutionMembership[]> => {
        return (this.state.institutionMemberships || []).map((m) => ({ ...m }));
      },
      listMembershipsForUser: async (userId: string): Promise<InstitutionMembership[]> => {
        return (this.state.institutionMemberships || [])
          .filter((m) => m.userId === userId)
          .map((m) => ({ ...m }));
      },
      listMembershipsForInstitution: async (institutionId: string): Promise<InstitutionMembership[]> => {
        return (this.state.institutionMemberships || [])
          .filter((m) => m.institutionId === institutionId)
          .map((m) => ({ ...m }));
      },
      addMembership: async (institutionId: string, userId: string, role: UserRole): Promise<InstitutionMembership> => {
        const record: InstitutionMembership = {
          id: `instmem-${userId}-${Date.now()}`,
          institutionId,
          userId,
          role,
          joinedAt: new Date().toISOString()
        };
        if (!this.state.institutionMemberships) this.state.institutionMemberships = [];
        const idx = this.state.institutionMemberships.findIndex(
          (m) => m.institutionId === institutionId && m.userId === userId
        );
        if (idx >= 0) {
          this.state.institutionMemberships[idx] = record;
        } else {
          this.state.institutionMemberships.push(record);
        }
        return { ...record };
      },
      removeMembership: async (institutionId: string, userId: string): Promise<boolean> => {
        if (!this.state.institutionMemberships) return false;
        const prev = this.state.institutionMemberships.length;
        this.state.institutionMemberships = this.state.institutionMemberships.filter(
          (m) => !(m.institutionId === institutionId && m.userId === userId)
        );
        return this.state.institutionMemberships.length < prev;
      },
      getInvitationByCode: async (code: string): Promise<InstitutionInvitation | null> => {
        const clean = code.trim().toUpperCase();
        const inv = (this.state.institutionInvitations || []).find(
          (i) => i.code.toUpperCase() === clean
        );
        return inv ? { ...inv } : null;
      },
      listInvitations: async (institutionId?: string): Promise<InstitutionInvitation[]> => {
        let list = this.state.institutionInvitations || [];
        if (institutionId) {
          list = list.filter((i) => i.institutionId === institutionId);
        }
        return list.map((i) => ({ ...i }));
      },
      createInvitation: async (invitation: Omit<InstitutionInvitation, 'usedCount' | 'createdAt'>): Promise<InstitutionInvitation> => {
        const record: InstitutionInvitation = {
          ...invitation,
          code: invitation.code.trim().toUpperCase(),
          usedCount: 0,
          createdAt: new Date().toISOString()
        };
        if (!this.state.institutionInvitations) this.state.institutionInvitations = [];
        this.state.institutionInvitations.push(record);
        return { ...record };
      },
      consumeInvitation: async (code: string, userId: string): Promise<{ invitation: InstitutionInvitation; membership: InstitutionMembership }> => {
        const clean = code.trim().toUpperCase();
        if (!this.state.institutionInvitations) this.state.institutionInvitations = [];
        const invIndex = this.state.institutionInvitations.findIndex((i) => i.code.toUpperCase() === clean);
        if (invIndex === -1) {
          throw new Error('INVALID_INVITATION: Invitation code does not exist.');
        }
        const inv = this.state.institutionInvitations[invIndex];
        if (inv.status !== 'active') {
          throw new Error(`INVALID_INVITATION: Invitation code is ${inv.status}.`);
        }
        if (new Date(inv.expiresAt).getTime() <= Date.now()) {
          inv.status = 'expired';
          throw new Error('INVALID_INVITATION: Invitation code has expired.');
        }
        if (inv.usedCount >= inv.maxUses) {
          inv.status = 'consumed';
          throw new Error('INVALID_INVITATION: Invitation code has reached its usage limit.');
        }

        inv.usedCount += 1;
        if (inv.usedCount >= inv.maxUses) {
          inv.status = 'consumed';
        }

        if (!this.state.institutionMemberships) this.state.institutionMemberships = [];
        // Role escalation guard: never allow an invitation to grant admin or commander
        const allowedInvitationRoles: UserRole[] = ['student', 'teacher', 'principal', 'parent'];
        const safeRole: UserRole = allowedInvitationRoles.includes(inv.role) ? inv.role : 'student';

        const membership: InstitutionMembership = {
          id: `instmem-${userId}-${Date.now()}`,
          institutionId: inv.institutionId,
          userId,
          role: safeRole,
          joinedAt: new Date().toISOString()
        };
        const existingIdx = this.state.institutionMemberships.findIndex(
          (m) => m.institutionId === inv.institutionId && m.userId === userId
        );
        if (existingIdx >= 0) {
          this.state.institutionMemberships[existingIdx] = membership;
        } else {
          this.state.institutionMemberships.push(membership);
        }

        return { invitation: { ...inv }, membership };
      },
      revokeInvitation: async (code: string): Promise<boolean> => {
        const clean = code.trim().toUpperCase();
        if (!this.state.institutionInvitations) return false;
        const inv = this.state.institutionInvitations.find((i) => i.code.toUpperCase() === clean);
        if (!inv) return false;
        inv.status = 'revoked';
        return true;
      }
    };

    // 2. Workspaces Sub-Repository
    this.workspaces = {
      getById: async (id: string): Promise<Workspace | null> => {
        const ws = this.state.workspaces.find((w) => w.id === id);
        return ws ? { ...ws } : null;
      },
      list: async (): Promise<Workspace[]> => {
        return this.state.workspaces.map((w) => ({ ...w }));
      },
      listForUser: async (userId: string): Promise<Workspace[]> => {
        const memberships = this.state.memberships.filter((m) => m.userId === userId);
        const wsIds = new Set(memberships.map((m) => m.workspaceId));
        return this.state.workspaces.filter((w) => wsIds.has(w.id)).map((w) => ({ ...w }));
      },
      create: async (workspace: Omit<Workspace, 'createdAt' | 'updatedAt'>): Promise<Workspace> => {
        const now = new Date().toISOString();
        const record: Workspace = {
          ...workspace,
          createdAt: now,
          updatedAt: now
        };
        this.state.workspaces.push(record);
        this.state.memberships.push({
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspaceId: record.id,
          userId: record.ownerId,
          role: 'owner',
          joinedAt: now
        });
        return { ...record };
      },
      update: async (id: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>): Promise<Workspace | null> => {
        const index = this.state.workspaces.findIndex((w) => w.id === id);
        if (index === -1) return null;
        this.state.workspaces[index] = {
          ...this.state.workspaces[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.workspaces[index] };
      },
      delete: async (id: string): Promise<boolean> => {
        const prev = this.state.workspaces.length;
        this.state.workspaces = this.state.workspaces.filter((w) => w.id !== id);
        this.state.memberships = this.state.memberships.filter((m) => m.workspaceId !== id);
        return this.state.workspaces.length < prev;
      },
      addMember: async (workspaceId: string, userId: string, role: WorkspaceMembership['role']): Promise<WorkspaceMembership> => {
        const record: WorkspaceMembership = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspaceId,
          userId,
          role,
          joinedAt: new Date().toISOString()
        };
        this.state.memberships = this.state.memberships.filter((m) => !(m.workspaceId === workspaceId && m.userId === userId));
        this.state.memberships.push(record);
        return { ...record };
      },
      getMembers: async (workspaceId: string): Promise<WorkspaceMembership[]> => {
        return this.state.memberships.filter((m) => m.workspaceId === workspaceId).map((m) => ({ ...m }));
      },
      removeMember: async (workspaceId: string, userId: string): Promise<boolean> => {
        const prev = this.state.memberships.length;
        this.state.memberships = this.state.memberships.filter((m) => !(m.workspaceId === workspaceId && m.userId === userId));
        return this.state.memberships.length < prev;
      }
    };

    // 3. Conversations Sub-Repository
    this.conversations = {
      getById: async (id: string, workspaceId?: string): Promise<Conversation | null> => {
        const conv = this.state.conversations.find((c) => c.id === id && (!workspaceId || c.workspaceId === workspaceId));
        if (!conv) return null;
        const msgCount = this.state.messages.filter((m) => m.conversationId === id).length;
        return { ...conv, messageCount: msgCount };
      },
      list: async (workspaceId?: string, limit?: number): Promise<Conversation[]> => {
        let convs = this.state.conversations.filter((c) => !workspaceId || c.workspaceId === workspaceId);
        convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        if (limit && limit > 0) {
          convs = convs.slice(0, limit);
        }
        return convs.map((c) => {
          const count = this.state.messages.filter((m) => m.conversationId === c.id).length;
          return { ...c, messageCount: count };
        });
      },
      create: async (conversation: {
        id?: string;
        workspaceId: string;
        userId: string;
        title: string;
        sector?: string;
        classId?: string;
        participantIds?: string[];
        type?: 'direct' | 'class_channel' | 'ai_chat';
      }): Promise<Conversation> => {
        const now = new Date().toISOString();
        const record: Conversation = {
          id: conversation.id || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: conversation.workspaceId || 'ws-stark-core',
          userId: conversation.userId || 'user-tony',
          title: conversation.title,
          sector: conversation.sector || 'command',
          classId: conversation.classId,
          participantIds: conversation.participantIds,
          type: conversation.type,
          createdAt: now,
          updatedAt: now,
          messageCount: 0
        };
        this.state.conversations.push(record);
        return { ...record };
      },
      updateTitle: async (id: string, title: string, workspaceId?: string): Promise<Conversation | null> => {
        const index = this.state.conversations.findIndex((c) => c.id === id && (!workspaceId || c.workspaceId === workspaceId));
        if (index === -1) return null;
        this.state.conversations[index] = {
          ...this.state.conversations[index],
          title,
          updatedAt: new Date().toISOString()
        };
        const count = this.state.messages.filter((m) => m.conversationId === id).length;
        return { ...this.state.conversations[index], messageCount: count };
      },
      delete: async (id: string, workspaceId?: string): Promise<boolean> => {
        const prev = this.state.conversations.length;
        this.state.conversations = this.state.conversations.filter((c) => !(c.id === id && (!workspaceId || c.workspaceId === workspaceId)));
        this.state.messages = this.state.messages.filter((m) => m.conversationId !== id);
        return this.state.conversations.length < prev;
      },
      appendMessage: async (conversationId: string, role: MessageRole, content: string, extra?: { toolCall?: any; toolResult?: any }): Promise<Message> => {
        const now = new Date().toISOString();
        const message: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          conversationId,
          role,
          content,
          timestamp: now,
          toolCall: extra?.toolCall,
          toolResult: extra?.toolResult
        };

        let conv = this.state.conversations.find((c) => c.id === conversationId);
        if (!conv) {
          conv = {
            id: conversationId,
            workspaceId: 'ws-stark-core',
            userId: 'user-tony',
            title: content.slice(0, 30) || 'Conversation',
            sector: 'command',
            createdAt: now,
            updatedAt: now,
            messageCount: 0
          };
          this.state.conversations.push(conv);
        } else {
          conv.updatedAt = now;
        }

        this.state.messages.push(message);
        return { ...message };
      },
      getMessages: async (conversationId: string, limit?: number): Promise<Message[]> => {
        const msgs = this.state.messages.filter((m) => m.conversationId === conversationId);
        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (limit && limit > 0) {
          return msgs.slice(-limit).map((m) => ({ ...m }));
        }
        return msgs.map((m) => ({ ...m }));
      },
      clearMessages: async (conversationId: string): Promise<boolean> => {
        const prev = this.state.messages.length;
        this.state.messages = this.state.messages.filter((m) => m.conversationId !== conversationId);
        return this.state.messages.length < prev;
      },

      // Milestone 11: Teacher ↔ Student Class Messaging
      createMessage: async (input: CreateMessageInput): Promise<Message> => {
        const now = input.createdAt || new Date().toISOString();
        const msgId = input.id || `msg-cls-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        let threadId = input.conversationId;
        if (!threadId) {
          threadId = `thread-${input.classId}-general`;
        }

        const messageRecord: Message = {
          id: msgId,
          conversationId: threadId,
          workspaceId: input.workspaceId,
          classId: input.classId,
          senderUserId: input.senderUserId,
          senderName: input.senderName || 'Authorized User',
          senderRole: input.senderRole || 'student',
          body: input.body,
          content: input.body,
          role: 'user',
          timestamp: now,
          createdAt: now,
          updatedAt: now,
          attachmentFileIds: input.attachmentFileIds || [],
          readBy: input.readBy && input.readBy.length > 0 ? input.readBy : [input.senderUserId]
        };

        // Ensure thread exists
        let thread = this.state.conversations.find((c) => c.id === threadId);
        if (!thread) {
          thread = {
            id: threadId,
            workspaceId: input.workspaceId,
            userId: input.senderUserId,
            title: `Class Discussion (${input.classId})`,
            sector: 'education',
            classId: input.classId,
            type: 'class_channel',
            participantIds: [input.senderUserId],
            createdAt: now,
            updatedAt: now,
            messageCount: 0
          };
          this.state.conversations.push(thread);
        } else {
          thread.updatedAt = now;
          if (thread.participantIds && !thread.participantIds.includes(input.senderUserId)) {
            thread.participantIds.push(input.senderUserId);
          }
        }
        thread.lastMessage = messageRecord;

        // Associate attached files
        if (Array.isArray(input.attachmentFileIds) && input.attachmentFileIds.length > 0) {
          for (const fId of input.attachmentFileIds) {
            const fileObj = this.state.files.find((f) => f.id === fId);
            if (fileObj) {
              fileObj.messageId = msgId;
              fileObj.classId = input.classId;
              fileObj.conversationId = threadId;
            }
          }
        }

        this.state.messages.push(messageRecord);

        const attachedFiles = (messageRecord.attachmentFileIds || [])
          .map((fId) => this.state.files.find((f) => f.id === fId))
          .filter((f): f is FileRecord => Boolean(f));

        return {
          ...messageRecord,
          attachments: attachedFiles
        };
      },

      listMessages: async (filter: MessageFilter): Promise<Message[]> => {
        let msgs = this.state.messages.filter((m) => {
          if (filter.workspaceId && m.workspaceId && m.workspaceId !== filter.workspaceId) return false;
          if (filter.classId && m.classId !== filter.classId) return false;
          if (filter.conversationId && m.conversationId !== filter.conversationId) return false;
          if (filter.senderUserId && m.senderUserId !== filter.senderUserId) return false;
          if (filter.classId && !m.classId) return false;
          return true;
        });

        msgs.sort((a, b) => new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime());

        if (filter.limit && filter.limit > 0) {
          msgs = msgs.slice(-filter.limit);
        }

        const allFiles = this.state.files;
        return msgs.map((m) => {
          const attachments = (m.attachmentFileIds || [])
            .map((fId) => allFiles.find((f) => f.id === fId))
            .filter((f): f is FileRecord => Boolean(f));
          return {
            ...m,
            attachments
          };
        });
      },

      getMessageById: async (id: string, workspaceId?: string): Promise<Message | null> => {
        const msg = this.state.messages.find((m) => m.id === id && (!workspaceId || m.workspaceId === workspaceId));
        if (!msg) return null;
        const allFiles = this.state.files;
        const attachments = (msg.attachmentFileIds || [])
          .map((fId) => allFiles.find((f) => f.id === fId))
          .filter((f): f is FileRecord => Boolean(f));
        return { ...msg, attachments };
      },

      markMessageRead: async (id: string, userId: string): Promise<Message | null> => {
        const index = this.state.messages.findIndex((m) => m.id === id);
        if (index === -1) return null;
        const msg = this.state.messages[index];
        const readBy = new Set(msg.readBy || []);
        readBy.add(userId);
        this.state.messages[index] = {
          ...msg,
          readBy: Array.from(readBy),
          updatedAt: new Date().toISOString()
        };
        const allFiles = this.state.files;
        const attachments = (this.state.messages[index].attachmentFileIds || [])
          .map((fId) => allFiles.find((f) => f.id === fId))
          .filter((f): f is FileRecord => Boolean(f));
        return { ...this.state.messages[index], attachments };
      },

      listThreads: async (classId: string, workspaceId?: string): Promise<Conversation[]> => {
        const threads = this.state.conversations.filter(
          (c) => c.classId === classId && (!workspaceId || c.workspaceId === workspaceId)
        );
        threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return threads.map((t) => {
          const count = this.state.messages.filter((m) => m.conversationId === t.id).length;
          const lastMsg = this.state.messages
            .filter((m) => m.conversationId === t.id)
            .sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())[0];
          return { ...t, messageCount: count, lastMessage: lastMsg };
        });
      },

      getOrCreateClassThread: async (classId: string, workspaceId: string, participantIds?: string[], title?: string): Promise<Conversation> => {
        const existing = this.state.conversations.find(
          (c) => c.classId === classId && c.workspaceId === workspaceId && (!title || c.title === title)
        );
        if (existing) {
          const count = this.state.messages.filter((m) => m.conversationId === existing.id).length;
          return { ...existing, messageCount: count };
        }
        const now = new Date().toISOString();
        const thread: Conversation = {
          id: `thread-${classId}-${Date.now().toString(36)}`,
          workspaceId,
          userId: participantIds?.[0] || 'system',
          title: title || `Class Channel: ${classId}`,
          sector: 'education',
          classId,
          type: 'class_channel',
          participantIds: participantIds || [],
          createdAt: now,
          updatedAt: now,
          messageCount: 0
        };
        this.state.conversations.push(thread);
        return { ...thread };
      },

      // Session Management for AI & Conversational Flow
      getOrCreateSession: async (sessionId: string | undefined, workspaceId: string, userId: string): Promise<ConversationSession> => {
        const id = sessionId && sessionId.trim().length > 0
          ? sessionId.trim()
          : `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        let conv = (this.state.conversations || []).find((c) => c.id === id);
        const now = new Date().toISOString();
        if (!conv) {
          conv = {
            id,
            workspaceId: workspaceId || 'ws-stark-core',
            userId: userId || 'user-tony',
            title: 'New Conversation',
            sector: 'command',
            createdAt: now,
            updatedAt: now,
            messageCount: 0
          };
          if (!this.state.conversations) this.state.conversations = [];
          this.state.conversations.push(conv);
        } else if (userId && workspaceId && (conv.userId !== userId || conv.workspaceId !== workspaceId)) {
          throw new Error('CONVERSATION_FORBIDDEN');
        }

        const msgs = (this.state.messages || [])
          .filter((m) => m.conversationId === id)
          .map((m) => ({
            id: m.id,
            role: m.role as MessageRole,
            content: m.content,
            timestamp: m.timestamp,
            toolCall: m.toolCall,
            toolResult: m.toolResult
          }));

        return {
          id: conv.id,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messages: msgs
        };
      },

      addSessionMessage: async (sessionId: string, role: MessageRole, content: string, extra?: { toolCall?: any; toolResult?: any }): Promise<ConversationMessage> => {
        const now = new Date().toISOString();
        const message: ConversationMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role,
          content,
          timestamp: now,
          toolCall: extra?.toolCall,
          toolResult: extra?.toolResult
        };

        let conv = (this.state.conversations || []).find((c) => c.id === sessionId);
        if (!conv) {
          throw new Error('Conversation must be created with a verified owner before messages can be appended.');
        } else {
          conv.updatedAt = now;
          if (conv.title === 'New Conversation' && content.trim()) {
            conv.title = content.slice(0, 35);
          }
        }

        if (!this.state.messages) this.state.messages = [];
        this.state.messages.push({
          ...message,
          conversationId: sessionId
        });

        // Prune excessive messages per session to keep sliding window healthy (> 60)
        const sessionMsgs = this.state.messages.filter((m) => m.conversationId === sessionId);
        if (sessionMsgs.length > 60) {
          const excess = sessionMsgs.length - 60;
          let removed = 0;
          this.state.messages = this.state.messages.filter((m) => {
            if (m.conversationId === sessionId && removed < excess) {
              removed++;
              return false;
            }
            return true;
          });
        }

        return message;
      },

      getSessionMessages: async (sessionId: string, limit?: number): Promise<ConversationMessage[]> => {
        const msgs: ConversationMessage[] = (this.state.messages || [])
          .filter((m) => m.conversationId === sessionId)
          .map((m) => ({
            id: m.id,
            role: m.role as MessageRole,
            content: m.content,
            timestamp: m.timestamp,
            toolCall: m.toolCall,
            toolResult: m.toolResult
          }));

        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (limit && limit > 0) {
          return msgs.slice(-limit);
        }
        return msgs;
      },

      clearSession: async (sessionId: string): Promise<boolean> => {
        const prevConvs = (this.state.conversations || []).length;
        this.state.messages = (this.state.messages || []).filter((m) => m.conversationId !== sessionId);
        this.state.conversations = (this.state.conversations || []).filter((c) => c.id !== sessionId);
        return (this.state.conversations || []).length < prevConvs;
      },

      getActiveSessionCount: async (): Promise<number> => {
        return (this.state.conversations || []).length;
      }
    };

    // 4. Knowledge Sub-Repository
    this.knowledge = {
      getSpaceById: async (id: string, workspaceId?: string): Promise<KnowledgeSpaceRecord | null> => {
        const space = this.state.knowledgeSpaces.find((s) => s.id === id && (!workspaceId || s.workspaceId === workspaceId));
        return space ? { ...space } : null;
      },
      listSpaces: async (workspaceId?: string): Promise<KnowledgeSpaceRecord[]> => {
        return this.state.knowledgeSpaces.filter((s) => !workspaceId || s.workspaceId === workspaceId).map((s) => ({ ...s }));
      },
      createSpace: async (space: Omit<KnowledgeSpaceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSpaceRecord> => {
        const now = new Date().toISOString();
        const record: KnowledgeSpaceRecord = {
          ...space,
          createdAt: now,
          updatedAt: now
        };
        this.state.knowledgeSpaces.push(record);
        return { ...record };
      },
      updateSpace: async (id: string, updates: Partial<Omit<KnowledgeSpaceRecord, 'id' | 'workspaceId' | 'createdAt'>>, workspaceId?: string): Promise<KnowledgeSpaceRecord | null> => {
        const index = this.state.knowledgeSpaces.findIndex((s) => s.id === id && (!workspaceId || s.workspaceId === workspaceId));
        if (index === -1) return null;
        this.state.knowledgeSpaces[index] = {
          ...this.state.knowledgeSpaces[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.knowledgeSpaces[index] };
      },
      deleteSpace: async (id: string, workspaceId?: string): Promise<boolean> => {
        const prev = this.state.knowledgeSpaces.length;
        this.state.knowledgeSpaces = this.state.knowledgeSpaces.filter((s) => !(s.id === id && (!workspaceId || s.workspaceId === workspaceId)));
        const deletedSourceIds = new Set(this.state.knowledgeSources.filter((src) => src.knowledgeSpaceId === id).map((s) => s.id));
        this.state.knowledgeSources = this.state.knowledgeSources.filter((src) => src.knowledgeSpaceId !== id);
        this.state.knowledgeChunks = (this.state.knowledgeChunks || []).filter((c) => c.knowledgeSpaceId !== id && !deletedSourceIds.has(c.sourceId));
        return this.state.knowledgeSpaces.length < prev;
      },
      getSourceById: async (id: string): Promise<KnowledgeSourceRecord | null> => {
        const src = this.state.knowledgeSources.find((s) => s.id === id);
        return src ? { ...src } : null;
      },
      getSourceByHash: async (contentHash: string, spaceId?: string): Promise<KnowledgeSourceRecord | null> => {
        const src = this.state.knowledgeSources.find((s) => s.contentHash === contentHash && (!spaceId || s.knowledgeSpaceId === spaceId));
        return src ? { ...src } : null;
      },
      listSourcesForSpace: async (spaceId: string, workspaceId?: string): Promise<KnowledgeSourceRecord[]> => {
        return this.state.knowledgeSources.filter((s) => s.knowledgeSpaceId === spaceId && (!workspaceId || s.workspaceId === workspaceId)).map((s) => ({ ...s }));
      },
      createSource: async (source: Omit<KnowledgeSourceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSourceRecord> => {
        const now = new Date().toISOString();
        const record: KnowledgeSourceRecord = {
          ...source,
          createdAt: now,
          updatedAt: now
        };
        this.state.knowledgeSources.push(record);
        const space = this.state.knowledgeSpaces.find((s) => s.id === source.knowledgeSpaceId);
        if (space) space.updatedAt = now;
        return { ...record };
      },
      updateSource: async (id: string, updates: Partial<Omit<KnowledgeSourceRecord, 'id' | 'createdAt'>>): Promise<KnowledgeSourceRecord | null> => {
        const index = this.state.knowledgeSources.findIndex((s) => s.id === id);
        if (index === -1) return null;
        this.state.knowledgeSources[index] = {
          ...this.state.knowledgeSources[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.knowledgeSources[index] };
      },
      updateSourceStatus: async (id: string, status: KnowledgeSourceRecord['status'], errorMessage?: string): Promise<KnowledgeSourceRecord | null> => {
        const index = this.state.knowledgeSources.findIndex((s) => s.id === id);
        if (index === -1) return null;
        this.state.knowledgeSources[index] = {
          ...this.state.knowledgeSources[index],
          status,
          ingestionStatus: status,
          errorMessage,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.knowledgeSources[index] };
      },
      deleteSource: async (id: string): Promise<boolean> => {
        const prev = this.state.knowledgeSources.length;
        this.state.knowledgeSources = this.state.knowledgeSources.filter((s) => s.id !== id);
        this.state.knowledgeChunks = (this.state.knowledgeChunks || []).filter((c) => c.sourceId !== id);
        return this.state.knowledgeSources.length < prev;
      },
      upsertChunks: async (chunks: import('./types.ts').KnowledgeChunkRecord[]): Promise<void> => {
        if (!chunks || chunks.length === 0) return;
        if (!this.state.knowledgeChunks) {
          this.state.knowledgeChunks = [];
        }
        const chunkMap = new Map(this.state.knowledgeChunks.map((c) => [c.id, c]));
        for (const chunk of chunks) {
          chunkMap.set(chunk.id, chunk);
        }
        this.state.knowledgeChunks = Array.from(chunkMap.values());
      },
      getChunksForSource: async (sourceId: string): Promise<import('./types.ts').KnowledgeChunkRecord[]> => {
        const chunks = (this.state.knowledgeChunks || []).filter((c) => c.sourceId === sourceId);
        return chunks.map((c) => ({ ...c }));
      },
      getChunksForSpace: async (spaceId: string, workspaceId?: string): Promise<import('./types.ts').KnowledgeChunkRecord[]> => {
        const chunks = (this.state.knowledgeChunks || []).filter(
          (c) => (!spaceId || c.knowledgeSpaceId === spaceId) && (!workspaceId || c.workspaceId === workspaceId)
        );
        return chunks.map((c) => ({ ...c }));
      },
      deleteChunksBySourceId: async (sourceId: string): Promise<number> => {
        const prev = (this.state.knowledgeChunks || []).length;
        this.state.knowledgeChunks = (this.state.knowledgeChunks || []).filter((c) => c.sourceId !== sourceId);
        return prev - this.state.knowledgeChunks.length;
      },
      deleteChunksBySpaceId: async (spaceId: string): Promise<number> => {
        const prev = (this.state.knowledgeChunks || []).length;
        this.state.knowledgeChunks = (this.state.knowledgeChunks || []).filter((c) => c.knowledgeSpaceId !== spaceId);
        return prev - this.state.knowledgeChunks.length;
      },
      queryGrounded: async (spaceId: string, query: string, workspaceId?: string): Promise<GroundedQueryResponse> => {
        const space = this.state.knowledgeSpaces.find((s) => s.id === spaceId && (!workspaceId || s.workspaceId === workspaceId));
        const spaceTitle = space?.name || 'Knowledge Space';
        const sources = this.state.knowledgeSources.filter((s) => s.knowledgeSpaceId === spaceId);

        const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
        const matchingSources = sources.filter((s) => {
          const text = (s.name + ' ' + s.summary + ' ' + s.fullText).toLowerCase();
          return terms.some((term) => text.includes(term));
        });

        const activeSources = matchingSources.length > 0 ? matchingSources : sources;

        const citations = activeSources.slice(0, 3).map((src, idx) => ({
          sourceId: src.id,
          sourceTitle: src.name,
          excerpt: src.summary || src.fullText.slice(0, 160) + '...',
          location: `Doc #${idx + 1}`
        }));

        let answer = `According to the documents indexed in "${spaceTitle}", `;
        if (activeSources.length > 0) {
          const combined = activeSources.map((s) => s.summary).join(' ');
          answer += combined;
        } else {
          answer += `the foundational principles are established in the indexed archive. Zero anomalies detected in source alignment.`;
        }

        return {
          query,
          spaceId,
          spaceTitle,
          answer,
          citations,
          confidence: activeSources.length > 0 ? 0.94 : 0.82,
          timestamp: new Date().toISOString()
        };
      }
    };

    // 5. Education Sub-Repository
    this.education = {
      getClassById: async (id: string): Promise<EducationClass | null> => {
        const cls = this.state.classes.find((c) => c.id === id);
        return cls ? { ...cls } : null;
      },
      listClasses: async (): Promise<EducationClass[]> => {
        return this.state.classes.map((c) => ({ ...c }));
      },
      createClass: async (cls: EducationClass): Promise<EducationClass> => {
        this.state.classes.push(cls);
        return { ...cls };
      },
      updateClass: async (id: string, updates: Partial<EducationClass>): Promise<EducationClass | null> => {
        const index = this.state.classes.findIndex((c) => c.id === id);
        if (index === -1) return null;
        this.state.classes[index] = {
          ...this.state.classes[index],
          ...updates
        };
        return { ...this.state.classes[index] };
      },
      deleteClass: async (id: string): Promise<boolean> => {
        const prev = this.state.classes.length;
        this.state.classes = this.state.classes.filter((c) => c.id !== id);
        return this.state.classes.length < prev;
      },
      getAssignmentById: async (id: string): Promise<Assignment | null> => {
        const asg = this.state.assignments.find((a) => a.id === id);
        return asg ? { ...asg } : null;
      },
      listAssignments: async (classId?: string): Promise<Assignment[]> => {
        return this.state.assignments.filter((a) => !classId || a.classId === classId).map((a) => ({ ...a }));
      },
      createAssignment: async (asg: Omit<Assignment, 'id' | 'assignedDate' | 'totalEnrolled' | 'submittedCount' | 'gradedCount'>): Promise<Assignment> => {
        const cls = this.state.classes.find((c) => c.id === asg.classId);
        const record: Assignment = {
          ...asg,
          id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          className: cls?.name ? `${cls.code}: ${cls.name}` : asg.className,
          assignedDate: new Date().toISOString().split('T')[0],
          totalEnrolled: cls?.studentCount || 1,
          submittedCount: 0,
          gradedCount: 0
        };

        this.state.assignments.push(record);
        if (cls) cls.assignmentsCount = (cls.assignmentsCount || 0) + 1;
        return { ...record };
      },
      updateAssignment: async (id: string, updates: Partial<Assignment>): Promise<Assignment | null> => {
        const index = this.state.assignments.findIndex((a) => a.id === id);
        if (index === -1) return null;
        this.state.assignments[index] = {
          ...this.state.assignments[index],
          ...updates
        };
        return { ...this.state.assignments[index] };
      },
      getSubmissionById: async (id: string): Promise<StudentSubmission | null> => {
        const sub = this.state.submissions.find((s) => s.id === id);
        return sub ? { ...sub } : null;
      },
      listSubmissions: async (studentId?: string, assignmentId?: string): Promise<StudentSubmission[]> => {
        return this.state.submissions
          .filter((s) => (!studentId || s.studentId === studentId) && (!assignmentId || s.assignmentId === assignmentId))
          .map((s) => ({ ...s }));
      },
      createOrUpdateSubmission: async (sub: {
        assignmentId: string;
        studentId: string;
        studentName: string;
        content: string;
        attachments?: Array<{ name: string; size: string }>;
      }): Promise<StudentSubmission> => {
        const asg = this.state.assignments.find((a) => a.id === sub.assignmentId);
        const now = new Date().toISOString();

        const existingIdx = this.state.submissions.findIndex((s) => s.assignmentId === sub.assignmentId && s.studentId === sub.studentId);
        if (existingIdx >= 0) {
          this.state.submissions[existingIdx] = {
            ...this.state.submissions[existingIdx],
            content: sub.content,
            attachments: sub.attachments || this.state.submissions[existingIdx].attachments,
            submittedAt: now,
            status: this.state.submissions[existingIdx].status === 'graded' ? 'graded' : 'submitted'
          };
          return { ...this.state.submissions[existingIdx] };
        }

        const record: StudentSubmission = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          assignmentId: sub.assignmentId,
          assignmentTitle: asg?.title || 'Academic Assignment',
          classId: asg?.classId || 'class-general',
          className: asg?.className || 'General Course',
          studentId: sub.studentId,
          studentName: sub.studentName,
          status: 'submitted',
          submittedAt: now,
          content: sub.content,
          attachments: sub.attachments || []
        };

        this.state.submissions.push(record);
        if (asg) {
          asg.submittedCount = (asg.submittedCount || 0) + 1;
        }

        return { ...record };
      },
      gradeSubmission: async (submissionId: string, grade: number, feedback: string): Promise<StudentSubmission | null> => {
        const sub = this.state.submissions.find((s) => s.id === submissionId);
        if (!sub) return null;
        const wasGraded = sub.status === 'graded';
        sub.grade = grade;
        sub.feedback = feedback;
        sub.status = 'graded';
        sub.gradedAt = new Date().toISOString();

        if (!wasGraded) {
          const asg = this.state.assignments.find((a) => a.id === sub.assignmentId);
          if (asg) asg.gradedCount = (asg.gradedCount || 0) + 1;
        }

        return { ...sub };
      },

      toggleLessonCompletion: async (classId: string, unitId: string, lessonId: string, isCompleted: boolean): Promise<boolean> => {
        const c = this.state.classes.find((item) => item.id === classId);
        if (c) {
          if (!c.units || c.units.length === 0) {
            c.units = JSON.parse(JSON.stringify(DEFAULT_COURSE_UNITS[classId] || []));
          }
          const units = c.units || [];
          const u = units.find((unit) => unit.id === unitId);
          if (u) {
            const l = u.lessons.find((les) => les.id === lessonId);
            if (l) {
              l.isCompleted = isCompleted;
              const completedCount = u.lessons.filter((les) => les.isCompleted).length;
              u.masteryPercent = Math.round((completedCount / u.lessons.length) * 100);
              u.isCompleted = completedCount === u.lessons.length;
              return true;
            }
          }
        }
        return false;
      },

      addUnitToCourse: async (classId: string, unit: Omit<CourseUnit, 'id'>): Promise<CourseUnit> => {
        const newUnitId = `unit-${classId}-${Date.now().toString(36)}`;
        const newUnit: CourseUnit = {
          ...unit,
          id: newUnitId,
          courseId: classId,
          lessons: unit.lessons || []
        };
        const c = this.state.classes.find((item) => item.id === classId);
        if (c) {
          if (!c.units || c.units.length === 0) {
            c.units = JSON.parse(JSON.stringify(DEFAULT_COURSE_UNITS[classId] || []));
          }
          const units = c.units || [];
          units.push(newUnit);
          c.units = units;
        }
        return newUnit;
      },

      addLessonToUnit: async (classId: string, unitId: string, lesson: Omit<CourseLesson, 'id' | 'unitId' | 'courseId'>): Promise<CourseLesson> => {
        const newLessonId = `les-${unitId}-${Date.now().toString(36)}`;
        const newLesson: CourseLesson = {
          ...lesson,
          id: newLessonId,
          unitId,
          courseId: classId
        };
        const c = this.state.classes.find((item) => item.id === classId);
        if (c) {
          if (!c.units || c.units.length === 0) {
            c.units = JSON.parse(JSON.stringify(DEFAULT_COURSE_UNITS[classId] || []));
          }
          const units = c.units || [];
          const u = units.find((unit) => unit.id === unitId);
          if (u) {
            u.lessons.push(newLesson);
          }
        }
        return newLesson;
      },

      createLearningLink: async (link: LearningLink): Promise<LearningLink> => {
        if (!this.state.learningLinks) this.state.learningLinks = [];
        this.state.learningLinks.push({ ...link });
        return { ...link };
      },

      deleteLearningLink: async (id: string): Promise<boolean> => {
        if (!Array.isArray(this.state.learningLinks)) return false;
        const prev = this.state.learningLinks.length;
        this.state.learningLinks = this.state.learningLinks.filter((l) => l.id !== id);
        return this.state.learningLinks.length < prev;
      },

      listLearningLinks: async (filter?: { entityId?: string; entityType?: string }): Promise<LearningLink[]> => {
        const links = this.state.learningLinks || [];
        if (!filter) return links.map((l) => ({ ...l }));
        return links
          .filter((l) => {
            if (filter.entityId && filter.entityType) {
              return (l.sourceType === filter.entityType && l.sourceId === filter.entityId) ||
                     (l.targetType === filter.entityType && l.targetId === filter.entityId);
            }
            return true;
          })
          .map((l) => ({ ...l }));
      }
    };

    // 6. Audit Sub-Repository
    this.audit = {
      logToolExecution: async (event: Omit<ToolAuditEvent, 'id' | 'timestamp'>): Promise<ToolAuditEvent> => {
        const record: ToolAuditEvent = {
          ...event,
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString()
        };
        this.state.auditEvents.push(record);
        if (this.state.auditEvents.length > 500) {
          this.state.auditEvents = this.state.auditEvents.slice(-500);
        }
        return { ...record };
      },
      listRecentEvents: async (limit: number = 50, workspaceId?: string): Promise<ToolAuditEvent[]> => {
        const events = this.state.auditEvents.filter((e) => !workspaceId || e.workspaceId === workspaceId);
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return events.slice(0, limit).map((e) => ({ ...e }));
      }
    };

    // 7. Research Sub-Repository (Milestone 9)
    this.research = {
      // Projects
      getProjectById: async (id: string, workspaceId?: string): Promise<ResearchProject | null> => {
        const p = (this.state.researchProjects || []).find(
          (proj) => proj.id === id && (!workspaceId || proj.workspaceId === workspaceId)
        );
        return p ? { ...p } : null;
      },
      listProjects: async (workspaceId?: string, status?: ResearchProjectStatus): Promise<ResearchProject[]> => {
        return (this.state.researchProjects || [])
          .filter((p) => (!workspaceId || p.workspaceId === workspaceId) && (!status || p.status === status))
          .map((p) => ({ ...p }));
      },
      createProject: async (project: Omit<ResearchProject, 'createdAt' | 'updatedAt'>): Promise<ResearchProject> => {
        const now = new Date().toISOString();
        const record: ResearchProject = {
          ...project,
          id: project.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          knowledgeSpaceIds: project.knowledgeSpaceIds || [],
          createdAt: now,
          updatedAt: now
        };
        if (!this.state.researchProjects) this.state.researchProjects = [];
        this.state.researchProjects.push(record);
        return { ...record };
      },
      updateProject: async (
        id: string,
        updates: Partial<Omit<ResearchProject, 'id' | 'workspaceId' | 'createdAt'>>,
        workspaceId?: string
      ): Promise<ResearchProject | null> => {
        if (!this.state.researchProjects) return null;
        const idx = this.state.researchProjects.findIndex(
          (p) => p.id === id && (!workspaceId || p.workspaceId === workspaceId)
        );
        if (idx === -1) return null;
        this.state.researchProjects[idx] = {
          ...this.state.researchProjects[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.researchProjects[idx] };
      },
      deleteProject: async (id: string, workspaceId?: string): Promise<boolean> => {
        if (!this.state.researchProjects) return false;
        const prevLen = this.state.researchProjects.length;
        this.state.researchProjects = this.state.researchProjects.filter(
          (p) => !(p.id === id && (!workspaceId || p.workspaceId === workspaceId))
        );
        const deleted = this.state.researchProjects.length < prevLen;
        if (deleted) {
          if (this.state.researchQuestions) this.state.researchQuestions = this.state.researchQuestions.filter((q) => q.projectId !== id);
          if (this.state.evidenceRecords) this.state.evidenceRecords = this.state.evidenceRecords.filter((e) => e.projectId !== id);
          if (this.state.researchNotes) this.state.researchNotes = this.state.researchNotes.filter((n) => n.projectId !== id);
          if (this.state.researchReports) this.state.researchReports = this.state.researchReports.filter((r) => r.projectId !== id);
        }
        return deleted;
      },

      // Questions
      getQuestionById: async (id: string, projectId?: string): Promise<ResearchQuestion | null> => {
        const q = (this.state.researchQuestions || []).find(
          (item) => item.id === id && (!projectId || item.projectId === projectId)
        );
        return q ? { ...q } : null;
      },
      listQuestions: async (projectId: string, workspaceId?: string): Promise<ResearchQuestion[]> => {
        return (this.state.researchQuestions || [])
          .filter((q) => q.projectId === projectId && (!workspaceId || q.workspaceId === workspaceId))
          .map((q) => ({ ...q }));
      },
      createQuestion: async (question: Omit<ResearchQuestion, 'createdAt' | 'updatedAt'>): Promise<ResearchQuestion> => {
        const now = new Date().toISOString();
        const record: ResearchQuestion = {
          ...question,
          id: question.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          linkedEvidenceIds: question.linkedEvidenceIds || [],
          createdAt: now,
          updatedAt: now
        };
        if (!this.state.researchQuestions) this.state.researchQuestions = [];
        this.state.researchQuestions.push(record);
        return { ...record };
      },
      updateQuestion: async (
        id: string,
        updates: Partial<Omit<ResearchQuestion, 'id' | 'projectId' | 'workspaceId' | 'createdAt'>>
      ): Promise<ResearchQuestion | null> => {
        if (!this.state.researchQuestions) return null;
        const idx = this.state.researchQuestions.findIndex((q) => q.id === id);
        if (idx === -1) return null;
        this.state.researchQuestions[idx] = {
          ...this.state.researchQuestions[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.researchQuestions[idx] };
      },
      deleteQuestion: async (id: string): Promise<boolean> => {
        if (!this.state.researchQuestions) return false;
        const prevLen = this.state.researchQuestions.length;
        this.state.researchQuestions = this.state.researchQuestions.filter((q) => q.id !== id);
        return this.state.researchQuestions.length < prevLen;
      },

      // Evidence
      getEvidenceById: async (id: string): Promise<EvidenceRecord | null> => {
        const e = (this.state.evidenceRecords || []).find((item) => item.id === id);
        return e ? { ...e } : null;
      },
      listEvidence: async (projectId: string, questionId?: string): Promise<EvidenceRecord[]> => {
        return (this.state.evidenceRecords || [])
          .filter((e) => e.projectId === projectId && (!questionId || e.questionId === questionId))
          .map((e) => ({ ...e }));
      },
      createEvidence: async (evidence: Omit<EvidenceRecord, 'id' | 'createdAt'>): Promise<EvidenceRecord> => {
        const now = new Date().toISOString();
        const record: EvidenceRecord = {
          ...evidence,
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: now
        };
        if (!this.state.evidenceRecords) this.state.evidenceRecords = [];
        this.state.evidenceRecords.push(record);
        if (record.questionId && this.state.researchQuestions) {
          const q = this.state.researchQuestions.find((item) => item.id === record.questionId);
          if (q && !q.linkedEvidenceIds.includes(record.id)) {
            q.linkedEvidenceIds.push(record.id);
          }
        }
        return { ...record };
      },
      deleteEvidence: async (id: string): Promise<boolean> => {
        if (!this.state.evidenceRecords) return false;
        const prevLen = this.state.evidenceRecords.length;
        this.state.evidenceRecords = this.state.evidenceRecords.filter((e) => e.id !== id);
        const deleted = this.state.evidenceRecords.length < prevLen;
        if (deleted && this.state.researchQuestions) {
          for (const q of this.state.researchQuestions) {
            q.linkedEvidenceIds = q.linkedEvidenceIds.filter((evId) => evId !== id);
          }
        }
        return deleted;
      },

      // Notes
      getNoteById: async (id: string): Promise<ResearchNote | null> => {
        const n = (this.state.researchNotes || []).find((item) => item.id === id);
        return n ? { ...n } : null;
      },
      listNotes: async (projectId: string): Promise<ResearchNote[]> => {
        return (this.state.researchNotes || [])
          .filter((n) => n.projectId === projectId)
          .map((n) => ({ ...n }));
      },
      createNote: async (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ResearchNote> => {
        const now = new Date().toISOString();
        const record: ResearchNote = {
          ...note,
          id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          linkedQuestionIds: note.linkedQuestionIds || [],
          linkedEvidenceIds: note.linkedEvidenceIds || [],
          tags: note.tags || [],
          createdAt: now,
          updatedAt: now
        };
        if (!this.state.researchNotes) this.state.researchNotes = [];
        this.state.researchNotes.push(record);
        return { ...record };
      },
      updateNote: async (
        id: string,
        updates: Partial<Omit<ResearchNote, 'id' | 'projectId' | 'workspaceId' | 'createdAt'>>
      ): Promise<ResearchNote | null> => {
        if (!this.state.researchNotes) return null;
        const idx = this.state.researchNotes.findIndex((n) => n.id === id);
        if (idx === -1) return null;
        this.state.researchNotes[idx] = {
          ...this.state.researchNotes[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.researchNotes[idx] };
      },
      deleteNote: async (id: string): Promise<boolean> => {
        if (!this.state.researchNotes) return false;
        const prevLen = this.state.researchNotes.length;
        this.state.researchNotes = this.state.researchNotes.filter((n) => n.id !== id);
        return this.state.researchNotes.length < prevLen;
      },

      // Reports
      getReportById: async (id: string): Promise<ResearchReport | null> => {
        const r = (this.state.researchReports || []).find((item) => item.id === id);
        return r ? { ...r } : null;
      },
      listReports: async (projectId: string): Promise<ResearchReport[]> => {
        return (this.state.researchReports || [])
          .filter((r) => r.projectId === projectId)
          .map((r) => ({ ...r }));
      },
      createReport: async (report: Omit<ResearchReport, 'id' | 'generatedAt'>): Promise<ResearchReport> => {
        const now = new Date().toISOString();
        const record: ResearchReport = {
          ...report,
          id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          findings: report.findings || [],
          evidenceReferences: report.evidenceReferences || [],
          sourceCitations: report.sourceCitations || [],
          limitations: report.limitations || [],
          generatedAt: now
        };
        if (!this.state.researchReports) this.state.researchReports = [];
        this.state.researchReports.push(record);
        return { ...record };
      },
      deleteReport: async (id: string): Promise<boolean> => {
        if (!this.state.researchReports) return false;
        const prevLen = this.state.researchReports.length;
        this.state.researchReports = this.state.researchReports.filter((r) => r.id !== id);
        return this.state.researchReports.length < prevLen;
      }
    };

    // 8. Files Sub-Repository (Milestone 10)
    this.files = {
      getById: async (id: string, workspaceId?: string): Promise<FileRecord | null> => {
        const f = (this.state.files || []).find((file) => file.id === id && (!workspaceId || file.workspaceId === workspaceId));
        return f ? { ...f } : null;
      },
      getByStorageKey: async (storageKey: string): Promise<FileRecord | null> => {
        const f = (this.state.files || []).find((file) => file.storageKey === storageKey);
        return f ? { ...f } : null;
      },
      list: async (filter?: FileListFilter): Promise<FileRecord[]> => {
        let all = (this.state.files || []).map((f) => ({ ...f }));
        if (filter?.workspaceId) {
          all = all.filter((f) => f.workspaceId === filter.workspaceId);
        }
        if (filter?.ownerUserId) {
          all = all.filter((f) => f.ownerUserId === filter.ownerUserId);
        }
        if (filter?.classId) {
          all = all.filter((f) => f.classId === filter.classId);
        }
        if (filter?.assignmentId) {
          all = all.filter((f) => f.assignmentId === filter.assignmentId);
        }
        if (filter?.submissionId) {
          all = all.filter((f) => f.submissionId === filter.submissionId);
        }
        if (filter?.knowledgeSpaceId) {
          all = all.filter((f) => f.knowledgeSpaceId === filter.knowledgeSpaceId);
        }
        if (filter?.researchProjectId) {
          all = all.filter((f) => f.researchProjectId === filter.researchProjectId);
        }
        if (filter?.conversationId) {
          all = all.filter((f) => f.conversationId === filter.conversationId);
        }
        if (filter?.status) {
          all = all.filter((f) => f.status === filter.status);
        }
        if (filter?.extension) {
          const extLower = filter.extension.toLowerCase().replace(/^\./, '');
          all = all.filter((f) => f.extension.toLowerCase() === extLower);
        }
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return all;
      },
      create: async (file: Omit<FileRecord, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount'> & { id?: string }): Promise<FileRecord> => {
        const now = new Date().toISOString();
        const record: FileRecord = {
          ...file,
          id: file.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          downloadCount: 0,
          createdAt: now,
          updatedAt: now
        };
        if (!this.state.files) this.state.files = [];
        this.state.files.push(record);
        return { ...record };
      },
      update: async (
        id: string,
        updates: Partial<Omit<FileRecord, 'id' | 'workspaceId' | 'createdAt'>>,
        workspaceId?: string
      ): Promise<FileRecord | null> => {
        if (!this.state.files) return null;
        const idx = this.state.files.findIndex((f) => f.id === id && (!workspaceId || f.workspaceId === workspaceId));
        if (idx === -1) return null;
        this.state.files[idx] = {
          ...this.state.files[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.files[idx] };
      },
      delete: async (id: string, workspaceId?: string): Promise<boolean> => {
        if (!this.state.files) return false;
        const prevLen = this.state.files.length;
        this.state.files = this.state.files.filter((f) => !(f.id === id && (!workspaceId || f.workspaceId === workspaceId)));
        return this.state.files.length < prevLen;
      },
      findBySha256: async (sha256: string, workspaceId: string): Promise<FileRecord | null> => {
        const f = (this.state.files || []).find((file) => file.sha256 === sha256 && file.workspaceId === workspaceId && file.status !== 'deleted');
        return f ? { ...f } : null;
      },
      incrementDownloadCount: async (id: string): Promise<void> => {
        if (!this.state.files) return;
        const file = this.state.files.find((f) => f.id === id);
        if (file) {
          file.downloadCount = (file.downloadCount || 0) + 1;
          file.updatedAt = new Date().toISOString();
        }
      }
    };

    this.classroom = {
      getSessionById: async (id: string, workspaceId?: string): Promise<ClassroomSession | null> => {
        if (!this.state.classroomSessions) this.state.classroomSessions = [];
        const session = this.state.classroomSessions.find(
          (s) => (s.id === id || s.sessionId === id) && (!workspaceId || s.workspaceId === workspaceId)
        );
        return session ? { ...session } : null;
      },

      getActiveSessionForClass: async (classId: string, workspaceId?: string): Promise<ClassroomSession | null> => {
        if (!this.state.classroomSessions) this.state.classroomSessions = [];
        const activeSessions = this.state.classroomSessions.filter(
          (s) => s.classId === classId && (s.status === 'live' || s.status === 'paused') && (!workspaceId || s.workspaceId === workspaceId)
        );
        if (activeSessions.length === 0) return null;
        const live = activeSessions.slice().reverse().find((s) => s.status === 'live');
        const session = live || activeSessions[activeSessions.length - 1];
        return session ? { ...session } : null;
      },

      listSessions: async (classId?: string, workspaceId?: string, status?: ClassroomSessionStatus): Promise<ClassroomSession[]> => {
        if (!this.state.classroomSessions) this.state.classroomSessions = [];
        return this.state.classroomSessions
          .filter((s) => {
            if (classId && s.classId !== classId) return false;
            if (workspaceId && s.workspaceId !== workspaceId) return false;
            if (status && s.status !== status) return false;
            return true;
          })
          .map((s) => ({ ...s }));
      },

      createSession: async (input: CreateClassroomSessionInput): Promise<ClassroomSession> => {
        if (!this.state.classroomSessions) this.state.classroomSessions = [];
        const id = input.id || `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const session: ClassroomSession = {
          id,
          sessionId: id,
          workspaceId: input.workspaceId,
          classId: input.classId,
          teacherId: input.teacherId,
          title: input.title || `Classroom Session ${new Date().toLocaleDateString()}`,
          status: input.status || 'scheduled',
          boardState: {
            state: input.boardState?.state || 'waiting',
            currentTopic: input.boardState?.currentTopic || 'Session Initialized',
            activeSlideIndex: input.boardState?.activeSlideIndex || 0,
            message: input.boardState?.message || 'Smart board ready.',
            updatedAt: now
          },
          startedAt: input.status === 'live' ? now : undefined,
          activeStudentCount: 0,
          createdAt: now,
          updatedAt: now
        };
        this.state.classroomSessions.push(session);
        return { ...session };
      },

      updateSession: async (id: string, updates: Partial<ClassroomSession>, workspaceId?: string): Promise<ClassroomSession | null> => {
        if (!this.state.classroomSessions) this.state.classroomSessions = [];
        const idx = this.state.classroomSessions.findIndex(
          (s) => (s.id === id || s.sessionId === id) && (!workspaceId || s.workspaceId === workspaceId)
        );
        if (idx === -1) return null;
        const now = new Date().toISOString();
        this.state.classroomSessions[idx] = {
          ...this.state.classroomSessions[idx],
          ...updates,
          updatedAt: now
        };
        return { ...this.state.classroomSessions[idx] };
      },

      deleteSession: async (id: string, workspaceId?: string): Promise<boolean> => {
        if (!this.state.classroomSessions) return false;
        const prevLen = this.state.classroomSessions.length;
        this.state.classroomSessions = this.state.classroomSessions.filter(
          (s) => !((s.id === id || s.sessionId === id) && (!workspaceId || s.workspaceId === workspaceId))
        );
        return this.state.classroomSessions.length < prevLen;
      },

      upsertParticipant: async (participant: ClassroomParticipant): Promise<ClassroomParticipant> => {
        if (!this.state.classroomParticipants) this.state.classroomParticipants = [];
        const compositeId = participant.id || `${participant.sessionId}:${participant.studentId}`;
        const pRecord = { ...participant, id: compositeId };
        const idx = this.state.classroomParticipants.findIndex(
          (p) => p.sessionId === participant.sessionId && p.studentId === participant.studentId
        );
        if (idx !== -1) {
          this.state.classroomParticipants[idx] = {
            ...this.state.classroomParticipants[idx],
            ...pRecord,
            joinedAt: this.state.classroomParticipants[idx].joinedAt || pRecord.joinedAt
          };
          return { ...this.state.classroomParticipants[idx] };
        } else {
          this.state.classroomParticipants.push(pRecord);
          return { ...pRecord };
        }
      },

      getParticipant: async (sessionId: string, studentId: string): Promise<ClassroomParticipant | null> => {
        if (!this.state.classroomParticipants) return null;
        const p = this.state.classroomParticipants.find(
          (item) => item.sessionId === sessionId && item.studentId === studentId
        );
        return p ? { ...p } : null;
      },

      listParticipants: async (sessionId: string, onlyConnected?: boolean): Promise<ClassroomParticipant[]> => {
        if (!this.state.classroomParticipants) return [];
        return this.state.classroomParticipants
          .filter((p) => p.sessionId === sessionId && (!onlyConnected || p.connectionStatus === 'connected'))
          .map((p) => ({ ...p }));
      },

      updateParticipantStatus: async (
        sessionId: string,
        studentId: string,
        status: ParticipantConnectionStatus
      ): Promise<ClassroomParticipant | null> => {
        if (!this.state.classroomParticipants) return null;
        const idx = this.state.classroomParticipants.findIndex(
          (p) => p.sessionId === sessionId && p.studentId === studentId
        );
        if (idx === -1) return null;
        this.state.classroomParticipants[idx] = {
          ...this.state.classroomParticipants[idx],
          connectionStatus: status,
          lastSeenAt: new Date().toISOString()
        };
        return { ...this.state.classroomParticipants[idx] };
      },

      removeParticipant: async (sessionId: string, studentId: string): Promise<boolean> => {
        if (!this.state.classroomParticipants) return false;
        const prev = this.state.classroomParticipants.length;
        this.state.classroomParticipants = this.state.classroomParticipants.filter(
          (p) => !(p.sessionId === sessionId && p.studentId === studentId)
        );
        return this.state.classroomParticipants.length < prev;
      }
    };

    // 10. Quizzes Sub-Repository (Milestone 13)
    this.quizzes = {
      getQuizById: async (id: string, workspaceId?: string): Promise<Quiz | null> => {
        if (!this.state.quizzes) return null;
        const q = this.state.quizzes.find(
          (item) => (item.id === id || item.quizId === id) && (!workspaceId || item.workspaceId === workspaceId)
        );
        return q ? { ...q } : null;
      },

      listQuizzes: async (filter?: {
        classId?: string;
        sessionId?: string;
        workspaceId?: string;
        status?: QuizStatus;
      }): Promise<Quiz[]> => {
        if (!this.state.quizzes) return [];
        return this.state.quizzes
          .filter((q) => {
            if (filter?.classId && q.classId !== filter.classId) return false;
            if (filter?.sessionId && q.classroomSessionId !== filter.sessionId) return false;
            if (filter?.workspaceId && q.workspaceId !== filter.workspaceId) return false;
            if (filter?.status && q.status !== filter.status) return false;
            return true;
          })
          .map((q) => ({ ...q }));
      },

      createQuiz: async (input: {
        id?: string;
        workspaceId: string;
        classId: string;
        classroomSessionId: string;
        teacherId: string;
        title: string;
        description?: string;
        status?: QuizStatus;
      }): Promise<Quiz> => {
        if (!this.state.quizzes) this.state.quizzes = [];
        const id = input.id || `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const quiz: Quiz = {
          id,
          quizId: id,
          workspaceId: input.workspaceId,
          classId: input.classId,
          classroomSessionId: input.classroomSessionId,
          teacherId: input.teacherId,
          title: input.title,
          description: input.description,
          status: input.status || 'draft',
          currentQuestionIndex: -1,
          totalQuestions: 0,
          createdAt: now
        };
        this.state.quizzes.push(quiz);
        return { ...quiz };
      },

      updateQuiz: async (id: string, updates: Partial<Quiz>, workspaceId?: string): Promise<Quiz | null> => {
        if (!this.state.quizzes) return null;
        const idx = this.state.quizzes.findIndex(
          (q) => (q.id === id || q.quizId === id) && (!workspaceId || q.workspaceId === workspaceId)
        );
        if (idx === -1) return null;
        this.state.quizzes[idx] = {
          ...this.state.quizzes[idx],
          ...updates,
          id: this.state.quizzes[idx].id,
          quizId: this.state.quizzes[idx].quizId
        };
        return { ...this.state.quizzes[idx] };
      },

      deleteQuiz: async (id: string, workspaceId?: string): Promise<boolean> => {
        if (!this.state.quizzes) return false;
        const prev = this.state.quizzes.length;
        this.state.quizzes = this.state.quizzes.filter(
          (q) => !((q.id === id || q.quizId === id) && (!workspaceId || q.workspaceId === workspaceId))
        );
        const deleted = this.state.quizzes.length < prev;
        if (deleted) {
          if (this.state.quizQuestions) {
            this.state.quizQuestions = this.state.quizQuestions.filter((q) => q.quizId !== id);
          }
          if (this.state.quizResponses) {
            this.state.quizResponses = this.state.quizResponses.filter((r) => r.quizId !== id);
          }
          if (this.state.quizParticipantStates) {
            this.state.quizParticipantStates = this.state.quizParticipantStates.filter((p) => p.quizId !== id);
          }
        }
        return deleted;
      },

      getQuestionById: async (questionId: string, quizId?: string): Promise<QuizQuestion | null> => {
        if (!this.state.quizQuestions) return null;
        const q = this.state.quizQuestions.find(
          (item) => (item.id === questionId || item.questionId === questionId) && (!quizId || item.quizId === quizId)
        );
        return q ? { ...q } : null;
      },

      listQuestions: async (quizId: string): Promise<QuizQuestion[]> => {
        if (!this.state.quizQuestions) return [];
        return this.state.quizQuestions
          .filter((q) => q.quizId === quizId)
          .sort((a, b) => a.order - b.order)
          .map((q) => ({ ...q }));
      },

      addQuestion: async (input: {
        id?: string;
        quizId: string;
        order?: number;
        questionText: string;
        options: string[];
        correctOption: string;
        points?: number;
        timeLimitSeconds?: number;
      }): Promise<QuizQuestion> => {
        if (!this.state.quizQuestions) this.state.quizQuestions = [];
        const id = input.id || `qq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const existing = this.state.quizQuestions.filter((q) => q.quizId === input.quizId);
        const order = input.order !== undefined ? input.order : existing.length;

        const question: QuizQuestion = {
          id,
          questionId: id,
          quizId: input.quizId,
          order,
          questionText: input.questionText,
          options: input.options,
          correctOption: input.correctOption,
          points: input.points !== undefined ? input.points : 10,
          timeLimitSeconds: input.timeLimitSeconds !== undefined ? input.timeLimitSeconds : 30,
          status: 'pending'
        };
        this.state.quizQuestions.push(question);

        if (this.state.quizzes) {
          const quizIdx = this.state.quizzes.findIndex((q) => q.id === input.quizId || q.quizId === input.quizId);
          if (quizIdx !== -1) {
            this.state.quizzes[quizIdx].totalQuestions = this.state.quizQuestions.filter((q) => q.quizId === input.quizId).length;
          }
        }
        return { ...question };
      },

      updateQuestion: async (questionId: string, updates: Partial<QuizQuestion>, quizId?: string): Promise<QuizQuestion | null> => {
        if (!this.state.quizQuestions) return null;
        const idx = this.state.quizQuestions.findIndex(
          (q) => (q.id === questionId || q.questionId === questionId) && (!quizId || q.quizId === quizId)
        );
        if (idx === -1) return null;
        this.state.quizQuestions[idx] = {
          ...this.state.quizQuestions[idx],
          ...updates,
          id: this.state.quizQuestions[idx].id,
          questionId: this.state.quizQuestions[idx].questionId,
          quizId: this.state.quizQuestions[idx].quizId
        };
        return { ...this.state.quizQuestions[idx] };
      },

      removeQuestion: async (questionId: string, quizId?: string): Promise<boolean> => {
        if (!this.state.quizQuestions) return false;
        const prev = this.state.quizQuestions.length;
        const target = this.state.quizQuestions.find(
          (q) => (q.id === questionId || q.questionId === questionId) && (!quizId || q.quizId === quizId)
        );
        if (!target) return false;
        const qQuizId = target.quizId;

        this.state.quizQuestions = this.state.quizQuestions.filter((q) => !(q.id === target.id));
        const removed = this.state.quizQuestions.length < prev;

        if (removed && qQuizId) {
          const remaining = this.state.quizQuestions.filter((q) => q.quizId === qQuizId).sort((a, b) => a.order - b.order);
          remaining.forEach((q, idx) => {
            q.order = idx;
          });
          const quizIdx = (this.state.quizzes || []).findIndex((q) => q.id === qQuizId || q.quizId === qQuizId);
          if (quizIdx !== -1 && this.state.quizzes) {
            this.state.quizzes[quizIdx].totalQuestions = remaining.length;
          }
        }
        return removed;
      },

      saveResponse: async (response: QuizResponse): Promise<QuizResponse> => {
        if (!this.state.quizResponses) this.state.quizResponses = [];
        const id = response.id || response.responseId || `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const record: QuizResponse = {
          ...response,
          id,
          responseId: id
        };

        const idx = this.state.quizResponses.findIndex(
          (r) => r.quizId === response.quizId && r.questionId === response.questionId && r.studentId === response.studentId
        );
        if (idx !== -1) {
          this.state.quizResponses[idx] = { ...record };
        } else {
          this.state.quizResponses.push({ ...record });
        }
        return { ...record };
      },

      getResponse: async (quizId: string, questionId: string, studentId: string): Promise<QuizResponse | null> => {
        if (!this.state.quizResponses) return null;
        const r = this.state.quizResponses.find(
          (item) => item.quizId === quizId && item.questionId === questionId && item.studentId === studentId
        );
        return r ? { ...r } : null;
      },

      listResponses: async (quizId: string, questionId?: string): Promise<QuizResponse[]> => {
        if (!this.state.quizResponses) return [];
        return this.state.quizResponses
          .filter((r) => r.quizId === quizId && (!questionId || r.questionId === questionId))
          .map((r) => ({ ...r }));
      },

      upsertParticipantState: async (pState: QuizParticipantState): Promise<QuizParticipantState> => {
        if (!this.state.quizParticipantStates) this.state.quizParticipantStates = [];
        const id = pState.id || `${pState.quizId}:${pState.studentId}`;
        const record: QuizParticipantState = { ...pState, id };

        const idx = this.state.quizParticipantStates.findIndex(
          (p) => p.quizId === pState.quizId && p.studentId === pState.studentId
        );
        if (idx !== -1) {
          this.state.quizParticipantStates[idx] = { ...this.state.quizParticipantStates[idx], ...record };
        } else {
          this.state.quizParticipantStates.push({ ...record });
        }
        return { ...record };
      },

      getParticipantState: async (quizId: string, studentId: string): Promise<QuizParticipantState | null> => {
        if (!this.state.quizParticipantStates) return null;
        const p = this.state.quizParticipantStates.find(
          (item) => item.quizId === quizId && item.studentId === studentId
        );
        return p ? { ...p } : null;
      },

      listParticipantStates: async (quizId: string): Promise<QuizParticipantState[]> => {
        if (!this.state.quizParticipantStates) return [];
        return this.state.quizParticipantStates
          .filter((p) => p.quizId === quizId)
          .map((p) => ({ ...p }));
      }
    };

    // 11. Videos Sub-Repository (Milestone 14)
    this.videos = {
      getVideoById: async (id: string, workspaceId?: string): Promise<VideoRecord | null> => {
        if (!this.state.videos) return null;
        const v = this.state.videos.find(
          (item) => (item.id === id || item.videoId === id) && (!workspaceId || item.workspaceId === workspaceId)
        );
        return v ? { ...v } : null;
      },

      listVideos: async (filter?: VideoListFilter): Promise<VideoRecord[]> => {
        if (!this.state.videos) return [];
        return this.state.videos
          .filter((v) => {
            if (filter?.classId && v.classId !== filter.classId) return false;
            if (filter?.workspaceId && v.workspaceId !== filter.workspaceId) return false;
            if (filter?.uploaderId && v.uploaderId !== filter.uploaderId) return false;
            if (filter?.status && v.status !== filter.status) return false;
            if (filter?.knowledgeSpaceId && v.knowledgeSpaceId !== filter.knowledgeSpaceId) return false;
            if (filter?.search) {
              const term = filter.search.toLowerCase();
              const matchTitle = v.title.toLowerCase().includes(term);
              const matchDesc = v.description.toLowerCase().includes(term);
              const matchTags = (v.tags || []).some((t) => t.toLowerCase().includes(term));
              if (!matchTitle && !matchDesc && !matchTags) return false;
            }
            return true;
          })
          .map((v) => ({ ...v }));
      },

      createVideo: async (input: CreateVideoInput): Promise<VideoRecord> => {
        if (!this.state.videos) this.state.videos = [];
        const id = input.id || `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const video: VideoRecord = {
          id,
          videoId: id,
          workspaceId: input.workspaceId,
          classId: input.classId,
          uploaderId: input.uploaderId,
          fileId: input.fileId,
          title: input.title,
          description: input.description || '',
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          durationSeconds: input.durationSeconds,
          thumbnailUrl: input.thumbnailUrl,
          status: input.status || 'ready',
          visibility: input.visibility || 'class',
          transcript: input.transcript,
          captionTracks: input.captionTracks,
          knowledgeSpaceId: input.knowledgeSpaceId,
          tags: input.tags || [],
          createdAt: now,
          updatedAt: now
        };
        this.state.videos.push(video);
        return { ...video };
      },

      updateVideo: async (id: string, updates: UpdateVideoInput, workspaceId?: string): Promise<VideoRecord | null> => {
        if (!this.state.videos) return null;
        const idx = this.state.videos.findIndex(
          (v) => (v.id === id || v.videoId === id) && (!workspaceId || v.workspaceId === workspaceId)
        );
        if (idx === -1) return null;
        this.state.videos[idx] = {
          ...this.state.videos[idx],
          ...updates,
          id: this.state.videos[idx].id,
          videoId: this.state.videos[idx].videoId,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.videos[idx] };
      },

      deleteVideo: async (id: string, workspaceId?: string): Promise<boolean> => {
        if (!this.state.videos) return false;
        const prev = this.state.videos.length;
        this.state.videos = this.state.videos.filter(
          (v) => !((v.id === id || v.videoId === id) && (!workspaceId || v.workspaceId === workspaceId))
        );
        return this.state.videos.length < prev;
      }
    };

    // 12. Personal Identities Sub-Repository
    this.personalIdentities = {
      getById: async (userId: string): Promise<PersonalJarvisIdentity | null> => {
        const ident = (this.state.personalIdentities || []).find((i) => i.userId === userId);
        return ident ? JSON.parse(JSON.stringify(ident)) : null;
      },
      list: async (): Promise<PersonalJarvisIdentity[]> => {
        return (this.state.personalIdentities || []).map((i) => JSON.parse(JSON.stringify(i)));
      },
      create: async (identity: PersonalJarvisIdentity): Promise<PersonalJarvisIdentity> => {
        const record = JSON.parse(JSON.stringify(identity));
        if (!this.state.personalIdentities) this.state.personalIdentities = [];
        const idx = this.state.personalIdentities.findIndex((i) => i.userId === identity.userId);
        if (idx !== -1) {
          this.state.personalIdentities[idx] = record;
        } else {
          this.state.personalIdentities.push(record);
        }
        return JSON.parse(JSON.stringify(record));
      },
      update: async (userId: string, updates: Partial<PersonalJarvisIdentity>): Promise<PersonalJarvisIdentity | null> => {
        if (!this.state.personalIdentities) this.state.personalIdentities = [];
        const idx = this.state.personalIdentities.findIndex((i) => i.userId === userId);
        if (idx === -1) return null;
        this.state.personalIdentities[idx] = {
          ...this.state.personalIdentities[idx],
          ...updates,
          userId,
          updatedAt: new Date().toISOString()
        };
        return JSON.parse(JSON.stringify(this.state.personalIdentities[idx]));
      },
      delete: async (userId: string): Promise<boolean> => {
        if (!this.state.personalIdentities) return false;
        const prev = this.state.personalIdentities.length;
        this.state.personalIdentities = this.state.personalIdentities.filter((i) => i.userId !== userId);
        return this.state.personalIdentities.length < prev;
      },
      updateStats: async (userId: string, statsUpdates: Partial<PersonalJarvisIdentity['stats']>): Promise<PersonalJarvisIdentity | null> => {
        if (!this.state.personalIdentities) this.state.personalIdentities = [];
        const idx = this.state.personalIdentities.findIndex((i) => i.userId === userId);
        if (idx === -1) return null;
        this.state.personalIdentities[idx].stats = {
          ...this.state.personalIdentities[idx].stats,
          ...statsUpdates
        };
        this.state.personalIdentities[idx].updatedAt = new Date().toISOString();
        return JSON.parse(JSON.stringify(this.state.personalIdentities[idx]));
      },
      setActiveContext: async (userId: string, contextId: string): Promise<PersonalJarvisIdentity | null> => {
        if (!this.state.personalIdentities) this.state.personalIdentities = [];
        const idx = this.state.personalIdentities.findIndex((i) => i.userId === userId);
        if (idx === -1) return null;
        const ident = this.state.personalIdentities[idx];
        ident.activeContextId = contextId;
        ident.contexts = (ident.contexts || []).map((c) => ({
          ...c,
          isActive: c.id === contextId
        }));
        ident.updatedAt = new Date().toISOString();
        return JSON.parse(JSON.stringify(ident));
      }
    };

    // 13. Personal Memories Sub-Repository
    this.personalMemories = {
      getById: async (id: string): Promise<PersonalMemoryItem | null> => {
        const mem = (this.state.personalMemories || []).find((m) => m.id === id);
        return mem ? JSON.parse(JSON.stringify(mem)) : null;
      },
      listForUser: async (
        userId: string,
        options?: { contextId?: string; category?: MemoryCategory; visibility?: MemoryVisibility; source?: MemorySourceType; limit?: number }
      ): Promise<PersonalMemoryItem[]> => {
        let list = (this.state.personalMemories || []).filter((m) => m.userId === userId);
        if (options?.contextId) {
          list = list.filter((m) => m.contextId === options.contextId);
        }
        if (options?.category) {
          list = list.filter((m) => m.category === options.category);
        }
        if (options?.visibility) {
          list = list.filter((m) => m.visibility === options.visibility);
        }
        if (options?.source) {
          list = list.filter((m) => m.source === options.source);
        }
        if (options?.limit && options.limit > 0) {
          list = list.slice(0, options.limit);
        }
        return list.map((m) => JSON.parse(JSON.stringify(m)));
      },
      create: async (
        memory: Omit<PersonalMemoryItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }
      ): Promise<PersonalMemoryItem> => {
        const now = new Date().toISOString();
        const record: PersonalMemoryItem = {
          ...memory,
          id: memory.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: memory.createdAt || now,
          updatedAt: memory.updatedAt || now
        };
        if (!this.state.personalMemories) this.state.personalMemories = [];
        this.state.personalMemories.push(JSON.parse(JSON.stringify(record)));
        return JSON.parse(JSON.stringify(record));
      },
      update: async (
        id: string,
        updates: Partial<Omit<PersonalMemoryItem, 'id' | 'userId' | 'createdAt'>>,
        userId?: string
      ): Promise<PersonalMemoryItem | null> => {
        if (!this.state.personalMemories) this.state.personalMemories = [];
        const idx = this.state.personalMemories.findIndex((m) => m.id === id && (!userId || m.userId === userId));
        if (idx === -1) return null;
        this.state.personalMemories[idx] = {
          ...this.state.personalMemories[idx],
          ...updates,
          id,
          userId: this.state.personalMemories[idx].userId,
          updatedAt: new Date().toISOString()
        };
        return JSON.parse(JSON.stringify(this.state.personalMemories[idx]));
      },
      delete: async (id: string, userId: string): Promise<boolean> => {
        if (!this.state.personalMemories) return false;
        const prev = this.state.personalMemories.length;
        this.state.personalMemories = this.state.personalMemories.filter((m) => !(m.id === id && m.userId === userId));
        return this.state.personalMemories.length < prev;
      },
      deleteForUser: async (userId: string): Promise<number> => {
        if (!this.state.personalMemories) return 0;
        const initial = this.state.personalMemories.length;
        this.state.personalMemories = this.state.personalMemories.filter((m) => m.userId !== userId);
        return initial - this.state.personalMemories.length;
      }
    };

    // 14. Personal Knowledge Sub-Repository
    this.personalKnowledge = {
      getState: async (userId: string): Promise<PersonalKnowledgeState | null> => {
        const k = (this.state.personalKnowledgeStates || []).find((s) => s.userId === userId);
        return k ? JSON.parse(JSON.stringify(k)) : null;
      },
      upsertState: async (newState: PersonalKnowledgeState): Promise<PersonalKnowledgeState> => {
        const record = JSON.parse(JSON.stringify(newState));
        if (!this.state.personalKnowledgeStates) this.state.personalKnowledgeStates = [];
        const idx = this.state.personalKnowledgeStates.findIndex((s) => s.userId === newState.userId);
        if (idx !== -1) {
          this.state.personalKnowledgeStates[idx] = record;
        } else {
          this.state.personalKnowledgeStates.push(record);
        }
        return JSON.parse(JSON.stringify(record));
      },
      getConcept: async (userId: string, conceptId: string): Promise<PersonalKnowledgeConceptState | null> => {
        const k = (this.state.personalKnowledgeStates || []).find((s) => s.userId === userId);
        if (!k || !k.concepts) return null;
        const concept =
          k.concepts[conceptId] ||
          Object.values(k.concepts).find((c) => c.conceptName.toLowerCase() === conceptId.toLowerCase());
        return concept ? JSON.parse(JSON.stringify(concept)) : null;
      },
      recordConceptMastery: async (
        userId: string,
        concept: PersonalKnowledgeConceptState,
        signal?: PersonalKnowledgeSignal
      ): Promise<PersonalKnowledgeConceptState> => {
        const updatedConcept: PersonalKnowledgeConceptState = JSON.parse(JSON.stringify(concept));
        if (!this.state.personalKnowledgeStates) this.state.personalKnowledgeStates = [];
        let idx = this.state.personalKnowledgeStates.findIndex((s) => s.userId === userId);
        if (idx === -1) {
          this.state.personalKnowledgeStates.push({
            userId,
            concepts: {},
            recentSignals: [],
            updatedAt: new Date().toISOString()
          });
          idx = this.state.personalKnowledgeStates.length - 1;
        }
        const userState = this.state.personalKnowledgeStates[idx];
        if (!userState.concepts) userState.concepts = {};
        userState.concepts[concept.conceptId] = JSON.parse(JSON.stringify(concept));
        if (signal) {
          if (!userState.recentSignals) userState.recentSignals = [];
          userState.recentSignals.unshift(JSON.parse(JSON.stringify(signal)));
          if (userState.recentSignals.length > 50) {
            userState.recentSignals = userState.recentSignals.slice(0, 50);
          }
        }
        userState.updatedAt = new Date().toISOString();
        return updatedConcept;
      },
      rollbackConceptMastery: async (
        userId: string,
        conceptId: string,
        previousState: PersonalKnowledgeConceptState | null,
        signalIdToRemove?: string
      ): Promise<void> => {
        if (!this.state.personalKnowledgeStates) return;
        const idx = this.state.personalKnowledgeStates.findIndex((s) => s.userId === userId);
        if (idx === -1) return;
        const userState = this.state.personalKnowledgeStates[idx];
        if (userState.concepts) {
          if (previousState) {
            userState.concepts[conceptId] = JSON.parse(JSON.stringify(previousState));
          } else {
            delete userState.concepts[conceptId];
          }
        }
        if (signalIdToRemove && userState.recentSignals) {
          userState.recentSignals = userState.recentSignals.filter((s) => s.id !== signalIdToRemove);
        }
        userState.updatedAt = new Date().toISOString();
      },
      listSignals: async (userId: string, limit?: number): Promise<PersonalKnowledgeSignal[]> => {
        const k = (this.state.personalKnowledgeStates || []).find((s) => s.userId === userId);
        if (!k || !k.recentSignals) return [];
        let list = [...k.recentSignals];
        if (limit && limit > 0) list = list.slice(0, limit);
        return list.map((s) => JSON.parse(JSON.stringify(s)));
      }
    };

    // 15. Personal Study Sub-Repository
    this.personalStudy = {
      getNoteById: async (id: string, userId?: string): Promise<PersonalStudyNote | null> => {
        const note = (this.state.personalStudyNotes || []).find((n) => n.id === id && (!userId || n.userId === userId));
        return note ? JSON.parse(JSON.stringify(note)) : null;
      },
      listNotes: async (
        userId: string,
        options?: { subject?: string; contextId?: string; tag?: string }
      ): Promise<PersonalStudyNote[]> => {
        let list = (this.state.personalStudyNotes || []).filter((n) => n.userId === userId);
        if (options?.subject) {
          list = list.filter((n) => n.subject?.toLowerCase() === options.subject?.toLowerCase());
        }
        if (options?.contextId) {
          list = list.filter((n) => n.contextId === options.contextId);
        }
        if (options?.tag) {
          list = list.filter((n) => n.tags && n.tags.some((t) => t.toLowerCase() === options.tag?.toLowerCase()));
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list.map((n) => JSON.parse(JSON.stringify(n)));
      },
      createNote: async (
        note: Omit<PersonalStudyNote, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
      ): Promise<PersonalStudyNote> => {
        const now = new Date().toISOString();
        const record: PersonalStudyNote = {
          ...note,
          id: note.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: note.createdAt || now,
          updatedAt: note.updatedAt || now
        };
        if (!this.state.personalStudyNotes) this.state.personalStudyNotes = [];
        this.state.personalStudyNotes.push(JSON.parse(JSON.stringify(record)));
        return JSON.parse(JSON.stringify(record));
      },
      updateNote: async (
        id: string,
        updates: Partial<Omit<PersonalStudyNote, 'id' | 'userId' | 'createdAt'>>,
        userId?: string
      ): Promise<PersonalStudyNote | null> => {
        if (!this.state.personalStudyNotes) this.state.personalStudyNotes = [];
        const idx = this.state.personalStudyNotes.findIndex((n) => n.id === id && (!userId || n.userId === userId));
        if (idx === -1) return null;
        this.state.personalStudyNotes[idx] = {
          ...this.state.personalStudyNotes[idx],
          ...updates,
          id,
          userId: this.state.personalStudyNotes[idx].userId,
          updatedAt: new Date().toISOString()
        };
        return JSON.parse(JSON.stringify(this.state.personalStudyNotes[idx]));
      },
      deleteNote: async (id: string, userId: string): Promise<boolean> => {
        if (!this.state.personalStudyNotes) return false;
        const prev = this.state.personalStudyNotes.length;
        this.state.personalStudyNotes = this.state.personalStudyNotes.filter((n) => !(n.id === id && n.userId === userId));
        return this.state.personalStudyNotes.length < prev;
      },
      deleteAllNotes: async (userId: string, subject?: string): Promise<number> => {
        if (!this.state.personalStudyNotes) return 0;
        const initial = this.state.personalStudyNotes.length;
        this.state.personalStudyNotes = this.state.personalStudyNotes.filter((n) => {
          if (n.userId !== userId) return true;
          if (subject && n.subject?.toLowerCase() !== subject.toLowerCase()) return true;
          return false;
        });
        return initial - this.state.personalStudyNotes.length;
      },

      getFlashcardById: async (id: string, userId?: string): Promise<PersonalFlashcard | null> => {
        const card = (this.state.personalFlashcards || []).find((c) => c.id === id && (!userId || c.userId === userId));
        return card ? JSON.parse(JSON.stringify(card)) : null;
      },
      listFlashcards: async (
        userId: string,
        options?: { subject?: string; conceptId?: string }
      ): Promise<PersonalFlashcard[]> => {
        let list = (this.state.personalFlashcards || []).filter((c) => c.userId === userId);
        if (options?.subject) {
          list = list.filter((c) => c.subject?.toLowerCase() === options.subject?.toLowerCase());
        }
        if (options?.conceptId) {
          list = list.filter((c) => c.conceptId === options.conceptId);
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list.map((c) => JSON.parse(JSON.stringify(c)));
      },
      createFlashcard: async (
        card: Omit<PersonalFlashcard, 'createdAt'> & { createdAt?: string }
      ): Promise<PersonalFlashcard> => {
        const record: PersonalFlashcard = {
          ...card,
          id: card.id || `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: card.createdAt || new Date().toISOString()
        };
        if (!this.state.personalFlashcards) this.state.personalFlashcards = [];
        this.state.personalFlashcards.push(JSON.parse(JSON.stringify(record)));
        return JSON.parse(JSON.stringify(record));
      },
      updateFlashcard: async (
        id: string,
        updates: Partial<Omit<PersonalFlashcard, 'id' | 'userId' | 'createdAt'>>,
        userId?: string
      ): Promise<PersonalFlashcard | null> => {
        if (!this.state.personalFlashcards) this.state.personalFlashcards = [];
        const idx = this.state.personalFlashcards.findIndex((c) => c.id === id && (!userId || c.userId === userId));
        if (idx !== -1) {
          this.state.personalFlashcards[idx] = {
            ...this.state.personalFlashcards[idx],
            ...updates,
            id,
            userId: this.state.personalFlashcards[idx].userId
          };
          return JSON.parse(JSON.stringify(this.state.personalFlashcards[idx]));
        }
        return null;
      },
      deleteFlashcard: async (id: string, userId: string): Promise<boolean> => {
        if (!this.state.personalFlashcards) return false;
        const prev = this.state.personalFlashcards.length;
        this.state.personalFlashcards = this.state.personalFlashcards.filter((c) => !(c.id === id && c.userId === userId));
        return this.state.personalFlashcards.length < prev;
      },

      listStudyPlans: async (userId: string): Promise<PersonalStudySessionPlan[]> => {
        const list = (this.state.personalStudyPlans || []).filter((p) => p.userId === userId);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list.map((p) => JSON.parse(JSON.stringify(p)));
      },
      createStudyPlan: async (
        plan: Omit<PersonalStudySessionPlan, 'createdAt'> & { createdAt?: string }
      ): Promise<PersonalStudySessionPlan> => {
        const record: PersonalStudySessionPlan = {
          ...plan,
          id: plan.id || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: plan.createdAt || new Date().toISOString()
        };
        if (!this.state.personalStudyPlans) this.state.personalStudyPlans = [];
        this.state.personalStudyPlans.push(JSON.parse(JSON.stringify(record)));
        return JSON.parse(JSON.stringify(record));
      },
      updateStudyPlan: async (
        id: string,
        updates: Partial<PersonalStudySessionPlan>,
        userId?: string
      ): Promise<PersonalStudySessionPlan | null> => {
        if (!this.state.personalStudyPlans) this.state.personalStudyPlans = [];
        const idx = this.state.personalStudyPlans.findIndex((p) => p.id === id && (!userId || p.userId === userId));
        if (idx !== -1) {
          this.state.personalStudyPlans[idx] = {
            ...this.state.personalStudyPlans[idx],
            ...updates,
            id,
            userId: this.state.personalStudyPlans[idx].userId
          };
          return JSON.parse(JSON.stringify(this.state.personalStudyPlans[idx]));
        }
        return null;
      },
      deleteStudyPlan: async (id: string, userId: string): Promise<boolean> => {
        if (!this.state.personalStudyPlans) return false;
        const prev = this.state.personalStudyPlans.length;
        this.state.personalStudyPlans = this.state.personalStudyPlans.filter((p) => !(p.id === id && p.userId === userId));
        return this.state.personalStudyPlans.length < prev;
      }
    };

    // 16. Activity Timeline Sub-Repository
    this.activityTimeline = {
      getActivity: async (
        userId: string,
        options?: { contextId?: string; contextType?: string; limit?: number }
      ): Promise<ActionActivityItem[]> => {
        let list = (this.state.activityTimeline || []).filter((a) => a.userId === userId);
        if (options?.contextId) {
          list = list.filter((a) => a.contextId === options.contextId);
        }
        if (options?.contextType) {
          list = list.filter((a) => a.contextType?.toLowerCase() === options.contextType?.toLowerCase());
        }
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (options?.limit && options.limit > 0) {
          list = list.slice(0, options.limit);
        }
        return list.map((a) => JSON.parse(JSON.stringify(a)));
      },
      getById: async (id: string, userId?: string): Promise<ActionActivityItem | null> => {
        const item = (this.state.activityTimeline || []).find((a) => a.id === id && (!userId || a.userId === userId));
        return item ? JSON.parse(JSON.stringify(item)) : null;
      },
      recordActivity: async (
        item: Omit<ActionActivityItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
      ): Promise<ActionActivityItem> => {
        const record: ActionActivityItem = {
          ...item,
          id: item.id || `act-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: item.timestamp || new Date().toISOString()
        };
        if (!this.state.activityTimeline) this.state.activityTimeline = [];
        this.state.activityTimeline.unshift(JSON.parse(JSON.stringify(record)));
        return JSON.parse(JSON.stringify(record));
      },
      updateActivity: async (
        id: string,
        updates: Partial<ActionActivityItem>,
        userId?: string
      ): Promise<ActionActivityItem | null> => {
        if (!this.state.activityTimeline) this.state.activityTimeline = [];
        const idx = this.state.activityTimeline.findIndex((a) => a.id === id && (!userId || a.userId === userId));
        if (idx !== -1) {
          this.state.activityTimeline[idx] = {
            ...this.state.activityTimeline[idx],
            ...updates,
            id,
            userId: this.state.activityTimeline[idx].userId
          };
          return JSON.parse(JSON.stringify(this.state.activityTimeline[idx]));
        }
        return null;
      },
      deleteActivity: async (id: string, userId: string): Promise<boolean> => {
        if (!this.state.activityTimeline) return false;
        const prev = this.state.activityTimeline.length;
        this.state.activityTimeline = this.state.activityTimeline.filter((a) => !(a.id === id && a.userId === userId));
        return this.state.activityTimeline.length < prev;
      }
    };

    // 17. Diagnostic Sessions Sub-Repository
    this.diagnosticSessions = {
      getSessionById: async (sessionId: string, userId?: string): Promise<DiagnosticSessionRecord | null> => {
        const s = (this.state.diagnosticSessions || []).find(
          (item) => item.sessionId === sessionId && (!userId || item.userId === userId)
        );
        return s ? JSON.parse(JSON.stringify(s)) : null;
      },
      listSessionsForUser: async (
        userId: string,
        options?: { conceptName?: string; completed?: boolean; limit?: number }
      ): Promise<DiagnosticSessionRecord[]> => {
        let list = (this.state.diagnosticSessions || []).filter((s) => s.userId === userId);
        if (options?.conceptName) {
          list = list.filter((s) => s.conceptName.toLowerCase() === options.conceptName?.toLowerCase());
        }
        if (options?.completed !== undefined) {
          list = list.filter((s) => s.completed === options.completed);
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (options?.limit && options.limit > 0) {
          list = list.slice(0, options.limit);
        }
        return list.map((s) => JSON.parse(JSON.stringify(s)));
      },
      createSession: async (session: DiagnosticSessionRecord): Promise<DiagnosticSessionRecord> => {
        const record = JSON.parse(JSON.stringify(session));
        if (!this.state.diagnosticSessions) this.state.diagnosticSessions = [];
        const idx = this.state.diagnosticSessions.findIndex((s) => s.sessionId === session.sessionId);
        if (idx !== -1) {
          this.state.diagnosticSessions[idx] = record;
        } else {
          this.state.diagnosticSessions.push(record);
        }
        return JSON.parse(JSON.stringify(record));
      },
      updateSession: async (
        sessionId: string,
        updates: Partial<DiagnosticSessionRecord>,
        userId?: string
      ): Promise<DiagnosticSessionRecord | null> => {
        if (!this.state.diagnosticSessions) this.state.diagnosticSessions = [];
        const idx = this.state.diagnosticSessions.findIndex(
          (s) => s.sessionId === sessionId && (!userId || s.userId === userId)
        );
        if (idx !== -1) {
          this.state.diagnosticSessions[idx] = {
            ...this.state.diagnosticSessions[idx],
            ...updates,
            sessionId,
            userId: this.state.diagnosticSessions[idx].userId,
            updatedAt: new Date().toISOString()
          };
          return JSON.parse(JSON.stringify(this.state.diagnosticSessions[idx]));
        }
        return null;
      },
      recordCheckpointEvaluation: async (
        sessionId: string,
        checkpoint: CheckpointEvaluationResult,
        userId?: string
      ): Promise<DiagnosticSessionRecord | null> => {
        if (!this.state.diagnosticSessions) this.state.diagnosticSessions = [];
        const idx = this.state.diagnosticSessions.findIndex(
          (s) => s.sessionId === sessionId && (!userId || s.userId === userId)
        );
        if (idx !== -1) {
          const sess = this.state.diagnosticSessions[idx];
          if (!sess.evaluatedCheckpoints) sess.evaluatedCheckpoints = {};
          sess.evaluatedCheckpoints[checkpoint.questionId] = JSON.parse(JSON.stringify(checkpoint));
          sess.updatedAt = new Date().toISOString();

          const totalQuestions = sess.questions.length;
          const evaluatedCount = Object.keys(sess.evaluatedCheckpoints).length;
          if (totalQuestions > 0 && evaluatedCount >= totalQuestions) {
            sess.completed = true;
            sess.status = 'completed';
            sess.completedAt = new Date().toISOString();
          }
          return JSON.parse(JSON.stringify(sess));
        }
        return null;
      },
      deleteSession: async (sessionId: string, userId?: string): Promise<boolean> => {
        if (!this.state.diagnosticSessions) return false;
        const prev = this.state.diagnosticSessions.length;
        this.state.diagnosticSessions = this.state.diagnosticSessions.filter(
          (s) => !(s.sessionId === sessionId && (!userId || s.userId === userId))
        );
        return this.state.diagnosticSessions.length < prev;
      }
    };

    // 18. Knowledge Assets Sub-Repository
    this.knowledgeAssets = {
      getById: async (
        id: string,
        callerContext?: { userId?: string; institutionId?: string; workspaceId?: string }
      ): Promise<KnowledgeAsset | null> => {
        const asset = (this.state.knowledgeAssets || []).find((a) => a.id === id);
        if (!asset) return null;
        if (callerContext) {
          const isOwner = callerContext.userId && asset.ownerId === callerContext.userId;
          const isInst = callerContext.institutionId && asset.institutionId === callerContext.institutionId;
          const isWs = callerContext.workspaceId && asset.workspaceId === callerContext.workspaceId;
          const isReusable = asset.reusable;
          if (!isOwner && !isInst && !isWs && !isReusable) {
            return null;
          }
        }
        return JSON.parse(JSON.stringify(asset));
      },
      list: async (filter?: AssetSearchCriteria): Promise<KnowledgeAsset[]> => {
        let list = [...(this.state.knowledgeAssets || [])];
        if (filter?.userId) {
          list = list.filter((a) => a.ownerId === filter.userId);
        }
        if (filter?.contextId) {
          list = list.filter((a) => a.contextId === filter.contextId);
        }
        if (filter?.institutionId) {
          list = list.filter((a) => a.institutionId === filter.institutionId);
        }
        if (filter?.assetType) {
          list = list.filter((a) => a.assetType === filter.assetType);
        }
        if (filter?.subject) {
          list = list.filter((a) => a.subject.toLowerCase() === filter.subject?.toLowerCase());
        }
        if (filter?.topic) {
          list = list.filter((a) => a.topic.toLowerCase() === filter.topic?.toLowerCase());
        }
        if (filter?.difficulty) {
          list = list.filter((a) => a.difficulty.toLowerCase() === filter.difficulty?.toLowerCase());
        }
        return list.map((a) => JSON.parse(JSON.stringify(a)));
      },
      create: async (asset: KnowledgeAsset): Promise<KnowledgeAsset> => {
        const now = new Date().toISOString();
        const record: KnowledgeAsset = {
          ...asset,
          id: asset.id || `ka-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: asset.createdAt || now,
          updatedAt: asset.updatedAt || now
        };
        if (!this.state.knowledgeAssets) this.state.knowledgeAssets = [];
        this.state.knowledgeAssets.push(JSON.parse(JSON.stringify(record)));
        return JSON.parse(JSON.stringify(record));
      },
      update: async (
        id: string,
        updates: Partial<Omit<KnowledgeAsset, 'id' | 'createdAt'>>,
        callerUserId?: string
      ): Promise<KnowledgeAsset | null> => {
        if (!this.state.knowledgeAssets) this.state.knowledgeAssets = [];
        const idx = this.state.knowledgeAssets.findIndex(
          (a) => a.id === id && (!callerUserId || a.ownerId === callerUserId)
        );
        if (idx === -1) return null;
        this.state.knowledgeAssets[idx] = {
          ...this.state.knowledgeAssets[idx],
          ...updates,
          id,
          ownerId: this.state.knowledgeAssets[idx].ownerId,
          updatedAt: new Date().toISOString()
        };
        return JSON.parse(JSON.stringify(this.state.knowledgeAssets[idx]));
      },
      delete: async (id: string, callerUserId?: string): Promise<boolean> => {
        if (!this.state.knowledgeAssets) return false;
        const prev = this.state.knowledgeAssets.length;
        this.state.knowledgeAssets = this.state.knowledgeAssets.filter(
          (a) => !(a.id === id && (!callerUserId || a.ownerId === callerUserId))
        );
        return this.state.knowledgeAssets.length < prev;
      }
    };

    // 19. Learner Question Exposures Sub-Repository
    this.learnerExposures = {
      getExposure: async (
        userId: string,
        contextId: string,
        questionId: string
      ): Promise<LearnerQuestionExposure | null> => {
        const exp = (this.state.learnerExposures || []).find(
          (e) => e.userId === userId && e.contextId === contextId && e.questionId === questionId
        );
        return exp ? JSON.parse(JSON.stringify(exp)) : null;
      },
      listExposuresForLearner: async (
        userId: string,
        options?: { contextId?: string; subject?: string; topic?: string; status?: QuestionExposureStatus }
      ): Promise<LearnerQuestionExposure[]> => {
        let list = (this.state.learnerExposures || []).filter((e) => e.userId === userId);
        if (options?.contextId) {
          list = list.filter((e) => e.contextId === options.contextId);
        }
        if (options?.subject) {
          list = list.filter((e) => e.subject.toLowerCase() === options.subject?.toLowerCase());
        }
        if (options?.topic) {
          list = list.filter((e) => e.topic.toLowerCase() === options.topic?.toLowerCase());
        }
        if (options?.status) {
          list = list.filter((e) => e.status === options.status);
        }
        return list.map((e) => JSON.parse(JSON.stringify(e)));
      },
      recordExposures: async (params: {
        userId: string;
        contextId?: string;
        exposures: LearnerQuestionExposure[];
      }): Promise<void> => {
        const { userId, contextId = 'ctx-default', exposures } = params;
        const now = new Date().toISOString();
        if (!this.state.learnerExposures) this.state.learnerExposures = [];
        for (const exp of exposures) {
          const idx = this.state.learnerExposures.findIndex(
            (e) => e.userId === userId && e.contextId === (exp.contextId || contextId) && e.questionId === exp.questionId
          );
          if (idx !== -1) {
            this.state.learnerExposures[idx].lastSeenAt = now;
            if (exp.status === 'COMPLETED' && this.state.learnerExposures[idx].status !== 'MASTERED') {
              this.state.learnerExposures[idx].status = 'COMPLETED';
            } else if (exp.status === 'ATTEMPTED' && this.state.learnerExposures[idx].status === 'SEEN') {
              this.state.learnerExposures[idx].status = 'ATTEMPTED';
            }
          } else {
            this.state.learnerExposures.push(JSON.parse(JSON.stringify(exp)));
          }
        }
      },
      recordAttempt: async (params: {
        userId: string;
        contextId?: string;
        questionId: string;
        exposure: LearnerQuestionExposure;
      }): Promise<LearnerQuestionExposure> => {
        const { userId, contextId = 'ctx-default', questionId, exposure } = params;
        if (!this.state.learnerExposures) this.state.learnerExposures = [];
        const idx = this.state.learnerExposures.findIndex(
          (e) => e.userId === userId && e.contextId === contextId && e.questionId === questionId
        );
        if (idx !== -1) {
          this.state.learnerExposures[idx] = JSON.parse(JSON.stringify(exposure));
        } else {
          this.state.learnerExposures.push(JSON.parse(JSON.stringify(exposure)));
        }
        return JSON.parse(JSON.stringify(exposure));
      },
      getExposureSummary: async (
        userId: string,
        contextId?: string,
        subject?: string
      ): Promise<LearnerExposureSummary> => {
        let list = (this.state.learnerExposures || []).filter((e) => e.userId === userId);
        if (contextId) list = list.filter((e) => e.contextId === contextId);
        if (subject) list = list.filter((e) => e.subject.toLowerCase() === subject.toLowerCase());

        const seenIds = new Set<string>();
        const completedIds = new Set<string>();
        const incorrectIds = new Set<string>();
        const masteredIds = new Set<string>();
        const weaknesses = new Set<string>();

        let totalSeen = 0;
        let totalAttempted = 0;
        let totalCompleted = 0;
        let totalMastered = 0;

        for (const e of list) {
          seenIds.add(e.questionId);
          totalSeen++;
          if (e.attemptCount > 0) totalAttempted++;
          if (e.status === 'COMPLETED' || e.status === 'MASTERED') {
            completedIds.add(e.questionId);
            totalCompleted++;
          }
          if (e.status === 'MASTERED') {
            masteredIds.add(e.questionId);
            totalMastered++;
          }
          if (e.latestResult === 'INCORRECT' || e.incorrectCount > 0) {
            incorrectIds.add(e.questionId);
          }
          if (e.weaknessFlag && e.concept) {
            weaknesses.add(e.concept);
          }
        }

        return {
          userId,
          contextId,
          subject,
          totalSeen,
          totalAttempted,
          totalCompleted,
          totalMastered,
          seenQuestionIds: Array.from(seenIds),
          completedQuestionIds: Array.from(completedIds),
          incorrectQuestionIds: Array.from(incorrectIds),
          masteredQuestionIds: Array.from(masteredIds),
          weaknessConcepts: Array.from(weaknesses)
        };
      }
    };
  }

  private getActiveState(): DatabaseSchema {
    const currentTx = transactionStorage.getStore();
    if (currentTx && this.transactionDepth > 0 && this.transactionStates.length > 0) {
      return this.transactionStates[this.transactionStates.length - 1];
    }
    return this._state;
  }

  private get state(): DatabaseSchema {
    return this.getActiveState();
  }

  private set state(val: DatabaseSchema) {
    const currentTx = transactionStorage.getStore();
    if (currentTx && this.transactionDepth > 0 && this.transactionStates.length > 0) {
      this.transactionStates[this.transactionStates.length - 1] = val;
    } else {
      this._state = val;
    }
  }

  getState(): DatabaseSchema {
    return this.getActiveState();
  }

  mutate<T>(fn: (state: DatabaseSchema) => T): T {
    const activeState = this.getActiveState();
    return fn(activeState);
  }

  async init(): Promise<void> {}
  async seed(_force?: boolean): Promise<void> {
    this._state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
  }
  async flush(): Promise<void> {}
  async close(): Promise<void> {}
  async reset(): Promise<void> {
    this._state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
  }

  private beginTransaction(): void {
    if (this.transactionDepth === 0) {
      this.baseStates.push(JSON.parse(JSON.stringify(this._state)));
      this.transactionStates.push(JSON.parse(JSON.stringify(this._state)));
    } else {
      const parentState = this.transactionStates[this.transactionStates.length - 1];
      this.baseStates.push(JSON.parse(JSON.stringify(parentState)));
      this.transactionStates.push(JSON.parse(JSON.stringify(parentState)));
    }
    this.transactionDepth++;
  }

  private rollbackTransaction(): void {
    if (this.transactionStates.length > 0) {
      this.transactionStates.pop();
    }
    if (this.baseStates.length > 0) {
      this.baseStates.pop();
    }
    this.transactionDepth = Math.max(0, this.transactionDepth - 1);
  }

  private async commitTransaction(): Promise<void> {
    if (this.transactionStates.length === 0) {
      this.transactionDepth = Math.max(0, this.transactionDepth - 1);
      return;
    }

    const committedWorkingState = this.transactionStates.pop()!;
    const baseState = this.baseStates.pop()!;
    this.transactionDepth = Math.max(0, this.transactionDepth - 1);

    if (this.transactionDepth === 0) {
      this._state = mergeThreeWaySchemas(baseState, committedWorkingState, this._state);
    } else {
      const parentIdx = this.transactionStates.length - 1;
      const parentWorkingState = this.transactionStates[parentIdx];
      this.transactionStates[parentIdx] = mergeThreeWaySchemas(
        baseState,
        committedWorkingState,
        parentWorkingState
      );
    }
  }

  /**
   * Stage 6.4.4: Executes a coordinated unit of work across one or more sub-repositories.
   * Guarantees bounded process-local atomicity, isolated snapshot rollback on failure,
   * with full parity to DiskJarvisDataRepository.
   */
  async runTransaction<T>(
    work: (txRepo: IJarvisDataRepository) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const parentTx = transactionStorage.getStore();
    if (parentTx && parentTx.repo === this) {
      // Nested transaction within the same repository instance: create a savepoint
      this.beginTransaction();
      try {
        const result = await work(this);
        await this.commitTransaction();
        return result;
      } catch (err) {
        this.rollbackTransaction();
        throw err;
      }
    }

    // Root transaction: acquire process-local lock
    const timeoutMs = options?.timeoutMs ?? 10000;
    const release = await this.mutex.acquire(timeoutMs);
    this.beginTransaction();
    let timer: NodeJS.Timeout | null = null;
    try {
      const context: TransactionContext = {
        id: `tx-mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        repo: this,
        name: options?.name,
        userId: options?.userId,
        startedAt: new Date().toISOString(),
        depth: 1
      };

      const workPromise = transactionStorage.run(context, () => work(this));
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new TransactionTimeoutError(`Transaction execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const result = await Promise.race([workPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);

      await this.commitTransaction();
      return result;
    } catch (err) {
      this.rollbackTransaction();
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      release();
    }
  }
}
