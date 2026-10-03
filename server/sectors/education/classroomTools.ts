// Milestone 12: Deterministic Smart Classroom Tools for Education Sector
import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../tools/types.ts';
import { classroomService } from './classroomService.ts';
import { jarvisData } from '../../data/index.ts';
import type { User } from '../../data/types.ts';

// Helper to resolve user from tool execution context
async function resolveUserFromContext(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId || 'teacher-1';
  const existing = await jarvisData.users.getById(userId);
  if (existing) return existing;

  const role = (context.role === 'student' ? 'student' : context.role === 'teacher' ? 'teacher' : 'commander') as any;
  return {
    id: userId,
    displayName: userId === 'teacher-1' ? 'Dr. Sarah' : 'Alex Chen',
    email: `${userId}@stark.local`,
    role,
    createdAt: new Date().toISOString()
  };
}

// 1. Tool: classroom.session.create
interface CreateSessionArgs {
  classId: string;
  title?: string;
  boardTopic?: string;
  status?: 'scheduled' | 'live';
  workspaceId?: string;
}

export const createSessionTool: ToolDefinition<CreateSessionArgs> = {
  name: 'classroom.session.create',
  sector: 'education',
  aliases: ['create_classroom_session', 'start_classroom', 'schedule_classroom'],
  description: 'Creates or schedules a new Smart Classroom live lecture session for an authorized course.',
  declaration: {
    name: 'classroom_session_create',
    description: 'Create a new Smart Classroom session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'ID of the class (e.g. "class-phys-301")' },
        title: { type: Type.STRING, description: 'Optional session title' },
        boardTopic: { type: Type.STRING, description: 'Initial topic for the Smart Board display' },
        status: { type: Type.STRING, description: 'Initial status: "scheduled" or "live"' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['classId']
    }
  },
  validate(args: unknown): ValidationResult<CreateSessionArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.classId !== 'string' || !a.classId.trim()) {
      return { valid: false, error: "Parameter 'classId' is required and must be a non-empty string." };
    }
    return {
      valid: true,
      data: {
        classId: a.classId.trim(),
        title: typeof a.title === 'string' ? a.title.trim() : undefined,
        boardTopic: typeof a.boardTopic === 'string' ? a.boardTopic.trim() : undefined,
        status: a.status === 'live' ? 'live' : 'scheduled',
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: CreateSessionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';

      const session = await classroomService.createSession({
        classId: args.classId,
        workspaceId,
        title: args.title,
        status: args.status,
        boardTopic: args.boardTopic
      }, user);

      return {
        ok: true,
        data: {
          sessionId: session.id,
          classId: session.classId,
          title: session.title,
          status: session.status,
          boardState: session.boardState,
          activeStudentCount: session.activeStudentCount,
          createdAt: session.createdAt
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SESSION_CREATE_FAILED', message: err.message || 'Failed to create classroom session' }
      };
    }
  }
};

// 2. Tool: classroom.session.start
interface StartSessionArgs {
  sessionId: string;
  workspaceId?: string;
}

export const startSessionTool: ToolDefinition<StartSessionArgs> = {
  name: 'classroom.session.start',
  sector: 'education',
  aliases: ['start_session', 'activate_classroom'],
  description: 'Transitions a scheduled or paused Smart Classroom session to LIVE state.',
  declaration: {
    name: 'classroom_session_start',
    description: 'Transition a classroom session to live status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: { type: Type.STRING, description: 'ID of the session to start' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['sessionId']
    }
  },
  validate(args: unknown): ValidationResult<StartSessionArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.sessionId !== 'string' || !a.sessionId.trim()) {
      return { valid: false, error: "Parameter 'sessionId' is required." };
    }
    return {
      valid: true,
      data: {
        sessionId: a.sessionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: StartSessionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';

      const session = await classroomService.startSession(args.sessionId, user, workspaceId);

      return {
        ok: true,
        data: {
          sessionId: session.id,
          classId: session.classId,
          status: session.status,
          startedAt: session.startedAt,
          boardState: session.boardState,
          activeStudentCount: session.activeStudentCount
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SESSION_START_FAILED', message: err.message || 'Failed to start session' }
      };
    }
  }
};

