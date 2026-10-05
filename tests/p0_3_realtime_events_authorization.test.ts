// JARVIS-WEB — P0-3 REALTIME & SSE SECURITY AUTHORIZATION TEST SUITE
import assert from 'node:assert';
import express from 'express';
import type { Server } from 'node:http';
import { jarvisData } from '../server/data/index.ts';
import { communityRouter } from '../server/sectors/education/community/communityRoutes.ts';
import { communityStore } from '../server/sectors/education/community/communityStore.ts';
import { communityEventBus } from '../server/sectors/education/community/communityEventBus.ts';
import { authService } from '../server/auth/index.ts';
import type { User } from '../server/data/types.ts';

console.log('=== [JARVIS-WEB] P0-3 REALTIME & SSE SECURITY AUTHORIZATION TEST SUITE ===');

async function runRealtimeAuthorizationTests() {
  await jarvisData.seed();
  const repo = jarvisData;

  const app = express();
  app.use(express.json());
  app.use('/api/education/community', communityRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/education/community`;

  try {
    const student1 = (await repo.users.getById('student-1'))!; // Enrolled in PHYS-301, CS-420
    const student2 = (await repo.users.getById('student-2'))!; // Enrolled in PHYS-301 (NOT in CS-420)
    const teacher1 = (await repo.users.getById('teacher-1'))!; // Teacher
    const adminUser = (await repo.users.getById('user-tony'))!; // Admin / Commander

    assert(student1 && student2 && teacher1 && adminUser, 'Seed users must exist');

    const student1Token = authService.issueToken(student1);
    const student2Token = authService.issueToken(student2);
    const teacher1Token = authService.issueToken(teacher1);
    const adminToken = authService.issueToken(adminUser);

    // =========================================================================
    // 1. Anonymous Access to SSE Stream Rejected (401)
    // =========================================================================
    console.log('\n--- Test 1: Anonymous Access to /events Rejected (401) ---');
    const anonRes = await fetch(`${baseUrl}/events`);
    assert.strictEqual(anonRes.status, 401, 'Anonymous SSE connection must return 401');
    const anonData = await anonRes.json();
    assert.strictEqual(anonData.error?.code, 'UNAUTHENTICATED');
    console.log('[PASS] Test 1: Anonymous requests to SSE rejected with 401');

    // =========================================================================
    // 2. Raw User ID Header Rejected (401)
    // =========================================================================
    console.log('\n--- Test 2: Raw User ID Header Rejected (401) ---');
    const rawIdRes = await fetch(`${baseUrl}/events`, {
      headers: { Authorization: 'Bearer student-1' }
    });
    assert.strictEqual(rawIdRes.status, 401, 'Raw user ID in Bearer header must return 401');
    console.log('[PASS] Test 2: Raw user ID in Authorization header strictly rejected');

    // =========================================================================
    // 3. Forged / Tampered Token Rejected (401)
    // =========================================================================
    console.log('\n--- Test 3: Tampered Token Rejected (401) ---');
    const tamperedToken = `${student1Token}corrupted`;
    const tamperedRes = await fetch(`${baseUrl}/events`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    assert.strictEqual(tamperedRes.status, 401, 'Tampered token must return 401');
    console.log('[PASS] Test 3: Tampered token strictly rejected');

    // =========================================================================
    // 4. Authenticated SSE Connection Succeeds
    // =========================================================================
    console.log('\n--- Test 4: Authenticated SSE Connection Succeeds ---');
    const controller = new AbortController();
    const authSseRes = await fetch(`${baseUrl}/events`, {
      headers: { Authorization: `Bearer ${student1Token}` },
      signal: controller.signal
    });
    assert.strictEqual(authSseRes.status, 200);
    assert.strictEqual(authSseRes.headers.get('content-type'), 'text/event-stream');
    controller.abort();
    console.log('[PASS] Test 4: Authenticated user establishes text/event-stream successfully');

    // =========================================================================
    // 5. Cross-Institution SSE Subscription Blocked (403)
    // =========================================================================
    console.log('\n--- Test 5: Cross-Institution SSE Subscription Blocked (403) ---');
    const crossSchoolRes = await fetch(`${baseUrl}/events?schoolId=inst-external-academy`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(crossSchoolRes.status, 403);
    const crossSchoolData = await crossSchoolRes.json();
    assert.strictEqual(crossSchoolData.error?.code, 'FORBIDDEN');
    console.log('[PASS] Test 5: Cross-institution stream subscription rejected with 403');

    // =========================================================================
    // 6. Un-enrolled Class SSE Subscription Blocked (403)
    // =========================================================================
    console.log('\n--- Test 6: Un-enrolled Class SSE Subscription Blocked (403) ---');
    // student-2 is NOT enrolled in CS-420
    const unEnrolledRes = await fetch(`${baseUrl}/events?classId=class-cs-420`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    assert.strictEqual(unEnrolledRes.status, 403);
    const unEnrolledData = await unEnrolledRes.json();
    assert.strictEqual(unEnrolledData.error?.code, 'FORBIDDEN');
    console.log('[PASS] Test 6: Student cannot subscribe to stream of un-enrolled class (403)');

    // =========================================================================
    // 7. Student Forbidden from Posting to Announcement Channels (403)
    // =========================================================================
    console.log('\n--- Test 7: Student Forbidden from Posting to Announcements (403) ---');
    const channels = await communityStore.listChannels({ schoolId: 'inst-stark-academy' });
    const announcementChannel = channels.find((c) => c.type === 'ANNOUNCEMENTS')!;
    assert(announcementChannel, 'Announcement channel must exist');

    const studentAnnPostRes = await fetch(`${baseUrl}/channels/${announcementChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`
      },
      body: JSON.stringify({ content: 'Student attempting announcement bypass' })
    });
    assert.strictEqual(studentAnnPostRes.status, 403);
    console.log('[PASS] Test 7: Student forbidden from posting announcements (403)');

    // =========================================================================
    // 8. Teacher Can Post to Announcements Channel (200/201)
    // =========================================================================
    console.log('\n--- Test 8: Teacher Can Post to Announcements Channel ---');
    const teacherAnnPostRes = await fetch(`${baseUrl}/channels/${announcementChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacher1Token}`
      },
      body: JSON.stringify({ content: 'Official notice: Midterms start next Monday.' })
    });
    assert(teacherAnnPostRes.status === 200 || teacherAnnPostRes.status === 201);
    console.log('[PASS] Test 8: Teacher successfully posts official announcement');

    // =========================================================================
    // 9. Student Cannot Edit or Delete Another Student\'s Message (403)
    // =========================================================================
    console.log('\n--- Test 9: Student Cannot Modify Another Student\'s Message (403) ---');
    const generalChannel = channels.find((c) => c.type === 'GENERAL')!;
    const st1Msg = await communityStore.createMessage({
      schoolId: 'inst-stark-academy',
      channelId: generalChannel.id,
      senderUserId: student1.id,
      senderName: student1.displayName,
      senderRole: 'student',
      content: 'Original note by student 1'
    });

    // Student 2 attempts to edit Student 1's message
    const editOtherRes = await fetch(`${baseUrl}/messages/${st1Msg.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student2Token}`
      },
      body: JSON.stringify({ content: 'Tampered note by student 2' })
    });
    assert.strictEqual(editOtherRes.status, 403);

    // Student 2 attempts to delete Student 1's message
    const deleteOtherRes = await fetch(`${baseUrl}/messages/${st1Msg.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    assert.strictEqual(deleteOtherRes.status, 403);
    console.log('[PASS] Test 9: Student cannot edit or delete another student\'s message (403)');

    // =========================================================================
    // 10. Student Cannot Pin Messages (403) & Teacher Can Pin
    // =========================================================================
    console.log('\n--- Test 10: Pinning Authorization Check ---');
    const studentPinRes = await fetch(`${baseUrl}/channels/${generalChannel.id}/messages/${st1Msg.id}/pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    assert.strictEqual(studentPinRes.status, 403, 'Student cannot pin message');

    const teacherPinRes = await fetch(`${baseUrl}/channels/${generalChannel.id}/messages/${st1Msg.id}/pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacher1Token}` }
    });
    assert.strictEqual(teacherPinRes.status, 200, 'Teacher can pin message');
    console.log('[PASS] Test 10: Message pinning restricted strictly to instructional staff');

    console.log('\n=== ALL P0-3 REALTIME & SSE SECURITY TESTS PASSED (100%) ===\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runRealtimeAuthorizationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FATAL] P0-3 Realtime Security Test Failed:', err);
    process.exit(1);
  });
