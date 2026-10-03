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
  FileListFilter
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
