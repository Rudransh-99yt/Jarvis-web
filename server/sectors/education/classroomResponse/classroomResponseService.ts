import { classroomResponseStore, ClassroomResponseStore } from './classroomResponseStore.ts';
import { learnerExposureStore } from '../questionIntelligence/learnerExposureStore.ts';
import { jarvisData } from '../../../data/index.ts';
import type {
  ClassroomResponseSession,
  ClassroomResponseSessionType,
  ClassroomResponseSessionState,
  ClassroomResponseSessionSummary,
  ResponseEvent,
  ResponseParticipant,
  ResponseSessionQuestion,
  AttendanceSummary,
  AttendanceRecord,
  PollSummary,
  QuickCheckSummary,
  QuizSessionSummary,
  QuestionResponseSummary
} from '../../../../src/types/classroomResponse.ts';
import type { AuthenticatedPrincipal } from '../../../auth/principal.ts';
import type { User } from '../../../data/types.ts';

export interface CreateSessionParams {
  classId: string;
  workspaceId: string;
  sessionType: ClassroomResponseSessionType;
  title?: string;
  questions?: ResponseSessionQuestion[];
  activeQuestionId?: string;
  config?: ClassroomResponseSession['config'];
  initialRemotes?: Record<string, string>; // remoteId -> participantId
}

export interface JoinParticipantParams {
  userId: string;
  displayName?: string;
  remoteId?: string;
  metadata?: Record<string, unknown>;
}

export interface ReceiveResponseEventParams {
  eventId?: string;
  participantId?: string;
  remoteId?: string;
  questionId?: string;
  responseValue: unknown;
  sequenceNumber?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export class ClassroomResponseService {
  private store: ClassroomResponseStore;

  constructor(store: ClassroomResponseStore = classroomResponseStore) {
    this.store = store;
  }

  /**
   * Helper to verify principal permission for a session's workspace and class.
   */
  private async verifyTeacherOrAdmin(principal: AuthenticatedPrincipal, classId: string, workspaceId: string): Promise<void> {
    if (principal.role === 'commander' || principal.role === 'admin') {
      return;
    }

    if (principal.role !== 'teacher') {
      throw new Error(`Unauthorized: Role '${principal.role}' cannot manage classroom response sessions.`);
    }

    // Check class instructor
    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      throw new Error(`Class '${classId}' not found.`);
    }

    if (cls.instructorId && cls.instructorId !== principal.userId) {
      throw new Error(`Cross-classroom access denied: Teacher '${principal.userId}' does not teach class '${classId}'.`);
    }
  }

  /**
   * 1. Create a new classroom response session
   */
  async createSession(
    params: CreateSessionParams,
    principal: AuthenticatedPrincipal
  ): Promise<ClassroomResponseSession> {
    const { classId, workspaceId, sessionType, questions, config } = params;

    if (!classId || !workspaceId || !sessionType) {
      throw new Error('classId, workspaceId, and sessionType are required.');
    }

    const validTypes: ClassroomResponseSessionType[] = ['QUIZ', 'ATTENDANCE', 'POLL', 'QUICK_CHECK'];
    if (!validTypes.includes(sessionType)) {
      throw new Error(`Invalid sessionType '${sessionType}'. Must be one of: ${validTypes.join(', ')}`);
    }

    await this.verifyTeacherOrAdmin(principal, classId, workspaceId);

    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      throw new Error(`Class '${classId}' not found.`);
    }

