// JARVIS EDUCATION OS — PHASE D: CANONICAL ACADEMIC CONTEXT & LEARNING LINKS
// "ONE ACADEMIC CONTEXT → MANY CONNECTED EXPERIENCES"

export type EducationRole = 'student' | 'teacher' | 'principal' | 'admin';

/**
 * Canonical Academic Context Model
 * Represents the current academic locus across all subsystems.
 * Never used for client-authoritative authentication; strictly for context, navigation, and cross-linking.
 */
export interface AcademicContext {
  institutionId: string;
  workspaceId?: string;
  classId?: string;
  className?: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitTitle?: string;
  chapterId?: string;
  chapterTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  classSessionId?: string;
  assignmentId?: string;
  quizId?: string;
  knowledgeSpaceIds?: string[];
  workspacePageId?: string;
  communityChannelId?: string;
  communityThreadId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Learning Object Types across the entire Education OS
 */
export type LearningObjectType =
  | 'institution'
  | 'workspace'
  | 'class'
  | 'course'
  | 'subject'
  | 'unit'
  | 'chapter'
  | 'lesson'
  | 'classSession'
  | 'assignment'
  | 'submission'
  | 'quiz'
  | 'quizResult'
  | 'knowledgeSpace'
  | 'knowledgeSource'
  | 'workspacePage'
  | 'communityChannel'
  | 'communityThread'
  | 'studyGroup'
  | 'focusSession'
  | 'calendarEvent';

/**
 * Relationships connecting learning objects
 */
export type LearningLinkRelation =
  | 'primary'
  | 'curriculum'
  | 'material'
  | 'assessment'
  | 'homework'
  | 'discussion'
  | 'study'
  | 'notes'
  | 'schedule'
  | 'reference'
  | 'prerequisite';

/**
 * Canonical Learning Object Link
 * Durable connection between two learning objects (e.g. ClassSession -> WorkspacePage, Lesson -> CommunityChannel)
 */
export interface LearningLink {
  id: string;
  workspaceId: string;
  sourceType: LearningObjectType;
  sourceId: string;
  targetType: LearningObjectType;
  targetId: string;
  relation: LearningLinkRelation;
  title?: string;
  context?: AcademicContext;
  createdBy: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Lightweight Domain Academic Event Types
 */
export type AcademicEventType =
  | 'lesson.viewed'
  | 'lesson.completed'
  | 'classSession.created'
  | 'classSession.approved'
  | 'classSession.scheduled'
  | 'classSession.started'
  | 'classSession.completed'
  | 'assignment.created'
  | 'assignment.submitted'
  | 'assignment.graded'
  | 'quiz.created'
  | 'quiz.started'
  | 'quiz.completed'
  | 'focus.started'
  | 'focus.completed'
  | 'community.thread.created'
  | 'community.message.created'
  | 'workspace.page.created'
  | 'workspace.page.updated'
  | 'resource.shared';

/**
 * Domain Event Record
 */
export interface AcademicEvent {
  id: string;
  type: AcademicEventType;
  actorId: string;
  workspaceId: string;
  context: AcademicContext;
  entityType: LearningObjectType;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Canonical Academic Notification
 */
export interface AcademicNotification {
  id: string;
  type: string;
  actorId: string;
  recipientId: string; // 'all' or userId
  targetType: LearningObjectType;
  targetId: string;
  title: string;
  message: string;
  context?: AcademicContext;
  readState: boolean;
  createdAt: string;
}

/**
 * Structured Deterministic Quiz Assessment Result
 */
export interface QuizResult {
  id: string;
  studentId: string;
  studentName?: string;
  quizId: string;
  quizTitle?: string;
  classSessionId?: string;
  lessonId?: string;
  concepts: string[];
  score: number;
  totalQuestions: number;
  percentage: number;
  completed: boolean;
  timestamp: string;
}

/**
 * Unified Calendar Feed Item
 * Combines ClassSessions, Assignment Deadlines, and Study/Focus Blocks
 */
export interface CalendarFeedItem {
  id: string;
  title: string;
  type: 'class_session' | 'assignment_due' | 'study_block' | 'exam';
  date: string; // YYYY-MM-DD
  time: string;
  courseCode: string;
  courseName?: string;
  location?: string;
  classId?: string;
  courseId?: string;
  unitId?: string;
  lessonId?: string;
  classSessionId?: string;
  assignmentId?: string;
  context?: AcademicContext;
}

/**
 * Bounded AI Context Model
 * Strictly server-authoritative context builder for intelligent assistants without bloated injection or cross-tenant leakage.
 */
export interface BoundedAiContext {
  user: {
    id: string;
    role: string;
    displayName: string;
  };
  role: EducationRole;
  academicContext: AcademicContext;
  relevantLesson?: {
    id: string;
    title: string;
    description: string;
    keyTakeaways?: string[];
  };
  relevantSession?: {
    id: string;
    topic: string;
    status: string;
    lessonPlanTitle?: string;
    learningObjectives?: string[];
  };
  relevantResources: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  allowedKnowledgeSpaces: string[];
  activeTask?: string;
  generatedAt: string;
}
