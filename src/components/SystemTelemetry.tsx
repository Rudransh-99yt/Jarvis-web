import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Zap, Wifi, Compass, ShieldAlert } from 'lucide-react';
import { HudTheme, SystemMetric } from '../types';

interface SystemTelemetryProps {
  theme: HudTheme;
  isScanning: boolean;
}

export const SystemTelemetry: React.FC<SystemTelemetryProps> = ({
  theme,
  isScanning
}) => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { name: 'ARMOR INTEGRITY', value: 98, max: 100, unit: '%', status: 'optimal' },
    { name: 'REPULSOR CAPACITORS', value: 100, max: 100, unit: '%', status: 'optimal' },
    { name: 'NEURAL CPU LOAD', value: 34, max: 100, unit: '%', status: 'nominal' },
    { name: 'QUANTUM MEMORY', value: 42, max: 100, unit: 'TB', status: 'nominal' },
    { name: 'SATELLITE UPLINK', value: 99.8, max: 100, unit: '%', status: 'optimal' },
    { name: 'COOLANT PRESSURE', value: 184, max: 200, unit: 'PSI', status: 'nominal' }
  ]);

  const [radarAngle, setRadarAngle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((m) => {
          if (m.name === 'NEURAL CPU LOAD') {
            const delta = (Math.random() - 0.5) * 6;
            const newVal = Math.min(95, Math.max(20, Math.round(m.value + delta)));
            return { ...m, value: newVal };
          }
          if (m.name === 'COOLANT PRESSURE') {
            const delta = (Math.random() - 0.5) * 2;
            return { ...m, value: Math.round(m.value + delta) };
          }
          return m;
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getMetricColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'optimal':
        return 'text-cyan-400 bg-cyan-400';
      case 'warning':
        return 'text-amber-400 bg-amber-400';
      case 'critical':
        return 'text-red-400 bg-red-400';
      case 'nominal':
      default:
        return 'text-blue-400 bg-blue-400';
    }
  };

  return (
    <div className="flex flex-col gap-3 font-mono-code text-xs h-full">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
        <span className="flex items-center gap-1.5 text-cyan-300 font-bold tracking-wider">
          <Activity className="w-4 h-4 text-cyan-400" />
          SYSTEM TELEMETRY
        </span>
        <span className="text-[10px] text-cyan-400/60 uppercase">
          {isScanning ? 'RUNNING SWEEP...' : 'MONITORED REAL-TIME'}
        </span>
      </div>

      {/* Metric Bars */}
      <div className="space-y-2.5 bg-black/40 border border-cyan-500/20 rounded p-2.5">
        {metrics.map((m) => (
          <div key={m.name} className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-cyan-200/80">{m.name}</span>
              <span className="font-orbitron font-bold text-white">
                {m.value}
                <span className="text-[10px] text-cyan-400/70 font-normal ml-0.5">{m.unit}</span>
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-cyan-500/20">
              <div
                className={`h-full transition-all duration-700 ${
                  isScanning ? 'animate-pulse bg-cyan-300' : 'bg-cyan-500'
                }`}
                style={{ width: `${(m.value / m.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Radar Perimeter Sweep Display */}
      <div className="relative bg-black/60 border border-cyan-500/20 rounded p-3 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full flex items-center justify-between text-[10px] text-cyan-400/80 mb-2">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            STARK ORBITAL RADAR
          </span>
          <span className="text-cyan-300 font-bold">RANGE: 25 KM</span>
        </div>

        <div className="relative w-36 h-36 rounded-full border border-cyan-500/40 flex items-center justify-center bg-cyan-950/20">
          {/* Concentric distance rings */}
          <div className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-500/20" />
          <div className="absolute w-12 h-12 rounded-full border border-cyan-500/30" />
          <div className="absolute w-full h-[1px] bg-cyan-500/30" />
          <div className="absolute h-full w-[1px] bg-cyan-500/30" />

          {/* Sweeper cone */}
          <div 
            className="absolute inset-0 rounded-full animate-radar pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, rgba(6,182,212,0.3) 0deg, transparent 60deg, transparent 360deg)'
            }}
          />

          {/* Radar Blips (Simulated orbital satellites and defense drones) */}
          <div className="absolute top-6 right-8 w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
          <div className="absolute top-6 right-8 w-2 h-2 rounded-full bg-cyan-400" />
          <div className="absolute bottom-9 left-7 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <div className="absolute top-16 left-9 w-1.5 h-1.5 rounded-full bg-cyan-400" />

          {/* Center Marker */}
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
        </div>

        <div className="w-full flex items-center justify-between text-[9px] text-cyan-400/60 mt-2 px-1">
          <span>LAT: 34.0259° N</span>
          <span>LNG: 118.7798° W</span>
          <span>ALT: 420 M</span>
        </div>
      </div>

      {/* Power Allocation Matrix */}
      <div className="bg-black/40 border border-cyan-500/20 rounded p-2.5">
        <div className="text-[10px] text-cyan-400/80 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            POWER BUS DISTRIBUTION
          </span>
          <span className="text-white font-orbitron font-bold">100% REGULATED</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20">
            <div className="text-cyan-400/70">PROPULSION</div>
            <div className="text-white font-bold font-orbitron">40%</div>
          </div>
          <div className="bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20">
            <div className="text-cyan-400/70">REPULSORS</div>
            <div className="text-white font-bold font-orbitron">35%</div>
          </div>
          <div className="bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20">
            <div className="text-cyan-400/70">HUD / AVIONICS</div>
            <div className="text-white font-bold font-orbitron">15%</div>
          </div>
          <div className="bg-cyan-950/30 p-1.5 rounded border border-cyan-500/20">
            <div className="text-cyan-400/70">LIFE SUPPORT</div>
            <div className="text-white font-bold font-orbitron">10%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
