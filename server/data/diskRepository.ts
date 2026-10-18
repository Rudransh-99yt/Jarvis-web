// Disk-Backed Repository Implementation for Jarvis Platform
import { JsonFileStore } from './fileStore.ts';
import { AsyncMutex, transactionStorage, TransactionTimeoutError, type TransactionOptions, type TransactionContext } from './transaction.ts';
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
import { DeterministicLocalEmbeddingProvider } from '../rag/embeddingProvider.ts';

export class DiskJarvisDataRepository implements IJarvisDataRepository {
  public readonly isPersistent = true;
  private store: JsonFileStore;
  private mutex: AsyncMutex = new AsyncMutex();

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
  public authOtps: IAuthOtpRepository;

  constructor(filePath?: string, options?: { skipProcessLock?: boolean }) {
    this.store = new JsonFileStore({ filePath, skipProcessLock: options?.skipProcessLock });

    // 1. Users Sub-Repository
    this.users = {
      getById: async (id: string): Promise<User | null> => {
        const u = this.store.getState().users.find((user) => user.id === id);
        return u ? { ...u } : null;
      },
      getByEmail: async (email: string): Promise<User | null> => {
        const lower = email.trim().toLowerCase();
        const u = this.store.getState().users.find((user) => user.email.toLowerCase() === lower);
        return u ? { ...u } : null;
      },
      list: async (): Promise<User[]> => {
        return this.store.getState().users.map((u) => ({ ...u }));
      },
      create: async (user: Omit<User, 'createdAt'>): Promise<User> => {
        const normalizedEmail = user.email ? user.email.trim().toLowerCase() : '';
        const record: User = {
          ...user,
          email: normalizedEmail,
          createdAt: new Date().toISOString()
        };
        this.store.mutate((state) => {
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
        return this.store.mutate((state) => {
          const index = state.users.findIndex((u) => u.id === id);
          if (index === -1) return null;
          state.users[index] = {
            ...state.users[index],
            ...updates
          };
          return { ...state.users[index] };
        });
      },
      delete: async (id: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.users.length;
          state.users = state.users.filter((u) => u.id !== id);
          return state.users.length < prev;
        });
      }
    };

    // 1.2 Auth OTP Sub-Repository (Milestone 2.1)
    this.authOtps = {
      getById: async (id: string): Promise<AuthOtpRecord | null> => {
        const otp = (this.store.getState().authOtps || []).find((o) => o.id === id);
        return otp ? JSON.parse(JSON.stringify(otp)) : null;
      },
      getActiveOtp: async (email: string, intent: AuthOtpIntent): Promise<AuthOtpRecord | null> => {
        const normalized = email.trim().toLowerCase();
        const now = Date.now();
        const otp = (this.store.getState().authOtps || []).find(
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

        this.store.mutate((state) => {
          if (!state.authOtps) state.authOtps = [];
          // Enforce one active OTP per email and intent:
          // Invalidate any existing pending OTPs for this email and intent
          for (const item of state.authOtps) {
            if (item.email === normalizedEmail && item.intent === record.intent && item.status === 'pending') {
              item.status = 'invalidated';
            }
          }
          state.authOtps.push(JSON.parse(JSON.stringify(newRecord)));
        });

        return JSON.parse(JSON.stringify(newRecord));
      },
      update: async (
        id: string,
        updates: Partial<Omit<AuthOtpRecord, 'id' | 'createdAt'>>
      ): Promise<AuthOtpRecord | null> => {
        let updated: AuthOtpRecord | null = null;
        this.store.mutate((state) => {
          if (!state.authOtps) state.authOtps = [];
          const idx = state.authOtps.findIndex((o) => o.id === id);
          if (idx !== -1) {
            state.authOtps[idx] = {
              ...state.authOtps[idx],
              ...updates,
              id: state.authOtps[idx].id,
              createdAt: state.authOtps[idx].createdAt
            };
            updated = JSON.parse(JSON.stringify(state.authOtps[idx]));
          }
        });
        return updated;
      },
      invalidateActiveOtps: async (email: string, intent?: AuthOtpIntent): Promise<number> => {
        const normalized = email.trim().toLowerCase();
        let count = 0;
        this.store.mutate((state) => {
          if (!state.authOtps) return;
          for (const item of state.authOtps) {
            if (
              item.email === normalized &&
              (!intent || item.intent === intent) &&
              item.status === 'pending'
            ) {
              item.status = 'invalidated';
              count++;
            }
          }
        });
        return count;
      },
      cleanupExpired: async (): Promise<number> => {
        const now = Date.now();
        let count = 0;
        this.store.mutate((state) => {
          if (!state.authOtps) return;
          for (const item of state.authOtps) {
            if (item.status === 'pending' && new Date(item.expiresAt).getTime() <= now) {
              item.status = 'expired';
              count++;
            }
          }
        });
        return count;
      },
      list: async (filter?: { email?: string; intent?: AuthOtpIntent; status?: AuthOtpStatus }): Promise<AuthOtpRecord[]> => {
        let list = this.store.getState().authOtps || [];
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
        const list = this.store.getState().authOtps || [];
        return list.filter(
          (o) => o.email === normalized && new Date(o.createdAt).getTime() >= cutoff
        ).length;
      }
    };

    // 1.5 Institutions Sub-Repository
    this.institutions = {
      getById: async (id: string): Promise<Institution | null> => {
        const inst = (this.store.getState().institutions || []).find((i) => i.id === id);
        return inst ? { ...inst } : null;
      },
      list: async (): Promise<Institution[]> => {
        return (this.store.getState().institutions || []).map((i) => ({ ...i }));
      },
      create: async (institution: Institution): Promise<Institution> => {
        this.store.mutate((state) => {
          if (!state.institutions) state.institutions = [];
          state.institutions.push({ ...institution });
        });
        return { ...institution };
      },
      getMembership: async (institutionId: string, userId: string): Promise<InstitutionMembership | null> => {
        const mem = (this.store.getState().institutionMemberships || []).find(
          (m) => m.institutionId === institutionId && m.userId === userId
        );
        return mem ? { ...mem } : null;
      },
      listMemberships: async (): Promise<InstitutionMembership[]> => {
        return (this.store.getState().institutionMemberships || []).map((m) => ({ ...m }));
      },
      listMembershipsForUser: async (userId: string): Promise<InstitutionMembership[]> => {
        return (this.store.getState().institutionMemberships || [])
          .filter((m) => m.userId === userId)
          .map((m) => ({ ...m }));
      },
      listMembershipsForInstitution: async (institutionId: string): Promise<InstitutionMembership[]> => {
        return (this.store.getState().institutionMemberships || [])
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
        this.store.mutate((state) => {
          if (!state.institutionMemberships) state.institutionMemberships = [];
          const idx = state.institutionMemberships.findIndex(
            (m) => m.institutionId === institutionId && m.userId === userId
          );
          if (idx >= 0) {
            state.institutionMemberships[idx] = record;
          } else {
            state.institutionMemberships.push(record);
          }
        });
        return { ...record };
      },
      removeMembership: async (institutionId: string, userId: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          if (!state.institutionMemberships) return false;
          const prev = state.institutionMemberships.length;
          state.institutionMemberships = state.institutionMemberships.filter(
            (m) => !(m.institutionId === institutionId && m.userId === userId)
          );
          return state.institutionMemberships.length < prev;
        });
      },
      getInvitationByCode: async (code: string): Promise<InstitutionInvitation | null> => {
        const clean = code.trim().toUpperCase();
        const inv = (this.store.getState().institutionInvitations || []).find(
          (i) => i.code.toUpperCase() === clean
        );
        return inv ? { ...inv } : null;
      },
      listInvitations: async (institutionId?: string): Promise<InstitutionInvitation[]> => {
        let list = this.store.getState().institutionInvitations || [];
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
        this.store.mutate((state) => {
          if (!state.institutionInvitations) state.institutionInvitations = [];
          state.institutionInvitations.push(record);
        });
        return { ...record };
      },
      consumeInvitation: async (code: string, userId: string): Promise<{ invitation: InstitutionInvitation; membership: InstitutionMembership }> => {
        const clean = code.trim().toUpperCase();
        let targetInv: InstitutionInvitation | null = null;
        let membership: InstitutionMembership | null = null;

        this.store.mutate((state) => {
          if (!state.institutionInvitations) state.institutionInvitations = [];
          const invIndex = state.institutionInvitations.findIndex((i) => i.code.toUpperCase() === clean);
          if (invIndex === -1) {
            throw new Error('INVALID_INVITATION: Invitation code does not exist.');
          }
          const inv = state.institutionInvitations[invIndex];
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
          targetInv = { ...inv };

          // Add or update institution membership
          if (!state.institutionMemberships) state.institutionMemberships = [];
          // Role escalation guard: never allow an invitation to grant admin or commander
          const allowedInvitationRoles: UserRole[] = ['student', 'teacher', 'principal', 'parent'];
          const safeRole: UserRole = allowedInvitationRoles.includes(inv.role) ? inv.role : 'student';

          membership = {
            id: `instmem-${userId}-${Date.now()}`,
            institutionId: inv.institutionId,
            userId,
            role: safeRole,
            joinedAt: new Date().toISOString()
          };
          const existingIdx = state.institutionMemberships.findIndex(
            (m) => m.institutionId === inv.institutionId && m.userId === userId
          );
          if (existingIdx >= 0) {
            state.institutionMemberships[existingIdx] = membership;
          } else {
            state.institutionMemberships.push(membership);
          }
        });

        if (!targetInv || !membership) {
          throw new Error('Failed to consume invitation.');
        }
        return { invitation: targetInv, membership };
      },
      revokeInvitation: async (code: string): Promise<boolean> => {
        const clean = code.trim().toUpperCase();
        return this.store.mutate((state) => {
          if (!state.institutionInvitations) return false;
          const inv = state.institutionInvitations.find((i) => i.code.toUpperCase() === clean);
          if (!inv) return false;
          inv.status = 'revoked';
          return true;
        });
      }
    };

