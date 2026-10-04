// Milestone 12: Smart Classroom Foundation Automated Test Suite (Hardened & Isolated)
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
import { ClassroomService } from '../server/sectors/education/classroomService.ts';
import { classroomEventBus } from '../server/sectors/education/classroomEventBus.ts';
import { classroomRouter } from '../server/sectors/education/classroomRoutes.ts';
import { toolExecutor } from '../server/tools/index.ts';
import type { User } from '../server/data/types.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import type { RealtimeClassroomEvent } from '../src/types/classroom.ts';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Milestone 12 Assertion Failed: ${testName} - ${JSON.stringify(detail || '')}`);
  }
}

function getFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function runMilestone12Tests() {
  console.log('\n================================================================');
  console.log('=== [WEB JARVIS] MILESTONE 12: SMART CLASSROOM FOUNDATION SUITE ===');
  console.log('=== (HARDENED AUTHORIZATION & DATA HYGIENE VALIDATION)         ===');
  console.log('================================================================\n');

  // Baseline Verification: Record initial persistent database hash
  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // Setup isolated temporary repository for test execution
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
  const testDbPath = path.join(testDbDir, `m12-test-jarvis-${Date.now()}.json`);

  const isolatedRepo = new DiskJarvisDataRepository(testDbPath);
  await isolatedRepo.init();
  await isolatedRepo.seed();
  setActiveRepository(isolatedRepo);

  const classroomService = new ClassroomService(isolatedRepo);

  const workspaceId = 'ws-stark-core';
  const classId = 'class-phys-301';

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

  const otherStudentUser: User = {
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

  // Register nonEnrolledStudent and unauthorizedTeacher in the isolated user repository
  await isolatedRepo.users.create(nonEnrolledStudent);
  await isolatedRepo.users.create(unauthorizedTeacher);

  // --- PART 1: SESSION CREATION & AUTHORIZATION ---
  console.log('\n--- PART 1: Session Creation & Teacher Authorization ---');

  // 1. Teacher initializes scheduled classroom session
  const createdSession = await classroomService.createSession(
    {
      classId,
      workspaceId,
      title: 'PHYS-301: Wave Mechanics & Hilbert Spaces',
      status: 'scheduled',
      boardTopic: 'Eigenstates & Hermitian Operators'
    },
    teacherUser
  );

  assert(
    !!createdSession && createdSession.id.startsWith('session-') && createdSession.status === 'scheduled',
    '1. Authorized teacher creates scheduled classroom session',
    createdSession
  );

  assert(
    createdSession.boardState.state === 'waiting' && createdSession.boardState.currentTopic === 'Eigenstates & Hermitian Operators',
    '2. Session has valid initial board state',
    createdSession.boardState
  );

  // 3. Unauthorized student cannot create session
  let studentCreateFailed = false;
  try {
    await classroomService.createSession(
      { classId, workspaceId, title: 'Unauthorized Session' },
      studentUser
    );
  } catch (err: any) {
    studentCreateFailed = true;
    assert(
      err.message.includes('Only authorized') || err.message.includes('Forbidden') || err.message.includes('Unauthorized'),
      '3. Enrolled student is blocked from creating sessions',
      err.message
    );
  }
  assert(studentCreateFailed, '3b. Student creation rejected');

  // 4. Unauthorized teacher cannot create session for course they do not teach
  let otherTeacherFailed = false;
  try {
    await classroomService.createSession(
      { classId, workspaceId, title: 'Unauthorized Session' },
      unauthorizedTeacher
    );
  } catch (err: any) {
    otherTeacherFailed = true;
    assert(
      err.message.includes('not assigned') || err.message.includes('Forbidden') || err.message.includes('Unauthorized'),
      '4. Unauthorized teacher blocked from creating session for course',
      err.message
    );
  }
  assert(otherTeacherFailed, '4b. Unauthorized teacher creation rejected');

  // --- PART 2: REAL-TIME EVENTS & LIFECYCLE ---
  console.log('\n--- PART 2: Real-time EventBus & Lifecycle Transitions ---');

  const receivedEvents: RealtimeClassroomEvent[] = [];
  const unsubscribe = classroomEventBus.subscribeToSession(createdSession.id, workspaceId, (evt) => {
    receivedEvents.push(evt);
  });

  // 5. Start Session (transitions to live, broadcasts classroom.session.started)
  const startedSession = await classroomService.startSession(createdSession.id, teacherUser, workspaceId);
  assert(
    startedSession.status === 'live' && !!startedSession.startedAt && startedSession.boardState.state === 'lesson',
    '5. Session transitioned to LIVE status with lesson board state',
    startedSession
  );

  assert(
    receivedEvents.some((e) => e.type === 'classroom.session.started' && e.sessionId === createdSession.id),
    '6. classroom.session.started event published to session channel'
  );

  // 7. Pause Session (broadcasts classroom.session.paused)
  const pausedSession = await classroomService.pauseSession(createdSession.id, teacherUser, workspaceId);
  assert(
    pausedSession.status === 'paused' && pausedSession.boardState.state === 'paused',
    '7. Session paused with boardState paused',
    pausedSession
  );

  assert(
    receivedEvents.some((e) => e.type === 'classroom.session.paused'),
    '8. classroom.session.paused event published'
  );

  // 9. Resume Session (broadcasts classroom.session.resumed)
  const resumedSession = await classroomService.resumeSession(createdSession.id, teacherUser, workspaceId);
  assert(
    resumedSession.status === 'live' && resumedSession.boardState.state === 'lesson',
    '9. Session resumed back to live with lesson board state',
    resumedSession
  );

  assert(
    receivedEvents.some((e) => e.type === 'classroom.session.resumed'),
    '10. classroom.session.resumed event published'
  );

  // 11. Smart Board State Change (broadcasts classroom.board.state.changed)
  const updatedBoard = await classroomService.updateBoardState(
    createdSession.id,
    {
      state: 'question',
      currentTopic: 'Live Poll: Wavefunction Collapse Probability',
      message: 'Select response option A-D on your software remote.'
    },
    teacherUser,
    workspaceId
  );

  assert(
    updatedBoard.state === 'question' && updatedBoard.currentTopic?.includes('Live Poll'),
    '11. Smart Board state updated to question mode',
    updatedBoard
  );

  assert(
    receivedEvents.some(
      (e) => e.type === 'classroom.board.state.changed' && e.data?.boardState?.state === 'question'
    ),
    '12. classroom.board.state.changed event received by subscribers'
  );

  // --- PART 3: STUDENT PRESENCE, JOIN, LEAVE & RECONNECT ---
  console.log('\n--- PART 3: Student Presence, Join, Leave & Heartbeat ---');

  // 13. Enrolled student joins session
  const joinResult1 = await classroomService.joinSession(
    createdSession.id,
    studentUser,
    workspaceId,
    'software_remote'
  );

  assert(
    joinResult1.participant.studentId === studentUser.id &&
      joinResult1.participant.connectionStatus === 'connected' &&
      joinResult1.participant.deviceType === 'software_remote',
    '13. Enrolled student joins active classroom session with software remote',
    joinResult1.participant
  );

  assert(
    joinResult1.session.activeStudentCount === 1,
    '14. Active student count increments to 1',
    joinResult1.session.activeStudentCount
  );

  assert(
    receivedEvents.some(
      (e) => e.type === 'classroom.student.joined' && e.data?.participant?.studentId === studentUser.id
    ),
    '15. classroom.student.joined event broadcast to participants'
  );

  // 16. Second enrolled student joins
  const joinResult2 = await classroomService.joinSession(
    createdSession.id,
    otherStudentUser,
    workspaceId,
    'tablet'
  );

  assert(
    joinResult2.session.activeStudentCount === 2,
    '16. Second enrolled student joins, activeStudentCount is 2',
    joinResult2.session.activeStudentCount
  );

  // 17. Duplicate join handling (idempotent upsert, count stays 2)
  const duplicateJoin = await classroomService.joinSession(
    createdSession.id,
    studentUser,
    workspaceId,
    'web'
  );

  assert(
    duplicateJoin.participant.deviceType === 'web' && duplicateJoin.session.activeStudentCount === 2,
    '17. Duplicate join is idempotent and does not double-count active students',
    duplicateJoin.session.activeStudentCount
  );

  // 18. Student Presence Heartbeat
  const presenceRes = await classroomService.recordPresence(
    createdSession.id,
    studentUser,
    workspaceId
  );

  assert(
    presenceRes.ok && !!presenceRes.lastSeenAt,
    '18. Presence heartbeat updates lastSeenAt timestamp',
    presenceRes
  );

  assert(
    receivedEvents.some(
      (e) => e.type === 'classroom.student.presence' && e.data?.studentId === studentUser.id
    ),
    '19. classroom.student.presence heartbeat event emitted'
  );

  // 20. Student leaves session
  const leaveRes = await classroomService.leaveSession(
    createdSession.id,
    studentUser,
    workspaceId
  );

  assert(
    leaveRes.participant?.connectionStatus === 'disconnected' && leaveRes.session.activeStudentCount === 1,
    '20. Student disconnect decrements active count to 1 and marks disconnected',
    leaveRes.session.activeStudentCount
  );

  assert(
    receivedEvents.some(
      (e) => e.type === 'classroom.student.left' && e.data?.participant?.studentId === studentUser.id
    ),
    '21. classroom.student.left event broadcast'
  );

  // 22. Student Reconnect (heartbeat or re-join)
  const reconnectRes = await classroomService.joinSession(
    createdSession.id,
    studentUser,
    workspaceId,
    'software_remote'
  );

  assert(
    reconnectRes.participant.connectionStatus === 'connected' && reconnectRes.session.activeStudentCount === 2,
    '22. Reconnect restores connected status and increments activeStudentCount back to 2',
    reconnectRes.session.activeStudentCount
  );

  // --- PART 4: SECURITY & BOUNDARY DEFENSES ---
  console.log('\n--- PART 4: Security, Tenant Isolation & Boundaries ---');

  // Add nonEnrolledStudent as workspace member so workspace check passes, but class enrollment fails
  await isolatedRepo.workspaces.addMember(workspaceId, nonEnrolledStudent.id, 'member');

  // 23. Non-enrolled student cannot join class session
  let rogueJoinFailed = false;
  try {
    await classroomService.joinSession(createdSession.id, nonEnrolledStudent, workspaceId);
  } catch (err: any) {
    rogueJoinFailed = true;
    assert(
      err.message.includes('not enrolled') || err.message.includes('Access denied') || err.message.includes('Unauthorized'),
      '23. Non-enrolled student is rejected from joining session',
      err.message
    );
  }
  assert(rogueJoinFailed, '23b. Rogue student join was blocked');

  // 24. Cross-workspace access blocked
  let crossWorkspaceFailed = false;
  try {
    await classroomService.getSession(createdSession.id, 'ws-other-unauthorized', teacherUser);
  } catch (err: any) {
    crossWorkspaceFailed = true;
    assert(
      err.message.includes('not found') || err.message.includes('not a member') || err.message.includes('denied') || err.message.includes('Unauthorized'),
      '24. Cross-workspace session access blocked',
      err.message
    );
  }
  assert(crossWorkspaceFailed, '24b. Cross-workspace isolation enforced');

  // 25. Arbitrary session ID access blocked
  let arbitrarySessionFailed = false;
  try {
    await classroomService.joinSession('session-non-existent-999', studentUser, workspaceId);
  } catch (err: any) {
    arbitrarySessionFailed = true;
    assert(
      err.message.includes('does not exist') || err.message.includes('not found'),
      '25. Non-existent arbitrary session ID cannot be joined',
      err.message
    );
  }
  assert(arbitrarySessionFailed, '25b. Arbitrary session ID rejected');

  // 26. Active Session retrieval
  const activeSession = await classroomService.getActiveSession(classId, workspaceId, studentUser);
  assert(
    activeSession?.id === createdSession.id && activeSession?.status === 'live',
    '26. Active live session correctly retrieved for course',
    activeSession?.id
  );

  // --- PART 5: 40+ CONCURRENT STUDENT SIMULATION (ISOLATED) ---
  console.log('\n--- PART 5: 40+ Student Classroom-Scale Simulation (In Isolation) ---');

  // Add 45 enrolled students strictly to isolated test repo
  const cls = await isolatedRepo.education.getClassById(classId);
  if (cls) {
    const simulatedStudentIds = Array.from({ length: 45 }, (_, i) => `sim-student-${i + 1}`);
    const updatedStudentIds = Array.from(new Set([...(cls.studentIds || []), ...simulatedStudentIds]));
    await isolatedRepo.education.updateClass(classId, { studentIds: updatedStudentIds });
    for (const sid of simulatedStudentIds) {
      await isolatedRepo.users.create({
        id: sid,
        displayName: `Cadet Unit ${sid.split('-')[2]}`,
        email: `${sid}@stark.local`,
        role: 'student'
      });
      await isolatedRepo.workspaces.addMember(workspaceId, sid, 'member');
    }
  }

  // Simulate 42 students concurrently joining the session
  const simulationPromises = Array.from({ length: 42 }, async (_, i) => {
    const id = `sim-student-${i + 1}`;
    const student: User = {
      id,
      displayName: `Cadet Unit ${i + 1}`,
      email: `${id}@stark.local`,
      role: 'student',
      createdAt: new Date().toISOString()
    };
    const deviceType = i % 3 === 0 ? 'tablet' : i % 2 === 0 ? 'mobile' : 'software_remote';
    return classroomService.joinSession(createdSession.id, student, workspaceId, deviceType);
  });

  const simResults = await Promise.all(simulationPromises);
  assert(simResults.length === 42, '27. 42 concurrent simulated student join requests executed');

  const participantsList = await classroomService.listParticipants(
    createdSession.id,
    workspaceId,
    teacherUser,
    true
  );

  assert(
    participantsList.length >= 42,
    `28. Classroom roster contains ${participantsList.length} actively connected students (scale test passed)`,
    participantsList.length
  );

  // Verify session active count matches
  const currentSession = await classroomService.getSession(createdSession.id, workspaceId, teacherUser);
  assert(
    currentSession.activeStudentCount >= 42,
    `29. Session activeStudentCount reflects all ${currentSession.activeStudentCount} connected students`,
    currentSession.activeStudentCount
  );

  // --- PART 6: END SESSION & TEARDOWN ---
  console.log('\n--- PART 6: End Session & Teardown ---');

  const endedSession = await classroomService.endSession(createdSession.id, teacherUser, workspaceId);
  assert(
    endedSession.status === 'ended' &&
      endedSession.activeStudentCount === 0 &&
      endedSession.boardState.state === 'ended',
    '30. Teacher ends session: status is ended, active count resets to 0',
    endedSession
  );

  assert(
    receivedEvents.some((e) => e.type === 'classroom.session.ended'),
    '31. classroom.session.ended event broadcast'
  );

  // Cannot join ended session
  let joinEndedFailed = false;
  try {
    await classroomService.joinSession(createdSession.id, studentUser, workspaceId);
  } catch (err: any) {
    joinEndedFailed = true;
    assert(
      err.message.includes('already ended'),
      '32. Attempting to join an ended session is rejected',
      err.message
    );
  }
  assert(joinEndedFailed, '32b. Ended session join guarded');

  // --- PART 7: PERSISTENCE ACROSS REBOOT (ON ISOLATED REPO) ---
  console.log('\n--- PART 7: Persistence Across Restart (Isolated Disk File) ---');

  // Ensure isolated repo is flushed
  await isolatedRepo.flush();

  // Instantiate fresh Disk repository reading test storage file
  const rebootedRepo = new DiskJarvisDataRepository(testDbPath);
  await rebootedRepo.init();

  const persistedSession = await rebootedRepo.classroom.getSessionById(createdSession.id, workspaceId);
  assert(
    persistedSession?.id === createdSession.id && persistedSession?.status === 'ended',
    '33. Classroom session state persists across cold system reboot in isolated repo',
    persistedSession?.id
  );

  const persistedParticipants = await rebootedRepo.classroom.listParticipants(createdSession.id);
  assert(
    persistedParticipants.length >= 42,
    `34. Participant roster with ${persistedParticipants.length} students preserved in storage across reboot`,
    persistedParticipants.length
  );

  // --- PART 8: TOOL EXECUTOR INTEGRATION (7 CLASSROOM TOOLS) ---
  console.log('\n--- PART 8: Sandboxed Tool Calling Integration ---');

  const toolContext: ToolExecutionContext = {
    sessionId: 'session-tool-test',
    timestamp: new Date().toISOString(),
    serverUptime: 100,
    userId: 'teacher-1',
    role: 'teacher',
    workspaceId: 'ws-stark-core'
  };

  // Tool 1: classroom.session.create
  const toolCreateRes = await toolExecutor.execute(
    {
      name: 'classroom.session.create',
      args: {
        classId: 'class-math-240',
        title: 'MATH-240 Differential Geometry Lecture',
        boardTopic: 'Stokes Theorem & Manifold Curvature',
        status: 'live'
      }
    },
    toolContext
  );

  assert(
    toolCreateRes.ok && !!(toolCreateRes.data as any)?.sessionId,
    '35. Tool classroom.session.create successfully initializes live session',
    toolCreateRes.data
  );

  const newToolSessionId = (toolCreateRes.data as any).sessionId;

  // Tool 2: classroom.session.status
  const toolStatusRes = await toolExecutor.execute(
    {
      name: 'classroom.session.status',
      args: { sessionId: newToolSessionId }
    },
    toolContext
  );

  assert(
    toolStatusRes.ok && (toolStatusRes.data as any)?.hasActiveSession === true,
    '36. Tool classroom.session.status retrieves live session details',
    toolStatusRes.data
  );

  // Tool 3: classroom.session.pause
  const toolPauseRes = await toolExecutor.execute(
    {
      name: 'classroom.session.pause',
      args: { sessionId: newToolSessionId }
    },
    toolContext
  );

  assert(
    toolPauseRes.ok && (toolPauseRes.data as any)?.status === 'paused',
    '37. Tool classroom.session.pause pauses session',
    toolPauseRes.data
  );

  // Tool 4: classroom.session.resume
  const toolResumeRes = await toolExecutor.execute(
    {
      name: 'classroom.session.resume',
      args: { sessionId: newToolSessionId }
    },
    toolContext
  );

  assert(
    toolResumeRes.ok && (toolResumeRes.data as any)?.status === 'live',
    '38. Tool classroom.session.resume resumes session',
    toolResumeRes.data
  );

  // Tool 5: classroom.session.participants
  const toolPartsRes = await toolExecutor.execute(
    {
      name: 'classroom.session.participants',
      args: { sessionId: newToolSessionId }
    },
    toolContext
  );

  assert(
    toolPartsRes.ok && Array.isArray((toolPartsRes.data as any)?.participants),
    '39. Tool classroom.session.participants lists roster',
    toolPartsRes.data
  );

  // Tool 6: classroom.session.end
  const toolEndRes = await toolExecutor.execute(
    {
      name: 'classroom.session.end',
      args: { sessionId: newToolSessionId }
    },
    toolContext
  );

  assert(
    toolEndRes.ok && (toolEndRes.data as any)?.status === 'ended',
    '40. Tool classroom.session.end terminates session',
    toolEndRes.data
  );

  // Tool 7: Unauthenticated tool execution fails closed
  const unauthToolRes = await toolExecutor.execute(
    {
      name: 'classroom.session.status',
      args: { sessionId: newToolSessionId }
    },
    { sessionId: 'test-unauth', timestamp: new Date().toISOString(), serverUptime: 10 }
  );
  assert(
    !unauthToolRes.ok && (unauthToolRes.error?.message?.includes('Unauthenticated') || unauthToolRes.error?.message?.includes('missing userId')),
    '41. Unauthenticated tool call rejected with failure result',
    unauthToolRes.error
  );

  // Clean up listener
  unsubscribe();

  // --- PART 9: HTTP/API BOUNDARY AUTHORIZATION TESTS (REQUIREMENT 5) ---
  console.log('\n--- PART 9: HTTP / Route Boundary Authorization Tests ---');

  const app = express();
  app.use(express.json());
  app.use('/api/classroom/sessions', classroomRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/classroom/sessions`;

  try {
    // Create a live session for HTTP boundary tests
    const httpTestSession = await classroomService.createSession(
      {
        classId,
        workspaceId,
        title: 'PHYS-301 Security Verification Session',
        status: 'live',
        boardTopic: 'Security & Authorization Tests'
      },
      teacherUser
    );

    // 42. Unauthenticated request (no user headers/query) -> 401
    const unauthHttpRes = await fetch(`${baseUrl}/active?classId=${classId}&workspaceId=${workspaceId}`);
    assert(
      unauthHttpRes.status === 401,
      '42. HTTP: Unauthenticated request rejected with 401 Unauthorized',
      unauthHttpRes.status
    );
    const unauthBody = await unauthHttpRes.json();
    assert(unauthBody.error?.code === 'UNAUTHENTICATED', '42b. HTTP: Returns code UNAUTHENTICATED');

    // 43. Invalid identity / unknown user ID header -> 401
    const invalidUserRes = await fetch(`${baseUrl}/active?classId=${classId}&workspaceId=${workspaceId}`, {
      headers: { 'x-user-id': 'user-unknown-adversary' }
    });
    assert(
      invalidUserRes.status === 401,
      '43. HTTP: Invalid/unregistered user ID rejected with 401 Unauthorized',
      invalidUserRes.status
    );

    // 44. Forged user ID header (non-existent) -> 401
    const forgedIdRes = await fetch(`${baseUrl}/${httpTestSession.id}`, {
      headers: { 'x-user-id': 'fake-hacker-999' }
    });
    assert(
      forgedIdRes.status === 401,
      '44. HTTP: Forged user ID header rejected with 401',
      forgedIdRes.status
    );

    // 45. Forged user role header (student passes role: teacher to control session) -> 403
    const forgedRoleRes = await fetch(`${baseUrl}/${httpTestSession.id}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': studentUser.id,
        'x-user-role': 'teacher' // Client attempts to forge role!
      },
      body: JSON.stringify({ workspaceId })
    });
    assert(
      forgedRoleRes.status === 403,
      '45. HTTP: Student forging x-user-role=teacher is rejected with 403 Forbidden',
      forgedRoleRes.status
    );

    // 46. Student attempting teacher control (pause session) -> 403
    const studentControlRes = await fetch(`${baseUrl}/${httpTestSession.id}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': studentUser.id
      },
      body: JSON.stringify({ workspaceId })
    });
    assert(
      studentControlRes.status === 403,
      '46. HTTP: Enrolled student attempting teacher session control rejected with 403',
      studentControlRes.status
    );

    // 47. Non-enrolled student attempting to join session -> 403
    const nonEnrolledJoinRes = await fetch(`${baseUrl}/${httpTestSession.id}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': nonEnrolledStudent.id
      },
      body: JSON.stringify({ workspaceId, deviceType: 'web' })
    });
    assert(
      nonEnrolledJoinRes.status === 403,
      '47. HTTP: Non-enrolled student attempting to join rejected with 403 Forbidden',
      nonEnrolledJoinRes.status
    );

    // 48. Teacher from another class attempting control or session creation -> 403
    const otherTeacherControlRes = await fetch(`${baseUrl}/${httpTestSession.id}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': unauthorizedTeacher.id
      },
      body: JSON.stringify({ workspaceId })
    });
    assert(
      otherTeacherControlRes.status === 403,
      '48. HTTP: Teacher from another class attempting session control rejected with 403',
      otherTeacherControlRes.status
    );

    // 49. Cross-workspace access rejected -> 403 / 404
    const crossWsRes = await fetch(`${baseUrl}/${httpTestSession.id}?workspaceId=ws-other-unauthorized`, {
      headers: { 'x-user-id': teacherUser.id }
    });
    assert(
      crossWsRes.status === 403 || crossWsRes.status === 404,
      '49. HTTP: Cross-workspace access rejected with 403/404',
      crossWsRes.status
    );

    // 50. Participant from another workspace rejected -> 403
    // Create an outsider user not in ws-stark-core
    const outsiderUser: User = {
      id: 'user-outsider',
      displayName: 'Outsider',
      email: 'outsider@domain.com',
      role: 'student',
      createdAt: new Date().toISOString()
    };
    await isolatedRepo.users.create(outsiderUser);

    const outsiderJoinRes = await fetch(`${baseUrl}/${httpTestSession.id}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': outsiderUser.id
      },
      body: JSON.stringify({ workspaceId })
    });
    assert(
      outsiderJoinRes.status === 403,
      '50. HTTP: Participant from another workspace rejected with 403 Forbidden',
      outsiderJoinRes.status
    );

    // 51. Unauthorized SSE subscription rejected BEFORE stream headers
    // 51a. No credentials on stream -> 401
    const unauthStreamRes = await fetch(`${baseUrl}/${httpTestSession.id}/stream?workspaceId=${workspaceId}`);
    assert(
      unauthStreamRes.status === 401,
      '51a. HTTP: Unauthorized SSE stream request rejected with 401 (before headers sent)',
      unauthStreamRes.status
    );
    assert(
      unauthStreamRes.headers.get('content-type')?.includes('application/json'),
      '51b. HTTP: Rejection returns JSON error, not text/event-stream'
    );

    // 51c. Non-enrolled student on stream -> 403
    const rogueStreamRes = await fetch(`${baseUrl}/${httpTestSession.id}/stream?workspaceId=${workspaceId}&userId=${nonEnrolledStudent.id}`);
    assert(
      rogueStreamRes.status === 403,
      '51c. HTTP: Non-enrolled student SSE stream subscription rejected with 403 Forbidden',
      rogueStreamRes.status
    );

    // 51d. Teacher from another class on stream -> 403
    const otherTeacherStreamRes = await fetch(`${baseUrl}/${httpTestSession.id}/stream?workspaceId=${workspaceId}&userId=${unauthorizedTeacher.id}`);
    assert(
      otherTeacherStreamRes.status === 403,
      '51d. HTTP: Unauthorized teacher SSE stream subscription rejected with 403 Forbidden',
      otherTeacherStreamRes.status
    );

    // 52. Student attempting teacher board state update -> 403
    const studentBoardRes = await fetch(`${baseUrl}/${httpTestSession.id}/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': studentUser.id
      },
      body: JSON.stringify({ state: 'question', workspaceId })
    });
    assert(
      studentBoardRes.status === 403,
      '52. HTTP: Student attempting to update board state rejected with 403 Forbidden',
      studentBoardRes.status
    );

    // 53. Authorized operations pass closed boundary
    // 53a. Enrolled student joins
    const authJoinRes = await fetch(`${baseUrl}/${httpTestSession.id}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': studentUser.id
      },
      body: JSON.stringify({ workspaceId, deviceType: 'software_remote' })
    });
    assert(authJoinRes.status === 200, '53a. HTTP: Authorized enrolled student join succeeds (200 OK)');

    // 53b. Presence heartbeat
    const authPresenceRes = await fetch(`${baseUrl}/${httpTestSession.id}/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': studentUser.id
      },
      body: JSON.stringify({ workspaceId })
    });
    assert(authPresenceRes.status === 200, '53b. HTTP: Authorized student presence heartbeat succeeds (200 OK)');

    // 53c. Teacher updates board state
    const authBoardRes = await fetch(`${baseUrl}/${httpTestSession.id}/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': teacherUser.id
      },
      body: JSON.stringify({ state: 'lesson', currentTopic: 'Quantum Electrodynamics', workspaceId })
    });
    assert(authBoardRes.status === 200, '53c. HTTP: Authorized teacher board state update succeeds (200 OK)');

    // 53d. Teacher ends session
    const authEndRes = await fetch(`${baseUrl}/${httpTestSession.id}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': teacherUser.id
      },
      body: JSON.stringify({ workspaceId })
    });
    assert(authEndRes.status === 200, '53d. HTTP: Authorized teacher end session succeeds (200 OK)');

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // --- PART 10: TEST DATA HYGIENE & REGRESSION PROOF (REQUIREMENT 4) ---
  console.log('\n--- PART 10: Test Data Hygiene & Durable Store Invariant Verification ---');

  // Verify that running M12 tests did NOT alter the durable database file data/jarvis-db.json
  const finalDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === finalDbHash,
    '54. TEST DATA HYGIENE: Running M12 tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)',
    { initialDbHash, finalDbHash }
  );

  // Inspect data/jarvis-db.json content to prove zero simulated student test artifacts exist
  const durableDbContent = JSON.parse(fs.readFileSync(durableDbPath, 'utf-8'));
  const hasSimulatedStudentsInUsers = (durableDbContent.users || []).some((u: any) => u.id.startsWith('sim-student') || u.id === 'student-rogue');
  const hasSimulatedStudentsInMemberships = (durableDbContent.memberships || []).some((m: any) => m.userId.startsWith('sim-student') || m.userId === 'student-rogue');
  const physClass = (durableDbContent.classes || []).find((c: any) => c.id === 'class-phys-301');
  const hasSimulatedInClass = physClass?.studentIds?.some((sid: string) => sid.startsWith('sim-student'));

  assert(
    !hasSimulatedStudentsInUsers && !hasSimulatedStudentsInMemberships && !hasSimulatedInClass,
    '55. TEST DATA HYGIENE: Simulated 40+ students exist exclusively in test isolation; ZERO simulated students in data/jarvis-db.json'
  );

  // Verify no test artifacts appear in git-tracked data/storage/objects
  const storageObjectsDir = path.resolve(process.cwd(), 'data', 'storage', 'objects');
  const remainingStorageFiles = fs.readdirSync(storageObjectsDir).filter((f) => f !== '.gitkeep' && f !== 'obj-seed-vid-1');
  assert(
    remainingStorageFiles.length === 0,
    `56. TEST DATA HYGIENE: Zero runtime-generated test storage artifacts in data/storage/objects (found: ${remainingStorageFiles.length})`
  );

  // Teardown: Reset repository singleton and clean up temporary test DB
  resetActiveRepository();
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  console.log(`\n================================================================`);
  console.log(`=== MILESTONE 12 TEST SUMMARY: ALL ${passed}/${total} PASSING (100%) ===`);
  console.log(`================================================================\n`);
}

runMilestone12Tests().catch((err) => {
  console.error('[FATAL] Milestone 12 test suite failed:', err);
  process.exit(1);
});
