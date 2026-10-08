import type {
  Question,
  QuestionDifficulty
} from '../../../../src/types/questionIntelligence.ts';
import type {
  NoveltySelectionOptions,
  NoveltySelectionResult,
  QuestionNoveltyMode
} from '../../../../src/types/questionExposure.ts';
import { learnerExposureStore } from './learnerExposureStore.ts';

/**
 * NovelQuestionSelector
 * Deterministic, mastery-aware question selection engine.
 *
 * Core Invariant: "Reuse knowledge, not the same questions."
 * Ensures an individual learner never receives previously seen/completed questions
 * when requesting NEW or MORE practice, while allowing different learners to benefit
 * from the same verified question bank.
 */
export class NovelQuestionSelector {
  /**
   * Selects questions from candidate pool honoring learner exposure and novelty mode
   */
  async selectQuestions(
    candidates: Question[],
    userId: string,
    contextId: string = 'ctx-default',
    options: NoveltySelectionOptions = {}
  ): Promise<NoveltySelectionResult> {
    const noveltyMode = options.noveltyMode || 'NEW';
    const targetCount = options.targetCount || 10;
    const excludeIds = new Set<string>(options.excludeQuestionIds || []);

    // 1. Retrieve learner-specific exposure boundaries
    const seenSet = await learnerExposureStore.getSeenQuestionIds(userId, contextId);
    const completedSet = await learnerExposureStore.getCompletedQuestionIds(userId, contextId);
    const incorrectSet = await learnerExposureStore.getIncorrectQuestionIds(userId, contextId);
    const weaknessConcepts = options.weaknessConcepts || (await learnerExposureStore.getWeaknessConcepts(userId, contextId));
    const conceptMasteries = options.conceptMasteries || {};

    const previouslySeenCount = candidates.filter((q) => seenSet.has(q.id)).length;

    let selectedQuestions: Question[] = [];
    let reviewCount = 0;
    let novelCount = 0;
    let rationale = '';

    // ------------------------------------------------------------------------
    // MODE 1 & 2: NEW / MORE — Strictly exclude previously seen questions
    // ------------------------------------------------------------------------
    if (noveltyMode === 'NEW' || noveltyMode === 'MORE') {
      // Filter out all questions seen or completed by THIS learner
      const unseenCandidates = candidates.filter(
        (q) => !seenSet.has(q.id) && !completedSet.has(q.id) && !excludeIds.has(q.id)
      );

      // Mastery-aware ranking: prioritize concepts where learner has lower mastery or weaknesses
      const ranked = this.rankCandidatesByMastery(unseenCandidates, weaknessConcepts, conceptMasteries);

      selectedQuestions = ranked.slice(0, targetCount);
      novelCount = selectedQuestions.length;
      reviewCount = 0;

      rationale =
        noveltyMode === 'MORE'
          ? `[More Unseen Questions] Filtered ${previouslySeenCount} previously seen items. Selected ${selectedQuestions.length} novel questions from verified asset.`
          : `[New Questions] Excluded ${previouslySeenCount} already seen items. Provided ${selectedQuestions.length} fresh verified questions.`;
    }

    // ------------------------------------------------------------------------
    // MODE 3: REVIEW — Intentionally target previously seen questions
    // ------------------------------------------------------------------------
    else if (noveltyMode === 'REVIEW') {
      // Find candidate questions that the learner HAS previously seen
      const seenCandidates = candidates.filter((q) => seenSet.has(q.id) && !excludeIds.has(q.id));

      // Prioritize questions answered incorrectly, then older attempts
      const prioritized = [...seenCandidates].sort((a, b) => {
        const aIncorrect = incorrectSet.has(a.id);
        const bIncorrect = incorrectSet.has(b.id);
        if (aIncorrect && !bIncorrect) return -1;
        if (!aIncorrect && bIncorrect) return 1;
        return 0;
      });

      selectedQuestions = prioritized.slice(0, targetCount);
      reviewCount = selectedQuestions.length;

      // If learner has not seen enough questions for requested count, complement with unseen
      if (selectedQuestions.length < targetCount) {
        const remainingNeeded = targetCount - selectedQuestions.length;
        const currentSelectedIds = new Set(selectedQuestions.map((q) => q.id));
        const unseenComplements = candidates.filter(
          (q) => !seenSet.has(q.id) && !excludeIds.has(q.id) && !currentSelectedIds.has(q.id)
        );
        const complements = unseenComplements.slice(0, remainingNeeded);
        selectedQuestions.push(...complements);
        novelCount = complements.length;
      }

      rationale = `[Spaced Review] Re-evaluating ${reviewCount} previously encountered questions (prioritizing past mistakes)${
        novelCount > 0 ? ` with ${novelCount} complementary questions` : ''
      }.`;
    }

    // ------------------------------------------------------------------------
    // MODE 4: WEAKNESS_PRACTICE — Prioritize weak concepts
    // ------------------------------------------------------------------------
    else if (noveltyMode === 'WEAKNESS_PRACTICE') {
      // First: find UNSEEN questions covering known weakness concepts
      const unseenCandidates = candidates.filter(
        (q) => !seenSet.has(q.id) && !completedSet.has(q.id) && !excludeIds.has(q.id)
      );

      const weakUnseen = unseenCandidates.filter((q) =>
        weaknessConcepts.some(
          (w) =>
            q.concept.toLowerCase().includes(w.toLowerCase()) ||
            q.prerequisiteConcepts.some((p) => p.toLowerCase().includes(w.toLowerCase()))
        )
      );

      const nonWeakUnseen = unseenCandidates.filter(
        (q) => !weakUnseen.includes(q)
      );

      // Take weak unseen first
      const pool = [...weakUnseen, ...nonWeakUnseen];
      selectedQuestions = pool.slice(0, targetCount);
      novelCount = selectedQuestions.length;

      // If not enough unseen items exist on weak concepts, include past mistakes for targeted redemption
      if (selectedQuestions.length < targetCount && incorrectSet.size > 0) {
        const remainingNeeded = targetCount - selectedQuestions.length;
        const currentSelectedIds = new Set(selectedQuestions.map((q) => q.id));
        const missedSeen = candidates.filter(
          (q) => incorrectSet.has(q.id) && !currentSelectedIds.has(q.id) && !excludeIds.has(q.id)
        );
        const addedMistakes = missedSeen.slice(0, remainingNeeded);
        selectedQuestions.push(...addedMistakes);
        reviewCount = addedMistakes.length;
      }

      rationale = `[Weakness Practice] Targeted practice on flagged weak areas (${weaknessConcepts.join(', ') || 'diagnostic concepts'}). ${novelCount} novel items, ${reviewCount} review items.`;
    }

    // ------------------------------------------------------------------------
    // MODE 5: MIXED — Blend unseen with spaced review
    // ------------------------------------------------------------------------
    else if (noveltyMode === 'MIXED') {
      const reviewRatio = options.includeReviewRatio ?? 0.3; // Default 30% review, 70% new
      const targetReviewCount = Math.max(1, Math.round(targetCount * reviewRatio));
      const targetNovelCount = targetCount - targetReviewCount;

      const seenCandidates = candidates.filter((q) => seenSet.has(q.id) && !excludeIds.has(q.id));
      const unseenCandidates = candidates.filter((q) => !seenSet.has(q.id) && !excludeIds.has(q.id));

      const reviewSlice = seenCandidates.slice(0, targetReviewCount);
      const novelSlice = unseenCandidates.slice(0, targetNovelCount);

      selectedQuestions = [...reviewSlice, ...novelSlice];
      reviewCount = reviewSlice.length;
      novelCount = novelSlice.length;

      // Backfill if either pool was short
      if (selectedQuestions.length < targetCount) {
        const currentSelectedIds = new Set(selectedQuestions.map((q) => q.id));
        const backfills = candidates.filter((q) => !currentSelectedIds.has(q.id) && !excludeIds.has(q.id));
        const added = backfills.slice(0, targetCount - selectedQuestions.length);
        selectedQuestions.push(...added);
      }

      rationale = `[Mixed Assessment] Balanced mixture of ${novelCount} fresh challenges and ${reviewCount} retention checks.`;
    }

    return {
      selectedQuestions,
      totalCandidateQuestions: candidates.length,
      previouslySeenCount,
      reusedCount: selectedQuestions.length,
      generatedCount: 0,
      noveltyMode,
      reviewQuestionCount: reviewCount,
      novelQuestionCount: novelCount,
      rationale
    };
  }

  /**
   * Ranks candidate questions by pedagogical priority:
   * 1. Questions targeting known weak concepts
   * 2. Questions targeting lowest mastery concepts
   * 3. Difficulty alignment
   */
  private rankCandidatesByMastery(
    candidates: Question[],
    weaknessConcepts: string[],
    conceptMasteries: Record<string, number>
  ): Question[] {
    return [...candidates].sort((a, b) => {
      // 1. Weakness concept prioritization
      const aIsWeak = weaknessConcepts.some((w) => a.concept.toLowerCase().includes(w.toLowerCase()));
      const bIsWeak = weaknessConcepts.some((w) => b.concept.toLowerCase().includes(w.toLowerCase()));
      if (aIsWeak && !bIsWeak) return -1;
      if (!aIsWeak && bIsWeak) return 1;

      // 2. Lower concept mastery gets higher priority
      const aMastery = conceptMasteries[a.concept] ?? 0.5;
      const bMastery = conceptMasteries[b.concept] ?? 0.5;
      if (aMastery !== bMastery) return aMastery - bMastery;

      // 3. Stable secondary sort by id (natural numeric sort)
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }
}


export const novelQuestionSelector = new NovelQuestionSelector();
