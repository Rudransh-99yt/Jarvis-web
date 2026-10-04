// JARVIS EDUCATION OS — PHASE D.7: FAMILY & PARENT INTELLIGENCE TYPES
// Canonical models for Family relationships, Parent Portal, Child Progress, and Privacy Boundaries.

export type FamilyRelationshipType = 'parent' | 'guardian' | 'mother' | 'father';
export type FamilyMembershipStatus = 'active' | 'pending' | 'revoked';

export interface FamilyPermissions {
  canViewGrades: boolean;
  canViewAssignments: boolean;
  canViewAttendance: boolean;
  canViewActivity: boolean;
  canCommunicateTeachers: boolean;
}

export interface FamilyMembership {
  id: string;
  familyId: string;
  userId: string; // The parent user ID
  studentId: string; // The child student ID
  relationship: FamilyRelationshipType;
  status: FamilyMembershipStatus;
  permissions: FamilyPermissions;
  createdAt: string;
  updatedAt?: string;
}

export interface ChildSummary {
  studentId: string;
  displayName: string;
  email: string;
  gradeLevel: string;
  institutionName: string;
  cohort: string;
  avatarUrl?: string;
  streakDays: number;
  classesCount: number;
}

export interface ChildTodayClass {
  classId: string;
  courseCode: string;
  courseName: string;
  room: string;
  time: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  topic: string;
  instructorName: string;
}

export interface ChildSubjectProgress {
  classId: string;
  courseCode: string;
  courseName: string;
  instructorName: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  currentUnit: string;
  currentLesson: string;
  lastActive: string;
}

export interface ChildAssignmentWork {
  id: string;
  classId: string;
  courseCode: string;
  title: string;
  dueDate: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'graded';
  grade?: number;
  maxScore: number;
  feedback?: string; // sanitized feedback without teacher internal notes
  isOverdue: boolean;
}

export interface ChildAssessmentSummary {
  id: string;
  title: string;
  courseCode: string;
  type: 'formative_quiz' | 'practice_checkpoint' | 'diagnostic';
  date: string;
  score?: number;
  maxScore?: number;
  accuracyPercent?: number;
  status: 'completed' | 'upcoming';
  teacherFeedbackSnippet?: string;
  // NOTE: Answer keys and questions are strictly omitted for parent viewing
}

export interface ChildAttentionAlert {
  id: string;
  type: 'missed_work' | 'upcoming_deadline' | 'prolonged_inactivity' | 'teacher_followup';
  title: string;
  description: string;
  courseCode: string;
  date: string;
  recommendedAction: string;
}

export interface TeacherFamilyCommunication {
  id: string;
  teacherName: string;
  courseCode: string;
  title: string;
  message: string;
  sentAt: string;
  type: 'announcement' | 'personal_update' | 'academic_alert';
}

export interface FamilyHomeIntelligence {
  child: ChildSummary;
  todayClasses: ChildTodayClass[];
  subjectsProgress: ChildSubjectProgress[];
  pendingWork: ChildAssignmentWork[];
  missingCount: number;
  recentAssessments: ChildAssessmentSummary[];
  streakDays: number;
  totalStudyMinutesThisWeek: number;
  attentionAlerts: ChildAttentionAlert[];
  communications: TeacherFamilyCommunication[];
  nextAction: {
    title: string;
    description: string;
    courseCode: string;
    dueDate?: string;
  };
}