// 3. Tool: classroom.session.pause
interface PauseSessionArgs {
  sessionId: string;
  workspaceId?: string;
}

export const pauseSessionTool: ToolDefinition<PauseSessionArgs> = {
  name: 'classroom.session.pause',
  sector: 'education',
  aliases: ['pause_session', 'pause_classroom'],
  description: 'Temporarily pauses a live classroom session and sets the Smart Board to paused.',
  declaration: {
    name: 'classroom_session_pause',
    description: 'Pause an active classroom session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: { type: Type.STRING, description: 'ID of the session to pause' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['sessionId']
    }
  },
  validate(args: unknown): ValidationResult<PauseSessionArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.sessionId !== 'string' || !a.sessionId.trim()) {
      return { valid: false, error: "Parameter 'sessionId' is required." };
    }
    return {
      valid: true,
      data: {
        sessionId: a.sessionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: PauseSessionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';

      const session = await classroomService.pauseSession(args.sessionId, user, workspaceId);

      return {
        ok: true,
        data: {
          sessionId: session.id,
          status: session.status,
          boardState: session.boardState
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SESSION_PAUSE_FAILED', message: err.message || 'Failed to pause session' }
      };
    }
  }
};

// 4. Tool: classroom.session.resume
interface ResumeSessionArgs {
  sessionId: string;
  workspaceId?: string;
}

export const resumeSessionTool: ToolDefinition<ResumeSessionArgs> = {
  name: 'classroom.session.resume',
  sector: 'education',
  aliases: ['resume_session', 'unpause_classroom'],
  description: 'Resumes a paused classroom session back to live status.',
  declaration: {
    name: 'classroom_session_resume',
    description: 'Resume a paused classroom session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: { type: Type.STRING, description: 'ID of the session to resume' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['sessionId']
    }
  },
  validate(args: unknown): ValidationResult<ResumeSessionArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.sessionId !== 'string' || !a.sessionId.trim()) {
      return { valid: false, error: "Parameter 'sessionId' is required." };
    }
    return {
      valid: true,
      data: {
        sessionId: a.sessionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: ResumeSessionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';

      const session = await classroomService.resumeSession(args.sessionId, user, workspaceId);

      return {
        ok: true,
        data: {
          sessionId: session.id,
          status: session.status,
          boardState: session.boardState
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SESSION_RESUME_FAILED', message: err.message || 'Failed to resume session' }
      };
    }
  }
};

// 5. Tool: classroom.session.end
interface EndSessionArgs {
  sessionId: string;
  workspaceId?: string;
}

export const endSessionTool: ToolDefinition<EndSessionArgs> = {
  name: 'classroom.session.end',
  sector: 'education',
  aliases: ['end_session', 'terminate_classroom', 'stop_classroom'],
  description: 'Concludes an active or paused Smart Classroom session and disconnects all participants.',
  declaration: {
    name: 'classroom_session_end',
    description: 'End a classroom session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: { type: Type.STRING, description: 'ID of the session to end' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      },
      required: ['sessionId']
    }
  },
  validate(args: unknown): ValidationResult<EndSessionArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.sessionId !== 'string' || !a.sessionId.trim()) {
      return { valid: false, error: "Parameter 'sessionId' is required." };
    }
    return {
      valid: true,
      data: {
        sessionId: a.sessionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: EndSessionArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';

      const session = await classroomService.endSession(args.sessionId, user, workspaceId);

      return {
        ok: true,
        data: {
          sessionId: session.id,
          status: session.status,
          endedAt: session.endedAt,
          activeStudentCount: session.activeStudentCount
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SESSION_END_FAILED', message: err.message || 'Failed to end session' }
      };
    }
  }
};

// 6. Tool: classroom.session.status
interface SessionStatusArgs {
  sessionId?: string;
  classId?: string;
  workspaceId?: string;
}

