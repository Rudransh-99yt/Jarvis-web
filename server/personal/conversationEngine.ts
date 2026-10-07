import { personalIdentityStore } from './identityStore.ts';
import { contextEngine } from './contextEngine.ts';
import { personalMemoryStore } from './memoryStore.ts';
import { contextOrchestrator } from './contextOrchestrator.ts';
import { conversationProviderManager } from './providers/conversationProviderManager.ts';
import { personalToolRegistry, confirmationPolicy, intentDetector } from './tools/index.ts';
import type {
  ConversationSession,
  SessionMessage,
  AssistantState,
  WakeState,
  ConversationTurnResult,
  ConversationGenerationOptions,
  UserContextType,
  PersonalToolExecutionContext,
  PersonalToolExecutionResult
} from './types.ts';

export interface ProcessTurnInput {
  sessionId: string;
  userId: string;
  message: string;
  source?: 'text' | 'voice';
  contextId?: string;
  options?: ConversationGenerationOptions;
}

/**
 * ConversationEngine
 * Persistent, multi-context conversation layer orchestrating PersonalJarvisIdentity,
 * active context resolution, bounded memory retrieval, knowledge states, and AI providers.
 */
export class ConversationEngine {
  private sessions: Map<string, ConversationSession> = new Map();

  /**
   * Retrieves an existing session or provisions a new one for the user
   */
  async getOrCreateSession(
    sessionId: string,
    userId: string,
    contextId?: string,
    inputType: 'text' | 'voice' = 'text'
  ): Promise<ConversationSession> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      const identity = await personalIdentityStore.getIdentity(userId);
      const activeContext = contextId
        ? identity.contexts.find((c) => c.id === contextId) || (await contextEngine.getActiveContext(userId))
        : await contextEngine.getActiveContext(userId);

