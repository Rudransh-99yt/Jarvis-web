// Sandboxed Tool Declarations and Handlers for SmartBoard OS (D.8)
import { Type } from '@google/genai';
import { smartboardService } from './smartboardService.ts';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../../tools/types.ts';
import type { User } from '../../../data/types.ts';
import { jarvisData } from '../../../data/index.ts';

async function resolveUserFromContext(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId || (context.role === 'student' ? 'student-1' : 'teacher-1');
  const user = await jarvisData.users.getById(userId);
  if (user) return user;
  return {
    id: userId,
    displayName: context.role === 'student' ? 'Alex Chen' : 'Dr. Sarah',
    email: 'user@starkacademy.edu',
    role: (context.role as any) || 'teacher',
    createdAt: new Date().toISOString()
  };
}

// 1. Tool: smartboard.device.list
interface ListBoardsArgs {
  classroomId?: string;
}

export const listBoardsTool: ToolDefinition<ListBoardsArgs> = {
  name: 'smartboard.device.list',
  sector: 'education',
  aliases: ['list_smartboards', 'get_classroom_boards'],
  description: 'Lists all registered interactive SmartBoard devices and their current pairing/live status in the institution.',
  declaration: {
    name: 'smartboard_device_list',
    description: 'Lists registered SmartBoard physical surfaces in classroom venues.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classroomId: {
          type: Type.STRING,
          description: 'Optional classroom or course ID to filter boards.'
        }
      }
    }
  },
  validate(args: unknown): ValidationResult<ListBoardsArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    return {
      valid: true,
      data: {
        classroomId: typeof a.classroomId === 'string' ? a.classroomId.trim() : undefined
      }
    };
  },
  async execute(args: ListBoardsArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const devices = await smartboardService.listDevices(user, args.classroomId);
      return {
        ok: true,
        data: {
          devices: devices.map((d) => ({
            id: d.id,
            displayName: d.displayName,
            classroomName: d.classroomName,
            status: d.status,
            isPaired: d.pairingState.isPaired,
            currentTopic: d.currentTopic,
            currentCourseCode: d.currentCourseCode
          })),
          count: devices.length
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'SMARTBOARD_ERROR', message: err.message || 'Failed to list devices' } };
    }
  }
};

// 2. Tool: smartboard.session.send
interface SendSessionToBoardArgs {
  boardId: string;
  sessionId: string;
}

export const sendSessionToBoardTool: ToolDefinition<SendSessionToBoardArgs> = {
  name: 'smartboard.session.send',
  sector: 'education',
  aliases: ['send_to_smartboard', 'dispatch_session_to_board'],
  description: 'Dispatches an approved or scheduled ClassSession to a physical SmartBoard surface.',
  declaration: {
    name: 'smartboard_session_send',
    description: 'Sends an approved ClassSession to a classroom SmartBoard.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        boardId: {
          type: Type.STRING,
          description: 'The target SmartBoard hardware ID (e.g. board-phys-01).'
        },
        sessionId: {
          type: Type.STRING,
          description: 'The ClassSession ID to dispatch (e.g. session-phys-101).'
        }
      },
      required: ['boardId', 'sessionId']
    }
  },
  validate(args: unknown): ValidationResult<SendSessionToBoardArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.boardId || typeof a.boardId !== 'string') {
      return { valid: false, error: 'Missing required field: boardId' };
    }
    if (!a.sessionId || typeof a.sessionId !== 'string') {
      return { valid: false, error: 'Missing required field: sessionId' };
    }
    return {
      valid: true,
      data: {
        boardId: a.boardId.trim(),
        sessionId: a.sessionId.trim()
      }
    };
  },
  async execute(args: SendSessionToBoardArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const result = await smartboardService.sendSessionToBoard(user, args.boardId, args.sessionId);
      return {
        ok: true,
        data: {
          boardId: result.board.id,
          boardName: result.board.displayName,
          status: result.board.status,
          sessionId: args.sessionId,
          documentId: result.document.id,
          topic: result.session.topic
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'SMARTBOARD_ERROR', message: err.message || 'Failed to dispatch session' } };
    }
  }
};

// 3. Tool: smartboard.session.status
interface BoardStatusArgs {
  boardId: string;
}

