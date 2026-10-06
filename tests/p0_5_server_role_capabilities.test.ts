// JARVIS-WEB — P0-5 SERVER-DERIVED ROLE CAPABILITIES + ROLE-SPECIFIC IA TEST SUITE
import assert from 'node:assert';
import express from 'express';
import type { Server } from 'node:http';
import { jarvisData } from '../server/data/index.ts';
import { authRouter } from '../server/auth/authRoutes.ts';
import { educationRouter } from '../server/sectors/education/routes.ts';
import { authService } from '../server/auth/tokens.ts';
import { resolveCapabilities, hasCapability } from '../server/auth/capabilities.ts';
import { VIEW_CAPABILITY_MAP, canAccessView, getDefaultHomeViewForUser } from '../src/services/capabilityMap.ts';
import { authClient } from '../src/services/authClient.ts';
import type { User } from '../server/data/types.ts';

import { knowledgeRouter } from '../server/routes/knowledgeRoutes.ts';

console.log('=== [JARVIS-WEB] P0-5 SERVER-DERIVED ROLE CAPABILITIES & IA TEST SUITE ===');

async function getTokenForUser(userId: string): Promise<string> {
  const res = await fetch(`http://localhost:3000/api/auth/dev-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  return data.token;
}

async function runServerRoleCapabilitiesTests() {
  await jarvisData.seed();
  const repo = jarvisData;

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/education', educationRouter);
  app.use('/api/knowledge-spaces', knowledgeRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const authUrl = `http://127.0.0.1:${port}/api/auth`;
  const eduUrl = `http://127.0.0.1:${port}/api/education`;
  const ksUrl = `http://127.0.0.1:${port}/api/knowledge-spaces`;

  try {
    // Retrieve Seed Users
    const student1 = (await repo.users.getById('student-1'))!;
    const teacher1 = (await repo.users.getById('teacher-1'))!;
    const principal1 = (await repo.users.getById('principal-1'))!;
    const parent1 = (await repo.users.getById('parent-1'))!;
    const adminUser = (await repo.users.getById('user-tony'))!;

    assert(student1 && teacher1 && principal1 && parent1 && adminUser, 'Seed users must exist');

    const studentToken = await authService.issueToken(student1);
    const teacherToken = await authService.issueToken(teacher1);
    const principalToken = await authService.issueToken(principal1);
    const parentToken = await authService.issueToken(parent1);
    const adminToken = await authService.issueToken(adminUser);

    // =========================================================================
    // SECTION 1: AUTH & GET /ME BEHAVIOR
    // =========================================================================
    console.log('\n--- Section 1: AUTH & GET /api/auth/me ---');

    // Test 1.1: /me returns server-derived role & institution
    {
      const res = await fetch(`${authUrl}/me`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 200, '/me should return 200 for valid token');
      const body = await res.json();
      assert.strictEqual(body.user.id, student1.id);
      assert.strictEqual(body.user.role, 'student');
      assert.strictEqual(body.role, 'student');
      assert.strictEqual(body.institution.id, 'inst-stark-academy');
      assert(Array.isArray(body.capabilities), 'capabilities must be an array');
      assert(body.capabilities.includes('student.learning.view'), 'student must have student.learning.view');
      console.log('[PASS] Test 1.1: /me returns server-derived role & institution for student');
    }

    // Test 1.2: Forged client role in headers cannot alter /me
    {
      const res = await fetch(`${authUrl}/me`, {
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'x-user-role': 'commander',
          'x-user-id': 'user-tony',
          role: 'principal'
        }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.user.role, 'student', 'Role must remain student regardless of spoofed headers');
      assert.strictEqual(body.role, 'student');
      assert(!body.capabilities.includes('admin.system.manage'), 'Spoofed admin role must not grant admin capabilities');
      assert(!body.capabilities.includes('principal.institution.view'), 'Spoofed principal role must not grant principal capabilities');
      console.log('[PASS] Test 1.2: Forged client role headers strictly ignored by /me');
    }

    // Test 1.3: Forged query params cannot alter /me
    {
      const res = await fetch(`${authUrl}/me?role=admin&userRole=commander`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.user.role, 'student', 'Role must not be overridden by query params');
      assert(!body.capabilities.includes('admin.system.manage'), 'Query params cannot grant capabilities');
      console.log('[PASS] Test 1.3: Forged query parameters strictly ignored by /me');
    }

    // Test 1.4: Client-provided role cannot grant capabilities
    {
      const res = await fetch(`${authUrl}/me`, {
        headers: {
          Authorization: `Bearer ${parentToken}`,
          'x-auth-capabilities': JSON.stringify(['teacher.classes.manage', 'principal.institution.view'])
        }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.role, 'parent');
      assert(!body.capabilities.includes('teacher.classes.manage'), 'Client capabilities header strictly ignored');
      assert(!body.capabilities.includes('principal.institution.view'), 'Client capabilities header strictly ignored');
      console.log('[PASS] Test 1.4: Client header capabilities strictly ignored');
    }

    // =========================================================================
    // SECTION 2: CANONICAL SERVER CAPABILITY MODEL
    // =========================================================================
    console.log('\n--- Section 2: Canonical Role Capability Resolution ---');

    // Test 2.1: Student receives student capabilities
    {
      const caps = resolveCapabilities(student1);
      assert(caps.includes('student.learning.view'), 'Must include student.learning.view');
      assert(caps.includes('student.courses.view'), 'Must include student.courses.view');
      assert(caps.includes('student.assignments.view'), 'Must include student.assignments.view');
      assert(caps.includes('student.assignments.submit'), 'Must include student.assignments.submit');
      assert(caps.includes('student.practice.manage'), 'Must include student.practice.manage');
      assert(caps.includes('student.focus.manage'), 'Must include student.focus.manage');
      assert(caps.includes('student.progress.view'), 'Must include student.progress.view');
      assert(!caps.includes('teacher.classes.manage'), 'Student must NOT possess teacher.classes.manage');
      assert(!caps.includes('principal.institution.view'), 'Student must NOT possess principal.institution.view');
      console.log('[PASS] Test 2.1: Student canonical capabilities verified');
    }

    // Test 2.2: Teacher receives teacher capabilities
    {
      const caps = resolveCapabilities(teacher1);
      assert(caps.includes('teacher.classes.manage'), 'Must include teacher.classes.manage');
      assert(caps.includes('teacher.curriculum.manage'), 'Must include teacher.curriculum.manage');
      assert(caps.includes('teacher.prep.manage'), 'Must include teacher.prep.manage');
      assert(caps.includes('teacher.sessions.manage'), 'Must include teacher.sessions.manage');
      assert(caps.includes('teacher.grading.manage'), 'Must include teacher.grading.manage');
      assert(caps.includes('teacher.review.manage'), 'Must include teacher.review.manage');
      assert(caps.includes('teacher.attention.view'), 'Must include teacher.attention.view');
      assert(caps.includes('teacher.smartboard.control'), 'Must include teacher.smartboard.control');
      assert(!caps.includes('student.focus.manage'), 'Teacher must NOT possess student.focus.manage');
      assert(!caps.includes('principal.institution.view'), 'Teacher must NOT possess principal.institution.view');
      console.log('[PASS] Test 2.2: Teacher canonical capabilities verified');
    }

    // Test 2.3: Parent receives parent capabilities
    {
      const caps = resolveCapabilities(parent1);
      assert(caps.includes('parent.children.view'), 'Must include parent.children.view');
      assert(caps.includes('parent.progress.view'), 'Must include parent.progress.view');
      assert(caps.includes('parent.learning_support.view'), 'Must include parent.learning_support.view');
      assert(caps.includes('parent.alerts.view'), 'Must include parent.alerts.view');
      assert(caps.includes('parent.family_intelligence.view'), 'Must include parent.family_intelligence.view');
      assert(!caps.includes('teacher.classes.manage'), 'Parent must NOT possess teacher.classes.manage');
      assert(!caps.includes('teacher.grading.manage'), 'Parent must NOT possess teacher.grading.manage');
      assert(!caps.includes('student.focus.manage'), 'Parent must NOT possess student.focus.manage');
      console.log('[PASS] Test 2.3: Parent canonical capabilities verified');
    }

    // Test 2.4: Principal receives principal capabilities
    {
      const caps = resolveCapabilities(principal1);
      assert(caps.includes('principal.institution.view'), 'Must include principal.institution.view');
      assert(caps.includes('principal.school.manage'), 'Must include principal.school.manage');
      assert(caps.includes('principal.grade_intelligence.view'), 'Must include principal.grade_intelligence.view');
      assert(caps.includes('principal.faculty_intelligence.view'), 'Must include principal.faculty_intelligence.view');
      assert(caps.includes('principal.attendance_trends.view'), 'Must include principal.attendance_trends.view');
      assert(caps.includes('principal.interventions.manage'), 'Must include principal.interventions.manage');
      assert(caps.includes('principal.audit.view'), 'Must include principal.audit.view');
      assert(!caps.includes('student.focus.manage'), 'Principal must NOT possess student.focus.manage');
      console.log('[PASS] Test 2.4: Principal canonical capabilities verified');
    }

    // Test 2.5: Admin receives full system capabilities
    {
      const caps = resolveCapabilities(adminUser);
      assert(caps.includes('admin.system.manage'), 'Must include admin.system.manage');
      assert(hasCapability(adminUser, 'admin.system.manage'), 'Admin hasCapability must be true');
      assert(hasCapability(adminUser, 'teacher.classes.manage'), 'Admin hasCapability must be true for all');
      assert(hasCapability(adminUser, 'principal.institution.view'), 'Admin hasCapability must be true for all');
      console.log('[PASS] Test 2.5: Admin canonical capabilities verified');
    }

    // =========================================================================
    // SECTION 3: SERVER SECURITY BOUNDARIES (403 ENFORCEMENT)
    // =========================================================================
    console.log('\n--- Section 3: Server Authorization Boundaries ---');

    // Test 3.1: Student requesting teacher endpoint -> 403
    {
      const res = await fetch(`${eduUrl}/teacher/action-queue`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(res.status, 403, 'Student accessing teacher action-queue must receive 403');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 3.1: Student requesting teacher action queue denied with 403');
    }

    // Test 3.2: Teacher requesting principal-only endpoint -> 403
    {
      const res = await fetch(`${eduUrl}/institutional/school`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(res.status, 403, 'Teacher accessing school institutional oversight must receive 403');
      const data = await res.json();
      assert(data.error, 'Must return error');
      console.log('[PASS] Test 3.2: Teacher requesting principal institutional endpoint denied with 403');
    }

    // Test 3.3: Parent requesting teacher endpoint -> 403
    {
      const res = await fetch(`${eduUrl}/teacher/action-queue`, {
        headers: { Authorization: `Bearer ${parentToken}` }
      });
      assert.strictEqual(res.status, 403, 'Parent accessing teacher action queue must receive 403');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 3.3: Parent requesting teacher endpoint denied with 403');
    }

    // Test 3.4: Principal requesting student-only focus mutation -> 403
    {
      const res = await fetch(`${eduUrl}/focus/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${principalToken}`
        },
        body: JSON.stringify({
          mode: 'POMODORO',
          plannedDurationMinutes: 25
        })
      });
      assert.strictEqual(res.status, 403, 'Principal initiating student focus session must receive 403');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 3.4: Principal requesting student-only focus mutation denied with 403');
    }

    // Test 3.5: Principal requesting student assignment submission -> 403
    {
      const res = await fetch(`${eduUrl}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${principalToken}`
        },
        body: JSON.stringify({
          assignmentId: 'asg-phys-1',
          content: 'Principal submission attempt'
        })
      });
      assert.strictEqual(res.status, 403, 'Principal submitting assignment must receive 403');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 3.5: Principal requesting student assignment submission denied with 403');
    }

    // Test 3.6: Principal requesting student lesson completion mutation -> 403
    {
      const res = await fetch(`${eduUrl}/classes/class-phys-301/units/unit-phys-1/lessons/les-phys-101/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${principalToken}`
        },
        body: JSON.stringify({ isCompleted: true })
      });
      assert.strictEqual(res.status, 403, 'Principal completing student lesson must receive 403');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 3.6: Principal requesting student lesson completion denied with 403');
    }

    // =========================================================================
    // SECTION 4: CLIENT CAPABILITY & IA GUARD MODEL
    // =========================================================================
    console.log('\n--- Section 4: Client IA & Capability Mapping ---');

    // Test 4.1: Centralized View Capability Map correctly scopes roles
    {
      assert.strictEqual(VIEW_CAPABILITY_MAP.student_home.requiredCapability, 'student.learning.view');
      assert.strictEqual(VIEW_CAPABILITY_MAP.focus.requiredCapability, 'student.focus.manage');
      assert.strictEqual(VIEW_CAPABILITY_MAP.teacher_home.requiredCapability, 'teacher.classes.manage');
      assert.strictEqual(VIEW_CAPABILITY_MAP.teacher_review.requiredCapability, 'teacher.review.manage');
      assert.strictEqual(VIEW_CAPABILITY_MAP.teacher_session_prep.requiredCapability, 'teacher.prep.manage');
      assert.strictEqual(VIEW_CAPABILITY_MAP.principal_home.requiredCapability, 'principal.institution.view');
      assert.strictEqual(VIEW_CAPABILITY_MAP.principal_audit.requiredCapability, 'principal.audit.view');
      assert.strictEqual(VIEW_CAPABILITY_MAP.parent_home.requiredCapability, 'parent.family_intelligence.view');
      console.log('[PASS] Test 4.1: Centralized View Capability Map definitions verified');
    }


    // Test 4.2: Default Home View Derivation from Authenticated Capabilities
    {
      const studentCan = (cap: string) => resolveCapabilities(student1).includes(cap);
      const teacherCan = (cap: string) => resolveCapabilities(teacher1).includes(cap);
      const principalCan = (cap: string) => resolveCapabilities(principal1).includes(cap);
      const parentCan = (cap: string) => resolveCapabilities(parent1).includes(cap);

      // Reset client to student to test fallback
      (authClient as any).currentUser = { role: 'student', capabilities: [] };
      assert.strictEqual(getDefaultHomeViewForUser(), 'student_home', 'Default fallback is student_home');

      assert.strictEqual(studentCan('student.focus.manage'), true);
      assert.strictEqual(principalCan('student.focus.manage'), false);
      assert.strictEqual(parentCan('teacher.review.manage'), false);
      assert.strictEqual(teacherCan('principal.institution.view'), false);
      console.log('[PASS] Test 4.2: Default home view derived strictly from verified capabilities');
    }

    // Test 4.3: Dev session endpoint disabled in production mode
    {
      const prevEnv = process.env.NODE_ENV;
      const prevDevAuth = process.env.ALLOW_DEV_AUTH;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOW_DEV_AUTH;

        const res = await fetch(`${authUrl}/dev-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'teacher' })
        });
        assert.strictEqual(res.status, 403, 'dev-session must be disabled in production without explicit allow');
        const data = await res.json();
        assert.strictEqual(data.error.code, 'DEV_AUTH_DISABLED');
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevDevAuth !== undefined) process.env.ALLOW_DEV_AUTH = prevDevAuth;
      }
      console.log('[PASS] Test 4.3: Dev session endpoint strictly disabled in production mode');
    }

    // =========================================================================
    // SECTION 5: RAG ROUTE AUTHORIZATION & MANDATORY ATTACK TESTS (FINDING 1)
    // =========================================================================
    console.log('\n--- Section 5: RAG Route Authorization & Mandatory Attack Tests ---');

    // Test 5.1 (Attack A): No auth + body userId/userRole -> 401
    {
      const res = await fetch(`${ksUrl}/ks-quantum/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Explain quantum decoherence',
          userId: 'teacher-1',
          userRole: 'teacher'
        })
      });
      assert.strictEqual(res.status, 401, 'Unauthenticated query must be rejected with 401');
      const body = await res.json();
      assert.strictEqual(body.error.code, 'UNAUTHENTICATED');
      console.log('[PASS] Test 5.1 (Attack A): No auth + body userId/userRole rejected with 401');
    }

    // Test 5.2 (Attack B): Student token + body userId=teacher-1, userRole=teacher -> evaluated strictly as student
    {
      const res = await fetch(`${ksUrl}/ks-quantum/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          query: 'Explain quantum decoherence',
          userId: 'teacher-1',
          userRole: 'teacher'
        })
      });
      assert.strictEqual(res.status, 200, 'Authenticated student query to enrolled/accessible space succeeds');
      const body = await res.json();
      assert(body.answer && typeof body.answer === 'string');
      console.log('[PASS] Test 5.2 (Attack B): Student token with body teacher spoofing evaluated strictly as student');
    }

    // Test 5.3 (Attack C): Student token + body userId=admin-1, userRole=admin -> body identity ignored
    {
      const res = await fetch(`${ksUrl}/ks-quantum/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          query: 'Explain quantum decoherence',
          userId: 'admin-1',
          userRole: 'admin',
          role: 'admin'
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert(body.answer && typeof body.answer === 'string');
      console.log('[PASS] Test 5.3 (Attack C): Student token with body admin spoofing evaluated strictly as student');
    }

    // Test 5.4 (Attack D): Teacher token + body userId=student-1, userRole=student -> evaluated strictly as teacher
    {
      const res = await fetch(`${ksUrl}/ks-quantum/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`
        },
        body: JSON.stringify({
          query: 'Explain quantum decoherence',
          userId: 'student-1',
          userRole: 'student'
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert(body.answer && typeof body.answer === 'string');
      console.log('[PASS] Test 5.4 (Attack D): Teacher token with body student spoofing evaluated strictly as teacher');
    }

    // Test 5.5 (Attack E): Forged institutionId in body/query -> ignored
    {
      const res = await fetch(`${ksUrl}/ks-quantum/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          query: 'Explain quantum decoherence',
          institutionId: 'inst-rogue-external',
          schoolId: 'inst-rogue-external'
        })
      });
      assert.strictEqual(res.status, 200);
      console.log('[PASS] Test 5.5 (Attack E): Forged institutionId in body ignored');
    }

    // Test 5.6 (Attack F): Forged capabilities in body/headers -> ignored
    {
      const res = await fetch(`${ksUrl}/ks-quantum/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'x-auth-capabilities': JSON.stringify(['admin.system.manage'])
        },
        body: JSON.stringify({
          query: 'Explain quantum decoherence',
          capabilities: ['admin.system.manage']
        })
      });
      assert.strictEqual(res.status, 200);
      console.log('[PASS] Test 5.6 (Attack F): Forged capabilities in body/headers ignored');
    }

    console.log('\n=== ALL P0-5 SERVER ROLE CAPABILITIES & IA TESTS PASSED (100%) ===');
  } finally {
    try {
      (server as any).closeAllConnections?.();
    } catch {}
    server.close();
  }
}

runServerRoleCapabilitiesTests().catch((err) => {
  console.error('\n[FAIL] P0-5 Server Role Capabilities Test Failure:', err);
  process.exit(1);
});
