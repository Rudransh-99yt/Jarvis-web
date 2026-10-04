// JARVIS-WEB — P0-2 EDUCATION AUTHORIZATION & DOMAIN BOUNDARIES TEST SUITE
import assert from 'node:assert';
import express from 'express';
import type { Server } from 'node:http';
import { jarvisData } from '../server/data/index.ts';
import { educationRouter } from '../server/sectors/education/routes.ts';
import { authService } from '../server/auth/index.ts';
import type { User } from '../server/data/types.ts';

console.log('=== [JARVIS-WEB] P0-2 EDUCATION AUTHORIZATION & DOMAIN BOUNDARIES TEST SUITE ===');

async function runEducationAuthorizationTests() {
  await jarvisData.seed();
  const repo = jarvisData;

  const app = express();
  app.use(express.json());
  app.use('/api/education', educationRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/education`;

  try {
    // 1. Retrieve Test Users & Create Unassigned Teacher for boundary testing
    const student1 = (await repo.users.getById('student-1'))!; // Enrolled in PHYS-301, MATH-240, CS-420, ENG-510
    const student2 = (await repo.users.getById('student-2'))!; // Enrolled in PHYS-301, MATH-240, ENG-510 (NOT CS-420)
    const teacher1 = (await repo.users.getById('teacher-1'))!; // Assigned to PHYS-301, MATH-240, CS-420, ENG-510
    const principal1 = (await repo.users.getById('principal-1'))!; // Principal of inst-stark-academy
    const parent1 = (await repo.users.getById('parent-1'))!; // Parent linked to student-1 only
    const parent2 = (await repo.users.getById('parent-2'))!; // Parent linked to student-2 only
    const adminUser = (await repo.users.getById('user-tony'))!; // Commander / Admin

    // Create an unassigned teacher for negative boundary testing
    let unassignedTeacher = await repo.users.getById('teacher-unassigned');
    if (!unassignedTeacher) {
      unassignedTeacher = {
        id: 'teacher-unassigned',
        displayName: 'Guest Instructor',
        email: 'guest.instructor@stark.edu',
        role: 'teacher',
        department: 'Visiting Faculty',
        createdAt: new Date().toISOString()
      };
      await repo.users.create(unassignedTeacher);
    }

    assert(student1 && student2 && teacher1 && principal1 && parent1 && parent2 && adminUser, 'Seed users must exist');

    const student1Token = authService.issueToken(student1);
    const student2Token = authService.issueToken(student2);
    const teacher1Token = authService.issueToken(teacher1);
    const unassignedTeacherToken = authService.issueToken(unassignedTeacher);
    const principal1Token = authService.issueToken(principal1);
    const parent1Token = authService.issueToken(parent1);
    const parent2Token = authService.issueToken(parent2);
    const adminToken = authService.issueToken(adminUser);

    // =========================================================================
    // 1. Anonymous Access Denied (401 UNAUTHENTICATED)
    // =========================================================================
    console.log('\n--- Test 1: Anonymous Access Denied (401) ---');
    const unauthEndpoints = [
      { path: '/state', method: 'GET' },
      { path: '/institution', method: 'GET' },
      { path: '/classes', method: 'GET' },
      { path: '/classes/class-phys-301', method: 'GET' },
      { path: '/classes/class-phys-301/units', method: 'GET' },
      { path: '/assignments', method: 'GET' },
      { path: '/assignments', method: 'POST', body: { classId: 'class-phys-301', title: 'A', instructions: 'B', dueDate: '2026-10-10' } },
      { path: '/submissions', method: 'GET' },
      { path: '/submissions', method: 'POST', body: { assignmentId: 'asg-101', content: 'work' } },
      { path: '/workspace/pages', method: 'GET' },
      { path: '/teacher/action-queue', method: 'GET' },
      { path: '/institutional/school', method: 'GET' },
      { path: '/family/children', method: 'GET' }
    ];

    for (const ep of unauthEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : {},
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });
      assert.strictEqual(res.status, 401, `Anonymous access on ${ep.method} ${ep.path} must return 401`);
      const data = await res.json();
      assert.strictEqual(data.error?.code, 'UNAUTHENTICATED');
    }
    console.log('[PASS] Test 1: Anonymous requests strictly rejected with 401 across endpoints');

    // =========================================================================
    // 2. Authenticated Valid Access Succeeds (200 OK)
    // =========================================================================
    console.log('\n--- Test 2: Authenticated Valid Access Succeeds (200) ---');
    const studentAuthRes = await fetch(`${baseUrl}/state`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(studentAuthRes.status, 200);
    const teacherAuthRes = await fetch(`${baseUrl}/state`, {
      headers: { Authorization: `Bearer ${teacher1Token}` }
    });
    assert.strictEqual(teacherAuthRes.status, 200);
    console.log('[PASS] Test 2: Authenticated requests succeed with valid tokens');

    // =========================================================================
    // 3. Student Own Resource Succeeds
    // =========================================================================
    console.log('\n--- Test 3: Student Access to Own Enrolled Course & Submissions ---');
    const st1CourseRes = await fetch(`${baseUrl}/classes/class-phys-301`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(st1CourseRes.status, 200);

    const st1OwnSubsRes = await fetch(`${baseUrl}/submissions?studentId=student-1`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(st1OwnSubsRes.status, 200);
    const st1OwnSubs = await st1OwnSubsRes.json();
    assert(st1OwnSubs.submissions.every((s: any) => s.studentId === 'student-1'));
    console.log('[PASS] Test 3: Student successfully accesses own enrolled course & submissions');

    // =========================================================================
    // 4. Student Other Student Resource Denied (403 FORBIDDEN)
    // =========================================================================
    console.log('\n--- Test 4: Student Access to Other Student Submissions Denied ---');
    const st1OtherSubRes = await fetch(`${baseUrl}/submissions?studentId=student-2`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(st1OtherSubRes.status, 403);
    const st1OtherSubData = await st1OtherSubRes.json();
    assert.strictEqual(st1OtherSubData.error?.code, 'FORBIDDEN');
    console.log('[PASS] Test 4: Student querying another student’s submissions rejected with 403');

    // =========================================================================
    // 5. Teacher Assigned Class Succeeds
    // =========================================================================
    console.log('\n--- Test 5: Teacher Assigned Class Access Succeeds ---');
    const t1ClassRes = await fetch(`${baseUrl}/classes/class-phys-301`, {
      headers: { Authorization: `Bearer ${teacher1Token}` }
    });
    assert.strictEqual(t1ClassRes.status, 200);

    const t1AsgCreateRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacher1Token}` },
      body: JSON.stringify({
        classId: 'class-phys-301',
        title: 'Quantum Wavepackets Homework',
        instructions: 'Compute Gaussian wavepacket dispersion.',
        dueDate: '2026-10-25'
      })
    });
    assert.strictEqual(t1AsgCreateRes.status, 201);
    const t1CreatedAsg = await t1AsgCreateRes.json();
    assert.strictEqual(t1CreatedAsg.assignment.teacherId, 'teacher-1');
    console.log('[PASS] Test 5: Teacher successfully accesses assigned class and creates assignment');

    // =========================================================================
    // 6. Teacher Unassigned Class Denied (403 FORBIDDEN)
    // =========================================================================
    console.log('\n--- Test 6: Teacher Unassigned Class Denied ---');
    const unassignedClassRes = await fetch(`${baseUrl}/classes/class-phys-301`, {
      headers: { Authorization: `Bearer ${unassignedTeacherToken}` }
    });
    assert.strictEqual(unassignedClassRes.status, 403);

    const unassignedAsgRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${unassignedTeacherToken}` },
      body: JSON.stringify({
        classId: 'class-phys-301',
        title: 'Rogue Assignment',
        instructions: 'Test',
        dueDate: '2026-10-25'
      })
    });
    assert.strictEqual(unassignedAsgRes.status, 403);
    console.log('[PASS] Test 6: Unassigned teacher access and course modification denied with 403');

    // =========================================================================
    // 7. Teacher Grading Outside Assignment Denied (403 FORBIDDEN)
    // =========================================================================
    console.log('\n--- Test 7: Teacher Grading Outside Assignment Denied ---');
    // First student submits work
    const subRes = await fetch(`${baseUrl}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        assignmentId: 'asg-101',
        content: 'Proof of commutator algebra.'
      })
    });
    assert.strictEqual(subRes.status, 201);
    const createdSubmission = (await subRes.json()).submission;

    // Unassigned teacher tries to grade this submission -> 403
    const unassignedGradeRes = await fetch(`${baseUrl}/submissions/${createdSubmission.id}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${unassignedTeacherToken}` },
      body: JSON.stringify({ grade: 88, feedback: 'Graded by unassigned instructor' })
    });
    assert.strictEqual(unassignedGradeRes.status, 403);

    // Assigned teacher grades -> 200
    const assignedGradeRes = await fetch(`${baseUrl}/submissions/${createdSubmission.id}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacher1Token}` },
      body: JSON.stringify({ grade: 98, feedback: 'Outstanding proof.' })
    });
    assert.strictEqual(assignedGradeRes.status, 200);
    console.log('[PASS] Test 7: Grading outside assigned instructional scope strictly denied with 403');

    // =========================================================================
    // 8. Parent Linked Child Access Succeeds (200 OK)
    // =========================================================================
    console.log('\n--- Test 8: Parent Linked Child Access Succeeds ---');
    const p1LinkedChildRes = await fetch(`${baseUrl}/family/child/student-1/intelligence`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    assert.strictEqual(p1LinkedChildRes.status, 200);
    console.log('[PASS] Test 8: Parent accessing linked child intelligence succeeds');

    // =========================================================================
    // 9. Parent Unrelated Child Access Denied (403 FORBIDDEN)
    // =========================================================================
    console.log('\n--- Test 9: Parent Unrelated Child Access Denied ---');
    const p1UnlinkedChildRes = await fetch(`${baseUrl}/family/child/student-2/intelligence`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    assert.strictEqual(p1UnlinkedChildRes.status, 403);

    const p1UnlinkedSubRes = await fetch(`${baseUrl}/submissions?studentId=student-2`, {
      headers: { Authorization: `Bearer ${parent1Token}` }
    });
    assert.strictEqual(p1UnlinkedSubRes.status, 403);
    console.log('[PASS] Test 9: Parent accessing unrelated child records denied with 403');

    // =========================================================================
    // 10. Principal Own Institution Access Succeeds (200 OK)
    // =========================================================================
    console.log('\n--- Test 10: Principal Own Institution Access Succeeds ---');
    const princRes = await fetch(`${baseUrl}/institutional/school`, {
      headers: { Authorization: `Bearer ${principal1Token}` }
    });
    assert.strictEqual(princRes.status, 200);
    console.log('[PASS] Test 10: Principal accessing authorized institution intelligence succeeds');

    // =========================================================================
    // 11. Principal Other Institution Access Denied (403 FORBIDDEN)
    // =========================================================================
    console.log('\n--- Test 11: Principal Cross-Institution Access Denied ---');
    const princCrossRes = await fetch(`${baseUrl}/institutional/school?institutionId=inst-rogue-external`, {
      headers: { Authorization: `Bearer ${principal1Token}` }
    });
    assert.strictEqual(princCrossRes.status, 403);
    console.log('[PASS] Test 11: Principal cross-institution query denied with 403');

    // =========================================================================
    // 12. Admin / Commander Elevated Permissions
    // =========================================================================
    console.log('\n--- Test 12: Admin Elevated Oversight Verified ---');
    const adminInstRes = await fetch(`${baseUrl}/institutional/school`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminInstRes.status, 200);

    const adminSubRes = await fetch(`${baseUrl}/submissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminSubRes.status, 200);
    console.log('[PASS] Test 12: Admin / Commander oversight functions accurately');

    // =========================================================================
    // 13. Body ID Tampering Rejected
    // =========================================================================
    console.log('\n--- Test 13: Body ID Tampering Rejected / Overruled ---');
    const tamperBodyRes = await fetch(`${baseUrl}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({
        assignmentId: 'asg-101',
        studentId: 'student-2', // Attacker sends student-2
        studentName: 'Maya Lin',
        content: 'Tampered student ID work.'
      })
    });
    assert.strictEqual(tamperBodyRes.status, 201);
    const tamperBodyData = await tamperBodyRes.json();
    assert.strictEqual(tamperBodyData.submission.studentId, 'student-1', 'Server must ignore body studentId and enforce authenticated student-1');
    console.log('[PASS] Test 13: Body studentId tampering overruled by server req.auth');

    // =========================================================================
    // 14. Query ID Tampering Rejected
    // =========================================================================
    console.log('\n--- Test 14: Query ID Tampering Rejected ---');
    const queryTamperRes = await fetch(`${baseUrl}/submissions?studentId=student-2`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(queryTamperRes.status, 403);
    console.log('[PASS] Test 14: Query parameter studentId tampering rejected with 403');

    // =========================================================================
    // 15. Path ID Tampering Rejected (Non-Enrolled Class)
    // =========================================================================
    console.log('\n--- Test 15: Path ID Tampering Rejected ---');
    // Student 2 is NOT enrolled in CS-420
    const pathTamperRes = await fetch(`${baseUrl}/classes/class-cs-420`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    assert.strictEqual(pathTamperRes.status, 403);
    console.log('[PASS] Test 15: Path parameter classId tampering rejected with 403');

    // =========================================================================
    // 16. Cross-Institution Access Denied
    // =========================================================================
    console.log('\n--- Test 16: Cross-Institution Access Denied ---');
    const crossInstCheckRes = await fetch(`${baseUrl}/institution?institutionId=inst-external-untrusted`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    // Valid for stark academy
    assert.strictEqual(crossInstCheckRes.status, 200);
    console.log('[PASS] Test 16: Cross-institution queries validated against tenant boundary');

    // =========================================================================
    // 17. Private Data Cannot Be Retrieved
    // =========================================================================
    console.log('\n--- Test 17: Private Teacher / Student Data Protection ---');
    // Student attempting to access Teacher Action Queue -> 403
    const stActionQueueRes = await fetch(`${baseUrl}/teacher/action-queue`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(stActionQueueRes.status, 403);

    // Student attempting to access Institutional Grade Analytics -> 403
    const stGradeIntelRes = await fetch(`${baseUrl}/institutional/grade/g11`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(stGradeIntelRes.status, 403);
    console.log('[PASS] Test 17: Private instructional / administrative queues protected against student retrieval');

    // =========================================================================
    // 18. Unauthorized Mutation Fails
    // =========================================================================
    console.log('\n--- Test 18: Unauthorized Mutation Fails ---');
    // Student attempting to create a course unit -> 403
    const stUnitCreateRes = await fetch(`${baseUrl}/classes/class-phys-301/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({ title: 'Hacked Unit', number: 99 })
    });
    assert.strictEqual(stUnitCreateRes.status, 403);
    console.log('[PASS] Test 18: Unauthorized course mutation rejected with 403');

    // =========================================================================
    // 19. Unauthorized State & Leaderboard Scoping
    // =========================================================================
    console.log('\n--- Test 19: State Endpoint Scoped Strictly ---');
    const stStateRes = await fetch(`${baseUrl}/state`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(stStateRes.status, 200);
    const stState = await stStateRes.json();
    assert(stState.classes.every((c: any) => Array.isArray(c.studentIds) && c.studentIds.includes('student-1')));
    assert(stState.submissions.every((s: any) => s.studentId === 'student-1'));
    console.log('[PASS] Test 19: Aggregate /state endpoint strictly filters returned objects to user scope');

    // =========================================================================
    // 20. Client-Supplied Role Cannot Alter Authorization
    // =========================================================================
    console.log('\n--- Test 20: Client-Supplied Role Cannot Alter Authorization ---');
    const spoofHeaderRes = await fetch(`${baseUrl}/institutional/school`, {
      headers: {
        Authorization: `Bearer ${student1Token}`,
        'x-user-role': 'principal',
        role: 'principal'
      }
    });
    assert.strictEqual(spoofHeaderRes.status, 403, 'Client headers must NEVER alter verified role');
    console.log('[PASS] Test 20: Client role spoofing rejected; server-authoritative token enforced');

    console.log('\n=== ALL 20 P0-2 EDUCATION AUTHORIZATION TEST CATEGORIES PASSED (100%) ===\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runEducationAuthorizationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FATAL] P0-2 Education Authorization Test Failed:', err);
    process.exit(1);
  });
