// 2D Chemistry Molecular Structure Renderer (Phase D.10)
import React, { useState } from 'react';
import type { ChemistryParameters, MoleculeAtom } from '../../../types/visualization.ts';

interface MoleculesRendererProps {
  parameters: ChemistryParameters;
  width?: number;
  height?: number;
  isReadOnly?: boolean;
}

export const MoleculesRenderer: React.FC<MoleculesRendererProps> = ({
  parameters,
  width = 600,
  height = 400
}) => {
  const [selectedAtom, setSelectedAtom] = useState<MoleculeAtom | null>(null);

  const atoms = parameters.atoms || [];
  const bonds = parameters.bonds || [];

  // Find bounding box of atoms to center them
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  atoms.forEach((a) => {
    if (a.x < minX) minX = a.x;
    if (a.y < minY) minY = a.y;
    if (a.x > maxX) maxX = a.x;
    if (a.y > maxY) maxY = a.y;
  });

  if (minX === Infinity) {
    minX = 100; maxX = 300; minY = 100; maxY = 300;
  }

  const molWidth = Math.max(80, maxX - minX);
  const molHeight = Math.max(80, maxY - minY);
  const scale = Math.min((width - 120) / molWidth, (height - 120) / molHeight, 1.4);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const toScreenX = (x: number) => width / 2 + (x - centerX) * scale;
  const toScreenY = (y: number) => height / 2 + (y - centerY) * scale;

  return (
    <div className="flex flex-col select-none rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-xl">
      {/* Top Molecule Info Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs">
        <div>
          <span className="font-bold text-slate-100 text-sm">{parameters.moleculeName}</span>
          <span className="ml-2 font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            {parameters.formula}
          </span>
        </div>
        {parameters.molecularWeight && (
          <div className="text-slate-400 font-mono text-[11px]">
            MW: <span className="text-slate-200">{parameters.molecularWeight} g/mol</span>
          </div>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div className="relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800/50">
        <svg width={width} height={height} className="block">
          {/* Bonds */}
          {bonds.map((bond) => {
            const a1 = atoms.find((a) => a.id === bond.atom1Id);
            const a2 = atoms.find((a) => a.id === bond.atom2Id);
            if (!a1 || !a2) return null;

            const x1 = toScreenX(a1.x);
            const y1 = toScreenY(a1.y);
            const x2 = toScreenX(a2.x);
            const y2 = toScreenY(a2.y);

            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;

            const nx = -dy / len;
            const ny = dx / len;

            if (bond.order === 2) {
              const offset = 4;
              return (
                <g key={bond.id}>
                  <line
                    x1={x1 + nx * offset}
                    y1={y1 + ny * offset}
                    x2={x2 + nx * offset}
                    y2={y2 + ny * offset}
                    stroke="#94a3b8"
                    strokeWidth="3"
                  />
                  <line
                    x1={x1 - nx * offset}
                    y1={y1 - ny * offset}
                    x2={x2 - nx * offset}
                    y2={y2 - ny * offset}
                    stroke="#94a3b8"
                    strokeWidth="3"
                  />
                </g>
              );
            }

            if (bond.order === 3) {
              const offset = 5;
              return (
                <g key={bond.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="3" />
                  <line
                    x1={x1 + nx * offset}
                    y1={y1 + ny * offset}
                    x2={x2 + nx * offset}
                    y2={y2 + ny * offset}
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                  />
                  <line
                    x1={x1 - nx * offset}
                    y1={y1 - ny * offset}
                    x2={x2 - nx * offset}
                    y2={y2 - ny * offset}
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                  />
                </g>
              );
            }

            return (
              <line
                key={bond.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#94a3b8"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            );
          })}

          {/* Atoms */}
          {atoms.map((atom) => {
            const sx = toScreenX(atom.x);
            const sy = toScreenY(atom.y);
            const isSelected = selectedAtom?.id === atom.id;

            return (
              <g
                key={atom.id}
                className="cursor-pointer"
                onClick={() => setSelectedAtom(atom)}
              >
                {/* Glow if selected */}
                {isSelected && (
                  <circle cx={sx} cy={sy} r="22" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 3" />
                )}
                {/* Atom Sphere */}
                <circle
                  cx={sx}
                  cy={sy}
                  r="16"
                  fill={atom.color || '#334155'}
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  className="filter drop-shadow-md"
                />
                {/* Atom Element Label */}
                <text
                  x={sx}
                  y={sy + 5}
                  textAnchor="middle"
                  fill={atom.element === 'H' ? '#0f172a' : '#ffffff'}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {atom.label || atom.element}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Atom Inspection Badge */}
        {selectedAtom && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-slate-900/95 border border-cyan-500/50 px-3 py-1.5 text-xs text-slate-200 shadow-lg">
            <span
              className="w-3 h-3 rounded-full border border-slate-700"
              style={{ backgroundColor: selectedAtom.color || '#334155' }}
            />
            <span className="font-bold text-cyan-300">Atom: {selectedAtom.element}</span>
            <span className="text-slate-400">ID: {selectedAtom.id}</span>
            <button
              onClick={() => setSelectedAtom(null)}
              className="ml-2 text-slate-400 hover:text-slate-200 font-bold"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Geometry Description Footer */}
      {parameters.geometryDescription && (
        <div className="text-[11px] text-slate-400 pt-2 flex items-center gap-1.5">
          <span className="text-cyan-400 font-bold">ℹ</span>
          <span>{parameters.geometryDescription}</span>
        </div>
      )}
    </div>
  );
};
