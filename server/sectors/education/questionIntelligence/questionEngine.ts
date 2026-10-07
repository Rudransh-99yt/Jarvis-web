import { SourceQuestionProvider } from './providers/sourceQuestionProvider.ts';
import { DeterministicQuestionProvider } from './providers/deterministicQuestionProvider.ts';
import { GeneratedQuestionProvider } from './providers/generatedQuestionProvider.ts';
import { ExternalQuestionProvider } from './providers/externalQuestionProvider.ts';
import { QuestionSelectionEngine } from './selectionEngine.ts';
import { MasteryEvidenceEngine } from './masteryEvidenceEngine.ts';
import type {
  LearnerMasteryContext,
  PracticeSet,
  Question,
  QuestionEvaluationRequest,
  MasteryEvidence,
  QuestionQuery,
  QuestionSourceMode
} from './types.ts';

/**
 * QuestionEngine
 * Primary entry point for Question Intelligence in Jarvis Education OS.
 * Composes multi-source providers, deterministic adaptive selection, and mastery evidence.
 */
export class QuestionEngine {
  readonly sourceProvider: SourceQuestionProvider;
  readonly deterministicProvider: DeterministicQuestionProvider;
  readonly generatedProvider: GeneratedQuestionProvider;
  readonly externalProvider: ExternalQuestionProvider;

  readonly selectionEngine: QuestionSelectionEngine;
  readonly masteryEvidenceEngine: MasteryEvidenceEngine;

  constructor() {
    this.sourceProvider = new SourceQuestionProvider();
    this.deterministicProvider = new DeterministicQuestionProvider();
    this.generatedProvider = new GeneratedQuestionProvider();
    this.externalProvider = new ExternalQuestionProvider();

    this.selectionEngine = new QuestionSelectionEngine({
      sourceProvider: this.sourceProvider,
      deterministicProvider: this.deterministicProvider,
      generatedProvider: this.generatedProvider,
      externalProvider: this.externalProvider
    });

    this.masteryEvidenceEngine = new MasteryEvidenceEngine();
  }

  /**
   * Generates a pedagogically calibrated adaptive practice set
   */
  async getPracticeSet(context: LearnerMasteryContext): Promise<PracticeSet> {
    return this.selectionEngine.selectPracticeSet(context);
  }

  /**
   * Evaluates student response and yields mastery evidence
   */
  async evaluateQuestion(
    request: QuestionEvaluationRequest,
    currentConceptMastery: number = 0.5
  ): Promise<MasteryEvidence> {
    const question = await this.getQuestionById(request.questionId);
    if (!question) {
      throw new Error(`Question not found with id: ${request.questionId}`);
    }

    return this.masteryEvidenceEngine.evaluateResponse(
      question,
      request,
      currentConceptMastery
    );
  }

  /**
   * Look up a question across all registered providers
   */
  async getQuestionById(id: string): Promise<Question | null> {
    const providers = [
      this.sourceProvider,
      this.deterministicProvider,
      this.generatedProvider,
      this.externalProvider
    ];

    for (const provider of providers) {
      const candidates = await provider.getQuestions({
        subject: '',
        concept: ''
      });
      const found = candidates.find((q) => q.id === id);
      if (found) return found;
    }

    return null;
  }

  /**
   * List questions matching query across all providers
   */
  async listQuestions(query: QuestionQuery): Promise<Question[]> {
    const [source, det, gen, ext] = await Promise.all([
      this.sourceProvider.getQuestions(query),
      this.deterministicProvider.getQuestions(query),
      this.generatedProvider.getQuestions(query),
      this.externalProvider.getQuestions(query)
    ]);

    const seen = new Set<string>();
    const all = [...source, ...det, ...gen, ...ext].filter((q) => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    if (query.limit && query.limit > 0) {
      return all.slice(0, query.limit);
    }
    return all;
  }

  /**
   * Add source-grounded questions from an uploaded document or textbook
   */
  registerSourceQuestions(questions: Question[]): void {
    this.sourceProvider.addSourceQuestions(questions);
  }

  /**
   * Return metadata about registered question providers
   */
  async getProviders() {
    return [
      {
        id: this.sourceProvider.id,
        name: this.sourceProvider.name,
        sourceCategory: this.sourceProvider.sourceCategory,
        available: await this.sourceProvider.isAvailable()
      },
      {
        id: this.deterministicProvider.id,
        name: this.deterministicProvider.name,
        sourceCategory: this.deterministicProvider.sourceCategory,
        available: await this.deterministicProvider.isAvailable()
      },
      {
        id: this.generatedProvider.id,
        name: this.generatedProvider.name,
        sourceCategory: this.generatedProvider.sourceCategory,
        available: await this.generatedProvider.isAvailable()
      },
      {
        id: this.externalProvider.id,
        name: this.externalProvider.name,
        sourceCategory: this.externalProvider.sourceCategory,
        available: await this.externalProvider.isAvailable()
      }
    ];
  }

  /**
   * Return supported source modes with transparent pedagogical descriptions
   */
  getSourceModes(): { mode: QuestionSourceMode; title: string; description: string }[] {
    return [
      {
        mode: 'SOURCE_ONLY',
        title: 'Source Only (Book-Only)',
        description: 'Strictly grounded in your uploaded document or course textbook. Never introduces external or unverified content.'
      },
      {
        mode: 'SOURCE_PLUS_JARVIS',
        title: 'Source + Jarvis Generated',
        description: 'Combines faithful source questions with structured diagnostic and application practice generated by Jarvis.'
      },
      {
        mode: 'SOURCE_PLUS_WEB',
        title: 'Source + Web Context',
        description: 'Enriches your source material with attributed open academic references and real-world problems.'
      },
      {
        mode: 'FULL_ADAPTIVE',
        title: 'Full Adaptive Learning',
        description: 'Jarvis autonomously calibrates the optimal mix of source, prerequisite, and challenge items for peak mastery.'
      }
    ];
  }
}

// Global Singleton Instance
export const questionEngine = new QuestionEngine();
