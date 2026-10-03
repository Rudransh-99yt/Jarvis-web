import React, { useEffect, useState } from 'react';
import { HudTheme } from '../types';

interface AudioWaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
  theme: HudTheme;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isSpeaking,
  isListening,
  theme
}) => {
  const [bars, setBars] = useState<number[]>([15, 25, 40, 60, 35, 75, 45, 80, 50, 30, 70, 40, 20]);

  useEffect(() => {
    let interval: any;
    if (isSpeaking || isListening) {
      interval = setInterval(() => {
        setBars((prev) =>
          prev.map(() => {
            const base = isSpeaking ? 30 : 20;
            const variance = isSpeaking ? 70 : 50;
            return Math.floor(Math.random() * variance + base);
          })
        );
      }, 70);
    } else {
      setBars([10, 15, 20, 25, 18, 22, 16, 20, 18, 14, 12, 10, 8]);
    }
    return () => clearInterval(interval);
  }, [isSpeaking, isListening]);

  const getBarColor = (index: number) => {
    if (isListening) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
    switch (theme) {
      case 'mark85':
        return index % 2 === 0
          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
          : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]';
      case 'stealth':
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]';
      case 'violet':
        return 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.7)]';
      case 'cyan':
      default:
        return 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-xs">
      <div className="flex items-center gap-1 h-8 px-2 py-1 bg-black/40 border border-cyan-500/20 rounded">
        {bars.map((height, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${getBarColor(i)}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between w-full px-1 text-[10px] font-mono-code">
        <span className="flex items-center gap-1 text-cyan-400/80">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSpeaking
                ? 'bg-cyan-400 animate-ping'
                : isListening
                ? 'bg-red-400 animate-ping'
                : 'bg-cyan-700'
            }`}
          />
          {isSpeaking ? 'VOCAL CARRIER ACTIVE' : isListening ? 'MICROPHONE LIVE' : 'VOICE ENGINE IDLE'}
        </span>
        <span className="text-cyan-500/60">48.0 kHz 24-BIT</span>
      </div>
    </div>
  );
};
