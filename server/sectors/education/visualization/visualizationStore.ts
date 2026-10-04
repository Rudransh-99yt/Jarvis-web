// Persistent in-memory & file-backed store for Visualization Documents
import fs from 'node:fs';
import path from 'node:path';
import type { VisualizationDocument } from '../../../../src/types/visualization.ts';

export class VisualizationStore {
  private visualizations: Map<string, VisualizationDocument> = new Map();
  private isInitialized = false;

  constructor() {
    this.seedDefaultVisualizations();
  }

  private seedDefaultVisualizations() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Seed 1: Quadratic Parabola Graph
    const quadVis: VisualizationDocument = {
      id: 'vis-graph-parabola',
      type: 'GRAPH',
      title: 'Quadratic Function: y = x² - 4',
      description: 'Standard parabola with vertex at (0, -4) and roots at x = -2 and x = 2.',
      semanticContext: {
        courseCode: 'MATH-201',
        courseName: 'Calculus & Algebra',
        topic: 'Quadratic Functions and Extrema',
        gradeLevel: 'Grade 10-11',
        tags: ['algebra', 'parabola', 'polynomial', 'roots']
      },
      source: 'TEACHER_CREATED',
      parameters: {
        domain: [-5, 5],
        range: [-6, 10],
        showGrid: true,
        showLabels: true,
        xAxisLabel: 'x',
        yAxisLabel: 'f(x)',
        functions: [
          {
            id: 'fn-1',
            expression: 'x^2 - 4',
            label: 'f(x) = x² - 4',
            color: '#00f2fe',
            visible: true,
            keyPoints: [
              { x: 0, y: -4, type: 'vertex', label: 'Vertex (0, -4)' },
              { x: -2, y: 0, type: 'root', label: 'Root (-2, 0)' },
              { x: 2, y: 0, type: 'root', label: 'Root (2, 0)' }
            ]
          }
        ]
      },
      objects: [],
      relationships: [],
      annotations: [
        { id: 'ann-1', x: 0, y: -4, label: 'Global Minimum', detail: 'Derivative f\'(x) = 2x = 0 at x = 0' }
      ],
      interactions: {
        canPan: true,
        canZoom: true,
        canInspectPoints: true,
        canEditParameters: true,
        canToggleFunctions: true
      },
      accessibility: {
        ariaLabel: 'Graph of quadratic function f of x equals x squared minus four',
        summary: 'U-shaped parabola opening upwards with vertex at y equals negative four and roots at negative two and positive two.',
        transcriptOrTable: 'Table of points: (-3, 5), (-2, 0), (-1, -3), (0, -4), (1, -3), (2, 0), (3, 5)',
        keyboardShortcutsDescription: 'Use arrow keys to pan domain and plus/minus to zoom scale.'
      },
      provenance: {
        createdByUserId: 'teacher-1',
        createdByRole: 'teacher',
        createdByName: 'Dr. Sarah Connor',
        approvedByTeacher: true,
        institutionId: 'inst-stark-academy',
        courseCode: 'MATH-201'
      } as any,
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      boundingBox: { minX: 100, minY: 100, maxX: 600, maxY: 450, width: 500, height: 350 }
    };

    // Seed 2: Projectile Motion Simulation
    const physicsVis: VisualizationDocument = {
      id: 'vis-physics-projectile',
      type: 'PHYSICS',
      title: 'Classical Projectile Trajectory',
      description: 'Kinematic 2D trajectory of a projectile launched at 25 m/s at a 45° angle under standard gravity.',
      semanticContext: {
        courseCode: 'PHYS-101',
        courseName: 'Mechanics & Relativity',
        topic: '2D Kinematics and Parabolic Trajectories',
        gradeLevel: 'Grade 11-12',
        tags: ['physics', 'kinematics', 'projectile', 'gravity', 'apex']
      },
      source: 'TEACHER_CREATED',
      parameters: {
        subType: 'projectile_motion',
        v0: 25,
        angleDeg: 45,
        g: 9.8,
        h0: 0,
        maxHeight: 15.94,
        range: 63.78,
        timeOfFlight: 3.61
      },
      objects: [],
      relationships: [],
      annotations: [
        { id: 'ann-apex', x: 31.89, y: 15.94, label: 'Apex (15.9m)', detail: 'Vertical velocity vy reaches 0 m/s' }
      ],
      interactions: {
        canPan: true,
        canZoom: true,
        canInspectPoints: true,
        canEditParameters: true,
        canAnimate: true
      },
      animationState: {
        isPlaying: false,
        currentStep: 0,
        totalSteps: 100,
        durationMs: 3600
      },
      accessibility: {
        ariaLabel: 'Projectile motion trajectory launched at 25 meters per second at 45 degrees',
        summary: 'Parabolic flight reaching peak height of 15.9 meters and horizontal range of 63.8 meters in 3.6 seconds.',
        transcriptOrTable: 'Apex: 15.94m at t = 1.80s. Impact: 63.78m at t = 3.61s.',
        keyboardShortcutsDescription: 'Spacebar to toggle animation playback, arrow keys to adjust angle and velocity.'
      },
      provenance: {
        createdByUserId: 'teacher-1',
        createdByRole: 'teacher',
        createdByName: 'Dr. Sarah Connor',
        approvedByTeacher: true,
        institutionId: 'inst-stark-academy',
        classSessionId: 'session-phys-101',
        courseCode: 'PHYS-101'
      } as any,
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      boundingBox: { minX: 120, minY: 120, maxX: 670, maxY: 480, width: 550, height: 360 }
    };

