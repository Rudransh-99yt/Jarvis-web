/**
 * Phase 6.5: Provider-Neutral Classroom Response Foundation Types
 *
 * Designed for software-first execution with future physical classroom remote
 * gateway extensibility (RF, IR, Bluetooth clickers).
 */

export type ClassroomResponseSessionType = 'QUIZ' | 'ATTENDANCE' | 'POLL' | 'QUICK_CHECK';

export type ClassroomResponseSessionState = 'CREATED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface ResponseParticipant {
  participantId: string;
  userId: string;
  displayName: string;
  remoteId?: string;
  status: 'connected' | 'idle' | 'disconnected';
  joinedAt: string;
  lastActiveAt: string;
  metadata?: Record<string, unknown>;
}

export interface ResponseSessionQuestion {
  questionId: string;
  prompt: string;
  questionType?: 'single_choice' | 'multiple_choice' | 'boolean' | 'numerical' | 'short_text';
  options?: string[];
  correctAnswer?: unknown;
  concept?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  points?: number;
}

export interface ResponseEvent {
  eventId: string;
  sessionId: string;
  participantId: string;
  remoteId?: string;
  questionId?: string;
  responseValue: unknown;
  receivedAt: string;
  sequenceNumber?: number;
  source: string; // e.g., 'software-client', 'mock-provider', 'hardware-gateway'
  metadata?: Record<string, unknown>;
}

export interface ClassroomResponseSession {
  id: string;
  title: string;
  sessionType: ClassroomResponseSessionType;
  state: ClassroomResponseSessionState;
  classId: string;
  workspaceId: string;
  creatorId: string;
  activeQuestionId?: string;
  questions?: ResponseSessionQuestion[];
  participants: Record<string, ResponseParticipant>; // participantId -> ResponseParticipant
  remoteParticipantMap: Record<string, string>; // remoteId -> participantId
  config?: {
    allowMultipleAttempts?: boolean;
    anonymousAggregation?: boolean;
    autoAdvance?: boolean;
    timeoutSeconds?: number;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface QuestionResponseItem {
  participantId: string;
  userId: string;
  displayName: string;
  responseValue: unknown;
  isCorrect?: boolean;
  score?: number;
  receivedAt: string;
}

export interface QuestionResponseSummary {
  questionId: string;
  prompt?: string;
  totalResponses: number;
  correctResponses: number;
  accuracyRate: number;
  distribution: Record<string, number>;
  latestResponses: QuestionResponseItem[];
}

export interface AttendanceRecord {
  participantId: string;
  userId: string;
  displayName: string;
  status: 'PRESENT' | 'ABSENT';
  recordedAt: string;
  remoteId?: string;
}

export interface AttendanceSummary {
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

export interface PollSummary {
  totalResponses: number;
  optionCounts: Record<string, number>;
  optionPercentages: Record<string, number>;
  participantResponses: Record<string, unknown>;
}

export interface QuickCheckSummary {
  totalResponses: number;
  breakdown: {
    understood: number;
    confused: number;
    needHelp: number;
    other: number;
  };
  sentimentPositiveRatio: number;
}

export interface QuizSessionSummary {
  totalQuestions: number;
  totalAttempts: number;
  averageScore: number;
  questions: Record<string, QuestionResponseSummary>;
}

export interface ClassroomResponseSessionSummary {
  sessionId: string;
  sessionType: ClassroomResponseSessionType;
  state: ClassroomResponseSessionState;
  title: string;
  classId: string;
  totalParticipants: number;
  activeParticipants: number;
  totalEventsReceived: number;
  uniqueRespondents: number;
  activeQuestionId?: string;
  attendance?: AttendanceSummary;
  poll?: PollSummary;
  quickCheck?: QuickCheckSummary;
  quiz?: QuizSessionSummary;
  completedAt?: string;
}
