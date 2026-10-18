// Offline Backup Bundling Tool (Stage 6.4.4.19)
/**
 * MEMORY & SCALE CHARACTERISTICS:
 * - Binary storage objects: Streamed in chunks via streamCopyAndHash with bounded, constant memory buffers.
 * - Database export: While streamDatabaseExport formats and flushes the 45 collections sequentially via streams,
 *   the source DatabaseSchema is currently parsed into memory as a JavaScript object.
 * - Supported database size limit: Recommended for datasets up to 100 MB JSON (~200,000 records).
 *   For larger databases, Stage 6.5 database-native streaming or row-level cursors are required.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import {
  ALL_DATABASE_COLLECTIONS,
  assertAllCollectionsCovered,
  computeFileSha256,
  streamDatabaseExport,
  takeImmutableSnapshot
} from '../server/export/exportService.ts';
import type { DatabaseSchema, FileRecord } from '../server/data/types.ts';
import { CURRENT_DATABASE_SCHEMA_VERSION } from '../server/data/types.ts';

export interface BundleObjectMetadata {
  storageKey: string;
  relativePath: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  associatedFileId?: string;
}

export interface BackupBundleManifest {
  bundleFormatVersion: number;
  bundleId: string;
  createdAt: string;
  schemaVersion: number;
  database: {
    exportFile: string;
    byteSize: number;
    sha256: string;
    collectionCounts: Record<string, number>;
    overallChecksum: string;
  };
  storage: {
    totalObjects: number;
    totalSizeBytes: number;
    manifestChecksum: string;
    objects: BundleObjectMetadata[];
  };
  manifestChecksum: string;
}

export interface CreateBackupBundleOptions {
  /** Target output directory for the bundle (e.g. "backups/bundle-20261010-001") */
  outDir: string;
  /** Explicit source database JSON file (default: "data/jarvis-db.json") */
  dbFile?: string;
  /** Optional pre-computed export JSON file */
  exportFile?: string;
  /** Explicit source binary storage objects directory (default: "data/storage/objects") */
  storageDir?: string;
  /** Allow overwriting an existing destination directory. Default: false */
  overwrite?: boolean;
  /** Optional bundle ID identifier */
  bundleId?: string;
}

export interface BackupBundleResult {
  success: boolean;
  bundlePath: string;
  manifest: BackupBundleManifest;
  durationMs: number;
  warnings: string[];
}

/**
 * Validates that a storage key is safe and contains no directory traversal.
 */
export function assertSafeStorageKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error(`Invalid storage key: key is empty or not a string.`);
  }
  if (key.includes('..') || key.includes('/') || key.includes('\\') || key.includes('\0')) {
    throw new Error(`Directory traversal or unsafe characters detected in storage key: "${key}"`);
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
    throw new Error(`Storage key contains invalid characters: "${key}"`);
  }
}

/**
 * Resolves the canonical physical path, traversing symlinks for existing paths
 * and resolving ancestors for not-yet-created targets.
 */
export function resolveCanonicalPath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    let curr = path.resolve(p);
    const suffix: string[] = [];
    while (curr && curr !== path.dirname(curr)) {
      if (fs.existsSync(curr)) {
        return path.resolve(fs.realpathSync(curr), ...suffix);
      }
      suffix.unshift(path.basename(curr));
      curr = path.dirname(curr);
    }
    return path.resolve(p);
  }
}

/**
 * Streams a source file to destination while calculating its SHA-256 digest in-flight (bounded memory).
 */
export async function streamCopyAndHash(srcPath: string, dstPath: string): Promise<{ sizeBytes: number; sha256: string }> {
  const hash = crypto.createHash('sha256');
  let sizeBytes = 0;

  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(dstPath);

  readStream.on('data', (chunk: Buffer) => {
    sizeBytes += chunk.length;
    hash.update(chunk);
  });

  await pipeline(readStream, writeStream);
  return { sizeBytes, sha256: hash.digest('hex') };
}

