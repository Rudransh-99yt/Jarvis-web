// Sandboxed AI Tool Declarations & Handlers for AI Visualization Engine (D.10)
import { Type } from '@google/genai';
import { visualizationService } from './visualizationService.ts';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../../tools/types.ts';
import type { User } from '../../../data/types.ts';
import { jarvisData } from '../../../data/index.ts';

async function resolveUserFromContext(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId;
  if (!userId) {
    throw new Error('Tool execution error: Unauthenticated tool context (missing userId).');
  }
  const user = await jarvisData.users.getById(userId);
  if (!user) {
    throw new Error(`Tool execution error: User '${userId}' is not a registered user.`);
  }
  return user;
}

// 1. Tool: visualization.create
interface CreateVisualizationArgs {
  type?: string;
  prompt?: string;
  title?: string;
  expression?: string;
  courseCode?: string;
  topic?: string;
  classSessionId?: string;
}

export const createVisualizationTool: ToolDefinition<CreateVisualizationArgs> = {
  name: 'visualization.create',
  sector: 'education',
  aliases: ['create_visualization', 'generate_graph', 'plot_equation'],
  description: 'Creates a production-grade structured visualization (Graph, Physics simulation, Diagram, Chemistry molecule, or Data chart).',
  declaration: {
    name: 'visualization_create',
    description: 'Generates a structured classroom visualization from teacher intent or mathematical formula.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'Visualization type: GRAPH, PHYSICS, CHEMISTRY, DIAGRAM, or DATA_CHART.'
        },
        prompt: {
          type: Type.STRING,
          description: 'Natural language description of what to visualize.'
        },
        expression: {
          type: Type.STRING,
          description: 'Mathematical expression to plot (e.g. "x^2 - 4" or "sin(x)").'
        },
        courseCode: {
          type: Type.STRING,
          description: 'Academic course code (e.g. MATH-201, PHYS-101).'
        },
        topic: {
          type: Type.STRING,
          description: 'Curriculum topic.'
        },
        classSessionId: {
          type: Type.STRING,
          description: 'Optional active ClassSession ID.'
        }
      }
    }
  },
  validate(args: unknown): ValidationResult<CreateVisualizationArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    return {
      valid: true,
      data: {
        type: typeof a.type === 'string' ? a.type.toUpperCase() : undefined,
        prompt: typeof a.prompt === 'string' ? a.prompt.trim() : undefined,
        expression: typeof a.expression === 'string' ? a.expression.trim() : undefined,
        courseCode: typeof a.courseCode === 'string' ? a.courseCode.trim() : undefined,
        topic: typeof a.topic === 'string' ? a.topic.trim() : undefined,
        classSessionId: typeof a.classSessionId === 'string' ? a.classSessionId.trim() : undefined
      }
    };
  },
  async execute(args: CreateVisualizationArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      let doc;

      if (args.prompt) {
        doc = await visualizationService.generateFromPrompt(args.prompt, {
          user,
          courseCode: args.courseCode,
          topic: args.topic,
          classSessionId: args.classSessionId
        });
      } else if (args.expression) {
        const { document } = await visualizationService.generateFromEquation(
          {
            id: `eq-${Date.now()}`,
            expression: args.expression,
            normalizedExpression: args.expression,
            latex: args.expression,
            variables: ['x'],
            confidence: 1.0,
            sourceElementIds: [],
            boundingBox: { minX: 100, minY: 100, maxX: 600, maxY: 450, width: 500, height: 350 }
          },
          { user, courseCode: args.courseCode, topic: args.topic }
        );
        doc = document;
      } else {
        doc = await visualizationService.generateFromPrompt('Plot quadratic function y = x^2 - 4', {
          user,
          courseCode: args.courseCode,
          topic: args.topic
        });
      }

      return {
        ok: true,
        data: {
          visualizationId: doc.id,
          type: doc.type,
          title: doc.title,
          description: doc.description,
          parameters: doc.parameters,
          accessibility: doc.accessibility,
          timestamps: doc.timestamps
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'VISUALIZATION_ERROR', message: err.message || 'Failed to create visualization' } };
    }
  }
};

// 2. Tool: visualization.preview
interface PreviewVisualizationArgs {
  prompt?: string;
  expression?: string;
  courseCode?: string;
}

