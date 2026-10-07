import { INITIAL_PERSONAL_TOOLS } from './toolDefinitions.ts';
import { confirmationPolicy } from './confirmationPolicy.ts';
import type {
  PersonalTool,
  PersonalToolExecutionContext,
  PersonalToolExecutionResult,
  UserContextType
} from './types.ts';

/**
 * PersonalToolRegistry
 * Provider-independent registry governing personal tool discovery, deterministic validation,
 * server-side authorization, risk evaluation, and execution.
 */
export class PersonalToolRegistry {
  private tools: Map<string, PersonalTool> = new Map();

  constructor() {
    this.registerInitialTools();
  }

  private registerInitialTools(): void {
    for (const tool of INITIAL_PERSONAL_TOOLS) {
      this.registerTool(tool);
    }
  }

  registerTool(tool: PersonalTool): void {
    this.tools.set(tool.id, tool);
  }

  getTool(id: string): PersonalTool | undefined {
    return this.tools.get(id);
  }

  listTools(contextType?: UserContextType): PersonalTool[] {
    const all = Array.from(this.tools.values());
    if (!contextType) return all;

    return all.filter((t) => {
      if (!t.requiredContextTypes || t.requiredContextTypes.length === 0) return true;
      return t.requiredContextTypes.includes(contextType);
    });
  }

  /**
   * Deterministically validates tool arguments against its input schema
   */
  validateInput(toolId: string, args: Record<string, any>): { valid: boolean; errors?: string[] } {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { valid: false, errors: [`Tool '${toolId}' is not registered.`] };
    }

    const errors: string[] = [];
    const schema = tool.inputSchema;

