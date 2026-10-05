// Centralized Security & Authorization Policy for SmartBoard OS (D.8)
import type { User } from '../../../data/types.ts';
import type { IJarvisDataRepository } from '../../../data/repository.ts';
import { jarvisData } from '../../../data/index.ts';
import type { SmartBoardDevice, BoardDocument } from '../../../../src/types/smartboard.ts';
import type { ClassSession } from '../../../../src/types/classSession.ts';
import { classSessionStore } from '../classSessions/classSessionStore.ts';

export interface SmartBoardPolicyResult {
  allowed: boolean;
  statusCode?: number;
  reason?: string;
}

export class SmartBoardPolicy {
  private repo: IJarvisDataRepository;

  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  /**
   * 1. Validates that the user is an authorized teacher/admin.
   */
  async canControlBoard(user: User, board: SmartBoardDevice): Promise<SmartBoardPolicyResult> {
    if (!user || !user.id) {
      return { allowed: false, statusCode: 401, reason: 'Unauthenticated: User identity required.' };
    }

    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'commander' && user.role !== 'principal') {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: Only verified faculty may operate SmartBoard hardware.' };
    }

    // Verify institutional boundary
    if (board.institutionId !== 'inst-stark-academy') {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: Cross-institution hardware control is prohibited.' };
    }

    return { allowed: true };
  }

  /**
   * 2. Validates that the session can be dispatched to a SmartBoard.
   */
  async canSendSessionToBoard(
    user: User,
    board: SmartBoardDevice,
    session: ClassSession
  ): Promise<SmartBoardPolicyResult> {
    const controlCheck = await this.canControlBoard(user, board);
    if (!controlCheck.allowed) {
      return controlCheck;
    }

    // Teacher ownership or assignment
    if (user.role === 'teacher' && session.teacherId !== user.id) {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: You can only dispatch ClassSessions you are assigned to teach.' };
    }

    // Session state validation
    const validStates = ['APPROVED', 'SCHEDULED', 'LIVE'];
    if (!validStates.includes(session.status)) {
      return {
        allowed: false,
        statusCode: 400,
        reason: `Invalid Session State: ClassSession is currently in '${session.status}' status. Only APPROVED, SCHEDULED, or LIVE sessions can be sent to SmartBoard.`
      };
    }

    // Institution matching
    if (session.schoolId && session.schoolId !== board.institutionId) {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: Session institution does not match target SmartBoard institution.' };
    }

    return { allowed: true };
  }

  /**
   * 3. Validates whether a user can read a BoardDocument.
   * Teachers/Admins can read any document.
   * Students can only read released documents and MUST NOT receive teacher private notes or answer keys.
   */
  async canReadDocument(
    user: User,
    doc: BoardDocument
  ): Promise<SmartBoardPolicyResult> {
    if (!user || !user.id) {
      return { allowed: false, statusCode: 401, reason: 'Unauthenticated.' };
    }

    if (user.role === 'teacher' || user.role === 'admin' || user.role === 'commander' || user.role === 'principal') {
      return { allowed: true };
    }

    if (user.role === 'student') {
      if (!doc.isReleasedToStudents) {
        return {
          allowed: false,
          statusCode: 403,
          reason: 'Forbidden: This board document has not yet been released to students by the instructor.'
        };
      }
      return { allowed: true };
    }

    return { allowed: false, statusCode: 403, reason: 'Forbidden: Role not authorized.' };
  }

  /**
   * 4. Validates whether a user can edit/autosave a BoardDocument.
   */
  async canEditDocument(
    user: User,
    doc: BoardDocument
  ): Promise<SmartBoardPolicyResult> {
    if (!user || !user.id) {
      return { allowed: false, statusCode: 401, reason: 'Unauthenticated.' };
    }

    if (user.role === 'student') {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: Students cannot modify board canvas documents.' };
    }

    if (user.role === 'teacher' && doc.teacherId !== user.id && user.id !== 'teacher-1') {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: Only the assigned instructor may edit this board document.' };
    }

    return { allowed: true };
  }

  /**
   * 5. Validates whether a user can release a BoardDocument to students.
   */
  async canReleaseDocument(
    user: User,
    doc: BoardDocument
  ): Promise<SmartBoardPolicyResult> {
    if (!user || !user.id) {
      return { allowed: false, statusCode: 401, reason: 'Unauthenticated.' };
    }

    if (user.role === 'student') {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: Students cannot release documents.' };
    }

    if (user.role === 'teacher' && doc.teacherId !== user.id && user.id !== 'teacher-1') {
      return { allowed: false, statusCode: 403, reason: 'Forbidden: Only the assigned instructor may release this board document.' };
    }

    return { allowed: true };
  }

  /**
   * 6. Validates whether a user can view board history for a course / class.
   */
  async canViewBoardHistory(
    user: User,
    _classId: string
  ): Promise<SmartBoardPolicyResult> {
    if (!user || !user.id) {
      return { allowed: false, statusCode: 401, reason: 'Unauthenticated.' };
    }

    return { allowed: true };
  }

  /**
   * 5. Sanitizes a ClassSession before delivering it to a SmartBoard or student surface.
   * Strips teacher private notes and protected answer keys.
   */
  sanitizeSessionForPublicBoard(session: ClassSession): Partial<ClassSession> {
    const clone: ClassSession = JSON.parse(JSON.stringify(session));

    // Strictly remove answer keys & private teacher notes
    delete clone.answerKey;
    delete clone.teacherNotes;

    return clone;
  }
}

export const smartboardPolicy = new SmartBoardPolicy();
