// Secure Data Export and Migration Service (Stage 6.4.4.16)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Writable } from 'node:stream';
import type { DatabaseSchema, DatabaseSchemaMeta, FileRecord } from '../data/types.ts';
import { CURRENT_DATABASE_SCHEMA_VERSION } from '../data/types.ts';

/**
 * Machine-checkable canonical list of all 45 collections defined in DatabaseSchema.
 * This guarantees complete schema coverage prior to PostgreSQL migration.
 */
export const ALL_DATABASE_COLLECTIONS: ReadonlyArray<keyof Omit<DatabaseSchema, 'version' | 'meta'>> = [
  'users',
  'institutions',
  'institutionMemberships',
  'institutionInvitations',
  'workspaces',
  'memberships',
  'conversations',
  'messages',
  'knowledgeSpaces',
  'knowledgeSources',
  'knowledgeChunks',
  'classes',
  'assignments',
  'submissions',
  'studyArtifacts',
  'auditEvents',
  'researchProjects',
  'researchQuestions',
  'evidenceRecords',
  'researchNotes',
  'researchReports',
  'files',
  'classroomSessions',
  'classroomParticipants',
  'quizzes',
  'quizQuestions',
  'quizResponses',
  'quizParticipantStates',
  'videos',
  'learningLinks',
  'academicEvents',
  'academicNotifications',
  'quizResults',
  'smartboardDevices',
  'boardDocuments',
  'personalIdentities',
  'personalMemories',
  'personalKnowledgeStates',
  'personalStudyNotes',
  'personalFlashcards',
  'personalStudyPlans',
  'activityTimeline',
  'diagnosticSessions',
  'knowledgeAssets',
  'learnerExposures'
] as const;

export interface StorageObjectManifestItem {
  storageKey: string;
  filename: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  associatedFileId?: string;
}

export interface StorageManifest {
  manifestVersion: number;
  generatedAt: string;
  totalObjects: number;
  totalSizeBytes: number;
  manifestChecksum: string;
  objects: StorageObjectManifestItem[];
}

export interface ExportStreamResult {
  exportId: string;
  exportedAt: string;
  schemaVersion: number;
  totalBytesEmitted: number;
  counts: Record<string, number>;
  collectionChecksums: Record<string, string>;
  overallChecksum: string;
}

export class ExportPayloadLimitExceededError extends Error {
  constructor(limitBytes: number) {
    super(`Export stream exceeded safety limit of ${limitBytes} bytes.`);
    this.name = 'ExportPayloadLimitExceededError';
  }
}

/**
 * Asserts that the provided list contains all 45 collections defined in DatabaseSchema.
 */
export function assertAllCollectionsCovered(collections: ReadonlyArray<string>): boolean {
  if (collections.length !== 45) return false;
  const set = new Set(collections);
  for (const c of ALL_DATABASE_COLLECTIONS) {
    if (!set.has(c)) return false;
  }
  return true;
}

/**
 * Constant-time operator secret comparison.
 * Never prints secrets in logs. Fails closed when required and missing.
 */
export function verifyOperatorSecret(
  providedSecret?: string | null,
  expectedSecret?: string | null,
  requireSecret = false
): { valid: boolean; reason?: string } {
  const envSecret = expectedSecret !== undefined
    ? expectedSecret
    : (process.env.INTERNAL_EXPORT_SECRET || process.env.EXPORT_OPERATOR_SECRET || null);

  const isMandatory = requireSecret || process.env.REQUIRE_OPERATOR_SECRET === 'true';

  if (!envSecret || envSecret.trim().length === 0) {
    if (isMandatory) {
      return { valid: false, reason: 'Operator secret is mandatory but unconfigured on server.' };
    }
    // If not configured and not required, pass
    return { valid: true };
  }

  if (envSecret.length < 32) {
    return { valid: false, reason: 'Configured operator secret is under 32 characters in length.' };
  }

  if (!providedSecret || typeof providedSecret !== 'string' || providedSecret.length === 0) {
    return { valid: false, reason: 'Missing operator secret in request headers.' };
  }

  const providedBuf = Buffer.from(providedSecret, 'utf8');
  const expectedBuf = Buffer.from(envSecret, 'utf8');

  // Prevent timing leaks on unequal lengths by hashing both to fixed-length sha256 digests
  const hashProvided = crypto.createHash('sha256').update(providedBuf).digest();
  const hashExpected = crypto.createHash('sha256').update(expectedBuf).digest();

  const isMatch = crypto.timingSafeEqual(hashProvided, hashExpected) && providedBuf.length === expectedBuf.length;
  if (!isMatch) {
    return { valid: false, reason: 'Invalid operator secret.' };
  }

  return { valid: true };
}

