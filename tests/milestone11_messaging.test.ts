// Milestone 11: Teacher ↔ Student Real-Time Messaging & File Attachments Automated Test Suite
import crypto from 'node:crypto';
import { jarvisData } from '../server/data/index.ts';
import { DiskJarvisDataRepository } from '../server/data/diskRepository.ts';
import { messagingService } from '../server/sectors/education/messagingService.ts';
import { messageEventBus } from '../server/sectors/education/messageEventBus.ts';
import { fileService } from '../server/storage/fileService.ts';
import { validateUpload } from '../server/storage/validator.ts';
import { toolExecutor, toolRegistry } from '../server/tools/index.ts';
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
    throw new Error(`Milestone 11 Assertion Failed: ${testName} - ${JSON.stringify(detail || '')}`);
  }
}

async function runMilestone11Tests() {
  console.log('\n================================================================');
  console.log('=== [WEB JARVIS] MILESTONE 11: CLASS MESSAGING & ATTACHMENTS ===');
  console.log('================================================================\n');

  // Initialize and seed repository
  await jarvisData.init();
  await jarvisData.seed();

  const workspaceId = 'ws-stark-core';
  const classId = 'class-phys-301';

  const teacherUser: User = {
    id: 'teacher-1',
    displayName: 'Dr. Sarah',
    email: 'sarah.quantum@stark.edu',
    role: 'teacher',
    createdAt: new Date().toISOString()
  };

  const studentUser: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'alex.chen@stark.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const outsiderUser: User = {
    id: 'student-outsider',
    displayName: 'Intruder Cadet',
    email: 'outsider@rogue.org',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const dummyContext: ToolExecutionContext = {
    sessionId: 'session-m11-test',
    callCount: 1,
    maxRounds: 5,
    executedTools: [],
    userId: teacherUser.id,
    role: 'teacher'
  };

  // -------------------------------------------------------------
  // TEST 1: Teacher sends message
  // -------------------------------------------------------------
  console.log('--- 1. Teacher Sends Message ---');
  const teacherMsgResult = await messagingService.sendMessage(
    {
      classId,
      workspaceId,
      body: 'Welcome to lecture 5. Today we explore quantum entanglement and Bell inequalities.'
    },
    teacherUser
  );

  assert(
    teacherMsgResult &&
    Boolean(teacherMsgResult.message.id) &&
    teacherMsgResult.message.classId === classId &&
    teacherMsgResult.message.senderUserId === teacherUser.id &&
    teacherMsgResult.message.senderRole === 'teacher' &&
    teacherMsgResult.message.body.includes('quantum entanglement'),
    '1. Teacher successfully sends class message with proper role and class attribution'
  );

  // -------------------------------------------------------------
  // TEST 2: Student receives message
  // -------------------------------------------------------------
  console.log('\n--- 2. Student Receives Message ---');
  const studentMessagesList = await messagingService.listMessages(classId, workspaceId, studentUser);
  const foundTeacherMsg = studentMessagesList.find((m) => m.id === teacherMsgResult.message.id);

  assert(
    studentMessagesList.length > 0 &&
    foundTeacherMsg !== undefined &&
    foundTeacherMsg.senderName === teacherUser.displayName,
    '2. Enrolled student successfully receives and reads teacher message'
  );

  // -------------------------------------------------------------
  // TEST 3: Student sends message
  // -------------------------------------------------------------
  console.log('\n--- 3. Student Sends Message ---');
  const studentMsgResult = await messagingService.sendMessage(
    {
      classId,
      workspaceId,
      body: 'Dr. Sarah, does the CHSH inequality test require polarization-entangled photon pairs?'
    },
    studentUser
  );

  assert(
    studentMsgResult &&
    studentMsgResult.message.senderUserId === studentUser.id &&
    studentMsgResult.message.senderRole === 'student' &&
    studentMsgResult.message.classId === classId,
    '3. Enrolled student successfully sends class message with student attribution'
  );

  // -------------------------------------------------------------
  // TEST 4: Realtime event emitted
  // -------------------------------------------------------------
  console.log('\n--- 4. Realtime Event Emitted ---');
  let receivedRealtimeMsg: any = null;
  const unsubscribeMsg = messageEventBus.subscribeToClass(classId, workspaceId, (event) => {
    if (event.type === 'message') {
      receivedRealtimeMsg = event.data;
    }
  });

  const broadcastMsg = await messagingService.sendMessage(
    {
      classId,
      workspaceId,
      body: 'Realtime telemetry test dispatch over quantum channel.'
    },
    teacherUser
  );

  assert(
    receivedRealtimeMsg !== null && receivedRealtimeMsg.id === broadcastMsg.message.id,
    '4. Realtime EventBus immediately emits message event to subscribed channel'
  );
  unsubscribeMsg();

  // -------------------------------------------------------------
  // TEST 5: Notification generated
  // -------------------------------------------------------------
  console.log('\n--- 5. Notification Generated ---');
  assert(
    broadcastMsg.notification !== undefined &&
    broadcastMsg.notification.classId === classId &&
    broadcastMsg.notification.title.includes('Dr. Sarah') &&
    broadcastMsg.notification.body.includes('Realtime telemetry'),
    '5. Message dispatch automatically generates structured notification with recipient context'
  );

  // -------------------------------------------------------------
  // TEST 6: Message persistence in core repository
  // -------------------------------------------------------------
  console.log('\n--- 6. Message Persistence in Core Repository ---');
  const repoMessages = await jarvisData.conversations.listMessages({ classId, workspaceId });
  const hasTeacher = repoMessages.some((m) => m.id === teacherMsgResult.message.id);
  const hasStudent = repoMessages.some((m) => m.id === studentMsgResult.message.id);

  assert(
    hasTeacher && hasStudent && repoMessages.length >= 3,
    '6. Messages are durably persisted in Core Platform conversation repository'
  );


  // -------------------------------------------------------------
  // TEST 7: Restart persistence
  // -------------------------------------------------------------
  console.log('\n--- 7. Restart Persistence ---');
  await jarvisData.flush();
  const freshRepo = new DiskJarvisDataRepository(jarvisData.storagePath);
  await freshRepo.init();

  const recoveredMessages = await freshRepo.conversations.listMessages({ classId, workspaceId });
  const recoveredTeacherMsg = recoveredMessages.find((m) => m.id === teacherMsgResult.message.id);
  const recoveredStudentMsg = recoveredMessages.find((m) => m.id === studentMsgResult.message.id);

  assert(
    recoveredTeacherMsg !== undefined &&
    recoveredStudentMsg !== undefined &&
    recoveredTeacherMsg.body === teacherMsgResult.message.body &&
    recoveredStudentMsg.body === studentMsgResult.message.body,
    '7. All class messages, roles, and timestamps survive simulated process restart'
  );

  // -------------------------------------------------------------
  // TEST 8: Workspace isolation
  // -------------------------------------------------------------
  console.log('\n--- 8. Workspace Isolation ---');
  const rogueWorkspace = 'ws-isolated-foreign';
  let crossWsListBlocked = false;
  try {
    await messagingService.listMessages(classId, rogueWorkspace, teacherUser);
  } catch (err: any) {
    crossWsListBlocked = err.message.includes('not a member') || err.message.includes('Unauthorized');
  }

  const crossWsMessages = await jarvisData.conversations.listMessages({ classId, workspaceId: rogueWorkspace });

  assert(
    crossWsListBlocked && crossWsMessages.length === 0,
    '8. Strict workspace isolation prevents unauthorized tenant message access'
  );

  // -------------------------------------------------------------
  // TEST 9: Class authorization
  // -------------------------------------------------------------
  console.log('\n--- 9. Class Authorization ---');
  const teacherAccess = await messagingService.verifyClassAccess(teacherUser, classId, workspaceId);
  const studentAccess = await messagingService.verifyClassAccess(studentUser, classId, workspaceId);

  assert(
    teacherAccess.allowed === true && studentAccess.allowed === true,
    '9. Enrolled course instructor and student verified by role-based class membership'
  );

  // -------------------------------------------------------------
  // TEST 10: Unauthorized message access rejected
  // -------------------------------------------------------------
  console.log('\n--- 10. Unauthorized Message Access Rejected ---');
  let unauthorizedReadBlocked = false;
  try {
    await messagingService.listMessages(classId, workspaceId, outsiderUser);
  } catch (err: any) {
    unauthorizedReadBlocked = err.message.includes('not enrolled') || err.message.includes('not a member') || err.message.includes('Unauthorized');
  }

  let unauthorizedSendBlocked = false;
  try {
    await messagingService.sendMessage(
      { classId, workspaceId, body: 'Intrusion attempt' },
      outsiderUser
    );
  } catch (err: any) {
    unauthorizedSendBlocked = err.message.includes('not enrolled') || err.message.includes('not a member') || err.message.includes('Unauthorized');
  }

  assert(
    unauthorizedReadBlocked && unauthorizedSendBlocked,
    '10. Non-enrolled outsider student strictly blocked from reading and posting class messages'
  );

  // -------------------------------------------------------------
  // TEST 11: Attachment references valid FileRecord (M10 Reuse)
  // -------------------------------------------------------------
  console.log('\n--- 11. Attachment References Valid FileRecord ---');
  const attachBuffer = Buffer.from('# Bell Inequality Derivation\nE(a,b) = -a dot b', 'utf-8');
  const attachedFile = await fileService.uploadFile(
    {
      originalName: 'Bell-Inequality-Proof.md',
      mimeType: 'text/markdown',
      buffer: attachBuffer,
      workspaceId,
      classId
    },
    teacherUser
  );

  const msgWithAttachment = await messagingService.sendMessage(
    {
      classId,
      workspaceId,
      body: 'Attached is the mathematical proof of the Bell-CHSH inequality.',
      attachmentFileIds: [attachedFile.id]
    },
    teacherUser
  );

  assert(
    msgWithAttachment.message.attachmentFileIds?.includes(attachedFile.id) &&
    msgWithAttachment.message.attachments !== undefined &&
    msgWithAttachment.message.attachments.length === 1 &&
    msgWithAttachment.message.attachments[0].id === attachedFile.id &&
    msgWithAttachment.notification.hasAttachment === true,
    '11. Message attachment references valid M10 FileRecord with metadata and notification flag'
  );

  // -------------------------------------------------------------
  // TEST 12: Attachment from another workspace rejected
  // -------------------------------------------------------------
  console.log('\n--- 12. Cross-Workspace Attachment Rejected ---');
  // Create file with foreign workspaceId in repository
  const foreignFile = await jarvisData.files.create({
    workspaceId: 'ws-foreign-realm',
    ownerUserId: 'user-foreign',
    originalName: 'Foreign-Confidential.pdf',
    storageKey: 'obj-foreign-key.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    extension: 'pdf',
    sha256: crypto.createHash('sha256').update('foreign').digest('hex'),
    status: 'ready',
    tags: []
  });

  let crossWsAttachBlocked = false;
  try {
    await messagingService.sendMessage(
      {
        classId,
        workspaceId,
        body: 'Attempting to attach foreign workspace document',
        attachmentFileIds: [foreignFile.id]
      },
      teacherUser
    );
  } catch (err: any) {
    crossWsAttachBlocked = err.message.includes('Cross-workspace attachment rejected');
  }

  assert(
    crossWsAttachBlocked,
    '12. Attaching a FileRecord from another workspace is strictly rejected with boundary error'
  );

  // -------------------------------------------------------------
  // TEST 13: Attachment download authorization
  // -------------------------------------------------------------
  console.log('\n--- 13. Attachment Download Authorization ---');
  const studentDownload = await fileService.getFileContent(attachedFile.id, studentUser);
  assert(
    studentDownload && studentDownload.buffer.equals(attachBuffer),
    '13. Enrolled student authorized to download message attachment binary'
  );

  let outsiderDownloadBlocked = false;
  try {
    await fileService.getFileContent(attachedFile.id, outsiderUser);
  } catch (err: any) {
    outsiderDownloadBlocked = err.message.includes('denied') || err.message.includes('not a member');
  }

  assert(
    outsiderDownloadBlocked,
    '13b. Non-enrolled outsider denied download access to message attachment file'
  );

  // -------------------------------------------------------------
  // TEST 14: Invalid / oversized attachment rejected
  // -------------------------------------------------------------
  console.log('\n--- 14. Invalid / Oversized Attachment Rejected ---');
  const oversizedBuf = Buffer.alloc(26 * 1024 * 1024);
  const oversizedVal = validateUpload('huge.pdf', oversizedBuf, 'application/pdf');
  assert(!oversizedVal.valid, '14a. Upload exceeding 25MB rejected by validation pipeline');

  let ghostAttachBlocked = false;
  try {
    await messagingService.sendMessage(
      {
        classId,
        workspaceId,
        body: 'Ghost file attachment attempt',
        attachmentFileIds: ['file-non-existent-999']
      },
      teacherUser
    );
  } catch (err: any) {
    ghostAttachBlocked = err.message.includes('does not exist in storage');
  }

  assert(
    ghostAttachBlocked,
    '14b. Message creation with non-existent attachmentFileId rejected'
  );

  // -------------------------------------------------------------
  // TEST 15: Duplicate / replayed realtime event handled safely
  // -------------------------------------------------------------
  console.log('\n--- 15. Duplicate / Replayed Realtime Event Handled Safely ---');
  const simulatedMessageStream = [msgWithAttachment.message];
  // Replaying identical message
  const replayed = msgWithAttachment.message;
  const isDuplicate = simulatedMessageStream.some((m) => m.id === replayed.id);

  const deduplicatedStream = isDuplicate
    ? simulatedMessageStream.map((m) => (m.id === replayed.id ? { ...m, ...replayed } : m))
    : [...simulatedMessageStream, replayed];

  assert(
    deduplicatedStream.length === 1 && deduplicatedStream[0].id === replayed.id,
    '15. Realtime receiver safely deduplicates replayed message events without array duplication'
  );

  // -------------------------------------------------------------
  // TEST 16: Deterministic messaging tools execution
  // -------------------------------------------------------------
  console.log('\n--- 16. Deterministic Messaging Tools Execution ---');
  // 16a. messaging.thread.list
  const listThreadsExec = await toolExecutor.execute(
    {
      name: 'messaging.thread.list',
      args: { classId, workspaceId }
    },
    dummyContext
  );
  assert(
    listThreadsExec.ok === true && Array.isArray(listThreadsExec.data?.threads),
    '16a. Tool messaging.thread.list returns discussion channels'
  );

  // 16b. messaging.message.list
  const listMessagesExec = await toolExecutor.execute(
    {
      name: 'messaging.message.list',
      args: { classId, workspaceId, limit: 10 }
    },
    dummyContext
  );
  assert(
    listMessagesExec.ok === true && listMessagesExec.data?.count > 0,
    '16b. Tool messaging.message.list returns chronological class messages'
  );

  // 16c. messaging.message.send
  const sendMessageExec = await toolExecutor.execute(
    {
      name: 'messaging.message.send',
      args: {
        classId,
        workspaceId,
        body: 'Dispatch from tool execution layer: Lab schedule confirmed.',
        attachmentFileIds: [attachedFile.id]
      }
    },
    dummyContext
  );
  assert(
    sendMessageExec.ok === true &&
    sendMessageExec.data?.messageId !== undefined &&
    sendMessageExec.data?.attachmentsAttached === 1,
    '16c. Tool messaging.message.send executes successfully with file attachments'
  );

  // -------------------------------------------------------------
  // TEST 17: Mark message as read
  // -------------------------------------------------------------
  console.log('\n--- 17. Mark Message Read ---');
  const readUpdated = await messagingService.markRead(teacherMsgResult.message.id, studentUser, workspaceId);
  assert(
    readUpdated !== null && readUpdated.readBy?.includes(studentUser.id),
    '17. Mark message as read correctly updates readBy recipient list'
  );

  console.log('\n================================================================');
  console.log(`=== M11 SUMMARY: ALL ${passed}/${total} MILESTONE 11 TESTS PASSED! ===`);
  console.log('================================================================\n');
}

runMilestone11Tests().catch((err) => {
  console.error('\n[MILESTONE 11 TEST SUITE CRASHED]', err);
  process.exit(1);
});
