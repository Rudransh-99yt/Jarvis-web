// Milestone 11: Teacher ↔ Student Class Messaging Orchestrator
import { jarvisData } from '../../data/index.ts';
import { fileAuth } from '../../storage/fileAuth.ts';
import { messageEventBus } from './messageEventBus.ts';
import type { User, Message, WorkspaceMembership } from '../../data/types.ts';
import type { EducationClass, MessagingNotification } from '../../../src/types/education.ts';
import type { FileRecord } from '../../../src/types/storage.ts';

export interface SendMessagePayload {
  classId: string;
  workspaceId: string;
  body: string;
  threadId?: string;
  attachmentFileIds?: string[];
}

export class MessagingService {
  /**
   * Verifies that the user has explicit authorized membership to access this course and workspace.
   */
  async verifyClassAccess(
    currentUser: User,
    classId: string,
    workspaceId: string
  ): Promise<{ allowed: boolean; reason?: string; cls?: EducationClass }> {
    // 1. Workspace Membership Check
    const memberships = await jarvisData.workspaces.getMembers(workspaceId);
    const isMember = memberships.some((m: WorkspaceMembership) => m.userId === currentUser.id);
    if (!isMember && currentUser.role !== 'commander' && currentUser.role !== 'admin') {
      return { allowed: false, reason: `User '${currentUser.id}' is not a member of workspace '${workspaceId}'.` };
    }


    // 2. Class Verification
    const cls = await jarvisData.education.getClassById(classId);
    if (!cls) {
      return { allowed: false, reason: `Class '${classId}' does not exist.` };
    }

    // 3. Role-Based Class Authorization Check
    if (currentUser.role === 'commander' || currentUser.role === 'admin') {
      return { allowed: true, cls };
    }

    if (currentUser.role === 'teacher') {
      // Teachers can access classes they instruct
      if (cls.instructorId === currentUser.id || (cls as any).teacherId === currentUser.id) {
        return { allowed: true, cls };
      }
      return { allowed: false, reason: `Teacher '${currentUser.id}' is not assigned to course '${cls.code}'.` };
    }

    if (currentUser.role === 'student') {
      // Students MUST be officially enrolled in class.studentIds
      if (cls.studentIds && cls.studentIds.includes(currentUser.id)) {
        return { allowed: true, cls };
      }
      return { allowed: false, reason: `Access denied: Student '${currentUser.id}' is not enrolled in class '${cls.code}'.` };
    }

    return { allowed: false, reason: `Role '${currentUser.role}' is not authorized for class messaging.` };
  }

  /**
   * Sends a class message with strict validation, attachment verification, persistence, and real-time dispatch.
   */
  async sendMessage(
    payload: SendMessagePayload,
    currentUser: User
  ): Promise<{ message: Message; notification: MessagingNotification }> {
    const { classId, workspaceId, body, threadId, attachmentFileIds = [] } = payload;

    // 1. Authorization Verification
    const authCheck = await this.verifyClassAccess(currentUser, classId, workspaceId);
    if (!authCheck.allowed || !authCheck.cls) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Class access denied'}`);
    }

    // 2. Content validation (message body or attachments required)
    const cleanBody = (body || '').trim();
    if (!cleanBody && (!attachmentFileIds || attachmentFileIds.length === 0)) {
      throw new Error('Message body or valid file attachment is required.');
    }

    // 3. Attachment Verification (Milestone 10 Integration & Tenant Isolation)
    const validatedAttachments: FileRecord[] = [];
    if (attachmentFileIds && attachmentFileIds.length > 0) {
      for (const fId of attachmentFileIds) {
        const fileRecord = await jarvisData.files.getById(fId);
        if (!fileRecord) {
          throw new Error(`Attachment file '${fId}' does not exist in storage.`);
        }

        // Strict Workspace Boundary Check
        if (fileRecord.workspaceId !== workspaceId) {
          throw new Error(
            `Cross-workspace attachment rejected: File '${fileRecord.originalName}' belongs to workspace '${fileRecord.workspaceId}', not active workspace '${workspaceId}'.`
          );
        }

        // Access check for the attaching user
        const fileAccess = await fileAuth.canAccessFile(currentUser, fileRecord);
        if (!fileAccess.allowed) {
          throw new Error(`Unauthorized attachment: Cannot access file '${fileRecord.originalName}' (${fileAccess.reason}).`);
        }

        validatedAttachments.push(fileRecord);
      }
    }

    // 4. Persistence into Core Repository
    const createdMessage = await jarvisData.conversations.createMessage({
      workspaceId,
      classId,
      conversationId: threadId,
      senderUserId: currentUser.id,
      senderName: currentUser.displayName,
      senderRole: currentUser.role === 'teacher' ? 'teacher' : 'student',
      body: cleanBody || (validatedAttachments.length > 0 ? `Shared ${validatedAttachments.length} file attachment(s)` : ''),
      attachmentFileIds: validatedAttachments.map((f) => f.id),
      readBy: [currentUser.id]
    });

    // Populate attachments on return
    createdMessage.attachments = validatedAttachments;

    // 5. Real-Time Broadcast & Notification Generation
    const { notification } = messageEventBus.publishMessage(createdMessage, authCheck.cls.code);

    return {
      message: createdMessage,
      notification
    };
  }

  /**
   * Retrieves chronological messages for an authorized class or discussion thread.
   */
  async listMessages(
    classId: string,
    workspaceId: string,
    currentUser: User,
    options: { threadId?: string; limit?: number } = {}
  ): Promise<Message[]> {
    const authCheck = await this.verifyClassAccess(currentUser, classId, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Class access denied'}`);
    }

    return jarvisData.conversations.listMessages({
      classId,
      workspaceId,
      conversationId: options.threadId,
      limit: options.limit || 100
    });
  }

  /**
   * Retrieves a single message with authorization check.
   */
  async getMessageById(messageId: string, currentUser: User, workspaceId?: string): Promise<Message> {
    const msg = await jarvisData.conversations.getMessageById(messageId, workspaceId);
    if (!msg) {
      throw new Error(`Message '${messageId}' not found.`);
    }

    if (msg.classId && msg.workspaceId) {
      const authCheck = await this.verifyClassAccess(currentUser, msg.classId, msg.workspaceId);
      if (!authCheck.allowed) {
        throw new Error(`Unauthorized: ${authCheck.reason || 'Message access denied'}`);
      }
    }

    return msg;
  }

  /**
   * Marks a message as read by current user.
   */
  async markRead(messageId: string, currentUser: User, workspaceId?: string): Promise<Message> {
    const msg = await this.getMessageById(messageId, currentUser, workspaceId);
    const updated = await jarvisData.conversations.markMessageRead(msg.id, currentUser.id);
    return updated || msg;
  }

  /**
   * Lists discussion threads for a class.
   */
  async listThreads(classId: string, workspaceId: string, currentUser: User) {
    const authCheck = await this.verifyClassAccess(currentUser, classId, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Class access denied'}`);
    }

    let threads = await jarvisData.conversations.listThreads(classId, workspaceId);
    if (threads.length === 0) {
      // Ensure default main class channel exists
      const mainThread = await jarvisData.conversations.getOrCreateClassThread(
        classId,
        workspaceId,
        authCheck.cls?.studentIds ? [authCheck.cls.instructorId, ...authCheck.cls.studentIds] : [currentUser.id],
        `${authCheck.cls?.code || classId} General Discussion`
      );
      threads = [mainThread];
    }
    return threads;
  }
}

export const messagingService = new MessagingService();
