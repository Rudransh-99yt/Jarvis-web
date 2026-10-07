import type {
  PersonalKnowledgeState,
  PersonalKnowledgeConceptState,
  PersonalKnowledgeSignal,
  NextBestAction
} from './types.ts';

/**
 * PersonalKnowledgeStore
 * Tracks persistent personal knowledge graphs, concept masteries, and computes deterministic Next Best Action.
 * Invariant: Differentiates personal memory (preferences/facts) from personal knowledge (demonstrated concept mastery).
 */
export class PersonalKnowledgeStore {
  private knowledgeStates: Map<string, PersonalKnowledgeState> = new Map();

  constructor() {
    this.seedDefaultKnowledge();
  }

  private seedDefaultKnowledge(): void {
    const student1Concepts: Record<string, PersonalKnowledgeConceptState> = {
      'concept-newton-laws': {
        conceptId: 'concept-newton-laws',
        conceptName: "Newton's Laws of Motion",
        subject: 'Physics',
        masteryLevel: 0.85,
        status: 'mastered',
        evidenceCount: 6,
        lastPracticed: '2026-10-06T20:30:00Z',
        provenanceSources: ['src-phys-newton-1', 'src-phys-newton-2', 'det-newton-two-body-1']
      },
      'concept-vector-forces': {
        conceptId: 'concept-vector-forces',
        conceptName: 'Vector Force Decomposition',
        subject: 'Physics',
        masteryLevel: 0.62,
        status: 'review_needed',
        evidenceCount: 4,
        lastPracticed: '2026-10-05T14:15:00Z',
        provenanceSources: ['det-prereq-vectors-1']
      },
      'concept-wave-functions': {
        conceptId: 'concept-wave-functions',
        conceptName: 'Quantum Wave Functions & Born Interpretation',
        subject: 'Physics',
        masteryLevel: 0.72,
        status: 'learning',
        evidenceCount: 3,
        lastPracticed: '2026-10-04T11:00:00Z',
        provenanceSources: ['src-phys-quantum-1']
      },
      'concept-derivatives-chain': {
        conceptId: 'concept-derivatives-chain',
        conceptName: 'Chain Rule & Differential Calculus',
        subject: 'Mathematics',
        masteryLevel: 0.80,
        status: 'mastered',
        evidenceCount: 5,
        lastPracticed: '2026-10-03T09:00:00Z',
        provenanceSources: ['src-math-calc-1']
      }
    };

    const student1Signals: PersonalKnowledgeSignal[] = [
      {
        id: 'sig-1',
        type: 'concept_mastered',
        title: "Newton's Laws mastery reached 85%",
        timestamp: '2026-10-06T20:30:00Z',
        metadata: { concept: "Newton's Laws", delta: +0.08 }
      },
      {
        id: 'sig-2',
        type: 'document_ingested',
        title: 'Halliday & Resnick Fundamentals of Physics PDF indexed into knowledge space',
        timestamp: '2026-10-06T18:00:00Z',
        metadata: { filename: 'Fundamentals_of_Physics_12th.pdf', pages: 114 }
      },
      {
        id: 'sig-3',
        type: 'concept_review_needed',
        title: 'Trigonometric vector decomposition identified for 15-minute review',
        timestamp: '2026-10-05T14:15:00Z',
        metadata: { concept: 'Vector Force Decomposition' }
      }
    ];

    this.knowledgeStates.set('student-1', {
      userId: 'student-1',
      concepts: student1Concepts,
      recentSignals: student1Signals,
      updatedAt: new Date().toISOString()
    });
  }

  async getKnowledge(userId: string): Promise<PersonalKnowledgeState> {
    let state = this.knowledgeStates.get(userId);
    if (!state) {
      state = {
        userId,
        concepts: {},
        recentSignals: [],
        updatedAt: new Date().toISOString()
      };
      this.knowledgeStates.set(userId, state);
    }
    return state;
  }

