// Server-authoritative SmartBoard ↔ Teacher Mobile Control Plane Service (D.12)

import type { User } from '../../../data/types.ts';
import type { SmartBoardDevice, BoardDocument } from '../../../../src/types/smartboard.ts';
import { smartboardStore } from './smartboardStore.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';
import crypto from 'node:crypto';

export interface MobilePairingChallenge {
  boardId: string;
  pinCode: string;
  qrPayload: string;
  expiresAt: number; // Unix epoch ms
}

export interface MobileSessionDeliveryRecord {
  deliveryId: string;
  boardId: string;
  sessionId: string;
  teacherId: string;
  deliveredAt: string;
  acknowledgedAt?: string;
  status: 'DELIVERED' | 'ACKNOWLEDGED' | 'FAILED';
}

class ControlPlaneService {
  private deliveryLog: Map<string, MobileSessionDeliveryRecord> = new Map();
  private pairingChallenges: Map<string, MobilePairingChallenge> = new Map();

  /**
   * List authorized smartboards for teacher mobile client
   */
  public listMySmartBoards(user: User): SmartBoardDevice[] {
    if (user.role !== 'teacher' && user.role !== 'principal') {
      throw new Error('Forbidden: Only teachers can access SmartBoard Mobile Control Plane (403)');
    }
    return smartboardStore.listDevices(user.institutionId);
  }

  /**
   * Request new ephemeral pairing challenge on the physical SmartBoard
   */
  public generatePairingChallenge(user: User, boardId: string): MobilePairingChallenge {
    if (user.role !== 'teacher' && user.role !== 'principal') {
      throw new Error('Forbidden: Only teachers can generate SmartBoard pairing challenges (403)');
    }

    const board = smartboardStore.getDevice(boardId);
    if (!board) {
      throw new Error(`SmartBoard '${boardId}' not found`);
    }

    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL
    const qrPayload = `jarvis-board-pair://${boardId}?pin=${pinCode}&exp=${expiresAt}`;

    const challenge: MobilePairingChallenge = {
      boardId,
      pinCode,
      qrPayload,
      expiresAt
    };

    this.pairingChallenges.set(boardId, challenge);
    smartboardStore.updateDeviceStatus(boardId, 'PAIRING');

    return challenge;
  }

  /**
   * Teacher mobile claims pairing using PIN code or QR scan
   */
  public claimPairing(
    user: User,
    boardId: string,
    pinCode: string,
    sessionId?: string
  ): { success: boolean; board: SmartBoardDevice; pairingTicket: string } {
    if (user.role !== 'teacher' && user.role !== 'principal') {
      throw new Error('Forbidden: Only teachers can claim SmartBoard pairing (403)');
    }

    const challenge = this.pairingChallenges.get(boardId);
    if (!challenge) {
      throw new Error('No active pairing challenge found for this board. Please generate a code on screen.');
    }

    if (Date.now() > challenge.expiresAt) {
      this.pairingChallenges.delete(boardId);
      throw new Error('Pairing challenge has expired. Please refresh the pairing code.');
    }

    if (challenge.pinCode !== pinCode.trim()) {
      throw new Error('Invalid pairing PIN code.');
    }

    // Generate cryptographic short-lived pairing ticket
    const ticketId = `ticket-${crypto.randomBytes(16).toString('hex')}`;
    const pairedDevice = smartboardStore.pairDevice(
      boardId,
      user.id,
      user.displayName || 'Educator',
      ticketId,
      sessionId
    );

    this.pairingChallenges.delete(boardId);

    return {
      success: true,
      board: pairedDevice,
      pairingTicket: ticketId
    };
  }