/**
 * Computes SHA-256 digest of a file using bounded streaming (constant memory footprint).
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Creates an immutable, deep-cloned snapshot of the database state to prevent
 * torn reads or mutations during streaming.
 */
export function takeImmutableSnapshot(state: DatabaseSchema): DatabaseSchema {
  return structuredClone(state);
}

/**
 * Writes a chunk to a Writable stream respecting backpressure and client disconnects.
 */
async function writeWithDrain(stream: Writable, chunk: string): Promise<number> {
  if (stream.destroyed || !stream.writable) {
    throw new Error('Export stream was closed or aborted.');
  }
  const buf = Buffer.from(chunk, 'utf8');
  const canContinue = stream.write(buf);
  if (!canContinue) {
    await new Promise<void>((resolve, reject) => {
      const onDrain = () => {
        cleanup();
        resolve();
      };
      const onClose = () => {
        cleanup();
        reject(new Error('Export stream was closed prematurely by client.'));
      };
      const onError = (err: any) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        stream.off('drain', onDrain);
        stream.off('close', onClose);
        stream.off('error', onError);
      };
      stream.on('drain', onDrain);
      stream.on('close', onClose);
      stream.on('error', onError);
    });
  }
  return buf.length;
}

/**
 * Bounded streaming database export.
 * Streams all 45 collections sequentially without holding a single gigantic JSON string in memory.
 * Emits SHA-256 checksums per collection and across the entire payload.
 */
