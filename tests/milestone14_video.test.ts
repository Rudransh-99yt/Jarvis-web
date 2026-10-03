// Milestone 14: Video Library & Media Knowledge Automated Test Suite
import { jarvisData, createRepository, setActiveRepository, resetActiveRepository, DiskJarvisDataRepository } from '../server/data/index.ts';
import { LocalStorageProvider } from '../server/storage/localStorageProvider.ts';
import { storageManager } from '../server/storage/providerManager.ts';
import { FileService } from '../server/storage/fileService.ts';
import { smartVideoService } from '../server/sectors/education/videoService.ts';
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

async function runMilestone14Tests() {
  console.log('\n=== [WEB JARVIS] MILESTONE 14: VIDEO LIBRARY & MEDIA KNOWLEDGE TEST SUITE ===\n');

  // Initialize isolated data repository
  const testDbDir = path.resolve(process.cwd(), 'tests', '.tmp-db');
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `m14-test-jarvis-${Date.now()}.json`);
  const testRepo = new DiskJarvisDataRepository(testDbPath);
  await testRepo.init();
  await testRepo.seed();
  setActiveRepository(testRepo);

  // Initialize isolated Storage Provider
  const testStorageDir = path.resolve(process.cwd(), 'data', 'test-video-storage', 'objects');
  const storageProvider = new LocalStorageProvider(testStorageDir);
  await storageProvider.init();
  storageManager.setProvider(storageProvider);

  const fileService = new FileService();

  // Test users
  const teacherUser = (await testRepo.users.getById('teacher-1'))!;
  const student1User = (await testRepo.users.getById('student-1'))!;
  const student2User = (await testRepo.users.getById('student-2'))!;
  const tonyUser = (await testRepo.users.getById('user-tony'))!;

  const validMp4Bytes = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // 24 bytes ftyp
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, // isom
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32  // isomiso2
  ]);

  // 1. Teacher Upload Video
  const uploadResult = await smartVideoService.uploadVideo(
    {
      classId: 'class-phys-301',
      workspaceId: 'ws-stark-core',
      title: 'Quantum Entanglement & Bell Inequalities',
      description: 'Full lecture on EPR paradox and Alain Aspect experimental validation.',
      filename: 'quantum_entanglement_lecture.mp4',
      mimeType: 'video/mp4',
      buffer: validMp4Bytes,
      durationSeconds: 2400,
      thumbnailUrl: '/media/thumbnails/entanglement.jpg',
      transcript: 'In 1964, John Stewart Bell showed that quantum mechanics predicts correlations that violate local realism. Entangled photons measured across space-like separations demonstrate non-local quantum state reduction.',
      knowledgeSpaceId: 'ks-quantum',
      tags: ['Quantum', 'Bell Inequalities', 'EPR'],
      visibility: 'class'
    },
    teacherUser
  );

  assert(Boolean(uploadResult.video && uploadResult.video.id), '1. Video Upload: Creates valid VideoRecord');
  assert(uploadResult.video.title === 'Quantum Entanglement & Bell Inequalities', '2. Video Upload: Persists accurate title');
  assert(uploadResult.video.classId === 'class-phys-301', '3. Video Upload: Accurately associates classId');
  assert(uploadResult.video.status === 'ready', '4. Video Upload: Sets status to ready');
  assert(Boolean(uploadResult.file && uploadResult.file.id), '5. Storage Integration: Creates underlying FileRecord');

  // 2. Underlying File Storage Verification
  const storedFile = await testRepo.files.getById(uploadResult.video.fileId);
  assert(Boolean(storedFile && storedFile.storageKey), '6. Storage Integration: FileRecord references valid storageKey');
  const storedBytes = await storageProvider.getObject(storedFile!.storageKey);
  assert(Boolean(storedBytes && storedBytes.equals(validMp4Bytes)), '7. Storage Integration: Binary object stored accurately in StorageProvider');

  // 3. Transcript RAG Ingestion Verification
  const spaceSources = await testRepo.knowledge.listSourcesForSpace('ks-quantum', 'ws-stark-core');
  const transcriptSource = spaceSources.find((s) => s.name.includes('Quantum Entanglement') && s.name.includes('Transcript'));
  assert(Boolean(transcriptSource), '8. RAG Integration: Automatically indexes lecture transcript into Knowledge Space');
  assert(Boolean(transcriptSource?.fullText.includes('John Stewart Bell')), '9. RAG Integration: Preserves complete transcript text');

  // 4. Student Upload Rejection (Authorization Check)
  let studentUploadFailed = false;
  try {
    await smartVideoService.uploadVideo(
      {
        classId: 'class-phys-301',
        workspaceId: 'ws-stark-core',
        title: 'Unauthorized Student Video',
        filename: 'student_video.mp4',
        mimeType: 'video/mp4',
        buffer: validMp4Bytes
      },
      student1User
    );
  } catch (err: any) {
    studentUploadFailed = true;
    assert(err.message.includes('Students cannot publish') || err.message.includes('Unauthorized'), '10. Authorization: Rejects student video uploads');
  }
  assert(studentUploadFailed, '11. Authorization: Enforces teacher-only video publishing');

  // 5. Cross-Workspace Upload Rejection
  let crossWsFailed = false;
  try {
    await smartVideoService.uploadVideo(
      {
        classId: 'class-phys-301',
        workspaceId: 'ws-foreign-workspace',
        title: 'Cross Workspace Video',
        filename: 'foreign.mp4',
        mimeType: 'video/mp4',
        buffer: validMp4Bytes
      },
      teacherUser
    );
  } catch (err: any) {
    crossWsFailed = true;
    assert(err.message.includes('Cross-workspace access denied') || err.message.includes('not a member'), '12. Tenant Isolation: Blocks uploads to non-member workspaces');
  }
  assert(crossWsFailed, '13. Tenant Isolation: Hard workspace boundary enforced');

  // 6. Safe Filename Sanitization & Path Traversal Defense
  const traversalUpload = await smartVideoService.uploadVideo(
    {
      classId: 'class-phys-301',
      workspaceId: 'ws-stark-core',
      title: 'Path Traversal Test Video',
      filename: '../../../../etc/passwd/malicious_lecture.mp4',
      mimeType: 'video/mp4',
      buffer: validMp4Bytes
    },
    teacherUser
  );
  assert(traversalUpload.file.originalName === 'malicious_lecture.mp4', '14. Security: Strips path traversal sequences from filenames');

  // 7. Video Listing (Role-based access)
  const teacherVideos = await smartVideoService.listVideos({ classId: 'class-phys-301' }, teacherUser);
  assert(teacherVideos.length >= 2, '15. Video Listing: Instructor sees all class videos');

  const studentVideos = await smartVideoService.listVideos({ classId: 'class-phys-301' }, student1User);
  assert(studentVideos.some((v) => v.id === uploadResult.video.id), '16. Video Listing: Enrolled student sees course videos');

  // 8. Class Isolation: Student not enrolled in class cannot access class-private video
  const unassignedStudent: User = {
    id: 'student-outsider',
    displayName: 'Outsider Cadet',
    email: 'outsider@stark.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };
  await testRepo.users.create(unassignedStudent);
  await testRepo.workspaces.addMember('ws-stark-core', unassignedStudent.id, 'member');

  let outsiderGetFailed = false;
  try {
    await smartVideoService.getVideo(uploadResult.video.id, unassignedStudent, 'ws-stark-core');
  } catch (err: any) {
    outsiderGetFailed = true;
    assert(err.message.includes('not enrolled') || err.message.includes('Forbidden'), '17. Class Isolation: Non-enrolled student denied access to class-private video');
  }
  assert(outsiderGetFailed, '18. Class Isolation: Deny-by-default access control enforced');

  // 9. Update Video Metadata
  const updatedVideo = await smartVideoService.updateVideo(
    uploadResult.video.id,
    {
      title: 'Quantum Entanglement: Bell & Aspect Experiments (Updated)',
      description: 'Refined lecture breakdown with higher resolution diagrams.',
      transcript: 'Updated transcript with precise timestamp mappings.'
    },
    teacherUser,
    'ws-stark-core'
  );
  assert(updatedVideo.title.includes('(Updated)'), '19. Video Update: Updates title in persistent record');
  assert(updatedVideo.description.includes('Refined lecture'), '20. Video Update: Updates description in persistent record');

  // 10. Playback Metadata & Binary Streaming
  const playbackData = await smartVideoService.getPlaybackData(uploadResult.video.id, student1User, 'ws-stark-core');
  assert(Boolean(playbackData.video && playbackData.video.title), '21. Playback: Returns authorized video playback metadata');
  assert(Boolean(playbackData.buffer && playbackData.buffer.equals(validMp4Bytes)), '22. Playback: Returns streamable binary buffer from StorageProvider');

  // 11. Tool Execution: video.list
  const listContext: ToolExecutionContext = {
    sessionId: 'session-video-tools',
    timestamp: new Date().toISOString(),
    serverUptime: 300,
    sector: 'education',
    userId: 'teacher-1',
    role: 'teacher',
    workspaceId: 'ws-stark-core'
  };

  const toolListRes = await toolExecutor.execute({
    name: 'video.list',
    args: { classId: 'class-phys-301', workspaceId: 'ws-stark-core' }
  }, listContext);
  assert(toolListRes.ok === true && Array.isArray(toolListRes.data?.videos), '23. Tool: video.list executes successfully');

  // 12. Tool Execution: video.get
  const toolGetRes = await toolExecutor.execute({
    name: 'video.get',
    args: { videoId: uploadResult.video.id, workspaceId: 'ws-stark-core' }
  }, listContext);
  assert(toolGetRes.ok === true && toolGetRes.data?.video?.id === uploadResult.video.id, '24. Tool: video.get retrieves video details');

  // 13. Tool Execution: video.upload
  const toolUploadRes = await toolExecutor.execute({
    name: 'video.upload',
    args: {
      classId: 'class-phys-301',
      title: 'Tool Uploaded Lecture: Special Relativity',
      filename: 'relativity_lecture.mp4',
      description: 'Lorentz transformations and Minkowski spacetime.',
      durationSeconds: 1950,
      workspaceId: 'ws-stark-core'
    }
  }, listContext);
  assert(toolUploadRes.ok === true && toolUploadRes.data?.video?.id, '25. Tool: video.upload successfully creates video record');
  const toolVideoId = toolUploadRes.data.video.id;

  // 14. Tool Execution: video.update
  const toolUpdateRes = await toolExecutor.execute({
    name: 'video.update',
    args: {
      videoId: toolVideoId,
      title: 'Special Relativity & Spacetime Diagrams (Edited)',
      workspaceId: 'ws-stark-core'
    }
  }, listContext);
  assert(toolUpdateRes.ok === true && toolUpdateRes.data?.video?.title.includes('(Edited)'), '26. Tool: video.update modifies video title');

  // 15. Tool Execution: video.delete
  const toolDeleteRes = await toolExecutor.execute({
    name: 'video.delete',
    args: {
      videoId: toolVideoId,
      workspaceId: 'ws-stark-core'
    }
  }, listContext);
  assert(toolDeleteRes.ok === true && toolDeleteRes.data?.success === true, '27. Tool: video.delete purges video and storage');

  // 16. Video Deletion & Cascading Storage Cleanup
  const deleteSuccess = await smartVideoService.deleteVideo(uploadResult.video.id, teacherUser, 'ws-stark-core');
  assert(deleteSuccess === true, '28. Video Deletion: Returns true on successful deletion');

  const videoAfterDelete = await testRepo.videos.getVideoById(uploadResult.video.id, 'ws-stark-core');
  assert(videoAfterDelete === null, '29. Video Deletion: Purged from video repository');

  const fileAfterDelete = await testRepo.files.getById(uploadResult.file.id, 'ws-stark-core');
  assert(fileAfterDelete === null, '30. Video Deletion: Underlying FileRecord deleted cleanly');

  // 17. Persistence & Process Restart Simulation
  const seedVideo = await testRepo.videos.getVideoById('vid-seed-phys-1', 'ws-stark-core');
  assert(Boolean(seedVideo && seedVideo.title), '31. Persistence: Seed video present in repository');

  await testRepo.flush();
  const restoredRepo = new DiskJarvisDataRepository(testDbPath);
  await restoredRepo.init();

  const recoveredSeedVideo = await restoredRepo.videos.getVideoById('vid-seed-phys-1', 'ws-stark-core');
  assert(Boolean(recoveredSeedVideo && recoveredSeedVideo.title === seedVideo?.title), '32. Persistence: Video array cleanly reloaded across restart simulation');

  // Clean up temporary test files
  resetActiveRepository();
  storageManager.resetToDefault();
  try {
    await fs.promises.rm(path.resolve(process.cwd(), 'data', 'test-video-storage'), { recursive: true, force: true });
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch {}

  console.log('\n=== ALL 32 MILESTONE 14 VIDEO LIBRARY & MEDIA KNOWLEDGE TESTS PASSED! ===\n');
  process.exit(0);
}

runMilestone14Tests().catch((err) => {
  console.error('\n[FATAL] Milestone 14 test suite failed:', err);
  process.exit(1);
});
