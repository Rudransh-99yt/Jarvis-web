// Real-Time EventBus for Discord-Style Academic Community Subsystem
import { EventEmitter } from 'node:events';
import type {
  CommunityMessage,
  CommunityReaction,
  CommunityAnnouncement,
  CommunityChannel,
  CommunityThread
} from '../../../../src/types/community.ts';

export type CommunityEventType =
  | 'community.message.created'
  | 'community.message.updated'
  | 'community.message.deleted'
  | 'community.thread.created'
  | 'community.reaction.updated'
  | 'community.channel.updated'
  | 'community.announcement.created'
  | 'community.read.updated'
  | 'study_group.member.joined'
  | 'study_group.member.left'
  | 'study_space.created'
  | 'study_space.started'
  | 'study_space.ended'
  | 'study_space.member.joined'
  | 'study_space.member.left'
  | 'study_space.participant.updated';

export interface CommunityRealtimeEvent {
  id: string;
  type: CommunityEventType;
  schoolId: string;
  classId?: string;
  channelId?: string;
  data: any;
  timestamp: string;
}

export class CommunityEventBus extends EventEmitter {
  private eventCounter: number = 0;

  constructor() {
    super();
    this.setMaxListeners(200);
  }

  /**
   * Broadcasts a real-time event to school, class, and channel subscribers
   */
  publishEvent(
    type: CommunityEventType,
    payload: {
      schoolId: string;
      classId?: string;
      channelId?: string;
      data: any;
    }
  ): void {
    const timestamp = new Date().toISOString();
    this.eventCounter++;
    const event: CommunityRealtimeEvent = {
      id: `evt-${Date.now()}-${this.eventCounter}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      schoolId: payload.schoolId,
      classId: payload.classId,
      channelId: payload.channelId,
      data: payload.data,
      timestamp
    };

    // 1. General event broadcast
    this.emit('community_event', event);

    // 2. School-scoped event
    this.emit(`school:${payload.schoolId}`, event);

    // 3. Class-scoped event
    if (payload.classId) {
      this.emit(`class:${payload.schoolId}:${payload.classId}`, event);
    }

    // 4. Channel-scoped event
    if (payload.channelId) {
      this.emit(`channel:${payload.channelId}`, event);
    }
  }

  publishMessageCreated(message: CommunityMessage): void {
    this.publishEvent('community.message.created', {
      schoolId: message.schoolId,
      classId: message.classId,
      channelId: message.channelId,
      data: message
    });
  }

  publishMessageUpdated(message: CommunityMessage): void {
    this.publishEvent('community.message.updated', {
      schoolId: message.schoolId,
      classId: message.classId,
      channelId: message.channelId,
      data: message
    });
  }

  publishMessageDeleted(messageId: string, channelId: string, schoolId: string, classId?: string): void {
    this.publishEvent('community.message.deleted', {
      schoolId,
      classId,
      channelId,
      data: { messageId, channelId }
    });
  }

  publishReactionUpdated(messageId: string, channelId: string, reactions: CommunityReaction[], schoolId: string, classId?: string): void {
    this.publishEvent('community.reaction.updated', {
      schoolId,
      classId,
      channelId,
      data: { messageId, channelId, reactions }
    });
  }

  publishAnnouncementCreated(announcement: CommunityAnnouncement): void {
    this.publishEvent('community.announcement.created', {
      schoolId: announcement.schoolId,
      classId: announcement.classId,
      channelId: announcement.channelId,
      data: announcement
    });
  }

  publishThreadCreated(thread: CommunityThread): void {
    this.publishEvent('community.thread.created', {
      schoolId: thread.schoolId,
      classId: thread.classId,
      channelId: thread.channelId,
      data: thread
    });
  }

  publishStudyGroupMemberJoined(groupId: string, userId: string, memberUserIds: string[], schoolId: string, classId?: string): void {
    this.publishEvent('study_group.member.joined', {
      schoolId,
      classId,
      data: { groupId, userId, memberUserIds }
    });
  }

  publishStudyGroupMemberLeft(groupId: string, userId: string, memberUserIds: string[], schoolId: string, classId?: string): void {
    this.publishEvent('study_group.member.left', {
      schoolId,
      classId,
      data: { groupId, userId, memberUserIds }
    });
  }

  publishStudySpaceCreated(space: any): void {
    this.publishEvent('study_space.created', {
      schoolId: space.schoolId || 'inst-stark-academy',
      classId: space.classId,
      channelId: space.discussionChannelId,
      data: space
    });
  }

  publishStudySpaceStarted(space: any): void {
    this.publishEvent('study_space.started', {
      schoolId: space.schoolId || 'inst-stark-academy',
      classId: space.classId,
      channelId: space.discussionChannelId,
      data: space
    });
  }

  publishStudySpaceEnded(space: any): void {
    this.publishEvent('study_space.ended', {
      schoolId: space.schoolId || 'inst-stark-academy',
      classId: space.classId,
      channelId: space.discussionChannelId,
      data: space
    });
  }

  publishStudySpaceMemberJoined(spaceId: string, studyGroupId: string, userId: string, participantUserIds: string[], schoolId: string, classId?: string): void {
    this.publishEvent('study_space.member.joined', {
      schoolId,
      classId,
      data: { spaceId, studyGroupId, userId, participantUserIds }
    });
  }

  publishStudySpaceMemberLeft(spaceId: string, studyGroupId: string, userId: string, participantUserIds: string[], schoolId: string, classId?: string): void {
    this.publishEvent('study_space.member.left', {
      schoolId,
      classId,
      data: { spaceId, studyGroupId, userId, participantUserIds }
    });
  }

  publishStudySpaceParticipantUpdated(spaceId: string, userId: string, participant: any, schoolId: string, classId?: string): void {
    this.publishEvent('study_space.participant.updated', {
      schoolId,
      classId,
      data: { spaceId, userId, participant }
    });
  }
}

export const communityEventBus = new CommunityEventBus();