    for (const [propName, propDef] of Object.entries(schema)) {
      const val = args[propName];

      if (propDef.required && (val === undefined || val === null || val === '')) {
        errors.push(`Missing required parameter '${propName}' (${propDef.description}).`);
        continue;
      }

      if (val !== undefined && val !== null) {
        if (propDef.type === 'string' && typeof val !== 'string') {
          errors.push(`Parameter '${propName}' must be a string.`);
        } else if (propDef.type === 'number' && typeof val !== 'number') {
          errors.push(`Parameter '${propName}' must be a number.`);
        } else if (propDef.type === 'boolean' && typeof val !== 'boolean') {
          errors.push(`Parameter '${propName}' must be a boolean.`);
        } else if (propDef.type === 'array' && !Array.isArray(val)) {
          errors.push(`Parameter '${propName}' must be an array.`);
        }

        if (propDef.enum && Array.isArray(propDef.enum)) {
          if (!propDef.enum.includes(val)) {
            errors.push(`Parameter '${propName}' value '${val}' is not in allowed enum [${propDef.enum.join(', ')}].`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Server-side context and permission authorization check
   */
  checkAuthorization(tool: PersonalTool, context: PersonalToolExecutionContext): { authorized: boolean; reason?: string } {
    // 1. Context type restriction check
    if (tool.requiredContextTypes && tool.requiredContextTypes.length > 0) {
      if (!tool.requiredContextTypes.includes(context.contextType)) {
        return {
          authorized: false,
          reason: `Tool '${tool.id}' cannot be executed in context '${context.contextType}'. Required: [${tool.requiredContextTypes.join(', ')}].`
        };
      }
    }

    // 2. Explicit permission requirements
    if (tool.requiredPermissions && tool.requiredPermissions.length > 0) {
      for (const perm of tool.requiredPermissions) {
        if (!context.permissions[perm]) {
          return {
            authorized: false,
            reason: `Execution denied: missing required context permission '${perm}'.`
          };
        }
      }
    }

    // 3. Institutional privacy isolation
    if (context.contextType === 'INSTITUTION') {
      if (tool.category === 'notes' || tool.category === 'practice') {
        if (context.permissions.sharePersonalMemory !== true) {
          return {
            authorized: false,
            reason: `Institutional context cannot access or modify private personal notes without explicit sharing consent.`
          };
        }
      }
    }

    return { authorized: true };
  }

  /**
   * Executes a tool with full validation, authorization, and risk checks
   */
  async executeTool(
    toolId: string,
    context: PersonalToolExecutionContext,
    args: Record<string, any>,
    options?: { bypassConfirmationCheck?: boolean }
  ): Promise<PersonalToolExecutionResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        toolId,
        error: { code: 'TOOL_NOT_FOUND', message: `Tool '${toolId}' is not registered.` },
        userMessage: `I could not locate tool '${toolId}' in my operational registry, sir.`
      };
    }

    // 1. Deterministic Validation
    const validation = this.validateInput(toolId, args);
    if (!validation.valid) {
      return {
        success: false,
        toolId,
        error: { code: 'INVALID_ARGUMENTS', message: validation.errors?.join('; ') || 'Invalid input arguments.' },
        userMessage: `Parameter validation failed for ${tool.name}: ${validation.errors?.join(', ')}`
      };
    }

    // 2. Server-side Authorization Check
    const authCheck = this.checkAuthorization(tool, context);
    if (!authCheck.authorized) {
      return {
        success: false,
        toolId,
        error: { code: 'FORBIDDEN', message: authCheck.reason || 'Unauthorized tool execution.' },
        userMessage: `Action restricted by security protocol: ${authCheck.reason}`
      };
    }

    // 3. Confirmation Policy Check
    const requiresConfirmation = confirmationPolicy.evaluateConfirmationRequirement(tool.riskLevel);
    if (requiresConfirmation && !options?.bypassConfirmationCheck) {
      const preview = tool.preview ? await tool.preview(context, args) : { summary: `Execute ${tool.name}` };
      const pendingAction = confirmationPolicy.createPendingAction({
        toolId,
        userId: context.userId,
        contextId: context.contextId,
        arguments: args,
        riskLevel: tool.riskLevel,
        previewSummary: preview.summary
      });

      return {
        success: false,
        toolId,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: `Action requires explicit user confirmation (${tool.riskLevel}).`
        },
        metadata: {
          confirmationRequired: true,
          pendingActionId: pendingAction.id,
          riskLevel: tool.riskLevel,
          previewSummary: preview.summary,
          arguments: args
        },
        userMessage: `⚠️ **Confirmation Required** (${tool.riskLevel.replace('_', ' ')}):\n${preview.summary}.\n\nWould you like me to proceed with this action, sir? Please confirm to proceed.`
      };
    }

    // 4. Safe Tool Execution
    try {
      const result = await tool.execute(context, args);
      return result;
    } catch (err: any) {
      console.error(`[PersonalToolRegistry] Execution error for ${toolId}:`, err);
      return {
        success: false,
        toolId,
        error: { code: 'EXECUTION_ERROR', message: err?.message || 'Internal tool execution error.' },
        userMessage: `An unexpected fault occurred while executing ${tool.name}. Operational state preserved.`
      };
    }
  }

  /**
   * Generates function declarations for LLM providers (e.g. Gemini Function Calling)
   */
  getFunctionDeclarations(contextType?: UserContextType) {
    const tools = this.listTools(contextType);
    return tools.map((t) => {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [propName, propDef] of Object.entries(t.inputSchema)) {
        const typeUpper = propDef.type ? propDef.type.toUpperCase() : 'STRING';
        properties[propName] = {
          type: typeUpper,
          description: propDef.description
        };
        if (typeUpper === 'ARRAY') {
          properties[propName].items = { type: 'STRING' };
        }
        if (propDef.enum) {
          properties[propName].enum = propDef.enum;
        }
        if (propDef.required) {
          required.push(propName);
        }
      }

      return {
        name: t.id,
        description: `[${t.riskLevel}] ${t.description}`,
        parameters: {
          type: 'OBJECT',
          properties,
          required: required.length > 0 ? required : undefined
        }
      };
    });
  }
}

export const personalToolRegistry = new PersonalToolRegistry();
