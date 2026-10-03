// Domain Models for Jarvis Education Sector

import type { SourceReference } from './platform.ts';

export type EducationRole = 'student' | 'teacher';

export interface EducationClass {
  id: string;
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
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
  }>;
  // Summary metrics for teacher overview
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
  conversationId: string; // thread or channel ID
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

