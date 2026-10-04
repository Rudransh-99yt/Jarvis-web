import React, { useState, useMemo, useEffect } from 'react';
import type { ProjectileVisualizationPayload } from '../../../types/visualization.ts';
import { PhysicsEngine } from '../../../../server/sectors/education/visualization/physicsEngine.ts';
import { Play, Pause, RotateCcw, Target, Gauge } from 'lucide-react';

interface Props {
  payload: ProjectileVisualizationPayload;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const ProjectileMotionRenderer: React.FC<Props> = ({
  payload,
  width = 600,
  height = 360,
  interactive = true
}) => {
  const [velocity, setVelocity] = useState(payload.initialVelocity || 25);
  const [angleDeg, setAngleDeg] = useState(payload.launchAngleDeg || 45);
  const [height0, setHeight0] = useState(payload.initialHeight || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animTime, setAnimTime] = useState(0);

  const metrics = useMemo(() => {
    return PhysicsEngine.calculateProjectileMotion({
      initialVelocity: velocity,
      launchAngleDeg: angleDeg,
      initialHeight: height0,
      gravity: payload.gravity || 9.8,
      sampleSteps: 150
    });
  }, [velocity, angleDeg, height0, payload.gravity]);

  // Animation frame loop
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setAnimTime((prev) => {
        const next = prev + dt * 1.2; // slight speedup factor for smooth UX
        if (next >= metrics.flightTimeSeconds) {
          setIsPlaying(false);
          return metrics.flightTimeSeconds;
        }
        return next;
      });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, metrics.flightTimeSeconds]);

  const padding = { top: 30, right: 30, bottom: 40, left: 50 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Coordinate scales
  const maxSimX = Math.max(20, metrics.horizontalRangeMeters * 1.15);
  const maxSimY = Math.max(10, metrics.maxHeightMeters * 1.3);

  const toSvgX = (x: number) => padding.left + (x / maxSimX) * plotWidth;
  const toSvgY = (y: number) => padding.top + plotHeight - (y / maxSimY) * plotHeight;

  // Trajectory Path D
  const trajectoryPathD = useMemo(() => {
    if (!metrics.trajectoryPoints.length) return '';
    return metrics.trajectoryPoints.reduce((acc: string, pt: { x: number; y: number }, idx: number) => {
      const sx = toSvgX(pt.x);
      const sy = toSvgY(pt.y);
      return idx === 0 ? `M ${sx.toFixed(1)} ${sy.toFixed(1)}` : `${acc} L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    }, '');
  }, [metrics.trajectoryPoints, maxSimX, maxSimY, plotWidth, plotHeight]);

  // Current projectile position during animation
  const g = payload.gravity || 9.8;
  const rad = (angleDeg * Math.PI) / 180;
  const currX = velocity * Math.cos(rad) * animTime;
  const currY = Math.max(0, height0 + velocity * Math.sin(rad) * animTime - 0.5 * g * animTime * animTime);

  const apexX = velocity * Math.cos(rad) * metrics.apexTimeSeconds;
  const apexY = metrics.maxHeightMeters;

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-slate-200">
      {/* Header & Live KPI Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-cyan-300 font-hud">{payload.title}</h4>
          <p className="text-xs text-slate-400">g = {payload.gravity || 9.8} m/s² · 2D Kinematics</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 px-2 py-1 rounded">
            <span className="text-slate-400">Max H: </span>
            <span className="text-emerald-400 font-bold">{metrics.maxHeightMeters}m</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-2 py-1 rounded">
            <span className="text-slate-400">Range: </span>
            <span className="text-cyan-400 font-bold">{metrics.horizontalRangeMeters}m</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-2 py-1 rounded">
            <span className="text-slate-400">Time: </span>
            <span className="text-amber-400 font-bold">{metrics.flightTimeSeconds}s</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden flex justify-center items-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[360px] select-none">
          {/* Ground Baseline */}
          <line
            x1={padding.left}
            y1={toSvgY(0)}
            x2={padding.left + plotWidth}
            y2={toSvgY(0)}
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Launch Platform / Cannon */}
          {height0 > 0 && (
            <rect
              x={padding.left - 10}
              y={toSvgY(height0)}
              width={10}
              height={toSvgY(0) - toSvgY(height0)}
              fill="#334155"
              stroke="#64748b"
            />
          )}

          {/* Trajectory Curve */}
          <path
            d={trajectoryPathD}
            fill="none"
            stroke={payload.color || '#38bdf8'}
            strokeWidth="2.5"
            strokeDasharray="4,4"
          />

          {/* Apex Marker */}
          {payload.showApex !== false && (
            <g>
              <circle cx={toSvgX(apexX)} cy={toSvgY(apexY)} r="4" fill="#10b981" />
              <line
                x1={toSvgX(apexX)}
                y1={toSvgY(apexY)}
                x2={toSvgX(apexX)}
                y2={toSvgY(0)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.6"
              />
              <text
                x={toSvgX(apexX)}
                y={toSvgY(apexY) - 8}
                textAnchor="middle"
                className="text-[10px] fill-emerald-300 font-mono font-bold"
              >
                Apex ({metrics.maxHeightMeters}m)
              </text>
            </g>
          )}

          {/* Target / Landing Marker */}
          <g>
            <circle cx={toSvgX(metrics.horizontalRangeMeters)} cy={toSvgY(0)} r="4" fill="#f59e0b" />
            <text
              x={toSvgX(metrics.horizontalRangeMeters)}
              y={toSvgY(0) + 16}
              textAnchor="middle"
              className="text-[10px] fill-amber-300 font-mono"
            >
              Impact ({metrics.horizontalRangeMeters}m)
            </text>
          </g>

          {/* Animated Projectile Particle */}
          <circle
            cx={toSvgX(currX)}
            cy={toSvgY(currY)}
            r="6"
            fill="#00f2fe"
            stroke="#ffffff"
            strokeWidth="2"
            className="filter drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]"
          />
        </svg>
      </div>

      {/* Interactive Controls & Playback */}
      {interactive && (
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (animTime >= metrics.flightTimeSeconds) setAnimTime(0);
                  setIsPlaying(!isPlaying);
                }}
                className="flex items-center gap-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause' : animTime > 0 ? 'Resume' : 'Launch'}
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setAnimTime(0);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 px-2 py-1 text-xs cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
            <div className="text-xs font-mono text-slate-400">
              t = <span className="text-cyan-300 font-semibold">{animTime.toFixed(2)}s</span> / {metrics.flightTimeSeconds}s
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between font-mono text-slate-300">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" /> Velocity (v₀):
                </span>
                <span className="text-cyan-300 font-bold">{velocity} m/s</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={velocity}
                onChange={(e) => {
                  setVelocity(parseFloat(e.target.value));
                  setAnimTime(0);
                  setIsPlaying(false);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between font-mono text-slate-300">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" /> Launch Angle (θ):
                </span>
                <span className="text-emerald-300 font-bold">{angleDeg}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                step="1"
                value={angleDeg}
                onChange={(e) => {
                  setAngleDeg(parseFloat(e.target.value));
                  setAnimTime(0);
                  setIsPlaying(false);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
