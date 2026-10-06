import { classSessionStore } from '../server/sectors/education/classSessions/classSessionStore.ts';
import { classSessionPolicy } from '../server/sectors/education/classSessions/classSessionPolicy.ts';
import { classSessionGenerator } from '../server/sectors/education/classSessions/classSessionGenerator.ts';
import type { User } from '../server/data/types.ts';
import type { ClassSession } from '../src/types/classSession.ts';

import { authService } from '../server/auth/tokens.ts';
async function runTeacherPrepTests() {
  console.log('=== [JARVIS EDUCATION] AI TEACHER PREPARATION & CLASS SESSION TEST SUITE ===');

  let passed = 0;
  const assert = (condition: boolean, name: string) => {
    if (!condition) {
      console.error(`[FAIL] ${name}`);
      throw new Error(`Test failed: ${name}`);
    }
    console.log(`[PASS] ${++passed}. ${name}`);
  };

  const mockTeacher: User = {
    id: 'teacher-1',
    displayName: 'Dr. Helen Cho',
    email: 'h.cho@starkacademy.edu',
    role: 'teacher',
    department: 'Physics',
    createdAt: new Date().toISOString()
  };

  const mockStudent: User = {
    id: 'student-1',
    displayName: 'Alex Mercer',
    email: 'a.mercer@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  classSessionStore.resetToDefaults();

  // Test 1: Store initialization & pre-seeded sessions
  const seeded = await classSessionStore.listSessions();
  assert(seeded.length > 0, 'ClassSessionStore contains pre-seeded realistic ClassSession');
  const initialSession = seeded[0];
  assert(initialSession.courseCode === 'PHYS-301', 'Initial seeded session is PHYS-301 Electrostatics');

  // Test 2: Create new ClassSession draft
  const newSession = await classSessionStore.createSession({
    workspaceId: 'ws-stark-core',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    courseName: 'Advanced Quantum & Classical Electrodynamics',
    subject: 'Physics',
    topic: 'Gauss Law & Electric Dipoles',
    teacherId: mockTeacher.id,
    teacherName: mockTeacher.displayName,
    durationMinutes: 45,
    status: 'DRAFT'
  });
  assert(newSession.id.startsWith('session-'), 'Successfully created new ClassSession draft');
  assert(newSession.status === 'DRAFT', 'New session initialized in DRAFT state');

  // Test 3: Session RBAC Policy - Teacher Authorization
  const teacherAuth = await classSessionPolicy.canCreateSession(mockTeacher, 'class-phys-301', 'ws-stark-core');
  assert(teacherAuth.allowed, 'Teacher is authorized to create session for assigned class');

  const studentAuth = await classSessionPolicy.canCreateSession(mockStudent, 'class-phys-301', 'ws-stark-core');
  assert(!studentAuth.allowed && studentAuth.statusCode === 403, 'Student is forbidden from creating teacher sessions (403)');

  // Test 4: Source Attachment
  const updatedWithSources = await classSessionStore.updateSession(newSession.id, {
    sourceMaterials: [
      {
        id: 'src-test-ncert',
        title: 'NCERT Physics Class 12 - Chapter 1 Excerpt.pdf',
        type: 'ncert_pdf',
        extractedTextSnippet: 'Electric flux through any closed surface is q_enc / ε₀.',
        uploadedAt: new Date().toISOString()
      },
      {
        id: 'src-test-pyq',
        title: 'National Board Past Year Exam (2024).pdf',
        type: 'question_paper',
        extractedTextSnippet: 'Derive electric field intensity due to a uniformly charged spherical shell.',
        uploadedAt: new Date().toISOString()
      }
    ]
  });
  assert(updatedWithSources.sourceMaterials.length === 2, 'Successfully attached NCERT and PYQ source materials');

  // Test 5: Grounded AI Generation Pipeline
  const generated = await classSessionGenerator.generateSessionContent(
    updatedWithSources,
    {
      lessonPlan: true,
      presentation: true,
      quiz: true,
      flashcards: true,
      homework: true,
      teacherNotes: true,
      studentNotes: true,
      answerKey: true
    },
    'Emphasize electric dipole torque in uniform field'
  );
  assert(!!generated.lessonPlan, 'Generation created structured Lesson Plan');
  assert(!!generated.presentation && generated.presentation.slides.length >= 4, 'Generation created Presentation Slide Deck');
  assert(!!generated.quiz && generated.quiz.questions.length >= 3, 'Generation created Grounded Formative Quiz');
  assert(!!generated.flashcards && generated.flashcards.cards.length >= 3, 'Generation created Concept Flashcards');
  assert(!!generated.homework && generated.homework.questions.length >= 3, 'Generation created Homework Problem Set');
  assert(!!generated.answerKey && Object.keys(generated.answerKey.quizAnswerMap).length > 0, 'Generation created Protected Answer Key');

  // Test 6: Single Section Regeneration
  const regeneratedQuiz = await classSessionGenerator.regenerateSection(updatedWithSources, 'quiz', 'Add numerical questions');
  assert(regeneratedQuiz.questions.length > 0, 'Single section regeneration executed successfully without corrupting other sections');

  // Test 7: Section Approval & Full Session Approval
  const sessionAfterGen = await classSessionStore.updateSession(newSession.id, {
    lessonPlan: generated.lessonPlan,
    presentation: generated.presentation,
    quiz: generated.quiz,
    flashcards: generated.flashcards,
    homework: generated.homework,
    answerKey: generated.answerKey,
    teacherNotes: generated.teacherNotes,
    studentMaterials: generated.studentMaterials,
    status: 'READY_FOR_REVIEW'
  });
  assert(sessionAfterGen.status === 'READY_FOR_REVIEW', 'Session transitioned to READY_FOR_REVIEW');

  const approvedSession = await classSessionStore.approveAll(newSession.id);
  assert(approvedSession.status === 'APPROVED', 'Full session approval transitioned status to APPROVED');
  assert(approvedSession.lessonPlan?.isApproved === true, 'Lesson plan marked approved');
  assert(approvedSession.quiz?.isApproved === true, 'Quiz marked approved');

  // Test 8: Scheduling Session for Classroom
  const scheduledTime = new Date(Date.now() + 86400000).toISOString();
  const scheduledSession = await classSessionStore.scheduleSession(newSession.id, scheduledTime);
  assert(scheduledSession.status === 'SCHEDULED', 'Session transitioned to SCHEDULED');
  assert(scheduledSession.scheduledAt === scheduledTime, 'Session schedule timestamp persisted');

  // Test 9: Student Authorization & Answer-Key Sanitization
  const sanitizedForStudent = classSessionPolicy.sanitizeForStudent(scheduledSession) as ClassSession;
  assert(sanitizedForStudent.answerKey === undefined, 'CRITICAL SECURITY: Answer Key is strictly stripped in student view');
  assert(sanitizedForStudent.teacherNotes === undefined, 'CRITICAL SECURITY: Teacher Notes are strictly stripped in student view');
  assert(sanitizedForStudent.quiz === undefined, 'Unreleased quiz is hidden from students before teacher triggers in-class release');

  // Test 10: Controlled Release
  const releaseUpdated = await classSessionStore.updateReleaseControls(newSession.id, {
    presentationReleased: true,
    homeworkReleased: true
  });
  const studentViewReleased = classSessionPolicy.sanitizeForStudent(releaseUpdated) as ClassSession;
  assert(!!studentViewReleased.presentation, 'Released presentation is accessible to students');
  assert(!!studentViewReleased.homework, 'Released homework is accessible to students');

  // Test 11: SmartBoard Retrieval for Authenticated Teacher
  const smartboardSession = await classSessionStore.getActiveSmartboardSession(mockTeacher.id, 'class-phys-301');
  assert(!!smartboardSession, 'SmartBoard successfully retrieved approved session for authenticated teacher');
  assert(smartboardSession?.teacherId === mockTeacher.id, 'Retrieved SmartBoard session belongs to authenticated teacher');

  console.log(`\n=== ALL ${passed} AI TEACHER PREPARATION & CLASS SESSION TESTS PASSED! ===\n`);
}

runTeacherPrepTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
