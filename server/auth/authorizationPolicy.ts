import type { AuthenticatedPrincipal } from './principal.ts';
import type { EducationClass, Assignment, StudentSubmission } from '../../src/types/education.ts';
import type { KnowledgeSpaceRecord, Workspace } from '../data/types.ts';
import type { InstitutionMembership } from '../data/types.ts';

export interface AuthorizationDecision { allowed: boolean; reason: string; }
const deny = (reason: string): AuthorizationDecision => ({ allowed: false, reason });
const allow = (): AuthorizationDecision => ({ allowed: true, reason: 'Authorized.' });
const elevated = (p: AuthenticatedPrincipal) => ['admin', 'commander', 'principal'].includes(p.role);

/** Fail-closed policy over server-resolved records. Request IDs are selectors only. */
export class AuthorizationPolicy {
  isInstitutionMember(p: AuthenticatedPrincipal | undefined, institutionId: string | undefined, memberships: InstitutionMembership[] | undefined): AuthorizationDecision {
    if (!p || !institutionId || !memberships) return deny('Missing principal, institution, or membership evidence.');
    return memberships.some((m) => m.institutionId === institutionId && m.userId === p.userId) ? allow() : deny('Institution membership required.');
  }
  canReadClass(p: AuthenticatedPrincipal | undefined, cls: EducationClass | undefined, memberships: InstitutionMembership[] | undefined): AuthorizationDecision {
    if (!p || !cls) return deny('Missing principal or canonical class.');
    if (!cls.institutionId) return deny('Class is not bound to an institution.');
    const instCheck = this.isInstitutionMember(p, cls.institutionId, memberships);
    if (!instCheck.allowed) return instCheck;
    return elevated(p) || cls.instructorId === p.userId || cls.studentIds.includes(p.userId) ? allow() : deny('Not a class member or instructor.');
  }
  canManageClass(p: AuthenticatedPrincipal | undefined, cls: EducationClass | undefined, memberships: InstitutionMembership[] | undefined): AuthorizationDecision {
    if (!p || !cls) return deny('Missing principal or canonical class.');
    if (!cls.institutionId) return deny('Class is not bound to an institution.');
    const instCheck = this.isInstitutionMember(p, cls.institutionId, memberships);
    if (!instCheck.allowed) return instCheck;
    return elevated(p) || (p.role === 'teacher' && cls.instructorId === p.userId) ? allow() : deny('Only the assigned instructor may manage this class.');
  }
  canReadAssignment(p: AuthenticatedPrincipal | undefined, assignment: Assignment | undefined, cls: EducationClass | undefined, memberships: InstitutionMembership[] | undefined): AuthorizationDecision { return this.canReadClass(p, cls, memberships); }
  canManageAssignment(p: AuthenticatedPrincipal | undefined, assignment: Assignment | undefined, cls: EducationClass | undefined, memberships: InstitutionMembership[] | undefined): AuthorizationDecision {
    if (!assignment || !p || !cls) return deny('Missing principal, assignment, or class.');
    const classCheck = this.canManageClass(p, cls, memberships);
    if (!classCheck.allowed) return classCheck;
    return elevated(p) || (p.role === 'teacher' && assignment.teacherId === p.userId && cls.instructorId === p.userId) ? allow() : deny('Only the assigned instructor may manage this assignment.');
  }
  canReadSubmission(p: AuthenticatedPrincipal | undefined, submission: StudentSubmission | undefined, cls: EducationClass | undefined, memberships: InstitutionMembership[] | undefined): AuthorizationDecision {
    if (!p || !submission || !cls) return deny('Missing principal, submission, or class.');
    if (!cls.institutionId) return deny('Class is not bound to an institution.');
    const instCheck = this.isInstitutionMember(p, cls.institutionId, memberships);
    if (!instCheck.allowed) return instCheck;
    return elevated(p) || submission.studentId === p.userId || cls.instructorId === p.userId ? allow() : deny('Submission is private to its student and instructor.');
  }
  canWriteSubmission(p: AuthenticatedPrincipal | undefined, cls: EducationClass | undefined, memberships: InstitutionMembership[] | undefined): AuthorizationDecision {
    if (!p || !cls) return deny('Missing principal or class.');
    if (!cls.institutionId) return deny('Class is not bound to an institution.');
    const instCheck = this.isInstitutionMember(p, cls.institutionId, memberships);
    if (!instCheck.allowed) return instCheck;
    return p.role === 'student' && cls.studentIds.includes(p.userId) ? allow() : deny('Only an enrolled student may submit work.');
  }
  canAccessWorkspace(p: AuthenticatedPrincipal | undefined, workspace: Workspace | undefined, member: boolean): AuthorizationDecision {
    if (!p || !workspace) return deny('Missing principal or workspace.');
    return member || elevated(p) ? allow() : deny('Workspace membership required.');
  }
  canReadKnowledge(p: AuthenticatedPrincipal | undefined, space: KnowledgeSpaceRecord | undefined, member: boolean, cls?: EducationClass, memberships?: InstitutionMembership[]): AuthorizationDecision {
    if (!p || !space || !member) return deny('Verified workspace membership required.');
    return !cls || this.canReadClass(p, cls, memberships).allowed ? allow() : deny('Class membership required for this knowledge space.');
  }
  canMutateKnowledge(p: AuthenticatedPrincipal | undefined, space: KnowledgeSpaceRecord | undefined, member: boolean, cls?: EducationClass, memberships?: InstitutionMembership[]): AuthorizationDecision {
    if (!p || !space || !member) return deny('Verified workspace membership required.');
    if (elevated(p) || space.ownerId === p.userId) return allow();
    return cls ? this.canManageClass(p, cls, memberships) : deny('Knowledge-space owner permission required.');
  }
}
export const authorizationPolicy = new AuthorizationPolicy();
