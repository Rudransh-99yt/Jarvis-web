// Centralized Classroom Authorization Policy Boundary (Milestone 12 Hardening)
import type { User, WorkspaceMembership } from '../data/types.ts';
import type { IJarvisDataRepository } from '../data/repository.ts';
import { jarvisData } from '../data/index.ts';
import type { ClassroomSession, ClassroomParticipant } from '../../src/types/classroom.ts';
import type { EducationClass } from '../../src/types/education.ts';

export interface AuthorizationResult {
  allowed: boolean;
  statusCode?: number;
  reason?: string;
  cls?: EducationClass;
  session?: ClassroomSession;
}

export class ClassroomAuthorizationPolicy {
  private repo: IJarvisDataRepository;

  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  /**
   * 1. Verifies that the user belongs to the target workspace.
   */
  async verifyWorkspaceMembership(user: User, workspaceId: string): Promise<{ isMember: boolean; role?: string }> {
    if (!workspaceId) return { isMember: false };
    const members = await this.repo.workspaces.getMembers(workspaceId);
    const membership = members.find((m: WorkspaceMembership) => m.userId === user.id);
    if (membership) {
      return { isMember: true, role: membership.role };
    }
    // High-privilege system commanders/admins have default access within system workspaces
    if (user.role === 'commander' || user.role === 'admin') {
      const ws = await this.repo.workspaces.getById(workspaceId);
      if (ws) return { isMember: true, role: 'admin' };
    }
    return { isMember: false };
  }

  /**
   * 2. Authorizes creating a new classroom session.
   * Rules:
   * - User must belong to workspace
   * - Class must exist in workspace
   * - User must be the assigned course instructor OR commander/admin
   * - Students cannot create sessions
   * - Teachers not assigned to this class cannot create sessions
   */
  async canCreateSession(user: User, classId: string, workspaceId: string): Promise<AuthorizationResult> {
    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    const cls = await this.repo.education.getClassById(classId);
    if (!cls) {
      return {
        allowed: false,
        statusCode: 404,
        reason: `Class '${classId}' does not exist.`
      };
    }

    if (user.role === 'commander' || user.role === 'admin') {
      return { allowed: true, cls };
    }

    if (user.role === 'teacher') {
      if (cls.instructorId === user.id) {
        return { allowed: true, cls };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Forbidden: Teacher '${user.id}' is not assigned to course '${cls.code}'.`
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: `Forbidden: Only course instructors or administrators can initialize classroom sessions.`
    };
  }

  /**
   * 3. Authorizes controlling an existing session (start, pause, resume, end).
   * Rules:
   * - Workspace membership verified & session belongs to specified workspace
   * - User must be session controller (session.teacherId) OR course instructor (cls.instructorId) OR commander/admin
   * - No hard-coded user IDs
   */
  async canControlSession(user: User, session: ClassroomSession, workspaceId: string): Promise<AuthorizationResult> {
    if (session.workspaceId !== workspaceId) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace mismatch: Session '${session.id}' belongs to '${session.workspaceId}', not '${workspaceId}'.`
      };
    }

    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    if (user.role === 'commander' || user.role === 'admin') {
      return { allowed: true, session };
    }

    if (user.role !== 'teacher') {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Forbidden: Students are not authorized to control classroom sessions.`
      };
    }

    const cls = await this.repo.education.getClassById(session.classId);
    const isOwner = session.teacherId === user.id;
    const isInstructor = cls ? cls.instructorId === user.id : false;

    if (isOwner || isInstructor) {
      return { allowed: true, session, cls: cls || undefined };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: `Forbidden: Teacher '${user.id}' is not the controller or instructor for session '${session.id}'.`
    };
  }

  /**
   * 4. Authorizes reading a classroom session / active session / state.
   * Rules:
   * - Workspace membership verified & session belongs to requested workspace
   * - Course instructor, enrolled students, or commander/admin
   * - Teachers from other classes or non-enrolled students are rejected
   */
  async canReadSession(user: User, session: ClassroomSession, workspaceId: string): Promise<AuthorizationResult> {
    if (session.workspaceId !== workspaceId) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace access denied: Session '${session.id}' does not belong to workspace '${workspaceId}'.`
      };
    }

    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    if (user.role === 'commander' || user.role === 'admin') {
      return { allowed: true, session };
    }

    const cls = await this.repo.education.getClassById(session.classId);
    if (!cls) {
      return { allowed: false, statusCode: 404, reason: `Course '${session.classId}' not found.` };
    }

    if (user.role === 'teacher') {
      if (session.teacherId === user.id || cls.instructorId === user.id) {
        return { allowed: true, session, cls };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Forbidden: Teacher '${user.id}' is not assigned to course '${cls.code}'.`
      };
    }

    if (user.role === 'student') {
      if (cls.studentIds && cls.studentIds.includes(user.id)) {
        return { allowed: true, session, cls };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: Student '${user.id}' is not enrolled in class '${cls.code}'.`
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: `Forbidden: User role '${user.role}' is not authorized for classroom sessions.`
    };
  }

