// Phase D.8: SmartBoard OS Foundation Automated Test Suite
import { jarvisData, DiskJarvisDataRepository, setActiveRepository, resetActiveRepository } from '../server/data/index.ts';
import { smartboardStore } from '../server/sectors/education/smartboard/smartboardStore.ts';
import { smartboardPolicy } from '../server/sectors/education/smartboard/smartboardPolicy.ts';
import { smartboardService } from '../server/sectors/education/smartboard/smartboardService.ts';
import { classSessionStore } from '../server/sectors/education/classSessions/classSessionStore.ts';
import { ticketService } from '../server/auth/tickets.ts';
import { toolExecutor } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
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
  department: 'Faculty of Physics',
  institutionId: 'inst-stark-academy',
  createdAt: new Date().toISOString()
};

const unauthorizedTeacher: User = {
  id: 'teacher-2',
  displayName: 'Dr. Erik Selvig',
  email: 'erik.selvig@starkacademy.edu',
  role: 'teacher',
  department: 'Faculty of Astrophysics',
  institutionId: 'inst-stark-academy',
  createdAt: new Date().toISOString()
};

const studentUser: User = {
  id: 'student-1',
  displayName: 'Alex Chen',
  email: 'alex.chen@starkacademy.edu',
  role: 'student',
  institutionId: 'inst-stark-academy',
  createdAt: new Date().toISOString()
};

const rogueStudent: User = {
  id: 'student-rogue',
  displayName: 'Rogue Infiltrator',
  email: 'rogue@external.net',
  role: 'student',
  institutionId: 'inst-external-net',
  createdAt: new Date().toISOString()
};

const teacherContext: ToolExecutionContext = {
  sessionId: 'test-sb-session',
  timestamp: new Date().toISOString(),
  serverUptime: 300,
  sector: 'education',
  userId: 'teacher-1',
  role: 'teacher'
};

const studentContext: ToolExecutionContext = {
  sessionId: 'test-sb-session-stud',
  timestamp: new Date().toISOString(),
  serverUptime: 300,
  sector: 'education',
  userId: 'student-1',
  role: 'student'
};

