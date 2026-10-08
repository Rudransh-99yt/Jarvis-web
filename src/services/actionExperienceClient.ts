import { authClient } from './authClient.ts';
import type {
  ActionActivityItem,
  ActionResultData,
  ActionPreviewData
} from '../types/actionExperience.ts';
import type { NextBestAction } from '../types/personalIdentity.ts';

/**
 * ActionExperienceClient
 * Client SDK interacting with Jarvis Action Experience, Activity Timeline,
 * Confirmation Policy, and Deterministic Next Best Action recommendations.
 */
export class ActionExperienceClient {
  private getHeaders(): Record<string, string> {
    const authHeaders = authClient.getAuthHeaders();
    return {
      'Content-Type': 'application/json',
      ...authHeaders
    };
  }

  /**
   * Fetches the user's action activity history with context isolation.
   */
  async getActivityTimeline(options?: {
    contextId?: string;
    contextType?: string;
    limit?: number;
  }): Promise<ActionActivityItem[]> {
    const params = new URLSearchParams();
    if (options?.contextId) params.set('contextId', options.contextId);
    if (options?.contextType) params.set('contextType', options.contextType);
    if (options?.limit) params.set('limit', String(options.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/personal/activity-timeline${qs}`, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch activity timeline (${res.status})`);
    }

    const data = await res.json();
    return data.items || [];
  }

  /**
   * Records a user action in the activity timeline.
   */
  async recordActivity(
    item: Partial<ActionActivityItem>
  ): Promise<ActionActivityItem> {
    const res = await fetch('/api/personal/activity-timeline', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(item)
    });

    if (!res.ok) {
      throw new Error(`Failed to record activity (${res.status})`);
    }

