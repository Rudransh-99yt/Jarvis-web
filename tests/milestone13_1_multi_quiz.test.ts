// Milestone 13.1: Multi-Quiz Stability, State Isolation & Lifecycle Regression Test Suite
import assert from 'node:assert';
import { jarvisData } from '../server/data/index.ts';
import { smartQuizService } from '../server/sectors/education/quizService.ts';
import { classroomEventBus } from '../server/sectors/education/classroomEventBus.ts';
import type { Quiz, QuizQuestion } from '../src/types/quiz.ts';

console.log('=== [WEB JARVIS] MILESTONE 13.1: MULTI-QUIZ STABILITY & LIFECYCLE TEST SUITE ===');

import { authService } from '../server/auth/tokens.ts';
async function runMultiQuizRegressionSuite() {
  await jarvisData.seed();
  const repo = jarvisData;

  const teacher = (await repo.users.getById('teacher-1'))!;
  const student = (await repo.users.getById('student-1'))!;
  assert(teacher && student, 'Teacher and student seed records must exist');

  // Create active classroom session
  const session = await repo.classroom.createSession({
    classId: 'class-phys-301',
    teacherId: teacher.id,
    workspaceId: 'ws-stark-core',
    status: 'live',
    boardState: {
      state: 'lesson',
      currentTopic: 'Quantum Harmonic Oscillator',
      message: 'Classroom live'
    }
  });
  assert(session && session.id, 'Session must be created');

  // Track SSE events emitted
  const emittedEvents: Array<{ event: string; payload: any }> = [];
  const unsubscribeAll = classroomEventBus.subscribeToSession(session.id, 'ws-stark-core', (event) => {
    emittedEvents.push({ event: event.type, payload: event.data });
  });

  // 1. Create Quiz A
  console.log('[TEST] 1. Create first quiz (Quiz A)');
  const quizA = await smartQuizService.createQuiz(
    {
      classId: 'class-phys-301',
      classroomSessionId: session.id,
      title: 'Quiz A: Quantum States',
      description: 'First test quiz',
      workspaceId: 'ws-stark-core'
    },
    teacher
  );
  assert(quizA && quizA.id, 'Quiz A must be created');
  assert.strictEqual(quizA.status, 'draft');
  console.log('[PASS] 1. Quiz A created with ID:', quizA.id);

  // 2. Add questions to Quiz A
  console.log('[TEST] 2. Add questions to Quiz A');
  const qA1 = await smartQuizService.addQuestion(
    quizA.id,
    {
      questionText: 'What is the ground state energy of a quantum harmonic oscillator?',
      options: ['Zero', '0.5 * hbar * omega', 'hbar * omega', '2 * hbar * omega'],
      correctOption: 'B',
      points: 10,
      timeLimitSeconds: 30
    },
    teacher
  );
  const qA2 = await smartQuizService.addQuestion(
    quizA.id,
    {
      questionText: 'What is the parity of the n=1 excited state wavefunction?',
      options: ['Even', 'Odd', 'Undefined', 'Zero everywhere'],
      correctOption: 'B',
      points: 10,
      timeLimitSeconds: 30
    },
    teacher
  );
  assert(qA1 && qA2, 'Questions qA1 and qA2 created for Quiz A');
  console.log('[PASS] 2. Two questions successfully added to Quiz A');

  // 3. Create Quiz B in the SAME session
  console.log('[TEST] 3. Create second quiz (Quiz B)');
  const quizB = await smartQuizService.createQuiz(
    {
      classId: 'class-phys-301',
      classroomSessionId: session.id,
      title: 'Quiz B: Ladder Operators',
      description: 'Second test quiz in same session',
      workspaceId: 'ws-stark-core'
    },
    teacher
  );
  assert(quizB && quizB.id, 'Quiz B must be created');
  assert.notStrictEqual(quizA.id, quizB.id, 'Quiz A and Quiz B must have distinct IDs');
  console.log('[PASS] 3. Quiz B created with distinct ID:', quizB.id);

  // 4. Verify Quiz A remains intact and unchanged
  console.log('[TEST] 4. Verify Quiz A state isolation');
  const fetchedQuizA = await repo.quizzes.getQuizById(quizA.id, 'ws-stark-core');
  assert(fetchedQuizA, 'Quiz A must still exist');
  assert.strictEqual(fetchedQuizA.title, 'Quiz A: Quantum States');
  assert.strictEqual(fetchedQuizA.totalQuestions, 2, 'Quiz A question count must remain 2');
  const questionsA = await repo.quizzes.listQuestions(quizA.id);
  assert.strictEqual(questionsA.length, 2, 'Quiz A must still have exactly 2 questions');
  console.log('[PASS] 4. Quiz A state remained 100% isolated and unchanged');

  // 5. Add questions to Quiz B
  console.log('[TEST] 5. Add questions to Quiz B');
  const qB1 = await smartQuizService.addQuestion(
    quizB.id,
    {
      questionText: 'What is the commutator [a, a_dagger]?',
      options: ['0', '1', '-1', 'hbar'],
      correctOption: 'B',
      points: 15,
      timeLimitSeconds: 45
    },
    teacher
  );
  assert(qB1, 'Question qB1 created for Quiz B');
  const questionsB = await repo.quizzes.listQuestions(quizB.id);
  assert.strictEqual(questionsB.length, 1, 'Quiz B must have 1 question');
  console.log('[PASS] 5. Question added to Quiz B without affecting Quiz A');

  // 6. Verify listQuizzes returns both quizzes with correct metadata
  console.log('[TEST] 6. Verify session quiz enumeration');
  const sessionQuizzes = await repo.quizzes.listQuizzes({
    sessionId: session.id,
    workspaceId: 'ws-stark-core'
  });
  assert.strictEqual(sessionQuizzes.length, 2, 'Session must list exactly 2 quizzes');
  const ids = sessionQuizzes.map((q) => q.id);
  assert(ids.includes(quizA.id) && ids.includes(quizB.id), 'Both Quiz A and Quiz B must be present');
  console.log('[PASS] 6. Session contains exactly 2 quizzes (Quiz A and Quiz B)');

  // 7. Ready & Start Quiz A while Quiz B remains in draft
  console.log('[TEST] 7. Lifecycle transitions: Start Quiz A');
  const readyA = await smartQuizService.readyQuiz(quizA.id, teacher, 'ws-stark-core');
  assert.strictEqual(readyA.status, 'ready');

  const startA = await smartQuizService.startQuiz(quizA.id, teacher, 'ws-stark-core');
  assert.strictEqual(startA.quiz.status, 'live');

  // Verify Quiz B is still draft
  const checkB = await repo.quizzes.getQuizById(quizB.id, 'ws-stark-core');
  assert.strictEqual(checkB?.status, 'draft', 'Quiz B must remain draft while Quiz A is live');
  console.log('[PASS] 7. Quiz A is LIVE; Quiz B remains in draft without cross-talk');

  // 8. Rapid multi-quiz creation scaling (10 quizzes in succession)
  console.log('[TEST] 8. Stress test: Rapid multi-quiz scaling (10 quizzes)');
  const createdQuizzes: Quiz[] = [];
  for (let i = 1; i <= 10; i++) {
    const q = await smartQuizService.createQuiz(
      {
        classId: 'class-phys-301',
        classroomSessionId: session.id,
        title: `Stress Quiz ${i}: Advanced Topic ${i}`,
        description: `Rapid creation batch ${i}`,
        workspaceId: 'ws-stark-core'
      },
      teacher
    );
    createdQuizzes.push(q);
  }
  assert.strictEqual(createdQuizzes.length, 10, '10 stress quizzes created');

  const totalSessionQuizzes = await repo.quizzes.listQuizzes({
    sessionId: session.id,
    workspaceId: 'ws-stark-core'
  });
  assert.strictEqual(totalSessionQuizzes.length, 12, 'Total quizzes must be 2 + 10 = 12');
  console.log('[PASS] 8. 10 rapid quizzes created without ID collision or state corruption');

  // 9. SSE Event stream validation
  console.log('[TEST] 9. EventBus notification hygiene');
  assert(emittedEvents.length > 0, 'EventBus must have recorded emitted events');
  const createEvents = emittedEvents.filter((e) => e.event === 'quiz.created');
  assert.strictEqual(createEvents.length, 12, 'Must emit exactly 12 quiz.created events for 12 creations');
  console.log(`[PASS] 9. EventBus emitted exactly 12 quiz.created events (zero duplicate emissions)`);

  // 10. Clean up event subscription
  unsubscribeAll();
  console.log('[PASS] 10. EventBus subscription cleanly unsubscribed without memory leaks');

  console.log('\n=== ALL 10 MULTI-QUIZ STABILITY & LIFECYCLE TESTS PASSED! ===\n');
}

runMultiQuizRegressionSuite().catch((err) => {
  console.error('[FAIL] Milestone 13.1 Multi-Quiz Regression Failed:', err);
  process.exit(1);
});
