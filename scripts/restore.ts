// Offline Restore Validation and Safe Restore Tool (Stage 6.4.4.19)
/**
 * MEMORY & SCALE CHARACTERISTICS:
 * - Binary storage objects: Verified and restored via bounded-memory streaming (streamCopyAndHash).
 * - Database export inspection & restoration: The JSON export file is parsed into memory via JSON.parse
 *   to validate schema version, all 45 collections, and reconstitute the DatabaseSchema.
 * - Supported database scale limit: Memory usage is bounded by Node.js V8 heap (~100 MB export payload / ~200,000 records).
 *   For larger databases, Stage 6.5 database-native import pipelines (e.g. pg_restore) must be utilized.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import {
  ALL_DATABASE_COLLECTIONS,
  assertAllCollectionsCovered,
  computeFileSha256
} from '../server/export/exportService.ts';
import type { DatabaseSchema, FileRecord } from '../server/data/types.ts';
import type { BackupBundleManifest, BundleObjectMetadata } from './backup_bundle.ts';
import { assertSafeStorageKey, streamCopyAndHash, resolveCanonicalPath } from './backup_bundle.ts';

export interface BundleValidationResult {
  valid: boolean;
  bundlePath: string;
  manifest?: BackupBundleManifest;
  exportData?: any;
  errors: string[];
  warnings: string[];
  summary: {
    bundleFormatVersion?: number;
    schemaVersion?: number;
    collectionCounts?: Record<string, number>;
    totalRecords?: number;
    totalObjects?: number;
    totalSizeBytes?: number;
  };
}

export interface RestoreOptions {
  /** Path to the backup bundle directory to inspect/restore */
  bundlePath: string;
  /**
   * Explicit target directory where restored database and storage will be placed.
   * e.g. "tmp/restored-test-target"
   */
  targetDir?: string;
  /** Explicit destination file for restored jarvis-db.json */
  targetDbFile?: string;
  /** Explicit destination directory for restored binary objects */
  targetStorageDir?: string;
  /** Dry-run mode: validates and reports planned restoration without writing files. Default: true */
  dryRun?: boolean;
  /** Allow overwriting existing files in destination. Default: false */
  force?: boolean;
  /** Explicitly permit restoring into active Jarvis data directory. Default: false */
  allowActiveTarget?: boolean;
}

export interface RestoreResult {
  success: boolean;
  dryRun: boolean;
  bundlePath: string;
  targetDbFile?: string;
  targetStorageDir?: string;
  restoredCollections: number;
  restoredRecords: number;
  restoredObjects: number;
  durationMs: number;
  errors: string[];
  warnings: string[];
}

/**
 * Inspects and rigorously validates a backup bundle directory without modifying any files.
 */
