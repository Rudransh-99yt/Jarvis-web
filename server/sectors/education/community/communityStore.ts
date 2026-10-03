// In-Memory & Persistent Storage Engine for Discord-Style Academic Community Subsystem
import type {
  CommunityChannel,
  CommunityMessage,
  CommunityThread,
  CommunityStudyGroup,
  CommunityAnnouncement,
  CommunityNotification,
  CommunityReaction,
  CommunityAttachment
} from '../../../../src/types/community.ts';

// Pre-seeded Realistic Academic Community Dataset
const SEEDED_CHANNELS: CommunityChannel[] = [
  {
    id: 'chan-school-announcements',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'announcements',
    topic: 'Official Stark Academy Administrative Directives & Dean Notices',
    type: 'ANNOUNCEMENTS',
    isPrivate: false,
    allowedRoleList: ['teacher', 'principal', 'admin'],
    pinnedMessageIds: ['msg-ann-1'],
    createdById: 'principal-1',
    createdAt: '2026-10-01T08:00:00.000Z'
  },
  {
    id: 'chan-school-general',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    name: 'general-campus',
    topic: 'All-Cadet Campus Discussion & Interdisciplinary Science Hub',
    type: 'GENERAL',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'principal-1',
    createdAt: '2026-10-01T08:05:00.000Z'
  },
  {
    id: 'chan-phys301-announcements',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'phys301-announcements',
    topic: 'Dr. Helen Cho Official Course Notices & Exam Timetables',
    type: 'ANNOUNCEMENTS',
    isPrivate: false,
    allowedRoleList: ['teacher', 'principal', 'admin'],
    pinnedMessageIds: ['msg-phys-ann-1'],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:00:00.000Z'
  },
  {
    id: 'chan-phys301-theory',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'electrostatics-theory',
    topic: 'Coulomb Vector Form, Gauss Cylindrical Flux & Dipole Potentials',
    type: 'CLASS',
    isPrivate: false,
    pinnedMessageIds: ['msg-theory-pin-1'],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:10:00.000Z'
  },
  {
    id: 'chan-phys301-problems',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'homework-help',
    topic: 'Homework Problem Set #1 Discussion & Step-by-Step Derivations',
    type: 'QUESTIONS',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:15:00.000Z'
  },
  {
    id: 'chan-phys301-resources',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    name: 'course-resources',
    topic: 'NCERT Chapter PDFs, ClassSession Slides & Formula Handouts',
    type: 'RESOURCES',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-1',
    createdAt: '2026-10-01T09:20:00.000Z'
  },
  {
    id: 'chan-cs501-general',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-cs-501',
    name: 'distributed-consensus',
    topic: 'Paxos, Raft, Byzantine Generals & Vector Clocks',
    type: 'CLASS',
    isPrivate: false,
    pinnedMessageIds: [],
    createdById: 'teacher-2',
    createdAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'chan-sg-quantum',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    studyGroupId: 'sg-quantum-pioneers',
    name: 'quantum-pioneers-sync',
    topic: 'Peer Study Group: Gauss Boundary Problems & Past Exam Reviews',
    type: 'STUDY_GROUP',
    isPrivate: false,
    allowedUserIds: ['student-1', 'student-2', 'student-3', 'teacher-1'],
    pinnedMessageIds: [],
    createdById: 'student-1',
    createdAt: '2026-10-02T10:00:00.000Z'
  }
];

const SEEDED_STUDY_GROUPS: CommunityStudyGroup[] = [
  {
    id: 'sg-quantum-pioneers',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    courseCode: 'PHYS-301',
    name: 'Quantum Pioneers',
    description: 'Collaborative peer group focused on solving CBSE & National Board Physics electrostatics numericals.',
    subject: 'Physics',
    ownerUserId: 'student-1',
    ownerName: 'Alex Mercer',
    memberUserIds: ['student-1', 'student-2', 'student-3', 'teacher-1'],
    channelIds: ['chan-sg-quantum'],
    sharedResources: [
      {
        id: 'res-1',
        resourceType: 'class_session',
        resourceId: 'session-phys-101',
        title: 'ClassSession #101: Electrostatics & Gauss Surface Flux',
        context: 'Prepared Class Session Materials'
      },
      {
        id: 'res-2',
        resourceType: 'assignment',
        resourceId: 'asg-1',
        title: 'Homework Problem Set: Electrostatics & Gauss Applications',
        context: 'Due in 3 days'
      }
    ],
    scheduledMeetingAt: new Date(Date.now() + 86400000).toISOString(),
    isSupervised: true,
    supervisorTeacherId: 'teacher-1',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z'
  }
];