/**
 * Creates an offline, complete, self-contained backup bundle directory.
 */
export async function createBackupBundle(options: CreateBackupBundleOptions): Promise<BackupBundleResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  const outDir = path.resolve(options.outDir);
  const canonicalOutDir = resolveCanonicalPath(outDir);
  const dbFile = options.dbFile ? path.resolve(options.dbFile) : path.resolve(process.cwd(), 'data', 'jarvis-db.json');
  const storageDir = options.storageDir ? path.resolve(options.storageDir) : path.resolve(process.cwd(), 'data', 'storage', 'objects');

  // Safety 1: Never overwrite existing directory unless explicitly instructed
  if (fs.existsSync(outDir)) {
    const existing = fs.readdirSync(outDir);
    if (existing.length > 0 && !options.overwrite) {
      throw new Error(`Refusing to overwrite existing non-empty bundle directory at: ${outDir}. Use overwrite=true to replace.`);
    }
  }

  // Safety 2: Reject unsafe output paths (root, system paths, active data dir)
  const rootPath = path.parse(outDir).root;
  const canonicalActiveData = resolveCanonicalPath(path.resolve(process.cwd(), 'data'));
  const canonicalActiveStorage = resolveCanonicalPath(path.resolve(process.cwd(), 'data', 'storage'));
  const canonicalCwd = resolveCanonicalPath(process.cwd());

  if (
    outDir === rootPath ||
    canonicalOutDir === rootPath ||
    canonicalOutDir === canonicalCwd ||
    canonicalOutDir === canonicalActiveData ||
    canonicalOutDir === canonicalActiveStorage ||
    canonicalOutDir.startsWith(canonicalActiveStorage + path.sep)
  ) {
    throw new Error(`Unsafe bundle destination directory: "${outDir}". Specify a distinct backup folder.`);
  }

  // Use a temporary folder during bundle construction to avoid incomplete artifacts
  const tmpBundleDir = `${outDir}.tmp.${Date.now()}.${crypto.randomBytes(3).toString('hex')}`;
  fs.mkdirSync(tmpBundleDir, { recursive: true });

  try {
    const objectsDir = path.join(tmpBundleDir, 'objects');
    fs.mkdirSync(objectsDir, { recursive: true });

    // Step A: Load or generate database export
    const exportDstPath = path.join(tmpBundleDir, 'database_export.json');
    let databaseSchemaSnapshot: DatabaseSchema;
    let exportData: any;

    if (options.exportFile && fs.existsSync(options.exportFile)) {
      // Pre-downloaded export provided
      const raw = fs.readFileSync(options.exportFile, 'utf8');
      exportData = JSON.parse(raw);
      databaseSchemaSnapshot = {
        version: exportData.schemaVersion,
        meta: exportData.meta,
        ...exportData.collections
      } as DatabaseSchema;
      fs.copyFileSync(options.exportFile, exportDstPath);
    } else {
      // Export directly from supplied database file
      if (!fs.existsSync(dbFile)) {
        throw new Error(`Database source file not found at: ${dbFile}`);
      }
      const rawDb = fs.readFileSync(dbFile, 'utf8');
      const parsedDb = JSON.parse(rawDb);
      databaseSchemaSnapshot = takeImmutableSnapshot(parsedDb);

      const writeStream = fs.createWriteStream(exportDstPath);
      await streamDatabaseExport(databaseSchemaSnapshot, writeStream);
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
        writeStream.end();
      });

      const exportedJsonRaw = fs.readFileSync(exportDstPath, 'utf8');
      exportData = JSON.parse(exportedJsonRaw);
    }

    // Step B: Verify all 45 collections present in export
    const collectionsPresent = Object.keys(exportData.collections || {});
    if (!assertAllCollectionsCovered(collectionsPresent)) {
      throw new Error(`Database export does not cover all 45 required DatabaseSchema collections. Found ${collectionsPresent.length}/45.`);
    }

    // Step C: Verify database export checksum and size
    const dbExportStat = fs.statSync(exportDstPath);
    const dbExportSha256 = await computeFileSha256(exportDstPath);

    // Step D: Identify and verify all referenced binary storage objects
    const filesCollection: FileRecord[] = Array.isArray(exportData.collections?.files) ? exportData.collections.files : [];
    const activeFileRecords = filesCollection.filter((f) => f.status !== 'deleted');

    const seenStorageKeys = new Set<string>();
    const bundleObjects: BundleObjectMetadata[] = [];

    // Check duplicate storage keys in files collection
    for (const file of activeFileRecords) {
      if (!file.storageKey) continue;
      assertSafeStorageKey(file.storageKey);

      if (seenStorageKeys.has(file.storageKey)) {
        warnings.push(`Deduplicated storage key detected: "${file.storageKey}" is referenced by multiple FileRecords.`);
      } else {
        seenStorageKeys.add(file.storageKey);
      }
    }

    // Scan actual storage directory for files to bundle
    const diskStorageEntries = fs.existsSync(storageDir)
      ? fs.readdirSync(storageDir, { withFileTypes: true })
          .filter((e) => e.isFile() && e.name !== '.gitkeep' && !e.name.endsWith('.meta.json') && !e.name.includes('.tmp.'))
          .map((e) => e.name)
          .sort((a, b) => a.localeCompare(b))
      : [];

    const fileMapByStorageKey = new Map<string, FileRecord>();
    for (const f of activeFileRecords) {
      if (f.storageKey) fileMapByStorageKey.set(f.storageKey, f);
    }

    // Check for missing referenced objects: every active FileRecord MUST have its physical object
    const missingKeys: string[] = [];
    for (const f of activeFileRecords) {
      if (!f.storageKey) continue;
      const srcObjectPath = path.join(storageDir, f.storageKey);
      if (!fs.existsSync(srcObjectPath)) {
        missingKeys.push(f.storageKey);
      }
    }
    if (missingKeys.length > 0) {
      throw new Error(
        `Incomplete backup detected: ${missingKeys.length} binary objects referenced by active database FileRecords are missing from storage directory (${storageDir}). Missing keys: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`
      );
    }

    // Copy every binary object from storage directory into bundle using streaming pipes
    let totalStorageBytes = 0;
    const bundledKeys = new Set<string>();

    for (const objectName of diskStorageEntries) {
      assertSafeStorageKey(objectName);

      if (bundledKeys.has(objectName)) {
        throw new Error(`Duplicate storage key encountered during bundling: "${objectName}"`);
      }
      bundledKeys.add(objectName);

      const srcPath = path.join(storageDir, objectName);
      const canonicalSrcPath = resolveCanonicalPath(srcPath);
      const canonicalStorageDir = resolveCanonicalPath(storageDir);
      if (!canonicalSrcPath.startsWith(canonicalStorageDir + path.sep)) {
        throw new Error(`Symlink escape attempt detected in storage object "${objectName}": resolved to "${canonicalSrcPath}" outside storage directory.`);
      }
      const dstPath = path.join(objectsDir, objectName);

      const { sizeBytes, sha256 } = await streamCopyAndHash(srcPath, dstPath);
      totalStorageBytes += sizeBytes;

      const associatedRecord = fileMapByStorageKey.get(objectName);

      // Verify SHA-256 matches FileRecord metadata if present
      if (associatedRecord && associatedRecord.sha256 && associatedRecord.sha256 !== sha256) {
        throw new Error(
          `Integrity checksum mismatch for storage object "${objectName}": database file record expected sha256 "${associatedRecord.sha256}", but physical file hash is "${sha256}".`
        );
      }

      bundleObjects.push({
        storageKey: objectName,
        relativePath: `objects/${objectName}`,
        sizeBytes,
        sha256,
        mimeType: associatedRecord?.mimeType || 'application/octet-stream',
        associatedFileId: associatedRecord?.id
      });
    }

    // Deterministic sort of manifest objects
    bundleObjects.sort((a, b) => a.storageKey.localeCompare(b.storageKey));

    const storageManifestChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(bundleObjects))
      .digest('hex');

    // Step E: Create authoritative bundle_manifest.json
    const bundleId = options.bundleId || `bundle-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const schemaVersion = exportData.schemaVersion || CURRENT_DATABASE_SCHEMA_VERSION;

    const manifestPayloadWithoutSelfChecksum: Omit<BackupBundleManifest, 'manifestChecksum'> = {
      bundleFormatVersion: 1,
      bundleId,
      createdAt,
      schemaVersion,
      database: {
        exportFile: 'database_export.json',
        byteSize: dbExportStat.size,
        sha256: dbExportSha256,
        collectionCounts: exportData.collectionCounts,
        overallChecksum: exportData.overallChecksum
      },
      storage: {
        totalObjects: bundleObjects.length,
        totalSizeBytes: totalStorageBytes,
        manifestChecksum: storageManifestChecksum,
        objects: bundleObjects
      }
    };

    const overallManifestChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestPayloadWithoutSelfChecksum))
      .digest('hex');

    const finalManifest: BackupBundleManifest = {
      ...manifestPayloadWithoutSelfChecksum,
      manifestChecksum: overallManifestChecksum
    };

    const manifestPath = path.join(tmpBundleDir, 'bundle_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(finalManifest, null, 2), 'utf8');

    // Step F: Finalize bundle atomically by moving temp directory to destination
    if (fs.existsSync(outDir)) {
      if (options.overwrite) {
        fs.rmSync(outDir, { recursive: true, force: true });
      }
    }
    fs.renameSync(tmpBundleDir, outDir);

    const durationMs = Date.now() - startTime;
    return {
      success: true,
      bundlePath: outDir,
      manifest: finalManifest,
      durationMs,
      warnings
    };
  } catch (err) {
    // Cleanup temporary bundle directory on failure
    if (fs.existsSync(tmpBundleDir)) {
      try {
        fs.rmSync(tmpBundleDir, { recursive: true, force: true });
      } catch {}
    }
    throw err;
  }
}

// CLI Execution Support
if (process.argv[1]?.endsWith('backup_bundle.ts') || process.argv[1]?.endsWith('backup_bundle.js')) {
  const args = process.argv.slice(2);
  let outDir = '';
  let dbFile: string | undefined;
  let storageDir: string | undefined;
  let exportFile: string | undefined;
  let overwrite = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--out-dir' || arg === '-o') {
      outDir = args[++i];
    } else if (arg === '--db-file') {
      dbFile = args[++i];
    } else if (arg === '--storage-dir') {
      storageDir = args[++i];
    } else if (arg === '--export-file') {
      exportFile = args[++i];
    } else if (arg === '--overwrite' || arg === '--force' || arg === '-f') {
      overwrite = true;
    }
  }

  if (!outDir) {
    console.error('Usage: npx tsx scripts/backup_bundle.ts --out-dir <path> [--db-file <path>] [--storage-dir <path>] [--export-file <path>] [--force]');
    process.exit(1);
  }

  createBackupBundle({ outDir, dbFile, storageDir, exportFile, overwrite })
    .then((res) => {
      console.log(`[BackupBundle] SUCCESS: Bundle created at: ${res.bundlePath}`);
      console.log(`  Bundle ID: ${res.manifest.bundleId}`);
      console.log(`  Collections: ${Object.keys(res.manifest.database.collectionCounts).length}`);
      console.log(`  Storage Objects: ${res.manifest.storage.totalObjects} (${res.manifest.storage.totalSizeBytes} bytes)`);
      console.log(`  Overall Manifest Checksum: ${res.manifest.manifestChecksum}`);
      console.log(`  Duration: ${res.durationMs}ms`);
    })
    .catch((err) => {
      console.error(`[BackupBundle] FAILED:`, err.message);
      process.exit(1);
    });
}