  async recordConceptMastery(
    userId: string,
    params: {
      conceptName: string;
      subject: string;
      masteryDelta: number;
      provenanceSource: string;
    }
  ): Promise<PersonalKnowledgeConceptState> {
    const state = await this.getKnowledge(userId);
    const generatedKey = `concept-${params.conceptName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const existingEntry = Object.entries(state.concepts).find(
      ([k, c]) => k === generatedKey || c.conceptName.toLowerCase() === params.conceptName.toLowerCase()
    );
    const conceptKey = existingEntry ? existingEntry[0] : generatedKey;

    const existing = existingEntry ? existingEntry[1] : {
      conceptId: conceptKey,
      conceptName: params.conceptName,
      subject: params.subject,
      masteryLevel: 0.5,
      status: 'learning',
      evidenceCount: 0,
      provenanceSources: []
    };

    const newMastery = Math.min(1.0, Math.max(0.0, Math.round((existing.masteryLevel + params.masteryDelta) * 100) / 100));
    const newStatus = newMastery >= 0.80 ? 'mastered' : (newMastery < 0.50 ? 'review_needed' : 'learning');

    const updatedConcept: PersonalKnowledgeConceptState = {
      ...existing,
      masteryLevel: newMastery,
      status: newStatus,
      evidenceCount: existing.evidenceCount + 1,
      lastPracticed: new Date().toISOString(),
      provenanceSources: Array.from(new Set([...existing.provenanceSources, params.provenanceSource]))
    };

    state.concepts[conceptKey] = updatedConcept;

    // Add signal if threshold crossed
    if (newMastery >= 0.80 && existing.masteryLevel < 0.80) {
      state.recentSignals.unshift({
        id: `sig-${Date.now()}`,
        type: 'concept_mastered',
        title: `${params.conceptName} mastery elevated to ${Math.round(newMastery * 100)}%`,
        timestamp: new Date().toISOString(),
        metadata: { concept: params.conceptName }
      });
    }

    state.updatedAt = new Date().toISOString();
    return updatedConcept;
  }

  /**
   * Deterministic Next Best Action computation combining active context, mastery gaps, and upcoming curriculum
   */
  async computeNextBestAction(userId: string, activeContextTitle: string = 'Physics'): Promise<NextBestAction> {
    const knowledge = await this.getKnowledge(userId);
    const concepts = Object.values(knowledge.concepts);

    // 1. Check if any concept needs review (highest priority)
    const reviewConcept = concepts.find((c) => c.status === 'review_needed');
    if (reviewConcept) {
      return {
        id: 'nba-review-prereq',
        title: `Reinforce ${reviewConcept.conceptName} — 12 mins`,
        type: 'review_prerequisite',
        estimatedMinutes: 12,
        priority: 'high',
        targetContext: activeContextTitle,
        rationale: `Diagnostic checkpoints flagged a foundational gap in ${reviewConcept.conceptName}.`,
        actionTarget: {
          concept: reviewConcept.conceptName,
          courseId: 'class-phys-301'
        }
      };
    }

    // 2. Check concept currently in learning
    const learningConcept = concepts.find((c) => c.status === 'learning');
    if (learningConcept) {
      return {
        id: 'nba-continue-lesson',
        title: `Continue ${learningConcept.conceptName} — 18 mins`,
        type: 'lesson_practice',
        estimatedMinutes: 18,
        priority: 'high',
        targetContext: activeContextTitle,
        rationale: `You have completed ${learningConcept.evidenceCount} derivations; practicing 3 application problems will achieve mastery.`,
        actionTarget: {
          concept: learningConcept.conceptName,
          courseId: 'class-phys-301',
          unitId: 'unit-phys-2',
          lessonId: 'les-phys-202'
        }
      };
    }

    // 3. Default fallback action
    return {
      id: 'nba-default-study',
      title: "Continue Newton's Laws — 18 mins",
      type: 'lesson_practice',
      estimatedMinutes: 18,
      priority: 'medium',
      targetContext: activeContextTitle,
      rationale: 'Calibrated adaptive practice set ready based on your textbook readings.',
      actionTarget: {
        concept: "Newton's Laws",
        courseId: 'class-phys-301',
        unitId: 'unit-phys-2',
        lessonId: 'les-phys-202'
      }
    };
  }
}

export const personalKnowledgeStore = new PersonalKnowledgeStore();
