import type {
  Question,
  QuestionEvaluationRequest,
  MasteryEvidence,
  ConfidenceAlignment,
  NextRecommendedAction
} from './types.ts';

/**
 * MasteryEvidenceEngine
 * Transforms student responses into deep pedagogical evidence.
 * Calculates mastery deltas, metacognitive calibration, and actionable next steps.
 */
export class MasteryEvidenceEngine {
  evaluateResponse(
    question: Question,
    request: QuestionEvaluationRequest,
    currentConceptMastery: number = 0.5
  ): MasteryEvidence {
    const isCorrect = this.checkCorrectness(question, request.learnerAnswer);
    const score = isCorrect ? 1.0 : 0.0;

    // Normalize confidence (support both 0-1 and 1-5 scale)
    const rawConfidence = request.learnerConfidence ?? 0.7;
    const confidence = rawConfidence > 1 ? rawConfidence / 5 : rawConfidence;

    // Metacognitive Confidence Alignment
    const confidenceAlignment = this.determineConfidenceAlignment(isCorrect, confidence);

    // Misconception identification
    const misconceptionIdentified = !isCorrect
      ? this.diagnoseMisconception(question, request.learnerAnswer)
      : undefined;

    // Compute Mastery Delta based on difficulty and calibration
    const masteryDelta = this.computeMasteryDelta(
      question.difficulty,
      isCorrect,
      confidenceAlignment
    );

    const updatedConceptMastery = Math.min(
      1.0,
      Math.max(0.0, Math.round((currentConceptMastery + masteryDelta) * 100) / 100)
    );

    // Formulate actionable Next Recommended Action
    const nextAction = this.formulateNextAction(
      question,
      isCorrect,
      updatedConceptMastery,
      misconceptionIdentified
    );

    // Generate feedback text
    const feedbackTitle = isCorrect
      ? (confidenceAlignment === 'underconfident' ? 'Correct — Trust Your Intuition!' : 'Concept Verified')
      : (confidenceAlignment === 'overconfident' ? 'Conceptual Mismatch Detected' : 'Review Required');

    return {
      questionId: question.id,
      concept: question.concept,
      prerequisiteConcepts: question.prerequisiteConcepts,
      isCorrect,
      score,
      difficulty: question.difficulty,
      confidenceAlignment,
      misconceptionIdentified,
      masteryDelta,
      previousConceptMastery: currentConceptMastery,
      updatedConceptMastery,
      feedback: {
        title: feedbackTitle,
        explanation: question.explanation,
        citation: question.citation,
        sourceReference: question.sourceReference,
        misconceptionAnalysis: misconceptionIdentified,
        nextRecommendedAction: nextAction
      },
      timestamp: new Date().toISOString()
    };
  }

  private checkCorrectness(question: Question, learnerAnswer: any): boolean {
    if (learnerAnswer === undefined || learnerAnswer === null) {
      return false;
    }

    // Numerical check
    if (question.questionType === 'numerical' && typeof question.answer === 'number') {
      const numAnswer = typeof learnerAnswer === 'number' ? learnerAnswer : parseFloat(String(learnerAnswer).trim());
      if (isNaN(numAnswer)) return false;
      return Math.abs(numAnswer - question.answer) <= 0.05;
    }

    // Multi-select check
    if (Array.isArray(question.answer) && Array.isArray(learnerAnswer)) {
      if (question.answer.length !== learnerAnswer.length) return false;
      const sortedExpected = [...question.answer].map(String).sort();
      const sortedGiven = [...learnerAnswer].map(String).sort();
      return sortedExpected.every((val, idx) => val.toLowerCase() === sortedGiven[idx].toLowerCase());
    }

    // Boolean check
    if (typeof question.answer === 'boolean') {
      const boolVal = typeof learnerAnswer === 'boolean'
        ? learnerAnswer
        : String(learnerAnswer).toLowerCase() === 'true';
      return boolVal === question.answer;
    }

    // String / Multiple Choice check (support option index or text)
    if (typeof question.answer === 'string') {
      const cleanExpected = question.answer.trim().toLowerCase();
      const cleanGiven = String(learnerAnswer).trim().toLowerCase();

      if (cleanExpected === cleanGiven) return true;

      // If learner provided option index e.g. 0, 1, 2
      if (question.options && typeof learnerAnswer === 'number' && question.options[learnerAnswer]) {
        return question.options[learnerAnswer].trim().toLowerCase() === cleanExpected;
      }
    }

    return false;
  }

