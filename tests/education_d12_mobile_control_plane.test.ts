// Phase D.12: SmartBoard ↔ Teacher Mobile Control Plane Automated Test Suite
import { controlPlaneService } from '../server/sectors/education/smartboard/controlPlaneService.ts';
import { smartboardStore } from '../server/sectors/education/smartboard/smartboardStore.ts';
import type { User } from '../server/data/types.ts';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

function getFileSha256(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`\n[FAIL] ${testName}`, detail !== undefined ? detail : '');
    throw new Error(`Assertion failed: ${testName}`);
  }
  console.log(`[PASS] ${testName}`);
}

const teacherUser: User = {
  id: 'teacher-1',
  displayName: 'Dr. Helen Cho',
  email: 'helen.cho@starkacademy.edu',
  role: 'teacher',
  institutionId: 'inst-stark-academy',
  workspaceId: 'ws-main',
  createdAt: new Date().toISOString()
};

const studentUser: User = {
  id: 'student-1',
  displayName: 'Alex Chen',
  email: 'alex.chen@starkacademy.edu',
  role: 'student',
  institutionId: 'inst-stark-academy',
  workspaceId: 'ws-main',
  createdAt: new Date().toISOString()
};

async function runD12ControlPlaneTests() {
  console.log('\n===================================================================');
  console.log('=== [WEB JARVIS] PHASE D.12: MOBILE CONTROL PLANE TEST SUITE ===');
  console.log('===================================================================\n');

  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  smartboardStore.resetToDefaults();

  // --- SECTION 1: List Authorized SmartBoards ---
  console.log('--- SECTION 1: List Authorized SmartBoards ---');

  const boards = controlPlaneService.listMySmartBoards(teacherUser);
  assert(boards.length >= 3, '1.1 Lists pre-registered classroom smartboards');
  assert(boards.some((b) => b.id === 'board-phys-01'), '1.2 Contains Physics Lab SmartBoard');

  // --- SECTION 2: Ephemeral Pairing Challenge & Pin Generation ---
  console.log('\n--- SECTION 2: Ephemeral Pairing Challenge & Pin Generation ---');

  const challenge = controlPlaneService.generatePairingChallenge(teacherUser, 'board-phys-01');
  assert(challenge.pinCode.length === 6, '2.1 Generates 6-digit numeric PIN');
  assert(challenge.expiresAt > Date.now(), '2.2 Challenge has future expiration timestamp');
  assert(challenge.qrPayload.includes('board-phys-01'), '2.3 Generates structured QR payload');

  // --- SECTION 3: Claiming Pairing ---
  console.log('\n--- SECTION 3: Claiming Pairing ---');

  // Invalid PIN fails safely
  let invalidPinFailed = false;
  try {
    controlPlaneService.claimPairing(teacherUser, 'board-phys-01', '000000');
  } catch {
    invalidPinFailed = true;
  }
  assert(invalidPinFailed, '3.1 Rejects incorrect pairing PIN');

  // Valid PIN succeeds
  const pairResult = controlPlaneService.claimPairing(teacherUser, 'board-phys-01', challenge.pinCode, 'session-phys-101');
  assert(pairResult.success === true, '3.2 Successfully pairs with valid PIN');
  assert(Boolean(pairResult.pairingTicket), '3.3 Generates cryptographic pairing ticket');
  assert(pairResult.board.pairingState.isPaired === true, '3.4 Updates board pairing state to isPaired: true');

  // --- SECTION 4: Send Session to Classroom & Idempotency ---
  console.log('\n--- SECTION 4: Send Session to Classroom & Idempotency ---');

  const delivery1 = controlPlaneService.sendSessionToClassroom(teacherUser, 'board-phys-01', 'session-phys-101');
  assert(delivery1.status === 'ACKNOWLEDGED', '4.1 Session delivered and acknowledged by board');

  // Replay idempotency
  const delivery2 = controlPlaneService.sendSessionToClassroom(teacherUser, 'board-phys-01', 'session-phys-101');
  assert(delivery1.deliveryId === delivery2.deliveryId, '4.2 Idempotent delivery prevents duplicate session records');

  // --- SECTION 5: Mobile Remote Actions ---
  console.log('\n--- SECTION 5: Mobile Remote Actions ---');

  const nextRes = controlPlaneService.executeRemoteAction(teacherUser, 'board-phys-01', 'NEXT_PAGE');
  assert(nextRes.ok === true, '5.1 Remote action NEXT_PAGE executed successfully');
  assert(nextRes.boardDoc?.activePageIndex === 1, '5.2 Active page index incremented on board document');

  const prevRes = controlPlaneService.executeRemoteAction(teacherUser, 'board-phys-01', 'PREV_PAGE');
  assert(prevRes.ok === true, '5.3 Remote action PREV_PAGE executed successfully');
  assert(prevRes.boardDoc?.activePageIndex === 0, '5.4 Active page index decremented on board document');

  // --- SECTION 6: Multi-Role RBAC Defense ---
  console.log('\n--- SECTION 6: Multi-Role RBAC Defense ---');

  let studentControlBlocked = false;
  try {
    controlPlaneService.listMySmartBoards(studentUser);
  } catch (err: any) {
    studentControlBlocked = err.message.includes('403');
  }
  assert(studentControlBlocked, '6.1 Student blocked from accessing control plane (403)');

  let studentRemoteBlocked = false;
  try {
    controlPlaneService.executeRemoteAction(studentUser, 'board-phys-01', 'NEXT_PAGE');
  } catch (err: any) {
    studentRemoteBlocked = err.message.includes('403');
  }
  assert(studentRemoteBlocked, '6.2 Student blocked from executing remote actions on board (403)');

  // --- SECTION 7: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 7: Test Data Hygiene & Invariant Verification ---');

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '7.1 TEST DATA HYGIENE: Running D.12 Control Plane tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n===================================================================');
  console.log('=== ALL PHASE D.12 MOBILE CONTROL PLANE TESTS PASSED (100%) ===');
  console.log('===================================================================\n');
}

runD12ControlPlaneTests().catch((err) => {
  console.error('\n[FATAL] Phase D.12 Control Plane test suite failed:', err);
  process.exit(1);
});