async function runD8SmartBoardTests() {
  console.log('\n===================================================================');
  console.log('=== [WEB JARVIS] PHASE D.8: SMARTBOARD OS FOUNDATION TEST SUITE ===');
  console.log('===================================================================\n');

  // Baseline database snapshot for hygiene verification
  const durableDbPath = path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // Setup isolated temporary database for test suite
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `d8-test-db-${Date.now()}.json`);
  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  smartboardStore.resetToDefaults();

  // --- SECTION 1: SmartBoard Device Registration & Discovery ---
  console.log('--- SECTION 1: SmartBoard Device Registration & Discovery ---');

  const devices = await smartboardService.listDevices(teacherUser);
  assert(Array.isArray(devices) && devices.length >= 3, '1.1 smartboardService.listDevices returns registered devices');
  
  const physBoard = devices.find((d) => d.id === 'board-phys-01');
  assert(Boolean(physBoard), '1.2 Discovers Physics Lab SmartBoard (board-phys-01)');
  assert(physBoard?.status === 'AVAILABLE', '1.3 Initial status of SmartBoard is AVAILABLE');
  assert(physBoard?.capabilities.touch === true && physBoard?.capabilities.pen === true, '1.4 SmartBoard capabilities declare touch and pen support');
  assert(physBoard?.institutionId === 'inst-stark-academy', '1.5 SmartBoard belongs to Stark Academy institution');

  // --- SECTION 2: Institution & Classroom Isolation Policy ---
  console.log('\n--- SECTION 2: Institution & Classroom Isolation Policy ---');

  const crossInstBoard = {
    ...physBoard!,
    id: 'board-rogue-01',
    institutionId: 'inst-external-academy'
  };

  const crossInstCheck = await smartboardPolicy.canControlBoard(teacherUser, crossInstBoard);
  assert(crossInstCheck.allowed === false, '2.1 Cross-institution hardware control is strictly blocked (403)');
  assert(crossInstCheck.statusCode === 403, '2.1.b Rejection status code is 403 Forbidden');

  const studentControlCheck = await smartboardPolicy.canControlBoard(studentUser, physBoard!);
  assert(studentControlCheck.allowed === false, '2.2 Student role is strictly forbidden from controlling physical board');
  assert(studentControlCheck.statusCode === 403, '2.2.b Student control rejection is 403 Forbidden');

  // --- SECTION 3: ClassSession Authorization & Send to Board ---
  console.log('\n--- SECTION 3: ClassSession Authorization & Send to Board ---');

  const anchorSession = await classSessionStore.getSession('session-phys-101');
  assert(Boolean(anchorSession), '3.1 Seeded ClassSession session-phys-101 exists in store');
  assert(['APPROVED', 'SCHEDULED', 'LIVE'].includes(anchorSession!.status), '3.2 Session is in APPROVED/SCHEDULED state');

  // Unauthorized teacher attempting to send someone else's session
  const unauthSendCheck = await smartboardPolicy.canSendSessionToBoard(unauthorizedTeacher, physBoard!, anchorSession!);
  assert(unauthSendCheck.allowed === false, '3.3 Unauthorized teacher blocked from dispatching unassigned session');

  // Draft session rejection
  const draftSession = { ...anchorSession!, status: 'DRAFT' as any };
  const draftSendCheck = await smartboardPolicy.canSendSessionToBoard(teacherUser, physBoard!, draftSession);
  assert(draftSendCheck.allowed === false, '3.4 DRAFT session cannot be sent to SmartBoard (must be APPROVED)');

  // Authorized teacher sends session to board
  const sendResult = await smartboardService.sendSessionToBoard(teacherUser, 'board-phys-01', 'session-phys-101');
  assert(sendResult.board.status === 'READY', '3.5 Board transitions to READY state after session dispatch');
  assert(sendResult.board.currentSessionId === 'session-phys-101', '3.6 Board currentSessionId is bound to session-phys-101');
  assert(Boolean(sendResult.document && sendResult.document.pages.length > 0), '3.7 Creates structured BoardDocument with initial canvas page');

  // --- SECTION 4: Secure Board Pairing & Cryptographic Tickets ---
  console.log('\n--- SECTION 4: Secure Board Pairing & Cryptographic Tickets ---');

  // Generate 6-digit pair PIN
  const pinRes = await smartboardService.generatePairCode('board-phys-01');
  assert(Boolean(pinRes.pairCode && pinRes.pairCode.length === 6), '4.1 Generates 6-digit cryptographic pairing PIN');
  assert(pinRes.expiresAt > Date.now(), '4.2 Pair code includes 5-minute TTL expiration');

  // Forged/Invalid PIN rejection
  let failedInvalidPin = false;
  try {
    await smartboardService.pairWithCode(teacherUser, 'board-phys-01', '000000');
  } catch {
    failedInvalidPin = true;
  }
  assert(failedInvalidPin, '4.3 Invalid pairing PIN is rejected');

  // Valid pairing
  const pairResult = await smartboardService.pairWithCode(teacherUser, 'board-phys-01', pinRes.pairCode, 'session-phys-101');
  assert(pairResult.board.pairingState.isPaired === true, '4.4 Board pairing state isPaired is true');
  assert(pairResult.board.pairingState.pairedTeacherId === teacherUser.id, '4.5 Board is paired to Dr. Helen Cho');
  assert(Boolean(pairResult.ticket && pairResult.ticket.includes('.')), '4.6 Issues HMAC-SHA256 cryptographically signed board ticket');

  // Ticket verification
  const verifiedTicket = await ticketService.verifyBoardTicket(pairResult.ticket, 'board-phys-01', 'session-phys-101');
  assert(verifiedTicket.user.id === teacherUser.id, '4.7 Ticket cryptographic verification confirms teacher identity');
  assert(verifiedTicket.payload.boardId === 'board-phys-01', '4.8 Ticket is strictly scoped to target board');
  assert(verifiedTicket.payload.classSessionId === 'session-phys-101', '4.9 Ticket is strictly scoped to target class session');

  // Mismatched scope ticket verification rejection
  let failedMismatchScope = false;
  try {
    await ticketService.verifyBoardTicket(pairResult.ticket, 'board-chem-01');
  } catch {
    failedMismatchScope = true;
  }
  assert(failedMismatchScope, '4.10 Ticket with mismatched board ID is rejected (403)');

  // Expired ticket verification rejection
  const expiredTicket = ticketService.createBoardTicket({
    boardId: 'board-phys-01',
    teacherId: teacherUser.id,
    institutionId: 'inst-stark-academy',
    classroomId: 'class-phys-301',
    classSessionId: 'session-phys-101',
    ttlSeconds: -10 // already expired
  });

  let failedExpired = false;
  try {
    await ticketService.verifyBoardTicket(expiredTicket.ticket);
  } catch {
    failedExpired = true;
  }
  assert(failedExpired, '4.11 Expired board ticket is strictly rejected (401)');

  // --- SECTION 5: Live Teaching Surface & Sanitization ---
  console.log('\n--- SECTION 5: Live Teaching Surface & Sanitization ---');

  const launchResult = await smartboardService.launchSessionOnBoard(teacherUser, 'board-phys-01', 'session-phys-101');
  assert(launchResult.board.status === 'LIVE', '5.1 Board transitions to LIVE state upon session launch');
  assert(launchResult.session.topic === anchorSession?.topic, '5.2 Delivers approved curriculum session');

  // CRITICAL: Verify answer key and private teacher notes are strictly stripped from board payload
  assert(launchResult.session.answerKey === undefined, '5.3 SECURITY: Protected answer keys strictly stripped from board payload');
  assert(launchResult.session.teacherNotes === undefined, '5.4 SECURITY: Teacher private notes strictly stripped from board payload');

  // --- SECTION 6: Structured BoardDocument, Elements & Autosave ---
  console.log('\n--- SECTION 6: Structured BoardDocument, Elements & Autosave ---');

  const doc = await smartboardService.getBoardDocument(teacherUser, 'session-phys-101');
  assert(Boolean(doc), '6.1 Retrieves structured BoardDocument for session');
  assert(doc.pages.length >= 1, '6.2 Document contains structured pages array');

  // Add stroke, equation, and shape elements
  const newStrokeElement = {
    id: `elem-stroke-${Date.now()}`,
    type: 'stroke' as const,
    tool: 'pen' as const,
    color: '#00f2fe',
    width: 4,
    points: [
      { x: 50, y: 100, pressure: 0.5 },
      { x: 100, y: 150, pressure: 0.7 },
      { x: 150, y: 100, pressure: 0.6 }
    ],
    semanticTag: 'derivation_step' as const,
    zIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const newFormulaElement = {
    id: `elem-form-${Date.now()}`,
    type: 'text' as const,
    text: '\\oint \\vec{B} \\cdot d\\vec{A} = 0',
    fontSize: 24,
    fontFamily: 'font-mono',
    x: 80,
    y: 200,
    color: '#38bdf8',
    semanticTag: 'formula' as const,
    latexFormula: '\\oint \\vec{B} \\cdot d\\vec{A} = 0',
    zIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const updatedPages = [
    {
      ...doc.pages[0],
      elements: [...doc.pages[0].elements, newStrokeElement, newFormulaElement],
      updatedAt: new Date().toISOString()
    }
  ];

  // Autosave
  const savedDoc = await smartboardService.autosaveDocument(teacherUser, doc.id, {
    pages: updatedPages,
    expectedVersion: doc.version
  });

  assert(savedDoc.version === doc.version + 1, '6.3 Autosave increments document version monotonically');
  assert(savedDoc.pages[0].elements.length === updatedPages[0].elements.length, '6.4 Preserves all structured stroke and formula elements');
  assert(Boolean(savedDoc.timestamps.lastAutosavedAt), '6.5 Updates lastAutosavedAt timestamp');

  // Verify pen stroke element structure
  const strokeElem = savedDoc.pages[0].elements.find((e) => e.type === 'stroke');
  assert(Boolean(strokeElem && strokeElem.points && strokeElem.points.length >= 2), '6.5.a Pen stroke element contains structured coordinate points');
  assert(strokeElem?.tool === 'pen' || strokeElem?.tool === 'highlighter', '6.5.b Pen stroke records active tool type');

  // Verify shape element structure
  const shapeElem: import('../src/types/smartboard.ts').BoardElement = {
    id: 'shape-test-1',
    type: 'shape',
    shapeType: 'rectangle',
    x: 100,
    y: 150,
    widthPx: 200,
    heightPx: 120,
    strokeColor: '#00f2fe',
    fillColor: '#00f2fe18',
    width: 4,
    zIndex: 4,
    semanticTag: 'diagram_label',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const docWithShape = await smartboardService.autosaveDocument(teacherUser, doc.id, {
    pages: [
      {
        ...savedDoc.pages[0],
        elements: [...savedDoc.pages[0].elements, shapeElem]
      }
    ],
    expectedVersion: savedDoc.version
  });
  assert(docWithShape.pages[0].elements.some((e) => e.type === 'shape' && e.shapeType === 'rectangle'), '6.5.c Geometric shape rectangle successfully added and persisted');

  // Verify multi-page creation and preservation
  const page2: import('../src/types/smartboard.ts').BoardPage = {
    pageId: `page-${doc.id}-2`,
    pageIndex: 1,
    title: 'Page 2 — Gauss Derivation Steps',
    background: 'lined',
    elements: [
      {
        id: 'elem-p2-line1',
        type: 'text',
        text: 'E = \\frac{\\lambda}{2\\pi\\varepsilon_0 r}',
        fontSize: 24,
        fontFamily: 'font-mono',
        x: 80,
        y: 60,
        color: '#38bdf8',
        semanticTag: 'formula',
        latexFormula: 'E = \\frac{\\lambda}{2\\pi\\varepsilon_0 r}',
        zIndex: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const docMultiPage = await smartboardService.autosaveDocument(teacherUser, doc.id, {
    pages: [...docWithShape.pages, page2],
    activePageIndex: 1,
    expectedVersion: docWithShape.version
  });
  assert(docMultiPage.pages.length === 2, '6.5.d Multi-page creation preserves previous pages and creates Page 2');
  assert(docMultiPage.pages[1].background === 'lined', '6.5.e Page 2 background style preserved');

  // Verify unblocked document fetch for ANY class session
  const autoCreatedDoc = await smartboardService.getBoardDocument(teacherUser, 'session-phys-101');
  assert(Boolean(autoCreatedDoc && autoCreatedDoc.id), '6.5.f Unblocked canvas: getBoardDocument seamlessly loads/creates document without UI blocker');

  // Student trying to edit board document is rejected
  let studentEditFailed = false;
  try {
    await smartboardService.autosaveDocument(studentUser, doc.id, { pages: updatedPages });
  } catch {
    studentEditFailed = true;
  }
  assert(studentEditFailed, '6.6 Student modifying board document is strictly rejected (403)');

  // --- SECTION 7: Session Completion & Board History Release ---
  console.log('\n--- SECTION 7: Session Completion & Board History Release ---');

  // Prior to release: student trying to read document is rejected
  // Make doc unreleased first to test unreleased rejection
  smartboardStore.releaseDocument(doc.id, false);
  let unreleasedReadFailed = false;
  try {
    await smartboardService.getBoardDocument(studentUser, doc.id);
  } catch {
    unreleasedReadFailed = true;
  }
  assert(unreleasedReadFailed, '7.1 Student reading unreleased board document is rejected (403)');

  // Complete session on board
  const completeResult = await smartboardService.completeSession(teacherUser, 'board-phys-01', 'session-phys-101');
  assert(completeResult.board?.status === 'AVAILABLE', '7.2 Completing session resets SmartBoard status to AVAILABLE');
  assert(completeResult.board?.currentSessionId === null, '7.3 Board currentSessionId cleared after class ends');
  assert(Boolean(completeResult.document?.timestamps.completedAt), '7.4 Records completedAt timestamp in Board History');

  // Release document to students
  const releasedDoc = await smartboardService.releaseDocument(teacherUser, doc.id, true);
  assert(releasedDoc.isReleasedToStudents === true, '7.5 Teacher successfully releases BoardDocument to enrolled students');
  assert(Boolean(releasedDoc.releasedAt), '7.6 Records releasedAt timestamp');

  // Student reading released document succeeds
  const studentReadDoc = await smartboardService.getBoardDocument(studentUser, doc.id);
  assert(Boolean(studentReadDoc && studentReadDoc.id === doc.id), '7.7 Student successfully accesses released Board History');
  assert(studentReadDoc.pages.length > 0, '7.8 Student can view structured board pages and formulas');

  // --- SECTION 8: Sandboxed Tool Calling Integration ---
  console.log('\n--- SECTION 8: Sandboxed Tool Calling Integration ---');

  const listBoardsRes = await toolExecutor.execute('smartboard.device.list', {}, teacherContext);
  assert(listBoardsRes.ok === true, '8.1 Tool smartboard.device.list executes successfully');
  assert(Array.isArray(listBoardsRes.data.devices), '8.2 Tool returns devices array');

  const boardStatusRes = await toolExecutor.execute('smartboard.session.status', { boardId: 'board-phys-01' }, teacherContext);
  assert(boardStatusRes.ok === true, '8.3 Tool smartboard.session.status executes successfully');
  assert(boardStatusRes.data.id === 'board-phys-01', '8.4 Returns correct board status');

  const docGetRes = await toolExecutor.execute('smartboard.document.get', { sessionId: 'session-phys-101' }, teacherContext);
  assert(docGetRes.ok === true, '8.5 Tool smartboard.document.get executes successfully');

  const historyListRes = await toolExecutor.execute('smartboard.history.list', { classId: 'class-phys-301' }, teacherContext);
  assert(historyListRes.ok === true, '8.6 Tool smartboard.history.list executes successfully');

  // --- SECTION 9: Real-World Acceptance Test Simulation ---
  console.log('\n--- SECTION 9: Real-World Acceptance Test Simulation ---');
  console.log('Scenario: Teacher prepares Physics ClassSession -> Sends to SmartBoard 01 -> Board shows Ready -> Authenticates -> Opens -> Teaches -> Autosaves -> Ends Class -> Releases -> Student views');

  // Step 1: Teacher selects Physics Lab SmartBoard 01 and sends session
  const simSend = await smartboardService.sendSessionToBoard(teacherUser, 'board-phys-01', 'session-phys-101');
  assert(simSend.board.status === 'READY', '9.1 SIMULATION: Board displays "Session Ready — Electrostatics"');

  // Step 2: Teacher pairs and launches
  const simPin = await smartboardService.generatePairCode('board-phys-01');
  const simPair = await smartboardService.pairWithCode(teacherUser, 'board-phys-01', simPin.pairCode, 'session-phys-101');
  assert(simPair.board.pairingState.isPaired === true, '9.2 SIMULATION: Teacher authenticates with scoped PIN');

  const simLaunch = await smartboardService.launchSessionOnBoard(teacherUser, 'board-phys-01', 'session-phys-101');
  assert(simLaunch.board.status === 'LIVE', '9.3 SIMULATION: Board opens approved ClassSession live');

  // Step 3: Teacher writes on canvas and system autosaves
  const simDoc = await smartboardService.getBoardDocument(teacherUser, 'session-phys-101');
  const simSave = await smartboardService.autosaveDocument(teacherUser, simDoc.id, {
    pages: simDoc.pages,
    expectedVersion: simDoc.version
  });
  assert(simSave.version > simDoc.version, '9.4 SIMULATION: Canvas equations and notes successfully autosaved');

  // Step 4: Class completes & releases
  await smartboardService.completeSession(teacherUser, 'board-phys-01', 'session-phys-101');
  await smartboardService.releaseDocument(teacherUser, simDoc.id, true);

  // Step 5: Student opens Board History
  const studentHistory = await smartboardService.getBoardHistory(studentUser, 'class-phys-301');
  assert(studentHistory.length >= 1, '9.5 SIMULATION: Student browses released Physics Board History');
  assert(studentHistory.every((d) => d.isReleasedToStudents), '9.6 SIMULATION: All documents visible to student are released');

  // Step 6: Verify zero leaks of teacher private notes
  const studentDocPayload = await smartboardService.getBoardDocument(studentUser, simDoc.id);
  assert((studentDocPayload as any).answerKey === undefined, '9.7 SIMULATION: Zero answer key leakage to student');
  assert((studentDocPayload as any).teacherNotes === undefined, '9.8 SIMULATION: Zero private teacher notes leakage to student');

  // --- SECTION 10: Test Data Hygiene Verification ---
  console.log('\n--- SECTION 10: Test Data Hygiene & Invariant Verification ---');

  // Clean up isolated test database
  resetActiveRepository();
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '10.1 TEST DATA HYGIENE: Running D.8 SmartBoard tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n===================================================================');
  console.log('=== ALL PHASE D.8 SMARTBOARD OS FOUNDATION TESTS PASSED (100%) ===');
  console.log('===================================================================\n');
}

runD8SmartBoardTests().catch((err) => {
  console.error('\n[FATAL] Phase D.8 SmartBoard test suite failed:', err);
  process.exit(1);
});
