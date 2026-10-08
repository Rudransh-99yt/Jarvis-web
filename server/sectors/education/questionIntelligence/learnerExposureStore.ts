import type {
  LearnerQuestionExposure,
  LearnerExposureSummary,
  QuestionExposureStatus,
  QuestionExposureResult
} from '../../../../src/types/questionExposure.ts';
import type { Question } from '../../../../src/types/questionIntelligence.ts';

/**
 * LearnerExposureStore
 * Provider-neutral, deterministic storage of learner question exposure history.
 *
 * Invariant: Question exposure is strictly isolated per learner (userId) and per context (contextId).
 * A question completed by Student A remains 100% available and novel to Student B.
 */
export class LearnerExposureStore {
  // Key: `${userId}::${contextId}::${questionId}`
  private exposures: Map<string, LearnerQuestionExposure> = new Map();

  private makeKey(userId: string, contextId: string, questionId: string): string {
    return `${userId}::${contextId || 'default'}::${questionId}`;
  }

  /**
   * Records that questions were shown or presented to a learner (SEEN, ATTEMPTED, etc.)
   */
  async recordExposures(params: {
    userId: string;
    contextId?: string;
    questions: Question[];
    status?: QuestionExposureStatus;
    assetId?: string;
    subject?: string;
    topic?: string;
  }): Promise<void> {
    const { userId, questions, assetId, subject, topic } = params;
    const contextId = params.contextId || 'ctx-default';
    const status = params.status || 'SEEN';
    const now = new Date().toISOString();

    for (const q of questions) {
      const key = this.makeKey(userId, contextId, q.id);
      const existing = this.exposures.get(key);

      if (existing) {
        existing.lastSeenAt = now;
        // Promote status if higher
        if (status === 'COMPLETED' && existing.status !== 'MASTERED') {
          existing.status = 'COMPLETED';
        } else if (status === 'ATTEMPTED' && existing.status === 'SEEN') {
          existing.status = 'ATTEMPTED';
        }
        if (assetId && !existing.assetId) existing.assetId = assetId;
      } else {
        const item: LearnerQuestionExposure = {
          id: `exp-${userId}-${contextId}-${q.id}`,
          userId,
          contextId,
          questionId: q.id,
          assetId: assetId || q.qualityMetadata?.generatedByEngine,
          subject: subject || q.subject,
          topic: topic || q.concept,
          concept: q.concept,
          difficulty: q.difficulty,
          status,
          firstSeenAt: now,
          lastSeenAt: now,
          attemptCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          latestResult: 'UNANSWERED'
        };
        this.exposures.set(key, item);
      }
    }
  }

  /**
   * Records student attempt and evaluation outcome on a question
   */
  async recordAttempt(params: {
    userId: string;
    contextId?: string;
    questionId: string;
    isCorrect: boolean;
    score?: number;
    concept?: string;
    subject?: string;
    topic?: string;
    assetId?: string;
  }): Promise<LearnerQuestionExposure> {
    const { userId, questionId, isCorrect, concept, subject, topic, assetId } = params;
    const contextId = params.contextId || 'ctx-default';
    const key = this.makeKey(userId, contextId, questionId);
    const now = new Date().toISOString();
    const score = params.score ?? (isCorrect ? 1.0 : 0.0);

    let item = this.exposures.get(key);
    if (!item) {
      item = {
        id: `exp-${userId}-${contextId}-${questionId}`,
        userId,
        contextId,
        questionId,
        assetId,
        subject: subject || 'Mathematics',
        topic: topic || concept || 'General',
        concept,
        status: isCorrect ? 'COMPLETED' : 'ATTEMPTED',
        firstSeenAt: now,
        lastSeenAt: now,
        attemptCount: 1,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1,
        latestResult: isCorrect ? 'CORRECT' : 'INCORRECT',
        lastScore: score,
        lastResponseTimestamp: now,
        weaknessFlag: !isCorrect
      };
    } else {
      item.lastSeenAt = now;
      item.attemptCount++;
      item.lastResponseTimestamp = now;
      item.lastScore = score;
      if (concept) item.concept = concept;
      if (topic) item.topic = topic;
      if (subject) item.subject = subject;
      if (assetId && !item.assetId) item.assetId = assetId;

      if (isCorrect) {
        item.correctCount++;
        item.latestResult = 'CORRECT';
        // If answered correctly multiple times or perfect score, promote to MASTERED
        if (item.correctCount >= 2 || score >= 0.95) {
          item.status = 'MASTERED';
        } else {
          item.status = 'COMPLETED';
        }
        item.weaknessFlag = false;
      } else {
        item.incorrectCount++;
        item.latestResult = 'INCORRECT';
        item.status = 'ATTEMPTED';
        item.weaknessFlag = true;
      }
    }


    this.exposures.set(key, item);
    return item;
  }

