// ============================================================================
// J.A.R.V.I.S. EDUCATION OS — QUESTION EXPOSURE, NOVELTY & MASTERY-AWARE REUSE
// Domain Models, Provider Contracts, and Multi-Learner Isolation
// ============================================================================

import type { QuestionDifficulty, Question } from './questionIntelligence.ts';

export type QuestionExposureStatus =
  | 'SEEN'
  | 'ATTEMPTED'
  | 'COMPLETED'
  | 'MASTERED';

export type QuestionExposureResult =
  | 'CORRECT'
  | 'INCORRECT'
  | 'SKIPPED'
  | 'UNANSWERED';

export type QuestionNoveltyMode =
  | 'NEW'
  | 'MORE'
  | 'REVIEW'
  | 'WEAKNESS_PRACTICE'
  | 'MIXED';

export interface LearnerQuestionExposure {
  id: string; // Composite: `exp-${userId}-${contextId}-${questionId}`
  userId: string;
  contextId: string;
  questionId: string;
  assetId?: string;
  subject: string;
  topic: string;
  concept?: string;
  difficulty?: QuestionDifficulty;
  status: QuestionExposureStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  latestResult: QuestionExposureResult;
  lastScore?: number;
  lastResponseTimestamp?: string;
  weaknessFlag?: boolean;
  metadata?: Record<string, any>;
}

export interface LearnerExposureSummary {
  userId: string;
  contextId?: string;
  subject?: string;
  topic?: string;
  totalSeen: number;
  totalAttempted: number;
  totalCompleted: number;
  totalMastered: number;
  seenQuestionIds: string[];
  completedQuestionIds: string[];
  incorrectQuestionIds: string[];
  masteredQuestionIds: string[];
  weaknessConcepts: string[];
}

export interface NoveltySelectionOptions {
  noveltyMode?: QuestionNoveltyMode;
  targetCount?: number;
  contextId?: string;
  excludeQuestionIds?: string[];
  includeReviewRatio?: number; // e.g. 0.2 (20% review questions in MIXED mode)
  prioritizeWeaknesses?: boolean;
  learnerMasteryLevel?: number;
  conceptMasteries?: Record<string, number>;
  weaknessConcepts?: string[];
}

export interface NoveltySelectionResult {
  selectedQuestions: Question[];
  totalCandidateQuestions: number;
  previouslySeenCount: number;
  reusedCount: number;
  generatedCount: number;
  noveltyMode: QuestionNoveltyMode;
  reviewQuestionCount: number;
  novelQuestionCount: number;
  rationale: string;
}