const SEEDED_MESSAGES: CommunityMessage[] = [
  {
    id: 'msg-ann-1',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    channelId: 'chan-school-announcements',
    senderUserId: 'principal-1',
    senderName: 'Dean Stark',
    senderRole: 'principal',
    content: 'Welcome cadets and faculty to the Fall Academic Term. All laboratories and Smart Classrooms are synchronized with Jarvis Education OS.',
    attachments: [],
    mentions: [],
    reactions: [
      { emoji: '🚀', userIds: ['student-1', 'student-2', 'teacher-1'], count: 3 },
      { emoji: '👍', userIds: ['student-1'], count: 1 }
    ],
    isPinned: true,
    isEdited: false,
    isDeleted: false,
    replyCount: 0,
    createdAt: '2026-10-01T08:15:00.000Z',
    updatedAt: '2026-10-01T08:15:00.000Z'
  },
  {
    id: 'msg-phys-ann-1',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    channelId: 'chan-phys301-announcements',
    senderUserId: 'teacher-1',
    senderName: 'Dr. Helen Cho',
    senderRole: 'teacher',
    content: 'Tomorrow’s Class Session on Coulomb’s Law and Gauss Theorem is prepared and scheduled for 09:00 AM in Hall C-104. Please review the attached reference sheet beforehand.',
    attachments: [
      {
        id: 'att-session-101',
        resourceType: 'class_session',
        resourceId: 'session-phys-101',
        title: 'ClassSession: Electrostatics & Field Formulations',
        context: 'Unit 1 · 45 mins'
      }
    ],
    mentions: [],
    reactions: [
      { emoji: '⚛️', userIds: ['student-1', 'student-2', 'student-3'], count: 3 },
      { emoji: '💡', userIds: ['student-1'], count: 1 }
    ],
    isPinned: true,
    isEdited: false,
    isDeleted: false,
    replyCount: 1,
    latestReplyAt: '2026-10-02T15:30:00.000Z',
    createdAt: '2026-10-02T14:00:00.000Z',
    updatedAt: '2026-10-02T14:00:00.000Z'
  },
  {
    id: 'msg-theory-pin-1',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    channelId: 'chan-phys301-theory',
    senderUserId: 'teacher-1',
    senderName: 'Dr. Helen Cho',
    senderRole: 'teacher',
    content: 'Key Intuition: When applying Gauss’s Law (∮ E · dA = q_enc / ε₀), always choose a Gaussian surface where electric field magnitude is CONSTANT and parallel to the area normal vector dA.',
    attachments: [
      {
        id: 'att-ncert-1',
        resourceType: 'chapter',
        resourceId: 'unit-em-maxwell',
        title: 'Unit 1: Electrostatics & Field Potentials',
        context: 'Section 1.14 Gauss Law'
      }
    ],
    mentions: [],
    reactions: [
      { emoji: '💡', userIds: ['student-1', 'student-2'], count: 2 },
      { emoji: '🔥', userIds: ['student-1'], count: 1 }
    ],
    isPinned: true,
    isEdited: false,
    isDeleted: false,
    replyCount: 2,
    latestReplyAt: '2026-10-02T16:20:00.000Z',
    createdAt: '2026-10-02T15:00:00.000Z',
    updatedAt: '2026-10-02T15:00:00.000Z'
  },
  {
    id: 'msg-student-q1',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    channelId: 'chan-phys301-problems',
    senderUserId: 'student-1',
    senderName: 'Alex Mercer',
    senderRole: 'student',
    content: 'On Problem #2 of the homework set, when calculating the linear charge density λ of the infinite line charge, should we convert the 2.0 cm radius to SI meters (0.02 m) before substituting into E = λ / (2πε₀ r)?',
    attachments: [
      {
        id: 'att-hw-1',
        resourceType: 'assignment',
        resourceId: 'asg-1',
        title: 'Homework Problem Set #1: Electrostatics',
        context: 'Problem #2 Infinite Line Charge'
      }
    ],
    mentions: ['teacher-1'],
    reactions: [
      { emoji: '👍', userIds: ['student-2'], count: 1 }
    ],
    isPinned: false,
    isEdited: false,
    isDeleted: false,
    replyCount: 1,
    latestReplyAt: '2026-10-02T17:05:00.000Z',
    createdAt: '2026-10-02T16:55:00.000Z',
    updatedAt: '2026-10-02T16:55:00.000Z'
  },
  {
    id: 'msg-teacher-reply-1',
    communityId: 'comm-stark-academy',
    schoolId: 'inst-stark-academy',
    classId: 'class-phys-301',
    channelId: 'chan-phys301-problems',
    threadId: 'thread-msg-student-q1',
    senderUserId: 'teacher-1',
    senderName: 'Dr. Helen Cho',
    senderRole: 'teacher',
    content: 'Yes, Alex! Always convert centimeters to meters in SI formulas. Radius r must be 0.02 m, which gives λ = 2πε₀ · r · E = 0.10 μC/m.',
    attachments: [],
    mentions: ['student-1'],
    reactions: [
      { emoji: '🙏', userIds: ['student-1'], count: 1 },
      { emoji: '💯', userIds: ['student-1', 'student-2'], count: 2 }
    ],
    isPinned: false,
    isEdited: false,
    isDeleted: false,
    replyCount: 0,
    createdAt: '2026-10-02T17:05:00.000Z',
    updatedAt: '2026-10-02T17:05:00.000Z'
  }
];

