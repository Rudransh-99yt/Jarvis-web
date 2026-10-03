// Research & Labs Sector Tools for Jarvis Tool Registry & Execution Layer
import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../tools/types.ts';
import { jarvisData } from '../../data/index.ts';
import { researchAssistant } from './researchAssistant.ts';
import type { ResearchAssistantMode, ResearchProjectStatus, ResearchQuestionPriority } from '../../../src/types/research.ts';

// 1. Tool: research.project.create
interface CreateProjectArgs {
  title: string;
  researchQuestion: string;
  description?: string;
  workspaceId?: string;
  ownerId?: string;
  knowledgeSpaceIds?: string[];
}

export const createResearchProjectTool: ToolDefinition<CreateProjectArgs> = {
  name: 'research.project.create',
  sector: 'research',
  aliases: ['research_project_create', 'create_research_project'],
  description: 'Creates a new persistent Research Project with a primary hypothesis or research question.',
  declaration: {
    name: 'research_project_create',
    description: 'Create a new research project in the research workspace with primary research question.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title of the research project.' },
        researchQuestion: { type: Type.STRING, description: 'Primary research question or central hypothesis.' },
        description: { type: Type.STRING, description: 'Optional project scope and goals description.' },
        workspaceId: { type: Type.STRING, description: "Workspace boundary ID (defaults to 'ws-stark-core')." },
        ownerId: { type: Type.STRING, description: 'Owner user ID.' },
        knowledgeSpaceIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Array of Knowledge Space IDs to link for grounded retrieval.'
        }
      },
      required: ['title', 'researchQuestion']
    }
  },
  validate(args: unknown): ValidationResult<CreateProjectArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object.' };
    }
    const a = args as Record<string, unknown>;
    if (typeof a.title !== 'string' || !a.title.trim()) {
      return { valid: false, error: "Parameter 'title' is required and must be a non-empty string." };
    }
    if (typeof a.researchQuestion !== 'string' || !a.researchQuestion.trim()) {
      return { valid: false, error: "Parameter 'researchQuestion' is required and must be a non-empty string." };
    }
    return {
      valid: true,
      data: {
        title: a.title.trim(),
        researchQuestion: a.researchQuestion.trim(),
        description: typeof a.description === 'string' ? a.description.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined,
        ownerId: typeof a.ownerId === 'string' ? a.ownerId.trim() : undefined,
        knowledgeSpaceIds: Array.isArray(a.knowledgeSpaceIds) ? a.knowledgeSpaceIds.map(String) : undefined
      }
    };
  },
  async execute(args: CreateProjectArgs, context: ToolExecutionContext): Promise<ToolResult> {
    const wsId = args.workspaceId || 'ws-stark-core';
    const project = await jarvisData.research.createProject({
      title: args.title,
      researchQuestion: args.researchQuestion,
      description: args.description || '',
      workspaceId: wsId,
      ownerId: args.ownerId || 'user-tony',
      knowledgeSpaceIds: args.knowledgeSpaceIds || [],
      status: 'active'
    });

    return {
      ok: true,
      data: {
        project,
        notification: `Research project '${project.title}' initialized in workspace '${wsId}'.`,
        timestamp: context.timestamp
      }
    };
  }
};

// 2. Tool: research.project.list
interface ListProjectsArgs {
  workspaceId?: string;
  status?: ResearchProjectStatus;
}

export const listResearchProjectsTool: ToolDefinition<ListProjectsArgs> = {
  name: 'research.project.list',
  sector: 'research',
  aliases: ['research_project_list', 'list_research_projects'],
  description: 'Lists all research projects in the specified workspace with their statuses and linked spaces.',
  declaration: {
    name: 'research_project_list',
    description: 'List research projects in the workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        workspaceId: { type: Type.STRING, description: 'Filter by workspace ID.' },
        status: { type: Type.STRING, description: "Filter by status: 'active', 'paused', 'completed', or 'archived'." }
      }
    }
  },
  validate(args: unknown): ValidationResult<ListProjectsArgs> {
    if (!args || typeof args !== 'object') {
      return { valid: true, data: {} };
    }
    const a = args as Record<string, unknown>;
    return {
      valid: true,
      data: {
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined,
        status: typeof a.status === 'string' ? (a.status as ResearchProjectStatus) : undefined
      }
    };
  },
  async execute(args: ListProjectsArgs): Promise<ToolResult> {
    const projects = await jarvisData.research.listProjects(args.workspaceId, args.status);
    return {
      ok: true,
      data: {
        projects,
        count: projects.length
      }
    };
  }
};

