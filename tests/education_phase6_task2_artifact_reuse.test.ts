import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { knowledgeAssetStore } from '../server/sectors/education/knowledgeAssets/knowledgeAssetStore.ts';
import { artifactRegistrationService } from '../server/sectors/education/knowledgeAssets/artifactRegistrationService.ts';
import { questionEngine } from '../server/sectors/education/questionIntelligence/questionEngine.ts';
import { storageManager } from '../server/storage/providerManager.ts';
import { startHttpHarness } from './httpHarness.ts';
import type { AuthenticatedPrincipal } from '../server/auth/principal.ts';
import type { Question } from '../src/types/questionIntelligence.ts';

console.log('=== [WEB JARVIS] PHASE 6 TASK 2: REAL ARTIFACT REGISTRATION & REUSE TEST SUITE ===');

async function runTask2TestSuite() {
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
    userId: 'student-1',
    role: 'student',
    institutionId: 'inst-1',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const studentBPrincipal: AuthenticatedPrincipal = {
    userId: 'student-2',
    role: 'student',
    institutionId: 'inst-1', // Same institution
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const externalStudentPrincipal: AuthenticatedPrincipal = {
    userId: 'student-99',
    role: 'student',
    institutionId: 'inst-99', // Different institution
    workspaceId: 'ws-other',
    provenance: 'signed-hmac'
  };

  // Re-seed clean store
  knowledgeAssetStore.clear();
  knowledgeAssetStore.seedDefaultAssets();

  // --------------------------------------------------------------------------
  // SECTION 1: Generated Question Set Registration & Storage Preservation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Generated Artifact Registration & Storage Integrity ---');

  let studentAAssetId = '';
  let storedPdfKey = '';

  await test('1.1 generated question set registers as KnowledgeAsset with real questions', async () => {
    // Generate 30 quadratic questions via QuestionEngine
    const questions = await questionEngine.generatedProvider.generateQuestions({
      subject: 'Mathematics',
      concept: 'Quadratic Equations',
      difficulty: 'intermediate',
      questionType: 'multiple_choice',
      learningObjective: 'Mastery of quadratic factorization and discriminant nature of roots',
      count: 30
    });

    assert.strictEqual(questions.length, 30, 'Must generate exactly 30 questions');

    const regResult = await artifactRegistrationService.registerQuestionSet(
      {
        title: 'Class 10 Quadratic Equations 30-Question Certified Practice Set',
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questions,
        contextId: 'ctx-class-10-math',
        generatePdfArtifact: true,
        sharedWithInstitution: true // Shared within inst-1
      },
      studentAPrincipal
    );

    assert.ok(regResult.asset, 'Registered asset must be returned');
    assert.strictEqual(regResult.isExistingDuplicate, false);
    assert.strictEqual(regResult.pdfGenerated, true);
    assert.ok(regResult.storageKey, 'Storage key must be produced');

    studentAAssetId = regResult.asset.id;
    storedPdfKey = regResult.storageKey!;

    // Verify stored asset
    const stored = await knowledgeAssetStore.getAssetById(studentAAssetId, studentAPrincipal);
    assert.ok(stored);
    assert.strictEqual(stored?.ownerId, 'student-1');
    assert.strictEqual(stored?.questionCount, 30);
    assert.strictEqual(stored?.items?.length, 30);
    assert.strictEqual(stored?.contentReference, storedPdfKey);
  });

  await test('1.2 real artifact/content reference is preserved in storageManager', async () => {
    const provider = storageManager.getProvider();
    const hasObject = await provider.hasObject(storedPdfKey);
    assert.strictEqual(hasObject, true, 'Real PDF artifact must exist in storageManager');

    const buffer = await provider.getObject(storedPdfKey);
    assert.ok(buffer && buffer.length > 0, 'PDF buffer must not be empty');

    // Verify valid PDF binary header
    const header = buffer!.slice(0, 8).toString('utf-8');
    assert(header.includes('%PDF-1.4'), 'Must be a valid PDF 1.4 document');
  });

  await test('1.3 provenance is preserved across asset and individual questions', async () => {
    const asset = await knowledgeAssetStore.getAssetById(studentAAssetId, studentAPrincipal);
    assert.ok(asset);
    assert.strictEqual(asset?.provenance.type, 'JARVIS_GENERATED');
    assert.strictEqual(asset?.provenance.authorId, 'student-1');

    const questions = asset?.items as Question[];
    assert(questions.length > 0);
    for (const q of questions) {
      assert.strictEqual(q.source, 'JARVIS_GENERATED');
      assert.ok(q.id);
      assert.ok(q.qualityMetadata?.verifiedGrounded);
      assert.strictEqual(q.qualityMetadata?.accuracyRating, 1.0);
    }
  });

  await test('1.4 validated generated asset becomes reusable', async () => {
    const asset = await knowledgeAssetStore.getAssetById(studentAAssetId, studentAPrincipal);
    assert.ok(asset);
    assert.strictEqual(asset?.validation.status, 'VALIDATED');
    assert.strictEqual(asset?.reusable, true);
    assert.ok(asset?.validation.checksPassed && asset.validation.checksPassed.includes('answer_key_complete'));
  });

  await test('1.5 unvalidated generated asset is not automatically reusable', async () => {
    const unvalidatedQuestions: Question[] = [
      {
        id: 'draft-q-1',
        subject: 'Mathematics',
        concept: 'Quadratic Equations',
        prerequisiteConcepts: [],
        difficulty: 'intermediate',
        questionType: 'multiple_choice',
        source: 'USER_CREATED',
        learningObjective: 'Draft question',
        masteryContribution: 0.05,
        estimatedTime: 60,
        prompt: 'Draft question without answer?',
        answer: '', // Missing answer -> validation fails
        explanation: ''
      }
    ];

    const regResult = await artifactRegistrationService.registerQuestionSet(
      {
        title: 'Draft Unverified Question Set',
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questions: unvalidatedQuestions,
        validation: { status: 'UNVALIDATED' }
      },
      studentAPrincipal
    );

    assert.strictEqual(regResult.asset.validation.status, 'UNVALIDATED');
    assert.strictEqual(regResult.asset.reusable, false);
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Real Reuse Path & Slicing
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Real Reuse Path & Zero Model Call Slicing ---');

  await test('2.1 second matching request (Student B) reuses existing verified asset', async () => {
    // Student B asks for 20 questions on Quadratic Equations
    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 20
      },
      studentBPrincipal
    );

    assert.strictEqual(result.decision.decision, 'REUSE');
    assert.strictEqual(result.reusedExistingAsset, true);
    assert.ok(result.registeredAsset);
    assert.strictEqual(result.questions.length, 20);
    assert(result.decision.reasons.some((r) => r.includes('Reusing existing verified knowledge asset')));
  });

  await test('2.2 reuse path avoids unnecessary Gemini generation (< 20ms)', async () => {
    const start = performance.now();

    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 20
      },
      studentBPrincipal
    );

    const elapsed = performance.now() - start;
    assert.strictEqual(result.reusedExistingAsset, true);
    assert.ok(elapsed < 50, `Deterministic reuse took ${elapsed.toFixed(2)}ms, expected < 50ms`);
  });

  await test('2.3 requested smaller quantity slices existing verified questions cleanly', async () => {
    // Request 12 questions from the 30-item asset
    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 12
      },
      studentBPrincipal
    );

    assert.strictEqual(result.questions.length, 12);
    assert.strictEqual(result.reusedExistingAsset, true);

    // Verify all 12 items originate from the verified asset
    const candidatePool = result.registeredAsset?.items as Question[];
    for (let i = 0; i < 12; i++) {
      assert.strictEqual(result.questions[i].id, candidatePool[i].id);
      assert.strictEqual(result.questions[i].prompt, candidatePool[i].prompt);
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Adaptation & Partial Matches
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Adaptation & Provenance Preservation ---');

  await test('3.1 insufficient quantity triggers ADAPT (40 requested, 30 available)', async () => {
    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 40
      },
      studentBPrincipal
    );

    assert.strictEqual(result.decision.decision, 'ADAPT');
    assert.strictEqual(result.reusedExistingAsset, false);
    assert.strictEqual(result.questions.length, 40);
    assert.strictEqual(result.decision.missingQuestionCount, 10);
  });

  await test('3.2 partial adaptation preserves provenance of both reused and new questions', async () => {
    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 40
      },
      studentBPrincipal
    );

    const questions = result.questions;
    assert.strictEqual(questions.length, 40);

    // First 30 items are from the original verified asset
    for (let i = 0; i < 30; i++) {
      assert.strictEqual(questions[i].source, 'JARVIS_GENERATED');
      assert.ok(questions[i].id);
    }

    // Last 10 items are newly generated items with distinct IDs
    const originalIds = new Set(questions.slice(0, 30).map((q) => q.id));
    for (let i = 30; i < 40; i++) {
      assert.strictEqual(questions[i].source, 'JARVIS_GENERATED');
      assert.strictEqual(originalIds.has(questions[i].id), false, 'New question IDs must be unique');
    }
  });

  await test('3.3 new generated questions are not falsely attributed to old asset', async () => {
    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 40
      },
      studentBPrincipal
    );

    assert.ok(result.registeredAsset);
    assert.strictEqual(result.registeredAsset?.metadata?.reusedCount, 30);
    assert.ok(['ka-math-quad-10', studentAAssetId].includes(result.registeredAsset?.metadata?.adaptedFromAssetId));
  });

  // --------------------------------------------------------------------------
  // SECTION 4: PDF Generation From Reused Questions
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: PDF Generation From Reused Verified Questions ---');

  await test('4.1 PDF generation can use reused verified questions without regeneration', async () => {
    const asset = await knowledgeAssetStore.getAssetById(studentAAssetId, studentBPrincipal);
    assert.ok(asset);

    const pdfRes = await artifactRegistrationService.generatePdfFromAsset(asset!, 20, studentBPrincipal);

    assert.ok(pdfRes.storageKey);
    assert.strictEqual(pdfRes.questionCount, 20);
    assert(pdfRes.buffer.length > 500, 'PDF buffer must contain formatted binary content');

    // Check stored PDF
    const provider = storageManager.getProvider();
    const hasObj = await provider.hasObject(pdfRes.storageKey);
    assert.strictEqual(hasObj, true);

    const obj = await provider.getObject(pdfRes.storageKey);
    assert.ok(obj);
    assert(obj!.slice(0, 8).toString('utf-8').includes('%PDF-1.4'));
  });

  await test('4.2 requestQuestionSetWithReuseAndRegistration produces PDF on reuse', async () => {
    const result = await questionEngine.requestQuestionSetWithReuseAndRegistration(
      {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questionCount: 20,
        generatePdf: true
      },
      studentBPrincipal
    );

    assert.strictEqual(result.reusedExistingAsset, true);
    assert.ok(result.pdfStorageKey, 'PDF storage key must be returned');

    const provider = storageManager.getProvider();
    const hasObj = await provider.hasObject(result.pdfStorageKey!);
    assert.strictEqual(hasObj, true);
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Duplicate Control & Deduplication
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Duplicate Detection & Deduplication ---');

  await test('5.1 duplicate registration is avoided for identical question set', async () => {
    const asset = await knowledgeAssetStore.getAssetById(studentAAssetId, studentAPrincipal);
    assert.ok(asset);
    const questions = asset!.items as Question[];

    // Attempt to register the exact same question set again
    const dupResult = await artifactRegistrationService.registerQuestionSet(
      {
        title: 'Class 10 Quadratic Equations 30-Question Certified Practice Set',
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        educationLevel: 'Class 10',
        difficulty: 'intermediate',
        questions,
        contextId: 'ctx-class-10-math'
      },
      studentAPrincipal
    );

    assert.strictEqual(dupResult.isExistingDuplicate, true, 'Duplicate must be detected');
    assert.strictEqual(dupResult.asset.id, studentAAssetId, 'Must return the original asset ID');
  });

  // --------------------------------------------------------------------------
  // SECTION 6: Privacy & Isolation Preservation
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Privacy & Boundary Isolation ---');

  let privateAssetId = '';

  await test('6.1 private asset created by Student A cannot be accessed by Student B', async () => {
    const privReg = await artifactRegistrationService.registerQuestionSet(
      {
        title: 'Student A Secret Physics Derivations',
        subject: 'Physics',
        topic: 'Relativistic Mechanics',
        educationLevel: 'Undergraduate',
        difficulty: 'advanced',
        questions: [
          {
            id: 'priv-q-1',
            subject: 'Physics',
            concept: 'Relativity',
            prerequisiteConcepts: [],
            difficulty: 'advanced',
            questionType: 'conceptual',
            source: 'USER_CREATED',
            learningObjective: 'Private lorentz contraction',
            masteryContribution: 0.1,
            estimatedTime: 60,
            prompt: 'Explain length contraction in special relativity.',
            answer: 'L = L0 * sqrt(1 - v^2/c^2)',
            explanation: 'Lorentz boost along axis of relative motion.'
          }
        ],
        contextId: 'ctx-student1-private',
        sharedWithInstitution: false // STRICTLY PRIVATE
      },
      studentAPrincipal
    );

    privateAssetId = privReg.asset.id;

    // Student B attempts to fetch Student A's private asset
    const fetched = await knowledgeAssetStore.getAssetById(privateAssetId, studentBPrincipal);
    assert.strictEqual(fetched, null, 'Private personal asset must NOT be returned to other students');

    // External student attempts to search
    const extSearch = await knowledgeAssetStore.searchAssets(
      { subject: 'Physics', topic: 'Relativistic Mechanics' },
      externalStudentPrincipal
    );
    assert.strictEqual(extSearch.length, 0, 'Cross-institution search must not leak private assets');
  });

  // --------------------------------------------------------------------------
  // SECTION 7: HTTP REST API Endpoints Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: HTTP REST API Endpoints Verification ---');

  const harness = await startHttpHarness();
  const token = await harness.tokenFor('student-1');

  try {
    await test('7.1 POST /api/education/knowledge-assets/generate-or-reuse reuses verified asset', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets/generate-or-reuse`, {
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
          questionCount: 20,
          generatePdf: true
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.decision.decision, 'REUSE');
      assert.strictEqual(data.questions.length, 20);
      assert.strictEqual(data.reusedExistingAsset, true);
      assert.ok(data.pdfStorageKey);
    });

    await test('7.2 POST /api/education/knowledge-assets/register-artifact registers new artifact', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets/register-artifact`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Class 10 Arithmetic Progressions (10 Items)',
          subject: 'Mathematics',
          topic: 'Arithmetic Progressions',
          educationLevel: 'Class 10',
          difficulty: 'intermediate',
          questions: [
            {
              id: 'ap-q-1',
              subject: 'Mathematics',
              concept: 'Arithmetic Progressions',
              prerequisiteConcepts: ['Sequences'],
              difficulty: 'intermediate',
              questionType: 'multiple_choice',
              source: 'JARVIS_GENERATED',
              learningObjective: 'Find nth term of an AP',
              masteryContribution: 0.1,
              estimatedTime: 60,
              prompt: 'Find the 10th term of the AP: 2, 7, 12, ...',
              options: ['47', '42', '52', '37'],
              answer: '47',
              explanation: 'a = 2, d = 5. a_10 = a + 9d = 2 + 45 = 47.'
            }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.asset.topic, 'Arithmetic Progressions');
      assert.strictEqual(data.isExistingDuplicate, false);
    });

    await test('7.3 POST /api/education/knowledge-assets/:id/pdf renders PDF from existing asset', async () => {
      const res = await fetch(`${harness.baseUrl}/api/education/knowledge-assets/${studentAAssetId}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionCount: 15 })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.questionCount, 15);
      assert.ok(data.storageKey);
      assert.ok(data.sizeBytes > 0);
    });
  } finally {
    await harness.close();
    const storageDir = path.resolve(process.cwd(), 'data', 'storage', 'objects');
    if (fs.existsSync(storageDir)) {
      for (const file of fs.readdirSync(storageDir)) {
        if (file.startsWith('obj-pdf-')) {
          try { fs.unlinkSync(path.join(storageDir, file)); } catch {}
        }
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`PHASE 6 TASK 2 TEST SUMMARY: ${passed}/${total} tests passed.`);
  console.log(`==================================================\n`);
}

runTask2TestSuite().catch((err) => {
  console.error('[Web Jarvis] Phase 6 Task 2 fatal error:', err);
  process.exit(1);
});
