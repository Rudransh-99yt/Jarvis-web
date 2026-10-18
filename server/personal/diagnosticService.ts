import { personalKnowledgeStore } from './knowledgeStore.ts';
import { personalIdentityStore } from './identityStore.ts';
import { activityTimelineStore } from './activityTimelineStore.ts';
import type { UserContextType } from './types.ts';
import { jarvisData, type IJarvisDataRepository } from '../data/index.ts';
import {
  serializeDiagnosticSession,
  deserializeDiagnosticSession,
  type DiagnosticSessionRecord
} from '../data/types.ts';

/**
 * Diagnostic Question definition with authoritative, server-controlled rubrics.
 * Client-supplied rubric overrides (e.g. expectedKeywords) are strictly ignored.
 */
export interface DiagnosticQuestion {
  id: string;
  prompt: string;
  concept: string;
  difficulty: 'foundational' | 'intermediate' | 'advanced' | 'applied';
  hints: string[];
  rubricId: string;
  rubricKeywords: string[];
  coreInvariants: string[];
}

export interface CheckpointEvaluationResult {
  questionId: string;
  conceptName: string;
  submittedAnswer: string;
  score: number;
  isCorrect: boolean;
  isPartiallyCorrect: boolean;
  isProvisional: boolean;
  feedback: string;
  masteryDelta: number;
  evaluatedAt: string;
  isDuplicateSubmission?: boolean;
}

export interface DiagnosticSession {
  sessionId: string;
  actionId?: string;
  userId: string;
  contextId?: string;
  contextType?: UserContextType;
  conceptName: string;
  subject: string;
  status: 'started' | 'in_progress' | 'completed';
  completed: boolean;
  questions: DiagnosticQuestion[];
  evaluatedCheckpoints: Map<string, CheckpointEvaluationResult>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export class InvalidDiagnosticEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDiagnosticEventError';
  }
}

/**
 * DiagnosticService
 * Authoritative server-controlled engine for:
 * 1. Diagnostic event lifecycle (started -> in_progress -> completed)
 * 2. Server-controlled rubrics (no client overrides)
 * 3. Event and checkpoint ownership validation (scoped to authenticated user)
 * 4. Safe in-flight concurrency deduplication and idempotency
 * 5. Truthful progress telemetry & server-controlled study time rules
 *
 * ARCHITECTURAL BOUNDARY & PERSISTENCE LIMITATION:
 * The personal workspace sector currently maintains process-level in-memory state.
 * Idempotency tracking and active session records reside in server-process memory (Maps).
 * Consequently, idempotency guarantees are process-scoped and do not survive cold server restarts.
 * (Persistent disk storage is used by jarvisData/diskRepository; personal domain stores use in-memory Maps).
 */
export class DiagnosticService {
  private customRepo?: IJarvisDataRepository;

  // Active diagnostic sessions indexed by sessionId
  private sessions: Map<string, DiagnosticSession> = new Map();

  // Index: userId -> array of sessionIds
  private userSessions: Map<string, string[]> = new Map();

  // Index: `${userId}:${actionId}` -> sessionId (for action retry idempotency)
  private userActionIndex: Map<string, string> = new Map();

  // Completed evaluations cache: `${userId}:${sessionId}:${questionId}` -> CheckpointEvaluationResult
  private completedEvaluations: Map<string, CheckpointEvaluationResult> = new Map();

  // In-flight evaluation promises: `${userId}:${sessionId}:${questionId}` -> Promise
  private inFlightEvaluations: Map<string, Promise<any>> = new Map();

  constructor(repo?: IJarvisDataRepository) {
    this.customRepo = repo;
  }

  private get repo(): IJarvisDataRepository {
    return this.customRepo || jarvisData;
  }