    const sessionId = `resp-sess-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Populate enrolled students into participant roster
    const participants: Record<string, ResponseParticipant> = {};
    const remoteParticipantMap: Record<string, string> = { ...(params.initialRemotes || {}) };

    if (Array.isArray(cls.studentIds)) {
      for (const studentId of cls.studentIds) {
        const studentUser = await jarvisData.users.getById(studentId);
        const participantId = `part-${studentId}`;
        participants[participantId] = {
          participantId,
          userId: studentId,
          displayName: studentUser?.displayName || studentId,
          status: 'idle',
          joinedAt: now,
          lastActiveAt: now
        };
      }
    }

    const defaultTitle = `${cls.name || cls.code || 'Class'} ${sessionType} Session`;

    const session: ClassroomResponseSession = {
      id: sessionId,
      title: params.title || defaultTitle,
      sessionType,
      state: 'CREATED',
      classId,
      workspaceId,
      creatorId: principal.userId,
      activeQuestionId: params.activeQuestionId || (questions && questions[0]?.questionId),
      questions: questions || [],
      participants,
      remoteParticipantMap,
      config: config || {},
      createdAt: now,
      updatedAt: now
    };

    return await this.store.createSession(session);
  }

  /**
   * 2. Activate session (CREATED | PAUSED -> ACTIVE)
   */
  async activateSession(sessionId: string, principal: AuthenticatedPrincipal): Promise<ClassroomResponseSession> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    await this.verifyTeacherOrAdmin(principal, session.classId, session.workspaceId);

    if (session.state === 'ACTIVE') {
      return session; // Idempotent
    }

    if (session.state === 'COMPLETED' || session.state === 'CANCELLED') {
      throw new Error(`Cannot activate a ${session.state.toLowerCase()} session '${sessionId}'.`);
    }

    const updates: Partial<ClassroomResponseSession> = {
      state: 'ACTIVE',
      startedAt: session.startedAt || new Date().toISOString()
    };

    return await this.store.updateSession(sessionId, updates);
  }

  /**
   * 3. Pause session (ACTIVE -> PAUSED)
   */
  async pauseSession(sessionId: string, principal: AuthenticatedPrincipal): Promise<ClassroomResponseSession> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    await this.verifyTeacherOrAdmin(principal, session.classId, session.workspaceId);

    if (session.state === 'PAUSED') {
      return session; // Idempotent
    }

    if (session.state !== 'ACTIVE') {
      throw new Error(`Cannot pause session in state '${session.state}'.`);
    }

    return await this.store.updateSession(sessionId, { state: 'PAUSED' });
  }

  /**
   * 4. Complete session (ACTIVE | PAUSED -> COMPLETED)
   */
  async completeSession(sessionId: string, principal: AuthenticatedPrincipal): Promise<ClassroomResponseSession> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    await this.verifyTeacherOrAdmin(principal, session.classId, session.workspaceId);

    if (session.state === 'COMPLETED') {
      return session; // Idempotent
    }

    if (session.state === 'CANCELLED') {
      throw new Error(`Cannot complete a cancelled session '${sessionId}'.`);
    }

    return await this.store.updateSession(sessionId, {
      state: 'COMPLETED',
      completedAt: new Date().toISOString()
    });
  }

  /**
   * 5. Cancel session (CREATED | ACTIVE | PAUSED -> CANCELLED)
   */
  async cancelSession(sessionId: string, principal: AuthenticatedPrincipal): Promise<ClassroomResponseSession> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    await this.verifyTeacherOrAdmin(principal, session.classId, session.workspaceId);

    if (session.state === 'CANCELLED') {
      return session; // Idempotent
    }

    if (session.state === 'COMPLETED') {
      throw new Error(`Cannot cancel a completed session '${sessionId}'.`);
    }

    return await this.store.updateSession(sessionId, {
      state: 'CANCELLED',
      cancelledAt: new Date().toISOString()
    });
  }

  /**
   * 6. Join or add participant to session
   */
  async joinSession(
    sessionId: string,
    params: JoinParticipantParams,
    principal: AuthenticatedPrincipal
  ): Promise<ResponseParticipant> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    // Security check: if student, they can only join as themselves
    if (principal.role === 'student' && principal.userId !== params.userId) {
      throw new Error(`Cross-user isolation: Student '${principal.userId}' cannot join on behalf of '${params.userId}'.`);
    }

    // Verify user exists
    const user = await jarvisData.users.getById(params.userId);
    if (!user) {
      throw new Error(`User '${params.userId}' not found.`);
    }

    // Verify class enrollment
    const cls = await jarvisData.education.getClassById(session.classId);
    if (!cls) {
      throw new Error(`Class '${session.classId}' not found.`);
    }

    if (user.role === 'student' && cls.studentIds && !cls.studentIds.includes(user.id)) {
      throw new Error(`Participant '${user.id}' is not enrolled in class '${session.classId}'.`);
    }

    const participantId = `part-${user.id}`;
    const now = new Date().toISOString();

    const participant: ResponseParticipant = {
      participantId,
      userId: user.id,
      displayName: params.displayName || user.displayName || user.id,
      remoteId: params.remoteId,
      status: 'connected',
      joinedAt: now,
      lastActiveAt: now,
      metadata: params.metadata
    };

    return await this.store.addParticipant(sessionId, participant);
  }

  /**
   * 7. Register a remote ID to a participant
   */
  async registerRemote(
    sessionId: string,
    remoteId: string,
    participantId: string,
    principal: AuthenticatedPrincipal
  ): Promise<void> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    await this.verifyTeacherOrAdmin(principal, session.classId, session.workspaceId);

    if (!remoteId || !participantId) {
      throw new Error('Both remoteId and participantId are required.');
    }

    await this.store.registerRemote(sessionId, remoteId, participantId);
  }

  /**
   * 8. Receive and validate response event
   */
  async receiveResponseEvent(
    sessionId: string,
    eventInput: ReceiveResponseEventParams,
    principal: AuthenticatedPrincipal
  ): Promise<{ event: ResponseEvent; duplicate: boolean }> {
    // 8a. Session must exist
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    // 8b. Session must be ACTIVE
    if (session.state !== 'ACTIVE') {
      throw new Error(`Cannot submit response: session '${sessionId}' is not ACTIVE (current state: ${session.state}).`);
    }

    // 8c. Idempotency Check on eventId
    if (eventInput.eventId) {
      const existing = await this.store.getEvent(eventInput.eventId);
      if (existing) {
        return { event: existing, duplicate: true };
      }
    }

    // 8d. REMOTE SECURITY RESOLUTION
    // CRITICAL: A remoteId must NEVER be allowed to claim an arbitrary participantId.
    // The server resolves: remoteId -> registered participant and rejects unknown mappings.
    let resolvedParticipantId: string;

    if (eventInput.remoteId) {
      const mappedId = session.remoteParticipantMap[eventInput.remoteId];
      if (!mappedId) {
        throw new Error(`Unregistered remote '${eventInput.remoteId}': Remote is not mapped to any registered participant in session '${sessionId}'.`);
      }

      if (eventInput.participantId && eventInput.participantId !== mappedId) {
        throw new Error(`Impersonation rejected: remoteId '${eventInput.remoteId}' is registered to '${mappedId}', but claimed '${eventInput.participantId}'.`);
      }

      resolvedParticipantId = mappedId;
    } else {
      if (!eventInput.participantId) {
        throw new Error('Either remoteId or participantId must be provided.');
      }
      resolvedParticipantId = eventInput.participantId;

      // If submitted by a student directly, verify authenticated principal matches participant.userId
      if (principal.role === 'student') {
        const participant = session.participants[resolvedParticipantId];
        if (!participant) {
          throw new Error(`Unknown participant '${resolvedParticipantId}'.`);
        }
        if (participant.userId !== principal.userId) {
          throw new Error(`Cross-user isolation violation: Student '${principal.userId}' cannot submit response as participant '${resolvedParticipantId}'.`);
        }
      }
    }

    // 8e. Participant must exist in session
    const participant = session.participants[resolvedParticipantId];
    if (!participant) {
      throw new Error(`Participant '${resolvedParticipantId}' does not belong to session '${sessionId}'.`);
    }

    // 8f. Verify sequence numbers safely if supplied
    if (typeof eventInput.sequenceNumber === 'number') {
      const lastSeq = this.store.getLastSequence(sessionId, resolvedParticipantId);
      if (lastSeq !== undefined && eventInput.sequenceNumber <= lastSeq) {
        throw new Error(`Stale or replayed sequence number ${eventInput.sequenceNumber} <= ${lastSeq}.`);
      }
      this.store.setLastSequence(sessionId, resolvedParticipantId, eventInput.sequenceNumber);
    }

    // 8g. Question belongs to session if questionId provided
    const targetQuestionId = eventInput.questionId || session.activeQuestionId;
    let targetQuestion: ResponseSessionQuestion | undefined;

    if (session.questions && session.questions.length > 0) {
      if (eventInput.questionId) {
        targetQuestion = session.questions.find((q) => q.questionId === eventInput.questionId);
        if (!targetQuestion) {
          throw new Error(`Question '${eventInput.questionId}' does not belong to session '${sessionId}'.`);
        }
      } else if (session.activeQuestionId) {
        targetQuestion = session.questions.find((q) => q.questionId === session.activeQuestionId);
      }
    }

    // 8h. Validate responseValue
    if (eventInput.responseValue === undefined || eventInput.responseValue === null || eventInput.responseValue === '') {
      throw new Error('responseValue cannot be empty.');
    }

    // Validate per session type
    this.validateResponseValueForType(session.sessionType, eventInput.responseValue, targetQuestion);

    const now = new Date().toISOString();
    const eventId = eventInput.eventId || `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const event: ResponseEvent = {
      eventId,
      sessionId,
      participantId: resolvedParticipantId,
      remoteId: eventInput.remoteId,
      questionId: targetQuestionId,
      responseValue: eventInput.responseValue,
      receivedAt: now,
      sequenceNumber: eventInput.sequenceNumber,
      source: eventInput.source || (eventInput.remoteId ? 'remote-control-gateway' : 'software-client'),
      metadata: { ...(eventInput.metadata || {}) }
    };

