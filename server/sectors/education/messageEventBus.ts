import { requirePrincipal } from '../../auth/principal.ts';
// Milestone 11: Real-Time EventBus for Class Messaging & Notifications
import { EventEmitter } from 'node:events';
import type { Message } from '../../data/types.ts';
import type { MessagingNotification } from '../../../src/types/education.ts';

export interface RealtimeMessageEvent {
  type: 'message' | 'notification' | 'read' | 'heartbeat';
  classId: string;
  workspaceId: string;
  data: any;
  timestamp: string;
}

export class MessageEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow multiple concurrent connected SSE clients
    this.setMaxListeners(100);
  }

  /**
   * Broadcasts a new message and its derived notification to all authorized listeners.
   */
  publishMessage(message: Message, classCode?: string): { message: Message; notification: MessagingNotification } {
    const timestamp = message.createdAt || new Date().toISOString();
    const hasAttachment = Boolean(message.attachmentFileIds && message.attachmentFileIds.length > 0);

    const notification: MessagingNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: message.workspaceId || 'ws-stark-core',
      classId: message.classId || '',
      messageId: message.id,
      senderUserId: message.senderUserId || 'unknown',
      senderName: message.senderName || 'Authorized User',
      senderRole: (message.senderRole as any) || 'student',
      title: hasAttachment
        ? `${message.senderName} shared an attachment${classCode ? ` in ${classCode}` : ''}`
        : `New message from ${message.senderName}${classCode ? ` in ${classCode}` : ''}`,
      body: message.body ? (message.body.length > 90 ? `${message.body.slice(0, 87)}...` : message.body) : 'Sent an attachment',
      hasAttachment,
      timestamp
    };

    const classId = message.classId || '';
    const workspaceId = message.workspaceId || 'ws-stark-core';

    // 1. Emit general event
    this.emit('message', {
      type: 'message',
      classId,
      workspaceId,
      data: message,
      timestamp
    });

    // 2. Emit class-specific channel event
    this.emit(`class:${workspaceId}:${classId}`, {
      type: 'message',
      classId,
      workspaceId,
      data: message,
      timestamp
    });

    // 3. Emit notification event
    this.emit('notification', {
      type: 'notification',
      classId,
      workspaceId,
      data: notification,
      timestamp
    });

    this.emit(`notification:${workspaceId}:${classId}`, {
      type: 'notification',
      classId,
      workspaceId,
      data: notification,
      timestamp
    });

    return { message, notification };
  }

  /**
   * Subscribes a listener to messages and notifications for a specific authorized class & workspace.
   */
  subscribeToClass(
    classId: string,
    workspaceId: string,
    handler: (event: RealtimeMessageEvent) => void
  ): () => void {
    const channelName = `class:${workspaceId}:${classId}`;
    const notifChannelName = `notification:${workspaceId}:${classId}`;

    const onEvent = (event: RealtimeMessageEvent) => {
      handler(event);
    };

    this.on(channelName, onEvent);
    this.on(notifChannelName, onEvent);

    return () => {
      this.off(channelName, onEvent);
      this.off(notifChannelName, onEvent);
    };
  }
}

export const messageEventBus = new MessageEventBus();
