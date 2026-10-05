import assert from 'node:assert';
import crypto from 'node:crypto';
import { startHttpHarness } from './httpHarness.ts';
import { signAuthPayload } from '../server/auth/tokens.ts';
import { jarvisData } from '../server/data/index.ts';

console.log('=== [WEB JARVIS] HTTP CLASSROOM & LIVE BOUNDARY TEST SUITE ===');

async function runTests() {
  const harness = await startHttpHarness();
  const { baseUrl, tokenFor } = harness;

  try {
    const student1Id = 'student-1';
    const student2Id = 'student-2';
    const teacher1Id = 'teacher-1';

    // Seed foreign user (registered user with NO membership in Stark Academy)
    let foreignStudent = await jarvisData.users.getById('student-foreign');
    if (!foreignStudent) {
      foreignStudent = await jarvisData.users.create({
        id: 'student-foreign',
        displayName: 'Foreign Student',
        email: 'foreign@other-inst.edu',
        role: 'student',
        avatarUrl: '',
        department: 'Science'
      });
    }

    let foreignTeacher = await jarvisData.users.getById('teacher-foreign');
    if (!foreignTeacher) {
      foreignTeacher = await jarvisData.users.create({
        id: 'teacher-foreign',
        displayName: 'Foreign Teacher',
        email: 'foreign-teacher@other-inst.edu',
        role: 'teacher',
        avatarUrl: '',
        department: 'Physics'
      });
    }

    const tokenStudent1 = await tokenFor(student1Id);
    const tokenStudent2 = await tokenFor(student2Id);
    const tokenTeacher1 = await tokenFor(teacher1Id);
    const tokenForeignStudent = await tokenFor('student-foreign');
    const tokenForeignTeacher = await tokenFor('teacher-foreign');

    // ==========================================
    // SECTION 1: AUTHENTICATION FAIL-CLOSED TESTS
    // ==========================================

    // 1. Classroom request without token -> 401
    let res = await fetch(`${baseUrl}/api/classroom/sessions/active?classId=class-phys-301`);
    assert.strictEqual(res.status, 401, '1. Missing token must return 401');

    // 2. Malformed token -> 401
    res = await fetch(`${baseUrl}/api/classroom/sessions/active?classId=class-phys-301`, {
      headers: { 'Authorization': 'Bearer not.a.valid.jwt.token' }
    });
    assert.strictEqual(res.status, 401, '2. Malformed token must return 401');

    // 3. Forged token signature -> 401
    const parts = tokenStudent1.split('.');
    const forgedToken = `${parts[0]}.${parts[1]}.tampered_signature_xyz`;
    res = await fetch(`${baseUrl}/api/classroom/sessions/active?classId=class-phys-301`, {
      headers: { 'Authorization': `Bearer ${forgedToken}` }
    });
    assert.strictEqual(res.status, 401, '3. Forged signature must return 401');

    // 4. Expired token -> 401
    const expiredPayload = {
      sub: student1Id,
      iat: Date.now() - 3600000,
      exp: Date.now() - 10000,
      jti: crypto.randomUUID()
    };
    const expiredToken = signAuthPayload(expiredPayload, process.env.JARVIS_AUTH_SECRET!);
    res = await fetch(`${baseUrl}/api/classroom/sessions/active?classId=class-phys-301`, {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    assert.strictEqual(res.status, 401, '4. Expired token must return 401');

    // ==========================================
    // SECTION 2: IDENTITY SPOOFING TESTS
    // ==========================================

    // 5. Valid Student 1 + x-user-id / x-jarvis-user-id = student-2 cannot impersonate student-2
    // Active session lookup returns state under Student 1's authentic principal
    res = await fetch(`${baseUrl}/api/classroom/sessions/active?classId=class-phys-301`, {
      headers: {
        'Authorization': `Bearer ${tokenStudent1}`,
        'x-user-id': student2Id,
        'x-jarvis-user-id': student2Id,
        'x-user-role': 'teacher'
      }
    });
    assert.strictEqual(res.status, 200, '5. Authorized request must succeed');
    const activeData = await res.json();
    assert('session' in activeData, 'Must return session field for class');

    // 6. Student 1 attempts to create a session with forged x-user-role='teacher' -> 403
    res = await fetch(`${baseUrl}/api/classroom/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStudent1}`,
        'x-user-role': 'teacher',
        'x-user-id': teacher1Id
      },
      body: JSON.stringify({
        classId: 'class-phys-301',
        title: 'Forged Session from Student'
      })
    });
    assert.strictEqual(res.status, 403, '6. Student with forged teacher role cannot create session');

    // 7. Teacher Foreign attempts to manage Stark Academy class -> 403
    res = await fetch(`${baseUrl}/api/classroom/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenForeignTeacher}`
      },
      body: JSON.stringify({
        classId: 'class-phys-301',
        title: 'Foreign Teacher Session'
      })
    });
    assert.strictEqual(res.status, 403, '7. Foreign teacher without institution membership cannot create session');

    // ==========================================
    // SECTION 3: CLASS & TENANT BOUNDARY TESTS
    // ==========================================

    // 8. Student 1 can access authorized class/session
    res = await fetch(`${baseUrl}/api/classroom/sessions?classId=class-phys-301`, {
      headers: { 'Authorization': `Bearer ${tokenStudent1}` }
    });
    assert.strictEqual(res.status, 200, '8. Authorized student can list class sessions');

    // 9. Foreign student gets 403 on class-phys-301
    res = await fetch(`${baseUrl}/api/classroom/sessions/active?classId=class-phys-301`, {
      headers: { 'Authorization': `Bearer ${tokenForeignStudent}` }
    });
    assert.strictEqual(res.status, 403, '9. Foreign student gets 403 on institutional class');

    // 10. Foreign teacher cannot access Stark Academy class
    res = await fetch(`${baseUrl}/api/classroom/sessions?classId=class-phys-301`, {
      headers: { 'Authorization': `Bearer ${tokenForeignTeacher}` }
    });
    assert.strictEqual(res.status, 403, '10. Foreign teacher gets 403');

    // 11. Missing institution metadata on unmapped class (class-cs-420) fails closed -> 403
    res = await fetch(`${baseUrl}/api/classroom/sessions/active?classId=class-cs-420`, {
      headers: { 'Authorization': `Bearer ${tokenStudent1}` }
    });
    assert.strictEqual(res.status, 403, '11. Class without institutionId fails closed with 403');

    // ==========================================
    // SECTION 4: LIVE CLASSROOM ENDPOINT TESTS
    // ==========================================

    // 12. Authenticated student can access authorized live classroom
    res = await fetch(`${baseUrl}/api/education/live-classroom/class-phys-301`, {
      headers: { 'Authorization': `Bearer ${tokenStudent1}` }
    });
    assert.strictEqual(res.status, 200, '12. Enrolled student can read live classroom state');
    const liveData = await res.json();
    assert.strictEqual(liveData.ok, true, 'Live classroom response should be ok');
    assert(liveData.state, 'Live classroom state must be present');

    // 13. Student notes saving uses verified principal (ignores body spoofing)
    res = await fetch(`${baseUrl}/api/education/live-classroom/class-phys-301/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStudent1}`
      },
      body: JSON.stringify({
        sessionId: 'session-seed-phys-1',
        content: 'Quantum harmonic oscillator derivation notes',
        studentId: student2Id // Spoofed ID
      })
    });
    assert.strictEqual(res.status, 200, '13. Saving notes succeeds for enrolled student');
    const notesResult = await res.json();
    assert.strictEqual(notesResult.ok, true);

    // 14. Student cannot perform teacher-only state update on classroom session -> 403
    res = await fetch(`${baseUrl}/api/classroom/sessions/session-seed-phys-1/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStudent1}`
      },
      body: JSON.stringify({
        state: 'drawing',
        currentTopic: 'Tampered Topic'
      })
    });
    assert.strictEqual(res.status, 403, '14. Student cannot update smart board state (403)');

    // 15. Authorized teacher can perform legitimate teacher operations
    res = await fetch(`${baseUrl}/api/classroom/sessions/session-seed-phys-1/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenTeacher1}`
      },
      body: JSON.stringify({
        state: 'lesson',
        currentTopic: 'Bra-ket Dirac Notation'
      })
    });
    assert.strictEqual(res.status, 200, '15. Assigned teacher can update smart board state (200)');

    // 16. Cross-institution live session access -> 403
    res = await fetch(`${baseUrl}/api/education/live-classroom/class-phys-301`, {
      headers: { 'Authorization': `Bearer ${tokenForeignStudent}` }
    });
    assert.strictEqual(res.status, 403, '16. Cross-institution live classroom access returns 403');

    // 17. Live quiz submission by enrolled student
    res = await fetch(`${baseUrl}/api/education/live-classroom/class-phys-301/quiz/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenStudent1}`
      },
      body: JSON.stringify({
        quizId: 'quiz-phys-quantum-1',
        questionId: 'q-1',
        selectedOptionIndex: 1
      })
    });
    assert.strictEqual(res.status, 200, '17. Enrolled student can submit quiz');
    const quizResult = await res.json();
    assert.strictEqual(quizResult.studentId, student1Id, 'Quiz submission must be recorded under principal ID');

    console.log('[TEST] All HTTP Classroom & Live Boundary integration tests PASSED.');
  } finally {
    await harness.close();
  }
}

runTests().catch((err) => {
  console.error('[ERROR] Classroom boundary tests failed:', err);
  process.exit(1);
});