    // 2. Workspaces Sub-Repository
    this.workspaces = {
      getById: async (id: string): Promise<Workspace | null> => {
        const ws = this.store.getState().workspaces.find((w) => w.id === id);
        return ws ? { ...ws } : null;
      },
      list: async (): Promise<Workspace[]> => {
        return this.store.getState().workspaces.map((w) => ({ ...w }));
      },
      listForUser: async (userId: string): Promise<Workspace[]> => {
        const memberships = this.store.getState().memberships.filter((m) => m.userId === userId);
        const wsIds = new Set(memberships.map((m) => m.workspaceId));
        return this.store.getState().workspaces.filter((w) => wsIds.has(w.id)).map((w) => ({ ...w }));
      },
      create: async (workspace: Omit<Workspace, 'createdAt' | 'updatedAt'>): Promise<Workspace> => {
        const now = new Date().toISOString();
        const record: Workspace = {
          ...workspace,
          createdAt: now,
          updatedAt: now
        };
        this.store.mutate((state) => {
          state.workspaces.push(record);
          // Add creator as owner membership automatically
          state.memberships.push({
            id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            workspaceId: record.id,
            userId: record.ownerId,
            role: 'owner',
            joinedAt: now
          });
        });
        return { ...record };
      },
      update: async (id: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>): Promise<Workspace | null> => {
        return this.store.mutate((state) => {
          const index = state.workspaces.findIndex((w) => w.id === id);
          if (index === -1) return null;
          state.workspaces[index] = {
            ...state.workspaces[index],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          return { ...state.workspaces[index] };
        });
      },
      delete: async (id: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.workspaces.length;
          state.workspaces = state.workspaces.filter((w) => w.id !== id);
          state.memberships = state.memberships.filter((m) => m.workspaceId !== id);
          return state.workspaces.length < prev;
        });
      },
      addMember: async (workspaceId: string, userId: string, role: WorkspaceMembership['role']): Promise<WorkspaceMembership> => {
        const record: WorkspaceMembership = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspaceId,
          userId,
          role,
          joinedAt: new Date().toISOString()
        };
        this.store.mutate((state) => {
          state.memberships = state.memberships.filter((m) => !(m.workspaceId === workspaceId && m.userId === userId));
          state.memberships.push(record);
        });
        return { ...record };
      },
      getMembers: async (workspaceId: string): Promise<WorkspaceMembership[]> => {
        return this.store.getState().memberships.filter((m) => m.workspaceId === workspaceId).map((m) => ({ ...m }));
      },
      removeMember: async (workspaceId: string, userId: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.memberships.length;
          state.memberships = state.memberships.filter((m) => !(m.workspaceId === workspaceId && m.userId === userId));
          return state.memberships.length < prev;
        });
      }
    };

    // 3. Conversations Sub-Repository
    this.conversations = {
      getById: async (id: string, workspaceId?: string): Promise<Conversation | null> => {
        const conv = this.store.getState().conversations.find((c) => c.id === id && (!workspaceId || c.workspaceId === workspaceId));
        if (!conv) return null;
        const msgCount = this.store.getState().messages.filter((m) => m.conversationId === id).length;
        return { ...conv, messageCount: msgCount };
      },
      list: async (workspaceId?: string, limit?: number): Promise<Conversation[]> => {
        let convs = this.store.getState().conversations.filter((c) => !workspaceId || c.workspaceId === workspaceId);
        convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        if (limit && limit > 0) {
          convs = convs.slice(0, limit);
        }
        return convs.map((c) => {
          const count = this.store.getState().messages.filter((m) => m.conversationId === c.id).length;
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
        this.store.mutate((state) => {
          state.conversations.push(record);
        });
        return { ...record };
      },
      updateTitle: async (id: string, title: string, workspaceId?: string): Promise<Conversation | null> => {
        return this.store.mutate((state) => {
          const index = state.conversations.findIndex((c) => c.id === id && (!workspaceId || c.workspaceId === workspaceId));
          if (index === -1) return null;
          state.conversations[index] = {
            ...state.conversations[index],
            title,
            updatedAt: new Date().toISOString()
          };
          const count = state.messages.filter((m) => m.conversationId === id).length;
          return { ...state.conversations[index], messageCount: count };
        });
      },
      delete: async (id: string, workspaceId?: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.conversations.length;
          state.conversations = state.conversations.filter((c) => !(c.id === id && (!workspaceId || c.workspaceId === workspaceId)));
          state.messages = state.messages.filter((m) => m.conversationId !== id);
          return state.conversations.length < prev;
        });
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

        this.store.mutate((state) => {
          // Ensure parent conversation exists or initialize default
          let conv = state.conversations.find((c) => c.id === conversationId);
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
            state.conversations.push(conv);
          } else {
            conv.updatedAt = now;
          }

          state.messages.push(message);
        });

        return { ...message };
      },
      getMessages: async (conversationId: string, limit?: number): Promise<Message[]> => {
        const msgs = this.store.getState().messages.filter((m) => m.conversationId === conversationId);
        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (limit && limit > 0) {
          return msgs.slice(-limit).map((m) => ({ ...m }));
        }
        return msgs.map((m) => ({ ...m }));
      },
      clearMessages: async (conversationId: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.messages.length;
          state.messages = state.messages.filter((m) => m.conversationId !== conversationId);
          return state.messages.length < prev;
        });
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

        this.store.mutate((state) => {
          // Ensure conversation/thread exists
          let thread = state.conversations.find((c) => c.id === threadId);
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
            state.conversations.push(thread);
          } else {
            thread.updatedAt = now;
            if (thread.participantIds && !thread.participantIds.includes(input.senderUserId)) {
              thread.participantIds.push(input.senderUserId);
            }
          }
          thread.lastMessage = messageRecord;

          // If attachments are specified, associate files in state.files
          if (Array.isArray(input.attachmentFileIds) && input.attachmentFileIds.length > 0) {
            for (const fId of input.attachmentFileIds) {
              const fileObj = state.files.find((f) => f.id === fId);
              if (fileObj) {
                fileObj.messageId = msgId;
                fileObj.classId = input.classId;
                fileObj.conversationId = threadId;
              }
            }
          }

          state.messages.push(messageRecord);
        });

        // Hydrate attachments from state
        const attachedFiles = (messageRecord.attachmentFileIds || [])
          .map((fId) => this.store.getState().files.find((f) => f.id === fId))
          .filter((f): f is FileRecord => Boolean(f));
        
        return {
          ...messageRecord,
          attachments: attachedFiles
        };
      },

      listMessages: async (filter: MessageFilter): Promise<Message[]> => {
        let msgs = this.store.getState().messages.filter((m) => {
          if (filter.workspaceId && m.workspaceId && m.workspaceId !== filter.workspaceId) return false;
          if (filter.classId && m.classId !== filter.classId) return false;
          if (filter.conversationId && m.conversationId !== filter.conversationId) return false;
          if (filter.senderUserId && m.senderUserId !== filter.senderUserId) return false;
          // Filter to only messages that belong to classes if classId is queried
          if (filter.classId && !m.classId) return false;
          return true;
        });

        msgs.sort((a, b) => new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime());

        if (filter.limit && filter.limit > 0) {
          msgs = msgs.slice(-filter.limit);
        }

        const allFiles = this.store.getState().files;
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
        const msg = this.store.getState().messages.find((m) => m.id === id && (!workspaceId || m.workspaceId === workspaceId));
        if (!msg) return null;
        const allFiles = this.store.getState().files;
        const attachments = (msg.attachmentFileIds || [])
          .map((fId) => allFiles.find((f) => f.id === fId))
          .filter((f): f is FileRecord => Boolean(f));
        return { ...msg, attachments };
      },

      markMessageRead: async (id: string, userId: string): Promise<Message | null> => {
        return this.store.mutate((state) => {
          const index = state.messages.findIndex((m) => m.id === id);
          if (index === -1) return null;
          const msg = state.messages[index];
          const readBy = new Set(msg.readBy || []);
          readBy.add(userId);
          state.messages[index] = {
            ...msg,
            readBy: Array.from(readBy),
            updatedAt: new Date().toISOString()
          };
          const allFiles = state.files;
          const attachments = (state.messages[index].attachmentFileIds || [])
            .map((fId) => allFiles.find((f) => f.id === fId))
            .filter((f): f is FileRecord => Boolean(f));
          return { ...state.messages[index], attachments };
        });
      },

      listThreads: async (classId: string, workspaceId?: string): Promise<Conversation[]> => {
        const threads = this.store.getState().conversations.filter(
          (c) => c.classId === classId && (!workspaceId || c.workspaceId === workspaceId)
        );
        threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return threads.map((t) => {
          const count = this.store.getState().messages.filter((m) => m.conversationId === t.id).length;
          const lastMsg = this.store.getState().messages
            .filter((m) => m.conversationId === t.id)
            .sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())[0];
          return { ...t, messageCount: count, lastMessage: lastMsg };
        });
      },

      getOrCreateClassThread: async (classId: string, workspaceId: string, participantIds?: string[], title?: string): Promise<Conversation> => {
        const existing = this.store.getState().conversations.find(
          (c) => c.classId === classId && c.workspaceId === workspaceId && (!title || c.title === title)
        );
        if (existing) {
          const count = this.store.getState().messages.filter((m) => m.conversationId === existing.id).length;
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
        this.store.mutate((state) => {
          state.conversations.push(thread);
        });
        return { ...thread };
      },

      // Session Management for AI & Conversational Flow
      getOrCreateSession: async (sessionId: string | undefined, workspaceId: string, userId: string): Promise<ConversationSession> => {
        const id = sessionId && sessionId.trim().length > 0
          ? sessionId.trim()
          : `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const state = this.store.getState();
        let conv = (state.conversations || []).find((c) => c.id === id);
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
          this.store.mutate((s) => {
            if (!s.conversations) s.conversations = [];
            s.conversations.push(conv!);
          });
        } else if (userId && workspaceId && (conv.userId !== userId || conv.workspaceId !== workspaceId)) {
          throw new Error('CONVERSATION_FORBIDDEN');
        }

        const msgs = (this.store.getState().messages || [])
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

        this.store.mutate((state) => {
          let conv = (state.conversations || []).find((c) => c.id === sessionId);
          if (!conv) {
            throw new Error('Conversation must be created with a verified owner before messages can be appended.');
          } else {
            conv.updatedAt = now;
            if (conv.title === 'New Conversation' && content.trim()) {
              conv.title = content.slice(0, 35);
            }
          }

          if (!state.messages) state.messages = [];
          state.messages.push({
            ...message,
            conversationId: sessionId
          });

          // Prune excessive messages per session to keep sliding window healthy (> 60)
          const sessionMsgs = state.messages.filter((m) => m.conversationId === sessionId);
          if (sessionMsgs.length > 60) {
            const excess = sessionMsgs.length - 60;
            let removed = 0;
            state.messages = state.messages.filter((m) => {
              if (m.conversationId === sessionId && removed < excess) {
                removed++;
                return false;
              }
              return true;
            });
          }
        });

        return message;
      },

      getSessionMessages: async (sessionId: string, limit?: number): Promise<ConversationMessage[]> => {
        const state = this.store.getState();
        const msgs: ConversationMessage[] = (state.messages || [])
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
        return this.store.mutate((state) => {
          const prevConvs = (state.conversations || []).length;
          state.messages = (state.messages || []).filter((m) => m.conversationId !== sessionId);
          state.conversations = (state.conversations || []).filter((c) => c.id !== sessionId);
          return (state.conversations || []).length < prevConvs;
        });
      },

      getActiveSessionCount: async (): Promise<number> => {
        return (this.store.getState().conversations || []).length;
      }
    };


    // 4. Knowledge Repository
    this.knowledge = {
      getSpaceById: async (id: string, workspaceId?: string): Promise<KnowledgeSpaceRecord | null> => {
        const space = this.store.getState().knowledgeSpaces.find((s) => s.id === id && (!workspaceId || s.workspaceId === workspaceId));
        return space ? { ...space } : null;
      },
      listSpaces: async (workspaceId?: string): Promise<KnowledgeSpaceRecord[]> => {
        return this.store.getState().knowledgeSpaces.filter((s) => !workspaceId || s.workspaceId === workspaceId).map((s) => ({ ...s }));
      },
      createSpace: async (space: Omit<KnowledgeSpaceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSpaceRecord> => {
        const now = new Date().toISOString();
        const record: KnowledgeSpaceRecord = {
          ...space,
          createdAt: now,
          updatedAt: now
        };
        this.store.mutate((state) => {
          state.knowledgeSpaces.push(record);
        });
        return { ...record };
      },
      updateSpace: async (id: string, updates: Partial<Omit<KnowledgeSpaceRecord, 'id' | 'workspaceId' | 'createdAt'>>, workspaceId?: string): Promise<KnowledgeSpaceRecord | null> => {
        return this.store.mutate((state) => {
          const index = state.knowledgeSpaces.findIndex((s) => s.id === id && (!workspaceId || s.workspaceId === workspaceId));
          if (index === -1) return null;
          state.knowledgeSpaces[index] = {
            ...state.knowledgeSpaces[index],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          return { ...state.knowledgeSpaces[index] };
        });
      },
      deleteSpace: async (id: string, workspaceId?: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.knowledgeSpaces.length;
          state.knowledgeSpaces = state.knowledgeSpaces.filter((s) => !(s.id === id && (!workspaceId || s.workspaceId === workspaceId)));
          const deletedSourceIds = new Set(state.knowledgeSources.filter((src) => src.knowledgeSpaceId === id).map((s) => s.id));
          state.knowledgeSources = state.knowledgeSources.filter((src) => src.knowledgeSpaceId !== id);
          state.knowledgeChunks = (state.knowledgeChunks || []).filter((c) => c.knowledgeSpaceId !== id && !deletedSourceIds.has(c.sourceId));
          return state.knowledgeSpaces.length < prev;
        });
      },
      getSourceById: async (id: string): Promise<KnowledgeSourceRecord | null> => {
        const src = this.store.getState().knowledgeSources.find((s) => s.id === id);
        return src ? { ...src } : null;
      },
      getSourceByHash: async (contentHash: string, spaceId?: string): Promise<KnowledgeSourceRecord | null> => {
        const src = this.store.getState().knowledgeSources.find((s) => s.contentHash === contentHash && (!spaceId || s.knowledgeSpaceId === spaceId));
        return src ? { ...src } : null;
      },
      listSourcesForSpace: async (spaceId: string, workspaceId?: string): Promise<KnowledgeSourceRecord[]> => {
        return this.store.getState().knowledgeSources.filter((s) => s.knowledgeSpaceId === spaceId && (!workspaceId || s.workspaceId === workspaceId)).map((s) => ({ ...s }));
      },
      createSource: async (source: Omit<KnowledgeSourceRecord, 'createdAt' | 'updatedAt'>): Promise<KnowledgeSourceRecord> => {
        const now = new Date().toISOString();
        const record: KnowledgeSourceRecord = {
          ...source,
          createdAt: now,
          updatedAt: now
        };
        this.store.mutate((state) => {
          state.knowledgeSources.push(record);
          const space = state.knowledgeSpaces.find((s) => s.id === source.knowledgeSpaceId);
          if (space) space.updatedAt = now;
        });
        return { ...record };
      },
      updateSource: async (id: string, updates: Partial<Omit<KnowledgeSourceRecord, 'id' | 'createdAt'>>): Promise<KnowledgeSourceRecord | null> => {
        return this.store.mutate((state) => {
          const index = state.knowledgeSources.findIndex((s) => s.id === id);
          if (index === -1) return null;
          state.knowledgeSources[index] = {
            ...state.knowledgeSources[index],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          return { ...state.knowledgeSources[index] };
        });
      },
      updateSourceStatus: async (id: string, status: KnowledgeSourceRecord['status'], errorMessage?: string): Promise<KnowledgeSourceRecord | null> => {
        return this.store.mutate((state) => {
          const index = state.knowledgeSources.findIndex((s) => s.id === id);
          if (index === -1) return null;
          state.knowledgeSources[index] = {
            ...state.knowledgeSources[index],
            status,
            ingestionStatus: status,
            errorMessage,
            updatedAt: new Date().toISOString()
          };
          return { ...state.knowledgeSources[index] };
        });
      },
      deleteSource: async (id: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.knowledgeSources.length;
          state.knowledgeSources = state.knowledgeSources.filter((s) => s.id !== id);
          state.knowledgeChunks = (state.knowledgeChunks || []).filter((c) => c.sourceId !== id);
          return state.knowledgeSources.length < prev;
        });
      },
      upsertChunks: async (chunks: import('./types.ts').KnowledgeChunkRecord[]): Promise<void> => {
        if (!chunks || chunks.length === 0) return;
        this.store.mutate((state) => {
          if (!state.knowledgeChunks) {
            state.knowledgeChunks = [];
          }
          const chunkMap = new Map(state.knowledgeChunks.map((c) => [c.id, c]));
          for (const chunk of chunks) {
            chunkMap.set(chunk.id, chunk);
          }
          state.knowledgeChunks = Array.from(chunkMap.values());
        });
      },
      getChunksForSource: async (sourceId: string): Promise<import('./types.ts').KnowledgeChunkRecord[]> => {
        const chunks = (this.store.getState().knowledgeChunks || []).filter((c) => c.sourceId === sourceId);
        return chunks.map((c) => ({ ...c }));
      },
      getChunksForSpace: async (spaceId: string, workspaceId?: string): Promise<import('./types.ts').KnowledgeChunkRecord[]> => {
        const chunks = (this.store.getState().knowledgeChunks || []).filter(
          (c) => (!spaceId || c.knowledgeSpaceId === spaceId) && (!workspaceId || c.workspaceId === workspaceId)
        );
        return chunks.map((c) => ({ ...c }));
      },
      deleteChunksBySourceId: async (sourceId: string): Promise<number> => {
        return this.store.mutate((state) => {
          const prev = (state.knowledgeChunks || []).length;
          state.knowledgeChunks = (state.knowledgeChunks || []).filter((c) => c.sourceId !== sourceId);
          return prev - state.knowledgeChunks.length;
        });
      },
      deleteChunksBySpaceId: async (spaceId: string): Promise<number> => {
        return this.store.mutate((state) => {
          const prev = (state.knowledgeChunks || []).length;
          state.knowledgeChunks = (state.knowledgeChunks || []).filter((c) => c.knowledgeSpaceId !== spaceId);
          return prev - state.knowledgeChunks.length;
        });
      },
      queryGrounded: async (spaceId: string, query: string, workspaceId?: string): Promise<GroundedQueryResponse> => {
        const space = this.store.getState().knowledgeSpaces.find((s) => s.id === spaceId && (!workspaceId || s.workspaceId === workspaceId));
        const spaceTitle = space?.name || 'Knowledge Space';
        const sources = this.store.getState().knowledgeSources.filter((s) => s.knowledgeSpaceId === spaceId);

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

    // 5. Education Repository
    this.education = {
      getClassById: async (id: string): Promise<EducationClass | null> => {
        const cls = this.store.getState().classes.find((c) => c.id === id);
        return cls ? { ...cls } : null;
      },
      listClasses: async (): Promise<EducationClass[]> => {
        return this.store.getState().classes.map((c) => ({ ...c }));
      },
      createClass: async (cls: EducationClass): Promise<EducationClass> => {
        this.store.mutate((state) => {
          state.classes.push(cls);
        });
        return { ...cls };
      },
      updateClass: async (id: string, updates: Partial<EducationClass>): Promise<EducationClass | null> => {
        return this.store.mutate((state) => {
          const index = state.classes.findIndex((c) => c.id === id);
          if (index === -1) return null;
          state.classes[index] = {
            ...state.classes[index],
            ...updates
          };
          return { ...state.classes[index] };
        });
      },
      deleteClass: async (id: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          const prev = state.classes.length;
          state.classes = state.classes.filter((c) => c.id !== id);
          return state.classes.length < prev;
        });
      },
      getAssignmentById: async (id: string): Promise<Assignment | null> => {
        const asg = this.store.getState().assignments.find((a) => a.id === id);
        return asg ? { ...asg } : null;
      },
      listAssignments: async (classId?: string): Promise<Assignment[]> => {
        return this.store.getState().assignments.filter((a) => !classId || a.classId === classId).map((a) => ({ ...a }));
      },
      createAssignment: async (asg: Omit<Assignment, 'id' | 'assignedDate' | 'totalEnrolled' | 'submittedCount' | 'gradedCount'>): Promise<Assignment> => {
        const cls = this.store.getState().classes.find((c) => c.id === asg.classId);
        const record: Assignment = {
          ...asg,
          id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          className: cls?.name ? `${cls.code}: ${cls.name}` : asg.className,
          assignedDate: new Date().toISOString().split('T')[0],
          totalEnrolled: cls?.studentCount || 1,
          submittedCount: 0,
          gradedCount: 0
        };

        this.store.mutate((state) => {
          state.assignments.push(record);
          if (cls) cls.assignmentsCount = (cls.assignmentsCount || 0) + 1;
        });

        return { ...record };
      },
      updateAssignment: async (id: string, updates: Partial<Assignment>): Promise<Assignment | null> => {
        return this.store.mutate((state) => {
          const index = state.assignments.findIndex((a) => a.id === id);
          if (index === -1) return null;
          state.assignments[index] = {
            ...state.assignments[index],
            ...updates
          };
          return { ...state.assignments[index] };
        });
      },
      getSubmissionById: async (id: string): Promise<StudentSubmission | null> => {
        const sub = this.store.getState().submissions.find((s) => s.id === id);
        return sub ? { ...sub } : null;
      },
      listSubmissions: async (studentId?: string, assignmentId?: string): Promise<StudentSubmission[]> => {
        return this.store.getState().submissions
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
        const asg = this.store.getState().assignments.find((a) => a.id === sub.assignmentId);
        const now = new Date().toISOString();

        return this.store.mutate((state) => {
          const existingIdx = state.submissions.findIndex((s) => s.assignmentId === sub.assignmentId && s.studentId === sub.studentId);
          if (existingIdx >= 0) {
            state.submissions[existingIdx] = {
              ...state.submissions[existingIdx],
              content: sub.content,
              attachments: sub.attachments || state.submissions[existingIdx].attachments,
              submittedAt: now,
              status: state.submissions[existingIdx].status === 'graded' ? 'graded' : 'submitted'
            };
            return { ...state.submissions[existingIdx] };
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

          state.submissions.push(record);
          if (asg) {
            asg.submittedCount = (asg.submittedCount || 0) + 1;
          }

          return { ...record };
        });
      },
      gradeSubmission: async (submissionId: string, grade: number, feedback: string): Promise<StudentSubmission | null> => {
        return this.store.mutate((state) => {
          const sub = state.submissions.find((s) => s.id === submissionId);
          if (!sub) return null;
          const wasGraded = sub.status === 'graded';
          sub.grade = grade;
          sub.feedback = feedback;
          sub.status = 'graded';
          sub.gradedAt = new Date().toISOString();

          if (!wasGraded) {
            const asg = state.assignments.find((a) => a.id === sub.assignmentId);
            if (asg) asg.gradedCount = (asg.gradedCount || 0) + 1;
          }

          return { ...sub };
        });
      },

      toggleLessonCompletion: async (classId: string, unitId: string, lessonId: string, isCompleted: boolean): Promise<boolean> => {
        return this.store.mutate((state) => {
          const c = state.classes.find((item) => item.id === classId);
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
        });
      },

      addUnitToCourse: async (classId: string, unit: Omit<CourseUnit, 'id'>): Promise<CourseUnit> => {
        const newUnitId = `unit-${classId}-${Date.now().toString(36)}`;
        const newUnit: CourseUnit = {
          ...unit,
          id: newUnitId,
          courseId: classId,
          lessons: unit.lessons || []
        };
        this.store.mutate((state) => {
          const c = state.classes.find((item) => item.id === classId);
          if (c) {
            if (!c.units || c.units.length === 0) {
              c.units = JSON.parse(JSON.stringify(DEFAULT_COURSE_UNITS[classId] || []));
            }
            const units = c.units || [];
            units.push(newUnit);
            c.units = units;
          }
        });
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
        this.store.mutate((state) => {
          const c = state.classes.find((item) => item.id === classId);
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
        });
        return newLesson;
      },

      createLearningLink: async (link: LearningLink): Promise<LearningLink> => {
        this.store.mutate((state) => {
          if (!state.learningLinks) state.learningLinks = [];
          state.learningLinks.push({ ...link });
        });
        return { ...link };
      },

      deleteLearningLink: async (id: string): Promise<boolean> => {
        return this.store.mutate((state) => {
          if (!Array.isArray(state.learningLinks)) return false;
          const prev = state.learningLinks.length;
          state.learningLinks = state.learningLinks.filter((l) => l.id !== id);
          return state.learningLinks.length < prev;
        });
      },

      listLearningLinks: async (filter?: { entityId?: string; entityType?: string }): Promise<LearningLink[]> => {
        const links = this.store.getState().learningLinks || [];
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
        this.store.mutate((state) => {
          state.auditEvents.push(record);
          // Keep last 500 audit events
          if (state.auditEvents.length > 500) {
            state.auditEvents = state.auditEvents.slice(-500);
          }
        });
        return { ...record };
      },
      listRecentEvents: async (limit: number = 50, workspaceId?: string): Promise<ToolAuditEvent[]> => {
        const events = this.store.getState().auditEvents.filter((e) => !workspaceId || e.workspaceId === workspaceId);
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return events.slice(0, limit).map((e) => ({ ...e }));
      }
    };

    // 7. Research Sub-Repository (Milestone 9)
    this.research = {
      // Projects
      getProjectById: async (id: string, workspaceId?: string): Promise<ResearchProject | null> => {
        const p = (this.store.getState().researchProjects || []).find(
          (proj) => proj.id === id && (!workspaceId || proj.workspaceId === workspaceId)
        );
        return p ? { ...p } : null;
      },
      listProjects: async (workspaceId?: string, status?: ResearchProjectStatus): Promise<ResearchProject[]> => {
        return (this.store.getState().researchProjects || [])
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
        this.store.mutate((state) => {
          if (!state.researchProjects) state.researchProjects = [];
          state.researchProjects.push(record);
        });
        return { ...record };
      },
      updateProject: async (
        id: string,
        updates: Partial<Omit<ResearchProject, 'id' | 'workspaceId' | 'createdAt'>>,
        workspaceId?: string
      ): Promise<ResearchProject | null> => {
        let updated: ResearchProject | null = null;
        this.store.mutate((state) => {
          if (!state.researchProjects) return;
          const idx = state.researchProjects.findIndex(
            (p) => p.id === id && (!workspaceId || p.workspaceId === workspaceId)
          );
          if (idx !== -1) {
            state.researchProjects[idx] = {
              ...state.researchProjects[idx],
              ...updates,
              updatedAt: new Date().toISOString()
            };
            updated = { ...state.researchProjects[idx] };
          }
        });
        return updated;
      },
      deleteProject: async (id: string, workspaceId?: string): Promise<boolean> => {
        let found = false;
        this.store.mutate((state) => {
          if (!state.researchProjects) return;
          const initialLen = state.researchProjects.length;
          state.researchProjects = state.researchProjects.filter(
            (p) => !(p.id === id && (!workspaceId || p.workspaceId === workspaceId))
          );
          found = state.researchProjects.length < initialLen;
          if (found) {
            if (state.researchQuestions) state.researchQuestions = state.researchQuestions.filter((q) => q.projectId !== id);
            if (state.evidenceRecords) state.evidenceRecords = state.evidenceRecords.filter((e) => e.projectId !== id);
            if (state.researchNotes) state.researchNotes = state.researchNotes.filter((n) => n.projectId !== id);
            if (state.researchReports) state.researchReports = state.researchReports.filter((r) => r.projectId !== id);
          }
        });
        return found;
      },

      // Questions
      getQuestionById: async (id: string, projectId?: string): Promise<ResearchQuestion | null> => {
        const q = (this.store.getState().researchQuestions || []).find(
          (item) => item.id === id && (!projectId || item.projectId === projectId)
        );
        return q ? { ...q } : null;
      },
      listQuestions: async (projectId: string, workspaceId?: string): Promise<ResearchQuestion[]> => {
        return (this.store.getState().researchQuestions || [])
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
        this.store.mutate((state) => {
          if (!state.researchQuestions) state.researchQuestions = [];
          state.researchQuestions.push(record);
        });
        return { ...record };
      },
      updateQuestion: async (
        id: string,
        updates: Partial<Omit<ResearchQuestion, 'id' | 'projectId' | 'workspaceId' | 'createdAt'>>
      ): Promise<ResearchQuestion | null> => {
        let updated: ResearchQuestion | null = null;
        this.store.mutate((state) => {
          if (!state.researchQuestions) return;
          const idx = state.researchQuestions.findIndex((q) => q.id === id);
          if (idx !== -1) {
            state.researchQuestions[idx] = {
              ...state.researchQuestions[idx],
              ...updates,
              updatedAt: new Date().toISOString()
            };
            updated = { ...state.researchQuestions[idx] };
          }
        });
        return updated;
      },
      deleteQuestion: async (id: string): Promise<boolean> => {
        let found = false;
        this.store.mutate((state) => {
          if (!state.researchQuestions) return;
          const prevLen = state.researchQuestions.length;
          state.researchQuestions = state.researchQuestions.filter((q) => q.id !== id);
          found = state.researchQuestions.length < prevLen;
        });
        return found;
      },

      // Evidence
      getEvidenceById: async (id: string): Promise<EvidenceRecord | null> => {
        const e = (this.store.getState().evidenceRecords || []).find((item) => item.id === id);
        return e ? { ...e } : null;
      },
      listEvidence: async (projectId: string, questionId?: string): Promise<EvidenceRecord[]> => {
        return (this.store.getState().evidenceRecords || [])
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
        this.store.mutate((state) => {
          if (!state.evidenceRecords) state.evidenceRecords = [];
          state.evidenceRecords.push(record);
          if (record.questionId && state.researchQuestions) {
            const q = state.researchQuestions.find((item) => item.id === record.questionId);
            if (q && !q.linkedEvidenceIds.includes(record.id)) {
              q.linkedEvidenceIds.push(record.id);
            }
          }
        });
        return { ...record };
      },
      deleteEvidence: async (id: string): Promise<boolean> => {
        let found = false;
        this.store.mutate((state) => {
          if (!state.evidenceRecords) return;
          const prevLen = state.evidenceRecords.length;
          state.evidenceRecords = state.evidenceRecords.filter((e) => e.id !== id);
          found = state.evidenceRecords.length < prevLen;
          if (found && state.researchQuestions) {
            for (const q of state.researchQuestions) {
              q.linkedEvidenceIds = q.linkedEvidenceIds.filter((evId) => evId !== id);
            }
          }
        });
        return found;
      },

      // Notes
      getNoteById: async (id: string): Promise<ResearchNote | null> => {
        const n = (this.store.getState().researchNotes || []).find((item) => item.id === id);
        return n ? { ...n } : null;
      },
      listNotes: async (projectId: string): Promise<ResearchNote[]> => {
        return (this.store.getState().researchNotes || [])
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
        this.store.mutate((state) => {
          if (!state.researchNotes) state.researchNotes = [];
          state.researchNotes.push(record);
        });
        return { ...record };
      },
      updateNote: async (
        id: string,
        updates: Partial<Omit<ResearchNote, 'id' | 'projectId' | 'workspaceId' | 'createdAt'>>
      ): Promise<ResearchNote | null> => {
        let updated: ResearchNote | null = null;
        this.store.mutate((state) => {
          if (!state.researchNotes) return;
          const idx = state.researchNotes.findIndex((n) => n.id === id);
          if (idx !== -1) {
            state.researchNotes[idx] = {
              ...state.researchNotes[idx],
              ...updates,
              updatedAt: new Date().toISOString()
            };
            updated = { ...state.researchNotes[idx] };
          }
        });
        return updated;
      },
      deleteNote: async (id: string): Promise<boolean> => {
        let found = false;
        this.store.mutate((state) => {
          if (!state.researchNotes) return;
          const prevLen = state.researchNotes.length;
          state.researchNotes = state.researchNotes.filter((n) => n.id !== id);
          found = state.researchNotes.length < prevLen;
        });
        return found;
      },

      // Reports
      getReportById: async (id: string): Promise<ResearchReport | null> => {
        const r = (this.store.getState().researchReports || []).find((item) => item.id === id);
        return r ? { ...r } : null;
      },
      listReports: async (projectId: string): Promise<ResearchReport[]> => {
        return (this.store.getState().researchReports || [])
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
        this.store.mutate((state) => {
          if (!state.researchReports) state.researchReports = [];
          state.researchReports.push(record);
        });
        return { ...record };
      },
      deleteReport: async (id: string): Promise<boolean> => {
        let found = false;
        this.store.mutate((state) => {
          if (!state.researchReports) return;
          const prevLen = state.researchReports.length;
          state.researchReports = state.researchReports.filter((r) => r.id !== id);
          found = state.researchReports.length < prevLen;
        });
        return found;
      }
    };

    // 8. Files Sub-Repository (Milestone 10)
    this.files = {
      getById: async (id: string, workspaceId?: string): Promise<FileRecord | null> => {
        const f = this.store.getState().files?.find((file) => file.id === id && (!workspaceId || file.workspaceId === workspaceId));
        return f ? { ...f } : null;
      },
      getByStorageKey: async (storageKey: string): Promise<FileRecord | null> => {
        const f = this.store.getState().files?.find((file) => file.storageKey === storageKey);
        return f ? { ...f } : null;
      },
      list: async (filter?: FileListFilter): Promise<FileRecord[]> => {
        let all = (this.store.getState().files || []).map((f) => ({ ...f }));
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
        this.store.mutate((st) => {
          if (!st.files) st.files = [];
          st.files.push(record);
        });
        return { ...record };
      },
      update: async (
        id: string,
        updates: Partial<Omit<FileRecord, 'id' | 'workspaceId' | 'createdAt'>>,
        workspaceId?: string
      ): Promise<FileRecord | null> => {
        return this.store.mutate((st) => {
          if (!st.files) return null;
          const idx = st.files.findIndex((f) => f.id === id && (!workspaceId || f.workspaceId === workspaceId));
          if (idx === -1) return null;
          st.files[idx] = {
            ...st.files[idx],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          return { ...st.files[idx] };
        });
      },
      delete: async (id: string, workspaceId?: string): Promise<boolean> => {
        return this.store.mutate((st) => {
          if (!st.files) return false;
          const prevLen = st.files.length;
          st.files = st.files.filter((f) => !(f.id === id && (!workspaceId || f.workspaceId === workspaceId)));
          return st.files.length < prevLen;
        });
      },
      findBySha256: async (sha256: string, workspaceId: string): Promise<FileRecord | null> => {
        const f = this.store.getState().files?.find((file) => file.sha256 === sha256 && file.workspaceId === workspaceId && file.status !== 'deleted');
        return f ? { ...f } : null;
      },
      incrementDownloadCount: async (id: string): Promise<void> => {
        this.store.mutate((st) => {
          if (!st.files) return;
          const file = st.files.find((f) => f.id === id);
          if (file) {
            file.downloadCount = (file.downloadCount || 0) + 1;
            file.updatedAt = new Date().toISOString();
          }
        });
      }
    };

    this.classroom = {
      getSessionById: async (id: string, workspaceId?: string): Promise<ClassroomSession | null> => {
        const state = this.store.getState();
        const session = (state.classroomSessions || []).find(
          (s) => (s.id === id || s.sessionId === id) && (!workspaceId || s.workspaceId === workspaceId)
        );
        return session ? JSON.parse(JSON.stringify(session)) : null;
      },

      getActiveSessionForClass: async (classId: string, workspaceId?: string): Promise<ClassroomSession | null> => {
        const state = this.store.getState();
        const activeSessions = (state.classroomSessions || []).filter(
          (s) => s.classId === classId && (s.status === 'live' || s.status === 'paused') && (!workspaceId || s.workspaceId === workspaceId)
        );
        if (activeSessions.length === 0) return null;
        const live = activeSessions.slice().reverse().find((s) => s.status === 'live');
        const session = live || activeSessions[activeSessions.length - 1];
        return session ? JSON.parse(JSON.stringify(session)) : null;
      },

      listSessions: async (classId?: string, workspaceId?: string, status?: ClassroomSessionStatus): Promise<ClassroomSession[]> => {
        const state = this.store.getState();
        return (state.classroomSessions || [])
          .filter((s) => {
            if (classId && s.classId !== classId) return false;
            if (workspaceId && s.workspaceId !== workspaceId) return false;
            if (status && s.status !== status) return false;
            return true;
          })
          .map((s) => JSON.parse(JSON.stringify(s)));
      },

      createSession: async (input: CreateClassroomSessionInput): Promise<ClassroomSession> => {
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

        this.store.mutate((st) => {
          if (!st.classroomSessions) st.classroomSessions = [];
          st.classroomSessions.push(JSON.parse(JSON.stringify(session)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(session));
      },

      updateSession: async (id: string, updates: Partial<ClassroomSession>, workspaceId?: string): Promise<ClassroomSession | null> => {
        let updated: ClassroomSession | null = null;
        this.store.mutate((st) => {
          if (!st.classroomSessions) st.classroomSessions = [];
          const idx = st.classroomSessions.findIndex(
            (s) => (s.id === id || s.sessionId === id) && (!workspaceId || s.workspaceId === workspaceId)
          );
          if (idx !== -1) {
            st.classroomSessions[idx] = {
              ...st.classroomSessions[idx],
              ...updates,
              updatedAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.classroomSessions[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },

      deleteSession: async (id: string, workspaceId?: string): Promise<boolean> => {
        let deleted = false;
        this.store.mutate((st) => {
          if (!st.classroomSessions) return;
          const prev = st.classroomSessions.length;
          st.classroomSessions = st.classroomSessions.filter(
            (s) => !((s.id === id || s.sessionId === id) && (!workspaceId || s.workspaceId === workspaceId))
          );
          deleted = st.classroomSessions.length < prev;
        });
        if (deleted) await this.store.flush();
        return deleted;
      },

      upsertParticipant: async (participant: ClassroomParticipant): Promise<ClassroomParticipant> => {
        let result: ClassroomParticipant;
        const compositeId = participant.id || `${participant.sessionId}:${participant.studentId}`;
        const record = { ...participant, id: compositeId };

        this.store.mutate((st) => {
          if (!st.classroomParticipants) st.classroomParticipants = [];
          const idx = st.classroomParticipants.findIndex(
            (p) => p.sessionId === participant.sessionId && p.studentId === participant.studentId
          );
          if (idx !== -1) {
            st.classroomParticipants[idx] = {
              ...st.classroomParticipants[idx],
              ...record,
              joinedAt: st.classroomParticipants[idx].joinedAt || record.joinedAt
            };
            result = JSON.parse(JSON.stringify(st.classroomParticipants[idx]));
          } else {
            st.classroomParticipants.push(JSON.parse(JSON.stringify(record)));
            result = JSON.parse(JSON.stringify(record));
          }
        });
        await this.store.flush();
        return result!;
      },

      getParticipant: async (sessionId: string, studentId: string): Promise<ClassroomParticipant | null> => {
        const state = this.store.getState();
        const p = (state.classroomParticipants || []).find(
          (item) => item.sessionId === sessionId && item.studentId === studentId
        );
        return p ? JSON.parse(JSON.stringify(p)) : null;
      },

      listParticipants: async (sessionId: string, onlyConnected?: boolean): Promise<ClassroomParticipant[]> => {
        const state = this.store.getState();
        return (state.classroomParticipants || [])
          .filter((p) => p.sessionId === sessionId && (!onlyConnected || p.connectionStatus === 'connected'))
          .map((p) => JSON.parse(JSON.stringify(p)));
      },

      updateParticipantStatus: async (
        sessionId: string,
        studentId: string,
        status: ParticipantConnectionStatus
      ): Promise<ClassroomParticipant | null> => {
        let updated: ClassroomParticipant | null = null;
        this.store.mutate((st) => {
          if (!st.classroomParticipants) return;
          const idx = st.classroomParticipants.findIndex(
            (p) => p.sessionId === sessionId && p.studentId === studentId
          );
          if (idx !== -1) {
            st.classroomParticipants[idx] = {
              ...st.classroomParticipants[idx],
              connectionStatus: status,
              lastSeenAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.classroomParticipants[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },

      removeParticipant: async (sessionId: string, studentId: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.classroomParticipants) return;
          const prev = st.classroomParticipants.length;
          st.classroomParticipants = st.classroomParticipants.filter(
            (p) => !(p.sessionId === sessionId && p.studentId === studentId)
          );
          removed = st.classroomParticipants.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      }
    };
  }

  get quizzes(): IQuizRepository {
    return {
      getQuizById: async (id: string, workspaceId?: string): Promise<Quiz | null> => {
        const state = this.store.getState();
        const q = (state.quizzes || []).find(
          (item) => (item.id === id || item.quizId === id) && (!workspaceId || item.workspaceId === workspaceId)
        );
        return q ? JSON.parse(JSON.stringify(q)) : null;
      },

      listQuizzes: async (filter?: {
        classId?: string;
        sessionId?: string;
        workspaceId?: string;
        status?: QuizStatus;
      }): Promise<Quiz[]> => {
        const state = this.store.getState();
        return (state.quizzes || [])
          .filter((q) => {
            if (filter?.classId && q.classId !== filter.classId) return false;
            if (filter?.sessionId && q.classroomSessionId !== filter.sessionId) return false;
            if (filter?.workspaceId && q.workspaceId !== filter.workspaceId) return false;
            if (filter?.status && q.status !== filter.status) return false;
            return true;
          })
          .map((q) => JSON.parse(JSON.stringify(q)));
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

        this.store.mutate((st) => {
          if (!st.quizzes) st.quizzes = [];
          st.quizzes.push(JSON.parse(JSON.stringify(quiz)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(quiz));
      },

      updateQuiz: async (id: string, updates: Partial<Quiz>, workspaceId?: string): Promise<Quiz | null> => {
        let updated: Quiz | null = null;
        this.store.mutate((st) => {
          if (!st.quizzes) st.quizzes = [];
          const idx = st.quizzes.findIndex(
            (q) => (q.id === id || q.quizId === id) && (!workspaceId || q.workspaceId === workspaceId)
          );
          if (idx !== -1) {
            st.quizzes[idx] = {
              ...st.quizzes[idx],
              ...updates,
              id: st.quizzes[idx].id,
              quizId: st.quizzes[idx].quizId
            };
            updated = JSON.parse(JSON.stringify(st.quizzes[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },

      deleteQuiz: async (id: string, workspaceId?: string): Promise<boolean> => {
        let deleted = false;
        this.store.mutate((st) => {
          if (!st.quizzes) return;
          const prev = st.quizzes.length;
          st.quizzes = st.quizzes.filter(
            (q) => !((q.id === id || q.quizId === id) && (!workspaceId || q.workspaceId === workspaceId))
          );
          deleted = st.quizzes.length < prev;
          if (deleted) {
            st.quizQuestions = (st.quizQuestions || []).filter((q) => q.quizId !== id);
            st.quizResponses = (st.quizResponses || []).filter((r) => r.quizId !== id);
            st.quizParticipantStates = (st.quizParticipantStates || []).filter((p) => p.quizId !== id);
          }
        });
        if (deleted) await this.store.flush();
        return deleted;
      },

      getQuestionById: async (questionId: string, quizId?: string): Promise<QuizQuestion | null> => {
        const state = this.store.getState();
        const q = (state.quizQuestions || []).find(
          (item) => (item.id === questionId || item.questionId === questionId) && (!quizId || item.quizId === quizId)
        );
        return q ? JSON.parse(JSON.stringify(q)) : null;
      },

      listQuestions: async (quizId: string): Promise<QuizQuestion[]> => {
        const state = this.store.getState();
        return (state.quizQuestions || [])
          .filter((q) => q.quizId === quizId)
          .sort((a, b) => a.order - b.order)
          .map((q) => JSON.parse(JSON.stringify(q)));
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
        const id = input.id || `qq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        let question: QuizQuestion;

        this.store.mutate((st) => {
          if (!st.quizQuestions) st.quizQuestions = [];
          const existing = st.quizQuestions.filter((q) => q.quizId === input.quizId);
          const order = input.order !== undefined ? input.order : existing.length;

          question = {
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
          st.quizQuestions.push(JSON.parse(JSON.stringify(question)));

          // Update quiz totalQuestions count
          if (!st.quizzes) st.quizzes = [];
          const quizIdx = st.quizzes.findIndex((q) => q.id === input.quizId || q.quizId === input.quizId);
          if (quizIdx !== -1) {
            st.quizzes[quizIdx].totalQuestions = st.quizQuestions.filter((q) => q.quizId === input.quizId).length;
          }
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(question!));
      },

      updateQuestion: async (questionId: string, updates: Partial<QuizQuestion>, quizId?: string): Promise<QuizQuestion | null> => {
        let updated: QuizQuestion | null = null;
        this.store.mutate((st) => {
          if (!st.quizQuestions) return;
          const idx = st.quizQuestions.findIndex(
            (q) => (q.id === questionId || q.questionId === questionId) && (!quizId || q.quizId === quizId)
          );
          if (idx !== -1) {
            st.quizQuestions[idx] = {
              ...st.quizQuestions[idx],
              ...updates,
              id: st.quizQuestions[idx].id,
              questionId: st.quizQuestions[idx].questionId,
              quizId: st.quizQuestions[idx].quizId
            };
            updated = JSON.parse(JSON.stringify(st.quizQuestions[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },

      removeQuestion: async (questionId: string, quizId?: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.quizQuestions) return;
          const prev = st.quizQuestions.length;
          const target = st.quizQuestions.find(
            (q) => (q.id === questionId || q.questionId === questionId) && (!quizId || q.quizId === quizId)
          );
          if (!target) return;
          const qQuizId = target.quizId;

          st.quizQuestions = st.quizQuestions.filter((q) => !(q.id === target.id));
          removed = st.quizQuestions.length < prev;

          if (removed && qQuizId) {
            const remaining = st.quizQuestions.filter((q) => q.quizId === qQuizId).sort((a, b) => a.order - b.order);
            remaining.forEach((q, idx) => {
              q.order = idx;
            });
            const quizIdx = (st.quizzes || []).findIndex((q) => q.id === qQuizId || q.quizId === qQuizId);
            if (quizIdx !== -1 && st.quizzes) {
              st.quizzes[quizIdx].totalQuestions = remaining.length;
            }
          }
        });
        if (removed) await this.store.flush();
        return removed;
      },

      saveResponse: async (response: QuizResponse): Promise<QuizResponse> => {
        const id = response.id || response.responseId || `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const record: QuizResponse = {
          ...response,
          id,
          responseId: id
        };

        this.store.mutate((st) => {
          if (!st.quizResponses) st.quizResponses = [];
          const idx = st.quizResponses.findIndex(
            (r) => r.quizId === response.quizId && r.questionId === response.questionId && r.studentId === response.studentId
          );
          if (idx !== -1) {
            st.quizResponses[idx] = JSON.parse(JSON.stringify(record));
          } else {
            st.quizResponses.push(JSON.parse(JSON.stringify(record)));
          }
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },

      getResponse: async (quizId: string, questionId: string, studentId: string): Promise<QuizResponse | null> => {
        const state = this.store.getState();
        const r = (state.quizResponses || []).find(
          (item) => item.quizId === quizId && item.questionId === questionId && item.studentId === studentId
        );
        return r ? JSON.parse(JSON.stringify(r)) : null;
      },

      listResponses: async (quizId: string, questionId?: string): Promise<QuizResponse[]> => {
        const state = this.store.getState();
        return (state.quizResponses || [])
          .filter((r) => r.quizId === quizId && (!questionId || r.questionId === questionId))
          .map((r) => JSON.parse(JSON.stringify(r)));
      },

      upsertParticipantState: async (pState: QuizParticipantState): Promise<QuizParticipantState> => {
        const id = pState.id || `${pState.quizId}:${pState.studentId}`;
        const record: QuizParticipantState = { ...pState, id };

        this.store.mutate((st) => {
          if (!st.quizParticipantStates) st.quizParticipantStates = [];
          const idx = st.quizParticipantStates.findIndex(
            (p) => p.quizId === pState.quizId && p.studentId === pState.studentId
          );
          if (idx !== -1) {
            st.quizParticipantStates[idx] = {
              ...st.quizParticipantStates[idx],
              ...record
            };
          } else {
            st.quizParticipantStates.push(JSON.parse(JSON.stringify(record)));
          }
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },

      getParticipantState: async (quizId: string, studentId: string): Promise<QuizParticipantState | null> => {
        const state = this.store.getState();
        const p = (state.quizParticipantStates || []).find(
          (item) => item.quizId === quizId && item.studentId === studentId
        );
        return p ? JSON.parse(JSON.stringify(p)) : null;
      },

      listParticipantStates: async (quizId: string): Promise<QuizParticipantState[]> => {
        const state = this.store.getState();
        return (state.quizParticipantStates || [])
          .filter((p) => p.quizId === quizId)
          .map((p) => JSON.parse(JSON.stringify(p)));
      }
    };
  }

  get videos(): IVideoRepository {
    return {
      getVideoById: async (id: string, workspaceId?: string): Promise<VideoRecord | null> => {
        const state = this.store.getState();
        const v = (state.videos || []).find(
          (item) => (item.id === id || item.videoId === id) && (!workspaceId || item.workspaceId === workspaceId)
        );
        return v ? JSON.parse(JSON.stringify(v)) : null;
      },

      listVideos: async (filter?: VideoListFilter): Promise<VideoRecord[]> => {
        const state = this.store.getState();
        return (state.videos || [])
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
          .map((v) => JSON.parse(JSON.stringify(v)));
      },

      createVideo: async (input: CreateVideoInput): Promise<VideoRecord> => {
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

        this.store.mutate((st) => {
          if (!st.videos) st.videos = [];
          st.videos.push(JSON.parse(JSON.stringify(video)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(video));
      },

      updateVideo: async (id: string, updates: UpdateVideoInput, workspaceId?: string): Promise<VideoRecord | null> => {
        let updated: VideoRecord | null = null;
        this.store.mutate((st) => {
          if (!st.videos) st.videos = [];
          const idx = st.videos.findIndex(
            (v) => (v.id === id || v.videoId === id) && (!workspaceId || v.workspaceId === workspaceId)
          );
          if (idx !== -1) {
            st.videos[idx] = {
              ...st.videos[idx],
              ...updates,
              id: st.videos[idx].id,
              videoId: st.videos[idx].videoId,
              updatedAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.videos[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },

      deleteVideo: async (id: string, workspaceId?: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.videos) return;
          const prev = st.videos.length;
          st.videos = st.videos.filter(
            (v) => !((v.id === id || v.videoId === id) && (!workspaceId || v.workspaceId === workspaceId))
          );
          removed = st.videos.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      }
    };
  }

  get personalIdentities(): IPersonalIdentityRepository {
    return {
      getById: async (userId: string): Promise<PersonalJarvisIdentity | null> => {
        const state = this.store.getState();
        const ident = (state.personalIdentities || []).find((i) => i.userId === userId);
        return ident ? JSON.parse(JSON.stringify(ident)) : null;
      },
      list: async (): Promise<PersonalJarvisIdentity[]> => {
        const state = this.store.getState();
        return (state.personalIdentities || []).map((i) => JSON.parse(JSON.stringify(i)));
      },
      create: async (identity: PersonalJarvisIdentity): Promise<PersonalJarvisIdentity> => {
        const record = JSON.parse(JSON.stringify(identity));
        this.store.mutate((st) => {
          if (!st.personalIdentities) st.personalIdentities = [];
          const idx = st.personalIdentities.findIndex((i) => i.userId === identity.userId);
          if (idx !== -1) {
            st.personalIdentities[idx] = record;
          } else {
            st.personalIdentities.push(record);
          }
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      update: async (userId: string, updates: Partial<PersonalJarvisIdentity>): Promise<PersonalJarvisIdentity | null> => {
        let updated: PersonalJarvisIdentity | null = null;
        this.store.mutate((st) => {
          if (!st.personalIdentities) st.personalIdentities = [];
          const idx = st.personalIdentities.findIndex((i) => i.userId === userId);
          if (idx !== -1) {
            st.personalIdentities[idx] = {
              ...st.personalIdentities[idx],
              ...updates,
              userId,
              updatedAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.personalIdentities[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      delete: async (userId: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.personalIdentities) return;
          const prev = st.personalIdentities.length;
          st.personalIdentities = st.personalIdentities.filter((i) => i.userId !== userId);
          removed = st.personalIdentities.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      },
      updateStats: async (userId: string, statsUpdates: Partial<PersonalJarvisIdentity['stats']>): Promise<PersonalJarvisIdentity | null> => {
        let updated: PersonalJarvisIdentity | null = null;
        this.store.mutate((st) => {
          if (!st.personalIdentities) st.personalIdentities = [];
          const idx = st.personalIdentities.findIndex((i) => i.userId === userId);
          if (idx !== -1) {
            st.personalIdentities[idx].stats = {
              ...st.personalIdentities[idx].stats,
              ...statsUpdates
            };
            st.personalIdentities[idx].updatedAt = new Date().toISOString();
            updated = JSON.parse(JSON.stringify(st.personalIdentities[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      setActiveContext: async (userId: string, contextId: string): Promise<PersonalJarvisIdentity | null> => {
        let updated: PersonalJarvisIdentity | null = null;
        this.store.mutate((st) => {
          if (!st.personalIdentities) st.personalIdentities = [];
          const idx = st.personalIdentities.findIndex((i) => i.userId === userId);
          if (idx !== -1) {
            const ident = st.personalIdentities[idx];
            ident.activeContextId = contextId;
            ident.contexts = (ident.contexts || []).map((c) => ({
              ...c,
              isActive: c.id === contextId
            }));
            ident.updatedAt = new Date().toISOString();
            updated = JSON.parse(JSON.stringify(ident));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      }
    };
  }

  get personalMemories(): IPersonalMemoryRepository {
    return {
      getById: async (id: string): Promise<PersonalMemoryItem | null> => {
        const state = this.store.getState();
        const mem = (state.personalMemories || []).find((m) => m.id === id);
        return mem ? JSON.parse(JSON.stringify(mem)) : null;
      },
      listForUser: async (
        userId: string,
        options?: { contextId?: string; category?: MemoryCategory; visibility?: MemoryVisibility; source?: MemorySourceType; limit?: number }
      ): Promise<PersonalMemoryItem[]> => {
        const state = this.store.getState();
        let list = (state.personalMemories || []).filter((m) => m.userId === userId);
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
        this.store.mutate((st) => {
          if (!st.personalMemories) st.personalMemories = [];
          st.personalMemories.push(JSON.parse(JSON.stringify(record)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      update: async (
        id: string,
        updates: Partial<Omit<PersonalMemoryItem, 'id' | 'userId' | 'createdAt'>>,
        userId?: string
      ): Promise<PersonalMemoryItem | null> => {
        let updated: PersonalMemoryItem | null = null;
        this.store.mutate((st) => {
          if (!st.personalMemories) st.personalMemories = [];
          const idx = st.personalMemories.findIndex((m) => m.id === id && (!userId || m.userId === userId));
          if (idx !== -1) {
            st.personalMemories[idx] = {
              ...st.personalMemories[idx],
              ...updates,
              id,
              userId: st.personalMemories[idx].userId,
              updatedAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.personalMemories[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      delete: async (id: string, userId: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.personalMemories) return;
          const prev = st.personalMemories.length;
          st.personalMemories = st.personalMemories.filter((m) => !(m.id === id && m.userId === userId));
          removed = st.personalMemories.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      },
      deleteForUser: async (userId: string): Promise<number> => {
        let count = 0;
        this.store.mutate((st) => {
          if (!st.personalMemories) return;
          const initial = st.personalMemories.length;
          st.personalMemories = st.personalMemories.filter((m) => m.userId !== userId);
          count = initial - st.personalMemories.length;
        });
        if (count > 0) await this.store.flush();
        return count;
      }
    };
  }

  get personalKnowledge(): IPersonalKnowledgeRepository {
    return {
      getState: async (userId: string): Promise<PersonalKnowledgeState | null> => {
        const state = this.store.getState();
        const k = (state.personalKnowledgeStates || []).find((s) => s.userId === userId);
        return k ? JSON.parse(JSON.stringify(k)) : null;
      },
      upsertState: async (newState: PersonalKnowledgeState): Promise<PersonalKnowledgeState> => {
        const record = JSON.parse(JSON.stringify(newState));
        this.store.mutate((st) => {
          if (!st.personalKnowledgeStates) st.personalKnowledgeStates = [];
          const idx = st.personalKnowledgeStates.findIndex((s) => s.userId === newState.userId);
          if (idx !== -1) {
            st.personalKnowledgeStates[idx] = record;
          } else {
            st.personalKnowledgeStates.push(record);
          }
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      getConcept: async (userId: string, conceptId: string): Promise<PersonalKnowledgeConceptState | null> => {
        const state = this.store.getState();
        const k = (state.personalKnowledgeStates || []).find((s) => s.userId === userId);
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
        this.store.mutate((st) => {
          if (!st.personalKnowledgeStates) st.personalKnowledgeStates = [];
          let idx = st.personalKnowledgeStates.findIndex((s) => s.userId === userId);
          if (idx === -1) {
            st.personalKnowledgeStates.push({
              userId,
              concepts: {},
              recentSignals: [],
              updatedAt: new Date().toISOString()
            });
            idx = st.personalKnowledgeStates.length - 1;
          }
          const userState = st.personalKnowledgeStates[idx];
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
        });
        await this.store.flush();
        return updatedConcept;
      },
      rollbackConceptMastery: async (
        userId: string,
        conceptId: string,
        previousState: PersonalKnowledgeConceptState | null,
        signalIdToRemove?: string
      ): Promise<void> => {
        this.store.mutate((st) => {
          if (!st.personalKnowledgeStates) return;
          const idx = st.personalKnowledgeStates.findIndex((s) => s.userId === userId);
          if (idx === -1) return;
          const userState = st.personalKnowledgeStates[idx];
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
        });
        await this.store.flush();
      },
      listSignals: async (userId: string, limit?: number): Promise<PersonalKnowledgeSignal[]> => {
        const state = this.store.getState();
        const k = (state.personalKnowledgeStates || []).find((s) => s.userId === userId);
        if (!k || !k.recentSignals) return [];
        let list = [...k.recentSignals];
        if (limit && limit > 0) list = list.slice(0, limit);
        return list.map((s) => JSON.parse(JSON.stringify(s)));
      }
    };
  }

  get personalStudy(): IPersonalStudyRepository {
    return {
      getNoteById: async (id: string, userId?: string): Promise<PersonalStudyNote | null> => {
        const state = this.store.getState();
        const note = (state.personalStudyNotes || []).find((n) => n.id === id && (!userId || n.userId === userId));
        return note ? JSON.parse(JSON.stringify(note)) : null;
      },
      listNotes: async (
        userId: string,
        options?: { subject?: string; contextId?: string; tag?: string }
      ): Promise<PersonalStudyNote[]> => {
        const state = this.store.getState();
        let list = (state.personalStudyNotes || []).filter((n) => n.userId === userId);
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
        this.store.mutate((st) => {
          if (!st.personalStudyNotes) st.personalStudyNotes = [];
          st.personalStudyNotes.push(JSON.parse(JSON.stringify(record)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      updateNote: async (
        id: string,
        updates: Partial<Omit<PersonalStudyNote, 'id' | 'userId' | 'createdAt'>>,
        userId?: string
      ): Promise<PersonalStudyNote | null> => {
        let updated: PersonalStudyNote | null = null;
        this.store.mutate((st) => {
          if (!st.personalStudyNotes) st.personalStudyNotes = [];
          const idx = st.personalStudyNotes.findIndex((n) => n.id === id && (!userId || n.userId === userId));
          if (idx !== -1) {
            st.personalStudyNotes[idx] = {
              ...st.personalStudyNotes[idx],
              ...updates,
              id,
              userId: st.personalStudyNotes[idx].userId,
              updatedAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.personalStudyNotes[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      deleteNote: async (id: string, userId: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.personalStudyNotes) return;
          const prev = st.personalStudyNotes.length;
          st.personalStudyNotes = st.personalStudyNotes.filter((n) => !(n.id === id && n.userId === userId));
          removed = st.personalStudyNotes.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      },
      deleteAllNotes: async (userId: string, subject?: string): Promise<number> => {
        let count = 0;
        this.store.mutate((st) => {
          if (!st.personalStudyNotes) return;
          const initial = st.personalStudyNotes.length;
          st.personalStudyNotes = st.personalStudyNotes.filter((n) => {
            if (n.userId !== userId) return true;
            if (subject && n.subject?.toLowerCase() !== subject.toLowerCase()) return true;
            return false;
          });
          count = initial - st.personalStudyNotes.length;
        });
        if (count > 0) await this.store.flush();
        return count;
      },

      getFlashcardById: async (id: string, userId?: string): Promise<PersonalFlashcard | null> => {
        const state = this.store.getState();
        const card = (state.personalFlashcards || []).find((c) => c.id === id && (!userId || c.userId === userId));
        return card ? JSON.parse(JSON.stringify(card)) : null;
      },
      listFlashcards: async (
        userId: string,
        options?: { subject?: string; conceptId?: string }
      ): Promise<PersonalFlashcard[]> => {
        const state = this.store.getState();
        let list = (state.personalFlashcards || []).filter((c) => c.userId === userId);
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
        this.store.mutate((st) => {
          if (!st.personalFlashcards) st.personalFlashcards = [];
          st.personalFlashcards.push(JSON.parse(JSON.stringify(record)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      updateFlashcard: async (
        id: string,
        updates: Partial<Omit<PersonalFlashcard, 'id' | 'userId' | 'createdAt'>>,
        userId?: string
      ): Promise<PersonalFlashcard | null> => {
        let updated: PersonalFlashcard | null = null;
        this.store.mutate((st) => {
          if (!st.personalFlashcards) st.personalFlashcards = [];
          const idx = st.personalFlashcards.findIndex((c) => c.id === id && (!userId || c.userId === userId));
          if (idx !== -1) {
            st.personalFlashcards[idx] = {
              ...st.personalFlashcards[idx],
              ...updates,
              id,
              userId: st.personalFlashcards[idx].userId
            };
            updated = JSON.parse(JSON.stringify(st.personalFlashcards[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      deleteFlashcard: async (id: string, userId: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.personalFlashcards) return;
          const prev = st.personalFlashcards.length;
          st.personalFlashcards = st.personalFlashcards.filter((c) => !(c.id === id && c.userId === userId));
          removed = st.personalFlashcards.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      },

      listStudyPlans: async (userId: string): Promise<PersonalStudySessionPlan[]> => {
        const state = this.store.getState();
        const list = (state.personalStudyPlans || []).filter((p) => p.userId === userId);
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
        this.store.mutate((st) => {
          if (!st.personalStudyPlans) st.personalStudyPlans = [];
          st.personalStudyPlans.push(JSON.parse(JSON.stringify(record)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      updateStudyPlan: async (
        id: string,
        updates: Partial<PersonalStudySessionPlan>,
        userId?: string
      ): Promise<PersonalStudySessionPlan | null> => {
        let updated: PersonalStudySessionPlan | null = null;
        this.store.mutate((st) => {
          if (!st.personalStudyPlans) st.personalStudyPlans = [];
          const idx = st.personalStudyPlans.findIndex((p) => p.id === id && (!userId || p.userId === userId));
          if (idx !== -1) {
            st.personalStudyPlans[idx] = {
              ...st.personalStudyPlans[idx],
              ...updates,
              id,
              userId: st.personalStudyPlans[idx].userId
            };
            updated = JSON.parse(JSON.stringify(st.personalStudyPlans[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      deleteStudyPlan: async (id: string, userId: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.personalStudyPlans) return;
          const prev = st.personalStudyPlans.length;
          st.personalStudyPlans = st.personalStudyPlans.filter((p) => !(p.id === id && p.userId === userId));
          removed = st.personalStudyPlans.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      }
    };
  }

  get activityTimeline(): IActivityTimelineRepository {
    return {
      getActivity: async (
        userId: string,
        options?: { contextId?: string; contextType?: string; limit?: number }
      ): Promise<ActionActivityItem[]> => {
        const state = this.store.getState();
        let list = (state.activityTimeline || []).filter((a) => a.userId === userId);
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
        const state = this.store.getState();
        const item = (state.activityTimeline || []).find((a) => a.id === id && (!userId || a.userId === userId));
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
        this.store.mutate((st) => {
          if (!st.activityTimeline) st.activityTimeline = [];
          st.activityTimeline.unshift(JSON.parse(JSON.stringify(record)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      updateActivity: async (
        id: string,
        updates: Partial<ActionActivityItem>,
        userId?: string
      ): Promise<ActionActivityItem | null> => {
        let updated: ActionActivityItem | null = null;
        this.store.mutate((st) => {
          if (!st.activityTimeline) st.activityTimeline = [];
          const idx = st.activityTimeline.findIndex((a) => a.id === id && (!userId || a.userId === userId));
          if (idx !== -1) {
            st.activityTimeline[idx] = {
              ...st.activityTimeline[idx],
              ...updates,
              id,
              userId: st.activityTimeline[idx].userId
            };
            updated = JSON.parse(JSON.stringify(st.activityTimeline[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      deleteActivity: async (id: string, userId: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.activityTimeline) return;
          const prev = st.activityTimeline.length;
          st.activityTimeline = st.activityTimeline.filter((a) => !(a.id === id && a.userId === userId));
          removed = st.activityTimeline.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      }
    };
  }

  get diagnosticSessions(): IDiagnosticSessionRepository {
    return {
      getSessionById: async (sessionId: string, userId?: string): Promise<DiagnosticSessionRecord | null> => {
        const state = this.store.getState();
        const s = (state.diagnosticSessions || []).find(
          (item) => item.sessionId === sessionId && (!userId || item.userId === userId)
        );
        return s ? JSON.parse(JSON.stringify(s)) : null;
      },
      listSessionsForUser: async (
        userId: string,
        options?: { conceptName?: string; completed?: boolean; limit?: number }
      ): Promise<DiagnosticSessionRecord[]> => {
        const state = this.store.getState();
        let list = (state.diagnosticSessions || []).filter((s) => s.userId === userId);
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
        this.store.mutate((st) => {
          if (!st.diagnosticSessions) st.diagnosticSessions = [];
          const idx = st.diagnosticSessions.findIndex((s) => s.sessionId === session.sessionId);
          if (idx !== -1) {
            st.diagnosticSessions[idx] = record;
          } else {
            st.diagnosticSessions.push(record);
          }
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      updateSession: async (
        sessionId: string,
        updates: Partial<DiagnosticSessionRecord>,
        userId?: string
      ): Promise<DiagnosticSessionRecord | null> => {
        let updated: DiagnosticSessionRecord | null = null;
        this.store.mutate((st) => {
          if (!st.diagnosticSessions) st.diagnosticSessions = [];
          const idx = st.diagnosticSessions.findIndex(
            (s) => s.sessionId === sessionId && (!userId || s.userId === userId)
          );
          if (idx !== -1) {
            st.diagnosticSessions[idx] = {
              ...st.diagnosticSessions[idx],
              ...updates,
              sessionId,
              userId: st.diagnosticSessions[idx].userId,
              updatedAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.diagnosticSessions[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      recordCheckpointEvaluation: async (
        sessionId: string,
        checkpoint: CheckpointEvaluationResult,
        userId?: string
      ): Promise<DiagnosticSessionRecord | null> => {
        let updated: DiagnosticSessionRecord | null = null;
        this.store.mutate((st) => {
          if (!st.diagnosticSessions) st.diagnosticSessions = [];
          const idx = st.diagnosticSessions.findIndex(
            (s) => s.sessionId === sessionId && (!userId || s.userId === userId)
          );
          if (idx !== -1) {
            const sess = st.diagnosticSessions[idx];
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
            updated = JSON.parse(JSON.stringify(sess));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      deleteSession: async (sessionId: string, userId?: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.diagnosticSessions) return;
          const prev = st.diagnosticSessions.length;
          st.diagnosticSessions = st.diagnosticSessions.filter(
            (s) => !(s.sessionId === sessionId && (!userId || s.userId === userId))
          );
          removed = st.diagnosticSessions.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      }
    };
  }

  get knowledgeAssets(): IKnowledgeAssetRepository {
    return {
      getById: async (
        id: string,
        callerContext?: { userId?: string; institutionId?: string; workspaceId?: string }
      ): Promise<KnowledgeAsset | null> => {
        const state = this.store.getState();
        const asset = (state.knowledgeAssets || []).find((a) => a.id === id);
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
        const state = this.store.getState();
        let list = [...(state.knowledgeAssets || [])];
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
        this.store.mutate((st) => {
          if (!st.knowledgeAssets) st.knowledgeAssets = [];
          st.knowledgeAssets.push(JSON.parse(JSON.stringify(record)));
        });
        await this.store.flush();
        return JSON.parse(JSON.stringify(record));
      },
      update: async (
        id: string,
        updates: Partial<Omit<KnowledgeAsset, 'id' | 'createdAt'>>,
        callerUserId?: string
      ): Promise<KnowledgeAsset | null> => {
        let updated: KnowledgeAsset | null = null;
        this.store.mutate((st) => {
          if (!st.knowledgeAssets) st.knowledgeAssets = [];
          const idx = st.knowledgeAssets.findIndex(
            (a) => a.id === id && (!callerUserId || a.ownerId === callerUserId)
          );
          if (idx !== -1) {
            st.knowledgeAssets[idx] = {
              ...st.knowledgeAssets[idx],
              ...updates,
              id,
              ownerId: st.knowledgeAssets[idx].ownerId,
              updatedAt: new Date().toISOString()
            };
            updated = JSON.parse(JSON.stringify(st.knowledgeAssets[idx]));
          }
        });
        if (updated) await this.store.flush();
        return updated;
      },
      delete: async (id: string, callerUserId?: string): Promise<boolean> => {
        let removed = false;
        this.store.mutate((st) => {
          if (!st.knowledgeAssets) return;
          const prev = st.knowledgeAssets.length;
          st.knowledgeAssets = st.knowledgeAssets.filter(
            (a) => !(a.id === id && (!callerUserId || a.ownerId === callerUserId))
          );
          removed = st.knowledgeAssets.length < prev;
        });
        if (removed) await this.store.flush();
        return removed;
      }
    };
  }

  get learnerExposures(): ILearnerExposureRepository {
    return {
      getExposure: async (
        userId: string,
        contextId: string,
        questionId: string
      ): Promise<LearnerQuestionExposure | null> => {
        const state = this.store.getState();
        const exp = (state.learnerExposures || []).find(
          (e) => e.userId === userId && e.contextId === contextId && e.questionId === questionId
        );
        return exp ? JSON.parse(JSON.stringify(exp)) : null;
      },
      listExposuresForLearner: async (
        userId: string,
        options?: { contextId?: string; subject?: string; topic?: string; status?: QuestionExposureStatus }
      ): Promise<LearnerQuestionExposure[]> => {
        const state = this.store.getState();
        let list = (state.learnerExposures || []).filter((e) => e.userId === userId);
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
        this.store.mutate((st) => {
          if (!st.learnerExposures) st.learnerExposures = [];
          for (const exp of exposures) {
            const idx = st.learnerExposures.findIndex(
              (e) => e.userId === userId && e.contextId === (exp.contextId || contextId) && e.questionId === exp.questionId
            );
            if (idx !== -1) {
              st.learnerExposures[idx].lastSeenAt = now;
              if (exp.status === 'COMPLETED' && st.learnerExposures[idx].status !== 'MASTERED') {
                st.learnerExposures[idx].status = 'COMPLETED';
              } else if (exp.status === 'ATTEMPTED' && st.learnerExposures[idx].status === 'SEEN') {
                st.learnerExposures[idx].status = 'ATTEMPTED';
              }
            } else {
              st.learnerExposures.push(JSON.parse(JSON.stringify(exp)));
            }
          }
        });
        await this.store.flush();
      },
      recordAttempt: async (params: {
        userId: string;
        contextId?: string;
        questionId: string;
        exposure: LearnerQuestionExposure;
      }): Promise<LearnerQuestionExposure> => {
        const { userId, contextId = 'ctx-default', questionId, exposure } = params;
        let result: LearnerQuestionExposure = JSON.parse(JSON.stringify(exposure));
        this.store.mutate((st) => {
          if (!st.learnerExposures) st.learnerExposures = [];
          const idx = st.learnerExposures.findIndex(
            (e) => e.userId === userId && e.contextId === contextId && e.questionId === questionId
          );
          if (idx !== -1) {
            st.learnerExposures[idx] = JSON.parse(JSON.stringify(exposure));
          } else {
            st.learnerExposures.push(JSON.parse(JSON.stringify(exposure)));
          }
          result = JSON.parse(JSON.stringify(exposure));
        });
        await this.store.flush();
        return result;
      },
      getExposureSummary: async (
        userId: string,
        contextId?: string,
        subject?: string
      ): Promise<LearnerExposureSummary> => {
        const state = this.store.getState();
        let list = (state.learnerExposures || []).filter((e) => e.userId === userId);
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

  get storagePath(): string {
    return this.store.getStoragePath();
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async seed(force?: boolean): Promise<void> {
    if (force) {
      await this.reset();
      return;
    }
    const state = this.store.getState();
    if (state.users.length === 0 || state.classes.length === 0) {
      await this.reset();
      return;
    }
    // Seed research data if not present in existing database
    if (!state.researchProjects || state.researchProjects.length === 0) {
      this.store.mutate((st) => {
        st.researchProjects = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.researchProjects || []));
        st.researchQuestions = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.researchQuestions || []));
        st.evidenceRecords = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.evidenceRecords || []));
        st.researchNotes = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.researchNotes || []));
        st.researchReports = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.researchReports || []));
      });
      await this.store.flush();
    }
    // Seed files data if not present in existing database
    if (!state.files || state.files.length === 0) {
      this.store.mutate((st) => {
        st.files = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.files || []));
      });
      await this.store.flush();
    }
    // Seed classroom session data if not present in existing database
    if (!state.classroomSessions || state.classroomSessions.length === 0) {
      this.store.mutate((st) => {
        st.classroomSessions = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.classroomSessions || []));
        st.classroomParticipants = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.classroomParticipants || []));
      });
      await this.store.flush();
    }
    // Seed quiz data if not present in existing database
    if (!state.quizzes || state.quizzes.length === 0) {
      this.store.mutate((st) => {
        st.quizzes = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.quizzes || []));
        st.quizQuestions = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.quizQuestions || []));
        st.quizResponses = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.quizResponses || []));
        st.quizParticipantStates = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.quizParticipantStates || []));
      });
      await this.store.flush();
    }
    // Seed video data if not present in existing database
    if (!state.videos || state.videos.length === 0) {
      this.store.mutate((st) => {
        st.videos = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.videos || []));
      });
      await this.store.flush();
    }
    // Seed institution invitations if not present in existing database
    if (!state.institutionInvitations || state.institutionInvitations.length === 0) {
      this.store.mutate((st) => {
        st.institutionInvitations = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.institutionInvitations || []));
      });
      await this.store.flush();
    }
    // Seed institutions if not present in existing database
    if (!state.institutions || state.institutions.length === 0) {
      this.store.mutate((st) => {
        st.institutions = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.institutions || []));
        st.institutionMemberships = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA.institutionMemberships || []));
      });
      await this.store.flush();
    }
  }

  getFileStore(): JsonFileStore {
    return this.store;
  }

  getState(): DatabaseSchema {
    return this.store.getState();
  }

  mutate<T>(fn: (state: DatabaseSchema) => T): T {
    return this.store.mutate(fn);
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  async close(): Promise<void> {
    await this.store.flush();
    this.store.close();
  }

  async reset(): Promise<void> {
    await this.store.reset();
  }

  /**
   * Stage 6.4.4: Executes a coordinated unit of work across one or more sub-repositories.
   * Guarantees bounded process-local atomicity, isolated snapshot rollback on failure,
   * and single-operation disk flush on successful commit.
   */
  async runTransaction<T>(
    work: (txRepo: IJarvisDataRepository) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const parentTx = transactionStorage.getStore();
    if (parentTx && parentTx.repo === this) {
      // Nested transaction within the same repository instance: create a savepoint
      this.store.beginTransaction();
      try {
        const result = await work(this);
        await this.store.commitTransaction();
        return result;
      } catch (err) {
        this.store.rollbackTransaction();
        throw err;
      }
    }

    // Root transaction: acquire process-local lock
    const timeoutMs = options?.timeoutMs ?? 10000;
    const release = await this.mutex.acquire(timeoutMs);
    this.store.beginTransaction();
    let timer: NodeJS.Timeout | null = null;
    try {
      const context: TransactionContext = {
        id: `tx-disk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

      await this.store.commitTransaction();
      return result;
    } catch (err) {
      this.store.rollbackTransaction();
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      release();
    }
  }
}
