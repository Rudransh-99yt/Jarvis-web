// JARVIS-WEB — P1-7 SMARTBOARD AUTHORIZATION HARDENING TEST SUITE
import assert from 'node:assert';
import express from 'express';
import type { Server } from 'node:http';
import { jarvisData } from '../server/data/index.ts';
import { authRouter } from '../server/auth/authRoutes.ts';
import { smartboardRouter } from '../server/sectors/education/smartboard/smartboardRoutes.ts';
import { smartboardStore } from '../server/sectors/education/smartboard/smartboardStore.ts';
import { smartboardService } from '../server/sectors/education/smartboard/smartboardService.ts';
import { smartboardPolicy } from '../server/sectors/education/smartboard/smartboardPolicy.ts';
import { authService } from '../server/auth/tokens.ts';
import { ticketService } from '../server/auth/tickets.ts';
import type { SmartBoardDevice, BoardDocument } from '../src/types/smartboard.ts';
import type { User } from '../server/data/types.ts';

console.log('=== [JARVIS-WEB] P1-7 SMARTBOARD AUTHORIZATION HARDENING TEST SUITE ===');

async function getTokenForUser(userId: string): Promise<string> {
  const res = await fetch(`http://localhost:3000/api/auth/dev-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  return data.token;
}

async function runSmartboardAuthorizationTests() {
  await jarvisData.seed();
  smartboardStore.resetToDefaults();

  const { requirePrincipal } = await import('../server/auth/principal.ts');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/education/smartboard', requirePrincipal, smartboardRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/education/smartboard`;

  try {
    // 1. Setup Test Users
    const teacher1 = (await jarvisData.users.getById('teacher-1'))!; // Physics instructor (Dr. Cho)
    const student1 = (await jarvisData.users.getById('student-1'))!; // Enrolled in PHYS-301
    const student2 = (await jarvisData.users.getById('student-2'))!; // NOT enrolled in PHYS-301 if single-student class
    const parent1 = (await jarvisData.users.getById('parent-1'))!;   // Parent of student-1
    const principal1 = (await jarvisData.users.getById('principal-1'))!;
    const adminUser = (await jarvisData.users.getById('user-tony'))!;

    // Create an unassigned teacher for isolation testing
    const unassignedTeacher: User = {
      id: 'teacher-2',
      displayName: 'Prof. Strange',
      email: 'strange@stark.edu',
      role: 'teacher',
      department: 'Sorcery & Relativistic Physics',
      createdAt: new Date().toISOString()
    };
    await jarvisData.users.create(unassignedTeacher);

    // Create an external institution user
    const externalTeacher: User = {
      id: 'teacher-external-1',
      displayName: 'Dr. Doom',
      email: 'doom@latveria-academy.edu',
      role: 'teacher',
      department: 'Applied Robotics',
      institutionId: 'inst-latveria-academy',
      createdAt: new Date().toISOString()
    } as any;
    await jarvisData.users.create(externalTeacher);

    // Register external device in store
    const externalDevice: SmartBoardDevice = {
      id: 'board-external-01',
      institutionId: 'inst-latveria-academy',
      classroomId: 'class-latveria-101',
      classroomName: 'Latveria Hall 1',
      displayName: 'Latveria SmartBoard 1',
      modelNumber: 'Doom Surface-9000',
      status: 'AVAILABLE',
      capabilities: { touch: true, pen: true, multiTouch: true, maxResolution: '4K', audio: true, camera: true },
      pairingState: { isPaired: false },
      lastSeen: new Date().toISOString(),
      currentSessionId: null,
      currentCourseCode: 'DOOM-101',
      currentTopic: 'Doombot Neural Networks'
    };
    smartboardStore.registerDevice(externalDevice);

    // Register external document
    const externalDoc: BoardDocument = {
      id: 'bdoc-external-101',
      institutionId: 'inst-latveria-academy',
      classroomId: 'class-latveria-101',
      classroomName: 'Latveria Hall 1',
      classId: 'class-latveria-101',
      courseCode: 'DOOM-101',
      courseName: 'Advanced Robotics',
      classSessionId: 'session-doom-101',
      teacherId: 'teacher-external-1',
      teacherName: 'Dr. Doom',
      title: 'Doombot Schematics',
      version: 1,
      isReleasedToStudents: true,
      activePageIndex: 0,
      pages: [{ pageId: 'p1', pageIndex: 0, title: 'Draft Page', background: 'dark_grid', elements: [] }],
      timestamps: { createdAt: new Date().toISOString(), lastAutosavedAt: new Date().toISOString() }
    };
    (smartboardStore as any).documents.set(externalDoc.id, externalDoc);

    // Register unreleased private draft document for teacher-1
    const privateDraftDoc: BoardDocument = {
      id: 'bdoc-phys-draft-99',
      institutionId: 'inst-stark-academy',
      classroomId: 'class-phys-301',
      classroomName: 'Physics Lab Hall C-104',
      classId: 'class-phys-301',
      courseCode: 'PHYS-301',
      courseName: 'Advanced Quantum Mechanics',
      classSessionId: 'session-phys-draft-99',
      teacherId: 'teacher-1',
      teacherName: 'Dr. Helen Cho',
      title: 'Secret Exam Solutions & Draft Notes',
      version: 1,
      isReleasedToStudents: false,
      activePageIndex: 0,
      pages: [{ pageId: 'p1', pageIndex: 0, title: 'Exam Solutions', background: 'dark_grid', elements: [{ id: 'e1', type: 'text', text: 'ANSWER KEY: Q1 = 42' }] }],
      timestamps: { createdAt: new Date().toISOString(), lastAutosavedAt: new Date().toISOString() }
    };
    (smartboardStore as any).documents.set(privateDraftDoc.id, privateDraftDoc);

    // Tokens
    const teacherToken = await authService.issueToken(teacher1);
    const unassignedTeacherToken = await authService.issueToken(unassignedTeacher);
    const student1Token = await authService.issueToken(student1);
    const student2Token = await authService.issueToken(student2);
    const parentToken = await authService.issueToken(parent1);
    const principalToken = await authService.issueToken(principal1);
    const adminToken = await authService.issueToken(adminUser);
    const externalTeacherToken = await authService.issueToken(externalTeacher);

    // =========================================================================
    // SECTION 1: AUTHENTICATION INTEGRITY
    // =========================================================================
    console.log('\n--- Section 1: Authentication Integrity ---');

    // Test 1: Anonymous access -> 401
    {
      const res = await fetch(`${baseUrl}/devices`);
      assert.strictEqual(res.status, 401, 'Anonymous access to /devices must return 401');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'UNAUTHENTICATED');
      console.log('[PASS] Test 1: Anonymous board access rejected with 401');
    }

    // Test 2: Forged raw user ID header -> 401
    {
      const res = await fetch(`${baseUrl}/devices`, {
        headers: { Authorization: 'Bearer teacher-1', 'x-user-id': 'teacher-1' }
      });
      assert.strictEqual(res.status, 401, 'Raw user ID header must be rejected');
      console.log('[PASS] Test 2: Raw user ID header strictly rejected with 401');
    }

    // Test 3: Forged role in query / body -> ignored
    {
      const res = await fetch(`${baseUrl}/devices?role=admin&userRole=commander`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(Array.isArray(data.devices));
      console.log('[PASS] Test 3: Forged role in query strictly ignored');
    }

    // =========================================================================
    // SECTION 2: TENANT ISOLATION
    // =========================================================================
    console.log('\n--- Section 2: Institutional Tenant Isolation ---');

    // Test 4: Institution A user accessing Institution B device -> 403
    {
      const res = await fetch(`${baseUrl}/devices/board-external-01`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(res.status, 403, 'Cross-institution device access must return 403');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 4: Cross-institution device access denied with 403');
    }

    // Test 5: Institution A user accessing Institution B document -> 403
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-external-101/document`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(res.status, 403, 'Cross-institution document access must return 403');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 5: Cross-institution document access denied with 403');
    }

    // =========================================================================
    // SECTION 3: DEVICE & HARDWARE CONTROL
    // =========================================================================
    console.log('\n--- Section 3: Device & Hardware Control ---');

    // Test 6: Student attempting hardware pair-code generation -> 403
    {
      const res = await fetch(`${baseUrl}/devices/board-phys-01/pair-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 403, 'Student cannot generate hardware pair-code');
      console.log('[PASS] Test 6: Student hardware pair-code generation denied with 403');
    }

    // Test 7: Parent attempting hardware pair-code generation -> 403
    {
      const res = await fetch(`${baseUrl}/devices/board-phys-01/pair-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${parentToken}` }
      });
      assert.strictEqual(res.status, 403, 'Parent cannot generate hardware pair-code');
      console.log('[PASS] Test 7: Parent hardware pair-code generation denied with 403');
    }

    // Test 8: Principal attempting hardware pair-code generation -> 403 (leadership oversight is read-only)
    {
      const res = await fetch(`${baseUrl}/devices/board-phys-01/pair-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${principalToken}` }
      });
      assert.strictEqual(res.status, 403, 'Principal leadership cannot generate hardware pair-code');
      console.log('[PASS] Test 8: Principal hardware pair-code generation denied with 403');
    }

    // Test 9: Authorized teacher generating pair-code -> 200
    let pairCode = '';
    {
      const res = await fetch(`${baseUrl}/devices/board-phys-01/pair-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(res.status, 200, 'Authorized teacher generates pair code');
      const data = await res.json();
      assert(data.pairCode && typeof data.pairCode === 'string');
      pairCode = data.pairCode;
      console.log('[PASS] Test 9: Authorized teacher generates hardware pair code successfully');
    }

    // Test 9b: Authorized teacher pairs with board using pair code -> 200
    {
      const res = await fetch(`${baseUrl}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
        body: JSON.stringify({ boardId: 'board-phys-01', pairCode, sessionId: 'session-phys-101' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert(data.board.status === 'LIVE' || data.board.status === 'READY');
      assert.strictEqual(data.board.pairingState.isPaired, true);
      assert(data.ticket && typeof data.ticket === 'string');
      console.log('[PASS] Test 9b: Authorized teacher pairs with board successfully');
    }

    // =========================================================================
    // SECTION 4: DOCUMENT AUTHORIZATION & RELEASE STATE
    // =========================================================================
    console.log('\n--- Section 4: Document Authorization & Release State ---');

    // Test 10: Student attempting to read unreleased private teacher draft -> 403
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-phys-draft-99/document`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 403, 'Student must not read unreleased draft');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 10: Student reading private draft strictly denied with 403');
    }

    // Test 11: Student reading released class document -> 200
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-phys-101/document`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 200, 'Student reads released document');
      const data = await res.json();
      assert.strictEqual(data.document.id, 'bdoc-phys-101');
      console.log('[PASS] Test 11: Student reading released document succeeds with 200');
    }

    // Test 12: Student attempting to autosave/edit released document -> 403
    {
      const res = await fetch(`${baseUrl}/documents/bdoc-phys-101/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
        body: JSON.stringify({
          pages: [{ pageId: 'p1', pageIndex: 0, title: 'Tampered', background: 'dark_grid', elements: [] }],
          expectedVersion: 1
        })
      });
      assert.strictEqual(res.status, 403, 'Student cannot edit document');
      console.log('[PASS] Test 12: Student modifying released document denied with 403');
    }

    // Test 13: Authorized teacher reading own private draft -> 200
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-phys-draft-99/document`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(res.status, 200, 'Author teacher reads private draft');
      const data = await res.json();
      assert.strictEqual(data.document.id, 'bdoc-phys-draft-99');
      console.log('[PASS] Test 13: Author teacher reads own private draft successfully');
    }

    // Test 14: Another teacher (unassigned) reading teacher-1's unreleased private draft -> 403
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-phys-draft-99/document`, {
        headers: { Authorization: `Bearer ${unassignedTeacherToken}` }
      });
      assert.strictEqual(res.status, 403, 'Unassigned teacher cannot read private draft of another teacher');
      console.log('[PASS] Test 14: Unassigned teacher accessing private draft denied with 403');
    }

    // =========================================================================
    // SECTION 5: CLASS ENROLLMENT BOUNDARIES
    // =========================================================================
    console.log('\n--- Section 5: Class Enrollment Boundaries ---');

    // Create a separate course and document for CS-401 where student-1 is NOT enrolled
    const csClass = {
      id: 'class-cs-401',
      code: 'CS-401',
      name: 'Advanced Distributed Systems',
      schoolId: 'inst-stark-academy',
      instructorId: 'teacher-cs-1',
      studentIds: ['student-2'] // ONLY student-2 enrolled
    };
    await jarvisData.education.createClass(csClass as any);

    const csDoc: BoardDocument = {
      id: 'bdoc-cs-401',
      institutionId: 'inst-stark-academy',
      classroomId: 'class-cs-401',
      classroomName: 'Turing Hall T-101',
      classId: 'class-cs-401',
      courseCode: 'CS-401',
      courseName: 'Advanced Distributed Systems',
      classSessionId: 'session-cs-401',
      teacherId: 'teacher-cs-1',
      teacherName: 'Prof. Turing',
      title: 'Raft Consensus Protocol Notes',
      version: 1,
      isReleasedToStudents: true,
      activePageIndex: 0,
      pages: [{ pageId: 'p1', pageIndex: 0, title: 'Raft State Machine', background: 'dark_grid', elements: [] }],
      timestamps: { createdAt: new Date().toISOString(), lastAutosavedAt: new Date().toISOString() }
    };
    (smartboardStore as any).documents.set(csDoc.id, csDoc);

    // Test 15: Student-1 (enrolled in PHYS-301, NOT CS-401) accessing released CS-401 doc -> 403
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-cs-401/document`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 403, 'Student not enrolled in CS-401 must be denied access to CS-401 board notes');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
      console.log('[PASS] Test 15: Non-enrolled student accessing released class document denied with 403');
    }

    // Test 16: Student-2 (enrolled in CS-401) accessing released CS-401 doc -> 200
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-cs-401/document`, {
        headers: { Authorization: `Bearer ${student2Token}` }
      });
      assert.strictEqual(res.status, 200, 'Enrolled student accesses CS-401 board notes');
      console.log('[PASS] Test 16: Enrolled student accessing class document succeeds with 200');
    }

    // =========================================================================
    // SECTION 6: DOCUMENT RELEASE & PERSISTENCE
    // =========================================================================
    console.log('\n--- Section 6: Document Release & Persistence ---');

    // Test 17: Unauthorized actor (student) cannot release document -> 403
    {
      const res = await fetch(`${baseUrl}/documents/bdoc-phys-draft-99/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
        body: JSON.stringify({ isReleased: true })
      });
      assert.strictEqual(res.status, 403);
      console.log('[PASS] Test 17: Unauthorized student releasing document denied with 403');
    }

    // Test 18: Authorized teacher releases document -> 200
    {
      const res = await fetch(`${baseUrl}/documents/bdoc-phys-draft-99/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
        body: JSON.stringify({ isReleased: true })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.document.isReleasedToStudents, true);
      console.log('[PASS] Test 18: Authorized teacher releases document successfully');
    }

    // Test 19: Now enrolled student-1 can read previously private draft -> 200
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-phys-draft-99/document`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 200);
      console.log('[PASS] Test 19: Released document now accessible to enrolled student');
    }

    // =========================================================================
    // SECTION 7: CONCURRENCY & AUTOSAVE HARDENING
    // =========================================================================
    console.log('\n--- Section 7: Concurrency & Autosave Hardening ---');

    // Test 20: Matching expectedVersion autosave succeeds and increments version
    {
      const res = await fetch(`${baseUrl}/documents/bdoc-phys-101/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
        body: JSON.stringify({
          title: 'Electrostatics & Faraday-Gauss Updated',
          expectedVersion: 1
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.document.version, 2);
      console.log('[PASS] Test 20: Matching expectedVersion autosave increments version to 2');
    }

    // Test 21: Stale expectedVersion rejected with 409 VERSION_CONFLICT
    {
      const res = await fetch(`${baseUrl}/documents/bdoc-phys-101/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
        body: JSON.stringify({
          title: 'Stale Attempt',
          expectedVersion: 1 // Current is 2
        })
      });
      assert.strictEqual(res.status, 409, 'Stale expectedVersion must return 409');
      const data = await res.json();
      assert.strictEqual(data.error.code, 'VERSION_CONFLICT');
      console.log('[PASS] Test 21: Stale autosave rejected with 409 VERSION_CONFLICT');
    }

    // =========================================================================
    // SECTION 8: VISION & PAIRING TICKET VALIDATION
    // =========================================================================
    console.log('\n--- Section 8: Vision & Pairing Ticket Validation ---');

    // Test 22: Unauthorized user attempting RAG ingest of private document -> 403
    {
      // Un-release the draft first
      await smartboardService.releaseDocument(teacher1, 'bdoc-phys-draft-99', false);

      const res = await fetch(`${baseUrl}/documents/bdoc-phys-draft-99/rag-ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
        body: JSON.stringify({ targetSpaceId: 'ks-quantum' })
      });
      assert.strictEqual(res.status, 403, 'Student cannot ingest unreleased board doc to RAG');
      console.log('[PASS] Test 22: Unauthorized RAG ingest denied with 403');
    }

    // Test 23: Expired board ticket rejected
    {
      const expiredTicketInfo = ticketService.createBoardTicket({
        boardId: 'board-phys-01',
        teacherId: 'teacher-1',
        institutionId: 'inst-stark-academy',
        classroomId: 'class-phys-301',
        classSessionId: 'session-phys-101',
        ttlSeconds: -10 // expired
      });

      let failed = false;
      try {
        await ticketService.verifyBoardTicket(expiredTicketInfo.ticket, 'board-phys-01', 'session-phys-101');
      } catch (err: any) {
        failed = true;
        assert.strictEqual(err.code, 'TICKET_EXPIRED');
      }
      assert(failed, 'Expired board ticket must fail');
      console.log('[PASS] Test 23: Expired board ticket rejected with TICKET_EXPIRED');
    }

    // Test 24: Tampered ticket rejected
    {
      const validTicketInfo = ticketService.createBoardTicket({
        boardId: 'board-phys-01',
        teacherId: 'teacher-1',
        institutionId: 'inst-stark-academy',
        classroomId: 'class-phys-301',
        classSessionId: 'session-phys-101'
      });

      const parts = validTicketInfo.ticket.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({ type: 'smartboard_auth', teacherId: 'user-tony', boardId: 'board-phys-01' })).toString('base64url');
      const tamperedTicket = `${tamperedPayload}.${parts[1]}`;

      let failed = false;
      try {
        await ticketService.verifyBoardTicket(tamperedTicket, 'board-phys-01', 'session-phys-101');
      } catch (err: any) {
        failed = true;
        assert.strictEqual(err.code, 'INVALID_TICKET_SIGNATURE');
      }
      assert(failed, 'Tampered ticket must fail signature verification');
      console.log('[PASS] Test 24: Tampered board ticket rejected with INVALID_TICKET_SIGNATURE');
    }

    // Test 25: Cross-device ticket misuse rejected
    {
      const validTicketInfo = ticketService.createBoardTicket({
        boardId: 'board-phys-01',
        teacherId: 'teacher-1',
        institutionId: 'inst-stark-academy',
        classroomId: 'class-phys-301',
        classSessionId: 'session-phys-101'
      });

      let failed = false;
      try {
        await ticketService.verifyBoardTicket(validTicketInfo.ticket, 'board-chem-01', 'session-phys-101');
      } catch (err: any) {
        failed = true;
        assert.strictEqual(err.code, 'TICKET_BOARD_MISMATCH');
      }
      assert(failed, 'Cross-device ticket misuse must fail');
      console.log('[PASS] Test 25: Cross-device ticket misuse rejected with TICKET_BOARD_MISMATCH');
    }

    // =========================================================================
    // SECTION 9: EXTENDED ADVERSARIAL ATTACK MATRIX
    // =========================================================================
    console.log('\n--- Section 9: Extended Adversarial Attack Matrix ---');

    // Test 26: User with missing/undefined institutionId strictly fails closed with 403
    {
      const tenantlessUser: User = {
        id: 'teacher-no-tenant',
        displayName: 'Ghost Teacher',
        email: 'ghost@nowhere.edu',
        role: 'teacher',
        department: 'Void Studies',
        createdAt: new Date().toISOString()
      };
      await jarvisData.users.create(tenantlessUser);
      const tenantlessToken = await authService.issueToken(tenantlessUser);

      const res = await fetch(`${baseUrl}/devices/board-phys-01`, {
        headers: { Authorization: `Bearer ${tenantlessToken}` }
      });
      assert.strictEqual(res.status, 403, 'Missing tenant context on user must strictly fail closed with 403');
      console.log('[PASS] Test 26: Missing tenant context strictly fails closed with 403');
    }

    // Test 27: Parent accessing unrelated child's class document denied with 403
    {
      const res = await fetch(`${baseUrl}/sessions/bdoc-cs-401/document`, {
        headers: { Authorization: `Bearer ${parentToken}` }
      });
      assert.strictEqual(res.status, 403, 'Parent cannot view document for class where no linked child is enrolled');
      console.log('[PASS] Test 27: Parent accessing unrelated course document denied with 403');
    }

    // Test 28: Principal attempting document mutation denied with 403
    {
      const res = await fetch(`${baseUrl}/documents/bdoc-phys-101/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${principalToken}` },
        body: JSON.stringify({
          title: 'Principal Administrative Override',
          expectedVersion: 2
        })
      });
      assert.strictEqual(res.status, 403, 'Principal leadership is read-only; document mutation must be rejected');
      console.log('[PASS] Test 28: Principal document mutation strictly denied with 403');
    }

    // Test 29: Student attempting isReleasedToStudents: true forgery in autosave body denied with 403
    {
      const res = await fetch(`${baseUrl}/documents/bdoc-phys-draft-99/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
        body: JSON.stringify({
          title: 'Student Tampering',
          isReleasedToStudents: true,
          expectedVersion: 1
        })
      });
      assert.strictEqual(res.status, 403, 'Student cannot tamper with release state via autosave payload');
      console.log('[PASS] Test 29: Student release state tampering in body strictly denied with 403');
    }

    // Test 30: Board history query for non-enrolled class denied with 403
    {
      const res = await fetch(`${baseUrl}/history?classId=class-cs-401`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 403, 'Non-enrolled student cannot access board history for class');
      console.log('[PASS] Test 30: Non-enrolled student querying board history denied with 403');
    }

    // Test 31: Enrolled student querying board history succeeds with 200
    {
      const res = await fetch(`${baseUrl}/history?classId=class-phys-301`, {
        headers: { Authorization: `Bearer ${student1Token}` }
      });
      assert.strictEqual(res.status, 200, 'Enrolled student querying board history succeeds');
      const data = await res.json();
      assert(Array.isArray(data.documents));
      console.log('[PASS] Test 31: Enrolled student querying board history succeeds with 200');
    }

    console.log('\n=== ALL P1-7 SMARTBOARD AUTHORIZATION HARDENING TESTS PASSED (100%) ===');
  } finally {
    try {
      (server as any).closeAllConnections?.();
    } catch {}
    server.close();
  }
}

runSmartboardAuthorizationTests().catch((err) => {
  console.error('\n[FAIL] P1-7 SmartBoard Authorization Test Failure:', err);
  process.exit(1);
});
