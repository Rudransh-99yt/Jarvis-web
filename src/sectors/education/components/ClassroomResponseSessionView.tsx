import React, { useState, useEffect, useCallback } from 'react';
import type { EducationClass } from '../../../types/education.ts';
import type {
  ClassroomResponseSession,
  ClassroomResponseSessionType,
  ClassroomResponseSessionSummary
} from '../../../types/classroomResponse.ts';
import { authClient } from '../../../services/authClient.ts';
import {
  Radio,
  Play,
  Pause,
  CheckCircle2,
  Users,
  Activity,
  PlusCircle,
  HelpCircle,
  BarChart3,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { GlassCard, Button, Badge } from '../../../components/ui/index.ts';

interface ClassroomResponseSessionViewProps {
  course: EducationClass;
  onClose?: () => void;
}

export const ClassroomResponseSessionView: React.FC<ClassroomResponseSessionViewProps> = ({
  course
}) => {
  const [sessions, setSessions] = useState<ClassroomResponseSession[]>([]);
  const [activeSession, setActiveSession] = useState<ClassroomResponseSession | null>(null);
  const [summary, setSummary] = useState<ClassroomResponseSessionSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New session modal / form state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<ClassroomResponseSessionType>('QUIZ');
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [quizQuestionPrompt, setQuizQuestionPrompt] = useState<string>('What is the core principle of conservation of energy?');
  const [quizOptions, setQuizOptions] = useState<string>('A) Energy cannot be created or destroyed\nB) Energy diminishes over time\nC) Kinetic equals potential always\nD) Mass is constant');
  const [quizCorrectAnswer, setQuizCorrectAnswer] = useState<string>('A');

  // Simulated software response state
  const [simulatedValue, setSimulatedValue] = useState<string>('');

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/education/classroom/sessions?classId=${course.id}`, {
        headers: authClient.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        // If we have an active session in local state, refresh it
        if (activeSession) {
          const fresh = (data.sessions || []).find((s: ClassroomResponseSession) => s.id === activeSession.id);
          if (fresh) setActiveSession(fresh);
        } else if (data.sessions && data.sessions.length > 0) {
          // Select latest active or first
          const live = data.sessions.find((s: ClassroomResponseSession) => s.state === 'ACTIVE') || data.sessions[0];
          setActiveSession(live);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to load sessions');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [course.id, activeSession?.id]);

  const fetchSummary = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/education/classroom/sessions/${sessionId}/summary`, {
        headers: authClient.getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (activeSession) {
      fetchSummary(activeSession.id);
      const interval = setInterval(() => {
        fetchSummary(activeSession.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeSession?.id, fetchSummary]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const questionsPayload = selectedType === 'QUIZ' ? [
        {
          questionId: `q-${Date.now().toString(36)}`,
          prompt: quizQuestionPrompt || 'General Knowledge Check',
          questionType: 'single_choice' as const,
          options: quizOptions.split('\n').map((s) => s.trim()).filter(Boolean),
          correctAnswer: quizCorrectAnswer.trim(),
          concept: course.name,
          subject: 'Physics',
          topic: 'Fundamental Concepts'
        }
      ] : undefined;

      const res = await fetch('/api/education/classroom/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          classId: course.id,
          workspaceId: 'ws-stark-core',
          sessionType: selectedType,
          title: sessionTitle.trim() || `${course.code || 'Course'} Live ${selectedType}`,
          questions: questionsPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsCreating(false);
        setSessionTitle('');
        setActiveSession(data.session);
        showToast(`Created ${selectedType} response session successfully.`);
        await fetchSessions();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to create session');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!activeSession) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/education/classroom/sessions/${activeSession.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        showToast('Session is now ACTIVE.');
        await fetchSummary(activeSession.id);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to activate session');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Action error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/education/classroom/sessions/${activeSession.id}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        showToast('Session PAUSED.');
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to pause session');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Action error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!activeSession) return;
    if (!confirm('Conclude this session? Further responses will be locked.')) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/education/classroom/sessions/${activeSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        showToast('Session COMPLETED.');
        await fetchSummary(activeSession.id);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to complete session');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Action error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSimulateResponse = async (val: string, participantId?: string) => {
    if (!activeSession) return;
    setIsActionLoading(true);
    try {
      const targetParticipantId = participantId || Object.keys(activeSession.participants)[0] || 'part-student-1';
      const res = await fetch(`/api/education/classroom/sessions/${activeSession.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          participantId: targetParticipantId,
          questionId: activeSession.activeQuestionId,
          responseValue: val,
          source: 'software-simulation'
        })
      });
      if (res.ok) {
        showToast(`Response '${val}' received for ${targetParticipantId}!`);
        await fetchSummary(activeSession.id);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to send response');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getSessionTypeBadge = (type: ClassroomResponseSessionType) => {
    switch (type) {
      case 'QUIZ':
        return <Badge variant="cyan" size="sm">QUIZ</Badge>;
      case 'ATTENDANCE':
        return <Badge variant="success" size="sm">ATTENDANCE</Badge>;
      case 'POLL':
        return <Badge variant="purple" size="sm">POLL</Badge>;
      case 'QUICK_CHECK':
        return <Badge variant="warning" size="sm">QUICK CHECK</Badge>;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'ACTIVE':
        return <Badge variant="success" size="sm" dot>ACTIVE</Badge>;
      case 'PAUSED':
        return <Badge variant="warning" size="sm">PAUSED</Badge>;
      case 'COMPLETED':
        return <Badge variant="neutral" size="sm">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" size="sm">CANCELLED</Badge>;
      default:
        return <Badge variant="cyan" size="sm">CREATED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">Classroom Response Sessions (Phase 6.5)</h2>
            <p className="text-xs text-slate-400">Provider-neutral session hub for software & future remote devices.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="glass"
            onClick={fetchSessions}
            disabled={isLoading || isActionLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreating(true)}
            icon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            New Session
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Create Session Form Drawer */}
      {isCreating && (
        <GlassCard className="p-5 border-cyan-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Configure New Response Session
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Session Title</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder={`${course.code || 'PHYS-301'} Active Session`}
                  className="w-full px-3 py-2 text-xs bg-slate-900/60 border border-white/15 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Session Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['QUIZ', 'ATTENDANCE', 'POLL', 'QUICK_CHECK'] as ClassroomResponseSessionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedType === t
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-white/10 bg-slate-900/40 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedType === 'QUIZ' && (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-900/40 border border-white/10">
                <span className="text-xs font-semibold text-cyan-300 block">Quiz Question Setup</span>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Question Prompt</label>
                  <input
                    type="text"
                    value={quizQuestionPrompt}
                    onChange={(e) => setQuizQuestionPrompt(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-white/10 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Options (One per line)</label>
                  <textarea
                    rows={3}
                    value={quizOptions}
                    onChange={(e) => setQuizOptions(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-white/10 rounded text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Correct Answer (Option Key e.g. 'A')</label>
                  <input
                    type="text"
                    value={quizCorrectAnswer}
                    onChange={(e) => setQuizCorrectAnswer(e.target.value)}
                    className="w-32 px-2.5 py-1.5 text-xs bg-slate-900 border border-white/10 rounded text-white font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="glass" size="sm" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isActionLoading}>
                {isActionLoading ? 'Creating...' : 'Create Session'}
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Sessions List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Course Sessions ({sessions.length})
          </h3>
          {sessions.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-white/10 bg-slate-900/30 text-xs text-slate-400">
              No response sessions yet. Click "New Session" to start.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSession(s)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    activeSession?.id === s.id
                      ? 'border-cyan-500/60 bg-cyan-950/30 shadow-lg shadow-cyan-950/20'
                      : 'border-white/10 bg-slate-900/30 hover:border-white/20 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-white truncate">{s.title}</span>
                    {getStateBadge(s.state)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      {getSessionTypeBadge(s.sessionType)}
                      <span>{Object.keys(s.participants).length} participants</span>
                    </div>
                    <span>{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Session Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {activeSession ? (
            <>
              {/* Session Control Header */}
              <GlassCard className="p-5 border-white/15 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white">{activeSession.title}</h3>
                      {getStateBadge(activeSession.state)}
                      {getSessionTypeBadge(activeSession.sessionType)}
                    </div>
                    <p className="text-xs text-slate-400">
                      ID: <span className="font-mono text-cyan-300">{activeSession.id}</span> • Created {new Date(activeSession.createdAt).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Lifecycle Controls */}
                  <div className="flex items-center gap-2">
                    {activeSession.state === 'CREATED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleActivate}
                        disabled={isActionLoading}
                        icon={<Play className="w-3.5 h-3.5" />}
                      >
                        Activate
                      </Button>
                    )}
                    {activeSession.state === 'ACTIVE' && (
                      <>
                        <Button
                          size="sm"
                          variant="glass"
                          onClick={handlePause}
                          disabled={isActionLoading}
                          icon={<Pause className="w-3.5 h-3.5" />}
                        >
                          Pause
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={handleComplete}
                          disabled={isActionLoading}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Complete
                        </Button>
                      </>
                    )}
                    {activeSession.state === 'PAUSED' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleActivate}
                          disabled={isActionLoading}
                          icon={<Play className="w-3.5 h-3.5" />}
                        >
                          Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={handleComplete}
                          disabled={isActionLoading}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Aggregation Metrics Strip */}
                {summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-white/10">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                        <Users className="w-3 h-3 text-cyan-400" />
                        Roster Enrolled
                      </div>
                      <div className="text-lg font-bold text-white font-mono">
                        {summary.totalParticipants}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-white/10">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        Responses
                      </div>
                      <div className="text-lg font-bold text-emerald-400 font-mono">
                        {summary.totalEventsReceived}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-white/10">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                        <BarChart3 className="w-3 h-3 text-purple-400" />
                        Unique Students
                      </div>
                      <div className="text-lg font-bold text-purple-400 font-mono">
                        {summary.uniqueRespondents}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-white/10">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1">
                        <CheckSquare className="w-3 h-3 text-amber-400" />
                        Rate / Score
                      </div>
                      <div className="text-lg font-bold text-amber-400 font-mono">
                        {summary.attendance
                          ? `${Math.round(summary.attendance.attendanceRate * 100)}%`
                          : summary.quiz
                          ? `${Math.round(summary.quiz.averageScore * 100)}%`
                          : summary.quickCheck
                          ? `${Math.round(summary.quickCheck.sentimentPositiveRatio * 100)}%`
                          : `${summary.totalEventsReceived}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Session Type Specific Live Summary Breakdown */}
                {summary?.attendance && (
                  <div className="p-3.5 rounded-lg bg-slate-900/40 border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Attendance Ledger
                    </span>
                    <div className="text-xs text-slate-300">
                      Present: <strong className="text-emerald-400">{summary.attendance.presentCount}</strong> • Absent: <strong className="text-rose-400">{summary.attendance.absentCount}</strong>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {summary.attendance.records.map((r) => (
                        <div key={r.participantId} className="p-2 rounded bg-slate-950/50 border border-white/5 flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 truncate">{r.displayName}</span>
                          <span className={r.status === 'PRESENT' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary?.poll && (
                  <div className="p-3.5 rounded-lg bg-slate-900/40 border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Poll Distribution
                    </span>
                    <div className="space-y-1.5">
                      {Object.entries(summary.poll.optionCounts).map(([opt, count]) => (
                        <div key={opt} className="flex items-center gap-2 text-xs">
                          <span className="w-16 text-slate-400 font-mono truncate">{opt}</span>
                          <div className="flex-1 h-3 rounded bg-slate-950 overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded"
                              style={{ width: `${summary?.poll?.optionPercentages[opt] || 0}%` }}
                            />
                          </div>
                          <span className="text-slate-300 font-mono w-10 text-right">{count} ({summary?.poll?.optionPercentages[opt] || 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary?.quickCheck && (
                  <div className="p-3.5 rounded-lg bg-slate-900/40 border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Understanding Pulse
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/20">
                        <div className="text-emerald-400 font-bold text-base">{summary.quickCheck.breakdown.understood}</div>
                        <div className="text-[10px] text-slate-400">Understood</div>
                      </div>
                      <div className="p-2 rounded bg-amber-950/30 border border-amber-500/20">
                        <div className="text-amber-400 font-bold text-base">{summary.quickCheck.breakdown.confused}</div>
                        <div className="text-[10px] text-slate-400">Confused</div>
                      </div>
                      <div className="p-2 rounded bg-rose-950/30 border border-rose-500/20">
                        <div className="text-rose-400 font-bold text-base">{summary.quickCheck.breakdown.needHelp}</div>
                        <div className="text-[10px] text-slate-400">Need Help</div>
                      </div>
                    </div>
                  </div>
                )}

                {summary?.quiz && Object.keys(summary.quiz.questions).length > 0 && (
                  <div className="p-3.5 rounded-lg bg-slate-900/40 border border-white/10 space-y-3">
                    <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Quiz Question Analytics
                    </span>
                    {Object.values(summary.quiz.questions).map((qSummary) => (
                      <div key={qSummary.questionId} className="p-2.5 rounded bg-slate-950/50 border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{qSummary.prompt || qSummary.questionId}</span>
                          <span className="text-cyan-300 font-mono">Accuracy: {Math.round(qSummary.accuracyRate * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>Responses: {qSummary.totalResponses}</span>
                          <span>• Correct: {qSummary.correctResponses}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connected Participants List */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-white">Connected Participants ({Object.keys(activeSession.participants).length})</span>
                    <span>Remotes Registered: {Object.keys(activeSession.remoteParticipantMap || {}).length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {Object.values(activeSession.participants).map((p) => (
                      <div key={p.participantId} className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs">
                        <div>
                          <div className="text-slate-200 font-medium">{p.displayName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {p.remoteId ? `Remote: ${p.remoteId}` : 'Software Client'}
                          </div>
                        </div>
                        <Badge variant={p.status === 'connected' ? 'success' : 'neutral'} size="sm">
                          {p.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Software Simulation Action Strip (development & rapid QA) */}
                {activeSession.state === 'ACTIVE' && (
                  <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-cyan-300">
                      <span className="font-semibold">Simulate Response (Software-First Verification)</span>
                      <span>Target: {Object.values(activeSession.participants)[0]?.displayName || 'First Student'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={simulatedValue}
                        onChange={(e) => setSimulatedValue(e.target.value)}
                        placeholder={
                          activeSession.sessionType === 'QUIZ'
                            ? 'Answer (e.g. A)'
                            : activeSession.sessionType === 'ATTENDANCE'
                            ? 'PRESENT'
                            : activeSession.sessionType === 'QUICK_CHECK'
                            ? 'UNDERSTOOD'
                            : 'Option 1'
                        }
                        className="flex-1 px-2.5 py-1.5 text-xs bg-slate-950 border border-white/15 rounded text-white"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!simulatedValue.trim() || isActionLoading}
                        onClick={() => {
                          handleSimulateResponse(simulatedValue.trim());
                          setSimulatedValue('');
                        }}
                        icon={<Send className="w-3 h-3" />}
                      >
                        Submit Response
                      </Button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </>
          ) : (
            <div className="p-12 text-center rounded-xl border border-white/10 bg-slate-900/20 space-y-3">
              <Radio className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
              <h4 className="text-sm font-semibold text-white">Select or Create a Classroom Session</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Launch interactive polls, track attendance, or deliver real-time quizzes to your students.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
