// JARVIS EDUCATION OS — PHASE D.14: STUDENT LIVE CLASSROOM TYPES

import type { ClassSession, PresentationSlide } from './classSession.ts';
import type { AcademicContext } from './academicContext.ts';
import type { BoardPage } from './smartboard.ts';
import type { Quiz, QuizQuestion } from './quiz.ts';

export type LiveConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export type LiveClassroomTab = 'presentation' | 'ask_jarvis' | 'quiz' | 'notes' | 'resources' | 'discussion' | 'timeline';

export interface LiveClassroomTimelineEvent {
  id: string;
  type: 'session_start' | 'page_change' | 'quiz_launch' | 'quiz_submit' | 'resource_share' | 'session_end';
  title: string;
  timestamp: string;
  detail?: string;
}

export interface LiveClassroomResource {
  id: string;
  title: string;
  type: 'ncert_pdf' | 'formula_sheet' | 'notes' | 'video' | 'handout' | 'worksheet' | 'source';
  url?: string;
  sourceId?: string;
  knowledgeSpaceId?: string;
  preview?: string;
  pageCount?: number;
}

export interface LiveClassroomState {
  classSession: ClassSession | null;
  academicContext: AcademicContext;
  teacher: {
    id: string;
    name: string;
    department?: string;
    room?: string;
  };
  sessionStatus: 'upcoming' | 'live' | 'paused' | 'completed' | 'no_session';
  currentBoardPage: {
    boardDocumentId?: string;
    pageId?: string;
    pageIndex: number;
    totalBoardPages: number;
    title: string;
    isReleased: boolean;
    pageContent?: BoardPage;
  } | null;
  releasedBoardHistory: Array<{
    boardDocumentId: string;
    pageId: string;
    pageIndex: number;
    title: string;
    isReleased: boolean;
    previewSnippet?: string;
    equationsCount?: number;
  }>;
  presentationState: {
    activeSlideIndex: number;
    totalSlides: number;
    currentSlide?: PresentationSlide;
    isLaserActive?: boolean;
    laserPoint?: { x: number; y: number };
  };
  releasedResources: LiveClassroomResource[];
  activeQuiz: {
    id: string;
    title: string;
    status: 'live' | 'paused' | 'completed' | 'draft';
    currentQuestionIndex: number;
    totalQuestions: number;
    currentQuestion?: QuizQuestion;
    submissionState?: {
      hasSubmitted: boolean;
      selectedOptionIndex?: number;
      isCorrect?: boolean;
      pointsAwarded?: number;
    };
  } | null;
  studentNotes: {
    noteId?: string;
    content: string;
    lastSavedAt?: string;
    linkedBoardId?: string;
    linkedPageId?: string;
    linkedPageIndex?: number;
  };
  discussion: {
    channelId?: string;
    channelName?: string;
    recentMessages?: Array<{
      id: string;
      authorName: string;
      content: string;
      timestamp: string;
    }>;
  };
  assignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    isSubmitted: boolean;
    maxScore: number;
  }>;
  timeline: LiveClassroomTimelineEvent[];
  permissions: {
    canControl: boolean;
    canSubmitQuiz: boolean;
    canAskJarvis: boolean;
    canTakeNotes: boolean;
  };
}

export interface AskLiveClassResponse {
  answer: string;
  groundedInBoard: boolean;
  groundedInLesson: boolean;
  citedFormulas: string[];
  relevantPageIndices: number[];
  confidence: number;
  suggestedFollowUps?: string[];
}
