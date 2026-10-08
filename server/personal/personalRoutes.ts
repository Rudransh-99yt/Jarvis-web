import { Router, type Request, type Response } from 'express';
import { requirePrincipal } from '../auth/principal.ts';
import { personalIdentityStore } from './identityStore.ts';
import { contextEngine } from './contextEngine.ts';
import { personalMemoryStore } from './memoryStore.ts';
import { personalKnowledgeStore } from './knowledgeStore.ts';
import { webSearchProvider } from './webSearchProvider.ts';
import { conversationEngine } from './conversationEngine.ts';
import { activityTimelineStore } from './activityTimelineStore.ts';
import type { ProgressiveOnboardingPayload } from './types.ts';

export const personalRouter = Router();

// SECURITY HARDENING: Mount mandatory authenticated principal middleware on all personal endpoints
personalRouter.use(requirePrincipal);

function getUserId(_req: Request, res: Response): string {
  const principal = res.locals.principal;
  if (!principal || !principal.userId) {
    throw new Error('UNAUTHENTICATED: Authenticated principal required.');
  }
  return principal.userId;
}

/**
 * GET /api/personal/identity
 * Returns full PersonalJarvisIdentity for active user
 */
personalRouter.get('/identity', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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
    const userId = getUserId(req, res);
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

// ----------------------------------------------------------------------------
// Phase 5: Personal Tool Intelligence REST Endpoints
// ----------------------------------------------------------------------------

/**
 * GET /api/personal/tools
 * Lists registered personal tools with schemas, risk levels, and descriptions
 */
personalRouter.get('/tools', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const activeContext = await contextEngine.getActiveContext(userId);
    const { personalToolRegistry } = await import('./tools/index.ts');
    const tools = personalToolRegistry.listTools(activeContext.type);

    res.json({
      success: true,
      count: tools.length,
      tools: tools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        riskLevel: t.riskLevel,
        inputSchema: t.inputSchema,
        requiredContextTypes: t.requiredContextTypes
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list personal tools', details: err?.message });
  }
});

/**
 * POST /api/personal/tools/execute
 * Directly executes a personal tool with server-side validation and authorization
 */
personalRouter.post('/tools/execute', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const { toolId, arguments: args, contextId } = req.body || {};

    if (!toolId) {
      return res.status(400).json({ error: 'toolId is required' });
    }

    const activeContext = contextId
      ? (await contextEngine.getContexts(userId)).find((c) => c.id === contextId) || (await contextEngine.getActiveContext(userId))
      : await contextEngine.getActiveContext(userId);

    const execContext = {
      userId,
      contextId: activeContext.id,
      contextType: activeContext.type,
      permissions: activeContext.permissions
    };

    const { personalToolRegistry } = await import('./tools/index.ts');
    const result = await personalToolRegistry.executeTool(toolId, execContext, args || {});

    res.json({
      success: result.success,
      toolId: result.toolId,
      result: result.data,
      error: result.error,
      userMessage: result.userMessage,
      metadata: result.metadata
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute personal tool', details: err?.message });
  }
});

/**
 * POST /api/personal/tools/confirm
 * Confirms and executes a pending confirmation action
 */
personalRouter.post('/tools/confirm', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const { pendingActionId } = req.body || {};

    if (!pendingActionId) {
      return res.status(400).json({ error: 'pendingActionId is required' });
    }

    const { confirmationPolicy, personalToolRegistry } = await import('./tools/index.ts');
    const pending = confirmationPolicy.consumePendingAction(pendingActionId, userId);

    if (!pending) {
      return res.status(404).json({ error: 'Pending action not found or expired' });
    }

    const activeContext = await contextEngine.getActiveContext(userId);
    const execContext = {
      userId,
      contextId: activeContext.id,
      contextType: activeContext.type,
      permissions: activeContext.permissions
    };

    const result = await personalToolRegistry.executeTool(
      pending.toolId,
      execContext,
      pending.arguments,
      { bypassConfirmationCheck: true }
    );

    res.json({
      success: result.success,
      toolId: result.toolId,
      result: result.data,
      userMessage: result.userMessage,
      error: result.error
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to confirm tool action', details: err?.message });
  }
});

/**
 * POST /api/personal/tools/cancel
 * Cancels a pending confirmation action deterministically
 */
personalRouter.post('/tools/cancel', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const { pendingActionId } = req.body || {};

    if (!pendingActionId) {
      return res.status(400).json({ error: 'pendingActionId is required' });
    }

    const { confirmationPolicy } = await import('./tools/index.ts');
    const cancelled = confirmationPolicy.cancelPendingAction(pendingActionId, userId);

    if (!cancelled) {
      return res.status(404).json({ error: 'Pending action not found or already processed' });
    }

    res.json({
      success: true,
      message: 'Pending action has been cancelled.',
      pendingActionId
    });
  } catch (err: any) {
    if (err?.message?.includes('SECURITY_VIOLATION')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to cancel tool action', details: err?.message });
  }
});


