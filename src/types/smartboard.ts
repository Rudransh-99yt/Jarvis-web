// Domain Models for D.8: SmartBoard OS Foundation & Structured Board Documents
import type { AcademicContext } from './academicContext.ts';

export type SmartBoardDeviceStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'PAIRING'
  | 'READY'
  | 'LIVE'
  | 'PAIRED'
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
  | 'annotation'
  | 'visualization';

export interface BoardStrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type BoardSemanticType =
  | 'HANDWRITING'
  | 'TEXT'
  | 'EQUATION'
  | 'SHAPE'
  | 'DIAGRAM'
  | 'GRAPH'
  | 'IMAGE'
  | 'ARROW'
  | 'ANNOTATION';

export type RecognitionSource =
  | 'AI_RECOGNIZED'
  | 'LOCAL_DETERMINISTIC'
  | 'USER_ANNOTATED'
  | 'UNRECOGNIZED';

export type SpatialRelationType =
  | 'ABOVE'
  | 'BELOW'
  | 'LEFT_OF'
  | 'RIGHT_OF'
  | 'NEAR'
  | 'CONTAINS'
  | 'CONNECTS_TO'
  | 'LABELS';

export interface SpatialRelationship {
  sourceId: string;
  targetId: string;
  relation: SpatialRelationType;
  distancePx?: number;
  confidence: number;
}

export interface EquationObject {
  id: string;
  expression: string;
  normalizedExpression: string;
  latex: string;
  variables: string[];
  constants?: string[];
  confidence: number;
  sourceElementIds: string[];
  boundingBox: BoundingBox;
  academicContext?: {
    courseCode?: string;
    topic?: string;
  };
}

export interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  shapeType?: string;
  elementId?: string;
}

export interface DiagramEdge {
  id: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  label?: string;
  direction: 'directed' | 'undirected' | 'bidirectional';
  arrowElementId?: string;
}

export interface DiagramLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  attachedElementId?: string;
}

export interface DiagramObject {
  id: string;
  diagramType: 'flowchart' | 'circuit' | 'free_body' | 'geometric' | 'coordinate_system' | 'general';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  labels: DiagramLabel[];
  sourceElementIds: string[];
  boundingBox: BoundingBox;
  confidence: number;
}

export interface SemanticCandidate {
  id: string;
  semanticType: BoardSemanticType;
  confidence: number;
  source: RecognitionSource;
  detectedAt: string;
  boundingBox: BoundingBox;
  relatedElementIds: string[];
  equation?: EquationObject;
  diagram?: DiagramObject;
  recognizedText?: string;
  academicContext?: {
    courseCode?: string;
    topic?: string;
    lessonTitle?: string;
  };
  acceptedByTeacher?: boolean;
}

export interface BoardAIContext {
  pageId: string;
  pageIndex: number;
  selectedElementIds: string[];
  recognizedEquations: EquationObject[];
  recognizedDiagrams: DiagramObject[];
  recognizedText: string[];
  semanticSummary: string;
  spatialRelations: SpatialRelationship[];
  academicContext: {
    courseCode?: string;
    courseName?: string;
    topic?: string;
    lessonTitle?: string;
  };
  classSessionId: string;
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
  semanticType?: BoardSemanticType;
  boundingBox?: BoundingBox;
  semanticMetadata?: {
    confidence?: number;
    source?: RecognitionSource;
    detectedAt?: string;
    relatedElementIds?: string[];
    equation?: EquationObject;
    diagram?: DiagramObject;
    visualizationId?: string;
    visualizationType?: string;
  };
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
  // Image / Annotation / Visualization
  imageUrl?: string;
  label?: string;
  semanticTag?: BoardSemanticTag;
  latexFormula?: string;
  visualizationId?: string;
  visualizationPayload?: any;
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

export type BoardDocumentLifecycle =
  | 'LIVE'
  | 'SAVED'
  | 'PROCESSING'
  | 'INDEXED'
  | 'RELEASED'
  | 'FAILED_INDEXING';

export interface BoardDerivedKnowledge {
  summary: string;
  keyConcepts: string[];
  importantEquations: Array<{
    expression: string;
    description?: string;
    latex?: string;
    confidence: number;
    sourceElementId?: string;
  }>;
  definitions: Array<{
    term: string;
    definition: string;
  }>;
  misconceptions: Array<{
    misconception: string;
    correction: string;
  }>;
  revisionPoints: string[];
  practiceQuestions: Array<{
    question: string;
    answer?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
  suggestedTags: string[];
  generatedAt?: string;
  aiEnriched?: boolean;
}

export interface BoardAuditEvent {
  id: string;
  action: string;
  actorId: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface BoardPage {
  pageId: string;
  pageIndex: number;
  title: string;
  background: BoardPageBackground;
  elements: BoardElement[];
  semanticCandidates?: SemanticCandidate[];
  spatialRelationships?: SpatialRelationship[];
  slideReferenceIndex?: number;
  thumbnail?: string;
  pageSummary?: string;
  processingStatus?: 'IDLE' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  keyConcepts?: string[];
  extractedEquations?: Array<{ expression: string; confidence: number; sourceElementId?: string }>;
  extractedText?: Array<{ text: string; confidence: number; sourceElementId?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface BoardDocument {
  id: string;
  institutionId: string;
  workspaceId?: string;
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
  lifecycle?: BoardDocumentLifecycle;
  isReleasedToStudents: boolean;
  releasedAt?: string;
  pages: BoardPage[];
  activePageIndex: number;
  derivedKnowledge?: BoardDerivedKnowledge;
  knowledgeSpaceId?: string;
  knowledgeSourceId?: string;
  audit?: BoardAuditEvent[];
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