// 3. Tool: research.project.get
interface GetProjectArgs {
  projectId: string;
  workspaceId?: string;
}

export const getResearchProjectTool: ToolDefinition<GetProjectArgs> = {
  name: 'research.project.get',
  sector: 'research',
  aliases: ['research_project_get', 'get_research_project'],
  description: 'Retrieves complete details of a research project including questions, evidence, notes, and reports.',
  declaration: {
    name: 'research_project_get',
    description: 'Get research project details and sub-entities.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Project ID to retrieve.' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace verification filter.' }
      },
      required: ['projectId']
    }
  },
  validate(args: unknown): ValidationResult<GetProjectArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) {
      return { valid: false, error: "Parameter 'projectId' is required." };
    }
    return {
      valid: true,
      data: {
        projectId: a.projectId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: GetProjectArgs): Promise<ToolResult> {
    const project = await jarvisData.research.getProjectById(args.projectId, args.workspaceId);
    if (!project) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: `Research project '${args.projectId}' was not found.` }
      };
    }

    const [questions, evidence, notes, reports] = await Promise.all([
      jarvisData.research.listQuestions(args.projectId, project.workspaceId),
      jarvisData.research.listEvidence(args.projectId),
      jarvisData.research.listNotes(args.projectId),
      jarvisData.research.listReports(args.projectId)
    ]);

    return {
      ok: true,
      data: {
        project,
        questions,
        evidence,
        notes,
        reports
      }
    };
  }
};

// 4. Tool: research.question.create
interface CreateQuestionArgs {
  projectId: string;
  title: string;
  question: string;
  priority?: ResearchQuestionPriority;
  notes?: string;
}

export const createResearchQuestionTool: ToolDefinition<CreateQuestionArgs> = {
  name: 'research.question.create',
  sector: 'research',
  aliases: ['research_question_create', 'create_research_question'],
  description: 'Creates a tracked research question within an active research project.',
  declaration: {
    name: 'research_question_create',
    description: 'Add a research question to investigate within a project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Target research project ID.' },
        title: { type: Type.STRING, description: 'Short question heading or theme.' },
        question: { type: Type.STRING, description: 'Full research question inquiry.' },
        priority: { type: Type.STRING, description: "Priority level: 'low', 'medium', 'high', or 'critical'." },
        notes: { type: Type.STRING, description: 'Preliminary notes or working hypotheses.' }
      },
      required: ['projectId', 'title', 'question']
    }
  },
  validate(args: unknown): ValidationResult<CreateQuestionArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) return { valid: false, error: "'projectId' is required." };
    if (typeof a.title !== 'string' || !a.title.trim()) return { valid: false, error: "'title' is required." };
    if (typeof a.question !== 'string' || !a.question.trim()) return { valid: false, error: "'question' is required." };
    return {
      valid: true,
      data: {
        projectId: a.projectId.trim(),
        title: a.title.trim(),
        question: a.question.trim(),
        priority: typeof a.priority === 'string' ? (a.priority as ResearchQuestionPriority) : undefined,
        notes: typeof a.notes === 'string' ? a.notes.trim() : undefined
      }
    };
  },
  async execute(args: CreateQuestionArgs): Promise<ToolResult> {
    const project = await jarvisData.research.getProjectById(args.projectId);
    if (!project) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `Project '${args.projectId}' not found.` } };
    }

    const question = await jarvisData.research.createQuestion({
      projectId: args.projectId,
      workspaceId: project.workspaceId,
      title: args.title,
      question: args.question,
      priority: args.priority || 'medium',
      status: 'open',
      notes: args.notes || '',
      linkedEvidenceIds: []
    });

    return {
      ok: true,
      data: { question }
    };
  }
};

// 5. Tool: research.question.list
interface ListQuestionsArgs {
  projectId: string;
}

