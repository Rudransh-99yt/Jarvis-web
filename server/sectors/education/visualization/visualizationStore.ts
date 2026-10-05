import { requirePrincipal } from '../../../auth/principal.ts';
// In-memory and persistent store for Visualization Documents

import type { VisualizationDocument } from '../../../../src/types/visualization.ts';

const SEED_VISUALIZATIONS: VisualizationDocument[] = [
  {
    id: 'vis-shm-1',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-main',
    classId: 'class-phys-101',
    courseCode: 'PHYS-301',
    creatorId: 'teacher-1',
    creatorRole: 'teacher',
    title: 'Simple Harmonic Motion Waveform',
    description: 'Plots harmonic oscillator displacement y(t) = A * cos(omega * t + phi)',
    visualizationType: 'GRAPH',
    provenance: 'SYSTEM_PRESET',
    status: 'RELEASED',
    isReleasedToStudents: true,
    releasedAt: '2026-03-01T09:00:00.000Z',
    version: 1,
    payload: {
      type: 'GRAPH',
      title: 'Simple Harmonic Motion (SHM)',
      series: [
        {
          id: 's1',
          name: 'Displacement y(t) = A*cos(w*t)',
          expression: 'A * cos(w * x)',
          color: '#00f2fe',
          strokeWidth: 3
        },
        {
          id: 's2',
          name: 'Velocity v(t) = -A*w*sin(w*t)',
          expression: '-1 * A * w * sin(w * x)',
          color: '#f59e0b',
          strokeWidth: 2,
          style: 'dashed'
        }
      ],
      parameters: [
        { name: 'A', label: 'Amplitude A (m)', value: 2.5, min: 0.5, max: 5, step: 0.1 },
        { name: 'w', label: 'Frequency w (rad/s)', value: 1.5, min: 0.2, max: 5, step: 0.1 }
      ],
      xDomain: [-5, 15],
      yDomain: [-6, 6],
      xLabel: 'Time t (s)',
      yLabel: 'Displacement / Velocity',
      grid: true,
      showCoordinates: true
    },
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z'
  },
  {
    id: 'vis-proj-1',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-main',
    classId: 'class-phys-101',
    courseCode: 'PHYS-301',
    creatorId: 'teacher-1',
    creatorRole: 'teacher',
    title: 'Kinematic Projectile Motion Trajectory',
    description: 'Parabolic trajectory for 2D kinematics at launch angle theta and velocity v0',
    visualizationType: 'PROJECTILE',
    provenance: 'TEACHER_CREATED',
    status: 'RELEASED',
    isReleasedToStudents: true,
    releasedAt: '2026-03-01T10:00:00.000Z',
    version: 1,
    payload: {
      type: 'PROJECTILE',
      title: 'Cannonball Launch Trajectory',
      initialVelocity: 25,
      launchAngleDeg: 45,
      initialHeight: 2,
      gravity: 9.8,
      color: '#38bdf8',
      showApex: true,
      showTrajectory: true,
      calculatedMetrics: {
        flightTimeSeconds: 3.65,
        maxHeightMeters: 18.01,
        horizontalRangeMeters: 64.5,
        trajectoryPoints: []
      }
    },
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 'vis-water-1',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-main',
    classId: 'class-chem-101',
    courseCode: 'CHEM-101',
    creatorId: 'teacher-1',
    creatorRole: 'teacher',
    title: 'Water Molecule Dipole Structure (H₂O)',
    description: 'Bent molecular geometry with 104.5 degree bond angle',
    visualizationType: 'MOLECULE',
    provenance: 'SYSTEM_PRESET',
    status: 'RELEASED',
    isReleasedToStudents: true,
    releasedAt: '2026-03-01T11:00:00.000Z',
    version: 1,
    payload: {
      type: 'MOLECULE',
      title: 'Water Molecule (H₂O)',
      chemicalFormula: 'H2O',
      commonName: 'Water',
      iupacName: 'Oxidane',
      molecularWeight: 18.015,
      representation: 'ball_and_stick',
      atoms: [
        { id: 'O1', element: 'O', x: 200, y: 140 },
        { id: 'H1', element: 'H', x: 130, y: 220 },
        { id: 'H2', element: 'H', x: 270, y: 220 }
      ],
      bonds: [
        { id: 'b1', sourceAtomId: 'O1', targetAtomId: 'H1', bondType: 'single' },
        { id: 'b2', sourceAtomId: 'O1', targetAtomId: 'H2', bondType: 'single' }
      ]
    },
    createdAt: '2026-03-01T11:00:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z'
  },
  {
    id: 'vis-diag-1',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-main',
    classId: 'class-phys-101',
    courseCode: 'PHYS-301',
    creatorId: 'teacher-1',
    creatorRole: 'teacher',
    title: 'Series R-C Circuit Network',
    description: 'Capacitor charging circuit diagram with DC voltage source',
    visualizationType: 'DIAGRAM',
    provenance: 'TEACHER_CREATED',
    status: 'RELEASED',
    isReleasedToStudents: true,
    releasedAt: '2026-03-01T11:30:00.000Z',
    version: 1,
    payload: {
      type: 'DIAGRAM',
      title: 'Series R-C Circuit',
      diagramCategory: 'circuit',
      nodes: [
        { id: 'n-v1', label: '12V DC', type: 'battery', x: 80, y: 150, value: '12V' },
        { id: 'n-r1', label: 'Resistor R', type: 'resistor', x: 220, y: 70, value: '1 kΩ' },
        { id: 'n-c1', label: 'Capacitor C', type: 'capacitor', x: 360, y: 150, value: '100 µF' },
        { id: 'n-gnd', label: 'GND', type: 'default', x: 220, y: 230 }
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'n-v1', targetNodeId: 'n-r1', label: 'I(t)', directed: true },
        { id: 'e2', sourceNodeId: 'n-r1', targetNodeId: 'n-c1', directed: true },
        { id: 'e3', sourceNodeId: 'n-c1', targetNodeId: 'n-gnd', directed: false },
        { id: 'e4', sourceNodeId: 'n-gnd', targetNodeId: 'n-v1', directed: false }
      ]
    },
    createdAt: '2026-03-01T11:30:00.000Z',
    updatedAt: '2026-03-01T11:30:00.000Z'
  }
];

class VisualizationStore {
  private docs: Map<string, VisualizationDocument> = new Map();

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.docs.clear();
    for (const d of SEED_VISUALIZATIONS) {
      this.docs.set(d.id, JSON.parse(JSON.stringify(d)));
    }
  }

  public get(id: string): VisualizationDocument | undefined {
    const item = this.docs.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : undefined;
  }

  public list(): VisualizationDocument[] {
    return Array.from(this.docs.values()).map((d) => JSON.parse(JSON.stringify(d)));
  }

  public set(doc: VisualizationDocument): void {
    this.docs.set(doc.id, JSON.parse(JSON.stringify(doc)));
  }

  public delete(id: string): boolean {
    return this.docs.delete(id);
  }
}

export const visualizationStore = new VisualizationStore();
