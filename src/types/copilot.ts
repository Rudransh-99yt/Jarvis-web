// Domain Models for D.11: Real-Time Teaching Copilot for SmartBoard
import type { AcademicContext } from './academicContext.ts';
import type { BoardAIContext } from './smartboard.ts';

export type CopilotCommandIntent =
  | 'EXPLAIN_CONCEPT'
  | 'EXPLAIN_BOARD_OBJECT'
  | 'GENERATE_EXAMPLE'
  | 'SIMPLIFY_EXPLANATION'
  | 'CREATE_VISUALIZATION'
  | 'MODIFY_VISUALIZATION'
  | 'CREATE_GRAPH'
  | 'CREATE_DIAGRAM'
  | 'START_QUIZ'
  | 'SHOW_RESOURCE'
  | 'FIND_IN_TEXTBOOK'
  | 'SUMMARIZE_BOARD'
  | 'CREATE_NOTES'
  | 'CREATE_HOMEWORK'
  | 'CREATE_FLASHCARDS'
  | 'ANSWER_TEACHER_QUESTION'
  | 'CHECK_STUDENT_CONFUSION';

export type CopilotActionClass =
  | 'SAFE_READ'
  | 'TEACHER_CONFIRMATION'
  | 'HIGH_IMPACT';

export type CopilotProposalStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'FAILED'
  | 'CANCELLED';

export interface CopilotProposal {
  id: string;
  classSessionId: string;
  boardId?: string;
  pageId?: string;
  teacherId: string;
  intent: CopilotCommandIntent;
  actionClass: CopilotActionClass;
  title: string;
  summary: string;
  payload: Record<string, any>;
  toolToExecute?: string;
  toolArgs?: Record<string, any>;
  status: CopilotProposalStatus;
  requiresApproval: boolean;
  isApproved?: boolean;
  approvedAt?: string;
  executedAt?: string;
  executionResult?: any;
  rejectionReason?: string;
  createdAt: string;
}

export interface CopilotContext {
  institutionId: string;
  classId: string;
  courseCode: string;
  courseName?: string;
  unitId?: string;
  lessonId?: string;
  lessonTitle?: string;
  classSessionId: string;
  currentBoardPageId?: string;
  selectedElementIds?: string[];
  boardAIContext?: BoardAIContext;
  approvedKnowledgeSpaceIds?: string[];
  recentClassroomEvents?: string[];
}

export interface CopilotAuditEvent {
  id: string;
  timestamp: string;
  teacherId: string;
  classSessionId: string;
  intent: CopilotCommandIntent;
  actionClass: CopilotActionClass;
  toolRequested?: string;
  approved: boolean;
  executionStatus: 'SUCCESS' | 'FAILED' | 'REJECTED' | 'BYPASSED';
  details?: Record<string, any>;
}
