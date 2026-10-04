import React from 'react';
import type { VisualizationDocument } from '../../../types/visualization.ts';
import { InteractiveGraphRenderer } from './InteractiveGraphRenderer.tsx';
import { ProjectileMotionRenderer } from './ProjectileMotionRenderer.tsx';
import { MoleculesRenderer } from './MoleculesRenderer.tsx';
import { DiagramRenderer } from './DiagramRenderer.tsx';
import { DataChartRenderer } from './DataChartRenderer.tsx';

interface Props {
  document: VisualizationDocument;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const VisualizationHost: React.FC<Props> = ({
  document,
  width = 600,
  height = 360,
  interactive = true
}) => {
  const { payload } = document;

  switch (payload.type) {
    case 'GRAPH':
      return <InteractiveGraphRenderer payload={payload} width={width} height={height} interactive={interactive} />;
    case 'PROJECTILE':
      return <ProjectileMotionRenderer payload={payload} width={width} height={height} interactive={interactive} />;
    case 'MOLECULE':
      return <MoleculesRenderer payload={payload} width={width} height={height} interactive={interactive} />;
    case 'DIAGRAM':
      return <DiagramRenderer payload={payload} width={width} height={height} interactive={interactive} />;
    case 'DATA_CHART':
      return <DataChartRenderer payload={payload} width={width} height={height} interactive={interactive} />;
    default:
      return (
        <div className="p-4 bg-slate-900 border border-red-500/40 rounded text-red-300 text-xs font-mono">
          Unsupported visualization type: {(payload as any)?.type}
        </div>
      );
  }
};
