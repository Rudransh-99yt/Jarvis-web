import React, { useState, useEffect } from 'react';
import type { EducationClass } from '../../../types/education.ts';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Flame,
  Clock,
  BookOpen,
  Layers,
  ArrowLeft,
  Volume2,
  VolumeX,
  Target
} from 'lucide-react';

interface StudentFocusWorkspaceViewProps {
  classes: EducationClass[];
  initialSubjectId?: string;
  initialTopicTitle?: string;
  onBackToHome: () => void;
  onOpenLesson?: (courseId: string, unitId: string, lessonId: string) => void;
}

export const StudentFocusWorkspaceView: React.FC<StudentFocusWorkspaceViewProps> = ({
  classes,
  initialSubjectId,
  initialTopicTitle,
  onBackToHome,
  onOpenLesson
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialSubjectId || classes[0]?.id || '');
  const [sessionGoal, setSessionGoal] = useState<string>(initialTopicTitle || 'Review ladder operators & solve commutator derivations');
  const [timerMode, setTimerMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  
  // Timer state (seconds)
  const durationMap = { focus: 25 * 60, short_break: 5 * 60, long_break: 15 * 60 };
  const [timeLeft, setTimeLeft] = useState<number>(durationMap.focus);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedCycles, setCompletedCycles] = useState<number>(2);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const selectedCourse = classes.find((c) => c.id === selectedCourseId) || classes[0];

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (timerMode === 'focus') {
        setCompletedCycles((c) => c + 1);
        setTimerMode('short_break');
        setTimeLeft(durationMap.short_break);
      } else {
        setTimerMode('focus');
        setTimeLeft(durationMap.focus);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode]);

  const handleSwitchMode = (mode: 'focus' | 'short_break' | 'long_break') => {
    setIsRunning(false);
    setTimerMode(mode);
    setTimeLeft(durationMap[mode]);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(durationMap[timerMode]);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = durationMap[timerMode];
  const progressPct = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Focus Mode</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/70">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Daily Focus Streak: <strong>3 Sessions Done</strong></span>
        </div>
      </div>

      {/* Main Focus Room Canvas */}
      <div className="p-8 rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 via-slate-950/80 to-black p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.15)] space-y-8 text-center">
        {/* Mode Selector */}
        <div className="inline-flex items-center p-1.5 rounded-xl border border-cyan-500/20 bg-black/60 font-mono text-xs gap-1">
          <button
            onClick={() => handleSwitchMode('focus')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              timerMode === 'focus'
                ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            🎯 Deep Focus (25m)
          </button>
          <button
            onClick={() => handleSwitchMode('short_break')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              timerMode === 'short_break'
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            ☕ Short Break (5m)
          </button>
          <button
            onClick={() => handleSwitchMode('long_break')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              timerMode === 'long_break'
                ? 'bg-indigo-500/20 border border-indigo-400/50 text-indigo-300 font-bold shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            🌴 Long Rest (15m)
          </button>
        </div>

        {/* Circular Progress & Clock Display */}
        <div className="relative flex items-center justify-center py-4">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-cyan-500/20 flex flex-col items-center justify-center bg-black/60 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]">
            <div
              className="absolute inset-0 rounded-full border-4 border-cyan-400 transition-all duration-1000"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${progressPct >= 25 ? '100% 0%' : '50% 0%'}, ${
                  progressPct >= 50 ? '100% 100%' : progressPct >= 25 ? '100% 100%' : '50% 0%'
                }, ${
                  progressPct >= 75 ? '0% 100%' : progressPct >= 50 ? '0% 100%' : '50% 0%'
                }, ${progressPct >= 100 ? '0% 0%' : '50% 0%'})`
              }}
            />
            
            <div className="text-5xl sm:text-6xl font-bold font-mono text-white tracking-widest drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              {timeFormatted}
            </div>
            <div className="text-xs font-mono text-cyan-400/60 uppercase mt-2">
              {timerMode === 'focus' ? 'Session In Progress' : 'Recharge Break'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-8 py-3.5 rounded-2xl font-mono font-bold text-sm tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              isRunning
                ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-cyan-500/30 border border-cyan-400 text-cyan-100 hover:bg-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{isRunning ? 'PAUSE SESSION' : 'START FOCUS'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl border border-cyan-500/20 bg-black/40 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-200 transition-all cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Focus Target & Subject Linking */}
        <div className="max-w-md mx-auto p-4 rounded-xl border border-cyan-500/20 bg-black/40 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <Target className="w-3.5 h-3.5 text-cyan-300" /> Focus Objective
            </span>
            <span>{selectedCourse?.code}</span>
          </div>

          <div className="space-y-2">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-slate-950 text-white">
                  {cls.code}: {cls.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={sessionGoal}
              onChange={(e) => setSessionGoal(e.target.value)}
              placeholder="What are you mastering in this session?"
              className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
