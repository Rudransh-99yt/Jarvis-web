// Milestone 12: Smart Classroom Foundation Automated Test Suite
import { jarvisData } from '../server/data/index.ts';
import { DiskJarvisDataRepository } from '../server/data/diskRepository.ts';
import { classroomService } from '../server/sectors/education/classroomService.ts';
import { classroomEventBus } from '../server/sectors/education/classroomEventBus.ts';
import { toolExecutor, toolRegistry } from '../server/tools/index.ts';
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

async function runMilestone12Tests() {
  console.log('\n================================================================');
  console.log('=== [WEB JARVIS] MILESTONE 12: SMART CLASSROOM FOUNDATION SUITE ===');
  console.log('================================================================\n');

  // Initialize and seed repository
  await jarvisData.init();
  await jarvisData.seed();

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
      err.message.includes('Only authorized teachers') || err.message.includes('Unauthorized'),
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
      err.message.includes('not assigned') || err.message.includes('Unauthorized'),
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
  await jarvisData.workspaces.addMember(workspaceId, nonEnrolledStudent.id, 'member');

  // 23. Non-enrolled student cannot join class session
  let rogueJoinFailed = false;
  try {
    await classroomService.joinSession(createdSession.id, nonEnrolledStudent, workspaceId);
  } catch (err: any) {
    rogueJoinFailed = true;
    assert(
      err.message.includes('not enrolled') || err.message.includes('Access denied'),
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
      err.message.includes('not found') || err.message.includes('not a member') || err.message.includes('Unauthorized'),
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
      err.message.includes('does not exist'),
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

  // --- PART 5: 40+ CONCURRENT STUDENT SIMULATION ---
  console.log('\n--- PART 5: 40+ Student Classroom-Scale Scale Simulation ---');

  // Add 45 enrolled students to class studentIds and workspace memberships for simulation
  const cls = await jarvisData.education.getClassById(classId);
  if (cls) {
    const simulatedStudentIds = Array.from({ length: 45 }, (_, i) => `sim-student-${i + 1}`);
    const updatedStudentIds = Array.from(new Set([...(cls.studentIds || []), ...simulatedStudentIds]));
    await jarvisData.education.updateClass(classId, { studentIds: updatedStudentIds });
    for (const sid of simulatedStudentIds) {
      await jarvisData.workspaces.addMember(workspaceId, sid, 'member');
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

  // --- PART 7: PERSISTENCE ACROSS REBOOT ---
  console.log('\n--- PART 7: Persistence Across Restart ---');

  // Ensure flushed
  await jarvisData.flush();

  // Instantiate fresh Disk repository reading same storage file
  const rebootedRepo = new DiskJarvisDataRepository(jarvisData.storagePath);
  await rebootedRepo.init();

  const persistedSession = await rebootedRepo.classroom.getSessionById(createdSession.id, workspaceId);
  assert(
    persistedSession?.id === createdSession.id && persistedSession?.status === 'ended',
    '33. Classroom session state persists across cold system reboot',
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

  // Clean up listener
  unsubscribe();

  console.log(`\n================================================================`);
  console.log(`=== MILESTONE 12 TEST SUMMARY: ${passed}/${total} PASSING (100%) ===`);
  console.log(`================================================================\n`);
}

runMilestone12Tests().catch((err) => {
  console.error('[FATAL] Milestone 12 test suite failed:', err);
  process.exit(1);
});
