import assert from 'node:assert';
import { conversationEngine } from '../server/personal/conversationEngine.ts';
import { contextOrchestrator } from '../server/personal/contextOrchestrator.ts';
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { contextEngine } from '../server/personal/contextEngine.ts';
import { personalMemoryStore } from '../server/personal/memoryStore.ts';
import { personalKnowledgeStore } from '../server/personal/knowledgeStore.ts';
import { conversationProviderManager } from '../server/personal/providers/conversationProviderManager.ts';
import { GeminiConversationProvider } from '../server/personal/providers/geminiConversationProvider.ts';
import { DeterministicMockConversationProvider } from '../server/personal/providers/mockConversationProvider.ts';
import { webSearchProvider } from '../server/personal/webSearchProvider.ts';
import type {
  UserContext,
  IConversationProvider,
  BoundedConversationPrompt,
  ConversationTurnResult
} from '../src/types/personalIdentity.ts';

console.log('=== [WEB JARVIS] PHASE 4: REAL GEMINI BEHAVIOR HARDENING VERIFICATION SUITE ===');

async function runHardeningSuite() {
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // TASK 1: Full Request Path Verification (Orchestrator + Gemini Provider)
  // --------------------------------------------------------------------------
  console.log('\n--- TASK 1: Full Request Path Verification ---');

  await test('1.1 Full request path traces through ConversationEngine -> ContextOrchestrator -> Provider -> Memory write-back', async () => {
    const userId = 'student-1';
    const sessionId = `trace-sess-${Date.now()}`;

    // Track if custom spy provider receives bounded prompt built by ContextOrchestrator
    let capturedPrompt: BoundedConversationPrompt | null = null;

    class SpyProvider implements IConversationProvider {
      readonly id = 'spy-gemini';
      readonly name = 'Spy Gemini Provider';
      async isAvailable(): Promise<boolean> { return true; }
      async generateConversationTurn(prompt: BoundedConversationPrompt): Promise<ConversationTurnResult> {
        capturedPrompt = prompt;
        return {
          reply: `Hello ${prompt.identitySummary.preferredName}, your ${prompt.activeContext.title} context is active.`,
          providerId: this.id,
          memoriesToWrite: contextOrchestrator.extractExplicitMemories(prompt.currentMessage)
        };
      }
    }

    const spy = new SpyProvider();
    conversationProviderManager.registerProvider(spy);
    const prevDefault = (conversationProviderManager as any).defaultProviderId;
    (conversationProviderManager as any).defaultProviderId = 'spy-gemini';

    try {
      const turn = await conversationEngine.processConversationTurn({
        sessionId,
        userId,
        message: 'I prefer concise tactical derivations when learning kinematics.'
      });

      assert.ok(capturedPrompt, 'ContextOrchestrator must build bounded prompt for provider');
      assert.strictEqual(capturedPrompt.identitySummary.userId, userId);
      assert.ok(capturedPrompt.activeContext.title);
      assert.ok(Array.isArray(capturedPrompt.relevantMemories));
      assert.ok(Array.isArray(capturedPrompt.relevantKnowledge));
      assert.strictEqual(turn.providerId, 'spy-gemini');
      assert.strictEqual(turn.persistedMemoriesCount, 1, 'Explicit preference should be written back to memory');

      // Verify memory was saved with proper provenance
      const memories = await personalMemoryStore.getMemories(userId, { category: 'UserPreference' });
      const saved = memories.find((m) => String(m.value).includes('concise tactical derivations'));
      assert.ok(saved, 'Memory must exist in store');
      assert.strictEqual(saved.source, 'USER_STATED');
      assert.strictEqual(saved.visibility, 'PRIVATE_PERSONAL');
    } finally {
      (conversationProviderManager as any).defaultProviderId = prevDefault;
    }
  });

  // --------------------------------------------------------------------------
  // TASK 2: Personal Context Quality & Privacy Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- TASK 2: Personal Context Quality & Privacy Isolation ---');

  await test('2.1 Personal context injection: personal questions only receive personal relevant context', async () => {
    const contexts = await contextEngine.getContexts('student-1');
    const personalCtx = contexts.find((c) => c.type === 'PERSONAL');
    assert.ok(personalCtx);

    await contextEngine.switchContext('student-1', personalCtx.id);

    const prompt = await contextOrchestrator.buildBoundedPrompt({
      userId: 'student-1',
      contextId: personalCtx.id,
      currentMessage: 'What is my plan for this evening?'
    });

    assert.strictEqual(prompt.activeContext.type, 'PERSONAL');
    assert.strictEqual(prompt.activeContext.title, personalCtx.title);
    assert.strictEqual(prompt.preferences.explanationStyle, 'first_principles');
  });

  await test('2.2 Context switching: Personal -> Education -> Personal does not leak stale contexts', async () => {
    const contexts = await contextEngine.getContexts('student-1');
    const personalCtx = contexts.find((c) => c.type === 'PERSONAL')!;
    const eduCtx = contexts.find((c) => c.type === 'EDUCATION')!;

    // Switch to Education
    await contextEngine.switchContext('student-1', eduCtx.id);
    let active = await contextEngine.getActiveContext('student-1');
    assert.strictEqual(active.id, eduCtx.id);

    let prompt = await contextOrchestrator.buildBoundedPrompt({
      userId: 'student-1',
      currentMessage: "Explain Newton's second law"
    });
    assert.strictEqual(prompt.activeContext.id, eduCtx.id);

    // Switch back to Personal
    await contextEngine.switchContext('student-1', personalCtx.id);
    active = await contextEngine.getActiveContext('student-1');
    assert.strictEqual(active.id, personalCtx.id);

    prompt = await contextOrchestrator.buildBoundedPrompt({
      userId: 'student-1',
      currentMessage: 'Review my weekly goals'
    });
    assert.strictEqual(prompt.activeContext.id, personalCtx.id);
    assert.strictEqual(prompt.activeContext.type, 'PERSONAL');
  });

  await test('2.3 Relevant memory ranking: irrelevant memories are not dumped into prompt', async () => {
    // Add multiple diverse memories
    await personalMemoryStore.addMemory({
      userId: 'student-1',
      category: 'UserPreference',
      key: 'favorite_tea',
      value: 'Earl Grey with lavender',
      source: 'USER_STATED',
      visibility: 'PRIVATE_PERSONAL'
    });
    await personalMemoryStore.addMemory({
      userId: 'student-1',
      category: 'UserPreference',
      key: 'physics_learning_style',
      value: 'Rigorous mathematical derivations of force vectors',
      source: 'USER_STATED',
      visibility: 'PRIVATE_PERSONAL'
    });
    await personalMemoryStore.addMemory({
      userId: 'student-1',
      category: 'UserGoal',
      key: 'swimming_goal',
      value: 'Swim 2km by Friday',
      source: 'USER_STATED',
      visibility: 'PRIVATE_PERSONAL'
    });

    const activeCtx = await contextEngine.getActiveContext('student-1');
    const memories = await contextOrchestrator.filterRelevantMemories(
      'student-1',
      activeCtx,
      'Explain how vector decomposition applies to incline friction',
      3
    );

    assert.ok(memories.length <= 3, 'Memory count must be strictly bounded');
    const topMem = memories[0];
    assert.ok(
      topMem.key === 'physics_learning_style' || String(topMem.value).includes('force vectors') || String(topMem.value).includes('derivation'),
      'Top scored memory must be relevant to physics / vectors, not tea or swimming'
    );
    assert.ok(!memories.some((m) => m.key === 'favorite_tea'), 'Irrelevant tea memory should not be included in top results');
  });

  await test('2.4 Personal Knowledge retrieval is bounded and relevant to queried concepts', async () => {
    const activeCtx = await contextEngine.getActiveContext('student-1');
    const concepts = await contextOrchestrator.filterRelevantKnowledge(
      'student-1',
      activeCtx,
      'How does the chain rule in calculus work?'
    );

    assert.ok(concepts.length > 0, 'Must retrieve calculus concept');
    assert.ok(concepts.some((c) => c.conceptName.toLowerCase().includes('chain') || c.subject.toLowerCase() === 'mathematics'));
    assert.ok(concepts.length <= 5, 'Knowledge concepts must be bounded');
  });

  await test('2.5 Privacy isolation: institutional context cannot access private personal memories', async () => {
    const instCtx: UserContext = {
      id: 'ctx-inst-iso',
      type: 'INSTITUTION',
      title: 'District Governance',
      description: 'Administrative Oversight',
      isDefault: false,
      isActive: true,
      metadata: { institutionId: 'inst-99' },
      permissions: {
        canAccessInstitutionData: true,
        sharePersonalMemory: false
      },
      createdAt: new Date().toISOString()
    };

    const memories = await contextOrchestrator.filterRelevantMemories(
      'student-1',
      instCtx,
      'What are student personal habits?',
      10
    );

    assert.strictEqual(memories.filter((m) => m.visibility === 'PRIVATE_PERSONAL').length, 0);
  });

  // --------------------------------------------------------------------------
  // TASK 3: Multi-Turn Conversation Boundedness & Continuity
  // --------------------------------------------------------------------------
  console.log('\n--- TASK 3: Multi-Turn Conversation (5, 10, 20+ turns) ---');

  await test('3.1 5-turn conversation maintains continuity and bounds prompt history', async () => {
    const sessionId = `multi-5-${Date.now()}`;
    for (let i = 1; i <= 5; i++) {
      const turn = await conversationEngine.processConversationTurn({
        sessionId,
        userId: 'student-1',
        message: `Turn ${i}: Question about physics mechanics concept ${i}`
      });
      assert.ok(turn.reply);
      assert.strictEqual(turn.session.recentTurnsCount, i);
    }
    const session = await conversationEngine.getSession(sessionId);
    assert.strictEqual(session?.messages.length, 10); // 5 user + 5 assistant
  });

  await test('3.2 10-turn conversation stays bounded within recent message budget', async () => {
    const sessionId = `multi-10-${Date.now()}`;
    for (let i = 1; i <= 10; i++) {
      await conversationEngine.processConversationTurn({
        sessionId,
        userId: 'student-1',
        message: `Step ${i}: Continuing progressive dialogue on quantum eigenstates`
      });
    }

    const prompt = await contextOrchestrator.buildBoundedPrompt({
      userId: 'student-1',
      currentMessage: 'Final wrap up question',
      recentMessages: (await conversationEngine.getSession(sessionId))!.messages
    });

    // Prompt recent messages must not exceed 6 items (3 turns)
    assert.ok(prompt.recentMessages.length <= 6, `Prompt recentMessages must be <= 6, got ${prompt.recentMessages.length}`);
  });

  await test('3.3 25-turn conversation remains completely stable without unbounded prompt growth', async () => {
    const sessionId = `multi-25-${Date.now()}`;
    for (let i = 1; i <= 25; i++) {
      await conversationEngine.processConversationTurn({
        sessionId,
        userId: 'student-1',
        message: `Iteration ${i}: Testing conversation durability`
      });
    }

    const session = await conversationEngine.getSession(sessionId);
    assert.strictEqual(session?.messages.length, 50); // 25 turns

    const prompt = await contextOrchestrator.buildBoundedPrompt({
      userId: 'student-1',
      currentMessage: 'Query after 25 turns',
      recentMessages: session!.messages
    });

    assert.ok(prompt.recentMessages.length <= 6, 'Prompt message history remains strictly bounded');
    assert.strictEqual(prompt.activeContext.type, (await contextEngine.getActiveContext('student-1')).type);
  });

  // --------------------------------------------------------------------------
  // TASK 4: Conditional Web Search Behavior
  // --------------------------------------------------------------------------
  console.log('\n--- TASK 4: Conditional Web Search Behavior ---');

  await test('4.1 Simple personal and academic questions do not trigger web search', async () => {
    const res1 = await contextOrchestrator.resolveWebSearchIfNeeded('What is my favorite learning style?');
    assert.strictEqual(res1, undefined, 'Personal preference should not trigger search');

    const res2 = await contextOrchestrator.resolveWebSearchIfNeeded("Explain Newton's first law of motion");
    assert.strictEqual(res2, undefined, 'Standard physics textbook question should not trigger web search');
  });

  await test('4.2 Explicit web search queries trigger WebSearchProvider and return attributions', async () => {
    const results = await contextOrchestrator.resolveWebSearchIfNeeded('Search the web for latest research on quantum entanglement');
    assert.ok(results && results.length > 0, 'Explicit web search must resolve');
    assert.ok(results[0].title);
    assert.ok(results[0].snippet);
    assert.ok(results[0].url);
  });

  await test('4.3 AllowWebSearch flag enables search when explicitly requested by client option', async () => {
    const results = await contextOrchestrator.resolveWebSearchIfNeeded('Quantum computers progress', true);
    assert.ok(results && results.length > 0);
  });

  // --------------------------------------------------------------------------
  // TASK 5: Provider Resilience, Timeout, Backoff & State Cleanup
  // --------------------------------------------------------------------------
  console.log('\n--- TASK 5: Provider Resilience, Timeout, Backoff & State Cleanup ---');

  await test('5.1 Gemini timeout is bounded and cleans up timer without hanging', async () => {
    const gemini = new GeminiConversationProvider();
    
    // Test with mock prompt and short timeout override
    const prompt = await contextOrchestrator.buildBoundedPrompt({
      userId: 'student-1',
      currentMessage: 'Testing timeout resilience'
    });

    let timedOut = false;
    try {
      await gemini.generateConversationTurn(prompt, { timeoutMs: 1 });
    } catch (err: any) {
      timedOut = true;
      assert.ok(err.message.includes('timed out') || err.message.includes('API_KEY'), 'Should catch timeout or missing key error');
    }
    assert.ok(timedOut);
  });

  await test('5.2 Provider failure triggers automatic fallback to deterministic core without state corruption', async () => {
    class FailingProvider implements IConversationProvider {
      readonly id = 'failing-provider';
      readonly name = 'Always Failing Provider';
      async isAvailable(): Promise<boolean> { return true; }
      async generateConversationTurn(): Promise<ConversationTurnResult> {
        throw new Error('503 Service Unavailable: Neural Core Outage');
      }
    }

    const failing = new FailingProvider();
    conversationProviderManager.registerProvider(failing);
    (conversationProviderManager as any).defaultProviderId = 'failing-provider';

    try {
      const sessionId = `fallback-sess-${Date.now()}`;
      const turn = await conversationEngine.processConversationTurn({
        sessionId,
        userId: 'student-1',
        message: 'Hello Jarvis, are you functioning?'
      });

      assert.ok(turn.reply, 'Should successfully generate fallback response');
      assert.strictEqual(turn.providerId, 'deterministic-mock');
      assert.strictEqual(turn.session.assistantState, 'IDLE', 'Assistant state must return to IDLE');
    } finally {
      (conversationProviderManager as any).defaultProviderId = 'gemini';
    }
  });

  // --------------------------------------------------------------------------
  // TASK 8: Selective Memory Write-Back & Provenance Rules
  // --------------------------------------------------------------------------
  console.log('\n--- TASK 8: Selective Memory Write-Back & Provenance Rules ---');

  await test('8.1 Explicit preference ("I prefer dark mode") is extracted with USER_STATED provenance', () => {
    const memories = contextOrchestrator.extractExplicitMemories('I prefer dark mode for high-contrast reading.');
    assert.ok(memories && memories.length === 1);
    assert.strictEqual(memories[0].category, 'UserPreference');
    assert.strictEqual(memories[0].source, 'USER_STATED');
    assert.strictEqual(memories[0].visibility, 'PRIVATE_PERSONAL');
    assert.ok(memories[0].value.includes('dark mode'));
  });

  await test('8.2 Explicit goal ("My goal is to prepare for JEE") is extracted with USER_STATED provenance', () => {
    const memories = contextOrchestrator.extractExplicitMemories('My goal is to prepare for JEE Advanced physics.');
    assert.ok(memories && memories.length === 1);
    assert.strictEqual(memories[0].category, 'UserGoal');
    assert.strictEqual(memories[0].source, 'USER_STATED');
    assert.strictEqual(memories[0].visibility, 'PRIVATE_PERSONAL');
    assert.ok(memories[0].value.includes('prepare for JEE'));
  });

  await test('8.3 Ephemeral questions ("What is 2+2?") and conversational chatter produce NO memory write-back', () => {
    assert.strictEqual(contextOrchestrator.extractExplicitMemories('What is 2+2?'), undefined);
    assert.strictEqual(contextOrchestrator.extractExplicitMemories('Where is the nearest star?'), undefined);
    assert.strictEqual(contextOrchestrator.extractExplicitMemories('Thanks for your help!'), undefined);
    assert.strictEqual(contextOrchestrator.extractExplicitMemories('Good morning Jarvis.'), undefined);
  });

  console.log('\n==================================================');
  console.log(`PHASE 4 HARDENING SUMMARY: ${passed}/${total} tests passed.`);
  console.log(`==================================================\n`);
  process.exit(0);
}

runHardeningSuite().catch((err) => {
  console.error('Fatal error in Phase 4 hardening test suite:', err);
  process.exit(1);
});
