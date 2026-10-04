// JARVIS EDUCATION OS — PHASE D.7: PRINCIPAL & INSTITUTIONAL INTELLIGENCE TYPES
// Canonical models for School-wide Oversight, Grade Intelligence, Teacher Workload Projections, Diagnostic Quiz Commands, and Audit Logging.

import type { AcademicInstitution, AcademicGrade } from './education.ts';

export interface GradeSummaryKPI {
  gradeId: string;
  name: string;
  code: string;
  level: number;
  studentsCount: number;
  classesCount: number;
  averageCompletionRate: number;
  pendingGradingCount: number;
  attentionAlertsCount: number;
}

export interface SchoolOperationalPulse {
  activeClassroomsNow: number;
  scheduledLecturesToday: number;
  totalStudentsEnrolled: number;
  facultyOnDuty: number;
  systemHealth: 'nominal' | 'attention_required' | 'degraded';
}

export interface SchoolIntelligenceData {
  institution: AcademicInstitution;
  pulse: SchoolOperationalPulse;
  grades: GradeSummaryKPI[];
  kpis: {
    totalStudents: number;
    totalFaculty: number;
    totalClasses: number;
    syllabusVelocityPercent: number;
    overallAttendancePercent: number;
    assignmentSubmissionRate: number;
    formativePulseAccuracy: number;
  };
  operationalAlerts: Array<{
    id: string;
    level: 'info' | 'advisory' | 'action_required';
    title: string;
    description: string;
    scope: string;
    timestamp: string;
  }>;
}

export interface GradeClassSummary {
  classId: string;
  code: string;
  name: string;
  instructorName: string;
  studentCount: number;
  room: string;
  syllabusCompletionPercent: number;
  pendingGradingCount: number;
  attentionCadetsCount: number;
  lastActive: string;
}

export interface GradeIntelligenceData {
  gradeId: string;
  gradeName: string;
  level: number;
  studentCount: number;
  classes: GradeClassSummary[];
  activeCourses: Array<{
    id: string;
    code: string;
    name: string;
    teachersCount: number;
    classesCount: number;
  }>;
  faculty: Array<{
    id: string;
    name: string;
    courses: string[];
    classesCount: number;
    onSchedule: boolean;
  }>;
  upcomingAssessments: Array<{
    id: string;
    title: string;
    courseCode: string;
    scheduledDate: string;
    type: string;
    classesInvolved: string[];
  }>;
  interventions: Array<{
    id: string;
    type: 'missed_work' | 'low_practice' | 'incomplete_diagnostic';
    title: string;
    scope: string;
    evidence: string;
    timeframe: string;
    suggestedAction: string;
  }>;
  trends: {
    completionHistory: Array<{ period: string; rate: number }>;
    attendanceHistory: Array<{ period: string; rate: number }>;
  };
}

export interface TeacherLeadershipProjection {
  teacherId: string;
  teacherName: string;
  department: string;
  email: string;
  courses: string[];
  classesCount: number;
  studentCount: number;
  scheduledSessionsCount: number;
  sessionsPreparedCount: number;
  pendingGradingCount: number;
  gradingTurnaroundAvgHours: number;
  status: 'On Schedule' | 'Needs Support' | 'Ahead of Schedule';
  operationalNotes: string;
}

export interface ClassInstitutionalProjection {
  classId: string;
  courseCode: string;
  courseName: string;
  instructorName: string;
  room: string;
  schedule: string;
  studentCount: number;
  unitsPublished: number;
  syllabusCompletionPercent: number;
  attendanceRate: number;
  pendingGradingCount: number;
  attentionSignalsCount: number;
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
    participationRate: number;
  };
}

export interface PrincipalCommandProposal {
  id: string;
  commandPrompt: string;
  actorId: string;
  actorName: string;
  institutionId: string;
  targetGradeId: string;
  targetGradeName: string;
  targetCourseCode: string;
  targetClasses: Array<{ id: string; code: string; name: string }>;
  coveredTopics: string[];
  questionCount: number;
  durationMinutes: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  examRelevance: string;
  approvedKnowledgeSpaceIds: string[];
  sourceReferences: string[];
  previewQuestions: Array<{
    id: string;
    prompt: string;
    type: 'mcq' | 'numerical' | 'short_answer';
    points: number;
    topic: string;
  }>;
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTED' | 'CANCELLED';
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
  resultingQuizIds?: string[];
}

export interface InstitutionalAuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  institutionId: string;
  action: string;
  targetScope: string;
  sourceObjectIds: string[];
  generatedObjectIds: string[];
  approvedAt: string;
  executedAt: string;
  outcome: 'SUCCESS' | 'FAILED' | 'REJECTED';
  metadata?: Record<string, unknown>;
}
