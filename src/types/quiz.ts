// Milestone 13: Deterministic Smart Quiz & Live Responses Types

export type QuizStatus = 'draft' | 'ready' | 'live' | 'paused' | 'completed' | 'cancelled';
export type QuestionStatus = 'pending' | 'active' | 'locked' | 'completed';

export interface QuizQuestion {
  id: string;
  questionId: string; // Convenience alias identical to id
  quizId: string;
  order: number;
  questionText: string;
  options: string[]; // Standard 4 options: [A, B, C, D]
  correctOption: string; // Standard "A" | "B" | "C" | "D" (or option text or index)
  points: number;
  timeLimitSeconds: number;
  status: QuestionStatus;
  startedAt?: string;
  deadline?: string; // Authoritative ISO timestamp
}

export interface Quiz {
  id: string;
  quizId: string; // Convenience alias identical to id
  workspaceId: string;
  classId: string;
  classroomSessionId: string;
  teacherId: string;
  title: string;
  description?: string;
  status: QuizStatus;
  currentQuestionIndex: number; // -1 if not started, 0..totalQuestions - 1
  totalQuestions: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QuizResponse {
  id: string;
  responseId: string; // Convenience alias identical to id
  quizId: string;
  questionId: string;
  studentId: string;
  selectedOption: string; // "A" | "B" | "C" | "D"
  submittedAt: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface QuizParticipantState {
  id: string;
  quizId: string;
  studentId: string;
  displayName: string;
  joinedAt: string;
  lastSeenAt: string;
  score: number;
  answeredCount: number;
}

export interface QuestionAggregate {
  questionId: string;
  order: number;
  questionText: string;
  options: string[];
  totalParticipants: number;
  answeredCount: number;
  unansweredCount: number;
  optionCounts: Record<string, number>; // e.g. { A: 4, B: 0, C: 1, D: 0 }
  optionPercentages: Record<string, number>; // e.g. { A: 80, B: 0, C: 20, D: 0 }
  isLocked: boolean;
  correctOption?: string; // Excluded for students before locking
  correctCount?: number;
  deadline?: string;
  timeLimitSeconds: number;
  timeRemainingSeconds?: number;
}

export interface StudentQuizState {
  quiz: Quiz;
  currentQuestion: (Omit<QuizQuestion, 'correctOption'> & { correctOption?: string }) | null;
  aggregate: QuestionAggregate | null;
  myResponse: QuizResponse | null;
  myScore: number;
  answeredCount: number;
}

export interface QuizParticipantSummary {
  studentId: string;
  displayName: string;
  score: number;
  answeredQuestions: number;
  correctAnswers: number;
  totalPossiblePoints: number;
  percentage: number;
}

export interface QuizQuestionSummary {
  questionId: string;
  order: number;
  questionText: string;
  options: string[];
  correctOption: string;
  totalResponses: number;
  correctCount: number;
  optionCounts: Record<string, number>;
  optionPercentages: Record<string, number>;
}

export interface QuizResults {
  quizId: string;
  title: string;
  status: QuizStatus;
  totalQuestions: number;
  totalParticipants: number;
  totalPossiblePoints: number;
  averageScore: number;
  averagePercentage: number;
  participants: QuizParticipantSummary[];
  questionSummaries: QuizQuestionSummary[];
}
