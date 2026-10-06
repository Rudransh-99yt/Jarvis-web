// JARVIS EDUCATION OS — PHASE D.6: TEACHER OPERATING SYSTEM TEST SUITE
// Verifies Action Queue, ClassSession Teaching Anchor, Evidence-Based Attention Signals, Post-Class Review, and Class Intelligence.

import { teacherService } from '../server/sectors/education/teacher/teacherService.ts';
import { classSessionStore } from '../server/sectors/education/classSessions/classSessionStore.ts';
import { classSessionPolicy } from '../server/sectors/education/classSessions/classSessionPolicy.ts';
import { educationStore } from '../server/sectors/education/educationStore.ts';
import type { User } from '../server/data/types.ts';

import { authService } from '../server/auth/tokens.ts';
async function runTeacherOsTests() {
  console.log('===================================================================');
  console.log(' JARVIS EDUCATION OS — PHASE D.6 TEACHER OPERATING SYSTEM TESTS');
  console.log('===================================================================');

  let passed = 0;
  const assert = (condition: boolean, name: string) => {
    if (!condition) {
      console.error(`[FAIL] ${name}`);
      throw new Error(`Test assertion failed: ${name}`);
    }
    console.log(`[PASS] ${name}`);
    passed++;
  };

  const mockTeacher: User = {
    id: 'teacher-1',
    displayName: 'Dr. Helen Cho',
    email: 'h.cho@starkacademy.edu',
    role: 'teacher',
    department: 'Faculty of Physics',
    createdAt: new Date().toISOString()
  };

  const mockStudent: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'a.chen@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  classSessionStore.resetToDefaults();

  // --- SECTION 1: Teacher Action Queue Derivation ---
  console.log('\n--- SECTION 1: Teacher Action Queue Derivation ---');
  const actionQueue = teacherService.getActionQueue(mockTeacher.id);

  assert(Array.isArray(actionQueue), '1.1 Action queue returns array of actionable items');
  assert(actionQueue.length > 0, '1.1.b Action queue contains actionable work items');

  // Verify item schema and canonical linkage
  const firstItem = actionQueue[0];
  assert(!!firstItem.id, '1.2 Action queue item has unique id');
  assert(!!firstItem.type, '1.2.b Action queue item has explicit type');
  assert(['urgent', 'high', 'medium', 'low'].includes(firstItem.priority), '1.2.c Priority is canonical scale');
  assert(!!firstItem.courseCode, '1.2.d Item includes academic context courseCode');
  assert(!!firstItem.entityId, '1.2.e Item links directly to canonical source entityId');
  assert(!!firstItem.actionLabel, '1.2.f Item specifies direct actionLabel');
  assert(!!firstItem.actionTarget, '1.2.g Item specifies deep page actionTarget');

  // Verify priority sorting (urgent > high > medium > low)
  const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  let isSorted = true;
  for (let i = 0; i < actionQueue.length - 1; i++) {
    if (priorityWeight[actionQueue[i].priority] < priorityWeight[actionQueue[i + 1].priority]) {
      isSorted = false;
      break;
    }
  }
  assert(isSorted, '1.3 Action queue is deterministically sorted by priority descending');

  // Verify presence of grading tasks
  const gradingTasks = actionQueue.filter((i) => i.type === 'grading');
  assert(gradingTasks.length > 0, '1.4 Action queue aggregates pending assignment submissions');
  assert(gradingTasks[0].actionTarget === 'teacher_review', '1.4.b Grading action targets deep teacher_review surface');

  // --- SECTION 2: ClassSession Teaching Anchor & Lifecycle ---
  console.log('\n--- SECTION 2: ClassSession Teaching Anchor & Lifecycle ---');
  const sessions = classSessionStore.listSessionsSync();
  assert(sessions.length > 0, '2.1 Initial ClassSessions present in store');

  const anchorSession = sessions[0];
  assert(anchorSession.courseCode === 'PHYS-301', '2.2 Seeded teaching anchor is PHYS-301');
  assert(anchorSession.status === 'APPROVED', '2.3 Seeded session is APPROVED and ready for classroom');
  assert(anchorSession.lessonPlan !== undefined, '2.4 Anchor session contains structured lesson plan');
  assert(anchorSession.presentation !== undefined, '2.5 Anchor session contains interactive slide presentation');
  assert(anchorSession.quiz !== undefined, '2.6 Anchor session contains formative check quiz');

  // Teacher RBAC authorization check
  const teacherCanManage = await classSessionPolicy.canManageSession(mockTeacher, anchorSession, 'ws-stark-core');
  assert(teacherCanManage.allowed, '2.7 Teacher is authorized to manage and approve teaching session');

  const studentCanManage = await classSessionPolicy.canManageSession(mockStudent, anchorSession, 'ws-stark-core');
  assert(!studentCanManage.allowed && studentCanManage.statusCode === 403, '2.8 Student is forbidden from editing teacher session (403)');

  // Test session schedule transition
  const scheduledTime = new Date(Date.now() + 86400000).toISOString();
  const scheduledSession = await classSessionStore.scheduleSession(anchorSession.id, scheduledTime);
  assert(scheduledSession.status === 'SCHEDULED', '2.9 Approved session transitions to SCHEDULED state');
  assert(scheduledSession.scheduledAt === scheduledTime, '2.9.b Scheduled timestamp accurately persisted');

  // --- SECTION 3: Evidence-Based Student Attention Signals ---
  console.log('\n--- SECTION 3: Evidence-Based Student Attention Signals ---');
  const attentionSignals = teacherService.getAttentionSignals(mockTeacher.id);

  assert(Array.isArray(attentionSignals) && attentionSignals.length >= 3, '3.1 Attention signals aggregated across cohorts');

  const practiceDiff = attentionSignals.find((s) => s.signalType === 'practice_difficulty');
  assert(practiceDiff !== undefined, '3.2 Practice difficulty signal detected');
  assert(practiceDiff!.studentName === 'Maya Lin', '3.2.b Identifies affected student neutrally');
  assert(practiceDiff!.evidenceSnippet.length > 0, '3.2.c Signal includes verifiable evidence snippet');
  assert(practiceDiff!.title === 'Practice difficulty detected', '3.2.d Uses neutral, non-judgmental title');

  const missedWork = attentionSignals.find((s) => s.signalType === 'missed_work');
  assert(missedWork !== undefined, '3.3 Missed work signal detected');
  assert(missedWork!.title === 'Missed work', '3.3.b Uses neutral "Missed work" phrasing without labeling');
  assert(missedWork!.suggestedAction.length > 0, '3.3.c Includes grounded suggested faculty action');

  // Filter signals by classId
  const physSignals = teacherService.getAttentionSignals(mockTeacher.id, 'class-phys-301');
  assert(physSignals.every((s) => s.classId === 'class-phys-301'), '3.4 Filter attention signals by classId returns strictly class-scoped signals');

  // --- SECTION 4: Evidence-Grounded Post-Class Review ---
  console.log('\n--- SECTION 4: Evidence-Grounded Post-Class Review ---');
  const postClassReport = teacherService.getPostClassReview(anchorSession.id);

  assert(postClassReport.sessionId === anchorSession.id, '4.1 Post-class report generated for target session');
  assert(postClassReport.durationMinutes === 45, '4.2 Preserves delivered session duration');
  assert(postClassReport.participationRate > 0, '4.3 Includes cadet participation rate');
  assert(postClassReport.quizAccuracy > 0, '4.4 Includes formative quiz pulse accuracy');
  assert(postClassReport.completedWorkedExamples.length > 0, '4.5 Captures completed worked physical examples');
  assert(postClassReport.addressedMisconceptions.length > 0, '4.6 Captures addressed student misconceptions');

  // Grounded Next Actions
  assert(postClassReport.groundedNextActions.length >= 3, '4.7 Generates grounded next teaching actions');
  const reteachAction = postClassReport.groundedNextActions.find((a) => a.type === 'reteach');
  assert(reteachAction !== undefined, '4.7.b Includes reteach action grounded in formative quiz accuracy');
  assert(reteachAction!.reason.includes('quiz question'), '4.7.c Reteach action explicitly references quiz evidence');

  const prepAction = postClassReport.groundedNextActions.find((a) => a.type === 'prep');
  assert(prepAction !== undefined, '4.8 Includes next lesson preparation recommendation');
  assert(prepAction!.actionTarget === 'teacher_session_prep', '4.8.b Prep action links to teacher_session_prep');

  // --- SECTION 5: Dedicated Class Intelligence ---
  console.log('\n--- SECTION 5: Dedicated Class Intelligence ---');
  const intelligence = teacherService.getClassIntelligence('class-phys-301');

  assert(intelligence.classId === 'class-phys-301', '5.1 Class intelligence resolved for PHYS-301');
  assert(intelligence.courseCode === 'PHYS-301', '5.2 Returns correct courseCode');
  assert(intelligence.studentCount > 0, '5.3 Preserves enrolled student count');
  assert(intelligence.unitsCount > 0, '5.4 Preserves published curriculum unit count');
  assert(typeof intelligence.syllabusCompletionPercent === 'number', '5.5 Calculates syllabus coverage percentage');
  assert(intelligence.pendingGradingCount >= 0, '5.6 Computes pending grading count from canonical submissions');
  assert(intelligence.upcomingClassSession !== undefined, '5.7 Identifies upcoming ClassSession');
  assert(intelligence.recentClassSession !== undefined, '5.8 Identifies recent ClassSession');

  console.log('\n===================================================================');
  console.log(` ALL PHASE D.6 TEACHER OS TESTS PASSED! (${passed}/${passed} ASSERTIONS)`);
  console.log('===================================================================');
}

runTeacherOsTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