export const listResearchQuestionsTool: ToolDefinition<ListQuestionsArgs> = {
  name: 'research.question.list',
  sector: 'research',
  aliases: ['research_question_list', 'list_research_questions'],
  description: 'Lists all tracked research questions for a project.',
  declaration: {
    name: 'research_question_list',
    description: 'List research questions under a project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Project ID.' }
      },
      required: ['projectId']
    }
  },
  validate(args: unknown): ValidationResult<ListQuestionsArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) return { valid: false, error: "'projectId' is required." };
    return { valid: true, data: { projectId: a.projectId.trim() } };
  },
  async execute(args: ListQuestionsArgs): Promise<ToolResult> {
    const questions = await jarvisData.research.listQuestions(args.projectId);
    return { ok: true, data: { questions, count: questions.length } };
  }
};

// 6. Tool: research.evidence.list
interface ListEvidenceArgs {
  projectId: string;
  questionId?: string;
}

export const listResearchEvidenceTool: ToolDefinition<ListEvidenceArgs> = {
  name: 'research.evidence.list',
  sector: 'research',
  aliases: ['research_evidence_list', 'list_research_evidence'],
  description: 'Lists all structured evidence records for a project or question.',
  declaration: {
    name: 'research_evidence_list',
    description: 'List grounded evidence records for a project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Project ID.' },
        questionId: { type: Type.STRING, description: 'Optional question ID filter.' }
      },
      required: ['projectId']
    }
  },
  validate(args: unknown): ValidationResult<ListEvidenceArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) return { valid: false, error: "'projectId' is required." };
    return {
      valid: true,
      data: {
        projectId: a.projectId.trim(),
        questionId: typeof a.questionId === 'string' ? a.questionId.trim() : undefined
      }
    };
  },
  async execute(args: ListEvidenceArgs): Promise<ToolResult> {
    const evidence = await jarvisData.research.listEvidence(args.projectId, args.questionId);
    return { ok: true, data: { evidence, count: evidence.length } };
  }
};

// 7. Tool: research.note.create
interface CreateNoteArgs {
  projectId: string;
  title: string;
  content: string;
  tags?: string[];
  linkedQuestionIds?: string[];
  linkedEvidenceIds?: string[];
}

export const createResearchNoteTool: ToolDefinition<CreateNoteArgs> = {
  name: 'research.note.create',
  sector: 'research',
  aliases: ['research_note_create', 'create_research_note'],
  description: 'Creates a persistent research note linked to questions and evidence.',
  declaration: {
    name: 'research_note_create',
    description: 'Create a research note within a project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Project ID.' },
        title: { type: Type.STRING, description: 'Note title.' },
        content: { type: Type.STRING, description: 'Note text content.' },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Categorization tags.' },
        linkedQuestionIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Linked question IDs.' },
        linkedEvidenceIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Linked evidence IDs.' }
      },
      required: ['projectId', 'title', 'content']
    }
  },
  validate(args: unknown): ValidationResult<CreateNoteArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) return { valid: false, error: "'projectId' is required." };
    if (typeof a.title !== 'string' || !a.title.trim()) return { valid: false, error: "'title' is required." };
    if (typeof a.content !== 'string' || !a.content.trim()) return { valid: false, error: "'content' is required." };
    return {
      valid: true,
      data: {
        projectId: a.projectId.trim(),
        title: a.title.trim(),
        content: a.content.trim(),
        tags: Array.isArray(a.tags) ? a.tags.map(String) : undefined,
        linkedQuestionIds: Array.isArray(a.linkedQuestionIds) ? a.linkedQuestionIds.map(String) : undefined,
        linkedEvidenceIds: Array.isArray(a.linkedEvidenceIds) ? a.linkedEvidenceIds.map(String) : undefined
      }
    };
  },
  async execute(args: CreateNoteArgs): Promise<ToolResult> {
    const project = await jarvisData.research.getProjectById(args.projectId);
    if (!project) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `Project '${args.projectId}' not found.` } };
    }

    const note = await jarvisData.research.createNote({
      projectId: args.projectId,
      workspaceId: project.workspaceId,
      title: args.title,
      content: args.content,
      tags: args.tags || [],
      linkedQuestionIds: args.linkedQuestionIds || [],
      linkedEvidenceIds: args.linkedEvidenceIds || []
    });

    return { ok: true, data: { note } };
  }
};

// 8. Tool: research.note.list
interface ListNotesArgs {
  projectId: string;
}

