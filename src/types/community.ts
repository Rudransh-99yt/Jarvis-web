// Domain Models for Jarvis Education Discord-Style Academic Community

export type CommunityChannelType =
  | 'ANNOUNCEMENTS'
  | 'CLASS'
  | 'SUBJECT'
  | 'STUDY_GROUP'
  | 'GENERAL'
  | 'QUESTIONS'
  | 'RESOURCES';

export type CommunityAttachmentType =
  | 'course'
  | 'chapter'
  | 'lesson'
  | 'class_session'
  | 'assignment'
  | 'knowledge_space'
  | 'workspace_page'
  | 'video'
  | 'file';

export interface CommunityAttachment {
  id: string;
  resourceType: CommunityAttachmentType;
  resourceId: string;
  title: string;
  context?: string; // e.g. "Chapter 1: Electrostatics", "Problem 4: Coulomb Vector", "ClassSession #101"
  url?: string;
  metadata?: Record<string, any>;
}

export interface CommunityReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface CommunityMessage {
  id: string;
  communityId: string;
  schoolId: string;
  classId?: string;
  channelId: string;
  threadId?: string; // If this is a reply in a thread
  senderUserId: string;
  senderName: string;
  senderRole: 'student' | 'teacher' | 'principal' | 'admin';
  senderAvatar?: string;
  content: string;
  attachments: CommunityAttachment[];
  mentions: string[]; // userIds
  reactions: CommunityReaction[];
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  replyCount: number;
  latestReplyAt?: string;
  reportedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityThread {
  id: string;
  rootMessageId: string;
  channelId: string;
  classId?: string;
  schoolId: string;
  title?: string;
  courseId?: string;
  unitId?: string;
  lessonId?: string;
  classSessionId?: string;
  academicContext?: import('./academicContext.ts').AcademicContext;
  participantUserIds: string[];
  messageCount: number;
  lastReplyAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityChannel {
  id: string;
  communityId: string;
  schoolId: string;
  classId?: string;
  studyGroupId?: string;
  courseId?: string;
  unitId?: string;
  lessonId?: string;
  classSessionId?: string;
  academicContext?: import('./academicContext.ts').AcademicContext;
  name: string;
  topic: string;
  type: CommunityChannelType;
  isPrivate: boolean;
  allowedRoleList?: Array<'student' | 'teacher' | 'principal' | 'admin'>;
  allowedUserIds?: string[]; // For private channels / study groups
  pinnedMessageIds: string[];
  unreadCount?: number;
  lastMessageAt?: string;
  createdById: string;
  createdAt: string;
}

export interface CommunityStudyGroup {
  id: string;
  schoolId: string;
  classId: string;
  courseCode: string;
  name: string;
  description: string;
  subject: string;
  ownerUserId: string;
  ownerName: string;
  memberUserIds: string[];
  channelIds: string[];
  sharedResources: CommunityAttachment[];
  scheduledMeetingAt?: string;
  isSupervised: boolean;
  supervisorTeacherId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityAnnouncement {
  id: string;
  schoolId: string;
  classId?: string; // If omitted, institution-wide
  channelId: string;
  title: string;
  body: string;
  authorUserId: string;
  authorName: string;
  authorRole: 'teacher' | 'principal' | 'admin';
  priority: 'normal' | 'important' | 'urgent';
  attachments: CommunityAttachment[];
  acknowledgedUserIds: string[];
  scheduledAt?: string;
  createdAt: string;
}

export interface CommunityNotification {
  id: string;
  userId: string;
  type: 'mention' | 'reply' | 'announcement' | 'study_group_invite' | 'reaction';
  title: string;
  body: string;
  channelId: string;
  messageId?: string;
  threadId?: string;
  studyGroupId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AcademicCommunity {
  id: string;
  schoolId: string;
  name: string;
  channels: CommunityChannel[];
  studyGroups: CommunityStudyGroup[];
  announcements: CommunityAnnouncement[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityStudySpaceParticipant {
  id: string;
  name: string;
  role: string;
  isSpeaking?: boolean;
  hasVideo?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  isHandRaised?: boolean;
  joinedAt?: string;
}

export interface CommunityStudySpace {
  id: string;
  groupId: string;
  studyGroupId?: string;
  groupName: string;
  schoolId?: string;
  classId?: string;
  courseCode: string;
  title: string;
  name?: string;
  topic: string;
  createdBy?: string;
  createdById?: string;
  activeCount: number;
  participants: CommunityStudySpaceParticipant[];
  participantUserIds?: string[];
  voiceConnected: boolean;
  videoEnabled: boolean;
  sharedProblemContext: string;
  formulaNotes: string;
  status: 'ACTIVE_NOW' | 'UPCOMING' | 'CONCLUDED' | 'ACTIVE' | 'SCHEDULED';
  startedAt?: string;
  endedAt?: string;
  discussionChannelId?: string;
  createdAt?: string;
  updatedAt?: string;
}
