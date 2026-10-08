import type { ActionActivityItem } from '../../src/types/actionExperience.ts';
import { personalNotesStore } from './tools/personalNotesStore.ts';

/**
 * ActivityTimelineStore
 * Lightweight, deterministic activity and history tracker for Jarvis actions.
 * Enforces strict per-user and per-context boundary isolation.
 * Supports safe rollback (undo) strictly for reversible actions.
 */
export class ActivityTimelineStore {
  private activities: Map<string, ActionActivityItem[]> = new Map();

  constructor() {
    this.seedDefaultTimeline();
  }

  private seedDefaultTimeline(): void {
    const now = Date.now();
    const oneHourAgo = new Date(now - 3600 * 1000).toISOString();
    const twoHoursAgo = new Date(now - 7200 * 1000).toISOString();
    const yesterday = new Date(now - 86400 * 1000).toISOString();

    const student1Events: ActionActivityItem[] = [
      {
        id: 'act-hist-1',
        userId: 'student-1',
        contextId: 'ctx-student1-edu',
        contextType: 'EDUCATION',
        title: 'Downloaded practice PDF: Class 10 Quadratic Equations',
        category: 'practice',
        timestamp: oneHourAgo,
        sourceTitle: 'Class 10 Quadratic Equations Question Bank',
        assetId: 'ka-math-quad-10',
        totalCount: 20,
        reusedCount: 20,
        generatedCount: 0,
        canUndo: false // Non-reversible external/download
      },
      {
        id: 'act-hist-2',
        userId: 'student-1',
        contextId: 'ctx-student1-edu',
        contextType: 'EDUCATION',
        title: 'Reused 20 verified questions for Quadratic Equations practice',
        category: 'practice',
        timestamp: twoHoursAgo,
        sourceTitle: 'Class 10 Quadratic Equations Question Bank',
        assetId: 'ka-math-quad-10',
        totalCount: 20,
        reusedCount: 20,
        generatedCount: 0,
        canUndo: true,
        undone: false,
        reversibleAction: {
          type: 'practice_draft',
          targetId: 'ka-math-quad-10'
        }
      },
      {
        id: 'act-hist-3',
        userId: 'student-1',
        contextId: 'ctx-student1-edu',
        contextType: 'EDUCATION',
        title: 'Created Quadratic Equations practice set',
        category: 'practice',
        timestamp: twoHoursAgo,
        sourceTitle: 'Class 10 Quadratic Equations Question Bank',
        assetId: 'ka-math-quad-10',
        totalCount: 20,
        reusedCount: 15,
        generatedCount: 5,
        canUndo: true,
        undone: false,
        reversibleAction: {
          type: 'practice_draft',
          targetId: 'ka-math-quad-10'
        }
      },
      {
        id: 'act-hist-4',
        userId: 'student-1',
        contextId: 'ctx-student1-personal',
        contextType: 'PERSONAL',
        title: 'Created personal study note: Personal Study Strategy & High-Focus Routine',
        category: 'notes',
        timestamp: yesterday,
        canUndo: true,
        undone: false,
        reversibleAction: {
          type: 'note_create',
          targetId: 'note-pers-1'
        }
      }
    ];

    this.activities.set('student-1', student1Events);
  }

  /**
   * Retrieves activity history for a specific user, with optional context isolation.
   */
  async getActivity(
    userId: string,
    options?: { contextId?: string; contextType?: string; limit?: number }
  ): Promise<ActionActivityItem[]> {
    const userEvents = this.activities.get(userId) || [];
    let filtered = [...userEvents];

    if (options?.contextId) {
      filtered = filtered.filter((item) => item.contextId === options.contextId);
    } else if (options?.contextType) {
      filtered = filtered.filter((item) => item.contextType === options.contextType);
    }

    if (options?.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Records a new activity event with strict authenticated user and context attribution.
   */
  async recordActivity(
    userId: string,
    item: Omit<ActionActivityItem, 'id' | 'timestamp' | 'userId'>
  ): Promise<ActionActivityItem> {
    const list = this.activities.get(userId) || [];
    const id = `act-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullItem: ActionActivityItem = {
      ...item,
      id,
      userId,
      timestamp: new Date().toISOString()
    };

    list.unshift(fullItem);
    this.activities.set(userId, list);
    return fullItem;
  }

  /**
   * Safely rolls back an action if and ONLY if it is safely reversible.
   * Throws security error if the activity belongs to another user.
   */
  async undoActivity(
    userId: string,
    activityId: string
  ): Promise<{ ok: boolean; message: string; error?: string }> {
    const list = this.activities.get(userId) || [];
    const item = list.find((a) => a.id === activityId);

    if (!item) {
      // Check if item belongs to another user for security audit
      for (const [otherUserId, otherList] of this.activities.entries()) {
        if (otherUserId !== userId && otherList.some((a) => a.id === activityId)) {
          throw new Error('SECURITY_VIOLATION: Activity item does not belong to this authenticated user.');
        }
      }
      return { ok: false, error: 'NOT_FOUND', message: 'Activity record not found.' };
    }

    if (!item.canUndo || !item.reversibleAction) {
      return {
        ok: false,
        error: 'IRREVERSIBLE_ACTION',
        message: 'This action cannot be safely undone because it has external effects or cannot be safely rolled back.'
      };
    }

    if (item.undone) {
      return {
        ok: false,
        error: 'ALREADY_UNDONE',
        message: 'This action has already been undone.'
      };
    }

    // Execute safe rollback based on action type
    try {
      if (item.reversibleAction.type === 'note_create') {
        await personalNotesStore.deleteNote(userId, item.reversibleAction.targetId);
      } else if (item.reversibleAction.type === 'study_plan_create') {
        await personalNotesStore.deleteStudyPlan(userId, item.reversibleAction.targetId);
      } else if (item.reversibleAction.type === 'practice_draft') {
        // Safe dismissal of practice draft
      }

      item.undone = true;
      return { ok: true, message: `Successfully undone: ${item.title}` };
    } catch (err: any) {
      return {
        ok: false,
        error: 'ROLLBACK_FAILED',
        message: `Failed to rollback action: ${err?.message || 'Unknown error'}`
      };
    }
  }
}

export const activityTimelineStore = new ActivityTimelineStore();
