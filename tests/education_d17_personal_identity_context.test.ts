import assert from 'node:assert';
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { contextEngine } from '../server/personal/contextEngine.ts';
import { personalMemoryStore } from '../server/personal/memoryStore.ts';
import { personalKnowledgeStore } from '../server/personal/knowledgeStore.ts';
import { webSearchProvider, CuratedWebSearchProvider, YouWebSearchProvider } from '../server/personal/webSearchProvider.ts';
import { conversationEngine } from '../server/personal/conversationEngine.ts';
import { startHttpHarness } from './httpHarness.ts';
import type {
  PersonalJarvisIdentity,
  ProgressiveOnboardingPayload,
  PersonalMemoryItem
} from '../src/types/personalIdentity.ts';

console.log('=== [WEB JARVIS] PHASE 3: PERSONAL IDENTITY, CONTEXT & MEMORY TEST SUITE ===');

async function runTestSuite() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`[PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`[FAIL] ${name}:`, err);
            throw err;
          });
      }
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // SECTION 1: Personal Jarvis Identity (1 Person, Multiple Contexts/Roles)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Personal Identity Model ---');

  await test('1.1 Personal identity represents 1 individual with multiple contexts and roles', async () => {
    const identity = await personalIdentityStore.getIdentity('student-1');
    assert.strictEqual(identity.userId, 'student-1');
    assert.strictEqual(identity.profile.displayName, 'Alex Stark');
    assert(identity.contexts.length >= 2, 'Must support multiple contexts for 1 person');
    assert(identity.roles.includes('student') && identity.roles.includes('researcher'));
    assert(identity.goals.length > 0);
  });

  await test('1.2 Identity profile updates maintain user integrity and timestamps', async () => {
    const updated = await personalIdentityStore.updateIdentity('student-1', {
      interests: ['Quantum Mechanics', 'Rocket Propulsion', 'AI Hardware']
    });
    assert(updated.interests.includes('Rocket Propulsion'));
    assert(new Date(updated.updatedAt).getTime() > 0);
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Progressive Onboarding Foundation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Progressive Onboarding ---');

  await test('2.1 Progressive onboarding sets expected curriculum context without assuming actual mastery', async () => {
    const payload: ProgressiveOnboardingPayload = {
      userId: 'cadet-new-1',
      name: 'Maya Lin',
      preferredName: 'Maya',
      ageRange: '16-18',
      country: 'Canada',
      primaryRole: 'student',
      educationInfo: {
        gradeLevel: 'Grade 11',
        curriculum: 'IB Diploma Physics HL',
        targetExam: 'IB Exam 2027',
        institutionName: 'Toronto STEM Academy',
        academicGoals: ['Master Electromagnetism', 'Score 7 in Physics HL']
      },
      interests: ['Astrophysics', 'Neural Networks']
    };

    const identity = await personalIdentityStore.processProgressiveOnboarding(payload);
    assert.strictEqual(identity.profile.displayName, 'Maya Lin');
    assert.strictEqual(identity.profile.preferredName, 'Maya');

    // Context is created representing expected curriculum, NOT pre-assumed concept mastery
    const eduCtx = identity.contexts.find((c) => c.type === 'EDUCATION');
    assert(eduCtx, 'Must create Education context');
    assert.strictEqual(eduCtx.metadata.gradeLevel, 'Grade 11');
    assert.strictEqual(eduCtx.metadata.curriculum, 'IB Diploma Physics HL');

    // Goals created from onboarding
    assert.strictEqual(identity.goals.length, 2);
    assert.strictEqual(identity.goals[0].title, 'Master Electromagnetism');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Multi-Context Engine & Context Switching
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Context Engine ---');

  await test('3.1 User can switch between Personal, Education, and Research contexts', async () => {
    const contexts = await contextEngine.getContexts('student-1');
    assert(contexts.length >= 3);

    const initialActive = await contextEngine.getActiveContext('student-1');
    assert(initialActive.isActive);

    const targetContextId = 'ctx-student1-research';
    const switched = await contextEngine.switchContext('student-1', targetContextId);
    assert.strictEqual(switched.id, targetContextId);
    assert.strictEqual(switched.isActive, true);

    const verified = await contextEngine.getActiveContext('student-1');
    assert.strictEqual(verified.id, targetContextId);

    // Switch back to Education context
    await contextEngine.switchContext('student-1', 'ctx-student1-edu');
  });

  await test('3.2 Can create a custom Project or Work context dynamically', async () => {
    const created = await contextEngine.createContext('student-1', {
      type: 'PROJECT',
      title: 'FIRST Robotics Vision Subsystem',
      description: 'Autonomous object detection and navigation control codebase',
      metadata: { competition: 'FRC 2027' }
    });

    assert.strictEqual(created.type, 'PROJECT');
    assert(created.id.startsWith('ctx-student-1-'));
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Structured Personal Memory & Provenance
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Structured Memory & Provenance ---');

  await test('4.1 Stores structured memory with explicit source provenance', async () => {
    const memory = await personalMemoryStore.addMemory({
      userId: 'student-1',
      category: 'UserPreference',
      key: 'preferred_notation',
      value: 'Dirac bra-ket notation for state vectors',
      source: 'USER_STATED',
      contextId: 'ctx-student1-edu',
      visibility: 'PRIVATE_PERSONAL',
      provenance: {
        sourceEntityType: 'chat',
        timestamp: new Date().toISOString(),
        notes: 'User stated in quantum discussion session.'
      }
    });

    assert.strictEqual(memory.category, 'UserPreference');
    assert.strictEqual(memory.source, 'USER_STATED');
    assert.strictEqual(memory.confidence, 1.0);
    assert.strictEqual(memory.provenance.sourceEntityType, 'chat');
  });

  await test('4.2 Distinguishes system-derived memories from user-confirmed memories', async () => {
    const derivedMemory = await personalMemoryStore.addMemory({
      userId: 'student-1',
      category: 'UserLearningState',
      key: 'friction_concept_gap',
      value: 'Conflates static and kinetic friction thresholds on inclines.',
      source: 'SYSTEM_DERIVED',
      confidence: 0.75,
      contextId: 'ctx-student1-edu',
      visibility: 'CONTEXT_BOUND',
      provenance: {
        sourceEntityType: 'practice',
        sourceEntityId: 'practice-set-101',
        timestamp: new Date().toISOString()
      }
    });

    assert.strictEqual(derivedMemory.source, 'SYSTEM_DERIVED');
    assert.strictEqual(derivedMemory.confidence, 0.75);

    // When user confirms the memory
    const confirmed = await personalMemoryStore.confirmSystemMemory(derivedMemory.id, 'student-1');
    assert(confirmed);
    assert.strictEqual(confirmed.source, 'USER_CONFIRMED');
    assert.strictEqual(confirmed.confidence, 1.0);
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Personal Knowledge vs Generic Memory
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Personal Knowledge Foundation ---');

  await test('5.1 Tracks verified concept mastery in personal knowledge graph', async () => {
    const knowledge = await personalKnowledgeStore.getKnowledge('student-1');
    assert(knowledge.concepts['concept-newton-laws']);
    assert.strictEqual(knowledge.concepts['concept-newton-laws'].status, 'mastered');
    assert.strictEqual(knowledge.concepts['concept-newton-laws'].masteryLevel, 0.85);
  });

  await test('5.2 Recording concept mastery updates status and generates signal', async () => {
    const updated = await personalKnowledgeStore.recordConceptMastery('student-1', {
      conceptName: 'Vector Force Decomposition',
      subject: 'Physics',
      masteryDelta: +0.20,
      provenanceSource: 'practice-set-review'
    });

    assert.strictEqual(updated.status, 'mastered');
    assert(updated.masteryLevel >= 0.80);

    const knowledge = await personalKnowledgeStore.getKnowledge('student-1');
    assert(knowledge.recentSignals.some((s) => s.type === 'concept_mastered'));
  });

  // --------------------------------------------------------------------------
  // SECTION 6: Next Best Action Deterministic Resolution
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Next Best Action Engine ---');

  await test('6.1 Computes deterministic Next Best Action based on active context and mastery gaps', async () => {
    const nba = await personalKnowledgeStore.computeNextBestAction('student-1', 'Physics');
    assert(nba.title.length > 0);
    assert(nba.estimatedMinutes > 0);
    assert(nba.rationale.length > 0);
    assert(nba.actionTarget.courseId);
  });

  // --------------------------------------------------------------------------
  // SECTION 7: Web Intelligence Search Provider Abstraction
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Web Search Provider Abstraction ---');

  await test('7.1 WebSearchProvider executes search and retains strict attribution', async () => {
    assert(webSearchProvider instanceof CuratedWebSearchProvider);
    assert(await webSearchProvider.isAvailable());

    const results = await webSearchProvider.search('Newton laws of motion');
    assert(results.length > 0);
    for (const r of results) {
      assert(r.title);
      assert(r.url);
      assert(r.domain);
      assert(r.sourceAttribution, 'Must retain source attribution');
      assert(r.reliabilityScore > 0.8);
    }
  });

  await test('7.2 YouWebSearchProvider satisfies IWebSearchProvider contract', async () => {
    const youProvider = new YouWebSearchProvider();
    assert.strictEqual(youProvider.id, 'you-search-provider');
    const results = await youProvider.search('Calculus chain rule');
    assert(results.length > 0);
  });

  // --------------------------------------------------------------------------
  // SECTION 8: Continuous Conversation State Machine & Wake Contracts
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Conversation State Machine ---');

  await test('8.1 ConversationEngine manages personal context-aware session states', async () => {
    const session = await conversationEngine.getOrCreateSession('sess-test-1', 'student-1');
    assert.strictEqual(session.assistantState, 'IDLE');
    assert.strictEqual(session.wakeState, 'STANDBY');

    const listening = await conversationEngine.transitionAssistantState('sess-test-1', 'LISTENING');
    assert.strictEqual(listening.assistantState, 'LISTENING');

    const thinking = await conversationEngine.transitionAssistantState('sess-test-1', 'THINKING');
    assert.strictEqual(thinking.assistantState, 'THINKING');

    const armed = await conversationEngine.setWakeState('sess-test-1', 'ARMED');
    assert.strictEqual(armed.wakeState, 'ARMED');
  });

  await test('8.2 Builds bounded personal context prompt prefix', async () => {
    const promptPrefix = await conversationEngine.buildPersonalContextPromptPrefix('student-1');
    assert(promptPrefix.includes('Alex Stark'));
    assert(promptPrefix.includes('Active Context:'));
    assert(promptPrefix.includes('Explanation Style:'));
  });

  // --------------------------------------------------------------------------
  // SECTION 9: Privacy & Institution Security Boundaries
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 9: Security & Tenant Isolation ---');

  await test('9.1 Private personal memories are never returned in institution-filtered queries', async () => {
    const privateMemories = await personalMemoryStore.getMemories('student-1', {
      visibility: 'INSTITUTION_SHARED'
    });

    // None of student-1's private memories were marked INSTITUTION_SHARED
    for (const m of privateMemories) {
      assert.strictEqual(m.visibility, 'INSTITUTION_SHARED');
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 10: HTTP REST Endpoints
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 10: HTTP REST Endpoints ---');

  const harness = await startHttpHarness();
  const { baseUrl } = harness;

  try {
    await test('10.1 GET /api/personal/identity returns PersonalJarvisIdentity', async () => {
      const res = await fetch(`${baseUrl}/api/personal/identity`, {
        headers: { 'x-jarvis-user-id': 'student-1' }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.identity.profile.displayName, 'Alex Stark');
    });

    await test('10.2 GET /api/personal/contexts returns user contexts and active context', async () => {
      const res = await fetch(`${baseUrl}/api/personal/contexts`, {
        headers: { 'x-jarvis-user-id': 'student-1' }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.contexts.length >= 2);
      assert(data.activeContext.id);
    });

    await test('10.3 POST /api/personal/contexts/switch updates active operating context', async () => {
      const res = await fetch(`${baseUrl}/api/personal/contexts/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jarvis-user-id': 'student-1'
        },
        body: JSON.stringify({ contextId: 'ctx-student1-edu' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.activeContext.id, 'ctx-student1-edu');
    });

    await test('10.4 POST /api/personal/memories stores structured memory with provenance', async () => {
      const res = await fetch(`${baseUrl}/api/personal/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jarvis-user-id': 'student-1'
        },
        body: JSON.stringify({
          category: 'UserFact',
          key: 'quantum_lab_preference',
          value: 'Prefers 2D probability density plots over 1D cross sections',
          source: 'USER_STATED',
          visibility: 'PRIVATE_PERSONAL'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.memory.key, 'quantum_lab_preference');
    });

    await test('10.5 GET /api/personal/home returns complete My Jarvis Personal Home payload', async () => {
      const res = await fetch(`${baseUrl}/api/personal/home`, {
        headers: { 'x-jarvis-user-id': 'student-1' }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.home.greeting.includes('Alex'));
      assert(data.home.nextBestAction.title);
      assert(data.home.quickActions.length >= 5);
    });

    await test('10.6 POST /api/personal/search executes attributed web intelligence search', async () => {
      const res = await fetch(`${baseUrl}/api/personal/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Schrodinger wave function MIT' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.results.length > 0);
      assert(data.results[0].sourceAttribution);
    });
  } finally {
    await harness.close();
  }

  console.log(`\n======================================================`);
  console.log(`PHASE 3 PERSONAL IDENTITY RESULTS: ${passed}/${total} PASSED`);
  console.log(`======================================================\n`);
}

runTestSuite().catch((err) => {
  console.error('[FATAL] Phase 3 Test suite failed:', err);
  process.exit(1);
});
