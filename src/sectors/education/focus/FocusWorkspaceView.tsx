import React, { useState, useEffect, useRef } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import type {
  FocusSession,
  FocusMode,
  FocusTarget,
  FocusStatistics,
  FocusTask
} from '../../../types/focus.ts';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Layers,
  FileText,
  Video,
  ListTodo,
  TrendingUp,
  BarChart3,
  Calendar,
  Flame,
  ArrowRight,
  ChevronDown,
  X,
  ExternalLink
} from 'lucide-react';

interface FocusWorkspaceViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  initialSession?: FocusSession | null;
  onNavigateTab: (tab: string, meta?: any) => void;
  onOpenLesson?: (courseId: string, unitId: string, lessonId: string) => void;
  onSessionStateChange?: (session: FocusSession | null) => void;
}

export const FocusWorkspaceView: React.FC<FocusWorkspaceViewProps> = ({
  classes,
  currentRole,
  initialSession,
  onNavigateTab,
  onOpenLesson,
  onSessionStateChange
}) => {
  // Active Focus Session State
  const [session, setSession] = useState<FocusSession | null>(initialSession || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Focus Configuration for New Session
  const [selectedMode, setSelectedMode] = useState<FocusMode>('STUDY_LOCK');
  const [plannedDuration, setPlannedDuration] = useState<number>(45);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(classes[0]?.id || 'class-phys-301');
  const [targetTitle, setTargetTitle] = useState<string>('Electrostatics & Gauss Law');
  const [targetType, setTargetType] = useState<FocusTarget['type']>('chapter');

  // Scratchpad & Checklist
  const [scratchpadText, setScratchpadText] = useState<string>('');
  const [newTaskInput, setNewTaskInput] = useState<string>('');

  // Analytics & History
  const [stats, setStats] = useState<FocusStatistics | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // Timer Tick State (Derived smoothly from server timestamps to prevent drift)
  const [displaySecondsLeft, setDisplaySecondsLeft] = useState<number>(45 * 60);

  // Emergency Escape State
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [exitCountdown, setExitCountdown] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser = {
    id: currentRole === 'student' ? 'student-1' : 'teacher-1',
    displayName: currentRole === 'student' ? 'Alex Mercer' : 'Dr. Helen Cho',
    role: currentRole
  };

  const selectedCourse = classes.find((c) => c.id === selectedCourseId) || classes[0];

  // 1. Hydrate Active Session & Statistics on Load
  const fetchActiveSession = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/education/focus/active', {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        if (data.session) {
          setScratchpadText(data.session.scratchpadNotes || '');
          setSelectedMode(data.session.mode);
          setPlannedDuration(data.session.plannedDurationMinutes);
          onSessionStateChange?.(data.session);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch active focus session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/education/focus/statistics', {
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.statistics);
      }
    } catch (err) {
      console.warn('Failed to fetch focus statistics:', err);
    }
  };

  useEffect(() => {
    fetchActiveSession();
    fetchStats();
  }, [currentUser.id]);

  // 2. High-Precision Timer Engine (Timestamp authoritative, no drift)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (session && (session.status === 'ACTIVE' || session.status === 'BREAK') && session.expiresAt) {
      const updateClock = () => {
        const now = Date.now();
        const expires = new Date(session.expiresAt!).getTime();
        const remaining = Math.max(0, Math.floor((expires - now) / 1000));
        setDisplaySecondsLeft(remaining);

        if (remaining <= 0) {
          // Re-fetch server session to catch transition
          fetchActiveSession();
          fetchStats();
        }
      };

      updateClock();
      timerRef.current = setInterval(updateClock, 1000);
    } else if (session && session.status === 'PAUSED') {
      const remainingSeconds = Math.max(0, (session.plannedDurationMinutes * 60) - (session.accumulatedElapsedSeconds || 0));
      setDisplaySecondsLeft(remainingSeconds);
    } else if (session && session.status === 'READY') {
      setDisplaySecondsLeft(session.plannedDurationMinutes * 60);
    } else {
      setDisplaySecondsLeft(plannedDuration * 60);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, plannedDuration]);

  // 3. Create or Start Focus Session
  const handleCreateAndStartSession = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const target: FocusTarget = {
        type: targetType,
        id: selectedCourseId,
        title: targetTitle || 'Electrostatics & Gauss Law',
        courseId: selectedCourseId,
        courseCode: selectedCourse?.code || 'PHYS-301',
        context: `${selectedCourse?.name || 'Physics'} · Focus Block`
      };

      // 1. Create session
      const createRes = await fetch('/api/education/focus/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          mode: selectedMode,
          target,
          plannedDurationMinutes: plannedDuration,
          scratchpadNotes: scratchpadText,
          allowedResources: [
            { type: 'class_session', id: 'session-phys-101', title: 'ClassSession #101: Electrostatics' },
            { type: 'assignment', id: 'asg-1', title: 'Homework Problem Set #1: Electrostatics' }
          ]
        })
      });

      if (!createRes.ok) throw new Error('Failed to create focus session');
      const createData = await createRes.json();
      const newSession = createData.session;

      // 2. Start session immediately
      const startRes = await fetch(`/api/education/focus/sessions/${newSession.id}/start`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });

      if (!startRes.ok) throw new Error('Failed to start session timer');
      const startData = await startRes.json();

      setSession(startData.session);
      onSessionStateChange?.(startData.session);
      setStatusNotice(`Focus Session Active: ${selectedMode.replace('_', ' ')} (${plannedDuration}m)`);
      setTimeout(() => setStatusNotice(null), 4000);
      fetchStats();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate focus session');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Pause Session
  const handlePauseSession = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/education/focus/sessions/${session.id}/pause`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        onSessionStateChange?.(data.session);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Pause failed');
    }
  };

  // 5. Resume Session
  const handleResumeSession = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/education/focus/sessions/${session.id}/resume`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        onSessionStateChange?.(data.session);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Resume failed');
    }
  };

  // 6. Break Controls
  const handleStartBreak = async (breakType: 'short' | 'long') => {
    if (!session) return;
    try {
      const res = await fetch(`/api/education/focus/sessions/${session.id}/break`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ breakType })
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        onSessionStateChange?.(data.session);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Break failed');
    }
  };

  const handleSkipBreak = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/education/focus/sessions/${session.id}/skip-break`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        onSessionStateChange?.(data.session);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Skip break failed');
    }
  };

  // 7. Complete Session
  const handleCompleteSession = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/education/focus/sessions/${session.id}/complete`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
      });
      if (res.ok) {
        const data = await res.json();
        setSession(null);
        onSessionStateChange?.(null);
        setStatusNotice('Focus session completed successfully! Great work cadet.');
        fetchStats();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Complete failed');
    }
  };

  // 8. Emergency Exit Handler
  const handleInitiateEmergencyExit = () => {
    if (!session) return;
    if (session.policy.exitPolicy === 'normal') {
      executeExit('Normal exit');
    } else {
      const countdown = session.policy.exitCountdownSeconds || 5;
      setExitCountdown(countdown);
      setShowExitModal(true);

      if (exitTimerRef.current) clearInterval(exitTimerRef.current);
      exitTimerRef.current = setInterval(() => {
        setExitCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(exitTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const executeExit = async (reason: string) => {
    if (!session) return;
    try {
      await fetch(`/api/education/focus/sessions/${session.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ reason })
      });
      setSession(null);
      setShowExitModal(false);
      onSessionStateChange?.(null);
      setStatusNotice('Focus Lock unlocked.');
      fetchStats();
    } catch (err: any) {
      setErrorMessage(err.message || 'Exit failed');
    }
  };

  // 9. Sync Notes & Tasks
  const handleSaveNotes = async (text: string) => {
    setScratchpadText(text);
    if (!session) return;
    try {
      await fetch(`/api/education/focus/sessions/${session.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ notes: text })
      });
    } catch (err) {
      console.warn('Note autosave error:', err);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!session) return;
    const updatedTasks = session.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setSession({ ...session, tasks: updatedTasks });
    try {
      await fetch(`/api/education/focus/sessions/${session.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ tasks: updatedTasks })
      });
    } catch (err) {
      console.warn('Task update error:', err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim() || !session) return;
    const newTask: FocusTask = {
      id: `task-${Date.now()}`,
      text: newTaskInput.trim(),
      completed: false
    };
    const updatedTasks = [...session.tasks, newTask];
    setSession({ ...session, tasks: updatedTasks });
    setNewTaskInput('');
    try {
      await fetch(`/api/education/focus/sessions/${session.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ tasks: updatedTasks })
      });
    } catch (err) {
      console.warn('Task add error:', err);
    }
  };

  // Format Helper: Seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const isActive = session?.status === 'ACTIVE';
  const isPaused = session?.status === 'PAUSED';
  const isBreak = session?.status === 'BREAK';
  const isLocked = session?.mode === 'STUDY_LOCK' || session?.mode === 'EXAM_LOCK';

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-mono text-cyan-100">
      {/* Top Status & Notice Banner */}
      {statusNotice && (
        <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/60 text-rose-200 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Focus Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Dominant Timer & Active Focus Canvas */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Focus Card */}
          <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-slate-950 via-[#070d18] to-black p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
            {/* Ambient Pulse Glow when active */}
            {isActive && (
              <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
            )}

            {/* Top Bar: Mode & Target */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/15 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isLocked
                        ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
                        : 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    {isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Timer className="w-3 h-3" />}
                    <span>{session ? session.mode.replace('_', ' ') : selectedMode.replace('_', ' ')}</span>
                  </span>

                  {session && (
                    <span className="text-[10px] text-cyan-400/60 uppercase">
                      Cycle {session.currentCycle} of {session.totalCycles}
                    </span>
                  )}
                </div>

                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {session ? session.target.title : targetTitle}
                </h1>
              </div>

              {/* Analytics Button */}
              <button
                onClick={() => setShowStatsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-black/40 hover:bg-cyan-500/10 text-cyan-300 text-xs transition-all cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{stats?.streakDays || 1} Day Streak</span>
              </button>
            </div>

            {/* Dominant Minimalist Timer Display */}
            <div className="text-center py-6 sm:py-10 space-y-3">
              <div className="text-6xl sm:text-8xl font-extrabold tracking-tighter text-white drop-shadow-[0_0_25px_rgba(6,182,212,0.2)] font-mono">
                {formatTime(displaySecondsLeft)}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-400 animate-pulse'
                      : isBreak
                      ? 'bg-amber-400'
                      : isPaused
                      ? 'bg-cyan-400'
                      : 'bg-slate-600'
                  }`}
                />
                <span className="font-bold text-cyan-300 uppercase tracking-wider">
                  {isBreak
                    ? `${session?.breakType === 'long' ? 'Long Break' : 'Short Break'} Active`
                    : isActive
                    ? 'Deep Focus Active'
                    : isPaused
                    ? 'Session Paused'
                    : 'Session Ready'}
                </span>
              </div>
            </div>

            {/* Session Action Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {!session && (
                <button
                  onClick={handleCreateAndStartSession}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/30 via-blue-600/30 to-cyan-500/30 border border-cyan-400/60 hover:border-cyan-300 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 text-cyan-300" />
                  <span>START FOCUS SESSION</span>
                </button>
              )}

              {isActive && (
                <button
                  onClick={handlePauseSession}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 hover:bg-amber-500/30 text-amber-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>PAUSE</span>
                </button>
              )}

              {isPaused && (
                <button
                  onClick={handleResumeSession}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>RESUME</span>
                </button>
              )}

              {isActive && (
                <button
                  onClick={() => handleStartBreak('short')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>5M BREAK</span>
                </button>
              )}

              {isBreak && (
                <button
                  onClick={handleSkipBreak}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>SKIP BREAK & RESUME</span>
                </button>
              )}

              {session && (
                <button
                  onClick={handleCompleteSession}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>COMPLETE</span>
                </button>
              )}

              {session && (
                <button
                  onClick={handleInitiateEmergencyExit}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 hover:bg-rose-900/40 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>UNLOCK / EXIT</span>
                </button>
              )}
            </div>

            {/* Quick Access to Target Study Materials */}
            {session && session.allowedResources.length > 0 && (
              <div className="pt-4 border-t border-cyan-500/15 space-y-2">
                <div className="text-[10px] uppercase font-bold text-cyan-400/60 tracking-wider">
                  Target Study Resources (Accessible during lock)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {session.allowedResources.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        if (res.type === 'class_session') {
                          onNavigateTab('teacher_prep');
                        } else if (res.type === 'assignment') {
                          onNavigateTab('assignments');
                        }
                      }}
                      className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/20 hover:border-cyan-400 cursor-pointer flex items-center justify-between text-xs transition-all"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <BookOpen className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                        <span className="truncate text-white font-medium">{res.title}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-cyan-400/60 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Focus Scratchpad & Synced Notes */}
          <div className="rounded-2xl border border-cyan-500/20 bg-black/60 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Focus Scratchpad (Auto-syncs to My Workspace)
                </h3>
              </div>
              <span className="text-[10px] text-cyan-400/50">Markdown supported</span>
            </div>

            <textarea
              rows={4}
              value={scratchpadText}
              onChange={(e) => handleSaveNotes(e.target.value)}
              placeholder="Jot key derivations, formula reminders, and focus insights..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-cyan-500/20 text-cyan-100 placeholder:text-cyan-500/30 focus:outline-none focus:border-cyan-400 leading-relaxed font-mono"
            />
          </div>
        </div>

        {/* Right Column (4 cols): Configuration, Tasks & Security Policy */}
        <div className="lg:col-span-4 space-y-6">
          {/* If No Active Session: Config Builder */}
          {!session ? (
            <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-5 shadow-xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2">
                <span className="font-bold text-white uppercase tracking-wider">Session Settings</span>
                <span className="text-[10px] text-cyan-400/60">Config</span>
              </div>

              {/* Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-cyan-300 text-[11px] block font-bold">FOCUS MODE</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['POMODORO', 'DEEP_FOCUS', 'STUDY_LOCK', 'EXAM_LOCK'] as FocusMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedMode(mode)}
                      className={`p-2 rounded-lg text-left text-[10px] font-bold uppercase transition-all ${
                        selectedMode === mode
                          ? 'bg-cyan-500/30 border border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'bg-black/40 border border-cyan-500/20 text-cyan-400/60 hover:text-cyan-200'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Presets */}
              <div className="space-y-1.5">
                <label className="text-cyan-300 text-[11px] block font-bold">DURATION</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 25, 45, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setPlannedDuration(mins)}
                      className={`py-1.5 rounded-lg text-center font-bold text-[11px] transition-all ${
                        plannedDuration === mins
                          ? 'bg-cyan-500/30 border border-cyan-400 text-white'
                          : 'bg-black/40 border border-cyan-500/20 text-cyan-400/60 hover:text-cyan-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Subject Selector */}
              <div className="space-y-1.5">
                <label className="text-cyan-300 text-[11px] block font-bold">TARGET COURSE</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-cyan-500/30 text-white text-xs"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Topic Input */}
              <div className="space-y-1.5">
                <label className="text-cyan-300 text-[11px] block font-bold">STUDY TOPIC / GOAL</label>
                <input
                  type="text"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  placeholder="e.g. Gauss Cylindrical Flux & Dipole Potentials"
                  className="w-full px-3 py-2 rounded-lg bg-black/50 border border-cyan-500/30 text-white text-xs"
                />
              </div>

              {/* Policy Preview Card */}
              <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/15 space-y-1 text-[11px]">
                <div className="font-bold text-cyan-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Enforced Policy Rules</span>
                </div>
                <p className="text-cyan-400/70 text-[10px]">
                  {selectedMode === 'STUDY_LOCK'
                    ? 'Navigation is strictly confined to selected course materials, workspace notes, and RAG search. Community is locked.'
                    : selectedMode === 'EXAM_LOCK'
                    ? 'Only the assigned test sheet is accessible. Unrelated workspace pages & community disabled.'
                    : 'Standard cycle timers with open application navigation.'}
                </p>
              </div>
            </div>
          ) : (
            /* Active Checklist & Goal Tasks */
            <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-5 shadow-xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white uppercase tracking-wider">Focus Tasks</span>
                </div>
                <span className="text-[10px] text-cyan-400/60">
                  {session.tasks.filter((t) => t.completed).length}/{session.tasks.length} Done
                </span>
              </div>

              {/* Checklist Stream */}
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                {session.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      task.completed
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 line-through'
                        : 'bg-black/40 border-cyan-500/20 text-cyan-100 hover:border-cyan-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-cyan-500/40 text-cyan-500"
                    />
                    <span className="text-xs">{task.text}</span>
                  </div>
                ))}
              </div>

              {/* Add Task Input */}
              <form onSubmit={handleAddTask} className="flex items-center gap-2 pt-2 border-t border-cyan-500/15">
                <input
                  type="text"
                  placeholder="Add focus objective..."
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder:text-cyan-500/40 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!newTaskInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold disabled:opacity-40"
                >
                  Add
                </button>
              </form>
            </div>
          )}

          {/* Analytics Snapshot Card */}
          <div className="rounded-2xl border border-cyan-500/20 bg-black/50 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300 uppercase">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Weekly Productivity</span>
              </div>
              <span className="text-emerald-400">{stats?.weeklyFocusMinutes || 135} mins</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/15">
                <div className="text-lg font-bold text-white">{stats?.completedSessionsCount || 1}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase">Completed</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/15">
                <div className="text-lg font-bold text-white">{stats?.totalCyclesCompleted || 3}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase">Cycles</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Escape Countdown Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>EMERGENCY FOCUS UNLOCK</span>
            </div>

            <p className="text-cyan-200 leading-relaxed">
              You are currently locked into <strong>{session?.mode.replace('_', ' ')}</strong>. Unlocking early will record an interruption event in your academic focus audit log.
            </p>

            {exitCountdown > 0 ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-center space-y-1">
                <div className="text-3xl font-extrabold text-rose-300">{exitCountdown}</div>
                <div className="text-[10px] text-rose-400/70 uppercase">Seconds until safety unlock</div>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 rounded-lg text-cyan-400/70 hover:text-white"
                >
                  Stay in Focus
                </button>
                <button
                  type="button"
                  onClick={() => executeExit('Student confirmed emergency unlock')}
                  className="px-4 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-bold"
                >
                  Confirm Unlock & Exit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Statistics Modal */}
      {showStatsModal && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-950 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">Focus Analytics & Productivity OS</span>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="text-cyan-400/60 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20">
                <div className="text-xl font-bold text-white">{Math.round(stats.totalFocusSeconds / 60)}m</div>
                <div className="text-[10px] text-cyan-400/60 uppercase">Total Focus</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20">
                <div className="text-xl font-bold text-white">{stats.streakDays} Days</div>
                <div className="text-[10px] text-cyan-400/60 uppercase">Current Streak</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/20">
                <div className="text-xl font-bold text-white">{stats.completedSessionsCount}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase">Sessions</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-cyan-200 uppercase text-[11px]">Subject Breakdown</div>
              <div className="space-y-1.5">
                {Object.entries(stats.subjectBreakdown).map(([subj, mins]) => (
                  <div key={subj} className="flex justify-between items-center p-2 rounded bg-black/40 border border-cyan-500/10">
                    <span className="text-white font-medium">{subj}</span>
                    <span className="text-cyan-300 font-bold">{mins} mins</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
