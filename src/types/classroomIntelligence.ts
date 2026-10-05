// JARVIS EDUCATION OS — PHASE D.15: CLASSROOM INTELLIGENCE TYPES
// Canonical models for Classroom Intelligence, Evidence Tracking, Misconception Engine, and Action Recommendations.

import type { AcademicContext } from './academicContext.ts';

export type ClassroomEvidenceSourceType =
  | 'QUIZ_RESULT'
  | 'QUIZ_QUESTION'
  | 'BOARD_EVENT'
  | 'BOARD_KNOWLEDGE'
  | 'STUDENT_QUESTION'
  | 'ASSIGNMENT_SUBMISSION'
  | 'ASSIGNMENT_GRADE'
  | 'LESSON_PROGRESS'
  | 'FOCUS_SESSION'
  | 'COMMUNITY_ACTIVITY'
  | 'CLASSROOM_EVENT';

export type EvidenceVisibility =
  | 'PRIVATE_STUDENT'
  | 'TEACHER_ONLY'
  | 'CLASS_VISIBLE'
  | 'SCHOOL_AGGREGATE'
  | 'PRINCIPAL_ONLY';

export interface ClassroomEvidenceItem {
  id: string;
  sourceType: ClassroomEvidenceSourceType;
  sourceId: string;
  timestamp: string;
  academicContext?: AcademicContext;
  metric: string;
  value: number | string | boolean | Record<string, unknown>;
  studentId?: string;
  studentName?: string;
  visibility: EvidenceVisibility;
  description?: string;
  confidence?: number; // 0 to 1
}

export interface MisconceptionItem {
  id: string;
  concept: string;
  topic: string;
  observedEvidence: string; // e.g. "42% of submitted answers were incorrect on questions tagged magnetic flux."
  evidenceIds: string[];
  affectedStudentCount?: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  isInferred?: boolean;
  aiHypothesis?: string; // e.g. "Students may be confusing magnetic flux with magnetic field strength." (marked as inference)
  suggestedRemediation?: string;
  sourceQuestionIds?: string[];
  sourceBoardPageIds?: string[];
}

export interface StrengthItem {
  id: string;
  concept: string;
  observedMasteryPercent: number;
  evidenceSummary: string;
  evidenceIds: string[];
}

export interface AttentionCadetSignal {
  studentId: string;
  studentName: string;
  severity: 'urgent' | 'high' | 'medium';
  reasons: string[];
  evidenceIds: string[];
  suggestedAction: string;
  actionTarget: string;
  contextPatch?: Record<string, unknown>;
}

export interface RecommendedTeacherAction {
  id: string;
  action: string;
  reason: string;
  supportingEvidenceIds: string[];
  academicContext: AcademicContext;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'reteach' | 'diagnostic' | 'practice' | 'followup' | 'prep';
  suggestedAction: string;
  actionLabel: string;
  actionTarget: string; // e.g. 'teacher_session_prep' | 'assignments' | 'community' | 'smartboard'
  contextPatch?: Record<string, unknown>;
}

export interface RecommendedStudentAction {
  id: string;
  studentId?: string;
  title: string;
  description: string;
  reason: string;
  category: 'review' | 'checkpoint' | 'continue_lesson' | 'focus' | 'ask_jarvis';
  actionLabel: string;
  actionTarget: string; // e.g. 'my_learning' | 'lesson_workspace' | 'focus' | 'classroom'
  contextPatch?: Record<string, unknown>;
  supportingEvidenceId?: string;
}

export interface CarryForwardTeachingSignal {
  id: string;
  concept: string;
  reason: string;
  recommendedReviewSlideOrBoardPage?: number;
  suggestedDiagnosticQuestions?: string[];
  isApprovedByTeacher: boolean;
  sourceSessionId?: string;
}

export interface ClassroomEvidenceDimension {
  dimension: 'Assessment' | 'Participation' | 'Completion' | 'Practice' | 'Board';
  status: 'sufficient' | 'insufficient';
  scorePercent?: number;
  evidenceCount: number;
  sourceDescription: string;
  timeWindow: string;
}

export interface ClassroomMetrics {
  participation: {
    totalEnrolled: number;
    activeParticipants: number;
    participationRate: number;
    questionsAskedCount: number;
    messagesCount: number;
  };
  assessment: {
    averageScorePercent: number;
    medianScorePercent: number;
    completionRatePercent: number;
    totalSubmissions: number;
    questionLevelAccuracy: Array<{
      questionId: string;
      prompt: string;
      correctRate: number;
      topic?: string;
      commonIncorrectOption?: string;
    }>;
    conceptAccuracy: Array<{
      concept: string;
      correctRate: number;
      attemptsCount: number;
    }>;
  };
  learning: {
    lessonCompleted: boolean;
    practiceCompletionRate: number;
    unitMasteryPercent: number;
  };
  board: {
    totalPages: number;
    releasedPagesCount: number;
    recognizedFormulasCount: number;
    diagramsCount: number;
    visualizationsCount: number;
    boardKnowledgeCount: number;
  };
  assignments: {
    linkedAssignmentCount: number;
    submissionsCount: number;
    pendingGradingCount: number;
    overdueCount: number;
  };
  focus: {
    activeFocusSessionsCount: number;
    totalFocusMinutes: number;
    averageFocusMinutes: number;
  };
  community: {
    relevantDiscussionsCount: number;
    studyGroupSessionsCount: number;
  };
  evidenceDimensions: ClassroomEvidenceDimension[];
}

export interface AiClassroomInterpretation {
  summaryText: string;
  misconceptionInferences: Array<{
    concept: string;
    hypothesis: string;
    confidence: number;
  }>;
  pedagogicalAdvice: string[];
  generatedAt: string;
  model: string;
  isCached: boolean;
}

export interface ClassroomIntelligence {
  id: string;
  institutionId: string;
  classId: string;
  courseId: string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  classSessionId: string;
  sessionTopic: string;
  generatedAt: string;
  evidenceWindow: {
    start: string;
    end: string;
  };
  evidenceSummary: {
    totalEvidenceCount: number;
    hasSufficientEvidence: boolean;
  };
  evidenceItems: ClassroomEvidenceItem[];
  metrics: ClassroomMetrics;
  misconceptions: MisconceptionItem[];
  strengths: StrengthItem[];
  studentsNeedingAttention: AttentionCadetSignal[];
  recommendedTeacherActions: RecommendedTeacherAction[];
  recommendedStudentActions: RecommendedStudentAction[];
  recommendedNextLessonActions: CarryForwardTeachingSignal[];
  aiInterpretation?: AiClassroomInterpretation;
  evidenceHash: string;
  confidence: number;
  isCached: boolean;
}

export interface GradeClassroomIntelligence {
  gradeId: string;
  gradeLevel: string;
  institutionId: string;
  generatedAt: string;
  classesCount: number;
  totalStudents: number;
  averageMasteryPercent: number;
  commonDifficulties: Array<{
    concept: string;
    courseCode: string;
    affectedClassesCount: number;
    observedFailureRate: number;
  }>;
  activeFollowUpsCount: number;
  curriculumVelocity: {
    onTrackClassesCount: number;
    behindClassesCount: number;
  };
}

export interface FamilyClassroomIntelligence {
  studentId: string;
  studentName: string;
  institutionId: string;
  classId: string;
  courseCode: string;
  courseName: string;
  currentTopic: string;
  todayFocus: string;
  needsAttention?: {
    title: string;
    description: string;
    dueDate?: string;
  };
  suggestedAction: {
    title: string;
    description: string;
  };
  updatedAt: string;
}
