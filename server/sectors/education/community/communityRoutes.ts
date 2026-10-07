// REST & Realtime SSE API Routes for Discord-Style Academic Community Subsystem
import { Router, type Request, type Response } from 'express';
import { communityStore } from './communityStore.ts';
import { communityPolicy } from './communityPolicy.ts';
import { communityEventBus } from './communityEventBus.ts';
import { authenticateRequest } from '../../../auth/index.ts';
import { jarvisData } from '../../../data/index.ts';
import type { User, UserRole } from '../../../data/types.ts';

export const communityRouter = Router();

/**
 * Helper to resolve user from request with development fallback
 */
async function resolveUser(req: Request): Promise<User> {
  try {
    return await authenticateRequest(req, jarvisData);
  } catch {
    const roleHeader = (req.headers['x-user-role'] as string) || 'student';
    const userIdHeader = (req.headers['x-user-id'] as string) || (roleHeader === 'student' ? 'student-1' : 'teacher-1');
    const existing = await jarvisData.users.getById(userIdHeader);
    if (existing) return existing;

    const validRole: UserRole = (['admin', 'commander', 'teacher', 'student', 'guest'].includes(roleHeader)
      ? roleHeader
      : 'student') as UserRole;

    return {
      id: userIdHeader,
      displayName: roleHeader === 'student' ? 'Alex Mercer' : 'Dr. Helen Cho',
      email: `${userIdHeader}@starkacademy.edu`,
      role: validRole,
      department: 'Physics',
      avatarUrl: undefined,
      createdAt: new Date().toISOString()
    };
  }
}

// 1. GET /api/education/community/events - Server-Sent Events (SSE) Real-Time Stream
communityRouter.get('/events', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connected heartbeat
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const onCommunityEvent = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  communityEventBus.on('community_event', onCommunityEvent);

  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    communityEventBus.off('community_event', onCommunityEvent);
  });
});

// 2. GET /api/education/community/channels - List channels
communityRouter.get('/channels', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { classId, studyGroupId } = req.query;

    const allChannels = await communityStore.listChannels({
      schoolId: 'inst-stark-academy',
      classId: classId as string,
      studyGroupId: studyGroupId as string
    });

    // Filter channels authorized for this user
    const authorizedChannels = [];
    for (const ch of allChannels) {
      const check = await communityPolicy.canAccessChannel(user, ch);
      if (check.allowed) {
        authorizedChannels.push(ch);
      }
    }

    res.json({ channels: authorizedChannels });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 3. POST /api/education/community/channels - Create Channel
communityRouter.post('/channels', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { name, topic, type, classId, isPrivate } = req.body;

    if (!name) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Channel name is required.' } });
      return;
    }

    // Only staff can create ANNOUNCEMENTS channels
    if (type === 'ANNOUNCEMENTS') {
      const annCheck = await communityPolicy.canCreateAnnouncement(user);
      if (!annCheck.allowed) {
        res.status(403).json({ error: { code: 'UNAUTHORIZED', message: annCheck.reason } });
        return;
      }
    }

    const channel = await communityStore.createChannel({
      schoolId: 'inst-stark-academy',
      classId,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      topic: topic || '',
      type: type || 'CLASS',
      isPrivate: isPrivate || false,
      createdById: user.id
    });

    res.status(201).json({ channel });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 4. GET /api/education/community/channels/:id/messages - List messages in channel
communityRouter.get('/channels/:id/messages', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const channelId = req.params.id as string;
    const { limit } = req.query;

    const channel = await communityStore.getChannel(channelId);
    if (!channel) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Channel not found.' } });
      return;
    }

    const access = await communityPolicy.canAccessChannel(user, channel);
    if (!access.allowed) {
      res.status(access.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: access.reason } });
      return;
    }

    const messages = await communityStore.listMessages(channelId, {
      limit: limit ? Number(limit) : 50
    });

    res.json({ channel, messages });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 5. POST /api/education/community/channels/:id/messages - Send message
