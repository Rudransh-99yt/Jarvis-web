// JARVIS EDUCATION OS — PHASE D.7: FAMILY, PRINCIPAL & INSTITUTIONAL INTELLIGENCE TEST SUITE
// Verifies Multi-Role RBAC Privacy Boundaries, Family Intelligence, Grade Intelligence, Faculty Projections, and Principal AI Command Execution with Audit Trails.

import { familyService } from '../server/sectors/education/family/familyService.ts';
import { institutionalService } from '../server/sectors/education/institutional/institutionalService.ts';
import { educationStore } from '../server/sectors/education/educationStore.ts';
import { classSessionStore } from '../server/sectors/education/classSessions/classSessionStore.ts';
import { jarvisData } from '../server/data/index.ts';
import type { User } from '../server/data/types.ts';

import { authService } from '../server/auth/tokens.ts';
async function runD7InstitutionalFamilyTests() {
  console.log('===================================================================');
  console.log(' JARVIS EDUCATION OS — PHASE D.7 INSTITUTIONAL & FAMILY TESTS');
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

  const principalUser: User = {
    id: 'principal-1',
    displayName: 'Dean Alistair Vance',
    email: 'a.vance@stark.edu',
    role: 'principal',
    department: 'Office of the Dean',
    createdAt: '2026-09-01T08:00:00.000Z'
  };

  const studentUser: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'alex.chen@stark.edu',
    role: 'student',
    department: 'Autonomous Robotics',
    createdAt: '2026-09-01T08:00:00.000Z'
  };

  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Sarah',
    email: 'sarah.quantum@stark.edu',
    role: 'teacher',
    department: 'Theoretical Physics',
    createdAt: '2026-09-01T08:00:00.000Z'
  };

  // --- SECTION 1: ROLE SECURITY & MULTI-ROLE AUTHORIZATION BOUNDARIES ---
  console.log('\n--- SECTION 1: Role Security & Multi-Role Authorization Boundaries ---');
  
  const isAuthorizedParent1Student1 = await familyService.verifyParentChildAccess('parent-1', 'student-1');
  assert(isAuthorizedParent1Student1 === true, '1.1 Verified parent has authorized access to their own registered child');

  const isForbiddenParent1Student2 = await familyService.verifyParentChildAccess('parent-1', 'student-2');
  assert(isForbiddenParent1Student2 === false, '1.2 Parent is strictly forbidden from accessing unauthorized student records (privacy boundary)');

  const isParent2ForStudent2 = await familyService.verifyParentChildAccess('parent-2', 'student-2');
  const isParent2ForStudent1 = await familyService.verifyParentChildAccess('parent-2', 'student-1');
  assert(isParent2ForStudent2 === true, '1.3 Second parent is authorized strictly for their own student');
  assert(isParent2ForStudent1 === false, '1.3.b Second parent is rejected from first parent student');

  let unauthorizedErrorCaught = false;
  try {
    await familyService.getFamilyHomeIntelligence('parent-1', 'student-2');
  } catch (err: any) {
    unauthorizedErrorCaught = true;
  }
  assert(unauthorizedErrorCaught, '1.4 Unauthorized access attempt throws error in intelligence derivation');

  // --- SECTION 2: FAMILY & PARENT INTELLIGENCE AGGREGATION ---
  console.log('\n--- SECTION 2: Family & Parent Intelligence Aggregation ---');

  const children = await familyService.getChildrenForParent('parent-1');
  assert(Array.isArray(children) && children.length > 0, '2.1 getChildrenForParent returns array of authorized children');
  assert(children[0].studentId === 'student-1', '2.1.b First child ID matches student-1');
  assert(children[0].displayName === 'Alex Chen', '2.1.c Child displayName is Alex Chen');
  assert(children[0].gradeLevel.includes('Grade 12'), '2.1.d Child gradeLevel is Grade 12');

  const intel = await familyService.getFamilyHomeIntelligence('parent-1', 'student-1');
  assert(Array.isArray(intel.todayClasses) && intel.todayClasses.length > 0, '2.2 Family Home Intelligence derives today classes');
  assert(intel.todayClasses[0].courseCode === 'PHYS-301', '2.2.b Today class includes PHYS-301');
  assert(typeof intel.todayClasses[0].room === 'string', '2.2.c Class includes verified room');
  assert(typeof intel.todayClasses[0].instructorName === 'string', '2.2.d Class includes instructor name');

  assert(Array.isArray(intel.subjectsProgress) && intel.subjectsProgress.length > 0, '2.3 Subject progress calculated');
  const physProgress = intel.subjectsProgress.find((s) => s.courseCode === 'PHYS-301');
  assert(!!physProgress && physProgress.progressPercent >= 0, '2.3.b Physics subject progress percentage calculated');
  assert(typeof physProgress!.currentLesson === 'string', '2.3.c Current curriculum lesson topic identified');

  assert(Array.isArray(intel.pendingWork), '2.4 Work and problem sets derived');
  const hasWorkItems = intel.pendingWork.length > 0;
  assert(hasWorkItems, '2.4.b Pending work contains assigned problem sets');
  const firstWork = intel.pendingWork[0];
  assert(typeof firstWork.title === 'string' && typeof firstWork.dueDate === 'string', '2.4.c Work item contains title and dueDate');

  assert(Array.isArray(intel.recentAssessments) && intel.recentAssessments.length > 0, '2.5 Recent assessments include scores');
  const firstAsm = intel.recentAssessments[0];
  assert(firstAsm.score !== undefined && firstAsm.maxScore !== undefined, '2.5.b Assessment contains verified numerical scores');
  assert(firstAsm.accuracyPercent === 95, '2.5.c Assessment accuracy percent matches test result');
  assert((firstAsm as any).questions === undefined, '2.5.d Zero questions or answer keys exposed in parent view');

  assert(!!intel.nextAction && typeof intel.nextAction.title === 'string', '2.6 Clear direct next action provided for parents');
  assert(intel.nextAction.courseCode === 'PHYS-301', '2.6.b Next action links to academic courseCode');

  assert(Array.isArray(intel.communications) && intel.communications.length > 0, '2.7 Delivers teacher announcements');
  assert(intel.communications[0].teacherName.includes('Dr. Sarah'), '2.7.b Communication includes instructor name');

  // --- SECTION 3: SCHOOL-WIDE INSTITUTIONAL INTELLIGENCE & PULSE ---
  console.log('\n--- SECTION 3: School-Wide Institutional Intelligence & Pulse ---');

  const schoolData = institutionalService.getSchoolIntelligence('inst-stark-academy');
  assert(!!schoolData && schoolData.institution.id === 'inst-stark-academy', '3.1 School intelligence derived for Stark Academy');
  assert(schoolData.pulse.activeClassroomsNow > 0, '3.2 Operational pulse reports active classrooms live');
  assert(schoolData.pulse.scheduledLecturesToday > 0, '3.2.b Operational pulse reports scheduled lectures today');
  assert(schoolData.pulse.totalStudentsEnrolled > 0, '3.2.c Operational pulse reports enrolled student headcount');
  assert(schoolData.pulse.facultyOnDuty > 0, '3.2.d Operational pulse reports faculty count on duty');
  assert(schoolData.pulse.systemHealth === 'nominal', '3.2.e Operational pulse system health is nominal');

  assert(Array.isArray(schoolData.grades) && schoolData.grades.length >= 2, '3.3 Grade KPI summaries for Grade 11 and Grade 12');
  const g11 = schoolData.grades.find((g) => g.level === 11);
  const g12 = schoolData.grades.find((g) => g.level === 12);
  assert(!!g11 && g11.classesCount > 0, '3.3.b Grade 11 KPI derived');
  assert(!!g12 && g12.classesCount > 0, '3.3.c Grade 12 KPI derived');

  assert(Array.isArray(schoolData.operationalAlerts) && schoolData.operationalAlerts.length > 0, '3.4 School-wide operational alerts provided');
  assert(typeof schoolData.operationalAlerts[0].scope === 'string', '3.4.b Alert includes operational scope');

  // --- SECTION 4: GRADE-LEVEL INTELLIGENCE & DRILL-DOWN ---
  console.log('\n--- SECTION 4: Grade-Level Intelligence & Drill-Down ---');

  const gradeData = institutionalService.getGradeIntelligence('g11');
  assert(!!gradeData && gradeData.level === 11, '4.1 Grade 11 intelligence derived');
  assert(Array.isArray(gradeData.classes) && gradeData.classes.length > 0, '4.1.b Enrolled classes listed for grade level');

  assert(Array.isArray(gradeData.activeCourses) && gradeData.activeCourses.length > 0, '4.2 Active courses in grade listed');
  assert(Array.isArray(gradeData.faculty) && gradeData.faculty.length > 0, '4.2.b Assigned faculty for grade listed');
  assert(gradeData.faculty[0].onSchedule === true, '4.2.c Faculty on schedule status preserved');

  assert(Array.isArray(gradeData.upcomingAssessments) && gradeData.upcomingAssessments.length > 0, '4.3 Scheduled assessments captured');
  assert(gradeData.upcomingAssessments[0].courseCode === 'PHYS-301', '4.3.b Assessment courseCode is PHYS-301');

  assert(Array.isArray(gradeData.interventions) && gradeData.interventions.length > 0, '4.4 Evidence-based grade interventions identified');
  assert(typeof gradeData.interventions[0].evidence === 'string', '4.4.b Intervention contains verifiable evidence snippet');
  assert(typeof gradeData.interventions[0].suggestedAction === 'string', '4.4.c Intervention includes suggested pedagogical action');

  assert(gradeData.trends.completionHistory.length === 4, '4.5 4-week progression trends computed');
  assert(gradeData.trends.attendanceHistory.length === 4, '4.5.b 4-week attendance trends computed');

  // --- SECTION 5: TEACHER LEADERSHIP & WORKLOAD PROJECTIONS ---
  console.log('\n--- SECTION 5: Teacher Leadership & Workload Projections ---');

  const projections = institutionalService.getTeacherLeadershipProjections();
  assert(Array.isArray(projections) && projections.length === 2, '5.1 Faculty workload projections returned');
  const sarah = projections.find((p) => p.teacherId === 'teacher-1');
  assert(!!sarah && sarah.teacherName.includes('Dr. Sarah'), '5.1.b Dr. Sarah projection identified');
  assert(sarah!.sessionsPreparedCount > 0, '5.1.c Prepared instructional packages counted');
  assert(sarah!.gradingTurnaroundAvgHours === 18, '5.1.d Average turnaround SLA hours is 18h');
  assert(sarah!.status === 'On Schedule', '5.1.e Schedule status is On Schedule');
  assert((sarah as any).rating === undefined, '5.1.f Zero crude ratings or toxic rankings');

  // --- SECTION 6: PRINCIPAL COMMAND INTERFACE & CONTROLLED AI EXECUTION ---
  console.log('\n--- SECTION 6: Principal Command Interface & Controlled AI Execution ---');

  const proposal = await institutionalService.proposeCommand(
    principalUser,
    'Run a 15-minute diagnostic Physics quiz across all Grade 11 Physics classes',
    {
      targetGradeId: 'g11',
      courseCode: 'PHYS-301',
      durationMinutes: 15,
      questionCount: 12
    }
  );

  assert(!!proposal && proposal.status === 'PROPOSED', '6.1 Proposes AI diagnostic command in PROPOSED status');
  assert(proposal.targetCourseCode === 'PHYS-301', '6.1.b Target course is PHYS-301');
  assert(proposal.previewQuestions.length === 3, '6.1.c Previews sample diagnostic questions');
  assert(proposal.approvedKnowledgeSpaceIds.includes('ks-quantum'), '6.1.d Grounded in approved knowledge space');

  const auditEvents = institutionalService.getAuditEvents();
  const propEvent = auditEvents.find((a) => a.action === 'PRINCIPAL_COMMAND_PROPOSED');
  assert(!!propEvent && propEvent.actorRole === 'principal', '6.2 Proposal records audit event in institutional ledger');

  let studentBlocked = false;
  try {
    await institutionalService.approveAndExecuteCommand(studentUser, proposal.id);
  } catch (err: any) {
    studentBlocked = true;
  }
  assert(studentBlocked, '6.3 Student rejected from executing institutional commands (403)');

  let teacherBlocked = false;
  try {
    await institutionalService.approveAndExecuteCommand(teacherUser, proposal.id);
  } catch (err: any) {
    teacherBlocked = true;
  }
  assert(teacherBlocked, '6.4 Teacher rejected from executing institutional commands (403)');

  const result = await institutionalService.approveAndExecuteCommand(principalUser, proposal.id);
  assert(result.proposal.status === 'EXECUTED', '6.5 Principal approves & executes command');
  assert(!!result.proposal.approvedAt && !!result.proposal.executedAt, '6.5.b Timestamps recorded on proposal');
  assert(!!result.createdQuizId, '6.5.c Live quiz ID created');

  assert(result.auditEvent.action === 'PRINCIPAL_DIAGNOSTIC_QUIZ_EXECUTED', '6.5.d Audit event recorded for diagnostic execution');
  assert(result.auditEvent.outcome === 'SUCCESS', '6.5.e Audit event outcome is SUCCESS');

  const createdQuiz = await jarvisData.quizzes.getQuizById(result.createdQuizId);
  assert(!!createdQuiz && createdQuiz.title.includes('PHYS-301 Institutional Diagnostic'), '6.5.f Quiz verified in persistent repository');

  let idempotencyBlocked = false;
  try {
    await institutionalService.approveAndExecuteCommand(principalUser, proposal.id);
  } catch (err: any) {
    idempotencyBlocked = true;
  }
  assert(idempotencyBlocked, '6.6 Executed proposal cannot be re-executed (idempotency guard)');

  console.log('===================================================================');
  console.log(` ALL PHASE D.7 TESTS PASSED SUCCESSFULLY! (${passed} ASSERTIONS)`);
  console.log('===================================================================');
}

runD7InstitutionalFamilyTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
