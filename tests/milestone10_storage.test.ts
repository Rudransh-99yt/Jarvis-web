// Milestone 10: Unified File & Storage Foundation Automated Test Suite
import { jarvisData, createRepository, setActiveRepository, resetActiveRepository, DiskJarvisDataRepository } from '../server/data/index.ts';
import { LocalStorageProvider } from '../server/storage/localStorageProvider.ts';
import { storageManager } from '../server/storage/providerManager.ts';
import { validateUpload, sanitizeFilename } from '../server/storage/validator.ts';
import { fileService } from '../server/storage/fileService.ts';
import { fileAuth } from '../server/storage/fileAuth.ts';
import { ragStorageBridge } from '../server/storage/ragBridge.ts';
import { toolExecutor } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import type { User } from '../server/data/types.ts';
import path from 'node:path';
import fs from 'node:fs';

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Assertion failed: ${testName}`);
  }
  console.log(`[PASS] ${testName}`);
}

const testContext: ToolExecutionContext = {
  sessionId: 'test-storage-session',
  timestamp: new Date().toISOString(),
  serverUptime: 200,
  sector: 'storage',
  userId: 'user-tony',
  role: 'commander'
};

import { authService } from '../server/auth/tokens.ts';
async function runMilestone10Tests() {
  console.log('\n=== [WEB JARVIS] MILESTONE 10: UNIFIED FILE & STORAGE FOUNDATION TEST SUITE ===\n');

  // Initialize isolated data repository
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `m10-test-jarvis-${Date.now()}.json`);
  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  const testStorageDir = path.resolve(process.cwd(), 'data', 'test-storage', 'objects');
  const storageProvider = new LocalStorageProvider(testStorageDir);
  await storageProvider.init();
  storageManager.setProvider(storageProvider);

  // Test 1: Storage Provider - Put & Get
  const samplePdfBytes = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Quantum Stabilization Specs) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  const putResult = await storageProvider.putObject('test-spec-1.pdf', samplePdfBytes, { mimeType: 'application/pdf' });

  assert(putResult.storageKey === 'test-spec-1.pdf', '1. StorageProvider: putObject stores key');
  assert(putResult.sizeBytes === samplePdfBytes.length, '2. StorageProvider: putObject records accurate sizeBytes');
  assert(Boolean(putResult.sha256 && putResult.sha256.length === 64), '3. StorageProvider: Computes deterministic SHA-256');

  // Test 4: Storage Provider - Read
  const retrievedBytes = await storageProvider.getObject('test-spec-1.pdf');
  assert(Boolean(retrievedBytes && retrievedBytes.equals(samplePdfBytes)), '4. StorageProvider: getObject returns byte-identical buffer');

  // Test 5: Storage Provider - Metadata
  const meta = await storageProvider.getObjectMetadata('test-spec-1.pdf');
  assert(Boolean(meta && meta.sizeBytes === samplePdfBytes.length && meta.sha256 === putResult.sha256), '5. StorageProvider: getObjectMetadata returns correct hash and size');

  // Test 6: Storage Provider - Missing Object
  const missingBytes = await storageProvider.getObject('non-existent-key.bin');
  assert(missingBytes === null, '6. StorageProvider: getObject returns null for missing key');

  // Test 7: Storage Provider - Delete
  const hasBefore = await storageProvider.hasObject('test-spec-1.pdf');
  assert(hasBefore === true, '7. StorageProvider: hasObject returns true before deletion');
  const deleteOk = await storageProvider.deleteObject('test-spec-1.pdf');
  assert(deleteOk === true, '8. StorageProvider: deleteObject removes physical file');
  const hasAfter = await storageProvider.hasObject('test-spec-1.pdf');
  assert(hasAfter === false, '9. StorageProvider: hasObject returns false after deletion');

  // Test 10: Security - Filename Sanitization & Directory Traversal Protection
  const unsafeName = '../../../../etc/passwd\0.sh';
  const sanitized = sanitizeFilename(unsafeName);
  assert(!sanitized.includes('..') && !sanitized.includes('/') && !sanitized.includes('\0'), '10. Security: Filename sanitizer strips traversal and null bytes');

  let traversalBlocked = false;
  try {
    await storageProvider.putObject('../../../unsafe.txt', Buffer.from('malicious payload'));
  } catch (err: any) {
    traversalBlocked = err.message.includes('traversal') || err.message.includes('Invalid');
  }
  assert(traversalBlocked, '11. Security: StorageProvider rejects directory traversal keys');

  // Test 12: Validation - Allowed & Disallowed Extensions
  const validVal = validateUpload('assignment_notes.md', Buffer.from('# Quantum Field Theory Notes\n\nDiscussion on operators.'));
  assert(validVal.valid === true && validVal.extension === 'md', '12. Validation: Accepts valid markdown document');

  const invalidExtVal = validateUpload('payload.exe', Buffer.from('MZ\x90\x00\x03\x00\x00\x00'));
  assert(invalidExtVal.valid === false && invalidExtVal.error?.includes('not permitted'), '13. Validation: Rejects executable .exe extension');

  // Test 14: Validation - Magic Byte Mismatch
  const fakePdfVal = validateUpload('spoofed.pdf', Buffer.from('Plain text claiming to be a PDF file'));
  assert(fakePdfVal.valid === false && fakePdfVal.error?.includes('PDF binary signature'), '14. Validation: Catches magic byte mismatch on spoofed PDF');

  // Test 15: Validation - Oversized File
  const smallLimitConfig = { maxSizeBytes: 100 }; // 100 bytes limit
  const oversizedVal = validateUpload('large.txt', Buffer.alloc(500, 'A'), 'text/plain', smallLimitConfig);
  assert(oversizedVal.valid === false && oversizedVal.error?.includes('exceeds maximum'), '15. Validation: Enforces maximum file-size limit');

  // Test 16: FileService - Secure Upload Lifecycle
  const tonyUser: User = (await jarvisData.users.getById('user-tony'))!;
  const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Arc Reactor Safety Protocol) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

  const uploadedFile = await fileService.uploadFile(
    {
      originalName: 'Arc_Reactor_Safety_Protocol.pdf',
      mimeType: 'application/pdf',
      buffer: testPdfContent,
      workspaceId: 'ws-stark-core',
      ownerUserId: 'user-tony',
      classId: 'class-phys-301',
      description: 'Official safety guidelines for toroidal arc containment.',
      tags: ['Safety', 'Arc Reactor']
    },
    tonyUser
  );

  assert(Boolean(uploadedFile && uploadedFile.id.startsWith('file-')), '16. FileService: uploadFile creates persistent FileRecord');
  assert(uploadedFile.status === 'ready', '17. FileService: File lifecycle status is marked ready');
  assert(uploadedFile.extension === 'pdf', '18. FileService: Preserves validated extension');
  assert(uploadedFile.sha256.length === 64, '19. FileService: Records SHA-256 content hash');

  // Test 20: Tenant-Safe Deduplication
  const secondUpload = await fileService.uploadFile(
    {
      originalName: 'Duplicate_Arc_Safety_Copy.pdf',
      mimeType: 'application/pdf',
      buffer: testPdfContent,
      workspaceId: 'ws-stark-core',
      ownerUserId: 'user-tony'
    },
    tonyUser
  );
  assert(secondUpload.id !== uploadedFile.id, '20. Deduplication: Distinct FileRecords maintained for separate uploads');
  assert(secondUpload.storageKey === uploadedFile.storageKey, '21. Deduplication: Reuses same physical storage key for identical content');

  // Test 22: Authorization - Cross-Workspace Isolation
  let crossWsBlocked = false;
  try {
    const foreignUser: User = {
      id: 'foreign-operative-1',
      displayName: 'Foreign Agent',
      email: 'foreign@shield.gov',
      role: 'guest',
      createdAt: new Date().toISOString()
    };
    await fileService.getFileContent(uploadedFile.id, foreignUser, 'ws-foreign-workspace');
  } catch (err: any) {
    crossWsBlocked = err.message.includes('Cross-workspace') || err.message.includes('not found') || err.message.includes('denied');
  }
  assert(crossWsBlocked, '22. Authorization: Blocks cross-workspace file access');

  // Test 23: Authorization - Role-Based Class Access (Teacher vs Student)
  const student1: User = (await jarvisData.users.getById('student-1')) || {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'alex@stark.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const studentCheck = await fileAuth.canAccessFile(student1, uploadedFile);
  assert(studentCheck.allowed === true, '23. Authorization: Enrolled student can access course materials');

  // Non-enrolled student on private class file
  const outsiderStudent: User = {
    id: 'student-outsider-99',
    displayName: 'Outsider Student',
    email: 'outsider@mit.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };
  const outsiderCheck = await fileAuth.canAccessFile(outsiderStudent, {
    ...uploadedFile,
    isPublicInWorkspace: false
  });
  assert(outsiderCheck.allowed === false, '24. Authorization: Non-enrolled student denied access to private class material');

  // Test 25: RAG Integration Bridge - Ingest Stored File
  const markdownReportBuf = Buffer.from(
    '# Toroidal Magnetic Field Derivation\n\n' +
    'The magnetic field inside a toroid with N turns carrying current I is given by Ampere law:\n' +
    'B = (mu_0 * N * I) / (2 * pi * r).\n\n' +
    '## Boundary Integration\n' +
    'Applying Stokes Theorem to the closed loop around the toroidal circumference confirms the magnetic flux is completely enclosed within the core cavity.'
  );

  const researchFile = await fileService.uploadFile(
    {
      originalName: 'Toroidal_Field_Derivation.md',
      mimeType: 'text/markdown',
      buffer: markdownReportBuf,
      workspaceId: 'ws-stark-core',
      ownerUserId: 'user-tony',
      knowledgeSpaceId: 'ks-quantum'
    },
    tonyUser
  );

  const ragIngestResult = await ragStorageBridge.ingestFileToKnowledgeSpace(
    researchFile.id,
    'ks-quantum',
    tonyUser
  );

  assert(Boolean(ragIngestResult.sourceId.startsWith('src-')), '25. RAG Bridge: Ingests stored file into Knowledge Space source');
  assert(ragIngestResult.chunksIndexed >= 1, '26. RAG Bridge: Chunks indexed and generated into vector store');

  // Verify updated FileRecord points to KnowledgeSource
  const refreshedResearchFile = await jarvisData.files.getById(researchFile.id);
  assert(Boolean(refreshedResearchFile && refreshedResearchFile.knowledgeSourceId === ragIngestResult.sourceId), '27. RAG Bridge: FileRecord updated with knowledgeSourceId');

  // Test 28: Cascading RAG Deletion Cleanup
  const cleanupResult = await ragStorageBridge.cleanupRagOnDeletion(refreshedResearchFile!);
  assert(cleanupResult.deletedSourceId === ragIngestResult.sourceId, '28. RAG Bridge: Purges KnowledgeSource on file deletion');
  const sourceAfter = await jarvisData.knowledge.getSourceById(ragIngestResult.sourceId);
  assert(sourceAfter === null, '29. RAG Bridge: No orphaned knowledge source remains in database');

  // Test 30: Tools System - storage.file.list
  const toolListResult = await toolExecutor.execute({
    name: 'storage.file.list',
    args: { workspaceId: 'ws-stark-core' }
  }, testContext);
  assert(toolListResult.ok === true && (toolListResult.data?.count as number) >= 1, '30. Tool: storage.file.list returns stored files');

  // Test 31: Tools System - storage.file.get
  const toolGetResult = await toolExecutor.execute({
    name: 'storage.file.get',
    args: { fileId: uploadedFile.id, workspaceId: 'ws-stark-core' }
  }, testContext);
  assert(toolGetResult.ok === true && toolGetResult.data?.file !== undefined, '31. Tool: storage.file.get returns metadata');

  // Test 32: Tools System - storage.file.delete
  const toolDelResult = await toolExecutor.execute({
    name: 'storage.file.delete',
    args: { fileId: secondUpload.id, workspaceId: 'ws-stark-core' }
  }, testContext);
  assert(toolDelResult.ok === true && toolDelResult.data?.success === true, '32. Tool: storage.file.delete removes file');

  // Test 33: Persistence & Restart Simulation
  await jarvisData.flush();
  const restoredRepo = createRepository('disk', testDbPath);
  await restoredRepo.init();

  const recoveredFile = await restoredRepo.files.getById(uploadedFile.id, 'ws-stark-core');
  assert(Boolean(recoveredFile && recoveredFile.originalName === uploadedFile.originalName), '33. Persistence: File metadata preserved across restart simulation');

  // Test 34: Physical file remains readable from storage after restart
  const diskBytesAfterRestart = await fileService.getFileContent(uploadedFile.id, tonyUser, 'ws-stark-core');
  assert(Boolean(diskBytesAfterRestart.buffer && diskBytesAfterRestart.buffer.equals(testPdfContent)), '34. Persistence: Physical file remains byte-identical after simulated restart');

  // Clean up temporary test storage folder & temporary test DB
  resetActiveRepository();
  storageManager.resetToDefault();
  try {
    await fs.promises.rm(path.resolve(process.cwd(), 'data', 'test-storage'), { recursive: true, force: true });
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  console.log('\n=== ALL 34 MILESTONE 10 STORAGE & FILE TESTS PASSED SUCCESSFULLY! ===\n');
  process.exit(0);
}

runMilestone10Tests().catch((err) => {
  console.error('\n[FATAL] Milestone 10 test suite failed:', err);
  process.exit(1);
});