communityRouter.post('/channels/:id/messages', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const channelId = req.params.id as string;
    const { content, attachments, mentions } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Message content or attachment required.' } });
      return;
    }

    const channel = await communityStore.getChannel(channelId);
    if (!channel) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Channel not found.' } });
      return;
    }

    const postCheck = await communityPolicy.canPostToChannel(user, channel);
    if (!postCheck.allowed) {
      res.status(postCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: postCheck.reason } });
      return;
    }

    const message = await communityStore.createMessage({
      communityId: channel.communityId,
      schoolId: channel.schoolId,
      classId: channel.classId,
      channelId: channel.id,
      senderUserId: user.id,
      senderName: user.displayName || 'Anonymous',
      senderRole: (user.role as any) || 'student',
      senderAvatar: user.avatarUrl,
      content: content || '',
      attachments: attachments || [],
      mentions: mentions || []
    });

    // Real-time broadcast
    communityEventBus.publishMessageCreated(message);

    res.status(201).json({ message });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 6. PATCH /api/education/community/messages/:id - Edit message
communityRouter.patch('/messages/:id', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const messageId = req.params.id as string;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Content is required.' } });
      return;
    }

    const msg = await communityStore.getMessage(messageId);
    if (!msg) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found.' } });
      return;
    }

    const modCheck = await communityPolicy.canModifyMessage(user, msg, 'edit');
    if (!modCheck.allowed) {
      res.status(modCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: modCheck.reason } });
      return;
    }

    const updated = await communityStore.updateMessage(messageId, content);
    communityEventBus.publishMessageUpdated(updated);

    res.json({ message: updated });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 7. DELETE /api/education/community/messages/:id - Delete message
communityRouter.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const messageId = req.params.id as string;

    const msg = await communityStore.getMessage(messageId);
    if (!msg) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found.' } });
      return;
    }

    const modCheck = await communityPolicy.canModifyMessage(user, msg, 'delete');
    if (!modCheck.allowed) {
      res.status(modCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: modCheck.reason } });
      return;
    }

    await communityStore.deleteMessage(messageId);
    communityEventBus.publishMessageDeleted(messageId, msg.channelId, msg.schoolId, msg.classId);

    res.json({ success: true, messageId });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 8. POST /api/education/community/channels/:id/messages/:messageId/pin - Toggle pin
communityRouter.post('/channels/:id/messages/:messageId/pin', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const channelId = req.params.id as string;
    const messageId = req.params.messageId as string;

    const pinCheck = await communityPolicy.canPinMessage(user);
    if (!pinCheck.allowed) {
      res.status(pinCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: pinCheck.reason } });
      return;
    }

    const result = await communityStore.togglePin(channelId, messageId);
    const updatedMsg = await communityStore.getMessage(messageId);
    if (updatedMsg) {
      communityEventBus.publishMessageUpdated(updatedMsg);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 9. POST /api/education/community/messages/:id/reactions - Toggle reaction
communityRouter.post('/messages/:id/reactions', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const messageId = req.params.id as string;
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Emoji is required.' } });
      return;
    }

    const msg = await communityStore.getMessage(messageId);
    if (!msg) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found.' } });
      return;
    }

    const reactions = await communityStore.toggleReaction(messageId, emoji, user.id);
    communityEventBus.publishReactionUpdated(messageId, msg.channelId, reactions, msg.schoolId, msg.classId);

    res.json({ reactions });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 10. GET /api/education/community/threads/:threadId/messages - Thread replies
communityRouter.get('/threads/:threadId/messages', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const threadId = req.params.threadId as string;

    const thread = await communityStore.getThread(threadId);
    if (!thread) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Thread not found.' } });
      return;
    }

    const channel = await communityStore.getChannel(thread.channelId);
    if (channel) {
      const access = await communityPolicy.canAccessChannel(user, channel);
      if (!access.allowed) {
        res.status(access.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: access.reason } });
        return;
      }
    }

    const rootMessage = await communityStore.getMessage(thread.rootMessageId);
    const replies = await communityStore.listMessages(thread.channelId, { threadId });

    res.json({ thread, rootMessage, replies });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 11. POST /api/education/community/messages/:rootMessageId/thread - Reply in thread
