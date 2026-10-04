// JARVIS EDUCATION OS — PHASE D.5: STUDENT ENGAGEMENT & LEADERBOARD TYPES
// Defines canonical engagement events, transparent point rules, privacy policies, and leaderboard structures.

export type EngagementEventType =
  | 'lesson_completed'
  | 'practice_completed'
  | 'quiz_completed'
  | 'assignment_submitted'
  | 'assignment_on_time'
  | 'focus_completed'
  | 'community_helpful'
  | 'streak_milestone';

export type EngagementSourceType =
  | 'lesson'
  | 'practice'
  | 'quiz'
  | 'assignment'
  | 'focusSession'
  | 'communityMessage';

export interface StudentEngagementEvent {
  id: string;
  studentId: string;
  studentName: string;
  institutionId: string;
  classId: string;
  courseCode?: string;
  type: EngagementEventType;
  title: string;
  description: string;
  sourceEntityType: EngagementSourceType;
  sourceEntityId: string;
  points: number;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface EngagementPointsConfig {
  lessonCompleted: number;        // default: +10
  practiceCompleted: number;      // default: +10
  quizCompleted: number;          // default: +15
  assignmentSubmitted: number;    // default: +15
  assignmentOnTimeBonus: number;  // default: +5
  focusCompleted: number;         // default: +10
  communityHelpful: number;       // default: +10
  streakMilestoneBonus: number;   // default: +20
}

export const DEFAULT_ENGAGEMENT_CONFIG: EngagementPointsConfig = {
  lessonCompleted: 10,
  practiceCompleted: 10,
  quizCompleted: 15,
  assignmentSubmitted: 15,
  assignmentOnTimeBonus: 5,
  focusCompleted: 10,
  communityHelpful: 10,
  streakMilestoneBonus: 20
};

export type LeaderboardScope = 'class' | 'cohort' | 'school';
export type LeaderboardPrivacyScope = 'OFF' | 'CLASS' | 'COHORT' | 'SCHOOL';

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  displayName: string;
  avatarInitials: string;
  points: number;
  streakDays: number;
  completedActivitiesCount: number;
  recentMilestone?: string;
  isCurrentUser: boolean;
  tier?: 'Gold' | 'Silver' | 'Bronze' | 'Cadet';
}

export interface StudentEngagementStats {
  studentId: string;
  studentName: string;
  totalPoints: number;
  classRank: number;
  cohortRank: number;
  schoolRank: number;
  streakDays: number;
  pointsThisWeek: number;
  pointsToday: number;
  breakdown: {
    lessons: number;
    practice: number;
    quizzes: number;
    assignments: number;
    focus: number;
    community: number;
  };
  recentEvents: StudentEngagementEvent[];
}
