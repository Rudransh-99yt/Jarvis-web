// Domain Models for AI Teacher Preparation & Classroom Session System

export type SessionState =
  | 'DRAFT'
  | 'GENERATING'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'LIVE'
  | 'COMPLETED'
  | 'ARCHIVED';

export type SourceMaterialType =
  | 'ncert_pdf'
  | 'question_paper'
  | 'worksheet'
  | 'teacher_notes'
  | 'curriculum_doc'
  | 'image'
  | 'existing_ppt'
  | 'knowledge_source';

export interface SourceMaterialRef {
  id: string;
  title: string;
  type: SourceMaterialType;
  storageFileId?: string;
  knowledgeSpaceId?: string;
  knowledgeSourceId?: string;
  extractedTextSnippet?: string;
  rawText?: string;
  fileSize?: string;
  pageCount?: number;
  uploadedAt: string;
}

export interface SessionLessonPlan {
  id: string;
  title: string;
  targetDurationMinutes: number;
  learningObjectives: string[];
  prerequisiteKnowledge: string[];
  openingWarmup: {
    title: string;
    durationMinutes: number;
    instructions: string;
    prompt: string;
  };
  teachingSequence: Array<{
    stage: string;
    durationMinutes: number;
    teacherActivity: string;
    studentActivity: string;
    checkPoint: string;
    sourceCitation?: string;
  }>;
  workedExamples: Array<{
    id: string;
    problem: string;
    solution: string;
    keyIntuition: string;
    commonMistakes: string[];
    latexFormula?: string;
  }>;
  misconceptions: Array<{
    id: string;
    misconception: string;
    correction: string;
    diagnosticQuestion: string;
  }>;
  checksForUnderstanding: string[];
  recap: string;
  exitTicket: {
    prompt: string;
    expectedCriteria: string;
  };
  isApproved: boolean;
  updatedAt: string;
}

export interface PresentationSlide {
  id: string;
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  visualInstruction?: string; // e.g. "Diagram showing electric field lines between opposite point charges"
  teacherNotes?: string;
  sourceReferences?: string[];
  latexFormula?: string;
  callout?: string;
}

export interface SessionPresentation {
  id: string;
  title: string;
  totalSlides: number;
  slides: PresentationSlide[];
  isApproved: boolean;
  updatedAt: string;
}

export interface SessionQuizQuestion {
  id: string;
  questionNumber: number;
  type: 'mcq' | 'true_false' | 'short_answer' | 'numerical';
  question: string;
  options?: string[]; // For MCQ (A, B, C, D)
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceReference?: string;
  points: number;
}

export interface SessionQuiz {
  id: string;
  title: string;
  targetMinutes: number;
  questions: SessionQuizQuestion[];
  isApproved: boolean;
  updatedAt: string;
}

export interface SessionFlashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceReference?: string;
}

export interface SessionFlashcards {
  id: string;
  title: string;
  cards: SessionFlashcard[];
  isApproved: boolean;
  updatedAt: string;
}

export interface SessionHomeworkQuestion {
  id: string;
  questionNumber: number;
  type: 'practice' | 'numerical' | 'conceptual' | 'application';
  prompt: string;
  marks: number;
  rubric?: string;
  latexFormula?: string;
  sourceReference?: string;
}

export interface SessionHomework {
  id: string;
  title: string;
  dueDate?: string;
  instructions: string;
  totalMarks: number;
  questions: SessionHomeworkQuestion[];
  isApproved: boolean;
  releasedToStudents: boolean;
  updatedAt: string;
}

export interface HomeworkSolutionItem {
  questionId: string;
  stepByStepSolution: string;
  finalAnswer: string;
  markingCriteria: string;
}

export interface SessionAnswerKey {
  id: string;
  homeworkSolutions: HomeworkSolutionItem[];
  quizAnswerMap: Record<string, string>; // questionId -> answer explanation
  teacherOnly: true; // Strictly protected on server
  updatedAt: string;
}

export interface SessionTeacherNotes {
  id: string;
  overview: string;
  pacingTips: string[];
  blackboardLayouts: string[];
  labEquipmentNeeded?: string[];
  isApproved: boolean;
  updatedAt: string;
}

export interface SessionStudentMaterials {
  id: string;
  handoutMarkdown: string;
  formulaSheet: string;
  practiceWorksheet: string;
  isApproved: boolean;
  released: boolean;
  updatedAt: string;
}

export interface SessionReleaseControls {
  presentationReleased: boolean;
  studentNotesReleased: boolean;
  quizReleased: boolean;
  homeworkReleased: boolean;
  flashcardsReleased: boolean;
}

export interface DesiredOutputsConfig {
  lessonPlan: boolean;
  presentation: boolean;
  quiz: boolean;
  flashcards: boolean;
  homework: boolean;
  teacherNotes: boolean;
  studentNotes: boolean;
  answerKey: boolean;
}

export interface SessionGenerationConfig {
  targetDurationMinutes: number;
  targetGradeLevel?: string;
  desiredOutputs: DesiredOutputsConfig;
  quizConfig?: {
    count: number;
    types: Array<'mcq' | 'true_false' | 'short_answer' | 'numerical'>;
    difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  };
  flashcardCount?: number;
  homeworkConfig?: {
    count: number;
    difficulty: string;
    types: string[];
  };
  customInstructions?: string;
}

export interface ClassSession {
  id: string;
  workspaceId: string;
  schoolId: string;
  classId: string;
  courseCode: string;
  courseName: string;
  subject: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  topic: string;
  teacherId: string;
  teacherName: string;
  scheduledAt?: string;
  durationMinutes: number;
  status: SessionState;
  generationConfig: SessionGenerationConfig;
  sourceMaterials: SourceMaterialRef[];
  lessonPlan?: SessionLessonPlan;
  presentation?: SessionPresentation;
  quiz?: SessionQuiz;
  flashcards?: SessionFlashcards;
  homework?: SessionHomework;
  answerKey?: SessionAnswerKey; // Protected, only for teachers
  teacherNotes?: SessionTeacherNotes;
  studentMaterials?: SessionStudentMaterials;
  releaseControls: SessionReleaseControls;
  classroomSessionId?: string; // Set when launched in live classroom
  generationLog?: {
    startedAt: string;
    completedAt?: string;
    sourcesProcessed: number;
    modelUsed: string;
    isGrounded: boolean;
    citationCount: number;
  };
  createdAt: string;
  updatedAt: string;
}
