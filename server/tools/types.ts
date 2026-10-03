import type { FunctionDeclaration } from '@google/genai';

export interface ToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export interface ToolExecutionContext {
  sessionId: string;
  timestamp: string;
  serverUptime: number;
  sector?: string;
  userId?: string;
  role?: string;
}

export interface ValidationSuccess<T = Record<string, unknown>> {
  valid: true;
  data: T;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type ValidationResult<T = Record<string, unknown>> = ValidationSuccess<T> | ValidationFailure;

export interface ToolDefinition<TArgs = Record<string, unknown>> {
  readonly name: string;
  readonly sector?: 'system' | 'education' | 'knowledge' | 'research' | 'storage' | 'all';
  readonly aliases?: string[];
  readonly description: string;
  readonly declaration: FunctionDeclaration;
  validate(args: unknown): ValidationResult<TArgs>;
  execute(args: TArgs, context: ToolExecutionContext): Promise<ToolResult>;
}
