// Multi-Tenant Authorization for Unified File Storage (Milestone 10)
import { jarvisData } from '../data/index.ts';
import type { FileRecord, FileUploadPayload } from '../../src/types/storage.ts';
import type { User } from '../data/types.ts';

export interface AuthContext {
  user: User;
  workspaceId: string;
}

export class FileAuthManager {
  /**
   * Evaluates if a user is authorized to read / download a specific file.
   */
  async canAccessFile(user: User, file: FileRecord): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Hard Tenant Isolation: User must belong to the file's workspace
    const memberships = await jarvisData.workspaces.getMembers(file.workspaceId);
    const isMember = memberships.some((m) => m.userId === user.id);
    if (!isMember) {
      return { allowed: false, reason: 'Cross-workspace file access denied. User is not a member of this workspace.' };
    }

    // 2. Administrators & Commanders have full workspace file read access
    if (user.role === 'admin' || user.role === 'commander') {
      return { allowed: true };
    }

    // 3. File Owner always has access
    if (file.ownerUserId === user.id) {
      return { allowed: true };
    }

    // 4. Public-in-workspace files
    if (file.isPublicInWorkspace) {
      return { allowed: true };
    }

    // 5. Class-scoped authorization
    if (file.classId) {
      const cls = await jarvisData.education.getClassById(file.classId);
      if (cls) {
        // Teacher / Instructor of the class has full access to all class files
        if (cls.instructorId === user.id || user.role === 'teacher') {
          return { allowed: true };
        }

        // Student enrolled in class
        const isEnrolled = cls.studentIds.includes(user.id);
        if (isEnrolled) {
          // If file is linked to an assignment submission, student can only view their own submission
          if (file.submissionId) {
            const sub = await jarvisData.education.getSubmissionById(file.submissionId);
            if (sub && sub.studentId === user.id) {
              return { allowed: true };
            }
            return { allowed: false, reason: 'Access denied: Students cannot inspect submissions belonging to other students.' };
          }
          // Class materials or assignment worksheets are accessible to enrolled students
          return { allowed: true };
        }
      }
    }

    // 6. Research Project scoped authorization
    if (file.researchProjectId) {
      const proj = await jarvisData.research.getProjectById(file.researchProjectId, file.workspaceId);
      if (proj) {
        // Project owner or workspace member
        if (proj.ownerId === user.id || isMember) {
          return { allowed: true };
        }
      }
    }

    // 7. Knowledge Space scoped authorization
    if (file.knowledgeSpaceId) {
      const space = await jarvisData.knowledge.getSpaceById(file.knowledgeSpaceId, file.workspaceId);
      if (space) {
        return { allowed: true };
      }
    }

    // Default: If not public and user is not owner/teacher, reject
    return { allowed: false, reason: 'Access denied: You do not have permission to view this file.' };
  }

  /**
   * Evaluates if a user can upload a file with the given associations.
   */
  async canUploadFile(user: User, payload: FileUploadPayload): Promise<{ allowed: boolean; reason?: string }> {
    // 1. User must be a member of the workspace
    const memberships = await jarvisData.workspaces.getMembers(payload.workspaceId);
    const isMember = memberships.some((m) => m.userId === user.id);
    if (!isMember) {
      return { allowed: false, reason: 'User is not a member of the target workspace.' };
    }

    // 2. Class associations
    if (payload.classId) {
      const cls = await jarvisData.education.getClassById(payload.classId);
      if (!cls) {
        return { allowed: false, reason: `Target class '${payload.classId}' does not exist in workspace.` };
      }

      // If uploading general class material, must be instructor/teacher/commander/admin
      if (!payload.submissionId && cls.instructorId !== user.id && user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'commander') {
        return { allowed: false, reason: 'Only course instructors or administrators can upload general class materials.' };
      }

      // If uploading student submission, must be enrolled student or teacher/commander/admin
      if (payload.submissionId && !cls.studentIds.includes(user.id) && cls.instructorId !== user.id && user.role !== 'admin' && user.role !== 'commander') {
        return { allowed: false, reason: 'Student is not enrolled in this class.' };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluates if a user can delete a file.
   */
  async canDeleteFile(user: User, file: FileRecord): Promise<{ allowed: boolean; reason?: string }> {
    // Workspace membership check
    const memberships = await jarvisData.workspaces.getMembers(file.workspaceId);
    const isMember = memberships.some((m) => m.userId === user.id);
    if (!isMember) {
      return { allowed: false, reason: 'Cross-workspace file deletion forbidden.' };
    }

    // Admins and Commanders can delete any file in their workspace
    if (user.role === 'admin' || user.role === 'commander') {
      return { allowed: true };
    }

    // Owner can delete their own files
    if (file.ownerUserId === user.id) {
      return { allowed: true };
    }

    // Class instructor can delete class files
    if (file.classId) {
      const cls = await jarvisData.education.getClassById(file.classId);
      if (cls && cls.instructorId === user.id) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'Access denied: You do not have permission to delete this file.' };
  }
}

export const fileAuth = new FileAuthManager();
