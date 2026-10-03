// Milestone 12: Real-Time EventBus for Smart Classroom Sessions, Presence & Smart Board
import { EventEmitter } from 'node:events';
import type {
  RealtimeClassroomEvent,
  ClassroomEventType,
  ClassroomSession,
  ClassroomParticipant,
  SmartBoardState
} from '../../../src/types/classroom.ts';
import type {
  Quiz,
  QuizQuestion,
  QuizResponse,
  QuestionAggregate,
  QuizResults
} from '../../../src/types/quiz.ts';

export class ClassroomEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow large numbers of concurrent connected student devices (40+ classroom scale)
    this.setMaxListeners(250);
  }

  /**
   * Broadcasts a real-time event to session participants.
   */
  publishEvent(event: RealtimeClassroomEvent): void {
    const { sessionId, workspaceId, type } = event;

    // 1. Emit general event
    this.emit('classroom_event', event);

    // 2. Emit session-specific channel event
    this.emit(`session:${workspaceId}:${sessionId}`, event);

    // 3. Emit specific event type on session channel
    this.emit(`session:${sessionId}:${type}`, event);

    // 4. Emit to global presence channel for heartbeat aggregation
    if (type === 'classroom.student.presence') {
      this.emit(`presence:${sessionId}`, event);
    }
  }

  /**
   * Convenience helpers for lifecycle events
   */
  notifySessionStarted(session: ClassroomSession): void {
    this.publishEvent({
      type: 'classroom.session.started',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: session,
      timestamp: new Date().toISOString()
    });
  }

  notifySessionPaused(session: ClassroomSession): void {
    this.publishEvent({
      type: 'classroom.session.paused',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: session,
      timestamp: new Date().toISOString()
    });
  }

  notifySessionResumed(session: ClassroomSession): void {
    this.publishEvent({
      type: 'classroom.session.resumed',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: session,
      timestamp: new Date().toISOString()
    });
  }

  notifySessionEnded(session: ClassroomSession): void {
    this.publishEvent({
      type: 'classroom.session.ended',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: session,
      timestamp: new Date().toISOString()
    });
  }

  notifyStudentJoined(session: ClassroomSession, participant: ClassroomParticipant): void {
    this.publishEvent({
      type: 'classroom.student.joined',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: {
        participant,
        activeStudentCount: session.activeStudentCount
      },
      timestamp: new Date().toISOString()
    });
  }

  notifyStudentLeft(session: ClassroomSession, participant: ClassroomParticipant): void {
    this.publishEvent({
      type: 'classroom.student.left',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: {
        participant,
        activeStudentCount: session.activeStudentCount
      },
      timestamp: new Date().toISOString()
    });
  }

  notifyStudentPresence(session: ClassroomSession, participant: ClassroomParticipant): void {
    this.publishEvent({
      type: 'classroom.student.presence',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: {
        studentId: participant.studentId,
        displayName: participant.displayName,
        lastSeenAt: participant.lastSeenAt,
        connectionStatus: participant.connectionStatus,
        activeStudentCount: session.activeStudentCount
      },
      timestamp: new Date().toISOString()
    });
  }

  notifyBoardStateChanged(session: ClassroomSession, boardState: SmartBoardState): void {
    this.publishEvent({
      type: 'classroom.board.state.changed',
      sessionId: session.id,
      classId: session.classId,
      workspaceId: session.workspaceId,
      data: {
        boardState,
        activeStudentCount: session.activeStudentCount
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Milestone 13: Smart Quiz Real-Time Notification Helpers
   */
  notifyQuizCreated(quiz: Quiz): void {
    this.publishEvent({
      type: 'quiz.created',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quiz },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuizUpdated(quiz: Quiz): void {
    this.publishEvent({
      type: 'quiz.updated',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quiz },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuizStarted(quiz: Quiz, activeQuestion?: QuizQuestion): void {
    this.publishEvent({
      type: 'quiz.started',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quiz, activeQuestion },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuestionStarted(quiz: Quiz, question: QuizQuestion, aggregate: QuestionAggregate): void {
    this.publishEvent({
      type: 'quiz.question.started',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: {
        quizId: quiz.id,
        currentQuestionIndex: quiz.currentQuestionIndex,
        totalQuestions: quiz.totalQuestions,
        question: {
          id: question.id,
          questionId: question.questionId,
          order: question.order,
          questionText: question.questionText,
          options: question.options,
          points: question.points,
          timeLimitSeconds: question.timeLimitSeconds,
          status: question.status,
          startedAt: question.startedAt,
          deadline: question.deadline
        },
        aggregate
      },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuestionUpdated(quiz: Quiz, question: QuizQuestion, aggregate?: QuestionAggregate): void {
    this.publishEvent({
      type: 'quiz.question.updated',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quizId: quiz.id, question, aggregate },
      timestamp: new Date().toISOString()
    });
  }

  notifyResponseAccepted(
    quiz: Quiz,
    questionId: string,
    studentId: string,
    aggregate: QuestionAggregate
  ): void {
    this.publishEvent({
      type: 'quiz.response.accepted',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: {
        quizId: quiz.id,
        questionId,
        studentId,
        aggregate
      },
      timestamp: new Date().toISOString()
    });
  }

  notifyResponseRejected(
    quiz: Quiz,
    studentId: string,
    questionId: string,
    reason: string
  ): void {
    this.publishEvent({
      type: 'quiz.response.rejected',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: {
        quizId: quiz.id,
        studentId,
        questionId,
        reason
      },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuestionLocked(
    quiz: Quiz,
    question: QuizQuestion,
    aggregate: QuestionAggregate
  ): void {
    this.publishEvent({
      type: 'quiz.question.locked',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: {
        quizId: quiz.id,
        questionId: question.id,
        order: question.order,
        correctOption: question.correctOption,
        aggregate
      },
      timestamp: new Date().toISOString()
    });
  }

  notifyResultsUpdated(quiz: Quiz, results: QuizResults): void {
    this.publishEvent({
      type: 'quiz.results.updated',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quizId: quiz.id, results },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuizPaused(quiz: Quiz): void {
    this.publishEvent({
      type: 'quiz.paused',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quiz },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuizResumed(quiz: Quiz): void {
    this.publishEvent({
      type: 'quiz.resumed',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quiz },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuizCompleted(quiz: Quiz, results: QuizResults): void {
    this.publishEvent({
      type: 'quiz.completed',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quiz, results },
      timestamp: new Date().toISOString()
    });
  }

  notifyQuizCancelled(quiz: Quiz): void {
    this.publishEvent({
      type: 'quiz.cancelled',
      sessionId: quiz.classroomSessionId,
      classId: quiz.classId,
      workspaceId: quiz.workspaceId,
      data: { quiz },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribes a listener to events for a specific authorized session & workspace.
   */
  subscribeToSession(
    sessionId: string,
    workspaceId: string,
    handler: (event: RealtimeClassroomEvent) => void
  ): () => void {
    const channelName = `session:${workspaceId}:${sessionId}`;

    const onEvent = (event: RealtimeClassroomEvent) => {
      handler(event);
    };

    this.on(channelName, onEvent);

    return () => {
      this.off(channelName, onEvent);
    };
  }
}

export const classroomEventBus = new ClassroomEventBus();
