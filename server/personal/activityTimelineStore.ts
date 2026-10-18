import { jarvisData, type IJarvisDataRepository } from '../data/index.ts';
import type { ActionActivityItem } from '../../src/types/actionExperience.ts';
import { personalNotesStore } from './tools/personalNotesStore.ts';

/**
 * ActivityTimelineStore
 * Lightweight, deterministic activity and history tracker for Jarvis actions.
 * Enforces strict per-user and per-context boundary isolation.
 * Backed by the core repository via IActivityTimelineRepository.
 * Supports safe rollback (undo) strictly for reversible actions.
 */
export class ActivityTimelineStore {
  private customRepo?: IJarvisDataRepository;

  constructor(repo?: IJarvisDataRepository) {
    this.customRepo = repo;
  }

  private get repo(): IJarvisDataRepository {
    return this.customRepo || jarvisData;
  }

  private async ensureSeedTimeline(userId: string): Promise<void> {
    if (userId === 'student-1') {
      const existing = await this.repo.activityTimeline.getActivity('student-1');
      if (existing.length === 0) {
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
            canUndo: false
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

        for (const item of student1Events) {
          await this.repo.activityTimeline.recordActivity(item);
        }
      }
    }
  }

  /**
   * Retrieves activity history for a specific user, with optional context isolation.
   */
  async getActivity(
    userId: string,
    options?: { contextId?: string; contextType?: string; limit?: number }
  ): Promise<ActionActivityItem[]> {
    await this.ensureSeedTimeline(userId);
    return await this.repo.activityTimeline.getActivity(userId, options);
  }

  /**
   * Records a new activity event with strict authenticated user and context attribution.
   */
  async recordActivity(
    userId: string,
    item: Omit<ActionActivityItem, 'id' | 'timestamp' | 'userId'>
  ): Promise<ActionActivityItem> {
    const fullItem = await this.repo.activityTimeline.recordActivity({
      ...item,
      userId
    });
    return JSON.parse(JSON.stringify(fullItem));
  }

  /**
   * Safely rolls back an action if and ONLY if it is safely reversible.
   * Throws security error if the activity belongs to another user.
   */
  async undoActivity(
    userId: string,
    activityId: string
  ): Promise<{ ok: boolean; message: string; error?: string }> {
    const item = await this.repo.activityTimeline.getById(activityId, userId);

    if (!item) {
      // Check if item belongs to another user for security audit
      const anyUserItem = await this.repo.activityTimeline.getById(activityId);
      if (anyUserItem && anyUserItem.userId !== userId) {
        throw new Error('SECURITY_VIOLATION: Activity item does not belong to this authenticated user.');
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

    // Execute safe rollback based on action type inside atomic unit of work
    try {
      await this.repo.runTransaction(async (txRepo) => {
        if (item.reversibleAction!.type === 'note_create') {
          const deleted = await personalNotesStore.deleteNote(userId, item.reversibleAction!.targetId);
          if (!deleted) {
            throw new Error(`Target note ${item.reversibleAction!.targetId} could not be deleted or does not exist`);
          }
        } else if (item.reversibleAction!.type === 'study_plan_create') {
          const deleted = await personalNotesStore.deleteStudyPlan(userId, item.reversibleAction!.targetId);
          if (!deleted) {
            throw new Error(`Target study plan ${item.reversibleAction!.targetId} could not be deleted or does not exist`);
          }
        } else if (item.reversibleAction!.type === 'practice_draft') {
          // Safe dismissal of practice draft
        }

        const updated = await txRepo.activityTimeline.updateActivity(activityId, { undone: true }, userId);
        if (!updated) {
          throw new Error(`Failed to update activity record ${activityId}`);
        }
      }, { name: 'undo-activity-multi-store', userId });

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
