import React, { useState } from 'react';
import { soundEffects } from '../services/soundEffects';
import { HudTheme } from '../types';

interface ArcReactorProps {
  theme: HudTheme;
  isSpeaking: boolean;
  isListening: boolean;
  onOverdrive?: () => void;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  theme,
  isSpeaking,
  isListening,
  onOverdrive
}) => {
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [powerOutput, setPowerOutput] = useState(3.25);

  const getThemeColors = () => {
    switch (theme) {
      case 'mark85':
        return {
          glow: 'rgba(239, 68, 68, 0.7)',
          ring: '#ef4444',
          accent: '#eab308',
          border: 'border-red-500/40',
          text: 'text-amber-400'
        };
      case 'stealth':
        return {
          glow: 'rgba(16, 185, 129, 0.7)',
          ring: '#10b981',
          accent: '#34d399',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400'
        };
      case 'violet':
        return {
          glow: 'rgba(168, 85, 247, 0.7)',
          ring: '#a855f7',
          accent: '#c084fc',
          border: 'border-purple-500/40',
          text: 'text-purple-300'
        };
      case 'cyan':
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.8)',
          ring: '#06b6d4',
          accent: '#38bdf8',
          border: 'border-cyan-500/40',
          text: 'text-cyan-400'
        };
    }
  };

  const colors = getThemeColors();

  const handleReactorClick = () => {
    soundEffects.playArcPulse();
    setIsOverdrive(true);
    setPowerOutput(4.85);

    if (onOverdrive) onOverdrive();

    setTimeout(() => {
      setIsOverdrive(false);
      setPowerOutput(3.25);
    }, 2800);
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-2 select-none w-full min-w-0">
      {/* Reactor Housing Frame */}
      <div 
        onClick={handleReactorClick}
        className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 cursor-pointer flex items-center justify-center group transition-transform active:scale-95 my-2 shrink-0"
        title="Click to pulse Arc Reactor energy output"
      >
        {/* Ambient Backlight Glow */}
        <div 
          className={`absolute inset-4 rounded-full filter blur-2xl opacity-40 transition-all duration-700 ${
            isOverdrive ? 'opacity-90 scale-110' : isSpeaking ? 'opacity-70 scale-105' : 'opacity-40'
          }`}
          style={{ backgroundColor: colors.ring }}
        />

        {/* Outer Concentric Ticks Ring */}
        <div className={`absolute inset-0 rounded-full border border-dashed ${colors.border} animate-spin-slow opacity-60`} />

        {/* Reverse Secondary Segment Ring */}
        <div 
          className="absolute inset-4 rounded-full border-2 border-dashed opacity-75 animate-spin-reverse-medium"
          style={{ borderColor: `${colors.ring}66` }}
        />

        {/* Static HUD Coordinates Ring */}
        <svg className="absolute inset-2 w-full h-full pointer-events-none" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="142" fill="none" stroke={colors.ring} strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="150" cy="150" r="130" fill="none" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="8 12" strokeOpacity="0.5" />
          
          {/* Compass / Cardinal Notch Markers */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="150"
              y1="12"
              x2="150"
              y2="20"
              stroke={colors.ring}
              strokeWidth="2"
              transform={`rotate(${deg} 150 150)`}
            />
          ))}

          {/* Tri-Sector Accent Arcs */}
          <path
            d="M 150 30 A 120 120 0 0 1 254 90"
            fill="none"
            stroke={colors.accent}
            strokeWidth="3"
            strokeLinecap="round"
            className={isOverdrive ? 'animate-pulse' : ''}
          />
          <path
            d="M 254 210 A 120 120 0 0 1 150 270"
            fill="none"
            stroke={colors.accent}
            strokeWidth="3"
            strokeLinecap="round"
            className={isOverdrive ? 'animate-pulse' : ''}
          />
          <path
            d="M 46 210 A 120 120 0 0 1 46 90"
            fill="none"
            stroke={colors.accent}
            strokeWidth="3"
            strokeLinecap="round"
            className={isOverdrive ? 'animate-pulse' : ''}
          />
        </svg>

        {/* 10 Electromagnetic Induction Coils */}
        <div className={`absolute inset-8 rounded-full ${isOverdrive ? 'animate-spin-fast' : 'animate-spin-slow'}`}>
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3.5 h-6 sm:w-4 sm:h-7 -translate-x-1/2 rounded-sm shadow-md transition-colors duration-300"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 36}deg) translateY(-78px) translateX(-50%)`,
                backgroundColor: isOverdrive ? colors.accent : `${colors.ring}bb`,
                boxShadow: `0 0 10px ${colors.glow}`
              }}
            />
          ))}
        </div>

        {/* Inner Reactor Center Ring */}
        <div 
          className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center border-4 backdrop-blur-md shadow-2xl transition-all duration-500 ${
            isOverdrive 
              ? 'scale-110 border-white bg-cyan-950/70' 
              : isSpeaking
              ? 'scale-105 border-cyan-300 bg-cyan-950/50'
              : 'border-cyan-500/60 bg-black/60'
          }`}
          style={{ 
            borderColor: isOverdrive ? '#ffffff' : colors.accent,
            boxShadow: `inset 0 0 25px ${colors.glow}, 0 0 30px ${colors.glow}`
          }}
        >
          {/* Inner Vibranium Core */}
          <div className="absolute inset-3 rounded-full border border-dashed border-white/40 animate-spin-reverse-slow" />
          
          <div className="text-center z-10 px-2 min-w-0">
            <span className="text-[9px] sm:text-[10px] tracking-widest text-cyan-200/80 font-mono-code uppercase block truncate">
              {isOverdrive ? 'OVERDRIVE' : isListening ? 'LISTENING' : isSpeaking ? 'ACTIVE VOCAL' : 'CORE FLUX'}
            </span>
            <div className={`text-lg sm:text-xl md:text-2xl font-orbitron font-bold tracking-wider ${colors.text} truncate`}>
              {powerOutput.toFixed(2)}
            </div>
            <span className="text-[8px] sm:text-[9px] tracking-widest font-mono-code opacity-70 block truncate">
              GW OUTPUT
            </span>
          </div>

          {/* Central Energy Singularity */}
          <div 
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white transition-transform duration-300 ${
              isSpeaking || isOverdrive ? 'scale-150 animate-ping' : 'animate-pulse'
            }`}
            style={{ boxShadow: `0 0 16px ${colors.ring}` }}
          />
        </div>

        {/* Floating Telemetry Label - Safe positioning without negative margin overflow */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-0.5 rounded text-[9px] font-mono-code text-cyan-300 border border-cyan-500/30 whitespace-nowrap z-20">
          MARK 85 // STARK CORE
        </div>
      </div>

      {/* Auxiliary Reactor Diagnostics Footprint */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 w-full max-w-sm px-2 min-w-0">
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded p-1.5 text-center min-w-0">
          <div className="text-[9px] font-mono-code text-cyan-400/80 uppercase truncate">STABILITY</div>
          <div className="text-xs sm:text-sm font-orbitron text-cyan-100 font-bold truncate">99.4%</div>
        </div>
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded p-1.5 text-center min-w-0">
          <div className="text-[9px] font-mono-code text-cyan-400/80 uppercase truncate">THERMAL</div>
          <div className="text-xs sm:text-sm font-orbitron text-cyan-100 font-bold truncate">342°C</div>
        </div>
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded p-1.5 text-center min-w-0">
          <div className="text-[9px] font-mono-code text-cyan-400/80 uppercase truncate">PLASMA FLOW</div>
          <div className="text-xs sm:text-sm font-orbitron text-cyan-100 font-bold truncate">48.2 L/M</div>
        </div>
      </div>
    </div>
  );
};
