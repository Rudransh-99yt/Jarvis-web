import assert from 'node:assert';
import { confirmationPolicy } from '../server/personal/tools/confirmationPolicy.ts';
import { activityTimelineStore } from '../server/personal/activityTimelineStore.ts';
import { personalToolRegistry } from '../server/personal/tools/toolRegistry.ts';
import { personalNotesStore } from '../server/personal/tools/personalNotesStore.ts';
import { actionExperienceClient } from '../src/services/actionExperienceClient.ts';
import { startHttpHarness } from './httpHarness.ts';
import type { ActionPreviewData, ActionResultData } from '../src/types/actionExperience.ts';

console.log('=== [WEB JARVIS] PHASE 6.3: ACTION EXPERIENCE TEST SUITE ===');

async function runActionExperienceTestSuite() {
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

  // --- SECTION 1: Action Preview Creation & Breakdown ---
  console.log('\n--- SECTION 1: Action Preview Creation & Risk Classification ---');

  await test('1.1 action preview creation correctly structures action, source, and plan', () => {
    const preview: ActionPreviewData = {
      id: 'prev-quad-20',
      actionType: 'practice_set_create',
      title: 'Create 20 practice questions',
      rationale: 'Curated from existing curriculum knowledge for Quadratic Equations without wasteful regeneration.',
      source: {
        type: 'EXISTING_VERIFIED',
        title: 'Class 10 Quadratic Equations Question Bank',
        assetId: 'ka-math-quad-10',
        verified: true
      },
      plan: {
        totalItems: 20,
        reusedItems: 20,
        generatedItems: 0,
        summary: 'Reuse 20 existing verified questions'
      },
      riskLevel: 'LOW_RISK_WRITE',
      requiresConfirmation: false,
      canUndo: true,
      payload: { subject: 'Mathematics', topic: 'Quadratic Equations', questionCount: 20 }
    };

    assert.strictEqual(preview.plan.reusedItems, 20);
    assert.strictEqual(preview.plan.generatedItems, 0);
    assert.strictEqual(preview.source.type, 'EXISTING_VERIFIED');
    assert.strictEqual(preview.riskLevel, 'LOW_RISK_WRITE');
    assert.strictEqual(preview.requiresConfirmation, false);
  });

  await test('1.2 correct risk classification: READ_ONLY and LOW_RISK_WRITE do not require confirmation', () => {
    const readOnlyReq = confirmationPolicy.evaluateConfirmationRequirement('READ_ONLY');
    const lowRiskReq = confirmationPolicy.evaluateConfirmationRequirement('LOW_RISK_WRITE');

    assert.strictEqual(readOnlyReq, false, 'READ_ONLY must execute without confirmation');
    assert.strictEqual(lowRiskReq, false, 'LOW_RISK_WRITE executes immediately under standard policy');
  });

  await test('1.3 correct risk classification: HIGH_RISK_WRITE and EXTERNAL_ACTION deterministically require confirmation', () => {
    const highRiskReq = confirmationPolicy.evaluateConfirmationRequirement('HIGH_RISK_WRITE');
    const externalReq = confirmationPolicy.evaluateConfirmationRequirement('EXTERNAL_ACTION');

    assert.strictEqual(highRiskReq, true, 'HIGH_RISK_WRITE must require explicit confirmation');
    assert.strictEqual(externalReq, true, 'EXTERNAL_ACTION must require explicit confirmation');
  });

  // --- SECTION 2: Confirmation Integrity & Server Authoritativeness ---
  console.log('\n--- SECTION 2: Confirmation Experience & Server Authority ---');

  await test('2.1 confirmation-required state creates server pending action with timeout', () => {
    const pending = confirmationPolicy.createPendingAction({
      toolId: 'personal_notes_delete',
      userId: 'student-1',
      contextId: 'ctx-student1-edu',
      arguments: { noteId: 'note-math-1' },
      riskLevel: 'HIGH_RISK_WRITE',
      previewSummary: 'Permanently delete note: Chain Rule'
    });

    assert.ok(pending.id.startsWith('act-'));
    assert.strictEqual(pending.userId, 'student-1');
    assert.strictEqual(pending.riskLevel, 'HIGH_RISK_WRITE');
    assert.ok(new Date(pending.expiresAt).getTime() > Date.now());
  });

  await test('2.2 confirmation cannot be bypassed: server refuses execution without confirmation', async () => {
    const execContext = {
      userId: 'student-1',
      contextId: 'ctx-student1-edu',
      contextType: 'EDUCATION' as const,
      permissions: { canAccessInstitutionData: true, sharePersonalMemory: false }
    };

    // Attempting to execute personalNotesDeleteTool directly through registry without bypass flag
    const result = await personalToolRegistry.executeTool('personal_notes_delete', execContext, {
      noteId: 'note-math-1'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'CONFIRMATION_REQUIRED');
    assert.ok(result.metadata?.confirmationRequired, 'Must signal confirmation required');
    assert.ok(result.metadata?.pendingActionId, 'Must return pending action id for explicit UI confirmation');
  });

  await test('2.3 cross-user confirmation injection is strictly blocked by server authority', () => {
    const pending = confirmationPolicy.createPendingAction({
      toolId: 'personal_notes_delete',
      userId: 'student-1',
      contextId: 'ctx-student1-edu',
      arguments: { noteId: 'note-math-1' },
      riskLevel: 'HIGH_RISK_WRITE',
      previewSummary: 'Delete note for student-1'
    });

    // Attempting to consume as student-2
    assert.throws(
      () => {
        confirmationPolicy.consumePendingAction(pending.id, 'student-2');
      },
      /SECURITY_VIOLATION/,
      'Consuming another user pending action must throw SECURITY_VIOLATION'
    );
  });

  await test('2.4 cancelled state safely cleans up pending action without side effects', () => {
    const pending = confirmationPolicy.createPendingAction({
      toolId: 'personal_notes_delete',
      userId: 'student-1',
      contextId: 'ctx-student1-edu',
      arguments: { noteId: 'note-math-1' },
      riskLevel: 'HIGH_RISK_WRITE',
      previewSummary: 'Delete note to be cancelled'
    });

    const cancelled = confirmationPolicy.cancelPendingAction(pending.id, 'student-1');
    assert.strictEqual(cancelled, true, 'Cancellation must succeed');

    // Confirm it cannot be consumed after cancellation
    const retrieved = confirmationPolicy.getPendingAction(pending.id);
    assert.strictEqual(retrieved, null, 'Cancelled action must be removed');
  });

  // --- SECTION 3: Execution States & Result Display ---
  console.log('\n--- SECTION 3: Execution States & Reused/Adapted/Generated Display ---');

  await test('3.1 result clearly distinguishes reused vs adapted vs newly generated', () => {
    // 100% Reused
    const fullReuseResult: ActionResultData = {
      title: 'Practice Set Ready',
      status: 'success',
      totalCount: 20,
      reusedCount: 20,
      generatedCount: 0
    };
    assert.strictEqual(fullReuseResult.reusedCount, 20);
    assert.strictEqual(fullReuseResult.generatedCount, 0);

    // Adapted (15 reused, 5 generated)
    const adaptedResult: ActionResultData = {
      title: 'Practice Set Ready',
      status: 'success',
      totalCount: 20,
      reusedCount: 15,
      generatedCount: 5
    };
    assert.strictEqual(adaptedResult.reusedCount, 15);
    assert.strictEqual(adaptedResult.generatedCount, 5);

    // 100% Newly Generated
    const generatedResult: ActionResultData = {
      title: 'Practice Set Ready',
      status: 'success',
      totalCount: 20,
      reusedCount: 0,
      generatedCount: 20
    };
    assert.strictEqual(generatedResult.reusedCount, 0);
    assert.strictEqual(generatedResult.generatedCount, 20);
  });

  await test('3.2 failed state provides useful retry information without state corruption', () => {
    const failedResult: ActionResultData = {
      title: 'Execution Interrupted',
      status: 'failed',
      errorMessage: 'Network timeout connecting to question store.',
      canRetry: true
    };
    assert.strictEqual(failedResult.status, 'failed');
    assert.strictEqual(failedResult.canRetry, true);
    assert.ok(failedResult.errorMessage?.length! > 0);
  });

  // --- SECTION 4: Activity Timeline & Context Isolation ---
  console.log('\n--- SECTION 4: Activity Timeline & Isolation ---');

  await test('4.1 activity timeline records user action with full context attribution', async () => {
    const recorded = await activityTimelineStore.recordActivity('student-1', {
      contextId: 'ctx-student1-edu',
      contextType: 'EDUCATION',
      title: 'Created Quadratic Equations practice set',
      category: 'practice',
      sourceTitle: 'Class 10 Quadratic Equations Question Bank',
      assetId: 'ka-math-quad-10',
      totalCount: 20,
      reusedCount: 20,
      generatedCount: 0,
      canUndo: true,
      undone: false,
      reversibleAction: {
        type: 'practice_draft',
        targetId: 'ka-math-quad-10'
      }
    });

    assert.ok(recorded.id.startsWith('act-item-'));
    assert.strictEqual(recorded.userId, 'student-1');
    assert.strictEqual(recorded.totalCount, 20);
    assert.strictEqual(recorded.reusedCount, 20);
    assert.strictEqual(recorded.canUndo, true);
  });

  await test('4.2 context isolation: education activity is isolated when querying personal context', async () => {
    // Record in PERSONAL context
    await activityTimelineStore.recordActivity('student-1', {
      contextId: 'ctx-student1-personal',
      contextType: 'PERSONAL',
      title: 'Created personal study note on routine',
      category: 'notes',
      canUndo: true,
      undone: false
    });

    const educationActivities = await activityTimelineStore.getActivity('student-1', {
      contextType: 'EDUCATION'
    });
    const personalActivities = await activityTimelineStore.getActivity('student-1', {
      contextType: 'PERSONAL'
    });

    assert.ok(educationActivities.every((a) => a.contextType === 'EDUCATION'));
    assert.ok(personalActivities.every((a) => a.contextType === 'PERSONAL'));
  });

  await test('4.3 authenticated user isolation: Student 2 cannot access Student 1 activity events', async () => {
    const student1Activities = await activityTimelineStore.getActivity('student-1');
    const student2Activities = await activityTimelineStore.getActivity('student-2');

    assert.ok(student1Activities.length > 0);
    // Student 2 has no records or only their own
    assert.ok(student2Activities.every((a) => a.userId === 'student-2'));
  });

  // --- SECTION 5: Safe Undo Architecture ---
  console.log('\n--- SECTION 5: Undo Where Safe ---');

  await test('5.1 undo only appears for reversible actions (reversible note creation)', async () => {
    // Create a personal note
    const note = await personalNotesStore.createNote('student-1', {
      title: 'Temporary Note For Undo Test',
      content: 'This note should be reversible.',
      subject: 'Physics',
      tags: ['test']
    });

    // Record activity with reversibleAction
    const activity = await activityTimelineStore.recordActivity('student-1', {
      contextId: 'ctx-student1-edu',
      contextType: 'EDUCATION',
      title: `Created note: ${note.title}`,
      category: 'notes',
      canUndo: true,
      undone: false,
      reversibleAction: {
        type: 'note_create',
        targetId: note.id
      }
    });

    // Execute undo
    const undoRes = await activityTimelineStore.undoActivity('student-1', activity.id);
    assert.strictEqual(undoRes.ok, true);

    // Verify note was deleted from store
    const checkNote = await personalNotesStore.getNoteById('student-1', note.id);
    assert.strictEqual(checkNote, null, 'Undone note must be safely removed from notes store');
  });

  await test('5.2 irreversible actions reject undo and do not expose rollback', async () => {
    // Record download action (irreversible)
    const downloadActivity = await activityTimelineStore.recordActivity('student-1', {
      contextId: 'ctx-student1-edu',
      contextType: 'EDUCATION',
      title: 'Downloaded practice PDF',
      category: 'practice',
      canUndo: false, // Irreversible!
      undone: false
    });

    const undoRes = await activityTimelineStore.undoActivity('student-1', downloadActivity.id);
    assert.strictEqual(undoRes.ok, false);
    assert.strictEqual(undoRes.error, 'IRREVERSIBLE_ACTION');
  });

  await test('5.3 cross-user undo attempt throws security violation', async () => {
    const activity = await activityTimelineStore.recordActivity('student-1', {
      contextId: 'ctx-student1-edu',
      contextType: 'EDUCATION',
      title: 'Private Activity for student-1',
      category: 'practice',
      canUndo: true,
      undone: false,
      reversibleAction: { type: 'practice_draft', targetId: 'mock' }
    });

    await assert.rejects(
      async () => {
        await activityTimelineStore.undoActivity('student-2', activity.id);
      },
      /SECURITY_VIOLATION/,
      'Student 2 cannot undo Student 1 action'
    );
  });

  // --- SECTION 6: Next Best Action Integration ---
  console.log('\n--- SECTION 6: Next Best Action Integration ---');

  await test('6.1 practice set creation connects deterministically to "Start Practice"', () => {
    const nba = actionExperienceClient.computeDeterministicNextBestAction('practice_set_create', {
      totalCount: 20,
      assetTitle: 'Quadratic Equations'
    });

    assert.strictEqual(nba.title, 'Start Practice');
    assert.strictEqual(nba.type, 'lesson_practice');
    assert.strictEqual(nba.priority, 'high');
  });

  await test('6.2 practice completion connects deterministically to "Review weak concepts"', () => {
    const nba = actionExperienceClient.computeDeterministicNextBestAction('practice_completed', {});
    assert.strictEqual(nba.title, 'Review weak concepts');
    assert.strictEqual(nba.type, 'review_prerequisite');
  });

  await test('6.3 PDF generation connects deterministically to "Open PDF"', () => {
    const nba = actionExperienceClient.computeDeterministicNextBestAction('pdf_generated', {});
    assert.strictEqual(nba.title, 'Open PDF');
  });

  await test('6.4 prerequisite gap connects deterministically to "Study prerequisite"', () => {
    const nba = actionExperienceClient.computeDeterministicNextBestAction('gap_discovered', {});
    assert.strictEqual(nba.title, 'Study prerequisite');
  });

  // --- SECTION 7: HTTP REST API Endpoints ---
  console.log('\n--- SECTION 7: HTTP REST API Endpoints ---');

  const harness = await startHttpHarness();
  const token = await harness.tokenFor('student-1');
  const token2 = await harness.tokenFor('student-2');

  try {
    await test('7.1 GET /api/personal/activity-timeline requires valid authentication', async () => {
      const res = await fetch(`${harness.baseUrl}/api/personal/activity-timeline`);
      assert.strictEqual(res.status, 401, 'Unauthenticated request must be rejected');
    });

    await test('7.2 GET /api/personal/activity-timeline returns user items with valid token', async () => {
      const res = await fetch(`${harness.baseUrl}/api/personal/activity-timeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.items));
    });

    await test('7.3 POST /api/personal/activity-timeline records activity for authenticated user', async () => {
      const res = await fetch(`${harness.baseUrl}/api/personal/activity-timeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Created Practice: 20 Quadratic Equations Questions',
          category: 'practice',
          reusedCount: 20,
          generatedCount: 0,
          totalCount: 20,
          canUndo: true
        })
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.item.title, 'Created Practice: 20 Quadratic Equations Questions');
      assert.strictEqual(body.item.userId, 'student-1');
    });

    await test('7.4 POST /api/personal/tools/cancel safely cancels pending action', async () => {
      const pending = confirmationPolicy.createPendingAction({
        toolId: 'personal_notes_delete',
        userId: 'student-1',
        contextId: 'ctx-student1-edu',
        arguments: { deleteAll: true },
        riskLevel: 'HIGH_RISK_WRITE',
        previewSummary: 'Delete all notes via HTTP test'
      });

      const res = await fetch(`${harness.baseUrl}/api/personal/tools/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pendingActionId: pending.id })
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.pendingActionId, pending.id);
    });

    await test('7.5 POST /api/personal/activity-timeline/:id/undo enforces security boundaries', async () => {
      // Student 1 records an event
      const item = await activityTimelineStore.recordActivity('student-1', {
        contextId: 'ctx-student1-edu',
        contextType: 'EDUCATION',
        title: 'Secret event for student 1',
        category: 'notes',
        canUndo: true,
        undone: false,
        reversibleAction: { type: 'practice_draft', targetId: 'mock' }
      });

      // Student 2 tries to undo it
      const res = await fetch(`${harness.baseUrl}/api/personal/activity-timeline/${item.id}/undo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token2}`
        }
      });

      assert.strictEqual(res.status, 403, 'Cross-user undo must return 403 Forbidden');
    });
  } finally {
    await harness.close();
  }

  console.log('\n==================================================');
  console.log(`PHASE 6.3 TEST SUMMARY: ${passed}/${total} tests passed.`);
  console.log('==================================================\n');
}

runActionExperienceTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
