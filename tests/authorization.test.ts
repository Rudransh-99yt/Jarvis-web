import assert from 'node:assert';
import { authorizationPolicy } from '../server/auth/authorizationPolicy.ts';
import type { AuthenticatedPrincipal } from '../server/auth/principal.ts';
import type { EducationClass } from '../src/types/education.ts';
import type { InstitutionMembership } from '../server/data/types.ts';

console.log('=== [WEB JARVIS] AUTHORIZATION BOUNDARY TEST SUITE ===');

// --- PHASE 3: SECURITY TEST FIXTURES ---

// Institution A
const instA = 'inst-A';
const studentA: AuthenticatedPrincipal = { userId: 'student-A', role: 'student' };
const studentB: AuthenticatedPrincipal = { userId: 'student-B', role: 'student' };
const teacherA: AuthenticatedPrincipal = { userId: 'teacher-A', role: 'teacher' };
const principalA: AuthenticatedPrincipal = { userId: 'principal-A', role: 'principal' };

const classA: EducationClass = {
  id: 'class-A',
  institutionId: instA,
  code: 'CLS-A',
  name: 'Institution A Class',
  description: 'Test class A',
  instructorId: 'teacher-A',
  instructorName: 'Teacher A',
  term: 'Fall',
  schedule: 'Mon',
  room: 'Room A',
  studentIds: ['student-A', 'student-B'],
  studentCount: 2,
  materialsCount: 0,
  assignmentsCount: 0,
  announcements: [],
  materials: []
};

// Institution B
const instB = 'inst-B';
const studentC: AuthenticatedPrincipal = { userId: 'student-C', role: 'student' };
const teacherC: AuthenticatedPrincipal = { userId: 'teacher-C', role: 'teacher' };

const classB: EducationClass = {
  id: 'class-B',
  institutionId: instB,
  code: 'CLS-B',
  name: 'Institution B Class',
  description: 'Test class B',
  instructorId: 'teacher-C',
  instructorName: 'Teacher C',
  term: 'Fall',
  schedule: 'Tue',
  room: 'Room B',
  studentIds: ['student-C'],
  studentCount: 1,
  materialsCount: 0,
  assignmentsCount: 0,
  announcements: [],
  materials: []
};

// Memberships (Server-resolved explicitly)
const memberships: InstitutionMembership[] = [
  { id: 'mem-1', institutionId: instA, userId: 'student-A', role: 'student', joinedAt: '2026-01-01' },
  { id: 'mem-2', institutionId: instA, userId: 'student-B', role: 'student', joinedAt: '2026-01-01' },
  { id: 'mem-3', institutionId: instA, userId: 'teacher-A', role: 'teacher', joinedAt: '2026-01-01' },
  { id: 'mem-4', institutionId: instA, userId: 'principal-A', role: 'principal', joinedAt: '2026-01-01' },
  { id: 'mem-5', institutionId: instB, userId: 'student-C', role: 'student', joinedAt: '2026-01-01' },
  { id: 'mem-6', institutionId: instB, userId: 'teacher-C', role: 'teacher', joinedAt: '2026-01-01' }
];

import { authService } from '../server/auth/tokens.ts';
async function runAuthorizationTests() {
  // PHASE 5: TESTS
  
  // student A -> Institution A class = allowed where policy permits
  assert(authorizationPolicy.canReadClass(studentA, classA, memberships).allowed, 'Student A should read Class A');
  assert(authorizationPolicy.canWriteSubmission(studentA, classA, memberships).allowed, 'Student A should write submission to Class A');

  // student A -> Institution B class = denied
  assert(!authorizationPolicy.canReadClass(studentA, classB, memberships).allowed, 'Student A should NOT read Class B');
  assert(!authorizationPolicy.canWriteSubmission(studentA, classB, memberships).allowed, 'Student A should NOT write submission to Class B');

  // teacher A -> Institution A class = allowed where assigned
  assert(authorizationPolicy.canReadClass(teacherA, classA, memberships).allowed, 'Teacher A should read Class A');
  assert(authorizationPolicy.canManageClass(teacherA, classA, memberships).allowed, 'Teacher A should manage Class A');

  // teacher A -> Institution B class = denied
  assert(!authorizationPolicy.canReadClass(teacherA, classB, memberships).allowed, 'Teacher A should NOT read Class B');
  assert(!authorizationPolicy.canManageClass(teacherA, classB, memberships).allowed, 'Teacher A should NOT manage Class B');

  // student C -> Institution B class = allowed where enrolled
  assert(authorizationPolicy.canReadClass(studentC, classB, memberships).allowed, 'Student C should read Class B');
  
  // student C -> Institution A class = denied
  assert(!authorizationPolicy.canReadClass(studentC, classA, memberships).allowed, 'Student C should NOT read Class A');

  // principal A -> Institution A = allowed according to policy
  assert(authorizationPolicy.canReadClass(principalA, classA, memberships).allowed, 'Principal A should read Class A (elevated)');

  // principal A -> Institution B = denied
  assert(!authorizationPolicy.canReadClass(principalA, classB, memberships).allowed, 'Principal A should NOT read Class B');

  // Also test: missing class institution
  const classNoInst: EducationClass = { ...classA, id: 'class-no-inst', institutionId: undefined };
  assert(!authorizationPolicy.canReadClass(studentA, classNoInst, memberships).allowed, 'Should deny missing class institution');

  // missing institution membership
  const invalidStudent: AuthenticatedPrincipal = { userId: 'student-invalid', role: 'student' };
  assert(!authorizationPolicy.canReadClass(invalidStudent, classA, memberships).allowed, 'Should deny missing membership');

  // role without membership
  const invalidPrincipal: AuthenticatedPrincipal = { userId: 'principal-invalid', role: 'principal' };
  assert(!authorizationPolicy.canReadClass(invalidPrincipal, classA, memberships).allowed, 'Should deny role without membership');

  // forged request identity (not in class, but has membership)
  const studentB_notInA = { ...studentB, userId: 'student-A-forged' };
  assert(!authorizationPolicy.canReadClass(studentB_notInA, classA, memberships).allowed, 'Should deny forged identity');

  console.log('[TEST] All Phase 5 authorization boundary tests PASSED.');
}

runAuthorizationTests().catch((err) => {
  console.error('[ERROR] Tests failed:', err);
  process.exit(1);
});
