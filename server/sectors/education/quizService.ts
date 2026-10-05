import { requirePrincipal } from '../../auth/principal.ts';
// Milestone 13: Deterministic Smart Quiz Service Orchestrator
import { jarvisData } from '../../data/index.ts';
import type { IJarvisDataRepository } from '../../data/repository.ts';
import { classroomEventBus, ClassroomEventBus } from './classroomEventBus.ts';
import { ClassroomAuthorizationPolicy } from '../../auth/classroomPolicy.ts';
import type { User } from '../../data/types.ts';
import type {
  Quiz,
  QuizQuestion,
  QuizResponse,
  QuizParticipantState,
  QuestionAggregate,
  QuizResults,
  QuizStatus,
  QuestionStatus,
  StudentQuizState
} from '../../../src/types/quiz.ts';

export class SmartQuizService {
  private repo: IJarvisDataRepository;
  private policy: ClassroomAuthorizationPolicy;
  private eventBus: ClassroomEventBus;

  constructor(
    repo: IJarvisDataRepository = jarvisData,
    policy?: ClassroomAuthorizationPolicy,
    eventBus: ClassroomEventBus = classroomEventBus
  ) {
    this.repo = repo;
    this.policy = policy || new ClassroomAuthorizationPolicy(repo);
    this.eventBus = eventBus;
  }

  getPolicy(): ClassroomAuthorizationPolicy {
    return this.policy;
  }

