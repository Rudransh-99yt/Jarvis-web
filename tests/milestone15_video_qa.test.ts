// Milestone 15: AI Video Discovery & Grounded Video Q&A Automated Test Suite
import { jarvisData, setActiveRepository, DiskJarvisDataRepository } from '../server/data/index.ts';
import { LocalStorageProvider } from '../server/storage/localStorageProvider.ts';
import { storageManager } from '../server/storage/providerManager.ts';
import { smartVideoService } from '../server/sectors/education/videoService.ts';
import { toolExecutor } from '../server/tools/index.ts';
import type { ToolExecutionContext } from '../server/tools/types.ts';
import path from 'node:path';
import fs from 'node:fs';

function assert(condition: boolean, testName: string, detail?: any) {
  if (!condition) {
    console.error(`[FAIL] ${testName}`, detail || '');
    throw new Error(`Assertion failed: ${testName}`);
  }
  console.log(`[PASS] ${testName}`);
}

async function runMilestone15Tests() {
  console.log('\n=== [WEB JARVIS] MILESTONE 15: AI VIDEO DISCOVERY & GROUNDED VIDEO Q&A TEST SUITE ===\n');

  // Initialize isolated data repository
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `m15-test-jarvis-${Date.now()}.json`);
  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  // Initialize isolated Storage Provider
  const testStorageDir = path.resolve(process.cwd(), 'data', 'test-video-qa-storage', 'objects');
  const storageProvider = new LocalStorageProvider(testStorageDir);
  await storageProvider.init();
  storageManager.setProvider(storageProvider);

  // Test users
  const teacherUser = (await testRepo.users.getById('teacher-1'))!;
  const student1User = (await testRepo.users.getById('student-1'))!;
  const student2User = (await testRepo.users.getById('student-2'))!;
  const tonyUser = (await testRepo.users.getById('user-tony'))!;

  // Create isolated student3 user who is NOT enrolled in math-240
  const student3User: User = {
    id: 'student-3-external',
    displayName: 'External Visitor Student',
    email: 'visitor@stark.edu',
    role: 'student',
    department: 'External Studies',
    createdAt: new Date().toISOString()
  };
  await testRepo.users.create(student3User);
  await testRepo.workspaces.addMember('ws-stark-core', 'student-3-external', 'member');

  // ==========================================
  // 1. AI Concept Discovery & Search Tests
  // ==========================================
  console.log('\n--- 1. AI Video Concept Discovery Tests ---');

  // 1.1 Search for "ladder operators"
  const search1 = await smartVideoService.searchVideos('ladder operators', {}, student1User);
  assert(search1.length > 0, '1.1 Search identifies lecture on ladder operators');
  assert(search1[0].videoId === 'vid-seed-phys-1', '1.1 Top match is quantum harmonic oscillator video');
  assert(Boolean(search1[0].timestampLabel), '1.1 Search result includes exact timestamp label');
  assert(search1[0].text.toLowerCase().includes('ladder operators'), '1.1 Search result text contains matching concept');

  // 1.2 Search for "zero point energy"
  const search2 = await smartVideoService.searchVideos('zero point energy', {}, student1User);
  assert(search2.length > 0, '1.2 Search discovers zero point energy lecture segment');
  assert(search2.some((r) => r.timestampLabel === '12:30' || r.startSeconds === 750), '1.2 Segment includes 12:30 timestamp');

  // 1.3 Search for "Stokes theorem"
  const search3 = await smartVideoService.searchVideos('Stokes theorem', {}, student2User);
  assert(search3.length > 0, '1.3 Enrolled student discovers Stokes theorem video segments');
  assert(search3[0].videoId === 'vid-seed-math-1', '1.3 Matched math lecture video ID');

  // 1.4 Student course boundary search isolation
  // student3 is not enrolled in math-240 or phys-301; class-visibility videos are restricted
  const searchMathByExternalStudent = await smartVideoService.searchVideos('exterior calculus', { classId: 'class-math-240' }, student3User);
  assert(searchMathByExternalStudent.length === 0, '1.4 Non-enrolled student cannot discover private class-scoped lecture segments');

  // ==========================================
  // 2. Grounded Video Q&A Tests
  // ==========================================
  console.log('\n--- 2. Grounded Video Q&A Tests ---');

  // 2.1 Ask about ladder operators in quantum video
  const qa1 = await smartVideoService.askVideo('vid-seed-phys-1', 'Explain ladder operators in this lecture', student1User);
  assert(qa1.isGrounded === true, '2.1 Q&A produces grounded answer for covered lecture concept');
  assert(qa1.citations.length > 0, '2.1 Q&A answer includes exact verified citations');
  assert(Boolean(qa1.citations[0].timestampLabel), '2.1 Citations contain timestamp metadata');
  assert(qa1.confidence > 0.5, '2.1 Grounded answer has high confidence');

  // 2.2 Ask about zero point energy
  const qa2 = await smartVideoService.askVideo('vid-seed-phys-1', 'Where does the lecture discuss zero-point energy and what is its value?', student1User);
  assert(qa2.isGrounded === true, '2.2 Grounded answer generated for zero-point energy');
  assert(qa2.citations.some((c) => c.timestampLabel === '12:30'), '2.2 Citation correctly points to 12:30 timestamp');

  // 2.3 Ask out-of-scope question (Insufficient Evidence Guard)
  const qaOutOfScope = await smartVideoService.askVideo('vid-seed-phys-1', 'How do you make Italian pasta and pizza from scratch?', student1User);
  assert(qaOutOfScope.isGrounded === false, '2.3 Out-of-scope question correctly flags isGrounded: false');
  assert(qaOutOfScope.answer.toLowerCase().includes('insufficient evidence'), '2.3 System explicitly states insufficient evidence instead of hallucinating');
  assert(qaOutOfScope.citations.length === 0, '2.3 Out-of-scope inquiry returns zero false citations');

  // 2.4 Course-wide Q&A
  const qaCourseWide = await smartVideoService.askCourseVideos('What is Stokes theorem in exterior calculus?', {}, student2User);
  assert(qaCourseWide.isGrounded === true, '2.4 Course-wide Q&A locates relevant video and synthesizes answer');
  assert(qaCourseWide.videoId === 'vid-seed-math-1', '2.4 Identified math lecture video');

  // ==========================================
  // 3. J.A.R.V.I.S. Tool Registry Tests
  // ==========================================
  console.log('\n--- 3. J.A.R.V.I.S. Video Tools Execution Tests ---');

  const toolContext: ToolExecutionContext = {
    userId: 'student-1',
    workspaceId: 'ws-stark-core',
    source: 'test'
  };

  // 3.1 video.search tool
  const searchToolRes = await toolExecutor.execute('video.search', { query: 'Hamiltonian operator' }, toolContext);
  assert(searchToolRes.ok === true, '3.1 video.search tool executed successfully');
  assert((searchToolRes.data as any).results.length > 0, '3.1 video.search tool returned results with timestamps');

  // 3.2 video.ask tool
  const askToolRes = await toolExecutor.execute('video.ask', {
    videoId: 'vid-seed-phys-1',
    question: 'What is the ground state energy of the harmonic oscillator?'
  }, toolContext);
  assert(askToolRes.ok === true, '3.2 video.ask tool executed successfully');
  assert((askToolRes.data as any).isGrounded === true, '3.2 video.ask returned grounded answer');
  assert((askToolRes.data as any).citations.length > 0, '3.2 video.ask tool provided citations');

  // Clean up
  try {
    fs.rmSync(testDbDir, { recursive: true, force: true });
    fs.rmSync(path.resolve(process.cwd(), 'data', 'test-video-qa-storage'), { recursive: true, force: true });
  } catch {}

  console.log('\n=== ALL MILESTONE 15 TESTS PASSED SUCCESSFULLY! ===\n');
}

runMilestone15Tests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[TEST SUITE CRASHED]:', err);
    process.exit(1);
  });
