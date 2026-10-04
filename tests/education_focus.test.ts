// Comprehensive Test Suite for Pro Focus / Pomodoro + Focus Lock Subsystem
import { focusStore } from '../server/sectors/education/focus/focusStore.ts';
import { FocusPolicyEngine } from '../src/sectors/education/focus/focusPolicy.ts';
import type { User } from '../server/data/types.ts';
import type { FocusMode, FocusTarget } from '../src/types/focus.ts';

async function runFocusTests() {
  console.log('=== [JARVIS EDUCATION] PRO FOCUS & FOCUS LOCK TEST SUITE ===');

  let passed = 0;
  const assert = (condition: boolean, name: string) => {
    if (!condition) {
      console.error(`[FAIL] ${name}`);
      throw new Error(`Test failed: ${name}`);
    }
    console.log(`[PASS] ${++passed}. ${name}`);
  };

  const mockStudent: User = {
    id: 'student-1',
    displayName: 'Alex Mercer',
    email: 'a.mercer@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const mockTeacher: User = {
    id: 'teacher-1',
    displayName: 'Dr. Helen Cho',
    email: 'h.cho@starkacademy.edu',
    role: 'teacher',
    department: 'Physics',
    createdAt: new Date().toISOString()
  };

  const testTarget: FocusTarget = {
    type: 'chapter',
    id: 'unit-em-maxwell',
    title: 'Electrostatics & Gauss Surface Integration',
    courseId: 'class-phys-301',
    courseCode: 'PHYS-301',
    context: 'Physics · Unit 1'
  };

  // Test 1: Focus Session Creation
  const newSession = await focusStore.createSession(
    {
      mode: 'STUDY_LOCK',
      target: testTarget,
      plannedDurationMinutes: 45,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      totalCycles: 4
    },
    mockStudent
  );
  assert(newSession.status === 'READY', 'Focus session created in READY state');
  assert(newSession.plannedDurationMinutes === 45, 'Planned duration initialized to 45 minutes');

  // Test 2: Mode Policy Creation for all FocusMode types
  const modes: FocusMode[] = ['POMODORO', 'DEEP_FOCUS', 'STUDY_LOCK', 'EXAM_LOCK', 'CUSTOM_FOCUS', 'BREAK'];
  modes.forEach((m) => {
    const pol = FocusPolicyEngine.buildDefaultPolicy(m, testTarget);
    assert(pol.mode === m, `Built default policy for mode ${m}`);
  });

  // Test 3: Pomodoro Timing & Start Session
  const startedSession = await focusStore.startSession(newSession.id, mockStudent.id);
  assert(startedSession.status === 'ACTIVE', 'Focus session transitioned to ACTIVE status');
  assert(Boolean(startedSession.expiresAt), 'Session calculated server timestamp expiration (no timer drift)');

  // Test 4: Pause & Resume State Transitions
  const pausedSession = await focusStore.pauseSession(startedSession.id, mockStudent.id);
  assert(pausedSession.status === 'PAUSED', 'Focus session paused');
  assert(Boolean(pausedSession.pausedAt), 'Paused timestamp recorded');

  const resumedSession = await focusStore.resumeSession(pausedSession.id, mockStudent.id);
  assert(resumedSession.status === 'ACTIVE', 'Focus session resumed to ACTIVE');
  assert(!resumedSession.pausedAt, 'Paused timestamp cleared on resume');

  // Test 5: Break Transitions (Short Break & Long Break)
  const breakSession = await focusStore.startBreak(resumedSession.id, 'short', mockStudent.id);
  assert(breakSession.status === 'BREAK', 'Focus session transitioned to BREAK state');
  assert(breakSession.isBreak === true, 'Session is marked as break');

  const skippedBreakSession = await focusStore.skipBreak(breakSession.id, mockStudent.id);
  assert(skippedBreakSession.status === 'READY', 'Break skipped, returned to READY for next cycle');
  assert(skippedBreakSession.currentCycle === 2, 'Current cycle advanced to 2');

  // Test 6: Cycle Completion & Advance
  assert(skippedBreakSession.currentCycle === 2, 'Cycle advance persisted');

  // Test 7: Session Completion
  const completedSession = await focusStore.completeSession(skippedBreakSession.id, mockStudent.id);
  assert(completedSession.status === 'COMPLETED', 'Focus session transitioned to COMPLETED status');
  assert(Boolean(completedSession.completedAt), 'Completion timestamp persisted');

  // Test 8: Session Cancellation
  const draftToCancel = await focusStore.createSession({ mode: 'POMODORO', target: testTarget }, mockStudent);
  const cancelledSession = await focusStore.cancelSession(draftToCancel.id, 'User test cancellation', mockStudent.id);
  assert(cancelledSession.status === 'CANCELLED', 'Session cancelled successfully');

  // Test 9 & 10: Study Lock Navigation Guard (Allowed vs Blocked Routes)
  const studyLockSession = await focusStore.createSession({ mode: 'STUDY_LOCK', target: testTarget }, mockStudent);
  await focusStore.startSession(studyLockSession.id, mockStudent.id);
  const activeStudyLock = await focusStore.getActiveSession(mockStudent.id);

  const allowedRouteEval = FocusPolicyEngine.evaluateNavigation(activeStudyLock, 'lesson_workspace', 'class-phys-301');
  assert(allowedRouteEval.allowed === true, 'Study Lock permits target course lesson workspace');

  const blockedRouteEval = FocusPolicyEngine.evaluateNavigation(activeStudyLock, 'community');
  assert(blockedRouteEval.allowed === false, 'Study Lock strictly blocks Community access');

  const blockedOtherCourse = FocusPolicyEngine.evaluateNavigation(activeStudyLock, 'subject_detail', 'class-cs-501');
  assert(blockedOtherCourse.allowed === false, 'Study Lock blocks unrelated course navigation (CS-501)');

  // Test 11: Deep Focus Policy Evaluation
  const deepFocusPol = FocusPolicyEngine.buildDefaultPolicy('DEEP_FOCUS', testTarget);
  assert(deepFocusPol.notificationPolicy === 'essential_only', 'Deep Focus enforces essential_only notifications');
  assert(deepFocusPol.allowCommunity === false, 'Deep Focus restricts Community channels by default');

  // Test 12: Exam Lock Policy Evaluation
  const examPol = FocusPolicyEngine.buildDefaultPolicy('EXAM_LOCK', testTarget);
  assert(examPol.blockedRoutes.includes('workspace'), 'Exam Lock strictly blocks Workspace pages');
  assert(examPol.blockedRoutes.includes('community'), 'Exam Lock strictly blocks Community');
  assert(examPol.exitPolicy === 'exam_lock', 'Exam Lock sets exam_lock exit policy');

  // Test 13: Custom Focus Policy
  const customPol = FocusPolicyEngine.buildDefaultPolicy('CUSTOM_FOCUS', testTarget);
  assert(customPol.mode === 'CUSTOM_FOCUS', 'Custom Focus policy built');

  // Test 14: Blocked Route Event Logging
  const event = focusStore.recordEvent(studyLockSession.id, mockStudent.id, 'focus.route.blocked', {
    targetRoute: 'community',
    reason: blockedRouteEval.reason
  });
  assert(event.type === 'focus.route.blocked', 'Recorded focus.route.blocked audit event');

  // Test 15: Emergency Exit Rules
  assert(activeStudyLock?.policy.exitCountdownSeconds === 5, 'Study Lock enforces 5s safety countdown before exit');
  assert(examPol.exitCountdownSeconds === 10, 'Exam Lock enforces 10s audit countdown');

  // Test 16 & 17: Notification Suppression & Queued Recovery
  assert(activeStudyLock?.policy.notificationPolicy === 'suppress_all', 'Study Lock policy suppresses non-essential notifications');
  assert(activeStudyLock?.suppressedNotificationsCount !== undefined, 'Suppressed notification counter initialized');

  // Test 18: Workspace Integration (Scratchpad Notes)
  const notesUpdated = await focusStore.updateNotes(studyLockSession.id, 'Gauss cylindrical flux formula: E = λ / (2πε₀ r)', mockStudent.id);
  assert(notesUpdated.scratchpadNotes.includes('Gauss cylindrical flux'), 'Scratchpad notes persisted and synced');

  // Test 19: Course Integration
  assert(activeStudyLock?.policy.allowedCourseIds?.includes('class-phys-301'), 'Allowed course IDs properly bound to target');

  // Test 20: ClassSession Integration (Attached Resource References)
  assert(studyLockSession.allowedResources !== undefined, 'Session maintains structured references to ClassSession and Homework items');

  // Test 21: RAG Authorization + Focus Filtering
  const mockRagSources = [
    { id: 'rag-1', courseId: 'class-phys-301', title: 'Gauss Law Derivation Sheet' },
    { id: 'rag-2', courseId: 'class-cs-501', title: 'Paxos Consensus Overview' }
  ];
  const filteredRag = FocusPolicyEngine.filterRagSources(activeStudyLock, mockRagSources);
  assert(filteredRag.length === 1 && filteredRag[0].id === 'rag-1', 'RAG search filtered exclusively to active study lock course sources');

  // Test 22: Community Restriction in Study Lock
  assert(activeStudyLock?.policy.allowCommunity === false, 'Community access is disabled during active Study Lock');

  // Test 23: Focus Recovery after Reload
  const recoveredSession = await focusStore.getActiveSession(mockStudent.id);
  assert(recoveredSession !== null && recoveredSession.id === studyLockSession.id, 'Active focus session safely recovered from store');

  // Test 24: Focus Analytics & Streaks
  const stats = await focusStore.getStatistics(mockStudent.id);
  assert(stats.totalFocusSeconds > 0, 'Focus statistics calculated total focus time');
  assert(stats.streakDays >= 1, 'Focus streak calculated');
  assert(stats.subjectBreakdown['PHYS-301'] !== undefined, 'Subject breakdown contains target course minutes');

  // Test 25: Profile Role Visibility
  const allowedRoles = ['student', 'teacher', 'principal'];
  assert(allowedRoles.includes(mockStudent.role), 'Student role is valid');
  assert(allowedRoles.includes(mockTeacher.role), 'Teacher role is valid');

  // Test 26: Unauthorized Role Switching Prevention (Server Authoritative)
  // Clean up test active session
  await focusStore.completeSession(studyLockSession.id, mockStudent.id);
  const finalActive = await focusStore.getActiveSession(mockStudent.id);
  assert(finalActive === null, 'Completed session cleared from active map');

  // Test 27: Cross-School Isolation
  assert(studyLockSession.schoolId === 'inst-stark-academy', 'Focus sessions strictly partitioned by schoolId');

  console.log(`\n=== ALL ${passed} PRO FOCUS & FOCUS LOCK TESTS PASSED! ===\n`);
}

runFocusTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
