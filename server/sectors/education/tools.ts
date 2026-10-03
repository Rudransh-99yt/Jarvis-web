import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../tools/types.ts';
import { educationStore } from './educationStore.ts';

// Tool 1: education.class.list
export const listClassesTool: ToolDefinition<{}> = {
  name: 'education.class.list',
  sector: 'education',
  aliases: ['list_classes', 'get_classes', 'education_classes'],
  description: 'Lists all active academic classes, instructors, enrollments, and syllabus materials in the Jarvis Education sector.',
  declaration: {
    name: 'education_class_list',
    description: 'Retrieve all academic classes with student counts, instructor details, and materials in the Jarvis Education workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  validate(_args: unknown): ValidationResult<{}> {
    return { valid: true, data: {} };
  },
  async execute(_args: {}, _context: ToolExecutionContext): Promise<ToolResult> {
    const classes = educationStore.getClasses();
    return {
      ok: true,
      data: {
        totalClasses: classes.length,
        classes: classes.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          instructor: c.instructorName,
          schedule: c.schedule,
          room: c.room,
          studentCount: c.studentCount,
          materialsCount: c.materialsCount,
          assignmentsCount: c.assignmentsCount,
          recentAnnouncement: c.announcements[0]?.title || 'None'
        }))
      }
    };
  }
};

// Tool 2: education.assignment.list
interface ListAssignmentsArgs {
  classId?: string;
}

export const listAssignmentsTool: ToolDefinition<ListAssignmentsArgs> = {
  name: 'education.assignment.list',
  sector: 'education',
  aliases: ['list_assignments', 'get_assignments', 'education_assignments'],
  description: 'Lists academic assignments with due dates, instructions, point values, and submission statuses.',
  declaration: {
    name: 'education_assignment_list',
    description: 'Retrieve academic assignments, optionally filtered by classId, with instructions and due dates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: {
          type: Type.STRING,
          description: "Optional class identifier (e.g. 'class-phys-301' or 'class-math-240') to filter assignments."
        }
      }
    }
  },
  validate(args: unknown): ValidationResult<ListAssignmentsArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: true, data: {} };
    }
    const raw = args as Record<string, unknown>;
    if (raw.classId !== undefined && typeof raw.classId !== 'string') {
      return { valid: false, error: "Optional 'classId' must be a string." };
    }
    return {
      valid: true,
      data: {
        classId: raw.classId ? (raw.classId as string).trim() : undefined
      }
    };
  },
  async execute(args: ListAssignmentsArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const assignments = educationStore.getAssignments(args.classId);
    return {
      ok: true,
      data: {
        totalAssignments: assignments.length,
        assignments: assignments.map((a) => ({
          id: a.id,
          classId: a.classId,
          className: a.className,
          title: a.title,
          category: a.category,
          dueDate: a.dueDate,
          maxScore: a.maxScore,
          submittedCount: a.submittedCount,
          totalEnrolled: a.totalEnrolled
        }))
      }
    };
  }
};

// Tool 3: education.assignment.create
interface CreateAssignmentArgs {
  classId: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  maxScore?: number;
  category?: 'Worksheet' | 'Lab Report' | 'Exam' | 'Project';
}