communityRouter.post('/messages/:rootMessageId/thread', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const rootMessageId = req.params.rootMessageId as string;
    const { content, attachments } = req.body;

    if (!content) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Reply content is required.' } });
      return;
    }

    const rootMsg = await communityStore.getMessage(rootMessageId);
    if (!rootMsg) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Root message not found.' } });
      return;
    }

    const channel = await communityStore.getChannel(rootMsg.channelId);
    if (!channel) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Channel not found.' } });
      return;
    }

    const postCheck = await communityPolicy.canPostToChannel(user, channel);
    if (!postCheck.allowed) {
      res.status(postCheck.statusCode || 403).json({ error: { code: 'UNAUTHORIZED', message: postCheck.reason } });
      return;
    }

    const thread = await communityStore.createThread(rootMessageId);

    const replyMsg = await communityStore.createMessage({
      communityId: rootMsg.communityId,
      schoolId: rootMsg.schoolId,
      classId: rootMsg.classId,
      channelId: rootMsg.channelId,
      threadId: thread.id,
      senderUserId: user.id,
      senderName: user.displayName || 'Anonymous',
      senderRole: (user.role as any) || 'student',
      senderAvatar: user.avatarUrl,
      content,
      attachments: attachments || []
    });

    communityEventBus.publishMessageCreated(replyMsg);
    communityEventBus.publishThreadCreated(thread);

    res.status(201).json({ thread, reply: replyMsg });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 12. GET /api/education/community/study-groups - List study groups
