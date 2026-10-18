import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DiskJarvisDataRepository,
  MemoryJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository,
  type DatabaseSchema
} from '../server/data/index.ts';
import { personalNotesStore } from '../server/personal/tools/personalNotesStore.ts';
import { activityTimelineStore } from '../server/personal/activityTimelineStore.ts';
import { diagnosticService, InvalidDiagnosticEventError } from '../server/personal/diagnosticService.ts';

async function runStage643Tests() {
  console.log('=== [STAGE 6.4.3] REMAINING PERSONAL-STORE PERSISTENCE TEST SUITE ===\n');

  const testTempDir = path.resolve(process.cwd(), 'data', 'test-stage6-4-3-temp');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }
  const diskPath = path.join(testTempDir, 'stage6_4_3_db.json');
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  try {
    // --------------------------------------------------------------------------
    // Suite 1: Notes, Flashcards & Study Plans Persistence Across Cold Disk Reinitialization
    // --------------------------------------------------------------------------
    console.log('--- Suite 1: Personal Study Persistence Across Cold Disk Reinitialization ---');
    {
      const diskRepo1 = new DiskJarvisDataRepository(diskPath);
      await diskRepo1.init();
      setActiveRepository(diskRepo1);

      // Verify seed notes exist for student-1
      const initialNotes = await personalNotesStore.getNotes('student-1');
      assert.ok(initialNotes.length >= 3, 'Seed notes for student-1 must be present');
      assert.ok(initialNotes.some((n) => n.id === 'note-phys-1'), 'note-phys-1 must exist');

      // 1. Create a custom note
      const newNote = await personalNotesStore.createNote('student-1', {
        title: 'Wave Mechanics Born Probability Density',
        content: 'The probability density P(x) = |psi(x)|^2 represents the likelihood per unit length of finding a quantum particle.',
        subject: 'Physics',
        tags: ['quantum', 'born-rule', 'wavefunction'],
        conceptId: 'concept-wave-functions',
        contextId: 'ctx-student1-edu'
      });
      assert.ok(newNote.id);
      assert.strictEqual(newNote.title, 'Wave Mechanics Born Probability Density');

      // 2. Create note for cadet-2
      const cadetNote = await personalNotesStore.createNote('cadet-2', {
        title: 'Cadet Flight Dynamics Protocol',
        content: 'Sub-orbital trajectory calculation notes for cadet training.',
        subject: 'Aerospace'
      });
      assert.ok(cadetNote.id);

      // 3. Create a custom flashcard
      const newCard = await personalNotesStore.createFlashcard('student-1', {
        front: 'What is the Born interpretation of the wave function?',
        back: 'The square modulus of the wave function |psi(r,t)|^2 is proportional to the probability density.',
        subject: 'Physics',
        tags: ['quantum', 'foundations'],
        conceptId: 'concept-wave-functions'
      });
      assert.ok(newCard.id);

      // 4. Create a custom study plan
      const newPlan = await personalNotesStore.createStudyPlan('student-1', {
        title: 'Quantum Electrodynamics Deep Review',
        subject: 'Physics',
        durationMinutes: 60,
        goals: ['Master Dirac notation', 'Solve harmonic oscillator problem 3']
      });
      assert.ok(newPlan.id);

      // Flush and simulate COLD PROCESS RESTART with new DiskJarvisDataRepository instance
      await diskRepo1.flush();

      const diskRepo2 = new DiskJarvisDataRepository(diskPath);
      await diskRepo2.init();
      setActiveRepository(diskRepo2);

      // Verify note survived reinitialization
      const fetchedNote = await personalNotesStore.getNoteById('student-1', newNote.id);
      assert.ok(fetchedNote, 'New note must survive disk reinitialization');
      assert.strictEqual(fetchedNote.title, 'Wave Mechanics Born Probability Density');
      assert.strictEqual(fetchedNote.conceptId, 'concept-wave-functions');
      assert.ok(fetchedNote.tags.includes('born-rule'));

      // Verify flashcard survived
      const flashcardsAfter = await personalNotesStore.getFlashcards('student-1', 'Physics');
      assert.ok(
        flashcardsAfter.some((c) => c.id === newCard.id),
        'Flashcard must survive disk reinitialization'
      );

      // Verify study plan survived
      const plansAfter = await personalNotesStore.getStudyPlans('student-1');
      assert.ok(
        plansAfter.some((p) => p.id === newPlan.id),
        'Study session plan must survive disk reinitialization'
      );

      // Verify cross-user isolation: student-1 cannot retrieve cadet-2 note
      const cadetNoteFromStudent1 = await personalNotesStore.getNoteById('student-1', cadetNote.id);
      assert.strictEqual(cadetNoteFromStudent1, null, 'Student 1 cannot read cadet 2 note');

      const cadetNotes = await personalNotesStore.getNotes('cadet-2');
      assert.ok(cadetNotes.some((n) => n.id === cadetNote.id), 'Cadet 2 note is available to cadet 2');

      // Test delete operation persistence across reinitialization
      const deleteResult = await personalNotesStore.deleteNote('student-1', newNote.id);
      assert.strictEqual(deleteResult, true, 'Delete note must succeed');

      const diskRepo3 = new DiskJarvisDataRepository(diskPath);
      await diskRepo3.init();
      setActiveRepository(diskRepo3);

      const deletedNoteCheck = await personalNotesStore.getNoteById('student-1', newNote.id);
      assert.strictEqual(deletedNoteCheck, null, 'Deleted note must remain absent after reinitialization');

      console.log('[PASS] 1.1 Notes, flashcards, and study plans survive disk-repository reinitialization');
    }

    // --------------------------------------------------------------------------
    // Suite 2: Activity Timeline Persistence & Safe Rollback Across Reinitialization
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 2: Activity Timeline Persistence & Context Isolation ---');
    {
      const diskRepo1 = new DiskJarvisDataRepository(diskPath);
      await diskRepo1.init();
      setActiveRepository(diskRepo1);

      // 1. Record an education practice activity
      const eduAct = await activityTimelineStore.recordActivity('student-1', {
        contextId: 'ctx-student1-edu',
        contextType: 'EDUCATION',
        title: 'Completed 10 questions on Electric Fields',
        category: 'practice',
        totalCount: 10,
        reusedCount: 8,
        generatedCount: 2,
        canUndo: false
      });
      assert.ok(eduAct.id);

      // 2. Record a personal study plan activity with reversible action
      const planItem = await personalNotesStore.createStudyPlan('student-1', {
        title: 'Morning Calculus Recitation',
        subject: 'Mathematics',
        durationMinutes: 30
      });

      const reversibleAct = await activityTimelineStore.recordActivity('student-1', {
        contextId: 'ctx-student1-personal',
        contextType: 'PERSONAL',
        title: 'Scheduled study plan: Morning Calculus Recitation',
        category: 'study',
        canUndo: true,
        undone: false,
        reversibleAction: {
          type: 'study_plan_create',
          targetId: planItem.id
        }
      });
      assert.ok(reversibleAct.id);

      // 3. Record an activity for cadet-2
      const cadetAct = await activityTimelineStore.recordActivity('cadet-2', {
        contextId: 'ctx-cadet2-personal',
        contextType: 'PERSONAL',
        title: 'Cadet Simulator Launch Routine',
        category: 'system',
        canUndo: false
      });
      assert.ok(cadetAct.id);

      // Simulate COLD PROCESS RESTART
      await diskRepo1.flush();
      const diskRepo2 = new DiskJarvisDataRepository(diskPath);
      await diskRepo2.init();
      setActiveRepository(diskRepo2);

      // Verify student-1 activities survived
      const s1Activities = await activityTimelineStore.getActivity('student-1');
      assert.ok(s1Activities.some((a) => a.id === eduAct.id), 'Education activity must survive reinitialization');
      assert.ok(s1Activities.some((a) => a.id === reversibleAct.id), 'Reversible activity must survive reinitialization');

      // Verify context isolation: education query does not contain personal item
      const eduOnly = await activityTimelineStore.getActivity('student-1', { contextType: 'EDUCATION' });
      assert.ok(eduOnly.some((a) => a.id === eduAct.id));
      assert.ok(!eduOnly.some((a) => a.id === reversibleAct.id), 'Context isolation: personal item excluded from education query');

      // Verify user isolation: student-1 does not see cadet-2 activity
      assert.ok(!s1Activities.some((a) => a.id === cadetAct.id), 'User isolation: student-1 does not see cadet-2 activity');

      // Verify rollback (undo) across reinitialization
      const undoRes = await activityTimelineStore.undoActivity('student-1', reversibleAct.id);
      assert.strictEqual(undoRes.ok, true, 'Rollback must succeed');

      // Verify the study plan was deleted by rollback
      const plansNow = await personalNotesStore.getStudyPlans('student-1');
      assert.ok(!plansNow.some((p) => p.id === planItem.id), 'Target plan must be removed on rollback');

      // Cold restart again to verify undo state persistence
      const diskRepo3 = new DiskJarvisDataRepository(diskPath);
      await diskRepo3.init();
      setActiveRepository(diskRepo3);

      const actAfterRestart = (await activityTimelineStore.getActivity('student-1')).find((a) => a.id === reversibleAct.id);
      assert.ok(actAfterRestart, 'Activity entry still exists in history');
      assert.strictEqual(actAfterRestart.undone, true, 'Undone status must persist across restarts');

      // Verify re-undoing returns ALREADY_UNDONE
      const reUndoRes = await activityTimelineStore.undoActivity('student-1', reversibleAct.id);
      assert.strictEqual(reUndoRes.ok, false);
      assert.strictEqual(reUndoRes.error, 'ALREADY_UNDONE');

      // Verify cross-user undo attempt throws SECURITY_VIOLATION
      await assert.rejects(
        async () => {
          await activityTimelineStore.undoActivity('student-1', cadetAct.id);
        },
        /SECURITY_VIOLATION/,
        'Cross-user undo must throw SECURITY_VIOLATION'
      );

      console.log('[PASS] 2.1 Activity timeline retains ownership, context attribution, and undo state across restarts');
    }

    // --------------------------------------------------------------------------
    // Suite 3: Diagnostic Session Records & Checkpoint Evaluation Persistence
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 3: Diagnostic Sessions Persistence & Checkpoint State ---');
    {
      const diskRepo1 = new DiskJarvisDataRepository(diskPath);
      await diskRepo1.init();
      setActiveRepository(diskRepo1);
      diagnosticService.reset();

      // 1. Start a diagnostic session with an actionId for idempotency
      const startResult = await diagnosticService.startOrGetSession({
        userId: 'student-1',
        actionId: 'act-diag-quantum-1',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        subject: 'Physics',
        contextId: 'ctx-student1-edu',
        itemCount: 2
      });
      assert.strictEqual(startResult.isNew, true);
      const session1 = startResult.session;
      assert.ok(session1.sessionId);
      assert.strictEqual(session1.status, 'started');

      // 2. Evaluate question q-1 with a verified answer
      const eval1 = await diagnosticService.evaluateCheckpoint({
        userId: 'student-1',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        questionId: 'q-1',
        learnerAnswer: 'The probability density represents a fundamental physical invariant under unitary state transformation.',
        sessionId: session1.sessionId
      });
      assert.strictEqual(eval1.success, true);
      assert.strictEqual(eval1.evaluated, true);
      assert.strictEqual(eval1.isDuplicateSubmission, false);
      assert.ok(eval1.score > 0.5);

      // 3. Flush disk and perform COLD PROCESS RESTART
      await diskRepo1.flush();
      const diskRepo2 = new DiskJarvisDataRepository(diskPath);
      await diskRepo2.init();
      setActiveRepository(diskRepo2);
      // Reset in-memory diagnosticService to simulate cold server restart
      diagnosticService.reset();

      // 4. Verify retry with same actionId resolves to existing persisted session
      const retryResult = await diagnosticService.startOrGetSession({
        userId: 'student-1',
        actionId: 'act-diag-quantum-1',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        subject: 'Physics',
        contextId: 'ctx-student1-edu'
      });
      assert.strictEqual(retryResult.isNew, false, 'Action retry must recover persisted session');
      assert.strictEqual(retryResult.session.sessionId, session1.sessionId);

      // 5. Verify evaluated checkpoint survived restart and idempotency prevents double delta
      const dupEval = await diagnosticService.evaluateCheckpoint({
        userId: 'student-1',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        questionId: 'q-1',
        learnerAnswer: 'The probability density represents a fundamental physical invariant under unitary state transformation.',
        sessionId: session1.sessionId
      });
      assert.strictEqual(dupEval.success, true);
      assert.strictEqual(dupEval.isDuplicateSubmission, true, 'Duplicate submission after restart must be recognized');
      assert.strictEqual(dupEval.masteryDelta, 0, 'Duplicate submission must award 0 delta');

      // 6. Complete the second question to complete the session
      const eval2 = await diagnosticService.evaluateCheckpoint({
        userId: 'student-1',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        questionId: 'q-2',
        learnerAnswer: 'The Schrödinger equation linear differential operator defines time evolution of state vectors.',
        sessionId: session1.sessionId
      });
      assert.strictEqual(eval2.success, true);

      // 7. Verify session is marked completed in repository after restart
      await diskRepo2.flush();
      const diskRepo3 = new DiskJarvisDataRepository(diskPath);
      await diskRepo3.init();
      setActiveRepository(diskRepo3);
      diagnosticService.reset();

      const completedSession = await diagnosticService.getSession(session1.sessionId, 'student-1');
      assert.ok(completedSession, 'Completed session must exist');
      assert.strictEqual(completedSession.completed, true, 'Session must be persisted as completed');
      assert.strictEqual(completedSession.status, 'completed');
      assert.strictEqual(completedSession.evaluatedCheckpoints.size, 2);

      // 8. Completed session protection: Submitting an unrecorded checkpoint throws error
      await assert.rejects(
        async () => {
          await diagnosticService.evaluateCheckpoint({
            userId: 'student-1',
            conceptName: 'Quantum Wave Functions & Born Interpretation',
            questionId: 'q-unrecorded-99',
            learnerAnswer: 'Arbitrary answer',
            sessionId: session1.sessionId
          });
        },
        /Diagnostic session .* is already completed and closed/,
        'Closed session cannot accept new unrecorded checkpoints'
      );

      // 9. Cross-user isolation: User B cannot fetch User A diagnostic session
      const crossUserCheck = await diagnosticService.getSession(session1.sessionId, 'cadet-2');
      assert.strictEqual(crossUserCheck, null, 'User B cannot read User A diagnostic session');

      console.log('[PASS] 3.1 Diagnostic sessions and evaluations persist truthfully across process restarts');
    }

    // --------------------------------------------------------------------------
    // Suite 4: Legacy Snapshot Backward Compatibility
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 4: Backward Compatibility with Version 1 Snapshots ---');
    {
      const v1LegacySnapshot: DatabaseSchema = {
        version: 1,
        users: [
          {
            id: 'legacy-learner-1',
            displayName: 'Legacy Cadet',
            email: 'legacy@stark.edu',
            role: 'student',
            createdAt: '2025-01-01T00:00:00.000Z'
          }
        ],
        institutions: [],
        institutionMemberships: [],
        workspaces: [],
        memberships: [],
        conversations: [],
        messages: [],
        knowledgeSpaces: [],
        knowledgeSources: [],
        knowledgeChunks: [],
        classes: [],
        assignments: [],
        submissions: [],
        studyArtifacts: [],
        auditEvents: [],
        researchProjects: [],
        researchQuestions: [],
        evidenceRecords: [],
        researchNotes: [],
        researchReports: [],
        files: [],
        classroomSessions: [],
        classroomParticipants: []
      };

      const legacyPath = path.join(testTempDir, 'legacy_v1_db.json');
      fs.writeFileSync(legacyPath, JSON.stringify(v1LegacySnapshot, null, 2), 'utf8');

      const legacyRepo = new DiskJarvisDataRepository(legacyPath);
      await legacyRepo.init();
      setActiveRepository(legacyRepo);

      // Querying empty collections on legacy file must safely return empty array
      const notes = await personalNotesStore.getNotes('legacy-learner-1');
      assert.deepStrictEqual(notes, [], 'Legacy snapshot safely returns empty notes array');

      const timeline = await activityTimelineStore.getActivity('legacy-learner-1');
      assert.deepStrictEqual(timeline, [], 'Legacy snapshot safely returns empty timeline array');

      // Writing to legacy file initializes the collection and persists
      const createdNote = await personalNotesStore.createNote('legacy-learner-1', {
        title: 'Legacy Upgraded Note',
        content: 'This note was created on an upgraded v1 database snapshot.'
      });
      assert.ok(createdNote.id);

      // Re-read from disk
      const legacyRepo2 = new DiskJarvisDataRepository(legacyPath);
      await legacyRepo2.init();
      setActiveRepository(legacyRepo2);

      const reReadNote = await personalNotesStore.getNoteById('legacy-learner-1', createdNote.id);
      assert.ok(reReadNote, 'Note written to legacy snapshot persists correctly');
      assert.strictEqual(reReadNote.title, 'Legacy Upgraded Note');

      console.log('[PASS] 4.1 Version 1 legacy snapshots remain fully readable and upgrade gracefully');
    }

    // --------------------------------------------------------------------------
    // Suite 5: MemoryJarvisDataRepository Compatibility
    // --------------------------------------------------------------------------
    console.log('\n--- Suite 5: MemoryJarvisDataRepository Compatibility ---');
    {
      const memRepo = new MemoryJarvisDataRepository();
      setActiveRepository(memRepo);
      diagnosticService.reset();

      // Test notes in memory repository
      const memNote = await personalNotesStore.createNote('mem-user-1', {
        title: 'In-Memory Note',
        content: 'Testing in-memory repository notes compatibility.'
      });
      assert.ok(memNote.id);

      const memNotesList = await personalNotesStore.getNotes('mem-user-1');
      assert.strictEqual(memNotesList.length, 1);
      assert.strictEqual(memNotesList[0].id, memNote.id);

      // Test bulk deletion
      const deletedCount = await personalNotesStore.deleteAllNotes('mem-user-1');
      assert.strictEqual(deletedCount, 1);
      const afterDeleteNotes = await personalNotesStore.getNotes('mem-user-1');
      assert.strictEqual(afterDeleteNotes.length, 0);

      // Test timeline in memory repository
      const memAct = await activityTimelineStore.recordActivity('mem-user-1', {
        contextId: 'ctx-mem',
        contextType: 'PERSONAL',
        title: 'In-memory activity recorded',
        category: 'system'
      });
      assert.ok(memAct.id);

      const memActivities = await activityTimelineStore.getActivity('mem-user-1');
      assert.strictEqual(memActivities.length, 1);

      // Test diagnostic session in memory repository
      const sessResult = await diagnosticService.startOrGetSession({
        userId: 'mem-user-1',
        conceptName: 'Thermodynamics Entropy',
        subject: 'Physics'
      });
      assert.strictEqual(sessResult.isNew, true);

      console.log('[PASS] 5.1 Memory-backed repository remains fully compatible with all personal stores');
    }

  } finally {
    resetActiveRepository();
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  }

  console.log('\n======================================================');
  console.log('ALL STAGE 6.4.3 REMAINING PERSONAL-STORE PERSISTENCE TESTS PASSED!');
  console.log('======================================================\n');
}

runStage643Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
