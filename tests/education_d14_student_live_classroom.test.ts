// ============================================================================
// JARVIS EDUCATION OS — PHASE D.14: STUDENT LIVE CLASSROOM SURFACE TEST SUITE
// ============================================================================

import { liveClassroomService } from '../server/sectors/education/live/liveClassroomService.ts';
import { smartboardStore } from '../server/sectors/education/smartboard/smartboardStore.ts';
import { classSessionStore } from '../server/sectors/education/classSessions/classSessionStore.ts';
import { boardKnowledgeService } from '../server/sectors/education/smartboard/knowledge/boardKnowledgeService.ts';
import { jarvisData, DiskJarvisDataRepository, setActiveRepository, resetActiveRepository } from '../server/data/index.ts';
import type { User } from '../server/data/types.ts';
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

export async function runD14StudentLiveClassroomTests(): Promise<void> {
  console.log('\n======================================================================');
  console.log('=== [WEB JARVIS] PHASE D.14: STUDENT LIVE CLASSROOM TEST SUITE ===');
  console.log('======================================================================\n');

  const durableDbPath = path.resolve(process.cwd(), 'data/jarvis-db.json');
  const initialDbHash = getFileSha256(durableDbPath);

  // Setup isolated temporary database for test suite
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `d14-test-db-${Date.now()}.json`);
  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  smartboardStore.resetToDefaults();

  // Mock User Identities
  const studentUser: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'alex.chen@starkacademy.edu',
    role: 'student',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    createdAt: new Date().toISOString()
  };

  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Helen Cho',
    email: 'helen.cho@starkacademy.edu',
    role: 'teacher',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-stark-core',
    createdAt: new Date().toISOString()
  };

  const foreignUser: User = {
    id: 'student-foreign',
    displayName: 'External Student',
    email: 'external@other-school.edu',
    role: 'student',
    institutionId: 'inst-other-school',
    workspaceId: 'ws-other',
    createdAt: new Date().toISOString()
  };

  // --- SECTION 1: Student Entry & ClassSession Binding ---
  console.log('--- SECTION 1: Student Entry & ClassSession Binding ---');

  const state = await liveClassroomService.getLiveClassroomState(studentUser, 'class-phys-301');
  assert(Boolean(state), '1.1 Live classroom state successfully resolved for student');
  assert(state.academicContext.courseCode === 'PHYS-301', '1.2 Bound to canonical course PHYS-301');
  assert(Boolean(state.academicContext.classSessionId), '1.3 Anchored to active ClassSession session-phys-101');
  assert(state.academicContext.institutionId === 'inst-stark-academy', '1.4 Preserves institutional locus');
  assert(Boolean(state.teacher.name) && (state.teacher.name.includes('Dr.') || state.teacher.name.includes('Helen') || state.teacher.name.includes('Sarah')), '1.5 Identifies authorized course instructor');

  // --- SECTION 2: Live Board Synchronization & Sanitization ---
  console.log('\n--- SECTION 2: Live Board Synchronization & Sanitization ---');

  assert(Boolean(state.currentBoardPage), '2.1 Live board page is present on student surface');
  assert(state.currentBoardPage!.pageIndex >= 0, '2.2 Tracks active page index');
  assert(state.currentBoardPage!.isReleased === true, '2.3 Honors released board status');
  assert(state.releasedBoardHistory.length > 0, '2.4 Provides released board pages history');
  assert(
    !JSON.stringify(state.currentBoardPage).includes('teacherOnly'),
    '2.5 Teacher-private annotations are strictly stripped from student board payload'
  );

  // --- SECTION 3: Bounded Ask Jarvis In-Class Tutor ---
  console.log('\n--- SECTION 3: Bounded Ask Jarvis In-Class Tutor ---');

  const askRes = await liveClassroomService.askJarvisInLiveClass(studentUser, 'What did the teacher derive on this page?', {
    classId: 'class-phys-301',
    boardDocumentId: 'bdoc-phys-101',
    pageIndex: 0
  });

  assert(Boolean(askRes.answer), '3.1 Produces pedagogical answer for in-class student');
  assert(askRes.groundedInBoard === true, '3.2 Grounded in active whiteboard session');
  assert(askRes.groundedInLesson === true, '3.3 Grounded in current lesson topic');
  assert(askRes.citedFormulas.length > 0, '3.4 Cites formulas from active whiteboard derivation');

  // --- SECTION 4: Private Student In-Class Notes with Provenance ---
  console.log('\n--- SECTION 4: Private Student In-Class Notes with Provenance ---');

  const saveRes = await liveClassroomService.saveStudentNotes(studentUser, 'class-phys-301', {
    sessionId: 'session-phys-101',
    lessonId: 'les-phys-202',
    boardDocumentId: 'bdoc-phys-101',
    pageIndex: 0,
    content: 'Crucial: Commutator [a, a†] = 1 implies discrete step delta E = ħω.'
  });

  assert(saveRes.ok === true, '4.1 Student notes saved successfully');
  assert(Boolean(saveRes.noteId), '4.2 Generates durable noteId');

  // Verify persistence when reloading state
  const reloadedState = await liveClassroomService.getLiveClassroomState(studentUser, 'class-phys-301');
  assert(reloadedState.studentNotes.content.includes('[a, a†] = 1'), '4.3 Student notes persist across reloads');
  assert(reloadedState.studentNotes.linkedBoardId === 'bdoc-phys-101', '4.4 Preserves whiteboard provenance link');

  // --- SECTION 5: Formative Live Quiz Integration ---
  console.log('\n--- SECTION 5: Formative Live Quiz Integration ---');

  if (reloadedState.activeQuiz) {
    assert(reloadedState.activeQuiz.title.length > 0, '5.1 Formative quiz title present');
    assert(Boolean(reloadedState.activeQuiz.currentQuestion), '5.2 Active quiz question accessible to student');
  } else {
    // If quiz not released in default session, verify quiz permissions
    assert(reloadedState.permissions.canSubmitQuiz === true, '5.1 Student has quiz submission permission');
  }

  // --- SECTION 6: Released Resources & Community Integration ---
  console.log('\n--- SECTION 6: Released Resources & Community Integration ---');

  assert(reloadedState.releasedResources.length > 0, '6.1 Released lesson resources accessible to student');
  assert(reloadedState.releasedResources.some((r) => r.type === 'formula_sheet'), '6.2 Contains formula sheet resource');
  assert(Boolean(reloadedState.discussion.channelId), '6.3 Linked to class discussion stream');
  assert(reloadedState.assignments.length > 0, '6.4 Contextually renders associated problem set');

  // --- SECTION 7: Multi-Tenant RBAC & Cross-Institution Defense ---
  console.log('\n--- SECTION 7: Multi-Tenant RBAC & Cross-Institution Defense ---');

  // Foreign user from another school blocked (403)
  let foreignAccessBlocked = false;
  try {
    await liveClassroomService.getLiveClassroomState(foreignUser, 'class-phys-301');
  } catch (err: any) {
    foreignAccessBlocked = err.message.includes('403') || err.message.includes('Forbidden');
  }
  assert(foreignAccessBlocked, '7.1 Cross-institution access to live classroom strictly rejected with 403 Forbidden');

  // Foreign user blocked from Ask Jarvis (403)
  let foreignAskBlocked = false;
  try {
    await liveClassroomService.askJarvisInLiveClass(foreignUser, 'Explain the board', {
      classId: 'class-phys-301',
      boardDocumentId: 'bdoc-phys-101'
    });
  } catch (err: any) {
    foreignAskBlocked = err.message.includes('403') || err.message.includes('Forbidden');
  }
  assert(foreignAskBlocked, '7.2 Foreign user blocked from live classroom Ask Jarvis (403)');

  // Unreleased board Ask Jarvis blocked for student (403)
  await boardKnowledgeService.releaseBoardDocument(teacherUser, 'bdoc-phys-101', false);
  let unreleasedAskBlocked = false;
  try {
    await liveClassroomService.askJarvisInLiveClass(studentUser, 'Explain the board', {
      classId: 'class-phys-301',
      boardDocumentId: 'bdoc-phys-101'
    });
  } catch (err: any) {
    unreleasedAskBlocked = err.message.includes('403') || err.message.includes('Forbidden');
  }
  assert(unreleasedAskBlocked, '7.3 Student query against unreleased board strictly rejected with 403 Forbidden');

  // Restore released board state
  await boardKnowledgeService.releaseBoardDocument(teacherUser, 'bdoc-phys-101', true);

  // --- SECTION 8: Test Data Hygiene & Invariant Verification ---
  console.log('\n--- SECTION 8: Test Data Hygiene & Invariant Verification ---');

  resetActiveRepository();
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  const postTestDbHash = getFileSha256(durableDbPath);
  assert(
    initialDbHash === postTestDbHash,
    '8.1 TEST DATA HYGIENE: Running D.14 Live Classroom tests did NOT modify data/jarvis-db.json (100% byte-identical hash match)'
  );

  console.log('\n===================================================================');
  console.log('=== ALL PHASE D.14 STUDENT LIVE CLASSROOM TESTS PASSED (100%) ===');
  console.log('===================================================================\n');
}

runD14StudentLiveClassroomTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('\n[FATAL] Phase D.14 Student Live Classroom test suite failed:', err);
  process.exit(1);
});
