// Disk-Backed Repository Implementation for Jarvis Platform
import { JsonFileStore } from './fileStore.ts';
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
import { DeterministicLocalEmbeddingProvider } from '../rag/embeddingProvider.ts';

export class DiskJarvisDataRepository implements IJarvisDataRepository {
  public readonly isPersistent = true;
  private store: JsonFileStore;

  public users: IUserRepository;
  public workspaces: IWorkspaceRepository;
  public conversations: IConversationRepository;
  public knowledge: IKnowledgeRepository;
  public education: IEducationRepository;
  public audit: IAuditRepository;
  public research: IResearchRepository;
  public files: IFileRepository;
  public classroom: IClassroomRepository;

  constructor(filePath?: string) {
    this.store = new JsonFileStore({ filePath });

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
        const record: User = {
          ...user,
          createdAt: new Date().toISOString()
        };
        this.store.mutate((state) => {
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
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  async close(): Promise<void> {
    await this.store.flush();
  }

  async reset(): Promise<void> {
    await this.store.reset();
  }
}
