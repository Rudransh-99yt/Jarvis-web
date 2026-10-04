// Canonical Visualization Object Model for JARVIS AI Visualization Engine (Phase D.10)
import type { BoundingBox } from './smartboard.ts';

export type VisualizationType =
  | 'GRAPH'
  | 'EQUATION'
  | 'GEOMETRY'
  | 'DIAGRAM'
  | 'FLOW'
  | 'TIMELINE'
  | 'PHYSICS'
  | 'CHEMISTRY'
  | 'DATA_CHART'
  | 'ALGORITHM'
  | 'CONCEPT_MAP';

export type VisualizationSource =
  | 'AI_GENERATED'
  | 'TEACHER_CREATED'
  | 'EQUATION_RECOGNITION'
  | 'STUDENT_EXPLORATION';

export interface SemanticVisualizationContext {
  courseCode?: string;
  courseName?: string;
  topic?: string;
  gradeLevel?: string;
  tags?: string[];
  targetAudience?: 'student' | 'teacher' | 'all';
}

export interface VisualizationInteractions {
  canPan: boolean;
  canZoom: boolean;
  canInspectPoints: boolean;
  canEditParameters: boolean;
  canToggleFunctions?: boolean;
  canAnimate?: boolean;
}

export interface VisualizationAnimationState {
  isPlaying?: boolean;
  currentStep?: number;
  totalSteps?: number;
  durationMs?: number;
  speedMultiplier?: number;
  loop?: boolean;
}

export interface VisualizationAccessibility {
  ariaLabel: string;
  summary: string;
  transcriptOrTable: string;
  keyboardShortcutsDescription: string;
}

export interface VisualizationProvenance {
  createdByUserId: string;
  createdByRole: 'teacher' | 'student' | 'admin' | 'principal' | 'system';
  createdByName?: string;
  promptUsed?: string;
  confidence?: number;
  modelVersion?: string;
  approvedByTeacher: boolean;
  sourceElementIds?: string[];
  institutionId?: string;
  classroomId?: string;
  classSessionId?: string;
  lessonId?: string;
  boardDocumentId?: string;
  boardPageId?: string;
}

// 1. Math Graph Specification
export interface GraphFunction {
  id: string;
  expression: string; // e.g. "x^2 - 4" or "sin(x)"
  label?: string;
  color: string;
  style?: 'solid' | 'dashed' | 'dotted';
  visible: boolean;
  keyPoints?: Array<{
    x: number;
    y: number;
    type: 'root' | 'vertex' | 'intercept' | 'inflection' | 'custom';
    label: string;
  }>;
}

export interface GraphParameters {
  domain: [number, number]; // [xMin, xMax]
  range: [number, number];  // [yMin, yMax]
  functions: GraphFunction[];
  showGrid: boolean;
  showLabels: boolean;
  step?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  plottedPoints?: Array<{ x: number; y: number; label?: string; color?: string }>;
}

// 2. Physics Simulation Specification (e.g. Projectile Motion)
export interface PhysicsParameters {
  subType: 'projectile_motion' | 'harmonic_oscillator' | 'gravity_orbit' | 'circuit_dc';
  v0: number;        // Initial velocity (m/s)
  angleDeg: number;  // Launch angle (degrees)
  g: number;         // Gravitational acceleration (m/s^2), default 9.8
  h0: number;        // Initial launch height (m), default 0
  massKg?: number;
  airResistanceCoeff?: number;
  // Computed metrics
  maxHeight?: number;
  range?: number;
  timeOfFlight?: number;
  trajectoryPoints?: Array<{ x: number; y: number; t: number; vx: number; vy: number }>;
}

// 3. Chemistry Molecule Specification
export interface MoleculeAtom {
  id: string;
  element: string; // H, C, O, N, Cl, S, P, etc.
  x: number;
  y: number;
  z?: number;
  charge?: number;
  label?: string;
  color?: string;
}

export interface MoleculeBond {
  id: string;
  atom1Id: string;
  atom2Id: string;
  order: 1 | 2 | 3;
  type: 'covalent' | 'ionic' | 'hydrogen';
}

export interface ChemistryParameters {
  moleculeName: string;
  formula: string;
  molecularWeight?: number;
  atoms: MoleculeAtom[];
  bonds: MoleculeBond[];
  geometryDescription?: string;
}

// 4. Diagram Specification (Circuit, Flow, Concept Map)
export interface DiagramVisualNode {
  id: string;
  label: string;
  subType: 'box' | 'circle' | 'diamond' | 'component' | 'terminal';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  icon?: string;
}

export interface DiagramVisualEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  direction: 'directed' | 'undirected' | 'bidirectional';
  style?: 'solid' | 'dashed';
}

export interface DiagramParameters {
  diagramType: 'circuit' | 'flowchart' | 'concept_map' | 'system';
  nodes: DiagramVisualNode[];
  edges: DiagramVisualEdge[];
}

// 5. Data Chart Specification
export interface DataSeries {
  id: string;
  name: string;
  color: string;
  data: number[] | Array<{ x: number | string; y: number }>;
}

export interface DataChartParameters {
  chartType: 'bar' | 'line' | 'scatter';
  categories?: string[];
  series: DataSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  unit?: string;
}

// Unified Visualization Object
export interface VisualizationAnnotation {
  id: string;
  x: number;
  y: number;
  label: string;
  detail?: string;
  color?: string;
}

export interface VisualizationDocument {
  id: string;
  type: VisualizationType;
  title: string;
  description: string;
  semanticContext: SemanticVisualizationContext;
  source: VisualizationSource;
  parameters: GraphParameters | PhysicsParameters | ChemistryParameters | DiagramParameters | DataChartParameters | Record<string, any>;
  objects: any[];
  relationships: any[];
  annotations: VisualizationAnnotation[];
  interactions: VisualizationInteractions;
  animationState?: VisualizationAnimationState;
  accessibility: VisualizationAccessibility;
  provenance: VisualizationProvenance;
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  boundingBox?: BoundingBox;
}

// Result of schema validation
export interface VisualizationValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedDoc?: VisualizationDocument;
}
