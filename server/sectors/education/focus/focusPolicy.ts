// Focus Policy Engine for Mode-based Restrictions, Navigation Guard & Security
import type { FocusMode, FocusPolicy, FocusSession, FocusTarget } from '../../../../src/types/focus.ts';

export class FocusPolicyEngine {
  /**
   * Generates strict, explicit policy rules for each FocusMode
   */
  static buildDefaultPolicy(mode: FocusMode, target: FocusTarget): FocusPolicy {
    switch (mode) {
      case 'POMODORO':
        return {
          mode: 'POMODORO',
          allowedRoutes: ['*'],
          blockedRoutes: [],
          allowCommunity: true,
          notificationPolicy: 'all',
          exitPolicy: 'normal'
        };

      case 'DEEP_FOCUS':
        return {
          mode: 'DEEP_FOCUS',
          allowedRoutes: [
            'focus',
            'workspace',
            'lesson_workspace',
            'chapter_detail',
            'subject_detail',
            'videos',
            'knowledge'
          ],
          blockedRoutes: ['principal', 'classes'],
          allowedCourseIds: target.courseId ? [target.courseId] : undefined,
          allowCommunity: false,
          notificationPolicy: 'essential_only',
          exitPolicy: 'deep'
        };

      case 'STUDY_LOCK':
        return {
          mode: 'STUDY_LOCK',
          allowedRoutes: [
            'focus',
            'workspace',
            'lesson_workspace',
            'chapter_detail',
            'subject_detail',
            'videos',
            'assignments',
            'knowledge'
          ],
          blockedRoutes: ['community', 'classes', 'principal', 'study'],
          allowedCourseIds: target.courseId ? [target.courseId] : undefined,
          allowedWorkspacePageIds: target.workspacePageId ? [target.workspacePageId] : undefined,
          allowCommunity: false,
          notificationPolicy: 'suppress_all',
          exitPolicy: 'study_lock',
          exitCountdownSeconds: 5
        };

      case 'EXAM_LOCK':
        return {
          mode: 'EXAM_LOCK',
          allowedRoutes: ['focus', 'assignments', 'lesson_workspace'],
          blockedRoutes: [
            'community',
            'workspace',
            'classes',
            'videos',
            'knowledge',
            'study',
            'principal',
            'subject_detail'
          ],
          allowedCourseIds: target.courseId ? [target.courseId] : undefined,
          allowCommunity: false,
          notificationPolicy: 'suppress_all',
          exitPolicy: 'exam_lock',
          exitCountdownSeconds: 10
        };

      case 'CUSTOM_FOCUS':
        return {
          mode: 'CUSTOM_FOCUS',
          allowedRoutes: [
            'focus',
            'workspace',
            'lesson_workspace',
            'chapter_detail',
            'subject_detail',
            'videos'
          ],
          blockedRoutes: ['community', 'principal'],
          allowedCourseIds: target.courseId ? [target.courseId] : undefined,
          allowCommunity: false,
          notificationPolicy: 'essential_only',
          exitPolicy: 'deep'
        };

      case 'BREAK':
        return {
          mode: 'BREAK',
          allowedRoutes: ['*'],
          blockedRoutes: [],
          allowCommunity: true,
          notificationPolicy: 'all',
          exitPolicy: 'normal'
        };

      default:
        return {
          mode: 'POMODORO',
          allowedRoutes: ['*'],
          blockedRoutes: [],
          allowCommunity: true,
          notificationPolicy: 'all',
          exitPolicy: 'normal'
        };
    }
  }

  /**
   * Real application-level navigation evaluation
   */
  static evaluateNavigation(
    session: FocusSession | null,
    targetRoute: string,
    targetCourseId?: string,
    targetWorkspacePageId?: string
  ): { allowed: boolean; reason?: string; returnRoute: string } {
    if (!session || session.status !== 'ACTIVE' && session.status !== 'LOCKED') {
      return { allowed: true, returnRoute: 'focus' };
    }

    const policy = session.policy;

    // Route whitelist/blacklist check
    if (policy.blockedRoutes.includes(targetRoute)) {
      return {
        allowed: false,
        reason: `${targetRoute.toUpperCase()} is restricted during ${session.mode.replace('_', ' ')} for ${session.target.title}.`,
        returnRoute: 'focus'
      };
    }

    if (!policy.allowedRoutes.includes('*') && !policy.allowedRoutes.includes(targetRoute)) {
      return {
        allowed: false,
        reason: `Navigation to ${targetRoute} is not allowed during ${session.mode.replace('_', ' ')}.`,
        returnRoute: 'focus'
      };
    }

    // Course boundary check in Study Lock / Exam Lock
    if (
      (session.mode === 'STUDY_LOCK' || session.mode === 'EXAM_LOCK') &&
      policy.allowedCourseIds &&
      policy.allowedCourseIds.length > 0 &&
      targetCourseId &&
      !policy.allowedCourseIds.includes(targetCourseId)
    ) {
      return {
        allowed: false,
        reason: `This course is not part of your active study lock (${session.target.title}).`,
        returnRoute: 'focus'
      };
    }

    // Workspace page boundary check
    if (
      session.mode === 'EXAM_LOCK' &&
      targetRoute === 'workspace'
    ) {
      return {
        allowed: false,
        reason: `Workspace notes are disabled during EXAM LOCK to preserve academic integrity.`,
        returnRoute: 'focus'
      };
    }

    return { allowed: true, returnRoute: 'focus' };
  }

  /**
   * RAG Knowledge Base filtering during focus sessions
   */
  static filterRagSources(session: FocusSession | null, sources: any[]): any[] {
    if (!session || (session.mode !== 'STUDY_LOCK' && session.mode !== 'EXAM_LOCK')) {
      return sources;
    }

    if (!session.target.courseId && !session.target.chapterId) {
      return sources;
    }

    return sources.filter((s) => {
      const matchCourse = Boolean(
        session.target.courseId &&
          (s.courseId === session.target.courseId || s.metadata?.courseId === session.target.courseId)
      );
      const matchChapter = Boolean(
        session.target.chapterId &&
          (s.chapterId === session.target.chapterId || s.metadata?.chapterId === session.target.chapterId)
      );
      return matchCourse || matchChapter;
    });
  }
}
