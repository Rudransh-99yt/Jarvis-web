// Disk-Backed Repository Implementation for Jarvis Platform
import { JsonFileStore } from './fileStore.ts';
import type {
  IJarvisDataRepository,
  IUserRepository,
  IWorkspaceRepository,
  IConversationRepository,
  IKnowledgeRepository,
  IEducationRepository,
  IAuditRepository
} from './repository.ts';
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
import { INITIAL_DATABASE_SCHEMA } from './seedData.ts';

export class DiskJarvisDataRepository implements IJarvisDataRepository {
  public readonly isPersistent = true;
  private store: JsonFileStore;

  public users: IUserRepository;
  public workspaces: IWorkspaceRepository;
  public conversations: IConversationRepository;
  public knowledge: IKnowledgeRepository;
  public education: IEducationRepository;
  public audit: IAuditRepository;

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
      create: async (conversation: { id?: string; workspaceId: string; userId: string; title: string; sector?: string }): Promise<Conversation> => {
        const now = new Date().toISOString();
        const record: Conversation = {
          id: conversation.id || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: conversation.workspaceId || 'ws-stark-core',
          userId: conversation.userId || 'user-tony',
          title: conversation.title,
          sector: conversation.sector || 'command',
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
          state.knowledgeSources = state.knowledgeSources.filter((src) => src.knowledgeSpaceId !== id);
          return state.knowledgeSpaces.length < prev;
        });
      },
      getSourceById: async (id: string): Promise<KnowledgeSourceRecord | null> => {
        const src = this.store.getState().knowledgeSources.find((s) => s.id === id);
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
      updateSourceStatus: async (id: string, status: KnowledgeSourceRecord['status'], errorMessage?: string): Promise<KnowledgeSourceRecord | null> => {
        return this.store.mutate((state) => {
          const index = state.knowledgeSources.findIndex((s) => s.id === id);
          if (index === -1) return null;
          state.knowledgeSources[index] = {
            ...state.knowledgeSources[index],
            status,
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
          return state.knowledgeSources.length < prev;
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
