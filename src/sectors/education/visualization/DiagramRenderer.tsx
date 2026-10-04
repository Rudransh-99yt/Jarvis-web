// Structured Diagram Renderer (Phase D.10)
import React, { useState } from 'react';
import type { DiagramParameters, DiagramVisualNode } from '../../../types/visualization.ts';

interface DiagramRendererProps {
  parameters: DiagramParameters;
  width?: number;
  height?: number;
}

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  parameters,
  width = 600,
  height = 400
}) => {
  const [selectedNode, setSelectedNode] = useState<DiagramVisualNode | null>(null);

  const nodes = parameters.nodes || [];
  const edges = parameters.edges || [];

  return (
    <div className="flex flex-col select-none rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-xl">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs">
        <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
          {parameters.diagramType} Diagram
        </span>
        <span className="text-slate-500 font-mono text-[10px]">
          {nodes.length} Nodes • {edges.length} Connections
        </span>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800/50">
        <svg width={width} height={height} className="block">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Edges / Connections */}
          {edges.map((edge) => {
            const s = nodes.find((n) => n.id === edge.sourceId);
            const t = nodes.find((n) => n.id === edge.targetId);
            if (!s || !t) return null;

            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;

            return (
              <g key={edge.id}>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray={edge.style === 'dashed' ? '4 4' : undefined}
                  markerEnd={edge.direction === 'directed' ? 'url(#arrowhead)' : undefined}
                />
                {edge.label && (
                  <g>
                    <rect
                      x={midX - 35}
                      y={midY - 12}
                      width={70}
                      height={18}
                      rx="3"
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY + 1}
                      textAnchor="middle"
                      fill="#93c5fd"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const w = node.width || 120;
            const h = node.height || 50;
            const lines = (node.label || '').split('\n');

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node)}
              >
                {/* Node Shape */}
                {node.subType === 'diamond' ? (
                  <polygon
                    points={`${node.x} ${node.y - h / 2}, ${node.x + w / 2} ${node.y}, ${node.x} ${node.y + h / 2}, ${node.x - w / 2} ${node.y}`}
                    fill="#1e1b4b"
                    stroke={isSelected ? '#38bdf8' : node.color || '#a855f7'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                ) : node.subType === 'terminal' ? (
                  <rect
                    x={node.x - w / 2}
                    y={node.y - h / 2}
                    width={w}
                    height={h}
                    rx={h / 2}
                    fill="#064e3b"
                    stroke={isSelected ? '#38bdf8' : node.color || '#10b981'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                ) : (
                  <rect
                    x={node.x - w / 2}
                    y={node.y - h / 2}
                    width={w}
                    height={h}
                    rx="6"
                    fill="#0f172a"
                    stroke={isSelected ? '#38bdf8' : node.color || '#64748b'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                )}

                {/* Node Text */}
                {lines.map((line, idx) => (
                  <text
                    key={idx}
                    x={node.x}
                    y={node.y - (lines.length - 1) * 7 + idx * 14 + 4}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="500"
                    fontFamily="sans-serif"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>

        {/* Selected Node Details Box */}
        {selectedNode && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-slate-900/95 border border-cyan-500/50 px-3 py-1.5 text-xs text-slate-200 shadow-lg">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: selectedNode.color || '#38bdf8' }}
            />
            <span className="font-bold text-cyan-300">
              {selectedNode.label.replace('\n', ' - ')}
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              Type: {selectedNode.subType}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="ml-2 text-slate-400 hover:text-slate-200 font-bold"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