/**
 * GET /api/personal/notes
 * List user personal study notes
 */
personalRouter.get('/notes', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;
    const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;

    const { personalNotesStore } = await import('./tools/index.ts');
    const notes = await personalNotesStore.getNotes(userId, { query, subject, tag });

    res.json({
      success: true,
      count: notes.length,
      notes
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve notes', details: err?.message });
  }
});

/**
 * POST /api/personal/notes
 * Create user personal study note
 */
personalRouter.post('/notes', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const { title, content, subject, tags, conceptId } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const { personalNotesStore } = await import('./tools/index.ts');
    const note = await personalNotesStore.createNote(userId, {
      title,
      content,
      subject,
      tags,
      conceptId
    });

    res.json({
      success: true,
      note
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create note', details: err?.message });
  }
});

/**
 * DELETE /api/personal/notes/:id
 * Delete user personal study note
 */
personalRouter.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const noteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const { personalNotesStore } = await import('./tools/index.ts');
    const deleted = await personalNotesStore.deleteNote(userId, noteId);

    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ success: true, deletedNoteId: noteId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete note', details: err?.message });
  }
});

/**
 * GET /api/personal/flashcards
 * List user personal flashcards
 */
personalRouter.get('/flashcards', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const subject = typeof req.query.subject === 'string' ? req.query.subject : undefined;

    const { personalNotesStore } = await import('./tools/index.ts');
    const flashcards = await personalNotesStore.getFlashcards(userId, subject);

    res.json({
      success: true,
      count: flashcards.length,
      flashcards
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve flashcards', details: err?.message });
  }
});

/**
 * POST /api/personal/flashcards
 * Create user personal flashcard
 */
personalRouter.post('/flashcards', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const { front, back, subject, conceptId, tags } = req.body || {};

    if (!front || !back) {
      return res.status(400).json({ error: 'front and back are required' });
    }

    const { personalNotesStore } = await import('./tools/index.ts');
    const flashcard = await personalNotesStore.createFlashcard(userId, {
      front,
      back,
      subject,
      conceptId,
      tags
    });

    res.json({
      success: true,
      flashcard
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create flashcard', details: err?.message });
  }
});

/**
 * GET /api/personal/activity-timeline
 * Returns user action activity history with context isolation
 */
personalRouter.get('/activity-timeline', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const contextId = typeof req.query.contextId === 'string' ? req.query.contextId : undefined;
    const contextType = typeof req.query.contextType === 'string' ? req.query.contextType : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;

    const items = await activityTimelineStore.getActivity(userId, { contextId, contextType, limit });
    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve activity timeline', details: err?.message });
  }
});

/**
 * POST /api/personal/activity-timeline
 * Records an action activity event for the authenticated user and context
 */
personalRouter.post('/activity-timeline', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const {
      contextId,
      contextType,
      title,
      category,
      sourceTitle,
      assetId,
      reusedCount,
      generatedCount,
      totalCount,
      canUndo,
      reversibleAction
    } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const activeContext = await contextEngine.getActiveContext(userId);
    const resolvedContextId = contextId || activeContext.id;
    const resolvedContextType = contextType || activeContext.type;

    const item = await activityTimelineStore.recordActivity(userId, {
      contextId: resolvedContextId,
      contextType: resolvedContextType,
      title,
      category: category || 'practice',
      sourceTitle,
      assetId,
      reusedCount,
      generatedCount,
      totalCount,
      canUndo: Boolean(canUndo),
      undone: false,
      reversibleAction
    });

    res.json({
      success: true,
      item
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record activity', details: err?.message });
  }
});

/**
 * POST /api/personal/activity-timeline/:id/undo
 * Safely rolls back an action if and ONLY if it is safely reversible
 */
personalRouter.post('/activity-timeline/:id/undo', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req, res);
    const activityId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!activityId) {
      return res.status(400).json({ error: 'activityId is required' });
    }

    const result = await activityTimelineStore.undoActivity(userId, activityId);
    if (!result.ok) {
      const statusCode = result.error === 'NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({ error: result.error, message: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      activityId
    });
  } catch (err: any) {
    if (err?.message?.includes('SECURITY_VIOLATION')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to undo activity', details: err?.message });
  }
});



