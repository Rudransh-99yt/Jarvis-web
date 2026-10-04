import React from 'react';
import type { DiagramVisualizationPayload } from '../../../types/visualization.ts';
import { GitBranch, Zap, Cpu } from 'lucide-react';

interface Props {
  payload: DiagramVisualizationPayload;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const DiagramRenderer: React.FC<Props> = ({
  payload,
  width = 600,
  height = 360,
  interactive = true
}) => {
  const nodeMap = new Map(payload.nodes.map((n) => [n.id, n]));

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
        <div className="flex items-center gap-2">
          {payload.diagramCategory === 'circuit' ? (
            <Zap className="w-4 h-4 text-amber-400" />
          ) : (
            <GitBranch className="w-4 h-4 text-cyan-400" />
          )}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-cyan-300 font-hud">{payload.title}</h4>
            <p className="text-xs text-slate-400 capitalize">{payload.diagramCategory} Diagram</p>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden flex justify-center items-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[360px] select-none">
          <defs>
            <marker
              id="diag-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Edges */}
          <g>
            {payload.edges.map((e) => {
              const src = nodeMap.get(e.sourceNodeId);
              const tgt = nodeMap.get(e.targetNodeId);
              if (!src || !tgt) return null;

              const x1 = src.x + (src.width || 100) / 2;
              const y1 = src.y + (src.height || 50) / 2;
              const x2 = tgt.x + (tgt.width || 100) / 2;
              const y2 = tgt.y + (tgt.height || 50) / 2;

              return (
                <g key={e.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={e.arrowColor || '#38bdf8'}
                    strokeWidth="2"
                    strokeDasharray={e.style === 'dashed' ? '4,4' : undefined}
                    markerEnd={e.directed ? 'url(#diag-arrow)' : undefined}
                  />
                  {e.label && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 6}
                      textAnchor="middle"
                      className="text-[10px] fill-cyan-300 font-mono"
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {payload.nodes.map((n) => {
              const w = n.width || 100;
              const h = n.height || 50;

              return (
                <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                  <rect
                    width={w}
                    height={h}
                    rx="6"
                    fill="#0f172a"
                    stroke={n.color || '#0284c7'}
                    strokeWidth="2"
                  />
                  <text
                    x={w / 2}
                    y={h / 2 - (n.value ? 4 : -4)}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-slate-200 select-none"
                  >
                    {n.label}
                  </text>
                  {n.value && (
                    <text
                      x={w / 2}
                      y={h / 2 + 12}
                      textAnchor="middle"
                      className="text-[10px] fill-cyan-400 font-mono select-none"
                    >
                      {n.value}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
