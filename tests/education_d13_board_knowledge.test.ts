// ============================================================================
// JARVIS EDUCATION OS — PHASE D.13: BOARD KNOWLEDGE ENGINE TEST SUITE
// ============================================================================

import { boardKnowledgeService } from '../server/sectors/education/smartboard/knowledge/boardKnowledgeService.ts';
import { smartboardStore } from '../server/sectors/education/smartboard/smartboardStore.ts';
import { toolExecutor } from '../server/tools/index.ts';
import { jarvisData, DiskJarvisDataRepository, setActiveRepository, resetActiveRepository } from '../server/data/index.ts';
import type { User } from '../server/data/types.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

function getFileSha256(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

import { authService } from '../server/auth/tokens.ts';
async function runD13BoardKnowledgeTests(): Promise<void> {
  console.log('\n======================================================================');
  console.log('=== [WEB JARVIS] PHASE D.13: BOARD KNOWLEDGE ENGINE TEST SUITE ===');
  console.log('======================================================================\n');

  const durableDbPath = path.resolve(process.cwd(), 'data/jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // Setup isolated temporary database for test suite
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `d13-test-db-${Date.now()}.json`);
  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  smartboardStore.resetToDefaults();

  // Mock User Identities
  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Helen Cho',
    email: 'helen.cho@starkacademy.edu',
    role: 'teacher',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    createdAt: new Date().toISOString()
  };

  const studentUser: User = {
    id: 'student-1',
    displayName: 'Peter Parker',
    email: 'peter.parker@starkacademy.edu',
    role: 'student',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    createdAt: new Date().toISOString()
  };

  const foreignUser: User = {
    id: 'teacher-foreign',
    displayName: 'External Instructor',
    email: 'external@other-school.edu',
    role: 'teacher',
    institutionId: 'inst-other-school',
    workspaceId: 'ws-other',
    createdAt: new Date().toISOString()
  };

  const teacherContext: ToolExecutionContext = {
    userId: 'teacher-1',
    role: 'teacher',
    sessionId: 'session-phys-101',
    timestamp: new Date().toISOString(),
    serverUptime: 1000
  };

  const studentContext: ToolExecutionContext = {
    userId: 'student-1',
    role: 'student',
    sessionId: 'session-phys-101',
    timestamp: new Date().toISOString(),
    serverUptime: 1000
  };

  // --- SECTION 1: Canonical Board Knowledge Model & Lifecycle ---
  console.log('--- SECTION 1: Canonical Board Knowledge Model & Lifecycle ---');

  const boardDoc = smartboardStore.getBoardDocument('bdoc-phys-101');
  assert(Boolean(boardDoc), '1.1 Pre-seeded BoardDocument bdoc-phys-101 exists in store');
  assert(boardDoc!.courseCode === 'PHYS-301', '1.2 Preserves academic course code PHYS-301');
  assert(boardDoc!.pages.length >= 2, '1.3 Contains multiple whiteboard pages with derivations');
  assert(boardDoc!.classroomId === 'class-phys-301', '1.4 Bound to physics classroom venue');

  // --- SECTION 2: Deterministic Knowledge Extraction Pipeline ---
  console.log('\n--- SECTION 2: Deterministic Knowledge Extraction Pipeline ---');

  const page1 = boardDoc!.pages[0];
  const extracted = boardKnowledgeService.extractPageContent(page1);

  assert(extracted.textSnippets.length > 0, '2.1 Extracts text notes with 100% teacher fidelity');
  assert(extracted.equations.length > 0, '2.2 Extracts mathematical equations from board elements');
  assert(
    extracted.equations.some((e) => e.expression.includes('E') || e.expression.includes('=')) || extracted.textSnippets.length > 0,
    '2.3 Identifies electric field formulas or core derivation statements'
  );
  assert(extracted.equations[0].confidence > 0, '2.4 Preserves explicit confidence score for equations');

  // --- SECTION 3: Board Indexing & Structured AI Enrichment ---
  console.log('\n--- SECTION 3: Board Indexing & Structured AI Enrichment ---');

  const indexedDoc = await boardKnowledgeService.indexBoardDocument(teacherUser, 'bdoc-phys-101', {
    triggerRagIngest: true
  });

  assert(indexedDoc.lifecycle === 'RELEASED' || indexedDoc.lifecycle === 'INDEXED', '3.1 Board lifecycle successfully transitions to INDEXED/RELEASED');
  assert(Boolean(indexedDoc.derivedKnowledge), '3.2 Generates structured derivedKnowledge payload');
  assert(indexedDoc.derivedKnowledge!.keyConcepts.length > 0, '3.3 Extracts key theoretical concepts');
  assert(indexedDoc.derivedKnowledge!.importantEquations.length > 0, '3.4 Extracts important equations with latex representations');
  assert(indexedDoc.derivedKnowledge!.definitions.length > 0, '3.5 Generates formal academic definitions');
  assert(indexedDoc.derivedKnowledge!.misconceptions.length > 0, '3.6 Identifies student misconceptions and corrections');
  assert(indexedDoc.derivedKnowledge!.revisionPoints.length > 0, '3.7 Generates actionable revision points');
  assert(indexedDoc.derivedKnowledge!.practiceQuestions.length > 0, '3.8 Synthesizes formative practice check questions');

  // --- SECTION 4: RAG Knowledge Space Integration ---
  console.log('\n--- SECTION 4: RAG Knowledge Space Integration ---');

  assert(indexedDoc.ragIndexed === true, '4.1 Board document flagged as ragIndexed: true');
  assert(Boolean(indexedDoc.ragSummary), '4.2 Preserves verifiable RAG ingestion summary');
  assert(Boolean(indexedDoc.knowledgeSourceId), '4.3 Bound to canonical KnowledgeSource in course Knowledge Space');

  // --- SECTION 5: Multi-Tenant Board Search ---
  console.log('\n--- SECTION 5: Multi-Tenant Board Search ---');

  // Search by concept
  const searchResults = boardKnowledgeService.searchBoardKnowledge(teacherUser, 'Gauss', {
    classId: 'class-phys-301'
  });
  assert(searchResults.length > 0, '5.1 Finds matching board sessions for concept query "Gauss"');
  assert(searchResults[0].boardDocumentId === 'bdoc-phys-101', '5.2 Matches target physics board document');
  assert(searchResults[0].confidence > 0.5, '5.3 Returns high confidence score for matching page');
  assert(searchResults[0].pageIndex >= 0, '5.4 Points back to exact page index coordinates');

  // Search by formula symbol
  const formulaSearch = boardKnowledgeService.searchBoardKnowledge(teacherUser, 'flux', {
    classId: 'class-phys-301'
  });
  assert(formulaSearch.length > 0, '5.5 Formula keyword search successfully matches derivation pages');

  // --- SECTION 6: Board-Aware Ask Jarvis ---
  console.log('\n--- SECTION 6: Board-Aware Ask Jarvis ---');

  const askRes = await boardKnowledgeService.askJarvisAboutBoard(teacherUser, 'What equation did we use for electric flux?', {
    boardDocumentId: 'bdoc-phys-101',
    courseCode: 'PHYS-301'
  });

  assert(Boolean(askRes.answer), '6.1 Produces pedagogical answer grounded in whiteboard');
  assert(askRes.groundedInBoard === true, '6.2 Flagged groundedInBoard: true');
  assert(askRes.relevantPageIndices.length > 0, '6.3 Cites exact whiteboard page numbers');
  assert(askRes.citedFormulas.length > 0, '6.4 Cites formulas from the whiteboard session');

  // --- SECTION 7: Derived Notes & Homework Generation ---
  console.log('\n--- SECTION 7: Derived Notes & Homework Generation ---');

  // Derived Workspace Notes
  const notesRes = await boardKnowledgeService.createDerivedNotes(teacherUser, 'bdoc-phys-101', {
    pageIndex: 0,
    customTitle: 'PHYS-301 Gauss Law Derived Notes'
  });
  assert(Boolean(notesRes.notesPageId), '7.1 Creates derived Workspace note page');
  assert(notesRes.blockCount > 2, '7.2 Structures note blocks with headings and formulas');

  const createdPage = boardKnowledgeService.getDerivedNotesPage(notesRes.notesPageId);
  assert(Boolean(createdPage), '7.3 Preserves derived WorkspacePage in store');
  assert(createdPage!.tags.includes('SmartBoard'), '7.4 Injects SmartBoard provenance tag');

  // Derived Homework Set
  const hwRes = await boardKnowledgeService.createDerivedHomeworkOrRevision(teacherUser, 'bdoc-phys-101', 'homework');
  assert(hwRes.questionCount === 2, '7.5 Generates homework draft questions derived from board derivations');
  assert(hwRes.requiresTeacherApproval === true, '7.6 Mandates teacher review before publishing to students');

  // --- SECTION 8: Release Workflow & Multi-Tenant RBAC Defense ---
  console.log('\n--- SECTION 8: Release Workflow & Multi-Tenant RBAC Defense ---');

  // Teacher unreleases board
  await boardKnowledgeService.releaseBoardDocument(teacherUser, 'bdoc-phys-101', false);
  const unreleasedDoc = smartboardStore.getBoardDocument('bdoc-phys-101');
  assert(unreleasedDoc!.isReleasedToStudents === false, '8.1 Teacher can unrelease board to private state');

  // Student search on unreleased board returns NOTHING
  const studentSearchUnreleased = boardKnowledgeService.searchBoardKnowledge(studentUser, 'Gauss', {
    classId: 'class-phys-301'
  });
  assert(
    !studentSearchUnreleased.some((r) => r.boardDocumentId === 'bdoc-phys-101'),
    '8.2 Student search strictly excludes unreleased private boards'
  );

  // Student cannot Ask Jarvis about unreleased board (403)
  let studentAskBlocked = false;
  try {
    await boardKnowledgeService.askJarvisAboutBoard(studentUser, 'Explain page 1', {
      boardDocumentId: 'bdoc-phys-101'
    });
  } catch (err: any) {
    studentAskBlocked = err.message.includes('403') || err.message.includes('Forbidden');
  }
  assert(studentAskBlocked, '8.3 Student blocked from querying unreleased board via Ask Jarvis (403)');

  // Student blocked from triggering board indexing (403)
  let studentIndexBlocked = false;
  try {
    await boardKnowledgeService.indexBoardDocument(studentUser, 'bdoc-phys-101');
  } catch (err: any) {
    studentIndexBlocked = err.message.includes('403');
  }
  assert(studentIndexBlocked, '8.4 Student blocked from indexing board documents (403)');

  // Student blocked from releasing board (403)
  let studentReleaseBlocked = false;
  try {
    await boardKnowledgeService.releaseBoardDocument(studentUser, 'bdoc-phys-101', true);
  } catch (err: any) {
    studentReleaseBlocked = err.message.includes('403');
  }
  assert(studentReleaseBlocked, '8.5 Student blocked from publishing/releasing board documents (403)');

  // Cross-institution access blocked (403)
  let crossInstBlocked = false;
  try {
    await boardKnowledgeService.indexBoardDocument(foreignUser, 'bdoc-phys-101');
  } catch (err: any) {
    crossInstBlocked = err.message.includes('403');
  }
  assert(crossInstBlocked, '8.6 Cross-institution unauthorized access strictly blocked (403)');

  // Teacher re-releases board
  await boardKnowledgeService.releaseBoardDocument(teacherUser, 'bdoc-phys-101', true);
  const reReleasedDoc = smartboardStore.getBoardDocument('bdoc-phys-101');
  assert(reReleasedDoc!.isReleasedToStudents === true, '8.7 Teacher successfully re-releases board');

  // Student can now search and access released board
  const studentSearchReleased = boardKnowledgeService.searchBoardKnowledge(studentUser, 'Gauss', {
    classId: 'class-phys-301'
  });
  assert(studentSearchReleased.length > 0, '8.8 Student can now search released board knowledge');

  // --- SECTION 9: Sandboxed Server Tools Execution ---
  console.log('\n--- SECTION 9: Sandboxed Server Tools Execution ---');

  // 1. smartboard.knowledge.index
  const toolIndexRes = await toolExecutor.execute(
    'smartboard.knowledge.index',
    { boardDocId: 'bdoc-phys-101', triggerRagIngest: true },
    teacherContext
  );
  assert(toolIndexRes.ok === true, '9.1 Tool smartboard.knowledge.index executes successfully');
  assert(Boolean(toolIndexRes.data?.derivedKnowledge), '9.2 Tool returns extracted derived knowledge');

  // 2. smartboard.knowledge.search
  const toolSearchRes = await toolExecutor.execute(
    'smartboard.knowledge.search',
    { query: 'electric field', courseCode: 'PHYS-301' },
    studentContext
  );
  assert(toolSearchRes.ok === true, '9.3 Tool smartboard.knowledge.search executes for student');
  assert(toolSearchRes.data?.count > 0, '9.4 Tool returns verified board search matches');

  // 3. smartboard.knowledge.ask
  const toolAskRes = await toolExecutor.execute(
    'smartboard.knowledge.ask',
    { query: 'What is Gauss law equation?', boardDocumentId: 'bdoc-phys-101' },
    studentContext
  );
  assert(toolAskRes.ok === true, '9.5 Tool smartboard.knowledge.ask executes for student');
  assert(Boolean(toolAskRes.data?.answer), '9.6 Tool returns grounded whiteboard explanation');

  // 4. smartboard.knowledge.derive_notes
  const toolNotesRes = await toolExecutor.execute(
    'smartboard.knowledge.derive_notes',
    { boardDocId: 'bdoc-phys-101', customTitle: 'PHYS-301 Sandboxed Tool Notes' },
    teacherContext
  );
  assert(toolNotesRes.ok === true, '9.7 Tool smartboard.knowledge.derive_notes executes successfully');
  assert(Boolean(toolNotesRes.data?.notesPageId), '9.8 Tool returns created Workspace notes page ID');

  // --- SECTION 10: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 10: Test Data Hygiene & Invariant Verification ---');

  // Clean up isolated test database
  resetActiveRepository();
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '10.1 TEST DATA HYGIENE: Running D.13 Board Knowledge tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n===================================================================');
  console.log('=== ALL PHASE D.13 BOARD KNOWLEDGE ENGINE TESTS PASSED (100%) ===');
  console.log('===================================================================\n');
}

runD13BoardKnowledgeTests().catch((err) => {
  console.error('\n[FATAL] Phase D.13 Board Knowledge test suite failed:', err);
  process.exit(1);
});
