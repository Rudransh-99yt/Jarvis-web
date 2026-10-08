// ============================================================================
// J.A.R.V.I.S. EDUCATION OS — QUESTION INTELLIGENCE FOUNDATION
// Types, Domain Models, and Provider Contracts
// ============================================================================

import type { QuestionNoveltyMode } from './questionExposure.ts';

/**
 * Explicit question origin categories.
 * Strict hierarchy:
 * 1. User/Teacher supplied source
 * 2. Existing source-grounded questions
 * 3. Deterministic templates
 * 4. Jarvis generated questions
 * 5. External/web questions (when permitted)
 */
export type QuestionSourceCategory =
  | 'SOURCE'
  | 'JARVIS_GENERATED'
  | 'WEB_RETRIEVED'
  | 'TEACHER_CREATED'
  | 'INSTITUTION_CREATED';

/**
 * Strict source filtering boundaries set by the learner or teacher.
 * SOURCE_ONLY: strictly grounded in uploaded/source material. Never invent or include external.
 * SOURCE_PLUS_JARVIS: source-grounded learning plus Jarvis-generated practice.
 * SOURCE_PLUS_WEB: source-grounded learning plus external resources.
 * FULL_ADAPTIVE: Jarvis decides the appropriate mixture based on learner needs.
 */
export type QuestionSourceMode =
  | 'SOURCE_ONLY'
  | 'SOURCE_PLUS_JARVIS'
  | 'SOURCE_PLUS_WEB'
  | 'FULL_ADAPTIVE';

/**
 * Extensible question types for diverse pedagogical assessments.
 */
export type QuestionType =
  | 'multiple_choice'
  | 'multi_select'
  | 'true_false'
  | 'short_answer'
  | 'numerical'
  | 'conceptual'
  | 'application'
  | 'reasoning'
  | 'misconception_diagnosis';

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'challenge';

export type ReasoningLevel = 'recall' | 'conceptual' | 'application' | 'analysis' | 'evaluation';

export interface SourceReference {
  type: 'pdf' | 'textbook' | 'lecture' | 'notes' | 'document' | 'web';
  title?: string;
  sourceId?: string;
  pageNumber?: number;
  section?: string;
  url?: string;
  snippet?: string;
  authorOrPublisher?: string;
  verifiedGrounded?: boolean;
}

export interface QuestionQualityMetadata {
  accuracyRating?: number; // 0 - 1
  clarityScore?: number; // 0 - 1
  pedagogicalValue?: number; // 0 - 1
  verifiedGrounded?: boolean;
  rubricCriteria?: string[];
  reviewedBy?: string;
  generatedByEngine?: string;
  generationTimestamp?: string;
}

export interface Question {
  id: string;
  subject: string;
  concept: string;
  prerequisiteConcepts: string[];
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  source: QuestionSourceCategory;
  sourceReference?: SourceReference;
  learningObjective: string;
  masteryContribution: number; // e.g. 0.05 to 0.25
  estimatedTime: number; // seconds
  prompt: string;
  options?: string[]; // For multiple choice / multi-select
  answer: string | string[] | number | boolean;
  distractors?: string[];
  explanation: string;
  hints?: string[];
  expectedReasoningLevel?: ReasoningLevel;
  previousAttempts?: number;
  correctness?: boolean;
  confidence?: number;
  generatedBy?: string;
  citation?: string;
  qualityMetadata?: QuestionQualityMetadata;
}

/**
 * Pedagogical aspect targeted by the adaptive selector
 */
export type SelectionTargetAspect =
  | 'source_grounded'
  | 'prerequisite_gap'
  | 'conceptual_reinforcement'
  | 'application_stretch'
  | 'challenge'
  | 'misconception_check';

export interface SelectedQuestionItem {
  question: Question;
  selectionReason: string;
  targetedAspect: SelectionTargetAspect;
  rank: number;
}

/**
 * Comprehensive input for deterministic question selection
 */
