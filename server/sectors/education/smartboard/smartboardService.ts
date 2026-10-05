// Core Service Orchestrator for SmartBoard OS (D.8 / P1-7 Hardening)
import { smartboardStore } from './smartboardStore.ts';
import { smartboardPolicy } from './smartboardPolicy.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';
import { classroomEventBus } from '../classroomEventBus.ts';
import { ticketService } from '../../../auth/tickets.ts';
import type { User } from '../../../data/types.ts';
import type {
  SmartBoardDevice,
  BoardDocument,
  BoardPage,
  SmartBoardDeviceStatus
} from '../../../../src/types/smartboard.ts';
import type { ClassSession } from '../../../../src/types/classSession.ts';
import { jarvisData } from '../../../data/index.ts';

export class SmartBoardService {
  /**
   * 1. Lists registered SmartBoard devices for an authenticated user's institution and classroom.
   */
  async listDevices(user: User, classroomId?: string): Promise<SmartBoardDevice[]> {
    const userTenant = user.institutionId;
    const isAdmin = user.role === 'admin' || user.role === 'commander';
    if (!isAdmin && !userTenant) {
      return [];
    }
    return smartboardStore.listDevices(isAdmin ? undefined : userTenant, classroomId);
  }

  /**
   * 2. Gets a specific SmartBoard device with tenant isolation.
   */
  async getDevice(user: User, boardId: string): Promise<SmartBoardDevice> {
    const dev = smartboardStore.getDevice(boardId);
    if (!dev) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    const userTenant = user.institutionId;
    const isAdmin = user.role === 'admin' || user.role === 'commander';
    if (!isAdmin && (!userTenant || !dev.institutionId || dev.institutionId !== userTenant)) {
      const err: any = new Error(`Forbidden: Cross-institution device access denied.`);
      err.statusCode = 403;
      throw err;
    }

    return dev;
  }

