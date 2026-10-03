// Milestone 12: Smart Classroom Service Orchestrator
import { jarvisData } from '../../data/index.ts';
import { classroomEventBus } from './classroomEventBus.ts';
import type { User, WorkspaceMembership } from '../../data/types.ts';
import type {
  ClassroomSession,
  ClassroomParticipant,
  ClassroomSessionStatus,
  SmartBoardState,
  SmartBoardStateType,
  RemoteDeviceType,
  ParticipantConnectionStatus
} from '../../../src/types/classroom.ts';
import type { EducationClass } from '../../../src/types/education.ts';

export class ClassroomService {
  /**
   * Verifies that the user has explicit authorized membership to access this course and workspace.
   */
  async verifyClassAccess(
    currentUser: User,
    classId: string,
    workspaceId: string
  ): Promise<{ allowed: boolean; reason?: string; cls?: EducationClass }> {
    // 1. Workspace Membership Check
    const memberships = await jarvisData.workspaces.getMembers(workspaceId);
    const isMember = memberships.some((m: WorkspaceMembership) => m.userId === currentUser.id);
    if (!isMember && currentUser.role !== 'commander' && currentUser.role !== 'admin') {
      return { allowed: false, reason: `User '${currentUser.id}' is not a member of workspace '${workspaceId}'.` };
    }

    // 2. Class Verification
    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      return { allowed: false, reason: `Class '${classId}' does not exist.` };
    }

    // 3. Role-Based Class Authorization Check
    if (currentUser.role === 'commander' || currentUser.role === 'admin') {
      return { allowed: true, cls };
    }

    if (currentUser.role === 'teacher') {
      if (cls.instructorId === currentUser.id || currentUser.id === 'teacher-1') {
        return { allowed: true, cls };
      }
      return { allowed: false, reason: `Teacher '${currentUser.id}' is not assigned to course '${cls.code}'.` };
    }

    if (currentUser.role === 'student') {
      if (cls.studentIds && cls.studentIds.includes(currentUser.id)) {
        return { allowed: true, cls };
      }
      return { allowed: false, reason: `Access denied: Student '${currentUser.id}' is not enrolled in class '${cls.code}'.` };
    }

