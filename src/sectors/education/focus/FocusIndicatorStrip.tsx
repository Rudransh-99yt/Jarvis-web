import React, { useState, useEffect } from 'react';
import type { FocusSession } from '../../../types/focus.ts';
import { Lock, Timer, ArrowRight, Pause, Play } from 'lucide-react';

interface FocusIndicatorStripProps {
  activeSession: FocusSession | null;
  onOpenFocusWorkspace: () => void;
}

export const FocusIndicatorStrip: React.FC<FocusIndicatorStripProps> = ({
  activeSession,
  onOpenFocusWorkspace
}) => {
  const [remainingTime, setRemainingTime] = useState<string>('--:--');

  useEffect(() => {
    if (!activeSession) return;

    const updateClock = () => {
      if (activeSession.status === 'ACTIVE' && activeSession.expiresAt) {
        const now = Date.now();
        const expires = new Date(activeSession.expiresAt).getTime();
        const remainingSeconds = Math.max(0, Math.floor((expires - now) / 1000));
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        setRemainingTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else if (activeSession.status === 'PAUSED') {
        const remainingSeconds = Math.max(
          0,
          activeSession.plannedDurationMinutes * 60 - (activeSession.accumulatedElapsedSeconds || 0)
        );
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        setRemainingTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} (PAUSED)`);
      } else if (activeSession.status === 'BREAK') {
        setRemainingTime('BREAK');
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeSession || (activeSession.status !== 'ACTIVE' && activeSession.status !== 'PAUSED' && activeSession.status !== 'BREAK')) {
    return null;
  }

  const isLocked = activeSession.mode === 'STUDY_LOCK' || activeSession.mode === 'EXAM_LOCK';

  return (
    <div
      onClick={onOpenFocusWorkspace}
      className={`px-3 py-1 rounded-full border flex items-center gap-2 cursor-pointer transition-all shadow-md text-xs font-mono select-none ${
        isLocked
          ? 'bg-amber-950/80 border-amber-500/50 text-amber-200 hover:bg-amber-900/80'
          : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200 hover:bg-cyan-900/80'
      }`}
    >
      <span className="flex h-2 w-2 relative">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            activeSession.status === 'ACTIVE'
              ? 'bg-emerald-400'
              : activeSession.status === 'BREAK'
              ? 'bg-amber-400'
              : 'bg-cyan-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            activeSession.status === 'ACTIVE'
              ? 'bg-emerald-500'
              : activeSession.status === 'BREAK'
              ? 'bg-amber-500'
              : 'bg-cyan-500'
          }`}
        />
      </span>

      {isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Timer className="w-3 h-3 text-cyan-400" />}

      <span className="font-bold truncate max-w-[130px] sm:max-w-[200px]">
        {activeSession.target.title}
      </span>

      <span className="px-1.5 py-0.2 rounded bg-black/60 font-mono text-[10px] text-white">
        {remainingTime}
      </span>
    </div>
  );
};
