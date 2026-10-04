// JARVIS EDUCATION OS — PHASE D: ACADEMIC INTEGRATION & CONTEXT TEST SUITE
// Verifies unified academic context, learning links, teacher session anchor, cross-experience workflows, and bounded AI context.

import path from 'node:path';
import fs from 'node:fs';
import { jarvisData, setActiveRepository } from '../server/data/index.ts';
import { DiskJarvisDataRepository } from '../server/data/diskRepository.ts';
import { academicIntegrationService } from '../server/sectors/education/academicIntegrationService.ts';
import { classSessionStore } from '../server/sectors/education/classSessions/classSessionStore.ts';
import { classSessionPolicy } from '../server/sectors/education/classSessions/classSessionPolicy.ts';
import { educationStore } from '../server/sectors/education/educationStore.ts';
import { focusStore } from '../server/sectors/education/focus/focusStore.ts';
import { FocusPolicyEngine } from '../server/sectors/education/focus/focusPolicy.ts';
import type { User } from '../server/data/types.ts';
import type { ClassSession } from '../src/types/classSession.ts';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Integration Assertion Failed: ${testName} - ${JSON.stringify(detail || '')}`);
  }
}

async function runAcademicIntegrationTestSuite() {
  console.log('\n================================================================');
  console.log('=== JARVIS EDUCATION OS — PHASE D INTEGRATION TEST SUITE ===');
  console.log('================================================================\n');

  // 1. Initialize isolated test repository
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `integration-test-${Date.now()}.json`);

  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Sarah Connor',
    email: 'sarah@stark.local',
    role: 'teacher',
    createdAt: new Date().toISOString()
  };

  const studentUser: User = {
    id: 'student-1',
    displayName: 'Alex Mercer',
    email: 'alex@stark.local',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  // -------------------------------------------------------------
  // TEST SECTION 1: SHARED ACADEMIC CONTEXT RESOLUTION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 1: Shared Academic Context Resolution ---');

  // Test 1.1: Resolve from existing ClassSession
  const sessionCtx = academicIntegrationService.resolveContext('classSession', 'session-phys-101');
  assert(sessionCtx !== undefined, '1.1 Academic context resolved for classSession');
  assert(sessionCtx.courseCode === 'PHYS-301' || sessionCtx.classId === 'class-phys-301', '1.1.b Class session context contains valid course info', sessionCtx);
  assert(sessionCtx.institutionId === 'inst-stark-academy', '1.1.c Contains correct institution ID');

  // Test 1.2: Resolve from Curriculum Lesson
  const lessonCtx = academicIntegrationService.resolveContext('lesson', 'les-phys-101');
  assert(lessonCtx !== undefined, '1.2 Academic context resolved for curriculum lesson');
  assert(lessonCtx.lessonId === 'les-phys-101', '1.2.b Context matches target lesson ID');
  assert(!!lessonCtx.unitId, '1.2.c Context resolves parent unit ID');

  // Test 1.3: Resolve from Assignment
  const asgCtx = academicIntegrationService.resolveContext('assignment', 'asg-101');
  assert(asgCtx !== undefined, '1.3 Academic context resolved for assignment');
  assert(asgCtx.assignmentId === 'asg-101', '1.3.b Assignment context preserves assignment ID');

  // Test 1.4: Resolve from Workspace Page
  const pages = educationStore.getWorkspacePages();
  const notesPage = pages.find(p => p.id === 'wp-quantum-notes') || pages[0];
  const wpCtx = academicIntegrationService.resolveContext('workspacePage', notesPage.id);
  assert(wpCtx !== undefined, '1.4 Academic context resolved for workspace page');

  // Test 1.5: Fallback default resolution
  const fallbackCtx = academicIntegrationService.resolveContext('lesson', 'non-existent-lesson-id');
  assert(fallbackCtx.institutionId === 'inst-stark-academy', '1.5 Graceful fallback context provided for unknown ID');

  // -------------------------------------------------------------
  // TEST SECTION 2: CANONICAL LEARNING OBJECT LINK MODEL
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: Learning Object Link Model ---');

  // Test 2.1: Create link
  const link1 = academicIntegrationService.createLink({
    workspaceId: 'ws-stark-core',
    sourceType: 'lesson',
    sourceId: 'les-phys-101',
    targetType: 'communityChannel',
    targetId: 'chan-phys301-theory',
    relation: 'discussion',
    title: 'Lesson 101 Discussion Channel',
    createdBy: teacherUser.id
  });
  assert(!!link1.id, '2.1 Learning link created with generated unique ID');
  assert(link1.relation === 'discussion', '2.1.b Learning link preserves relation');

  // Test 2.2: Query links by source
  const sourceLinks = academicIntegrationService.getLinks({
    sourceType: 'lesson',
    sourceId: 'les-phys-101'
  });
  assert(sourceLinks.some(l => l.id === link1.id), '2.2 Query links by sourceType and sourceId returns created link');

  // Test 2.3: Query bidirectional entity links
  const entityLinks = academicIntegrationService.getLinks({
    entityType: 'communityChannel',
    entityId: 'chan-phys301-theory'
  });
  assert(entityLinks.some(l => l.id === link1.id), '2.3 Bidirectional query by entityType and entityId finds links where entity is target');

  // Test 2.4: Delete link
  const deleteOk = academicIntegrationService.deleteLink(link1.id);
  assert(deleteOk === true, '2.4 Learning link deleted successfully');
  const checkDeleted = academicIntegrationService.getLinks({ sourceId: 'les-phys-101' }).find(l => l.id === link1.id);
  assert(!checkDeleted, '2.4.b Deleted link no longer returned in queries');

  // -------------------------------------------------------------
  // TEST SECTION 3: TEACHER WORKFLOW ANCHOR (CLASS SESSION)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: Teacher Workflow Anchor & Link-All ---');

  // Create a realistic prepared session to test full link-all workflow
  const testSession: ClassSession = {
    id: `session-integ-${Date.now()}`,
    workspaceId: 'ws-stark-core',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    courseName: 'Advanced Quantum & Classical Electrodynamics',
    subject: 'Physics',
    unitId: 'unit-phys-1',
    unitTitle: 'Foundations of Wave Mechanics',
    lessonId: 'les-phys-101',
    lessonTitle: 'Schrödinger Dynamics & Wave Functions',
    topic: 'Wave Function Probability Density & Normalization',
    targetDate: '2026-10-15',
    scheduledAt: '2026-10-15T09:00:00.000Z',
    durationMinutes: 60,
    status: 'approved',
    confidenceScore: 0.96,
    generationMethod: 'ai_generated',
    teacher: {
      id: teacherUser.id,
      name: teacherUser.displayName,
      subject: 'Physics'
    },
    lessonPlan: {
      title: 'Wave Function Normalization & Born Interpretation',
      durationMinutes: 60,
      learningObjectives: [
        'Calculate normalization constants for 1D wavefunctions',
        'State and apply Born probabilistic interpretation'
      ],
      phases: [
        { name: 'Introduction', durationMinutes: 10, activity: 'Historical overview of de Broglie & Schrödinger' },
        { name: 'Derivation', durationMinutes: 30, activity: 'Derive integral of |psi|^2 = 1' }
      ],
      workedExamples: [
        {
          problem: 'Find normalization constant A for psi(x) = A*exp(-a*x^2)',
          solution: 'A = (2*a/pi)^(1/4) using Gaussian integral',
          keyIntuition: 'Total probability across all space must equal exactly 100%'
        }
      ]
    },
    teacherNotes: {
      pedagogicalTips: ['Emphasize that the wave function itself is complex, but probability is real'],
      commonMisconceptions: ['Students confuse probability amplitude with observable position'],
      blackboardLayouts: [
        'Left: Postulates & Equations',
        'Middle: Normalization Integral',
        'Right: Worked Example'
      ],
      pacingGuide: [{ phase: 'Lecture', targetMinute: 20 }]
    },
    homework: {
      instructions: 'Complete problems 1 and 2 before next lecture.',
      totalMarks: 20,
      questions: [
        { questionNumber: 1, prompt: 'Normalize the particle in a box wave function.', marks: 10 },
        { questionNumber: 2, prompt: 'Compute probability in first third of the well.', marks: 10 }
      ]
    },
    quiz: {
      title: 'Formative Wave Function Check',
      totalQuestions: 2,
      questions: [
        {
          questionNumber: 1,
          prompt: 'What does |psi|^2 dx represent?',
          options: ['Energy', 'Probability of finding particle in dx', 'Momentum', 'Velocity'],
          correctAnswer: 'Probability of finding particle in dx',
          explanation: 'Born postulate: square modulus represents probability density.'
        }
      ]
    },
    sourceMaterials: [
      { id: 'src-1', title: 'Griffiths Quantum Mechanics Ch 1', knowledgeSpaceId: 'ks-quantum' }
    ],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await classSessionStore.createSession(testSession);
  const fetchedSession = await classSessionStore.getSession(testSession.id);
  assert(!!fetchedSession, '3.1 Test ClassSession saved in store');

  // Verify policy: Teacher can manage session, student cannot
  const teacherAuth = await classSessionPolicy.canManageSession(teacherUser, testSession, testSession.workspaceId);
  assert(teacherAuth.allowed === true, '3.2 Teacher authorized to manage and link session');

  const studentAuth = await classSessionPolicy.canManageSession(studentUser, testSession, testSession.workspaceId);
  assert(studentAuth.allowed === false, '3.3 Student rejected from managing teacher session');

  // Execute linkAllForClassSession
  const linkAllResult = await academicIntegrationService.linkAllForClassSession(testSession.id, teacherUser);
  assert(!!linkAllResult.linkedWorkspacePage, '3.4 Workspace notes page generated and linked');
  assert(linkAllResult.linkedWorkspacePage?.title.includes('Wave Function Probability Density'), '3.4.b Workspace page title contains session topic');
  assert(!!linkAllResult.linkedAssignment, '3.5 Homework assignment created and linked in education store');
  assert(!!linkAllResult.linkedQuiz, '3.6 Formative quiz created and linked');
  assert(linkAllResult.linksCreated.length >= 4, '3.7 Multiple learning links created across subsystems', { count: linkAllResult.linksCreated.length });

  // Verify updated session
  const reloadedSession = await classSessionStore.getSession(testSession.id);
  assert(reloadedSession?.linkedWorkspacePageId === linkAllResult.linkedWorkspacePage?.id, '3.8 ClassSession updated with linkedWorkspacePageId');
  assert(reloadedSession?.linkedAssignmentId === linkAllResult.linkedAssignment?.id, '3.8.b ClassSession updated with linkedAssignmentId');

  // -------------------------------------------------------------
  // TEST SECTION 4: DOMAIN EVENTS & NOTIFICATIONS
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: Domain Events & Notifications ---');

  // Test 4.1: Event published during linkAll
  const events = academicIntegrationService.getEvents({ entityId: testSession.id });
  assert(events.length > 0, '4.1 Domain event recorded for classSession.approved');
  assert(events[0].type === 'classSession.approved', '4.1.b Event type matches expected');

  // Test 4.2: Direct event publishing
  const customEvt = academicIntegrationService.publishEvent({
    type: 'assignment.created',
    actorId: teacherUser.id,
    workspaceId: 'ws-stark-core',
    context: sessionCtx,
    entityType: 'assignment',
    entityId: linkAllResult.linkedAssignment!.id,
    metadata: { title: linkAllResult.linkedAssignment!.title }
  });
  assert(!!customEvt.id, '4.2 Custom domain event published');

  // Test 4.3: Notifications generated
  const notifs = academicIntegrationService.getNotifications(studentUser.id);
  assert(notifs.length > 0, '4.3 Notifications retrieved for student');
  const targetNotif = notifs.find(n => n.targetId === testSession.id);
  assert(!!targetNotif, '4.3.b Notification exists for approved class session');

  // Test 4.4: Mark notification as read
  if (targetNotif) {
    const markOk = academicIntegrationService.markNotificationRead(targetNotif.id, studentUser.id);
    assert(markOk === true, '4.4 Notification marked read');
    assert(targetNotif.readState === true, '4.4.b Read state updated');
  }

  // -------------------------------------------------------------
  // TEST SECTION 5: STRUCTURED QUIZ RESULTS
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: Quiz Results Linked to Academic Context ---');

  const quizResult = academicIntegrationService.recordQuizResult({
    studentId: studentUser.id,
    studentName: studentUser.displayName,
    quizId: linkAllResult.linkedQuiz!.id,
    quizTitle: linkAllResult.linkedQuiz!.title,
    classSessionId: testSession.id,
    lessonId: testSession.lessonId,
    concepts: ['Wave Normalization', 'Born Probability'],
    score: 2,
    totalQuestions: 2,
    percentage: 100,
    completed: true
  });
  assert(!!quizResult.id, '5.1 Quiz result recorded successfully');
  assert(quizResult.percentage === 100, '5.1.b Score and percentage calculated');

  // Query quiz results
  const studentResults = academicIntegrationService.getQuizResults({ studentId: studentUser.id });
  assert(studentResults.some(r => r.id === quizResult.id), '5.2 Quiz result retrieved by studentId');

  const lessonResults = academicIntegrationService.getQuizResults({ lessonId: testSession.lessonId });
  assert(lessonResults.some(r => r.id === quizResult.id), '5.3 Quiz result retrieved by lessonId');

  // -------------------------------------------------------------
  // TEST SECTION 6: UNIFIED CALENDAR FEED
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: Unified Calendar Feed ---');

  const calendarFeed = await academicIntegrationService.getCalendarFeed('ws-stark-core', 'class-phys-301');
  assert(calendarFeed.length > 0, '6.1 Unified calendar feed returned items');

  const hasSessionItem = calendarFeed.some(item => item.type === 'class_session');
  assert(hasSessionItem, '6.2 Calendar feed contains scheduled class_session items');

  const hasAssignmentItem = calendarFeed.some(item => item.type === 'assignment_due');
  assert(hasAssignmentItem, '6.3 Calendar feed contains assignment_due items');

  // Verify chronological ordering
  for (let i = 0; i < calendarFeed.length - 1; i++) {
    assert(calendarFeed[i].date <= calendarFeed[i + 1].date, '6.4 Calendar feed sorted chronologically by date');
  }

  // -------------------------------------------------------------
  // TEST SECTION 7: FOCUS SESSION ACADEMIC TRACKING
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: Focus Session & Academic Progress ---');

  // Create and start focus session linked to lesson
  const createdFocus = await focusStore.createSession(
    {
      mode: 'STUDY_LOCK',
      plannedDurationMinutes: 25,
      target: {
        type: 'lesson',
        id: 'les-phys-101',
        title: 'Schrödinger Dynamics & Wave Functions',
        courseId: 'class-phys-301',
        courseCode: 'PHYS-301',
        lessonId: 'les-phys-101',
        context: 'PHYS-301 · Wave Normalization'
      }
    },
    studentUser
  );
  assert(!!createdFocus.id, '7.1 Focus session created with academic target');

  const activeFocus = await focusStore.startSession(createdFocus.id, studentUser.id);
  assert(activeFocus.status === 'ACTIVE', '7.1.b Focus session active');
  assert(activeFocus.mode === 'STUDY_LOCK', '7.1.c Focus session in STUDY_LOCK mode');

  // Verify focus policy checks navigation
  const canNavLesson = FocusPolicyEngine.evaluateNavigation(activeFocus, 'lesson_workspace');
  assert(canNavLesson.allowed === true, '7.2 Can navigate to study lesson workspace during academic focus');

  const canNavCommunity = FocusPolicyEngine.evaluateNavigation(activeFocus, 'community');
  assert(canNavCommunity.allowed === false, '7.3 Blocked from navigating to community discussion during study lock');

  // Complete focus session
  const endedSession = await focusStore.completeSession(activeFocus.id, studentUser.id);
  assert(endedSession.status === 'COMPLETED', '7.4 Focus session completed');

  // -------------------------------------------------------------
  // TEST SECTION 8: BOUNDED AI CONTEXT BUILDER
  // -------------------------------------------------------------
  console.log('\n--- SECTION 8: Bounded AI Context Builder ---');

  const studentAiContext = academicIntegrationService.buildAiContext(
    { id: studentUser.id, role: studentUser.role, displayName: studentUser.displayName },
    {
      institutionId: 'inst-stark-academy',
      classId: 'class-phys-301',
      courseCode: 'PHYS-301',
      lessonId: 'les-phys-101',
      classSessionId: testSession.id
    },
    'guided_problem_solving'
  );

  assert(studentAiContext.role === 'student', '8.1 AI context captures user role');
  assert(studentAiContext.academicContext.courseCode === 'PHYS-301', '8.2 AI context resolves course');
  assert(!!studentAiContext.relevantLesson, '8.3 Bounded AI context includes target lesson info');
  assert(!!studentAiContext.relevantSession, '8.4 Bounded AI context includes target session info');
  assert(studentAiContext.allowedKnowledgeSpaces.includes('ks-quantum'), '8.5 Bounded AI context limits to authorized knowledge spaces');
  assert(studentAiContext.activeTask === 'guided_problem_solving', '8.6 Active task parameter preserved');

  // -------------------------------------------------------------
  // TEST SECTION 9: HARDENING & SECURITY BOUNDARIES
  // -------------------------------------------------------------
  console.log('\n--- SECTION 9: Hardening & Security Boundaries ---');

  // Test 9.1: Duplicate Link Prevention
  const dupLink1 = academicIntegrationService.createLink({
    workspaceId: 'ws-stark-core',
    sourceType: 'lesson',
    sourceId: 'les-phys-101',
    targetType: 'assignment',
    targetId: 'asg-101',
    relation: 'homework',
    title: 'Wave Function Homework',
    createdBy: teacherUser.id
  });
  const dupLink2 = academicIntegrationService.createLink({
    workspaceId: 'ws-stark-core',
    sourceType: 'lesson',
    sourceId: 'les-phys-101',
    targetType: 'assignment',
    targetId: 'asg-101',
    relation: 'homework',
    title: 'Wave Function Homework Duplicate',
    createdBy: teacherUser.id
  });
  assert(dupLink1.id === dupLink2.id, '9.1 Duplicate link prevention returns existing link without duplicates');

  // Test 9.2: Unauthorized link deletion blocked for students on links created by others
  const unauthorizedDelete = academicIntegrationService.deleteLink(dupLink1.id, { id: studentUser.id, role: 'student' });
  assert(unauthorizedDelete === false, '9.2 Student blocked from deleting teacher-created link');

  // Test 9.3: Authorized creator link deletion
  const studentPersonalLink = academicIntegrationService.createLink({
    workspaceId: 'ws-stark-core',
    sourceType: 'workspacePage',
    sourceId: 'wp-student-personal-notes',
    targetType: 'lesson',
    targetId: 'les-phys-101',
    relation: 'notes',
    title: 'My Personal Derivation Notes',
    createdBy: studentUser.id
  });
  const authorizedDelete = academicIntegrationService.deleteLink(studentPersonalLink.id, { id: studentUser.id, role: 'student' });
  assert(authorizedDelete === true, '9.3 Student permitted to delete their own created link');

  // Test 9.4: Stale link pruning
  const stalePrunedCount = academicIntegrationService.pruneStaleLinks('assignment', 'asg-101');
  assert(stalePrunedCount >= 1, '9.4 Prune stale links removes dead entity links', { pruned: stalePrunedCount });

  // Test 9.5: Student Bounded AI Context omits unapproved/draft sessions
  const draftSession: ClassSession = {
    ...testSession,
    id: `session-draft-${Date.now()}`,
    status: 'READY_FOR_REVIEW' // Draft not approved yet
  };
  await classSessionStore.createSession(draftSession);

  const studentDraftAiContext = academicIntegrationService.buildAiContext(
    { id: studentUser.id, role: 'student', displayName: studentUser.displayName },
    { classSessionId: draftSession.id, lessonId: 'les-phys-101' },
    'study_tutoring'
  );
  assert(studentDraftAiContext.relevantSession === undefined, '9.5 Student AI context hides unapproved draft sessions');

  // Teacher AI context can see their draft session
  const teacherDraftAiContext = academicIntegrationService.buildAiContext(
    { id: teacherUser.id, role: 'teacher', displayName: teacherUser.displayName },
    { classSessionId: draftSession.id, lessonId: 'les-phys-101' },
    'lesson_prep'
  );
  assert(teacherDraftAiContext.relevantSession !== undefined, '9.6 Teacher AI context can access their draft session for prep');

  console.log('\n================================================================');
  console.log(`=== AUDIT COMPLETE: ${passed}/${total} ASSERTIONS PASSED ===`);
  console.log('================================================================\n');
}

runAcademicIntegrationTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
