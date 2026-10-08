import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { knowledgeAssetStore } from '../server/sectors/education/knowledgeAssets/knowledgeAssetStore.ts';
import { artifactRegistrationService } from '../server/sectors/education/knowledgeAssets/artifactRegistrationService.ts';
import { questionEngine } from '../server/sectors/education/questionIntelligence/questionEngine.ts';
import { learnerExposureStore } from '../server/sectors/education/questionIntelligence/learnerExposureStore.ts';
import { novelQuestionSelector } from '../server/sectors/education/questionIntelligence/novelQuestionSelector.ts';
import {
  computeQuestionFingerprint,
  ensureQuestionIdentity,
  areQuestionsEquivalent
} from '../server/sectors/education/questionIntelligence/questionIdentity.ts';
import { startHttpHarness } from './httpHarness.ts';
import type { AuthenticatedPrincipal } from '../server/auth/principal.ts';
import type { Question } from '../src/types/questionIntelligence.ts';

console.log('=== [WEB JARVIS] PHASE 6.4: QUESTION EXPOSURE, NOVELTY & MASTERY-AWARE REUSE TEST SUITE ===');

async function runPhase6_4TestSuite() {
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

  const studentAPrincipal: AuthenticatedPrincipal = {
    userId: 'student-alpha',
    role: 'student',
    institutionId: 'inst-1',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const studentBPrincipal: AuthenticatedPrincipal = {
    userId: 'student-beta',
    role: 'student',
    institutionId: 'inst-1',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  // Setup clean stores
  knowledgeAssetStore.clear();
  knowledgeAssetStore.seedDefaultAssets();
  learnerExposureStore.clear();

  // --------------------------------------------------------------------------
  // SECTION 1: Question Identity & Fingerprinting
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Question Identity & Deterministic Fingerprints ---');

  await test('1.1 question fingerprint is deterministic across equivalent content', () => {
    const q1: Partial<Question> = {
      prompt: 'Solve x^2 - 5x + 6 = 0',
      answer: '2, 3',
      difficulty: 'intermediate',
      concept: 'Quadratic Equations'
    };

    const q2: Partial<Question> = {
      prompt: '  solve x^2 - 5x + 6 = 0  ',
      answer: '2, 3',
      difficulty: 'intermediate',
      concept: 'Quadratic Equations'
    };

    const fp1 = computeQuestionFingerprint(q1 as any);
    const fp2 = computeQuestionFingerprint(q2 as any);
    assert.strictEqual(fp1, fp2, 'Fingerprints must match for semantically normalized question content');
  });

  await test('1.2 ensureQuestionIdentity preserves provenance and attaches stable ID', () => {
    const rawQuestion: Question = {
      id: '',
      subject: 'Mathematics',
      concept: 'Quadratic Equations',
      prerequisiteConcepts: ['Factoring'],
      difficulty: 'intermediate',
      questionType: 'multiple_choice',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Roots of quadratics',
      masteryContribution: 0.1,
      estimatedTime: 60,
      prompt: 'What is the discriminant of 2x^2 + 4x + 2 = 0?',
      answer: '0',
      explanation: 'b^2 - 4ac = 16 - 16 = 0'
    };

    const enhanced = ensureQuestionIdentity(rawQuestion, 'ka-math-quad-10');
    assert.ok(enhanced.id.startsWith('q-'), 'Must assign deterministic stable question ID');
    assert.strictEqual((enhanced as any).assetId, 'ka-math-quad-10');
    assert.strictEqual(enhanced.sourceReference?.sourceId, 'ka-math-quad-10');
  });

  await test('1.3 areQuestionsEquivalent detects identical questions regardless of ephemeral ID', () => {
    const qA: Question = {
      id: 'ephemeral-id-1',
      subject: 'Physics',
      concept: 'Newton Laws',
      prerequisiteConcepts: [],
      difficulty: 'beginner',
      questionType: 'multiple_choice',
      source: 'SOURCE',
      learningObjective: 'F=ma',
      masteryContribution: 0.1,
      estimatedTime: 45,
      prompt: 'What is acceleration if force is 10N and mass is 2kg?',
      answer: '5 m/s^2',
      explanation: 'a = F/m'
    };

    const qB: Question = {
      ...qA,
      id: 'ephemeral-id-99'
    };

    assert.strictEqual(areQuestionsEquivalent(qA, qB), true);
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Multi-Learner Isolation (Student A != Student B)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Multi-Learner Question Exposure Isolation ---');

  await test('2.1 Student A completing questions does not make them seen for Student B', async () => {
    const mockQuestions: Question[] = [
      {
        id: 'q-iso-1',
        subject: 'Mathematics',
        concept: 'Quadratic Equations',
        prerequisiteConcepts: [],
        difficulty: 'intermediate',
        questionType: 'multiple_choice',
        source: 'JARVIS_GENERATED',
        learningObjective: 'Practice',
        masteryContribution: 0.1,
        estimatedTime: 60,
        prompt: 'Iso question 1',
        answer: '1',
        explanation: 'Exp 1'
      },
      {
        id: 'q-iso-2',
        subject: 'Mathematics',
        concept: 'Quadratic Equations',
        prerequisiteConcepts: [],
        difficulty: 'intermediate',
        questionType: 'multiple_choice',
        source: 'JARVIS_GENERATED',
        learningObjective: 'Practice',
        masteryContribution: 0.1,
        estimatedTime: 60,
        prompt: 'Iso question 2',
        answer: '2',
        explanation: 'Exp 2'
      }
    ];

    // Record for Student A only
    await learnerExposureStore.recordExposures({
      userId: studentAPrincipal.userId,
      contextId: 'ctx-studentA-edu',
      questions: mockQuestions,
      status: 'COMPLETED'
    });

    const seenA = await learnerExposureStore.getSeenQuestionIds(studentAPrincipal.userId, 'ctx-studentA-edu');
    const seenB = await learnerExposureStore.getSeenQuestionIds(studentBPrincipal.userId, 'ctx-studentB-edu');

    assert.strictEqual(seenA.has('q-iso-1'), true, 'Student A must have seen q-iso-1');
    assert.strictEqual(seenA.has('q-iso-2'), true, 'Student A must have seen q-iso-2');
    assert.strictEqual(seenB.has('q-iso-1'), false, 'Student B must NOT have seen q-iso-1');
    assert.strictEqual(seenB.has('q-iso-2'), false, 'Student B must NOT have seen q-iso-2');
  });

  await test('2.2 Student A answering incorrectly flags weakness ONLY for Student A', async () => {
    await learnerExposureStore.recordAttempt({
      userId: studentAPrincipal.userId,
      contextId: 'ctx-studentA-edu',
      questionId: 'q-iso-1',
      isCorrect: false,
      concept: 'Factoring'
    });

    const weakA = await learnerExposureStore.getWeaknessConcepts(studentAPrincipal.userId, 'ctx-studentA-edu');
    const weakB = await learnerExposureStore.getWeaknessConcepts(studentBPrincipal.userId, 'ctx-studentB-edu');

    assert.ok(weakA.includes('Factoring'), 'Student A should have Factoring flagged as weakness');
    assert.strictEqual(weakB.includes('Factoring'), false, 'Student B should NOT inherit Student A weakness');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Novel Question Selection & "Give me 10 more"
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Novel Question Selection & "Give Me 10 More" ---');

  await test('3.1 Student A requests 10 questions on Quadratic Equations and gets Q1-Q10', async () => {
    const resA1 = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 10,
        noveltyMode: 'NEW',
        contextId: 'ctx-studentA-edu'
      },
      studentAPrincipal
    );

    assert.strictEqual(resA1.decision.decision, 'REUSE');
    assert.strictEqual(resA1.questions.length, 10);
    assert.strictEqual(resA1.reusedExistingAsset, true);
    assert.strictEqual(resA1.noveltyResult.previouslySeenCount, 0);
    assert.strictEqual(resA1.noveltyResult.novelQuestionCount, 10);

    const qIds = resA1.questions.map((q) => q.id);
    assert.deepStrictEqual(qIds, [
      'q-quad-1', 'q-quad-2', 'q-quad-3', 'q-quad-4', 'q-quad-5',
      'q-quad-6', 'q-quad-7', 'q-quad-8', 'q-quad-9', 'q-quad-10'
    ]);
  });

  await test('3.2 Student A requests 10 MORE questions: strictly excludes Q1-Q10 and yields Q11-Q20', async () => {
    const resA2 = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 10,
        noveltyMode: 'MORE',
        contextId: 'ctx-studentA-edu'
      },
      studentAPrincipal
    );

    assert.strictEqual(resA2.decision.decision, 'REUSE');
    assert.strictEqual(resA2.questions.length, 10);
    assert.strictEqual(resA2.noveltyResult.previouslySeenCount, 10);

    const qIds = resA2.questions.map((q) => q.id);
    // Strictly none of Q1-Q10 should appear
    for (let i = 1; i <= 10; i++) {
      assert.strictEqual(qIds.includes(`q-quad-${i}`), false, `Q${i} must not be repeated to Student A`);
    }

    assert.deepStrictEqual(qIds, [
      'q-quad-11', 'q-quad-12', 'q-quad-13', 'q-quad-14', 'q-quad-15',
      'q-quad-16', 'q-quad-17', 'q-quad-18', 'q-quad-19', 'q-quad-20'
    ]);
  });

  await test('3.3 Student B asks for 10 questions and CAN receive Q1-Q10 from the shared verified bank', async () => {
    const resB = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 10,
        noveltyMode: 'NEW',
        contextId: 'ctx-studentB-edu'
      },
      studentBPrincipal
    );

    assert.strictEqual(resB.decision.decision, 'REUSE');
    assert.strictEqual(resB.questions.length, 10);
    assert.strictEqual(resB.noveltyResult.previouslySeenCount, 0, 'Student B has seen 0 questions');

    const qIds = resB.questions.map((q) => q.id);
    // Student B gets Q1-Q10 fresh
    assert.deepStrictEqual(qIds, [
      'q-quad-1', 'q-quad-2', 'q-quad-3', 'q-quad-4', 'q-quad-5',
      'q-quad-6', 'q-quad-7', 'q-quad-8', 'q-quad-9', 'q-quad-10'
    ]);
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Explicit Question Novelty Modes
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Question Novelty Modes (REVIEW, WEAKNESS_PRACTICE, MIXED) ---');

  await test('4.1 REVIEW mode intentionally selects previously seen questions and prioritizes missed items', async () => {
    // Record that Student A missed q-quad-5 and got q-quad-1 correct
    await learnerExposureStore.recordAttempt({
      userId: studentAPrincipal.userId,
      contextId: 'ctx-studentA-edu',
      questionId: 'q-quad-5',
      isCorrect: false
    });
    await learnerExposureStore.recordAttempt({
      userId: studentAPrincipal.userId,
      contextId: 'ctx-studentA-edu',
      questionId: 'q-quad-1',
      isCorrect: true
    });

    const reviewRes = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 5,
        noveltyMode: 'REVIEW',
        contextId: 'ctx-studentA-edu'
      },
      studentAPrincipal
    );

    assert.strictEqual(reviewRes.questions.length, 5);
    assert.ok(reviewRes.noveltyResult.reviewQuestionCount >= 5);
    // Missed question (q-quad-5) must be ranked first!
    assert.strictEqual(reviewRes.questions[0].id, 'q-quad-5', 'Missed question must be prioritized first for review');
  });

  await test('4.2 WEAKNESS_PRACTICE prioritizes concepts where learner struggled without repeat spam', async () => {
    // Flag Factoring weakness
    await learnerExposureStore.recordAttempt({
      userId: studentAPrincipal.userId,
      contextId: 'ctx-studentA-edu',
      questionId: 'q-quad-99',
      isCorrect: false,
      concept: 'Factoring'
    });

    const weakRes = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 5,
        noveltyMode: 'WEAKNESS_PRACTICE',
        contextId: 'ctx-studentA-edu',
        weaknessConcepts: ['Factoring']
      },
      studentAPrincipal
    );

    assert.strictEqual(weakRes.questions.length, 5);
    assert.ok(weakRes.practiceSet.selectionRationale.includes('Weakness Practice'));
  });

  await test('4.3 MIXED mode balances novel challenges with spaced review retention', async () => {
    const mixedRes = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 10,
        noveltyMode: 'MIXED',
        contextId: 'ctx-studentA-edu'
      },
      studentAPrincipal
    );

    assert.strictEqual(mixedRes.questions.length, 10);
    assert.ok(mixedRes.noveltyResult.reviewQuestionCount > 0, 'Must have review items');
    assert.ok(mixedRes.noveltyResult.novelQuestionCount > 0, 'Must have novel items');
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Exhaustion & Adaptation Hierarchy
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Bank Exhaustion & Deterministic Adaptation ---');

  const studentAdaptPrincipal: AuthenticatedPrincipal = {
    userId: 'student-adapt-test',
    role: 'student',
    institutionId: 'inst-1',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  await test('5.1 When verified bank has fewer unseen questions than requested, triggers ADAPT', async () => {
    // Record that student-adapt has seen exactly 20 questions out of 30 (q-quad-1 through q-quad-20)
    const seenSlice: Question[] = Array.from({ length: 20 }, (_, i) => ({
      id: `q-quad-${i + 1}`,
      subject: 'Mathematics',
      concept: 'Quadratic Equations',
      prerequisiteConcepts: [],
      difficulty: 'intermediate',
      questionType: 'multiple_choice',
      source: 'JARVIS_GENERATED',
      learningObjective: 'Practice',
      masteryContribution: 0.05,
      estimatedTime: 60,
      prompt: `Item ${i + 1}`,
      answer: 'ans',
      explanation: 'exp'
    }));

    await learnerExposureStore.recordExposures({
      userId: studentAdaptPrincipal.userId,
      contextId: 'ctx-adapt-edu',
      questions: seenSlice,
      status: 'SEEN'
    });

    // Asking for 15 unseen questions means: 10 unseen remain in bank, 5 must be adapted/generated.
    const adaptRes = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 15,
        noveltyMode: 'MORE',
        contextId: 'ctx-adapt-edu'
      },
      studentAdaptPrincipal
    );

    assert.strictEqual(adaptRes.decision.decision, 'ADAPT');
    assert.strictEqual(adaptRes.questions.length, 15);
    assert.strictEqual(adaptRes.noveltyResult.reusedCount, 10);
    assert.strictEqual(adaptRes.decision.missingQuestionCount, 5);
  });

  await test('5.2 When all verified bank items are seen, triggers GENERATE fallback cleanly', async () => {
    // student-adapt has now seen all 30 items.
    // Asking for 5 MORE questions must trigger GENERATE from scratch and register a new asset.
    const genRes = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 5,
        noveltyMode: 'MORE',
        contextId: 'ctx-adapt-edu'
      },
      studentAdaptPrincipal
    );

    assert.strictEqual(genRes.decision.decision, 'GENERATE');
    assert.strictEqual(genRes.questions.length, 5);
    assert.strictEqual(genRes.reusedExistingAsset, false);
    assert.ok(genRes.registeredAsset);
  });


  // --------------------------------------------------------------------------
  // SECTION 6: Provenance Preservation Across Novel Sets
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Provenance Preservation ---');

  await test('6.1 Reused questions remain traceable to original asset ID', async () => {
    const resB2 = await questionEngine.getNovelPracticeSetWithReuse(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        questionCount: 5,
        noveltyMode: 'NEW',
        contextId: 'ctx-studentB-edu'
      },
      studentBPrincipal
    );

    for (const q of resB2.questions) {
      assert.strictEqual((q as any).assetId, 'ka-math-quad-10');
      assert.strictEqual(q.sourceReference?.sourceId, 'ka-math-quad-10');
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 7: HTTP REST API Endpoints Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: HTTP REST API Endpoints Verification ---');

  const harness = await startHttpHarness();
  const tokenA = await harness.tokenFor('student-1');
  const tokenB = await harness.tokenFor('student-2');

  try {
    await test('7.1 POST /api/education/question-intelligence/novel-practice-set generates practice', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/question-intelligence/novel-practice-set`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenB}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: 'Mathematics',
          topic: 'Quadratic Equations',
          questionCount: 10,
          noveltyMode: 'MORE'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.questions.length, 10);
      assert.ok(data.practiceSet);
      assert.ok(data.exposureSummary);
    });

    await test('7.2 GET /api/education/question-intelligence/exposure-summary returns learner stats', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/question-intelligence/exposure-summary?topic=Quadratic Equations`, {
        headers: {
          Authorization: `Bearer ${tokenB}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.summary.totalSeen >= 10);
      assert.strictEqual(data.summary.userId, 'student-2');
    });

    await test('7.3 POST /api/education/question-intelligence/record-attempt records outcome and feeds mastery', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/question-intelligence/record-attempt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenB}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: 'q-quad-1',
          isCorrect: true,
          score: 1.0,
          concept: 'Quadratic Formula'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.exposure.latestResult, 'CORRECT');
      assert.strictEqual(data.exposure.userId, 'student-2');
    });

    await test('7.4 POST /api/education/question-intelligence/record-skip records skipped question', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/question-intelligence/record-skip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenB}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: 'q-quad-2',
          concept: 'Discriminant'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.exposure.latestResult, 'SKIPPED');
    });

    await test('7.5 GET /api/education/question-intelligence/exposure-history returns exposure logs', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/question-intelligence/exposure-history`, {
        headers: {
          Authorization: `Bearer ${tokenB}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.count > 0);
      assert.ok(Array.isArray(data.exposures));
    });

    await test('7.6 Cross-user exposure isolation: Student A cannot access Student B exposures', async () => {
      const resA = await fetch(`${harness.baseUrl}/api/education/question-intelligence/exposure-summary`, {
        headers: {
          Authorization: `Bearer ${tokenA}`
        }
      });

      const dataA = await resA.json();
      assert.strictEqual(dataA.summary.userId, 'student-1', 'Token A must map strictly to student-1');
      assert.notStrictEqual(dataA.summary.userId, 'student-2');
    });
  } finally {
    await harness.close();
  }


  console.log(`\n==================================================`);
  console.log(`PHASE 6.4 TEST SUMMARY: ${passed}/${total} tests passed.`);
  console.log(`==================================================\n`);
}

runPhase6_4TestSuite().catch((err) => {
  console.error('[Web Jarvis] Phase 6.4 test suite failure:', err);
  process.exit(1);
});
