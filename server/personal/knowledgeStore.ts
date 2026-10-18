import { jarvisData, type IJarvisDataRepository } from '../data/index.ts';
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
 * Backed by the core data repository.
 */
export class PersonalKnowledgeStore {
  private repo: IJarvisDataRepository;

  constructor(repo: IJarvisDataRepository = jarvisData) {
    this.repo = repo;
  }

  private async ensureSeedKnowledge(userId: string): Promise<void> {
    if (userId === 'student-1') {
      const existing = await this.repo.personalKnowledge.getState('student-1');
      if (!existing) {
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
            metadata: { concept: "Newton's Laws", delta: 0.08 }
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

        await this.repo.personalKnowledge.upsertState({
          userId: 'student-1',
          concepts: student1Concepts,
          recentSignals: student1Signals,
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  async getKnowledge(userId: string): Promise<PersonalKnowledgeState> {
    await this.ensureSeedKnowledge(userId);
    let state = await this.repo.personalKnowledge.getState(userId);
    if (!state) {
      state = {
        userId,
        concepts: {},
        recentSignals: [],
        updatedAt: new Date().toISOString()
      };
      await this.repo.personalKnowledge.upsertState(state);
    }
    return JSON.parse(JSON.stringify(state));
  }

  async initializeConcept(
    userId: string,
    conceptName: string,
    subject: string
  ): Promise<PersonalKnowledgeConceptState> {
    const state = await this.getKnowledge(userId);
    const generatedKey = `concept-${conceptName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const existingEntry = Object.entries(state.concepts || {}).find(
      ([k, c]) => k === generatedKey || c.conceptName.toLowerCase() === conceptName.toLowerCase()
    );
    if (existingEntry) {
      return JSON.parse(JSON.stringify(existingEntry[1]));
    }
    const newConcept: PersonalKnowledgeConceptState = {
      conceptId: generatedKey,
      conceptName,
      subject,
      masteryLevel: 0.5,
      status: 'learning',
      evidenceCount: 0,
      lastPracticed: new Date().toISOString(),
      provenanceSources: []
    };
    await this.repo.personalKnowledge.recordConceptMastery(userId, newConcept);
    return JSON.parse(JSON.stringify(newConcept));
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
    const existingEntry = Object.entries(state.concepts || {}).find(
      ([k, c]) => k === generatedKey || c.conceptName.toLowerCase() === params.conceptName.toLowerCase()
    );
    const conceptKey = existingEntry ? existingEntry[0] : generatedKey;

    const existing = existingEntry ? existingEntry[1] : {
      conceptId: conceptKey,
      conceptName: params.conceptName,
      subject: params.subject,
      masteryLevel: 0.5,
      status: 'learning' as const,
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

    // Add signal if threshold crossed
    let signal: PersonalKnowledgeSignal | undefined;
    if (newMastery >= 0.80 && existing.masteryLevel < 0.80) {
      signal = {
        id: `sig-${Date.now()}`,
        type: 'concept_mastered',
        title: `${params.conceptName} mastery elevated to ${Math.round(newMastery * 100)}%`,
        timestamp: new Date().toISOString(),
        metadata: { concept: params.conceptName }
      };
    }

    const recorded = await this.repo.personalKnowledge.recordConceptMastery(userId, updatedConcept, signal);
    return JSON.parse(JSON.stringify(recorded));
  }

  /**
   * Rolls back a concept mastery update if subsequent evaluation steps fail.
   * Guarantees atomic consistency across multi-store checkpoint operations.
   */
  async rollbackConceptMastery(
    userId: string,
    params: {
      conceptName: string;
      priorState?: PersonalKnowledgeConceptState;
    }
  ): Promise<void> {
    const state = await this.getKnowledge(userId);
    const generatedKey = `concept-${params.conceptName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const existingEntry = Object.entries(state.concepts || {}).find(
      ([k, c]) => k === generatedKey || c.conceptName.toLowerCase() === params.conceptName.toLowerCase()
    );
    const conceptKey = existingEntry ? existingEntry[0] : (params.priorState?.conceptId || generatedKey);
    await this.repo.personalKnowledge.rollbackConceptMastery(userId, conceptKey, params.priorState || null);
  }

  /**
   * Deterministic Next Best Action computation combining active context, mastery gaps, user goals, and primary role
   */
  async computeNextBestAction(
    userId: string,
    activeContext?: any,
    identity?: any
  ): Promise<NextBestAction> {
    const knowledge = await this.getKnowledge(userId);
    const concepts = Object.values(knowledge.concepts || {});
    const contextTitle = typeof activeContext === 'string'
      ? activeContext
      : (activeContext?.title || 'Personal');
    const contextType = typeof activeContext === 'object' ? activeContext?.type : 'PERSONAL';

    // 1. Check if any concept needs review (highest priority for learners with existing data)
    const reviewConcept = concepts.find((c) => c.status === 'review_needed');
    if (reviewConcept) {
      return {
        id: 'nba-review-prereq',
        title: `Reinforce ${reviewConcept.conceptName} — 12 mins`,
        type: 'review_prerequisite',
        estimatedMinutes: 12,
        priority: 'high',
        targetContext: contextTitle,
        rationale: `Diagnostic checkpoints flagged a foundational gap in ${reviewConcept.conceptName}.`,
        actionTarget: {
          concept: reviewConcept.conceptName,
          courseId: 'course-phys-101',
          toolId: 'personal_practice_session_start',
          toolArgs: { conceptName: reviewConcept.conceptName, itemCount: 3 }
        },
        alternativeActions: [
          {
            id: 'alt-review-notes',
            title: `Review notes on ${reviewConcept.conceptName} — 5 mins`,
            type: 'study_plan',
            estimatedMinutes: 5,
            rationale: 'Quick review of key formulas and definitions before attempting practice.',
            actionTarget: { toolId: 'personal_notes_read', toolArgs: { query: reviewConcept.conceptName } }
          },
          {
            id: 'alt-review-flashcards',
            title: `Create flashcard for ${reviewConcept.conceptName} — 3 mins`,
            type: 'study_plan',
            estimatedMinutes: 3,
            rationale: 'Reinforce core formula or theorem through retrieval practice.',
            actionTarget: { toolId: 'personal_flashcard_create', toolArgs: { conceptId: reviewConcept.conceptId } }
          }
        ]
      };
    }

    // 2. Check concept currently in learning
    const learningConcept = concepts.find((c) => c.status === 'learning');
    if (learningConcept) {
      return {
        id: 'nba-continue-lesson',
        title: `Continue ${learningConcept.conceptName} — 15 mins`,
        type: 'lesson_practice',
        estimatedMinutes: 15,
        priority: 'high',
        targetContext: contextTitle,
        rationale: `You have completed ${learningConcept.evidenceCount} checkpoints; practicing 3 application problems will achieve mastery.`,
        actionTarget: {
          concept: learningConcept.conceptName,
          courseId: 'course-phys-101',
          toolId: 'personal_practice_session_start',
          toolArgs: { conceptName: learningConcept.conceptName, itemCount: 3 }
        },
        alternativeActions: [
          {
            id: 'alt-draft-derivation',
            title: `Draft formula derivations note — 8 mins`,
            type: 'study_plan',
            estimatedMinutes: 8,
            rationale: 'Capture working steps in your private notes store.',
            actionTarget: { toolId: 'personal_notes_create', toolArgs: { title: `${learningConcept.conceptName} Derivations` } }
          }
        ]
      };
    }

    // 3. For users without active concepts (e.g. newly registered or exploring a new domain)
    // Check if the user has an active stated goal
    const primaryGoal = identity?.goals && identity.goals.length > 0 ? identity.goals[0] : null;
    if (primaryGoal) {
      const goalTitle = primaryGoal.title;
      return {
        id: `nba-goal-${primaryGoal.id}`,
        title: `Begin Foundation: ${goalTitle} — 12 mins`,
        type: 'concept_reinforce',
        estimatedMinutes: 12,
        priority: 'high',
        targetContext: contextTitle,
        rationale: `Grounded in your stated priority: "${goalTitle}". Starting a diagnostic breakdown will establish your initial mastery baseline.`,
        actionTarget: {
          concept: goalTitle,
          toolId: 'personal_practice_session_start',
          toolArgs: { conceptName: goalTitle, itemCount: 3 }
        },
        alternativeActions: [
          {
            id: 'alt-note-summary',
            title: `Create Reference Note on ${goalTitle} — 5 mins`,
            type: 'study_plan',
            estimatedMinutes: 5,
            rationale: 'Summarize key principles and resources in your private notes vault.',
            actionTarget: {
              toolId: 'personal_notes_create',
              toolArgs: { title: `${goalTitle} Summary`, subject: contextTitle }
            }
          },
          {
            id: 'alt-ask-jarvis',
            title: `Ask Jarvis: First-Principles Breakdown — 5 mins`,
            type: 'concept_reinforce',
            estimatedMinutes: 5,
            rationale: `Request a step-by-step breakdown of ${goalTitle} adapted to your explanation preferences.`,
            actionTarget: {
              toolId: 'ask_jarvis',
              toolArgs: { prompt: `Provide a first-principles breakdown of ${goalTitle}.` }
            }
          }
        ]
      };
    }

    // 4. Role or Context-specific recommendations when no goals or concepts are established
    if (contextType === 'RESEARCH') {
      return {
        id: 'nba-research-init',
        title: 'Structure Research Questions & Evidence Locker — 15 mins',
        type: 'research_synthesis',
        estimatedMinutes: 15,
        priority: 'medium',
        targetContext: contextTitle,
        rationale: 'In your Research space, defining core inquiry hypotheses and indexing reference literature establishes your grounded evidence base.',
        actionTarget: {
          toolId: 'personal_notes_create',
          toolArgs: { title: 'Primary Research Questions', subject: 'Research' }
        },
        alternativeActions: [
          {
            id: 'alt-research-ask',
            title: 'Ask Jarvis: Explore Literature Methodologies — 5 mins',
            type: 'research_synthesis',
            estimatedMinutes: 5,
            rationale: 'Brainstorm analytical approaches for your research inquiry.',
            actionTarget: { toolId: 'ask_jarvis', toolArgs: { prompt: 'How should I structure my initial research literature review?' } }
          }
        ]
      };
    }

    if (contextType === 'TEACHER') {
      return {
        id: 'nba-teacher-prep',
        title: 'Prepare Lecture Unit & SmartBoard Canvas — 20 mins',
        type: 'study_plan',
        estimatedMinutes: 20,
        priority: 'medium',
        targetContext: contextTitle,
        rationale: 'In your Faculty space, drafting interactive lesson outlines and preparing SmartBoard visual assets sets up your next classroom session.',
        actionTarget: {
          toolId: 'personal_notes_create',
          toolArgs: { title: 'Lesson Plan & Discussion Prompts', subject: 'Curriculum' }
        }
      };
    }

    // 5. First-time user without goals: recommend defining their primary goal
    return {
      id: 'nba-first-goal',
      title: 'Define Your Primary Learning or Project Goal — 3 mins',
      type: 'goal_definition',
      estimatedMinutes: 3,
      priority: 'high',
      targetContext: contextTitle,
      rationale: 'Jarvis is ready to calibrate to your needs. Setting your first focus topic or academic goal enables personalized recommendations and memory tracking.',
      actionTarget: {
        toolId: 'goal_definition'
      },
      alternativeActions: [
        {
          id: 'alt-first-ask',
          title: 'Ask Jarvis: "What can you help me learn or accomplish?" — 2 mins',
          type: 'concept_reinforce',
          estimatedMinutes: 2,
          rationale: 'Discover Jarvis capabilities across personal study, research, and technical analysis.',
          actionTarget: { toolId: 'ask_jarvis', toolArgs: { prompt: 'What can you help me learn or accomplish in my personal workspace?' } }
        },
        {
          id: 'alt-first-note',
          title: 'Create Your First Study Note — 4 mins',
          type: 'study_plan',
          estimatedMinutes: 4,
          rationale: 'Record an initial topic summary or formula derivation in your private vault.',
          actionTarget: { toolId: 'personal_notes_create', toolArgs: { title: 'First Topic Notes' } }
        }
      ]
    };
  }
}

export const personalKnowledgeStore = new PersonalKnowledgeStore();
