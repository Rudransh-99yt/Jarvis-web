import assert from 'node:assert';
import { questionEngine } from '../server/sectors/education/questionIntelligence/questionEngine.ts';
import { SourceQuestionProvider } from '../server/sectors/education/questionIntelligence/providers/sourceQuestionProvider.ts';
import { DeterministicQuestionProvider } from '../server/sectors/education/questionIntelligence/providers/deterministicQuestionProvider.ts';
import { GeneratedQuestionProvider, DeterministicQuestionGenerator } from '../server/sectors/education/questionIntelligence/providers/generatedQuestionProvider.ts';
import { ExternalQuestionProvider } from '../server/sectors/education/questionIntelligence/providers/externalQuestionProvider.ts';
import { QuestionSelectionEngine } from '../server/sectors/education/questionIntelligence/selectionEngine.ts';
import { MasteryEvidenceEngine } from '../server/sectors/education/questionIntelligence/masteryEvidenceEngine.ts';
import { startHttpHarness } from './httpHarness.ts';
import type { LearnerMasteryContext, Question } from '../src/types/questionIntelligence.ts';

console.log('=== [WEB JARVIS] PHASE 2: SOURCE + QUESTION INTELLIGENCE TEST SUITE ===');

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
  // SECTION 1: Provider Architecture & Registration
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Question Provider Architecture ---');

  await test('1.1 QuestionEngine initializes all 4 provider tiers', async () => {
    assert(questionEngine.sourceProvider instanceof SourceQuestionProvider);
    assert(questionEngine.deterministicProvider instanceof DeterministicQuestionProvider);
    assert(questionEngine.generatedProvider instanceof GeneratedQuestionProvider);
    assert(questionEngine.externalProvider instanceof ExternalQuestionProvider);
  });

  await test('1.2 Providers expose explicit and correct source categories', async () => {
    assert.strictEqual(questionEngine.sourceProvider.sourceCategory, 'SOURCE');
    assert.strictEqual(questionEngine.deterministicProvider.sourceCategory, 'JARVIS_GENERATED');
    assert.strictEqual(questionEngine.generatedProvider.sourceCategory, 'JARVIS_GENERATED');
    assert.strictEqual(questionEngine.externalProvider.sourceCategory, 'WEB_RETRIEVED');
  });

  await test('1.3 Providers are available without requiring external AI services', async () => {
    const providers = await questionEngine.getProviders();
    assert.strictEqual(providers.length, 4);
    assert(providers.every((p) => p.available === true));
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Source-Grounded Integrity & Attribution
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Source Material Integrity & Provenance ---');

  await test('2.1 Source questions retain precise textbook/PDF citations', async () => {
    const sourceQuestions = await questionEngine.sourceProvider.getQuestions({
      subject: 'Physics',
      concept: "Newton's Laws"
    });
    assert(sourceQuestions.length >= 3, `Expected at least 3 source questions, got ${sourceQuestions.length}`);

    for (const q of sourceQuestions) {
      assert.strictEqual(q.source, 'SOURCE');
      assert(q.sourceReference, 'Source question must have sourceReference');
      assert(q.sourceReference.title, 'Source reference must have title');
      assert(q.sourceReference.snippet, 'Source reference must have verified quotation snippet');
      assert.strictEqual(q.qualityMetadata?.verifiedGrounded, true);
    }
  });

  await test('2.2 Dynamic source registration preserves SOURCE category', () => {
    const customDocQuestion: Question = {
      id: 'custom-doc-1',
      subject: 'Physics',
      concept: 'Thermodynamics',
      prerequisiteConcepts: ['Heat', 'Work'],
      difficulty: 'intermediate',
      questionType: 'conceptual',
      source: 'SOURCE',
      sourceReference: {
        type: 'notes',
        title: 'Lecture 12 Notes - Entropy',
        pageNumber: 4,
        snippet: 'Total entropy of an isolated system never decreases over time.'
      },
      learningObjective: 'State the second law of thermodynamics in terms of entropy.',
      masteryContribution: 0.15,
      estimatedTime: 45,
      prompt: 'According to page 4 of the lecture notes, what is the behavior of total entropy in an isolated system?',
      answer: 'It never decreases over time',
      explanation: 'From Lecture 12 Notes: dS >= 0 for isolated processes.'
    };

    questionEngine.registerSourceQuestions([customDocQuestion]);
    assert(questionEngine.getQuestionById('custom-doc-1') !== null);
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Book-Only / Source Mode Boundaries
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Source Mode Boundaries & Book-Only Mode ---');

  await test('3.1 SOURCE_ONLY mode strictly filters out all generated and web questions', async () => {
    const context: LearnerMasteryContext = {
      overallMastery: 0.8,
      conceptMastery: { "Newton's Laws": 0.85 },
      prerequisiteMastery: { 'Mass and Inertia': 0.9 },
      recentAccuracy: 0.9,
      recentMistakes: [],
      difficultyHistory: { beginner: 2, intermediate: 3, advanced: 2, challenge: 1 },
      questionHistory: [],
      confidence: 0.85,
      subject: 'Physics',
      targetConcept: "Newton's Laws",
      sourceMode: 'SOURCE_ONLY',
      targetCount: 10
    };

    const practiceSet = await questionEngine.getPracticeSet(context);
    assert.strictEqual(practiceSet.sourceMode, 'SOURCE_ONLY');
    assert(practiceSet.questions.length > 0);

    // CRITICAL: Every single question MUST be SOURCE or TEACHER_CREATED
    for (const item of practiceSet.questions) {
      assert(
        item.question.source === 'SOURCE' || item.question.source === 'TEACHER_CREATED',
        `Non-source question found in SOURCE_ONLY mode: ${item.question.id} (${item.question.source})`
      );
    }
    assert.strictEqual(practiceSet.breakdown.sourceBreakdown.JARVIS_GENERATED, 0);
    assert.strictEqual(practiceSet.breakdown.sourceBreakdown.WEB_RETRIEVED, 0);
  });

  await test('3.2 SOURCE_PLUS_JARVIS mode includes only source and generated items (0 web)', async () => {
    const context: LearnerMasteryContext = {
      overallMastery: 0.6,
      conceptMastery: { "Newton's Laws": 0.6 },
      prerequisiteMastery: {},
      recentAccuracy: 0.65,
      recentMistakes: [],
      difficultyHistory: { beginner: 2, intermediate: 2, advanced: 0, challenge: 0 },
      questionHistory: [],
      confidence: 0.7,
      subject: 'Physics',
      targetConcept: "Newton's Laws",
      sourceMode: 'SOURCE_PLUS_JARVIS',
      targetCount: 6
    };

    const practiceSet = await questionEngine.getPracticeSet(context);
    assert.strictEqual(practiceSet.sourceMode, 'SOURCE_PLUS_JARVIS');
    for (const item of practiceSet.questions) {
      assert.notStrictEqual(item.question.source, 'WEB_RETRIEVED');
    }
  });

  await test('3.3 SOURCE_PLUS_WEB mode includes only source and web items (0 generated)', async () => {
    const context: LearnerMasteryContext = {
      overallMastery: 0.8,
      conceptMastery: { "Newton's Laws": 0.8 },
      prerequisiteMastery: {},
      recentAccuracy: 0.85,
      recentMistakes: [],
      difficultyHistory: { beginner: 1, intermediate: 2, advanced: 2, challenge: 1 },
      questionHistory: [],
      confidence: 0.8,
      subject: 'Physics',
      targetConcept: "Newton's Laws",
      sourceMode: 'SOURCE_PLUS_WEB',
      targetCount: 6
    };

    const practiceSet = await questionEngine.getPracticeSet(context);
    assert.strictEqual(practiceSet.sourceMode, 'SOURCE_PLUS_WEB');
    for (const item of practiceSet.questions) {
      assert.notStrictEqual(item.question.source, 'JARVIS_GENERATED');
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Adaptive Selection Engine (Deterministic Logic)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Deterministic Adaptive Selection Engine ---');

  await test('4.1 Prerequisite gap triggers targeted foundational questions with explainable reasons', async () => {
    const context: LearnerMasteryContext = {
      overallMastery: 0.5,
      conceptMastery: { "Newton's Laws": 0.55 },
      prerequisiteMastery: {
        'Mass and Inertia': 0.45 // Weak prerequisite!
      },
      recentAccuracy: 0.5,
      recentMistakes: ['Mass and Inertia'],
      difficultyHistory: { beginner: 4, intermediate: 1, advanced: 0, challenge: 0 },
      questionHistory: [],
      confidence: 0.5,
      subject: 'Physics',
      targetConcept: "Newton's Laws",
      sourceMode: 'FULL_ADAPTIVE',
      targetCount: 6
    };

    const practiceSet = await questionEngine.getPracticeSet(context);
    const prereqItems = practiceSet.questions.filter((q) => q.targetedAspect === 'prerequisite_gap');

    assert(prereqItems.length > 0, 'Expected at least 1 prerequisite diagnostic item');
    assert(
      prereqItems[0].selectionReason.includes('prerequisite') &&
      prereqItems[0].selectionReason.includes('Mass and Inertia'),
      `Reason must be explainable: ${prereqItems[0].selectionReason}`
    );
  });

  await test('4.2 High conceptual mastery elevates application and challenge difficulty', async () => {
    const context: LearnerMasteryContext = {
      overallMastery: 0.88,
      conceptMastery: { "Newton's Laws": 0.90 },
      prerequisiteMastery: { 'Mass and Inertia': 0.95, 'Vector Decomposition': 0.95 },
      recentAccuracy: 0.92,
      recentMistakes: [],
      difficultyHistory: { beginner: 0, intermediate: 2, advanced: 4, challenge: 2 },
      questionHistory: [],
      confidence: 0.90,
      subject: 'Physics',
      targetConcept: "Newton's Laws",
      sourceMode: 'FULL_ADAPTIVE',
      targetCount: 6
    };

    const practiceSet = await questionEngine.getPracticeSet(context);
    const advancedOrChallenge = practiceSet.questions.filter(
      (q) => q.question.difficulty === 'advanced' || q.question.difficulty === 'challenge'
    );

    assert(advancedOrChallenge.length >= 2, 'High mastery should include multiple advanced/challenge questions');
    const applicationItem = practiceSet.questions.find((q) => q.targetedAspect === 'application_stretch');
    if (applicationItem) {
      assert(applicationItem.selectionReason.includes('increasing application difficulty') || applicationItem.selectionReason.includes('accuracy is strong'));
    }
  });

  await test('4.3 Conceptual mismatch (overconfidence) triggers misconception diagnosis item', async () => {
    const context: LearnerMasteryContext = {
      overallMastery: 0.45,
      conceptMastery: { "Newton's Laws": 0.45 },
      prerequisiteMastery: {},
      recentAccuracy: 0.40, // Low accuracy
      recentMistakes: ["Newton's Laws"],
      difficultyHistory: { beginner: 2, intermediate: 2, advanced: 0, challenge: 0 },
      questionHistory: [],
      confidence: 0.95, // High confidence -> Overconfident!
      subject: 'Physics',
      targetConcept: "Newton's Laws",
      sourceMode: 'FULL_ADAPTIVE',
      targetCount: 6
    };

    const practiceSet = await questionEngine.getPracticeSet(context);
    const misconceptionItem = practiceSet.questions.find((q) => q.targetedAspect === 'misconception_check');
    assert(misconceptionItem, 'Must select a misconception check item when overconfidence is detected');
    assert(misconceptionItem.selectionReason.includes('conceptual mismatch') || misconceptionItem.selectionReason.includes('reinforcing'));
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Extensible Question Types & Quality Metadata
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Question Types & Quality Metadata ---');

  await test('5.1 Supports extensible question types', async () => {
    const questions = await questionEngine.listQuestions({ subject: 'Physics', concept: "Newton's Laws" });
    const types = new Set(questions.map((q) => q.questionType));

    assert(types.has('multiple_choice'), 'Must support multiple_choice');
    assert(types.has('numerical'), 'Must support numerical');
    assert(types.has('conceptual'), 'Must support conceptual');
    assert(types.has('application'), 'Must support application');
  });

  await test('5.2 Generated questions associate complete quality metadata', async () => {
    const genQuestions = await questionEngine.generatedProvider.getQuestions({
      subject: 'Physics',
      concept: "Newton's Laws",
      limit: 2
    });

    assert(genQuestions.length > 0);
    for (const q of genQuestions) {
      assert(q.learningObjective, 'Must have learningObjective');
      assert(q.explanation, 'Must have explanation');
      assert(q.qualityMetadata, 'Must have qualityMetadata');
      assert(typeof q.qualityMetadata.accuracyRating === 'number');
      assert(typeof q.qualityMetadata.pedagogicalValue === 'number');
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 6: External Web Provider Attribution
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: External Provider Attribution ---');

  await test('6.1 External questions retain open repository citation and attribution', async () => {
    const extQuestions = await questionEngine.externalProvider.getQuestions({
      subject: 'Physics',
      concept: "Newton's Laws"
    });

    assert(extQuestions.length > 0);
    for (const q of extQuestions) {
      assert.strictEqual(q.source, 'WEB_RETRIEVED');
      assert(q.citation, 'External question must have attribution citation');
      assert(q.sourceReference?.url, 'External question must have URL reference');
      assert(q.sourceReference?.authorOrPublisher, 'External question must credit publisher');
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 7: Mastery Evidence Engine & Evaluation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Mastery Evidence Engine ---');

  await test('7.1 Evaluates numerical answer accurately and computes positive mastery delta', async () => {
    const evidence = await questionEngine.evaluateQuestion({
      questionId: 'src-phys-newton-2',
      learnerAnswer: 2.5,
      timeSpentSeconds: 50,
      learnerConfidence: 0.9
    }, 0.60);

    assert.strictEqual(evidence.isCorrect, true);
    assert.strictEqual(evidence.score, 1.0);
    assert.strictEqual(evidence.confidenceAlignment, 'calibrated_high');
    assert(evidence.masteryDelta > 0, 'Mastery delta must be positive');
    assert(evidence.updatedConceptMastery > evidence.previousConceptMastery);
    assert(evidence.feedback.explanation.length > 0);
  });

  await test('7.2 Diagnoses misconception and flags overconfidence upon incorrect response', async () => {
    const evidence = await questionEngine.evaluateQuestion({
      questionId: 'src-phys-newton-3',
      learnerAnswer: 'The upward normal force exerted by the table surface on the book',
      timeSpentSeconds: 30,
      learnerConfidence: 0.95 // Highly confident in incorrect answer!
    }, 0.70);

    assert.strictEqual(evidence.isCorrect, false);
    assert.strictEqual(evidence.confidenceAlignment, 'overconfident');
    assert(evidence.misconceptionIdentified, 'Must diagnose misconception');
    assert(evidence.masteryDelta < 0, 'Mastery delta must be negative');
    assert.strictEqual(evidence.feedback.nextRecommendedAction.action, 'review_source_material');
  });

  await test('7.3 Next recommended action guides student to prerequisite when foundational gap is identified', async () => {
    const evidence = await questionEngine.evaluateQuestion({
      questionId: 'det-prereq-mass-inertia-1',
      learnerAnswer: 'Gravitational Weight (N)', // Incorrect
      timeSpentSeconds: 25,
      learnerConfidence: 0.3 // Low confidence
    }, 0.50);

    assert.strictEqual(evidence.isCorrect, false);
    assert.strictEqual(evidence.confidenceAlignment, 'calibrated_low');
    assert(evidence.feedback.nextRecommendedAction.action === 'review_prerequisite');
  });

  // --------------------------------------------------------------------------
  // SECTION 8: HTTP REST API Endpoints
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8: HTTP REST Endpoints ---');

  const harness = await startHttpHarness();
  const { baseUrl } = harness;

  try {
    await test('8.1 POST /api/education/question-intelligence/practice-set returns calibrated practice set', async () => {
      const res = await fetch(`${baseUrl}/api/education/question-intelligence/practice-set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Physics',
          targetConcept: "Newton's Laws",
          overallMastery: 0.75,
          sourceMode: 'FULL_ADAPTIVE',
          targetCount: 5
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.practiceSet.questions.length > 0);
      assert(data.practiceSet.selectionRationale.length > 0);
    });

    await test('8.2 POST /api/education/question-intelligence/evaluate returns mastery evidence payload', async () => {
      const res = await fetch(`${baseUrl}/api/education/question-intelligence/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: 'src-phys-newton-1',
          learnerAnswer: 'The body maintains constant velocity with zero acceleration',
          timeSpentSeconds: 40,
          learnerConfidence: 0.8
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.evidence.isCorrect, true);
      assert(typeof data.evidence.masteryDelta === 'number');
    });

    await test('8.3 GET /api/education/question-intelligence/providers lists active providers', async () => {
      const res = await fetch(`${baseUrl}/api/education/question-intelligence/providers`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.providers.length, 4);
    });

    await test('8.4 GET /api/education/question-intelligence/source-modes lists supported source modes', async () => {
      const res = await fetch(`${baseUrl}/api/education/question-intelligence/source-modes`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.sourceModes.some((m: any) => m.mode === 'SOURCE_ONLY'));
      assert(data.sourceModes.some((m: any) => m.mode === 'FULL_ADAPTIVE'));
    });
  } finally {
    await harness.close();
  }

  console.log(`\n======================================================`);
  console.log(`PHASE 2 QUESTION INTELLIGENCE RESULTS: ${passed}/${total} PASSED`);
  console.log(`======================================================\n`);
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('[FATAL] Test suite failed:', err);
  process.exit(1);
});
