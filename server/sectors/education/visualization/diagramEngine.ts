// Structured Diagram Engine Foundation (D.10)
// Deterministic diagram builder for circuits, flowcharts, and concept maps.

import type { DiagramParameters, DiagramVisualNode, DiagramVisualEdge } from '../../../../src/types/visualization.ts';

export class DiagramEngine {
  /**
   * Builds an electrical circuit diagram (e.g. Battery -> Resistor -> LED).
   */
  public static buildCircuit(components?: string[]): DiagramParameters {
    const defaultComponents = components && components.length > 0
      ? components
      : ['Battery (9V)', 'Resistor (220Ω)', 'LED (Forward 2.1V)', 'Ground'];

    const nodes: DiagramVisualNode[] = [
      {
        id: 'node-batt',
        label: 'DC Battery\n9V',
        subType: 'component',
        x: 100,
        y: 150,
        width: 120,
        height: 60,
        color: '#f59e0b',
        icon: 'battery'
      },
      {
        id: 'node-resistor',
        label: 'Resistor\n220 Ω',
        subType: 'component',
        x: 280,
        y: 150,
        width: 120,
        height: 60,
        color: '#38bdf8',
        icon: 'resistor'
      },
      {
        id: 'node-led',
        label: 'Red LED\n20 mA',
        subType: 'component',
        x: 460,
        y: 150,
        width: 120,
        height: 60,
        color: '#ef4444',
        icon: 'led'
      },
      {
        id: 'node-gnd',
        label: 'GND (0V)',
        subType: 'terminal',
        x: 280,
        y: 280,
        width: 100,
        height: 40,
        color: '#10b981',
        icon: 'ground'
      }
    ];

    const edges: DiagramVisualEdge[] = [
      {
        id: 'edge-1',
        sourceId: 'node-batt',
        targetId: 'node-resistor',
        label: 'I = 31.4 mA',
        direction: 'directed',
        style: 'solid'
      },
      {
        id: 'edge-2',
        sourceId: 'node-resistor',
        targetId: 'node-led',
        label: 'V_res = 6.9V',
        direction: 'directed',
        style: 'solid'
      },
      {
        id: 'edge-3',
        sourceId: 'node-led',
        targetId: 'node-gnd',
        label: 'Return Path',
        direction: 'directed',
        style: 'solid'
      },
      {
        id: 'edge-4',
        sourceId: 'node-gnd',
        targetId: 'node-batt',
        label: 'Circuit Loop',
        direction: 'directed',
        style: 'dashed'
      }
    ];

    return {
      diagramType: 'circuit',
      nodes,
      edges
    };
  }

  /**
   * Builds an algorithm or pedagogical decision flowchart.
   */
  public static buildFlowchart(topic?: string): DiagramParameters {
    const nodes: DiagramVisualNode[] = [
      {
        id: 'n-start',
        label: 'Start Problem',
        subType: 'terminal',
        x: 250,
        y: 50,
        width: 130,
        height: 45,
        color: '#10b981'
      },
      {
        id: 'n-read',
        label: 'Read Given Variables\n(v0, angle, h0)',
        subType: 'box',
        x: 250,
        y: 130,
        width: 160,
        height: 55,
        color: '#38bdf8'
      },
      {
        id: 'n-check',
        label: 'Is Launch Angle\nBetween 0° and 90°?',
        subType: 'diamond',
        x: 250,
        y: 230,
        width: 170,
        height: 75,
        color: '#a855f7'
      },
      {
        id: 'n-calc',
        label: 'Compute Apex & Range\nEquations',
        subType: 'box',
        x: 120,
        y: 350,
        width: 160,
        height: 55,
        color: '#00f2fe'
      },
      {
        id: 'n-error',
        label: 'Report Invalid Angle',
        subType: 'box',
        x: 380,
        y: 350,
        width: 150,
        height: 50,
        color: '#f43f5e'
      },
      {
        id: 'n-end',
        label: 'Display Trajectory',
        subType: 'terminal',
        x: 250,
        y: 440,
        width: 140,
        height: 45,
        color: '#10b981'
      }
    ];

    const edges: DiagramVisualEdge[] = [
      { id: 'e1', sourceId: 'n-start', targetId: 'n-read', direction: 'directed' },
      { id: 'e2', sourceId: 'n-read', targetId: 'n-check', direction: 'directed' },
      { id: 'e3', sourceId: 'n-check', targetId: 'n-calc', label: 'Yes', direction: 'directed' },
      { id: 'e4', sourceId: 'n-check', targetId: 'n-error', label: 'No', direction: 'directed' },
      { id: 'e5', sourceId: 'n-calc', targetId: 'n-end', direction: 'directed' },
      { id: 'e6', sourceId: 'n-error', targetId: 'n-end', direction: 'directed', style: 'dashed' }
    ];

    return {
      diagramType: 'flowchart',
      nodes,
      edges
    };
  }

  /**
   * Builds an academic concept map.
   */
  public static buildConceptMap(rootTopic = 'Classical Mechanics'): DiagramParameters {
    const nodes: DiagramVisualNode[] = [
      {
        id: 'cm-root',
        label: rootTopic,
        subType: 'box',
        x: 250,
        y: 60,
        width: 180,
        height: 50,
        color: '#6366f1'
      },
      {
        id: 'cm-kinematics',
        label: 'Kinematics\n(Motion Description)',
        subType: 'box',
        x: 120,
        y: 170,
        width: 150,
        height: 55,
        color: '#06b6d4'
      },
      {
        id: 'cm-dynamics',
        label: 'Dynamics\n(Forces & Causes)',
        subType: 'box',
        x: 380,
        y: 170,
        width: 150,
        height: 55,
        color: '#ec4899'
      },
      {
        id: 'cm-energy',
        label: 'Energy Conservation\nWork & Power',
        subType: 'box',
        x: 250,
        y: 280,
        width: 160,
        height: 55,
        color: '#eab308'
      }
    ];

    const edges: DiagramVisualEdge[] = [
      { id: 'cme-1', sourceId: 'cm-root', targetId: 'cm-kinematics', label: 'Includes', direction: 'directed' },
      { id: 'cme-2', sourceId: 'cm-root', targetId: 'cm-dynamics', label: 'Includes', direction: 'directed' },
      { id: 'cme-3', sourceId: 'cm-kinematics', targetId: 'cm-energy', label: 'Governs', direction: 'directed' },
      { id: 'cme-4', sourceId: 'cm-dynamics', targetId: 'cm-energy', label: 'Produces Work', direction: 'directed' }
    ];

    return {
      diagramType: 'concept_map',
      nodes,
      edges
    };
  }
}
