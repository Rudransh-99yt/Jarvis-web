import { Router, type Request, type Response } from 'express';
import { personalIdentityStore } from './identityStore.ts';
import { contextEngine } from './contextEngine.ts';
import { personalMemoryStore } from './memoryStore.ts';
import { personalKnowledgeStore } from './knowledgeStore.ts';
import { webSearchProvider } from './webSearchProvider.ts';
import { conversationEngine } from './conversationEngine.ts';
import type { ProgressiveOnboardingPayload } from './types.ts';

export const personalRouter = Router();

function getUserId(req: Request): string {
  const user = (req as any).user;
  if (user?.id) return user.id;
  const headerUser = req.headers['x-jarvis-user-id'] || req.headers['x-user-id'];
  if (typeof headerUser === 'string' && headerUser.trim()) return headerUser.trim();
  return 'student-1'; // Default active persona
}

/**
 * GET /api/personal/identity
 * Returns full PersonalJarvisIdentity for active user
 */
personalRouter.get('/identity', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const identity = await personalIdentityStore.getIdentity(userId);
    res.json({
      success: true,
      identity
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve identity', details: err?.message });
  }
});

/**
 * PUT /api/personal/identity
 * Updates profile or preferences
 */
personalRouter.put('/identity', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const updates = req.body || {};
    const updated = await personalIdentityStore.updateIdentity(userId, updates);
    res.json({
      success: true,
      identity: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update identity', details: err?.message });
  }
});

/**
 * POST /api/personal/onboarding
 * Progressive onboarding initialization
 */
personalRouter.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const payload: ProgressiveOnboardingPayload = {
      userId,
      name: req.body.name || 'Cadet',
      preferredName: req.body.preferredName,
      ageRange: req.body.ageRange,
      country: req.body.country,
      primaryRole: req.body.primaryRole || 'student',
      educationInfo: req.body.educationInfo,
      interests: req.body.interests,
      preferences: req.body.preferences
    };

    const identity = await personalIdentityStore.processProgressiveOnboarding(payload);
    res.json({
      success: true,
      identity
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process onboarding', details: err?.message });
  }
});

/**
 * GET /api/personal/contexts
 * List user contexts and active context
 */
personalRouter.get('/contexts', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const contexts = await contextEngine.getContexts(userId);
    const activeContext = await contextEngine.getActiveContext(userId);
    res.json({
      success: true,
      contexts,
      activeContext
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve contexts', details: err?.message });
  }
});

/**
 * POST /api/personal/contexts/switch
 * Switch active operating context
 */
personalRouter.post('/contexts/switch', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { contextId } = req.body || {};
    if (!contextId) {
      return res.status(400).json({ error: 'contextId is required' });
    }

    const active = await contextEngine.switchContext(userId, contextId);
    res.json({
      success: true,
      activeContext: active
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to switch context', details: err?.message });
  }
});

/**
 * GET /api/personal/memories
 * Queries structured personal memories with provenance
 */
personalRouter.get('/memories', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const category = typeof req.query.category === 'string' ? (req.query.category as any) : undefined;
    const contextId = typeof req.query.contextId === 'string' ? req.query.contextId : undefined;
    const visibility = typeof req.query.visibility === 'string' ? (req.query.visibility as any) : undefined;

    const memories = await personalMemoryStore.getMemories(userId, {
      category,
      contextId,
      visibility
    });

    res.json({
      success: true,
      count: memories.length,
      memories
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve memories', details: err?.message });
  }
});

/**
 * POST /api/personal/memories
 * Add structured personal memory
 */
