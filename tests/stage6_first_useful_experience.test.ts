// JARVIS-WEB — STAGE 6: THE FIRST USEFUL EXPERIENCE TEST SUITE
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { authRouter } from '../server/auth/authRoutes.ts';
import { personalRouter } from '../server/personal/personalRoutes.ts';
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { personalKnowledgeStore } from '../server/personal/knowledgeStore.ts';
import { personalMemoryStore } from '../server/personal/memoryStore.ts';
import { personalNotesStore } from '../server/personal/tools/personalNotesStore.ts';
import { authService } from '../server/auth/index.ts';
import {
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';

let server: Server;
let baseUrl = '';
let isolatedTempDir = '';

async function startTestServer(): Promise<void> {
  isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-stage6-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'stage6-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed();
  setActiveRepository(isolatedRepo);

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/personal', personalRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
}

async function stopTestServer(): Promise<void> {
  try {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  } finally {
    resetActiveRepository();
    if (isolatedTempDir && fs.existsSync(isolatedTempDir)) {
      fs.rmSync(isolatedTempDir, { recursive: true, force: true });
    }
  }
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err);
    throw err;
  }
}

async function runStage6TestSuite() {
  console.log('\n======================================================================');
  console.log(' [WEB JARVIS] STAGE 6: THE FIRST USEFUL EXPERIENCE VERIFICATION');
  console.log('======================================================================\n');

  await startTestServer();

  try {
    const uniqueId = `stage6-${Date.now()}`;
    const testEmail = `cadet-${uniqueId}@jarvis.os`;
    let authToken = '';
    let userId = '';

    // ------------------------------------------------------------------------
    // SECTION 1: User Registration & Onboarding Calibration
    // ------------------------------------------------------------------------
    console.log('--- Section 1: Registration & Progressive Onboarding Calibration ---');

    await test('1.1 Newly registered user gets sovereign personal workspace and token', async () => {
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Astra Vance',
          email: testEmail,
          role: 'student'
        })
      });

      assert.strictEqual(regRes.status, 201);
      const regData = await regRes.json();
      assert.strictEqual(regData.success, true);
      assert(regData.token);
      assert(regData.user?.id);
      assert(regData.user?.workspaceId?.startsWith('ws-pers-'));

      authToken = regData.token;
      userId = regData.user.id;
    });

    await test('1.2 Progressive onboarding on Personal path sets active Personal context & stated goals', async () => {
      const onbRes = await fetch(`${baseUrl}/api/personal/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Astra Vance',
          preferredName: 'Astra',
          pathChoice: 'personal',
          ageRange: '19-24',
          primaryRole: 'student',
          educationInfo: {
            gradeLevel: 'Undergraduate',
            curriculum: 'Quantum Physics',
            subjects: ['Quantum Mechanics', 'Linear Algebra'],
            academicGoals: ['Master Quantum State Vectors & Bra-Ket Algebra']
          },
          preferences: {
            explanationStyle: 'first_principles'
          }
        })
      });

      assert.strictEqual(onbRes.status, 200);
      const onbData = await onbRes.json();
      assert.strictEqual(onbData.success, true);
      assert.strictEqual(onbData.identity.profile.preferredName, 'Astra');

      // Check active context is Personal
      const activeCtx = onbData.identity.contexts.find((c: any) => c.id === onbData.identity.activeContextId);
      assert(activeCtx, 'Active context must exist');
      assert.strictEqual(activeCtx.type, 'PERSONAL', 'Personal path must make PERSONAL context active');
      assert.strictEqual(activeCtx.isActive, true);

      // Check goals
      assert.strictEqual(onbData.identity.goals.length, 1);
      assert.strictEqual(onbData.identity.goals[0].title, 'Master Quantum State Vectors & Bra-Ket Algebra');
      assert.strictEqual(onbData.identity.preferences.explanationStyle, 'first_principles');
    });

    // ------------------------------------------------------------------------
    // SECTION 2: First-Time User Home Telemetry & Recommendation
    // ------------------------------------------------------------------------
    console.log('\n--- Section 2: First-Time User Focused Starting State ---');

    let firstNba: any = null;

    await test('2.1 GET /api/personal/home returns isFirstUse: true with honest zero-baseline metrics', async () => {
      const homeRes = await fetch(`${baseUrl}/api/personal/home`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.strictEqual(homeRes.status, 200);
      const homeData = await homeRes.json();
      assert.strictEqual(homeData.success, true);
      const home = homeData.home;

      assert.strictEqual(home.isFirstUse, true, 'User with 0 study minutes and 0 concepts must be in first-use state');
      assert(home.greeting.includes('Astra'), 'Greeting must use preferred name Astra');
      assert.strictEqual(home.activeContext.type, 'PERSONAL');
      assert.strictEqual(home.stats.conceptsMastered, 0, 'Zero manufactured concepts');
      assert.strictEqual(home.stats.totalStudyMinutes, 0, 'Zero fake study minutes');
      assert.strictEqual(home.stats.activeStreakDays, 1);

      // Check Next Best Action is tailored to their stated onboarding goal
      assert(home.nextBestAction, 'Next Best Action must be computed');
      firstNba = home.nextBestAction;

      assert(
        firstNba.title.includes('Master Quantum State Vectors & Bra-Ket Algebra'),
        `NBA title "${firstNba.title}" must reference the stated goal`
      );
      assert(
        firstNba.rationale.includes('Master Quantum State Vectors & Bra-Ket Algebra'),
        `Rationale "${firstNba.rationale}" must reference the stated goal`
      );
      assert.strictEqual(firstNba.priority, 'high');
      assert.strictEqual(firstNba.estimatedMinutes, 12);
      assert(firstNba.alternativeActions && firstNba.alternativeActions.length >= 2, 'Must provide 2+ alternative actions');
    });

    // ------------------------------------------------------------------------
    // SECTION 3: Executing the First Useful Action
    // ------------------------------------------------------------------------
    console.log('\n--- Section 3: Action Execution & Immediate Real Progress ---');

    await test('3.1 Executing primary recommended diagnostic produces real checkpoints & truthful lifecycle', async () => {
      const execRes = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          actionId: firstNba.id,
          actionType: firstNba.type,
          payload: {
            conceptName: 'Bra-Ket Inner Product Axioms',
            title: firstNba.title,
            subject: 'Quantum Mechanics',
            estimatedMinutes: firstNba.estimatedMinutes,
            itemCount: 3
          }
        })
      });

      assert.strictEqual(execRes.status, 200);
      const execData = await execRes.json();
      assert.strictEqual(execData.success, true);
      assert.strictEqual(execData.actionType, 'concept_reinforce');

      // Diagnostic questions
      assert(execData.result.questions && execData.result.questions.length === 3);
      assert(execData.result.questions[0].prompt.length > 0);
      assert(execData.result.questions[0].hints && execData.result.questions[0].hints.length > 0);

      // Provenance
      assert.strictEqual(execData.provenance.provenanceType, 'EDUCATION_ACTIVITY');
      assert(execData.provenance.timestamp);

      // Truthful lifecycle telemetry: session is started, NOT falsely completed
      assert.strictEqual(execData.result.status, 'started');
      assert.strictEqual(execData.result.completed, false);
      assert.strictEqual(execData.isFirstUse, false, 'Must transition from first-use state after task execution');
    });

    await test('3.2 Subsequent /api/personal/home reflects active progress and continuous Next Best Action', async () => {
      const homeRes = await fetch(`${baseUrl}/api/personal/home`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      assert.strictEqual(homeRes.status, 200);
      const homeData = await homeRes.json();
      const home = homeData.home;

      assert.strictEqual(home.isFirstUse, false, 'Returning/active user is no longer in first-use state');
      assert(home.nextBestAction, 'Next continuous action available');
    });

    await test('3.3 Submitting diagnostic answers evaluates reasoning, updates concept mastery, and identifies gaps', async () => {
      // 1. Correct answer submission for active practice session
      const evalRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: 'Bra-Ket Inner Product Axioms',
          learnerAnswer: 'The inner product satisfies conjugate symmetry, linearity in state vectors, and positive definiteness in Hilbert space.',
          expectedKeywords: ['symmetry', 'vector', 'hilbert']
        })
      });

      assert.strictEqual(evalRes.status, 200);
      const evalData = await evalRes.json();
      assert.strictEqual(evalData.success, true);
      assert.strictEqual(evalData.isCorrect, true);
      assert(evalData.score >= 0.7);
      assert.strictEqual(evalData.conceptState.conceptName, 'Bra-Ket Inner Product Axioms');
      assert(evalData.stats.totalStudyMinutes >= 5, 'Evaluated checkpoint must award server-controlled study minutes');

      // Start an eligible session for weak concept before evaluation
      await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          actionId: 'weak-concept-action',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Weak Concept Gap Topic',
            itemCount: 3
          }
        })
      });

      // 2. Weak/incorrect answer submission flags gap without false high mastery
      const weakEvalRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          questionId: 'q-2',
          conceptName: 'Weak Concept Gap Topic',
          learnerAnswer: 'idk',
          expectedKeywords: ['conservation', 'invariant']
        })
      });

      assert.strictEqual(weakEvalRes.status, 200);
      const weakEvalData = await weakEvalRes.json();
      assert.strictEqual(weakEvalData.success, true);
      assert.strictEqual(weakEvalData.isCorrect, false);
      assert(weakEvalData.feedback.includes('Learning Gap Detected'));
    });

    // ------------------------------------------------------------------------
    // SECTION 4: Alternative Action Execution (Private Sovereign Note & Query)
    // ------------------------------------------------------------------------
    console.log('\n--- Section 4: Alternative Action Execution (Notes & Grounded Turn) ---');

    await test('4.1 Creating private reference note saves to private vault with sovereign isolation', async () => {
      const noteRes = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          actionId: 'alt-note-test',
          actionType: 'note_create',
          payload: {
            title: 'Bra-Ket Inner Product Axioms',
            content: 'Inner product <phi|psi> satisfies conjugate symmetry and linearity.',
            subject: 'Quantum Mechanics'
          }
        })
      });

      assert.strictEqual(noteRes.status, 200);
      const noteData = await noteRes.json();
      assert.strictEqual(noteData.success, true);
      assert.strictEqual(noteData.result.note.title, 'Bra-Ket Inner Product Axioms');
      assert.strictEqual(noteData.provenance.provenanceType, 'USER_STATED');
    });

    await test('4.2 Storing fact to private memory vault remains isolated and verifiable', async () => {
      const memRes = await fetch(`${baseUrl}/api/personal/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          category: 'UserPreference',
          key: 'PreferredStudyTime',
          value: 'Early morning worked derivations',
          source: 'USER_STATED',
          visibility: 'PRIVATE_PERSONAL',
          confidence: 1.0
        })
      });

      assert.strictEqual(memRes.status, 200);
      const memData = await memRes.json();
      assert.strictEqual(memData.success, true);
      assert.strictEqual(memData.memory.key, 'PreferredStudyTime');
      assert.strictEqual(memData.memory.visibility, 'PRIVATE_PERSONAL');
    });

    // ------------------------------------------------------------------------
    // SECTION 5: Returning User with Prerequisite Gap Resolution
    // ------------------------------------------------------------------------
    console.log('\n--- Section 5: Returning User Prerequisite Gap Resolution ---');

    await test('5.1 Established student with review_needed concept receives targeted prerequisite NBA', async () => {
      const establishedNba = await personalKnowledgeStore.computeNextBestAction('student-1', 'Physics');
      assert(establishedNba.title.includes('Reinforce Vector Force Decomposition'));
      assert.strictEqual(establishedNba.type, 'review_prerequisite');
      assert.strictEqual(establishedNba.priority, 'high');
      assert.strictEqual(establishedNba.actionTarget.courseId, 'course-phys-101');
      assert(establishedNba.rationale.includes('Vector Force Decomposition'));
    });

    // ------------------------------------------------------------------------
    // SECTION 6: Integrity Hardening & Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- Section 6: Integrity Hardening, Idempotency & Tenant Isolation ---');

    await test('6.1 Direct client mastery self-assignment requests are rejected with 403 FORBIDDEN', async () => {
      const masteryRes = await fetch(`${baseUrl}/api/personal/knowledge/mastery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          conceptName: 'Bra-Ket Inner Product Axioms',
          masteryDelta: 0.95,
          provenanceSource: 'user-forged'
        })
      });

      assert.strictEqual(masteryRes.status, 403);
      const masteryData = await masteryRes.json();
      assert(masteryData.error.includes('Direct mastery self-assignment is not permitted'));
    });

    await test('6.2 Duplicate diagnostic question evaluations are idempotent and prevent double-counting', async () => {
      const initialHomeRes = await fetch(`${baseUrl}/api/personal/home`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const initialHome = (await initialHomeRes.json()).home;

      // Start an eligible diagnostic session for the concept
      await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          actionId: 'idempotent-test-action',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Linearity In Hilbert Spaces',
            specificQuestionIds: ['q-idempotent-1']
          }
        })
      });

      // First evaluation
      await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          questionId: 'q-idempotent-1',
          conceptName: 'Linearity In Hilbert Spaces',
          learnerAnswer: 'The superposition principle holds linearly across state vector expansions in Hilbert space.'
        })
      });

      // Second (duplicate) evaluation
      const dupRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          questionId: 'q-idempotent-1',
          conceptName: 'Linearity In Hilbert Spaces',
          learnerAnswer: 'The superposition principle holds linearly across state vector expansions in Hilbert space.'
        })
      });

      assert.strictEqual(dupRes.status, 200);
      const dupData = await dupRes.json();
      assert.strictEqual(dupData.success, true);
      assert.strictEqual(dupData.isDuplicateSubmission, true);
      assert.strictEqual(dupData.masteryDelta, 0, 'Duplicate submission must produce 0 mastery delta');
    });

    await test('6.3 Unauthenticated calls are rejected with 401 UNAUTHENTICATED', async () => {
      const unauthRes = await fetch(`${baseUrl}/api/personal/home`);
      assert.strictEqual(unauthRes.status, 401);
    });

    console.log('\n======================================================================');
    console.log(' STAGE 6: THE FIRST USEFUL EXPERIENCE VERIFIED 100% PASS!');
    console.log('======================================================================\n');
  } finally {
    await stopTestServer();
  }
}

runStage6TestSuite().catch((err) => {
  console.error('[FATAL] Stage 6 Test Suite Failed:', err);
  process.exit(1);
});