export const sessionStatusTool: ToolDefinition<SessionStatusArgs> = {
  name: 'classroom.session.status',
  sector: 'education',
  aliases: ['classroom_status', 'session_status', 'get_board_state'],
  description: 'Queries status, board state, and participant count for an active classroom session.',
  declaration: {
    name: 'classroom_session_status',
    description: 'Retrieve current classroom session and smart board status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: { type: Type.STRING, description: 'Optional session ID' },
        classId: { type: Type.STRING, description: 'Optional class ID to find active session for' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' }
      }
    }
  },
  validate(args: unknown): ValidationResult<SessionStatusArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    return {
      valid: true,
      data: {
        sessionId: typeof a.sessionId === 'string' ? a.sessionId.trim() : undefined,
        classId: typeof a.classId === 'string' ? a.classId.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: SessionStatusArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';

      let session = null;
      if (args.sessionId) {
        session = await classroomService.getSession(args.sessionId, workspaceId, user);
      } else if (args.classId) {
        session = await classroomService.getActiveSession(args.classId, workspaceId, user);
      } else {
        // Default to physics course active session
        session = await classroomService.getActiveSession('class-phys-301', workspaceId, user);
      }

      if (!session) {
        return {
          ok: true,
          data: {
            hasActiveSession: false,
            message: 'No live classroom session is currently running for this course.'
          }
        };
      }

      const participants = await jarvisData.classroom.listParticipants(session.id, true);

      return {
        ok: true,
        data: {
          hasActiveSession: session.status === 'live',
          sessionId: session.id,
          classId: session.classId,
          title: session.title,
          status: session.status,
          boardState: session.boardState,
          activeStudentCount: participants.length,
          startedAt: session.startedAt,
          updatedAt: session.updatedAt
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SESSION_STATUS_FAILED', message: err.message || 'Failed to retrieve session status' }
      };
    }
  }
};

// 7. Tool: classroom.session.participants
interface SessionParticipantsArgs {
  sessionId: string;
  workspaceId?: string;
  onlyConnected?: boolean;
}

export const sessionParticipantsTool: ToolDefinition<SessionParticipantsArgs> = {
  name: 'classroom.session.participants',
  sector: 'education',
  aliases: ['classroom_participants', 'session_roster', 'connected_students'],
  description: 'Retrieves connected students, presence status, and remote device types for a session.',
  declaration: {
    name: 'classroom_session_participants',
    description: 'List connected students and presence for a classroom session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: { type: Type.STRING, description: 'ID of the classroom session' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' },
        onlyConnected: { type: Type.BOOLEAN, description: 'Filter for only actively connected students' }
      },
      required: ['sessionId']
    }
  },
  validate(args: unknown): ValidationResult<SessionParticipantsArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.sessionId !== 'string' || !a.sessionId.trim()) {
      return { valid: false, error: "Parameter 'sessionId' is required." };
    }
    return {
      valid: true,
      data: {
        sessionId: a.sessionId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined,
        onlyConnected: Boolean(a.onlyConnected)
      }
    };
  },
  async execute(args: SessionParticipantsArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || context.workspaceId || 'ws-stark-core';

      const participants = await classroomService.listParticipants(
        args.sessionId,
        workspaceId,
        user,
        args.onlyConnected !== false
      );

      return {
        ok: true,
        data: {
          sessionId: args.sessionId,
          totalCount: participants.length,
          connectedCount: participants.filter((p) => p.connectionStatus === 'connected').length,
          participants: participants.map((p) => ({
            studentId: p.studentId,
            displayName: p.displayName,
            status: p.connectionStatus,
            deviceType: p.deviceType,
            joinedAt: p.joinedAt,
            lastSeenAt: p.lastSeenAt
          }))
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'LIST_PARTICIPANTS_FAILED', message: err.message || 'Failed to list participants' }
      };
    }
  }
};

export const CLASSROOM_TOOLS: ToolDefinition<any>[] = [
  createSessionTool,
  startSessionTool,
  pauseSessionTool,
  resumeSessionTool,
  endSessionTool,
  sessionStatusTool,
  sessionParticipantsTool
];
