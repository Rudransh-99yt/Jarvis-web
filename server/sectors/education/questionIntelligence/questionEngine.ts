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
  QuestionSourceMode,
  SelectedQuestionItem
} from './types.ts';
import { reuseDecisionEngine } from '../knowledgeAssets/reuseDecisionEngine.ts';
import { knowledgeAssetStore } from '../knowledgeAssets/knowledgeAssetStore.ts';
import type { KnowledgeAsset, QuestionSetReuseRequest, ReuseDecision } from '../../../../src/types/knowledgeAsset.ts';
import type { AuthenticatedPrincipal } from '../../../auth/principal.ts';
import { artifactRegistrationService } from '../knowledgeAssets/artifactRegistrationService.ts';
import { learnerExposureStore } from './learnerExposureStore.ts';
import { novelQuestionSelector } from './novelQuestionSelector.ts';
import { ensureQuestionIdentity } from './questionIdentity.ts';
import type {
  QuestionNoveltyMode,
  NoveltySelectionResult,
  LearnerExposureSummary
} from '../../../../src/types/questionExposure.ts';

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
   * Deterministically evaluates whether a request should REUSE, ADAPT, or GENERATE
   */
  async evaluateReuse(
    request: QuestionSetReuseRequest,
    principal: AuthenticatedPrincipal
  ): Promise<ReuseDecision> {
    return reuseDecisionEngine.evaluateQuestionSetRequest(request, principal);
  }

  /**
   * Intelligent Practice Set generation with verified Knowledge Asset reuse.
   * RETRIEVE -> VERIFY -> REUSE -> ADAPT -> GENERATE
   * Never spends expensive generation on already verified questions.
   * Strictly respects source mode & source hierarchy.
   */
  async getPracticeSetWithReuse(
    context: LearnerMasteryContext,
    principal: AuthenticatedPrincipal
  ): Promise<{ practiceSet: PracticeSet; reuseDecision: ReuseDecision; reusedAssetId?: string }> {
    const requestedCount = context.targetCount || 10;
    const reuseRequest: QuestionSetReuseRequest = {
      subject: context.subject,
      topic: context.targetConcept,
      educationLevel: 'Class 10',
      questionCount: requestedCount,
      contextId: context.currentLessonId,
      sourceMode: context.sourceMode
    };

    const decision = await this.evaluateReuse(reuseRequest, principal);

    // Enforce strict Source Hierarchy:
    // If sourceMode is SOURCE_ONLY, only assets with SOURCE_GROUNDED, USER_CREATED, or TEACHER_CREATED are permitted.
    if (context.sourceMode === 'SOURCE_ONLY' && decision.asset) {
      const allowedSources = ['SOURCE_GROUNDED', 'USER_CREATED', 'TEACHER_CREATED'];
      if (!allowedSources.includes(decision.asset.provenance.type)) {
        const practiceSet = await this.selectionEngine.selectPracticeSet(context);
        return {
          practiceSet,
          reuseDecision: {
            ...decision,
            decision: 'GENERATE',
            reasons: [
              ...decision.reasons,
              `SOURCE_ONLY mode strictly rejects non-source asset provenance '${decision.asset.provenance.type}'. Generating purely from source material.`
            ]
          }
        };
      }
    }

    if (decision.decision === 'REUSE' && decision.matchedQuestions && decision.matchedQuestions.length > 0) {
      const selectedItems: SelectedQuestionItem[] = (decision.matchedQuestions as Question[]).map((q: Question, idx: number) => ({
        question: q,
        selectionReason: `[Verified Knowledge Asset] Reused from '${decision.asset?.title}' (${q.qualityMetadata?.pedagogicalValue ? Math.round(q.qualityMetadata.pedagogicalValue * 100) : 95}% verified quality)`,
        targetedAspect: 'conceptual_reinforcement',
        rank: idx + 1
      }));

      const sourceCount = selectedItems.filter((i) => i.question.source === 'SOURCE').length;
      const jarvisCount = selectedItems.filter((i) => i.question.source === 'JARVIS_GENERATED').length;
      const webCount = selectedItems.filter((i) => i.question.source === 'WEB_RETRIEVED').length;
      const teacherCount = selectedItems.filter((i) => i.question.source === 'TEACHER_CREATED').length;
      const institutionCount = selectedItems.filter((i) => i.question.source === 'INSTITUTION_CREATED').length;

      const practiceSet: PracticeSet = {
        id: `pset-reused-${Date.now().toString(36)}`,
        title: `${context.targetConcept} Adaptive Practice Set (Reused Verified Asset)`,
        subject: context.subject,
        targetConcept: context.targetConcept,
        learningObjective: context.learningObjective || `Mastery of ${context.targetConcept}`,
        sourceMode: context.sourceMode,
        totalQuestions: selectedItems.length,
        breakdown: {
          sourceGroundedCount: sourceCount,
          prerequisiteCount: 0,
          conceptualCount: selectedItems.length,
          applicationCount: 0,
          challengeCount: 0,
          sourceBreakdown: {
            SOURCE: sourceCount,
            JARVIS_GENERATED: jarvisCount,
            WEB_RETRIEVED: webCount,
            TEACHER_CREATED: teacherCount,
            INSTITUTION_CREATED: institutionCount
          }
        },
        selectionRationale: `[Knowledge Asset Reused] Reused ${selectedItems.length} verified items from '${decision.asset?.title}'. 0 LLM calls consumed.`,
        questions: selectedItems,
        generatedAt: new Date().toISOString()
      };

      return {
        practiceSet,
        reuseDecision: decision,
        reusedAssetId: decision.asset?.id
      };
    }

    if (decision.decision === 'ADAPT' && decision.matchedQuestions && decision.matchedQuestions.length > 0) {
      const missingCount = decision.missingQuestionCount || (requestedCount - decision.matchedQuestions.length);
      const reusedItems: SelectedQuestionItem[] = (decision.matchedQuestions as Question[]).map((q: Question, idx: number) => ({
        question: q,
        selectionReason: `[Verified Asset Reused] Reused from '${decision.asset?.title}'`,
        targetedAspect: 'conceptual_reinforcement',
        rank: idx + 1
      }));

      const existingIds = new Set<string>((decision.matchedQuestions as Question[]).map((q: Question) => q.id));
      const adaptedContext: LearnerMasteryContext = {
        ...context,
        targetCount: missingCount,
        questionHistory: [...(context.questionHistory || []), ...Array.from(existingIds)]
      };

      const partialSet = await this.selectionEngine.selectPracticeSet(adaptedContext);
      const combinedItems = [
        ...reusedItems,
        ...partialSet.questions.map((item, idx) => ({
          ...item,
          rank: reusedItems.length + idx + 1
        }))
      ];

      const practiceSet: PracticeSet = {
        id: `pset-adapted-${Date.now().toString(36)}`,
        title: `${context.targetConcept} Adaptive Practice Set (Adapted Asset + Complements)`,
        subject: context.subject,
        targetConcept: context.targetConcept,
        learningObjective: context.learningObjective || `Mastery of ${context.targetConcept}`,
        sourceMode: context.sourceMode,
        totalQuestions: combinedItems.length,
        breakdown: {
          sourceGroundedCount: combinedItems.filter((i) => i.question.source === 'SOURCE').length,
          prerequisiteCount: partialSet.breakdown.prerequisiteCount,
          conceptualCount: combinedItems.length,
          applicationCount: partialSet.breakdown.applicationCount,
          challengeCount: partialSet.breakdown.challengeCount,
          sourceBreakdown: {
            SOURCE: combinedItems.filter((i) => i.question.source === 'SOURCE').length,
            JARVIS_GENERATED: combinedItems.filter((i) => i.question.source === 'JARVIS_GENERATED').length,
            WEB_RETRIEVED: combinedItems.filter((i) => i.question.source === 'WEB_RETRIEVED').length,
            TEACHER_CREATED: combinedItems.filter((i) => i.question.source === 'TEACHER_CREATED').length,
            INSTITUTION_CREATED: combinedItems.filter((i) => i.question.source === 'INSTITUTION_CREATED').length
          }
        },
        selectionRationale: `[Knowledge Asset Adapted] Reused ${reusedItems.length} verified items from '${decision.asset?.title}' and dynamically adapted ${partialSet.questions.length} items.`,
        questions: combinedItems,
        generatedAt: new Date().toISOString()
      };

      return {
        practiceSet,
        reuseDecision: decision,
        reusedAssetId: decision.asset?.id
      };
    }

    const practiceSet = await this.selectionEngine.selectPracticeSet(context);
    return {
      practiceSet,
      reuseDecision: decision
    };
  }

  /**
   * Request a question set or PDF with automatic Knowledge Asset reuse, adaptation, or generation,
   * registering the resulting artifact into KnowledgeAssetStore when new content is produced.
   */
  async requestQuestionSetWithReuseAndRegistration(
    spec: {
      subject: string;
      topic: string;
      educationLevel?: string;
      difficulty?: string;
      questionCount?: number;
      contextId?: string;
      institutionId?: string;
      generatePdf?: boolean;
      sharedWithInstitution?: boolean;
    },
    principal: AuthenticatedPrincipal
  ): Promise<{
    decision: ReuseDecision;
    questions: Question[];
    practiceSet?: PracticeSet;
    pdfStorageKey?: string;
    registeredAsset?: KnowledgeAsset;
    reusedExistingAsset: boolean;
  }> {
    const requestedCount = spec.questionCount || 10;
    const educationLevel = spec.educationLevel || 'Class 10';
    const difficulty = spec.difficulty || 'intermediate';

    // 1. Evaluate reuse decision deterministically
    const reuseReq: QuestionSetReuseRequest = {
      subject: spec.subject,
      topic: spec.topic,
      educationLevel,
      difficulty,
      questionCount: requestedCount,
      contextId: spec.contextId,
      institutionId: spec.institutionId
    };

    const decision = await this.evaluateReuse(reuseReq, principal);

    // CASE 1: REUSE — Full reuse of verified candidate asset
    if (decision.decision === 'REUSE' && decision.matchedQuestions && decision.matchedQuestions.length > 0) {
      const sliced = (decision.matchedQuestions as Question[]).slice(0, requestedCount);
      let pdfStorageKey: string | undefined;

      if (spec.generatePdf && decision.asset) {
        const pdfRes = await artifactRegistrationService.generatePdfFromAsset(
          decision.asset,
          sliced.length,
          principal
        );
        pdfStorageKey = pdfRes.storageKey;
      }

      return {
        decision,
        questions: sliced,
        pdfStorageKey,
        registeredAsset: decision.asset,
        reusedExistingAsset: true
      };
    }

    // CASE 2: ADAPT — Partial reuse of compatible items + generate delta
    if (decision.decision === 'ADAPT' && decision.matchedQuestions && decision.matchedQuestions.length > 0) {
      const matched = decision.matchedQuestions as Question[];
      const missingCount = decision.missingQuestionCount || Math.max(0, requestedCount - matched.length);

      let newlyGenerated: Question[] = [];
      if (missingCount > 0) {
        newlyGenerated = await this.generatedProvider.generateQuestions({
          subject: spec.subject,
          concept: spec.topic,
          difficulty: difficulty as any,
          questionType: 'multiple_choice',
          learningObjective: `Targeted practice on ${spec.topic}`,
          count: missingCount
        });
      }

      // Sliced if matched was more than requested
      const reusedSlice = matched.slice(0, requestedCount - newlyGenerated.length);
      const combined = [...reusedSlice, ...newlyGenerated];

      const regResult = await artifactRegistrationService.registerQuestionSet(
        {
          title: `${educationLevel} ${spec.topic} Adapted Set (${combined.length} Items)`,
          subject: spec.subject,
          topic: spec.topic,
          educationLevel,
          difficulty,
          questions: combined,
          contextId: spec.contextId,
          institutionId: spec.institutionId,
          generatePdfArtifact: spec.generatePdf,
          sharedWithInstitution: spec.sharedWithInstitution,
          metadata: {
            adaptedFromAssetId: decision.asset?.id,
            reusedCount: reusedSlice.length,
            generatedCount: newlyGenerated.length
          }
        },
        principal
      );

      return {
        decision,
        questions: combined,
        pdfStorageKey: regResult.storageKey,
        registeredAsset: regResult.asset,
        reusedExistingAsset: false
      };
    }

    // CASE 3: GENERATE — Generate from scratch & register verified artifact
    const generated = await this.generatedProvider.generateQuestions({
      subject: spec.subject,
      concept: spec.topic,
      difficulty: difficulty as any,
      questionType: 'multiple_choice',
      learningObjective: `Comprehensive practice on ${spec.topic}`,
      count: requestedCount
    });

    const regResult = await artifactRegistrationService.registerQuestionSet(
      {
        title: `${educationLevel} ${spec.topic} Question Bank (${generated.length} Items)`,
        subject: spec.subject,
        topic: spec.topic,
        educationLevel,
        difficulty,
        questions: generated,
        contextId: spec.contextId,
        institutionId: spec.institutionId,
        generatePdfArtifact: spec.generatePdf,
        sharedWithInstitution: spec.sharedWithInstitution
      },
      principal
    );

    return {
      decision,
      questions: generated,
      pdfStorageKey: regResult.storageKey,
      registeredAsset: regResult.asset,
      reusedExistingAsset: false
    };
  }

  /**
   * Request a novelty & mastery-aware question set with automatic verified Knowledge Asset reuse.
   * Core principle: "REUSE KNOWLEDGE, NOT THE SAME QUESTIONS."
   *
   * Hierarchy: RETRIEVE -> FILTER SEEN -> VERIFY -> SELECT -> ADAPT -> GENERATE
   * Never re-exposes questions an individual learner has already seen/completed (unless REVIEW requested).
   * Cross-user reuse is 100% supported: Student A completing questions does not make them unavailable to Student B.
   */
  async getNovelPracticeSetWithReuse(
    spec: {
      subject: string;
      topic: string;
      educationLevel?: string;
      difficulty?: string;
      questionCount?: number;
      contextId?: string;
      institutionId?: string;
      noveltyMode?: QuestionNoveltyMode;
      conceptMasteries?: Record<string, number>;
      weaknessConcepts?: string[];
      generatePdf?: boolean;
      sharedWithInstitution?: boolean;
    },
    principal: AuthenticatedPrincipal
  ): Promise<{
    decision: ReuseDecision;
    noveltyResult: NoveltySelectionResult;
    questions: Question[];
    practiceSet: PracticeSet;
    pdfStorageKey?: string;
    registeredAsset?: KnowledgeAsset;
    reusedExistingAsset: boolean;
    exposureSummary: LearnerExposureSummary;
  }> {
    const requestedCount = spec.questionCount || 10;
    const noveltyMode: QuestionNoveltyMode = spec.noveltyMode || 'NEW';
    const educationLevel = spec.educationLevel || 'Class 10';
    const difficulty = spec.difficulty || 'intermediate';
    const contextId = spec.contextId || 'ctx-default';

    // 1. Retrieve candidate verified Knowledge Assets deterministically
    const reuseReq: QuestionSetReuseRequest = {
      subject: spec.subject,
      topic: spec.topic,
      educationLevel,
      difficulty,
      questionCount: requestedCount,
      contextId: spec.contextId,
      institutionId: spec.institutionId
    };

    const initialDecision = await this.evaluateReuse(reuseReq, principal);

    // Collect candidate questions from matched asset or providers
    let candidatePool: Question[] = [];
    let sourceAsset: KnowledgeAsset | undefined = initialDecision.asset;

    if (sourceAsset && Array.isArray(sourceAsset.items) && sourceAsset.items.length > 0) {
      candidatePool = (sourceAsset.items as Question[]).map((q) =>
        ensureQuestionIdentity(q, sourceAsset?.id)
      );
    } else {
      // Fallback candidates from registered providers
      const providerQuestions = await this.listQuestions({
        subject: spec.subject,
        concept: spec.topic,
        difficulty: difficulty as any
      });
      candidatePool = providerQuestions.map((q) => ensureQuestionIdentity(q));
    }

    // 2. Run Novelty & Exposure Selection Engine (RETRIEVE -> FILTER SEEN -> VERIFY -> SELECT)
    const noveltyResult = await novelQuestionSelector.selectQuestions(
      candidatePool,
      principal.userId,
      contextId,
      {
        noveltyMode,
        targetCount: requestedCount,
        conceptMasteries: spec.conceptMasteries,
        weaknessConcepts: spec.weaknessConcepts
      }
    );

    let selectedQuestions = [...noveltyResult.selectedQuestions];
    let reusedExistingAsset = false;
    let registeredAsset: KnowledgeAsset | undefined = sourceAsset;
    let pdfStorageKey: string | undefined;
    let finalDecision: ReuseDecision = { ...initialDecision };

    // 3. Evaluate Hierarchy: Full REUSE vs ADAPT vs GENERATE
    if (selectedQuestions.length >= requestedCount) {
      // FULL REUSE: Candidate bank had enough unseen/suitable questions
      selectedQuestions = selectedQuestions.slice(0, requestedCount);
      reusedExistingAsset = !!sourceAsset;
      finalDecision = {
        ...initialDecision,
        decision: 'REUSE',
        matchedQuestions: selectedQuestions,
        reasons: [
          `[Novelty Engine: ${noveltyMode}] Reused ${selectedQuestions.length} verified unseen questions from '${sourceAsset?.title || 'Question Bank'}'.`
        ]
      };
    } else if (selectedQuestions.length > 0) {
      // ADAPT: Partial reuse of unseen candidates + dynamically generate the missing delta
      const missingCount = requestedCount - selectedQuestions.length;
      const generatedDelta = await this.generatedProvider.generateQuestions({
        subject: spec.subject,
        concept: spec.topic,
        difficulty: difficulty as any,
        questionType: 'multiple_choice',
        learningObjective: `Adaptive practice on ${spec.topic}`,
        count: missingCount
      });

      const processedGenerated = generatedDelta.map((q) => ensureQuestionIdentity(q));
      selectedQuestions = [...selectedQuestions, ...processedGenerated];
      reusedExistingAsset = false;

      // Register the adapted set as a new verified Knowledge Asset
      const regResult = await artifactRegistrationService.registerQuestionSet(
        {
          title: `${educationLevel} ${spec.topic} Adapted Set (${selectedQuestions.length} Items)`,
          subject: spec.subject,
          topic: spec.topic,
          educationLevel,
          difficulty,
          questions: selectedQuestions,
          contextId: spec.contextId,
          institutionId: spec.institutionId,
          generatePdfArtifact: spec.generatePdf,
          sharedWithInstitution: spec.sharedWithInstitution,
          metadata: {
            adaptedFromAssetId: sourceAsset?.id,
            reusedCount: noveltyResult.reusedCount,
            generatedCount: missingCount,
            noveltyMode
          }
        },
        principal
      );

      registeredAsset = regResult.asset;
      pdfStorageKey = regResult.storageKey;
      finalDecision = {
        ...initialDecision,
        decision: 'ADAPT',
        matchedQuestions: selectedQuestions,
        missingQuestionCount: missingCount,
        reasons: [
          `[Novelty Engine: ADAPT] Reused ${noveltyResult.reusedCount} unseen questions from '${sourceAsset?.title}' and generated ${missingCount} new items.`
        ]
      };
    } else {
      // GENERATE: No unseen candidates left in verified bank (or no bank existed)
      const generated = await this.generatedProvider.generateQuestions({
        subject: spec.subject,
        concept: spec.topic,
        difficulty: difficulty as any,
        questionType: 'multiple_choice',
        learningObjective: `Targeted fresh practice on ${spec.topic}`,
        count: requestedCount
      });

      selectedQuestions = generated.map((q) => ensureQuestionIdentity(q));
      reusedExistingAsset = false;

      const regResult = await artifactRegistrationService.registerQuestionSet(
        {
          title: `${educationLevel} ${spec.topic} Question Bank (${selectedQuestions.length} Items)`,
          subject: spec.subject,
          topic: spec.topic,
          educationLevel,
          difficulty,
          questions: selectedQuestions,
          contextId: spec.contextId,
          institutionId: spec.institutionId,
          generatePdfArtifact: spec.generatePdf,
          sharedWithInstitution: spec.sharedWithInstitution,
          metadata: {
            generatedFromScratchReason: 'All previous candidate questions already seen or no suitable bank found',
            noveltyMode
          }
        },
        principal
      );

      registeredAsset = regResult.asset;
      pdfStorageKey = regResult.storageKey;
      finalDecision = {
        ...initialDecision,
        decision: 'GENERATE',
        matchedQuestions: selectedQuestions,
        reasons: [
          `[Novelty Engine: GENERATE] Generated ${selectedQuestions.length} fresh questions. Prior candidate questions were already seen by learner.`
        ]
      };
    }

    // 4. Generate PDF on reuse if requested and not yet generated
    if (spec.generatePdf && !pdfStorageKey && registeredAsset) {
      const pdfRes = await artifactRegistrationService.generatePdfFromAsset(
        registeredAsset,
        selectedQuestions.length,
        principal
      );
      pdfStorageKey = pdfRes.storageKey;
    }

    // 5. Automatically record SEEN exposure for the authenticated learner
    await learnerExposureStore.recordExposures({
      userId: principal.userId,
      contextId,
      questions: selectedQuestions,
      status: 'SEEN',
      assetId: registeredAsset?.id,
      subject: spec.subject,
      topic: spec.topic
    });

    // 6. Build transparent, pedagogically calibrated PracticeSet
    const selectedItems: SelectedQuestionItem[] = selectedQuestions.map((q, idx) => ({
      question: q,
      selectionReason: `[${noveltyMode}] ${
        (q as any).assetId ? `Reused from verified asset ${(q as any).assetId}` : 'Generated challenge'
      }`,
      targetedAspect: 'conceptual_reinforcement',
      rank: idx + 1
    }));

    const practiceSet: PracticeSet = {
      id: `pset-novel-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${educationLevel} ${spec.topic} Practice Set (${noveltyMode})`,
      subject: spec.subject,
      targetConcept: spec.topic,
      learningObjective: `Mastery practice for ${spec.topic}`,
      sourceMode: 'FULL_ADAPTIVE',
      totalQuestions: selectedItems.length,
      breakdown: {
        sourceGroundedCount: selectedItems.filter((i) => i.question.source === 'SOURCE').length,
        prerequisiteCount: 0,
        conceptualCount: selectedItems.length,
        applicationCount: 0,
        challengeCount: 0,
        sourceBreakdown: {
          SOURCE: selectedItems.filter((i) => i.question.source === 'SOURCE').length,
          JARVIS_GENERATED: selectedItems.filter((i) => i.question.source === 'JARVIS_GENERATED').length,
          WEB_RETRIEVED: selectedItems.filter((i) => i.question.source === 'WEB_RETRIEVED').length,
          TEACHER_CREATED: selectedItems.filter((i) => i.question.source === 'TEACHER_CREATED').length,
          INSTITUTION_CREATED: selectedItems.filter((i) => i.question.source === 'INSTITUTION_CREATED').length
        }
      },
      selectionRationale: noveltyResult.rationale,
      questions: selectedItems,
      generatedAt: new Date().toISOString()
    };

    // 7. Retrieve updated exposure summary for this learner
    const exposureSummary = await learnerExposureStore.getSummary(
      principal.userId,
      contextId,
      spec.topic
    );

    return {
      decision: finalDecision,
      noveltyResult,
      questions: selectedQuestions,
      practiceSet,
      pdfStorageKey,
      registeredAsset,
      reusedExistingAsset,
      exposureSummary
    };
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

    const evidence = await this.masteryEvidenceEngine.evaluateResponse(
      question,
      request,
      currentConceptMastery
    );

    // If learnerId is provided, automatically record attempt in learnerExposureStore
    if (request.learnerId) {
      await learnerExposureStore.recordAttempt({
        userId: request.learnerId,
        contextId: request.contextId,
        questionId: question.id,
        isCorrect: evidence.isCorrect,
        score: evidence.score,
        concept: evidence.concept,
        subject: question.subject,
        topic: question.concept,
        assetId: (question as any).assetId || question.sourceReference?.sourceId
      });
    }

    return evidence;
  }

  /**
   * Look up a question across all registered providers and verified knowledge assets
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

    // Also look up in registered KnowledgeAssets
    const assets = knowledgeAssetStore.getAllAssets();
    for (const asset of assets) {
      if (Array.isArray(asset.items)) {
        const found = (asset.items as Question[]).find((q) => q.id === id);
        if (found) return found;
      }
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
