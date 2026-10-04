// Domain Models for D.8: SmartBoard OS Foundation & Structured Board Documents
import type { AcademicContext } from './academicContext.ts';

export type SmartBoardDeviceStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'PAIRING'
  | 'READY'
  | 'LIVE'
  | 'DISCONNECTED';

export interface SmartBoardCapabilities {
  touch: boolean;
  pen: boolean;
  multiTouch: boolean;
  maxResolution?: string;
  audio?: boolean;
  camera?: boolean;
}

export interface SmartBoardPairingState {
  isPaired: boolean;
  pairedTeacherId?: string;
  pairedTeacherName?: string;
  pairedAt?: string;
  pairCode?: string; // 6-digit numeric/alphanumeric code
  pairCodeExpiresAt?: number; // Unix epoch ms
  ticketId?: string;
  sessionId?: string; // Active ClassSession ID
}

export interface SmartBoardDevice {
  id: string; // e.g. 'board-phys-01'
  institutionId: string; // e.g. 'inst-stark-academy'
  classroomId: string; // e.g. 'room-phys-101'
  classroomName: string; // e.g. 'Physics Hall C-104'
  displayName: string; // e.g. 'SmartBoard 01 — Physics Lab'
  modelNumber?: string;
  status: SmartBoardDeviceStatus;
  capabilities: SmartBoardCapabilities;
  pairingState: SmartBoardPairingState;
  lastSeen: string; // ISO string
  currentSessionId: string | null; // ClassSession ID
  currentCourseCode?: string;
  currentTopic?: string;
  ipAddress?: string;
  firmwareVersion?: string;
  location?: string;
}

export type BoardElementType =
  | 'stroke'
  | 'text'
  | 'shape'
  | 'arrow'
  | 'image'
  | 'annotation';

export interface BoardStrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export type BoardSemanticTag =
  | 'formula'
  | 'diagram_label'
  | 'derivation_step'
  | 'worked_solution'
  | 'key_concept'
  | 'misconception_correction'
  | 'general_note';

export interface BoardElement {
  id: string;
  type: BoardElementType;
  // Stroke specific
  points?: BoardStrokePoint[];
  tool?: 'pen' | 'highlighter' | 'eraser';
  color?: string;
  width?: number;
  opacity?: number;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  // Shape specific
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';
  x?: number;
  y?: number;
  widthPx?: number;
  heightPx?: number;
  endX?: number;
  endY?: number;
  fillColor?: string;
  strokeColor?: string;
  // Image / Annotation
  imageUrl?: string;
  label?: string;
  semanticTag?: BoardSemanticTag;
  latexFormula?: string;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type BoardPageBackground =
  | 'blank'
  | 'grid'
  | 'lined'
  | 'dark_grid'
  | 'dark';

export interface BoardPage {
  pageId: string;
  pageIndex: number;
  title: string;
  background: BoardPageBackground;
  elements: BoardElement[];
  slideReferenceIndex?: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardDocument {
  id: string;
  institutionId: string;
  classroomId: string;
  classroomName: string;
  classId: string;
  courseCode: string;
  courseName: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  classSessionId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  version: number;
  isReleasedToStudents: boolean;
  releasedAt?: string;
  pages: BoardPage[];
  activePageIndex: number;
  timestamps: {
    createdAt: string;
    updatedAt: string;
    lastAutosavedAt?: string;
    completedAt?: string;
  };
  academicContext?: AcademicContext;
  ragIndexed?: boolean;
  ragSummary?: string;
}

export type SmartBoardSurfaceTab =
  | 'session'
  | 'board'
  | 'quiz'
  | 'video'
  | 'resources'
  | 'ai';

export interface SmartBoardPairingTicketPayload {
  type: 'smartboard_auth';
  ticketId: string;
  boardId: string;
  teacherId: string;
  institutionId: string;
  classroomId: string;
  classSessionId: string;
  expiresAt: number; // Unix epoch ms
}