export const listResearchNotesTool: ToolDefinition<ListNotesArgs> = {
  name: 'research.note.list',
  sector: 'research',
  aliases: ['research_note_list', 'list_research_notes'],
  description: 'Lists all notes for a research project.',
  declaration: {
    name: 'research_note_list',
    description: 'List notes under a research project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Project ID.' }
      },
      required: ['projectId']
    }
  },
  validate(args: unknown): ValidationResult<ListNotesArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) return { valid: false, error: "'projectId' is required." };
    return { valid: true, data: { projectId: a.projectId.trim() } };
  },
  async execute(args: ListNotesArgs): Promise<ToolResult> {
    const notes = await jarvisData.research.listNotes(args.projectId);
    return { ok: true, data: { notes, count: notes.length } };
  }
};

// 9. Tool: research.investigate
interface InvestigateArgs {
  projectId: string;
  query: string;
  mode?: ResearchAssistantMode;
  questionId?: string;
  topK?: number;
}

export const investigateResearchTool: ToolDefinition<InvestigateArgs> = {
  name: 'research.investigate',
  sector: 'research',
  aliases: ['research_investigate', 'investigate_research'],
  description: 'Executes a grounded multi-source research investigation across authorized project knowledge spaces.',
  declaration: {
    name: 'research_investigate',
    description: 'Investigate a query using grounded RAG across project sources with citations and evidence extraction.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Research project ID.' },
        query: { type: Type.STRING, description: 'Inquiry or question to research.' },
        mode: {
          type: Type.STRING,
          description: "Investigation mode: 'investigate', 'summarize', 'compare', 'supporting_evidence', 'conflicting_evidence', 'outline', or 'report'."
        },
        questionId: { type: Type.STRING, description: 'Optional linked question ID.' },
        topK: { type: Type.NUMBER, description: 'Number of chunks to retrieve (default 6).' }
      },
      required: ['projectId', 'query']
    }
  },
  validate(args: unknown): ValidationResult<InvestigateArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) return { valid: false, error: "'projectId' is required." };
    if (typeof a.query !== 'string' || !a.query.trim()) return { valid: false, error: "'query' is required." };
    return {
      valid: true,
      data: {
        projectId: a.projectId.trim(),
        query: a.query.trim(),
        mode: typeof a.mode === 'string' ? (a.mode as ResearchAssistantMode) : undefined,
        questionId: typeof a.questionId === 'string' ? a.questionId.trim() : undefined,
        topK: typeof a.topK === 'number' ? a.topK : undefined
      }
    };
  },
  async execute(args: InvestigateArgs): Promise<ToolResult> {
    try {
      const result = await researchAssistant.investigate(args.projectId, args.query, {
        mode: args.mode,
        questionId: args.questionId,
        topK: args.topK
      });

      return {
        ok: true,
        data: {
          ...result
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'INVESTIGATION_FAILED', message: err.message || 'Investigation failed' }
      };
    }
  }
};

// 10. Tool: research.report.generate
interface GenerateReportArgs {
  projectId: string;
  title?: string;
  questionId?: string;
}

export const generateResearchReportTool: ToolDefinition<GenerateReportArgs> = {
  name: 'research.report.generate',
  sector: 'research',
  aliases: ['research_report_generate', 'generate_research_report'],
  description: 'Synthesizes and persists a structured formal research report from grounded project evidence.',
  declaration: {
    name: 'research_report_generate',
    description: 'Generate a structured research report with findings, evidence references, and citations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'Project ID.' },
        title: { type: Type.STRING, description: 'Report title.' },
        questionId: { type: Type.STRING, description: 'Target question ID to anchor the report upon.' }
      },
      required: ['projectId']
    }
  },
  validate(args: unknown): ValidationResult<GenerateReportArgs> {
    if (!args || typeof args !== 'object') return { valid: false, error: 'Arguments must be an object.' };
    const a = args as Record<string, unknown>;
    if (typeof a.projectId !== 'string' || !a.projectId.trim()) return { valid: false, error: "'projectId' is required." };
    return {
      valid: true,
      data: {
        projectId: a.projectId.trim(),
        title: typeof a.title === 'string' ? a.title.trim() : undefined,
        questionId: typeof a.questionId === 'string' ? a.questionId.trim() : undefined
      }
    };
  },
  async execute(args: GenerateReportArgs): Promise<ToolResult> {
    try {
      const report = await researchAssistant.generateReport(args.projectId, {
        title: args.title,
        questionId: args.questionId
      });

      return {
        ok: true,
        data: {
          report,
          notification: `Research report '${report.title}' successfully generated and archived.`
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'REPORT_FAILED', message: err.message || 'Report generation failed' }
      };
    }
  }
};
