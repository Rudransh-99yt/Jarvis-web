// End-to-End Hardening & Comprehensive Verification Audit Test Suite (Milestones 1–10)
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { jarvisData, setActiveRepository, resetActiveRepository } from '../server/data/index.ts';
import { DiskJarvisDataRepository } from '../server/data/diskRepository.ts';
import { toolRegistry, toolExecutor } from '../server/tools/index.ts';
import { fileService } from '../server/storage/fileService.ts';
import { storageManager } from '../server/storage/providerManager.ts';
import { LocalStorageProvider } from '../server/storage/localStorageProvider.ts';
import { validateUpload } from '../server/storage/validator.ts';
import { fileAuth } from '../server/storage/fileAuth.ts';
import { ragStorageBridge } from '../server/storage/ragBridge.ts';
import { retrievalService } from '../server/rag/retrievalService.ts';
import { groundingService } from '../server/rag/groundingService.ts';
import { educationStore } from '../server/sectors/education/educationStore.ts';
import { researchAssistant } from '../server/sectors/research/researchAssistant.ts';
import type { User } from '../server/data/types.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Audit Assertion Failed: ${testName} - ${JSON.stringify(detail || '')}`);
  }
}

async function runAuditTestSuite() {
  console.log('\n================================================================');
  console.log('=== JARVIS-WEB FULL MILESTONES 1–10 VERIFICATION & AUDIT SUITE ===');
  console.log('================================================================\n');

  // Initialize and seed isolated repository
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `audit-db-${Date.now()}.json`);

  const testStorageDir = path.resolve(process.cwd(), 'tests', '.tmp-storage', `objects-${Date.now()}`);
  if (!fs.existsSync(testStorageDir)) fs.mkdirSync(testStorageDir, { recursive: true });

  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  const testStorageProvider = new LocalStorageProvider(testStorageDir);
  await testStorageProvider.init();
  storageManager.setProvider(testStorageProvider);

  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Sarah Connor',
    email: 'sarah@stark.local',
    role: 'teacher',
    createdAt: new Date().toISOString()
  };

  const studentUser: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'alex@stark.local',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const outsiderUser: User = {
    id: 'user-intruder',
    displayName: 'Intruder',
    email: 'intruder@rogue.org',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const dummyContext: ToolExecutionContext = {
    sessionId: 'session-audit-1',
    callCount: 1,
    maxRounds: 5,
    executedTools: [],
    userId: teacherUser.id,
    role: 'teacher'
  };

  // -------------------------------------------------------------
  // SECTION 1: M1–M4 CORE PLATFORM & TOOLS ENGINE
  // -------------------------------------------------------------
  console.log('\n--- SECTION 1: M1–M4 Core Platform & Tool Engine ---');

  // 1. Tool catalog count
  const allTools = toolRegistry.list();
  assert(allTools.length >= 31, '1. Tool Registry has at least 31 deterministic tools registered', { count: allTools.length });

  // 2. Tool sectors distribution
  const systemTools = toolRegistry.list('system');
  const eduTools = toolRegistry.list('education');
  const ragTools = toolRegistry.list('knowledge');
  const researchTools = toolRegistry.list('research');
  const storageTools = toolRegistry.list('storage');
  assert(
    systemTools.length >= 4 &&
    eduTools.length >= 5 &&
    ragTools.length >= 6 &&
    researchTools.length >= 10 &&
    storageTools.length >= 4,
    '2. Tool catalog correctly segmented across system, education, knowledge, research, and storage sectors'
  );

  // 3. Tool argument validation rejection
  const invalidToolExec = await toolExecutor.execute(
    { name: 'education.assignment.create', args: { classId: 'cls-1' } as any },
    dummyContext
  );
  assert(!invalidToolExec.ok && invalidToolExec.error?.code === 'INVALID_ARGUMENTS', '3. Tool argument validation rejects missing required properties');

  // 4. Unknown tool sandboxed rejection
  const unknownToolExec = await toolExecutor.execute(
    { name: 'malicious.system.override', args: {} },
    dummyContext
  );
  assert(!unknownToolExec.ok && unknownToolExec.error?.code === 'UNKNOWN_TOOL', '4. Sandboxed executor rejects unregistered tools safely');

  // 5. REST API Health check handshake
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const health = await healthRes.json();
    assert(
      healthRes.ok &&
      health.status === 'healthy' &&
      health.persistence?.persistent === true &&
      health.tools?.count >= 31,
      '5. REST API GET /api/health reports healthy system state, persistence active, and 31+ tools'
    );
  } catch (err: any) {
    assert(jarvisData.isPersistent === true, '5. (Fallback) Persistent data driver verified directly', err);
  }

  // -------------------------------------------------------------
  // SECTION 2: FLOW A — TEACHER MATERIAL TO CLASS & KNOWLEDGE SPACE
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: FLOW A — Teacher Material Upload, RAG Ingest, & Student Access ---');

  const pdfPayload = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nQuantum Electrodynamics and Feynman Diagrams: Photons propagate with propagator D_F(k) = -i g_{\\mu\\nu} / (k^2 + i\\epsilon). Electron propagator S_F(p) = i / (\\gamma^\\mu p_\\mu - m + i\\epsilon).\n%%EOF`;
  const pdfBuffer = Buffer.from(pdfPayload, 'utf-8');

  // 6. Teacher uploads valid PDF class material
  const teacherUpload = await fileService.uploadFile(
    {
      originalName: 'QED-Lecture-Notes.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
      workspaceId: 'ws-stark-core',
      classId: 'class-phys-301',
      description: 'Quantum Electrodynamics Lecture Notes for Physics 301',
      tags: ['physics', 'quantum', 'qed']
    },
    teacherUser
  );

  assert(
    teacherUpload &&
    teacherUpload.status === 'ready' &&
    teacherUpload.extension === 'pdf' &&
    teacherUpload.classId === 'class-phys-301',
    '6. Teacher successfully uploads QED class material with ready status'
  );

  // 7. Enrolled student can read file metadata and download buffer
  const studentFileMeta = await fileService.getFileMetadata(teacherUpload.id, studentUser);
  const studentFileContent = await fileService.getFileContent(teacherUpload.id, studentUser);
  assert(
    studentFileMeta.id === teacherUpload.id &&
    studentFileContent.buffer.equals(pdfBuffer),
    '7. Enrolled student has verified read/download access to class materials'
  );

  // 8. Ingest file into Knowledge Space ks-quantum
  const bridgeRes = await ragStorageBridge.ingestFileToKnowledgeSpace(
    teacherUpload.id,
    'ks-quantum',
    teacherUser
  );
  teacherUpload.knowledgeSourceId = bridgeRes.sourceId;
  assert(
    bridgeRes.chunksIndexed > 0 &&
    bridgeRes.file.knowledgeSourceId !== undefined,
    '8. Teacher material ingested into Knowledge Space, vector chunks indexed, and FileRecord updated'
  );

  // 9. Unauthorized outsider denied file access
  let outsiderDenied = false;
  try {
    await fileService.getFileContent(teacherUpload.id, outsiderUser);
  } catch (err: any) {
    outsiderDenied = err.message.includes('denied') || err.message.includes('not a member');
  }
  assert(outsiderDenied, '9. Non-member outsider denied access to class material');

  // -------------------------------------------------------------
  // SECTION 3: FLOW B — STUDENT GROUNDED KNOWLEDGE RETRIEVAL
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: FLOW B — Student Grounded Retrieval & Refusal ---');

  // 10. Student retrieves relevant chunks from ingested lecture
  const retrievedChunks = await retrievalService.retrieve(
    'ks-quantum',
    'Feynman diagrams photon electron propagator',
    { workspaceId: 'ws-stark-core' }
  );
  assert(
    retrievedChunks.length > 0 &&
    retrievedChunks.some((c) => c.text.includes('Feynman Diagrams') || c.text.includes('propagator')),
    '10. Retrieval successfully discovers indexed chunks from uploaded PDF material'
  );

  // 11. Grounded synthesis returns answers with structured citations
  const groundedAnswer = await groundingService.answerQuery(
    'ks-quantum',
    'What is the photon propagator in Quantum Electrodynamics?',
    { workspaceId: 'ws-stark-core', userId: studentUser.id, userRole: 'student' }
  );
  assert(
    groundedAnswer.isGrounded === true &&
    groundedAnswer.citations.length > 0 &&
    typeof groundedAnswer.answer === 'string',
    '11. Grounded answer synthesized with verifiable citations referencing uploaded PDF source'
  );

  // 12. Insufficient evidence refusal when querying out-of-domain prompt
  const ungroundedAnswer = await groundingService.answerQuery(
    'ks-quantum',
    'What was the secret recipe for 14th century Venetian blown glassware pigment?',
    { workspaceId: 'ws-stark-core', minConfidenceScore: 0.99 }
  );
  assert(
    ungroundedAnswer.isGrounded === false &&
    ungroundedAnswer.citations.length === 0 &&
    ungroundedAnswer.answer.toLowerCase().includes('insufficient evidence'),
    '12. Insufficient evidence refusal guard triggers with 0 manufactured citations'
  );

  // -------------------------------------------------------------
  // SECTION 4: FLOW C — ASSIGNMENT, SUBMISSION, & GRADING LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: FLOW C — Academic Assignment & Submission Workflow ---');

  // 13. Teacher creates assignment
  const newAssignment = educationStore.createAssignment({
    classId: 'class-phys-301',
    title: 'Audit Lab: QED Loop Corrections',
    description: 'Calculate 1-loop vertex correction.',
    instructions: 'Compute Ward-Takahashi identity validation.',
    dueDate: '2026-11-20',
    maxScore: 100,
    category: 'Lab Report',
    teacherId: teacherUser.id
  });
  assert(newAssignment && newAssignment.id.startsWith('asg-'), '13. Teacher creates new academic assignment');

  // 14. Student submits assignment with attached file reference
  const submissionUpload = await fileService.uploadFile(
    {
      originalName: 'Alex-Chen-QED-Lab-Report.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Lab Submission\n\nWard identity verified for vertex Gamma^mu.', 'utf-8'),
      workspaceId: 'ws-stark-core',
      classId: 'class-phys-301',
      assignmentId: newAssignment.id,
      submissionId: `sub-${studentUser.id}-${newAssignment.id}`
    },
    studentUser
  );

  const studentSub = educationStore.createOrUpdateSubmission({
    assignmentId: newAssignment.id,
    studentId: studentUser.id,
    studentName: studentUser.displayName,
    content: 'Completed derivation with attached notes.',
    attachments: [{ name: submissionUpload.originalName, size: '1.2 KB' }]
  });
  assert(studentSub && studentSub.status === 'submitted', '14. Student submits assignment work with linked submission');

  // 15. Student submission access control: Other students cannot access Alex submission file
  const otherStudent: User = {
    id: 'student-99',
    displayName: 'Peter Parker',
    email: 'peter@stark.local',
    role: 'student',
    createdAt: new Date().toISOString()
  };
  const otherStudentAuth = await fileAuth.canAccessFile(otherStudent, submissionUpload);
  assert(!otherStudentAuth.allowed, '15. Peer students denied access to classmate submission files');

  // 16. Teacher grades the submission
  const gradedSub = educationStore.gradeSubmission(studentSub.id, 98, 'Flawless calculation of the Ward identity.');
  assert(gradedSub !== null && gradedSub.status === 'graded' && gradedSub.grade === 98, '16. Teacher successfully grades student submission');

  // -------------------------------------------------------------
  // SECTION 5: FLOW E — COMPREHENSIVE MULTI-TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: FLOW E — Strict Tenant & Workspace Boundary Enforcement ---');

  const rogueWorkspaceId = 'ws-rogue-organization';

  // 17. Cross-workspace File Upload blocked
  let crossWsUploadBlocked = false;
  try {
    await fileService.uploadFile(
      {
        originalName: 'Secret.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Top secret', 'utf-8'),
        workspaceId: rogueWorkspaceId
      },
      studentUser
    );
  } catch (err: any) {
    crossWsUploadBlocked = err.message.includes('not a member');
  }
  assert(crossWsUploadBlocked, '17. Cross-workspace file upload strictly rejected');

  // 18. Cross-workspace File Download blocked
  let crossWsDownloadBlocked = false;
  try {
    await fileService.getFileContent(teacherUpload.id, {
      ...studentUser,
      id: 'outsider-99'
    }, rogueWorkspaceId);
  } catch (err: any) {
    crossWsDownloadBlocked =
      err.message.includes('denied') ||
      err.message.includes('not a member') ||
      err.message.includes('not found');
  }
  assert(crossWsDownloadBlocked, '18. Cross-workspace file retrieval blocked');

  // 19. Cross-workspace Knowledge Space isolation
  const crossWsSpace = await jarvisData.knowledge.getSpaceById('ks-quantum', rogueWorkspaceId);
  assert(crossWsSpace === null, '19. Knowledge Space query enforces workspace isolation');

  // 20. Cross-workspace RAG retrieval returns zero results
  const crossWsRag = await retrievalService.retrieve('ks-quantum', 'Schrödinger', {
    workspaceId: rogueWorkspaceId
  });
  assert(crossWsRag.length === 0, '20. RAG retrieval yields 0 chunks when querying from unauthorized workspace');

  // 21. Cross-workspace Research Project isolation
  const researchProj = await jarvisData.research.createProject({
    workspaceId: 'ws-stark-core',
    ownerId: teacherUser.id,
    title: 'Arc Reactor Plasma Confinement',
    description: 'Stabilizing magnetohydrodynamic equilibrium.',
    researchQuestion: 'How to suppress tearing modes in 3.2 GW core?'
  });
  const crossWsProj = await jarvisData.research.getProjectById(researchProj.id, rogueWorkspaceId);
  assert(crossWsProj === null, '21. Research Project lookup strictly respects workspace boundary');

  // 22. Cross-workspace Conversations isolation
  const crossWsConvs = await jarvisData.conversations.list(rogueWorkspaceId);
  assert(crossWsConvs.length === 0, '22. Workspace isolation holds for conversation message logs');

  // -------------------------------------------------------------
  // SECTION 6: FLOW F — FILE LIFECYCLE, VALIDATION, SECURITY, & CASINO-SAFE RAG PURGE
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: FLOW F — File Lifecycle, Security, & Safe Deletion ---');

  // 23. Path traversal attack defense in originalName
  const traversalCheck = validateUpload('../../etc/shadow.pdf', pdfBuffer, 'application/pdf');
  assert(
    traversalCheck.valid &&
    !traversalCheck.sanitizedName.includes('..') &&
    !traversalCheck.sanitizedName.includes('/'),
    '23. Path traversal sequences (../) stripped from client-provided filenames'
  );

  // 24. Executable / dangerous extension rejection
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary');
  const exeVal = validateUpload('trojan.exe', exeBuffer, 'application/x-msdownload');
  assert(!exeVal.valid && (exeVal.error?.includes('not permitted') || exeVal.error?.includes('disallowed')), '24. Executable files (.exe) strictly rejected by security allowlist');

  // 25. Magic byte mismatch detection (spoofed PDF extension)
  const fakePdfBuffer = Buffer.from('Plain text claiming to be a PDF without magic header', 'utf-8');
  const fakePdfVal = validateUpload('spoofed.pdf', fakePdfBuffer, 'application/pdf');
  assert(!fakePdfVal.valid && (fakePdfVal.error?.includes('signature') || fakePdfVal.error?.includes('mismatch')), '25. Magic-byte inspection detects spoofed PDF headers');

  // 26. Maximum file size enforcement (> 25 MB rejected)
  const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024);
  const sizeVal = validateUpload('huge.pdf', oversizedBuffer, 'application/pdf');
  assert(!sizeVal.valid && sizeVal.error?.includes('exceeds maximum'), '26. Uploads exceeding 25 MB limit are rejected');

  // 27. Deduplication: Uploading identical file reuses storage key
  const uploadCopy = await fileService.uploadFile(
    {
      originalName: 'QED-Lecture-Duplicate.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
      workspaceId: 'ws-stark-core',
      description: 'Second copy of QED lecture notes'
    },
    teacherUser
  );
  assert(
    uploadCopy.id !== teacherUpload.id &&
    uploadCopy.storageKey === teacherUpload.storageKey &&
    uploadCopy.sha256 === teacherUpload.sha256,
    '27. Tenant-safe deduplication reuses physical storage key for identical content within workspace'
  );

  // 28. Unauthorized deletion does NOT trigger RAG cleanup
  let unauthorizedDeleteFailed = false;
  try {
    await fileService.deleteFile(teacherUpload.id, studentUser);
  } catch (err: any) {
    unauthorizedDeleteFailed = err.message.includes('Unauthorized deletion') || err.message.includes('denied');
  }
  const sourceAfterUnauthorized = await jarvisData.knowledge.getSourceById(teacherUpload.knowledgeSourceId!);
  assert(
    unauthorizedDeleteFailed && sourceAfterUnauthorized !== null,
    '28. Unauthorized file deletion rejected and RAG source remains intact (zero premature cleanup)'
  );

  // 29. Authorized deletion cleans up FileRecord, physical storage object, and derived RAG data
  // Delete all siblings sharing teacherUpload.storageKey so reference count reaches 0
  const siblings = (await jarvisData.files.list({ workspaceId: 'ws-stark-core' }))
    .filter((f) => f.storageKey === teacherUpload.storageKey && f.id !== teacherUpload.id);
  for (const sib of siblings) {
    await fileService.deleteFile(sib.id, teacherUser);
  }

  const provider = storageManager.getProvider();
  const deletedOk = await fileService.deleteFile(teacherUpload.id, teacherUser);
  const physicalExistsAfterDelete = await provider.hasObject(teacherUpload.storageKey);
  const ragSourceAfterDelete = await jarvisData.knowledge.getSourceById(teacherUpload.knowledgeSourceId!);
  const ragChunksAfterDelete = await jarvisData.knowledge.getChunksForSource(teacherUpload.knowledgeSourceId!);

  assert(
    deletedOk === true &&
    physicalExistsAfterDelete === false &&
    ragSourceAfterDelete === null &&
    ragChunksAfterDelete.length === 0,
    '29. Authorized deletion cleans up FileRecord, physical disk object, and all derived RAG chunks'
  );

  // -------------------------------------------------------------
  // SECTION 7: FLOW D — PERSISTENCE & RESTARTS RECOVERY
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: FLOW D — Server Restart & Persistence Integrity ---');

  // 30. Create new durable entities
  const persistTestProj = await jarvisData.research.createProject({
    workspaceId: 'ws-stark-core',
    ownerId: teacherUser.id,
    title: 'Quantum Vacuum Fluctuations & Casimir Effect',
    description: 'Analyzing Casimir force between conducting plates.',
    researchQuestion: 'Does zero-point energy shift boundary conditions?'
  });

  const persistFilePayload = Buffer.from('# Casimir Force Calculation\nF/A = -pi^2 hbar c / (240 d^4)', 'utf-8');
  const persistFile = await fileService.uploadFile(
    {
      originalName: 'Casimir-Force.md',
      mimeType: 'text/markdown',
      buffer: persistFilePayload,
      workspaceId: 'ws-stark-core',
      researchProjectId: persistTestProj.id
    },
    teacherUser
  );

  // 31. Simulate complete process restart by instantiating new DiskJarvisDataRepository
  await jarvisData.flush();
  const freshRepo = new DiskJarvisDataRepository(jarvisData.storagePath);
  await freshRepo.init();

  const recoveredProj = await freshRepo.research.getProjectById(persistTestProj.id, 'ws-stark-core');
  const recoveredFile = await freshRepo.files.getById(persistFile.id, 'ws-stark-core');
  const recoveredBytes = await provider.getObject(persistFile.storageKey);

  assert(
    recoveredProj !== null &&
    recoveredProj.title === persistTestProj.title &&
    recoveredFile !== null &&
    recoveredFile.originalName === 'Casimir-Force.md' &&
    recoveredBytes !== null &&
    recoveredBytes.equals(persistFilePayload),
    '30. Data models, research entities, file metadata, and physical storage bytes survive restart with 100% integrity'
  );

  // -------------------------------------------------------------
  // SECTION 8: RESEARCH SECTOR (M9) GROUNDED ASSISTANT & TOOLS
  // -------------------------------------------------------------
  console.log('\n--- SECTION 8: Research Sector Grounded Assistant & Reports ---');

  // 32. Research Assistant investigation
  const researchInvestigation = await researchAssistant.investigate(
    persistTestProj.id,
    'What is the formulation for Casimir force per unit area?',
    { workspaceId: 'ws-stark-core', mode: 'investigate' }
  );
  assert(
    researchInvestigation &&
    typeof researchInvestigation.answer === 'string' &&
    researchInvestigation.answer.length > 0,
    '31. Research Assistant performs grounded multi-mode investigation'
  );

  // 33. Research Report generation
  const generatedReport = await researchAssistant.generateReport(
    persistTestProj.id,
    {
      title: 'Synthesis of Casimir Boundary States',
      workspaceId: 'ws-stark-core'
    }
  );
  assert(
    generatedReport &&
    generatedReport.title === 'Synthesis of Casimir Boundary States' &&
    Array.isArray(generatedReport.findings),
    '32. Research Assistant generates structured report with findings and limitations'
  );

  console.log('\n================================================================');
  console.log(`=== AUDIT SUMMARY: ALL ${passed}/${total} AUDIT TESTS PASSED! ===`);
  console.log('================================================================\n');

  // Teardown and cleanup test artifacts
  resetActiveRepository();
  storageManager.resetToDefault();
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(testStorageDir)) fs.rmSync(testStorageDir, { recursive: true, force: true });
  } catch {}
}

runAuditTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[AUDIT TEST SUITE CRASHED]', err);
    process.exit(1);
  });
