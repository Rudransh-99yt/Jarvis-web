// Shared API Request and Response Schemas for Web Jarvis

export * from './platform.ts';
export * from './education.ts';

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  service: string;
  uptimeSeconds: number;
  timestamp: string;
  provider: {
    name: string;
    available: boolean;
  };
  sectors?: {
    active: string[];
    available: string[];
  };
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  toolCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  toolResult?: {
    name: string;
    ok: boolean;
    data?: Record<string, unknown>;
  };
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  conversationId?: string; // alias for sessionId
  context?: {
    sector?: 'command' | 'education' | 'all' | string;
    role?: 'commander' | 'teacher' | 'student' | 'admin' | string;
    userId?: string;
    workspaceId?: string;
    activeSpaceId?: string;
    activeClassId?: string;
    activeProtocol?: string;
    deployedArmors?: string[];
    userTimezone?: string;
  };
  stream?: boolean;
}

export interface ChatActionPayload {
  type: 'PROTOCOL_TRIGGER' | 'ARMOR_DEPLOY' | 'SCAN' | 'TOOL_EXEC' | 'CLEAR_LOGS' | 'ADD_DIRECTIVE' | 'ALARM' | 'ASSIGNMENT_SUBMIT' | 'KNOWLEDGE_NAV';
  payload?: any;
}

export interface ChatResponse {
  id: string;
  sessionId: string;
  reply: string;
  speechText?: string;
  action?: ChatActionPayload;
  timestamp: string;
  source: 'gemini' | 'server-mock' | 'local-heuristic';
  toolsExecuted?: Array<{
    name: string;
    ok: boolean;
    data?: Record<string, unknown>;
  }>;
}

// Streaming SSE Events sent over POST /api/chat when stream=true
export type StreamEventType = 'start' | 'tool_start' | 'tool_result' | 'chunk' | 'done' | 'error';

export interface ToolEventMetadata {
  name: string;
  callId?: string;
  args?: Record<string, unknown>;
}

export interface ToolEventResult {
  name: string;
  callId?: string;
  ok: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export interface StreamEventData {
  type: StreamEventType;
  id?: string;
  sessionId?: string;
  chunk?: string;
  fullReply?: string;
  speechText?: string;
  source?: 'gemini' | 'server-mock' | 'local-heuristic';
  error?: string;
  tool?: ToolEventMetadata;
  result?: ToolEventResult;
  protocols?: any[];
  timestamp?: string;
}