  /**
   * 5. Authorizes reading active session for a class.
   */
  async canReadActiveSession(user: User, classId: string, workspaceId: string): Promise<AuthorizationResult> {
    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    const cls = await this.repo.education.getClassById(classId);
    if (!cls) {
      return { allowed: false, statusCode: 404, reason: `Class '${classId}' not found.` };
    }

    if (user.role === 'commander' || user.role === 'admin') {
      return { allowed: true, cls };
    }

    if (user.role === 'teacher') {
      if (cls.instructorId === user.id) {
        return { allowed: true, cls };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Forbidden: Teacher '${user.id}' is not assigned to course '${cls.code}'.`
      };
    }

    if (user.role === 'student') {
      if (cls.studentIds && cls.studentIds.includes(user.id)) {
        return { allowed: true, cls };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: Student '${user.id}' is not enrolled in class '${cls.code}'.`
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: `Forbidden: Role '${user.role}' is not authorized.`
    };
  }

  /**
   * 6. Authorizes a student joining a live/paused session.
   * Rules:
   * - Session must not be ended
   * - Student cannot manipulate another student's identity (targetStudentId must match user.id)
   * - Student must belong to workspace
   * - Student must be enrolled in class
   */
  async canJoinSession(
    user: User,
    session: ClassroomSession,
    workspaceId: string,
    targetStudentId?: string
  ): Promise<AuthorizationResult> {
    if (session.workspaceId !== workspaceId) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace join denied: Session '${session.id}' belongs to '${session.workspaceId}'.`
      };
    }

    if (session.status === 'ended') {
      return {
        allowed: false,
        statusCode: 400,
        reason: `Cannot join session '${session.id}' because it has already ended.`
      };
    }

    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    // Students can NEVER join as someone else
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.id) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Forbidden: Students cannot join on behalf of other participants ('${targetStudentId}').`
      };
    }

    const cls = await this.repo.education.getClassById(session.classId);
    if (!cls) {
      return { allowed: false, statusCode: 404, reason: `Course '${session.classId}' not found.` };
    }

    if (user.role === 'student') {
      if (cls.studentIds && cls.studentIds.includes(user.id)) {
        return { allowed: true, session, cls };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: Student '${user.id}' is not enrolled in class '${cls.code}'.`
      };
    }

    // Teachers / Admins can also join to observe
    if (user.role === 'teacher' || user.role === 'commander' || user.role === 'admin') {
      return { allowed: true, session, cls };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: `Forbidden: Role '${user.role}' cannot join classroom session.`
    };
  }

  /**
   * 7. Authorizes student actions on their participant record (leave, presence heartbeat).
   * Rules:
   * - Cannot manipulate another student's participant record
   * - Must belong to workspace and be enrolled
   */
  async canPerformParticipantAction(
    user: User,
    session: ClassroomSession,
    workspaceId: string,
    targetStudentId?: string
  ): Promise<AuthorizationResult> {
    if (session.workspaceId !== workspaceId) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace mismatch.`
      };
    }

    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    // Student cannot modify another student's participant status
    if (user.role === 'student' && targetStudentId && targetStudentId !== user.id) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Forbidden: Cannot manipulate participant record for other students.`
      };
    }

    const cls = await this.repo.education.getClassById(session.classId);
    if (!cls) {
      return { allowed: false, statusCode: 404, reason: `Class not found.` };
    }

    if (user.role === 'student') {
      if (cls.studentIds && cls.studentIds.includes(user.id)) {
        return { allowed: true, session, cls };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Access denied: Student '${user.id}' is not enrolled in class '${cls.code}'.`
      };
    }

    if (user.role === 'teacher' || user.role === 'commander' || user.role === 'admin') {
      return { allowed: true, session, cls };
    }

    return { allowed: false, statusCode: 403, reason: `Forbidden.` };
  }

  /**
   * 8. Authorizes subscribing to the Real-Time SSE Stream.
   * Must evaluate BEFORE any headers are sent or EventBus listeners subscribed.
   */
  async canSubscribeStream(user: User, session: ClassroomSession, workspaceId: string): Promise<AuthorizationResult> {
    return this.canReadSession(user, session, workspaceId);
  }

  /**
   * 9. Authorizes listing participants in a session.
   */
  async canListParticipants(user: User, session: ClassroomSession, workspaceId: string): Promise<AuthorizationResult> {
    return this.canReadSession(user, session, workspaceId);
  }

  /**
   * 10. Authorizes updating smart board state (teacher/controller only).
   */
  async canUpdateBoardState(user: User, session: ClassroomSession, workspaceId: string): Promise<AuthorizationResult> {
    return this.canControlSession(user, session, workspaceId);
  }
}

export const defaultClassroomPolicy = new ClassroomAuthorizationPolicy();
