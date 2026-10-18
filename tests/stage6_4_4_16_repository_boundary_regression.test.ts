import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sessionStore } from '../server/session/sessionStore.ts';
import { EducationStore } from '../server/sectors/education/educationStore.ts';
import {
  jarvisData,
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { authorizationPolicy } from '../server/auth/authorizationPolicy.ts';
import type { AuthenticatedPrincipal } from '../server/auth/principal.ts';
import type { EducationClass } from '../src/types/education.ts';

async function runRepositoryBoundaryRegressionTests() {
  console.log('=== [STAGE 6.4.4.16] REPOSITORY BOUNDARY REGRESSION TESTS ===\n');

  const isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-repo-boundary-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'repo-boundary-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed();
  setActiveRepository(isolatedRepo);

  try {

  // ---------------------------------------------------------------------------
  // 1. Session Creation & Continuity
  // ---------------------------------------------------------------------------
  console.log('--- 1. Session Creation & Dual Sync/Async Parity ---');
  {
    const testSessionId = `test-session-${Date.now()}`;
    // Synchronous access
    const sessionSync = sessionStore.getOrCreateSession(testSessionId, 'ws-stark-core', 'user-tony');
    assert.strictEqual(sessionSync.id, testSessionId);
    assert.ok(Array.isArray(sessionSync.messages));

    // Asynchronous await
    const sessionAsync = await sessionStore.getOrCreateSession(testSessionId, 'ws-stark-core', 'user-tony');
    assert.strictEqual(sessionAsync.id, testSessionId);
    assert.strictEqual(sessionAsync.messages.length, 0);
    console.log('  [PASS] Session created with both sync and async return parity');
  }

  // ---------------------------------------------------------------------------
  // 2. Message Append, Retrieval, and 60-Message Pruning Limit
  // ---------------------------------------------------------------------------
  console.log('--- 2. Message Append, Retrieval, and 60-Message Pruning ---');
  {
    const testSessionId = `prune-session-${Date.now()}`;
    sessionStore.getOrCreateSession(testSessionId);

    // Append 75 messages sequentially
    for (let i = 1; i <= 75; i++) {
      const msg = sessionStore.addMessage(testSessionId, 'user', `Message number ${i}`);
      assert.strictEqual(msg.content, `Message number ${i}`);
      assert.ok(msg.id.startsWith('msg-'));
    }

    // Retrieve all messages without limit
    const allMessages = sessionStore.getMessages(testSessionId);
    assert.strictEqual(allMessages.length, 60, 'Messages must be capped at 60 via pruning');
    assert.strictEqual(allMessages[0].content, 'Message number 16', 'First message should be message 16 due to sliding window');
    assert.strictEqual(allMessages[59].content, 'Message number 75', 'Last message should be message 75');

    // Retrieve with limit = 10
    const limited = sessionStore.getMessages(testSessionId, 10);
    assert.strictEqual(limited.length, 10);
    assert.strictEqual(limited[9].content, 'Message number 75');

    // Async await retrieval parity
    const asyncMsgs = await sessionStore.getMessages(testSessionId, 5);
    assert.strictEqual(asyncMsgs.length, 5);
    assert.strictEqual(asyncMsgs[4].content, 'Message number 75');
    console.log('  [PASS] Appended 75 messages; strictly pruned to 60 with correct order and limits');
  }

  // ---------------------------------------------------------------------------
  // 3. Session Clearing & Active Session Count
  // ---------------------------------------------------------------------------
  console.log('--- 3. Session Clearing & Active Session Count ---');
  {
    const clearSessionId = `clear-session-${Date.now()}`;
    sessionStore.getOrCreateSession(clearSessionId);
    sessionStore.addMessage(clearSessionId, 'user', 'Will be cleared');

    const beforeMsgs = sessionStore.getMessages(clearSessionId);
    assert.strictEqual(beforeMsgs.length, 1);

    const activeCountBefore = sessionStore.getActiveSessionCount();
    assert.ok(activeCountBefore >= 1);

    const clearResult = sessionStore.clearSession(clearSessionId);
    assert.strictEqual(clearResult.success, true);
    await clearResult; // Await promise part

    const afterMsgs = sessionStore.getMessages(clearSessionId);
    assert.strictEqual(afterMsgs.length, 0);

    const asyncCount = await sessionStore.getActiveSessionCountAsync();
    assert.ok(asyncCount >= 1);
    console.log('  [PASS] Session cleared and active count reported correctly');
  }

  // ---------------------------------------------------------------------------
  // 4. Education Data Operations
  // ---------------------------------------------------------------------------
  console.log('--- 4. Education Data Operations via EducationStore ---');
  {
    const eduStore = new EducationStore();

    // Classes retrieval
    const classes = eduStore.getClasses();
    assert.ok(Array.isArray(classes));
    assert.ok(classes.length > 0);

    const physClass = eduStore.getClass('class-phys-301');
    assert.ok(physClass, 'Phys-301 class should exist');
    assert.strictEqual(physClass?.code, 'PHYS-301');

    // Units and lessons
    const units = eduStore.getUnits('class-phys-301');
    assert.ok(units.length > 0);
    const unit1 = eduStore.getUnit('class-phys-301', units[0].id);
    assert.ok(unit1);
    assert.strictEqual(unit1?.id, units[0].id);

    if (unit1 && unit1.lessons.length > 0) {
      const lesson1 = eduStore.getLesson('class-phys-301', unit1.id, unit1.lessons[0].id);
      assert.ok(lesson1);
      assert.strictEqual(lesson1?.id, unit1.lessons[0].id);

      // Toggle lesson completion
      const initialCompleted = !!lesson1?.isCompleted;
      eduStore.toggleLessonCompletion('class-phys-301', unit1.id, lesson1!.id, !initialCompleted);
      const updatedLesson = eduStore.getLesson('class-phys-301', unit1.id, lesson1!.id);
      assert.strictEqual(updatedLesson?.isCompleted, !initialCompleted);

      // Toggle back
      eduStore.toggleLessonCompletion('class-phys-301', unit1.id, lesson1!.id, initialCompleted);
    }

    // Assignments
    const assignments = eduStore.getAssignments('class-phys-301');
    assert.ok(Array.isArray(assignments));

    const newAssignment = eduStore.createAssignment({
      classId: 'class-phys-301',
      title: 'Boundary Refactor Practice',
      description: 'Exercise for repository isolation',
      instructions: 'Complete repository boundary exercises.',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 100
    });
    assert.strictEqual(newAssignment.title, 'Boundary Refactor Practice');
    assert.strictEqual(newAssignment.maxScore, 100);

    const retrievedAssignment = eduStore.getAssignment(newAssignment.id);
    assert.ok(retrievedAssignment);
    assert.strictEqual(retrievedAssignment?.id, newAssignment.id);

    // Submissions
    const submission = eduStore.createOrUpdateSubmission({
      assignmentId: newAssignment.id,
      studentId: 'student-1',
      studentName: 'Peter Parker',
      content: 'Boundary refactor solution submission',
      attachments: []
    });
    assert.ok(submission.id);
    assert.strictEqual(submission.studentId, 'student-1');
    assert.strictEqual(submission.status, 'submitted');

    // Grade submission
    const graded = eduStore.gradeSubmission(submission.id, 98, 'Excellent architectural precision!');
    assert.strictEqual(graded?.grade, 98);
    assert.strictEqual(graded?.status, 'graded');

    // Knowledge Space & Grounded Query
    const spaces = eduStore.getKnowledgeSpaces();
    assert.ok(spaces.length > 0);
    const firstSpace = spaces[0];

    const groundedQuery = eduStore.queryGrounded(firstSpace.id, 'quantum physics assertions');
    assert.strictEqual(groundedQuery.spaceId, firstSpace.id);
    assert.ok(typeof groundedQuery.answer === 'string');
    assert.ok(Array.isArray(groundedQuery.citations));
    console.log('  [PASS] Education store classes, units, assignments, submissions, and knowledge queries verified');
  }

  // ---------------------------------------------------------------------------
  // 5. Institutional Authorization & Membership Verification
  // ---------------------------------------------------------------------------
  console.log('--- 5. Institutional Authorization & Membership Checks ---');
  {
    // Retrieve memberships using repository sub-interface
    const memberships = await jarvisData.institutions.listMemberships();
    assert.ok(Array.isArray(memberships));
    assert.ok(memberships.length > 0, 'Database should contain institution memberships');

    // Verify Principal as Elevated Institution Admin
    const principalActor: AuthenticatedPrincipal = {
      userId: 'principal-1',
      role: 'principal',
      institutionId: 'inst-stark-academy',
      provenance: 'signed-hmac'
    };

    // Verify Peter Parker as Student
    const peterActor: AuthenticatedPrincipal = {
      userId: 'student-1',
      role: 'student',
      institutionId: 'inst-stark-academy',
      provenance: 'signed-hmac'
    };

    const targetClass: EducationClass = {
      id: 'class-phys-301',
      name: 'Advanced Quantum & Electrodynamics',
      code: 'PHYS-301',
      department: 'Physics',
      institutionId: 'inst-stark-academy',
      instructorId: 'teacher-1',
      instructorName: 'Dr. Bruce Banner',
      studentIds: ['student-1'],
      schedule: 'Mon, Wed, Fri',
      room: 'Lab 4',
      studentCount: 24,
      assignmentsCount: 4,
      averageGrade: 88,
      status: 'active'
    };

    // Principal can read and manage
    const principalReadDecision = authorizationPolicy.canReadClass(principalActor, targetClass, memberships);
    assert.strictEqual(principalReadDecision.allowed, true);

    const principalWriteDecision = authorizationPolicy.canManageClass(principalActor, targetClass, memberships);
    assert.strictEqual(principalWriteDecision.allowed, true);

    // Student can read enrolled class
    const peterReadDecision = authorizationPolicy.canReadClass(peterActor, targetClass, memberships);
    assert.strictEqual(peterReadDecision.allowed, true);

    // Student cannot manage class
    const peterWriteDecision = authorizationPolicy.canManageClass(peterActor, targetClass, memberships);
    assert.strictEqual(peterWriteDecision.allowed, false);
    assert.ok(peterWriteDecision.reason?.includes('instructor'));
    console.log('  [PASS] Institutional authorization policy successfully enforced with typed repository sub-interface');
  }

  console.log('\n=== ALL REPOSITORY BOUNDARY REGRESSION TESTS PASSED (5/5) ===\n');
  } finally {
    resetActiveRepository();
    if (isolatedTempDir && fs.existsSync(isolatedTempDir)) {
      fs.rmSync(isolatedTempDir, { recursive: true, force: true });
    }
  }
}

runRepositoryBoundaryRegressionTests().catch((err) => {
  console.error('[FAIL] Repository Boundary Regression Test Failed:', err);
  process.exit(1);
});