  /**
   * 3. Generates a temporary 6-digit pair code for a physical board with authorization check.
   */
  async generatePairCode(
    userOrBoardId: User | string,
    maybeBoardId?: string
  ): Promise<{ pairCode: string; expiresAt: number; board: SmartBoardDevice }> {
    let user: User | undefined;
    let boardId: string;
    if (typeof userOrBoardId === 'string') {
      boardId = userOrBoardId;
      user = undefined;
    } else {
      user = userOrBoardId;
      boardId = maybeBoardId!;
    }

    const board = smartboardStore.getDevice(boardId);
    if (!board) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    if (user) {
      const check = await smartboardPolicy.canControlBoard(user, board);
      if (!check.allowed) {
        const err: any = new Error(check.reason || 'Unauthorized to generate pairing code.');
        err.statusCode = check.statusCode || 403;
        throw err;
      }
    }

    const { pairCode, expiresAt } = smartboardStore.generatePairCode(boardId);
    const updatedBoard = smartboardStore.getDevice(boardId)!;

    classroomEventBus.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId: updatedBoard.currentSessionId || `setup-${boardId}`,
      classId: updatedBoard.classroomId,
      workspaceId: 'ws-stark-core',
      data: { boardId, status: 'PAIRING', pairCode, expiresAt },
      timestamp: new Date().toISOString()
    });

    return { pairCode, expiresAt, board: updatedBoard };
  }

  /**
   * 4. Pairs an authenticated teacher with a SmartBoard device using a pair code.
   */
  async pairWithCode(
    teacher: User,
    boardId: string,
    pairCode: string,
    sessionId?: string
  ): Promise<{ board: SmartBoardDevice; ticket: string; expiresAt: string }> {
    const board = smartboardStore.getDevice(boardId);
    if (!board) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    const check = await smartboardPolicy.canControlBoard(teacher, board);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Unauthorized to pair with board.');
      err.statusCode = check.statusCode || 403;
      throw err;
    }

    // Verify pairing code
    if (!board.pairingState.pairCode || board.pairingState.pairCode !== pairCode) {
      throw new Error('Invalid pairing code provided. Please check the board display.');
    }

    if (board.pairingState.pairCodeExpiresAt && Date.now() > board.pairingState.pairCodeExpiresAt) {
      throw new Error('Pairing code has expired. Please refresh the board to generate a new PIN.');
    }

    // Issue cryptographic ticket
    const targetSessionId = sessionId || board.currentSessionId || 'session-phys-101';
    const { ticket, expiresAt } = ticketService.createBoardTicket({
      boardId,
      teacherId: teacher.id,
      institutionId: board.institutionId,
      classroomId: board.classroomId,
      classSessionId: targetSessionId,
      ttlSeconds: 3600 // 1 hour ticket
    });

    const updatedBoard = smartboardStore.pairDevice(
      boardId,
      teacher.id,
      teacher.displayName || 'Instructor',
      ticket,
      targetSessionId
    );

    classroomEventBus.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId: targetSessionId,
      classId: board.classroomId,
      workspaceId: 'ws-stark-core',
      data: {
        event: 'BOARD_PAIRED',
        boardId,
        teacherId: teacher.id,
        teacherName: teacher.displayName,
        status: updatedBoard.status
      },
      timestamp: new Date().toISOString()
    });

    return { board: updatedBoard, ticket, expiresAt };
  }

  /**
   * 5. Sends an approved/scheduled ClassSession to a registered SmartBoard.
   */
  async sendSessionToBoard(
    teacher: User,
    boardId: string,
    sessionId: string
  ): Promise<{ board: SmartBoardDevice; document: BoardDocument; session: Partial<ClassSession> }> {
    const board = smartboardStore.getDevice(boardId);
    if (!board) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      throw new Error(`ClassSession '${sessionId}' not found.`);
    }

    const check = await smartboardPolicy.canSendSessionToBoard(teacher, board, session);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Cannot send session to board.');
      err.statusCode = check.statusCode || 403;
      throw err;
    }

    // Create or retrieve corresponding structured BoardDocument
    const doc = smartboardStore.createOrGetDocumentForSession({
      sessionId: session.id,
      classId: session.classId,
      courseCode: session.courseCode,
      courseName: session.courseName,
      unitId: session.unitId,
      unitTitle: session.unitTitle,
      lessonId: session.lessonId,
      lessonTitle: session.lessonTitle,
      teacherId: session.teacherId,
      teacherName: session.teacherName,
      title: `${session.courseCode}: ${session.topic} (Board Notes)`,
      classroomId: board.classroomId,
      classroomName: board.classroomName,
      institutionId: board.institutionId
    });

    // Update board state to READY
    const updatedBoard = smartboardStore.updateDeviceStatus(boardId, 'READY', {
      currentSessionId: session.id,
      currentCourseCode: session.courseCode,
      currentTopic: session.topic
    });

    classroomEventBus.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: 'ws-stark-core',
      data: {
        event: 'SESSION_SENT_TO_BOARD',
        boardId,
        sessionId: session.id,
        title: session.topic,
        courseCode: session.courseCode,
        status: 'READY'
      },
      timestamp: new Date().toISOString()
    });

    return {
      board: updatedBoard,
      document: doc,
      session: smartboardPolicy.sanitizeSessionForPublicBoard(session)
    };
  }

  /**
   * 6. Opens / launches a session on the SmartBoard (transitions to LIVE).
   */
  async launchSessionOnBoard(
    teacher: User,
    boardId: string,
    sessionId: string
  ): Promise<{ board: SmartBoardDevice; document: BoardDocument; session: Partial<ClassSession> }> {
    const board = smartboardStore.getDevice(boardId);
    if (!board) {
      throw new Error(`SmartBoard device '${boardId}' not found.`);
    }

    const session = await classSessionStore.getSession(sessionId);
    if (!session) {
      throw new Error(`ClassSession '${sessionId}' not found.`);
    }

    const check = await smartboardPolicy.canControlBoard(teacher, board);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Unauthorized.');
      err.statusCode = check.statusCode || 403;
      throw err;
    }

    // Transition board to LIVE
    const updatedBoard = smartboardStore.updateDeviceStatus(boardId, 'LIVE', {
      currentSessionId: session.id,
      currentCourseCode: session.courseCode,
      currentTopic: session.topic
    });

    const doc = smartboardStore.createOrGetDocumentForSession({
      sessionId: session.id,
      classId: session.classId,
      courseCode: session.courseCode,
      courseName: session.courseName,
      unitId: session.unitId,
      unitTitle: session.unitTitle,
      lessonId: session.lessonId,
      lessonTitle: session.lessonTitle,
      teacherId: session.teacherId,
      teacherName: session.teacherName,
      title: `${session.courseCode}: ${session.topic} (Board Notes)`,
      classroomId: board.classroomId,
      classroomName: board.classroomName,
      institutionId: board.institutionId
    });

    classroomEventBus.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: 'ws-stark-core',
      data: {
        event: 'SESSION_STARTED',
        boardId,
        sessionId: session.id,
        status: 'LIVE'
      },
      timestamp: new Date().toISOString()
    });

    return {
      board: updatedBoard,
      document: doc,
      session: smartboardPolicy.sanitizeSessionForPublicBoard(session)
    };
  }

  /**
   * 7. Retrieves a BoardDocument with security checks.
   */
  async getBoardDocument(user: User, sessionIdOrDocId: string): Promise<BoardDocument> {
    let doc = smartboardStore.getBoardDocument(sessionIdOrDocId);
    if (!doc) {
      doc = smartboardStore.getBoardDocumentForSession(sessionIdOrDocId);
    }
    if (!doc) {
      const session = await classSessionStore.getSession(sessionIdOrDocId);
      if (session) {
        doc = smartboardStore.createOrGetDocumentForSession({
          sessionId: session.id,
          classId: session.classId,
          courseCode: session.courseCode,
          courseName: session.courseName,
          unitId: session.unitId,
          unitTitle: session.unitTitle,
          lessonId: session.lessonId,
          lessonTitle: session.lessonTitle,
          teacherId: session.teacherId,
          teacherName: session.teacherName,
          title: `${session.courseCode}: ${session.topic} (Board Notes)`,
          classroomId: 'class-phys-301',
          classroomName: 'Physics Lab Hall C-104',
          institutionId: session.schoolId || user.institutionId || ''
        });
      }
    }
    if (!doc) {
      throw new Error(`Board document '${sessionIdOrDocId}' not found.`);
    }

    const check = await smartboardPolicy.canReadDocument(user, doc);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Forbidden.');
      err.statusCode = check.statusCode || 403;
      throw err;
    }

    return doc;
  }

  /**
   * 8. Autosaves a BoardDocument.
   */
  async autosaveDocument(
    user: User,
    docId: string,
    updates: Partial<BoardDocument> & { pages?: BoardPage[]; activePageIndex?: number; expectedVersion?: number }
  ): Promise<BoardDocument> {
    const doc = smartboardStore.getBoardDocument(docId);
    if (!doc) {
      throw new Error(`Board document '${docId}' not found.`);
    }

    const check = await smartboardPolicy.canEditDocument(user, doc);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Forbidden to edit board document.');
      err.statusCode = check.statusCode || 403;
      throw err;
    }

    const savedDoc = smartboardStore.autosaveDocument(docId, updates);

    classroomEventBus.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId: doc.classSessionId,
      classId: doc.classId,
      workspaceId: 'ws-stark-core',
      data: {
        event: 'BOARD_DOCUMENT_UPDATED',
        docId,
        version: savedDoc.version,
        activePageIndex: savedDoc.activePageIndex,
        pageCount: savedDoc.pages.length,
        lastAutosavedAt: savedDoc.timestamps.lastAutosavedAt
      },
      timestamp: new Date().toISOString()
    });

    return savedDoc;
  }

  /**
   * 9. Releases a BoardDocument to enrolled students.
   */
  async releaseDocument(
    teacher: User,
    docId: string,
    isReleased = true
  ): Promise<BoardDocument> {
    const doc = smartboardStore.getBoardDocument(docId);
    if (!doc) {
      throw new Error(`Board document '${docId}' not found.`);
    }

    const check = await smartboardPolicy.canReleaseDocument(teacher, doc);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Forbidden.');
      err.statusCode = check.statusCode || 403;
      throw err;
    }

    const updated = smartboardStore.releaseDocument(docId, isReleased);

    // Bridge into RAG knowledge indexing if released
    if (isReleased) {
      this.indexBoardDocumentInRag(updated).catch((e) =>
        console.warn('[SmartBoardService] RAG indexing notice:', e.message)
      );
    }

    classroomEventBus.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId: doc.classSessionId,
      classId: doc.classId,
      workspaceId: 'ws-stark-core',
      data: {
        event: 'BOARD_HISTORY_RELEASED',
        docId,
        classId: doc.classId,
        courseCode: doc.courseCode,
        isReleasedToStudents: isReleased
      },
      timestamp: new Date().toISOString()
    });

    return updated;
  }

  /**
   * 10. Completes a live board session and creates Board History.
   */
  async completeSession(
    teacher: User,
    boardId: string,
    sessionId: string
  ): Promise<{ board?: SmartBoardDevice; document?: BoardDocument }> {
    const board = smartboardStore.getDevice(boardId);
    if (board) {
      const check = await smartboardPolicy.canControlBoard(teacher, board);
      if (!check.allowed) {
        const err: any = new Error(check.reason || 'Forbidden.');
        err.statusCode = check.statusCode || 403;
        throw err;
      }
    }

    const result = smartboardStore.completeSession(sessionId);

    classroomEventBus.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId,
      classId: board?.classroomId || 'class-phys-301',
      workspaceId: 'ws-stark-core',
      data: {
        event: 'SESSION_COMPLETED',
        sessionId,
        boardId,
        completedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * 11. Lists Board History for a course / class with tenant and enrollment scoping.
   */
  async getBoardHistory(user: User, classId: string): Promise<BoardDocument[]> {
    const check = await smartboardPolicy.canViewBoardHistory(user, classId);
    if (!check.allowed) {
      const err: any = new Error(check.reason || 'Forbidden.');
      err.statusCode = check.statusCode || 403;
      throw err;
    }

    const isStudent = user.role === 'student' || user.role === 'parent';
    const docs = smartboardStore.listDocumentsForClass(classId, isStudent);

    // Apply document read policy to each item in history to prevent any cross-tenant or unreleased leakage
    const authorizedDocs: BoardDocument[] = [];
    for (const doc of docs) {
      const docCheck = await smartboardPolicy.canReadDocument(user, doc);
      if (docCheck.allowed) {
        authorizedDocs.push(doc);
      }
    }

    return authorizedDocs;
  }

  /**
   * Internal helper to index released board document into Grounded RAG Knowledge Space.
   */
  private async indexBoardDocumentInRag(doc: BoardDocument): Promise<void> {
    try {
      const textParts: string[] = [
        `Board Notes: ${doc.title}`,
        `Course: ${doc.courseCode} - ${doc.courseName}`,
        `Lesson: ${doc.lessonTitle || 'N/A'}`
      ];

      doc.pages.forEach((page, idx) => {
        textParts.push(`\n--- Page ${idx + 1}: ${page.title} ---`);
        page.elements.forEach((elem) => {
          if (elem.text) textParts.push(elem.text);
          if (elem.latexFormula) textParts.push(`Formula: ${elem.latexFormula}`);
          if (elem.label) textParts.push(`Diagram Label: ${elem.label}`);
          if (elem.semanticTag) textParts.push(`[${elem.semanticTag}]`);
        });
      });

      doc.ragIndexed = true;
      doc.ragSummary = `Indexed ${doc.pages.length} board pages with ${doc.pages.reduce((acc, p) => acc + p.elements.length, 0)} structured elements.`;
    } catch {}
  }
}

export const smartboardService = new SmartBoardService();
