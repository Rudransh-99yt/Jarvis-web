// Pure In-Memory Repository Implementation for Unit Testing
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
  ToolAuditEvent,
  DatabaseSchema
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
        this.state.knowledgeSources = this.state.knowledgeSources.filter((src) => src.knowledgeSpaceId !== id);
        return this.state.knowledgeSpaces.length < prev;
      },
      getSourceById: async (id: string): Promise<KnowledgeSourceRecord | null> => {
        const src = this.state.knowledgeSources.find((s) => s.id === id);
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
      updateSourceStatus: async (id: string, status: KnowledgeSourceRecord['status'], errorMessage?: string): Promise<KnowledgeSourceRecord | null> => {
        const index = this.state.knowledgeSources.findIndex((s) => s.id === id);
        if (index === -1) return null;
        this.state.knowledgeSources[index] = {
          ...this.state.knowledgeSources[index],
          status,
          errorMessage,
          updatedAt: new Date().toISOString()
        };
        return { ...this.state.knowledgeSources[index] };
      },
      deleteSource: async (id: string): Promise<boolean> => {
        const prev = this.state.knowledgeSources.length;
        this.state.knowledgeSources = this.state.knowledgeSources.filter((s) => s.id !== id);
        return this.state.knowledgeSources.length < prev;
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
