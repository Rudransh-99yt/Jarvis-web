// ============================================================================
// J.A.R.V.I.S. EDUCATION OS — KNOWLEDGE ASSETS & REUSE INTELLIGENCE
// Domain Models, Provenance Taxonomy, Validation Rules, and Decision Contracts
// ============================================================================

import type { Question, QuestionDifficulty, QuestionSourceCategory } from './questionIntelligence.ts';
import type { QuestionNoveltyMode } from './questionExposure.ts';

/**
 * Supported Knowledge Asset Types (extensible, provider-neutral)
 */
export type KnowledgeAssetType =
  | 'QUESTION_SET'
  | 'PDF'
  | 'NOTES'
  | 'FLASHCARD_SET';

/**
 * Strict provenance taxonomy for Knowledge Assets.
 * Never claim reused content came from a new generation.
 */
export type AssetProvenanceType =
  | 'USER_CREATED'
  | 'JARVIS_GENERATED'
  | 'SOURCE_GROUNDED'
  | 'TEACHER_CREATED'
  | 'INSTITUTION_CREATED'
  | 'WEB_RETRIEVED';

/**
 * Deterministic validation status.
 * Only VALIDATED assets can participate in automatic reuse.
 */
export type AssetValidationStatus =
  | 'UNVALIDATED'
  | 'VALIDATED'
  | 'NEEDS_REVIEW'
  | 'INVALID';

export interface AssetValidationDetail {
  status: AssetValidationStatus;
  validatedAt?: string;
  validator?: string;
  validationScore?: number; // 0.0 - 1.0
  validationNotes?: string;
  checksPassed?: string[];
}

export interface AssetProvenance {
  type: AssetProvenanceType;
  sourceName?: string;
  sourceUri?: string;
  authorId?: string;
  originalGenerationSpec?: Record<string, any>;
  attribution?: string;
  timestamp: string;
}

/**
 * Core KnowledgeAsset abstraction
 */
export interface KnowledgeAsset {
  id: string;
  ownerId: string;
  contextId?: string;
  institutionId?: string;
  workspaceId?: string;
  assetType: KnowledgeAssetType;
  title: string;
  description?: string;
  subject: string;
  topic: string;
  subtopics?: string[];
  concepts?: string[];
  educationLevel: string; // e.g. "Class 10", "Grade 10"
  difficulty: string;     // e.g. "beginner", "intermediate", "advanced", "challenge"
  questionCount?: number;
  provenance: AssetProvenance;
  validation: AssetValidationDetail;
  reusable: boolean;
  contentReference?: string;
  items?: Question[] | Record<string, any>[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deterministic search criteria
 */
export interface AssetSearchCriteria {
  userId?: string;
  contextId?: string;
  institutionId?: string;
  assetType?: KnowledgeAssetType;
  subject?: string;
  topic?: string;
  concepts?: string[];
  educationLevel?: string;
  difficulty?: string;
  minQuestionCount?: number;
  provenance?: AssetProvenanceType;
  validationStatus?: AssetValidationStatus;
  reusableOnly?: boolean;
}

/**
 * Verification details produced by AssetRelevanceVerifier
 */
export interface RelevanceVerificationResult {
  isRelevant: boolean;
  score: number; // 0.0 - 1.0
  mismatches: string[];
  reasons: string[];
  details: {
    topicMatch: boolean;
    subjectMatch: boolean;
    educationLevelMatch: boolean;
    difficultyMatch: boolean;
    quantityAdequate: boolean;
    isValidated: boolean;
    isReusable: boolean;
  };
}

/**
 * Reuse decision outputs
 */
export type ReuseDecisionType = 'REUSE' | 'ADAPT' | 'GENERATE';

export interface ReuseDecision {
  decision: ReuseDecisionType;
  asset?: KnowledgeAsset;
  confidence: number; // 0.0 - 1.0
  reasons: string[];
  adaptationsNeeded?: string[];
  matchedQuestions?: Question[];
  missingQuestionCount?: number;
  details: {
    topicMatch: boolean;
    subjectMatch: boolean;
    educationLevelMatch: boolean;
    difficultyMatch: boolean;
    quantityAdequate: boolean;
    isValidated: boolean;
    isReusable: boolean;
  };
}

export interface QuestionSetReuseRequest {
  subject: string;
  topic: string;
  concepts?: string[];
  educationLevel?: string;
  difficulty?: string;
  questionCount?: number;
  contextId?: string;
  institutionId?: string;
  sourceMode?: string;
  noveltyMode?: QuestionNoveltyMode;
}
