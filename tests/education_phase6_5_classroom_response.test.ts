import assert from 'node:assert';
import { classroomResponseService } from '../server/sectors/education/classroomResponse/classroomResponseService.ts';
import { classroomResponseStore } from '../server/sectors/education/classroomResponse/classroomResponseStore.ts';
import { mockResponseProvider } from '../server/sectors/education/classroomResponse/responseProvider.ts';
import { learnerExposureStore } from '../server/sectors/education/questionIntelligence/learnerExposureStore.ts';
import { startHttpHarness } from './httpHarness.ts';
import { jarvisData } from '../server/data/index.ts';
import type { AuthenticatedPrincipal } from '../server/auth/principal.ts';

console.log('=== [WEB JARVIS] PHASE 6.5: CLASSROOM RESPONSE SESSION FOUNDATION TEST SUITE ===');

async function runPhase6_5TestSuite() {
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      throw err;
    }
  }

  // Ensure DB is initialized
  await jarvisData.init();
  await jarvisData.seed();

  // Reset in-memory stores
  classroomResponseStore.clear();
  learnerExposureStore.clear();
  mockResponseProvider.clear();

  // Test Principals
  const teacherPrincipal: AuthenticatedPrincipal = {
    userId: 'teacher-1',
    role: 'teacher',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const otherTeacherPrincipal: AuthenticatedPrincipal = {
    userId: 'other-teacher',
    role: 'teacher',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const student1Principal: AuthenticatedPrincipal = {
    userId: 'student-1',
    role: 'student',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const student2Principal: AuthenticatedPrincipal = {
    userId: 'student-2',
    role: 'student',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  const commanderPrincipal: AuthenticatedPrincipal = {
    userId: 'user-tony',
    role: 'commander',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    provenance: 'signed-hmac'
  };

  console.log('\n--- SECTION 1: Service-Level Deterministic Lifecycle & Security ---');

  let testQuizSessionId = '';
  let testAttendanceSessionId = '';
  let testPollSessionId = '';
  let testQuickCheckSessionId = '';

  await test('1. session creation: creates a valid QUIZ session in CREATED state with enrolled students', async () => {
    const session = await classroomResponseService.createSession(
      {
        classId: 'class-phys-301',
        workspaceId: 'ws-stark-core',
        sessionType: 'QUIZ',
        title: 'PHYS-301 Quantum Operators Quiz',
        questions: [
          {
            questionId: 'q-quantum-1',
            prompt: 'What operator is the adjoint of ladder lowering operator a?',
            options: ['a-dagger', 'Hamiltonian', 'Momentum p', 'Position x'],
            correctAnswer: 'a-dagger',
            concept: 'Quantum Ladder Operators',
            subject: 'Physics',
            topic: 'Quantum Mechanics'
          },
          {
            questionId: 'q-quantum-2',
            prompt: 'Is ground state energy zero for a quantum harmonic oscillator?',
            options: ['True', 'False'],
            correctAnswer: false,
            concept: 'Zero-Point Energy',
            subject: 'Physics',
            topic: 'Quantum Mechanics'
          }
        ]
      },
      teacherPrincipal
    );

    assert.ok(session.id.startsWith('resp-sess-'));
    assert.strictEqual(session.state, 'CREATED');
    assert.strictEqual(session.sessionType, 'QUIZ');
    assert.strictEqual(session.classId, 'class-phys-301');
    assert.strictEqual(session.questions?.length, 2);
    assert.ok(session.participants['part-student-1'], 'Enrolled student-1 should be in participants roster');
    testQuizSessionId = session.id;
  });

  await test('2. activation: transitions session state from CREATED to ACTIVE', async () => {
    const session = await classroomResponseService.activateSession(testQuizSessionId, teacherPrincipal);
    assert.strictEqual(session.state, 'ACTIVE');
    assert.ok(session.startedAt, 'startedAt timestamp should be set');
  });

  await test('3. pause/resume: pauses an ACTIVE session and resumes it idempotently', async () => {
    const paused = await classroomResponseService.pauseSession(testQuizSessionId, teacherPrincipal);
    assert.strictEqual(paused.state, 'PAUSED');

    // Pausing again is idempotent
    const pausedAgain = await classroomResponseService.pauseSession(testQuizSessionId, teacherPrincipal);
    assert.strictEqual(pausedAgain.state, 'PAUSED');

    // Resuming back to ACTIVE
    const resumed = await classroomResponseService.activateSession(testQuizSessionId, teacherPrincipal);
    assert.strictEqual(resumed.state, 'ACTIVE');
  });

  await test('4. participant joining: enrolled student joins session with connected status', async () => {
    const participant = await classroomResponseService.joinSession(
      testQuizSessionId,
      {
        userId: 'student-2',
        displayName: 'Maya Lin',
        remoteId: 'remote-clicker-02'
      },
      student2Principal
    );

    assert.strictEqual(participant.userId, 'student-2');
    assert.strictEqual(participant.status, 'connected');
    assert.strictEqual(participant.remoteId, 'remote-clicker-02');

    const session = await classroomResponseStore.getSession(testQuizSessionId);
    assert.strictEqual(session?.remoteParticipantMap['remote-clicker-02'], 'part-student-2');
  });

  await test('5. remote registration: teacher registers remote mapping for student-1', async () => {
    await classroomResponseService.registerRemote(
      testQuizSessionId,
      'remote-clicker-01',
      'part-student-1',
      teacherPrincipal
    );

    const session = await classroomResponseStore.getSession(testQuizSessionId);
    assert.strictEqual(session?.remoteParticipantMap['remote-clicker-01'], 'part-student-1');
  });

  await test('6. valid response: student-1 submits correct answer via registered remote', async () => {
    const result = await classroomResponseService.receiveResponseEvent(
      testQuizSessionId,
      {
        eventId: 'evt-test-01',
        remoteId: 'remote-clicker-01',
        questionId: 'q-quantum-1',
        responseValue: 'a-dagger',
        sequenceNumber: 1
      },
      student1Principal
    );

    assert.strictEqual(result.duplicate, false);
    assert.strictEqual(result.event.participantId, 'part-student-1');
    assert.strictEqual(result.event.metadata?.isCorrect, true);
    assert.strictEqual(result.event.metadata?.score, 1.0);
  });

  await test('7. invalid response: rejected when responseValue is empty/null', async () => {
    await assert.rejects(
      classroomResponseService.receiveResponseEvent(
        testQuizSessionId,
        {
          participantId: 'part-student-1',
          questionId: 'q-quantum-1',
          responseValue: ''
        },
        student1Principal
      ),
      /responseValue cannot be empty/
    );
  });

  await test('8. unknown participant: rejected when participantId does not exist in session', async () => {
    await assert.rejects(
      classroomResponseService.receiveResponseEvent(
        testQuizSessionId,
        {
          participantId: 'part-nonexistent-99',
          questionId: 'q-quantum-1',
          responseValue: 'a-dagger'
        },
        commanderPrincipal
      ),
      /does not belong to session/
    );
  });

  await test('9. participant from another classroom: rejected when unenrolled student attempts to join', async () => {
    await assert.rejects(
      classroomResponseService.joinSession(
        testQuizSessionId,
        { userId: 'student-unknown-outsider' },
        { userId: 'student-unknown-outsider', role: 'student', institutionId: 'inst-stark-academy', workspaceId: 'ws-stark-core' }
      ),
      /User 'student-unknown-outsider' not found/
    );
  });

  await test('10. unknown remoteId: rejected when an unregistered remote attempts to send response', async () => {
    await assert.rejects(
      classroomResponseService.receiveResponseEvent(
        testQuizSessionId,
        {
          remoteId: 'remote-unregistered-rogue',
          questionId: 'q-quantum-1',
          responseValue: 'Hamiltonian'
        },
        student1Principal
      ),
      /Unregistered remote 'remote-unregistered-rogue'/
    );
  });

  await test('11. remoteId attempting to impersonate another participant: rejected strictly', async () => {
    // remote-clicker-01 is mapped to part-student-1. Attempting to claim part-student-2 must be blocked!
    await assert.rejects(
      classroomResponseService.receiveResponseEvent(
        testQuizSessionId,
        {
          remoteId: 'remote-clicker-01',
          participantId: 'part-student-2', // Impersonation attempt!
          questionId: 'q-quantum-1',
          responseValue: 'a-dagger'
        },
        student1Principal
      ),
      /Impersonation rejected: remoteId 'remote-clicker-01' is registered to 'part-student-1', but claimed 'part-student-2'/
    );
  });

  await test('12. duplicate event & idempotency: duplicate eventId is handled idempotently without duplicate records', async () => {
    const resDuplicate = await classroomResponseService.receiveResponseEvent(
      testQuizSessionId,
      {
        eventId: 'evt-test-01', // Already processed in test 6
        remoteId: 'remote-clicker-01',
        questionId: 'q-quantum-1',
        responseValue: 'a-dagger',
        sequenceNumber: 1
      },
      student1Principal
    );

    assert.strictEqual(resDuplicate.duplicate, true);
    assert.strictEqual(resDuplicate.event.eventId, 'evt-test-01');
  });

  await test('13. unauthorized access & cross-user isolation: student cannot submit on behalf of another student directly', async () => {
    await assert.rejects(
      classroomResponseService.receiveResponseEvent(
        testQuizSessionId,
        {
          participantId: 'part-student-1',
          questionId: 'q-quantum-1',
          responseValue: 'a-dagger'
        },
        student2Principal // student-2 trying to submit as part-student-1 without a remote
      ),
      /Cross-user isolation violation/
    );
  });

  await test('14. cross-classroom isolation: teacher of another class cannot manage session', async () => {
    await assert.rejects(
      classroomResponseService.createSession(
        {
          classId: 'class-phys-301',
          workspaceId: 'ws-stark-core',
          sessionType: 'ATTENDANCE'
        },
        otherTeacherPrincipal
      ),
      /Cross-classroom access denied/
    );
  });

  await test('15. question/session mismatch: rejected when questionId is not in session questions', async () => {
    await assert.rejects(
      classroomResponseService.receiveResponseEvent(
        testQuizSessionId,
        {
          remoteId: 'remote-clicker-01',
          questionId: 'q-unrelated-biology-question',
          responseValue: 'Photosynthesis',
          sequenceNumber: 2
        },
        student1Principal
      ),
      /Question 'q-unrelated-biology-question' does not belong to session/
    );
  });

  await test('16. quiz → question exposure integration: response automatically records into learnerExposureStore', async () => {
    const exposures = await learnerExposureStore.getExposures('student-1', testQuizSessionId);
    const exposure = exposures.find((e) => e.questionId === 'q-quantum-1');
    assert.ok(exposure, 'Exposure record must exist for student-1 and q-quantum-1');
    assert.strictEqual(exposure.attemptCount >= 1, true);
    assert.strictEqual(exposure.correctCount >= 1, true);
    assert.strictEqual(exposure.latestResult, 'CORRECT');
  });

  console.log('\n--- SECTION 2: ATTENDANCE, POLL & QUICK CHECK SESSIONS ---');

  await test('17. attendance idempotency: repeated check-ins from same student do not duplicate attendance records', async () => {
    const attSession = await classroomResponseService.createSession(
      {
        classId: 'class-phys-301',
        workspaceId: 'ws-stark-core',
        sessionType: 'ATTENDANCE',
        title: 'PHYS-301 Lecture Roll Call'
      },
      teacherPrincipal
    );
    testAttendanceSessionId = attSession.id;
    await classroomResponseService.activateSession(attSession.id, teacherPrincipal);

    // First check-in
    await classroomResponseService.receiveResponseEvent(
      attSession.id,
      {
        participantId: 'part-student-1',
        responseValue: 'PRESENT'
      },
      student1Principal
    );

    // Repeated check-in from same student
    await classroomResponseService.receiveResponseEvent(
      attSession.id,
      {
        participantId: 'part-student-1',
        responseValue: 'PRESENT'
      },
      student1Principal
    );

    const summary = await classroomResponseService.getSessionSummary(attSession.id, teacherPrincipal);
    assert.ok(summary.attendance);
    assert.strictEqual(summary.attendance.presentCount, 1);
    const student1Records = summary.attendance.records.filter((r) => r.userId === 'student-1');
    assert.strictEqual(student1Records.length, 1, 'Must have exactly one record for student-1');
    assert.strictEqual(student1Records[0].status, 'PRESENT');
  });

  await test('18. poll summary: aggregates choice distributions accurately', async () => {
    const pollSession = await classroomResponseService.createSession(
      {
        classId: 'class-phys-301',
        workspaceId: 'ws-stark-core',
        sessionType: 'POLL',
        title: 'Topic Choice: Next Week Seminar'
      },
      teacherPrincipal
    );
    testPollSessionId = pollSession.id;
    await classroomResponseService.activateSession(pollSession.id, teacherPrincipal);

    // Student 1 votes Quantum Computing
    await classroomResponseService.receiveResponseEvent(
      pollSession.id,
      { participantId: 'part-student-1', responseValue: 'Quantum Computing' },
      student1Principal
    );

    // Student 2 votes String Theory
    await classroomResponseService.receiveResponseEvent(
      pollSession.id,
      { participantId: 'part-student-2', responseValue: 'String Theory' },
      student2Principal
    );

    const summary = await classroomResponseService.getSessionSummary(pollSession.id, teacherPrincipal);
    assert.ok(summary.poll);
    assert.strictEqual(summary.poll.totalResponses, 2);
    assert.strictEqual(summary.poll.optionCounts['Quantum Computing'], 1);
    assert.strictEqual(summary.poll.optionCounts['String Theory'], 1);
    assert.strictEqual(summary.poll.optionPercentages['Quantum Computing'], 50);
    assert.strictEqual(summary.poll.optionPercentages['String Theory'], 50);
  });

  await test('19. quick-check summary: tallies sentiment and understanding ratio', async () => {
    const qcSession = await classroomResponseService.createSession(
      {
        classId: 'class-phys-301',
        workspaceId: 'ws-stark-core',
        sessionType: 'QUICK_CHECK',
        title: 'Comprehension Pulse: Ladder Operators'
      },
      teacherPrincipal
    );
    testQuickCheckSessionId = qcSession.id;
    await classroomResponseService.activateSession(qcSession.id, teacherPrincipal);

    await classroomResponseService.receiveResponseEvent(
      qcSession.id,
      { participantId: 'part-student-1', responseValue: 'UNDERSTOOD' },
      student1Principal
    );

    await classroomResponseService.receiveResponseEvent(
      qcSession.id,
      { participantId: 'part-student-2', responseValue: 'CONFUSED' },
      student2Principal
    );

    const summary = await classroomResponseService.getSessionSummary(qcSession.id, teacherPrincipal);
    assert.ok(summary.quickCheck);
    assert.strictEqual(summary.quickCheck.totalResponses, 2);
    assert.strictEqual(summary.quickCheck.breakdown.understood, 1);
    assert.strictEqual(summary.quickCheck.breakdown.confused, 1);
    assert.strictEqual(summary.quickCheck.sentimentPositiveRatio, 0.5);
  });

  await test('20. session completion: transitions state to COMPLETED and records completedAt', async () => {
    const completed = await classroomResponseService.completeSession(testQuizSessionId, teacherPrincipal);
    assert.strictEqual(completed.state, 'COMPLETED');
    assert.ok(completed.completedAt);

    // Trying to pause a completed session must fail
    await assert.rejects(
      classroomResponseService.pauseSession(testQuizSessionId, teacherPrincipal),
      /Cannot pause session in state 'COMPLETED'/
    );
  });

  await test('21. cancelled session rejecting new responses: transitions to CANCELLED and blocks events', async () => {
    const cancelSession = await classroomResponseService.createSession(
      {
        classId: 'class-phys-301',
        workspaceId: 'ws-stark-core',
        sessionType: 'POLL',
        title: 'Cancelled Test Session'
      },
      teacherPrincipal
    );
    await classroomResponseService.activateSession(cancelSession.id, teacherPrincipal);
    const cancelled = await classroomResponseService.cancelSession(cancelSession.id, teacherPrincipal);
    assert.strictEqual(cancelled.state, 'CANCELLED');

    // New response must be rejected
    await assert.rejects(
      classroomResponseService.receiveResponseEvent(
        cancelSession.id,
        { participantId: 'part-student-1', responseValue: 'Option A' },
        student1Principal
      ),
      /is not ACTIVE \(current state: CANCELLED\)/
    );
  });

  console.log('\n--- SECTION 3: Provider-Neutral Extensibility & Mock Provider ---');

  await test('22. MockClassroomResponseProvider emits and dispatches response event correctly', async () => {
    let capturedEvent: any = null;
    const unsubscribe = mockResponseProvider.registerListener((evt) => {
      capturedEvent = evt;
    });

    const emitted = await mockResponseProvider.emitResponse({
      eventId: 'mock-evt-1',
      sessionId: 'sess-mock-01',
      participantId: 'part-student-1',
      remoteId: 'hw-remote-99',
      responseValue: 'A',
      source: 'mock-provider'
    });

    assert.strictEqual(emitted.eventId, 'mock-evt-1');
    assert.strictEqual(capturedEvent?.eventId, 'mock-evt-1');
    assert.strictEqual(capturedEvent?.source, 'mock-provider');
    unsubscribe();
  });

  console.log('\n--- SECTION 4: HTTP REST API Endpoints with Real Authentication Harness ---');

  const harness = await startHttpHarness();
  const { baseUrl, tokenFor, close } = harness;

  try {
    const teacherToken = await tokenFor('teacher-1');
    const student1Token = await tokenFor('student-1');

    await test('23. HTTP POST /api/education/classroom/sessions without token returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/education/classroom/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: 'class-phys-301',
          sessionType: 'QUIZ'
        })
      });
      assert.strictEqual(res.status, 401);
    });

    let httpSessionId = '';

    await test('24. HTTP POST /api/education/classroom/sessions creates session with teacher auth', async () => {
      const res = await fetch(`${baseUrl}/api/education/classroom/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${teacherToken}`
        },
        body: JSON.stringify({
          classId: 'class-phys-301',
          workspaceId: 'ws-stark-core',
          sessionType: 'QUICK_CHECK',
          title: 'HTTP Quick Check Session'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.session?.id);
      httpSessionId = data.session.id;
    });

    await test('25. HTTP POST /api/education/classroom/sessions/:id/activate activates session', async () => {
      const res = await fetch(`${baseUrl}/api/education/classroom/sessions/${httpSessionId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.session?.state, 'ACTIVE');
    });

    await test('26. HTTP POST /api/education/classroom/sessions/:id/events receives valid student response', async () => {
      const res = await fetch(`${baseUrl}/api/education/classroom/sessions/${httpSessionId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${student1Token}`
        },
        body: JSON.stringify({
          participantId: 'part-student-1',
          responseValue: 'UNDERSTOOD'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.event?.responseValue, 'UNDERSTOOD');
      assert.strictEqual(data.duplicate, false);
    });

    await test('27. HTTP GET /api/education/classroom/sessions/:id/summary retrieves live aggregation', async () => {
      const res = await fetch(`${baseUrl}/api/education/classroom/sessions/${httpSessionId}/summary`, {
        headers: {
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.summary?.quickCheck);
      assert.strictEqual(data.summary.quickCheck.breakdown.understood, 1);
    });

    await test('28. HTTP POST /api/education/classroom/sessions/:id/complete finishes session', async () => {
      const res = await fetch(`${baseUrl}/api/education/classroom/sessions/${httpSessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${teacherToken}`
        }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.session?.state, 'COMPLETED');
    });

  } finally {
    await close();
  }

  console.log(`\n================================================================`);
  console.log(`=== PHASE 6.5 TEST SUITE COMPLETED: ${passed}/${total} PASSED ===`);
  console.log(`================================================================\n`);
}

runPhase6_5TestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
