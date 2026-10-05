// Canonical Server-Side Capability & Role Permissions Engine (Phase P0-5)
import type { Request, Response, NextFunction } from 'express';
import type { User, UserRole } from '../data/types.ts';

export const ROLE_CAPABILITIES: Record<UserRole, readonly string[]> = {
  student: [
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.assignments.submit',
    'student.practice.manage',
    'student.focus.manage',
    'student.progress.view',
    'student.community.view',
    'student.community.participate',
    'student.smartboard.view_released',
    'student.videos.view',
    'student.classroom.participate',
    'student.study.manage'
  ],
  teacher: [
    'teacher.classes.manage',
    'teacher.curriculum.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'teacher.announcements.post',
    'teacher.videos.manage',
    'teacher.classroom.host',
    'teacher.visualization.create',
    'teacher.visualization.manage'
  ],
  parent: [
    'parent.children.view',
    'parent.progress.view',
    'parent.learning_support.view',
    'parent.alerts.view',
    'parent.family_intelligence.view',
    'parent.community.view'
  ],
  principal: [
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view'
  ],
  commander: [
    'admin.system.manage',
    'admin.users.manage',
    'admin.configuration.manage',
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view',
    'teacher.classes.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.progress.view',
    'parent.children.view'
  ],
  admin: [
    'admin.system.manage',
    'admin.users.manage',
    'admin.configuration.manage',
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view',
    'teacher.classes.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.progress.view',
    'parent.children.view'
  ],
  guest: []
};

/**
 * Resolves the immutable, server-authoritative capabilities for an authenticated user.
 * Derived solely from verified server identity, NEVER client input.
 */
export function resolveCapabilities(user: User): string[] {
  if (!user || !user.role) return [];
  const base = ROLE_CAPABILITIES[user.role] || [];
  return [...base];
}

/**
 * Checks whether an authenticated user possesses a required capability.
 */
export function hasCapability(user: User, capability: string): boolean {
  if (!user || !user.role) return false;
  if (user.role === 'admin' || user.role === 'commander') return true;
  const caps = resolveCapabilities(user);
  return caps.includes(capability);
}

/**
 * Express middleware to strictly enforce that the authenticated user possesses a required capability.
 */
export function requireCapability(capability: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).auth;
    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.'
        }
      });
      return;
    }
    if (!hasCapability(user, capability)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied: User '${user.id}' lacks required capability '${capability}'.`
        }
      });
      return;
    }
    next();
  };
}

