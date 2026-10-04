// JARVIS EDUCATION OS — PHASE D.6: TEACHER OPERATING SYSTEM TYPES
// Canonical models for Teacher Action Queue, Student Attention Signals, Post-Class Review, and Class Intelligence.

export type TeacherActionPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TeacherActionType =
  | 'grading'
  | 'session_review'
  | 'session_schedule'
  | 'quiz_review'
  | 'student_attention'
  | 'prep_needed';

export interface TeacherActionItem {
  id: string;
  type: TeacherActionType;
  priority: TeacherActionPriority;
  title: string;
  subtitle: string;
  courseCode: string;
  courseName: string;
  classId: string;
  dueDate?: string;
  scheduledAt?: string;
  entityId: string;
  entityType: 'submission' | 'classSession' | 'quiz' | 'student' | 'lesson';
  actionLabel: string;
  actionTarget: string;
  contextPatch?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export type AttentionSignalType =
  | 'missed_work'
  | 'practice_difficulty'
  | 'low_activity'
  | 'unresolved_feedback';

export interface StudentAttentionSignal {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  courseCode: string;
  signalType: AttentionSignalType;
  title: string;
  description: string;
  evidenceSnippet: string;
  source: string;
  sourceEntityId: string;
  detectedAt: string;
  suggestedAction: string;
  actionLabel: string;
  actionTarget: string;
  contextPatch?: Record<string, string>;
}

export interface GroundedNextAction {
  id: string;
  action: string;
  reason: string;
  type: 'reteach' | 'practice' | 'prep' | 'discussion';
  actionLabel: string;
  actionTarget: string;
  contextPatch?: Record<string, string>;
}

export interface PostClassReviewReport {
  sessionId: string;
  sessionTopic: string;
  courseCode: string;
  courseName: string;
  classId: string;
  completedAt: string;
  durationMinutes: number;
  taughtStagesCount: number;
  summaryNotes: string;
  participationRate: number;
  totalStudents: number;
  activeParticipants: number;
  quizAccuracy: number;
  completedWorkedExamples: string[];
  addressedMisconceptions: string[];
  groundedNextActions: GroundedNextAction[];
}

export interface ClassIntelligenceData {
  classId: string;
  courseCode: string;
  courseName: string;
  instructorName: string;
  room: string;
  schedule: string;
  studentCount: number;
  unitsCount: number;
  lessonsCount: number;
  syllabusCompletionPercent: number;
  activeSessionsCount: number;
  completedSessionsCount: number;
  upcomingClassSession?: {
    id: string;
    topic: string;
    scheduledAt: string;
    status: string;
  };
  recentClassSession?: {
    id: string;
    topic: string;
    completedAt: string;
  };
  pendingGradingCount: number;
  attentionCadetsCount: number;
  recentDiscussionsCount: number;
}
