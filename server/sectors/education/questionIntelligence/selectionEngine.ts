import type {
  LearnerMasteryContext,
  Question,
  QuestionSourceMode,
  SelectedQuestionItem,
  SelectionTargetAspect,
  PracticeSet,
  PracticeSetBreakdown,
  IQuestionProvider
} from './types.ts';

export interface SelectionEngineProviders {
  sourceProvider: IQuestionProvider;
  deterministicProvider: IQuestionProvider;
  generatedProvider: IQuestionProvider;
  externalProvider: IQuestionProvider;
}

/**
 * QuestionSelectionEngine
 * Deterministic adaptive question selection and ranking.
 * Enforces strict Source Hierarchy and Source Mode constraints with 100% explainable pedagogical reasoning.
 * Does NOT use an LLM for ranking.
 */
export class QuestionSelectionEngine {
  private providers: SelectionEngineProviders;

  constructor(providers: SelectionEngineProviders) {
    this.providers = providers;
  }

  /**
   * Deterministically assemble an adaptive practice set based on learner mastery and constraints
   */
  async selectPracticeSet(context: LearnerMasteryContext): Promise<PracticeSet> {
    const targetCount = context.targetCount || 10;
    const targetConcept = context.targetConcept || "Newton's Laws";
    const subject = context.subject || 'Physics';
    const sourceMode = context.sourceMode || 'FULL_ADAPTIVE';

    // 1. Determine permitted question sources based on strict Source Mode
    const permittedSources = this.getPermittedSources(sourceMode);

    // 2. Fetch candidate questions from providers adhering to hierarchy
    const [sourceCandidates, deterministicCandidates, generatedCandidates, externalCandidates] = await Promise.all([
      this.providers.sourceProvider.getQuestions({
        subject,
        concept: targetConcept,
        excludeIds: context.questionHistory
      }),
      permittedSources.has('JARVIS_GENERATED')
        ? this.providers.deterministicProvider.getQuestions({
            subject,
            concept: targetConcept,
            prerequisites: Object.keys(context.prerequisiteMastery),
            excludeIds: context.questionHistory
          })
        : Promise.resolve([]),
      permittedSources.has('JARVIS_GENERATED')
        ? this.providers.generatedProvider.getQuestions({
            subject,
            concept: targetConcept,
            excludeIds: context.questionHistory
          })
        : Promise.resolve([]),
      permittedSources.has('WEB_RETRIEVED')
        ? this.providers.externalProvider.getQuestions({
            subject,
            concept: targetConcept,
            excludeIds: context.questionHistory
          })
        : Promise.resolve([])
    ]);

    // Filter all candidates strictly by permittedSources and deduplicate
    const seenIds = new Set<string>(context.questionHistory || []);
    const filterAndDedupe = (questions: Question[]) =>
      questions.filter((q) => {
        if (!permittedSources.has(q.source)) return false;
        if (seenIds.has(q.id)) return false;
        seenIds.add(q.id);
        return true;
      });

    const validSource = filterAndDedupe(sourceCandidates);
    const validDeterministic = filterAndDedupe(deterministicCandidates);
    const validGenerated = filterAndDedupe(generatedCandidates);
    const validExternal = filterAndDedupe(externalCandidates);

    // 3. Evaluate Learner State to determine pedagogical composition
    const conceptMastery = context.conceptMastery[targetConcept] ?? context.overallMastery ?? 0.5;
    const recentAccuracy = context.recentAccuracy ?? 0.7;
    const isOverconfident = (context.confidence > 0.75 && recentAccuracy < 0.6);

    // Check for prerequisite gaps
    const weakestPrereq = this.findWeakestPrerequisite(context.prerequisiteMastery, context.recentMistakes);

    const selectedItems: SelectedQuestionItem[] = [];

    // Rule A: Prerequisite Diagnosis (if gap detected and permitted)
    if (weakestPrereq && (validDeterministic.length > 0 || validGenerated.length > 0)) {
      const prereqQuestions = validDeterministic.filter(
        (q) => q.concept.toLowerCase().includes(weakestPrereq.concept.toLowerCase()) ||
               q.prerequisiteConcepts.some((p) => p.toLowerCase().includes(weakestPrereq.concept.toLowerCase()))
      );

      for (const q of prereqQuestions.slice(0, 2)) {
        selectedItems.push({
          question: q,
          targetedAspect: 'prerequisite_gap',
          selectionReason: `You missed prerequisite questions related to ${weakestPrereq.concept}, so Jarvis added foundational verification.`,
          rank: selectedItems.length + 1
        });
      }
    }

    // Rule B: Source-Grounded Core (Honor Source Hierarchy: never replace source questions unnecessarily)
    // In SOURCE_ONLY mode, take as many source questions as possible
    const sourceQuota = sourceMode === 'SOURCE_ONLY' ? targetCount : Math.min(validSource.length, 3);
    for (const q of validSource.slice(0, sourceQuota)) {
      selectedItems.push({
        question: q,
        targetedAspect: 'source_grounded',
        selectionReason: q.sourceReference?.snippet
          ? `Directly grounded in your uploaded material (${q.sourceReference.title || 'Course Textbook'}, ${q.sourceReference.section || 'Reading'}).`
          : 'Directly grounded in your uploaded source curriculum.',
        rank: selectedItems.length + 1
      });
    }

    // If SOURCE_ONLY mode, stop here! Never invent or pull external questions.
    if (sourceMode === 'SOURCE_ONLY') {
      const rationale = selectedItems.length > 0
        ? `Strict Book-Only mode active: practicing exclusively with ${selectedItems.length} source-grounded questions from your uploaded document.`
        : 'Book-Only mode active: no additional source-grounded questions available for this concept in the current document.';

      return this.buildPracticeSet(context, selectedItems, rationale, sourceMode);
    }

    // Rule C: Misconception Check (if confidence vs accuracy mismatch or low mastery)
    if (isOverconfident || conceptMastery < 0.5) {
      let misQ = validGenerated.find((q) => q.questionType === 'misconception_diagnosis');
      if (!misQ) {
        const directGen = await this.providers.generatedProvider.getQuestions({
          subject,
          concept: targetConcept,
          questionTypes: ['misconception_diagnosis'],
          limit: 2
        });
        misQ = directGen.find((q) => q.questionType === 'misconception_diagnosis');
      }
      if (misQ && !selectedItems.some((s) => s.question.id === misQ!.id)) {
        selectedItems.push({
          question: misQ,
          targetedAspect: 'misconception_check',
          selectionReason: isOverconfident
            ? 'Jarvis detected a conceptual mismatch and added a diagnostic question to solidify understanding.'
            : 'Jarvis is reinforcing core foundational concepts before introducing multi-step applications.',
          rank: selectedItems.length + 1
        });
      }
    }

    // Rule D: Application Stretch & Conceptual Reinforcement based on Mastery Level
    const remainingSlots = targetCount - selectedItems.length;
    if (remainingSlots > 0) {
      const pool = [...validGenerated, ...validDeterministic, ...validExternal].filter(
        (q) => !selectedItems.some((s) => s.question.id === q.id)
      );

      // If high mastery (>= 0.75): prioritize advanced, application, and challenge
      if (conceptMastery >= 0.75) {
        pool.sort((a, b) => this.difficultyWeight(b.difficulty) - this.difficultyWeight(a.difficulty));
        for (const q of pool.slice(0, remainingSlots)) {
          const isChallenge = q.difficulty === 'challenge';
          selectedItems.push({
            question: q,
            targetedAspect: isChallenge ? 'challenge' : 'application_stretch',
            selectionReason: isChallenge
              ? 'Your accuracy is strong, so Jarvis added an advanced synthesis challenge.'
              : `Your conceptual accuracy is strong (${Math.round(conceptMastery * 100)}%), so Jarvis is increasing application difficulty.`,
            rank: selectedItems.length + 1
          });
        }
      } else {
        // Balanced or developing mastery: prioritize beginner and intermediate
        pool.sort((a, b) => this.difficultyWeight(a.difficulty) - this.difficultyWeight(b.difficulty));
        for (const q of pool.slice(0, remainingSlots)) {
          selectedItems.push({
            question: q,
            targetedAspect: 'conceptual_reinforcement',
            selectionReason: 'Reinforcing fundamental principles and guided problem structure.',
            rank: selectedItems.length + 1
          });
        }
      }
    }

    // Re-assign 1-based ranks
    selectedItems.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // 4. Synthesize overall pedagogical rationale
    const rationale = this.generateOverallRationale(conceptMastery, weakestPrereq?.concept, selectedItems);

    return this.buildPracticeSet(context, selectedItems, rationale, sourceMode);
  }

