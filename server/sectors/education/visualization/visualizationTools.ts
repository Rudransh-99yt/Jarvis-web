// Sandboxed server tools for D.10 AI Visualization Engine
import { Type } from '@google/genai';
import { visualizationService } from './visualizationService.ts';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../../../server/tools/types.ts';
import type { User } from '../../../../server/data/types.ts';
import { jarvisData } from '../../../../server/data/index.ts';

async function resolveUserFromContext(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId || (context.role === 'student' ? 'student-1' : 'teacher-1');
  const user = await jarvisData.users.getById(userId);
  if (user) return user;
  return {
    id: userId,
    displayName: context.role === 'student' ? 'Alex Chen' : 'Dr. Helen Cho',
    email: 'user@starkacademy.edu',
    role: (context.role as any) || 'teacher',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-main',
    createdAt: new Date().toISOString()
  };
}

export const validateVisualizationTool: ToolDefinition<{ payload: any }> = {
  name: 'visualization.validate',
  sector: 'education',
  description: 'Validates a visualization payload before creation.',
  declaration: {
    name: 'visualization_validate',
    description: 'Validate visualization payload',
    parameters: {
      type: Type.OBJECT,
      properties: {
        payload: { type: Type.OBJECT, description: 'Structured visualization payload' }
      },
      required: ['payload']
    }
  },
  validate(args: unknown): ValidationResult<{ payload: any }> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.payload) return { valid: false, error: 'payload is required' };
    return { valid: true, data: { payload: a.payload } };
  },
  async execute(args: { payload: any }): Promise<ToolResult> {
    const result = visualizationService.validatePayload(args.payload);
    return { ok: result.isValid, data: result as any };
  }
};

export const createVisualizationTool: ToolDefinition<{
  title: string;
  visualizationType: any;
  payload: any;
  courseCode?: string;
  isReleased?: boolean;
}> = {
  name: 'visualization.create',
  sector: 'education',
  description: 'Creates a new structured visualization document.',
  declaration: {
    name: 'visualization_create',
    description: 'Create a new visualization document',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title of the visualization' },
        visualizationType: { type: Type.STRING, description: 'Type: GRAPH, PROJECTILE, MOLECULE, DIAGRAM, DATA_CHART' },
        payload: { type: Type.OBJECT, description: 'Structured visualization payload' },
        courseCode: { type: Type.STRING, description: 'Course code e.g. PHYS-301' },
        isReleased: { type: Type.BOOLEAN, description: 'Release to students' }
      },
      required: ['title', 'visualizationType', 'payload']
    }
  },
  validate(args: unknown): ValidationResult<any> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.title || !a.visualizationType || !a.payload) {
      return { valid: false, error: 'title, visualizationType, and payload are required' };
    }
    return { valid: true, data: a };
  },
  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const doc = await visualizationService.createVisualization(user, args);
      return { ok: true, data: { visualization: doc as any } };
    } catch (err: any) {
      return { ok: false, error: { code: 'CREATE_FAILED', message: err?.message || 'Failed to create' } };
    }
  }
};

export const listVisualizationsTool: ToolDefinition<{ classId?: string; courseCode?: string; type?: string }> = {
  name: 'visualization.list',
  sector: 'education',
  description: 'Lists all authorized visualizations.',
  declaration: {
    name: 'visualization_list',
    description: 'List accessible visualizations',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'Filter by class ID' },
        courseCode: { type: Type.STRING, description: 'Filter by course code' },
        type: { type: Type.STRING, description: 'Filter by visualization type' }
      }
    }
  },
  validate(args: unknown): ValidationResult<any> {
    return { valid: true, data: (args && typeof args === 'object' ? args : {}) as any };
  },
  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const docs = await visualizationService.listVisualizations(user, args);
      return { ok: true, data: { visualizations: docs as any, count: docs.length } };
    } catch (err: any) {
      return { ok: false, error: { code: 'LIST_FAILED', message: err?.message || 'Failed to list' } };
    }
  }
};