      session = {
        sessionId,
        userId,
        activeContextId: activeContext.id,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assistantState: 'IDLE',
        wakeState: 'STANDBY',
        recentTurnsCount: 0,
        lastInteractionTimestamp: new Date().toISOString(),
        relevantMemoryIds: [],
        relevantKnowledgeConceptIds: [],
        provenance: {
          inputType,
          channel: 'jarvis-web-os',
          contextType: activeContext.type as UserContextType,
          institutionId: activeContext.metadata?.institutionId
        }
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getSessionsForUser(userId: string): Promise<ConversationSession[]> {
    return Array.from(this.sessions.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Core orchestrator method: processes a conversation turn
   */
  async processConversationTurn(input: ProcessTurnInput): Promise<{
    session: ConversationSession;
    reply: string;
    suggestedNextActions?: string[];
    relevantMemoryIds: string[];
    relevantConceptIds: string[];
    searchAttributions?: any[];
    persistedMemoriesCount: number;
    providerId: string;
  }> {
    const session = await this.getOrCreateSession(
      input.sessionId,
      input.userId,
      input.contextId,
      input.source || 'text'
    );

    // 1. Transition state to THINKING
    session.assistantState = 'THINKING';
    session.lastInteractionTimestamp = new Date().toISOString();

    // 2. Append User Message
    const userMsgId = `msg-u-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const userMessage: SessionMessage = {
      id: userMsgId,
      role: 'user',
      content: input.message.trim(),
      timestamp: new Date().toISOString(),
      source: input.source || 'text'
    };
    session.messages.push(userMessage);
    session.recentTurnsCount++;

    // 3. Resolve context and check Action / Tool Intelligence Intent
    const identity = await personalIdentityStore.getIdentity(input.userId);
    const activeContext = input.contextId
      ? identity.contexts.find((c) => c.id === input.contextId) || (await contextEngine.getActiveContext(input.userId))
      : await contextEngine.getActiveContext(input.userId);

    const execContext: PersonalToolExecutionContext = {
      userId: input.userId,
      contextId: activeContext.id,
      contextType: activeContext.type,
      permissions: activeContext.permissions,
      sessionId: session.sessionId
    };

    const detectedIntent = intentDetector.detectIntent(input.message, execContext);

    if (detectedIntent) {
      let toolResult: PersonalToolExecutionResult;

      // Handle confirmed pending action
      if (detectedIntent.arguments.__pendingActionId) {
        const pendingId = detectedIntent.arguments.__pendingActionId;
        const pendingAction = confirmationPolicy.consumePendingAction(pendingId, input.userId);
        if (pendingAction) {
          toolResult = await personalToolRegistry.executeTool(
            pendingAction.toolId,
            execContext,
            pendingAction.arguments,
            { bypassConfirmationCheck: true }
          );
        } else {
          toolResult = {
            success: false,
            toolId: detectedIntent.toolId,
            error: { code: 'PENDING_ACTION_EXPIRED', message: 'Pending action expired or not found.' },
            userMessage: 'The pending confirmation request has expired or was already processed, sir.'
          };
        }
      } else {
        toolResult = await personalToolRegistry.executeTool(
          detectedIntent.toolId,
          execContext,
          detectedIntent.arguments
        );
      }

      session.assistantState = 'IDLE';

      const reply = intentDetector.generateNaturalResponse(
        detectedIntent.toolId,
        toolResult,
        identity.profile.preferredName
      );

      // Handle optional activity recording
      let persistedMemoriesCount = 0;
      if (toolResult.activityEvent && toolResult.activityEvent.provenance === 'USER_STATED') {
        await personalMemoryStore.addMemory({
          userId: input.userId,
          category: 'UserPreference',
          key: `activity_${toolResult.activityEvent.type}`,
          value: toolResult.activityEvent.title,
          source: 'USER_STATED',
          confidence: 1.0,
          contextId: session.activeContextId,
          visibility: 'PRIVATE_PERSONAL',
          provenance: {
            sourceEntityType: 'tool',
            sourceEntityId: toolResult.toolId,
            timestamp: new Date().toISOString(),
            notes: toolResult.activityEvent.title
          }
        });
        persistedMemoriesCount++;
      }

      // Append Assistant Message
      const assistantMsgId = `msg-a-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const assistantMessage: SessionMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
        metadata: {
          toolExecution: {
            toolId: detectedIntent.toolId,
            success: toolResult.success,
            data: toolResult.data,
            confirmationRequired: toolResult.metadata?.confirmationRequired,
            pendingActionId: toolResult.metadata?.pendingActionId
          }
        }
      };
      session.messages.push(assistantMessage);
      session.updatedAt = new Date().toISOString();

      return {
        session,
        reply,
        suggestedNextActions: toolResult.metadata?.confirmationRequired
          ? ['Confirm Action', 'Cancel']
          : ['Ask another question', 'View personal notes'],
        relevantMemoryIds: [],
        relevantConceptIds: [],
        persistedMemoriesCount,
        providerId: 'personal-tool-engine'
      };
    }

    // 4. Build Bounded Context Prompt via Orchestrator for Conversational Flow
    const boundedPrompt = await contextOrchestrator.buildBoundedPrompt({
      userId: input.userId,
      contextId: input.contextId || session.activeContextId,
      currentMessage: input.message,
      recentMessages: session.messages,
      allowWebSearch: input.options?.allowWebSearch
    });

    const relevantMemoryIds = boundedPrompt.relevantMemories.map((m) => m.id);
    const relevantConceptIds = boundedPrompt.relevantKnowledge.map((k) => k.conceptId);
    session.relevantMemoryIds = Array.from(new Set([...session.relevantMemoryIds, ...relevantMemoryIds]));
    session.relevantKnowledgeConceptIds = Array.from(new Set([...session.relevantKnowledgeConceptIds, ...relevantConceptIds]));

    // 5. Generate AI response via Provider Layer
    const { provider } = await conversationProviderManager.getActiveProvider();
    let turnResult: ConversationTurnResult;
    try {
      turnResult = await provider.generateConversationTurn(boundedPrompt, input.options);
    } catch (err) {
      // Fallback to deterministic mock core if provider fails
      const fallback = conversationProviderManager.getFallbackProvider();
      turnResult = await fallback.generateConversationTurn(boundedPrompt, input.options);
    }

    // 6. Transition state through SPEAKING to IDLE (voice-ready contract)
    session.assistantState = 'IDLE';

    // 7. Memory Write-Back Evaluation
    let persistedMemoriesCount = 0;
    if (turnResult.memoriesToWrite && turnResult.memoriesToWrite.length > 0) {
      for (const m of turnResult.memoriesToWrite) {
        await personalMemoryStore.addMemory({
          userId: input.userId,
          category: m.category,
          key: m.key,
          value: m.value,
          source: m.source,
          confidence: m.confidence || 1.0,
          contextId: session.activeContextId,
          visibility: m.visibility || 'PRIVATE_PERSONAL',
          provenance: {
            sourceEntityType: 'chat',
            sourceEntityId: session.sessionId,
            timestamp: new Date().toISOString(),
            notes: m.notes || `Extracted from conversation session ${session.sessionId}`
          }
        });
        persistedMemoriesCount++;
      }
    }

    // 8. Append Assistant Message
    const assistantMsgId = `msg-a-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const assistantMessage: SessionMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: turnResult.reply,
      timestamp: new Date().toISOString(),
      relevantMemoryIds,
      relevantConceptIds,
      searchAttributions: turnResult.searchAttributions,
      metadata: {
        providerId: turnResult.providerId,
        suggestedNextActions: turnResult.suggestedNextActions
      }
    };
    session.messages.push(assistantMessage);
    session.updatedAt = new Date().toISOString();

    return {
      session,
      reply: turnResult.reply,
      suggestedNextActions: turnResult.suggestedNextActions,
      relevantMemoryIds,
      relevantConceptIds,
      searchAttributions: turnResult.searchAttributions,
      persistedMemoriesCount,
      providerId: turnResult.providerId
    };
  }

  async transitionAssistantState(sessionId: string, nextState: AssistantState): Promise<ConversationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.assistantState = nextState;
    session.lastInteractionTimestamp = new Date().toISOString();
    return session;
  }

  async setWakeState(sessionId: string, wakeState: WakeState): Promise<ConversationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.wakeState = wakeState;
    session.lastInteractionTimestamp = new Date().toISOString();
    return session;
  }

  async buildPersonalContextPromptPrefix(userId: string): Promise<string> {
    const identity = await personalIdentityStore.getIdentity(userId);
    const activeContext = await contextEngine.getActiveContext(userId);

    return `[PERSONAL JARVIS CONTEXT]
User: ${identity.profile.displayName} (Preferred: ${identity.profile.preferredName})
Active Context: ${activeContext.title} (${activeContext.type})
Explanation Style: ${identity.preferences.explanationStyle}
Tone: ${identity.preferences.tone}
Active Goals: ${identity.goals.filter((g) => g.status === 'active').map((g) => g.title).join('; ') || 'None'}
Interests: ${identity.interests.join(', ')}`;
  }
}

export const conversationEngine = new ConversationEngine();
