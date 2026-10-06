// Comprehensive Test Suite for Discord-Style Academic Community Subsystem
import { communityStore } from '../server/sectors/education/community/communityStore.ts';
import { communityPolicy } from '../server/sectors/education/community/communityPolicy.ts';
import { communityEventBus } from '../server/sectors/education/community/communityEventBus.ts';
import type { User } from '../server/data/types.ts';

import { authService } from '../server/auth/tokens.ts';
async function runCommunityTests() {
  console.log('=== [JARVIS EDUCATION] DISCORD-STYLE ACADEMIC COMMUNITY TEST SUITE ===');

  let passed = 0;
  const assert = (condition: boolean, name: string) => {
    if (!condition) {
      console.error(`[FAIL] ${name}`);
      throw new Error(`Test failed: ${name}`);
    }
    console.log(`[PASS] ${++passed}. ${name}`);
  };

  const mockStudent1: User = {
    id: 'student-1',
    displayName: 'Alex Mercer',
    email: 'a.mercer@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const mockStudent2: User = {
    id: 'student-2',
    displayName: 'Peter Parker',
    email: 'p.parker@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const mockTeacher: User = {
    id: 'teacher-1',
    displayName: 'Dr. Helen Cho',
    email: 'h.cho@starkacademy.edu',
    role: 'teacher',
    department: 'Physics',
    createdAt: new Date().toISOString()
  };

  const mockPrincipal: User = {
    id: 'principal-1',
    displayName: 'Dean Stark',
    email: 'dean@starkacademy.edu',
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  // Test 1: Community & Channel Initial Seeding
  const allChannels = await communityStore.listChannels({ schoolId: 'inst-stark-academy' });
  assert(allChannels.length >= 6, 'CommunityStore contains seeded channels (Announcements, General, Physics, CS, Study Groups)');

  // Test 2: Channel Creation
  const newChannel = await communityStore.createChannel({
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'quantum-lab-discussion',
    topic: 'Laboratory apparatus setup and experimental data sharing',
    type: 'CLASS',
    createdById: mockTeacher.id
  });
  assert(newChannel.name === 'quantum-lab-discussion', 'Successfully created course channel');

  // Test 3: Channel Authorization - Enrolled Student vs Cross-Class Student
  const enrolledAccess = await communityPolicy.canAccessChannel(mockStudent1, newChannel, 'ws-stark-core');
  assert(enrolledAccess.allowed, 'Enrolled physics student is authorized to access class channel');

  // Test 4: Announcement Channel Protection (Staff vs Student)
  const annChannel = allChannels.find((c) => c.type === 'ANNOUNCEMENTS')!;
  const teacherPostCheck = await communityPolicy.canPostToChannel(mockTeacher, annChannel, 'ws-stark-core');
  assert(teacherPostCheck.allowed, 'Teacher is authorized to post to Announcement channels');

  const studentPostCheck = await communityPolicy.canPostToChannel(mockStudent1, annChannel, 'ws-stark-core');
  assert(!studentPostCheck.allowed && studentPostCheck.statusCode === 403, 'Student is strictly forbidden from posting to Announcement channels (403)');

  // Test 5: Message Creation with Academic Resource Attachment
  const newMsg = await communityStore.createMessage({
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    channelId: newChannel.id,
    senderUserId: mockStudent1.id,
    senderName: mockStudent1.displayName,
    senderRole: 'student',
    content: 'Can anyone explain the boundary conditions in Problem #3 of our Homework Set?',
    attachments: [
      {
        id: 'att-hw-ref',
        resourceType: 'assignment',
        resourceId: 'asg-1',
        title: 'Homework Problem Set #1: Electrostatics',
        context: 'Problem #3 Hollow Conducting Sphere'
      },
      {
        id: 'att-sess-ref',
        resourceType: 'class_session',
        resourceId: 'session-phys-101',
        title: 'ClassSession #101: Electrostatics & Field Formulations',
        context: 'Slide 4 Gauss Surface'
      }
    ],
    mentions: ['teacher-1']
  });
  assert(newMsg.attachments.length === 2, 'Message created with rich ClassSession & Assignment resource citations');
  assert(newMsg.mentions.includes('teacher-1'), 'Message contains user mention');

  // Test 6: Message Editing (Author Only)
  const editAllowed = await communityPolicy.canModifyMessage(mockStudent1, newMsg, 'edit');
  assert(editAllowed.allowed, 'Author is authorized to edit their own message');

  const unauthorizedEdit = await communityPolicy.canModifyMessage(mockStudent2, newMsg, 'edit');
  assert(!unauthorizedEdit.allowed && unauthorizedEdit.statusCode === 403, 'Other student is forbidden from editing author message (403)');

  const updatedMsg = await communityStore.updateMessage(newMsg.id, 'Updated query: Boundary conditions on Problem #3.');
  assert(updatedMsg.isEdited === true, 'Message is marked as edited');

  // Test 7: Message Deletion & Moderation
  const studentDeleteOther = await communityPolicy.canModifyMessage(mockStudent2, newMsg, 'delete');
  assert(!studentDeleteOther.allowed && studentDeleteOther.statusCode === 403, 'Student cannot delete another cadet message (403)');

  const teacherModerate = await communityPolicy.canModifyMessage(mockTeacher, newMsg, 'delete');
  assert(teacherModerate.allowed, 'Teacher is authorized to moderate and delete messages');

  // Test 8: Thread Creation & Thread Replies
  const thread = await communityStore.createThread(newMsg.id, 'Problem #3 Boundary Inquiry');
  assert(thread.rootMessageId === newMsg.id, 'Thread created bound to root message');

  const replyMsg = await communityStore.createMessage({
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    channelId: newChannel.id,
    threadId: thread.id,
    senderUserId: mockTeacher.id,
    senderName: mockTeacher.displayName,
    senderRole: 'teacher',
    content: 'Inside the conductor cavity, net enclosed charge is zero, so E=0.'
  });
  assert(replyMsg.threadId === thread.id, 'Thread reply created with threadId');

  const rootMsgAfterReply = await communityStore.getMessage(newMsg.id);
  assert(rootMsgAfterReply?.replyCount === 1, 'Root message replyCount incremented to 1');

  // Test 9: Reactions (Toggle & Counters)
  const initialReactions = await communityStore.toggleReaction(newMsg.id, '💡', mockStudent1.id);
  assert(initialReactions.some((r) => r.emoji === '💡' && r.count === 1), 'Reaction added with count 1');

  const multiReactions = await communityStore.toggleReaction(newMsg.id, '💡', mockStudent2.id);
  assert(multiReactions.find((r) => r.emoji === '💡')?.count === 2, 'Reaction count incremented to 2 for distinct cadets');

  const toggledOff = await communityStore.toggleReaction(newMsg.id, '💡', mockStudent1.id);
  assert(toggledOff.find((r) => r.emoji === '💡')?.count === 1, 'Reaction toggled off for author, count decremented');

  // Test 10: Pinned Messages (Staff Only)
  const studentPinCheck = await communityPolicy.canPinMessage(mockStudent1);
  assert(!studentPinCheck.allowed && studentPinCheck.statusCode === 403, 'Student is forbidden from pinning messages (403)');

  const teacherPinCheck = await communityPolicy.canPinMessage(mockTeacher);
  assert(teacherPinCheck.allowed, 'Teacher is authorized to pin messages');

  const pinResult = await communityStore.togglePin(newChannel.id, newMsg.id);
  assert(pinResult.isPinned === true, 'Message pinned successfully in channel');

  // Test 11: Study Groups (Creation & Joining)
  const newStudyGroup = await communityStore.createStudyGroup({
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    name: 'Advanced Gauss Integration Squad',
    description: 'Peer study group for advanced electrostatics derivations',
    subject: 'Physics',
    ownerUserId: mockStudent1.id,
    ownerName: mockStudent1.displayName,
    sharedResources: [
      {
        id: 'res-study-1',
        resourceType: 'class_session',
        resourceId: 'session-phys-101',
        title: 'ClassSession #101: Electrostatics',
        context: 'Assigned study session'
      }
    ]
  });
  assert(newStudyGroup.name === 'Advanced Gauss Integration Squad', 'Study group created successfully');
  assert(newStudyGroup.channelIds.length > 0, 'Study group automatically provisioned dedicated discussion channel');

  const joinedGroup = await communityStore.joinStudyGroup(newStudyGroup.id, mockStudent2.id);
  assert(joinedGroup.memberUserIds.includes(mockStudent2.id), 'Peer cadet successfully joined study group');

  // Test 12: Official Announcements & Acknowledgements
  const announcement = await communityStore.createAnnouncement({
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    title: 'Midterm Physics Lab Assessment Schedule',
    body: 'Lab exams will commence on Thursday at 10:00 AM in Quantum Laboratory Hall 4B.',
    authorUserId: mockTeacher.id,
    authorName: mockTeacher.displayName,
    authorRole: 'teacher',
    priority: 'important'
  });
  assert(announcement.priority === 'important', 'Official announcement created with priority');

  const ackAnn = await communityStore.acknowledgeAnnouncement(announcement.id, mockStudent1.id);
  assert(ackAnn.acknowledgedUserIds.includes(mockStudent1.id), 'Student successfully acknowledged announcement');

  // Test 13: Community Global Search
  const searchResults = await communityStore.searchCommunity('boundary', 'inst-stark-academy', 'class-phys-301');
  assert(searchResults.messages.length > 0, 'Community search retrieved messages by query keyword');

  // Test 14: Realtime EventBus Event Dispatch
  let realtimeReceived = false;
  communityEventBus.once('community_event', (event) => {
    if (event.type === 'community.message.created') {
      realtimeReceived = true;
    }
  });
  communityEventBus.publishMessageCreated(newMsg);
  assert(realtimeReceived, 'CommunityEventBus dispatched realtime event to active subscribers');

  console.log(`\n=== ALL ${passed} DISCORD-STYLE ACADEMIC COMMUNITY TESTS PASSED! ===\n`);
}

runCommunityTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