  private determineConfidenceAlignment(isCorrect: boolean, confidence: number): ConfidenceAlignment {
    if (confidence >= 0.75) {
      return isCorrect ? 'calibrated_high' : 'overconfident';
    }
    if (confidence <= 0.4) {
      return isCorrect ? 'underconfident' : 'calibrated_low';
    }
    return isCorrect ? 'calibrated_high' : 'calibrated_low';
  }

  private diagnoseMisconception(question: Question, learnerAnswer: any): string | undefined {
    if (question.questionType === 'misconception_diagnosis') {
      return 'Conflating normal contact constraint force with fundamental gravitational attraction on an incline.';
    }

    if (question.concept.toLowerCase().includes('newton')) {
      const answerStr = String(learnerAnswer).toLowerCase();
      if (answerStr.includes('normal force') && (answerStr.includes('table') || answerStr.includes('book'))) {
        return 'Misidentifying normal force on the same body as the 3rd law gravitational reaction partner (pairs must act on different interacting bodies).';
      }
      if (answerStr.includes('zero') || answerStr.includes('rest')) {
        return 'Aristotelian misconception: assuming velocity requires a persistent net force to maintain uniform motion.';
      }
    }

    return undefined;
  }

  private computeMasteryDelta(
    difficulty: string,
    isCorrect: boolean,
    alignment: ConfidenceAlignment
  ): number {
    if (isCorrect) {
      let delta = 0.08;
      if (difficulty === 'challenge') delta = 0.16;
      else if (difficulty === 'advanced') delta = 0.12;
      else if (difficulty === 'intermediate') delta = 0.08;
      else if (difficulty === 'beginner') delta = 0.05;

      // Small bonus if calibrated well
      if (alignment === 'calibrated_high') delta += 0.02;
      return Math.round(delta * 100) / 100;
    } else {
      let penalty = -0.05;
      if (difficulty === 'challenge') penalty = -0.02; // Small penalty on stretch challenge
      else if (difficulty === 'advanced') penalty = -0.04;
      else if (difficulty === 'intermediate') penalty = -0.06;
      else if (difficulty === 'beginner') penalty = -0.07;

      // Soften penalty if learner knew they were uncertain
      if (alignment === 'calibrated_low') penalty *= 0.7;
      return Math.round(penalty * 100) / 100;
    }
  }

  private formulateNextAction(
    question: Question,
    isCorrect: boolean,
    newMastery: number,
    misconception?: string
  ): NextRecommendedAction {
    if (isCorrect) {
      if (question.difficulty === 'challenge' || newMastery >= 0.85) {
        return {
          action: 'advance_difficulty',
          targetConcept: `${question.concept} (Synthesis & Advanced Applications)`,
          reason: 'Conceptual mastery verified. Ready for multi-variable problem sets.'
        };
      }
      return {
        action: 'practice_similar',
        targetConcept: question.concept,
        reason: 'Solidify consistent accuracy across variation problems.'
      };
    }

    // Incorrect response
    if (question.prerequisiteConcepts.length > 0 && question.difficulty === 'beginner') {
      return {
        action: 'review_prerequisite',
        targetConcept: question.prerequisiteConcepts[0],
        reason: `Diagnostic showed foundational gap in ${question.prerequisiteConcepts[0]}.`
      };
    }

    if (question.sourceReference) {
      return {
        action: 'review_source_material',
        targetConcept: question.concept,
        reason: `Review ${question.sourceReference.title || 'course text'} ${question.sourceReference.section || 'core section'} (p. ${question.sourceReference.pageNumber || 'assigned'}).`,
        sourceReference: question.sourceReference
      };
    }

    if (misconception) {
      return {
        action: 'practice_similar',
        targetConcept: question.concept,
        reason: `Re-evaluate assumptions regarding: ${misconception}`
      };
    }

    return {
      action: 'practice_similar',
      targetConcept: question.concept,
      reason: 'Reinforce target concept with guided solution steps.'
    };
  }
}
