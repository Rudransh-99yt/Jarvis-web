// Milestone 14.2: Comprehensive Security & Data-Hygiene Hardening Test Suite
import assert from 'node:assert';
import { jarvisData } from '../server/data/index.ts';
import { smartVideoService } from '../server/sectors/education/videoService.ts';
import { ticketService, TicketAuthenticationError } from '../server/auth/tickets.ts';
import { authenticateRequest, extractAuthToken } from '../server/auth/index.ts';
import { storageManager } from '../server/storage/providerManager.ts';
import type { Request } from 'express';

console.log('=== [WEB JARVIS] MILESTONE 14.2: SECURITY & DATA-HYGIENE TEST SUITE ===');

async function runSecurityTests() {
  await jarvisData.seed();
  const repo = jarvisData;

  const teacher = (await repo.users.getById('teacher-1'))!;
  const student = (await repo.users.getById('student-1'))!;
  assert(teacher && student, 'Seed users teacher-1 and student-1 must exist');

  // 1. Unauthenticated request without headers or ticket -> Rejected (401)
  console.log('[TEST] 1. Unauthenticated request rejection');
  const emptyReq = {
    headers: {},
    query: {}
  } as unknown as Request;

  let rejectedUnauth = false;
  try {
    await authenticateRequest(emptyReq);
  } catch (err: any) {
    rejectedUnauth = true;
    assert.strictEqual(err.statusCode, 401, 'Must return 401 statusCode');
    assert.strictEqual(err.code, 'UNAUTHENTICATED', 'Must return code UNAUTHENTICATED');
  }
  assert(rejectedUnauth, 'Unauthenticated request must be rejected with 401');
  console.log('[PASS] 1. Unauthenticated request rejected with 401');

  // 2. Fake userId query param without real auth header -> Rejected (401)
  console.log('[TEST] 2. Fake userId query param rejection');
  const fakeQueryReq = {
    headers: {},
    query: { userId: 'teacher-1', userRole: 'admin', workspaceId: 'ws-stark-core' }
  } as unknown as Request;

  let rejectedFakeQuery = false;
  try {
    await authenticateRequest(fakeQueryReq);
  } catch (err: any) {
    rejectedFakeQuery = true;
    assert.strictEqual(err.statusCode, 401, 'Must return 401');
  }
  assert(rejectedFakeQuery, 'Query parameter userId must NOT independently authenticate a request');
  console.log('[PASS] 2. Query parameter userId is strictly ignored as authentication credential');

  // 3. Client-supplied role spoofing -> Overruled by database role
  console.log('[TEST] 3. Client-supplied role spoofing prevented');
  const spoofRoleReq = {
    headers: {
      'x-user-id': 'student-1',
      'x-user-role': 'commander' // student tries to claim commander role
    },
    query: {}
  } as unknown as Request;

  const authenticatedStudent = await authenticateRequest(spoofRoleReq);
  assert.strictEqual(authenticatedStudent.id, 'student-1');
  assert.strictEqual(authenticatedStudent.role, 'student', 'Role must strictly come from database record, not client header');
  console.log('[PASS] 3. Client-supplied role header is ignored; database role is authoritative');

  // 4. Ticket issuance for authorized video
  console.log('[TEST] 4. Playback ticket generation');
  const video = await smartVideoService.getVideo('vid-seed-phys-1', student, 'ws-stark-core');
  assert(video, 'Video vid-seed-phys-1 must be retrieved');

  const ticketData = ticketService.createPlaybackTicket({
    userId: student.id,
    videoId: video.id,
    fileId: video.fileId,
    workspaceId: 'ws-stark-core',
    classId: video.classId,
    ttlSeconds: 60
  });

  assert(ticketData.ticket && typeof ticketData.ticket === 'string', 'Ticket string generated');
  assert(ticketData.ticket.includes('.'), 'Ticket must have signature delimiter');
  console.log('[PASS] 4. Valid cryptographic playback ticket created');

  // 5. Valid playback ticket verification
  console.log('[TEST] 5. Playback ticket verification');
  const verified = await ticketService.verifyPlaybackTicket(ticketData.ticket, 'vid-seed-phys-1');
  assert.strictEqual(verified.user.id, 'student-1');
  assert.strictEqual(verified.payload.videoId, 'vid-seed-phys-1');
  assert.strictEqual(verified.payload.workspaceId, 'ws-stark-core');
  console.log('[PASS] 5. Valid playback ticket successfully verified against target video');

  // 6. Cross-video ticket tampering: Ticket for video A used on video B -> Rejected (403)
  console.log('[TEST] 6. Cross-video ticket reuse rejected');
  let rejectedCrossVideo = false;
  try {
    await ticketService.verifyPlaybackTicket(ticketData.ticket, 'vid-seed-math-1');
  } catch (err: any) {
    rejectedCrossVideo = true;
    assert.strictEqual(err.statusCode, 403, 'Must return 403');
    assert.strictEqual(err.code, 'TICKET_RESOURCE_MISMATCH');
  }
  assert(rejectedCrossVideo, 'Ticket for video A cannot be reused on video B');
  console.log('[PASS] 6. Ticket scope mismatch rejected with 403');

  // 7. Expired playback ticket -> Rejected (401)
  console.log('[TEST] 7. Expired playback ticket rejection');
  const expiredTicket = ticketService.createPlaybackTicket({
    userId: student.id,
    videoId: video.id,
    fileId: video.fileId,
    workspaceId: 'ws-stark-core',
    classId: video.classId,
    ttlSeconds: -10 // expired 10 seconds ago
  });

  let rejectedExpired = false;
  try {
    await ticketService.verifyPlaybackTicket(expiredTicket.ticket, 'vid-seed-phys-1');
  } catch (err: any) {
    rejectedExpired = true;
    assert.strictEqual(err.statusCode, 401, 'Must return 401');
    assert.strictEqual(err.code, 'TICKET_EXPIRED');
  }
  assert(rejectedExpired, 'Expired playback ticket must be rejected');
  console.log('[PASS] 7. Expired playback ticket rejected with 401');

  // 8. Cryptographic tampering: modified ticket string -> Rejected (403)
  console.log('[TEST] 8. Tampered ticket signature verification');
  const tamperedTicket = ticketData.ticket.slice(0, -4) + 'abcd';
  let rejectedTampered = false;
  try {
    await ticketService.verifyPlaybackTicket(tamperedTicket, 'vid-seed-phys-1');
  } catch (err: any) {
    rejectedTampered = true;
    assert.strictEqual(err.statusCode, 403, 'Must return 403');
    assert.strictEqual(err.code, 'INVALID_TICKET_SIGNATURE');
  }
  assert(rejectedTampered, 'Tampered ticket signature must fail cryptographic check');
  console.log('[PASS] 8. Tampered ticket signature rejected with 403');

  // 9. Cross-class access check: Student not enrolled in class cannot access class-private video
  console.log('[TEST] 9. Cross-class unauthorized access rejection');
  const outsider = await repo.users.create({
    id: 'student-outsider',
    displayName: 'Outsider Student',
    email: 'outsider@stark.edu',
    role: 'student'
  });
  await repo.workspaces.addMember('ws-stark-core', outsider.id, 'member');

  let rejectedClassAccess = false;
  try {
    await smartVideoService.getVideo('vid-seed-math-1', outsider, 'ws-stark-core');
  } catch (err: any) {
    rejectedClassAccess = true;
    assert(err.message.includes('Forbidden') || err.message.includes('not enrolled') || err.message.includes('denied'), 'Must reject un-enrolled student');
  }
  assert(rejectedClassAccess, 'Non-enrolled student must be denied access to course lecture video');
  console.log('[PASS] 9. Non-enrolled student cross-class video access strictly rejected');

  // 10. Cross-workspace access check: User from foreign workspace cannot access video
  console.log('[TEST] 10. Cross-workspace access rejection');
  const foreignUser = await repo.users.create({
    id: 'user-foreign',
    displayName: 'Foreign Operator',
    email: 'foreign@other.com',
    role: 'student'
  });
  // foreignUser is not a member of ws-stark-core

  let rejectedWorkspaceAccess = false;
  try {
    await smartVideoService.getVideo('vid-seed-phys-1', foreignUser, 'ws-stark-core');
  } catch (err: any) {
    rejectedWorkspaceAccess = true;
    assert(err.message.includes('denied') || err.message.includes('workspace'), 'Must reject cross-workspace access');
  }
  assert(rejectedWorkspaceAccess, 'Cross-workspace access must be strictly rejected');
  console.log('[PASS] 10. Cross-workspace video access strictly rejected');

  // 11. Playback Data Streaming & Buffer Loading
  console.log('[TEST] 11. Binary playback buffer verification');
  const playbackData = await smartVideoService.getPlaybackData('vid-seed-phys-1', teacher, 'ws-stark-core');
  assert(playbackData.buffer && playbackData.buffer.length > 0, 'Playback buffer must be present');
  assert.strictEqual(playbackData.fileRecord.mimeType, 'video/mp4');
  console.log(`[PASS] 11. Valid playback buffer loaded from storage (${playbackData.buffer.length} bytes)`);

  // 12. Range Slice simulation (HTTP 206)
  console.log('[TEST] 12. HTTP 206 Partial Content Range slicing');
  const totalBytes = playbackData.buffer.length;
  const start = 0;
  const end = 1023; // First 1KB
  const chunk = playbackData.buffer.subarray(start, end + 1);
  assert.strictEqual(chunk.length, 1024, 'Range slice length must match requested range');
  console.log(`[PASS] 12. HTTP Range slice bytes ${start}-${end}/${totalBytes} correctly generated`);

  // 13. SSE Ticket generation & validation
  console.log('[TEST] 13. SSE Ticket generation and validation');
  const sseTicket = ticketService.createSSETicket({
    userId: student.id,
    workspaceId: 'ws-stark-core',
    classId: 'class-phys-301',
    ttlSeconds: 60
  });

  const verifiedSSE = await ticketService.verifySSETicket(sseTicket.ticket, 'class-phys-301');
  assert.strictEqual(verifiedSSE.user.id, 'student-1');
  assert.strictEqual(verifiedSSE.payload.classId, 'class-phys-301');
  console.log('[PASS] 13. SSE stream ticket generated and validated');

  // 14. SSE Ticket channel mismatch -> Rejected (403)
  console.log('[TEST] 14. SSE Ticket channel mismatch');
  let rejectedSSEChannel = false;
  try {
    await ticketService.verifySSETicket(sseTicket.ticket, 'class-math-240');
  } catch (err: any) {
    rejectedSSEChannel = true;
    assert.strictEqual(err.statusCode, 403);
  }
  assert(rejectedSSEChannel, 'SSE ticket bound to class-phys-301 must not connect to class-math-240');
  console.log('[PASS] 14. SSE ticket channel mismatch rejected with 403');

  console.log('\n=== ALL 14 MILESTONE 14.2 SECURITY & DATA-HYGIENE TESTS PASSED! ===\n');
}

runSecurityTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[FAIL] Milestone 14.2 Security Test Failure:', err);
    process.exit(1);
  });
