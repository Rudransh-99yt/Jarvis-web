import type { ConversationMessage, MessageRole } from '../../src/types/api.ts';
import { jarvisData } from '../data/index.ts';

export interface ConversationSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

interface CachedSessionEntry {
  session: ConversationSession;
  messages: ConversationMessage[];
  workspaceId: string;
  userId: string;
}

class SessionStore {
  private syncCache = new Map<string, CachedSessionEntry>();

  getOrCreateSession(
    sessionId: string | undefined,
    workspaceId: string = 'ws-stark-core',
    userId: string = 'user-tony'
  ): ConversationSession & Promise<ConversationSession> {
    const id = sessionId && sessionId.trim().length > 0
      ? sessionId.trim()
      : `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Check in-memory sync cache for immediate continuity and multi-tenant isolation
    let cached = this.syncCache.get(id);
    if (cached) {
      if (cached.userId !== userId || cached.workspaceId !== workspaceId) {
        throw new Error('CONVERSATION_FORBIDDEN');
      }
    } else {
      const now = new Date().toISOString();
      const initialSession: ConversationSession = {
        id,
        createdAt: now,
        updatedAt: now,
        messages: []
      };
      cached = { session: initialSession, messages: [], workspaceId, userId };
      this.syncCache.set(id, cached);
    }

    const promise = jarvisData.conversations.getOrCreateSession(id, workspaceId, userId)
      .then((session) => {
        // Sync cache with repository
        if (cached) {
          cached.session = session;
          if (session.messages && session.messages.length > 0) {
            cached.messages = [...session.messages];
          }
        }
        return session;
      })
      .catch((err) => {
        // Clean up cache entry if repository rejected with CONVERSATION_FORBIDDEN or other error
        this.syncCache.delete(id);
        throw err;
      });

    return Object.assign(promise, cached.session, {
      messages: cached.messages
    });
  }

  addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    extra?: { toolCall?: any; toolResult?: any }
  ): ConversationMessage & Promise<ConversationMessage> {
    const now = new Date().toISOString();
    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role,
      content,
      timestamp: now,
      toolCall: extra?.toolCall,
      toolResult: extra?.toolResult
    };

    let cached = this.syncCache.get(sessionId);
    if (!cached) {
      cached = {
        session: { id: sessionId, createdAt: now, updatedAt: now, messages: [] },
        messages: [],
        workspaceId: 'ws-stark-core',
        userId: 'user-tony'
      };
      this.syncCache.set(sessionId, cached);
    }
    cached.messages.push(message);
    cached.session.updatedAt = now;
    if (cached.messages.length > 60) {
      cached.messages = cached.messages.slice(-60);
    }

    const promise = jarvisData.conversations.addSessionMessage(sessionId, role, content, extra).then((persisted) => {
      return persisted;
    });

    return Object.assign(promise, message);
  }

  getMessages(sessionId: string, limit?: number): ConversationMessage[] & Promise<ConversationMessage[]> {
    const cached = this.syncCache.get(sessionId);
    let msgs: ConversationMessage[] = cached ? [...cached.messages] : [];
    if (limit && limit > 0) {
      msgs = msgs.slice(-limit);
    }

    const promise = jarvisData.conversations.getSessionMessages(sessionId, limit).then((repoMsgs) => {
      if (cached && repoMsgs && repoMsgs.length > cached.messages.length) {
        cached.messages = [...repoMsgs];
      }
      return repoMsgs;
    });

    return Object.assign(promise, msgs, { length: msgs.length });
  }

  clearSession(sessionId: string): Promise<boolean> & { success: boolean } {
    this.syncCache.delete(sessionId);
    const promise = jarvisData.conversations.clearSession(sessionId);
    return Object.assign(promise, { success: true });
  }

  getActiveSessionCount(): number {
    return Math.max(this.syncCache.size, 1);
  }

  async getActiveSessionCountAsync(): Promise<number> {
    const count = await jarvisData.conversations.getActiveSessionCount();
    return Math.max(count, this.syncCache.size, 1);
  }
}

export const sessionStore = new SessionStore();