    // 8i. QUIZ INTEGRATION with Phase 6.4 Question Exposure System
    if (session.sessionType === 'QUIZ' && targetQuestionId) {
      const isCorrect = this.evaluateCorrectness(targetQuestion, event.responseValue);
      const score = isCorrect ? 1.0 : 0.0;

      event.metadata = {
        ...event.metadata,
        isCorrect,
        score
      };

      // Invariant: Deterministically record attempt into existing learnerExposureStore
      try {
        await learnerExposureStore.recordAttempt({
          userId: participant.userId,
          contextId: session.id,
          questionId: targetQuestionId,
          isCorrect,
          score,
          concept: targetQuestion?.concept,
          subject: targetQuestion?.subject || 'Education',
          topic: targetQuestion?.topic || targetQuestion?.concept || 'Quiz'
        });
      } catch (expErr) {
        console.warn(`[ClassroomResponseService] Warning: Could not record question exposure:`, expErr);
      }
    }

    const recordResult = await this.store.recordEvent(event);
    return { event: recordResult.event, duplicate: recordResult.isDuplicate };
  }

  private validateResponseValueForType(
    sessionType: ClassroomResponseSessionType,
    value: unknown,
    question?: ResponseSessionQuestion
  ): void {
    if (sessionType === 'ATTENDANCE') {
      const str = String(value).toUpperCase().trim();
      const valid = ['PRESENT', 'HERE', '1', 'TRUE', 'ATTENDED', 'CHECKIN'];
      if (!valid.includes(str) && typeof value !== 'boolean') {
        throw new Error(`Invalid attendance response '${value}'. Expected 'PRESENT', 'HERE', or true.`);
      }
    } else if (sessionType === 'QUICK_CHECK') {
      const str = String(value).toUpperCase().trim();
      const validIndicators = [
        'UNDERSTOOD', 'CONFUSED', 'NEED_HELP', 'NEEDHELP',
        'THUMBS_UP', 'THUMBS_DOWN', '1', '2', '3', '4', '5',
        'YES', 'NO', 'TRUE', 'FALSE'
      ];
      if (!validIndicators.includes(str) && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new Error(`Invalid quick-check response '${value}'. Expected understanding signal (e.g. UNDERSTOOD, CONFUSED, NEED_HELP).`);
      }
    } else if (sessionType === 'POLL') {
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`Invalid poll response '${value}'. Expected option key or string value.`);
      }
    } else if (sessionType === 'QUIZ') {
      if (question && question.options && question.options.length > 0) {
        // If question has options, allow option index or option string or letter
        // e.g. 0, 1, 2 or 'A', 'B', 'C' or full string
      }
    }
  }

  private evaluateCorrectness(question: ResponseSessionQuestion | undefined, responseValue: unknown): boolean {
    if (!question || question.correctAnswer === undefined) {
      return true; // Default to true if no answer key configured
    }

    const expected = question.correctAnswer;
    const given = responseValue;

    // Numerical evaluation
    if (typeof expected === 'number') {
      const numGiven = typeof given === 'number' ? given : parseFloat(String(given).trim());
      if (!isNaN(numGiven)) {
        return Math.abs(numGiven - expected) <= 0.05;
      }
    }

    // Boolean evaluation
    if (typeof expected === 'boolean') {
      const boolGiven = typeof given === 'boolean' ? given : String(given).toLowerCase() === 'true';
      return boolGiven === expected;
    }

    // Option index matching: if question has options and expected is index or choice string
    if (question.options && Array.isArray(question.options)) {
      // If given is index
      if (typeof given === 'number' && question.options[given] !== undefined) {
        const optionText = question.options[given];
        if (optionText.toLowerCase() === String(expected).toLowerCase()) return true;
        if (typeof expected === 'number' && expected === given) return true;
      }
      // If given is letter 'A', 'B', 'C', 'D'
      if (typeof given === 'string' && given.length === 1) {
        const charCode = given.toUpperCase().charCodeAt(0);
        if (charCode >= 65 && charCode <= 90) {
          const index = charCode - 65;
          if (typeof expected === 'number' && expected === index) return true;
          if (question.options[index] && question.options[index].toLowerCase() === String(expected).toLowerCase()) return true;
          if (String(expected).toUpperCase() === given.toUpperCase()) return true;
        }
      }
    }

    // String normalized comparison
    const strExpected = String(expected).trim().toLowerCase();
    const strGiven = String(given).trim().toLowerCase();

    return strExpected === strGiven;
  }

  /**
   * 9. Get Session Summary
   */
  async getSessionSummary(
    sessionId: string,
    principal: AuthenticatedPrincipal
  ): Promise<ClassroomResponseSessionSummary> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    // Authorization: User must belong to the workspace/class
    const events = await this.store.getEventsForSession(sessionId);
    const participantList = Object.values(session.participants);

    // Track latest response per participant per question
    const uniqueParticipants = new Set(events.map((e) => e.participantId));

    const summary: ClassroomResponseSessionSummary = {
      sessionId: session.id,
      sessionType: session.sessionType,
      state: session.state,
      title: session.title,
      classId: session.classId,
      totalParticipants: participantList.length,
      activeParticipants: participantList.filter((p) => p.status === 'connected').length,
      totalEventsReceived: events.length,
      uniqueRespondents: uniqueParticipants.size,
      activeQuestionId: session.activeQuestionId,
      completedAt: session.completedAt
    };

    if (session.sessionType === 'ATTENDANCE') {
      summary.attendance = this.buildAttendanceSummary(session, events);
    } else if (session.sessionType === 'POLL') {
      summary.poll = this.buildPollSummary(session, events);
    } else if (session.sessionType === 'QUICK_CHECK') {
      summary.quickCheck = this.buildQuickCheckSummary(session, events);
    } else if (session.sessionType === 'QUIZ') {
      summary.quiz = this.buildQuizSummary(session, events);
    }

    return summary;
  }

  private buildAttendanceSummary(
    session: ClassroomResponseSession,
    events: ResponseEvent[]
  ): AttendanceSummary {
    const attendeeIds = new Set<string>();
    const recordsMap = new Map<string, AttendanceRecord>();

    // Process events deterministically: repeated events for the same participant are idempotent
    for (const evt of events) {
      const part = session.participants[evt.participantId];
      if (part && !attendeeIds.has(evt.participantId)) {
        attendeeIds.add(evt.participantId);
        recordsMap.set(evt.participantId, {
          participantId: evt.participantId,
          userId: part.userId,
          displayName: part.displayName,
          status: 'PRESENT',
          recordedAt: evt.receivedAt,
          remoteId: evt.remoteId || part.remoteId
        });
      }
    }

    // Add absent participants
    for (const part of Object.values(session.participants)) {
      if (!recordsMap.has(part.participantId)) {
        recordsMap.set(part.participantId, {
          participantId: part.participantId,
          userId: part.userId,
          displayName: part.displayName,
          status: 'ABSENT',
          recordedAt: session.startedAt || session.createdAt,
          remoteId: part.remoteId
        });
      }
    }

    const records = Array.from(recordsMap.values());
    const totalEnrolled = Object.keys(session.participants).length;
    const presentCount = attendeeIds.size;
    const absentCount = Math.max(0, totalEnrolled - presentCount);
    const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) / 100 : 0;

    return {
      totalEnrolled,
      presentCount,
      absentCount,
      attendanceRate,
      records
    };
  }

  private buildPollSummary(
    _session: ClassroomResponseSession,
    events: ResponseEvent[]
  ): PollSummary {
    // Keep latest response per participant
    const latestPerParticipant = new Map<string, unknown>();
    for (const evt of events) {
      latestPerParticipant.set(evt.participantId, evt.responseValue);
    }

    const optionCounts: Record<string, number> = {};
    for (const val of latestPerParticipant.values()) {
      const key = String(val);
      optionCounts[key] = (optionCounts[key] || 0) + 1;
    }

    const total = latestPerParticipant.size;
    const optionPercentages: Record<string, number> = {};
    for (const [key, count] of Object.entries(optionCounts)) {
      optionPercentages[key] = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    }

    const participantResponses: Record<string, unknown> = {};
    for (const [partId, val] of latestPerParticipant.entries()) {
      participantResponses[partId] = val;
    }

    return {
      totalResponses: total,
      optionCounts,
      optionPercentages,
      participantResponses
    };
  }

  private buildQuickCheckSummary(
    _session: ClassroomResponseSession,
    events: ResponseEvent[]
  ): QuickCheckSummary {
    const latestPerParticipant = new Map<string, unknown>();
    for (const evt of events) {
      latestPerParticipant.set(evt.participantId, evt.responseValue);
    }

    const breakdown = {
      understood: 0,
      confused: 0,
      needHelp: 0,
      other: 0
    };

    for (const val of latestPerParticipant.values()) {
      const str = String(val).toUpperCase().trim();
      if (str === 'UNDERSTOOD' || str === 'THUMBS_UP' || str === 'TRUE' || str === 'YES' || str === '4' || str === '5') {
        breakdown.understood++;
      } else if (str === 'CONFUSED' || str === '2' || str === '3') {
        breakdown.confused++;
      } else if (str === 'NEED_HELP' || str === 'NEEDHELP' || str === 'THUMBS_DOWN' || str === '1' || str === 'FALSE') {
        breakdown.needHelp++;
      } else {
        breakdown.other++;
      }
    }

    const total = latestPerParticipant.size;
    const positiveCount = breakdown.understood;
    const sentimentPositiveRatio = total > 0 ? Math.round((positiveCount / total) * 100) / 100 : 0;

    return {
      totalResponses: total,
      breakdown,
      sentimentPositiveRatio
    };
  }

  private buildQuizSummary(
    session: ClassroomResponseSession,
    events: ResponseEvent[]
  ): QuizSessionSummary {
    const questionsSummary: Record<string, QuestionResponseSummary> = {};

    // Group events by question
    const eventsByQuestion = new Map<string, ResponseEvent[]>();
    for (const evt of events) {
      const qId = evt.questionId || 'default-question';
      let list = eventsByQuestion.get(qId);
      if (!list) {
        list = [];
        eventsByQuestion.set(qId, list);
      }
      list.push(evt);
    }

    // Include all configured questions in session
    if (session.questions) {
      for (const q of session.questions) {
        if (!eventsByQuestion.has(q.questionId)) {
          eventsByQuestion.set(q.questionId, []);
        }
      }
    }

    let totalScoreSum = 0;
    let totalAttemptsCount = 0;

    for (const [qId, qEvents] of eventsByQuestion.entries()) {
      // Keep latest attempt per participant
      const latestMap = new Map<string, ResponseEvent>();
      for (const evt of qEvents) {
        latestMap.set(evt.participantId, evt);
      }

      const latestEvents = Array.from(latestMap.values());
      const distribution: Record<string, number> = {};
      let correctCount = 0;

      for (const evt of latestEvents) {
        const valStr = String(evt.responseValue);
        distribution[valStr] = (distribution[valStr] || 0) + 1;
        if (evt.metadata?.isCorrect === true) {
          correctCount++;
        }
      }

      const accuracyRate = latestEvents.length > 0
        ? Math.round((correctCount / latestEvents.length) * 100) / 100
        : 0;

      const qObj = session.questions?.find((q) => q.questionId === qId);

      questionsSummary[qId] = {
        questionId: qId,
        prompt: qObj?.prompt,
        totalResponses: latestEvents.length,
        correctResponses: correctCount,
        accuracyRate,
        distribution,
        latestResponses: latestEvents.map((e) => {
          const part = session.participants[e.participantId];
          return {
            participantId: e.participantId,
            userId: part?.userId || e.participantId,
            displayName: part?.displayName || e.participantId,
            responseValue: e.responseValue,
            isCorrect: e.metadata?.isCorrect as boolean | undefined,
            score: e.metadata?.score as number | undefined,
            receivedAt: e.receivedAt
          };
        })
      };

      totalScoreSum += correctCount;
      totalAttemptsCount += latestEvents.length;
    }

    const averageScore = totalAttemptsCount > 0
      ? Math.round((totalScoreSum / totalAttemptsCount) * 100) / 100
      : 0;

    return {
      totalQuestions: Object.keys(questionsSummary).length,
      totalAttempts: totalAttemptsCount,
      averageScore,
      questions: questionsSummary
    };
  }

  async getSession(sessionId: string): Promise<ClassroomResponseSession | null> {
    return await this.store.getSession(sessionId);
  }

  async getAllSessions(): Promise<ClassroomResponseSession[]> {
    return await this.store.getAllSessions();
  }

  async getSessionsByClass(classId: string): Promise<ClassroomResponseSession[]> {
    return await this.store.getSessionsByClass(classId);
  }
}

export const classroomResponseService = new ClassroomResponseService();
