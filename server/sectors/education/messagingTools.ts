// Milestone 11: Deterministic Messaging Tools for Educational Sector
import { Type } from '@google/genai';
import type { ToolDefinition, ToolExecutionContext, ToolResult, ValidationResult } from '../../tools/types.ts';
import { messagingService } from './messagingService.ts';
import { jarvisData } from '../../data/index.ts';
import type { User } from '../../data/types.ts';

// Helper to resolve user from context
async function resolveUserFromContext(context: ToolExecutionContext): Promise<User> {
  const userId = context.userId;
  if (!userId) {
    throw new Error('Tool execution error: Unauthenticated tool context (missing userId).');
  }
  const existing = await jarvisData.users.getById(userId);
  if (!existing) {
    throw new Error(`Tool execution error: User '${userId}' is not a registered user.`);
  }
  return existing;
}

// 1. Tool: messaging.thread.list
interface ListThreadsArgs {
  classId: string;
  workspaceId?: string;
}

export const listThreadsTool: ToolDefinition<ListThreadsArgs> = {
  name: 'messaging.thread.list',
  sector: 'education',
  aliases: ['list_threads', 'messaging_threads', 'get_class_threads'],
  description: 'Lists all discussion threads and channels for an authorized academic class.',
  declaration: {
    name: 'messaging_thread_list',
    description: 'Retrieve discussion channels and message threads for a class.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'ID of the class (e.g. "class-phys-301")' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID filter' }
      },
      required: ['classId']
    }
  },
  validate(args: unknown): ValidationResult<ListThreadsArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.classId !== 'string' || !a.classId.trim()) {
      return { valid: false, error: "Parameter 'classId' is required and must be a non-empty string." };
    }
    return {
      valid: true,
      data: {
        classId: a.classId.trim(),
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined
      }
    };
  },
  async execute(args: ListThreadsArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || 'ws-stark-core';
      const threads = await messagingService.listThreads(args.classId, workspaceId, user);

      return {
        ok: true,
        data: {
          classId: args.classId,
          count: threads.length,
          threads: threads.map((t: any) => ({
            id: t.id,
            title: t.title,
            classId: t.classId,
            messageCount: t.messageCount || 0,
            updatedAt: t.updatedAt,
            lastMessage: t.lastMessage ? {
              sender: t.lastMessage.senderName,
              body: t.lastMessage.body,
              timestamp: t.lastMessage.createdAt || t.lastMessage.timestamp
            } : undefined
          }))
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'LIST_THREADS_FAILED', message: err.message || 'Failed to list discussion threads' }
      };
    }
  }
};

// 2. Tool: messaging.message.list
interface ListMessagesArgs {
  classId: string;
  threadId?: string;
  workspaceId?: string;
  limit?: number;
}

export const listMessagesTool: ToolDefinition<ListMessagesArgs> = {
  name: 'messaging.message.list',
  sector: 'education',
  aliases: ['list_messages', 'messaging_messages', 'get_class_messages'],
  description: 'Lists chronological messages in a class or thread, including sender details and file attachments.',
  declaration: {
    name: 'messaging_message_list',
    description: 'Retrieve message history for an authorized course or discussion thread.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'ID of the class (e.g. "class-phys-301")' },
        threadId: { type: Type.STRING, description: 'Optional specific thread ID' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' },
        limit: { type: Type.NUMBER, description: 'Maximum messages to return (default 50)' }
      },
      required: ['classId']
    }
  },
  validate(args: unknown): ValidationResult<ListMessagesArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.classId !== 'string' || !a.classId.trim()) {
      return { valid: false, error: "Parameter 'classId' is required and must be a non-empty string." };
    }
    return {
      valid: true,
      data: {
        classId: a.classId.trim(),
        threadId: typeof a.threadId === 'string' ? a.threadId.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined,
        limit: typeof a.limit === 'number' ? a.limit : undefined
      }
    };
  },
  async execute(args: ListMessagesArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || 'ws-stark-core';
      const messages = await messagingService.listMessages(args.classId, workspaceId, user, {
        threadId: args.threadId,
        limit: args.limit
      });

      return {
        ok: true,
        data: {
          classId: args.classId,
          count: messages.length,
          messages: messages.map((m: any) => ({
            id: m.id,
            senderUserId: m.senderUserId,
            senderName: m.senderName,
            senderRole: m.senderRole,
            body: m.body,
            attachmentCount: m.attachmentFileIds?.length || 0,
            attachments: m.attachments?.map((f: any) => ({
              id: f.id,
              originalName: f.originalName,
              extension: f.extension,
              sizeBytes: f.sizeBytes
            })),
            timestamp: m.createdAt || m.timestamp,
            readBy: m.readBy
          }))
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'LIST_MESSAGES_FAILED', message: err.message || 'Failed to list messages' }
      };
    }
  }
};

// 3. Tool: messaging.message.send
interface SendMessageArgs {
  classId: string;
  body: string;
  threadId?: string;
  workspaceId?: string;
  attachmentFileIds?: string[];
}

export const sendMessageTool: ToolDefinition<SendMessageArgs> = {
  name: 'messaging.message.send',
  sector: 'education',
  aliases: ['send_message', 'messaging_send', 'post_class_message'],
  description: 'Sends a persistent message to an authorized class with real-time broadcast and optional file attachments.',
  declaration: {
    name: 'messaging_message_send',
    description: 'Post a communication message or file attachment into a class.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: 'ID of the class to message' },
        body: { type: Type.STRING, description: 'Text content of the message' },
        threadId: { type: Type.STRING, description: 'Optional discussion thread ID' },
        workspaceId: { type: Type.STRING, description: 'Optional workspace ID' },
        attachmentFileIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Optional array of FileRecord IDs to attach'
        }
      },
      required: ['classId', 'body']
    }
  },
  validate(args: unknown): ValidationResult<SendMessageArgs> {
    if (typeof args !== 'object' || args === null) {
      return { valid: false, error: 'Arguments object required.' };
    }
    const a = args as any;
    if (typeof a.classId !== 'string' || !a.classId.trim()) {
      return { valid: false, error: "Parameter 'classId' is required and must be a non-empty string." };
    }
    if (typeof a.body !== 'string' || !a.body.trim()) {
      return { valid: false, error: "Parameter 'body' is required and must be non-empty text." };
    }
    return {
      valid: true,
      data: {
        classId: a.classId.trim(),
        body: a.body.trim(),
        threadId: typeof a.threadId === 'string' ? a.threadId.trim() : undefined,
        workspaceId: typeof a.workspaceId === 'string' ? a.workspaceId.trim() : undefined,
        attachmentFileIds: Array.isArray(a.attachmentFileIds) ? a.attachmentFileIds : undefined
      }
    };
  },
  async execute(args: SendMessageArgs, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      const user = await resolveUserFromContext(context);
      const workspaceId = args.workspaceId || 'ws-stark-core';

      const result = await messagingService.sendMessage(
        {
          classId: args.classId,
          workspaceId,
          body: args.body,
          threadId: args.threadId,
          attachmentFileIds: args.attachmentFileIds
        },
        user
      );

      return {
        ok: true,
        data: {
          messageId: result.message.id,
          classId: args.classId,
          senderName: result.message.senderName,
          body: result.message.body,
          attachmentsAttached: result.message.attachmentFileIds?.length || 0,
          notificationSent: result.notification.title,
          timestamp: result.message.createdAt
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: { code: 'SEND_MESSAGE_FAILED', message: err.message || 'Failed to send message' }
      };
    }
  }
};
