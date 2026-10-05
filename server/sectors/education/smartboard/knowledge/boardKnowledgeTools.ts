import { requirePrincipal } from '../../../../auth/principal.ts';
// Sandboxed Tool Declarations for SmartBoard Board Knowledge Engine (D.13)
import { Type } from '@google/genai';
import { boardKnowledgeService } from './boardKnowledgeService.ts';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../../../tools/types.ts';
import type { User } from '../../../../data/types.ts';
import { jarvisData } from '../../../../data/index.ts';

async function resolveUser(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId || (context.role === 'student' ? 'student-1' : 'teacher-1');
  const user = await jarvisData.users.getById(userId);
  if (user) return user;
  return {
    id: userId,
    displayName: context.role === 'student' ? 'Cadet Student' : 'Dr. Sarah',
    email: `${userId}@starkacademy.edu`,
    role: (context.role as any) || 'teacher',
    institutionId: 'inst-stark-academy',
    createdAt: new Date().toISOString()
  };
}

// 1. Tool: smartboard.knowledge.index
interface IndexBoardArgs {
  boardDocId: string;
  triggerRagIngest?: boolean;
}

export const indexBoardKnowledgeTool: ToolDefinition<IndexBoardArgs> = {
  name: 'smartboard.knowledge.index',
  sector: 'education',
  aliases: ['index_smartboard', 'extract_board_knowledge'],
  description: 'Indexes a classroom SmartBoard document into structured formulas, diagrams, and RAG knowledge.',
  declaration: {
    name: 'smartboard_knowledge_index',
    description: 'Processes and extracts structured academic knowledge from a SmartBoard session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        boardDocId: {
          type: Type.STRING,
          description: 'The BoardDocument ID to index (e.g. bdoc-phys-101).'
        },
        triggerRagIngest: {
          type: Type.BOOLEAN,
          description: 'Whether to sync extracted knowledge to RAG vector space (default: true).'
        }
      },
      required: ['boardDocId']
    }
  },
  validate(args: unknown): ValidationResult<IndexBoardArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.boardDocId || typeof a.boardDocId !== 'string') {
      return { valid: false, error: 'boardDocId is required' };
    }
    return {
      valid: true,
      data: {
        boardDocId: a.boardDocId.trim(),
        triggerRagIngest: a.triggerRagIngest !== false
      }
    };
  },
  async execute(args: IndexBoardArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUser(context);
      const doc = await boardKnowledgeService.indexBoardDocument(user, args.boardDocId, {
        triggerRagIngest: args.triggerRagIngest
      });
      return {
        ok: true,
        data: {
          boardDocId: doc.id,
          courseCode: doc.courseCode,
          lifecycle: doc.lifecycle,
          pageCount: doc.pages.length,
          derivedKnowledge: doc.derivedKnowledge,
          ragIndexed: doc.ragIndexed
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'INDEX_ERROR', message: err?.message || 'Indexing failed' } };
    }
  }
};

// 2. Tool: smartboard.knowledge.release
interface ReleaseBoardArgs {
  boardDocId: string;
  isReleased: boolean;
}

export const releaseBoardKnowledgeTool: ToolDefinition<ReleaseBoardArgs> = {
  name: 'smartboard.knowledge.release',
  sector: 'education',
  aliases: ['publish_smartboard', 'release_board_to_students'],
  description: 'Publishes or unpublishes a classroom SmartBoard document to enrolled students.',
  declaration: {
    name: 'smartboard_knowledge_release',
    description: 'Releases a SmartBoard session to students.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        boardDocId: {
          type: Type.STRING,
          description: 'The BoardDocument ID to release.'
        },
        isReleased: {
          type: Type.BOOLEAN,
          description: 'True to publish to students, false to unpublish.'
        }
      },
      required: ['boardDocId', 'isReleased']
    }
  },
  validate(args: unknown): ValidationResult<ReleaseBoardArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.boardDocId || typeof a.boardDocId !== 'string') {
      return { valid: false, error: 'boardDocId is required' };
    }
    return {
      valid: true,
      data: {
        boardDocId: a.boardDocId.trim(),
        isReleased: Boolean(a.isReleased)
      }
    };
  },
  async execute(args: ReleaseBoardArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUser(context);
      const doc = await boardKnowledgeService.releaseBoardDocument(user, args.boardDocId, args.isReleased);
      return {
        ok: true,
        data: {
          boardDocId: doc.id,
          isReleasedToStudents: doc.isReleasedToStudents,
          releasedAt: doc.releasedAt,
          lifecycle: doc.lifecycle
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'RELEASE_ERROR', message: err?.message || 'Release failed' } };
    }
  }
};

// 3. Tool: smartboard.knowledge.search
interface SearchBoardArgs {
  query: string;
  classId?: string;
  courseCode?: string;
}