personalRouter.post('/memories', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const body = req.body || {};

    if (!body.category || !body.key || body.value === undefined) {
      return res.status(400).json({ error: 'category, key, and value are required' });
    }

    const activeContext = await contextEngine.getActiveContext(userId);
    const memory = await personalMemoryStore.addMemory({
      userId,
      category: body.category,
      key: body.key,
      value: body.value,
      source: body.source || 'USER_STATED',
      confidence: body.confidence,
      contextId: body.contextId || activeContext.id,
      visibility: body.visibility || 'PRIVATE_PERSONAL',
      provenance: body.provenance || {
        sourceEntityType: 'manual',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      memory
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add memory', details: err?.message });
  }
});

/**
 * POST /api/personal/memories/:id/confirm
 * User confirms a system-inferred memory
 */
personalRouter.post('/memories/:id/confirm', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const memoryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await personalMemoryStore.confirmSystemMemory(memoryId, userId);
    if (!updated) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json({ success: true, memory: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to confirm memory', details: err?.message });
  }
});

/**
 * GET /api/personal/knowledge
 * Retrieve concept mastery states and recent signals
 */
personalRouter.get('/knowledge', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const knowledge = await personalKnowledgeStore.getKnowledge(userId);
    res.json({
      success: true,
      knowledge
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve knowledge', details: err?.message });
  }
});

/**
 * POST /api/personal/knowledge/mastery
 * Directly record concept mastery delta from learning activities
 */
personalRouter.post('/knowledge/mastery', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { conceptName, subject, masteryDelta, provenanceSource } = req.body || {};

    if (!conceptName) {
      return res.status(400).json({ error: 'conceptName is required' });
    }

    const updated = await personalKnowledgeStore.recordConceptMastery(userId, {
      conceptName,
      subject: subject || 'Physics',
      masteryDelta: typeof masteryDelta === 'number' ? masteryDelta : 0.05,
      provenanceSource: provenanceSource || 'practice'
    });

    res.json({
      success: true,
      concept: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record mastery', details: err?.message });
  }
});

/**
 * GET /api/personal/home
 * Returns comprehensive "MY JARVIS" Personal Home payload
 */
personalRouter.get('/home', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const identity = await personalIdentityStore.getIdentity(userId);
    const activeContext = await contextEngine.getActiveContext(userId);
    const knowledge = await personalKnowledgeStore.getKnowledge(userId);
    const nextBestAction = await personalKnowledgeStore.computeNextBestAction(userId, activeContext.title);

    res.json({
      success: true,
      home: {
        greeting: `Good morning, ${identity.profile.preferredName}`,
        profile: identity.profile,
        activeContext,
        contexts: identity.contexts,
        nextBestAction,
        recentSignals: knowledge.recentSignals.slice(0, 5),
        stats: {
          ...identity.stats,
          conceptsMastered: Object.values(knowledge.concepts).filter((c) => c.status === 'mastered').length,
          conceptsReviewNeeded: Object.values(knowledge.concepts).filter((c) => c.status === 'review_needed').length
        },
        upcomingTasks: [
          { id: 'task-1', title: 'Physics Problem Set 4: Atwood Machines', due: 'Tomorrow 5:00 PM', urgency: 'high' },
          { id: 'task-2', title: 'Calculus Review: Chain Rule Applications', due: 'Thursday 11:59 PM', urgency: 'medium' },
          { id: 'task-3', title: 'Quantum Born Interpretation derivations', due: 'Friday 2:00 PM', urgency: 'low' }
        ],
        quickActions: [
          { id: 'ask', label: 'Ask Jarvis', action: 'chat' },
          { id: 'upload', label: 'Upload PDF / Notes', action: 'upload' },
          { id: 'study', label: 'Start Study Session', action: 'study' },
          { id: 'plan', label: 'View Academic Plan', action: 'plan' },
          { id: 'search', label: 'Web Intelligence', action: 'search' },
          { id: 'notes', label: 'Personal Notes', action: 'notes' }
        ]
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile personal home', details: err?.message });
  }
});

/**
 * POST /api/personal/search
 * Attributed web intelligence search
 */
personalRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, maxResults, domainWhitelist } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query string is required' });
    }

    const results = await webSearchProvider.search(query, {
      maxResults: typeof maxResults === 'number' ? maxResults : 5,
      domainWhitelist
    });

    res.json({
      success: true,
      query,
      count: results.length,
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Web search failed', details: err?.message });
  }
});

/**
 * POST /api/personal/conversation/message
 * Send message in personal context session and receive context-aware response
 */
personalRouter.post('/conversation/message', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { message, sessionId, contextId, source, options } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message text is required' });
    }

    const effectiveSessionId = sessionId || `session-${userId}-${Date.now().toString(36)}`;
    const result = await conversationEngine.processConversationTurn({
      sessionId: effectiveSessionId,
      userId,
      message: message.trim(),
      source: source || 'text',
      contextId,
      options
    });

    res.json({
      success: true,
      sessionId: result.session.sessionId,
      reply: result.reply,
      suggestedNextActions: result.suggestedNextActions,
      relevantMemoryIds: result.relevantMemoryIds,
      relevantConceptIds: result.relevantConceptIds,
      searchAttributions: result.searchAttributions,
      assistantState: result.session.assistantState,
      wakeState: result.session.wakeState,
      persistedMemoriesCount: result.persistedMemoriesCount,
      providerId: result.providerId,
      session: result.session
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process conversation turn', details: err?.message });
  }
});

/**
 * GET /api/personal/conversation/session/:sessionId
 * Retrieve specific conversation session with full message history and metadata
 */
personalRouter.get('/conversation/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const session = await conversationEngine.getSession(sessionId);

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Conversation session not found' });
    }

    res.json({
      success: true,
      session
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve session', details: err?.message });
  }
});

/**
 * GET /api/personal/conversation/sessions
 * List conversation sessions for the active user
 */
personalRouter.get('/conversation/sessions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const sessions = await conversationEngine.getSessionsForUser(userId);
    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list sessions', details: err?.message });
  }
});

/**
 * POST /api/personal/conversation/state
 * Transition voice/assistant state contract
 */
personalRouter.post('/conversation/state', async (req: Request, res: Response) => {
  try {
    const { sessionId, assistantState, wakeState } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    let session = await conversationEngine.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (assistantState) {
      session = await conversationEngine.transitionAssistantState(sessionId, assistantState);
    }
    if (wakeState) {
      session = await conversationEngine.setWakeState(sessionId, wakeState);
    }

    res.json({
      success: true,
      session
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update conversation state', details: err?.message });
  }
});

