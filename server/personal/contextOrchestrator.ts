import { personalIdentityStore } from './identityStore.ts';
import { contextEngine } from './contextEngine.ts';
import { personalMemoryStore } from './memoryStore.ts';
import { personalKnowledgeStore } from './knowledgeStore.ts';
import { webSearchProvider } from './webSearchProvider.ts';
import type {
  BoundedConversationPrompt,
  PersonalMemoryItem,
  PersonalKnowledgeConceptState,
  NextBestAction,
  WebSearchResult,
  UserContext,
  SessionMessage
} from './types.ts';

export interface PromptContextBuildOptions {
  userId: string;
  contextId?: string;
  currentMessage: string;
  recentMessages?: SessionMessage[];
  allowWebSearch?: boolean;
}

export class ContextOrchestrator {
  /**
   * Deterministically filters and ranks memories relevant to the user query and active context
   */
  async filterRelevantMemories(
    userId: string,
    activeContext: UserContext,
    query: string,
    limit: number = 4
  ): Promise<PersonalMemoryItem[]> {
    const allMemories = await personalMemoryStore.getMemories(userId);
    const lowerQuery = query.toLowerCase();

    // 1. Enforce strict visibility and privacy boundaries
    const visibleMemories = allMemories.filter((mem) => {
      // In PERSONAL or EDUCATION context: personal Jarvis can access user's PRIVATE_PERSONAL memories and CONTEXT_BOUND
      if (activeContext.type === 'PERSONAL' || activeContext.type === 'EDUCATION') {
        if (mem.visibility === 'PRIVATE_PERSONAL') return true;
        if (mem.visibility === 'CONTEXT_BOUND' && (!mem.contextId || mem.contextId === activeContext.id)) return true;
        return mem.visibility === 'INSTITUTION_SHARED';
      }

      // In TEACHER or INSTITUTION context:
      // Strictly enforce privacy isolation - personal memories are forbidden unless explicit permission is granted
      if (mem.visibility === 'PRIVATE_PERSONAL') {
        return activeContext.permissions.sharePersonalMemory === true;
      }

      if (mem.visibility === 'CONTEXT_BOUND') {
        return mem.contextId === activeContext.id;
      }

      if (mem.visibility === 'INSTITUTION_SHARED') {
        return true;
      }

      return false;
    });

    // 2. Score and rank memories by relevance to current conversation query
    const scored = visibleMemories.map((mem) => {
      let score = 0.1; // Base score for visible memory
      const memValStr = typeof mem.value === 'string' ? mem.value.toLowerCase() : JSON.stringify(mem.value).toLowerCase();
      const memKeyStr = mem.key.toLowerCase();

      // Topic keywords
      if (lowerQuery.includes('explain') || lowerQuery.includes('style') || lowerQuery.includes('teach') || lowerQuery.includes('way i like')) {
        if (mem.category === 'UserPreference') score += 10.0;
      }

      if (lowerQuery.includes('goal') || lowerQuery.includes('exam') || lowerQuery.includes('target') || lowerQuery.includes('score') || lowerQuery.includes('aim')) {
        if (mem.category === 'UserGoal') score += 10.0;
      }

      if (lowerQuery.includes('physics') || lowerQuery.includes('mechanics') || lowerQuery.includes('newton') || lowerQuery.includes('vector')) {
        if (memValStr.includes('physics') || memValStr.includes('mechanics') || memValStr.includes('vector') || memKeyStr.includes('physics') || memKeyStr.includes('vector')) {
          score += 8.0;
        }
      }

      if (lowerQuery.includes('calculus') || lowerQuery.includes('math') || lowerQuery.includes('derivative')) {
        if (memValStr.includes('calculus') || memValStr.includes('derivative') || memKeyStr.includes('calc')) {
          score += 8.0;
        }
      }

      // Word intersection
      const queryTokens = lowerQuery.split(/\s+/).filter((t) => t.length > 3);
      for (const token of queryTokens) {
        if (memValStr.includes(token) || memKeyStr.includes(token)) {
          score += 2.0;
        }
      }

      // Boost high confidence & verified sources
      if (mem.source === 'USER_STATED' || mem.source === 'USER_CONFIRMED') score += 1.0;
      if (mem.confidence) score += mem.confidence;

      return { mem, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.mem);
  }

  /**
   * Deterministically retrieves verified concept knowledge relevant to the conversation
   */
  async filterRelevantKnowledge(
    userId: string,
    _activeContext: UserContext,
    query: string
  ): Promise<PersonalKnowledgeConceptState[]> {
    const knowledge = await personalKnowledgeStore.getKnowledge(userId);
    const concepts = Object.values(knowledge.concepts);
    const lowerQuery = query.toLowerCase();

    // Check if query is asking about progress, mastery, or specific concepts
    const isProgressQuery = lowerQuery.includes('how am i doing') || lowerQuery.includes('progress') || lowerQuery.includes('mastery') || lowerQuery.includes('status');

    if (isProgressQuery) {
      return concepts.slice(0, 5);
    }

    const matched: PersonalKnowledgeConceptState[] = [];
    for (const c of concepts) {
      const nameLower = c.conceptName.toLowerCase();
      const subjectLower = c.subject.toLowerCase();
      if (
        lowerQuery.includes(nameLower) ||
        (nameLower.includes('newton') && lowerQuery.includes('newton')) ||
        (nameLower.includes('vector') && lowerQuery.includes('vector')) ||
        (nameLower.includes('wave') && lowerQuery.includes('quantum')) ||
        (nameLower.includes('chain') && lowerQuery.includes('calculus')) ||
        lowerQuery.includes(subjectLower)
      ) {
        matched.push(c);
      }
    }

    return matched;
  }

  /**
   * Evaluates if web search is truly required and performs search if appropriate
   */
  async resolveWebSearchIfNeeded(query: string, allowWebSearch?: boolean): Promise<WebSearchResult[] | undefined> {
    const lower = query.toLowerCase();
    const isExplicitSearchRequest =
      lower.includes('search the web') ||
      lower.includes('search web for') ||
      lower.includes('look up online') ||
      lower.includes('latest news') ||
      lower.includes('current research on') ||
      lower.includes('external sources for') ||
      lower.includes('cite web references');

    if (!isExplicitSearchRequest && !allowWebSearch) {
      return undefined;
    }

    try {
      const results = await webSearchProvider.search(query, { maxResults: 3 });
      return results.length > 0 ? results : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Builds bounded prompt context for AI conversation reasoning
   */
  async buildBoundedPrompt(options: PromptContextBuildOptions): Promise<BoundedConversationPrompt> {
    const identity = await personalIdentityStore.getIdentity(options.userId);
    
    // Resolve active context
    let activeContext: UserContext;
    if (options.contextId) {
      const found = identity.contexts.find((c) => c.id === options.contextId);
      activeContext = found || (await contextEngine.getActiveContext(options.userId));
    } else {
      activeContext = await contextEngine.getActiveContext(options.userId);
    }

    // Retrieve bounded relevant memories
    const relevantMemories = await this.filterRelevantMemories(
      options.userId,
      activeContext,
      options.currentMessage,
      4
    );

    // Retrieve bounded relevant knowledge
    const relevantKnowledge = await this.filterRelevantKnowledge(
      options.userId,
      activeContext,
      options.currentMessage
    );

    // Retrieve Next Best Action if in educational context
    let nextBestAction: NextBestAction | undefined;
    if (activeContext.type === 'EDUCATION' || activeContext.type === 'PERSONAL') {
      nextBestAction = await personalKnowledgeStore.computeNextBestAction(options.userId, activeContext.title);
    }

    // Resolve optional web search
    const webSearchResults = await this.resolveWebSearchIfNeeded(
      options.currentMessage,
      options.allowWebSearch
    );

    const recentMessages = (options.recentMessages || []).slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    }));

    return {
      identitySummary: {
        userId: identity.userId,
        displayName: identity.profile.displayName,
        preferredName: identity.profile.preferredName,
        roles: identity.roles
      },
      activeContext: {
        id: activeContext.id,
        type: activeContext.type,
        title: activeContext.title,
        description: activeContext.description,
        metadata: activeContext.metadata
      },
      preferences: {
        explanationStyle: identity.preferences.explanationStyle,
        tone: identity.preferences.tone,
        communicationCadence: identity.preferences.communicationCadence,
        bookOnlyModeDefault: identity.preferences.bookOnlyModeDefault
      },
      relevantMemories: relevantMemories.map((m) => ({
        id: m.id,
        category: m.category,
        key: m.key,
        value: m.value,
        source: m.source,
        confidence: m.confidence,
        visibility: m.visibility
      })),
      relevantKnowledge: relevantKnowledge.map((k) => ({
        conceptId: k.conceptId,
        conceptName: k.conceptName,
        subject: k.subject,
        masteryLevel: k.masteryLevel,
        status: k.status,
        evidenceCount: k.evidenceCount
      })),
      nextBestAction,
      recentMessages,
      currentMessage: options.currentMessage,
      webSearchResults,
      explicitPermissions: activeContext.permissions,
      provenanceDirective: 'Preserve strict memory provenance. Never invent facts. Respect privacy boundaries.'
    };
  }
}

export const contextOrchestrator = new ContextOrchestrator();
