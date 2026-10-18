import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository,
  TransactionTimeoutError,
  TransactionRollbackError
} from '../server/data/index.ts';
import { personalNotesStore } from '../server/personal/tools/personalNotesStore.ts';
import { personalIdentityStore } from '../server/personal/identityStore.ts';
import { personalKnowledgeStore } from '../server/personal/knowledgeStore.ts';
import { personalMemoryStore } from '../server/personal/memoryStore.ts';
import { activityTimelineStore } from '../server/personal/activityTimelineStore.ts';
import { diagnosticService } from '../server/personal/diagnosticService.ts';

async function runStage644Tests() {
  console.log('=== [STAGE 6.4.4] ATOMIC MULTI-STORE CONSISTENCY & UNIT-OF-WORK TEST SUITE ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-4-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_4_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Suite 1: Successful Coordinated Multi-Store Update (Atomicity Baseline)
    // --------------------------------------------------------------------------
    console.log('--- Suite 1: Successful Coordinated Multi-Store Update (Atomicity Baseline) ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);
      diagnosticService.reset();

      // Ensure student-1 baseline identity
      const initialIdentity = await personalIdentityStore.getIdentity('student-1');
      const initialStudyMinutes = initialIdentity.stats.totalStudyMinutes || 0;

      // Start diagnostic practice session
      const startResult = await diagnosticService.startOrGetSession({
        userId: 'student-1',
        actionId: 'act-diag-quantum-baseline',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        subject: 'Physics',
        contextId: 'ctx-student1-edu',
        itemCount: 2
      });
      assert.strictEqual(startResult.isNew, true);
      const session = startResult.session;

      // 1. Submit valid checkpoint answer
      const evalResult = await diagnosticService.evaluateCheckpoint({
        userId: 'student-1',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        questionId: 'q-1',
        learnerAnswer: 'The probability density represents a fundamental physical invariant under unitary state transformation.',
        sessionId: session.sessionId
      });

      assert.strictEqual(evalResult.success, true);
      assert.strictEqual(evalResult.evaluated, true);
      assert.strictEqual(evalResult.isDuplicateSubmission, false);
      assert.ok(evalResult.masteryDelta > 0, 'Mastery delta must be positive');

      // Verify that personalIdentities, personalKnowledge, and diagnosticSessions updated together
      const updatedIdentity = await personalIdentityStore.getIdentity('student-1');
      assert.strictEqual(
        updatedIdentity.stats.totalStudyMinutes,
        initialStudyMinutes + 5,
        'Study time must increment by exactly 5 minutes'
      );

      const knowledge = await personalKnowledgeStore.getKnowledge('student-1');
      const conceptState = Object.values(knowledge.concepts).find(
        (c) => c.conceptName.toLowerCase().includes('quantum')
      );
      assert.ok(conceptState, 'Concept state must exist in personalKnowledgeStore');
      assert.ok(conceptState.masteryLevel > 0, 'Mastery level must be updated');

      const persistedSession = await diskRepo.diagnosticSessions.getSessionById(session.sessionId, 'student-1');
      assert.ok(persistedSession, 'Diagnostic session must be persisted');
      assert.strictEqual(Object.keys(persistedSession.evaluatedCheckpoints).length, 1);

      // Verify that cold restart preserves the multi-store coordinated changes
      await diskRepo.flush();
      const diskRepoRestart = new DiskJarvisDataRepository(diskPath);
      await diskRepoRestart.init();
      setActiveRepository(diskRepoRestart);

      const reloadedIdentity = await diskRepoRestart.personalIdentities.getById('student-1');
      assert.strictEqual(reloadedIdentity?.stats.totalStudyMinutes, initialStudyMinutes + 5);

      const reloadedKnowledge = await diskRepoRestart.personalKnowledge.getState('student-1');
      assert.ok(reloadedKnowledge?.concepts);

      console.log('[PASS] 1.1 Coordinated multi-store update persists atomically across knowledge, identity, and sessions');
    }

    // --------------------------------------------------------------------------
    // Suite 2: Failure During Later Update Does Not Leave Earlier Updates Committed (Rollback)
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 2: Injected Failure Rollback Across Multi-Store Operations ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const identityBefore = await personalIdentityStore.getIdentity('student-1');
      const studyMinutesBefore = identityBefore.stats.totalStudyMinutes || 0;
      const notesBefore = await personalNotesStore.getNotes('student-1');
      const notesCountBefore = notesBefore.length;

      // Injected failure: Step 1 creates note, Step 2 updates study minutes, Step 3 throws error
      let caughtError: any = null;
      try {
        await diskRepo.runTransaction(async (txRepo) => {
          // Step 1: Create a note
          await txRepo.personalStudy.createNote({
            userId: 'student-1',
            title: 'Uncommitted Quantum Note',
            content: 'This note must not be committed to disk.',
            subject: 'Physics'
          });

          // Step 2: Update identity stats
          await txRepo.personalIdentities.updateStats('student-1', {
            totalStudyMinutes: studyMinutesBefore + 10
          });

          // Step 3: Inject failure in step 3
          throw new Error('SIMULATED_PERSISTENCE_FAULT_IN_STEP_3');
        }, { name: 'test-injected-failure', userId: 'student-1' });
      } catch (err: any) {
        caughtError = err;
      }

      assert.ok(caughtError, 'Transaction must throw on injected fault');
      assert.strictEqual(caughtError.message, 'SIMULATED_PERSISTENCE_FAULT_IN_STEP_3');

      // Verify rollback: Step 1 note must NOT exist
      const notesAfter = await personalNotesStore.getNotes('student-1');
      assert.strictEqual(notesAfter.length, notesCountBefore, 'Note count must not increase after rollback');
      assert.ok(
        !notesAfter.some((n) => n.title === 'Uncommitted Quantum Note'),
        'Uncommitted note must not exist in repository'
      );

      // Verify rollback: Step 2 identity study minutes must NOT be updated
      const identityAfter = await personalIdentityStore.getIdentity('student-1');
      assert.strictEqual(
        identityAfter.stats.totalStudyMinutes,
        studyMinutesBefore,
        'Study minutes must remain unchanged after rollback'
      );

      // Verify disk state on cold reload
      const diskRepoCheck = new DiskJarvisDataRepository(diskPath);
      await diskRepoCheck.init();
      const reloadedNotes = await diskRepoCheck.personalStudy.listNotes('student-1');
      assert.strictEqual(reloadedNotes.length, notesCountBefore);
      assert.ok(!reloadedNotes.some((n) => n.title === 'Uncommitted Quantum Note'));

      const reloadedIdent = await diskRepoCheck.personalIdentities.getById('student-1');
      assert.strictEqual(reloadedIdent?.stats.totalStudyMinutes, studyMinutesBefore);

      console.log('[PASS] 2.1 Injected failure during later update cleanly rolls back all earlier updates');
    }

    // --------------------------------------------------------------------------
    // Suite 3: Rollback Restores All Affected State (Multi-Store Rollback Consistency)
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 3: Multi-Store Rollback Consistency Across 4 Sub-Repositories ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      const memCountBefore = (await diskRepo.personalMemories.listForUser('student-1')).length;
      const notesCountBefore = (await diskRepo.personalStudy.listNotes('student-1')).length;
      const timelineCountBefore = (await diskRepo.activityTimeline.getActivity('student-1')).length;
      const identityBefore = await diskRepo.personalIdentities.getById('student-1');
      const goalsCountBefore = identityBefore?.goals?.length || 0;

      // Transaction mutating 4 stores, then failing at the end
      let failureCaught = false;
      try {
        await diskRepo.runTransaction(async (txRepo) => {
          // 1. Mutate identity goals
          await txRepo.personalIdentities.update('student-1', {
            goals: [{ id: 'goal-fail-1', title: 'Ephemeral Goal', category: 'academic', targetDate: '2026-12-31', progressPercent: 0, status: 'active' }]
          });

          // 2. Mutate personal memories
          await txRepo.personalMemories.create({
            userId: 'student-1',
            category: 'UserGoal',
            key: 'ephemeral_memory_key',
            value: 'Ephemeral memory value',
            source: 'USER_STATED',
            confidence: 1.0,
            visibility: 'PRIVATE_PERSONAL'
          });

          // 3. Mutate study notes
          await txRepo.personalStudy.createNote({
            userId: 'student-1',
            title: 'Ephemeral Note',
            content: 'Ephemeral note body'
          });

          // 4. Mutate activity timeline
          await txRepo.activityTimeline.recordActivity({
            userId: 'student-1',
            title: 'Ephemeral Timeline Entry',
            category: 'study'
          });

          // 5. Injected abort
          throw new Error('TRANSACTION_ABORTED_BEFORE_COMMIT');
        });
      } catch (err: any) {
        if (err.message === 'TRANSACTION_ABORTED_BEFORE_COMMIT') {
          failureCaught = true;
        }
      }

      assert.ok(failureCaught, 'Transaction abort error must be caught');

      // Verify all 4 stores are restored exactly to pre-transaction states
      const identityAfter = await diskRepo.personalIdentities.getById('student-1');
      assert.strictEqual(identityAfter?.goals?.length || 0, goalsCountBefore, 'Goals count restored');

      const memCountAfter = (await diskRepo.personalMemories.listForUser('student-1')).length;
      assert.strictEqual(memCountAfter, memCountBefore, 'Memories count restored');

      const notesCountAfter = (await diskRepo.personalStudy.listNotes('student-1')).length;
      assert.strictEqual(notesCountAfter, notesCountBefore, 'Notes count restored');

      const timelineCountAfter = (await diskRepo.activityTimeline.getActivity('student-1')).length;
      assert.strictEqual(timelineCountAfter, timelineCountBefore, 'Timeline count restored');

      // Test Nested Transaction (Savepoint) Rollback
      let savepointTested = false;
      await diskRepo.runTransaction(async (rootTx) => {
        // Root operation: Add a persistent note
        await rootTx.personalStudy.createNote({
          userId: 'student-1',
          title: 'Root Transaction Persistent Note',
          content: 'This note must persist because the root transaction commits.'
        });

        // Nested operation that fails:
        try {
          await rootTx.runTransaction(async (innerTx) => {
            await innerTx.personalStudy.createNote({
              userId: 'student-1',
              title: 'Inner Transaction Note To Rollback',
              content: 'This inner note must be rolled back by savepoint.'
            });
            throw new Error('INNER_SAVEPOINT_FAULT');
          });
        } catch (innerErr: any) {
          assert.strictEqual(innerErr.message, 'INNER_SAVEPOINT_FAULT');
          savepointTested = true;
        }
      });

      assert.ok(savepointTested, 'Nested savepoint test must execute');

      // Verify that root note exists, but inner note was rolled back by savepoint
      const notesAfterSavepoint = await diskRepo.personalStudy.listNotes('student-1');
      assert.ok(
        notesAfterSavepoint.some((n) => n.title === 'Root Transaction Persistent Note'),
        'Root note must be committed'
      );
      assert.ok(
        !notesAfterSavepoint.some((n) => n.title === 'Inner Transaction Note To Rollback'),
        'Inner note must be rolled back by savepoint'
      );

      console.log('[PASS] 3.1 Multi-store rollback restores all participating stores; nested savepoints isolate inner errors');
    }

    // --------------------------------------------------------------------------
    // Suite 4: Idempotency & Duplicate Submission Guarantees
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 4: Idempotency & Duplicate Submission Guarantees ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);
      diagnosticService.reset();

      const startResult = await diagnosticService.startOrGetSession({
        userId: 'student-1',
        actionId: 'act-diag-idempotency-suite',
        conceptName: 'Calculus Fundamental Theorem',
        subject: 'Mathematics',
        contextId: 'ctx-student1-edu',
        itemCount: 2
      });
      const session = startResult.session;

      const identityBefore = await personalIdentityStore.getIdentity('student-1');
      const studyMinutesBefore = identityBefore.stats.totalStudyMinutes || 0;

      // First evaluation: must succeed and award delta & minutes
      const eval1 = await diagnosticService.evaluateCheckpoint({
        userId: 'student-1',
        conceptName: 'Calculus Fundamental Theorem',
        questionId: 'q-1',
        learnerAnswer: 'The fundamental theorem states that differentiation and integration are inverse operations, preserving mathematical boundary invariants.',
        sessionId: session.sessionId
      });

      assert.strictEqual(eval1.success, true);
      assert.strictEqual(eval1.isDuplicateSubmission, false);
      assert.ok(eval1.masteryDelta > 0);

      const identityAfter1 = await personalIdentityStore.getIdentity('student-1');
      assert.strictEqual(identityAfter1.stats.totalStudyMinutes, studyMinutesBefore + 5);

      // Duplicate submission: same user, same session, same question
      const eval2 = await diagnosticService.evaluateCheckpoint({
        userId: 'student-1',
        conceptName: 'Calculus Fundamental Theorem',
        questionId: 'q-1',
        learnerAnswer: 'The fundamental theorem states that differentiation and integration are inverse operations, preserving mathematical boundary invariants.',
        sessionId: session.sessionId
      });

      assert.strictEqual(eval2.success, true);
      assert.strictEqual(eval2.isDuplicateSubmission, true, 'Second evaluation must be marked as duplicate');
      assert.strictEqual(eval2.masteryDelta, 0, 'Duplicate submission must award 0 mastery delta');

      const identityAfter2 = await personalIdentityStore.getIdentity('student-1');
      assert.strictEqual(
        identityAfter2.stats.totalStudyMinutes,
        studyMinutesBefore + 5,
        'Duplicate submission must NOT award additional study minutes'
      );

      // Verify that after disk reload, duplicate check still prevents double awarding
      await diskRepo.flush();
      const diskRepoRestart = new DiskJarvisDataRepository(diskPath);
      await diskRepoRestart.init();
      setActiveRepository(diskRepoRestart);
      diagnosticService.reset();

      const eval3 = await diagnosticService.evaluateCheckpoint({
        userId: 'student-1',
        conceptName: 'Calculus Fundamental Theorem',
        questionId: 'q-1',
        learnerAnswer: 'The fundamental theorem states that differentiation and integration are inverse operations, preserving mathematical boundary invariants.',
        sessionId: session.sessionId
      });

      assert.strictEqual(eval3.success, true);
      assert.strictEqual(eval3.isDuplicateSubmission, true, 'Duplicate submission after restart must be recognized');
      assert.strictEqual(eval3.masteryDelta, 0, 'Mastery delta after restart duplicate must remain 0');

      const identityAfterRestart = await diskRepoRestart.personalIdentities.getById('student-1');
      assert.strictEqual(
        identityAfterRestart?.stats.totalStudyMinutes,
        studyMinutesBefore + 5,
        'Study minutes after restart duplicate must remain unchanged'
      );

      console.log('[PASS] 4.1 Duplicate submissions never double-count mastery progress or unearned study minutes');
    }

    // --------------------------------------------------------------------------
    // Suite 5: Concurrent Submissions & Process-Local Locking Protection
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 5: Concurrent Submissions & Process-Local Locking Protection ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);
      diagnosticService.reset();

      const startResult = await diagnosticService.startOrGetSession({
        userId: 'student-1',
        actionId: 'act-diag-concurrency-suite',
        conceptName: 'Thermodynamics Heat Engine Efficiency',
        subject: 'Physics',
        contextId: 'ctx-student1-edu',
        itemCount: 2
      });
      const session = startResult.session;

      const identityBefore = await personalIdentityStore.getIdentity('student-1');
      const studyMinutesBefore = identityBefore.stats.totalStudyMinutes || 0;

      // Launch 5 concurrent submissions for the exact same checkpoint
      const answer = 'The Carnot efficiency invariant bounds heat engine work based on reservoir temperature symmetry and conservation laws.';
      const concurrentPromises = Array.from({ length: 5 }, () =>
        diagnosticService.evaluateCheckpoint({
          userId: 'student-1',
          conceptName: 'Thermodynamics Heat Engine Efficiency',
          questionId: 'q-1',
          learnerAnswer: answer,
          sessionId: session.sessionId
        })
      );

      const results = await Promise.all(concurrentPromises);

      // All 5 must succeed without error
      assert.strictEqual(results.length, 5);
      for (const res of results) {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.evaluated, true);
      }

      // Exactly 1 must have performed the initial evaluation, others deduplicated
      const primaryEvaluations = results.filter((r) => !r.isDuplicateSubmission);
      assert.strictEqual(primaryEvaluations.length, 1, 'Exactly one concurrent submission performs initial evaluation');

      // Study minutes must have incremented by exactly 5, NOT 25
      const identityAfter = await personalIdentityStore.getIdentity('student-1');
      assert.strictEqual(
        identityAfter.stats.totalStudyMinutes,
        studyMinutesBefore + 5,
        'Concurrent requests must not multiply awarded study minutes'
      );

      // Test general concurrent transactions serialization
      const concurrentTxPromises = Array.from({ length: 8 }, (_, idx) =>
        diskRepo.runTransaction(async (txRepo) => {
          await txRepo.personalStudy.createNote({
            userId: 'student-1',
            title: `Concurrent Note ${idx}`,
            content: `Body for concurrent note ${idx}`
          });
        })
      );

      await Promise.all(concurrentTxPromises);

      const notesAfterConcurrent = await diskRepo.personalStudy.listNotes('student-1');
      for (let idx = 0; idx < 8; idx++) {
        assert.ok(
          notesAfterConcurrent.some((n) => n.title === `Concurrent Note ${idx}`),
          `Concurrent Note ${idx} must be safely committed`
        );
      }

      console.log('[PASS] 5.1 Concurrent requests serialize safely through process-local lock without race conditions');
    }

    // --------------------------------------------------------------------------
    // Suite 6: Undo and Rollback Authenticated Ownership & Atomic Rollback
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 6: Undo and Rollback Authenticated Ownership & Atomic Rollback ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // 1. Create a note and timeline activity for student-1
      const note = await personalNotesStore.createNote('student-1', {
        title: 'Reversible Action Note Test',
        content: 'This note will be undone.',
        subject: 'Physics'
      });

      const activity = await activityTimelineStore.recordActivity('student-1', {
        title: `Created note: ${note.title}`,
        category: 'notes',
        canUndo: true,
        reversibleAction: {
          type: 'note_create',
          targetId: note.id
        }
      });

      assert.ok(activity.id);
      assert.strictEqual(activity.canUndo, true);

      // 2. Security Check: cadet-2 attempts to undo student-1's activity -> Must reject
      await assert.rejects(
        async () => {
          await activityTimelineStore.undoActivity('cadet-2', activity.id);
        },
        /SECURITY_VIOLATION: Activity item does not belong to this authenticated user/,
        'Cross-user undo must be denied by security boundary'
      );

      // 3. User student-1 safely undoes the activity
      const undoResult = await activityTimelineStore.undoActivity('student-1', activity.id);
      assert.strictEqual(undoResult.ok, true);

      // Verify that note was deleted
      const fetchedNote = await personalNotesStore.getNoteById('student-1', note.id);
      assert.strictEqual(fetchedNote, null, 'Note must be deleted after undo');

      // Verify that timeline item is marked undone
      const activityAfter = await diskRepo.activityTimeline.getById(activity.id, 'student-1');
      assert.ok(activityAfter);
      assert.strictEqual(activityAfter.undone, true);

      // 4. Repeated undo attempt: must return ALREADY_UNDONE
      const repeatUndo = await activityTimelineStore.undoActivity('student-1', activity.id);
      assert.strictEqual(repeatUndo.ok, false);
      assert.strictEqual(repeatUndo.error, 'ALREADY_UNDONE');

      // 5. Injected failure during undo: if timeline update fails, target deletion rolls back
      const note2 = await personalNotesStore.createNote('student-1', {
        title: 'Note For Injected Undo Failure',
        content: 'Testing atomic rollback if timeline update fails.'
      });

      const activity2 = await activityTimelineStore.recordActivity('student-1', {
        title: `Created note: ${note2.title}`,
        category: 'notes',
        canUndo: true,
        reversibleAction: {
          type: 'note_create',
          targetId: note2.id
        }
      });

      // Inject failure on updateActivity inside transaction using property override
      const originalTimeline = diskRepo.activityTimeline;
      Object.defineProperty(diskRepo, 'activityTimeline', {
        get: () => ({
          ...originalTimeline,
          updateActivity: async () => {
            throw new Error('SIMULATED_TIMELINE_UPDATE_FAILURE');
          }
        }),
        configurable: true
      });

      try {
        const failedUndo = await activityTimelineStore.undoActivity('student-1', activity2.id);
        assert.strictEqual(failedUndo.ok, false);
        assert.strictEqual(failedUndo.error, 'ROLLBACK_FAILED');

        // Verify that the note was restored by transaction rollback (NOT permanently deleted!)
        delete (diskRepo as any).activityTimeline;
        const noteStillExists = await personalNotesStore.getNoteById('student-1', note2.id);
        assert.ok(noteStillExists, 'Note must NOT be deleted if timeline update fails (atomic rollback)');

        // Activity item remains not undone
        const actStillActive = await diskRepo.activityTimeline.getById(activity2.id, 'student-1');
        assert.strictEqual(actStillActive?.undone, undefined);
      } finally {
        delete (diskRepo as any).activityTimeline;
      }

      console.log('[PASS] 6.1 Undo enforces strict authenticated ownership and guarantees atomic target/timeline rollback');
    }

    // --------------------------------------------------------------------------
    // Suite 7: MemoryJarvisDataRepository Behavioral Parity
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 7: MemoryJarvisDataRepository Behavioral Parity ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);
      diagnosticService.reset();

      // Test 1: Coordinated transaction commit in memory
      await memRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.createNote({
          userId: 'mem-user-parity',
          title: 'Memory Parity Note',
          content: 'Parity testing content'
        });
        await txRepo.personalIdentities.create({
          userId: 'mem-user-parity',
          stats: { totalStudyMinutes: 25, conceptsMastered: 1, streakDays: 2 }
        });
      });

      const memNote = (await memRepo.personalStudy.listNotes('mem-user-parity'))[0];
      assert.ok(memNote);
      assert.strictEqual(memNote.title, 'Memory Parity Note');

      const memIdent = await memRepo.personalIdentities.getById('mem-user-parity');
      assert.strictEqual(memIdent?.stats.totalStudyMinutes, 25);

      // Test 2: Injected failure rollback in memory
      let memFaultCaught = false;
      try {
        await memRepo.runTransaction(async (txRepo) => {
          await txRepo.personalStudy.createNote({
            userId: 'mem-user-parity',
            title: 'Uncommitted Memory Note',
            content: 'Should not exist'
          });
          throw new Error('SIMULATED_MEMORY_FAULT');
        });
      } catch (err: any) {
        if (err.message === 'SIMULATED_MEMORY_FAULT') memFaultCaught = true;
      }

      assert.ok(memFaultCaught);
      const memNotesAfter = await memRepo.personalStudy.listNotes('mem-user-parity');
      assert.strictEqual(memNotesAfter.length, 1, 'Uncommitted memory note must not exist');

      // Test 3: Savepoint in memory
      await memRepo.runTransaction(async (rootTx) => {
        await rootTx.personalStudy.createNote({
          userId: 'mem-user-parity',
          title: 'Root Memory Note',
          content: 'Root content'
        });
        try {
          await rootTx.runTransaction(async (innerTx) => {
            await innerTx.personalStudy.createNote({
              userId: 'mem-user-parity',
              title: 'Inner Memory Note To Rollback',
              content: 'Inner content'
            });
            throw new Error('INNER_MEM_ERROR');
          });
        } catch {
          // Handled
        }
      });

      const finalMemNotes = await memRepo.personalStudy.listNotes('mem-user-parity');
      assert.ok(finalMemNotes.some((n) => n.title === 'Root Memory Note'));
      assert.ok(!finalMemNotes.some((n) => n.title === 'Inner Memory Note To Rollback'));

      console.log('[PASS] 7.1 MemoryJarvisDataRepository provides 100% behavioral parity for atomicity and rollback');
    }

    // --------------------------------------------------------------------------
    // Suite 8: Restart and Recovery Behavior
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 8: Restart and Recovery Behavior ---');
    {
      const diskRepo = new DiskJarvisDataRepository(diskPath);
      await diskRepo.init();
      setActiveRepository(diskRepo);

      // Commit a persistent marker
      await diskRepo.runTransaction(async (txRepo) => {
        await txRepo.personalStudy.createNote({
          userId: 'student-1',
          title: 'Restart Recovery Marker Note',
          content: 'Verified state surviving crash simulation.'
        });
      });

      await diskRepo.flush();

      // Verify no temporary .tmp files left in data directory
      const tmpFiles = fs.readdirSync(testTempDir).filter((f) => f.endsWith('.tmp'));
      assert.strictEqual(tmpFiles.length, 0, 'No temporary staging files must linger after commit');

      // Perform cold restart
      const restartRepo = new DiskJarvisDataRepository(diskPath);
      await restartRepo.init();

      const recoveredNotes = await restartRepo.personalStudy.listNotes('student-1');
      assert.ok(
        recoveredNotes.some((n) => n.title === 'Restart Recovery Marker Note'),
        'Committed transaction state must survive cold restart'
      );

      console.log('[PASS] 8.1 Restart and recovery behavior clean, durable, and free of orphaned staging artifacts');
    }

  } finally {
    resetActiveRepository();
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }

  console.log('\n======================================================');
  console.log('ALL STAGE 6.4.4 ATOMIC MULTI-STORE CONSISTENCY TESTS PASSED!');
  console.log('======================================================\n');
}

runStage644Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
