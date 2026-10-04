// Interactive Physics Projectile Motion Simulator Renderer (Phase D.10)
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { PhysicsParameters } from '../../../types/visualization.ts';
import { PhysicsEngine } from '../../../../server/sectors/education/visualization/physicsEngine.ts';

interface ProjectileMotionRendererProps {
  parameters: PhysicsParameters;
  width?: number;
  height?: number;
  onParametersChange?: (newParams: PhysicsParameters) => void;
  isReadOnly?: boolean;
}

export const ProjectileMotionRenderer: React.FC<ProjectileMotionRendererProps> = ({
  parameters,
  width = 600,
  height = 400,
  onParametersChange,
  isReadOnly = false
}) => {
  const [v0, setV0] = useState<number>(parameters.v0 ?? 25);
  const [angleDeg, setAngleDeg] = useState<number>(parameters.angleDeg ?? 45);
  const [g, setG] = useState<number>(parameters.g ?? 9.8);
  const [h0, setH0] = useState<number>(parameters.h0 ?? 0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const animRef = useRef<number | null>(null);

  // Compute simulation
  const sim = useMemo(() => {
    return PhysicsEngine.simulateProjectile({ v0, angleDeg, g, h0 });
  }, [v0, angleDeg, g, h0]);

  // Notify parent of parameter change if interactive
  useEffect(() => {
    if (onParametersChange) {
      onParametersChange({
        subType: 'projectile_motion',
        v0,
        angleDeg,
        g,
        h0,
        maxHeight: sim.maxHeight,
        range: sim.range,
        timeOfFlight: sim.timeOfFlight
      });
    }
  }, [v0, angleDeg, g, h0, sim, onParametersChange]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const duration = Math.max(1000, sim.timeOfFlight * 1000);
    const start = performance.now() - progress * duration;

    const frame = (now: number) => {
      const elapsed = now - start;
      const cur = Math.min(1, elapsed / duration);
      setProgress(cur);

      if (cur < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        setIsPlaying(false);
      }
    };

    animRef.current = requestAnimationFrame(frame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, sim.timeOfFlight]);

  // Coordinate scaling to fit width & height
  const padding = { top: 35, right: 35, bottom: 40, left: 45 };
  const plotWidth = Math.max(100, width - padding.left - padding.right);
  const plotHeight = Math.max(100, height - padding.top - padding.bottom);

  const maxSimX = Math.max(10, sim.range * 1.15);
  const maxSimY = Math.max(10, sim.maxHeight * 1.3);

  const toScreenX = (x: number) => padding.left + (x / maxSimX) * plotWidth;
  const toScreenY = (y: number) => height - padding.bottom - (y / maxSimY) * plotHeight;

  // Trajectory SVG Path
  const trajectoryPathD = useMemo(() => {
    if (sim.trajectory.length === 0) return '';
    let d = `M ${toScreenX(sim.trajectory[0].x)} ${toScreenY(sim.trajectory[0].y)} `;
    for (let i = 1; i < sim.trajectory.length; i++) {
      d += `L ${toScreenX(sim.trajectory[i].x)} ${toScreenY(sim.trajectory[i].y)} `;
    }
    return d;
  }, [sim.trajectory, maxSimX, maxSimY, plotWidth, plotHeight, width, height]);

  // Current animated projectile position
  const currentIndex = Math.min(
    sim.trajectory.length - 1,
    Math.floor(progress * (sim.trajectory.length - 1))
  );
  const currentPos = sim.trajectory[currentIndex] || { x: 0, y: h0, vx: 0, vy: 0, speed: 0, t: 0 };
  const projScreenX = toScreenX(currentPos.x);
  const projScreenY = toScreenY(currentPos.y);

  return (
    <div className="flex flex-col select-none rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-xl">
      {/* Top Parameter Stats Banner */}
      <div className="grid grid-cols-4 gap-2 pb-2 mb-2 border-b border-slate-800/80 text-xs text-center font-mono">
        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Max Height (Apex)</div>
          <div className="text-cyan-400 font-bold">{sim.maxHeight} m</div>
        </div>
        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Total Range</div>
          <div className="text-emerald-400 font-bold">{sim.range} m</div>
        </div>
        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Flight Time</div>
          <div className="text-amber-400 font-bold">{sim.timeOfFlight} s</div>
        </div>
        <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
          <div className="text-[10px] text-slate-500 uppercase">Impact Speed</div>
          <div className="text-rose-400 font-bold">{sim.impactVelocity.speed} m/s</div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800/50">
        <svg width={width} height={height} className="block">
          {/* Ground */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Launch platform (if h0 > 0) */}
          {h0 > 0 && (
            <rect
              x={padding.left - 8}
              y={toScreenY(h0)}
              width={16}
              height={toScreenY(0) - toScreenY(h0)}
              fill="#334155"
              stroke="#64748b"
            />
          )}

          {/* Trajectory Parabola Path */}
          <path
            d={trajectoryPathD}
            fill="none"
            stroke="#00f2fe"
            strokeWidth="2.5"
            strokeDasharray="4 3"
          />

          {/* Key Points Markers */}
          {/* 1. Launch */}
          <circle cx={toScreenX(0)} cy={toScreenY(h0)} r="4" fill="#38bdf8" />
          <text x={toScreenX(0) + 8} y={toScreenY(h0) - 8} fill="#38bdf8" fontSize="10" fontFamily="monospace">
            Launch
          </text>

          {/* 2. Apex */}
          <circle cx={toScreenX(sim.v0 * Math.cos((sim.angleDeg * Math.PI) / 180) * sim.timeToApex)} cy={toScreenY(sim.maxHeight)} r="5" fill="#f59e0b" />
          <text
            x={toScreenX(sim.v0 * Math.cos((sim.angleDeg * Math.PI) / 180) * sim.timeToApex)}
            y={toScreenY(sim.maxHeight) - 10}
            textAnchor="middle"
            fill="#f59e0b"
            fontSize="10"
            fontFamily="monospace"
          >
            Apex ({sim.maxHeight}m)
          </text>

          {/* 3. Impact */}
          <circle cx={toScreenX(sim.range)} cy={toScreenY(0)} r="4" fill="#10b981" />
          <text x={toScreenX(sim.range)} y={toScreenY(0) + 16} textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="monospace">
            Impact ({sim.range}m)
          </text>

          {/* Animated Projectile Ball */}
          <circle
            cx={projScreenX}
            cy={projScreenY}
            r="6"
            fill="#f43f5e"
            stroke="#fff"
            strokeWidth="2"
            className="filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
          />

          {/* Velocity Vector Arrow on Projectile */}
          {progress > 0 && progress < 1 && (
            <line
              x1={projScreenX}
              y1={projScreenY}
              x2={projScreenX + currentPos.vx * 0.8}
              y2={projScreenY - currentPos.vy * 0.8}
              stroke="#fbbf24"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* Current Flying Telemetry Pill */}
        <div className="absolute top-2 right-2 rounded bg-slate-900/90 border border-slate-700 px-2.5 py-1 text-[11px] font-mono text-slate-300">
          t: {currentPos.t}s | v: {currentPos.speed} m/s
        </div>
      </div>

      {/* Interactive Controls & Sliders */}
      <div className="flex flex-col gap-2 pt-3 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (progress >= 1) setProgress(0);
                setIsPlaying(!isPlaying);
              }}
              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1.5"
            >
              {isPlaying ? 'Pause' : progress >= 1 ? 'Replay' : 'Launch'}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setProgress(0);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">Progress:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              onChange={(e) => {
                setIsPlaying(false);
                setProgress(parseFloat(e.target.value));
              }}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-400 font-mono w-10 text-right">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>

        {/* Sliders for Velocity, Angle, Gravity, Height */}
        {!isReadOnly && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Velocity (v₀)</span>
                <span className="text-cyan-400 font-mono">{v0} m/s</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={v0}
                onChange={(e) => setV0(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Launch Angle (θ)</span>
                <span className="text-amber-400 font-mono">{angleDeg}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                step="1"
                value={angleDeg}
                onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Gravity (g)</span>
                <span className="text-emerald-400 font-mono">{g} m/s²</span>
              </div>
              <input
                type="range"
                min="1.6"
                max="25"
                step="0.2"
                value={g}
                onChange={(e) => setG(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Elevation (h₀)</span>
                <span className="text-purple-400 font-mono">{h0} m</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={h0}
                onChange={(e) => setH0(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
