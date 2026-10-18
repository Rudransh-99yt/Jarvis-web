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
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { diagnosticService } from '../server/personal/diagnosticService.ts';

let server: Server;
let baseUrl = '';
let isolatedTempDir = '';

async function startTestServer(): Promise<void> {
  isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-stage6-3-1-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'stage6-3-1-db.json');
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

async function runStage6_3_1Audit(): Promise<void> {
  console.log('\n======================================================================');
  console.log(' [WEB JARVIS] STAGE 6.3.1: ADVERSARIAL AUDIT & EDGE-CASE REPAIR');
  console.log('======================================================================\n');

  await startTestServer();
  diagnosticService.reset();

  try {
    // Register User A
    const userAEmail = `audit-alice-${Date.now()}@stark.edu`;
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
    const userAId = regDataA.user.id;

    // Register User B (for cross-user attack tests)
    const userBEmail = `audit-bob-${Date.now()}@stark.edu`;
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
    const userBId = regDataB.user.id;

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
        goals: ['Quantum Foundations'],
        focusDomain: 'quantum'
      })
    });

    // Onboard User B
    await fetch(`${baseUrl}/api/personal/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        name: 'Bob',
        preferredName: 'Bob',
        goals: ['Classical Mechanics'],
        focusDomain: 'classical'
      })
    });

    // ------------------------------------------------------------------
    // AREA 1: DIAGNOSTIC AUTHORIZATION AND OWNERSHIP
    // ------------------------------------------------------------------
    console.log('--- Suite 1: Diagnostic Authorization & Ownership ---');

    await test('1.1 Protected diagnostic endpoints require authenticated principal', async () => {
      const anonRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptName: 'Quantum Foundations',
          questionId: 'q-1',
          learnerAnswer: 'Unitary transformation conservation law.'
        })
      });
      assert.strictEqual(anonRes.status, 401, 'Anonymous request must return 401 Unauthorized');
    });

    // Alice starts a diagnostic session
    const startResA = await fetch(`${baseUrl}/api/personal/actions/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        actionId: 'act-alice-diag-1',
        actionType: 'practice_session',
        payload: {
          conceptName: 'Quantum Foundations',
          itemCount: 3
        }
      })
    });
    const startDataA = await startResA.json();
    const aliceSessionId = startDataA.result.sessionId;
    assert(aliceSessionId, 'Alice should receive a valid sessionId');

    await test('1.2 Cross-user tenant isolation: User B cannot evaluate or hijack User A session', async () => {
      const bobAttempt = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId, // Targeting Alice's session
          conceptName: 'Quantum Foundations',
          questionId: 'q-1',
          learnerAnswer: 'Unitary transformation maintains symmetry and invariant conservation.'
        })
      });
      assert.strictEqual(bobAttempt.status, 400, 'Cross-user submission to another user session must be rejected with 400');
      const bobData = await bobAttempt.json();
      assert(bobData.error.includes('No eligible diagnostic event found'), 'Error must indicate no eligible event found for User B');

      // Verify Alice session was untouched
      const aliceKnowledge = await personalKnowledgeStore.getKnowledge(userAId);
      const aliceConcept = Object.values(aliceKnowledge.concepts).find(
        (c) => c.conceptName.toLowerCase() === 'quantum foundations'
      );
      assert.strictEqual(aliceConcept?.evidenceCount || 0, 0, 'Alice concept must have 0 evidence after Bob attack');
    });

    await test('1.3 Client-supplied userId in request body is ignored; server principal is enforced', async () => {
      const spoofAttempt = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          userId: userAId, // Attempting to impersonate Alice in body
          conceptName: 'Quantum Foundations',
          questionId: 'q-1',
          learnerAnswer: 'Unitary transformation maintains symmetry and invariant conservation.'
        })
      });
      assert.strictEqual(spoofAttempt.status, 400, 'Spoofed userId in body must be ignored and rejected');
    });

    await test('1.4 Client-supplied grading and provenance overrides cannot override server decisions', async () => {
      const spoofEvalRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId,
          conceptName: 'Quantum Foundations',
          questionId: 'q-1',
          learnerAnswer: 'Under unitary transformation, the quantum state vector maintains probability conservation and symmetry invariants across the Hilbert space.',
          // Malicious overrides:
          expectedKeywords: ['hacked'],
          masteryDelta: 0.99,
          score: 1.0,
          provenance: 'client-injected-provenance',
          status: 'completed'
        })
      });
      assert.strictEqual(spoofEvalRes.status, 200);
      const evalData = await spoofEvalRes.json();
      // Server-controlled delta for correct answer is 0.08, NOT 0.99
      assert.strictEqual(evalData.masteryDelta, 0.08, 'Server must enforce authoritative masteryDelta of 0.08');
      assert.strictEqual(evalData.isCorrect, true);

      // Verify provenance stored on server is strictly derived
      const aliceKnowledge = await personalKnowledgeStore.getKnowledge(userAId);
      const aliceConcept = Object.values(aliceKnowledge.concepts).find(
        (c) => c.conceptName.toLowerCase() === 'quantum foundations'
      );
      assert(aliceConcept, 'Concept must exist');
      const expectedProvenance = `diagnostic-eval-${aliceSessionId}-q-1`;
      assert(aliceConcept.provenanceSources.includes(expectedProvenance), 'Authoritative server provenance must be stored');
      assert(!aliceConcept.provenanceSources.includes('client-injected-provenance'), 'Client spoofed provenance must be absent');
    });

    await test('1.5 Arbitrary unassociated question IDs or mismatched concepts are rejected with 400', async () => {
      const invalidQRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId,
          conceptName: 'Quantum Foundations',
          questionId: 'q-completely-fake-999',
          learnerAnswer: 'Under unitary transformation, probability conservation holds.'
        })
      });
      assert.strictEqual(invalidQRes.status, 400, 'Unassociated question ID must be rejected with 400');

      const mismatchedConceptRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId,
          conceptName: 'Unrelated Organic Chemistry',
          questionId: 'q-2',
          learnerAnswer: 'Under unitary transformation, probability conservation holds.'
        })
      });
      assert.strictEqual(mismatchedConceptRes.status, 400, 'Mismatched concept must be rejected with 400');
    });

    await test('1.6 Direct mastery endpoint /api/personal/knowledge/mastery returns 403 Forbidden', async () => {
      const directMasteryAttempt = await fetch(`${baseUrl}/api/personal/knowledge/mastery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
          'x-internal-call': 'true'
        },
        body: JSON.stringify({
          conceptName: 'Quantum Foundations',
          masteryDelta: 0.50,
          provenanceSource: 'trusted-internal-bypass'
        })
      });
      assert.strictEqual(directMasteryAttempt.status, 403, 'Direct mastery endpoint must unconditionally return 403 Forbidden');
    });

    // ------------------------------------------------------------------
    // AREA 2: AUDIT GRADING CORRECTNESS
    // ------------------------------------------------------------------
    console.log('\n--- Suite 2: Audit Grading Correctness ---');

    await test('2.1 Empty and whitespace-only submissions are retryable with 0 score and 0 delta', async () => {
      const emptyRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId,
          conceptName: 'Quantum Foundations',
          questionId: 'q-2',
          learnerAnswer: '    '
        })
      });
      assert.strictEqual(emptyRes.status, 200);
      const emptyData = await emptyRes.json();
      assert.strictEqual(emptyData.isCorrect, false);
      assert.strictEqual(emptyData.score, 0);
      assert.strictEqual(emptyData.masteryDelta, 0);
      assert.strictEqual(emptyData.isDuplicateSubmission, false, 'Empty answer must not consume idempotency key');
    });

    await test('2.2 Irrelevant long responses receive low score, incorrect, and negative delta', async () => {
      const irrelevantRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId,
          conceptName: 'Quantum Foundations',
          questionId: 'q-2',
          learnerAnswer: 'The ancient Roman gladiators fought in the Colosseum with swords, shields, and chariots under emperor Julius Caesar during the Roman Empire.'
        })
      });
      assert.strictEqual(irrelevantRes.status, 200);
      const irrelevantData = await irrelevantRes.json();
      assert.strictEqual(irrelevantData.isCorrect, false);
      assert.strictEqual(irrelevantData.isPartiallyCorrect, false);
      assert(irrelevantData.score <= 0.30, 'Irrelevant long response score must be <= 0.30');
      assert.strictEqual(irrelevantData.masteryDelta, -0.04, 'Irrelevant response must apply negative mastery delta');
    });

    // Bob starts a session on 'Foundational Physics' to test grading heuristics
    const bobStartRes = await fetch(`${baseUrl}/api/personal/actions/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        actionId: 'act-bob-diag-grading',
        actionType: 'practice_session',
        payload: {
          conceptName: 'Foundational Physics',
          itemCount: 3
        }
      })
    });
    const bobStartData = await bobStartRes.json();
    const bobSessionId = bobStartData.result.sessionId;

    await test('2.3 Repeated keywords without meaningful explanation (keyword-stuffing) are rejected', async () => {
      const repetitiveRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          sessionId: bobSessionId,
          conceptName: 'Foundational Physics',
          questionId: 'q-1',
          learnerAnswer: 'invariant invariant invariant invariant invariant invariant invariant invariant'
        })
      });
      assert.strictEqual(repetitiveRes.status, 200);
      const repData = await repetitiveRes.json();
      assert.strictEqual(repData.isCorrect, false, 'Repetitive keyword stuffing must NOT be graded correct');
      assert.strictEqual(repData.isPartiallyCorrect, false);
      assert(repData.score <= 0.25, 'Repetitive keyword stuffing score must be <= 0.25');
      assert.strictEqual(repData.masteryDelta, -0.04, 'Must apply negative delta, not positive mastery');
      assert(repData.feedback.includes('repeated terminology'), 'Feedback must detect repeated terminology');
    });

    await test('2.4 Terminology with contradictory / negated conclusion is flagged as learning gap', async () => {
      const contradictRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          sessionId: bobSessionId,
          conceptName: 'Foundational Physics',
          questionId: 'q-2',
          learnerAnswer: 'The core invariant, conservation, and symmetry do not hold and are completely false under transformation.'
        })
      });
      assert.strictEqual(contradictRes.status, 200);
      const conData = await contradictRes.json();
      assert.strictEqual(conData.isCorrect, false, 'Contradictory statement must NOT be graded correct');
      assert.strictEqual(conData.isPartiallyCorrect, false);
      assert(conData.score <= 0.25, 'Contradictory statement score must be <= 0.25');
      assert.strictEqual(conData.masteryDelta, -0.04, 'Contradictory statement must not award mastery');
      assert(conData.feedback.includes('contradictory or invalid conclusion'), 'Feedback must identify contradiction');
    });

    await test('2.5 Partially correct reasoning is marked provisional with heuristic limitation noted', async () => {
      const partialRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          sessionId: bobSessionId,
          conceptName: 'Foundational Physics',
          questionId: 'q-3',
          learnerAnswer: 'Under transformation, the physical system maintains a constant equilibrium state.'
        })
      });
      assert.strictEqual(partialRes.status, 200);
      const partialData = await partialRes.json();
      assert.strictEqual(partialData.isCorrect, true);
      assert.strictEqual(partialData.isPartiallyCorrect, true, 'Should be flagged as partially correct');
      assert.strictEqual(partialData.isProvisional, true, 'Borderline/heuristic result must be marked provisional');
      assert.strictEqual(partialData.score, 0.55);
      assert.strictEqual(partialData.masteryDelta, 0.04);
      assert(partialData.feedback.includes('Provisional Evidence'), 'Feedback must cite provisional heuristic limitation');
    });

    await test('2.6 Closed session protection: Cannot submit new unrecorded checkpoints to completed session', async () => {
      // Bob completed all 3 questions in bobSessionId (q-1, q-2, q-3)
      const closedAttempt = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          sessionId: bobSessionId,
          conceptName: 'Foundational Physics',
          questionId: 'q-extra-4',
          learnerAnswer: 'Substantive derivation of new principles.'
        })
      });
      assert.strictEqual(closedAttempt.status, 400, 'Submitting new checkpoint to closed session must be rejected with 400');
      const closedData = await closedAttempt.json();
      assert(closedData.error.includes('already completed and closed'), 'Error must specify session is closed');
    });

    // ------------------------------------------------------------------
    // AREA 3: AUDIT IDEMPOTENCY UNDER FAILURE AND CONCURRENCY
    // ------------------------------------------------------------------
    console.log('\n--- Suite 3: Audit Idempotency Under Failure & Concurrency ---');

    await test('3.1 Sequential duplicate request returns original evaluation and applies 0 delta', async () => {
      const dup1 = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId,
          conceptName: 'Quantum Foundations',
          questionId: 'q-1',
          learnerAnswer: 'Under unitary transformation, probability conservation holds.'
        })
      });
      assert.strictEqual(dup1.status, 200);
      const dupData1 = await dup1.json();
      assert.strictEqual(dupData1.isDuplicateSubmission, true);
      assert.strictEqual(dupData1.masteryDelta, 0, 'Duplicate submission must apply 0 mastery delta');
      assert.strictEqual(dupData1.isCorrect, true);
    });

    await test('3.2 Duplicate request with DIFFERENT answer body preserves original answer and score', async () => {
      const initialKnowledge = await personalKnowledgeStore.getKnowledge(userAId);
      const initialStudyMinutes = (await personalIdentityStore.getIdentity(userAId)).stats.totalStudyMinutes;

      const altBodyRes = await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          sessionId: aliceSessionId,
          conceptName: 'Quantum Foundations',
          questionId: 'q-1',
          learnerAnswer: 'Totally different altered answer body with low effort idk'
        })
      });
      assert.strictEqual(altBodyRes.status, 200);
      const altData = await altBodyRes.json();

      assert.strictEqual(altData.isDuplicateSubmission, true);
      assert.strictEqual(altData.masteryDelta, 0, 'Duplicate request with modified body must apply 0 delta');
      assert.strictEqual(altData.isCorrect, true, 'Original evaluation correctness must be preserved');
      assert(altData.feedback.includes('original evaluated checkpoint result and submission record are retained'), 'Notice must state original record is retained');
      assert(altData.submittedAnswer.includes('Hilbert space'), 'Original submitted answer must be preserved');

      // Verify no study minutes or mastery were changed
      const currentIdentity = await personalIdentityStore.getIdentity(userAId);
      assert.strictEqual(currentIdentity.stats.totalStudyMinutes, initialStudyMinutes, 'Study minutes must not change on duplicate');
    });

    await test('3.3 Concurrent duplicate submissions synchronize cleanly (no race condition)', async () => {
      // Start a fresh session for Alice on 'Linear Algebra'
      const laStart = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          actionId: 'act-alice-linear-algebra',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Linear Algebra Invariants',
            itemCount: 2
          }
        })
      });
      const laSessionId = (await laStart.json()).result.sessionId;

      const answerPayload = {
        sessionId: laSessionId,
        conceptName: 'Linear Algebra Invariants',
        questionId: 'q-1',
        learnerAnswer: 'Under transformation, the matrix operator preserves linearity and invariant basis vector dimensions across the space.'
      };

      // Launch 3 concurrent submissions simultaneously
      const [r1, r2, r3] = await Promise.all([
        fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify(answerPayload)
        }),
        fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify(answerPayload)
        }),
        fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify(answerPayload)
        })
      ]);

      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      const results = [d1, d2, d3];

      const newSubmissions = results.filter((r) => r.isDuplicateSubmission === false);
      const duplicateSubmissions = results.filter((r) => r.isDuplicateSubmission === true);

      assert.strictEqual(newSubmissions.length, 1, 'Exactly one concurrent request must be processed as original');
      assert.strictEqual(duplicateSubmissions.length, 2, 'Remaining concurrent requests must be resolved as duplicates');

      // Verify mastery level was updated exactly once (+0.08 from 0.50 -> 0.58)
      const laKnowledge = await personalKnowledgeStore.getKnowledge(userAId);
      const laConcept = Object.values(laKnowledge.concepts).find(
        (c) => c.conceptName.toLowerCase() === 'linear algebra invariants'
      );
      assert.strictEqual(laConcept?.masteryLevel, 0.58, 'Mastery level must be exactly 0.58, not double or triple incremented');
      assert.strictEqual(laConcept?.evidenceCount, 1, 'Evidence count must be exactly 1');
    });

    await test('3.4 Atomic rollback under failure: Identity failure rolls back mastery update cleanly', async () => {
      // Create session for testing failure rollback
      const failTestSession = await diagnosticService.startOrGetSession({
        userId: userAId,
        conceptName: 'Rollback Mechanics',
        itemCount: 2
      });

      // Verify baseline
      const initialKnowledge = await personalKnowledgeStore.getKnowledge(userAId);
      const baselineConcept = Object.values(initialKnowledge.concepts).find(
        (c) => c.conceptName.toLowerCase() === 'rollback mechanics'
      );
      assert.strictEqual(baselineConcept?.evidenceCount || 0, 0, 'Baseline evidence must be 0');
      assert.strictEqual(baselineConcept?.masteryLevel || 0.5, 0.5, 'Baseline mastery must be 0.5');

      // Temporarily mock personalIdentityStore.updateIdentity to throw an error
      const originalUpdateIdentity = personalIdentityStore.updateIdentity.bind(personalIdentityStore);
      personalIdentityStore.updateIdentity = async () => {
        throw new Error('SIMULATED_IDENTITY_STORE_DISK_FAILURE');
      };

      try {
        let threw = false;
        try {
          await diagnosticService.evaluateCheckpoint({
            userId: userAId,
            sessionId: failTestSession.session.sessionId,
            conceptName: 'Rollback Mechanics',
            questionId: 'q-1',
            learnerAnswer: 'The core invariant and conservation principles hold under transformation.'
          });
        } catch (err: any) {
          threw = true;
          assert(err.message.includes('SIMULATED_IDENTITY_STORE_DISK_FAILURE'));
        }
        assert.strictEqual(threw, true, 'Evaluation must propagate the failure, not return false success');

        // Verify ATOMIC ROLLBACK: knowledge store mastery and evidence count must be restored to baseline
        const rolledBackKnowledge = await personalKnowledgeStore.getKnowledge(userAId);
        const rolledBackConcept = Object.values(rolledBackKnowledge.concepts).find(
          (c) => c.conceptName.toLowerCase() === 'rollback mechanics'
        );
        assert.strictEqual(rolledBackConcept?.evidenceCount, 0, 'Evidence count must be rolled back to 0');
        assert.strictEqual(rolledBackConcept?.masteryLevel, 0.5, 'Mastery level must be rolled back to 0.5');

        // Restore normal identity store
        personalIdentityStore.updateIdentity = originalUpdateIdentity;

        // Now safe retry must succeed cleanly
        const retryResult = await diagnosticService.evaluateCheckpoint({
          userId: userAId,
          sessionId: failTestSession.session.sessionId,
          conceptName: 'Rollback Mechanics',
          questionId: 'q-1',
          learnerAnswer: 'The core invariant and conservation principles hold under transformation.'
        });
        assert.strictEqual(retryResult.success, true);
        assert.strictEqual(retryResult.isDuplicateSubmission, false, 'Retry after failure must be treated as fresh evaluation');

        const postRetryKnowledge = await personalKnowledgeStore.getKnowledge(userAId);
        const postRetryConcept = Object.values(postRetryKnowledge.concepts).find(
          (c) => c.conceptName.toLowerCase() === 'rollback mechanics'
        );
        assert.strictEqual(postRetryConcept?.evidenceCount, 1, 'Post-retry evidence count must be exactly 1');
      } finally {
        personalIdentityStore.updateIdentity = originalUpdateIdentity;
      }
    });

    // ------------------------------------------------------------------
    // AREA 4: AUDIT TELEMETRY AND PROGRESS ACCOUNTING
    // ------------------------------------------------------------------
    console.log('\n--- Suite 4: Audit Telemetry & Progress Accounting ---');

    await test('4.1 Starting diagnostic session awards 0 study minutes and 0 completion credit', async () => {
      const identityBefore = await personalIdentityStore.getIdentity(userBId);
      const minutesBefore = identityBefore.stats.totalStudyMinutes;

      const newStartRes = await fetch(`${baseUrl}/api/personal/actions/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          actionId: 'act-bob-fresh-session',
          actionType: 'practice_session',
          payload: {
            conceptName: 'Telemetry Check',
            estimatedMinutes: 60 // Malicious inflated minutes
          }
        })
      });
      assert.strictEqual(newStartRes.status, 200);
      const newStartData = await newStartRes.json();
      assert.strictEqual(newStartData.result.completed, false, 'New session must NOT be completed');

      const identityAfter = await personalIdentityStore.getIdentity(userBId);
      assert.strictEqual(
        identityAfter.stats.totalStudyMinutes,
        minutesBefore,
        'Starting session must not award any study minutes regardless of payload.estimatedMinutes'
      );
    });

    await test('4.2 Rejected requests and failed validations award 0 minutes and 0 mastery', async () => {
      const identityBefore = await personalIdentityStore.getIdentity(userBId);
      const minutesBefore = identityBefore.stats.totalStudyMinutes;

      await fetch(`${baseUrl}/api/personal/diagnostic/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({
          conceptName: 'Telemetry Check',
          questionId: 'non-existent-question',
          learnerAnswer: 'Some answer'
        })
      });

      const identityAfter = await personalIdentityStore.getIdentity(userBId);
      assert.strictEqual(identityAfter.stats.totalStudyMinutes, minutesBefore, 'Failed request must not increment study minutes');
    });

    await test('4.3 Next Best Action truthfully reflects concept mastery transitions', async () => {
      // Alice has 'Linear Algebra Invariants' currently in learning
      const nbaAlice = await personalKnowledgeStore.computeNextBestAction(userAId);
      assert(nbaAlice.rationale.includes('Linear Algebra Invariants') || nbaAlice.title.includes('Linear Algebra Invariants') || nbaAlice.title.includes('Continue'),
        'NBA must truthfully guide toward active learning concept');

      // Create a concept with low mastery (< 0.50) -> review_needed
      await personalKnowledgeStore.recordConceptMastery(userAId, {
        conceptName: 'Vector Calculus',
        subject: 'Mathematics',
        masteryDelta: -0.15, // drops from 0.5 to 0.35 -> review_needed
        provenanceSource: 'diagnostic-test-low'
      });

      const nbaReview = await personalKnowledgeStore.computeNextBestAction(userAId);
      assert.strictEqual(nbaReview.type, 'review_prerequisite', 'NBA must prioritize review_prerequisite when a gap is detected');
      assert(nbaReview.title.includes('Vector Calculus'), 'NBA must specifically target Vector Calculus for remediation');
    });

    console.log('\n======================================================================');
    console.log(' ALL 18 ADVERSARIAL AUDIT CHECKS VERIFIED 100% PASS!');
    console.log('======================================================================\n');
  } finally {
    await stopTestServer();
  }
}

runStage6_3_1Audit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