communityRouter.get('/study-groups', async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;
    const list = await communityStore.listStudyGroups('inst-stark-academy', classId as string);
    res.json({ studyGroups: list });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 13. POST /api/education/community/study-groups - Create study group
communityRouter.post('/study-groups', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { name, description, classId, courseCode, subject, scheduledMeetingAt, sharedResources } = req.body;

    if (!name || !classId) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Group name and classId are required.' } });
      return;
    }

    const group = await communityStore.createStudyGroup({
      schoolId: 'inst-stark-academy',
      classId,
      courseCode: courseCode || 'PHYS-301',
      name,
      description: description || '',
      subject: subject || 'Physics',
      ownerUserId: user.id,
      ownerName: user.displayName || 'Cadet',
      memberUserIds: [user.id],
      sharedResources: sharedResources || [],
      scheduledMeetingAt,
      isSupervised: user.role === 'teacher',
      supervisorTeacherId: user.role === 'teacher' ? user.id : undefined
    });

    res.status(201).json({ studyGroup: group });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14. POST /api/education/community/study-groups/:id/join - Join study group
communityRouter.post('/study-groups/:id/join', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const groupId = req.params.id as string;

    const group = await communityStore.joinStudyGroup(groupId, user.id);
    communityEventBus.publishStudyGroupMemberJoined(group.id, user.id, group.memberUserIds, group.schoolId, group.classId);

    res.json({ studyGroup: group });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14b. POST /api/education/community/study-groups/:id/leave - Leave study group
communityRouter.post('/study-groups/:id/leave', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const groupId = req.params.id as string;

    const group = await communityStore.leaveStudyGroup(groupId, user.id);
    communityEventBus.publishStudyGroupMemberLeft(group.id, user.id, group.memberUserIds, group.schoolId, group.classId);

    res.json({ studyGroup: group });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14c. GET /api/education/community/study-spaces - List study spaces
communityRouter.get('/study-spaces', async (req: Request, res: Response) => {
  try {
    const { classId, studyGroupId, status } = req.query;
    const list = await communityStore.listStudySpaces('inst-stark-academy', {
      classId: classId as string,
      studyGroupId: studyGroupId as string,
      status: status as string
    });
    res.json({ studySpaces: list });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14d. GET /api/education/community/study-spaces/:id - Get single study space
communityRouter.get('/study-spaces/:id', async (req: Request, res: Response) => {
  try {
    const spaceId = req.params.id as string;
    const space = await communityStore.getStudySpace(spaceId);
    if (!space) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Study space not found.' } });
      return;
    }
    res.json({ studySpace: space });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14e. POST /api/education/community/study-spaces - Create study space
communityRouter.post('/study-spaces', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { title, topic, studyGroupId, groupId, classId, courseCode, sharedProblemContext, formulaNotes } = req.body;

    if (!title) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Space title is required.' } });
      return;
    }

    const space = await communityStore.createStudySpace({
      schoolId: 'inst-stark-academy',
      studyGroupId: studyGroupId || groupId,
      groupId: groupId || studyGroupId,
      classId,
      courseCode,
      title,
      name: title,
      topic: topic || '',
      createdById: user.id,
      createdBy: user.displayName || 'Cadet',
      status: 'ACTIVE_NOW',
      participants: [
        {
          id: user.id,
          name: user.displayName || 'Cadet',
          role: user.role || 'student',
          isSpeaking: false,
          audioEnabled: true,
          videoEnabled: false,
          isHandRaised: false,
          joinedAt: new Date().toISOString()
        }
      ],
      participantUserIds: [user.id],
      sharedProblemContext: sharedProblemContext || 'Self-organized peer collaboration workspace',
      formulaNotes: formulaNotes || ''
    });

    communityEventBus.publishStudySpaceCreated(space);

    res.status(201).json({ studySpace: space });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14f. POST /api/education/community/study-spaces/:id/join - Join study space (registers presence)
communityRouter.post('/study-spaces/:id/join', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const spaceId = req.params.id as string;

    const space = await communityStore.joinStudySpace(spaceId, {
      id: user.id,
      displayName: user.displayName || 'Cadet',
      role: user.role || 'student'
    });

    communityEventBus.publishStudySpaceMemberJoined(
      space.id,
      space.groupId,
      user.id,
      space.participantUserIds || [],
      space.schoolId || 'inst-stark-academy',
      space.classId
    );

    res.json({ studySpace: space });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14g. POST /api/education/community/study-spaces/:id/leave - Leave study space (unregisters presence)
communityRouter.post('/study-spaces/:id/leave', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const spaceId = req.params.id as string;

    const space = await communityStore.leaveStudySpace(spaceId, user.id);

    communityEventBus.publishStudySpaceMemberLeft(
      space.id,
      space.groupId,
      user.id,
      space.participantUserIds || [],
      space.schoolId || 'inst-stark-academy',
      space.classId
    );

    res.json({ studySpace: space });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14h. POST /api/education/community/study-spaces/:id/participant-state - Update participant state
communityRouter.post('/study-spaces/:id/participant-state', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const spaceId = req.params.id as string;
    const { audioEnabled, videoEnabled, isSpeaking, isHandRaised } = req.body;

    const result = await communityStore.updateParticipantState(spaceId, user.id, {
      audioEnabled,
      videoEnabled,
      isSpeaking,
      isHandRaised
    });

    communityEventBus.publishStudySpaceParticipantUpdated(
      result.space.id,
      user.id,
      result.participant,
      result.space.schoolId || 'inst-stark-academy',
      result.space.classId
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 14i. POST /api/education/community/study-spaces/:id/end - End study space (host only)
communityRouter.post('/study-spaces/:id/end', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const spaceId = req.params.id as string;

    const space = await communityStore.endStudySpace(spaceId, user.id);
    communityEventBus.publishStudySpaceEnded(space);

    res.json({ studySpace: space });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 15. GET /api/education/community/announcements - List announcements
communityRouter.get('/announcements', async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;
    const list = await communityStore.listAnnouncements('inst-stark-academy', classId as string);
    res.json({ announcements: list });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 16. POST /api/education/community/announcements - Create announcement (staff only)
communityRouter.post('/announcements', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const { title, body, priority, classId, channelId, attachments, scheduledAt } = req.body;

    if (!title || !body) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Title and body are required.' } });
      return;
    }

    const annCheck = await communityPolicy.canCreateAnnouncement(user);
    if (!annCheck.allowed) {
      res.status(403).json({ error: { code: 'UNAUTHORIZED', message: annCheck.reason } });
      return;
    }

    const announcement = await communityStore.createAnnouncement({
      schoolId: 'inst-stark-academy',
      classId,
      channelId: channelId || (classId ? 'chan-phys301-announcements' : 'chan-school-announcements'),
      title,
      body,
      authorUserId: user.id,
      authorName: user.displayName || 'Faculty',
      authorRole: (user.role as any) || 'teacher',
      priority: priority || 'normal',
      attachments: attachments || [],
      scheduledAt
    });

    communityEventBus.publishAnnouncementCreated(announcement);

    res.status(201).json({ announcement });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 17. POST /api/education/community/announcements/:id/acknowledge - Acknowledge announcement
communityRouter.post('/announcements/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const annId = req.params.id as string;

    const ann = await communityStore.acknowledgeAnnouncement(annId, user.id);
    res.json({ announcement: ann });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// 18. GET /api/education/community/search - Search messages, channels, study groups
communityRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, classId } = req.query;
    const results = await communityStore.searchCommunity(
      (q as string) || '',
      'inst-stark-academy',
      classId as string
    );
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});
