import assert from 'node:assert';
import { knowledgeAssetStore } from '../server/sectors/education/knowledgeAssets/knowledgeAssetStore.ts';
import { assetRelevanceVerifier } from '../server/sectors/education/knowledgeAssets/assetRelevanceVerifier.ts';
import { reuseDecisionEngine } from '../server/sectors/education/knowledgeAssets/reuseDecisionEngine.ts';
import { questionEngine } from '../server/sectors/education/questionIntelligence/questionEngine.ts';
import { startHttpHarness } from './httpHarness.ts';
import { authService } from '../server/auth/tokens.ts';
import type { AuthenticatedPrincipal } from '../server/auth/principal.ts';
import type { KnowledgeAsset, QuestionSetReuseRequest } from '../src/types/knowledgeAsset.ts';
import type { LearnerMasteryContext } from '../src/types/questionIntelligence.ts';

console.log('=== [WEB JARVIS] PHASE 6: KNOWLEDGE ASSETS & REUSE INTELLIGENCE TEST SUITE ===');

async function runPhase6TestSuite() {
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

  const studentPrincipal: AuthenticatedPrincipal = {
    userId: 'student-1',
    role: 'student',
    institutionId: 'inst-1',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const student2Principal: AuthenticatedPrincipal = {
    userId: 'student-2',
    role: 'student',
    institutionId: 'inst-2', // Different institution
    workspaceId: 'ws-other',
    provenance: 'signed-hmac'
  };

  const teacherPrincipal: AuthenticatedPrincipal = {
    userId: 'teacher-1',
    role: 'teacher',
    institutionId: 'inst-1',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  // Re-seed default assets to ensure clean baseline
  knowledgeAssetStore.clear();
  knowledgeAssetStore.seedDefaultAssets();

  // --------------------------------------------------------------------------
  // SECTION 1: Knowledge Asset Creation & Provenance
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Knowledge Asset Creation & Provenance Preservation ---');

  let createdAssetId = '';

  await test('1.1 create KnowledgeAsset with full metadata and authenticated author', async () => {
    const asset = await knowledgeAssetStore.createAsset(
      {
        title: 'Class 10 Trigonometric Identities 25-Question Diagnostic Bank',
        description: 'Comprehensive diagnostic question bank on sin, cos, and tan fundamental identities.',
        subject: 'Mathematics',
        topic: 'Trigonometry',
        subtopics: ['Pythagorean Trigonometric Identities', 'Angle Transformations'],
        concepts: ['Trigonometry', 'Sine', 'Cosine'],
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        assetType: 'QUESTION_SET',
        contextId: 'ctx-class-10-math',
        questionCount: 25,
        provenance: {
          type: 'TEACHER_CREATED',
          sourceName: 'NCERT Mathematics Chapter 8',
          authorId: 'teacher-1',
          attribution: 'Verified by Dept. of Mathematics',
          timestamp: '2026-10-06T15:00:00Z'
        },
        validation: {
          status: 'VALIDATED',
          validator: 'curriculum-board',
          validationScore: 0.99,
          checksPassed: ['answer_verified', 'rubric_matched']
        },
        reusable: true,
        items: Array.from({ length: 25 }, (_, i) => ({
          id: `q-trig-${i + 1}`,
          subject: 'Mathematics',
          concept: 'Trigonometry',
          prerequisiteConcepts: ['Geometry'],
          difficulty: 'intermediate' as const,
          questionType: 'multiple_choice' as const,
          source: 'TEACHER_CREATED' as const,
          learningObjective: 'Apply trigonometric identities to simplify expressions.',
          masteryContribution: 0.04,
          estimatedTime: 90,
          prompt: `Trigonometry Item ${i + 1}: Simplify (sin^2(theta) + cos^2(theta)) / sec^2(theta).`,
          answer: 'cos^2(theta)',
          explanation: 'Since sin^2(theta) + cos^2(theta) = 1, expression simplifies to 1 / sec^2(theta) = cos^2(theta).'
        }))
      },
      teacherPrincipal
    );

    assert.ok(asset.id, 'Asset ID must be assigned');
    assert.strictEqual(asset.ownerId, 'teacher-1', 'Owner ID must authoritatively match authenticated principal');
    assert.strictEqual(asset.subject, 'Mathematics');
    assert.strictEqual(asset.topic, 'Trigonometry');
    assert.strictEqual(asset.educationLevel, 'Class 10');
    assert.strictEqual(asset.questionCount, 25);
    assert.strictEqual(asset.items?.length, 25);
    createdAssetId = asset.id;
  });

  await test('1.2 retrieve asset by authenticated owner', async () => {
    const fetched = await knowledgeAssetStore.getAssetById(createdAssetId, teacherPrincipal);
    assert.ok(fetched, 'Owner must be able to retrieve own created asset');
    assert.strictEqual(fetched?.id, createdAssetId);
    assert.strictEqual(fetched?.title, 'Class 10 Trigonometric Identities 25-Question Diagnostic Bank');
  });

  await test('1.3 provenance is strictly preserved without claiming new generation', async () => {
    const fetched = await knowledgeAssetStore.getAssetById(createdAssetId, teacherPrincipal);
    assert.strictEqual(fetched?.provenance.type, 'TEACHER_CREATED');
    assert.strictEqual(fetched?.provenance.authorId, 'teacher-1');
    assert.strictEqual(fetched?.provenance.sourceName, 'NCERT Mathematics Chapter 8');
    assert.strictEqual(fetched?.provenance.attribution, 'Verified by Dept. of Mathematics');
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Privacy, Context & Multi-User Boundary Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Privacy, Context & Multi-User Boundary Isolation ---');

  let privateAssetId = '';

  await test('2.1 create private personal knowledge asset for Student 1', async () => {
    const asset = await knowledgeAssetStore.createAsset(
      {
        title: 'Student 1 Private Personal Chemistry Notes',
        subject: 'Chemistry',
        topic: 'Chemical Bonding',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        assetType: 'NOTES',
        contextId: 'ctx-student1-private',
        provenance: {
          type: 'USER_CREATED',
          authorId: 'student-1',
          timestamp: new Date().toISOString()
        },
        validation: {
          status: 'UNVALIDATED'
        },
        reusable: false,
        metadata: {
          sharedWithInstitution: false // STRICTLY PRIVATE
        }
      },
      studentPrincipal
    );

    privateAssetId = asset.id;
    assert.ok(privateAssetId);
  });

  await test('2.2 cross-user asset leakage is impossible (Student 2 cannot get Student 1 private asset)', async () => {
    const retrieved = await knowledgeAssetStore.getAssetById(privateAssetId, student2Principal);
    assert.strictEqual(retrieved, null, 'Foreign user must NOT receive private asset of another user');
  });

  await test('2.3 cross-user asset leakage is impossible in search queries', async () => {
    // Student 2 searches for Chemistry assets
    const results = await knowledgeAssetStore.searchAssets(
      {
        subject: 'Chemistry',
        topic: 'Chemical Bonding'
      },
      student2Principal
    );

    const leaked = results.find((a) => a.id === privateAssetId);
    assert.strictEqual(leaked, undefined, 'Student 2 search must never leak Student 1 personal assets');
  });

  await test('2.4 context isolation: asset bound to Context A cannot leak to Context B', async () => {
    // Search within ctx-class-10-math
    const mathContextResults = await knowledgeAssetStore.searchAssets(
      {
        contextId: 'ctx-class-10-math',
        subject: 'Chemistry'
      },
      studentPrincipal
    );
    assert.strictEqual(mathContextResults.length, 0, 'Context B must not receive assets bound to Context A');

    // Search within ctx-student1-private
    const privateContextResults = await knowledgeAssetStore.searchAssets(
      {
        contextId: 'ctx-student1-private',
        subject: 'Chemistry'
      },
      studentPrincipal
    );
    assert.strictEqual(privateContextResults.length, 1, 'Context matching query must return bound asset');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Deterministic Relevance Verification & Validation Checks
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Deterministic Relevance Verification & Reusability ---');

  await test('3.1 validated asset is reusable', async () => {
    const validAsset = await knowledgeAssetStore.getAssetById('ka-math-quad-10', studentPrincipal);
    assert.ok(validAsset);
    assert.strictEqual(validAsset?.validation.status, 'VALIDATED');
    assert.strictEqual(validAsset?.reusable, true);

    const verification = assetRelevanceVerifier.verifyRelevance(validAsset!, {
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      educationLevel: 'Class 10',
      difficulty: 'intermediate',
      questionCount: 20
    });

    assert.strictEqual(verification.isRelevant, true);
    assert.strictEqual(verification.details.isValidated, true);
    assert.strictEqual(verification.details.isReusable, true);
    assert.strictEqual(verification.details.quantityAdequate, true);
    assert.strictEqual(verification.mismatches.length, 0);
  });

  await test('3.2 unvalidated asset is not automatically reused', async () => {
    const unvalidated = await knowledgeAssetStore.getAssetById('ka-math-quad-unvalidated', studentPrincipal);
    assert.ok(unvalidated);
    assert.strictEqual(unvalidated?.validation.status, 'UNVALIDATED');

    const verification = assetRelevanceVerifier.verifyRelevance(unvalidated!, {
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      educationLevel: 'Class 10',
      difficulty: 'intermediate',
      questionCount: 10
    });

    assert.strictEqual(verification.isRelevant, false);
    assert.strictEqual(verification.details.isValidated, false);
    assert(
      verification.mismatches.some((m) => m.includes('UNVALIDATED')),
      'Must explicitly flag unvalidated status as a mismatch blocker'
    );
  });

  await test('3.3 reusable=false prevents automatic reuse even if validated', async () => {
    const asset = await knowledgeAssetStore.createAsset(
      {
        title: 'Confidential Exam Quadratic Items (Reusable=False)',
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 15,
        provenance: { type: 'TEACHER_CREATED', timestamp: new Date().toISOString() },
        validation: { status: 'VALIDATED' },
        reusable: false // Explicitly NOT reusable
      },
      studentPrincipal
    );

    const verification = assetRelevanceVerifier.verifyRelevance(asset, {
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      educationLevel: 'Class 10'
    });

    assert.strictEqual(verification.isRelevant, false);
    assert.strictEqual(verification.details.isReusable, false);
    assert(verification.mismatches.some((m) => m.includes('reusable flag is false')));
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Deterministic Reuse Decision Engine
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Reuse Decision Engine (REUSE, ADAPT, GENERATE) ---');

  await test('4.1 exact topic match with adequate quantity -> REUSE', async () => {
    const decision = await reuseDecisionEngine.evaluateQuestionSetRequest(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 20
      },
      studentPrincipal
    );

    assert.strictEqual(decision.decision, 'REUSE');
    assert.ok(decision.asset);
    assert.strictEqual(decision.asset?.id, 'ka-math-quad-10');
    assert.strictEqual(decision.missingQuestionCount, 0);
    assert.strictEqual(decision.matchedQuestions?.length, 20);
    assert.strictEqual(decision.details.topicMatch, true);
    assert.strictEqual(decision.details.educationLevelMatch, true);
    assert.strictEqual(decision.details.difficultyMatch, true);
    assert.strictEqual(decision.details.quantityAdequate, true);
    assert(decision.reasons.some((r) => r.includes('Reusing existing verified knowledge asset')));
  });

  await test('4.2 insufficient question count -> ADAPT', async () => {
    // Request 40 questions when existing asset only has 30
    const decision = await reuseDecisionEngine.evaluateQuestionSetRequest(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 40
      },
      studentPrincipal
    );

    assert.strictEqual(decision.decision, 'ADAPT');
    assert.strictEqual(decision.missingQuestionCount, 10);
    assert.strictEqual(decision.matchedQuestions?.length, 30);
    assert.strictEqual(decision.details.quantityAdequate, false);
    assert.ok(decision.adaptationsNeeded && decision.adaptationsNeeded.length > 0);
    assert(decision.reasons.some((r) => r.includes('insufficient')));
  });

  await test('4.3 difficulty mismatch is detected -> ADAPT', async () => {
    // Request hard questions when candidate is intermediate
    const decision = await reuseDecisionEngine.evaluateQuestionSetRequest(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'challenge', // Challenge vs intermediate
        questionCount: 15
      },
      studentPrincipal
    );

    assert.strictEqual(decision.decision, 'ADAPT');
    assert.strictEqual(decision.details.difficultyMatch, false);
    assert.ok(decision.adaptationsNeeded && decision.adaptationsNeeded.length > 0);
    assert(decision.adaptationsNeeded.some((a) => a.includes('Difficulty mismatch')));
  });

  await test('4.4 education-level mismatch is detected -> GENERATE', async () => {
    // Candidate asset 'ka-math-quad-12' is Class 12, but we request Class 8
    const decision = await reuseDecisionEngine.evaluateQuestionSetRequest(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 8', // Class 8 vs Class 10/12
        difficulty: 'intermediate',
        questionCount: 10
      },
      studentPrincipal
    );

    assert.strictEqual(decision.decision, 'GENERATE');
    assert(
      decision.reasons.some((r) => r.includes('mismatch') || r.includes('Curriculum integrity')),
      'Must explain education level mismatch'
    );
  });

  await test('4.5 unrelated topic is rejected -> GENERATE', async () => {
    const decision = await reuseDecisionEngine.evaluateQuestionSetRequest(
      {
        subject: 'Physics',
        topic: 'Thermodynamics Heat Engines',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 10
      },
      studentPrincipal
    );

    assert.strictEqual(decision.decision, 'GENERATE');
    assert(decision.reasons.some((r) => r.includes('No existing knowledge asset found') || r.includes('Unrelated')));
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Question Intelligence Integration & Zero AI Calls
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Question Intelligence Integration & Cost Verification ---');

  await test('5.1 Question Intelligence getPracticeSetWithReuse reuses verified asset', async () => {
    const context: LearnerMasteryContext = {
      overallMastery: 0.7,
      conceptMastery: { 'Quadratic Equations': 0.7 },
      prerequisiteMastery: {},
      recentAccuracy: 0.8,
      recentMistakes: [],
      difficultyHistory: { beginner: 0, intermediate: 5, advanced: 0, challenge: 0 },
      questionHistory: [],
      confidence: 0.8,
      subject: 'Mathematics',
      targetConcept: 'Quadratic Equations',
      sourceMode: 'FULL_ADAPTIVE',
      targetCount: 15
    };

    const result = await questionEngine.getPracticeSetWithReuse(context, studentPrincipal);

    assert.strictEqual(result.reuseDecision.decision, 'REUSE');
    assert.strictEqual(result.reusedAssetId, 'ka-math-quad-10');
    assert.strictEqual(result.practiceSet.totalQuestions, 15);
    assert(result.practiceSet.selectionRationale.includes('[Knowledge Asset Reused]'));
    assert(result.practiceSet.selectionRationale.includes('0 LLM calls consumed'));
  });

  await test('5.2 Question Intelligence integration does not bypass existing source hierarchy', async () => {
    // In SOURCE_ONLY mode, non-source assets (JARVIS_GENERATED / WEB_RETRIEVED) MUST NOT be reused
    const sourceOnlyContext: LearnerMasteryContext = {
      overallMastery: 0.6,
      conceptMastery: { 'Quadratic Equations': 0.6 },
      prerequisiteMastery: {},
      recentAccuracy: 0.7,
      recentMistakes: [],
      difficultyHistory: { beginner: 1, intermediate: 2, advanced: 0, challenge: 0 },
      questionHistory: [],
      confidence: 0.6,
      subject: 'Mathematics',
      targetConcept: 'Quadratic Equations',
      sourceMode: 'SOURCE_ONLY', // Strict source-only mode
      targetCount: 5
    };

    const result = await questionEngine.getPracticeSetWithReuse(sourceOnlyContext, studentPrincipal);

    // Because 'ka-math-quad-10' is JARVIS_GENERATED, SOURCE_ONLY mode must refuse reuse and fall back to generation/source
    assert.strictEqual(result.reuseDecision.decision, 'GENERATE');
    assert(result.reuseDecision.reasons.some((r) => r.includes('SOURCE_ONLY mode strictly rejects non-source')));
  });

  await test('5.3 no unnecessary AI call is required for deterministic reuse', async () => {
    const start = performance.now();

    const decision = await reuseDecisionEngine.evaluateQuestionSetRequest(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 20
      },
      studentPrincipal
    );

    const elapsedMs = performance.now() - start;

    assert.strictEqual(decision.decision, 'REUSE');
    // Purely deterministic in-memory computation executes in under 25 milliseconds
    assert.ok(elapsedMs < 100, `Deterministic reuse took ${elapsedMs.toFixed(2)}ms, expected < 100ms`);
  });

  // --------------------------------------------------------------------------
  // SECTION 6: HTTP REST API & Security Boundaries
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: HTTP REST API Endpoints & Authorization Security ---');

  const harness = await startHttpHarness();
  const token = await harness.tokenFor('student-1');

  try {
    await test('6.1 GET /api/education/knowledge-assets requires valid authorization token', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets`);
      assert.strictEqual(res.status, 401, 'Unauthenticated request must be rejected with 401');
    });

    await test('6.2 GET /api/education/knowledge-assets returns accessible assets with valid token', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets?subject=Mathematics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.count >= 1);
      assert.ok(data.assets.some((a: any) => a.id === 'ka-math-quad-10'));
    });

    await test('6.3 POST /api/education/knowledge-assets creates asset with authenticated principal', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Class 10 Real Numbers Flashcards',
          subject: 'Mathematics',
          topic: 'Real Numbers',
          educationLevel: 'Class 10',
          difficulty: 'beginner',
          assetType: 'FLASHCARD_SET',
          items: [
            { front: "State Euclid's Division Lemma", back: 'a = bq + r, 0 <= r < b' },
            { front: 'Fundamental Theorem of Arithmetic', back: 'Every composite number can be uniquely factorized into primes' }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.asset.ownerId, 'student-1');
      assert.strictEqual(data.asset.topic, 'Real Numbers');
    });

    await test('6.4 POST /api/education/knowledge-assets/evaluate-reuse returns deterministic evaluation', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets/evaluate-reuse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: 'Mathematics',
          topic: 'Quadratic Equations',
          educationLevel: 'Class 10',
          difficulty: 'intermediate',
          questionCount: 20
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.decision.decision, 'REUSE');
      assert.strictEqual(data.decision.matchedQuestions.length, 20);
    });

    await test('6.5 POST /api/education/knowledge-assets/practice-set generates practice set with reuse', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets/practice-set`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: 'Mathematics',
          targetConcept: 'Quadratic Equations',
          targetCount: 15,
          sourceMode: 'FULL_ADAPTIVE'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.practiceSet.totalQuestions, 15);
      assert.strictEqual(data.reuseDecision.decision, 'REUSE');
      assert.strictEqual(data.reusedAssetId, 'ka-math-quad-10');
    });
  } finally {
    await harness.close();
  }

  console.log(`\n==================================================`);
  console.log(`PHASE 6 TEST SUMMARY: ${passed}/${total} tests passed.`);
  console.log(`==================================================\n`);
}

runPhase6TestSuite().catch((err) => {
  console.error('[Web Jarvis] Phase 6 Test Suite fatal error:', err);
  process.exit(1);
});