export async function streamDatabaseExport(
  snapshot: DatabaseSchema,
  outputStream: Writable,
  options?: {
    maxBytes?: number;
    exportId?: string;
    exportedAt?: string;
  }
): Promise<ExportStreamResult> {
  const maxBytes = options?.maxBytes ?? (100 * 1024 * 1024); // 100MB safety ceiling
  const exportId = options?.exportId || `exp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const exportedAt = options?.exportedAt || new Date().toISOString();
  const schemaVersion = snapshot.version || CURRENT_DATABASE_SCHEMA_VERSION;
  const databaseMeta: DatabaseSchemaMeta = snapshot.meta || {
    version: schemaVersion,
    compatibilityLevel: 'strict',
    supportedDomains: ['education', 'messaging', 'storage', 'personal', 'research']
  };

  let totalBytes = 0;
  const counts: Record<string, number> = {};
  const collectionChecksums: Record<string, string> = {};
  const overallHasher = crypto.createHash('sha256');

  const emit = async (chunk: string): Promise<void> => {
    if (outputStream.destroyed || !outputStream.writable) {
      throw new Error('Export stream was closed prematurely.');
    }
    totalBytes += Buffer.byteLength(chunk, 'utf8');
    if (totalBytes > maxBytes) {
      throw new ExportPayloadLimitExceededError(maxBytes);
    }
    overallHasher.update(chunk);
    await writeWithDrain(outputStream, chunk);
  };

  // 1. Compute pre-flight counts for manifest header
  for (const colName of ALL_DATABASE_COLLECTIONS) {
    const arr = (snapshot as any)[colName];
    counts[colName] = Array.isArray(arr) ? arr.length : 0;
  }

  // 2. Open top-level envelope
  await emit('{\n');
  await emit(`  "exportId": ${JSON.stringify(exportId)},\n`);
  await emit(`  "exportedAt": ${JSON.stringify(exportedAt)},\n`);
  await emit(`  "schemaVersion": ${schemaVersion},\n`);
  await emit(`  "meta": ${JSON.stringify(databaseMeta)},\n`);
  await emit(`  "collectionCounts": ${JSON.stringify(counts, null, 2).replace(/\n/g, '\n  ')},\n`);
  await emit('  "collections": {\n');

  // 3. Stream each collection one by one
  for (let cIdx = 0; cIdx < ALL_DATABASE_COLLECTIONS.length; cIdx++) {
    const colName = ALL_DATABASE_COLLECTIONS[cIdx];
    const items: any[] = Array.isArray((snapshot as any)[colName]) ? (snapshot as any)[colName] : [];
    const isLastCollection = cIdx === ALL_DATABASE_COLLECTIONS.length - 1;

    const colHasher = crypto.createHash('sha256');
    await emit(`    ${JSON.stringify(colName)}: [\n`);

    for (let iIdx = 0; iIdx < items.length; iIdx++) {
      const item = items[iIdx];
      const isLastItem = iIdx === items.length - 1;
      const serialized = JSON.stringify(item);
      colHasher.update(serialized);
      const line = `      ${serialized}${isLastItem ? '' : ','}\n`;
      await emit(line);
    }

    await emit(`    ]${isLastCollection ? '' : ','}\n`);
    collectionChecksums[colName] = colHasher.digest('hex');
  }

  const overallChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(collectionChecksums))
    .digest('hex');

  await emit('  },\n');
  await emit(`  "collectionChecksums": ${JSON.stringify(collectionChecksums, null, 2).replace(/\n/g, '\n  ')},\n`);
  await emit(`  "overallChecksum": ${JSON.stringify(overallChecksum)}\n`);
  await emit('}\n');

  return {
    exportId,
    exportedAt,
    schemaVersion,
    totalBytesEmitted: totalBytes,
    counts,
    collectionChecksums,
    overallChecksum
  };
}

/**
 * Scans data/storage/objects/ and generates an authoritative manifest mapping
 * every binary object to its storage key, size, and SHA-256 checksum.
 */
export async function generateStorageManifest(
  storageDir?: string,
  knownFiles: FileRecord[] = []
): Promise<StorageManifest> {
  const baseDir = storageDir || path.resolve(process.cwd(), 'data', 'storage', 'objects');
  const manifestItems: StorageObjectManifestItem[] = [];

  const fileMapByStorageKey = new Map<string, FileRecord>();
  for (const f of knownFiles) {
    if (f.storageKey) fileMapByStorageKey.set(f.storageKey, f);
  }

  if (fs.existsSync(baseDir)) {
    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    // Sort entries deterministically by filename
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      // Skip .gitkeep, metadata sidecars, and temporary files
      if (entry.name === '.gitkeep' || entry.name.endsWith('.meta.json') || entry.name.includes('.tmp.')) {
        continue;
      }

      const filePath = path.join(baseDir, entry.name);
      const stat = await fs.promises.stat(filePath);
      const sha256 = await computeFileSha256(filePath);

      // Check if there is an associated record in DatabaseSchema.files
      const fileRecord = fileMapByStorageKey.get(entry.name);

      // Check sidecar metadata if present
      let mimeType = fileRecord?.mimeType || 'application/octet-stream';
      const metaPath = `${filePath}.meta.json`;
      if (!fileRecord && fs.existsSync(metaPath)) {
        try {
          const metaJson = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
          if (metaJson.mimeType) mimeType = metaJson.mimeType;
        } catch {
          // ignore
        }
      }

      manifestItems.push({
        storageKey: entry.name,
        filename: fileRecord?.originalName || entry.name,
        sizeBytes: stat.size,
        sha256,
        mimeType,
        associatedFileId: fileRecord?.id
      });
    }
  }

  // Compute manifest-level checksum over deterministic canonical items
  const manifestChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifestItems))
    .digest('hex');

  const totalSizeBytes = manifestItems.reduce((acc, item) => acc + item.sizeBytes, 0);

  return {
    manifestVersion: 1,
    generatedAt: new Date().toISOString(),
    totalObjects: manifestItems.length,
    totalSizeBytes,
    manifestChecksum,
    objects: manifestItems
  };
}

/**
 * Safely resolves an object stream for an operator binary download with traversal protection.
 */
export async function getStorageObjectStream(
  storageKey: string,
  storageDir?: string
): Promise<{
  stream: fs.ReadStream;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
}> {
  const baseDir = storageDir || path.resolve(process.cwd(), 'data', 'storage', 'objects');
  const sanitized = storageKey.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!sanitized || sanitized.includes('..')) {
    throw new Error(`Invalid storage key '${storageKey}'.`);
  }

  const normalizedBase = path.resolve(baseDir);
  const targetPath = path.resolve(normalizedBase, sanitized);
  if (targetPath !== normalizedBase && !targetPath.startsWith(normalizedBase + path.sep)) {
    throw new Error(`Directory traversal prevented for key '${storageKey}'.`);
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Binary object with storage key '${storageKey}' not found.`);
  }

  const stat = await fs.promises.stat(targetPath);
  if (!stat.isFile()) {
    throw new Error(`Binary object with storage key '${storageKey}' is not a regular file.`);
  }

  const sha256 = await computeFileSha256(targetPath);

  let mimeType = 'application/octet-stream';
  const metaPath = `${targetPath}.meta.json`;
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
      if (meta.mimeType) mimeType = meta.mimeType;
    } catch {
      // ignore
    }
  }

  const stream = fs.createReadStream(targetPath);
  return {
    stream,
    sizeBytes: stat.size,
    sha256,
    mimeType
  };
}