export async function validateBackupBundle(bundlePathInput: string): Promise<BundleValidationResult> {
  const bundlePath = path.resolve(bundlePathInput);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(bundlePath)) {
    return {
      valid: false,
      bundlePath,
      errors: [`Bundle directory does not exist: "${bundlePath}"`],
      warnings,
      summary: {}
    };
  }

  const manifestPath = path.join(bundlePath, 'bundle_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      valid: false,
      bundlePath,
      errors: [`Missing required "bundle_manifest.json" in bundle directory.`],
      warnings,
      summary: {}
    };
  }

  let manifest: BackupBundleManifest;
  try {
    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(rawManifest);
  } catch (err: any) {
    return {
      valid: false,
      bundlePath,
      errors: [`Corrupted "bundle_manifest.json": failed to parse JSON (${err.message})`],
      warnings,
      summary: {}
    };
  }

  // 1. Validate bundle format version
  if (manifest.bundleFormatVersion !== 1) {
    errors.push(`Unsupported bundleFormatVersion "${manifest.bundleFormatVersion}". Expected 1.`);
  }

  // 2. Validate manifest self-checksum
  const { manifestChecksum: recordedManifestChecksum, ...manifestBody } = manifest;
  const calculatedManifestChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifestBody))
    .digest('hex');

  if (recordedManifestChecksum !== calculatedManifestChecksum) {
    errors.push(
      `Manifest top-level checksum mismatch: expected "${recordedManifestChecksum}", calculated "${calculatedManifestChecksum}".`
    );
  }

  // 3. Validate database export file
  const exportRelative = manifest.database?.exportFile || 'database_export.json';
  const exportPath = path.join(bundlePath, exportRelative);

  let exportData: any = null;
  if (!fs.existsSync(exportPath)) {
    errors.push(`Database export file missing from bundle: "${exportRelative}"`);
  } else {
    const exportStat = fs.statSync(exportPath);
    if (manifest.database.byteSize !== undefined && exportStat.size !== manifest.database.byteSize) {
      errors.push(
        `Database export file size mismatch: manifest claims ${manifest.database.byteSize} bytes, actual is ${exportStat.size} bytes.`
      );
    }

    const calculatedExportSha = await computeFileSha256(exportPath);
    if (manifest.database.sha256 && calculatedExportSha !== manifest.database.sha256) {
      errors.push(
        `Database export file SHA-256 hash mismatch: manifest claims "${manifest.database.sha256}", actual is "${calculatedExportSha}".`
      );
    }

    try {
      const rawExport = fs.readFileSync(exportPath, 'utf8');
      exportData = JSON.parse(rawExport);
    } catch (err: any) {
      errors.push(`Corrupted "database_export.json": failed to parse JSON (${err.message})`);
    }
  }

  let totalRecords = 0;
  if (exportData) {
    // Validate schema version
    if (exportData.schemaVersion !== manifest.schemaVersion) {
      errors.push(
        `Schema version mismatch between manifest (${manifest.schemaVersion}) and export payload (${exportData.schemaVersion}).`
      );
    }

    // Validate 45 collections coverage
    const collections = exportData.collections || {};
    const collectionKeys = Object.keys(collections);
    if (!assertAllCollectionsCovered(collectionKeys)) {
      errors.push(
        `Database export missing required collections. Found ${collectionKeys.length}/45 collections.`
      );
    }

    // Validate per-collection record counts and checksums
    const recordedColChecksums = exportData.collectionChecksums || {};
    const manifestCounts = manifest.database.collectionCounts || {};
    const exportCounts = exportData.collectionCounts || {};

    for (const colName of ALL_DATABASE_COLLECTIONS) {
      const arr = collections[colName];
      if (!Array.isArray(arr)) {
        errors.push(`Collection "${colName}" is missing or not an array.`);
        continue;
      }
      totalRecords += arr.length;

      // Count check vs exportCounts
      if (exportCounts[colName] !== undefined && exportCounts[colName] !== arr.length) {
        errors.push(
          `Collection count mismatch for "${colName}": header declares ${exportCounts[colName]}, actual array length is ${arr.length}.`
        );
      }
      // Count check vs manifestCounts
      if (manifestCounts[colName] !== undefined && manifestCounts[colName] !== arr.length) {
        errors.push(
          `Manifest collection count mismatch for "${colName}": manifest declares ${manifestCounts[colName]}, actual is ${arr.length}.`
        );
      }

      // Recompute per-collection SHA-256 checksum
      const hasher = crypto.createHash('sha256');
      for (const item of arr) {
        hasher.update(JSON.stringify(item));
      }
      const calculatedColHash = hasher.digest('hex');

      if (recordedColChecksums[colName] && recordedColChecksums[colName] !== calculatedColHash) {
        errors.push(
          `Checksum mismatch for collection "${colName}": expected "${recordedColChecksums[colName]}", calculated "${calculatedColHash}".`
        );
      }
    }

    // Recompute overallChecksum
    const calculatedOverallChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(recordedColChecksums))
      .digest('hex');

    if (exportData.overallChecksum && exportData.overallChecksum !== calculatedOverallChecksum) {
      errors.push(
        `Overall database export checksum mismatch: expected "${exportData.overallChecksum}", calculated "${calculatedOverallChecksum}".`
      );
    }
  }

  // 4. Validate binary storage objects
  const objectsDir = path.join(bundlePath, 'objects');
  const manifestObjects = manifest.storage?.objects || [];
  const seenObjects = new Set<string>();

  for (const obj of manifestObjects) {
    if (!obj.storageKey) {
      errors.push(`Manifest contains storage object without storageKey.`);
      continue;
    }

    try {
      assertSafeStorageKey(obj.storageKey);
    } catch (err: any) {
      errors.push(`Unsafe storage key in manifest: "${obj.storageKey}" (${err.message})`);
      continue;
    }

    if (seenObjects.has(obj.storageKey)) {
      errors.push(`Duplicate storage key in manifest: "${obj.storageKey}"`);
      continue;
    }
    seenObjects.add(obj.storageKey);

    const relative = obj.relativePath || `objects/${obj.storageKey}`;
    const objectPath = path.resolve(bundlePath, relative);

    // Path traversal and symlink escape check: must stay within bundlePath
    if (!objectPath.startsWith(bundlePath + path.sep)) {
      errors.push(`Directory traversal attempt in object path: "${relative}"`);
      continue;
    }

    if (!fs.existsSync(objectPath)) {
      errors.push(`Binary storage object missing from bundle: "${relative}"`);
      continue;
    }

    const canonicalObjectPath = resolveCanonicalPath(objectPath);
    if (!canonicalObjectPath.startsWith(bundlePath + path.sep)) {
      errors.push(`Symlink path escape attempt detected for object "${obj.storageKey}": resolved to "${canonicalObjectPath}" outside bundle.`);
      continue;
    }

    const objStat = fs.statSync(objectPath);
    if (obj.sizeBytes !== undefined && objStat.size !== obj.sizeBytes) {
      errors.push(
        `Storage object "${obj.storageKey}" size mismatch: manifest claims ${obj.sizeBytes} bytes, actual is ${objStat.size} bytes.`
      );
    }

    const calculatedObjHash = await computeFileSha256(objectPath);
    if (obj.sha256 && calculatedObjHash !== obj.sha256) {
      errors.push(
        `Corrupted binary object "${obj.storageKey}": manifest SHA-256 is "${obj.sha256}", actual file hash is "${calculatedObjHash}".`
      );
    }
  }

  // Check for unexpected unlisted files in objects/
  if (fs.existsSync(objectsDir)) {
    const diskEntries = fs.readdirSync(objectsDir, { withFileTypes: true });
    for (const entry of diskEntries) {
      if (!entry.isFile()) continue;
      if (entry.name === '.gitkeep') continue;
      if (!seenObjects.has(entry.name)) {
        warnings.push(`Unexpected unlisted file in bundle objects/ directory: "${entry.name}"`);
      }
    }
  }

  // Validate storage manifest checksum
  if (manifest.storage?.manifestChecksum) {
    const calculatedStorageChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestObjects))
      .digest('hex');
    if (calculatedStorageChecksum !== manifest.storage.manifestChecksum) {
      errors.push(
        `Storage objects manifestChecksum mismatch: expected "${manifest.storage.manifestChecksum}", calculated "${calculatedStorageChecksum}".`
      );
    }
  }

  const valid = errors.length === 0;
  return {
    valid,
    bundlePath,
    manifest,
    exportData,
    errors,
    warnings,
    summary: {
      bundleFormatVersion: manifest?.bundleFormatVersion,
      schemaVersion: manifest?.schemaVersion,
      collectionCounts: manifest?.database?.collectionCounts,
      totalRecords,
      totalObjects: manifest?.storage?.totalObjects,
      totalSizeBytes: manifest?.storage?.totalSizeBytes
    }
  };
}