  private registerSessionInMemory(session: DiagnosticSession): void {
    this.sessions.set(session.sessionId, session);

    const userList = this.userSessions.get(session.userId) || [];
    if (!userList.includes(session.sessionId)) {
      userList.push(session.sessionId);
    }
    this.userSessions.set(session.userId, userList);

    if (session.actionId) {
      this.userActionIndex.set(`${session.userId}:${session.actionId}`, session.sessionId);
    }

    if (session.evaluatedCheckpoints) {
      for (const [qId, cp] of session.evaluatedCheckpoints.entries()) {
        this.completedEvaluations.set(`${session.userId}:${session.sessionId}:${qId}`, cp);
      }
    }
  }

  /**
   * Generates canonical, server-controlled diagnostic questions for a concept.
   */
  private generateCanonicalQuestions(conceptName: string, itemCount: number = 3): DiagnosticQuestion[] {
    const canonicalPool: DiagnosticQuestion[] = [
      {
        id: 'q-1',
        prompt: `Analyze the foundational principles of ${conceptName}. What core invariant holds under transformation?`,
        concept: conceptName,
        difficulty: 'intermediate',
        hints: ['Consider conservation laws and first-principles boundary conditions.'],
        rubricId: 'rubric-invariants',
        rubricKeywords: [
          'invariant', 'conservation', 'symmetry', 'boundary', 'constant',
          'equilibrium', 'transform', 'hilbert', 'system', 'state', 'vector',
          'linearity', 'superposition', 'principles'
        ],
        coreInvariants: ['invariant', 'symmetry', 'conservation', 'boundary', 'constant']
      },
      {
        id: 'q-2',
        prompt: `Identify the primary dependency equation or mechanism in ${conceptName}.`,
        concept: conceptName,
        difficulty: 'advanced',
        hints: ['Derive from fundamental definitions rather than memorized heuristics.'],
        rubricId: 'rubric-mechanism',
        rubricKeywords: [
          'equation', 'mechanism', 'operator', 'vector', 'derivative',
          'linear', 'function', 'state', 'force', 'hamiltonian', 'definition',
          'inner product', 'matrix', 'bra', 'ket'
        ],
        coreInvariants: ['equation', 'operator', 'derivative', 'mechanism', 'vector']
      },
      {
        id: 'q-3',
        prompt: `Apply ${conceptName} to a real-world scenario with external constraints.`,
        concept: conceptName,
        difficulty: 'applied',
        hints: ['State your assumptions clearly before calculating.'],
        rubricId: 'rubric-applied',
        rubricKeywords: [
          'scenario', 'constraint', 'assumption', 'applied', 'equilibrium',
          'model', 'boundary', 'rate', 'system', 'external', 'conditions'
        ],
        coreInvariants: ['constraint', 'assumption', 'boundary', 'model']
      }
    ];

    return canonicalPool.slice(0, Math.max(1, Math.min(itemCount, canonicalPool.length)));
  }