const SEEDED_THREADS: CommunityThread[] = [
  {
    id: 'thread-msg-student-q1',
    rootMessageId: 'msg-student-q1',
    channelId: 'chan-phys301-problems',
    classId: 'class-phys-301',
    schoolId: 'inst-stark-academy',
    title: 'Homework Problem #2 Unit Conversion',
    participantUserIds: ['student-1', 'teacher-1'],
    messageCount: 1,
    lastReplyAt: '2026-10-02T17:05:00.000Z',
    createdAt: '2026-10-02T17:05:00.000Z',
    updatedAt: '2026-10-02T17:05:00.000Z'
  }
];

export class CommunityStore {
  private channels: Map<string, CommunityChannel> = new Map();
  private messages: Map<string, CommunityMessage> = new Map();
  private threads: Map<string, CommunityThread> = new Map();
  private studyGroups: Map<string, CommunityStudyGroup> = new Map();
  private announcements: Map<string, CommunityAnnouncement> = new Map();
  private userReadStates: Map<string, Map<string, string>> = new Map(); // userId -> (channelId -> lastReadTimestamp)

  constructor() {
    SEEDED_CHANNELS.forEach((c) => this.channels.set(c.id, { ...c }));
    SEEDED_STUDY_GROUPS.forEach((sg) => this.studyGroups.set(sg.id, { ...sg }));
    SEEDED_MESSAGES.forEach((m) => this.messages.set(m.id, { ...m }));
    SEEDED_THREADS.forEach((t) => this.threads.set(t.id, { ...t }));
  }

  // --- Channels ---

  async listChannels(filters?: { schoolId?: string; classId?: string; studyGroupId?: string }): Promise<CommunityChannel[]> {
    let list = Array.from(this.channels.values());
    if (filters?.schoolId) {
      list = list.filter((c) => c.schoolId === filters.schoolId);
    }
    if (filters?.classId !== undefined) {
      list = list.filter((c) => c.classId === filters.classId || (!c.classId && !filters.classId));
    }
    if (filters?.studyGroupId) {
      list = list.filter((c) => c.studyGroupId === filters.studyGroupId);
    }
    return JSON.parse(JSON.stringify(list));
  }

  async getChannel(id: string): Promise<CommunityChannel | null> {
    const c = this.channels.get(id);
    return c ? JSON.parse(JSON.stringify(c)) : null;
  }

  async createChannel(data: Partial<CommunityChannel>): Promise<CommunityChannel> {
    const id = data.id || `chan-${Date.now()}`;
    const newChan: CommunityChannel = {
      id,
      communityId: data.communityId || 'comm-stark-academy',
      schoolId: data.schoolId || 'inst-stark-academy',
      classId: data.classId,
      studyGroupId: data.studyGroupId,
      name: data.name || 'new-channel',
      topic: data.topic || '',
      type: data.type || 'CLASS',
      isPrivate: data.isPrivate || false,
      allowedRoleList: data.allowedRoleList,
      allowedUserIds: data.allowedUserIds || [],
      pinnedMessageIds: [],
      createdById: data.createdById || 'user-1',
      createdAt: new Date().toISOString()
    };
    this.channels.set(id, newChan);
    return JSON.parse(JSON.stringify(newChan));
  }

  // --- Messages ---

