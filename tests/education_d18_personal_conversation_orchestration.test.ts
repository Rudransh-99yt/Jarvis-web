import assert from 'node:assert';
import { conversationEngine } from '../server/personal/conversationEngine.ts';
import { contextOrchestrator } from '../server/personal/contextOrchestrator.ts';
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { contextEngine } from '../server/personal/contextEngine.ts';
import { personalMemoryStore } from '../server/personal/memoryStore.ts';
import { personalKnowledgeStore } from '../server/personal/knowledgeStore.ts';
import { conversationProviderManager } from '../server/personal/providers/conversationProviderManager.ts';
import { DeterministicMockConversationProvider } from '../server/personal/providers/mockConversationProvider.ts';
import { startHttpHarness } from './httpHarness.ts';
import type {
  UserContext,
  IConversationProvider,
  BoundedConversationPrompt
} from '../src/types/personalIdentity.ts';

console.log('=== [WEB JARVIS] PHASE 4: CONVERSATION + PERSONAL CONTEXT ORCHESTRATION TEST SUITE ===');

async function runTestSuite() {
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
  // SECTION 1: Conversation Session Model & Lifecycle
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Conversation Session Model & Lifecycle ---');

  await test('1.1 Create conversation session bound to PersonalJarvisIdentity and active context', async () => {
    const sessionId = `test-sess-${Date.now()}`;
    const session = await conversationEngine.getOrCreateSession(sessionId, 'student-1');

    assert.strictEqual(session.sessionId, sessionId);
    assert.strictEqual(session.userId, 'student-1');
    assert.ok(session.activeContextId);
    assert.strictEqual(session.assistantState, 'IDLE');
    assert.strictEqual(session.wakeState, 'STANDBY');
    assert.strictEqual(session.messages.length, 0);
    assert.strictEqual(session.provenance.inputType, 'text');
    assert.strictEqual(session.provenance.channel, 'jarvis-web-os');
  });

  await test('1.2 Transition assistant state contract across interaction lifecycle (IDLE -> THINKING -> IDLE)', async () => {
    const sessionId = `test-state-${Date.now()}`;
    await conversationEngine.getOrCreateSession(sessionId, 'student-1');

    const thinking = await conversationEngine.transitionAssistantState(sessionId, 'THINKING');
    assert.strictEqual(thinking.assistantState, 'THINKING');

    const speaking = await conversationEngine.transitionAssistantState(sessionId, 'SPEAKING');
    assert.strictEqual(speaking.assistantState, 'SPEAKING');

    const idle = await conversationEngine.transitionAssistantState(sessionId, 'IDLE');
    assert.strictEqual(idle.assistantState, 'IDLE');
  });

  await test('1.3 Wake state transitions (STANDBY -> ARMED -> TRIGGERED)', async () => {
    const sessionId = `test-wake-${Date.now()}`;
    await conversationEngine.getOrCreateSession(sessionId, 'student-1');

    const armed = await conversationEngine.setWakeState(sessionId, 'ARMED');
    assert.strictEqual(armed.wakeState, 'ARMED');

    const trig = await conversationEngine.setWakeState(sessionId, 'TRIGGERED');
    assert.strictEqual(trig.wakeState, 'TRIGGERED');
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Context Resolution & Ownership
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Context Resolution & Ownership ---');

  await test('2.1 Context resolution resolves active context for personal planning query', async () => {
    // Switch to personal context
    const contexts = await contextEngine.getContexts('student-1');
    const personalCtx = contexts.find((c) => c.type === 'PERSONAL');
    assert.ok(personalCtx, 'Must have personal context');

    await contextEngine.switchContext('student-1', personalCtx.id);
    const active = await contextEngine.getActiveContext('student-1');
    assert.strictEqual(active.type, 'PERSONAL');

    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-plan-${Date.now()}`,
      userId: 'student-1',
      message: 'Help me plan my evening.'
    });

    assert.ok(turn.reply.toLowerCase().includes('evening') || turn.reply.toLowerCase().includes('schedule'));
    assert.ok(turn.reply.includes('Alex'));
  });

  await test('2.2 Context resolution in Education context resolves physics concept explanations', async () => {
    const contexts = await contextEngine.getContexts('student-1');
    const eduCtx = contexts.find((c) => c.type === 'EDUCATION');
    assert.ok(eduCtx, 'Must have education context');

    await contextEngine.switchContext('student-1', eduCtx.id);

    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-edu-${Date.now()}`,
      userId: 'student-1',
      message: "Explain Newton's laws of motion from foundational principles."
    });

    assert.ok(turn.reply.includes("Newton's Laws"));
    assert.ok(turn.reply.includes('Momentum') || turn.reply.includes('First Law') || turn.reply.includes('Inertia'));
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Relevant Memory Retrieval & Privacy Boundaries
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Relevant Memory Retrieval & Privacy Boundaries ---');

  await test('3.1 Relevant memory ranking selects preference memories when user asks for preferred explanation style', async () => {
    const activeCtx = await contextEngine.getActiveContext('student-1');
    const memories = await contextOrchestrator.filterRelevantMemories(
      'student-1',
      activeCtx,
      'Explain this in the way I like with first principles derivations',
      4
    );

    assert.ok(memories.length > 0, 'Must retrieve relevant memories');
    const hasPref = memories.some((m) => m.category === 'UserPreference');
    assert.ok(hasPref, 'Must prioritize UserPreference category');
  });

  await test('3.2 Strict privacy boundary: Private personal memories are filtered out from Institution contexts when sharing is disabled', async () => {
    const institutionCtx: UserContext = {
      id: 'ctx-inst-test',
      type: 'INSTITUTION',
      title: 'Oakridge High School Administration',
      description: 'Institutional reporting context',
      isDefault: false,
      isActive: true,
      metadata: { institutionId: 'inst-1' },
      permissions: {
        canAccessInstitutionData: true,
        sharePersonalMemory: false // STRICTLY FORBIDDEN
      },
      createdAt: new Date().toISOString()
    };

    const retrievedMemories = await contextOrchestrator.filterRelevantMemories(
      'student-1',
      institutionCtx,
      'Tell me about personal thoughts and preferences',
      5
    );

    for (const m of retrievedMemories) {
      assert.notStrictEqual(m.visibility, 'PRIVATE_PERSONAL', 'PRIVATE_PERSONAL memories must NEVER leak to institution context');
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Personal Knowledge Retrieval (Knowledge vs Memory Separation)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Personal Knowledge Retrieval ---');

  await test('4.1 Knowledge retrieval fetches verified concept mastery and diagnostic checkpoints', async () => {
    const activeCtx = await contextEngine.getActiveContext('student-1');
    const knowledgeConcepts = await contextOrchestrator.filterRelevantKnowledge(
      'student-1',
      activeCtx,
      'How am I doing in mechanics and newton laws?'
    );

    assert.ok(knowledgeConcepts.length > 0, 'Must retrieve relevant concepts');
    const newton = knowledgeConcepts.find((c) => c.conceptName.includes("Newton's Laws"));
    assert.ok(newton, "Must find Newton's Laws concept");
    assert.strictEqual(newton.status, 'mastered');
    assert.strictEqual(newton.masteryLevel, 0.85);
  });

  await test('4.2 Next best action is deterministically computed and provided in conversation turn', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-nba-${Date.now()}`,
      userId: 'student-1',
      message: 'How am I doing in my physics coursework and what should I practice next?'
    });

    assert.ok(turn.reply.includes('mastery') || turn.reply.includes('progress'));
    assert.ok(turn.suggestedNextActions && turn.suggestedNextActions.length > 0);
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Conversation Memory Write-Back
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Conversation Memory Write-Back ---');

  await test('5.1 Explicit user preference statement is persisted to memory with USER_STATED provenance', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-pref-wb-${Date.now()}`,
      userId: 'student-1',
      message: 'I prefer intuitive visual diagrams and geometric proofs before algebra.'
    });

    assert.ok(turn.persistedMemoriesCount > 0, 'Must record stated preference into memory');

    const memories = await personalMemoryStore.getMemories('student-1', { category: 'UserPreference' });
    const match = memories.find((m) => String(m.value).includes('intuitive visual diagrams'));
    assert.ok(match, 'Must find persisted memory item in personal memory store');
    assert.strictEqual(match.source, 'USER_STATED');
    assert.strictEqual(match.visibility, 'PRIVATE_PERSONAL');
    assert.strictEqual(match.provenance.sourceEntityType, 'chat');
  });

  await test('5.2 Explicit user goal statement is persisted to memory with USER_STATED provenance', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-goal-wb-${Date.now()}`,
      userId: 'student-1',
      message: 'My goal is to achieve 95% in Advanced Quantum Mechanics by December.'
    });

    assert.ok(turn.persistedMemoriesCount > 0, 'Must record goal to memory');
    const goals = await personalMemoryStore.getMemories('student-1', { category: 'UserGoal' });
    const match = goals.find((g) => String(g.value).includes('Advanced Quantum Mechanics'));
    assert.ok(match, 'Must find recorded goal');
    assert.strictEqual(match.source, 'USER_STATED');
  });

  await test('5.3 Ephemeral conversation chatter does NOT trigger memory pollution', async () => {
    const initialCount = (await personalMemoryStore.getMemories('student-1')).length;

    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-chatter-${Date.now()}`,
      userId: 'student-1',
      message: 'Thanks for the explanation! Have a nice evening.'
    });

    assert.strictEqual(turn.persistedMemoriesCount, 0, 'Ephemeral message must not write back to memory');
    const postCount = (await personalMemoryStore.getMemories('student-1')).length;
    assert.strictEqual(postCount, initialCount, 'Memory count must remain unchanged');
  });

  // --------------------------------------------------------------------------
  // SECTION 6: Provider Abstraction & Fallback
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Provider Abstraction & Fallback ---');

  await test('6.1 Provider manager supports deterministic mock core fallback', async () => {
    const { provider } = await conversationProviderManager.getActiveProvider();
    assert.ok(provider, 'Must return an active conversation provider');

    const fallback = conversationProviderManager.getFallbackProvider();
    assert.strictEqual(fallback.id, 'deterministic-mock');
    assert.strictEqual(await fallback.isAvailable(), true);
  });

  await test('6.2 Custom provider registration allows pluggability', async () => {
    class TestCustomProvider implements IConversationProvider {
      readonly id = 'custom-test-provider';
      readonly name = 'Custom Test Provider';
      async isAvailable(): Promise<boolean> { return true; }
      async generateConversationTurn(_prompt: BoundedConversationPrompt) {
        return {
          reply: 'Custom provider response verified.',
          providerId: this.id
        };
      }
    }

    const custom = new TestCustomProvider();
    conversationProviderManager.registerProvider(custom);
    const retrieved = conversationProviderManager.getProvider('custom-test-provider');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, 'custom-test-provider');
  });

  // --------------------------------------------------------------------------
  // SECTION 7: Web Search Routing (Conditional & Attributed)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Web Search Routing ---');

  await test('7.1 Normal conversation does NOT trigger web search unnecessarily', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-noweb-${Date.now()}`,
      userId: 'student-1',
      message: 'Can you summarize how momentum is conserved in inelastic collisions?'
    });

    assert.strictEqual(turn.searchAttributions, undefined);
  });

  await test('7.2 Explicit web search query routes through WebSearchProvider and preserves citations', async () => {
    const turn = await conversationEngine.processConversationTurn({
      sessionId: `sess-web-${Date.now()}`,
      userId: 'student-1',
      message: 'Search the web for OpenStax University Physics textbook citations on Newton laws.'
    });

    assert.ok(turn.searchAttributions && turn.searchAttributions.length > 0, 'Must attach search attributions');
    assert.ok(turn.reply.includes('OpenStax') || turn.reply.includes('http') || turn.reply.includes('Reference'));
  });

  // --------------------------------------------------------------------------
  // SECTION 8: HTTP REST API Integration
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8: HTTP REST API Integration ---');

  const harness = await startHttpHarness();
  const baseUrl = harness.baseUrl;

  try {
    await test('8.1 POST /api/personal/conversation/message executes full context-aware turn', async () => {
      const res = await fetch(`${baseUrl}/api/personal/conversation/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jarvis-user-id': 'student-1'
        },
        body: JSON.stringify({
          message: 'How am I progressing in Vector Force Decomposition?',
          sessionId: 'http-sess-1'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.sessionId, 'http-sess-1');
      assert.ok(data.reply);
      assert.ok(Array.isArray(data.relevantMemoryIds));
    });

    await test('8.2 GET /api/personal/conversation/session/:id retrieves stored conversation history', async () => {
      const res = await fetch(`${baseUrl}/api/personal/conversation/session/http-sess-1`, {
        headers: {
          'x-jarvis-user-id': 'student-1'
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.session.sessionId, 'http-sess-1');
      assert.ok(data.session.messages.length >= 2, 'Must contain user and assistant messages');
    });

    await test('8.3 POST /api/personal/conversation/state updates assistant state', async () => {
      const res = await fetch(`${baseUrl}/api/personal/conversation/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jarvis-user-id': 'student-1'
        },
        body: JSON.stringify({
          sessionId: 'http-sess-1',
          assistantState: 'SPEAKING',
          wakeState: 'ARMED'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.session.assistantState, 'SPEAKING');
      assert.strictEqual(data.session.wakeState, 'ARMED');
    });

    await test('8.4 GET /api/personal/conversation/sessions lists user conversation sessions', async () => {
      const res = await fetch(`${baseUrl}/api/personal/conversation/sessions`, {
        headers: {
          'x-jarvis-user-id': 'student-1'
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.sessions.length > 0);
    });
  } finally {
    await harness.close();
  }

  console.log(`\n==================================================`);
  console.log(`PHASE 4 TEST SUMMARY: ${passed}/${total} tests passed.`);
  console.log(`==================================================\n`);
}

runTestSuite().catch((err) => {
  console.error('Fatal error in Phase 4 test suite:', err);
  process.exit(1);
});
