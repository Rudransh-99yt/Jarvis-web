// Stage 6.4.4.19 Deterministic Recovery, Backup Bundle, and Restore Validation Tests
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createBackupBundle,
  assertSafeStorageKey,
  streamCopyAndHash
} from '../scripts/backup_bundle.ts';
import {
  validateBackupBundle,
  restoreBackupBundle
} from '../scripts/restore.ts';
import { INITIAL_DATABASE_SCHEMA } from '../server/data/seedData.ts';
import type { DatabaseSchema, FileRecord } from '../server/data/types.ts';
import { ALL_DATABASE_COLLECTIONS } from '../server/export/exportService.ts';

async function runRecoveryTests() {
  console.log('=== [STAGE 6.4.4.19] OFFLINE BACKUP BUNDLE & RESTORE RECOVERY TESTS ===\n');

  const testRoot = path.resolve(process.cwd(), 'tmp', `test-recovery-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(testRoot, { recursive: true });

  try {
    // Setup synthetic source database and storage fixtures
    const srcDir = path.join(testRoot, 'source');
    fs.mkdirSync(srcDir, { recursive: true });
    const srcDbFile = path.join(srcDir, 'jarvis-db.json');
    const srcStorageDir = path.join(srcDir, 'storage', 'objects');
    fs.mkdirSync(srcStorageDir, { recursive: true });

    // 1. Create a synthetic test file fixture (small)
    const smallBlobKey = 'doc-test-intro.pdf';
    const smallBlobPath = path.join(srcStorageDir, smallBlobKey);
    const smallBlobContent = Buffer.from('%PDF-1.4\nSynthetic test PDF document for recovery testing.\n%%EOF', 'utf8');
    const smallBlobSha = crypto.createHash('sha256').update(smallBlobContent).digest('hex');
    fs.writeFileSync(smallBlobPath, smallBlobContent);

    // 2. Create a synthetic large binary file fixture (2 MB)
    const largeBlobKey = 'large-asset-video-1080p.bin';
    const largeBlobPath = path.join(srcStorageDir, largeBlobKey);
    const largeBlobContent = Buffer.alloc(2 * 1024 * 1024, 0x5a); // 2 MB of 0x5a ('Z')
    const largeBlobSha = crypto.createHash('sha256').update(largeBlobContent).digest('hex');
    fs.writeFileSync(largeBlobPath, largeBlobContent);

    // 3. Assemble synthetic database schema with active FileRecords referencing the two objects
    const syntheticDb: DatabaseSchema = JSON.parse(JSON.stringify(INITIAL_DATABASE_SCHEMA));
    const smallFileRecord: FileRecord = {
      id: 'file-small-001',
      workspaceId: 'ws-stark-core',
      ownerUserId: 'user-tony',
      originalName: 'intro-guide.pdf',
      storageKey: smallBlobKey,
      mimeType: 'application/pdf',
      sizeBytes: smallBlobContent.length,
      extension: 'pdf',
      sha256: smallBlobSha,
      status: 'ready',
      downloadCount: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const largeFileRecord: FileRecord = {
      id: 'file-large-002',
      workspaceId: 'ws-stark-core',
      ownerUserId: 'user-tony',
      originalName: 'lecture-recording.mp4',
      storageKey: largeBlobKey,
      mimeType: 'video/mp4',
      sizeBytes: largeBlobContent.length,
      extension: 'mp4',
      sha256: largeBlobSha,
      status: 'ready',
      downloadCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    syntheticDb.files = [smallFileRecord, largeFileRecord];
    fs.writeFileSync(srcDbFile, JSON.stringify(syntheticDb, null, 2), 'utf8');

    // -------------------------------------------------------------------------
    // TEST 1: Valid Bundle Creation & Dry-Run / Full Restore
    // -------------------------------------------------------------------------
    console.log('--- 1. Valid Bundle Creation and Complete Restore into Target ---');
    const bundleDir = path.join(testRoot, 'backup-bundle-1');
    const bundleRes = await createBackupBundle({
      outDir: bundleDir,
      dbFile: srcDbFile,
      storageDir: srcStorageDir,
      bundleId: 'test-bundle-valid-001'
    });

    assert.strictEqual(bundleRes.success, true);
    assert.strictEqual(bundleRes.manifest.bundleFormatVersion, 1);
    assert.strictEqual(bundleRes.manifest.schemaVersion, 2);
    assert.strictEqual(bundleRes.manifest.storage.totalObjects, 2);
    assert.strictEqual(bundleRes.manifest.storage.totalSizeBytes, smallBlobContent.length + largeBlobContent.length);

    // Validate bundle
    const valRes = await validateBackupBundle(bundleDir);
    assert.strictEqual(valRes.valid, true, 'Valid bundle must pass all validation checks');
    assert.strictEqual(valRes.errors.length, 0);

    // Test Dry-Run Restore (nothing should be written)
    const targetDir = path.join(testRoot, 'restored-target');
    const dryRunRes = await restoreBackupBundle({
      bundlePath: bundleDir,
      targetDir,
      dryRun: true
    });
    assert.strictEqual(dryRunRes.success, true);
    assert.strictEqual(dryRunRes.dryRun, true);
    assert.strictEqual(fs.existsSync(targetDir), false, 'Dry-run restore must write zero files');

    // Test Real Restore Execution
    const realRestoreRes = await restoreBackupBundle({
      bundlePath: bundleDir,
      targetDir,
      dryRun: false
    });
    assert.strictEqual(realRestoreRes.success, true);
    assert.strictEqual(realRestoreRes.dryRun, false);
    assert.strictEqual(realRestoreRes.restoredCollections, ALL_DATABASE_COLLECTIONS.length);
    assert.strictEqual(realRestoreRes.restoredObjects, 2);

    // Verify restored database file
    const restoredDbFile = path.join(targetDir, 'jarvis-db.json');
    assert.strictEqual(fs.existsSync(restoredDbFile), true);
    const restoredDb = JSON.parse(fs.readFileSync(restoredDbFile, 'utf8'));
    assert.strictEqual(restoredDb.files.length, 2);
    assert.strictEqual(restoredDb.files[0].id, 'file-small-001');
    assert.strictEqual(restoredDb.files[1].id, 'file-large-002');
    assert.strictEqual(restoredDb.files[0].downloadCount, 5, 'Exact metadata counters must be preserved');

    // Verify restored binary objects are byte-identical
    const restoredSmallBlob = fs.readFileSync(path.join(targetDir, 'storage', 'objects', smallBlobKey));
    assert.deepStrictEqual(restoredSmallBlob, smallBlobContent);
    const restoredLargeBlob = fs.readFileSync(path.join(targetDir, 'storage', 'objects', largeBlobKey));
    assert.deepStrictEqual(restoredLargeBlob, largeBlobContent);
    console.log('  [PASS] Valid bundle created, validated, dry-run executed, and restored byte-identically');

    // -------------------------------------------------------------------------
    // TEST 2: Missing and Corrupt Binary Objects
    // -------------------------------------------------------------------------
    console.log('--- 2. Detection of Missing and Corrupted Binary Objects ---');
    // A. Missing physical object in bundle
    const corruptMissingDir = path.join(testRoot, 'bundle-missing-object');
    fs.cpSync(bundleDir, corruptMissingDir, { recursive: true });
    fs.unlinkSync(path.join(corruptMissingDir, 'objects', smallBlobKey));
    const missingVal = await validateBackupBundle(corruptMissingDir);
    assert.strictEqual(missingVal.valid, false, 'Bundle with missing binary object must fail validation');
    assert.ok(missingVal.errors.some((e) => e.includes('missing from bundle')));

    // B. Corrupt binary object content
    const corruptTamperedDir = path.join(testRoot, 'bundle-tampered-object');
    fs.cpSync(bundleDir, corruptTamperedDir, { recursive: true });
    fs.writeFileSync(path.join(corruptTamperedDir, 'objects', smallBlobKey), 'CORRUPTED_BYTES');
    const tamperedVal = await validateBackupBundle(corruptTamperedDir);
    assert.strictEqual(tamperedVal.valid, false, 'Bundle with tampered object must fail validation');
    assert.ok(tamperedVal.errors.some((e) => e.includes('Corrupted binary object')));

    // C. Missing object during bundle creation (active record points to non-existent file)
    const incompleteSrcDir = path.join(testRoot, 'src-incomplete');
    fs.cpSync(srcDir, incompleteSrcDir, { recursive: true });
    fs.unlinkSync(path.join(incompleteSrcDir, 'storage', 'objects', smallBlobKey));
    await assert.rejects(
      async () => {
        await createBackupBundle({
          outDir: path.join(testRoot, 'bundle-should-fail'),
          dbFile: path.join(incompleteSrcDir, 'jarvis-db.json'),
          storageDir: path.join(incompleteSrcDir, 'storage', 'objects')
        });
      },
      /Incomplete backup detected/i,
      'createBackupBundle must refuse to create an incomplete bundle'
    );
    console.log('  [PASS] Missing and corrupted binary objects detected strictly');

    // -------------------------------------------------------------------------
    // TEST 3: Incorrect Collection and Overall Checksums
    // -------------------------------------------------------------------------
    console.log('--- 3. Checksum Verification & Tamper Detection ---');
    // A. Tamper with a collection record inside database_export.json
    const corruptChecksumDir = path.join(testRoot, 'bundle-tampered-collection');
    fs.cpSync(bundleDir, corruptChecksumDir, { recursive: true });
    const exportFile = path.join(corruptChecksumDir, 'database_export.json');
    const exportJson = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    exportJson.collections.users[0].displayName = 'Tampered Tony Stark';
    fs.writeFileSync(exportFile, JSON.stringify(exportJson, null, 2), 'utf8');

    // Update the file size/sha in manifest to isolate the collection checksum error
    const newSha = crypto.createHash('sha256').update(fs.readFileSync(exportFile)).digest('hex');
    const manifestJson = JSON.parse(fs.readFileSync(path.join(corruptChecksumDir, 'bundle_manifest.json'), 'utf8'));
    manifestJson.database.byteSize = fs.statSync(exportFile).size;
    manifestJson.database.sha256 = newSha;
    // Recompute manifest checksum so manifest itself passes
    delete manifestJson.manifestChecksum;
    manifestJson.manifestChecksum = crypto.createHash('sha256').update(JSON.stringify(manifestJson)).digest('hex');
    fs.writeFileSync(path.join(corruptChecksumDir, 'bundle_manifest.json'), JSON.stringify(manifestJson, null, 2), 'utf8');

    const colCheckVal = await validateBackupBundle(corruptChecksumDir);
    assert.strictEqual(colCheckVal.valid, false, 'Tampered collection must fail validation');
    assert.ok(colCheckVal.errors.some((e) => e.includes('Checksum mismatch for collection "users"')));
    console.log('  [PASS] Collection and overall checksum tampering detected');

    // -------------------------------------------------------------------------
    // TEST 4: Invalid Schema Versions & Format Versions
    // -------------------------------------------------------------------------
    console.log('--- 4. Schema Version and Bundle Format Verification ---');
    const invalidVerDir = path.join(testRoot, 'bundle-invalid-version');
    fs.cpSync(bundleDir, invalidVerDir, { recursive: true });
    const verManifest = JSON.parse(fs.readFileSync(path.join(invalidVerDir, 'bundle_manifest.json'), 'utf8'));
    verManifest.bundleFormatVersion = 999;
    delete verManifest.manifestChecksum;
    verManifest.manifestChecksum = crypto.createHash('sha256').update(JSON.stringify(verManifest)).digest('hex');
    fs.writeFileSync(path.join(invalidVerDir, 'bundle_manifest.json'), JSON.stringify(verManifest, null, 2), 'utf8');

    const verVal = await validateBackupBundle(invalidVerDir);
    assert.strictEqual(verVal.valid, false);
    assert.ok(verVal.errors.some((e) => e.includes('Unsupported bundleFormatVersion')));
    console.log('  [PASS] Unsupported bundle format versions rejected');

    // -------------------------------------------------------------------------
    // TEST 5: Path Traversal and Duplicate Archive Entries
    // -------------------------------------------------------------------------
    console.log('--- 5. Path Traversal & Unsafe Key Defense ---');
    // A. Traversal storage keys
    assert.throws(() => assertSafeStorageKey('../outside.bin'), /Directory traversal/);
    assert.throws(() => assertSafeStorageKey('/etc/passwd'), /Directory traversal/);
    assert.throws(() => assertSafeStorageKey('nested/dir/key.bin'), /Directory traversal/);
    assert.throws(() => assertSafeStorageKey('null\0byte.bin'), /Directory traversal/);
    assert.throws(() => assertSafeStorageKey('evil$special*.bin'), /invalid characters/);

    // B. Path traversal in manifest relativePath
    const traversalDir = path.join(testRoot, 'bundle-traversal-manifest');
    fs.cpSync(bundleDir, traversalDir, { recursive: true });
    const travManifest = JSON.parse(fs.readFileSync(path.join(traversalDir, 'bundle_manifest.json'), 'utf8'));
    travManifest.storage.objects[0].relativePath = '../../outside.bin';
    delete travManifest.manifestChecksum;
    travManifest.manifestChecksum = crypto.createHash('sha256').update(JSON.stringify(travManifest)).digest('hex');
    fs.writeFileSync(path.join(traversalDir, 'bundle_manifest.json'), JSON.stringify(travManifest, null, 2), 'utf8');

    const travVal = await validateBackupBundle(traversalDir);
    assert.strictEqual(travVal.valid, false);
    assert.ok(travVal.errors.some((e) => e.includes('Directory traversal attempt')));

    // C. Duplicate storage key in manifest
    const dupDir = path.join(testRoot, 'bundle-duplicate-keys');
    fs.cpSync(bundleDir, dupDir, { recursive: true });
    const dupManifest = JSON.parse(fs.readFileSync(path.join(dupDir, 'bundle_manifest.json'), 'utf8'));
    dupManifest.storage.objects.push({ ...dupManifest.storage.objects[0] });
    delete dupManifest.manifestChecksum;
    dupManifest.manifestChecksum = crypto.createHash('sha256').update(JSON.stringify(dupManifest)).digest('hex');
    fs.writeFileSync(path.join(dupDir, 'bundle_manifest.json'), JSON.stringify(dupManifest, null, 2), 'utf8');

    const dupVal = await validateBackupBundle(dupDir);
    assert.strictEqual(dupVal.valid, false);
    assert.ok(dupVal.errors.some((e) => e.includes('Duplicate storage key')));
    console.log('  [PASS] Path traversal and duplicate archive entries rejected strictly');

    // -------------------------------------------------------------------------
    // TEST 6: Interrupted Bundle Cleanup & Incomplete Bundles
    // -------------------------------------------------------------------------
    console.log('--- 6. Interrupted Bundle Staging Cleanup & Incomplete Bundles ---');
    const brokenDestDir = path.join(testRoot, 'broken-bundle-out');
    // Trigger failure by pointing to non-existent database file
    await assert.rejects(
      async () => {
        await createBackupBundle({
          outDir: brokenDestDir,
          dbFile: path.join(testRoot, 'non-existent-db.json'),
          storageDir: srcStorageDir
        });
      },
      /not found/i
    );
    // Assert target directory was not created and no temporary artifacts were left
    assert.strictEqual(fs.existsSync(brokenDestDir), false);
    const tmpArtifacts = fs.readdirSync(testRoot).filter((f) => f.includes('broken-bundle-out.tmp'));
    assert.strictEqual(tmpArtifacts.length, 0, 'Temporary staging directory must be cleaned up on failure');
    console.log('  [PASS] Staging cleanup guaranteed on failure');

    // -------------------------------------------------------------------------
    // TEST 7: Large Binary Streaming & Bounded Memory
    // -------------------------------------------------------------------------
    console.log('--- 7. Large Binary Streaming & Bounded-Memory Copy ---');
    const testCopySrc = path.join(testRoot, 'stream-test-src.bin');
    const testCopyDst = path.join(testRoot, 'stream-test-dst.bin');
    const largeBuffer = Buffer.alloc(4 * 1024 * 1024, 0x7f); // 4 MB
    fs.writeFileSync(testCopySrc, largeBuffer);

    const { sizeBytes, sha256 } = await streamCopyAndHash(testCopySrc, testCopyDst);
    assert.strictEqual(sizeBytes, 4 * 1024 * 1024);
    assert.strictEqual(sha256, crypto.createHash('sha256').update(largeBuffer).digest('hex'));
    assert.strictEqual(fs.statSync(testCopyDst).size, 4 * 1024 * 1024);
    console.log('  [PASS] 4 MB stream copy and in-flight hash verification verified');

    // -------------------------------------------------------------------------
    // TEST 8: Safe Refusal to Overwrite Existing Destinations & Active Database
    // -------------------------------------------------------------------------
    console.log('--- 8. Safe Refusal to Overwrite Existing Destinations & Active Database ---');
    // A. Bundler refusing to overwrite existing folder without force
    await assert.rejects(
      async () => {
        await createBackupBundle({
          outDir: bundleDir, // Already exists from Test 1
          dbFile: srcDbFile,
          storageDir: srcStorageDir,
          overwrite: false
        });
      },
      /Refusing to overwrite existing/i
    );

    // B. Restore tool refusing to overwrite existing destination without force
    await assert.rejects(
      async () => {
        await restoreBackupBundle({
          bundlePath: bundleDir,
          targetDir, // Already exists and has restored files
          dryRun: false,
          force: false
        });
      },
      /already exists/i
    );

    // C. Restore tool refusing to restore into default active Jarvis database without allowActiveTarget
    await assert.rejects(
      async () => {
        await restoreBackupBundle({
          bundlePath: bundleDir,
          targetDbFile: path.resolve(process.cwd(), 'data', 'jarvis-db.json'),
          targetStorageDir: path.resolve(process.cwd(), 'data', 'storage', 'objects'),
          dryRun: false,
          allowActiveTarget: false
        });
      },
      /SAFETY VIOLATION/i
    );

    // D. Symlink and path alias bypass hardening: Refuse restoring onto active database via symlink alias
    const symlinkDbTarget = path.join(testRoot, 'active-db-symlink.json');
    fs.symlinkSync(path.resolve(process.cwd(), 'data', 'jarvis-db.json'), symlinkDbTarget);
    await assert.rejects(
      async () => {
        await restoreBackupBundle({
          bundlePath: bundleDir,
          targetDbFile: symlinkDbTarget,
          targetStorageDir: path.join(testRoot, 'scratch-storage'),
          dryRun: false,
          allowActiveTarget: false
        });
      },
      /SAFETY VIOLATION/i
    );

    // E. Storage destination resolving inside active storage directory is refused
    await assert.rejects(
      async () => {
        await restoreBackupBundle({
          bundlePath: bundleDir,
          targetDbFile: path.join(testRoot, 'safe-db.json'),
          targetStorageDir: path.resolve(process.cwd(), 'data', 'storage', 'objects'),
          dryRun: false,
          allowActiveTarget: false
        });
      },
      /SAFETY VIOLATION/i
    );

    // F. Bundle object path escaping bundle via symlink is detected and rejected
    const rogueBundleDir = path.join(testRoot, 'rogue-symlink-bundle');
    fs.cpSync(bundleDir, rogueBundleDir, { recursive: true });
    const rogueSymlinkObj = path.join(rogueBundleDir, 'objects', 'symlink-escape.bin');
    fs.symlinkSync('/etc/passwd', rogueSymlinkObj);
    // Add rogue object to rogue bundle manifest
    const rogueManifestPath = path.join(rogueBundleDir, 'bundle_manifest.json');
    const rogueManifest = JSON.parse(fs.readFileSync(rogueManifestPath, 'utf8'));
    rogueManifest.storage.objects.push({
      storageKey: 'symlink-escape.bin',
      relativePath: 'objects/symlink-escape.bin',
      sizeBytes: fs.statSync(rogueSymlinkObj).size,
      sha256: 'deadbeef',
      mimeType: 'text/plain'
    });
    // Recompute manifestChecksum
    const { manifestChecksum: _oldChecksum, ...rogueBody } = rogueManifest;
    rogueManifest.manifestChecksum = crypto.createHash('sha256').update(JSON.stringify(rogueBody)).digest('hex');
    fs.writeFileSync(rogueManifestPath, JSON.stringify(rogueManifest, null, 2), 'utf8');

    const rogueValidation = await validateBackupBundle(rogueBundleDir);
    assert.strictEqual(rogueValidation.valid, false);
    assert.ok(
      rogueValidation.errors.some((e) => e.includes('Symlink path escape attempt detected')),
      'Symlink escape attempt outside bundle must be detected and rejected'
    );

    // G. Idempotent validation check (running validation multiple times yields consistent result)
    const val1 = await validateBackupBundle(bundleDir);
    const val2 = await validateBackupBundle(bundleDir);
    assert.strictEqual(val1.valid, true);
    assert.strictEqual(val2.valid, true);
    assert.strictEqual(val1.manifest?.manifestChecksum, val2.manifest?.manifestChecksum);

    console.log('  [PASS] Overwrite protections, symlink bypass defenses, active guards, and idempotent validation verified');

    console.log('\n=== ALL STAGE 6.4.4.19 RECOVERY & RESTORE TESTS PASSED (8/8) ===\n');
  } finally {
    // Cleanup scratch test directory
    if (fs.existsSync(testRoot)) {
      try {
        fs.rmSync(testRoot, { recursive: true, force: true });
      } catch {}
    }
  }
}

await runRecoveryTests().catch((err) => {
  console.error('[FAIL] Stage 6.4.4.19 Recovery Test Failed:', err);
  process.exit(1);
});