    const data = await res.json();
    return data.item;
  }

  /**
   * Reverses a reversible action if safe.
   */
  async undoActivity(
    activityId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/personal/activity-timeline/${activityId}/undo`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to undo activity');
    }

    return {
      success: true,
      message: data.message
    };
  }

  /**
   * Confirms a pending action requiring confirmation.
   * Server remains the strict authority.
   */
  async confirmPendingAction(pendingActionId: string): Promise<any> {
    const res = await fetch('/api/personal/tools/confirm', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ pendingActionId })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to confirm pending action');
    }

    return data;
  }

  /**
   * Cancels a pending action requiring confirmation.
   */
  async cancelPendingAction(pendingActionId: string): Promise<boolean> {
    const res = await fetch('/api/personal/tools/cancel', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ pendingActionId })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to cancel pending action');
    }

    return true;
  }

  /**
   * Deterministically connects completed actions to Next Best Actions.
   * Invariant: Never invokes Gemini just to compute next best action.
   */
  computeDeterministicNextBestAction(
    actionType: string,
    result: Partial<ActionResultData>
  ): NextBestAction {
    switch (actionType) {
      case 'practice_set_create':
      case 'practice_set':
        return {
          id: 'nba-start-practice',
          title: 'Start Practice',
          type: 'lesson_practice',
          estimatedMinutes: 15,
          priority: 'high',
          targetContext: 'Mathematics',
          rationale: `Launch interactive drill on your ${result.totalCount || 20}-question practice set.`,
          actionTarget: {
            concept: result.assetTitle || 'Quadratic Equations'
          }
        };

      case 'practice_completed':
        return {
          id: 'nba-review-weak',
          title: 'Review weak concepts',
          type: 'review_prerequisite',
          estimatedMinutes: 10,
          priority: 'high',
          targetContext: 'Mathematics',
          rationale: 'Review mistakes and foundational theorems identified in practice.',
          actionTarget: {}
        };

      case 'pdf_generated':
      case 'pdf_download':
        return {
          id: 'nba-open-pdf',
          title: 'Open PDF',
          type: 'quiz_prep',
          estimatedMinutes: 5,
          priority: 'medium',
          targetContext: 'Mathematics',
          rationale: 'Review or print the generated verified study sheet.',
          actionTarget: {}
        };

      case 'gap_discovered':
        return {
          id: 'nba-study-prereq',
          title: 'Study prerequisite',
          type: 'review_prerequisite',
          estimatedMinutes: 15,
          priority: 'high',
          targetContext: 'Physics',
          rationale: 'Prerequisite diagnostic revealed gap; reinforce foundation.',
          actionTarget: {}
        };

      case 'note_created':
        return {
          id: 'nba-note-review',
          title: 'Review note & create flashcards',
          type: 'concept_reinforce',
          estimatedMinutes: 8,
          priority: 'medium',
          targetContext: 'Study',
          rationale: 'Consolidate note into active recall cards.',
          actionTarget: {}
        };

      default:
        return {
          id: 'nba-default',
          title: 'Continue Learning Track',
          type: 'lesson_practice',
          estimatedMinutes: 15,
          priority: 'medium',
          targetContext: 'General',
          rationale: 'Continue regular curriculum study routine.',
          actionTarget: {}
        };
    }
  }

  /**
   * Request a novelty-aware practice set honoring learner exposure
   */
  async requestNovelPracticeSet(spec: {
    subject: string;
    topic: string;
    educationLevel?: string;
    difficulty?: string;
    questionCount?: number;
    contextId?: string;
    noveltyMode?: string;
    conceptMasteries?: Record<string, number>;
    weaknessConcepts?: string[];
    generatePdf?: boolean;
    sharedWithInstitution?: boolean;
  }): Promise<any> {
    const res = await fetch('/api/education/question-intelligence/novel-practice-set', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(spec)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate novelty-aware practice set');
    }

    return res.json();
  }

  /**
   * Retrieve exposure summary for authenticated learner
   */
  async getExposureSummary(topic?: string, contextId?: string): Promise<any> {
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    if (contextId) params.set('contextId', contextId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/education/question-intelligence/exposure-summary${qs}`, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      throw new Error('Failed to retrieve exposure summary');
    }

    const data = await res.json();
    return data.summary;
  }

  /**
   * Builds an Action Preview specifically calibrated for question sets with exposure & novelty awareness
   */
  buildNoveltyActionPreview(params: {
    topic: string;
    targetCount: number;
    noveltyMode: string;
    assetTitle?: string;
    assetId?: string;
    unseenAvailable?: number;
    previouslySeen?: number;
    reviewCount?: number;
    novelCount?: number;
    reusedCount?: number;
    generatedCount?: number;
    adaptedCount?: number;
  }): ActionPreviewData {
    const {
      topic,
      targetCount,
      noveltyMode,
      assetTitle,
      assetId,
      unseenAvailable,
      previouslySeen,
      reviewCount = 0,
      novelCount = targetCount,
      reusedCount = 0,
      generatedCount = 0,
      adaptedCount = 0
    } = params;

    let planSummary = '';
    if (noveltyMode === 'REVIEW' && reviewCount > 0) {
      planSummary = `Reviewing ${reviewCount} previously missed questions${novelCount > 0 ? `, practicing ${novelCount} new questions` : ''}`;
    } else if (adaptedCount > 0 || (reusedCount > 0 && generatedCount > 0)) {
      planSummary = `Reusing ${reusedCount} unseen verified questions, adapting ${generatedCount || adaptedCount} questions${previouslySeen ? ` (${previouslySeen} seen previously)` : ''}`;
    } else if (reusedCount > 0) {
      planSummary = `Reusing ${reusedCount} unseen verified questions${unseenAvailable ? ` (out of ${unseenAvailable} available)` : ''}`;
    } else {
      planSummary = `Generating ${targetCount} new practice questions${previouslySeen ? ` (${previouslySeen} questions previously completed)` : ''}`;
    }

    return {
      id: `prev-novel-${Date.now().toString(36)}`,
      actionType: 'practice_set_create',
      title: `Create ${targetCount} practice questions`,
      rationale: `Targeted practice on ${topic} configured with ${noveltyMode} mode.`,
      source: {
        type: reusedCount > 0 ? 'EXISTING_VERIFIED' : adaptedCount > 0 ? 'ADAPTED' : 'NEWLY_GENERATED',
        title: assetTitle ? `Existing verified ${topic} knowledge (${assetTitle})` : `Curriculum Knowledge Bank (${topic})`,
        assetId,
        verified: true
      },
      plan: {
        totalItems: targetCount,
        reusedItems: reusedCount,
        adaptedItems: adaptedCount,
        generatedItems: generatedCount,
        unseenAvailable,
        previouslySeen,
        reviewItems: reviewCount,
        novelItems: novelCount,
        noveltyMode,
        summary: planSummary
      },
      riskLevel: 'LOW_RISK_WRITE',
      requiresConfirmation: false,
      payload: { topic, targetCount, noveltyMode }
    };
  }
}

export const actionExperienceClient = new ActionExperienceClient();

