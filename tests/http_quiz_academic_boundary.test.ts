import assert from 'node:assert';
import { startHttpHarness } from './httpHarness.ts';
import { jarvisData } from '../server/data/index.ts';

console.log('=== [WEB JARVIS] HTTP QUIZ & ACADEMIC BOUNDARY TEST SUITE ===');

async function runTests() {
  const harness = await startHttpHarness();
  const { baseUrl, tokenFor } = harness;

  try {
    const student1Id = 'student-1'; // Enrolled in PHYS-301 and CS-420
    const student2Id = 'student-2'; // Enrolled in PHYS-301, NOT in CS-420
    const teacher1Id = 'teacher-1';

    const tokenStudent1 = await tokenFor(student1Id);
    const tokenStudent2 = await tokenFor(student2Id);
    const tokenTeacher1 = await tokenFor(teacher1Id);

    // 1. Anonymous GET /api/classroom/quizzes -> 401
    let res = await fetch(`${baseUrl}/api/classroom/quizzes?classId=class-phys-301`);
    assert.strictEqual(res.status, 401, 'Anonymous request to /api/classroom/quizzes must return 401');
    console.log('[PASS] 1. Anonymous request to /api/classroom/quizzes rejected with 401');

    // 2. Malformed token -> 401
    res = await fetch(`${baseUrl}/api/classroom/quizzes?classId=class-phys-301`, {
      headers: { Authorization: 'Bearer invalid.token.signature' }
    });
    assert.strictEqual(res.status, 401, 'Malformed token must return 401');
    console.log('[PASS] 2. Malformed Bearer token rejected with 401');

    // 3. Raw user ID as Bearer token -> 401
    res = await fetch(`${baseUrl}/api/classroom/quizzes?classId=class-phys-301`, {
      headers: { Authorization: 'Bearer student-1' }
    });
    assert.strictEqual(res.status, 401, 'Raw user ID as Bearer token must return 401');
    console.log('[PASS] 3. Raw user ID as Bearer token rejected with 401');

    // 4. Student-1 enrolled in PHYS-301 listing quizzes -> 200
    res = await fetch(`${baseUrl}/api/classroom/quizzes?classId=class-phys-301`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` }
    });
    assert.strictEqual(res.status, 200, 'Enrolled student-1 accessing PHYS-301 quizzes must return 200');
    console.log('[PASS] 4. Enrolled student-1 listing PHYS-301 quizzes returns 200');

    // 5. Unmapped class without institutionId (class-cs-420) fails closed -> 403
    res = await fetch(`${baseUrl}/api/classroom/quizzes?classId=class-cs-420`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` }
    });
    assert.strictEqual(res.status, 403, 'Unmapped class-cs-420 without institutionId must fail closed with 403');
    console.log('[PASS] 5. Unmapped class-cs-420 without institutionId rejected with 403');

    // 6. Teacher-1 assigned to PHYS-301 listing quizzes -> 200
    res = await fetch(`${baseUrl}/api/classroom/quizzes?classId=class-phys-301`, {
      headers: { Authorization: `Bearer ${tokenTeacher1}` }
    });
    assert.strictEqual(res.status, 200, 'Assigned teacher-1 accessing PHYS-301 quizzes must return 200');
    console.log('[PASS] 6. Assigned teacher-1 listing PHYS-301 quizzes returns 200');

    // 7. Academic Context without auth -> 401
    res = await fetch(`${baseUrl}/api/education/integration/context?id=session-phys-101`);
    assert.strictEqual(res.status, 401, 'Anonymous request to academic context must return 401');
    console.log('[PASS] 7. Anonymous academic context request rejected with 401');

    // 8. Academic Events with forged actorId spoofing another user -> 403
    res = await fetch(`${baseUrl}/api/education/integration/events?actorId=student-2`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` }
    });
    assert.strictEqual(res.status, 403, 'Spoofing another actorId in academic events must return 403');
    console.log('[PASS] 8. Academic events with forged actorId spoof rejected with 403');

    // 9. Academic Events with legitimate token -> 200
    res = await fetch(`${baseUrl}/api/education/integration/events`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` }
    });
    assert.strictEqual(res.status, 200, 'Legitimate student retrieving academic events must return 200');
    console.log('[PASS] 9. Legitimate student retrieving academic events returns 200');

    // 10. Student attempting to create official curriculum link -> 403
    res = await fetch(`${baseUrl}/api/education/integration/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent1}`
      },
      body: JSON.stringify({
        workspaceId: 'ws-stark-core',
        sourceType: 'classSession',
        sourceId: 'session-1',
        targetType: 'document',
        targetId: 'doc-1',
        relation: 'curriculum',
        title: 'Unauthorized curriculum link'
      })
    });
    assert.strictEqual(res.status, 403, 'Student creating official curriculum link must return 403');
    console.log('[PASS] 10. Student creating official curriculum link rejected with 403');

    console.log('\n=== ALL HTTP QUIZ & ACADEMIC BOUNDARY TESTS PASSED (100%) ===\n');
  } finally {
    await harness.close();
  }
}

runTests().catch((err) => {
  console.error('[FATAL] HTTP Quiz & Academic Boundary Test Failed:', err);
  process.exit(1);
});
