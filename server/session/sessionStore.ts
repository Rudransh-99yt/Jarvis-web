import type { ConversationMessage, MessageRole } from '../../src/types/api.ts';
import { jarvisData } from '../data/index.ts';

export interface ConversationSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

class SessionStore {
  getOrCreateSession(sessionId: string | undefined, workspaceId: string, userId: string): ConversationSession {
    const id = sessionId && sessionId.trim().length > 0
      ? sessionId.trim()
      : `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const state = (jarvisData as any)['store'] ? (jarvisData as any)['store'].getState() : null;
    if (state && Array.isArray(state.conversations)) {
      let conv = state.conversations.find((c: any) => c.id === id);
      const now = new Date().toISOString();
      if (!conv) {
        conv = {
          id,
          workspaceId,
          userId,
          title: 'New Conversation',
          sector: 'command',
          createdAt: now,
          updatedAt: now,
          messageCount: 0
        };
        (jarvisData as any)['store'].mutate((s: any) => {
          s.conversations.push(conv);
        });
      } else if (conv.userId !== userId || conv.workspaceId !== workspaceId) {
        throw new Error('CONVERSATION_FORBIDDEN');
      }

      const msgs = (state.messages || [])
        .filter((m: any) => m.conversationId === id)
        .map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          toolCall: m.toolCall,
          toolResult: m.toolResult
        }));

      return {
        id: conv.id,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages: msgs
      };
    }

    return {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
  }

  addMessage(sessionId: string, role: MessageRole, content: string, extra?: { toolCall?: any; toolResult?: any }): ConversationMessage {
    const now = new Date().toISOString();
    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role,
      content,
      timestamp: now,
      toolCall: extra?.toolCall,
      toolResult: extra?.toolResult
    };

    if ((jarvisData as any)['store']) {
      (jarvisData as any)['store'].mutate((state: any) => {
        let conv = state.conversations.find((c: any) => c.id === sessionId);
        if (!conv) {
          throw new Error('Conversation must be created with a verified owner before messages can be appended.');
        } else {
          conv.updatedAt = now;
          if (conv.title === 'New Conversation' && content.trim()) {
            conv.title = content.slice(0, 35);
          }
        }

        state.messages.push({
          ...message,
          conversationId: sessionId
        });

        // Prune excessive messages per session to keep sliding window healthy
        const sessionMsgs = state.messages.filter((m: any) => m.conversationId === sessionId);
        if (sessionMsgs.length > 60) {
          const excess = sessionMsgs.length - 60;
          let removed = 0;
          state.messages = state.messages.filter((m: any) => {
            if (m.conversationId === sessionId && removed < excess) {
              removed++;
              return false;
            }
            return true;
          });
        }
      });
    }

    return message;
  }

  getMessages(sessionId: string, limit?: number): ConversationMessage[] {
    const state = (jarvisData as any)['store'] ? (jarvisData as any)['store'].getState() : null;
    if (state && Array.isArray(state.messages)) {
      const msgs = state.messages
        .filter((m: any) => m.conversationId === sessionId)
        .map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          toolCall: m.toolCall,
          toolResult: m.toolResult
        }));

      msgs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (limit && limit > 0) {
        return msgs.slice(-limit);
      }
      return msgs;
    }
    return [];
  }

  clearSession(sessionId: string): void {
    if ((jarvisData as any)['store']) {
      (jarvisData as any)['store'].mutate((state: any) => {
        state.messages = state.messages.filter((m: any) => m.conversationId !== sessionId);
        state.conversations = state.conversations.filter((c: any) => c.id !== sessionId);
      });
    }
  }
}

export const sessionStore = new SessionStore();
