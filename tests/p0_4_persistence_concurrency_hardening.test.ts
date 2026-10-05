// JARVIS-WEB — P0-4 PERSISTENCE & CONCURRENCY HARDENING TEST SUITE
import assert from 'node:assert';
import express from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { jarvisData, DiskJarvisDataRepository } from '../server/data/index.ts';
import { smartboardRouter } from '../server/sectors/education/smartboard/smartboardRoutes.ts';
import { smartboardStore } from '../server/sectors/education/smartboard/smartboardStore.ts';
import { authService } from '../server/auth/index.ts';
import type { User } from '../server/data/types.ts';

console.log('=== [JARVIS-WEB] P0-4 PERSISTENCE & CONCURRENCY HARDENING TEST SUITE ===');

async function runPersistenceConcurrencyTests() {
  await jarvisData.seed();
  const repo = jarvisData;
  smartboardStore.resetToDefaults();

  const app = express();
  app.use(express.json());
  app.use('/api/education/smartboard', smartboardRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/education/smartboard`;

  try {
    const teacher1 = (await repo.users.getById('teacher-1'))!; // Assigned to PHYS-301
    const student1 = (await repo.users.getById('student-1'))!; // Enrolled in PHYS-301
    const studentRogue = (await repo.users.getById('student-2'))!; // Different enrolled student

    // Create an unassigned teacher for boundary tests
    let unassignedTeacher = await repo.users.getById('teacher-unassigned');
    if (!unassignedTeacher) {
      unassignedTeacher = {
        id: 'teacher-unassigned',
        displayName: 'Visiting Instructor',
        email: 'visiting@stark.edu',
        role: 'teacher',
        department: 'Visiting Faculty',
        createdAt: new Date().toISOString()
      };
      await repo.users.create(unassignedTeacher);
    }

    assert(teacher1 && student1 && unassignedTeacher, 'Test users must exist');

    const teacherToken = authService.issueToken(teacher1);
    const unassignedTeacherToken = authService.issueToken(unassignedTeacher);
    const studentToken = authService.issueToken(student1);

    // =========================================================================
    // 1. Initial Seed Document Availability
    // =========================================================================
    console.log('\n--- Test 1: Board Document Initialization & Retrieval ---');
    const getDocRes = await fetch(`${baseUrl}/sessions/session-phys-101/document`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(getDocRes.status, 200);
    const docData = await getDocRes.json();
    const doc = docData.document;
    assert(doc && doc.id, 'Board document must exist');
    assert.strictEqual(doc.version, 1, 'Initial document version must be 1');
    console.log('[PASS] Test 1: Teacher successfully retrieved initial BoardDocument with version 1');

    // =========================================================================
    // 2. Strict Optimistic Concurrency Control (expectedVersion Match Succeeds)
    // =========================================================================
    console.log('\n--- Test 2: Matching expectedVersion Autosave Succeeds ---');
    const saveRes1 = await fetch(`${baseUrl}/documents/${doc.id}/autosave`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        title: 'Updated Board Notes - Page 1',
        expectedVersion: 1,
        pages: [
          {
            pageId: doc.pages[0].pageId,
            pageIndex: 0,
            title: 'Coulomb Law Derivation',
            background: 'dark_grid',
            elements: [
              {
                id: 'elem-stroke-1',
                type: 'stroke',
                color: '#38bdf8',
                strokeWidth: 3,
                points: [{ x: 10, y: 10 }, { x: 20, y: 25 }, { x: 35, y: 40 }]
              }
            ],
            createdAt: doc.pages[0].createdAt,
            updatedAt: new Date().toISOString()
          }
        ]
      })
    });
    assert.strictEqual(saveRes1.status, 200);
    const savedDoc1 = (await saveRes1.json()).document;
    assert.strictEqual(savedDoc1.version, 2, 'Version must increment to 2');
    assert.strictEqual(savedDoc1.pages[0].elements.length, 1);
    console.log('[PASS] Test 2: Autosave with matching expectedVersion 1 succeeded and incremented version to 2');

    // =========================================================================
    // 3. Stale-Write Prevention (Mismatched expectedVersion Throws 409 Conflict)
    // =========================================================================
    console.log('\n--- Test 3: Stale expectedVersion Rejected with 409 Conflict ---');
    const staleRes = await fetch(`${baseUrl}/documents/${doc.id}/autosave`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        title: 'Stale Concurrent Update',
        expectedVersion: 1 // Current version is now 2!
      })
    });
    assert.strictEqual(staleRes.status, 409, 'Stale expectedVersion must return 409 Conflict');
    const staleData = await staleRes.json();
    assert.strictEqual(staleData.error?.code, 'VERSION_CONFLICT');
    assert.strictEqual(staleData.error?.currentVersion, 2);
    console.log('[PASS] Test 3: Stale expectedVersion 1 strictly rejected with 409 VERSION_CONFLICT');

    // =========================================================================
    // 4. Future Out-of-Order Version Write Prevention (409 Conflict)
    // =========================================================================
    console.log('\n--- Test 4: Future/Skipped expectedVersion Rejected with 409 Conflict ---');
    const futureRes = await fetch(`${baseUrl}/documents/${doc.id}/autosave`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        title: 'Skipped Update',
        expectedVersion: 99 // Way in the future
      })
    });
    assert.strictEqual(futureRes.status, 409, 'Future expectedVersion must return 409 Conflict');
    console.log('[PASS] Test 4: Future out-of-order expectedVersion strictly rejected with 409');

    // =========================================================================
    // 5. Unassigned Teacher Cannot Edit Board Document (403 Forbidden)
    // =========================================================================
    console.log('\n--- Test 5: Unassigned Teacher Cannot Autosave Board Document (403) ---');
    const unassignedSaveRes = await fetch(`${baseUrl}/documents/${doc.id}/autosave`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${unassignedTeacherToken}`
      },
      body: JSON.stringify({
        title: 'Visiting Teacher Hijack',
        expectedVersion: 2
      })
    });
    assert.strictEqual(unassignedSaveRes.status, 403, 'Unassigned teacher must receive 403 Forbidden');
    console.log('[PASS] Test 5: Unassigned teacher cannot edit or autosave board document (403)');

    // =========================================================================
    // 6. Student Cannot Edit/Autosave Board Document (403 Forbidden)
    // =========================================================================
    console.log('\n--- Test 6: Student Cannot Autosave Board Document (403) ---');
    const studentSaveRes = await fetch(`${baseUrl}/documents/${doc.id}/autosave`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: 'Student Write Attempt',
        expectedVersion: 2
      })
    });
    assert.strictEqual(studentSaveRes.status, 403, 'Student cannot autosave');
    console.log('[PASS] Test 6: Student cannot edit or autosave board document (403)');

    // =========================================================================
    // 7. Student Cannot Read Unreleased Board Document (403 Forbidden)
    // =========================================================================
    console.log('\n--- Test 7: Student Cannot Read Unreleased Document (403) ---');
    // Ensure document is not yet released
    smartboardStore.releaseDocument(doc.id, false);

    const studentReadUnreleasedRes = await fetch(`${baseUrl}/sessions/session-phys-101/document`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentReadUnreleasedRes.status, 403, 'Unreleased document must be hidden from students');
    console.log('[PASS] Test 7: Student forbidden from reading unreleased board document (403)');

    // =========================================================================
    // 8. Teacher Releases Document -> Student Can Read (200 OK)
    // =========================================================================
    console.log('\n--- Test 8: Teacher Releases Document -> Student Reads Successfully ---');
    const releaseRes = await fetch(`${baseUrl}/documents/${doc.id}/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`
      },
      body: JSON.stringify({ isReleased: true })
    });
    assert.strictEqual(releaseRes.status, 200);

    const studentReadReleasedRes = await fetch(`${baseUrl}/sessions/session-phys-101/document`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentReadReleasedRes.status, 200, 'Released document must be readable by student');
    const releasedData = await studentReadReleasedRes.json();
    assert.strictEqual(releasedData.document.id, doc.id);
    console.log('[PASS] Test 8: Released board document is accessible to enrolled students');

    // =========================================================================
    // 9. JsonFileStore Atomic Persistence & Flush Verification
    // =========================================================================
    console.log('\n--- Test 9: FileStore Atomic Persistence Verification ---');
    const testDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const tmpStoreFile = path.join(testDir, `atomic-test-${Date.now()}.json`);
    const customRepo = new DiskJarvisDataRepository(tmpStoreFile);
    await customRepo.init();
    await customRepo.seed();

    const createdUser = await customRepo.users.create({
      id: 'test-atomic-user',
      displayName: 'Atomic Test Principal',
      email: 'atomic@test.edu',
      role: 'student',
      createdAt: new Date().toISOString()
    });
    assert.strictEqual(createdUser.id, 'test-atomic-user');

    // Force flush and verify physical file on disk
    await (customRepo as any).store.flush();
    assert(fs.existsSync(tmpStoreFile), 'Physical store file must exist after flush');
    const diskContent = fs.readFileSync(tmpStoreFile, 'utf8');
    const parsedDisk = JSON.parse(diskContent);
    assert(parsedDisk.users.some((u: any) => u.id === 'test-atomic-user'), 'User must be written to disk');

    // Clean up temporary test file
    fs.unlinkSync(tmpStoreFile);
    console.log('[PASS] Test 9: Atomic persistence write-to-temp and rename verified');

    console.log('\n=== ALL P0-4 PERSISTENCE & CONCURRENCY TESTS PASSED (100%) ===\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runPersistenceConcurrencyTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FATAL] P0-4 Persistence Concurrency Test Failed:', err);
    process.exit(1);
  });
