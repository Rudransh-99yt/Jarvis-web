// JARVIS EDUCATION OS — DOMAIN AUTHORIZATION POLICY ENGINE (Phase P0-2)
// Server-authoritative role, tenancy, institution, and resource ownership enforcement.

import type { User } from '../../data/types.ts';
import type {
  EducationClass,
  Assignment,
  StudentSubmission,
  KnowledgeSpace,
  AcademicInstitution
} from '../../../src/types/education.ts';
import { educationStore } from './educationStore.ts';
import { familyService } from './family/familyService.ts';

export interface AuthorizationResult {
  allowed: boolean;
  statusCode?: number;
  reason?: string;
}

export class EducationPolicy {
  public static readonly DEFAULT_INSTITUTION_ID = 'inst-stark-academy';
  public static readonly DEFAULT_WORKSPACE_ID = 'ws-stark-core';

  /**
   * Evaluates if user has access to an academic institution.
   */
  public canAccessInstitution(user: User, institutionId?: string): AuthorizationResult {
    const targetInstId = institutionId || EducationPolicy.DEFAULT_INSTITUTION_ID;

    // Check if user belongs to this institution scope
    if (targetInstId !== EducationPolicy.DEFAULT_INSTITUTION_ID) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Cross-Institution Access Denied: User '${user.id}' is not authorized to access institution '${targetInstId}'.`
      };
    }

    return { allowed: true };
  }

  /**
   * Evaluates if user has read access to a specific class.
   */
  public async canAccessClass(user: User, classId: string): Promise<AuthorizationResult> {
    const cls = educationStore.getClass(classId);
    if (!cls) {
      return { allowed: false, statusCode: 404, reason: `Class '${classId}' not found.` };
    }

    // Leadership / Admin have oversight across institution classes
    if (user.role === 'principal' || user.role === 'admin' || user.role === 'commander') {
      return { allowed: true };
    }

    // Teacher can access assigned classes
    if (user.role === 'teacher') {
      const assignedTeacherId = cls.instructorId || (cls as any).teacherId;
      if (assignedTeacherId === user.id) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Teacher Assignment Mismatch: Teacher '${user.id}' is not assigned to class '${classId}' (${cls.code}).`
      };
    }

    // Student can access enrolled classes
    if (user.role === 'student') {
      const isEnrolled = this.isStudentEnrolledInClass(user.id, cls);
      if (isEnrolled) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Enrollment Mismatch: Student '${user.id}' is not enrolled in class '${classId}' (${cls.code}).`
      };
    }

    // Parent can access classes enrolled by their linked children
    if (user.role === 'parent') {
      const children = await familyService.getChildrenForParent(user.id);
      const isChildEnrolled = children.some((child) => this.isStudentEnrolledInClass(child.studentId, cls));
      if (isChildEnrolled) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Family Boundary: Parent '${user.id}' has no linked children enrolled in class '${classId}'.`
      };
    }

    return { allowed: false, statusCode: 403, reason: `Unauthorized role '${user.role}' for class access.` };
  }

  /**
   * Evaluates if user has management permissions on a class (create units, lessons, assignments).
   */
  public canManageClass(user: User, classId: string): AuthorizationResult {
    const cls = educationStore.getClass(classId);
    if (!cls) {
      return { allowed: false, statusCode: 404, reason: `Class '${classId}' not found.` };
    }

    if (user.role === 'admin' || user.role === 'commander' || user.role === 'principal') {
      return { allowed: true };
    }

    if (user.role === 'teacher') {
      const assignedTeacherId = cls.instructorId || (cls as any).teacherId;
      if (assignedTeacherId === user.id) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Teacher Assignment Denied: Teacher '${user.id}' is not authorized to manage course '${cls.code}'.`
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: `Access Forbidden: User '${user.id}' with role '${user.role}' cannot modify instructional materials.`
    };
  }

  /**
   * Evaluates if user can submit work for an assignment.
   */
  public canSubmitAssignment(user: User, assignmentId: string): AuthorizationResult {
    if (user.role !== 'student') {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Role Restriction: Only students can submit coursework. Current role: '${user.role}'.`
      };
    }

    const asg = educationStore.getAssignment(assignmentId);
    if (!asg) {
      return { allowed: false, statusCode: 404, reason: `Assignment '${assignmentId}' not found.` };
    }

    const cls = educationStore.getClass(asg.classId);
    if (!cls || !this.isStudentEnrolledInClass(user.id, cls)) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `Enrollment Violation: Student '${user.id}' is not enrolled in course for assignment '${assignmentId}'.`
      };
    }

    return { allowed: true };
  }

  /**
   * Evaluates if user can view a specific submission.
   */
  public async canViewSubmission(user: User, submission: StudentSubmission): Promise<AuthorizationResult> {
    // 1. Leadership / Principal
    if (user.role === 'principal' || user.role === 'admin' || user.role === 'commander') {
      return { allowed: true };
    }

    // 2. Student: Own submissions only
    if (user.role === 'student') {
      if (submission.studentId === user.id) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Privacy Violation: Student '${user.id}' cannot view submission belonging to student '${submission.studentId}'.`
      };
    }

    // 3. Teacher: Submissions for assigned classes only
    if (user.role === 'teacher') {
      const cls = educationStore.getClass(submission.classId);
      const teacherId = cls ? (cls.instructorId || (cls as any).teacherId) : undefined;
      if (teacherId === user.id) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Instructional Boundary: Teacher '${user.id}' is not assigned to course '${submission.classId}'.`
      };
    }

    // 4. Parent: Submissions for linked children only
    if (user.role === 'parent') {
      const isLinked = await familyService.verifyParentChildAccess(user.id, submission.studentId);
      if (isLinked) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Family Boundary: Parent '${user.id}' cannot view submission for unlinked student '${submission.studentId}'.`
      };
    }

    return { allowed: false, statusCode: 403, reason: 'Unauthorized submission access.' };
  }

  /**
   * Evaluates if user can grade a specific submission.
   */
  public canGradeSubmission(user: User, submission: StudentSubmission): AuthorizationResult {
    if (user.role === 'admin' || user.role === 'commander' || user.role === 'principal') {
      return { allowed: true };
    }

    if (user.role === 'teacher') {
      const cls = educationStore.getClass(submission.classId);
      const teacherId = cls ? (cls.instructorId || (cls as any).teacherId) : undefined;
      if (teacherId === user.id) {
        return { allowed: true };
      }
      return {
        allowed: false,
        statusCode: 403,
        reason: `Grading Authority Denied: Teacher '${user.id}' is not assigned to course '${submission.classId}'.`
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: `Grading Authority Denied: User role '${user.role}' cannot grade student submissions.`
    };
  }

  /**
   * Filters complete Education sector state strictly according to user permissions and scope.
   */
  public async filterStateForUser(user: User): Promise<any> {
    const rawInstitution = educationStore.getInstitution();
    const rawClasses = educationStore.getClasses();
    const rawAssignments = educationStore.getAssignments();
    const rawSubmissions = educationStore.getSubmissions();
    const rawKnowledgeSpaces = educationStore.getKnowledgeSpaces();

    // 1. Leadership / Admin: Full institutional overview
    if (user.role === 'principal' || user.role === 'admin' || user.role === 'commander') {
      return {
        institution: rawInstitution,
        classes: rawClasses,
        assignments: rawAssignments,
        submissions: rawSubmissions,
        knowledgeSpaces: rawKnowledgeSpaces,
        timestamp: new Date().toISOString()
      };
    }

    // 2. Teacher: Scoped to assigned classes
    if (user.role === 'teacher') {
      const assignedClasses = rawClasses.filter((c) => (c.instructorId || (c as any).teacherId) === user.id);
      const assignedClassIds = new Set(assignedClasses.map((c) => c.id));
      const scopedAssignments = rawAssignments.filter((a) => assignedClassIds.has(a.classId));
      const scopedSubmissions = rawSubmissions.filter((s) => assignedClassIds.has(s.classId));

      return {
        institution: rawInstitution,
        classes: assignedClasses,
        assignments: scopedAssignments,
        submissions: scopedSubmissions,
        knowledgeSpaces: rawKnowledgeSpaces,
        timestamp: new Date().toISOString()
      };
    }

    // 3. Student: Scoped strictly to enrolled classes and own submissions
    if (user.role === 'student') {
      const enrolledClasses = rawClasses.filter((c) => this.isStudentEnrolledInClass(user.id, c));
      const enrolledClassIds = new Set(enrolledClasses.map((c) => c.id));
      const scopedAssignments = rawAssignments.filter((a) => enrolledClassIds.has(a.classId));
      const ownSubmissions = rawSubmissions.filter((s) => s.studentId === user.id);

      return {
        institution: rawInstitution,
        classes: enrolledClasses,
        assignments: scopedAssignments,
        submissions: ownSubmissions,
        knowledgeSpaces: rawKnowledgeSpaces,
        timestamp: new Date().toISOString()
      };
    }

    // 4. Parent: Scoped to linked children's enrolled classes and submissions
    if (user.role === 'parent') {
      const children = await familyService.getChildrenForParent(user.id);
      const childStudentIds = new Set(children.map((c) => c.studentId));

      const relevantClasses = rawClasses.filter((cls) =>
        children.some((c) => this.isStudentEnrolledInClass(c.studentId, cls))
      );
      const relevantClassIds = new Set(relevantClasses.map((c) => c.id));
      const scopedAssignments = rawAssignments.filter((a) => relevantClassIds.has(a.classId));
      const scopedSubmissions = rawSubmissions.filter((s) => childStudentIds.has(s.studentId));

      return {
        institution: rawInstitution,
        classes: relevantClasses,
        assignments: scopedAssignments,
        submissions: scopedSubmissions,
        knowledgeSpaces: rawKnowledgeSpaces,
        timestamp: new Date().toISOString()
      };
    }

    // Fallback for unknown role: empty scoped state
    return {
      institution: rawInstitution,
      classes: [],
      assignments: [],
      submissions: [],
      knowledgeSpaces: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper: Checks student enrollment in a class entity.
   */
  public isStudentEnrolledInClass(studentId: string, cls: EducationClass): boolean {
    if (Array.isArray(cls.studentIds) && cls.studentIds.includes(studentId)) {
      return true;
    }
    return false;
  }
}

export const educationPolicy = new EducationPolicy();