export const getVisualizationTool: ToolDefinition<{ id: string }> = {
  name: 'visualization.get',
  sector: 'education',
  description: 'Retrieves a single visualization document by ID.',
  declaration: {
    name: 'visualization_get',
    description: 'Get visualization by ID',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'Visualization document ID' }
      },
      required: ['id']
    }
  },
  validate(args: unknown): ValidationResult<{ id: string }> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.id) return { valid: false, error: 'id is required' };
    return { valid: true, data: { id: a.id } };
  },
  async execute(args: { id: string }, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const doc = await visualizationService.getVisualization(user, args.id);
      return { ok: true, data: { visualization: doc as any } };
    } catch (err: any) {
      return { ok: false, error: { code: 'NOT_FOUND', message: err?.message || 'Not found' } };
    }
  }
};

export const attachVisualizationTool: ToolDefinition<{
  boardId: string;
  pageId: string;
  visualizationId: string;
  x?: number;
  y?: number;
}> = {
  name: 'visualization.attach',
  sector: 'education',
  description: 'Attaches a visualization to a SmartBoard page.',
  declaration: {
    name: 'visualization_attach',
    description: 'Attach visualization to SmartBoard canvas page',
    parameters: {
      type: Type.OBJECT,
      properties: {
        boardId: { type: Type.STRING, description: 'Target SmartBoard document ID' },
        pageId: { type: Type.STRING, description: 'Target board page ID' },
        visualizationId: { type: Type.STRING, description: 'Visualization document ID' },
        x: { type: Type.NUMBER, description: 'Position X' },
        y: { type: Type.NUMBER, description: 'Position Y' }
      },
      required: ['boardId', 'pageId', 'visualizationId']
    }
  },
  validate(args: unknown): ValidationResult<any> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.boardId || !a.pageId || !a.visualizationId) {
      return { valid: false, error: 'boardId, pageId, and visualizationId are required' };
    }
    return { valid: true, data: a };
  },
  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const result = await visualizationService.attachToSmartBoard(
        user,
        args.boardId,
        args.pageId,
        args.visualizationId,
        { x: args.x, y: args.y }
      );
      return { ok: true, data: result as any };
    } catch (err: any) {
      return { ok: false, error: { code: 'ATTACH_FAILED', message: err?.message || 'Failed to attach' } };
    }
  }
};

export const updateVisualizationTool: ToolDefinition<{ id: string; [key: string]: any }> = {
  name: 'visualization.update',
  sector: 'education',
  description: 'Updates a visualization document.',
  declaration: {
    name: 'visualization_update',
    description: 'Update visualization document',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'Visualization document ID' }
      },
      required: ['id']
    }
  },
  validate(args: unknown): ValidationResult<any> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.id) return { valid: false, error: 'id is required' };
    return { valid: true, data: a };
  },
  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const doc = await visualizationService.updateVisualization(user, args.id, args);
      return { ok: true, data: { visualization: doc as any } };
    } catch (err: any) {
      return { ok: false, error: { code: 'UPDATE_FAILED', message: err?.message || 'Failed to update' } };
    }
  }
};

export const deleteVisualizationTool: ToolDefinition<{ id: string }> = {
  name: 'visualization.delete',
  sector: 'education',
  description: 'Deletes a visualization document.',
  declaration: {
    name: 'visualization_delete',
    description: 'Delete visualization document',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'Visualization document ID' }
      },
      required: ['id']
    }
  },
  validate(args: unknown): ValidationResult<{ id: string }> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.id) return { valid: false, error: 'id is required' };
    return { valid: true, data: { id: a.id } };
  },
  async execute(args: { id: string }, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const success = await visualizationService.deleteVisualization(user, args.id);
      return { ok: success, data: { deleted: success } };
    } catch (err: any) {
      return { ok: false, error: { code: 'DELETE_FAILED', message: err?.message || 'Failed to delete' } };
    }
  }
};

export const visualizationTools = [
  validateVisualizationTool,
  createVisualizationTool,
  listVisualizationsTool,
  getVisualizationTool,
  attachVisualizationTool,
  updateVisualizationTool,
  deleteVisualizationTool
];
