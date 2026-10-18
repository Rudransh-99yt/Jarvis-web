import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { startHttpHarness } from './httpHarness.ts';
import {
  ALL_DATABASE_COLLECTIONS,
  assertAllCollectionsCovered,
  verifyOperatorSecret,
  takeImmutableSnapshot,
  streamDatabaseExport,
  generateStorageManifest,
  computeFileSha256,
  ExportPayloadLimitExceededError
} from '../server/export/exportService.ts';
import { signAuthPayload } from '../server/auth/tokens.ts';
import {
  jarvisData,
  DiskJarvisDataRepository,
  setActiveRepository,
  resetActiveRepository
} from '../server/data/index.ts';
import type { DatabaseSchema } from '../server/data/types.ts';

async function runSecureExportTests() {
  console.log('=== [STAGE 6.4.4.16] SECURE EXPORT & SCHEMA INTEGRITY TESTS ===\n');

  const isolatedTempDir = path.resolve(process.cwd(), 'tmp', `test-secure-export-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(isolatedTempDir, { recursive: true });
  const isolatedDbFile = path.join(isolatedTempDir, 'secure-export-db.json');
  const isolatedRepo = new DiskJarvisDataRepository(isolatedDbFile);
  await isolatedRepo.init();
  await isolatedRepo.seed();
  setActiveRepository(isolatedRepo);

  const harness = await startHttpHarness();

  try {
    // -------------------------------------------------------------------------
    // 1. Machine-Checkable Assertion: Complete Schema Coverage (All 45 Collections)
    // -------------------------------------------------------------------------
    console.log('--- 1. Machine-Checkable Complete Schema Coverage (45 Collections) ---');
    {
      assert.strictEqual(ALL_DATABASE_COLLECTIONS.length, 45, 'Must contain exactly 45 database collections');
      const isComplete = assertAllCollectionsCovered(ALL_DATABASE_COLLECTIONS);
      assert.strictEqual(isComplete, true, 'Every collection in DatabaseSchema must be included');

      // Verify each collection key exists as a field in current database state
      const currentState = jarvisData.getState();
      for (const colName of ALL_DATABASE_COLLECTIONS) {
        assert.ok(
          colName in currentState,
          `Collection '${colName}' must exist in DatabaseSchema state snapshot`
        );
      }
      console.log('  [PASS] All 45 DatabaseSchema array collections verified machine-checkably');
    }

    // -------------------------------------------------------------------------
    // 2. Authorization Rejection: Unauthenticated, Expired, & Non-Admin Roles
    // -------------------------------------------------------------------------
    console.log('--- 2. Authorization Rejection: Unauthenticated & Non-Admin Roles ---');
    {
      // A. Unauthenticated request (no token) -> 401
      const unauthRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`);
      assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must be rejected with 401');
      const unauthJson = await unauthRes.json();
      assert.strictEqual(unauthJson.error?.code, 'UNAUTHENTICATED');

      // B. Expired token -> 401
      const expiredToken = signAuthPayload({
        sub: 'user-tony',
        iat: Date.now() - 60000,
        exp: Date.now() - 1000,
        jti: 'expired-test-jti'
      });
      const expiredRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      assert.strictEqual(expiredRes.status, 401, 'Expired token must be rejected with 401');
      const expiredJson = await expiredRes.json();
      assert.strictEqual(expiredJson.error?.code, 'INVALID_CREDENTIALS');

      // C. Corrupted signature token -> 401
      const corruptToken = expiredToken.slice(0, -6) + 'corrupt';
      const corruptRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${corruptToken}` }
      });
      assert.strictEqual(corruptRes.status, 401, 'Corrupted signature must be rejected with 401');

      // D. Authenticated as student ('student-1') -> 403 on stream, manifest, and objects
      const studentToken = await harness.tokenFor('student-1');
      const studentRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(studentRes.status, 403, 'Student access must be rejected with 403');
      const studentJson = await studentRes.json();
      assert.strictEqual(studentJson.error?.code, 'FORBIDDEN');
      assert.ok(studentJson.error?.message?.includes('Role'));

      const studentManifestRes = await fetch(`${harness.baseUrl}/api/internal/export/storage-manifest`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(studentManifestRes.status, 403, 'Student cannot view storage manifest');

      const studentObjectRes = await fetch(`${harness.baseUrl}/api/internal/export/storage-objects/any-key.bin`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      assert.strictEqual(studentObjectRes.status, 403, 'Student cannot download internal storage objects');

      // E. Authenticated as teacher ('teacher-1') -> 403
      const teacherToken = await harness.tokenFor('teacher-1');
      const teacherRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      assert.strictEqual(teacherRes.status, 403, 'Teacher access must be rejected with 403');
      const teacherJson = await teacherRes.json();
      assert.strictEqual(teacherJson.error?.code, 'FORBIDDEN');
      console.log('  [PASS] Unauthenticated (401), expired (401), student (403), and teacher (403) requests rejected strictly');
    }

    // -------------------------------------------------------------------------
    // 3. Operator Secret Verification & Constant-Time Fail-Closed Logic
    // -------------------------------------------------------------------------
    console.log('--- 3. Dedicated Operator Secret & Timing-Safe Verification ---');
    {
      const validSecret = 'operator-migration-secret-key-at-least-32-chars-long';
      const shortSecret = 'too-short';

      // Short secret validation fails closed
      const shortCheck = verifyOperatorSecret('some-secret', shortSecret);
      assert.strictEqual(shortCheck.valid, false);
      assert.ok(shortCheck.reason?.includes('32 characters'));

      // Missing provided secret fails closed
      const missingCheck = verifyOperatorSecret(null, validSecret);
      assert.strictEqual(missingCheck.valid, false);
      assert.ok(missingCheck.reason?.includes('Missing'));

      // Invalid secret fails closed
      const mismatchCheck = verifyOperatorSecret('wrong-secret-that-does-not-match-at-all-32-chars', validSecret);
      assert.strictEqual(mismatchCheck.valid, false);
      assert.strictEqual(mismatchCheck.reason, 'Invalid operator secret.');

      // Valid secret matches via timingSafeEqual
      const validCheck = verifyOperatorSecret(validSecret, validSecret);
      assert.strictEqual(validCheck.valid, true);

      // HTTP endpoint test with configured operator secret
      process.env.INTERNAL_EXPORT_SECRET = validSecret;
      const adminToken = await harness.tokenFor('user-tony');

      // Request without secret header -> 403
      const noSecretRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(noSecretRes.status, 403, 'Missing secret header must return 403');

      // Request with wrong secret header -> 403
      const badSecretRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Operator-Secret': 'wrong-operator-secret-length-32-characters-long!!'
        }
      });
      assert.strictEqual(badSecretRes.status, 403, 'Incorrect secret header must return 403');

      // Clean up test env
      delete process.env.INTERNAL_EXPORT_SECRET;
      console.log('  [PASS] Operator secret length checking, fail-closed semantics, and constant-time matching verified');
    }

    // -------------------------------------------------------------------------
    // 4. Complete Schema Export Streaming & Checksums
    // -------------------------------------------------------------------------
    console.log('--- 4. Complete Schema Export Streaming & Checksums ---');
    {
      const adminToken = await harness.tokenFor('user-tony');
      const exportRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.strictEqual(exportRes.status, 200);
      assert.strictEqual(exportRes.headers.get('content-type'), 'application/json; charset=utf-8');
      assert.strictEqual(exportRes.headers.get('x-export-schema-version'), '2');

      const rawExportText = await exportRes.text();
      assert.ok(rawExportText.length > 1000, 'Export stream payload must contain substantial data');

      const exportData = JSON.parse(rawExportText);
      assert.ok(exportData.exportId?.startsWith('exp-'));
      assert.ok(exportData.exportedAt);
      assert.strictEqual(exportData.schemaVersion, 2);
      assert.ok(exportData.meta);
      assert.ok(exportData.collectionCounts);
      assert.ok(exportData.collections);
      assert.ok(exportData.collectionChecksums);
      assert.ok(exportData.overallChecksum);

      // Verify all 45 collections are present in exportData.collections
      for (const colName of ALL_DATABASE_COLLECTIONS) {
        assert.ok(
          colName in exportData.collections,
          `Collection '${colName}' must be present in exported payload`
        );
        const colItems = exportData.collections[colName];
        assert.ok(Array.isArray(colItems), `'${colName}' must be an array`);

        // Check count matches manifest count
        const recordedCount = exportData.collectionCounts[colName];
        assert.strictEqual(colItems.length, recordedCount, `Count mismatch for ${colName}`);

        // Check per-collection SHA-256 checksum
        const hasher = crypto.createHash('sha256');
        for (const item of colItems) {
          hasher.update(JSON.stringify(item));
        }
        const expectedChecksum = hasher.digest('hex');
        assert.strictEqual(
          exportData.collectionChecksums[colName],
          expectedChecksum,
          `Checksum mismatch for collection ${colName}`
        );
      }
      console.log('  [PASS] Full database streamed; all 45 collections validated with exact counts and SHA-256 hashes');
    }

    // -------------------------------------------------------------------------
    // 5. Binary Storage Manifest & Object Download
    // -------------------------------------------------------------------------
    console.log('--- 5. Binary Storage Manifest & Object Stream Verification ---');
    {
      const adminToken = await harness.tokenFor('user-tony');
      const storageDir = path.resolve(process.cwd(), 'data', 'storage', 'objects');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      // Create a test binary object
      const testKey = `test-export-blob-${Date.now()}.bin`;
      const testFilePath = path.join(storageDir, testKey);
      const testData = Buffer.from('JARVIS_CANONICAL_MIGRATION_BINARY_PAYLOAD_TEST_DATA', 'utf8');
      const testSha256 = crypto.createHash('sha256').update(testData).digest('hex');
      fs.writeFileSync(testFilePath, testData);

      try {
        // Request manifest
        const manifestRes = await fetch(`${harness.baseUrl}/api/internal/export/storage-manifest`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(manifestRes.status, 200);
        const manifest = await manifestRes.json();

        assert.strictEqual(manifest.manifestVersion, 1);
        assert.ok(manifest.totalObjects >= 1);
        assert.ok(manifest.manifestChecksum);

        const found = manifest.objects.find((o: any) => o.storageKey === testKey);
        assert.ok(found, `Test binary object ${testKey} must be in manifest`);
        assert.strictEqual(found.sizeBytes, testData.length);
        assert.strictEqual(found.sha256, testSha256);

        // Request specific object stream
        const objectRes = await fetch(`${harness.baseUrl}/api/internal/export/storage-objects/${testKey}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(objectRes.status, 200);
        assert.strictEqual(objectRes.headers.get('content-length'), String(testData.length));
        assert.strictEqual(objectRes.headers.get('x-sha256-checksum'), testSha256);

        const downloadedBuffer = Buffer.from(await objectRes.arrayBuffer());
        assert.deepStrictEqual(downloadedBuffer, testData);

        // Non-existent object returns 404
        const notFoundRes = await fetch(`${harness.baseUrl}/api/internal/export/storage-objects/missing-file-that-does-not-exist.bin`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(notFoundRes.status, 404, 'Non-existent storage key must return 404');

        // Path traversal rejection check
        const traversalRes = await fetch(`${harness.baseUrl}/api/internal/export/storage-objects/..%2F..%2Fpackage.json`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(traversalRes.status === 400 || traversalRes.status === 404, true);

        // Large binary object test (1 MB bounded streaming)
        const largeKey = `test-large-blob-${Date.now()}.bin`;
        const largeFilePath = path.join(storageDir, largeKey);
        const largeData = Buffer.alloc(1024 * 1024, 0x42); // 1 MB buffer
        fs.writeFileSync(largeFilePath, largeData);
        try {
          const largeSha256 = await computeFileSha256(largeFilePath);
          const largeExpectedSha = crypto.createHash('sha256').update(largeData).digest('hex');
          assert.strictEqual(largeSha256, largeExpectedSha, 'Streaming SHA-256 must match digest');

          const largeStreamRes = await fetch(`${harness.baseUrl}/api/internal/export/storage-objects/${largeKey}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          assert.strictEqual(largeStreamRes.status, 200);
          assert.strictEqual(largeStreamRes.headers.get('content-length'), String(largeData.length));
          assert.strictEqual(largeStreamRes.headers.get('x-sha256-checksum'), largeSha256);
        } finally {
          if (fs.existsSync(largeFilePath)) fs.unlinkSync(largeFilePath);
        }
      } finally {
        // Cleanup test binary object
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
      console.log('  [PASS] Storage manifest generated with exact sizes/hashes and binary streaming verified');
    }

    // -------------------------------------------------------------------------
    // 6. Bounded Streaming & Payload Limits
    // -------------------------------------------------------------------------
    console.log('--- 6. Bounded Streaming Safety Limit Enforcement ---');
    {
      const adminToken = await harness.tokenFor('user-tony');
      // Request export with tiny maxBytes = 50 bytes (safety ceiling exceeded)
      let abortedOrRejected = false;
      let rawTruncatedText = '';
      try {
        const limitedRes = await fetch(`${harness.baseUrl}/api/internal/export/stream?maxBytes=50`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (limitedRes.status === 413) {
          abortedOrRejected = true;
          const errorJson = await limitedRes.json();
          assert.strictEqual(errorJson.error?.code, 'PAYLOAD_TOO_LARGE');
        } else {
          rawTruncatedText = await limitedRes.text();
        }
      } catch {
        // Server socket closed / aborted midway due to safety limit
        abortedOrRejected = true;
      }

      assert.strictEqual(abortedOrRejected, true, 'Stream exceeding payload limit must abort or return 413');

      // Verify that if any partial bytes were received, they cannot be mistaken for a valid backup
      if (rawTruncatedText.length > 0) {
        assert.throws(() => JSON.parse(rawTruncatedText), 'Truncated payload must fail JSON parsing');
        assert.ok(!rawTruncatedText.includes('"overallChecksum"'), 'Incomplete export must not include overallChecksum');
      }

      // Verify client disconnect / destroyed stream handling in writeWithDrain
      const { PassThrough } = await import('node:stream');
      const mockStream = new PassThrough();
      const snapshot = takeImmutableSnapshot(jarvisData.getState());
      mockStream.destroy(); // Prematurely destroyed stream
      await assert.rejects(
        async () => {
          await streamDatabaseExport(snapshot, mockStream);
        },
        /closed|destroyed/i,
        'streamDatabaseExport must cleanly reject when stream is destroyed'
      );

      console.log('  [PASS] Bounded streaming safely enforces payload size limits and incomplete backup detection');
    }

    // -------------------------------------------------------------------------
    // 7. Concurrent Writes & Point-in-Time Snapshot Consistency
    // -------------------------------------------------------------------------
    console.log('--- 7. Concurrent Writes & Point-in-Time Snapshot Consistency ---');
    {
      // A. Concurrent non-transactional mutation
      const currentState = jarvisData.getState();
      const snapshot = takeImmutableSnapshot(currentState);

      const concurrentUser = {
        id: `user-concurrent-${Date.now()}`,
        displayName: 'Concurrent Test User',
        email: 'concurrent@stark.test',
        role: 'student' as const,
        createdAt: new Date().toISOString()
      };
      await jarvisData.users.create(concurrentUser);

      // Verify the new user is in the live repository
      const liveUsers = await jarvisData.users.list();
      assert.ok(liveUsers.some((u) => u.id === concurrentUser.id));

      // Verify the new user is NOT in the frozen snapshot
      assert.ok(
        !snapshot.users.some((u) => u.id === concurrentUser.id),
        'Frozen snapshot must NOT be affected by subsequent concurrent writes'
      );

      // B. Concurrent in-flight transactional write isolation
      const txUserId = `user-tx-uncommitted-${Date.now()}`;
      let resolveTx: () => void;
      const txPausedPromise = new Promise<void>((resolve) => { resolveTx = resolve; });
      let txStartedResolve: () => void;
      const txStartedPromise = new Promise<void>((resolve) => { txStartedResolve = resolve; });

      const txPromise = jarvisData.runTransaction(async (txRepo) => {
        await txRepo.users.create({
          id: txUserId,
          displayName: 'Uncommitted Transaction User',
          email: 'uncommitted@stark.test',
          role: 'student',
          createdAt: new Date().toISOString()
        });
        txStartedResolve();
        await txPausedPromise;
      });

      await txStartedPromise;

      // An external HTTP export request arrives while transaction is still paused/in-flight:
      const adminToken = await harness.tokenFor('user-tony');
      const streamRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(streamRes.status, 200);
      const streamText = await streamRes.text();
      const exportJson = JSON.parse(streamText);

      // Verify the uncommitted user is NOT in the export taken while transaction is in-flight:
      assert.ok(
        !exportJson.collections.users.some((u: any) => u.id === txUserId),
        'External export taken during active transaction must NOT see uncommitted working state'
      );

      // Now allow transaction to commit:
      resolveTx!();
      await txPromise;

      // Now request another export after commit:
      const postCommitRes = await fetch(`${harness.baseUrl}/api/internal/export/stream`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(postCommitRes.status, 200);
      const postCommitJson = JSON.parse(await postCommitRes.text());
      assert.ok(
        postCommitJson.collections.users.some((u: any) => u.id === txUserId),
        'Export taken after transaction commit must see committed user'
      );

      // C. Transaction rollback isolation
      const rollbackUserId = `user-rollback-${Date.now()}`;
      try {
        await jarvisData.runTransaction(async (txRepo) => {
          await txRepo.users.create({
            id: rollbackUserId,
            displayName: 'Rolled Back User',
            email: 'rollback@stark.test',
            role: 'student',
            createdAt: new Date().toISOString()
          });
          throw new Error('Simulated rollback trigger');
        });
      } catch (err: any) {
        assert.ok(err.message.includes('Simulated rollback trigger'));
      }

      const postRollbackSnapshot = takeImmutableSnapshot(jarvisData.getState());
      assert.ok(
        !postRollbackSnapshot.users.some((u: any) => u.id === rollbackUserId),
        'Snapshot after transaction rollback must NOT contain rolled-back user'
      );

      // D. Nested transaction (savepoint) isolation
      const outerUserId = `user-nested-outer-${Date.now()}`;
      const innerUserId = `user-nested-inner-${Date.now()}`;

      await jarvisData.runTransaction(async (outerRepo) => {
        await outerRepo.users.create({
          id: outerUserId,
          displayName: 'Outer Tx User',
          email: 'outer@stark.test',
          role: 'student',
          createdAt: new Date().toISOString()
        });

        // Nested transaction that fails
        try {
          await outerRepo.runTransaction(async (innerRepo) => {
            await innerRepo.users.create({
              id: innerUserId,
              displayName: 'Inner Tx User',
              email: 'inner@stark.test',
              role: 'student',
              createdAt: new Date().toISOString()
            });
            throw new Error('Inner transaction failure');
          });
        } catch {
          // Expected inner failure caught by outer
        }
      });

      const postNestedSnapshot = takeImmutableSnapshot(jarvisData.getState());
      assert.ok(
        postNestedSnapshot.users.some((u: any) => u.id === outerUserId),
        'Outer committed user must exist in snapshot'
      );
      assert.ok(
        !postNestedSnapshot.users.some((u: any) => u.id === innerUserId),
        'Inner rolled-back user must NOT exist in snapshot'
      );

      console.log('  [PASS] Snapshot consistency strictly maintained against concurrent writes, active transactions, rollbacks, and nested savepoints');
    }

    console.log('\n=== ALL SECURE EXPORT & SCHEMA INTEGRITY TESTS PASSED (7/7) ===\n');
  } finally {
    try {
      await harness.close();
    } finally {
      resetActiveRepository();
      if (isolatedTempDir && fs.existsSync(isolatedTempDir)) {
        fs.rmSync(isolatedTempDir, { recursive: true, force: true });
      }
    }
  }
}

runSecureExportTests().catch((err) => {
  console.error('[FAIL] Secure Export Test Failed:', err);
  process.exit(1);
});
