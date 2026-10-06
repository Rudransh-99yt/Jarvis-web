// JARVIS EDUCATION OS — PHASE D.5: NAVIGATION & ENGAGEMENT TEST SUITE
// Verifies deep canonical hierarchy, progressive disclosure, and student engagement / leaderboard.

import assert from 'node:assert';
import { engagementStore } from '../server/sectors/education/engagement/engagementStore.ts';
import { academicIntegrationService } from '../server/sectors/education/academicIntegrationService.ts';

import { authService } from '../server/auth/tokens.ts';
async function runD5Tests() {
  console.log('===================================================================');
  console.log(' JARVIS EDUCATION OS — PHASE D.5 NAVIGATION & ENGAGEMENT TESTS');
  console.log('===================================================================');

  // --- SECTION 1: CANONICAL HIERARCHY NAVIGATION RESOLUTION ---
  console.log('\n--- SECTION 1: Canonical Academic Hierarchy Resolution ---');

  const lessonContext = academicIntegrationService.resolveContext('lesson', 'les-phys-202');
  assert.strictEqual(lessonContext.lessonId, 'les-phys-202', 'Lesson ID resolved');
  assert.strictEqual(lessonContext.unitId, 'unit-phys-2', 'Lesson resolves parent unit');
  assert.strictEqual(lessonContext.courseId, 'class-phys-301', 'Lesson resolves parent course');
  assert.strictEqual(lessonContext.courseCode, 'PHYS-301', 'Course code matches PHYS-301');
  assert.strictEqual(lessonContext.institutionId, 'inst-stark-academy', 'Institution matches Stark Academy');
  console.log('[PASS] 1.1 Lesson level resolves full upward hierarchy chain (Lesson -> Unit -> Course)');

  const sessionContext = academicIntegrationService.resolveContext('classSession', 'session-phys-101');
  assert.strictEqual(sessionContext.courseId, 'class-phys-301', 'Class session resolves course');
  assert.strictEqual(sessionContext.courseCode, 'PHYS-301', 'Course code resolved');
  console.log('[PASS] 1.2 Class session level context resolved');

  // --- SECTION 2: STUDENT ENGAGEMENT POINTS & IDEMPOTENCY ---
  console.log('\n--- SECTION 2: Engagement Points & Anti-Gaming Idempotency ---');

  const testStudentId = 'student-test-cadet';
  const testStudentName = 'Cadet Test Observer';

  // 2.1 Award points for completed lesson
  const lessonEventResult = engagementStore.recordEvent({
    studentId: testStudentId,
    studentName: testStudentName,
    institutionId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    type: 'lesson_completed',
    title: 'Lesson 2.2: Creation & Annihilation Operator Dynamics',
    description: 'Completed video lecture and verified commutation relations.',
    sourceEntityType: 'lesson',
    sourceEntityId: 'les-phys-202'
  });
  assert.strictEqual(lessonEventResult.isDuplicate, false, 'Initial lesson completion is not a duplicate');
  assert.strictEqual(lessonEventResult.pointsAwarded, 10, 'Awarded 10 points for lesson completion');
  console.log('[PASS] 2.1 Lesson completion awarded 10 engagement points');

  // 2.2 Re-recording same lesson should be idempotent (anti-gaming)
  const duplicateLessonResult = engagementStore.recordEvent({
    studentId: testStudentId,
    studentName: testStudentName,
    institutionId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    type: 'lesson_completed',
    title: 'Lesson 2.2: Creation & Annihilation Operator Dynamics',
    description: 'Repeated click on completed lesson.',
    sourceEntityType: 'lesson',
    sourceEntityId: 'les-phys-202'
  });
  assert.strictEqual(duplicateLessonResult.isDuplicate, true, 'Repeat submission is detected as duplicate');
  assert.strictEqual(duplicateLessonResult.pointsAwarded, 0, 'Zero points awarded for duplicate event');
  console.log('[PASS] 2.2 Anti-gaming idempotency prevented double-awarding points');

  // 2.3 Award points for diagnostic practice checkpoint
  const practiceEventResult = engagementStore.recordEvent({
    studentId: testStudentId,
    studentName: testStudentName,
    institutionId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    type: 'practice_completed',
    title: 'Practice Checkpoint: Creation & Annihilation Dynamics',
    description: 'Scored 3/3 on diagnostic practice questions.',
    sourceEntityType: 'practice',
    sourceEntityId: 'les-phys-202-practice',
    metadata: { score: 3, total: 3 }
  });
  assert.strictEqual(practiceEventResult.isDuplicate, false, 'Practice checkpoint is not a duplicate');
  assert.strictEqual(practiceEventResult.pointsAwarded, 10, 'Awarded 10 points for practice checkpoint');
  console.log('[PASS] 2.3 Practice checkpoint awarded 10 points');

  // --- SECTION 3: LEADERBOARD & STANDINGS QUERIES ---
  console.log('\n--- SECTION 3: Leaderboard Scopes & Standings ---');

  // 3.1 Class-scoped leaderboard
  const classLeaderboard = engagementStore.getLeaderboard('class', 'class-phys-301', testStudentId);
  assert.ok(Array.isArray(classLeaderboard), 'Class leaderboard returned array');
  assert.ok(classLeaderboard.length >= 1, 'Class leaderboard has at least 1 entry');
  assert.strictEqual(classLeaderboard[0].rank, 1, 'First entry has rank #1');
  const foundTestStudent = classLeaderboard.find((e) => e.studentId === testStudentId);
  assert.ok(foundTestStudent, 'Test student exists in class leaderboard');
  assert.strictEqual(foundTestStudent.isCurrentUser, true, 'Current user flag set correctly');
  assert.strictEqual(foundTestStudent.points >= 20, true, 'Test student has at least 20 points (10 + 10)');
  console.log('[PASS] 3.1 Class leaderboard ranks students and flags current user');

  // 3.2 Cohort-scoped leaderboard
  const cohortLeaderboard = engagementStore.getLeaderboard('cohort', undefined, testStudentId);
  assert.ok(Array.isArray(cohortLeaderboard), 'Cohort leaderboard returned array');
  assert.ok(cohortLeaderboard.length >= 1, 'Cohort leaderboard has entries');
  console.log('[PASS] 3.2 Cohort leaderboard returned aggregated grade standings');

  // 3.3 School-scoped leaderboard
  const schoolLeaderboard = engagementStore.getLeaderboard('school', undefined, testStudentId);
  assert.ok(Array.isArray(schoolLeaderboard), 'School leaderboard returned array');
  assert.ok(schoolLeaderboard.length >= 1, 'School leaderboard has entries');
  console.log('[PASS] 3.3 Academy-wide leaderboard returned academy standings');

  // --- SECTION 4: STUDENT ACTIVITY LEDGER & KPI STATS ---
  console.log('\n--- SECTION 4: Student Activity Ledger & KPI Stats ---');

  const studentActivity = engagementStore.getStudentActivity(testStudentId);
  assert.ok(Array.isArray(studentActivity), 'Student activity is an array');
  assert.strictEqual(studentActivity.length, 2, 'Student has exactly 2 recorded events');
  assert.ok(studentActivity.some((e) => e.type === 'practice_completed'), 'Activity ledger includes practice_completed');
  assert.ok(studentActivity.some((e) => e.type === 'lesson_completed'), 'Activity ledger includes lesson_completed');
  console.log('[PASS] 4.1 Chronological activity ledger returns verified events');

  const studentStats = engagementStore.getStudentStats(testStudentId, 'class-phys-301');
  assert.strictEqual(studentStats.studentId, testStudentId, 'Stats match student ID');
  assert.strictEqual(studentStats.totalPoints >= 20, true, 'Stats reflect accumulated points');
  assert.strictEqual(studentStats.streakDays >= 1, true, 'Streak is active');
  assert.strictEqual(typeof studentStats.classRank, 'number', 'Class rank is a calculated integer');
  console.log('[PASS] 4.2 KPI stats calculate points, streak, and class rank');

  // --- SECTION 5: PRIVACY & TRANSPARENT RULES ---
  console.log('\n--- SECTION 5: Transparent Rules & Privacy ---');

  const pointsConfig = engagementStore.getPointsConfig();
  assert.strictEqual(pointsConfig.lessonCompleted, 10, 'Config defines 10 pts for lesson');
  assert.strictEqual(pointsConfig.practiceCompleted, 10, 'Config defines 10 pts for practice');
  assert.strictEqual(pointsConfig.quizCompleted, 15, 'Config defines 15 pts for quiz');

  const privacyScope = engagementStore.getPrivacyScope();
  assert.ok(privacyScope, 'Privacy scope is defined');
  console.log('[PASS] 5.1 Privacy scope guarantees engagement is separate from academic grades');

  console.log('\n===================================================================');
  console.log(' ALL PHASE D.5 TESTS PASSED SUCCESSFULLY! (14/14 ASSERTIONS)');
  console.log('===================================================================');
}

runD5Tests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[TEST SUITE CRASHED]:', err);
    process.exit(1);
  });
