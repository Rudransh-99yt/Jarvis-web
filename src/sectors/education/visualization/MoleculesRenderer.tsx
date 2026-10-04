import React, { useState } from 'react';
import type { MoleculeVisualizationPayload } from '../../../types/visualization.ts';
import { COMMON_ELEMENTS } from '../../../../server/sectors/education/visualization/chemistryEngine.ts';
import { Info, Atom } from 'lucide-react';

interface Props {
  payload: MoleculeVisualizationPayload;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const MoleculesRenderer: React.FC<Props> = ({
  payload,
  width = 600,
  height = 360,
  interactive = true
}) => {
  const [hoveredAtomId, setHoveredAtomId] = useState<string | null>(null);

  const hoveredAtom = payload.atoms.find((a) => a.id === hoveredAtomId);
  const hoveredElemMeta = hoveredAtom ? COMMON_ELEMENTS[hoveredAtom.element] : null;

  // Center molecule if needed
  const minX = Math.min(...payload.atoms.map((a) => a.x), 50);
  const maxX = Math.max(...payload.atoms.map((a) => a.x), width - 50);
  const minY = Math.min(...payload.atoms.map((a) => a.y), 50);
  const maxY = Math.max(...payload.atoms.map((a) => a.y), height - 50);

  const molWidth = maxX - minX;
  const molHeight = maxY - minY;
  const offsetX = (width - molWidth) / 2 - minX;
  const offsetY = (height - molHeight) / 2 - minY;

  const atomMap = new Map(payload.atoms.map((a) => [a.id, a]));

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
        <div className="flex items-center gap-2">
          <Atom className="w-4 h-4 text-cyan-400" />
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-cyan-300 font-hud">{payload.title}</h4>
            <p className="text-xs text-slate-400">
              Formula: <span className="font-mono text-cyan-400 font-semibold">{payload.chemicalFormula}</span> · {payload.commonName}
            </p>
          </div>
        </div>
        {payload.molecularWeight && (
          <div className="text-xs font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-300">
            MW: <span className="text-amber-400 font-bold">{payload.molecularWeight} g/mol</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden flex justify-center items-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[360px] select-none">
          {/* Bonds */}
          <g>
            {payload.bonds.map((b) => {
              const src = atomMap.get(b.sourceAtomId);
              const tgt = atomMap.get(b.targetAtomId);
              if (!src || !tgt) return null;

              const x1 = src.x + offsetX;
              const y1 = src.y + offsetY;
              const x2 = tgt.x + offsetX;
              const y2 = tgt.y + offsetY;

              // Orthogonal offset for double/triple bonds
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const ox = (-dy / len) * 4;
              const oy = (dx / len) * 4;

              if (b.bondType === 'double') {
                return (
                  <g key={b.id} stroke="#94a3b8" strokeWidth="2.5">
                    <line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} />
                    <line x1={x1 - ox} y1={y1 - oy} x2={x2 - ox} y2={y2 - oy} />
                  </g>
                );
              }

              if (b.bondType === 'triple') {
                return (
                  <g key={b.id} stroke="#94a3b8" strokeWidth="2.5">
                    <line x1={x1} y1={y1} x2={x2} y2={y2} />
                    <line x1={x1 + ox * 1.5} y1={y1 + oy * 1.5} x2={x2 + ox * 1.5} y2={y2 + oy * 1.5} />
                    <line x1={x1 - ox * 1.5} y1={y1 - oy * 1.5} x2={x2 - ox * 1.5} y2={y2 - oy * 1.5} />
                  </g>
                );
              }

              return (
                <line
                  key={b.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Atoms */}
          <g>
            {payload.atoms.map((a) => {
              const cx = a.x + offsetX;
              const cy = a.y + offsetY;
              const meta = COMMON_ELEMENTS[a.element] || { color: '#38bdf8', radius: 20, name: a.element };
              const isHovered = hoveredAtomId === a.id;

              return (
                <g
                  key={a.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAtomId(a.id)}
                  onMouseLeave={() => setHoveredAtomId(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={meta.radius + (isHovered ? 4 : 0)}
                    fill={meta.color}
                    stroke={isHovered ? '#00f2fe' : '#0f172a'}
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-150"
                  />
                  <text
                    x={cx}
                    y={cy + 5}
                    textAnchor="middle"
                    className="text-xs font-bold font-mono select-none"
                    fill={meta.color === '#f8fafc' ? '#0f172a' : '#ffffff'}
                  >
                    {a.element}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Atom Metadata Card / Tooltip */}
      {hoveredAtom && hoveredElemMeta && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded p-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-slate-700"
              style={{ backgroundColor: hoveredElemMeta.color }}
            />
            <span className="font-semibold text-cyan-300">
              {hoveredElemMeta.name} ({hoveredAtom.element})
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-slate-400">
            <span>Valency: <b className="text-slate-200">{hoveredElemMeta.valency}</b></span>
            <span>Mass: <b className="text-slate-200">{hoveredElemMeta.mass} u</b></span>
          </div>
        </div>
      )}
    </div>
  );
};
