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
      let score = 0;
      let matched = false;
      const memValStr = typeof mem.value === 'string' ? mem.value.toLowerCase() : JSON.stringify(mem.value).toLowerCase();
      const memKeyStr = mem.key.toLowerCase();

      // Topic keywords
      if (lowerQuery.includes('way i like') || lowerQuery.includes('my style') || lowerQuery.includes('my preference') || lowerQuery.includes('how i learn') || lowerQuery.includes('teach me like')) {
        if (mem.category === 'UserPreference') {
          score += 10.0;
          matched = true;
        }
      } else if (lowerQuery.includes('explain') || lowerQuery.includes('teach') || lowerQuery.includes('style')) {
        if (mem.category === 'UserPreference' && (memKeyStr.includes('style') || memKeyStr.includes('explain') || memKeyStr.includes('learn') || memKeyStr.includes('pedagogy') || memKeyStr.includes('preference'))) {
          score += 8.0;
          matched = true;
        }
      }

      if (lowerQuery.includes('goal') || lowerQuery.includes('exam') || lowerQuery.includes('target') || lowerQuery.includes('score') || lowerQuery.includes('aim') || lowerQuery.includes('plan')) {
        if (mem.category === 'UserGoal') {
          score += 10.0;
          matched = true;
        }
      }

      if (lowerQuery.includes('physics') || lowerQuery.includes('mechanics') || lowerQuery.includes('newton') || lowerQuery.includes('vector') || lowerQuery.includes('friction') || lowerQuery.includes('incline')) {
        if (memValStr.includes('physics') || memValStr.includes('mechanics') || memValStr.includes('vector') || memValStr.includes('force') || memKeyStr.includes('physics') || memKeyStr.includes('vector')) {
          score += 8.0;
          matched = true;
        }
      }

      if (lowerQuery.includes('calculus') || lowerQuery.includes('math') || lowerQuery.includes('derivative')) {
        if (memValStr.includes('calculus') || memValStr.includes('derivative') || memKeyStr.includes('calc') || memKeyStr.includes('math')) {
          score += 8.0;
          matched = true;
        }
      }

      // Word intersection
      const queryTokens = lowerQuery.split(/\s+/).filter((t) => t.length > 3);
      for (const token of queryTokens) {
        if (memValStr.includes(token) || memKeyStr.includes(token)) {
          score += 3.0;
          matched = true;
        }
      }

      if (matched) {
        // Boost high confidence & verified sources
        if (mem.source === 'USER_STATED' || mem.source === 'USER_CONFIRMED') score += 1.0;
        if (mem.confidence) score += mem.confidence;
      }

      return { mem, score, matched };
    });

    const relevantOnly = scored.filter((s) => s.matched && s.score >= 2.0);
    relevantOnly.sort((a, b) => b.score - a.score);
    return relevantOnly.slice(0, limit).map((s) => s.mem);
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

    // Exclude current turn from recentMessages if it was already appended to session.messages
    let history = options.recentMessages || [];
    if (history.length > 0) {
      const lastMsg = history[history.length - 1];
      if (lastMsg.role === 'user' && lastMsg.content === options.currentMessage) {
        history = history.slice(0, -1);
      }
    }

    const recentMessages = history.slice(-6).map((m) => ({
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

  /**
   * Selectively extracts explicit user-stated preferences, goals, or interests for memory write-back.
   * General questions (e.g. "What is 2+2?"), temporary chatter, and institutional data are strictly ignored.
   */
  extractExplicitMemories(userQuery: string): Array<{
    category: import('./types.ts').MemoryCategory;
    key: string;
    value: string;
    source: import('./types.ts').MemorySourceType;
    confidence: number;
    visibility: import('./types.ts').MemoryVisibility;
    notes?: string;
  }> | undefined {
    const trimmed = userQuery.trim();
    const lower = trimmed.toLowerCase();
    const memoriesToWrite: Array<{
      category: import('./types.ts').MemoryCategory;
      key: string;
      value: string;
      source: import('./types.ts').MemorySourceType;
      confidence: number;
      visibility: import('./types.ts').MemoryVisibility;
      notes?: string;
    }> = [];

    // 1. Explicit Preference ("I prefer ...", "I like ...", "Explain using ...", "Always explain ...")
    if (
      lower.startsWith('i prefer ') ||
      lower.includes(' i prefer ') ||
      lower.startsWith('i like ') ||
      lower.includes(' i like ') ||
      lower.startsWith('explain using ') ||
      lower.startsWith('always explain ')
    ) {
      const match =
        trimmed.match(/i prefer ([^.!?\n]+)/i) ||
        trimmed.match(/i like ([^.!?\n]+)/i) ||
        trimmed.match(/explain using ([^.!?\n]+)/i) ||
        trimmed.match(/always explain ([^.!?\n]+)/i);
      const prefText = match ? match[1].trim() : trimmed;
      if (prefText.length > 2 && !lower.includes('2+2') && !lower.includes('what is') && !lower.includes('how to')) {
        memoriesToWrite.push({
          category: 'UserPreference',
          key: 'user_stated_preference',
          value: prefText,
          source: 'USER_STATED',
          confidence: 1.0,
          visibility: 'PRIVATE_PERSONAL',
          notes: `Explicit user preference: "${trimmed}"`
        });
      }
    } else if (
      lower.startsWith('my goal is ') ||
      lower.includes(' my goal is ') ||
      lower.includes('i want to score ') ||
      lower.includes('i am aiming for ') ||
      lower.startsWith('goal:')
    ) {
      const match =
        trimmed.match(/my goal is ([^.!?\n]+)/i) ||
        trimmed.match(/i want to score ([^.!?\n]+)/i) ||
        trimmed.match(/i am aiming for ([^.!?\n]+)/i) ||
        trimmed.match(/goal:\s*([^.!?\n]+)/i);
      const goalText = match ? match[1].trim() : trimmed;
      if (goalText.length > 2) {
        memoriesToWrite.push({
          category: 'UserGoal',
          key: 'user_stated_goal',
          value: goalText,
          source: 'USER_STATED',
          confidence: 1.0,
          visibility: 'PRIVATE_PERSONAL',
          notes: `Explicit user goal: "${trimmed}"`
        });
      }
    } else if (
      lower.startsWith('i am interested in ') ||
      lower.includes(' i am interested in ') ||
      lower.startsWith('i love studying ') ||
      lower.includes('my interest is ')
    ) {
      const match =
        trimmed.match(/i am interested in ([^.!?\n]+)/i) ||
        trimmed.match(/i love studying ([^.!?\n]+)/i) ||
        trimmed.match(/my interest is ([^.!?\n]+)/i);
      const interestText = match ? match[1].trim() : trimmed;
      if (interestText.length > 2) {
        memoriesToWrite.push({
          category: 'UserInterest',
          key: 'user_stated_interest',
          value: interestText,
          source: 'USER_STATED',
          confidence: 1.0,
          visibility: 'PRIVATE_PERSONAL',
          notes: `Explicit user interest: "${trimmed}"`
        });
      }
    }

    return memoriesToWrite.length > 0 ? memoriesToWrite : undefined;
  }
}

export const contextOrchestrator = new ContextOrchestrator();