  /**
   * Send approved ClassSession package from mobile to classroom SmartBoard with idempotency
   */
  public sendSessionToClassroom(
    user: User,
    boardId: string,
    sessionId: string
  ): MobileSessionDeliveryRecord {
    if (user.role !== 'teacher' && user.role !== 'principal') {
      throw new Error('Forbidden: Only teachers can send sessions to SmartBoard (403)');
    }

    const board = smartboardStore.getDevice(boardId);
    if (!board) {
      throw new Error(`SmartBoard '${boardId}' not found`);
    }

    // Idempotency check: if already delivered recently, return existing record
    const deliveryKey = `${boardId}-${sessionId}`;
    const existing = this.deliveryLog.get(deliveryKey);
    if (existing) {
      return existing;
    }

    const session = classSessionStore.getSessionSync(sessionId);
    if (!session) {
      throw new Error(`ClassSession '${sessionId}' not found`);
    }

    // Provision or attach BoardDocument
    smartboardStore.createOrGetDocumentForSession({
      sessionId: session.id,
      classId: session.classId,
      courseCode: session.courseCode,
      courseName: session.courseName || session.topic,
      unitId: session.unitId,
      unitTitle: session.unitTitle,
      lessonId: session.lessonId,
      lessonTitle: session.lessonTitle || session.topic,
      teacherId: user.id,
      teacherName: user.displayName || 'Educator',
      title: `${session.courseCode}: ${session.topic}`,
      classroomId: board.classroomId,
      classroomName: board.classroomName,
      institutionId: board.institutionId
    });

    const now = new Date().toISOString();
    const record: MobileSessionDeliveryRecord = {
      deliveryId: `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      boardId,
      sessionId,
      teacherId: user.id,
      deliveredAt: now,
      acknowledgedAt: now,
      status: 'ACKNOWLEDGED'
    };

    this.deliveryLog.set(deliveryKey, record);
    smartboardStore.updateDeviceStatus(boardId, 'READY', {
      currentSessionId: sessionId,
      currentTopic: session.topic,
      currentCourseCode: session.courseCode
    });

    return record;
  }

  /**
   * Teacher mobile remote actions (Next Page, Prev Page, Launch Quiz, End Class)
   */
  public executeRemoteAction(
    user: User,
    boardId: string,
    action: 'NEXT_PAGE' | 'PREV_PAGE' | 'SET_PAGE' | 'CLEAR_PAGE' | 'TOGGLE_LASER' | 'LAUNCH_QUIZ' | 'END_SESSION',
    payload?: { pageIndex?: number; quizId?: string; laserActive?: boolean; laserPoint?: { x: number; y: number } }
  ): { ok: boolean; boardDoc?: BoardDocument; laserState?: { active: boolean; point?: { x: number; y: number } } } {
    if (user.role !== 'teacher' && user.role !== 'principal') {
      throw new Error('Forbidden: Remote control requires teacher authorization (403)');
    }

    const board = smartboardStore.getDevice(boardId);
    if (!board || !board.currentSessionId) {
      throw new Error(`SmartBoard '${boardId}' is not currently running an active session`);
    }

    // Classroom / Institution verification: user institution must match board institution
    if (user.institutionId && board.institutionId && user.institutionId !== board.institutionId) {
      throw new Error('Forbidden: Cross-institution control plane access denied (403)');
    }

    const doc = smartboardStore.getBoardDocumentForSession(board.currentSessionId);
    if (!doc) {
      throw new Error('No board document found for active session');
    }

    if (action === 'NEXT_PAGE') {
      if (doc.activePageIndex < doc.pages.length - 1) {
        doc.activePageIndex += 1;
        smartboardStore.autosaveDocument(doc.id, { activePageIndex: doc.activePageIndex });
      }
    } else if (action === 'PREV_PAGE') {
      if (doc.activePageIndex > 0) {
        doc.activePageIndex -= 1;
        smartboardStore.autosaveDocument(doc.id, { activePageIndex: doc.activePageIndex });
      }
    } else if (action === 'SET_PAGE' && typeof payload?.pageIndex === 'number') {
      if (payload.pageIndex >= 0 && payload.pageIndex < doc.pages.length) {
        doc.activePageIndex = payload.pageIndex;
        smartboardStore.autosaveDocument(doc.id, { activePageIndex: doc.activePageIndex });
      }
    } else if (action === 'CLEAR_PAGE') {
      const pageIdx = doc.activePageIndex;
      if (doc.pages[pageIdx]) {
        doc.pages[pageIdx].elements = [];
        doc.pages[pageIdx].semanticCandidates = [];
        doc.pages[pageIdx].spatialRelationships = [];
        doc.pages[pageIdx].updatedAt = new Date().toISOString();
        smartboardStore.autosaveDocument(doc.id, { pages: doc.pages });
      }
    } else if (action === 'TOGGLE_LASER') {
      return {
        ok: true,
        boardDoc: doc,
        laserState: {
          active: Boolean(payload?.laserActive),
          point: payload?.laserPoint
        }
      };
    } else if (action === 'END_SESSION') {
      smartboardStore.completeSession(board.currentSessionId);
    }

    return { ok: true, boardDoc: doc };
  }
}

export const controlPlaneService = new ControlPlaneService();