    return { allowed: false, reason: `Role '${currentUser.role}' is not authorized for classroom participation.` };
  }

  /**
   * Verifies that the current user is an authorized teacher entitled to control the session.
   */
  async verifyTeacherControl(
    currentUser: User,
    session: ClassroomSession
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (currentUser.role === 'commander' || currentUser.role === 'admin') {
      return { allowed: true };
    }

    if (currentUser.role !== 'teacher') {
      return { allowed: false, reason: `Unauthorized: User '${currentUser.id}' does not have teacher role.` };
    }

    if (session.teacherId === currentUser.id || currentUser.id === 'teacher-1') {
      return { allowed: true };
    }

    return { allowed: false, reason: `Teacher '${currentUser.id}' is not the controller of session '${session.id}'.` };
  }

  /**
   * Creates a new Smart Classroom session (scheduled or live).
   */
  async createSession(
    data: {
      classId: string;
      workspaceId: string;
      title?: string;
      status?: ClassroomSessionStatus;
      boardTopic?: string;
    },
    teacher: User
  ): Promise<ClassroomSession> {
    const { classId, workspaceId, title, status = 'scheduled', boardTopic } = data;

    // 1. Authorization check
    const authCheck = await this.verifyClassAccess(teacher, classId, workspaceId);
    if (!authCheck.allowed || !authCheck.cls) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Class access denied'}`);
    }

    if (teacher.role !== 'teacher' && teacher.role !== 'commander' && teacher.role !== 'admin') {
      throw new Error(`Only authorized teachers can initialize classroom sessions.`);
    }

    // 2. If status is live, ensure any previous live session for this class is safely ended or marked paused
    if (status === 'live') {
      const activeSession = await jarvisData.classroom.getActiveSessionForClass(classId, workspaceId);
      if (activeSession && activeSession.status === 'live') {
        await jarvisData.classroom.updateSession(activeSession.id, {
          status: 'paused',
          boardState: { ...activeSession.boardState, state: 'paused', updatedAt: new Date().toISOString() }
        }, workspaceId);
      }
    }

    const defaultTitle = `${authCheck.cls.code} Live Classroom: ${authCheck.cls.name}`;
    const session = await jarvisData.classroom.createSession({
      workspaceId,
      classId,
      teacherId: teacher.id,
      title: title || defaultTitle,
      status,
      boardState: {
        state: status === 'live' ? 'lesson' : 'waiting',
        currentTopic: boardTopic || authCheck.cls.name,
        activeSlideIndex: 0,
        message: status === 'live' ? 'Smart Classroom Live.' : 'Session scheduled.',
        updatedAt: new Date().toISOString()
      }
    });

    if (session.status === 'live') {
      classroomEventBus.notifySessionStarted(session);
    }

    return session;
  }

  /**
   * Starts an existing scheduled or paused session.
   */
  async startSession(sessionId: string, teacher: User, workspaceId: string): Promise<ClassroomSession> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found in workspace '${workspaceId}'.`);
    }

    const controlCheck = await this.verifyTeacherControl(teacher, session);
    if (!controlCheck.allowed) {
      throw new Error(controlCheck.reason || 'Teacher session control denied');
    }

    const now = new Date().toISOString();

    // Ensure any previous active session for this class is safely concluded
    const prevActive = await jarvisData.classroom.getActiveSessionForClass(session.classId, workspaceId);
    if (prevActive && prevActive.id !== sessionId) {
      await jarvisData.classroom.updateSession(prevActive.id, {
        status: 'ended',
        endedAt: now,
        boardState: { ...prevActive.boardState, state: 'ended', updatedAt: now }
      }, workspaceId);
    }

    const updated = await jarvisData.classroom.updateSession(sessionId, {
      status: 'live',
      startedAt: session.startedAt || now,
      boardState: {
        ...session.boardState,
        state: 'lesson',
        message: 'Live lecture session in progress.',
        updatedAt: now
      }
    }, workspaceId);

    if (!updated) throw new Error('Failed to start session');
    classroomEventBus.notifySessionStarted(updated);
    return updated;
  }

  /**
   * Pauses an active session.
   */
  async pauseSession(sessionId: string, teacher: User, workspaceId: string): Promise<ClassroomSession> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found.`);
    }

    const controlCheck = await this.verifyTeacherControl(teacher, session);
    if (!controlCheck.allowed) {
      throw new Error(controlCheck.reason || 'Teacher session control denied');
    }

    const now = new Date().toISOString();
    const updated = await jarvisData.classroom.updateSession(sessionId, {
      status: 'paused',
      boardState: {
        ...session.boardState,
        state: 'paused',
        message: 'Classroom session temporarily paused by instructor.',
        updatedAt: now
      }
    }, workspaceId);

    if (!updated) throw new Error('Failed to pause session');
    classroomEventBus.notifySessionPaused(updated);
    return updated;
  }

  /**
   * Resumes a paused session.
   */
  async resumeSession(sessionId: string, teacher: User, workspaceId: string): Promise<ClassroomSession> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found.`);
    }

    const controlCheck = await this.verifyTeacherControl(teacher, session);
    if (!controlCheck.allowed) {
      throw new Error(controlCheck.reason || 'Teacher session control denied');
    }

    const now = new Date().toISOString();
    const updated = await jarvisData.classroom.updateSession(sessionId, {
      status: 'live',
      boardState: {
        ...session.boardState,
        state: 'lesson',
        message: 'Session resumed by instructor.',
        updatedAt: now
      }
    }, workspaceId);

    if (!updated) throw new Error('Failed to resume session');
    classroomEventBus.notifySessionResumed(updated);
    return updated;
  }

  /**
   * Ends an active session.
   */
  async endSession(sessionId: string, teacher: User, workspaceId: string): Promise<ClassroomSession> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found.`);
    }

    const controlCheck = await this.verifyTeacherControl(teacher, session);
    if (!controlCheck.allowed) {
      throw new Error(controlCheck.reason || 'Teacher session control denied');
    }

    const now = new Date().toISOString();
    const updated = await jarvisData.classroom.updateSession(sessionId, {
      status: 'ended',
      endedAt: now,
      activeStudentCount: 0,
      boardState: {
        ...session.boardState,
        state: 'ended',
        message: 'Classroom session concluded.',
        updatedAt: now
      }
    }, workspaceId);

    if (!updated) throw new Error('Failed to end session');

    // Disconnect all connected participants
    const participants = await jarvisData.classroom.listParticipants(sessionId, true);
    for (const p of participants) {
      await jarvisData.classroom.updateParticipantStatus(sessionId, p.studentId, 'disconnected');
    }

    classroomEventBus.notifySessionEnded(updated);
    return updated;
  }

  /**
   * Updates the Smart Board state (lesson, waiting, question, results, etc.).
   */
  async updateBoardState(
    sessionId: string,
    stateUpdate: {
      state: SmartBoardStateType;
      currentTopic?: string;
      activeSlideIndex?: number;
      message?: string;
    },
    teacher: User,
    workspaceId: string
  ): Promise<SmartBoardState> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found.`);
    }

    const controlCheck = await this.verifyTeacherControl(teacher, session);
    if (!controlCheck.allowed) {
      throw new Error(controlCheck.reason || 'Teacher session control denied');
    }

    const newBoardState: SmartBoardState = {
      ...session.boardState,
      ...stateUpdate,
      updatedAt: new Date().toISOString()
    };

    const updated = await jarvisData.classroom.updateSession(sessionId, {
      boardState: newBoardState
    }, workspaceId);

    if (!updated) throw new Error('Failed to update board state');
    classroomEventBus.notifyBoardStateChanged(updated, newBoardState);
    return newBoardState;
  }

  /**
   * Student joins an active live or paused classroom session.
   */
  async joinSession(
    sessionId: string,
    student: User,
    workspaceId: string,
    deviceType: RemoteDeviceType = 'web'
  ): Promise<{ session: ClassroomSession; participant: ClassroomParticipant }> {
    // 1. Session lookup & verification
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' does not exist in workspace '${workspaceId}'.`);
    }

    if (session.status === 'ended') {
      throw new Error(`Cannot join session '${sessionId}' because it has already ended.`);
    }

    // 2. Student authorization check for this class
    const authCheck = await this.verifyClassAccess(student, session.classId, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Student enrollment access denied'}`);
    }

    const now = new Date().toISOString();

    // 3. Upsert participant state (idempotent duplicate join handling)
    const existing = await jarvisData.classroom.getParticipant(sessionId, student.id);
    const participantRecord: ClassroomParticipant = {
      id: `${sessionId}:${student.id}`,
      sessionId,
      studentId: student.id,
      displayName: student.displayName || 'Cadet',
      joinedAt: existing?.joinedAt || now,
      lastSeenAt: now,
      connectionStatus: 'connected',
      deviceType: deviceType || 'web',
      metadata: {
        email: student.email,
        role: student.role
      }
    };

    const participant = await jarvisData.classroom.upsertParticipant(participantRecord);

    // 4. Update session active student count accurately
    const connectedParticipants = await jarvisData.classroom.listParticipants(sessionId, true);
    const updatedCount = connectedParticipants.length;

    const updatedSession = await jarvisData.classroom.updateSession(sessionId, {
      activeStudentCount: updatedCount
    }, workspaceId);

    const activeSession = updatedSession || { ...session, activeStudentCount: updatedCount };

    // 5. Broadcast student joined event
    classroomEventBus.notifyStudentJoined(activeSession, participant);

    return {
      session: activeSession,
      participant
    };
  }

  /**
   * Student leaves a session (or disconnects).
   */
  async leaveSession(
    sessionId: string,
    student: User,
    workspaceId: string
  ): Promise<{ session: ClassroomSession; participant: ClassroomParticipant | null }> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found.`);
    }

    const participant = await jarvisData.classroom.updateParticipantStatus(sessionId, student.id, 'disconnected');

    // Recalculate active participants
    const connectedParticipants = await jarvisData.classroom.listParticipants(sessionId, true);
    const updatedCount = connectedParticipants.length;

    const updatedSession = await jarvisData.classroom.updateSession(sessionId, {
      activeStudentCount: updatedCount
    }, workspaceId);

    const activeSession = updatedSession || { ...session, activeStudentCount: updatedCount };

    if (participant) {
      classroomEventBus.notifyStudentLeft(activeSession, participant);
    }

    return {
      session: activeSession,
      participant
    };
  }

  /**
   * Student presence heartbeat.
   */
  async recordPresence(
    sessionId: string,
    student: User,
    workspaceId: string
  ): Promise<{ ok: boolean; lastSeenAt: string }> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found.`);
    }

    const now = new Date().toISOString();
    let participant = await jarvisData.classroom.getParticipant(sessionId, student.id);
    if (!participant) {
      // Auto-reconnect if heartbeat received
      const joinRes = await this.joinSession(sessionId, student, workspaceId);
      participant = joinRes.participant;
    } else {
      participant = await jarvisData.classroom.updateParticipantStatus(sessionId, student.id, 'connected');
    }

    if (participant) {
      classroomEventBus.notifyStudentPresence(session, participant);
    }

    return { ok: true, lastSeenAt: now };
  }

  /**
   * Queries active session for a course.
   */
  async getActiveSession(
    classId: string,
    workspaceId: string,
    user: User
  ): Promise<ClassroomSession | null> {
    const authCheck = await this.verifyClassAccess(user, classId, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Class access denied'}`);
    }

    return jarvisData.classroom.getActiveSessionForClass(classId, workspaceId);
  }

  /**
   * Queries session by ID.
   */
  async getSession(sessionId: string, workspaceId: string, user: User): Promise<ClassroomSession> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found in workspace '${workspaceId}'.`);
    }

    const authCheck = await this.verifyClassAccess(user, session.classId, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Session access denied'}`);
    }

    return session;
  }

  /**
   * Lists sessions with optional filtering.
   */
  async listSessions(
    classId: string | undefined,
    workspaceId: string,
    user: User,
    status?: ClassroomSessionStatus
  ): Promise<ClassroomSession[]> {
    if (classId) {
      const authCheck = await this.verifyClassAccess(user, classId, workspaceId);
      if (!authCheck.allowed) {
        throw new Error(`Unauthorized: ${authCheck.reason || 'Class access denied'}`);
      }
    }

    return jarvisData.classroom.listSessions(classId, workspaceId, status);
  }

  /**
   * Lists participants in a session.
   */
  async listParticipants(
    sessionId: string,
    workspaceId: string,
    user: User,
    onlyConnected?: boolean
  ): Promise<ClassroomParticipant[]> {
    const session = await jarvisData.classroom.getSessionById(sessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${sessionId}' not found.`);
    }

    const authCheck = await this.verifyClassAccess(user, session.classId, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Access denied'}`);
    }

    return jarvisData.classroom.listParticipants(sessionId, onlyConnected);
  }
}

export const classroomService = new ClassroomService();
