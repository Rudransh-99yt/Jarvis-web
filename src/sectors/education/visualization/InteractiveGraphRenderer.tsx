import React, { useState, useMemo } from 'react';
import type { GraphVisualizationPayload } from '../../../types/visualization.ts';
import { MathEvaluator } from './mathEvaluator.ts';
import { Sliders, RotateCcw } from 'lucide-react';

interface Props {
  payload: GraphVisualizationPayload;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const InteractiveGraphRenderer: React.FC<Props> = ({
  payload,
  width = 600,
  height = 360,
  interactive = true
}) => {
  // Initialize parameter values from payload
  const [params, setParams] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (payload.parameters) {
      for (const p of payload.parameters) {
        initial[p.name] = p.value;
      }
    }
    return initial;
  });

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const [xMin, xMax] = payload.xDomain || [-10, 10];
  const [yMin, yMax] = payload.yDomain || [-5, 5];

  const padding = { top: 25, right: 25, bottom: 35, left: 45 };
  const plotWidth = Math.max(100, width - padding.left - padding.right);
  const plotHeight = Math.max(100, height - padding.top - padding.bottom);

  // Coordinate mapping
  const toSvgX = (x: number) => padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const toSvgY = (y: number) => padding.top + ((yMax - y) / (yMax - yMin)) * plotHeight;
  const fromSvgX = (svgX: number) => xMin + ((svgX - padding.left) / plotWidth) * (xMax - xMin);
  const fromSvgY = (svgY: number) => yMax - ((svgY - padding.top) / plotHeight) * (yMax - yMin);

  // Compute curve points for all series
  const seriesCurves = useMemo(() => {
    return payload.series.map((s) => {
      const pts = MathEvaluator.sampleCurve(s.expression, xMin, xMax, 250, params);
      let pathD = '';
      pts.forEach((pt: { x: number; y: number }, idx: number) => {
        const sx = toSvgX(pt.x);
        const sy = toSvgY(pt.y);
        if (idx === 0) pathD += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
        else pathD += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      });
      return {
        ...s,
        pathD
      };
    });
  }, [payload.series, params, xMin, xMax, yMin, yMax, plotWidth, plotHeight]);

  // Compute grid lines
  const gridLines = useMemo(() => {
    const xTicks: number[] = [];
    const yTicks: number[] = [];
    const xStep = Math.max(0.5, (xMax - xMin) / 8);
    const yStep = Math.max(0.5, (yMax - yMin) / 6);

    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      xTicks.push(Number(x.toFixed(2)));
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      yTicks.push(Number(y.toFixed(2)));
    }
    return { xTicks, yTicks };
  }, [xMin, xMax, yMin, yMax]);

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    if (
      clientX >= padding.left &&
      clientX <= padding.left + plotWidth &&
      clientY >= padding.top &&
      clientY <= padding.top + plotHeight
    ) {
      setHoverCoord({
        x: Number(fromSvgX(clientX).toFixed(2)),
        y: Number(fromSvgY(clientY).toFixed(2))
      });
    } else {
      setHoverCoord(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-cyan-300 font-hud">{payload.title}</h4>
          <p className="text-xs text-slate-400">
            {payload.series.map((s) => s.name || s.expression).join(' · ')}
          </p>
        </div>
        {hoverCoord && payload.showCoordinates !== false && (
          <div className="text-xs font-mono bg-slate-900 border border-cyan-500/30 px-2 py-0.5 rounded text-cyan-300">
            x: {hoverCoord.x}, y: {hoverCoord.y}
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden flex justify-center items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[380px] select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoord(null)}
        >
          {/* Background Grid */}
          {payload.grid !== false && (
            <g opacity="0.15">
              {gridLines.xTicks.map((xVal) => (
                <line
                  key={`x-grid-${xVal}`}
                  x1={toSvgX(xVal)}
                  y1={padding.top}
                  x2={toSvgX(xVal)}
                  y2={padding.top + plotHeight}
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
              ))}
              {gridLines.yTicks.map((yVal) => (
                <line
                  key={`y-grid-${yVal}`}
                  x1={padding.left}
                  y1={toSvgY(yVal)}
                  x2={padding.left + plotWidth}
                  y2={toSvgY(yVal)}
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
              ))}
            </g>
          )}

          {/* Coordinate Axes (0,0) */}
          <g opacity="0.6">
            {originX >= padding.left && originX <= padding.left + plotWidth && (
              <line
                x1={originX}
                y1={padding.top}
                x2={originX}
                y2={padding.top + plotHeight}
                stroke="#64748b"
                strokeWidth="1.5"
              />
            )}
            {originY >= padding.top && originY <= padding.top + plotHeight && (
              <line
                x1={padding.left}
                y1={originY}
                x2={padding.left + plotWidth}
                y2={originY}
                stroke="#64748b"
                strokeWidth="1.5"
              />
            )}
          </g>

          {/* Axis Labels & Ticks */}
          <g className="text-[10px] fill-slate-400 font-mono">
            {gridLines.xTicks.map((xVal) => (
              <text
                key={`xt-${xVal}`}
                x={toSvgX(xVal)}
                y={padding.top + plotHeight + 14}
                textAnchor="middle"
              >
                {xVal}
              </text>
            ))}
            {gridLines.yTicks.map((yVal) => (
              <text
                key={`yt-${yVal}`}
                x={padding.left - 6}
                y={toSvgY(yVal) + 3}
                textAnchor="end"
              >
                {yVal}
              </text>
            ))}
          </g>

          {/* Plotted Series Paths */}
          {seriesCurves.map((s) => (
            <path
              key={s.id}
              d={s.pathD}
              fill="none"
              stroke={s.color || '#00f2fe'}
              strokeWidth={s.strokeWidth || 2.5}
              strokeDasharray={s.style === 'dashed' ? '6,4' : s.style === 'dotted' ? '2,3' : undefined}
            />
          ))}

          {/* Active Hover Crosshair */}
          {hoverCoord && (
            <g pointerEvents="none">
              <line
                x1={toSvgX(hoverCoord.x)}
                y1={padding.top}
                x2={toSvgX(hoverCoord.x)}
                y2={padding.top + plotHeight}
                stroke="#00f2fe"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.7"
              />
              <line
                x1={padding.left}
                y1={toSvgY(hoverCoord.y)}
                x2={padding.left + plotWidth}
                y2={toSvgY(hoverCoord.y)}
                stroke="#00f2fe"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.7"
              />
              <circle
                cx={toSvgX(hoverCoord.x)}
                cy={toSvgY(hoverCoord.y)}
                r="4"
                fill="#00f2fe"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Parameter Sliders */}
      {interactive && payload.parameters && payload.parameters.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Interactive Parameters
            </span>
            <button
              onClick={() => {
                const reset: Record<string, number> = {};
                payload.parameters?.forEach((p) => (reset[p.name] = p.value));
                setParams(reset);
              }}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {payload.parameters.map((p) => {
              const currentVal = params[p.name] ?? p.value;
              return (
                <div key={p.name} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>{p.label || p.name}:</span>
                    <span className="text-cyan-300 font-semibold">{currentVal.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={currentVal}
                    onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
