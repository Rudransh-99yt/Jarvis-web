// Milestone 13: Deterministic Smart Quiz & Live Responses Automated Test Suite
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import {
  jarvisData,
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import { SmartQuizService } from '../server/sectors/education/quizService.ts';
import { classroomEventBus } from '../server/sectors/education/classroomEventBus.ts';
import { classroomRouter } from '../server/sectors/education/classroomRoutes.ts';
import { quizRouter } from '../server/sectors/education/quizRoutes.ts';
import { toolRegistry, toolExecutor } from '../server/tools/index.ts';
import type { User } from '../server/data/types.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import type { RealtimeClassroomEvent } from '../src/types/classroom.ts';
import type { Quiz, QuizQuestion, QuestionAggregate, QuizResults } from '../src/types/quiz.ts';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Milestone 13 Assertion Failed: ${testName} - ${JSON.stringify(detail || '')}`);
  }
}

function getFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function runMilestone13Tests() {
  console.log('\n================================================================');
  console.log('=== [WEB JARVIS] MILESTONE 13: SMART QUIZ & LIVE RESPONSES   ===');
  console.log('=== (DETERMINISTIC ENGINE, AUTHORITATIVE LIFECYCLE & HYGIENE) ===');
  console.log('================================================================\n');

  // Baseline Verification: Record initial persistent database hash
  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // Setup isolated temporary repository for test execution
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  const testDbPath = path.join(testDbDir, `m13-test-jarvis-${Date.now()}.json`);

  const isolatedRepo = new DiskJarvisDataRepository(testDbPath);
  await isolatedRepo.init();
  await isolatedRepo.seed();
  setActiveRepository(isolatedRepo);

  const quizService = new SmartQuizService(isolatedRepo);

  const workspaceId = 'ws-stark-core';
  const classId = 'class-phys-301';
  const sessionId = 'session-seed-phys-1';

  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Sarah',
    email: 'sarah.quantum@stark.edu',
    role: 'teacher',
    createdAt: new Date().toISOString()
  };

  const studentUser: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'alex.chen@stark.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const student2User: User = {
    id: 'student-2',
    displayName: 'Maya Lin',
    email: 'maya.lin@stark.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const nonEnrolledStudent: User = {
    id: 'student-rogue',
    displayName: 'Rogue Cadet',
    email: 'rogue@outsider.org',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const unauthorizedTeacher: User = {
    id: 'teacher-other',
    displayName: 'Dr. Other',
    email: 'other@outsider.org',
    role: 'teacher',
    createdAt: new Date().toISOString()
  };

  await isolatedRepo.users.create(nonEnrolledStudent);
  await isolatedRepo.users.create(unauthorizedTeacher);

  // Connect active participants in isolated repo
  await isolatedRepo.classroom.upsertParticipant({
    id: `${sessionId}:${studentUser.id}`,
    sessionId,
    studentId: studentUser.id,
    displayName: studentUser.displayName,
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    connectionStatus: 'connected',
    deviceType: 'software_remote'
  });

  await isolatedRepo.classroom.upsertParticipant({
    id: `${sessionId}:${student2User.id}`,
    sessionId,
    studentId: student2User.id,
    displayName: student2User.displayName,
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    connectionStatus: 'connected',
    deviceType: 'web'
  });

  // --- PART 1: Core Domain Models & Creation ---
  console.log('--- PART 1: Core Domain Models & Creation ---');

  const createdQuiz = await quizService.createQuiz({
    classId,
    classroomSessionId: sessionId,
    workspaceId,
    title: 'Quantum Electrodynamics Checkpoint',
    description: 'Mid-lecture concept check on Feynman diagrams and photons.'
  }, teacherUser);

  assert(Boolean(createdQuiz.id), '1. Quiz created with valid identifier', createdQuiz.id);
  assert(createdQuiz.status === 'draft', '2. Newly created quiz starts in "draft" status', createdQuiz.status);
  assert(createdQuiz.currentQuestionIndex === -1, '3. Initial question index is -1 (not started)', createdQuiz.currentQuestionIndex);
  assert(createdQuiz.totalQuestions === 0, '4. Initial total questions count is 0', createdQuiz.totalQuestions);
  assert(createdQuiz.classId === classId, '5. Quiz bound to authorized class', createdQuiz.classId);
  assert(createdQuiz.classroomSessionId === sessionId, '6. Quiz bound to classroom session', createdQuiz.classroomSessionId);

  // Non-teacher creation rejected
  let studentCreateFailed = false;
  try {
    await quizService.createQuiz({
      classId,
      classroomSessionId: sessionId,
      workspaceId,
      title: 'Hacked Quiz'
    }, studentUser);
  } catch (err: any) {
    studentCreateFailed = err.message.includes('Unauthorized');
  }
  assert(studentCreateFailed, '7. Unauthorized student cannot create quiz');

  // --- PART 2: Question Management ---
  console.log('\n--- PART 2: Question Management ---');

  const q1 = await quizService.addQuestion(createdQuiz.id, {
    questionText: 'What particle mediates the electromagnetic force?',
    options: ['A) Gluon', 'B) Photon', 'C) W Boson', 'D) Graviton'],
    correctOption: 'B',
    points: 10,
    timeLimitSeconds: 20
  }, teacherUser, workspaceId);

  assert(q1.order === 0, '8. First question assigned order 0', q1.order);
  assert(q1.correctOption === 'B', '9. Correct option stored as "B"', q1.correctOption);
  assert(q1.points === 10, '10. Question points stored as 10', q1.points);
  assert(q1.timeLimitSeconds === 20, '11. Question time limit stored as 20s', q1.timeLimitSeconds);

  const q2 = await quizService.addQuestion(createdQuiz.id, {
    questionText: 'In a Feynman diagram, what do wavy lines typically represent?',
    options: ['A) Photons / Gauge Bosons', 'B) Quarks', 'C) Leptons', 'D) Higgs Boson'],
    correctOption: 'A',
    points: 15,
    timeLimitSeconds: 30
  }, teacherUser, workspaceId);

  assert(q2.order === 1, '12. Second question assigned order 1', q2.order);

  const q3 = await quizService.addQuestion(createdQuiz.id, {
    questionText: 'Temporary question to be deleted',
    options: ['A) Yes', 'B) No', 'C) Maybe', 'D) Unknown'],
    correctOption: 'A',
    points: 5,
    timeLimitSeconds: 10
  }, teacherUser, workspaceId);

  let qList = await isolatedRepo.quizzes.listQuestions(createdQuiz.id);
  assert(qList.length === 3, '13. Quiz has 3 questions before removal', qList.length);

  // Remove q3
  const removed = await quizService.removeQuestion(createdQuiz.id, q3.id, teacherUser, workspaceId);
  assert(removed === true, '14. Temporary question successfully removed', removed);

  qList = await isolatedRepo.quizzes.listQuestions(createdQuiz.id);
  assert(qList.length === 2, '15. Quiz has 2 questions remaining', qList.length);

  // Update q2
  const updatedQ2 = await quizService.updateQuestion(createdQuiz.id, q2.id, {
    points: 20
  }, teacherUser, workspaceId);
  assert(updatedQ2.points === 20, '16. Question points updated to 20', updatedQ2.points);

  // --- PART 3: Server-Authoritative Lifecycle & State Transitions ---
  console.log('\n--- PART 3: Server-Authoritative Lifecycle & State Transitions ---');

  // Attempt invalid transition: draft -> live without ready (or test invalid transitions)
  let invalidTransitionRejected = false;
  try {
    await quizService.resumeQuiz(createdQuiz.id, teacherUser, workspaceId);
  } catch (err: any) {
    invalidTransitionRejected = err.message.includes('Invalid transition');
  }
  assert(invalidTransitionRejected, '17. Invalid transition rejected (draft cannot be resumed directly)');

  // draft -> ready
  const readyQuiz = await quizService.readyQuiz(createdQuiz.id, teacherUser, workspaceId);
  assert(readyQuiz.status === 'ready', '18. Valid transition: draft -> ready', readyQuiz.status);

  // ready -> live
  const started = await quizService.startQuiz(createdQuiz.id, teacherUser, workspaceId);
  assert(started.quiz.status === 'live', '19. Valid transition: ready -> live', started.quiz.status);
  assert(started.quiz.currentQuestionIndex === 0, '20. Starting quiz activates Question index 0', started.quiz.currentQuestionIndex);
  assert(started.activeQuestion.status === 'active', '21. Question 0 is marked "active"', started.activeQuestion.status);
  assert(Boolean(started.activeQuestion.deadline), '22. Question 0 has server deadline timestamp', started.activeQuestion.deadline);

  // Verify Smart Board was updated
  const liveSession = await isolatedRepo.classroom.getSessionById(sessionId, workspaceId);
  assert(liveSession?.boardState.state === 'question', '23. Smart Board updated to "question" state', liveSession?.boardState.state);

  // live -> paused
  const pausedQuiz = await quizService.pauseQuiz(createdQuiz.id, teacherUser, workspaceId);
  assert(pausedQuiz.status === 'paused', '24. Valid transition: live -> paused', pausedQuiz.status);

  // paused -> live
  const resumedQuiz = await quizService.resumeQuiz(createdQuiz.id, teacherUser, workspaceId);
  assert(resumedQuiz.status === 'live', '25. Valid transition: paused -> live', resumedQuiz.status);

  // --- PART 4: Student Response Submission & Deterministic Scoring ---
  console.log('\n--- PART 4: Student Response Submission & Deterministic Scoring ---');

  // Alex Chen submits correct answer "B" to Q1
  const sub1 = await quizService.submitResponse(createdQuiz.id, {
    questionId: started.activeQuestion.id,
    selectedOption: 'B',
    workspaceId
  }, studentUser);

  assert(sub1.response.isCorrect === true, '26. Alex Chen response "B" scored as correct', sub1.response.isCorrect);
  assert(sub1.response.pointsAwarded === 10, '27. Alex Chen awarded full question points (10)', sub1.response.pointsAwarded);
  assert(sub1.response.studentId === studentUser.id, '28. Response records authenticated student ID', sub1.response.studentId);

  // Maya Lin submits incorrect answer "C" to Q1
  const sub2 = await quizService.submitResponse(createdQuiz.id, {
    questionId: started.activeQuestion.id,
    selectedOption: 'C',
    workspaceId
  }, student2User);

  assert(sub2.response.isCorrect === false, '29. Maya Lin response "C" scored as incorrect', sub2.response.isCorrect);
  assert(sub2.response.pointsAwarded === 0, '30. Maya Lin awarded 0 points for incorrect option', sub2.response.pointsAwarded);

  // Check Participant States
  const pAlex = await isolatedRepo.quizzes.getParticipantState(createdQuiz.id, studentUser.id);
  assert(pAlex?.score === 10, '31. Alex Chen cumulative score is 10', pAlex?.score);
  assert(pAlex?.answeredCount === 1, '32. Alex Chen answered count is 1', pAlex?.answeredCount);

  const pMaya = await isolatedRepo.quizzes.getParticipantState(createdQuiz.id, student2User.id);
  assert(pMaya?.score === 0, '33. Maya Lin cumulative score is 0', pMaya?.score);
  assert(pMaya?.answeredCount === 1, '34. Maya Lin answered count is 1', pMaya?.answeredCount);

  // --- PART 5: Anti-Tamper, Idempotency & Deadline Enforcement ---
  console.log('\n--- PART 5: Anti-Tamper, Idempotency & Deadline Enforcement ---');

  // Idempotent duplicate submission (submitting same option "B" again)
  const dupSub = await quizService.submitResponse(createdQuiz.id, {
    questionId: started.activeQuestion.id,
    selectedOption: 'B',
    workspaceId
  }, studentUser);
  assert(dupSub.response.id === sub1.response.id, '35. Resubmitting identical option returns existing response idempotently');

  // Answer change attempt (Alex Chen tries to switch to "A")
  let changeAttemptRejected = false;
  try {
    await quizService.submitResponse(createdQuiz.id, {
      questionId: started.activeQuestion.id,
      selectedOption: 'A',
      workspaceId
    }, studentUser);
  } catch (err: any) {
    changeAttemptRejected = err.message.includes('immutable');
  }
  assert(changeAttemptRejected, '36. Attempting to change an already-submitted response is rejected');

  // Non-enrolled student submission attempt
  let rogueRejected = false;
  try {
    await quizService.submitResponse(createdQuiz.id, {
      questionId: started.activeQuestion.id,
      selectedOption: 'B',
      workspaceId
    }, nonEnrolledStudent);
  } catch (err: any) {
    rogueRejected = err.message.includes('Unauthorized');
  }
  assert(rogueRejected, '37. Non-enrolled student response rejected');

  // Teacher cannot submit as a student
  let teacherAsStudentRejected = false;
  try {
    await quizService.submitResponse(createdQuiz.id, {
      questionId: started.activeQuestion.id,
      selectedOption: 'B',
      workspaceId
    }, teacherUser);
  } catch (err: any) {
    teacherAsStudentRejected = err.message.includes('Only enrolled students');
  }
  assert(teacherAsStudentRejected, '38. Teacher cannot submit quiz answers as a student');

  // --- PART 6: Live Aggregation & Privacy Guard ---
  console.log('\n--- PART 6: Live Aggregation & Privacy Guard ---');

  // Query state as student before locking
  const studentView = await quizService.getActiveQuestionState(createdQuiz.id, studentUser, workspaceId);
  assert(studentView.currentQuestion?.correctOption === undefined, '39. PRIVACY GUARD: Student cannot see correct option before question lock');
  assert(studentView.aggregate?.isLocked === false, '40. Aggregate reflects unlocked state', studentView.aggregate?.isLocked);
  assert(studentView.aggregate?.answeredCount === 2, '41. Aggregate accurately reflects 2 answered', studentView.aggregate?.answeredCount);
  assert(studentView.aggregate?.optionCounts['B'] === 1, '42. Option B has 1 count', studentView.aggregate?.optionCounts['B']);
  assert(studentView.aggregate?.optionCounts['C'] === 1, '43. Option C has 1 count', studentView.aggregate?.optionCounts['C']);
  assert(studentView.myResponse?.selectedOption === 'B', '44. Student view returns own submission', studentView.myResponse?.selectedOption);

  // Lock Question
  const lockedAgg = await quizService.lockQuestion(createdQuiz.id, started.activeQuestion.id, teacherUser, workspaceId);
  assert(lockedAgg.isLocked === true, '45. Question is locked', lockedAgg.isLocked);
  assert(lockedAgg.correctOption === 'B', '46. Correct option "B" revealed upon lock', lockedAgg.correctOption);
  assert(lockedAgg.correctCount === 1, '47. Correct count (1) revealed upon lock', lockedAgg.correctCount);

  // Late submission after lock rejected
  let lateRejected = false;
  try {
    // Register temporary 3rd student
    const student3: User = {
      id: 'student-3',
      displayName: 'Late Cadet',
      email: 'late@stark.edu',
      role: 'student',
      createdAt: new Date().toISOString()
    };
    await isolatedRepo.users.create(student3);
    await isolatedRepo.classroom.upsertParticipant({
      id: `${sessionId}:${student3.id}`,
      sessionId,
      studentId: student3.id,
      displayName: student3.displayName,
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      connectionStatus: 'connected',
      deviceType: 'software_remote'
    });

    await quizService.submitResponse(createdQuiz.id, {
      questionId: started.activeQuestion.id,
      selectedOption: 'B',
      workspaceId
    }, student3);
  } catch (err: any) {
    lateRejected = err.message.includes('locked') || err.message.includes('expired');
  }
  assert(lateRejected, '48. Late submission after question locked is strictly rejected');

  // --- PART 7: Advancing Questions & Final Results ---
  console.log('\n--- PART 7: Advancing Questions & Final Results ---');

  // Advance to Question 2
  const adv1 = await quizService.advanceQuestion(createdQuiz.id, teacherUser, workspaceId);
  assert(adv1.completed === false, '49. Advance returns completed = false when more questions remain', adv1.completed);
  assert(adv1.activeQuestion?.order === 1, '50. Advanced to Question order 1', adv1.activeQuestion?.order);
  assert(adv1.quiz.currentQuestionIndex === 1, '51. Quiz currentQuestionIndex updated to 1', adv1.quiz.currentQuestionIndex);

  // Alex Chen submits correct answer "A" to Q2
  await quizService.submitResponse(createdQuiz.id, {
    questionId: adv1.activeQuestion!.id,
    selectedOption: 'A',
    workspaceId
  }, studentUser);

  // Maya Lin submits correct answer "A" to Q2
  await quizService.submitResponse(createdQuiz.id, {
    questionId: adv1.activeQuestion!.id,
    selectedOption: 'A',
    workspaceId
  }, student2User);

  // Lock Q2
  await quizService.lockQuestion(createdQuiz.id, adv1.activeQuestion!.id, teacherUser, workspaceId);

  // Advance past last question -> Completes Quiz
  const adv2 = await quizService.advanceQuestion(createdQuiz.id, teacherUser, workspaceId);
  assert(adv2.completed === true, '52. Advancing past last question automatically completes quiz', adv2.completed);
  assert(adv2.quiz.status === 'completed', '53. Quiz status is "completed"', adv2.quiz.status);
  assert(Boolean(adv2.results), '54. Final results generated upon completion', Boolean(adv2.results));

  const results = adv2.results!;
  assert(results.totalQuestions === 2, '55. Results reflect totalQuestions = 2', results.totalQuestions);
  assert(results.totalPossiblePoints === 30, '56. Results calculate totalPossiblePoints = 10 + 20 = 30', results.totalPossiblePoints);
  assert(results.totalParticipants === 2, '57. Results reflect 2 total student participants', results.totalParticipants);

  // Leaderboard ranking: Alex Chen (10+20=30) should be #1, Maya Lin (0+20=20) should be #2
  assert(results.participants[0].studentId === studentUser.id, '58. Leaderboard rank #1 is Alex Chen (score 30)', results.participants[0].studentId);
  assert(results.participants[0].score === 30, '59. Alex Chen score is 30', results.participants[0].score);
  assert(results.participants[0].percentage === 100, '60. Alex Chen percentage is 100%', results.participants[0].percentage);

  assert(results.participants[1].studentId === student2User.id, '61. Leaderboard rank #2 is Maya Lin (score 20)', results.participants[1].studentId);
  assert(results.participants[1].score === 20, '62. Maya Lin score is 20', results.participants[1].score);

  // --- PART 8: Real-Time EventBus Emission Verification ---
  console.log('\n--- PART 8: Real-Time EventBus Emission Verification ---');

  const capturedEvents: RealtimeClassroomEvent[] = [];
  const unsubscribe = classroomEventBus.subscribeToSession(sessionId, workspaceId, (event) => {
    capturedEvents.push(event);
  });

  // Create another quiz and trigger events
  const eventQuiz = await quizService.createQuiz({
    classId,
    classroomSessionId: sessionId,
    workspaceId,
    title: 'Realtime Event Verification Quiz'
  }, teacherUser);

  await quizService.addQuestion(eventQuiz.id, {
    questionText: 'Test Event Question',
    options: ['A', 'B', 'C', 'D'],
    correctOption: 'A'
  }, teacherUser, workspaceId);

  await quizService.readyQuiz(eventQuiz.id, teacherUser, workspaceId);
  await quizService.startQuiz(eventQuiz.id, teacherUser, workspaceId);
  await quizService.pauseQuiz(eventQuiz.id, teacherUser, workspaceId);
  await quizService.resumeQuiz(eventQuiz.id, teacherUser, workspaceId);
  await quizService.cancelQuiz(eventQuiz.id, teacherUser, workspaceId);

  unsubscribe();

  const eventTypes = capturedEvents.map((e) => e.type);
  assert(eventTypes.includes('quiz.created'), '63. EventBus emitted "quiz.created"', eventTypes);
  assert(eventTypes.includes('quiz.started'), '64. EventBus emitted "quiz.started"', eventTypes);
  assert(eventTypes.includes('quiz.question.started'), '65. EventBus emitted "quiz.question.started"', eventTypes);
  assert(eventTypes.includes('quiz.paused'), '66. EventBus emitted "quiz.paused"', eventTypes);
  assert(eventTypes.includes('quiz.resumed'), '67. EventBus emitted "quiz.resumed"', eventTypes);
  assert(eventTypes.includes('quiz.cancelled'), '68. EventBus emitted "quiz.cancelled"', eventTypes);

  // --- PART 9: ToolRegistry & Sandboxed Execution ---
  console.log('\n--- PART 9: ToolRegistry & Sandboxed Execution ---');

  const registeredToolNames = toolRegistry.list().map((t) => t.name);
  const requiredTools = [
    'quiz.create',
    'quiz.question.add',
    'quiz.question.update',
    'quiz.question.remove',
    'quiz.start',
    'quiz.pause',
    'quiz.resume',
    'quiz.question.start',
    'quiz.question.lock',
    'quiz.question.advance',
    'quiz.response.submit',
    'quiz.status',
    'quiz.results',
    'quiz.complete'
  ];

  for (const toolName of requiredTools) {
    assert(registeredToolNames.includes(toolName), `69. Tool '${toolName}' is registered in ToolRegistry`);
  }

  // Execute quiz.create via sandboxed ToolExecutor
  const teacherContext: ToolExecutionContext = {
    userId: teacherUser.id,
    workspaceId
  };

  const toolCreateRes = await toolExecutor.execute('quiz.create', {
    classId,
    classroomSessionId: sessionId,
    title: 'Tool Orchestrated Quiz',
    workspaceId
  }, teacherContext);

  assert(toolCreateRes.ok === true, '70. Tool ' + 'quiz.create' + ' executes successfully in sandbox', toolCreateRes.data);
  const toolQuizId = (toolCreateRes.data as any).quiz.id;

  // Add question via tool
  const toolAddQRes = await toolExecutor.execute('quiz.question.add', {
    quizId: toolQuizId,
    questionText: 'Which principle states position and momentum cannot be simultaneously measured with arbitrary precision?',
    options: ['A) Pauli Exclusion', 'B) Heisenberg Uncertainty', 'C) Aufbau Principle', 'D) Fermat Principle'],
    correctOption: 'B',
    points: 15,
    workspaceId
  }, teacherContext);

  assert(toolAddQRes.ok === true, '71. Tool ' + 'quiz.question.add' + ' executes successfully', toolAddQRes.data);

  // Start quiz via tool
  const toolStartRes = await toolExecutor.execute('quiz.start', {
    quizId: toolQuizId,
    workspaceId
  }, teacherContext);

  assert(toolStartRes.ok === true, '72. Tool ' + 'quiz.start' + ' executes successfully', toolStartRes.data);

  // Submit response via tool
  const studentContext: ToolExecutionContext = {
    userId: studentUser.id,
    workspaceId
  };

  const toolSubRes = await toolExecutor.execute('quiz.response.submit', {
    quizId: toolQuizId,
    questionId: (toolStartRes.data as any).activeQuestion.id,
    selectedOption: 'B',
    workspaceId
  }, studentContext);

  assert(toolSubRes.ok === true, '73. Tool ' + 'quiz.response.submit' + ' executes successfully', toolSubRes.data);
  assert((toolSubRes.data as any).response.isCorrect === true, '74. Tool response recorded as correct');

  // Query status via tool
  const toolStatusRes = await toolExecutor.execute('quiz.status', {
    quizId: toolQuizId,
    workspaceId
  }, studentContext);

  assert(toolStatusRes.ok === true, '75. Tool ' + 'quiz.status' + ' executes successfully', toolStatusRes.data);

  // Complete quiz via tool
  const toolCompleteRes = await toolExecutor.execute('quiz.complete', {
    quizId: toolQuizId,
    workspaceId
  }, teacherContext);

  assert(toolCompleteRes.ok === true, '76. Tool ' + 'quiz.complete' + ' executes successfully', toolCompleteRes.data);

  // Query results via tool
  const toolResultsRes = await toolExecutor.execute('quiz.results', {
    quizId: toolQuizId,
    workspaceId
  }, teacherContext);

  assert(toolResultsRes.ok === true, '77. Tool ' + 'quiz.results' + ' executes successfully', toolResultsRes.data);

  // --- PART 10: HTTP REST Route Layer & Authorization ---
  console.log('\n--- PART 10: HTTP REST Route Layer & Authorization ---');

  const app = express();
  app.use(express.json());
  app.use('/api/classroom/sessions', classroomRouter);
  app.use('/api/classroom/quizzes', quizRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Unauthenticated request rejected (401)
    const unauthRes = await fetch(`${baseUrl}/api/classroom/quizzes`);
    assert(unauthRes.status === 401, '78. HTTP GET /api/classroom/quizzes unauthenticated rejected with 401');

    // 2. Authenticated list quizzes (200)
    const listRes = await fetch(`${baseUrl}/api/classroom/quizzes?sessionId=${sessionId}&classId=${classId}&workspaceId=${workspaceId}`, {
      headers: { 'x-user-id': teacherUser.id, 'x-user-role': teacherUser.role }
    });
    assert(listRes.status === 200, '79. HTTP GET /api/classroom/quizzes with teacher credentials returns 200 OK');
    const listData = await listRes.json();
    assert(Array.isArray(listData.quizzes) && listData.quizzes.length >= 1, '80. HTTP returns quizzes array');

    // 3. Unauthorized non-teacher attempting quiz creation (403)
    const rogueCreateRes = await fetch(`${baseUrl}/api/classroom/quizzes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': studentUser.id,
        'x-user-role': studentUser.role
      },
      body: JSON.stringify({
        classId,
        classroomSessionId: sessionId,
        title: 'Unauthorized Quiz',
        workspaceId
      })
    });
    assert(rogueCreateRes.status === 403, '81. HTTP POST /api/classroom/quizzes by student rejected with 403 Forbidden');

    // 4. Cross-workspace access rejected
    const crossWsRes = await fetch(`${baseUrl}/api/classroom/quizzes?workspaceId=ws-other-alien`, {
      headers: { 'x-user-id': teacherUser.id, 'x-user-role': teacherUser.role }
    });
    assert(crossWsRes.status === 403 || crossWsRes.status === 404, '82. HTTP Cross-workspace query rejected with 403/404');

    // 5. Student recovery: fetch active question state
    const recoveryRes = await fetch(`${baseUrl}/api/classroom/quizzes/${createdQuiz.id}/active-question?workspaceId=${workspaceId}`, {
      headers: { 'x-user-id': studentUser.id, 'x-user-role': studentUser.role }
    });
    assert(recoveryRes.status === 200, '83. HTTP GET /active-question returns 200 OK for student recovery');
    const recoveryData = await recoveryRes.json();
    assert(Boolean(recoveryData.quiz), '84. Recovery payload contains quiz state');

    // 6. Query results via HTTP
    const httpResultsRes = await fetch(`${baseUrl}/api/classroom/quizzes/${createdQuiz.id}/results?workspaceId=${workspaceId}`, {
      headers: { 'x-user-id': teacherUser.id, 'x-user-role': teacherUser.role }
    });
    assert(httpResultsRes.status === 200, '85. HTTP GET /results returns 200 OK');
    const httpResultsData = await httpResultsRes.json();
    assert(httpResultsData.results?.totalParticipants === 2, '86. HTTP results report 2 total participants');
  } finally {
    server.close();
  }

  // --- PART 11: Process Restart & Persistence Recovery ---
  console.log('\n--- PART 11: Process Restart & Persistence Recovery ---');

  // Create a brand new DiskJarvisDataRepository instance pointing to the same file
  const restartedRepo = new DiskJarvisDataRepository(testDbPath);
  await restartedRepo.init();

  const recoveredQuiz = await restartedRepo.quizzes.getQuizById(createdQuiz.id, workspaceId);
  assert(Boolean(recoveredQuiz), '87. PERSISTENCE: Completed quiz recovered after simulated process restart');
  assert(recoveredQuiz?.status === 'completed', '88. PERSISTENCE: Quiz status "completed" preserved after restart');

  const recoveredQuestions = await restartedRepo.quizzes.listQuestions(createdQuiz.id);
  assert(recoveredQuestions.length === 2, '89. PERSISTENCE: Both questions preserved after restart');

  const recoveredResponses = await restartedRepo.quizzes.listResponses(createdQuiz.id);
  assert(recoveredResponses.length === 4, '90. PERSISTENCE: All 4 student responses preserved after restart', recoveredResponses.length);

  const recoveredAlex = await restartedRepo.quizzes.getParticipantState(createdQuiz.id, studentUser.id);
  assert(recoveredAlex?.score === 30, '91. PERSISTENCE: Alex Chen score (30) preserved after restart');

  // --- PART 12: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- PART 12: Test Data Hygiene & Invariant Verification ---');

  // Clean up isolated temporary database file
  try {
    fs.unlinkSync(testDbPath);
  } catch (_e) {}

  // Reset active repository to default singleton
  resetActiveRepository();

  const postM13DbHash = getFileSha256(durableDbPath);
  assert(initialDbHash === postM13DbHash, '92. TEST DATA HYGIENE: Running M13 tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)');

  // Verify zero runtime test storage objects
  const storageObjectsDir = path.resolve(process.cwd(), 'data', 'storage', 'objects');
  const remainingObjects = fs.existsSync(storageObjectsDir)
    ? fs.readdirSync(storageObjectsDir).filter((f) => f !== '.gitkeep' && !f.startsWith('obj-seed-'))
    : [];
  assert(remainingObjects.length === 0, `93. TEST DATA HYGIENE: Zero runtime-generated test storage artifacts in data/storage/objects (found: ${remainingObjects.length})`);

  console.log('\n===================================================================');
  console.log(`=== MILESTONE 13 TEST SUMMARY: ALL ${passed}/${total} PASSING (100%) ===`);
  console.log('===================================================================\n');
}

runMilestone13Tests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[FATAL] Milestone 13 test suite failure:', err);
    process.exit(1);
  });