  async listMessages(channelId: string, options?: { threadId?: string; limit?: number; before?: string }): Promise<CommunityMessage[]> {
    let list = Array.from(this.messages.values()).filter((m) => m.channelId === channelId);

    if (options?.threadId) {
      list = list.filter((m) => m.threadId === options.threadId);
    } else {
      // Main channel stream: exclude threaded replies
      list = list.filter((m) => !m.threadId);
    }

    // Filter active (non-permanently deleted or marked deleted)
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (options?.limit) {
      list = list.slice(-options.limit);
    }

    return JSON.parse(JSON.stringify(list));
  }

  async getMessage(id: string): Promise<CommunityMessage | null> {
    const m = this.messages.get(id);
    return m ? JSON.parse(JSON.stringify(m)) : null;
  }

  async createMessage(data: Partial<CommunityMessage>): Promise<CommunityMessage> {
    const id = data.id || `msg-${Date.now()}`;
    const now = new Date().toISOString();

    const newMsg: CommunityMessage = {
      id,
      communityId: data.communityId || 'comm-stark-academy',
      schoolId: data.schoolId || 'inst-stark-academy',
      classId: data.classId,
      channelId: data.channelId || 'chan-school-general',
      threadId: data.threadId,
      senderUserId: data.senderUserId || 'user-1',
      senderName: data.senderName || 'Anonymous',
      senderRole: data.senderRole || 'student',
      senderAvatar: data.senderAvatar,
      content: data.content || '',
      attachments: data.attachments || [],
      mentions: data.mentions || [],
      reactions: [],
      isPinned: false,
      isEdited: false,
      isDeleted: false,
      replyCount: 0,
      createdAt: now,
      updatedAt: now
    };

    this.messages.set(id, newMsg);

    // If this is a threaded reply, increment root message replyCount and thread metadata
    if (data.threadId) {
      const thread = this.threads.get(data.threadId);
      if (thread) {
        thread.messageCount += 1;
        thread.lastReplyAt = now;
        if (!thread.participantUserIds.includes(newMsg.senderUserId)) {
          thread.participantUserIds.push(newMsg.senderUserId);
        }
        this.threads.set(data.threadId, thread);

        const rootMsg = this.messages.get(thread.rootMessageId);
        if (rootMsg) {
          rootMsg.replyCount += 1;
          rootMsg.latestReplyAt = now;
          this.messages.set(rootMsg.id, rootMsg);
        }
      }
    }

    return JSON.parse(JSON.stringify(newMsg));
  }

  async updateMessage(id: string, content: string): Promise<CommunityMessage> {
    const msg = this.messages.get(id);
    if (!msg) throw new Error(`Message '${id}' not found.`);

    msg.content = content;
    msg.isEdited = true;
    msg.editedAt = new Date().toISOString();
    msg.updatedAt = new Date().toISOString();

    this.messages.set(id, msg);
    return JSON.parse(JSON.stringify(msg));
  }

  async deleteMessage(id: string): Promise<boolean> {
    const msg = this.messages.get(id);
    if (!msg) return false;

    msg.isDeleted = true;
    msg.content = '*(This message was removed by moderator or author)*';
    msg.attachments = [];
    msg.updatedAt = new Date().toISOString();
    this.messages.set(id, msg);
    return true;
  }

  async togglePin(channelId: string, messageId: string): Promise<{ isPinned: boolean }> {
    const msg = this.messages.get(messageId);
    const chan = this.channels.get(channelId);
    if (!msg || !chan) throw new Error('Message or Channel not found.');

    const newPinned = !msg.isPinned;
    msg.isPinned = newPinned;
    this.messages.set(messageId, msg);

    if (newPinned) {
      if (!chan.pinnedMessageIds.includes(messageId)) {
        chan.pinnedMessageIds.push(messageId);
      }
    } else {
      chan.pinnedMessageIds = chan.pinnedMessageIds.filter((p) => p !== messageId);
    }
    this.channels.set(channelId, chan);

    return { isPinned: newPinned };
  }

  async toggleReaction(messageId: string, emoji: string, userId: string): Promise<CommunityReaction[]> {
    const msg = this.messages.get(messageId);
    if (!msg) throw new Error(`Message '${messageId}' not found.`);

    let reaction = msg.reactions.find((r) => r.emoji === emoji);
    if (!reaction) {
      reaction = { emoji, userIds: [userId], count: 1 };
      msg.reactions.push(reaction);
    } else {
      const idx = reaction.userIds.indexOf(userId);
      if (idx !== -1) {
        reaction.userIds.splice(idx, 1);
        reaction.count -= 1;
      } else {
        reaction.userIds.push(userId);
        reaction.count += 1;
      }
    }

    // Clean up reactions with 0 count
    msg.reactions = msg.reactions.filter((r) => r.count > 0);
    this.messages.set(messageId, msg);
    return JSON.parse(JSON.stringify(msg.reactions));
  }

