import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Shield, Radio, Sparkles, RefreshCw } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { speechService } from '../services/speechService';
import { HudTheme } from '../types';

interface HeaderNavProps {
  theme: HudTheme;
  setTheme: (theme: HudTheme) => void;
  onRunScan: () => void;
  isScanning: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  theme,
  setTheme,
  onRunScan,
  isScanning
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    soundEffects.enabled = next;
    setSoundEnabled(next);
    if (next) soundEffects.playClick();
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    speechService.voiceEnabled = next;
    setVoiceEnabled(next);
    soundEffects.playClick();
  };

  const themeList: { key: HudTheme; label: string; dotClass: string }[] = [
    { key: 'cyan', label: 'STARK CLASSIC', dotClass: 'bg-cyan-400 border-cyan-200' },
    { key: 'mark85', label: 'MARK 85', dotClass: 'bg-red-500 border-amber-400' },
    { key: 'stealth', label: 'STEALTH', dotClass: 'bg-emerald-400 border-emerald-200' },
    { key: 'violet', label: 'COSMIC', dotClass: 'bg-purple-400 border-purple-200' }
  ];

  return (
    <header className="border-b border-cyan-500/20 bg-black/70 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code z-30 select-none">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/30">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
          <div className="absolute inset-0 border border-cyan-300/30 rounded rotate-45" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-orbitron font-bold text-base tracking-wider text-white">
              J.A.R.V.I.S.
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              v4.2 PRO
            </span>
          </div>
          <span className="text-[10px] text-cyan-400/70 tracking-widest block">
            STARK INDUSTRIES NEURAL INTERFACE
          </span>
        </div>
      </div>

      {/* Center Status & Realtime Clock */}
      <div className="hidden lg:flex items-center gap-6 text-center">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/20 text-cyan-300">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] tracking-wider">CLEARANCE: LEVEL 7 (DIRECTOR)</span>
        </div>
        <div>
          <div className="font-orbitron font-bold text-sm text-cyan-100 tracking-wider">
            {time}
          </div>
          <div className="text-[9px] text-cyan-400/60 tracking-widest">{date} // MALIBU UPLINK</div>
        </div>
      </div>

      {/* Control Actions & Theme Select */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Diagnostic Scan Button */}
        <button
          onClick={() => {
            soundEffects.playScan();
            onRunScan();
          }}
          disabled={isScanning}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
            isScanning
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'SCANNING...' : 'DIAGNOSTIC'}</span>
        </button>

        {/* Audio FX Mute/Unmute */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Interface Sound Effects' : 'Enable Sound Effects'}
          className={`p-1.5 rounded border transition-colors ${
            soundEnabled
              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
              : 'bg-red-950/30 border-red-500/30 text-red-400'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* HUD Theme Palette */}
        <div className="flex items-center gap-1 bg-black/60 border border-cyan-500/20 rounded p-1">
          {themeList.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                soundEffects.playClick();
                setTheme(t.key);
              }}
              title={t.label}
              className={`w-4 h-4 rounded-full border transition-all ${t.dotClass} ${
                theme === t.key ? 'scale-125 ring-2 ring-white/50' : 'opacity-60 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </div>
    </header>
  );
};