export const createAssignmentTool: ToolDefinition<CreateAssignmentArgs> = {
  name: 'education.assignment.create',
  sector: 'education',
  aliases: ['create_assignment', 'education_assignment_create'],
  description: 'Creates a new assignment for a class as a Teacher in the Jarvis Education sector.',
  declaration: {
    name: 'education_assignment_create',
    description: 'Create a new homework, worksheet, lab report, or exam assignment for a specific class.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: {
          type: Type.STRING,
          description: "Required class ID (e.g., 'class-phys-301' or 'class-math-240')."
        },
        title: {
          type: Type.STRING,
          description: 'Title of the assignment.'
        },
        description: {
          type: Type.STRING,
          description: 'Short summary or objective of the assignment.'
        },
        instructions: {
          type: Type.STRING,
          description: 'Step-by-step student instructions for the assignment.'
        },
        dueDate: {
          type: Type.STRING,
          description: "Due date in YYYY-MM-DD format (e.g., '2026-10-25')."
        },
        maxScore: {
          type: Type.NUMBER,
          description: 'Maximum score possible (defaults to 100).'
        },
        category: {
          type: Type.STRING,
          description: "Category: 'Worksheet', 'Lab Report', 'Exam', or 'Project'."
        }
      },
      required: ['classId', 'title', 'instructions', 'dueDate']
    }
  },
  validate(args: unknown): ValidationResult<CreateAssignmentArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with classId, title, instructions, and dueDate.' };
    }
    const raw = args as Record<string, unknown>;

    if (typeof raw.classId !== 'string' || raw.classId.trim().length === 0) {
      return { valid: false, error: "Parameter 'classId' is required and must be a non-empty string." };
    }
    if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
      return { valid: false, error: "Parameter 'title' is required and must be a non-empty string." };
    }
    if (typeof raw.instructions !== 'string' || raw.instructions.trim().length === 0) {
      return { valid: false, error: "Parameter 'instructions' is required and must be a non-empty string." };
    }
    if (typeof raw.dueDate !== 'string' || raw.dueDate.trim().length === 0) {
      return { valid: false, error: "Parameter 'dueDate' is required and must be in YYYY-MM-DD format." };
    }

    const category = (['Worksheet', 'Lab Report', 'Exam', 'Project'].includes(raw.category as string)
      ? raw.category
      : 'Worksheet') as CreateAssignmentArgs['category'];

    return {
      valid: true,
      data: {
        classId: raw.classId.trim(),
        title: raw.title.trim(),
        description: typeof raw.description === 'string' ? raw.description.trim() : raw.title.trim(),
        instructions: raw.instructions.trim(),
        dueDate: raw.dueDate.trim(),
        maxScore: typeof raw.maxScore === 'number' ? raw.maxScore : 100,
        category
      }
    };
  },
  async execute(args: CreateAssignmentArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const cls = educationStore.getClass(args.classId);
    if (!cls) {
      return {
        ok: false,
        error: {
          code: 'CLASS_NOT_FOUND',
          message: `Class '${args.classId}' was not found in Jarvis Education directory.`
        }
      };
    }

    const created = educationStore.createAssignment({
      classId: args.classId,
      title: args.title,
      description: args.description,
      instructions: args.instructions,
      dueDate: args.dueDate,
      maxScore: args.maxScore || 100,
      category: args.category
    });

    return {
      ok: true,
      data: {
        id: created.id,
        title: created.title,
        className: created.className,
        dueDate: created.dueDate,
        maxScore: created.maxScore,
        category: created.category,
        message: `Assignment '${created.title}' successfully published to ${created.className}.`
      }
    };
  }
};

// Tool 4: education.student.progress
interface StudentProgressArgs {
  studentId?: string;
}

export const studentProgressTool: ToolDefinition<StudentProgressArgs> = {
  name: 'education.student.progress',
  sector: 'education',
  aliases: ['get_student_progress', 'student_progress', 'education_progress'],
  description: 'Returns academic progress, submitted assignments, grades, and pending tasks for a student.',
  declaration: {
    name: 'education_student_progress',
    description: 'Retrieve student submission history, grades, and pending homework assignments.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: {
          type: Type.STRING,
          description: "Optional student identifier (defaults to current student 'student-1')."
        }
      }
    }
  },
  validate(args: unknown): ValidationResult<StudentProgressArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: true, data: { studentId: 'student-1' } };
    }
    const raw = args as Record<string, unknown>;
    return {
      valid: true,
      data: {
        studentId: typeof raw.studentId === 'string' ? raw.studentId.trim() : 'student-1'
      }
    };
  },
  async execute(args: StudentProgressArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const studentId = args.studentId || 'student-1';
    const allAssignments = educationStore.getAssignments();
    const submissions = educationStore.getSubmissions(studentId);

    const graded = submissions.filter((s) => s.status === 'graded');
    const averageGrade = graded.length > 0
      ? Math.round(graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length)
      : 96;

    const submittedAsgIds = new Set(submissions.map((s) => s.assignmentId));
    const pending = allAssignments.filter((a) => !submittedAsgIds.has(a.id));

    return {
      ok: true,
      data: {
        studentId,
        studentName: studentId === 'student-1' ? 'Alex Chen' : studentId,
        totalSubmissions: submissions.length,
        gradedSubmissions: graded.length,
        averageGradePercentage: averageGrade,
        pendingAssignmentsCount: pending.length,
        pendingAssignments: pending.map((p) => ({
          id: p.id,
          title: p.title,
          className: p.className,
          dueDate: p.dueDate
        })),
        recentSubmissions: submissions.map((s) => ({
          id: s.id,
          assignmentTitle: s.assignmentTitle,
          className: s.className,
          status: s.status,
          grade: s.grade,
          feedback: s.feedback
        }))
      }
    };
  }
};

