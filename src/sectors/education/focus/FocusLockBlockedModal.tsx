import React, { useState, useEffect, useRef } from 'react';
import type { FocusSession } from '../../../types/focus.ts';
import { Lock, ShieldAlert, ArrowLeft, Unlock, AlertCircle } from 'lucide-react';

interface FocusLockBlockedModalProps {
  isOpen: boolean;
  blockedRoute: string;
  reason?: string;
  activeSession: FocusSession | null;
  onReturnToFocus: () => void;
  onEmergencyExit: (reason: string) => Promise<void>;
}

export const FocusLockBlockedModal: React.FC<FocusLockBlockedModalProps> = ({
  isOpen,
  blockedRoute,
  reason,
  activeSession,
  onReturnToFocus,
  onEmergencyExit
}) => {
  const [isConfirmingExit, setIsConfirmingExit] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingExit(false);
      setCountdown(0);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEmergencyExit = () => {
    const exitSeconds = activeSession?.policy.exitCountdownSeconds || 5;
    setCountdown(exitSeconds);
    setIsConfirmingExit(true);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono text-cyan-100 animate-fade-in">
      <div className="w-full max-w-md bg-slate-950 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-amber-500/20 pb-3">
          <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              ACCESS BLOCKED DURING FOCUS LOCK
            </h2>
            <p className="text-[10px] text-amber-400/70">
              {activeSession?.mode.replace('_', ' ')} · {activeSession?.target.title}
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-cyan-500/15 text-xs space-y-2 text-cyan-200">
          <p className="leading-relaxed">
            {reason || `Navigation to ${blockedRoute.toUpperCase()} is restricted during this active Study Lock session.`}
          </p>
          <div className="text-[10px] text-cyan-400/60 pt-1 border-t border-cyan-500/10">
            Jarvis Education OS is keeping you focused on your target objective.
          </div>
        </div>

        {/* Escape / Return Actions */}
        {!isConfirmingExit ? (
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
            <button
              onClick={handleStartEmergencyExit}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/40 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Emergency Exit</span>
            </button>

            <button
              onClick={onReturnToFocus}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-600/30 border border-cyan-400/50 hover:border-cyan-300 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Focus</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {countdown > 0 ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-center space-y-1">
                <div className="text-3xl font-extrabold text-rose-300">{countdown}</div>
                <div className="text-[10px] text-rose-400/70 uppercase">
                  Seconds until emergency override is active
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  onClick={onReturnToFocus}
                  className="px-4 py-2 rounded-lg text-cyan-400/70 hover:text-white text-xs"
                >
                  Stay in Focus
                </button>
                <button
                  onClick={() => onEmergencyExit('User triggered emergency override')}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                >
                  Confirm Emergency Exit
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
