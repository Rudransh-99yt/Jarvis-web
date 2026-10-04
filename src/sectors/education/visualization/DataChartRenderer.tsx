// Accessible Data Chart Renderer (Phase D.10)
import React, { useState } from 'react';
import type { DataChartParameters } from '../../../types/visualization.ts';

interface DataChartRendererProps {
  parameters: DataChartParameters;
  width?: number;
  height?: number;
}

export const DataChartRenderer: React.FC<DataChartRendererProps> = ({
  parameters,
  width = 600,
  height = 400
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredPoint, setHoveredPoint] = useState<{ series: string; label: string; value: number } | null>(null);

  const series = parameters.series || [];
  const categories = parameters.categories || [];
  const chartType = parameters.chartType || 'bar';

  // Calculate value range
  let maxVal = -Infinity;
  let minVal = 0;
  series.forEach((s) => {
    (s.data as any[]).forEach((val) => {
      const num = typeof val === 'number' ? val : (val?.y ?? 0);
      if (num > maxVal) maxVal = num;
      if (num < minVal) minVal = num;
    });
  });
  if (maxVal === -Infinity) maxVal = 100;
  maxVal = Math.max(1, maxVal * 1.15);

  const padding = { top: 30, right: 30, bottom: 45, left: 50 };
  const plotWidth = Math.max(100, width - padding.left - padding.right);
  const plotHeight = Math.max(100, height - padding.top - padding.bottom);

  const toScreenY = (v: number) => padding.top + (1 - v / maxVal) * plotHeight;

  return (
    <div className="flex flex-col select-none rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-xl">
      {/* Top Bar with Chart / Table Toggle */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-200 capitalize">
            {chartType} Chart
          </span>
          {/* Series Badges */}
          <div className="flex items-center gap-2">
            {series.map((s) => (
              <span key={s.id} className="flex items-center gap-1 text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
        >
          {viewMode === 'chart' ? 'View Data Table' : 'View Visual Chart'}
        </button>
      </div>

      {/* Main View Area */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto max-h-[360px] rounded-lg bg-slate-950 border border-slate-800 p-2">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-2">Category</th>
                {series.map((s) => (
                  <th key={s.id} className="p-2" style={{ color: s.color }}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {categories.map((cat, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="p-2 font-medium text-slate-200">{cat}</td>
                  {series.map((s) => {
                    const raw = (s.data as any[])[idx];
                    const val = typeof raw === 'number' ? raw : (raw?.y ?? '-');
                    return (
                      <td key={s.id} className="p-2">
                        {val} {parameters.unit || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800/50">
          <svg width={width} height={height} className="block">
            {/* Grid & Axes */}
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#475569"
              strokeWidth="1.5"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={height - padding.bottom}
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Bars */}
            {chartType === 'bar' &&
              categories.map((cat, cIdx) => {
                const groupWidth = plotWidth / categories.length;
                const groupX = padding.left + cIdx * groupWidth;
                const barWidth = Math.max(6, (groupWidth * 0.7) / series.length);

                return (
                  <g key={`group-${cIdx}`}>
                    {series.map((s, sIdx) => {
                      const raw = (s.data as any[])[cIdx];
                      const val = typeof raw === 'number' ? raw : (raw?.y ?? 0);
                      const barX = groupX + groupWidth * 0.15 + sIdx * barWidth;
                      const barY = toScreenY(val);
                      const barH = height - padding.bottom - barY;

                      return (
                        <rect
                          key={`bar-${s.id}-${cIdx}`}
                          x={barX}
                          y={barY}
                          width={barWidth - 2}
                          height={Math.max(1, barH)}
                          fill={s.color}
                          rx="2"
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          onPointerEnter={() => setHoveredPoint({ series: s.name, label: cat, value: val })}
                          onPointerLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}

                    {/* Category Label */}
                    <text
                      x={groupX + groupWidth / 2}
                      y={height - padding.bottom + 16}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="sans-serif"
                    >
                      {cat}
                    </text>
                  </g>
                );
              })}

            {/* Line / Scatter */}
            {chartType !== 'bar' &&
              series.map((s) => {
                const points = categories.map((cat, idx) => {
                  const raw = (s.data as any[])[idx];
                  const val = typeof raw === 'number' ? raw : (raw?.y ?? 0);
                  const x = padding.left + (idx / Math.max(1, categories.length - 1)) * plotWidth;
                  const y = toScreenY(val);
                  return { x, y, val, cat };
                });

                const lineD = points.reduce(
                  (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
                  ''
                );

                return (
                  <g key={`line-series-${s.id}`}>
                    {chartType === 'line' && (
                      <path
                        d={lineD}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {points.map((p, pIdx) => (
                      <circle
                        key={`pt-${s.id}-${pIdx}`}
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="2"
                        className="cursor-pointer hover:r-6"
                        onPointerEnter={() => setHoveredPoint({ series: s.name, label: p.cat, value: p.val })}
                        onPointerLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </g>
                );
              })}

            {/* X Axis Labels for Line */}
            {chartType !== 'bar' &&
              categories.map((cat, idx) => {
                const x = padding.left + (idx / Math.max(1, categories.length - 1)) * plotWidth;
                return (
                  <text
                    key={`lx-${idx}`}
                    x={x}
                    y={height - padding.bottom + 16}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                  >
                    {cat}
                  </text>
                );
              })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-2 rounded bg-slate-900/95 border border-slate-700 px-2.5 py-1 text-xs font-mono text-cyan-400 shadow-md">
              {hoveredPoint.series}: {hoveredPoint.label} = <span className="font-bold text-white">{hoveredPoint.value}</span> {parameters.unit || ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
