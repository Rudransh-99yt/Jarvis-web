// Persistence and Business Logic Store for Pro Focus / Pomodoro + Focus Lock Engine
import type {
  FocusSession,
  FocusMode,
  FocusTarget,
  FocusEvent,
  FocusEventType,
  FocusTask,
  FocusStatistics
} from '../../../../src/types/focus.ts';
import { FocusPolicyEngine } from './focusPolicy.ts';
import type { User } from '../../../data/types.ts';

export class FocusStore {
  private sessions: Map<string, FocusSession> = new Map();
  private events: FocusEvent[] = [];
  private activeSessionsByUserId: Map<string, string> = new Map(); // userId -> sessionId

  constructor() {
    this.seedDefaultSessions();
  }

  private seedDefaultSessions() {
    // Seed initial completed focus session for student-1 analytics
    const pastSessionId = 'focus-sess-seed-1';
    const pastTarget: FocusTarget = {
      type: 'chapter',
      id: 'unit-em-maxwell',
      title: 'Electrostatics & Gauss Surface Integration',
      courseId: 'class-phys-301',
      courseCode: 'PHYS-301',
      context: 'Physics · Unit 1'
    };

    const pastSession: FocusSession = {
      id: pastSessionId,
      userId: 'student-1',
      schoolId: 'inst-stark-academy',
      classId: 'class-phys-301',
      mode: 'STUDY_LOCK',
      status: 'COMPLETED',
      target: pastTarget,
      plannedDurationMinutes: 45,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      totalCycles: 2,
      currentCycle: 2,
      isBreak: false,
      startedAt: '2026-10-02T14:00:00.000Z',
      expiresAt: '2026-10-02T14:45:00.000Z',
      accumulatedElapsedSeconds: 45 * 60,
      policy: FocusPolicyEngine.buildDefaultPolicy('STUDY_LOCK', pastTarget),
      allowedResources: [
        { type: 'class_session', id: 'session-phys-101', title: 'ClassSession #101: Electrostatics' }
      ],
      scratchpadNotes: 'Gauss Law: ∮ E·dA = q_enc / ε₀. For cylindrical symmetry: E = λ / (2πε₀ r).',
      tasks: [
        { id: 't1', text: 'Derive field of infinite line charge', completed: true },
        { id: 't2', text: 'Review Slide 4 of ClassSession deck', completed: true }
      ],
      suppressedNotificationsCount: 2,
      createdAt: '2026-10-02T13:55:00.000Z',
      completedAt: '2026-10-02T14:45:00.000Z'
    };

    this.sessions.set(pastSessionId, pastSession);
  }

  async getActiveSession(userId: string): Promise<FocusSession | null> {
    const sessionId = this.activeSessionsByUserId.get(userId);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if session has naturally expired while active
    if (session.status === 'ACTIVE' && session.expiresAt) {
      const now = Date.now();
      const expires = new Date(session.expiresAt).getTime();
      if (now >= expires) {
        if (session.isBreak) {
          // Break finished -> advance cycle
          session.isBreak = false;
          session.currentCycle = Math.min(session.totalCycles, session.currentCycle + 1);
          session.status = 'PAUSED';
          session.pausedAt = new Date().toISOString();
        } else {
          // Focus cycle finished
          if (session.currentCycle >= session.totalCycles) {
            session.status = 'COMPLETED';
            session.completedAt = new Date().toISOString();
            this.activeSessionsByUserId.delete(userId);
            this.recordEvent(session.id, userId, 'focus.completed');
          } else {
            session.status = 'PAUSED';
            session.pausedAt = new Date().toISOString();
          }
        }
        this.sessions.set(sessionId, session);
      }
    }

    return JSON.parse(JSON.stringify(session));
  }