export interface LearnerMasteryContext {
  learnerId?: string;
  overallMastery: number; // 0.0 - 1.0
  conceptMastery: Record<string, number>; // concept -> 0.0 - 1.0
  prerequisiteMastery: Record<string, number>; // prerequisite -> 0.0 - 1.0
  recentAccuracy: number; // 0.0 - 1.0
  recentMistakes: string[]; // concepts or question IDs missed recently
  difficultyHistory: Record<QuestionDifficulty, number>; // distribution of recent difficulties
  questionHistory: string[]; // question IDs previously attempted (deduplication)
  confidence: number; // 0.0 - 1.0 learner confidence
  timeAvailableMinutes?: number;
  upcomingDeadlines?: string[];
  currentLessonId?: string;
  currentLessonTitle?: string;
  subject: string;
  targetConcept: string;
  learningObjective?: string;
  sourceMode: QuestionSourceMode;
  targetCount?: number; // target count (default 10)
  noveltyMode?: QuestionNoveltyMode; // 'NEW' | 'MORE' | 'REVIEW' | 'WEAKNESS_PRACTICE' | 'MIXED'
}

export interface PracticeSetBreakdown {
  sourceGroundedCount: number;
  prerequisiteCount: number;
  conceptualCount: number;
  applicationCount: number;
  challengeCount: number;
  sourceBreakdown: Record<QuestionSourceCategory, number>;
}

export interface PracticeSet {
  id: string;
  title: string;
  subject: string;
  targetConcept: string;
  learningObjective: string;
  sourceMode: QuestionSourceMode;
  totalQuestions: number;
  breakdown: PracticeSetBreakdown;
  selectionRationale: string;
  questions: SelectedQuestionItem[];
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// Provider Interfaces
// ----------------------------------------------------------------------------

export interface QuestionQuery {
  subject: string;
  concept: string;
  prerequisites?: string[];
  difficulty?: QuestionDifficulty;
  questionTypes?: QuestionType[];
  limit?: number;
  excludeIds?: string[];
  sourceReferenceFilter?: string;
}

export interface IQuestionProvider {
  readonly id: string;
  readonly name: string;
  readonly sourceCategory: QuestionSourceCategory;
  isAvailable(): Promise<boolean>;
  getQuestions(query: QuestionQuery): Promise<Question[]>;
}

export interface QuestionGenerationSpec {
  subject: string;
  concept: string;
  prerequisiteConcepts?: string[];
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  learningObjective: string;
  expectedReasoningLevel?: ReasoningLevel;
  sourceContext?: {
    title: string;
    snippet: string;
    pageNumber?: number;
  };
  count?: number;
}

export interface IQuestionGenerationProvider {
  readonly id: string;
  readonly name: string;
  generateQuestions(spec: QuestionGenerationSpec): Promise<Question[]>;
}

export interface ExternalQuestionQuery {
  subject: string;
  concept: string;
  topic?: string;
  difficulty?: QuestionDifficulty;
  limit?: number;
  domainWhitelist?: string[];
}

// ----------------------------------------------------------------------------
// Mastery Evidence & Evaluation Models
// ----------------------------------------------------------------------------

export interface QuestionEvaluationRequest {
  questionId: string;
  learnerAnswer: any;
  timeSpentSeconds: number;
  learnerConfidence?: number; // 0.0 - 1.0 or 1 - 5
  previousAttempts?: number;
  learnerId?: string;
  contextId?: string;
}

export type ConfidenceAlignment =
  | 'calibrated_high'   // High confidence + correct
  | 'overconfident'     // High confidence + incorrect
  | 'underconfident'    // Low confidence + correct
  | 'calibrated_low';   // Low confidence + incorrect

export interface NextRecommendedAction {
  action: 'advance_difficulty' | 'review_prerequisite' | 'review_source_material' | 'practice_similar' | 'try_challenge';
  targetConcept: string;
  reason: string;
  sourceReference?: SourceReference;
}

export interface MasteryEvidence {
  questionId: string;
  concept: string;
  prerequisiteConcepts: string[];
  isCorrect: boolean;
  score: number; // 0.0 - 1.0
  difficulty: QuestionDifficulty;
  confidenceAlignment: ConfidenceAlignment;
  misconceptionIdentified?: string;
  masteryDelta: number; // e.g. +0.08 or -0.05
  previousConceptMastery: number;
  updatedConceptMastery: number;
  feedback: {
    title: string;
    explanation: string;
    citation?: string;
    sourceReference?: SourceReference;
    misconceptionAnalysis?: string;
    nextRecommendedAction: NextRecommendedAction;
  };
  timestamp: string;
}
