// Domain Models for Jarvis Education Pro Focus / Pomodoro + Focus Lock Subsystem

export type FocusMode =
  | 'POMODORO'
  | 'DEEP_FOCUS'
  | 'STUDY_LOCK'
  | 'EXAM_LOCK'
  | 'CUSTOM_FOCUS'
  | 'BREAK';

export type FocusSessionStatus =
  | 'DRAFT'
  | 'READY'
  | 'ACTIVE'
  | 'PAUSED'
  | 'BREAK'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'LOCKED';

export type FocusTargetType =
  | 'course'
  | 'subject'
  | 'chapter'
  | 'lesson'
  | 'class_session'
  | 'assignment'
  | 'workspace_page'
  | 'knowledge_space'
  | 'video'
  | 'community_study_group'
  | 'general';

export interface FocusTarget {
  type: FocusTargetType;
  id: string;
  title: string;
  courseId?: string;
  courseCode?: string;
  chapterId?: string;
  lessonId?: string;
  workspacePageId?: string;
  assignmentId?: string;
  context?: string;
}

export interface FocusPolicy {
  mode: FocusMode;
  allowedRoutes: string[]; // e.g. ['focus', 'lesson_workspace', 'chapter_detail', 'workspace', 'video_detail']
  blockedRoutes: string[]; // e.g. ['community', 'assignments', 'classes', 'study', 'principal']
  allowedCourseIds?: string[];
  allowedResourceTypes?: string[];
  allowedWorkspacePageIds?: string[];
  allowCommunity: boolean;
  notificationPolicy: 'all' | 'essential_only' | 'suppress_all';
  exitPolicy: 'normal' | 'deep' | 'study_lock' | 'exam_lock';
  exitCountdownSeconds?: number;
}

export interface FocusCycle {
  cycleIndex: number;
  plannedDurationMinutes: number;
  actualDurationSeconds: number;
  isBreak: boolean;
  breakType?: 'short' | 'long';
  startedAt: string;
  completedAt?: string;
}

export type FocusEventType =
  | 'focus.started'
  | 'focus.paused'
  | 'focus.resumed'
  | 'focus.break.started'
  | 'focus.break.completed'
  | 'focus.route.blocked'
  | 'focus.exit.requested'
  | 'focus.ended'
  | 'focus.completed'
  | 'exam.focus.started'
  | 'exam.focus.interrupted'
  | 'exam.focus.ended';

export interface FocusEvent {
  id: string;
  sessionId: string;
  userId: string;
  type: FocusEventType;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface FocusTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface FocusSession {
  id: string;
  userId: string;
  schoolId: string;
  classId?: string;
  mode: FocusMode;
  status: FocusSessionStatus;
  target: FocusTarget;
  plannedDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  totalCycles: number;
  currentCycle: number;
  isBreak: boolean;
  breakType?: 'short' | 'long';
  startedAt?: string;
  expiresAt?: string;
  pausedAt?: string;
  accumulatedElapsedSeconds: number;
  activeCycleStartedAt?: string;
  policy: FocusPolicy;
  allowedResources: Array<{ type: string; id: string; title: string }>;
  scratchpadNotes: string;
  tasks: FocusTask[];
  suppressedNotificationsCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface FocusStatistics {
  totalFocusSeconds: number;
  completedSessionsCount: number;
  cancelledSessionsCount: number;
  interruptedSessionsCount: number;
  averageDurationMinutes: number;
  totalCyclesCompleted: number;
  streakDays: number;
  weeklyFocusMinutes: number;
  subjectBreakdown: Record<string, number>; // subject -> minutes
}