  /**
   * Helper: Normalize selected option to standard identifier or match with options list
   */
  private normalizeOption(input: string, options: string[]): string {
    const trimmed = input.trim();
    const upper = trimmed.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(upper)) {
      return upper;
    }
    // Check if input matches option prefix e.g. "A)" or "A."
    const letterMatch = upper.match(/^([A-D])[\s.):-]/);
    if (letterMatch && letterMatch[1]) {
      return letterMatch[1];
    }
    // Check if input matches one of the option texts exactly
    const idx = options.findIndex((opt) => opt.trim().toLowerCase() === trimmed.toLowerCase());
    if (idx !== -1) {
      return String.fromCharCode(65 + idx); // 0 -> A, 1 -> B, etc.
    }
    return upper;
  }

  /**
   * Helper: Check if selected option is correct
   */
  private checkCorrectness(selected: string, correct: string, options: string[]): boolean {
    const normSelected = this.normalizeOption(selected, options);
    const normCorrect = this.normalizeOption(correct, options);
    return normSelected === normCorrect;
  }

  /**
   * 1. CREATE QUIZ (Teacher)
   */
  async createQuiz(
    data: {
      classId: string;
      classroomSessionId: string;
      workspaceId?: string;
      title: string;
      description?: string;
      status?: QuizStatus;
    },
    teacher: User
  ): Promise<Quiz> {
    const workspaceId = data.workspaceId || 'ws-stark-core';

    // 1. Verify session exists
    const session = await this.repo.classroom.getSessionById(data.classroomSessionId, workspaceId);
    if (!session) {
      throw new Error(`Classroom session '${data.classroomSessionId}' not found in workspace '${workspaceId}'.`);
    }

    // 2. Verify teacher control authorization
    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Only course instructor can create quizzes.'}`);
    }

    const quiz = await this.repo.quizzes.createQuiz({
      workspaceId,
      classId: data.classId,
      classroomSessionId: data.classroomSessionId,
      teacherId: teacher.id,
      title: data.title.trim(),
      description: data.description?.trim(),
      status: data.status || 'draft'
    });

    this.eventBus.notifyQuizCreated(quiz);
    return quiz;
  }

  /**
   * 2. ADD QUESTION (Teacher)
   */
  async addQuestion(
    quizId: string,
    data: {
      questionText: string;
      options: string[];
      correctOption: string;
      points?: number;
      timeLimitSeconds?: number;
      order?: number;
    },
    teacher: User,
    workspaceId = 'ws-stark-core'
  ): Promise<QuizQuestion> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) {
      throw new Error(`Quiz '${quizId}' not found.`);
    }

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) {
      throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);
    }

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);
    }

    if (quiz.status === 'completed' || quiz.status === 'cancelled') {
      throw new Error(`Cannot add question to a ${quiz.status} quiz.`);
    }

    if (!data.questionText || !data.questionText.trim()) {
      throw new Error('Question text is required.');
    }

    if (!Array.isArray(data.options) || data.options.length < 2) {
      throw new Error('A question must have at least 2 options.');
    }

    const normalizedCorrect = this.normalizeOption(data.correctOption, data.options);

    const question = await this.repo.quizzes.addQuestion({
      quizId,
      questionText: data.questionText.trim(),
      options: data.options.map((opt) => opt.trim()),
      correctOption: normalizedCorrect,
      points: data.points !== undefined ? data.points : 10,
      timeLimitSeconds: data.timeLimitSeconds !== undefined ? data.timeLimitSeconds : 30,
      order: data.order
    });

    const updatedQuiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (updatedQuiz) {
      this.eventBus.notifyQuizUpdated(updatedQuiz);
    }

    return question;
  }

  /**
   * 3. UPDATE QUESTION (Teacher)
   */
  async updateQuestion(
    quizId: string,
    questionId: string,
    updates: Partial<QuizQuestion>,
    teacher: User,
    workspaceId = 'ws-stark-core'
  ): Promise<QuizQuestion> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status === 'completed' || quiz.status === 'cancelled') {
      throw new Error(`Cannot update questions in a ${quiz.status} quiz.`);
    }

    const existing = await this.repo.quizzes.getQuestionById(questionId, quizId);
    if (!existing) throw new Error(`Question '${questionId}' not found in quiz '${quizId}'.`);

    const updated = await this.repo.quizzes.updateQuestion(questionId, updates, quizId);
    if (!updated) throw new Error(`Failed to update question '${questionId}'.`);

    return updated;
  }

  /**
   * 4. REMOVE QUESTION (Teacher)
   */
  async removeQuestion(
    quizId: string,
    questionId: string,
    teacher: User,
    workspaceId = 'ws-stark-core'
  ): Promise<boolean> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status === 'live' || quiz.status === 'completed') {
      throw new Error(`Cannot remove question from a ${quiz.status} quiz.`);
    }

    const ok = await this.repo.quizzes.removeQuestion(questionId, quizId);
    const updatedQuiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (updatedQuiz) {
      this.eventBus.notifyQuizUpdated(updatedQuiz);
    }
    return ok;
  }

  /**
   * 5. READY / PUBLISH QUIZ (Teacher)
   * draft -> ready
   */
  async readyQuiz(quizId: string, teacher: User, workspaceId = 'ws-stark-core'): Promise<Quiz> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status !== 'draft') {
      throw new Error(`Invalid transition: Cannot mark '${quiz.status}' quiz as ready. Must be in 'draft' state.`);
    }

    const questions = await this.repo.quizzes.listQuestions(quizId);
    if (questions.length === 0) {
      throw new Error('Cannot publish a quiz with no questions. Please add at least one question.');
    }

    const updated = await this.repo.quizzes.updateQuiz(quizId, {
      status: 'ready',
      totalQuestions: questions.length
    }, workspaceId);

    this.eventBus.notifyQuizUpdated(updated!);
    return updated!;
  }

  /**
   * 6. START QUIZ (Teacher)
   * ready -> live (or draft with questions -> live)
   */
  async startQuiz(
    quizId: string,
    teacher: User,
    workspaceId = 'ws-stark-core'
  ): Promise<{ quiz: Quiz; activeQuestion: QuizQuestion; aggregate: QuestionAggregate }> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    // Validate state transition
    if (quiz.status === 'live') {
      // Already live, return current question and aggregate
      const questions = await this.repo.quizzes.listQuestions(quizId);
      const activeIdx = quiz.currentQuestionIndex >= 0 ? quiz.currentQuestionIndex : 0;
      const activeQ = questions[activeIdx];
      const agg = await this.computeAggregate(quiz, activeQ, teacher);
      return { quiz, activeQuestion: activeQ, aggregate: agg };
    }

    if (quiz.status !== 'ready' && quiz.status !== 'draft') {
      throw new Error(`Invalid transition: Cannot start quiz in '${quiz.status}' state.`);
    }

    const questions = await this.repo.quizzes.listQuestions(quizId);
    if (questions.length === 0) {
      throw new Error('Cannot start a quiz with zero questions.');
    }

    const now = new Date();
    const firstQuestion = questions[0];
    const deadline = new Date(now.getTime() + firstQuestion.timeLimitSeconds * 1000).toISOString();

    // 1. Update first question to active
    const activeQuestion = await this.repo.quizzes.updateQuestion(firstQuestion.id, {
      status: 'active',
      startedAt: now.toISOString(),
      deadline
    }, quizId);

    // 2. Update quiz to live
    const updatedQuiz = await this.repo.quizzes.updateQuiz(quizId, {
      status: 'live',
      startedAt: now.toISOString(),
      currentQuestionIndex: 0,
      totalQuestions: questions.length
    }, workspaceId);

    // 3. Update classroom Smart Board state
    await this.repo.classroom.updateSession(session.id, {
      boardState: {
        state: 'question',
        currentTopic: `Smart Quiz: ${quiz.title} (Question 1 of ${questions.length})`,
        activeSlideIndex: 0,
        message: firstQuestion.questionText,
        updatedAt: now.toISOString()
      }
    }, workspaceId);

    const aggregate = await this.computeAggregate(updatedQuiz!, activeQuestion!, teacher);

    this.eventBus.notifyQuizStarted(updatedQuiz!, activeQuestion!);
    this.eventBus.notifyQuestionStarted(updatedQuiz!, activeQuestion!, aggregate);

    return {
      quiz: updatedQuiz!,
      activeQuestion: activeQuestion!,
      aggregate
    };
  }

  /**
   * 7. START / ADVANCE TO SPECIFIC QUESTION (Teacher)
   */
  async startQuestion(
    quizId: string,
    questionIndexOrId: number | string,
    teacher: User,
    workspaceId = 'ws-stark-core'
  ): Promise<{ quiz: Quiz; activeQuestion: QuizQuestion; aggregate: QuestionAggregate }> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status !== 'live') {
      throw new Error(`Cannot start question when quiz is '${quiz.status}'. Quiz must be 'live'.`);
    }

    const questions = await this.repo.quizzes.listQuestions(quizId);
    let targetQuestion: QuizQuestion | undefined;
    let targetIndex = 0;

    if (typeof questionIndexOrId === 'number') {
      targetIndex = questionIndexOrId;
      targetQuestion = questions[targetIndex];
    } else {
      targetIndex = questions.findIndex((q) => q.id === questionIndexOrId || q.questionId === questionIndexOrId);
      targetQuestion = questions[targetIndex];
    }

    if (!targetQuestion) {
      throw new Error(`Question at '${questionIndexOrId}' not found in quiz.`);
    }

    // Lock any previously active question
    for (const q of questions) {
      if (q.id !== targetQuestion.id && q.status === 'active') {
        await this.repo.quizzes.updateQuestion(q.id, { status: 'locked' }, quizId);
      }
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + targetQuestion.timeLimitSeconds * 1000).toISOString();

    const activeQuestion = await this.repo.quizzes.updateQuestion(targetQuestion.id, {
      status: 'active',
      startedAt: now.toISOString(),
      deadline
    }, quizId);

    const updatedQuiz = await this.repo.quizzes.updateQuiz(quizId, {
      currentQuestionIndex: targetIndex
    }, workspaceId);

    // Update board state
    await this.repo.classroom.updateSession(session.id, {
      boardState: {
        state: 'question',
        currentTopic: `Smart Quiz: ${quiz.title} (Question ${targetIndex + 1} of ${questions.length})`,
        activeSlideIndex: targetIndex,
        message: targetQuestion.questionText,
        updatedAt: now.toISOString()
      }
    }, workspaceId);

    const aggregate = await this.computeAggregate(updatedQuiz!, activeQuestion!, teacher);

    this.eventBus.notifyQuestionStarted(updatedQuiz!, activeQuestion!, aggregate);

    return {
      quiz: updatedQuiz!,
      activeQuestion: activeQuestion!,
      aggregate
    };
  }

  /**
   * 8. LOCK QUESTION (Teacher or Server-Authoritative Auto-Lock)
   */
  async lockQuestion(
    quizId: string,
    questionId: string,
    caller: User,
    workspaceId = 'ws-stark-core',
    isAutoLock = false
  ): Promise<QuestionAggregate> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    if (!isAutoLock) {
      const authCheck = await this.policy.canControlSession(caller, session, workspaceId);
      if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);
    }

    const question = await this.repo.quizzes.getQuestionById(questionId, quizId);
    if (!question) throw new Error(`Question '${questionId}' not found.`);

    if (question.status === 'locked' || question.status === 'completed') {
      return this.computeAggregate(quiz, question, caller);
    }

    const lockedQuestion = await this.repo.quizzes.updateQuestion(questionId, {
      status: 'locked'
    }, quizId);

    // Update board state to results view
    await this.repo.classroom.updateSession(session.id, {
      boardState: {
        state: 'results',
        currentTopic: `Results: Question ${question.order + 1}`,
        message: `Correct Answer: Option ${question.correctOption}`,
        updatedAt: new Date().toISOString()
      }
    }, workspaceId);

    const aggregate = await this.computeAggregate(quiz, lockedQuestion!, caller);

    this.eventBus.notifyQuestionLocked(quiz, lockedQuestion!, aggregate);
    return aggregate;
  }

  /**
   * 9. ADVANCE QUESTION (Teacher)
   */
  async advanceQuestion(
    quizId: string,
    teacher: User,
    workspaceId = 'ws-stark-core'
  ): Promise<{
    completed: boolean;
    quiz: Quiz;
    activeQuestion?: QuizQuestion;
    aggregate?: QuestionAggregate;
    results?: QuizResults;
  }> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const questions = await this.repo.quizzes.listQuestions(quizId);
    const nextIndex = quiz.currentQuestionIndex + 1;

    if (nextIndex < questions.length) {
      // Advance to next question
      const res = await this.startQuestion(quizId, nextIndex, teacher, workspaceId);
      return {
        completed: false,
        quiz: res.quiz,
        activeQuestion: res.activeQuestion,
        aggregate: res.aggregate
      };
    } else {
      // Completed all questions! Complete quiz
      const results = await this.completeQuiz(quizId, teacher, workspaceId);
      const completedQuiz = (await this.repo.quizzes.getQuizById(quizId, workspaceId))!;
      return {
        completed: true,
        quiz: completedQuiz,
        results
      };
    }
  }

  /**
   * 10. PAUSE QUIZ (Teacher)
   * live -> paused
   */
  async pauseQuiz(quizId: string, teacher: User, workspaceId = 'ws-stark-core'): Promise<Quiz> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status !== 'live') {
      throw new Error(`Invalid transition: Cannot pause quiz in '${quiz.status}' state. Must be 'live'.`);
    }

    const updated = await this.repo.quizzes.updateQuiz(quizId, {
      status: 'paused'
    }, workspaceId);

    // Update board state
    await this.repo.classroom.updateSession(session.id, {
      boardState: {
        state: 'paused',
        currentTopic: `Smart Quiz: Paused`,
        message: 'Quiz is temporarily paused by the instructor.',
        updatedAt: new Date().toISOString()
      }
    }, workspaceId);

    this.eventBus.notifyQuizPaused(updated!);
    return updated!;
  }

  /**
   * 11. RESUME QUIZ (Teacher)
   * paused -> live
   */
  async resumeQuiz(quizId: string, teacher: User, workspaceId = 'ws-stark-core'): Promise<Quiz> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status !== 'paused') {
      throw new Error(`Invalid transition: Cannot resume quiz in '${quiz.status}' state. Must be 'paused'.`);
    }

    const updated = await this.repo.quizzes.updateQuiz(quizId, {
      status: 'live'
    }, workspaceId);

    // Restore board state
    const questions = await this.repo.quizzes.listQuestions(quizId);
    const activeQ = questions[quiz.currentQuestionIndex];
    if (activeQ) {
      await this.repo.classroom.updateSession(session.id, {
        boardState: {
          state: activeQ.status === 'locked' ? 'results' : 'question',
          currentTopic: `Smart Quiz: ${quiz.title} (Question ${activeQ.order + 1} of ${questions.length})`,
          activeSlideIndex: activeQ.order,
          message: activeQ.questionText,
          updatedAt: new Date().toISOString()
        }
      }, workspaceId);
    }

    this.eventBus.notifyQuizResumed(updated!);
    return updated!;
  }

  /**
   * 12. COMPLETE QUIZ (Teacher)
   * live / paused -> completed
   */
  async completeQuiz(quizId: string, teacher: User, workspaceId = 'ws-stark-core'): Promise<QuizResults> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status === 'completed') {
      return this.computeResults(quiz);
    }

    if (quiz.status !== 'live' && quiz.status !== 'paused') {
      throw new Error(`Invalid transition: Cannot complete quiz in '${quiz.status}' state.`);
    }

    // Lock all questions
    const questions = await this.repo.quizzes.listQuestions(quizId);
    for (const q of questions) {
      if (q.status !== 'locked') {
        await this.repo.quizzes.updateQuestion(q.id, { status: 'locked' }, quizId);
      }
    }

    const now = new Date().toISOString();
    const updated = await this.repo.quizzes.updateQuiz(quizId, {
      status: 'completed',
      completedAt: now
    }, workspaceId);

    const results = await this.computeResults(updated!);

    // Update board state to completion summary
    await this.repo.classroom.updateSession(session.id, {
      boardState: {
        state: 'ended',
        currentTopic: `Smart Quiz Concluded: ${quiz.title}`,
        message: `Final Class Average: ${results.averagePercentage.toFixed(1)}% (${results.totalParticipants} participants)`,
        updatedAt: now
      }
    }, workspaceId);

    this.eventBus.notifyQuizCompleted(updated!, results);
    return results;
  }

  /**
   * 13. CANCEL QUIZ (Teacher)
   * draft | ready | live | paused -> cancelled
   */
  async cancelQuiz(quizId: string, teacher: User, workspaceId = 'ws-stark-core'): Promise<Quiz> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const session = await this.repo.classroom.getSessionById(quiz.classroomSessionId, workspaceId);
    if (!session) throw new Error(`Associated session '${quiz.classroomSessionId}' not found.`);

    const authCheck = await this.policy.canControlSession(teacher, session, workspaceId);
    if (!authCheck.allowed) throw new Error(`Unauthorized: ${authCheck.reason || 'Instructor authorization required.'}`);

    if (quiz.status === 'completed') {
      throw new Error('Cannot cancel an already completed quiz.');
    }

    const updated = await this.repo.quizzes.updateQuiz(quizId, {
      status: 'cancelled'
    }, workspaceId);

    this.eventBus.notifyQuizCancelled(updated!);
    return updated!;
  }

  /**
   * 14. SUBMIT STUDENT RESPONSE (Student Remote)
   * Strict validation & deterministic scoring
   */
  async submitResponse(
    quizId: string,
    data: {
      questionId: string;
      selectedOption: string;
      workspaceId?: string;
    },
    student: User
  ): Promise<{ response: QuizResponse; aggregate: QuestionAggregate }> {
    const workspaceId = data.workspaceId || 'ws-stark-core';

    // 1. Authenticated student check (Teachers cannot submit responses as students)
    if (student.role !== 'student') {
      throw new Error('Unauthorized: Only enrolled students can submit quiz responses.');
    }

    // 2. Fetch quiz and verify workspace
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) {
      throw new Error(`Quiz '${quizId}' not found in workspace '${workspaceId}'.`);
    }

    // 3. Verify student enrollment in class and/or active session
    const cls = await this.repo.education.getClassById(quiz.classId);
    const participant = await this.repo.classroom.getParticipant(quiz.classroomSessionId, student.id);
    const isEnrolled = cls?.studentIds?.includes(student.id);
    const isParticipant = Boolean(participant);

    if (!isEnrolled && !isParticipant) {
      throw new Error(`Unauthorized: Student '${student.id}' is not enrolled in class '${quiz.classId}' or classroom session '${quiz.classroomSessionId}'.`);
    }

    // 4. Verify quiz is live
    if (quiz.status !== 'live') {
      throw new Error(`Quiz is not currently live (Status: ${quiz.status}). Responses cannot be accepted.`);
    }

    // 5. Look up question and check question status
    const question = await this.repo.quizzes.getQuestionById(data.questionId, quizId);
    if (!question) {
      throw new Error(`Question '${data.questionId}' does not belong to active quiz '${quizId}'.`);
    }

    // 6. Server-authoritative deadline check
    const now = Date.now();
    if (question.status === 'locked' || question.status === 'completed') {
      throw new Error('Question is locked. Responses are no longer accepted.');
    }

    if (question.status !== 'active') {
      throw new Error(`Question is not currently accepting responses (Status: ${question.status}).`);
    }

    if (question.deadline) {
      const deadlineMs = Date.parse(question.deadline);
      // Give 1.5s tolerance for network roundtrip, otherwise reject late response
      if (now > deadlineMs + 1500) {
        // Auto-lock question if deadline expired
        await this.lockQuestion(quizId, question.id, student, workspaceId, true);
        this.eventBus.notifyResponseRejected(quiz, student.id, question.id, 'RESPONSE_DEADLINE_EXPIRED');
        throw new Error('Response rejected: Question time limit expired.');
      }
    }

    // 7. Validate selected option
    if (!data.selectedOption || typeof data.selectedOption !== 'string' || !data.selectedOption.trim()) {
      throw new Error("Parameter 'selectedOption' is required.");
    }
    const normalizedSelected = this.normalizeOption(data.selectedOption, question.options);

    // 8. One accepted response per student/question (Idempotency and anti-tamper)
    const existing = await this.repo.quizzes.getResponse(quizId, question.id, student.id);
    if (existing) {
      if (existing.selectedOption === normalizedSelected) {
        // Idempotent duplicate submission: return existing accepted response
        const aggregate = await this.computeAggregate(quiz, question, student);
        return { response: existing, aggregate };
      } else {
        // Attempting to change an already-submitted answer
        this.eventBus.notifyResponseRejected(quiz, student.id, question.id, 'ANSWER_ALREADY_SUBMITTED');
        throw new Error('Answer modification rejected: Responses are immutable once recorded.');
      }
    }

    // 9. Deterministic scoring
    const isCorrect = this.checkCorrectness(normalizedSelected, question.correctOption, question.options);
    const pointsAwarded = isCorrect ? question.points : 0;

    const responseRecord = await this.repo.quizzes.saveResponse({
      id: `qr-${quizId}-${question.id}-${student.id}`,
      responseId: `qr-${quizId}-${question.id}-${student.id}`,
      quizId,
      questionId: question.id,
      studentId: student.id,
      selectedOption: normalizedSelected,
      submittedAt: new Date().toISOString(),
      isCorrect,
      pointsAwarded
    });

    // 10. Update Participant State (Score & Answer Count)
    const existingParticipant = await this.repo.quizzes.getParticipantState(quizId, student.id);
    const newScore = (existingParticipant?.score || 0) + pointsAwarded;
    const newAnsweredCount = (existingParticipant?.answeredCount || 0) + 1;

    await this.repo.quizzes.upsertParticipantState({
      id: `${quizId}:${student.id}`,
      quizId,
      studentId: student.id,
      displayName: student.displayName,
      joinedAt: existingParticipant?.joinedAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      score: newScore,
      answeredCount: newAnsweredCount
    });

    // 11. Compute live aggregate and notify
    const aggregate = await this.computeAggregate(quiz, question, student);
    this.eventBus.notifyResponseAccepted(quiz, question.id, student.id, aggregate);

    return { response: responseRecord, aggregate };
  }

  /**
   * 15. GET ACTIVE QUESTION STATE (Role-Tailored & Recoverable)
   */
  async getActiveQuestionState(
    quizId: string,
    currentUser: User,
    workspaceId = 'ws-stark-core'
  ): Promise<StudentQuizState> {
    const quiz = await this.repo.quizzes.getQuizById(quizId, workspaceId);
    if (!quiz) throw new Error(`Quiz '${quizId}' not found.`);

    const questions = await this.repo.quizzes.listQuestions(quizId);
    let activeQuestion: QuizQuestion | null = null;

    if (quiz.currentQuestionIndex >= 0 && quiz.currentQuestionIndex < questions.length) {
      activeQuestion = questions[quiz.currentQuestionIndex];

      // Auto-lock check on deadline expiration
      if (activeQuestion.status === 'active' && activeQuestion.deadline) {
        if (Date.now() > Date.parse(activeQuestion.deadline)) {
          await this.lockQuestion(quizId, activeQuestion.id, currentUser, workspaceId, true);
          activeQuestion = (await this.repo.quizzes.getQuestionById(activeQuestion.id, quizId))!;
        }
      }
    }

    const aggregate = activeQuestion ? await this.computeAggregate(quiz, activeQuestion, currentUser) : null;
    let myResponse: QuizResponse | null = null;
    let myScore = 0;
    let answeredCount = 0;

    if (currentUser.role === 'student') {
      if (activeQuestion) {
        myResponse = await this.repo.quizzes.getResponse(quizId, activeQuestion.id, currentUser.id);
      }
      const pState = await this.repo.quizzes.getParticipantState(quizId, currentUser.id);
      if (pState) {
        myScore = pState.score;
        answeredCount = pState.answeredCount;
      }
    }

    // Role-based privacy: Never leak correct answer to students while question is not locked!
    let sanitizedQuestion: (Omit<QuizQuestion, 'correctOption'> & { correctOption?: string }) | null = null;
    if (activeQuestion) {
      if (currentUser.role === 'student' && activeQuestion.status !== 'locked' && activeQuestion.status !== 'completed') {
        const { correctOption: _hidden, ...rest } = activeQuestion;
        sanitizedQuestion = rest;
      } else {
        sanitizedQuestion = activeQuestion;
      }
    }

    return {
      quiz,
      currentQuestion: sanitizedQuestion,
      aggregate,
      myResponse,
      myScore,
      answeredCount
    };
  }

  /**
   * 16. COMPUTE AUTHORITATIVE AGGREGATE
   */
  async computeAggregate(
    quiz: Quiz,
    question: QuizQuestion,
    requester?: User
  ): Promise<QuestionAggregate> {
    const responses = await this.repo.quizzes.listResponses(quiz.id, question.id);
    const participants = await this.repo.classroom.listParticipants(quiz.classroomSessionId, true);
    const totalParticipants = Math.max(participants.length, responses.length, 1);

    const optionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    let correctCount = 0;

    for (const r of responses) {
      const opt = r.selectedOption.toUpperCase();
      optionCounts[opt] = (optionCounts[opt] || 0) + 1;
      if (r.isCorrect) correctCount++;
    }

    const answeredCount = responses.length;
    const unansweredCount = Math.max(totalParticipants - answeredCount, 0);

    const optionPercentages: Record<string, number> = {};
    for (const key of ['A', 'B', 'C', 'D']) {
      optionPercentages[key] = answeredCount > 0
        ? Math.round(((optionCounts[key] || 0) / answeredCount) * 1000) / 10
        : 0;
    }

    const isLocked = question.status === 'locked' || question.status === 'completed';
    const isTeacher = requester?.role === 'teacher' || requester?.role === 'commander' || requester?.role === 'admin';

    let timeRemainingSeconds = 0;
    if (question.deadline && question.status === 'active') {
      const diffMs = Date.parse(question.deadline) - Date.now();
      timeRemainingSeconds = Math.max(0, Math.ceil(diffMs / 1000));
    }

    const aggregate: QuestionAggregate = {
      questionId: question.id,
      order: question.order,
      questionText: question.questionText,
      options: question.options,
      totalParticipants,
      answeredCount,
      unansweredCount,
      optionCounts,
      optionPercentages,
      isLocked,
      deadline: question.deadline,
      timeLimitSeconds: question.timeLimitSeconds,
      timeRemainingSeconds
    };

    // Correct option only visible if locked OR requester is teacher/admin
    if (isLocked || isTeacher) {
      aggregate.correctOption = question.correctOption;
      aggregate.correctCount = correctCount;
    }

    return aggregate;
  }

  /**
   * 17. COMPUTE FINAL QUIZ RESULTS
   */
  async computeResults(quiz: Quiz): Promise<QuizResults> {
    const questions = await this.repo.quizzes.listQuestions(quiz.id);
    const participantStates = await this.repo.quizzes.listParticipantStates(quiz.id);
    const totalPossiblePoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);

    const questionSummaries = await Promise.all(
      questions.map(async (q) => {
        const responses = await this.repo.quizzes.listResponses(quiz.id, q.id);
        const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
        let cCount = 0;

        for (const r of responses) {
          const opt = r.selectedOption.toUpperCase();
          counts[opt] = (counts[opt] || 0) + 1;
          if (r.isCorrect) cCount++;
        }

        const pct: Record<string, number> = {};
        for (const key of ['A', 'B', 'C', 'D']) {
          pct[key] = responses.length > 0 ? Math.round(((counts[key] || 0) / responses.length) * 1000) / 10 : 0;
        }

        return {
          questionId: q.id,
          order: q.order,
          questionText: q.questionText,
          options: q.options,
          correctOption: q.correctOption,
          totalResponses: responses.length,
          correctCount: cCount,
          optionCounts: counts,
          optionPercentages: pct
        };
      })
    );

    const participants = await Promise.all(
      participantStates.map(async (p) => {
        const studentResponses = await this.repo.quizzes.listResponses(quiz.id);
        const myResponses = studentResponses.filter((r) => r.studentId === p.studentId);
        const correctAnswers = myResponses.filter((r) => r.isCorrect).length;
        const percentage = totalPossiblePoints > 0 ? Math.round((p.score / totalPossiblePoints) * 1000) / 10 : 0;

        return {
          studentId: p.studentId,
          displayName: p.displayName || `Student ${p.studentId}`,
          score: p.score,
          answeredQuestions: p.answeredCount,
          correctAnswers,
          totalPossiblePoints,
          percentage
        };
      })
    );

    // Sort participants by score descending (leaderboard)
    participants.sort((a, b) => b.score - a.score);

    const totalParticipants = participants.length;
    const averageScore = totalParticipants > 0
      ? Math.round((participants.reduce((sum, p) => sum + p.score, 0) / totalParticipants) * 10) / 10
      : 0;
    const averagePercentage = totalPossiblePoints > 0
      ? Math.round((averageScore / totalPossiblePoints) * 1000) / 10
      : 0;

    return {
      quizId: quiz.id,
      title: quiz.title,
      status: quiz.status,
      totalQuestions: questions.length,
      totalParticipants,
      totalPossiblePoints,
      averageScore,
      averagePercentage,
      participants,
      questionSummaries
    };
  }
}

export const smartQuizService = new SmartQuizService();