  /**
   * Records that a question was explicitly skipped by the learner
   */
  async recordSkip(params: {
    userId: string;
    contextId?: string;
    questionId: string;
    concept?: string;
    subject?: string;
    topic?: string;
    assetId?: string;
  }): Promise<LearnerQuestionExposure> {
    const { userId, questionId, concept, subject, topic, assetId } = params;
    const contextId = params.contextId || 'ctx-default';
    const key = this.makeKey(userId, contextId, questionId);
    const now = new Date().toISOString();

    let item = this.exposures.get(key);
    if (!item) {
      item = {
        id: `exp-${userId}-${contextId}-${questionId}`,
        userId,
        contextId,
        questionId,
        assetId,
        subject: subject || 'Mathematics',
        topic: topic || concept || 'General',
        concept,
        status: 'ATTEMPTED',
        firstSeenAt: now,
        lastSeenAt: now,
        attemptCount: 1,
        correctCount: 0,
        incorrectCount: 0,
        latestResult: 'SKIPPED',
        lastResponseTimestamp: now
      };
    } else {
      item.lastSeenAt = now;
      item.attemptCount++;
      item.latestResult = 'SKIPPED';
      item.lastResponseTimestamp = now;
    }

    this.exposures.set(key, item);
    return item;
  }


  /**
   * Retrieves all exposures for a user, optionally filtered by context and topic
   */
  async getExposures(
    userId: string,
    contextId?: string,
    options?: { topic?: string; subject?: string }
  ): Promise<LearnerQuestionExposure[]> {
    const results: LearnerQuestionExposure[] = [];
    for (const exp of this.exposures.values()) {
      if (exp.userId !== userId) continue;
      if (contextId && exp.contextId !== contextId) continue;
      if (options?.topic && exp.topic.toLowerCase() !== options.topic.toLowerCase() && exp.concept?.toLowerCase() !== options.topic.toLowerCase()) {
        continue;
      }
      if (options?.subject && exp.subject.toLowerCase() !== options.subject.toLowerCase()) {
        continue;
      }
      results.push({ ...exp });
    }
    return results;
  }

  /**
   * Returns set of question IDs that the learner has seen
   */
  async getSeenQuestionIds(
    userId: string,
    contextId?: string,
    options?: { topic?: string; subject?: string }
  ): Promise<Set<string>> {
    const list = await this.getExposures(userId, contextId, options);
    return new Set(list.map((e) => e.questionId));
  }

  /**
   * Returns set of question IDs that the learner has completed or mastered
   */
  async getCompletedQuestionIds(userId: string, contextId?: string): Promise<Set<string>> {
    const list = await this.getExposures(userId, contextId);
    return new Set(list.filter((e) => e.status === 'COMPLETED' || e.status === 'MASTERED').map((e) => e.questionId));
  }

  /**
   * Returns set of question IDs that the learner answered incorrectly
   */
  async getIncorrectQuestionIds(userId: string, contextId?: string): Promise<Set<string>> {
    const list = await this.getExposures(userId, contextId);
    return new Set(list.filter((e) => e.latestResult === 'INCORRECT' || e.weaknessFlag === true).map((e) => e.questionId));
  }

  /**
   * Returns list of concepts where the learner has shown weakness
   */
  async getWeaknessConcepts(userId: string, contextId?: string): Promise<string[]> {
    const list = await this.getExposures(userId, contextId);
    const conceptMistakes: Record<string, number> = {};

    for (const exp of list) {
      if (exp.concept && (exp.weaknessFlag || exp.latestResult === 'INCORRECT')) {
        conceptMistakes[exp.concept] = (conceptMistakes[exp.concept] || 0) + 1;
      }
    }

    return Object.entries(conceptMistakes)
      .sort((a, b) => b[1] - a[1])
      .map(([concept]) => concept);
  }

  /**
   * Aggregates summary statistics of learner exposure
   */
  async getSummary(userId: string, contextId?: string, topic?: string): Promise<LearnerExposureSummary> {
    const list = await this.getExposures(userId, contextId, { topic });

    const seenIds: string[] = [];
    const completedIds: string[] = [];
    const incorrectIds: string[] = [];
    const masteredIds: string[] = [];
    const weaknessConcepts = new Set<string>();

    for (const exp of list) {
      seenIds.push(exp.questionId);
      if (exp.status === 'ATTEMPTED' || exp.status === 'COMPLETED' || exp.status === 'MASTERED') {
        // attempted
      }
      if (exp.status === 'COMPLETED' || exp.status === 'MASTERED') {
        completedIds.push(exp.questionId);
      }
      if (exp.status === 'MASTERED') {
        masteredIds.push(exp.questionId);
      }
      if (exp.latestResult === 'INCORRECT' || exp.weaknessFlag) {
        incorrectIds.push(exp.questionId);
        if (exp.concept) weaknessConcepts.add(exp.concept);
      }
    }

    return {
      userId,
      contextId,
      topic,
      totalSeen: seenIds.length,
      totalAttempted: list.filter((e) => e.attemptCount > 0).length,
      totalCompleted: completedIds.length,
      totalMastered: masteredIds.length,
      seenQuestionIds: seenIds,
      completedQuestionIds: completedIds,
      incorrectQuestionIds: incorrectIds,
      masteredQuestionIds: masteredIds,
      weaknessConcepts: Array.from(weaknessConcepts)
    };
  }

  /**
   * Clears in-memory exposures (useful for test isolations)
   */
  clear(userId?: string): void {
    if (!userId) {
      this.exposures.clear();
      return;
    }
    for (const [key, exp] of this.exposures.entries()) {
      if (exp.userId === userId) {
        this.exposures.delete(key);
      }
    }
  }
}

export const learnerExposureStore = new LearnerExposureStore();
