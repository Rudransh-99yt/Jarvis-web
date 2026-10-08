import type { AuthenticatedPrincipal } from '../../../auth/principal.ts';
import type {
  KnowledgeAsset,
  ReuseDecision,
  ReuseDecisionType,
  QuestionSetReuseRequest
} from '../../../../src/types/knowledgeAsset.ts';
import type { Question } from '../../../../src/types/questionIntelligence.ts';
import { knowledgeAssetStore } from './knowledgeAssetStore.ts';
import { assetRelevanceVerifier } from './assetRelevanceVerifier.ts';

export class ReuseDecisionEngine {
  /**
   * Deterministically evaluates whether a request can REUSE, ADAPT, or must GENERATE from scratch.
   * Completely deterministic, 100% explainable, zero LLM reliance.
   */
  async evaluateQuestionSetRequest(
    request: QuestionSetReuseRequest,
    principal: AuthenticatedPrincipal
  ): Promise<ReuseDecision> {
    const requestedCount = request.questionCount ?? 10;

    // 1. Search for candidate assets matching subject and topic
    // First query validated and reusable candidates
    const candidates = await knowledgeAssetStore.searchAssets(
      {
        subject: request.subject,
        topic: request.topic,
        assetType: 'QUESTION_SET',
        contextId: request.contextId,
        reusableOnly: false // Fetch all candidates so we can explain why unvalidated ones were rejected
      },
      principal
    );

    if (candidates.length === 0) {
      return {
        decision: 'GENERATE',
        confidence: 1.0,
        reasons: [
          `No existing knowledge asset found for topic '${request.topic}' in ${request.subject}.`,
          'Direct generation through Question Intelligence providers required.'
        ],
        missingQuestionCount: requestedCount,
        details: {
          topicMatch: false,
          subjectMatch: false,
          educationLevelMatch: false,
          difficultyMatch: false,
          quantityAdequate: false,
          isValidated: false,
          isReusable: false
        }
      };
    }

    // 2. Deterministically evaluate each candidate
    let bestCandidate: KnowledgeAsset | null = null;
    let bestScore = -1;
    let bestVerification = null;

    for (const candidate of candidates) {
      const verification = assetRelevanceVerifier.verifyRelevance(candidate, request);
      if (verification.score > bestScore) {
        bestScore = verification.score;
        bestCandidate = candidate;
        bestVerification = verification;
      }
    }

    if (!bestCandidate || !bestVerification) {
      return {
        decision: 'GENERATE',
        confidence: 1.0,
        reasons: ['No viable candidate assets passed initial screening.'],
        missingQuestionCount: requestedCount,
        details: {
          topicMatch: false,
          subjectMatch: false,
          educationLevelMatch: false,
          difficultyMatch: false,
          quantityAdequate: false,
          isValidated: false,
          isReusable: false
        }
      };
    }

    const { details, mismatches } = bestVerification;
    const availableCount = bestCandidate.questionCount ?? (Array.isArray(bestCandidate.items) ? bestCandidate.items.length : 0);
    const candidateItems = Array.isArray(bestCandidate.items) ? (bestCandidate.items as Question[]) : [];

    // CASE 1: Unvalidated or Non-reusable candidate
    if (!details.isValidated || !details.isReusable) {
      return {
        decision: 'GENERATE',
        asset: bestCandidate,
        confidence: 0.95,
        reasons: [
          `Candidate asset '${bestCandidate.title}' was found, but cannot be automatically reused.`,
          ...mismatches,
          'Unvalidated assets must not participate in automatic reuse. Generation required.'
        ],
        missingQuestionCount: requestedCount,
        details
      };
    }

    // CASE 2: Topic Mismatch or Education Level Mismatch -> HARD BLOCKER -> GENERATE
    if (!details.topicMatch || !details.educationLevelMatch) {
      return {
        decision: 'GENERATE',
        asset: bestCandidate,
        confidence: 0.95,
        reasons: [
          `Candidate asset '${bestCandidate.title}' rejected due to structural curriculum mismatch:`,
          ...mismatches,
          'Curriculum integrity prevents cross-grade or unrelated-topic reuse. Direct generation required.'
        ],
        missingQuestionCount: requestedCount,
        details
      };
    }

    // CASE 3: Difficulty Mismatch
    if (!details.difficultyMatch) {
      // If difficulty doesn't match: can we adapt or must we generate?
      const adaptationsNeeded = [
        `Difficulty mismatch: candidate has '${bestCandidate.difficulty}' while '${request.difficulty}' was requested.`,
        'Adaptation required: recalibrate question reasoning level and distractor complexity to target difficulty.'
      ];

      return {
        decision: 'ADAPT',
        asset: bestCandidate,
        confidence: 0.85,
        reasons: [
          `Matching topic and education level found in '${bestCandidate.title}'.`,
          `Difficulty differs (${bestCandidate.difficulty} vs requested ${request.difficulty}).`,
          'Can reuse foundational conceptual structure and adapt difficulty parameters.'
        ],
        adaptationsNeeded,
        matchedQuestions: candidateItems.slice(0, Math.min(requestedCount, availableCount)),
        missingQuestionCount: Math.max(0, requestedCount - availableCount),
        details
      };
    }

    // CASE 4: Insufficient Quantity -> ADAPT
    if (!details.quantityAdequate) {
      const missingCount = requestedCount - availableCount;
      const adaptationsNeeded = [
        `Candidate contains ${availableCount} verified questions, but ${requestedCount} were requested.`,
        `Need to generate ${missingCount} additional complementary questions to fulfill total count.`
      ];

      return {
        decision: 'ADAPT',
        asset: bestCandidate,
        confidence: 0.90,
        reasons: [
          `Exact topic, education level, and difficulty matched in '${bestCandidate.title}'.`,
          `Candidate has ${availableCount} verified questions (insufficient for requested ${requestedCount}).`,
          `Reusing ${availableCount} verified questions and adapting remaining ${missingCount} questions.`
        ],
        adaptationsNeeded,
        matchedQuestions: candidateItems,
        missingQuestionCount: missingCount,
        details
      };
    }

    // CASE 5: Perfect Match (Topic, Level, Difficulty, Validated, Quantity Adequate) -> REUSE!
    const reusedSlice = candidateItems.slice(0, requestedCount);

    return {
      decision: 'REUSE',
      asset: bestCandidate,
      confidence: 0.98,
      reasons: [
        `Exact curriculum topic match: '${bestCandidate.topic}' for ${bestCandidate.educationLevel}.`,
        `Candidate is VALIDATED (${bestCandidate.validation.validator || 'curriculum verifier'}) and certified reusable.`,
        `Difficulty aligned: ${bestCandidate.difficulty}.`,
        `Available verified questions (${availableCount}) satisfies requested count (${requestedCount}).`,
        'Reusing existing verified knowledge asset without expensive model generation.'
      ],
      matchedQuestions: reusedSlice,
      missingQuestionCount: 0,
      details
    };
  }
}

export const reuseDecisionEngine = new ReuseDecisionEngine();