// Tool 5: knowledge.space.list
export const listKnowledgeSpacesTool: ToolDefinition<{}> = {
  name: 'knowledge.space.list',
  sector: 'knowledge',
  aliases: ['list_knowledge_spaces', 'get_knowledge_spaces', 'knowledge_spaces'],
  description: 'Lists all NotebookLM-style knowledge workspaces and their indexed source documents in Jarvis.',
  declaration: {
    name: 'knowledge_space_list',
    description: 'Retrieve all knowledge spaces and indexed document sources for research and grounded study.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  validate(_args: unknown): ValidationResult<{}> {
    return { valid: true, data: {} };
  },
  async execute(_args: {}, _context: ToolExecutionContext): Promise<ToolResult> {
    const spaces = educationStore.getKnowledgeSpaces();
    return {
      ok: true,
      data: {
        totalSpaces: spaces.length,
        spaces: spaces.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          category: s.category,
          sourceCount: s.sources.length,
          sources: s.sources.map((src) => ({
            id: src.id,
            title: src.title,
            type: src.type,
            author: src.author,
            tokenCount: src.tokenCount
          })),
          tags: s.tags
        }))
      }
    };
  }
};

// Tool 6: knowledge.query
interface KnowledgeQueryArgs {
  spaceId: string;
  query: string;
}

export const queryKnowledgeTool: ToolDefinition<KnowledgeQueryArgs> = {
  name: 'knowledge.query',
  sector: 'knowledge',
  aliases: ['query_knowledge', 'grounded_query', 'knowledge_search'],
  description: 'Performs a grounded search and synthesis against indexed source documents inside a Knowledge Space with citations.',
  declaration: {
    name: 'knowledge_query',
    description: 'Query indexed knowledge space documents (PDFs, notes, lectures) with source citations and references.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        spaceId: {
          type: Type.STRING,
          description: "Target Knowledge Space ID (e.g. 'ks-quantum' or 'ks-calculus')."
        },
        query: {
          type: Type.STRING,
          description: 'The natural language question or study inquiry to answer from the sources.'
        }
      },
      required: ['spaceId', 'query']
    }
  },
  validate(args: unknown): ValidationResult<KnowledgeQueryArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object with spaceId and query.' };
    }
    const raw = args as Record<string, unknown>;
    if (typeof raw.spaceId !== 'string' || raw.spaceId.trim().length === 0) {
      return { valid: false, error: "Parameter 'spaceId' must be a non-empty string." };
    }
    if (typeof raw.query !== 'string' || raw.query.trim().length === 0) {
      return { valid: false, error: "Parameter 'query' must be a non-empty string." };
    }
    return {
      valid: true,
      data: {
        spaceId: raw.spaceId.trim(),
        query: raw.query.trim()
      }
    };
  },
  async execute(args: KnowledgeQueryArgs, _context: ToolExecutionContext): Promise<ToolResult> {
    const groundedResult = educationStore.queryGrounded(args.spaceId, args.query);
    return {
      ok: true,
      data: {
        spaceId: groundedResult.spaceId,
        spaceTitle: groundedResult.spaceTitle,
        query: groundedResult.query,
        answer: groundedResult.answer,
        citations: groundedResult.citations,
        confidence: groundedResult.confidence,
        timestamp: groundedResult.timestamp
      }
    };
  }
};
