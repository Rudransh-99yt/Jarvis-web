// Forensic QA Comprehensive Test Suite for Study Space & Study Group Foundation
import { communityStore } from '../server/sectors/education/community/communityStore.ts';
import { communityPolicy } from '../server/sectors/education/community/communityPolicy.ts';
import { communityEventBus } from '../server/sectors/education/community/communityEventBus.ts';
import { startHttpHarness } from './httpHarness.ts';
import type { User } from '../server/data/types.ts';

async function runForensicQA() {
  console.log('=== [JARVIS EDUCATION] FORENSIC QA: STUDY GROUPS & STUDY SPACES ===');
  let passed = 0;
  const assert = (condition: boolean, name: string) => {
    if (!condition) {
      console.error(`[FAIL] ${name}`);
      throw new Error(`Forensic QA Assertion Failed: ${name}`);
    }
    console.log(`[PASS] ${++passed}. ${name}`);
  };

  const student1: User = {
    id: 'student-1',
    displayName: 'Alex Chen',
    email: 'a.chen@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const student2: User = {
    id: 'student-2',
    displayName: 'Marcus Bell',
    email: 'm.bell@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const nonMemberStudent: User = {
    id: 'student-99',
    displayName: 'Foreign Student',
    email: 'stranger@starkacademy.edu',
    role: 'student',
    createdAt: new Date().toISOString()
  };

  const teacher1: User = {
    id: 'teacher-1',
    displayName: 'Dr. Helen Cho',
    email: 'h.cho@starkacademy.edu',
    role: 'teacher',
    department: 'Physics',
    createdAt: new Date().toISOString()
  };

  // 1. STUDY GROUP MEMBERSHIP VERIFICATION
  console.log('\n--- SECTION 1: STUDY GROUP MEMBERSHIP ---');
  const initialGroups = await communityStore.listStudyGroups('inst-stark-academy');
  assert(initialGroups.length >= 3, 'Initial study groups seeded in store');

  const testGroup = initialGroups.find(g => g.id === 'sg-math-diff') || initialGroups[0];
  const initialMemberCount = testGroup.memberUserIds.length;

  // Student joins group
  const joinedGroup = await communityStore.joinStudyGroup(testGroup.id, student1.id);
  assert(joinedGroup.memberUserIds.includes(student1.id), 'joinStudyGroup adds student1 to memberUserIds');
  assert(joinedGroup.memberUserIds.length === initialMemberCount + (testGroup.memberUserIds.includes(student1.id) ? 0 : 1), 'Member count updated');

  // Verify persistence on re-fetch
  const refetchedGroup = await communityStore.getStudyGroup(testGroup.id);
  assert(refetchedGroup !== undefined && refetchedGroup.memberUserIds.includes(student1.id), 'Membership persists across retrieval');

  // Student leaves group
  const leftGroup = await communityStore.leaveStudyGroup(testGroup.id, student1.id);
  assert(!leftGroup.memberUserIds.includes(student1.id), 'leaveStudyGroup removes student1 from memberUserIds');

  const refetchedAfterLeave = await communityStore.getStudyGroup(testGroup.id);
  assert(refetchedAfterLeave !== undefined && !refetchedAfterLeave.memberUserIds.includes(student1.id), 'Leave state persists in store');

  // 2. GROUP DISCUSSION BINDING
  console.log('\n--- SECTION 2: GROUP DISCUSSION CHANNEL BINDING ---');
  const quantumGroup = initialGroups.find(g => g.id === 'sg-quantum-pioneers') || initialGroups[0];
  assert(quantumGroup.channelIds && quantumGroup.channelIds.length > 0, 'Study group has provisioned channelIds');
  const groupChannelId = quantumGroup.channelIds[0];
  const groupChannel = await communityStore.getChannel(groupChannelId);
  assert(groupChannel !== null, 'Provisioned channel exists in communityStore');
  assert(groupChannel?.studyGroupId === quantumGroup.id, 'Channel is bound to group id');

  // 3. STUDY SPACE PERSISTENCE & LIFECYCLE
  console.log('\n--- SECTION 3: STUDY SPACE PERSISTENCE & LIFECYCLE ---');
  const createdSpace = await communityStore.createStudySpace({
    schoolId: 'inst-stark-academy',
    studyGroupId: quantumGroup.id,
    groupId: quantumGroup.id,
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    title: 'Forensic QA Quantum Space',
    name: 'Forensic QA Quantum Space',
    topic: 'Testing persistent study space state',
    createdById: student1.id,
    createdBy: student1.displayName,
    status: 'ACTIVE_NOW',
    participants: [{
      id: student1.id,
      name: student1.displayName,
      role: 'student',
      isSpeaking: false,
      audioEnabled: true,
      videoEnabled: false,
      isHandRaised: false,
      joinedAt: new Date().toISOString()
    }],
    participantUserIds: [student1.id],
    sharedProblemContext: 'Verifying mathematical state',
    formulaNotes: 'H psi = E psi'
  });
  assert(createdSpace.id.length > 0, 'Study space created with durable ID');
  assert(createdSpace.status === 'ACTIVE_NOW', 'Study space status is ACTIVE_NOW');
  assert(createdSpace.discussionChannelId.length > 0, 'Study space automatically provisioned dedicated discussion channel');

  // Verify space retrieval
  const retrievedSpace = await communityStore.getStudySpace(createdSpace.id);
  assert(retrievedSpace !== undefined && retrievedSpace.title === 'Forensic QA Quantum Space', 'Study space retrieved from store');

  // 4. PARTICIPANT PRESENCE & STATE MUTATION
  console.log('\n--- SECTION 4: PARTICIPANT PRESENCE & REALTIME STATE ---');
  // Student 2 joins space
  const spaceAfterJoin = await communityStore.joinStudySpace(createdSpace.id, {
    id: student2.id,
    displayName: student2.displayName,
    role: student2.role
  });
  assert(spaceAfterJoin.participantUserIds.includes(student2.id), 'student2 registered in participantUserIds');
  assert(spaceAfterJoin.participants.some(p => p.id === student2.id), 'student2 present in participants list');
  assert(spaceAfterJoin.activeCount === 2, 'activeCount reflects true participant count (2)');

  // Update participant state (Mute & Hand Raise)
  const updatedState = await communityStore.updateParticipantState(createdSpace.id, student2.id, {
    audioEnabled: false,
    isHandRaised: true,
    isSpeaking: false
  });
  assert(updatedState.participant.audioEnabled === false, 'audioEnabled updated to false (muted)');
  assert(updatedState.participant.isHandRaised === true, 'isHandRaised updated to true');

  // Verify space participant state survives retrieval
  const spaceAfterStateUpdate = await communityStore.getStudySpace(createdSpace.id);
  const p2 = spaceAfterStateUpdate?.participants.find(p => p.id === student2.id);
  assert(p2?.audioEnabled === false && p2?.isHandRaised === true, 'Participant state persists in store');

  // Student 2 leaves space
  const spaceAfterLeave = await communityStore.leaveStudySpace(createdSpace.id, student2.id);
  assert(!spaceAfterLeave.participantUserIds.includes(student2.id), 'student2 removed from participantUserIds');
  assert(spaceAfterLeave.activeCount === 1, 'activeCount decremented to 1');

  // End Space
  const endedSpace = await communityStore.endStudySpace(createdSpace.id, student1.id);
  assert(endedSpace.status === 'CONCLUDED', 'Space status transitioned to CONCLUDED');
  assert(endedSpace.activeCount === 0, 'Concluded space activeCount is 0');

  // 5. REALTIME EVENT BUS SUBSCRIPTIONS
  console.log('\n--- SECTION 5: REALTIME EVENT BUS SUBSCRIPTIONS ---');
  let eventReceived = false;
  let receivedEventType = '';
  const listener = (event: any) => {
    eventReceived = true;
    receivedEventType = event.type;
  };
  communityEventBus.on('community_event', listener);

  communityEventBus.publishStudySpaceParticipantUpdated(
    createdSpace.id,
    student1.id,
    { isSpeaking: true },
    'inst-stark-academy',
    'class-phys-301'
  );

  assert(eventReceived && receivedEventType === 'study_space.participant.updated', 'EventBus broadcasts study_space.participant.updated');
  communityEventBus.off('community_event', listener);

  // 6. HTTP API LIFECYCLE & AUTHORIZATION BOUNDARIES
  console.log('\n--- SECTION 6: HTTP API LIFECYCLE & AUTHORIZATION ---');
  const harness = await startHttpHarness();
  try {
    const s1Token = await harness.tokenFor('student-1');

    // HTTP Join Study Group
    const joinRes = await fetch(`${harness.baseUrl}/api/education/community/study-groups/sg-math-diff/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      }
    });
    assert(joinRes.status === 200, 'HTTP POST /study-groups/:id/join returns 200 OK');
    const joinData = await joinRes.json();
    assert(joinData.studyGroup.memberUserIds.includes('student-1'), 'HTTP join response contains updated memberUserIds');

    // HTTP Leave Study Group
    const leaveRes = await fetch(`${harness.baseUrl}/api/education/community/study-groups/sg-math-diff/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      }
    });
    assert(leaveRes.status === 200, 'HTTP POST /study-groups/:id/leave returns 200 OK');
    const leaveData = await leaveRes.json();
    assert(!leaveData.studyGroup.memberUserIds.includes('student-1'), 'HTTP leave response confirms removed membership');

    // HTTP List Study Spaces
    const spacesRes = await fetch(`${harness.baseUrl}/api/education/community/study-spaces`, {
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      }
    });
    assert(spacesRes.status === 200, 'HTTP GET /study-spaces returns 200 OK');
    const spacesData = await spacesRes.json();
    assert(Array.isArray(spacesData.studySpaces) && spacesData.studySpaces.length > 0, 'HTTP list study spaces returns persistent array');

    // HTTP Create Study Space
    const createSpaceRes = await fetch(`${harness.baseUrl}/api/education/community/study-spaces`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'Content-Type': 'application/json',
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      },
      body: JSON.stringify({
        title: 'HTTP Forensic QA Study Space',
        topic: 'Integration Testing',
        courseCode: 'PHYS-301',
        studyGroupId: 'sg-quantum-pioneers'
      })
    });
    assert(createSpaceRes.status === 201, 'HTTP POST /study-spaces creates 201 Created space');
    const newHttpSpace = (await createSpaceRes.json()).studySpace;

    // HTTP Join Space
    const joinSpaceRes = await fetch(`${harness.baseUrl}/api/education/community/study-spaces/${newHttpSpace.id}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      }
    });
    assert(joinSpaceRes.status === 200, 'HTTP POST /study-spaces/:id/join returns 200 OK');

    // HTTP Update Participant State (Mic/Hand-Raise)
    const stateRes = await fetch(`${harness.baseUrl}/api/education/community/study-spaces/${newHttpSpace.id}/participant-state`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'Content-Type': 'application/json',
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      },
      body: JSON.stringify({
        audioEnabled: false,
        isHandRaised: true
      })
    });
    assert(stateRes.status === 200, 'HTTP POST /participant-state returns 200 OK');
    const stateData = await stateRes.json();
    assert(stateData.participant.audioEnabled === false && stateData.participant.isHandRaised === true, 'HTTP participant state reflects mute and hand raise');

    // HTTP Send Discussion Channel Message
    const msgRes = await fetch(`${harness.baseUrl}/api/education/community/channels/${newHttpSpace.discussionChannelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'Content-Type': 'application/json',
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      },
      body: JSON.stringify({
        content: 'Forensic QA: Testing space persistent message transmission'
      })
    });
    assert(msgRes.status === 201, 'HTTP POST /channels/:id/messages returns 201 Created');

    // HTTP Fetch Channel Messages
    const getMsgRes = await fetch(`${harness.baseUrl}/api/education/community/channels/${newHttpSpace.discussionChannelId}/messages`, {
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      }
    });
    assert(getMsgRes.status === 200, 'HTTP GET /channels/:id/messages returns 200 OK');
    const msgsData = await getMsgRes.json();
    assert(msgsData.messages.some((m: any) => m.content.includes('Forensic QA: Testing space persistent message transmission')), 'Channel message persisted and retrieved from store');

    // HTTP End Space
    const endRes = await fetch(`${harness.baseUrl}/api/education/community/study-spaces/${newHttpSpace.id}/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s1Token}`,
        'x-user-id': 'student-1',
        'x-user-role': 'student'
      }
    });
    assert(endRes.status === 200, 'HTTP POST /study-spaces/:id/end returns 200 OK');
  } finally {
    await harness.close();
  }

  console.log('\n=== ALL FORENSIC QA HTTP & STORE TESTS COMPLETED AND PASSED (100%)! ===');
}

runForensicQA().catch(err => {
  console.error(err);
  process.exit(1);
});