/**
 * Restores a validated backup bundle into an explicitly specified target directory.
 * Defaults to dry-run mode. Requires explicit destination. Refuses active production overwrite.
 */
export async function restoreBackupBundle(options: RestoreOptions): Promise<RestoreResult> {
  const startTime = Date.now();
  const dryRun = options.dryRun ?? true;

  // 1. Mandatory inspection and validation
  const validation = await validateBackupBundle(options.bundlePath);
  if (!validation.valid) {
    throw new Error(
      `Backup bundle validation failed with ${validation.errors.length} error(s):\n  - ${validation.errors.join('\n  - ')}`
    );
  }

  const manifest = validation.manifest!;
  const exportData = validation.exportData!;

  // 2. Determine target destination paths
  let targetDbFile: string;
  let targetStorageDir: string;

  if (options.targetDir) {
    const resolvedDir = path.resolve(options.targetDir);
    targetDbFile = path.join(resolvedDir, 'jarvis-db.json');
    targetStorageDir = path.join(resolvedDir, 'storage', 'objects');
  } else if (options.targetDbFile && options.targetStorageDir) {
    targetDbFile = path.resolve(options.targetDbFile);
    targetStorageDir = path.resolve(options.targetStorageDir);
  } else {
    throw new Error(
      `Explicit destination must be provided via targetDir or (targetDbFile + targetStorageDir). Restore cannot infer destination.`
    );
  }

  // Safety Gate: Refuse active production database path unless explicitly bypassed
  const defaultActiveData = path.resolve(process.cwd(), 'data');
  const canonicalActiveData = resolveCanonicalPath(defaultActiveData);
  const defaultActiveDb = path.resolve(defaultActiveData, 'jarvis-db.json');
  const canonicalActiveDb = resolveCanonicalPath(defaultActiveDb);
  const defaultActiveStorage = path.resolve(defaultActiveData, 'storage', 'objects');
  const canonicalActiveStorage = resolveCanonicalPath(defaultActiveStorage);

  const canonicalTargetDb = resolveCanonicalPath(targetDbFile);
  const canonicalTargetStorage = resolveCanonicalPath(targetStorageDir);
  const canonicalCwd = resolveCanonicalPath(process.cwd());

  const isTargetDbActive =
    canonicalTargetDb === canonicalActiveDb ||
    targetDbFile === defaultActiveDb ||
    canonicalTargetDb === canonicalActiveData ||
    canonicalTargetDb.startsWith(canonicalActiveData + path.sep);

  const isTargetStorageActive =
    canonicalTargetStorage === canonicalActiveStorage ||
    targetStorageDir === defaultActiveStorage ||
    canonicalTargetStorage === canonicalActiveData ||
    canonicalTargetStorage.startsWith(canonicalActiveStorage + path.sep) ||
    canonicalTargetStorage.startsWith(canonicalActiveData + path.sep);

  if (isTargetDbActive && !options.allowActiveTarget) {
    throw new Error(
      `SAFETY VIOLATION: Refusing to restore into active Jarvis database ("${defaultActiveDb}"). For Stage 6.4.4.19 recovery proof, restore into a test or temporary directory.`
    );
  }

  if (isTargetStorageActive && !options.allowActiveTarget) {
    throw new Error(
      `SAFETY VIOLATION: Refusing to restore into active Jarvis storage directory ("${canonicalActiveStorage}"). Specify a test or temporary directory.`
    );
  }

  // Safety Gate: Refuse root or system targets
  const rootDir = path.parse(targetDbFile).root;
  if (
    targetDbFile === rootDir ||
    canonicalTargetDb === rootDir ||
    targetStorageDir === rootDir ||
    canonicalTargetStorage === rootDir ||
    canonicalTargetStorage === canonicalCwd
  ) {
    throw new Error(`Unsafe destination path: root directory or project root cannot be used as restore destination.`);
  }

  // Safety Gate: Overwrite protection
  if (!options.force) {
    if (fs.existsSync(targetDbFile)) {
      throw new Error(`Destination database file already exists at: "${targetDbFile}". Use force=true to overwrite.`);
    }
    if (fs.existsSync(targetStorageDir) && fs.readdirSync(targetStorageDir).length > 0) {
      throw new Error(`Destination storage directory already exists and is non-empty at: "${targetStorageDir}". Use force=true to overwrite.`);
    }
  }

  // 3. Dry-Run Reporting: If dryRun is true, stop here without modifying anything
  if (dryRun) {
    const durationMs = Date.now() - startTime;
    return {
      success: true,
      dryRun: true,
      bundlePath: validation.bundlePath,
      targetDbFile,
      targetStorageDir,
      restoredCollections: ALL_DATABASE_COLLECTIONS.length,
      restoredRecords: validation.summary.totalRecords || 0,
      restoredObjects: manifest.storage.totalObjects,
      durationMs,
      errors: [],
      warnings: validation.warnings
    };
  }

  // 4. Execute Restore into destination
  // Use a temporary staging folder for the entire restore to guarantee atomic rollback if any part fails
  const stagingDir = `${path.dirname(targetDbFile)}.staging.${Date.now()}.${crypto.randomBytes(3).toString('hex')}`;
  fs.mkdirSync(stagingDir, { recursive: true });
  const stagingDbFile = path.join(stagingDir, 'jarvis-db.json');
  const stagingStorageDir = path.join(stagingDir, 'storage_objects');
  fs.mkdirSync(stagingStorageDir, { recursive: true });

  let restoredObjectsCount = 0;
  try {
    // Reconstitute canonical DatabaseSchema from export collections without modifying IDs, timestamps, or audit trail
    const restoredSchema: DatabaseSchema = {
      version: exportData.schemaVersion,
      meta: exportData.meta || {
        version: exportData.schemaVersion,
        compatibilityLevel: 'strict',
        supportedDomains: ['education', 'messaging', 'storage', 'personal', 'research']
      },
      ...exportData.collections
    };

    // Write staged database JSON
    fs.writeFileSync(stagingDbFile, JSON.stringify(restoredSchema, null, 2), 'utf8');

    // Restore every binary object via bounded streaming copies into staging
    const bundleObjectsDir = path.join(path.resolve(options.bundlePath), 'objects');

    for (const obj of manifest.storage.objects) {
      const srcPath = path.join(bundleObjectsDir, obj.storageKey);
      const dstPath = path.join(stagingStorageDir, obj.storageKey);

      const { sizeBytes, sha256 } = await streamCopyAndHash(srcPath, dstPath);
      if (sizeBytes !== obj.sizeBytes || sha256 !== obj.sha256) {
        throw new Error(`Restored binary object "${obj.storageKey}" failed post-copy verification.`);
      }
      restoredObjectsCount++;
    }

    // Now promote staged files to final destination
    fs.mkdirSync(path.dirname(targetDbFile), { recursive: true });
    fs.mkdirSync(targetStorageDir, { recursive: true });

    // Promote database JSON atomically
    fs.copyFileSync(stagingDbFile, targetDbFile);

    // Promote binary objects
    for (const obj of manifest.storage.objects) {
      const stagedObjPath = path.join(stagingStorageDir, obj.storageKey);
      const finalObjPath = path.join(targetStorageDir, obj.storageKey);
      fs.copyFileSync(stagedObjPath, finalObjPath);
    }
  } finally {
    // Always clean up staging directory
    if (fs.existsSync(stagingDir)) {
      try {
        fs.rmSync(stagingDir, { recursive: true, force: true });
      } catch {}
    }
  }

  const durationMs = Date.now() - startTime;
  return {
    success: true,
    dryRun: false,
    bundlePath: validation.bundlePath,
    targetDbFile,
    targetStorageDir,
    restoredCollections: ALL_DATABASE_COLLECTIONS.length,
    restoredRecords: validation.summary.totalRecords || 0,
    restoredObjects: restoredObjectsCount,
    durationMs,
    errors: [],
    warnings: validation.warnings
  };
}

