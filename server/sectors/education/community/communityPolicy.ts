// Authorization & Security Boundary Policy for Community Subsystem
import type { User, WorkspaceMembership } from '../../../data/types.ts';
import type { IJarvisDataRepository } from '../../../data/repository.ts';
import { jarvisData } from '../../../data/index.ts';
import type { CommunityChannel, CommunityMessage, CommunityStudyGroup } from '../../../../src/types/community.ts';
import type { EducationClass } from '../../../../src/types/education.ts';

export interface CommunityAuthResult {
  allowed: boolean;
  statusCode?: number;
  reason?: string;
  cls?: EducationClass;
}

export class CommunityPolicy {
  private repo: IJarvisDataRepository;

  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  /**
   * 1. Verifies workspace membership & school boundary
   */
  async verifyWorkspaceMembership(user: User, workspaceId: string): Promise<{ isMember: boolean; role?: string }> {
    if (!workspaceId) return { isMember: false };
    const members = await this.repo.workspaces.getMembers(workspaceId);
    const membership = members.find((m: WorkspaceMembership) => m.userId === user.id);
    if (membership) {
      return { isMember: true, role: membership.role };
    }
    if (user.role === 'commander' || user.role === 'admin') {
      const ws = await this.repo.workspaces.getById(workspaceId);
      if (ws) return { isMember: true, role: 'admin' };
    }
    return { isMember: false };
  }

  /**
   * 2. Authorizes reading / subscribing to a Community Channel
   */
  async canAccessChannel(user: User, channel: CommunityChannel, workspaceId: string = 'ws-stark-core'): Promise<CommunityAuthResult> {
    const wsCheck = await this.verifyWorkspaceMembership(user, workspaceId);
    if (!wsCheck.isMember) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-workspace access denied: User '${user.id}' is not a member of workspace '${workspaceId}'.`
      };
    }

    // High privilege overrides
    if (user.role === 'commander' || user.role === 'admin') {
      return { allowed: true };
    }

    // Class boundary check
    if (channel.classId) {
      const cls = await this.repo.education.getClassById(channel.classId);
      if (!cls) {
        return { allowed: false, statusCode: 404, reason: `Associated class '${channel.classId}' not found.` };
      }

      if (user.role === 'student' && (!Array.isArray(cls.studentIds) || !cls.studentIds.includes(user.id))) {
        return {
          allowed: false,
          statusCode: 403,
          reason: `Access denied: Student '${user.displayName || user.id}' is not enrolled in class ${cls.code}.`
        };
      }
    }

    // Private / Study Group Allowed Users check
    if (channel.isPrivate && channel.allowedUserIds && channel.allowedUserIds.length > 0) {
      if (!channel.allowedUserIds.includes(user.id) && user.role !== 'teacher') {
        return {
          allowed: false,
          statusCode: 403,
          reason: `Private channel access denied for user '${user.id}'.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 3. Authorizes writing / posting a message to a channel
   */
  async canPostToChannel(user: User, channel: CommunityChannel, workspaceId: string = 'ws-stark-core'): Promise<CommunityAuthResult> {
    const access = await this.canAccessChannel(user, channel, workspaceId);
    if (!access.allowed) return access;

    // Announcement channel protection: Only teachers and admins can post announcements
    if (channel.type === 'ANNOUNCEMENTS') {
      const isTeacherOrAdmin = user.role === 'teacher' || user.role === 'admin' || user.role === 'commander';
      if (!isTeacherOrAdmin) {
        return {
          allowed: false,
          statusCode: 403,
          reason: 'Only instructors and administrative faculty can publish to Announcement channels.'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 4. Authorizes editing or deleting a message (moderation vs ownership)
   */
  async canModifyMessage(user: User, message: CommunityMessage, action: 'edit' | 'delete'): Promise<CommunityAuthResult> {
    const isOwner = message.senderUserId === user.id;
    const isStaff = user.role === 'teacher' || user.role === 'admin' || user.role === 'commander';

    if (action === 'edit') {
      if (!isOwner) {
        return {
          allowed: false,
          statusCode: 403,
          reason: 'Users may only edit their own sent messages.'
        };
      }
      return { allowed: true };
    }

    if (action === 'delete') {
      if (!isOwner && !isStaff) {
        return {
          allowed: false,
          statusCode: 403,
          reason: 'Unauthorized: You do not have permission to delete this message.'
        };
      }
      return { allowed: true };
    }

    return { allowed: false, statusCode: 400, reason: 'Invalid action.' };
  }

  /**
   * 5. Authorizes pinning messages
   */
  async canPinMessage(user: User): Promise<CommunityAuthResult> {
    const isStaff = user.role === 'teacher' || user.role === 'admin' || user.role === 'commander';
    if (!isStaff) {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'Only course instructors or administrators can pin messages.'
      };
    }
    return { allowed: true };
  }

  /**
   * 6. Authorizes creating an official announcement
   */
  async canCreateAnnouncement(user: User): Promise<CommunityAuthResult> {
    const isStaff = user.role === 'teacher' || user.role === 'admin' || user.role === 'commander';
    if (!isStaff) {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'Only faculty members can broadcast official announcements.'
      };
    }
    return { allowed: true };
  }
}

export const communityPolicy = new CommunityPolicy();