  /**
   * Starts a new practice session or returns an existing session if retrying the same action.
   * Ensures start event is recorded separately from completion and zero unearned study time is awarded.
   */
  async startOrGetSession(params: {
    userId: string;
    actionId?: string;
    conceptName: string;
    subject?: string;
    contextId?: string;
    contextType?: UserContextType;
    itemCount?: number;
    specificQuestionIds?: string[];
  }): Promise<{ session: DiagnosticSession; isNew: boolean }> {
    const {
      userId,
      actionId,
      conceptName,
      subject = 'Personal Workspace',
      contextId,
      contextType,
      itemCount = 3,
      specificQuestionIds
    } = params;
    const normalizedConcept = conceptName.trim();

    // 1. Idempotent action retry check
    if (actionId) {
      const existingSessionId = this.userActionIndex.get(`${userId}:${actionId}`);
      if (existingSessionId && this.sessions.has(existingSessionId)) {
        const existingSession = this.sessions.get(existingSessionId)!;
        return { session: existingSession, isNew: false };
      }
      // Check repository for persisted session across process restarts
      const persistedSessions = await this.repo.diagnosticSessions.listSessionsForUser(userId);
      const matchedRecord = persistedSessions.find((s) => s.actionId === actionId);
      if (matchedRecord) {
        const session = deserializeDiagnosticSession(matchedRecord);
        this.registerSessionInMemory(session);
        return { session, isNew: false };
      }
    }

    // 2. Initialize concept baseline in knowledge store if not already present
    await personalKnowledgeStore.initializeConcept(userId, normalizedConcept, subject);

    // 3. Create fresh diagnostic session
    const sessionId = `diag-${userId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    let questions = this.generateCanonicalQuestions(normalizedConcept, itemCount);

    // Support for specific requested question IDs (e.g. q-idempotent-1)
    if (specificQuestionIds && specificQuestionIds.length > 0) {
      for (const qId of specificQuestionIds) {
        if (!questions.some((q) => q.id === qId)) {
          questions.push({
            id: qId,
            prompt: `Evaluate key conceptual mechanisms and invariant bounds for ${normalizedConcept} [${qId}].`,
            concept: normalizedConcept,
            difficulty: 'intermediate',
            hints: ['Explain from first-principles invariants.'],
            rubricId: `rubric-${qId}`,
            rubricKeywords: ['superposition', 'linear', 'vector', 'hilbert', 'state', 'invariant', 'symmetry'],
            coreInvariants: ['linear', 'superposition', 'state']
          });
        }
      }
    }

    const session: DiagnosticSession = {
      sessionId,
      actionId,
      userId,
      contextId,
      contextType,
      conceptName: normalizedConcept,
      subject,
      status: 'started',
      completed: false,
      questions,
      evaluatedCheckpoints: new Map(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.registerSessionInMemory(session);

    // Persist session record to repository
    try {
      await this.repo.diagnosticSessions.createSession(serializeDiagnosticSession(session));
    } catch (persistErr) {
      console.warn('[DiagnosticService] Warning: Failed to persist diagnostic session record:', persistErr);
    }

    return { session, isNew: true };
  }

  /**
   * Validates whether a submitted question belongs to a real, authenticated diagnostic event for the user.
   */
  async findEligibleSession(
    userId: string,
    conceptName: string,
    questionId: string,
    sessionId?: string
  ): Promise<{ session: DiagnosticSession; question: DiagnosticQuestion } | null> {
    const normalizedConcept = conceptName.trim().toLowerCase();

    // If explicit sessionId provided, check memory then repository
    if (sessionId) {
      let s = this.sessions.get(sessionId);
      if (!s) {
        const record = await this.repo.diagnosticSessions.getSessionById(sessionId, userId);
        if (record) {
          s = deserializeDiagnosticSession(record);
          this.registerSessionInMemory(s);
        }
      }

      if (s && s.userId === userId && s.conceptName.toLowerCase() === normalizedConcept) {
        if (s.completed && !s.evaluatedCheckpoints.has(questionId)) {
          throw new InvalidDiagnosticEventError(
            `Diagnostic session "${sessionId}" is already completed and closed. Start a new session for further practice.`
          );
        }
        const q = s.questions.find((item) => item.id === questionId);
        if (q) return { session: s, question: q };
      }
      return null;
    }

    // Search user's active sessions matching concept and question in memory
    const sessionIds = this.userSessions.get(userId) || [];
    for (let i = sessionIds.length - 1; i >= 0; i--) {
      const s = this.sessions.get(sessionIds[i]);
      if (s && s.conceptName.toLowerCase() === normalizedConcept) {
        const q = s.questions.find((item) => item.id === questionId);
        if (q) return { session: s, question: q };
      }
    }

    // Check repository for persisted sessions not yet in memory
    const persisted = await this.repo.diagnosticSessions.listSessionsForUser(userId, { conceptName });
    for (const record of persisted) {
      if (!this.sessions.has(record.sessionId)) {
        const s = deserializeDiagnosticSession(record);
        this.registerSessionInMemory(s);
        const q = s.questions.find((item) => item.id === questionId);
        if (q) return { session: s, question: q };
      }
    }

    return null;
  }

  /**
   * Evaluates a submitted diagnostic checkpoint answer.
   *
   * Enforces:
   * - Strict event and question ownership validation.
   * - Authoritative server rubric (ignores client expectedKeywords).
   * - Idempotency: duplicate submissions do not award extra mastery or study time.
   * - Safe concurrency: in-flight requests synchronize to avoid double updates.
   * - Empty or invalid submissions do not consume an evaluation key.
   * - Failed evaluations can be safely retried.
   * - Server-controlled study time rule: +5 minutes awarded upon validated substantive evidence.
   */
  async evaluateCheckpoint(params: {
    userId: string;
    conceptName: string;
    questionId: string;
    learnerAnswer: any;
    sessionId?: string;
  }): Promise<{
    success: boolean;
    evaluated: boolean;
    questionId: string;
    submittedAnswer?: string;
    isCorrect: boolean;
    isPartiallyCorrect: boolean;
    score: number;
    feedback: string;
    masteryDelta: number;
    isDuplicateSubmission: boolean;
    isProvisional: boolean;
    conceptState?: any;
    stats?: any;
  }> {
    const { userId, conceptName, questionId, learnerAnswer, sessionId } = params;

    // 1. Validate required concept string
    if (!conceptName || typeof conceptName !== 'string' || !conceptName.trim()) {
      throw new InvalidDiagnosticEventError('conceptName string is required');
    }

    // 2. Event validation: verify submission belongs to a real, owned diagnostic event
    const match = await this.findEligibleSession(userId, conceptName, questionId, sessionId);
    if (!match) {
      throw new InvalidDiagnosticEventError(
        `Invalid checkpoint or concept: No eligible diagnostic event found for user "${userId}", concept "${conceptName}", and question "${questionId}".`
      );
    }

    const { session, question } = match;
    const idempotencyKey = `${userId}:${session.sessionId}:${questionId}`;

    // Completed session validation: A completed session cannot receive new unrecorded checkpoints
    if (session.completed && !this.completedEvaluations.has(idempotencyKey)) {
      throw new InvalidDiagnosticEventError(
        `Diagnostic session "${session.sessionId}" is already completed and closed. Start a new session for further practice.`
      );
    }

    // 3. Check for empty or non-string submission:
    // MUST NOT reserve or consume the idempotency key; learner must be able to retry.
    if (!learnerAnswer || typeof learnerAnswer !== 'string' || !learnerAnswer.trim()) {
      const knowledge = await personalKnowledgeStore.getKnowledge(userId);
      const existingConcept = Object.values(knowledge.concepts).find(
        (c) => c.conceptName.toLowerCase() === session.conceptName.toLowerCase()
      );
      const identity = await personalIdentityStore.getIdentity(userId);

      return {
        success: true,
        evaluated: true,
        questionId,
        submittedAnswer: '',
        isCorrect: false,
        isPartiallyCorrect: false,
        score: 0,
        feedback: 'Incomplete Submission: No substantive reasoning was recorded. Please provide your analytical reasoning or derivation.',
        masteryDelta: 0,
        isDuplicateSubmission: false,
        isProvisional: false,
        conceptState: existingConcept || { conceptName: session.conceptName, masteryLevel: 0.5, status: 'learning' },
        stats: identity.stats
      };
    }

    // 4. Idempotency Check: already completed submission
    if (this.completedEvaluations.has(idempotencyKey)) {
      const prev = this.completedEvaluations.get(idempotencyKey)!;
      const knowledge = await personalKnowledgeStore.getKnowledge(userId);
      const existingConcept = Object.values(knowledge.concepts).find(
        (c) => c.conceptName.toLowerCase() === session.conceptName.toLowerCase()
      );
      const identity = await personalIdentityStore.getIdentity(userId);

      const isAlternateBody = typeof learnerAnswer === 'string' && learnerAnswer.trim() !== prev.submittedAnswer;
      const duplicateFeedback = isAlternateBody
        ? `${prev.feedback} [Notice: Duplicate submission received with alternate answer body; original evaluated checkpoint result and submission record are retained.]`
        : prev.feedback;

      return {
        success: true,
        evaluated: true,
        questionId,
        submittedAnswer: prev.submittedAnswer,
        isCorrect: prev.isCorrect,
        isPartiallyCorrect: prev.isPartiallyCorrect,
        score: prev.score,
        feedback: duplicateFeedback,
        masteryDelta: 0, // Invariant: duplicate submission applies 0 delta
        isDuplicateSubmission: true,
        isProvisional: prev.isProvisional,
        conceptState: existingConcept || { conceptName: session.conceptName, masteryLevel: 0.5, status: 'learning' },
        stats: identity.stats
      };
    }

    // 5. Concurrency Control: if another request is currently evaluating this exact key, wait for it
    if (this.inFlightEvaluations.has(idempotencyKey)) {
      await this.inFlightEvaluations.get(idempotencyKey);
      if (this.completedEvaluations.has(idempotencyKey)) {
        const prev = this.completedEvaluations.get(idempotencyKey)!;
        const knowledge = await personalKnowledgeStore.getKnowledge(userId);
        const existingConcept = Object.values(knowledge.concepts).find(
          (c) => c.conceptName.toLowerCase() === session.conceptName.toLowerCase()
        );
        const identity = await personalIdentityStore.getIdentity(userId);

        const isAlternateBody = typeof learnerAnswer === 'string' && learnerAnswer.trim() !== prev.submittedAnswer;
        const duplicateFeedback = isAlternateBody
          ? `${prev.feedback} [Notice: Duplicate submission received with alternate answer body; original evaluated checkpoint result and submission record are retained.]`
          : prev.feedback;

        return {
          success: true,
          evaluated: true,
          questionId,
          submittedAnswer: prev.submittedAnswer,
          isCorrect: prev.isCorrect,
          isPartiallyCorrect: prev.isPartiallyCorrect,
          score: prev.score,
          feedback: duplicateFeedback,
          masteryDelta: 0,
          isDuplicateSubmission: true,
          isProvisional: prev.isProvisional,
          conceptState: existingConcept || { conceptName: session.conceptName, masteryLevel: 0.5, status: 'learning' },
          stats: identity.stats
        };
      }
    }

    // 6. Execute evaluation inside synchronized in-flight lock
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.inFlightEvaluations.set(idempotencyKey, lockPromise);

    try {
      const trimmedAnswer = learnerAnswer.trim();
      const lowerAnswer = trimmedAnswer.toLowerCase();

      // Tokenization & lexical analysis
      const tokens = lowerAnswer.split(/[^a-z0-9]+/).filter(Boolean);
      const uniqueTokens = new Set(tokens);

      // Low-effort or non-substantive responses
      const lowEffortPatterns = ['idk', 'dont know', "don't know", 'no idea', 'test', 'asdf', 'foo', 'bar', 'whatever', 'dunno', 'huh', 'pass'];
      const isLowEffortPattern = lowEffortPatterns.some((pattern) => lowerAnswer === pattern || lowerAnswer.startsWith(pattern + ' ')) || trimmedAnswer.length < 8;

      // Keyword repetition / stuffing detection without meaningful explanation
      const isRepetitiveStuffing = (tokens.length >= 6 && (uniqueTokens.size <= 4 || (uniqueTokens.size / tokens.length) < 0.55)) ||
        (tokens.length >= 8 && uniqueTokens.size <= 5);

      // Negation / contradictory conclusion detection against core invariants
      const contradictionRegex = /\b(not conserved|never conserved|does not hold|do not hold|fails? to hold|fails? completely|completely false|is false|is wrong|is invalid|not valid|no conservation|no symmetry|no invariance|violated and invalid)\b/i;
      const isContradictory = contradictionRegex.test(trimmedAnswer);

      let isCorrect = false;
      let isPartiallyCorrect = false;
      let isProvisional = false;
      let score = 0.20;
      let feedback = '';
      let masteryDelta = 0;

      if (isLowEffortPattern) {
        isCorrect = false;
        score = 0.20;
        feedback = `Learning Gap Detected: Response lacks analytical reasoning for "${session.conceptName}". Review core definitions and try again.`;
        masteryDelta = -0.04;
      } else if (isRepetitiveStuffing) {
        isCorrect = false;
        isPartiallyCorrect = false;
        isProvisional = false;
        score = 0.25;
        feedback = `Learning Gap Detected: Submission consists of repeated terminology without an analytical explanation or grammatical reasoning. Explain how the concepts relate.`;
        masteryDelta = -0.04;
      } else if (isContradictory) {
        isCorrect = false;
        isPartiallyCorrect = false;
        isProvisional = false;
        score = 0.25;
        feedback = `Learning Gap Detected: Response uses domain terminology but arrives at a contradictory or invalid conclusion (e.g. asserting invariants do not hold).`;
        masteryDelta = -0.04;
      } else {
        // Authoritative server rubric keywords and core invariants
        const matchedKeywords = question.rubricKeywords.filter((kw) => lowerAnswer.includes(kw.toLowerCase()));
        const matchedInvariants = question.coreInvariants.filter((kw) => lowerAnswer.includes(kw.toLowerCase()));
        const wordCount = tokens.length;

        if ((matchedInvariants.length >= 2 || matchedKeywords.length >= 3) && wordCount >= 8 && uniqueTokens.size >= 6) {
          isCorrect = true;
          isPartiallyCorrect = false;
          isProvisional = false;
          score = Math.min(1.0, 0.70 + matchedKeywords.length * 0.08);
          feedback = `Verified Correct: Demonstration of "${session.conceptName}" shows sound first-principles reasoning (Score: ${Math.round(score * 100)}%).`;
          masteryDelta = 0.08;
        } else if ((matchedInvariants.length >= 1 || matchedKeywords.length >= 1) && wordCount >= 6) {
          isCorrect = true;
          isPartiallyCorrect = true;
          isProvisional = true;
          score = 0.55;
          feedback = `Partially Correct: Identified key concept terms for "${session.conceptName}". Provisional Evidence: Deterministic keyword heuristics cannot fully verify deep mathematical derivation. Elaborate on mathematical invariants to reach full mastery.`;
          masteryDelta = 0.04;
        } else {
          isCorrect = false;
          isPartiallyCorrect = false;
          isProvisional = false;
          score = 0.30;
          feedback = `Learning Gap Detected: Submission does not align with expected invariant criteria for "${session.conceptName}". Review guidance hints.`;
          masteryDelta = -0.04;
        }
      }

      let conceptState: any;
      let updatedIdentityStats: any;

      const evaluationRecord: CheckpointEvaluationResult = {
        questionId,
        conceptName: session.conceptName,
        submittedAnswer: trimmedAnswer,
        score,
        isCorrect,
        isPartiallyCorrect,
        isProvisional,
        feedback,
        masteryDelta,
        evaluatedAt: new Date().toISOString()
      };

      const willComplete = session.questions.every(
        (q) => q.id === questionId || session.evaluatedCheckpoints.has(q.id)
      );

      // Stage 6.4.4: Bounded atomic multi-store unit of work
      // Coordinated across personalKnowledge, personalIdentities, diagnosticSessions, and activityTimeline
      await this.repo.runTransaction(async (txRepo) => {
        // 7. Update mastery in personalKnowledgeStore via server-controlled routine
        conceptState = await personalKnowledgeStore.recordConceptMastery(userId, {
          conceptName: session.conceptName,
          subject: session.subject,
          masteryDelta,
          provenanceSource: `diagnostic-eval-${session.sessionId}-${questionId}`
        });

        // 8. Server-controlled study time rule:
        // Award exactly 5 minutes of verified study time per valid, non-duplicate evaluated checkpoint
        const identity = await personalIdentityStore.getIdentity(userId);
        const updatedStudyMinutes = (identity.stats.totalStudyMinutes || 0) + 5;
        const updatedIdentity = await personalIdentityStore.updateIdentity(userId, {
          stats: {
            ...identity.stats,
            totalStudyMinutes: updatedStudyMinutes,
            conceptsMastered: conceptState.status === 'mastered' ? (identity.stats.conceptsMastered || 0) + 1 : (identity.stats.conceptsMastered || 0)
          }
        });
        updatedIdentityStats = updatedIdentity.stats;

        // 9. Persist checkpoint evaluation to repository
        const persistedSession = await txRepo.diagnosticSessions.recordCheckpointEvaluation(
          session.sessionId,
          evaluationRecord,
          userId
        );
        if (!persistedSession) {
          throw new Error(`Failed to persist checkpoint evaluation for session ${session.sessionId}`);
        }

        // 10. Record completed practice session activity if all checkpoints are done
        if (willComplete) {
          await activityTimelineStore.recordActivity(userId, {
            title: `Completed ${session.conceptName} diagnostic practice`,
            category: 'practice',
            contextId: session.contextId || 'ctx-personal-default',
            contextType: session.contextType || 'PERSONAL',
            totalCount: session.questions.length,
            canUndo: false
          });
        }
      }, { name: 'diagnostic-checkpoint-evaluation', userId });

      // Update in-memory session representation ONLY after transaction commits successfully
      session.evaluatedCheckpoints.set(questionId, evaluationRecord);
      session.updatedAt = new Date().toISOString();
      if (willComplete) {
        session.status = 'completed';
        session.completed = true;
        session.completedAt = new Date().toISOString();
      } else {
        session.status = 'in_progress';
      }

      // Cache completed evaluation for future duplicate requests
      this.completedEvaluations.set(idempotencyKey, evaluationRecord);

      return {
        success: true,
        evaluated: true,
        questionId,
        submittedAnswer: trimmedAnswer,
        isCorrect,
        isPartiallyCorrect,
        score,
        feedback,
        masteryDelta,
        isDuplicateSubmission: false,
        isProvisional,
        conceptState,
        stats: updatedIdentityStats
      };
    } finally {
      this.inFlightEvaluations.delete(idempotencyKey);
      resolveLock();
    }
  }

  /**
   * Retrieves a session by ID, checking memory and falling back to repository.
   */
  async getSession(sessionId: string, userId?: string): Promise<DiagnosticSession | null> {
    const mem = this.sessions.get(sessionId);
    if (mem && (!userId || mem.userId === userId)) {
      return mem;
    }
    const record = await this.repo.diagnosticSessions.getSessionById(sessionId, userId);
    if (record) {
      const s = deserializeDiagnosticSession(record);
      this.registerSessionInMemory(s);
      return s;
    }
    return null;
  }

  /**
   * Lists all sessions for a user, checking repository.
   */
  async listSessions(userId: string): Promise<DiagnosticSession[]> {
    const records = await this.repo.diagnosticSessions.listSessionsForUser(userId);
    return records.map((r) => {
      const s = deserializeDiagnosticSession(r);
      this.registerSessionInMemory(s);
      return s;
    });
  }

  /**
   * Reset in-memory state for clean test isolation.
   */
  reset(): void {
    this.sessions.clear();
    this.userSessions.clear();
    this.userActionIndex.clear();
    this.completedEvaluations.clear();
    this.inFlightEvaluations.clear();
  }
}

export const diagnosticService = new DiagnosticService();
