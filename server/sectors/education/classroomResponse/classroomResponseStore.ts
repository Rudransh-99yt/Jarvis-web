import type {
  ClassroomResponseSession,
  ResponseEvent,
  ResponseParticipant
} from '../../../../src/types/classroomResponse.ts';

/**
 * ClassroomResponseStore
 *
 * In-memory deterministic storage for Classroom Response Sessions and Events.
 * Implements strict event idempotency and sequence tracking.
 */
export class ClassroomResponseStore {
  private sessions: Map<string, ClassroomResponseSession> = new Map();
  private events: Map<string, ResponseEvent> = new Map(); // eventId -> ResponseEvent
  private eventsBySession: Map<string, ResponseEvent[]> = new Map(); // sessionId -> events
  private sequences: Map<string, number> = new Map(); // `${sessionId}::${participantId}` -> last sequence

  async createSession(session: ClassroomResponseSession): Promise<ClassroomResponseSession> {
    const clone = JSON.parse(JSON.stringify(session));
    this.sessions.set(session.id, clone);
    if (!this.eventsBySession.has(session.id)) {
      this.eventsBySession.set(session.id, []);
    }
    return JSON.parse(JSON.stringify(clone));
  }

  async getSession(id: string): Promise<ClassroomResponseSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    return JSON.parse(JSON.stringify(session));
  }

  async getAllSessions(): Promise<ClassroomResponseSession[]> {
    return Array.from(this.sessions.values()).map((s) => JSON.parse(JSON.stringify(s)));
  }

  async getSessionsByClass(classId: string): Promise<ClassroomResponseSession[]> {
    return Array.from(this.sessions.values())
      .filter((s) => s.classId === classId)
      .map((s) => JSON.parse(JSON.stringify(s)));
  }

  async updateSession(
    id: string,
    updates: Partial<ClassroomResponseSession>
  ): Promise<ClassroomResponseSession> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session '${id}' not found`);
    }

    const updated: ClassroomResponseSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.sessions.set(id, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async addParticipant(sessionId: string, participant: ResponseParticipant): Promise<ResponseParticipant> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    session.participants[participant.participantId] = {
      ...participant,
      lastActiveAt: new Date().toISOString()
    };

    if (participant.remoteId) {
      session.remoteParticipantMap[participant.remoteId] = participant.participantId;
    }

    session.updatedAt = new Date().toISOString();
    return JSON.parse(JSON.stringify(session.participants[participant.participantId]));
  }

  async registerRemote(sessionId: string, remoteId: string, participantId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }
    if (!session.participants[participantId]) {
      throw new Error(`Participant '${participantId}' does not exist in session '${sessionId}'`);
    }

    session.remoteParticipantMap[remoteId] = participantId;
    session.participants[participantId].remoteId = remoteId;
    session.updatedAt = new Date().toISOString();
  }

  async recordEvent(event: ResponseEvent): Promise<{ event: ResponseEvent; isDuplicate: boolean }> {
    // 1. Idempotency Check: if eventId already recorded, return cached event without re-insertion
    const existing = this.events.get(event.eventId);
    if (existing) {
      return { event: JSON.parse(JSON.stringify(existing)), isDuplicate: true };
    }

    const clone: ResponseEvent = JSON.parse(JSON.stringify(event));
    this.events.set(event.eventId, clone);

    let sessionEvents = this.eventsBySession.get(event.sessionId);
    if (!sessionEvents) {
      sessionEvents = [];
      this.eventsBySession.set(event.sessionId, sessionEvents);
    }
    sessionEvents.push(clone);

    // Update participant active timestamp if present
    const session = this.sessions.get(event.sessionId);
    if (session && session.participants[event.participantId]) {
      session.participants[event.participantId].lastActiveAt = event.receivedAt;
      session.participants[event.participantId].status = 'connected';
    }

    return { event: clone, isDuplicate: false };
  }

  async getEvent(eventId: string): Promise<ResponseEvent | null> {
    const event = this.events.get(eventId);
    if (!event) return null;
    return JSON.parse(JSON.stringify(event));
  }

  async getEventsForSession(sessionId: string): Promise<ResponseEvent[]> {
    const list = this.eventsBySession.get(sessionId) || [];
    return list.map((e) => JSON.parse(JSON.stringify(e)));
  }

  getLastSequence(sessionId: string, participantId: string): number | undefined {
    return this.sequences.get(`${sessionId}::${participantId}`);
  }

  setLastSequence(sessionId: string, participantId: string, seq: number): void {
    this.sequences.set(`${sessionId}::${participantId}`, seq);
  }

  clear(): void {
    this.sessions.clear();
    this.events.clear();
    this.eventsBySession.clear();
    this.sequences.clear();
  }
}

export const classroomResponseStore = new ClassroomResponseStore();