export const previewVisualizationTool: ToolDefinition<PreviewVisualizationArgs> = {
  name: 'visualization.preview',
  sector: 'education',
  aliases: ['preview_visualization', 'draft_visualization'],
  description: 'Generates a preview specification of a visualization for human teacher inspection before committing to board or session.',
  declaration: {
    name: 'visualization_preview',
    description: 'Generates an uncommitted preview of a visualization for teacher review.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: 'Prompt or intent to preview.'
        },
        expression: {
          type: Type.STRING,
          description: 'Formula to preview.'
        }
      }
    }
  },
  validate(args: unknown): ValidationResult<PreviewVisualizationArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    return {
      valid: true,
      data: {
        prompt: typeof a.prompt === 'string' ? a.prompt.trim() : undefined,
        expression: typeof a.expression === 'string' ? a.expression.trim() : undefined,
        courseCode: typeof a.courseCode === 'string' ? a.courseCode.trim() : undefined
      }
    };
  },
  async execute(args: PreviewVisualizationArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const promptToUse = args.prompt || (args.expression ? `Plot ${args.expression}` : 'Quadratic parabola y = x^2');
      const doc = await visualizationService.generateFromPrompt(promptToUse, { user, courseCode: args.courseCode });

      return {
        ok: true,
        data: {
          preview: {
            id: doc.id,
            type: doc.type,
            title: doc.title,
            description: doc.description,
            parameters: doc.parameters,
            needsApproval: true,
            summary: doc.accessibility.summary
          }
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'PREVIEW_ERROR', message: err.message || 'Failed to generate preview' } };
    }
  }
};

// 3. Tool: visualization.validate
interface ValidateVisualizationArgs {
  document: unknown;
}

export const validateVisualizationTool: ToolDefinition<ValidateVisualizationArgs> = {
  name: 'visualization.validate',
  sector: 'education',
  aliases: ['validate_visualization_schema'],
  description: 'Validates a structured visualization specification against security constraints and math evaluation limits.',
  declaration: {
    name: 'visualization_validate',
    description: 'Checks schema compliance and mathematical safety of a visualization document.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        document: {
          type: Type.OBJECT,
          description: 'The JSON visualization document to validate.'
        }
      },
      required: ['document']
    }
  },
  validate(args: unknown): ValidationResult<ValidateVisualizationArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    return {
      valid: true,
      data: {
        document: a.document
      }
    };
  },
  async execute(args: ValidateVisualizationArgs): Promise<ToolResult> {
    const res = visualizationService.validateVisualization(args.document);
    return {
      ok: true,
      data: {
        valid: res.valid,
        errors: res.errors
      }
    };
  }
};

// 4. Tool: visualization.attach
interface AttachVisualizationArgs {
  visualizationId: string;
  boardDocId?: string;
  pageId?: string;
  classSessionId?: string;
  lessonId?: string;
}

export const attachVisualizationTool: ToolDefinition<AttachVisualizationArgs> = {
  name: 'visualization.attach',
  sector: 'education',
  aliases: ['attach_to_board', 'attach_to_lesson'],
  description: 'Attaches an approved visualization to a SmartBoard page, ClassSession, or Lesson.',
  declaration: {
    name: 'visualization_attach',
    description: 'Binds a visualization to an educational learning context or board canvas.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        visualizationId: {
          type: Type.STRING,
          description: 'The unique visualization ID.'
        },
        boardDocId: {
          type: Type.STRING,
          description: 'Optional BoardDocument ID.'
        },
        pageId: {
          type: Type.STRING,
          description: 'Optional SmartBoard page ID.'
        },
        classSessionId: {
          type: Type.STRING,
          description: 'Optional ClassSession ID.'
        },
        lessonId: {
          type: Type.STRING,
          description: 'Optional lesson ID.'
        }
      },
      required: ['visualizationId']
    }
  },
  validate(args: unknown): ValidationResult<AttachVisualizationArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.visualizationId || typeof a.visualizationId !== 'string') {
      return { valid: false, error: 'visualizationId is required.' };
    }
    return {
      valid: true,
      data: {
        visualizationId: a.visualizationId.trim(),
        boardDocId: typeof a.boardDocId === 'string' ? a.boardDocId.trim() : undefined,
        pageId: typeof a.pageId === 'string' ? a.pageId.trim() : undefined,
        classSessionId: typeof a.classSessionId === 'string' ? a.classSessionId.trim() : undefined,
        lessonId: typeof a.lessonId === 'string' ? a.lessonId.trim() : undefined
      }
    };
  },
  async execute(args: AttachVisualizationArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const attached = await visualizationService.attachVisualization(
        args.visualizationId,
        {
          boardDocId: args.boardDocId,
          pageId: args.pageId,
          classSessionId: args.classSessionId,
          lessonId: args.lessonId
        },
        user
      );

      return {
        ok: true,
        data: {
          visualizationId: attached.id,
          attachedTo: {
            boardDocId: attached.provenance.boardDocumentId,
            classSessionId: attached.provenance.classSessionId,
            lessonId: attached.provenance.lessonId
          }
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'ATTACH_ERROR', message: err.message || 'Failed to attach' } };
    }
  }
};