  async createSession(data: Partial<FocusSession>, user: User): Promise<FocusSession> {
    // If there is an existing active session, archive/cancel it first
    const existingActiveId = this.activeSessionsByUserId.get(user.id);
    if (existingActiveId) {
      await this.cancelSession(existingActiveId, 'New session initiated', user.id);
    }

    const id = data.id || `focus-${Date.now()}`;
    const mode = data.mode || 'POMODORO';
    const target = data.target || {
      type: 'general',
      id: 'general-study',
      title: 'General Study & Practice'
    };

    const plannedMinutes = data.plannedDurationMinutes || (mode === 'EXAM_LOCK' ? 60 : 25);
    const shortBreakMinutes = data.shortBreakMinutes || 5;
    const longBreakMinutes = data.longBreakMinutes || 15;
    const totalCycles = data.totalCycles || (mode === 'EXAM_LOCK' ? 1 : 4);

    const policy = data.policy || FocusPolicyEngine.buildDefaultPolicy(mode, target);

    const newSession: FocusSession = {
      id,
      userId: user.id,
      schoolId: 'inst-stark-academy',
      classId: target.courseId || data.classId,
      mode,
      status: 'READY',
      target,
      plannedDurationMinutes: plannedMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      totalCycles,
      currentCycle: 1,
      isBreak: false,
      accumulatedElapsedSeconds: 0,
      policy,
      allowedResources: data.allowedResources || [],
      scratchpadNotes: data.scratchpadNotes || '',
      tasks: data.tasks || [
        { id: `task-1`, text: `Focus Block 1: Review ${target.title}`, completed: false }
      ],
      suppressedNotificationsCount: 0,
      createdAt: new Date().toISOString()
    };

    this.sessions.set(id, newSession);
    this.activeSessionsByUserId.set(user.id, id);

    return JSON.parse(JSON.stringify(newSession));
  }

  async startSession(id: string, userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized focus session modification.');

    const now = Date.now();
    const durationMs = session.plannedDurationMinutes * 60 * 1000;

    session.status = 'ACTIVE';
    session.isBreak = false;
    session.startedAt = session.startedAt || new Date(now).toISOString();
    session.activeCycleStartedAt = new Date(now).toISOString();
    session.expiresAt = new Date(now + durationMs).toISOString();
    session.pausedAt = undefined;

    this.sessions.set(id, session);
    this.activeSessionsByUserId.set(userId, id);

    this.recordEvent(id, userId, session.mode === 'EXAM_LOCK' ? 'exam.focus.started' : 'focus.started', {
      mode: session.mode,
      target: session.target
    });

    return JSON.parse(JSON.stringify(session));
  }

  async pauseSession(id: string, userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    if (session.status === 'ACTIVE' && session.expiresAt) {
      const now = Date.now();
      const expires = new Date(session.expiresAt).getTime();
      const remainingMs = Math.max(0, expires - now);

      session.status = 'PAUSED';
      session.pausedAt = new Date().toISOString();
      session.accumulatedElapsedSeconds += Math.max(0, Math.floor((session.plannedDurationMinutes * 60 * 1000 - remainingMs) / 1000));

      this.sessions.set(id, session);
      this.recordEvent(id, userId, 'focus.paused');
    }

    return JSON.parse(JSON.stringify(session));
  }

  async resumeSession(id: string, userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    const now = Date.now();
    const remainingMs = Math.max(0, (session.plannedDurationMinutes * 60) - session.accumulatedElapsedSeconds) * 1000;

    session.status = 'ACTIVE';
    session.pausedAt = undefined;
    session.expiresAt = new Date(now + (remainingMs > 0 ? remainingMs : session.plannedDurationMinutes * 60 * 1000)).toISOString();

    this.sessions.set(id, session);
    this.recordEvent(id, userId, 'focus.resumed');

    return JSON.parse(JSON.stringify(session));
  }

  async startBreak(id: string, breakType: 'short' | 'long', userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    const breakDurationMinutes = breakType === 'long' ? session.longBreakMinutes : session.shortBreakMinutes;
    const now = Date.now();

    session.status = 'BREAK';
    session.isBreak = true;
    session.breakType = breakType;
    session.expiresAt = new Date(now + breakDurationMinutes * 60 * 1000).toISOString();
    session.pausedAt = undefined;

    this.sessions.set(id, session);
    this.recordEvent(id, userId, 'focus.break.started', { breakType, breakDurationMinutes });

    return JSON.parse(JSON.stringify(session));
  }

