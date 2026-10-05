import { requirePrincipal } from '../../../auth/principal.ts';
// Safe topology and diagram structure validator for circuits, flowcharts, and free-body diagrams

import type { DiagramEdgeItem, DiagramNodeItem, DiagramVisualizationPayload } from '../../../../src/types/visualization.ts';

export class DiagramEngine {
  public static validateDiagram(payload: Partial<DiagramVisualizationPayload>): { isValid: boolean; errors: string[]; sanitized?: DiagramVisualizationPayload } {
    const errors: string[] = [];

    const nodes: DiagramNodeItem[] = [];
    const nodeIdSet = new Set<string>();

    if (Array.isArray(payload.nodes)) {
      for (const n of payload.nodes) {
        if (!n.id || typeof n.id !== 'string') {
          errors.push('Node ID must be a non-empty string');
          continue;
        }
        if (nodeIdSet.has(n.id)) {
          errors.push(`Duplicate node ID: ${n.id}`);
          continue;
        }
        nodeIdSet.add(n.id);

        nodes.push({
          id: n.id,
          label: (n.label || '').slice(0, 100),
          type: n.type || 'default',
          x: Number(n.x) || 0,
          y: Number(n.y) || 0,
          width: n.width ? Math.max(20, Math.min(600, Number(n.width))) : 100,
          height: n.height ? Math.max(20, Math.min(400, Number(n.height))) : 50,
          color: n.color ? n.color.slice(0, 30) : undefined,
          value: n.value ? n.value.slice(0, 50) : undefined
        });
      }
    } else {
      errors.push('Diagram nodes array is required');
    }

    const edges: DiagramEdgeItem[] = [];
    const edgeIdSet = new Set<string>();

    if (Array.isArray(payload.edges)) {
      for (const e of payload.edges) {
        if (!e.id || typeof e.id !== 'string') {
          errors.push('Edge ID must be a non-empty string');
          continue;
        }
        if (edgeIdSet.has(e.id)) {
          errors.push(`Duplicate edge ID: ${e.id}`);
          continue;
        }
        edgeIdSet.add(e.id);

        if (!nodeIdSet.has(e.sourceNodeId)) {
          errors.push(`Edge ${e.id} references non-existent source node '${e.sourceNodeId}'`);
        }
        if (!nodeIdSet.has(e.targetNodeId)) {
          errors.push(`Edge ${e.id} references non-existent target node '${e.targetNodeId}'`);
        }

        edges.push({
          id: e.id,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          label: e.label ? e.label.slice(0, 100) : undefined,
          directed: Boolean(e.directed),
          style: e.style === 'dashed' ? 'dashed' : 'solid',
          arrowColor: e.arrowColor ? e.arrowColor.slice(0, 30) : undefined
        });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const sanitized: DiagramVisualizationPayload = {
      type: 'DIAGRAM',
      title: (payload.title || 'Diagram').slice(0, 100),
      diagramCategory: ['circuit', 'flowchart', 'free_body', 'concept_map', 'optics'].includes(payload.diagramCategory as string)
        ? (payload.diagramCategory as any)
        : 'flowchart',
      nodes,
      edges
    };

    return { isValid: true, errors: [], sanitized };
  }
}