    // Seed 3: Water Molecule Chemistry
    const chemVis: VisualizationDocument = {
      id: 'vis-chem-water',
      type: 'CHEMISTRY',
      title: 'Water Molecule (H₂O) 2D Geometry',
      description: 'Bent molecular geometry with central oxygen and two covalent hydrogen bonds.',
      semanticContext: {
        courseCode: 'CHEM-101',
        courseName: 'General Chemistry',
        topic: 'Chemical Bonding and Molecular Geometry',
        gradeLevel: 'Grade 10',
        tags: ['chemistry', 'molecule', 'water', 'covalent', 'bent']
      },
      source: 'TEACHER_CREATED',
      parameters: {
        moleculeName: 'Water',
        formula: 'H₂O',
        molecularWeight: 18.015,
        atoms: [
          { id: 'O1', element: 'O', x: 200, y: 150, label: 'O', color: '#ef4444' },
          { id: 'H1', element: 'H', x: 130, y: 220, label: 'H', color: '#f8fafc' },
          { id: 'H2', element: 'H', x: 270, y: 220, label: 'H', color: '#f8fafc' }
        ],
        bonds: [
          { id: 'b1', atom1Id: 'O1', atom2Id: 'H1', order: 1, type: 'covalent' },
          { id: 'b2', atom1Id: 'O1', atom2Id: 'H2', order: 1, type: 'covalent' }
        ],
        geometryDescription: 'Bent molecular geometry with bond angle ~104.5°'
      },
      objects: [],
      relationships: [],
      annotations: [
        { id: 'ann-angle', x: 200, y: 180, label: 'Bond Angle 104.5°', detail: 'Repulsion from two lone pairs on oxygen atom' }
      ],
      interactions: {
        canPan: true,
        canZoom: true,
        canInspectPoints: true,
        canEditParameters: true
      },
      accessibility: {
        ariaLabel: '2D structural diagram of water molecule H2O',
        summary: 'Oxygen atom bonded to two hydrogen atoms in bent configuration with 104.5 degree bond angle.',
        transcriptOrTable: 'Atoms: Oxygen (red, center), Hydrogen 1 (white, left), Hydrogen 2 (white, right). Bonds: Two single covalent bonds.',
        keyboardShortcutsDescription: 'Tab to focus on individual atoms and bonds.'
      },
      provenance: {
        createdByUserId: 'teacher-1',
        createdByRole: 'teacher',
        createdByName: 'Dr. Sarah Connor',
        approvedByTeacher: true,
        institutionId: 'inst-stark-academy',
        courseCode: 'CHEM-101'
      } as any,
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      boundingBox: { minX: 100, minY: 100, maxX: 550, maxY: 420, width: 450, height: 320 }
    };

