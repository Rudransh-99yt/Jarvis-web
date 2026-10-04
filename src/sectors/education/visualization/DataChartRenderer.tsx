import React from 'react';
import type { DataChartVisualizationPayload } from '../../../types/visualization.ts';
import { BarChart3 } from 'lucide-react';

interface Props {
  payload: DataChartVisualizationPayload;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const DataChartRenderer: React.FC<Props> = ({
  payload,
  width = 600,
  height = 360,
  interactive = true
}) => {
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Extract all numeric values across series
  const allValues: number[] = [];
  payload.data.forEach((row) => {
    payload.series.forEach((s) => {
      const v = Number(row[s.key]);
      if (!isNaN(v) && isFinite(v)) allValues.push(v);
    });
  });

  const maxVal = Math.max(10, Math.ceil((Math.max(...allValues, 10) * 1.15) / 10) * 10);
  const minVal = Math.min(0, Math.floor(Math.min(...allValues, 0) / 10) * 10);

  const toSvgY = (v: number) => padding.top + plotHeight - ((v - minVal) / (maxVal - minVal)) * plotHeight;

  const barGroupWidth = plotWidth / Math.max(1, payload.data.length);
  const barWidth = Math.max(8, (barGroupWidth * 0.7) / Math.max(1, payload.series.length));

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-semibold tracking-wide text-cyan-300 font-hud">{payload.title}</h4>
        </div>
        {/* Series Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {payload.series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="text-slate-300">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden flex justify-center items-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[360px] select-none">
          {/* Grid lines */}
          <g opacity="0.2">
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const val = minVal + pct * (maxVal - minVal);
              const y = toSvgY(val);
              return (
                <g key={i}>
                  <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="#475569" strokeWidth="1" />
                  <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                    {val.toFixed(0)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Baseline */}
          <line
            x1={padding.left}
            y1={toSvgY(0)}
            x2={padding.left + plotWidth}
            y2={toSvgY(0)}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Render Bars or Lines */}
          {payload.chartType === 'bar' ? (
            <g>
              {payload.data.map((row, groupIdx) => {
                const groupX = padding.left + groupIdx * barGroupWidth + (barGroupWidth - barWidth * payload.series.length) / 2;
                return (
                  <g key={groupIdx}>
                    {payload.series.map((s, sIdx) => {
                      const v = Number(row[s.key]) || 0;
                      const bx = groupX + sIdx * barWidth;
                      const by = toSvgY(Math.max(0, v));
                      const bh = Math.abs(toSvgY(v) - toSvgY(0));

                      return (
                        <rect
                          key={s.key}
                          x={bx}
                          y={by}
                          width={barWidth - 2}
                          height={Math.max(2, bh)}
                          fill={s.color}
                          rx="2"
                          className="hover:opacity-80 transition-opacity"
                        />
                      );
                    })}
                    {/* X-axis label */}
                    <text
                      x={padding.left + groupIdx * barGroupWidth + barGroupWidth / 2}
                      y={padding.top + plotHeight + 18}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {row[payload.xAxisKey]}
                    </text>
                  </g>
                );
              })}
            </g>
          ) : (
            <g>
              {/* Line chart paths */}
              {payload.series.map((s) => {
                const pts = payload.data.map((row, idx) => {
                  const x = padding.left + idx * (plotWidth / Math.max(1, payload.data.length - 1));
                  const y = toSvgY(Number(row[s.key]) || 0);
                  return { x, y };
                });
                const pathD = pts.reduce((acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '');

                return (
                  <g key={s.key}>
                    <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.5" />
                    {pts.map((pt, pIdx) => (
                      <circle key={pIdx} cx={pt.x} cy={pt.y} r="3.5" fill={s.color} stroke="#0f172a" strokeWidth="1.5" />
                    ))}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
