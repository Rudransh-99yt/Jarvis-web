import type { ConversationMessage } from '../../src/types/api.ts';
import type { FunctionDeclaration } from '@google/genai';
import type { ToolCall } from '../tools/types.ts';

export interface GenerateOptions {
  temperature?: number;
  context?: {
    activeProtocol?: string;
    deployedArmors?: string[];
    userTimezone?: string;
  };
  tools?: FunctionDeclaration[];
}

export interface ProviderResult {
  reply: string;
  speechText?: string;
  toolCalls?: ToolCall[];
}

export interface TurnWithToolsResult {
  reply?: string;
  toolCalls?: ToolCall[];
  rawCandidateContent?: any;
}

export interface AiProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  generateResponse(messages: ConversationMessage[], options?: GenerateOptions): Promise<ProviderResult>;
  generateStream(
    messages: ConversationMessage[],
    options?: GenerateOptions,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, ProviderResult, unknown>;
  generateTurnWithTools?(
    contents: any[],
    options?: GenerateOptions
  ): Promise<TurnWithToolsResult>;
}