export const boardStatusTool: ToolDefinition<BoardStatusArgs> = {
  name: 'smartboard.session.status',
  sector: 'education',
  aliases: ['get_smartboard_status', 'check_board_live_session'],
  description: 'Retrieves current status, active session, and pairing condition of a SmartBoard device.',
  declaration: {
    name: 'smartboard_session_status',
    description: 'Checks status and active session of a SmartBoard device.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        boardId: {
          type: Type.STRING,
          description: 'The target SmartBoard ID.'
        }
      },
      required: ['boardId']
    }
  },
  validate(args: unknown): ValidationResult<BoardStatusArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.boardId || typeof a.boardId !== 'string') {
      return { valid: false, error: 'Missing required field: boardId' };
    }
    return {
      valid: true,
      data: {
        boardId: a.boardId.trim()
      }
    };
  },
  async execute(args: BoardStatusArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const board = await smartboardService.getDevice(user, args.boardId);
      return {
        ok: true,
        data: {
          id: board.id,
          displayName: board.displayName,
          classroomName: board.classroomName,
          status: board.status,
          isPaired: board.pairingState.isPaired,
          pairedTeacher: board.pairingState.pairedTeacherName,
          currentSessionId: board.currentSessionId,
          currentTopic: board.currentTopic,
          capabilities: board.capabilities
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'SMARTBOARD_ERROR', message: err.message || 'Failed to get board status' } };
    }
  }
};

// 4. Tool: smartboard.document.get
interface GetBoardDocArgs {
  sessionId: string;
}

export const getBoardDocumentTool: ToolDefinition<GetBoardDocArgs> = {
  name: 'smartboard.document.get',
  sector: 'education',
  aliases: ['get_board_document', 'get_board_notes'],
  description: 'Retrieves structured BoardDocument elements and pages for a ClassSession.',
  declaration: {
    name: 'smartboard_document_get',
    description: 'Retrieves structured board pages, formulas, and elements.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sessionId: {
          type: Type.STRING,
          description: 'The ClassSession ID or BoardDocument ID.'
        }
      },
      required: ['sessionId']
    }
  },
  validate(args: unknown): ValidationResult<GetBoardDocArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.sessionId || typeof a.sessionId !== 'string') {
      return { valid: false, error: 'Missing required field: sessionId' };
    }
    return {
      valid: true,
      data: {
        sessionId: a.sessionId.trim()
      }
    };
  },
  async execute(args: GetBoardDocArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const doc = await smartboardService.getBoardDocument(user, args.sessionId);
      return {
        ok: true,
        data: {
          id: doc.id,
          title: doc.title,
          courseCode: doc.courseCode,
          pageCount: doc.pages.length,
          isReleasedToStudents: doc.isReleasedToStudents,
          pages: doc.pages.map((p) => ({
            pageIndex: p.pageIndex,
            title: p.title,
            elementCount: p.elements.length,
            formulas: p.elements.filter((e) => e.semanticTag === 'formula').map((e) => e.latexFormula || e.text)
          }))
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'SMARTBOARD_ERROR', message: err.message || 'Failed to get board document' } };
    }
  }
};

// 5. Tool: smartboard.history.list
interface ListBoardHistoryArgs {
  classId: string;
}

export const listBoardHistoryTool: ToolDefinition<ListBoardHistoryArgs> = {
  name: 'smartboard.history.list',
  sector: 'education',
  aliases: ['list_board_history', 'get_class_board_history'],
  description: 'Lists saved and released BoardDocuments for a class or subject.',
  declaration: {
    name: 'smartboard_history_list',
    description: 'Lists board history documents for a class.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: {
          type: Type.STRING,
          description: 'The class ID (e.g. class-phys-301).'
        }
      },
      required: ['classId']
    }
  },
  validate(args: unknown): ValidationResult<ListBoardHistoryArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.classId || typeof a.classId !== 'string') {
      return { valid: false, error: 'Missing required field: classId' };
    }
    return {
      valid: true,
      data: {
        classId: a.classId.trim()
      }
    };
  },
  async execute(args: ListBoardHistoryArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const docs = await smartboardService.getBoardHistory(user, args.classId);
      return {
        ok: true,
        data: {
          classId: args.classId,
          count: docs.length,
          history: docs.map((d) => ({
            id: d.id,
            title: d.title,
            courseCode: d.courseCode,
            lessonTitle: d.lessonTitle,
            pageCount: d.pages.length,
            isReleasedToStudents: d.isReleasedToStudents,
            updatedAt: d.timestamps.updatedAt
          }))
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'SMARTBOARD_ERROR', message: err.message || 'Failed to list board history' } };
    }
  }
};

export const smartboardTools = [
  listBoardsTool,
  sendSessionToBoardTool,
  boardStatusTool,
  getBoardDocumentTool,
  listBoardHistoryTool
];