// 5. Tool: visualization.update
interface UpdateVisualizationArgs {
  visualizationId: string;
  parameters: Record<string, any>;
}

export const updateVisualizationTool: ToolDefinition<UpdateVisualizationArgs> = {
  name: 'visualization.update',
  sector: 'education',
  aliases: ['update_visualization_parameters'],
  description: 'Updates parameters of an existing visualization (domain, functions, physics coefficients, etc.).',
  declaration: {
    name: 'visualization_update',
    description: 'Mutates authorized parameters of a visualization.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        visualizationId: {
          type: Type.STRING,
          description: 'The unique visualization ID.'
        },
        parameters: {
          type: Type.OBJECT,
          description: 'Updated parameters object.'
        }
      },
      required: ['visualizationId', 'parameters']
    }
  },
  validate(args: unknown): ValidationResult<UpdateVisualizationArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.visualizationId || typeof a.visualizationId !== 'string') {
      return { valid: false, error: 'visualizationId is required.' };
    }
    if (!a.parameters || typeof a.parameters !== 'object') {
      return { valid: false, error: 'parameters must be an object.' };
    }
    return {
      valid: true,
      data: {
        visualizationId: a.visualizationId.trim(),
        parameters: a.parameters
      }
    };
  },
  async execute(args: UpdateVisualizationArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const updated = await visualizationService.updateParameters(args.visualizationId, args.parameters, user);
      return {
        ok: true,
        data: {
          visualizationId: updated.id,
          parameters: updated.parameters,
          updatedAt: updated.timestamps.updatedAt
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'UPDATE_ERROR', message: err.message || 'Failed to update' } };
    }
  }
};

// 6. Tool: visualization.delete
interface DeleteVisualizationArgs {
  visualizationId: string;
}

export const deleteVisualizationTool: ToolDefinition<DeleteVisualizationArgs> = {
  name: 'visualization.delete',
  sector: 'education',
  aliases: ['remove_visualization'],
  description: 'Deletes a visualization document (teacher/creator only).',
  declaration: {
    name: 'visualization_delete',
    description: 'Permanently removes a visualization object.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        visualizationId: {
          type: Type.STRING,
          description: 'The visualization ID to remove.'
        }
      },
      required: ['visualizationId']
    }
  },
  validate(args: unknown): ValidationResult<DeleteVisualizationArgs> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.visualizationId || typeof a.visualizationId !== 'string') {
      return { valid: false, error: 'visualizationId is required.' };
    }
    return {
      valid: true,
      data: {
        visualizationId: a.visualizationId.trim()
      }
    };
  },
  async execute(args: DeleteVisualizationArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const success = await visualizationService.deleteVisualization(args.visualizationId, user);
      return {
        ok: success,
        data: {
          visualizationId: args.visualizationId,
          deleted: success
        }
      };
    } catch (err: any) {
      return { ok: false, error: { code: 'DELETE_ERROR', message: err.message || 'Failed to delete' } };
    }
  }
};

export const visualizationTools = [
  createVisualizationTool,
  previewVisualizationTool,
  validateVisualizationTool,
  attachVisualizationTool,
  updateVisualizationTool,
  deleteVisualizationTool
];
