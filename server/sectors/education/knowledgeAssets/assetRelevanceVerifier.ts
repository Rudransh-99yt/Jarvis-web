import type {
  KnowledgeAsset,
  RelevanceVerificationResult,
  QuestionSetReuseRequest
} from '../../../../src/types/knowledgeAsset.ts';

export class AssetRelevanceVerifier {
  /**
   * Normalize education level strings (e.g. "Class 10", "Grade 10", "10th" -> "10")
   */
  normalizeEducationLevel(level?: string): string {
    if (!level) return '';
    const clean = level.toLowerCase().replace(/^(class|grade|standard|std)\s*/i, '').trim();
    const match = clean.match(/\d+/);
    return match ? match[0] : clean;
  }

  /**
   * Normalize difficulty string to canonical bucket ('beginner', 'intermediate', 'advanced', 'challenge')
   */
  normalizeDifficulty(diff?: string): string {
    if (!diff) return 'intermediate';
    const lower = diff.toLowerCase().trim();
    if (lower === 'easy' || lower === 'beginner' || lower === 'introductory') return 'beginner';
    if (lower === 'medium' || lower === 'intermediate' || lower === 'standard') return 'intermediate';
    if (lower === 'hard' || lower === 'advanced' || lower === 'expert') return 'advanced';
    if (lower === 'challenge' || lower === 'olympiad' || lower === 'competition') return 'challenge';
    return lower;
  }

  /**
   * Normalize subject string
   */
  normalizeSubject(subject?: string): string {
    if (!subject) return '';
    const lower = subject.toLowerCase().trim();
    if (lower === 'math' || lower === 'mathematics' || lower === 'maths') return 'mathematics';
    if (lower === 'physics' || lower === 'phys') return 'physics';
    if (lower === 'chem' || lower === 'chemistry') return 'chemistry';
    if (lower === 'bio' || lower === 'biology') return 'biology';
    return lower;
  }

  /**
   * Normalize topic string
   */
  normalizeTopic(topic?: string): string {
    if (!topic) return '';
    return topic.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Deterministically verify the relevance of a candidate asset against a target request.
   * Completely explainable, zero LLM reliance.
   */
  verifyRelevance(
    asset: KnowledgeAsset,
    request: QuestionSetReuseRequest
  ): RelevanceVerificationResult {
    const mismatches: string[] = [];
    const reasons: string[] = [];

    // 1. Validation & Reusability Verification
    const isValidated = asset.validation.status === 'VALIDATED';
    const isReusable = asset.reusable === true;

    if (!isValidated) {
      mismatches.push(`Asset validation status is '${asset.validation.status}' (only 'VALIDATED' assets qualify for automatic reuse)`);
    } else {
      reasons.push(`Asset is verified as VALIDATED by ${asset.validation.validator || 'system verification'}`);
    }

    if (!isReusable) {
      mismatches.push('Asset reusable flag is false (automatic reuse prohibited)');
    }

    // 2. Subject Verification
    const reqSub = this.normalizeSubject(request.subject);
    const assetSub = this.normalizeSubject(asset.subject);
    const subjectMatch = !reqSub || !assetSub || reqSub === assetSub;

    if (!subjectMatch) {
      mismatches.push(`Subject mismatch: requested '${request.subject}', candidate is '${asset.subject}'`);
    } else if (reqSub && assetSub) {
      reasons.push(`Subject matched: ${asset.subject}`);
    }

    // 3. Topic Verification
    const reqTopic = this.normalizeTopic(request.topic);
    const assetTopic = this.normalizeTopic(asset.topic);
    const topicExactMatch = Boolean(reqTopic && assetTopic && reqTopic === assetTopic);
    const topicSubMatch = Boolean(
      reqTopic && assetTopic && (assetTopic.includes(reqTopic) || reqTopic.includes(assetTopic))
    );
    const topicMatch = topicExactMatch || topicSubMatch;

    if (!topicMatch) {
      mismatches.push(`Unrelated topic: requested '${request.topic}', candidate is '${asset.topic}'`);
    } else {
      reasons.push(`Topic matched: '${asset.topic}' (exact=${topicExactMatch})`);
    }

    // 4. Education Level Verification
    const reqLevel = this.normalizeEducationLevel(request.educationLevel);
    const assetLevel = this.normalizeEducationLevel(asset.educationLevel);
    const educationLevelMatch = !reqLevel || !assetLevel || reqLevel === assetLevel;

    if (!educationLevelMatch) {
      mismatches.push(
        `Education level mismatch: requested '${request.educationLevel}', candidate is '${asset.educationLevel}'`
      );
    } else if (reqLevel && assetLevel) {
      reasons.push(`Education level aligned: ${asset.educationLevel}`);
    }

    // 5. Difficulty Verification
    const reqDiff = this.normalizeDifficulty(request.difficulty);
    const assetDiff = this.normalizeDifficulty(asset.difficulty);
    const difficultyMatch = !request.difficulty || reqDiff === assetDiff;

    if (!difficultyMatch) {
      mismatches.push(
        `Difficulty mismatch: requested '${request.difficulty}' (${reqDiff}), candidate is '${asset.difficulty}' (${assetDiff})`
      );
    } else if (request.difficulty) {
      reasons.push(`Difficulty calibrated: ${asset.difficulty}`);
    }

    // 6. Quantity Verification
    const requestedCount = request.questionCount ?? 10;
    const availableCount = asset.questionCount ?? (Array.isArray(asset.items) ? asset.items.length : 0);
    const quantityAdequate = availableCount >= requestedCount;

    if (!quantityAdequate && request.questionCount !== undefined) {
      mismatches.push(
        `Insufficient question count: requested ${requestedCount}, candidate contains only ${availableCount}`
      );
    } else if (request.questionCount !== undefined) {
      reasons.push(`Quantity adequate: ${availableCount} questions available (>= ${requestedCount} requested)`);
    }

    // Determine overall relevance
    // Critical blockers: invalid status, non-reusable, unrelated topic, education level mismatch
    const isRelevant = isValidated && isReusable && topicMatch && educationLevelMatch && subjectMatch;

    let score = 0;
    if (isValidated && isReusable) score += 0.3;
    if (topicMatch) score += topicExactMatch ? 0.3 : 0.2;
    if (educationLevelMatch) score += 0.15;
    if (subjectMatch) score += 0.1;
    if (difficultyMatch) score += 0.1;
    if (quantityAdequate) score += 0.05;

    return {
      isRelevant,
      score: Math.min(1.0, score),
      mismatches,
      reasons,
      details: {
        topicMatch,
        subjectMatch,
        educationLevelMatch,
        difficultyMatch,
        quantityAdequate,
        isValidated,
        isReusable
      }
    };
  }
}

export const assetRelevanceVerifier = new AssetRelevanceVerifier();
