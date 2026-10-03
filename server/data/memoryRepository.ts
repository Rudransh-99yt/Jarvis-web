// Pure In-Memory Repository Implementation for Unit Testing
import type {
  IJarvisDataRepository,
  IUserRepository,
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
  CreateMessageInput,
  MessageFilter
} from './repository.ts';

import type {
  User,
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
  VideoListFilter
} from './types.ts';
import type {
  EducationClass,
  Assignment,
  StudentSubmission,
  GroundedQueryResponse
} from '../../src/types/education.ts';
import type { MessageRole } from '../../src/types/api.ts';
import { INITIAL_DATABASE_SCHEMA } from './seedData.ts';

export class MemoryJarvisDataRepository implements IJarvisDataRepository {
  public readonly isPersistent = false;
  private state: DatabaseSchema;

  public users: IUserRepository;
  public workspaces: IWorkspaceRepository;
  public conversations: IConversationRepository;
  public knowledge: IKnowledgeRepository;
  public education: IEducationRepository;
  public audit: IAuditRepository;
  public research: IResearchRepository;
  public files: IFileRepository;
  public classroom: IClassroomRepository;
  public quizzes: IQuizRepository;

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
        const record: User = {
          ...user,
          createdAt: new Date().toISOString()
        };
        this.state.users.push(record);
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
  }

  get videos(): IVideoRepository {
    return {
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
  }

  async init(): Promise<void> {}
  async seed(_force?: boolean): Promise<void> {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
  }
  async flush(): Promise<void> {}
  async close(): Promise<void> {}
  async reset(): Promise<void> {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
  }
}