  async skipBreak(id: string, userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    session.isBreak = false;
    session.breakType = undefined;
    session.currentCycle = Math.min(session.totalCycles, session.currentCycle + 1);
    session.status = 'READY';
    session.expiresAt = undefined;
    session.pausedAt = undefined;

    this.sessions.set(id, session);
    this.recordEvent(id, userId, 'focus.break.completed');

    return JSON.parse(JSON.stringify(session));
  }

  async completeSession(id: string, userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    session.status = 'COMPLETED';
    session.completedAt = new Date().toISOString();
    session.accumulatedElapsedSeconds = session.plannedDurationMinutes * 60 * session.currentCycle;

    this.sessions.set(id, session);
    this.activeSessionsByUserId.delete(userId);

    this.recordEvent(id, userId, session.mode === 'EXAM_LOCK' ? 'exam.focus.ended' : 'focus.completed');

    return JSON.parse(JSON.stringify(session));
  }

  async cancelSession(id: string, reason: string, userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    session.status = 'CANCELLED';
    session.completedAt = new Date().toISOString();

    this.sessions.set(id, session);
    this.activeSessionsByUserId.delete(userId);

    if (session.mode === 'EXAM_LOCK') {
      this.recordEvent(id, userId, 'exam.focus.interrupted', { reason });
    } else {
      this.recordEvent(id, userId, 'focus.ended', { reason });
    }

    return JSON.parse(JSON.stringify(session));
  }

  async updateNotes(id: string, notes: string, userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    session.scratchpadNotes = notes;
    this.sessions.set(id, session);
    return JSON.parse(JSON.stringify(session));
  }

  async updateTasks(id: string, tasks: FocusTask[], userId: string): Promise<FocusSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Focus session '${id}' not found.`);
    if (session.userId !== userId) throw new Error('Unauthorized.');

    session.tasks = tasks;
    this.sessions.set(id, session);
    return JSON.parse(JSON.stringify(session));
  }

  recordEvent(sessionId: string, userId: string, type: FocusEventType, metadata?: Record<string, any>): FocusEvent {
    const event: FocusEvent = {
      id: `fe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      userId,
      type,
      metadata,
      timestamp: new Date().toISOString()
    };
    this.events.push(event);
    return event;
  }

  async getEvents(userId: string, sessionId?: string): Promise<FocusEvent[]> {
    let list = this.events.filter((e) => e.userId === userId);
    if (sessionId) {
      list = list.filter((e) => e.sessionId === sessionId);
    }
    return JSON.parse(JSON.stringify(list));
  }

  async getStatistics(userId: string): Promise<FocusStatistics> {
    const userSessions = Array.from(this.sessions.values()).filter((s) => s.userId === userId);

    let totalFocusSeconds = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let interruptedCount = 0;
    let totalCycles = 0;
    const subjectBreakdown: Record<string, number> = {};

    userSessions.forEach((s) => {
      totalFocusSeconds += s.accumulatedElapsedSeconds || 0;
      if (s.status === 'COMPLETED') completedCount++;
      if (s.status === 'CANCELLED') cancelledCount++;
      totalCycles += s.currentCycle || 0;

      const subjectName = s.target.courseCode || s.target.title || 'Physics';
      const durationMins = Math.floor((s.accumulatedElapsedSeconds || 0) / 60);
      subjectBreakdown[subjectName] = (subjectBreakdown[subjectName] || 0) + durationMins;
    });

    const interruptedEvents = this.events.filter((e) => e.userId === userId && e.type === 'exam.focus.interrupted');
    interruptedCount = interruptedEvents.length;

    const totalSessions = completedCount + cancelledCount;
    const averageDurationMinutes = totalSessions > 0 ? Math.round(totalFocusSeconds / (totalSessions * 60)) : 0;

    return {
      totalFocusSeconds,
      completedSessionsCount: completedCount,
      cancelledSessionsCount: cancelledCount,
      interruptedSessionsCount: interruptedCount,
      averageDurationMinutes,
      totalCyclesCompleted: totalCycles,
      streakDays: completedCount > 0 ? 3 : 1,
      weeklyFocusMinutes: Math.round(totalFocusSeconds / 60),
      subjectBreakdown
    };
  }
}

export const focusStore = new FocusStore();