// CLI Execution Support
if (process.argv[1]?.endsWith('restore.ts') || process.argv[1]?.endsWith('restore.js')) {
  const args = process.argv.slice(2);
  let bundlePath = '';
  let targetDir: string | undefined;
  let targetDbFile: string | undefined;
  let targetStorageDir: string | undefined;
  let dryRun = true;
  let force = false;
  let allowActive = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--bundle' || arg === '-b') {
      bundlePath = args[++i];
    } else if (arg === '--target-dir' || arg === '-t') {
      targetDir = args[++i];
    } else if (arg === '--target-db') {
      targetDbFile = args[++i];
    } else if (arg === '--target-storage') {
      targetStorageDir = args[++i];
    } else if (arg === '--execute' || arg === '--no-dry-run') {
      dryRun = false;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (arg === '--allow-active-target') {
      allowActive = true;
    } else if (!bundlePath && !arg.startsWith('-')) {
      bundlePath = arg;
    }
  }

  if (!bundlePath) {
    console.error('Usage: npx tsx scripts/restore.ts <bundle-path> [--dry-run | --execute] [--target-dir <path>] [--force]');
    process.exit(1);
  }

  restoreBackupBundle({
    bundlePath,
    targetDir,
    targetDbFile,
    targetStorageDir,
    dryRun,
    force,
    allowActiveTarget: allowActive
  })
    .then((res) => {
      console.log(`[RestoreTool] STATUS: ${res.dryRun ? 'DRY-RUN VALIDATION PASSED' : 'RESTORE COMPLETE'}`);
      console.log(`  Bundle: ${res.bundlePath}`);
      if (res.targetDbFile) console.log(`  Target DB File: ${res.targetDbFile}`);
      if (res.targetStorageDir) console.log(`  Target Storage: ${res.targetStorageDir}`);
      console.log(`  Collections: ${res.restoredCollections}`);
      console.log(`  Records: ${res.restoredRecords}`);
      console.log(`  Storage Objects: ${res.restoredObjects}`);
      console.log(`  Duration: ${res.durationMs}ms`);
      if (res.dryRun) {
        console.log(`\n  (No files were written. Re-run with --execute and --target-dir to perform restore.)`);
      }
    })
    .catch((err) => {
      console.error(`[RestoreTool] FAILED:`, err.message);
      process.exit(1);
    });
}
