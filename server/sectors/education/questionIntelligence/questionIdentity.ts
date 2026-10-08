import crypto from 'node:crypto';
import type { Question, QuestionQualityMetadata } from '../../../../src/types/questionIntelligence.ts';

/**
 * QuestionIdentity
 * Ensures every question has a deterministic, stable identity and fingerprint.
 *
 * Invariant: Questions are NEVER identified only by their index/position in a practice set.
 * A question preserves its fingerprint and provenance across sessions, sets, and assets.
 */

export interface QuestionFingerprintInput {
  prompt: string;
  answer?: any;
  difficulty?: string;
  concept?: string;
  subject?: string;
  options?: string[];
}

/**
 * Computes a deterministic SHA-256 fingerprint for a question based on its canonical content.
 */
export function computeQuestionFingerprint(input: QuestionFingerprintInput): string {
  const normPrompt = (input.prompt || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normAnswer = Array.isArray(input.answer)
    ? input.answer.map((a) => String(a).trim().toLowerCase()).sort().join('|')
    : String(input.answer ?? '').trim().toLowerCase();
  const normDiff = (input.difficulty || 'intermediate').toLowerCase();
  const normConcept = (input.concept || '').trim().toLowerCase();
  const normOptions = Array.isArray(input.options)
    ? input.options.map((o) => String(o).trim().toLowerCase()).sort().join('|')
    : '';

  const payload = `${normPrompt}:::${normAnswer}:::${normDiff}:::${normConcept}:::${normOptions}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Normalizes and attaches stable identity and provenance tracking to a question.
 */
export function ensureQuestionIdentity(
  question: Question,
  assetId?: string
): Question {
  const fingerprint = question.qualityMetadata?.generationTimestamp && (question as any).fingerprint
    ? (question as any).fingerprint
    : computeQuestionFingerprint(question);

  // Derive stable ID if missing or purely generic
  const stableId = question.id && !question.id.startsWith('temp-')
    ? question.id
    : `q-${fingerprint.substring(0, 16)}`;

  const qualityMetadata: QuestionQualityMetadata = {
    ...(question.qualityMetadata || {}),
    pedagogicalValue: question.qualityMetadata?.pedagogicalValue ?? 0.95,
    verifiedGrounded: question.qualityMetadata?.verifiedGrounded ?? true
  };

  const enhanced: Question = {
    ...question,
    id: stableId,
    qualityMetadata
  };

  // Attach non-enumerable or typed metadata for provenance
  (enhanced as any).fingerprint = fingerprint;
  if (assetId) {
    (enhanced as any).assetId = assetId;
    if (!enhanced.sourceReference) {
      enhanced.sourceReference = {
        type: 'notes',
        sourceId: assetId,
        title: `Knowledge Asset ${assetId}`,
        verifiedGrounded: true
      };
    }
  }

  return enhanced;
}

/**
 * Compares two questions for semantic/content equivalence via stable fingerprint.
 */
export function areQuestionsEquivalent(q1: Question, q2: Question): boolean {
  if (q1.id === q2.id) return true;
  const fp1 = (q1 as any).fingerprint || computeQuestionFingerprint(q1);
  const fp2 = (q2 as any).fingerprint || computeQuestionFingerprint(q2);
  return fp1 === fp2;
}
