// Sandboxed server tools for D.11 Real-Time Teaching Copilot
import { Type } from '@google/genai';
import { copilotService } from './copilotService.ts';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../../tools/types.ts';
import type { User } from '../../../data/types.ts';
import { jarvisData } from '../../../data/index.ts';

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

export const copilotCommandTool: ToolDefinition<{ command: string; classSessionId?: string }> = {
  name: 'copilot.command',
  sector: 'education',
  description: 'Executes or proposes an action via the Real-Time Teaching Copilot.',
  declaration: {
    name: 'copilot_command',
    description: 'Execute or propose a teaching copilot command',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: 'Teacher command e.g. "Plot this", "Start quiz", "Explain concept"' },
        classSessionId: { type: Type.STRING, description: 'Active ClassSession ID' }
      },
      required: ['command']
    }
  },
  validate(args: unknown): ValidationResult<any> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.command) return { valid: false, error: 'command is required' };
    return { valid: true, data: a };
  },
  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const boundedContext = copilotService.buildContext({ classSessionId: args.classSessionId });
      const result = await copilotService.processCommand(user, args.command, boundedContext);
      return { ok: true, data: result as any };
    } catch (err: any) {
      return { ok: false, error: { code: 'COPILOT_ERROR', message: err?.message || 'Command failed' } };
    }
  }
};

export const copilotReviewTool: ToolDefinition<{ proposalId: string; decision: 'APPROVE' | 'REJECT'; reason?: string }> = {
  name: 'copilot.proposals.review',
  sector: 'education',
  description: 'Approves or rejects a Teaching Copilot proposal.',
  declaration: {
    name: 'copilot_proposals_review',
    description: 'Review copilot proposal',
    parameters: {
      type: Type.OBJECT,
      properties: {
        proposalId: { type: Type.STRING, description: 'Proposal ID' },
        decision: { type: Type.STRING, description: 'APPROVE or REJECT' },
        reason: { type: Type.STRING, description: 'Optional rejection reason' }
      },
      required: ['proposalId', 'decision']
    }
  },
  validate(args: unknown): ValidationResult<any> {
    const a = (args && typeof args === 'object' ? args : {}) as any;
    if (!a.proposalId || !a.decision) return { valid: false, error: 'proposalId and decision are required' };
    return { valid: true, data: a };
  },
  async execute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const updated = await copilotService.reviewProposal(user, args.proposalId, args.decision, { rejectionReason: args.reason });
      return { ok: true, data: { proposal: updated as any } };
    } catch (err: any) {
      return { ok: false, error: { code: 'REVIEW_ERROR', message: err?.message || 'Review failed' } };
    }
  }
};

export const copilotTools = [copilotCommandTool, copilotReviewTool];