    // Seed 4: Electrical Circuit Diagram
    const circuitVis: VisualizationDocument = {
      id: 'vis-diag-circuit',
      type: 'DIAGRAM',
      title: 'DC Series Circuit: Battery, Resistor & LED',
      description: 'Closed loop circuit with a 9V source, 220Ω current-limiting resistor, and indicator LED.',
      semanticContext: {
        courseCode: 'PHYS-101',
        topic: 'Direct Current Circuits & Ohm\'s Law',
        gradeLevel: 'Grade 11'
      },
      source: 'TEACHER_CREATED',
      parameters: {
        diagramType: 'circuit',
        nodes: [
          { id: 'node-batt', label: 'DC Battery\n9V', subType: 'component', x: 100, y: 150, width: 120, height: 60, color: '#f59e0b' },
          { id: 'node-resistor', label: 'Resistor\n220 Ω', subType: 'component', x: 280, y: 150, width: 120, height: 60, color: '#38bdf8' },
          { id: 'node-led', label: 'Red LED\n20 mA', subType: 'component', x: 460, y: 150, width: 120, height: 60, color: '#ef4444' },
          { id: 'node-gnd', label: 'GND (0V)', subType: 'terminal', x: 280, y: 280, width: 100, height: 40, color: '#10b981' }
        ],
        edges: [
          { id: 'edge-1', sourceId: 'node-batt', targetId: 'node-resistor', label: 'I = 31.4 mA', direction: 'directed' },
          { id: 'edge-2', sourceId: 'node-resistor', targetId: 'node-led', label: 'V_res = 6.9V', direction: 'directed' },
          { id: 'edge-3', sourceId: 'node-led', targetId: 'node-gnd', direction: 'directed' },
          { id: 'edge-4', sourceId: 'node-gnd', targetId: 'node-batt', direction: 'directed', style: 'dashed' }
        ]
      },
      objects: [],
      relationships: [],
      annotations: [],
      interactions: {
        canPan: true,
        canZoom: true,
        canInspectPoints: true,
        canEditParameters: true
      },
      accessibility: {
        ariaLabel: 'Circuit schematic showing 9V battery, 220 ohm resistor and LED in series',
        summary: 'Closed loop electrical circuit illustrating current flow from 9V battery through resistor and LED to ground.',
        transcriptOrTable: 'Components: 9V DC Battery -> 220 Ohm Resistor -> Red LED -> Ground -> Return loop.',
        keyboardShortcutsDescription: 'Tab to navigate between components and connections.'
      },
      provenance: {
        createdByUserId: 'teacher-1',
        createdByRole: 'teacher',
        approvedByTeacher: true,
        institutionId: 'inst-stark-academy',
        classSessionId: 'session-phys-101'
      } as any,
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      boundingBox: { minX: 100, minY: 100, maxX: 680, maxY: 460, width: 580, height: 360 }
    };

    // Seed 5: Data Chart
    const chartVis: VisualizationDocument = {
      id: 'vis-chart-kinetics',
      type: 'DATA_CHART',
      title: 'Experimental Velocity vs. Time Measurements',
      description: 'Classroom laboratory data measuring acceleration down an inclined track.',
      semanticContext: {
        courseCode: 'PHYS-101',
        topic: 'Experimental Acceleration Measurements'
      },
      source: 'TEACHER_CREATED',
      parameters: {
        chartType: 'line',
        categories: ['0.0s', '0.5s', '1.0s', '1.5s', '2.0s', '2.5s', '3.0s'],
        xAxisLabel: 'Time (seconds)',
        yAxisLabel: 'Velocity (m/s)',
        unit: 'm/s',
        series: [
          {
            id: 's-measured',
            name: 'Measured Data',
            color: '#00f2fe',
            data: [0.0, 1.2, 2.45, 3.7, 4.9, 6.15, 7.35]
          },
          {
            id: 's-theoretical',
            name: 'Theoretical (a = 2.45 m/s²)',
            color: '#a855f7',
            data: [0.0, 1.225, 2.45, 3.675, 4.9, 6.125, 7.35]
          }
        ]
      },
      objects: [],
      relationships: [],
      annotations: [],
      interactions: {
        canPan: true,
        canZoom: true,
        canInspectPoints: true,
        canEditParameters: true
      },
      accessibility: {
        ariaLabel: 'Line chart comparing measured velocity with theoretical kinematic curve',
        summary: 'Line chart showing linear velocity increase from 0 to 7.35 m/s over 3 seconds matching acceleration of 2.45 m/s².',
        transcriptOrTable: 'Time: 0s (0 m/s), 1s (2.45 m/s), 2s (4.9 m/s), 3s (7.35 m/s).',
        keyboardShortcutsDescription: 'Tab to access data points in the series.'
      },
      provenance: {
        createdByUserId: 'teacher-1',
        createdByRole: 'teacher',
        approvedByTeacher: true,
        institutionId: 'inst-stark-academy'
      } as any,
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      boundingBox: { minX: 100, minY: 100, maxX: 650, maxY: 450, width: 550, height: 350 }
    };

    this.visualizations.set(quadVis.id, quadVis);
    this.visualizations.set(physicsVis.id, physicsVis);
    this.visualizations.set(chemVis.id, chemVis);
    this.visualizations.set(circuitVis.id, circuitVis);
    this.visualizations.set(chartVis.id, chartVis);
  }

  public get(id: string): VisualizationDocument | undefined {
    return this.visualizations.get(id);
  }

  public list(): VisualizationDocument[] {
    return Array.from(this.visualizations.values());
  }

  public set(id: string, doc: VisualizationDocument): void {
    this.visualizations.set(id, doc);
  }

  public delete(id: string): boolean {
    return this.visualizations.delete(id);
  }

  public reset(): void {
    this.visualizations.clear();
    this.isInitialized = false;
    this.seedDefaultVisualizations();
  }
}

export const visualizationStore = new VisualizationStore();
