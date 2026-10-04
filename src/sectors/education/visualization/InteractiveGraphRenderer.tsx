// Interactive SVG Math Graph Renderer (Phase D.10)
import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { GraphParameters } from '../../../types/visualization.ts';
import { MathEvaluator } from './mathEvaluator.ts';

interface InteractiveGraphRendererProps {
  parameters: GraphParameters;
  width?: number;
  height?: number;
  onParametersChange?: (newParams: GraphParameters) => void;
  isReadOnly?: boolean;
}

export const InteractiveGraphRenderer: React.FC<InteractiveGraphRendererProps> = ({
  parameters,
  width = 600,
  height = 400,
  onParametersChange,
  isReadOnly = false
}) => {
  const [domain, setDomain] = useState<[number, number]>(parameters.domain || [-6, 6]);
  const [range, setRange] = useState<[number, number]>(parameters.range || [-8, 12]);
  const [hoverCoord, setHoverCoord] = useState<{ mathX: number; mathY: number; screenX: number; screenY: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number; label: string } | null>(null);
  const [visibleFunctions, setVisibleFunctions] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (parameters.functions || []).forEach((fn) => {
      init[fn.id] = fn.visible !== false;
    });
    return init;
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; domain: [number, number]; range: [number, number] }>({
    x: 0,
    y: 0,
    domain: [-6, 6],
    range: [-8, 12]
  });

  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const plotWidth = Math.max(100, width - padding.left - padding.right);
  const plotHeight = Math.max(100, height - padding.top - padding.bottom);

  // Coordinate transforms
  const toScreenX = useCallback((mathX: number) => {
    return padding.left + ((mathX - domain[0]) / (domain[1] - domain[0])) * plotWidth;
  }, [domain, padding.left, plotWidth]);

  const toScreenY = useCallback((mathY: number) => {
    return padding.top + ((range[1] - mathY) / (range[1] - range[0])) * plotHeight;
  }, [range, padding.top, plotHeight]);

  const toMathX = useCallback((screenX: number) => {
    return domain[0] + ((screenX - padding.left) / plotWidth) * (domain[1] - domain[0]);
  }, [domain, padding.left, plotWidth]);

  const toMathY = useCallback((screenY: number) => {
    return range[1] - ((screenY - padding.top) / plotHeight) * (range[1] - range[0]);
  }, [range, padding.top, plotHeight]);

  // Compute Grid ticks
  const xTicks = useMemo(() => {
    const span = domain[1] - domain[0];
    const rawStep = span / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.max(1, Math.round(rawStep / mag)) * mag;
    const ticks: number[] = [];
    const first = Math.ceil(domain[0] / step) * step;
    for (let x = first; x <= domain[1]; x += step) {
      ticks.push(Number(x.toFixed(2)));
    }
    return ticks;
  }, [domain]);

  const yTicks = useMemo(() => {
    const span = range[1] - range[0];
    const rawStep = span / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.max(1, Math.round(rawStep / mag)) * mag;
    const ticks: number[] = [];
    const first = Math.ceil(range[0] / step) * step;
    for (let y = first; y <= range[1]; y += step) {
      ticks.push(Number(y.toFixed(2)));
    }
    return ticks;
  }, [range]);

  // Precompute function paths
  const functionPaths = useMemo(() => {
    return (parameters.functions || []).map((fn) => {
      if (!visibleFunctions[fn.id]) return { id: fn.id, pathD: '', fn };

      let points: Array<{ x: number; y: number }> = [];
      try {
        points = MathEvaluator.generateCurvePoints(fn.expression, domain, 250);
      } catch {
        // Skip unparseable
      }

      if (points.length === 0) return { id: fn.id, pathD: '', fn };

      let d = '';
      let isFirst = true;

      for (const p of points) {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);

        // Filter out points far beyond visual range to prevent SVG render artifacts
        if (sy < -500 || sy > height + 500) {
          isFirst = true;
          continue;
        }

        if (isFirst) {
          d += `M ${sx.toFixed(1)} ${sy.toFixed(1)} `;
          isFirst = false;
        } else {
          d += `L ${sx.toFixed(1)} ${sy.toFixed(1)} `;
        }
      }

      return { id: fn.id, pathD: d, fn };
    });
  }, [parameters.functions, visibleFunctions, domain, toScreenX, toScreenY, height]);

  // Zoom helpers
  const handleZoom = (factor: number) => {
    const xCenter = (domain[0] + domain[1]) / 2;
    const yCenter = (range[0] + range[1]) / 2;
    const halfXSpan = ((domain[1] - domain[0]) * factor) / 2;
    const halfYSpan = ((range[1] - range[0]) * factor) / 2;

    const newDomain: [number, number] = [
      Number((xCenter - halfXSpan).toFixed(2)),
      Number((xCenter + halfXSpan).toFixed(2))
    ];
    const newRange: [number, number] = [
      Number((yCenter - halfYSpan).toFixed(2)),
      Number((yCenter + halfYSpan).toFixed(2))
    ];

    setDomain(newDomain);
    setRange(newRange);
  };

  const handleReset = () => {
    setDomain(parameters.domain || [-6, 6]);
    setRange(parameters.range || [-8, 12]);
    setSelectedPoint(null);
  };

  // Pointer drag panning
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      domain: [...domain],
      range: [...range]
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (sx >= padding.left && sx <= width - padding.right && sy >= padding.top && sy <= height - padding.bottom) {
        setHoverCoord({
          mathX: Number(toMathX(sx).toFixed(2)),
          mathY: Number(toMathY(sy).toFixed(2)),
          screenX: sx,
          screenY: sy
        });
      } else {
        setHoverCoord(null);
      }
    }

    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const mathDx = (dx / plotWidth) * (dragStartRef.current.domain[1] - dragStartRef.current.domain[0]);
    const mathDy = (dy / plotHeight) * (dragStartRef.current.range[1] - dragStartRef.current.range[0]);

    setDomain([
      Number((dragStartRef.current.domain[0] - mathDx).toFixed(2)),
      Number((dragStartRef.current.domain[1] - mathDx).toFixed(2))
    ]);
    setRange([
      Number((dragStartRef.current.range[0] + mathDy).toFixed(2)),
      Number((dragStartRef.current.range[1] + mathDy).toFixed(2))
    ]);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const originX = toScreenX(0);
  const originY = toScreenY(0);

  return (
    <div className="flex flex-col select-none rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-xl">
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80 text-xs">
        {/* Function Badges / Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {(parameters.functions || []).map((fn) => {
            const isVis = visibleFunctions[fn.id] !== false;
            return (
              <button
                key={fn.id}
                onClick={() => setVisibleFunctions((prev) => ({ ...prev, [fn.id]: !isVis }))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] transition-all ${
                  isVis
                    ? 'bg-slate-800 text-slate-100 border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: isVis ? fn.color || '#00f2fe' : '#475569' }}
                />
                <span>{fn.label || `y = ${fn.expression}`}</span>
              </button>
            );
          })}
        </div>

        {/* Pan/Zoom Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleZoom(0.8)}
            title="Zoom In"
            className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            +
          </button>
          <button
            onClick={() => handleZoom(1.25)}
            title="Zoom Out"
            className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            -
          </button>
          <button
            onClick={handleReset}
            title="Reset View"
            className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800/50">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="cursor-crosshair block touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            isDraggingRef.current = false;
            setHoverCoord(null);
          }}
        >
          <defs>
            <clipPath id="plotClip">
              <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {parameters.showGrid !== false && (
            <g opacity="0.15" stroke="#94a3b8" strokeWidth="1">
              {xTicks.map((x) => {
                const sx = toScreenX(x);
                if (sx < padding.left || sx > width - padding.right) return null;
                return <line key={`gx-${x}`} x1={sx} y1={padding.top} x2={sx} y2={height - padding.bottom} strokeDasharray="3 3" />;
              })}
              {yTicks.map((y) => {
                const sy = toScreenY(y);
                if (sy < padding.top || sy > height - padding.bottom) return null;
                return <line key={`gy-${y}`} x1={padding.left} y1={sy} x2={width - padding.right} y2={sy} strokeDasharray="3 3" />;
              })}
            </g>
          )}

          {/* Main Axes */}
          <g clipPath="url(#plotClip)">
            {/* X-Axis */}
            {originY >= padding.top && originY <= height - padding.bottom && (
              <line
                x1={padding.left}
                y1={originY}
                x2={width - padding.right}
                y2={originY}
                stroke="#64748b"
                strokeWidth="1.5"
              />
            )}
            {/* Y-Axis */}
            {originX >= padding.left && originX <= width - padding.right && (
              <line
                x1={originX}
                y1={padding.top}
                x2={originX}
                y2={height - padding.bottom}
                stroke="#64748b"
                strokeWidth="1.5"
              />
            )}

            {/* Function Curves */}
            {functionPaths.map(({ id, pathD, fn }) => {
              if (!pathD) return null;
              return (
                <path
                  key={`path-${id}`}
                  d={pathD}
                  fill="none"
                  stroke={fn.color || '#00f2fe'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Key Points (Roots, Vertex, Y-Intercepts) */}
            {(parameters.functions || []).map((fn) => {
              if (!visibleFunctions[fn.id] || !fn.keyPoints) return null;
              return fn.keyPoints.map((kp, idx) => {
                const sx = toScreenX(kp.x);
                const sy = toScreenY(kp.y);
                if (sx < padding.left || sx > width - padding.right || sy < padding.top || sy > height - padding.bottom) {
                  return null;
                }
                const isSelected = selectedPoint?.x === kp.x && selectedPoint?.y === kp.y;

                return (
                  <g
                    key={`kp-${fn.id}-${idx}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoint({ x: kp.x, y: kp.y, label: kp.label });
                    }}
                  >
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isSelected ? 6 : 4.5}
                      fill={kp.type === 'root' ? '#10b981' : kp.type === 'vertex' ? '#f59e0b' : '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  </g>
                );
              });
            })}
          </g>

          {/* Tick Labels */}
          {parameters.showLabels !== false && (
            <g fill="#94a3b8" fontSize="10" fontFamily="var(--font-mono, monospace)">
              {/* X tick labels */}
              {xTicks.map((x) => {
                const sx = toScreenX(x);
                if (sx < padding.left + 5 || sx > width - padding.right - 5) return null;
                return (
                  <text key={`tx-${x}`} x={sx} y={height - padding.bottom + 16} textAnchor="middle">
                    {x}
                  </text>
                );
              })}
              {/* Y tick labels */}
              {yTicks.map((y) => {
                const sy = toScreenY(y);
                if (sy < padding.top + 8 || sy > height - padding.bottom - 5) return null;
                return (
                  <text key={`ty-${y}`} x={padding.left - 8} y={sy + 3} textAnchor="end">
                    {y}
                  </text>
                );
              })}
            </g>
          )}

          {/* Hover Crosshairs & Point Pill */}
          {hoverCoord && (
            <g pointerEvents="none">
              <line
                x1={hoverCoord.screenX}
                y1={padding.top}
                x2={hoverCoord.screenX}
                y2={height - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <line
                x1={padding.left}
                y1={hoverCoord.screenY}
                x2={width - padding.right}
                y2={hoverCoord.screenY}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <circle cx={hoverCoord.screenX} cy={hoverCoord.screenY} r="3" fill="#38bdf8" />
            </g>
          )}
        </svg>

        {/* Dynamic Tooltip / Pill Badge */}
        {hoverCoord && (
          <div
            className="absolute pointer-events-none rounded bg-slate-900/90 backdrop-blur px-2 py-0.5 text-[11px] font-mono text-cyan-400 border border-slate-700 shadow-md"
            style={{
              left: Math.min(width - 120, Math.max(10, hoverCoord.screenX + 12)),
              top: Math.max(10, hoverCoord.screenY - 24)
            }}
          >
            ({hoverCoord.mathX}, {hoverCoord.mathY})
          </div>
        )}

        {/* Selected Key Point Detail Box */}
        {selectedPoint && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2 rounded bg-slate-900/95 border border-cyan-500/50 px-3 py-1.5 text-xs text-slate-200 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-cyan-300">{selectedPoint.label}</span>
            <span className="text-slate-400 font-mono">
              ({selectedPoint.x}, {selectedPoint.y})
            </span>
            <button
              onClick={() => setSelectedPoint(null)}
              className="ml-2 text-slate-400 hover:text-slate-200 font-bold"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Domain / Range Footer Readout */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2">
        <div>
          x ∈ [{domain[0]}, {domain[1]}]
        </div>
        <div>Drag to pan • Click key points to inspect • Scroll/buttons to zoom</div>
        <div>
          y ∈ [{range[0]}, {range[1]}]
        </div>
      </div>
    </div>
  );
};