  private getPermittedSources(mode: QuestionSourceMode): Set<string> {
    switch (mode) {
      case 'SOURCE_ONLY':
        return new Set(['SOURCE', 'TEACHER_CREATED']);
      case 'SOURCE_PLUS_JARVIS':
        return new Set(['SOURCE', 'TEACHER_CREATED', 'JARVIS_GENERATED']);
      case 'SOURCE_PLUS_WEB':
        return new Set(['SOURCE', 'TEACHER_CREATED', 'WEB_RETRIEVED']);
      case 'FULL_ADAPTIVE':
      default:
        return new Set(['SOURCE', 'TEACHER_CREATED', 'JARVIS_GENERATED', 'WEB_RETRIEVED', 'INSTITUTION_CREATED']);
    }
  }

  private findWeakestPrerequisite(
    prereqMastery: Record<string, number>,
    recentMistakes: string[] = []
  ): { concept: string; score: number } | null {
    const entries = Object.entries(prereqMastery || {});
    if (entries.length === 0 && recentMistakes.length > 0) {
      return { concept: recentMistakes[0], score: 0.4 };
    }

    let weakest: { concept: string; score: number } | null = null;
    for (const [concept, score] of entries) {
      if (score < 0.7) {
        if (!weakest || score < weakest.score) {
          weakest = { concept, score };
        }
      }
    }
    return weakest;
  }

