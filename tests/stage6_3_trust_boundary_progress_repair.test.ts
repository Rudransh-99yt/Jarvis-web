import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { personalRouter } from '../server/personal/personalRoutes.ts';
import { authRouter } from '../server/auth/index.ts';
import {
  jarvisData,
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { personalKnowledgeStore } from '../server/personal/knowledgeStore.ts';
import { diagnosticService } from '../server/personal/diagnosticService.ts';

let server: Server;
let baseUrl = '';
let isolatedTempDir = '';

async function startTestServer(): Promise<void> {
  isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-stage6-3-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'stage6-3-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed();
  setActiveRepository(isolatedRepo);

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/personal', personalRouter);

  return new Promise((resolve) => {
    server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

async function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    } finally {
      resetActiveRepository();
      if (isolatedTempDir && fs.existsSync(isolatedTempDir)) {
        fs.rmSync(isolatedTempDir, { recursive: true, force: true });
      }
    }
  });
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err);
    throw err;
  }
}

async function runStage6_3Tests(): Promise<void> {
  console.log('\n======================================================================');
  console.log(' [WEB JARVIS] STAGE 6.3: TRUST-BOUNDARY & PROGRESS-ACCURACY REPAIR');
  console.log('======================================================================\n');

  await startTestServer();
  diagnosticService.reset();

  try {
    // Register User A
    const userAEmail = `learner-a-${Date.now()}@stark.edu`;
    const regResA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Cadet Alice',
        email: userAEmail,
        password: 'Password123!',
        role: 'student'
      })
    });
    const regDataA = await regResA.json();
    const tokenA = regDataA.token;

    // Register User B (for cross-user isolation tests)
    const userBEmail = `learner-b-${Date.now()}@stark.edu`;
    const regResB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Cadet Bob',
        email: userBEmail,
        password: 'Password123!',
        role: 'student'
      })
    });
    const regDataB = await regResB.json();
    const tokenB = regDataB.token;

    // Onboard User A
    await fetch(`${baseUrl}/api/personal/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Alice',
        preferredName: 'Alice',
        pathChoice: 'personal',
        interests: ['Quantum Physics']
      })
    });

    // ------------------------------------------------------------------------
    // REQUIREMENT 1: Direct Mastery Endpoint Bypass Fix
    // ------------------------------------------------------------------------
    console.log('--- Suite 1: Direct Mastery Endpoint Bypass Hardening ---');

    await test('1.1 Forged x-internal-call header is strictly rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/personal/knowledge/mastery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
          'x-internal-call': 'true'
        },
        body: JSON.stringify({
          conceptName: 'Quantum Entanglement',
          masteryDelta: 0.50
        })
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert(data.error.includes('Direct mastery self-assignment is not permitted'));

      // Verify persisted state: mastery was NOT granted
      const knowledge = await personalKnowledgeStore.getKnowledge(regDataA.user.id);
      const concept = Object.values(knowledge.concepts).find((c) => c.conceptName === 'Quantum Entanglement');
      assert.strictEqual(concept, undefined, 'Concept must not be created or altered via forged header');
    });

    await test('1.2 Forged trusted-internal- provenance is strictly rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/personal/knowledge/mastery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          conceptName: 'Thermodynamic Invariants',
          masteryDelta: 0.50,
          provenanceSource: 'trusted-internal-system-service'
        })
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert(data.error.includes('Direct mastery self-assignment is not permitted'));

      // Verify persisted state
      const knowledge = await personalKnowledgeStore.getKnowledge(regDataA.user.id);
      const concept = Object.values(knowledge.concepts).find((c) => c.conceptName === 'Thermodynamic Invariants');
      assert.strictEqual(concept, undefined, 'Concept must not be created or altered via forged provenance');
    });

    await test('1.3 Repeated direct mastery requests cannot inflate mastery', async () => {
      const attempts = [
        { headers: { 'x-internal-call': 'true' }, body: { conceptName: 'Noether Theorem', masteryDelta: 0.10 } },
        { headers: { 'x-internal-call': '1' }, body: { conceptName: 'Noether Theorem', masteryDelta: 0.10 } },
        { headers: {}, body: { conceptName: 'Noether Theorem', masteryDelta: 0.10, provenanceSource: 'trusted-internal-admin' } },
        { headers: { 'x-internal-call': 'true' }, body: { conceptName: 'Noether Theorem', masteryDelta: 0.10, provenanceSource: 'trusted-internal-eval' } }
      ];

      for (const att of attempts) {
        const res = await fetch(`${baseUrl}/api/personal/knowledge/mastery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenA}`,
            ...att.headers
          },
          body: JSON.stringify(att.body)
        });
        assert.strictEqual(res.status, 403);
      }

      const knowledge = await personalKnowledgeStore.getKnowledge(regDataA.user.id);
      const concept = Object.values(knowledge.concepts).find((c) => c.conceptName === 'Noether Theorem');
      assert.strictEqual(concept, undefined, 'Repeated requests must have zero impact on knowledge state');
    });

    // ------------------------------------------------------------------------
    // REQUIREMENT 2 & 4: Truthful Progress Telemetry & Start Lifecycle
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 2: Truthful Progress Lifecycle & Start Telemetry ---');

    await test('2.1 Starting a practice set does not falsely report completion or award mastery', async () => {
      const execRes = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'action-test-start-1',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Quantum Phase Estimation',
            subject: 'Quantum Mechanics',
            itemCount: 3
          }
        })
      });

      assert.strictEqual(execRes.status, 200);
      const execData = await execRes.json();
      assert.strictEqual(execData.success, true);

      // Truthful lifecycle: started, not completed
      assert.strictEqual(execData.result.status, 'started');
      assert.strictEqual(execData.result.completed, false);
      assert(execData.result.message.includes('initiated'));
      assert(!execData.result.message.includes('completed'));

      // Invariant: Zero unearned study minutes awarded on start
      assert.strictEqual(execData.stats.totalStudyMinutes, 0, 'Starting practice must not award study minutes');

      // Invariant: Initial concept mastery is baseline 0.50 without boost
      assert.strictEqual(execData.result.masteryLevel, 0.50);
      const knowledge = await personalKnowledgeStore.getKnowledge(regDataA.user.id);
      const concept = Object.values(knowledge.concepts).find((c) => c.conceptName === 'Quantum Phase Estimation');
      assert(concept, 'Concept baseline exists');
      assert.strictEqual(concept.masteryLevel, 0.50);
      assert.strictEqual(concept.evidenceCount, 0, 'Zero evidence count before evaluation');
    });

    await test('2.2 Client-supplied estimatedMinutes cannot arbitrarily inflate study time', async () => {
      const execRes = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'action-exploit-minutes',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Hamiltonian Evolution',
            estimatedMinutes: 99999, // Attempted exploitation
            itemCount: 3
          }
        })
      });

      assert.strictEqual(execRes.status, 200);
      const execData = await execRes.json();
      assert.strictEqual(execData.stats.totalStudyMinutes, 0, 'Estimated minutes payload must be ignored for awarding time');
    });

    await test('2.3 Duplicate action retries cannot double-count study time or start events', async () => {
      // First retry of practice session
      const retryRes = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'action-test-start-1',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Quantum Phase Estimation',
            itemCount: 3
          }
        })
      });
      assert.strictEqual(retryRes.status, 200);
      const retryData = await retryRes.json();
      assert.strictEqual(retryData.stats.totalStudyMinutes, 0, 'Retry must not add study minutes');

      // Note creation retry
      const noteActionId = 'note-idempotent-1';
      const noteRes1 = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: noteActionId,
          actionType: 'note_create',
          payload: {
            title: 'Sovereign Note',
            content: 'Notes on wave mechanics.'
          }
        })
      });
      const noteData1 = await noteRes1.json();
      const minutesAfterFirstNote = noteData1.stats.totalStudyMinutes;
      assert.strictEqual(minutesAfterFirstNote, 5, 'Authoring note awards exactly 5 server-controlled minutes');

      // Retry exact same note action
      const noteRes2 = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: noteActionId,
          actionType: 'note_create',
          payload: {
            title: 'Sovereign Note',
            content: 'Notes on wave mechanics.'
          }
        })
      });
      const noteData2 = await noteRes2.json();
      assert.strictEqual(noteData2.stats.totalStudyMinutes, 5, 'Retrying same note action must not double-count minutes');
    });

    // ------------------------------------------------------------------------
    // REQUIREMENT 3: Server-Controlled Diagnostic Rubrics & Event Validation
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 3: Server-Controlled Rubrics & Event Validation ---');

    await test('3.1 Invalid question/session/concept combinations are rejected with 400', async () => {
      // 1. Unregistered concept with no active session
      const res1 = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: 'Completely Nonexistent Concept',
          learnerAnswer: 'Energy is conserved under time translation symmetry.'
        })
      });
      assert.strictEqual(res1.status, 400);
      const data1 = await res1.json();
      assert(data1.error.includes('No eligible diagnostic event found'));

      // 2. Arbitrary/fake question ID for valid concept
      const res2 = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'fake-checkpoint-999',
          conceptName: 'Quantum Phase Estimation',
          learnerAnswer: 'Linearity holds.'
        })
      });
      assert.strictEqual(res2.status, 400);
      const data2 = await res2.json();
      assert(data2.error.includes('No eligible diagnostic event found'));
    });

    await test('3.2 Client-provided expectedKeywords cannot alter the server rubric', async () => {
      // Start an eligible session for rubric test
      await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'action-rubric-tamper',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Rubric Invariant Verification',
            itemCount: 3
          }
        })
      });

      // Learner submits arbitrary irrelevant terms that match client-provided expectedKeywords
      // but do NOT match the server's authoritative rubric for q-1 (invariants/symmetry)
      const res = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: 'Rubric Invariant Verification',
          learnerAnswer: 'banana apple pineapple strawberry fruit salad',
          expectedKeywords: ['banana', 'apple', 'pineapple'] // Attacker attempts to forge rubric
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.isCorrect, false, 'Server rubric must not be hijacked by client expectedKeywords');
      assert.strictEqual(data.score, 0.30);
      assert(data.feedback.includes('Learning Gap Detected'));
      assert.strictEqual(data.masteryDelta, -0.04);
    });

    // ------------------------------------------------------------------------
    // REQUIREMENT 4: Idempotency, Concurrency & Safe Retry
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 4: Idempotency, Concurrency & Safe Retry ---');

    await test('4.1 Empty submissions do not consume an evaluation key', async () => {
      // Start an eligible session for empty retry test
      await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'action-empty-retry',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Empty Checkpoint Retry',
            itemCount: 3
          }
        })
      });

      // 1. Submit empty answer
      const emptyRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: 'Empty Checkpoint Retry',
          learnerAnswer: '   '
        })
      });
      assert.strictEqual(emptyRes.status, 200);
      const emptyData = await emptyRes.json();
      assert.strictEqual(emptyData.isCorrect, false);
      assert.strictEqual(emptyData.score, 0);
      assert.strictEqual(emptyData.masteryDelta, 0);
      assert.strictEqual(emptyData.isDuplicateSubmission, false);

      // 2. Submit substantive correct answer for the same questionId
      const realRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: 'Empty Checkpoint Retry',
          learnerAnswer: 'The core invariant under unitary transformation is conservation of state norm and probability amplitude symmetry in Hilbert space.'
        })
      });
      assert.strictEqual(realRes.status, 200);
      const realData = await realRes.json();
      assert.strictEqual(realData.isCorrect, true, 'Substantive answer must be evaluated after empty attempt');
      assert.strictEqual(realData.isDuplicateSubmission, false, 'Key was not consumed by empty submission');
      assert(realData.score >= 0.70);
      assert.strictEqual(realData.masteryDelta, 0.08);
      assert(realData.stats.totalStudyMinutes >= 10, 'Study minutes awarded (+5)');
    });

    await test('4.2 Duplicate submission does not alter mastery or study time a second time', async () => {
      const initialHomeRes = await fetch(`${baseUrl}/api/personal/home`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const initialMinutes = (await initialHomeRes.json()).home.stats.totalStudyMinutes;

      // Duplicate submission of already-evaluated q-1
      const dupRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: 'Empty Checkpoint Retry',
          learnerAnswer: 'The core invariant under unitary transformation is conservation of state norm.'
        })
      });

      assert.strictEqual(dupRes.status, 200);
      const dupData = await dupRes.json();
      assert.strictEqual(dupData.isDuplicateSubmission, true);
      assert.strictEqual(dupData.masteryDelta, 0, 'Duplicate submission produces 0 mastery delta');

      // Verify study minutes did not increase
      const finalHomeRes = await fetch(`${baseUrl}/api/personal/home`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const finalMinutes = (await finalHomeRes.json()).home.stats.totalStudyMinutes;
      assert.strictEqual(finalMinutes, initialMinutes, 'Study minutes must not increment on duplicate evaluation');
    });

    await test('4.3 Concurrent duplicate submissions apply at most one mastery and study-time update', async () => {
      // Start a fresh session for concurrency test
      await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'action-concurrency-test',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Fourier Transform Invariance',
            itemCount: 3
          }
        })
      });

      const initialHome = (await (await fetch(`${baseUrl}/api/personal/home`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })).json()).home;
      const initialMinutes = initialHome.stats.totalStudyMinutes;

      const evalPayload = {
        questionId: 'q-1',
        conceptName: 'Fourier Transform Invariance',
        learnerAnswer: 'The Gaussian distribution is an invariant eigenfunction under continuous Fourier transform symmetry with strict conservation of energy in Hilbert space.'
      };

      // Fire 2 simultaneous concurrent requests
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify(evalPayload)
        }),
        fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify(evalPayload)
        })
      ]);

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);

      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

      // Exactly one was original and one was marked duplicate
      const duplicateCount = (data1.isDuplicateSubmission ? 1 : 0) + (data2.isDuplicateSubmission ? 1 : 0);
      assert.strictEqual(duplicateCount, 1, 'Exactly one of the concurrent requests must be duplicate');

      const sumDelta = data1.masteryDelta + data2.masteryDelta;
      assert.strictEqual(sumDelta, 0.08, 'Combined mastery delta must be exactly 0.08, not doubled');

      // Verify persisted study minutes incremented by exactly 5
      const finalHome = (await (await fetch(`${baseUrl}/api/personal/home`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      })).json()).home;
      assert.strictEqual(finalHome.stats.totalStudyMinutes, initialMinutes + 5, 'Study minutes incremented by exactly 5');
    });

    await test('4.4 Failed or rejected evaluation does not lock checkpoint; safe retry succeeds', async () => {
      // Start session for checkpoint retry test
      await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'action-fail-retry-test',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Symmetry Breaking Mechanisms',
            itemCount: 3
          }
        })
      });

      // 1. Attempt with invalid concept payload (causes failure)
      const failRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: '   ', // Invalid empty concept string
          learnerAnswer: 'Symmetry is spontaneously broken.'
        })
      });
      assert.strictEqual(failRes.status, 400);

      // 2. Retry with valid concept payload; must succeed without being locked or marked duplicate
      const retryRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          questionId: 'q-1',
          conceptName: 'Symmetry Breaking Mechanisms',
          learnerAnswer: 'The core invariant under spatial symmetry transformation maintains conservation of invariant charges.'
        })
      });
      assert.strictEqual(retryRes.status, 200);
      const retryData = await retryRes.json();
      assert.strictEqual(retryData.isCorrect, true);
      assert.strictEqual(retryData.isDuplicateSubmission, false, 'Retry must not be flagged duplicate');
      assert.strictEqual(retryData.masteryDelta, 0.08);
    });

    // ------------------------------------------------------------------------
    // REQUIREMENT 5: Cross-User Boundary Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 5: Cross-User Tenant Isolation ---');

    await test('5.1 User B cannot evaluate or consume User A diagnostic checkpoints', async () => {
      // User B attempts to evaluate User A's active session concept
      const res = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}` // User B's token
        },
        body: JSON.stringify({
          questionId: 'q-2',
          conceptName: 'Fourier Transform Invariance', // User A's session
          learnerAnswer: 'Derivative operator transforms to polynomial multiplication.'
        })
      });

      // User B has not started this practice session, must be rejected
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert(data.error.includes('No eligible diagnostic event found'));
    });

    console.log('\n======================================================================');
    console.log(' ALL 12 REGRESSION CHECKS VERIFIED 100% PASS!');
    console.log('======================================================================\n');
  } finally {
    await stopTestServer();
  }
}

runStage6_3Tests().catch((err) => {
  console.error('[FATAL] Stage 6.3 Test Suite failed:', err);
  process.exit(1);
});