export const searchBoardKnowledgeTool: ToolDefinition<SearchBoardArgs> = {
  name: 'smartboard.knowledge.search',
  sector: 'education',
  aliases: ['search_smartboard', 'find_board_notes'],
  description: 'Searches historical whiteboard sessions across authorized classes for concepts, derivations, or formulas.',
  declaration: {
    name: 'smartboard_knowledge_search',
    description: 'Searches SmartBoard whiteboard history.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'The search query (e.g. "Gauss law derivation", "flux integral").'
        },
        classId: {
          type: Type.STRING,
          description: 'Optional class filter.'
        },
        courseCode: {
          type: Type.STRING,
          description: 'Optional course filter (e.g. PHYS-301).'
        }
      },
      required: ['query']
    }
  },
  validate(args: unknown): ValidationResult<SearchBoardArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.query || typeof a.query !== 'string') {
      return { valid: false, error: 'query is required' };
    }
    return {
      valid: true,
      data: {
        query: a.query.trim(),
        classId: a.classId ? String(a.classId).trim() : undefined,
        courseCode: a.courseCode ? String(a.courseCode).trim() : undefined
      }
    };
  },
  async execute(args: SearchBoardArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUser(context);
      const results = boardKnowledgeService.searchBoardKnowledge(user, args.query, {
        classId: args.classId,
        courseCode: args.courseCode
      });
      return {
        ok: true,
        data: {
          query: args.query,
          results,
          count: results.length
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'SEARCH_ERROR', message: err?.message || 'Search failed' } };
    }
  }
};

// 4. Tool: smartboard.knowledge.ask
interface AskBoardArgs {
  query: string;
  boardDocumentId?: string;
  classSessionId?: string;
  pageIndex?: number;
}

export const askBoardKnowledgeTool: ToolDefinition<AskBoardArgs> = {
  name: 'smartboard.knowledge.ask',
  sector: 'education',
  aliases: ['ask_board', 'explain_board_page'],
  description: 'Asks Jarvis questions strictly grounded in the content of a specific whiteboard session.',
  declaration: {
    name: 'smartboard_knowledge_ask',
    description: 'Answers questions about whiteboard session content.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'The student or teacher question (e.g. "What formula did sir write on page 2?").'
        },
        boardDocumentId: {
          type: Type.STRING,
          description: 'Optional BoardDocument ID.'
        },
        classSessionId: {
          type: Type.STRING,
          description: 'Optional ClassSession ID.'
        },
        pageIndex: {
          type: Type.INTEGER,
          description: 'Optional 0-indexed page number to restrict inquiry.'
        }
      },
      required: ['query']
    }
  },
  validate(args: unknown): ValidationResult<AskBoardArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.query || typeof a.query !== 'string') {
      return { valid: false, error: 'query is required' };
    }
    return {
      valid: true,
      data: {
        query: a.query.trim(),
        boardDocumentId: a.boardDocumentId ? String(a.boardDocumentId).trim() : undefined,
        classSessionId: a.classSessionId ? String(a.classSessionId).trim() : undefined,
        pageIndex: typeof a.pageIndex === 'number' ? a.pageIndex : undefined
      }
    };
  },
  async execute(args: AskBoardArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUser(context);
      const res = await boardKnowledgeService.askJarvisAboutBoard(user, args.query, {
        boardDocumentId: args.boardDocumentId,
        classSessionId: args.classSessionId,
        pageIndex: args.pageIndex
      });
      return {
        ok: true,
        data: { ...res }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'ASK_BOARD_ERROR', message: err?.message || 'Board inquiry failed' } };
    }
  }
};

// 5. Tool: smartboard.knowledge.derive_notes
interface DeriveNotesArgs {
  boardDocId: string;
  pageIndex?: number;
  customTitle?: string;
}

export const deriveNotesTool: ToolDefinition<DeriveNotesArgs> = {
  name: 'smartboard.knowledge.derive_notes',
  sector: 'education',
  aliases: ['board_to_notes', 'create_notes_from_board'],
  description: 'Generates structured Workspace lecture notes directly from an interactive SmartBoard whiteboard.',
  declaration: {
    name: 'smartboard_knowledge_derive_notes',
    description: 'Creates Workspace notes from a SmartBoard session.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        boardDocId: {
          type: Type.STRING,
          description: 'The BoardDocument ID to convert into notes.'
        },
        pageIndex: {
          type: Type.INTEGER,
          description: 'Optional page index (default: entire document).'
        },
        customTitle: {
          type: Type.STRING,
          description: 'Optional custom notes page title.'
        }
      },
      required: ['boardDocId']
    }
  },
  validate(args: unknown): ValidationResult<DeriveNotesArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.boardDocId || typeof a.boardDocId !== 'string') {
      return { valid: false, error: 'boardDocId is required' };
    }
    return {
      valid: true,
      data: {
        boardDocId: a.boardDocId.trim(),
        pageIndex: typeof a.pageIndex === 'number' ? a.pageIndex : undefined,
        customTitle: a.customTitle ? String(a.customTitle).trim() : undefined
      }
    };
  },
  async execute(args: DeriveNotesArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUser(context);
      const res = await boardKnowledgeService.createDerivedNotes(user, args.boardDocId, {
        pageIndex: args.pageIndex,
        customTitle: args.customTitle
      });
      return {
        ok: true,
        data: { ...res }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'DERIVE_NOTES_ERROR', message: err?.message || 'Failed to derive notes' } };
    }
  }
};