  private difficultyWeight(diff: string): number {
    switch (diff) {
      case 'challenge': return 4;
      case 'advanced': return 3;
      case 'intermediate': return 2;
      case 'beginner': return 1;
      default: return 2;
    }
  }

  private generateOverallRationale(
    conceptMastery: number,
    weakestPrereqConcept: string | undefined,
    items: SelectedQuestionItem[]
  ): string {
    const sourceCount = items.filter((i) => i.question.source === 'SOURCE').length;
    const appCount = items.filter((i) => i.targetedAspect === 'application_stretch').length;
    const prereqCount = items.filter((i) => i.targetedAspect === 'prerequisite_gap').length;

    if (weakestPrereqConcept && prereqCount > 0) {
      return `Jarvis targeted foundational prerequisites in ${weakestPrereqConcept} before scaling into complex application problems.`;
    }

    if (conceptMastery >= 0.75) {
      return `Your conceptual accuracy is strong (${Math.round(conceptMastery * 100)}%), so Jarvis selected ${sourceCount} source problems and elevated ${appCount} high-leverage application challenges.`;
    }

    return `Jarvis balanced ${sourceCount} source problems with structured conceptual checkpoints to build confident mastery.`;
  }

  private buildPracticeSet(
    context: LearnerMasteryContext,
    items: SelectedQuestionItem[],
    rationale: string,
    sourceMode: QuestionSourceMode
  ): PracticeSet {
    const breakdown: PracticeSetBreakdown = {
      sourceGroundedCount: items.filter((i) => i.question.source === 'SOURCE').length,
      prerequisiteCount: items.filter((i) => i.targetedAspect === 'prerequisite_gap').length,
      conceptualCount: items.filter((i) => i.targetedAspect === 'conceptual_reinforcement' || i.question.questionType === 'conceptual').length,
      applicationCount: items.filter((i) => i.targetedAspect === 'application_stretch' || i.question.questionType === 'application').length,
      challengeCount: items.filter((i) => i.targetedAspect === 'challenge' || i.question.difficulty === 'challenge').length,
      sourceBreakdown: {
        SOURCE: items.filter((i) => i.question.source === 'SOURCE').length,
        JARVIS_GENERATED: items.filter((i) => i.question.source === 'JARVIS_GENERATED').length,
        WEB_RETRIEVED: items.filter((i) => i.question.source === 'WEB_RETRIEVED').length,
        TEACHER_CREATED: items.filter((i) => i.question.source === 'TEACHER_CREATED').length,
        INSTITUTION_CREATED: items.filter((i) => i.question.source === 'INSTITUTION_CREATED').length
      }
    };

    return {
      id: `practice-set-${Date.now()}`,
      title: `Jarvis Adaptive Practice: ${context.targetConcept}`,
      subject: context.subject,
      targetConcept: context.targetConcept,
      learningObjective: context.learningObjective || `Master core principles and applications of ${context.targetConcept}`,
      sourceMode,
      totalQuestions: items.length,
      breakdown,
      selectionRationale: rationale,
      questions: items,
      generatedAt: new Date().toISOString()
    };
  }
}
