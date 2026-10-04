// Domain Models for D.10: AI Visualization Engine & SmartBoard Integration
import type { AcademicContext } from './academicContext.ts';

export type VisualizationType =
  | 'GRAPH'
  | 'PROJECTILE'
  | 'MOLECULE'
  | 'DIAGRAM'
  | 'DATA_CHART';

export type VisualizationProvenance =
  | 'AI_GENERATED'
  | 'TEACHER_CREATED'
  | 'SYSTEM_PRESET'
  | 'RECOGNIZED_EQUATION';

export type VisualizationStatus =
  | 'DRAFT'
  | 'PREVIEW'
  | 'VALIDATED'
  | 'RELEASED'
  | 'ARCHIVED';

// 1. Math Graph Payload
export interface GraphSeries {
  id: string;
  name: string;
  expression: string; // e.g. "sin(x)", "x^2 - 4*x + 3"
  color: string;
  strokeWidth?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface GraphParameter {
  name: string; // e.g. "a", "k", "omega"
  label?: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface GraphVisualizationPayload {
  type: 'GRAPH';
  title: string;
  series: GraphSeries[];
  parameters?: GraphParameter[];
  xDomain: [number, number]; // e.g. [-10, 10]
  yDomain: [number, number]; // e.g. [-5, 5]
  xLabel?: string;
  yLabel?: string;
  grid?: boolean;
  showCoordinates?: boolean;
}

// 2. Physics Projectile Payload
export interface ProjectileVisualizationPayload {
  type: 'PROJECTILE';
  title: string;
  initialVelocity: number; // m/s
  launchAngleDeg: number; // 0 to 90 degrees
  initialHeight: number; // meters
  gravity: number; // m/s^2 (default 9.8)
  timeStep?: number;
  maxRange?: number;
  maxHeight?: number;
  flightTime?: number;
  color?: string;
  showApex?: boolean;
  showTrajectory?: boolean;
  showVectors?: boolean;
  calculatedMetrics?: {
    flightTimeSeconds: number;
    maxHeightMeters: number;
    horizontalRangeMeters: number;
    trajectoryPoints: Array<{ x: number; y: number; t: number }>;
  };
}

// 3. Chemistry Molecule Payload
export interface MoleculeAtom {
  id: string;
  element: string; // "C", "H", "O", "N", etc.
  x: number;
  y: number;
  z?: number;
  label?: string;
  charge?: number;
}

export interface MoleculeBond {
  id: string;
  sourceAtomId: string;
  targetAtomId: string;
  bondType: 'single' | 'double' | 'triple' | 'aromatic' | 'hydrogen';
}

export interface MoleculeVisualizationPayload {
  type: 'MOLECULE';
  title: string;
  chemicalFormula: string; // e.g. "H2O", "C6H12O6", "CH4"
  commonName: string;
  iupacName?: string;
  molecularWeight?: number;
  atoms: MoleculeAtom[];
  bonds: MoleculeBond[];
  representation: 'ball_and_stick' | 'space_filling' | 'skeletal';
}

// 4. Diagram Payload
export interface DiagramNodeItem {
  id: string;
  label: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'resistor' | 'capacitor' | 'battery' | 'source' | 'mass' | 'vector' | 'default';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  value?: string;
}

export interface DiagramEdgeItem {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  directed: boolean;
  style?: 'solid' | 'dashed';
  arrowColor?: string;
}

export interface DiagramVisualizationPayload {
  type: 'DIAGRAM';
  title: string;
  diagramCategory: 'circuit' | 'flowchart' | 'free_body' | 'concept_map' | 'optics';
  nodes: DiagramNodeItem[];
  edges: DiagramEdgeItem[];
}

// 5. Data Chart Payload
export interface DataChartPoint {
  label: string;
  [seriesKey: string]: number | string;
}

export interface DataChartSeriesDef {
  key: string;
  name: string;
  color: string;
  unit?: string;
}

export interface DataChartVisualizationPayload {
  type: 'DATA_CHART';
  title: string;
  chartType: 'bar' | 'line' | 'scatter' | 'area';
  xAxisKey: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  series: DataChartSeriesDef[];
  data: DataChartPoint[];
}

export type VisualizationPayload =
  | GraphVisualizationPayload
  | ProjectileVisualizationPayload
  | MoleculeVisualizationPayload
  | DiagramVisualizationPayload
  | DataChartVisualizationPayload;

// Canonical Visualization Document Model
export interface VisualizationDocument {
  id: string;
  institutionId: string;
  workspaceId: string;
  classId?: string;
  courseCode?: string;
  unitId?: string;
  lessonId?: string;
  classSessionId?: string;
  creatorId: string;
  creatorRole: 'teacher' | 'student' | 'system';
  title: string;
  description?: string;
  visualizationType: VisualizationType;
  provenance: VisualizationProvenance;
  status: VisualizationStatus;
  isReleasedToStudents: boolean;
  releasedAt?: string;
  version: number;
  payload: VisualizationPayload;
  recognizedEquationId?: string; // Links to D.9 recognized equation
  sourceElementIds?: string[]; // Links to board handwritten strokes
  boardReference?: {
    boardId: string;
    pageId: string;
    elementId?: string;
  };
  academicContext?: AcademicContext;
  validationErrors?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VisualizationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedPayload?: VisualizationPayload;
}
