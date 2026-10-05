// Domain Models for Jarvis Education Sector

import type { SourceReference } from './platform.ts';
import type { AcademicContext } from './academicContext.ts';

export type EducationRole = 'student' | 'teacher' | 'principal' | 'parent';
export * from './academicContext.ts';
export * from './workspace.ts';
export * from './classSession.ts';
export * from './community.ts';
export * from './focus.ts';

// --- Hierarchical Institution & Academic Hierarchy Types ---

export interface AcademicInstitution {
  id: string;
  name: string;
  code: string;
  campus: string;
  currentAcademicYear: string;
  grades: AcademicGrade[];
  batches: AcademicBatch[];
}

export interface AcademicGrade {
  id: string;
  name: string; // e.g., "Grade 12 / Senior Level"
  code: string; // e.g., "G12"
  level: number;
  classesCount: number;
  studentsCount: number;
}

export interface AcademicBatch {
  id: string;
  name: string; // e.g., "Alpha Quantum Cohort 2026"
  code: string; // e.g., "BATCH-A26"
  gradeId: string;
  term: string;
  studentCount: number;
  classIds: string[];
}

export interface CourseLesson {
  id: string;
  unitId: string;
  courseId: string;
  number: number;
  title: string;
  description: string;
  durationMinutes: number;
  videoId?: string;
  videoTimestampSeconds?: number;
  fileIds?: string[];
  knowledgeSpaceId?: string;
  isCompleted?: boolean;
  notes?: string;
  keyTakeaways?: string[];
  practiceQuestions?: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
}

export interface CourseUnit {
  id: string;
  courseId: string;
  number: number;
  title: string;
  description: string;
  learningObjectives: string[];
  estimatedHours: number;
  lessons: CourseLesson[];
  masteryPercent?: number;
  isCompleted?: boolean;
  quizId?: string;
}

export interface EducationClass {
  id: string;
  institutionId?: string;
  code: string; // e.g. "PHYS-301"
  name: string; // e.g. "Advanced Quantum Physics"
  description: string;
  instructorId: string;
  instructorName: string;
  term: string; // e.g. "Fall 2026"
  schedule: string; // e.g. "Mon / Wed 10:00 AM - 11:30 AM"
  room: string;
  studentIds: string[];
  studentCount: number;
  materialsCount: number;
  assignmentsCount: number;
  gradeLevel?: string;
  batchName?: string;
  department?: string;
  units?: CourseUnit[];
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    date: string;
    author: string;
  }>;
  materials: Array<{
    id: string;
    title: string;
    type: 'pdf' | 'notes' | 'dataset' | 'link';
    url?: string;
    uploadedAt: string;
    size: string;
  }>;
}

export type AssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'graded';

export interface Assignment {
  id: string;
  classId: string;
  className: string;
  title: string;
  description: string;
  instructions: string;
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  category: 'Worksheet' | 'Lab Report' | 'Exam' | 'Project';
  teacherId: string;
  courseId?: string;
  unitId?: string;
  lessonId?: string;
  classSessionId?: string;
  knowledgeSpaceId?: string;
  academicContext?: AcademicContext;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
  }>;
  totalEnrolled?: number;
  submittedCount?: number;
  gradedCount?: number;
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  status: AssignmentStatus;
  submittedAt?: string;
  content: string;
  attachments?: Array<{
    name: string;
    size: string;
  }>;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
}

export interface KnowledgeSource {
  id: string;
  spaceId: string;
  title: string;
  type: 'pdf' | 'notes' | 'lecture' | 'web' | 'code';
  author?: string;
  dateAdded: string;
  summary: string;
  fullText: string;
  tokenCount: number;
}

export interface KnowledgeSpace {
  id: string;
  title: string;
  description: string;
  category: string;
  ownerId: string;
  classId?: string;
  sources: KnowledgeSource[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  suggestedQuestions: string[];
}

export interface GroundedQueryResponse {
  query: string;
  spaceId: string;
  spaceTitle: string;
  answer: string;
  citations: SourceReference[];
  confidence: number;
  timestamp: string;
}

export interface StudyArtifact {
  id: string;
  type: 'explanation' | 'summary' | 'quiz' | 'flashcards';
  title: string;
  topic: string;
  content: string;
  items?: Array<{
    question: string;
    options?: string[];
    answer: string;
    explanation: string;
  }>;
  createdAt: string;
}

// Milestone 11: Teacher ↔ Student Real-Time Messaging & File Attachments
export interface ClassMessage {
  id: string;
  workspaceId: string;
  classId: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  senderRole: 'teacher' | 'student';
  body: string;
  attachmentFileIds?: string[];
  attachments?: import('./storage.ts').FileRecord[];
  readBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassConversationThread {
  id: string;
  workspaceId: string;
  classId: string;
  title: string;
  participantIds: string[];
  type: 'class_channel' | 'direct';
  createdAt: string;
  updatedAt: string;
  lastMessage?: ClassMessage;
}

export interface MessagingNotification {
  id: string;
  workspaceId: string;
  classId: string;
  messageId: string;
  senderUserId: string;
  senderName: string;
  senderRole: 'teacher' | 'student';
  title: string;
  body: string;
  hasAttachment: boolean;
  timestamp: string;
}

// Milestone 12: Smart Classroom Foundation Re-export
export * from './classroom.ts';