  // --- Threads ---

  async getThread(threadId: string): Promise<CommunityThread | null> {
    const t = this.threads.get(threadId);
    return t ? JSON.parse(JSON.stringify(t)) : null;
  }

  async createThread(rootMessageId: string, title?: string): Promise<CommunityThread> {
    const rootMsg = this.messages.get(rootMessageId);
    if (!rootMsg) throw new Error(`Root message '${rootMessageId}' not found.`);

    const threadId = `thread-${rootMessageId}`;
    const existing = this.threads.get(threadId);
    if (existing) return JSON.parse(JSON.stringify(existing));

    const newThread: CommunityThread = {
      id: threadId,
      rootMessageId,
      channelId: rootMsg.channelId,
      classId: rootMsg.classId,
      schoolId: rootMsg.schoolId,
      title: title || `Thread: ${rootMsg.content.slice(0, 30)}...`,
      participantUserIds: [rootMsg.senderUserId],
      messageCount: 0,
      lastReplyAt: rootMsg.createdAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.threads.set(threadId, newThread);
    return JSON.parse(JSON.stringify(newThread));
  }

  // --- Study Groups ---

  async listStudyGroups(schoolId: string, classId?: string): Promise<CommunityStudyGroup[]> {
    let list = Array.from(this.studyGroups.values()).filter((sg) => sg.schoolId === schoolId);
    if (classId) {
      list = list.filter((sg) => sg.classId === classId);
    }
    return JSON.parse(JSON.stringify(list));
  }

  async getStudyGroup(id: string): Promise<CommunityStudyGroup | null> {
    const sg = this.studyGroups.get(id);
    return sg ? JSON.parse(JSON.stringify(sg)) : null;
  }

  async createStudyGroup(data: Partial<CommunityStudyGroup>): Promise<CommunityStudyGroup> {
    const id = data.id || `sg-${Date.now()}`;
    const chanId = `chan-sg-${Date.now()}`;

    // Create default study group channel
    const groupChannel = await this.createChannel({
      id: chanId,
      communityId: 'comm-stark-academy',
      schoolId: data.schoolId || 'inst-stark-academy',
      classId: data.classId,
      studyGroupId: id,
      name: `${(data.name || 'study-group').toLowerCase().replace(/\s+/g, '-')}-sync`,
      topic: `Sync channel for ${data.name || 'Study Group'}`,
      type: 'STUDY_GROUP',
      isPrivate: false,
      allowedUserIds: data.memberUserIds || [data.ownerUserId || 'user-1']
    });

    const newGroup: CommunityStudyGroup = {
      id,
      schoolId: data.schoolId || 'inst-stark-academy',
      classId: data.classId || 'class-phys-301',
      courseCode: data.courseCode || 'PHYS-301',
      name: data.name || 'Study Group',
      description: data.description || '',
      subject: data.subject || 'Physics',
      ownerUserId: data.ownerUserId || 'user-1',
      ownerName: data.ownerName || 'Cadet',
      memberUserIds: data.memberUserIds || [data.ownerUserId || 'user-1'],
      channelIds: [groupChannel.id],
      sharedResources: data.sharedResources || [],
      scheduledMeetingAt: data.scheduledMeetingAt,
      isSupervised: data.isSupervised || false,
      supervisorTeacherId: data.supervisorTeacherId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.studyGroups.set(id, newGroup);
    return JSON.parse(JSON.stringify(newGroup));
  }

  async joinStudyGroup(groupId: string, userId: string): Promise<CommunityStudyGroup> {
    const group = this.studyGroups.get(groupId);
    if (!group) throw new Error(`Study group '${groupId}' not found.`);

    if (!group.memberUserIds.includes(userId)) {
      group.memberUserIds.push(userId);
      group.updatedAt = new Date().toISOString();
      this.studyGroups.set(groupId, group);

      // Add user to allowedUserIds of group channels
      for (const chId of group.channelIds) {
        const ch = this.channels.get(chId);
        if (ch && ch.allowedUserIds && !ch.allowedUserIds.includes(userId)) {
          ch.allowedUserIds.push(userId);
          this.channels.set(chId, ch);
        }
      }
    }

    return JSON.parse(JSON.stringify(group));
  }

  // --- Announcements ---

  async listAnnouncements(schoolId: string, classId?: string): Promise<CommunityAnnouncement[]> {
    let list = Array.from(this.announcements.values()).filter((a) => a.schoolId === schoolId);
    if (classId) {
      list = list.filter((a) => a.classId === classId || !a.classId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return JSON.parse(JSON.stringify(list));
  }

  async createAnnouncement(data: Partial<CommunityAnnouncement>): Promise<CommunityAnnouncement> {
    const id = data.id || `ann-${Date.now()}`;
    const newAnn: CommunityAnnouncement = {
      id,
      schoolId: data.schoolId || 'inst-stark-academy',
      classId: data.classId,
      channelId: data.channelId || 'chan-school-announcements',
      title: data.title || 'Announcement',
      body: data.body || '',
      authorUserId: data.authorUserId || 'principal-1',
      authorName: data.authorName || 'Faculty',
      authorRole: data.authorRole || 'teacher',
      priority: data.priority || 'normal',
      attachments: data.attachments || [],
      acknowledgedUserIds: [],
      scheduledAt: data.scheduledAt,
      createdAt: new Date().toISOString()
    };

    this.announcements.set(id, newAnn);

    // Also dispatch as a pinned message in the announcements channel
    await this.createMessage({
      communityId: 'comm-stark-academy',
      schoolId: newAnn.schoolId,
      classId: newAnn.classId,
      channelId: newAnn.channelId,
      senderUserId: newAnn.authorUserId,
      senderName: newAnn.authorName,
      senderRole: newAnn.authorRole,
      content: `📢 **[${newAnn.priority.toUpperCase()}] ${newAnn.title}**\n\n${newAnn.body}`,
      attachments: newAnn.attachments,
      isPinned: true
    });

    return JSON.parse(JSON.stringify(newAnn));
  }

  async acknowledgeAnnouncement(id: string, userId: string): Promise<CommunityAnnouncement> {
    const ann = this.announcements.get(id);
    if (!ann) throw new Error(`Announcement '${id}' not found.`);
    if (!ann.acknowledgedUserIds.includes(userId)) {
      ann.acknowledgedUserIds.push(userId);
      this.announcements.set(id, ann);
    }
    return JSON.parse(JSON.stringify(ann));
  }

  // --- Search ---

  async searchCommunity(query: string, schoolId: string, classId?: string): Promise<{
    messages: CommunityMessage[];
    channels: CommunityChannel[];
    announcements: CommunityAnnouncement[];
    studyGroups: CommunityStudyGroup[];
  }> {
    const clean = query.toLowerCase().trim();
    if (!clean) {
      return { messages: [], channels: [], announcements: [], studyGroups: [] };
    }

    const matchedMessages = Array.from(this.messages.values()).filter((m) => {
      const matchSchool = m.schoolId === schoolId;
      const matchClass = !classId || m.classId === classId || !m.classId;
      const matchText = m.content.toLowerCase().includes(clean);
      return matchSchool && matchClass && matchText && !m.isDeleted;
    });

    const matchedChannels = Array.from(this.channels.values()).filter((c) => {
      const matchSchool = c.schoolId === schoolId;
      const matchClass = !classId || c.classId === classId || !c.classId;
      const matchName = c.name.toLowerCase().includes(clean) || c.topic.toLowerCase().includes(clean);
      return matchSchool && matchClass && matchName;
    });

    const matchedAnnouncements = Array.from(this.announcements.values()).filter((a) => {
      const matchSchool = a.schoolId === schoolId;
      const matchClass = !classId || a.classId === classId || !a.classId;
      const matchText = a.title.toLowerCase().includes(clean) || a.body.toLowerCase().includes(clean);
      return matchSchool && matchClass && matchText;
    });

    const matchedStudyGroups = Array.from(this.studyGroups.values()).filter((sg) => {
      const matchSchool = sg.schoolId === schoolId;
      const matchClass = !classId || sg.classId === classId;
      const matchText = sg.name.toLowerCase().includes(clean) || sg.description.toLowerCase().includes(clean);
      return matchSchool && matchClass && matchText;
    });

    return {
      messages: JSON.parse(JSON.stringify(matchedMessages.slice(0, 20))),
      channels: JSON.parse(JSON.stringify(matchedChannels)),
      announcements: JSON.parse(JSON.stringify(matchedAnnouncements)),
      studyGroups: JSON.parse(JSON.stringify(matchedStudyGroups))
    };
  }
}

export const communityStore = new CommunityStore();
