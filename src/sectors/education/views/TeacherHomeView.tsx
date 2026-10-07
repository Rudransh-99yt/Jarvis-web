import React, { useState, useEffect } from 'react';
import type { EducationClass, Assignment, StudentSubmission } from '../../../types/education.ts';
import type { TeacherActionItem, StudentAttentionSignal, PostClassReviewReport } from '../../../types/teacher.ts';
import type { ClassSession } from '../../../types/classSession.ts';
import {
  BookOpen,
  Clock,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Flame,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { GlassCard } from '../../../components/ui/index.ts';

interface TeacherHomeViewProps {
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  onSelectClass: (classId: string) => void;
  onOpenCreateAssignmentModal: () => void;
  onSelectSubmissionForGrading: (submission: StudentSubmission) => void;
  onNavigateTab: (tab: any) => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const TeacherHomeView: React.FC<TeacherHomeViewProps> = ({
  classes,
  assignments: _assignments,
  submissions,
  onSelectClass: _onSelectClass,
  onOpenCreateAssignmentModal: _onOpenCreateAssignmentModal,
  onSelectSubmissionForGrading,
  onNavigateTab,
  onNavigateToContext
}) => {
  const [actionQueue, setActionQueue] = useState<TeacherActionItem[]>([]);
  const [attentionSignals, setAttentionSignals] = useState<StudentAttentionSignal[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [recentReview, setRecentReview] = useState<PostClassReviewReport | null>(null);
  const [activeQueueFilter, setActiveQueueFilter] = useState<'all' | 'grading' | 'session' | 'attention'>('all');
  const [_isLoading, setIsLoading] = useState(true);

  const pendingGrading = submissions.filter((s) => s.status === 'submitted');
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);

  // Fetch canonical Action Queue, Attention Signals, ClassSessions, and Recent Review
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetch('/api/education/teacher/action-queue').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/education/teacher/attention').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/education/sessions').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/education/teacher/post-class-review?sessionId=session-phys-101').then((r) =>
        r.ok ? r.json() : null
      )
    ])
      .then(([queueData, attentionData, sessionData, reviewData]) => {
        if (!isMounted) return;
        if (queueData?.queue) setActionQueue(queueData.queue);
        if (attentionData?.signals) setAttentionSignals(attentionData.signals);
        if (sessionData?.sessions) setSessions(sessionData.sessions);
        if (reviewData?.report) setRecentReview(reviewData.report);
      })
      .catch((err) => console.warn('Could not load teacher command center feeds:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleActionClick = (item: TeacherActionItem) => {
    if (onNavigateToContext) {
      onNavigateToContext(item.actionTarget, item.contextPatch);
    } else {
      onNavigateTab(item.actionTarget as any);
    }
  };

  const filteredQueue = actionQueue.filter((item) => {
    if (activeQueueFilter === 'grading') return item.type === 'grading';
    if (activeQueueFilter === 'session')
      return item.type === 'session_review' || item.type === 'session_schedule' || item.type === 'prep_needed';
    if (activeQueueFilter === 'attention') return item.type === 'student_attention';
    return true;
  });

  // Next upcoming class / session
  const primaryClass = classes[0] || {
    id: 'class-phys-301',
    code: 'PHYS-301',
    name: 'Advanced Quantum & Classical Electrodynamics',
    room: 'Quantum Hall 4B',
    studentCount: 32,
    schedule: 'Mon, Wed, Fri · 09:00 AM'
  };

  const nextSession = sessions.find((s) => s.status === 'APPROVED' || s.status === 'SCHEDULED') || sessions[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* 1. Command Center Identity & Calm Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-neutral-400 tracking-wider uppercase font-medium flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
          <span>Teacher Operating System · Command Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-100 tracking-tight">
          Today's Teaching Operations
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400">
          Dr. Helen Cho <span className="text-neutral-500">·</span> {classes.length} Active Cohorts <span className="text-neutral-500">·</span> {totalStudents} Cadets Enrolled <span className="text-neutral-500">·</span> Stark Faculty of Physics
        </p>
      </div>

      {/* 2. TODAY: What matters to me right now? (Apple Liquid Glass with subtle specular rim) */}
      <GlassCard level="lesson" highlight className="p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-neutral-300 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TODAY'S NEXT CLASS · 09:00 AM</span>
              <span className="text-neutral-600" aria-hidden="true">·</span>
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">
                {nextSession ? nextSession.status : 'READY TO TEACH'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight">
              {nextSession ? `${nextSession.courseCode}: ${nextSession.topic}` : `${primaryClass.code}: Harmonic Oscillators & Annihilation Algebra`}
            </h2>
            <div className="text-xs sm:text-sm text-neutral-300 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{primaryClass.name}</span>
              <span className="text-neutral-600" aria-hidden="true">·</span>
              <span>Room: {primaryClass.room || 'Quantum Hall 4B'}</span>
              <span className="text-neutral-600" aria-hidden="true">·</span>
              <span className="tabular-nums font-mono">{primaryClass.studentCount}</span> Cadets
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('classroom')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold tracking-wider transition-all cursor-pointer focus-ring"
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Launch SmartBoard</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('teacher_session_prep')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 hover:text-white text-xs font-semibold tracking-wider transition-all cursor-pointer focus-ring"
            >
              <Sparkles className="w-4 h-4 text-neutral-300" />
              <span>Session Plan</span>
            </button>
          </div>
        </div>

        {/* Operational Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06] text-xs">
          <div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Scheduled Today</div>
            <div className="text-neutral-100 font-bold mt-0.5">1 Lecture · 45 mins</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Preparation Status</div>
            <div className="text-emerald-400 font-bold mt-0.5">Approved & Synchronized</div>
          </div>
          <div>
            <div className="text-[11px] text-amber-400/80 uppercase tracking-wider">Pending Grading</div>
            <div className="text-amber-300 font-bold mt-0.5 tabular-nums font-mono">{pendingGrading.length} Submissions</div>
          </div>
          <div>
            <div className="text-[11px] text-purple-400/80 uppercase tracking-wider">Attention Signals</div>
            <div className="text-purple-300 font-bold mt-0.5 tabular-nums font-mono">{attentionSignals.length} Cadets Need Follow-up</div>
          </div>
        </div>
      </GlassCard>

      {/* 3. TEACHER ACTION QUEUE: Aggregated actionable work */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold tracking-wider text-neutral-200 uppercase">
              Teacher Action Queue ({actionQueue.length} Active Items)
            </h2>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveQueueFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer focus-ring ${
                activeQueueFilter === 'all'
                  ? 'bg-white/[0.1] text-white font-semibold border border-white/[0.14]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({actionQueue.length})
            </button>
            <button
              onClick={() => setActiveQueueFilter('grading')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer focus-ring ${
                activeQueueFilter === 'grading'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Grading ({actionQueue.filter((i) => i.type === 'grading').length})
            </button>
            <button
              onClick={() => setActiveQueueFilter('session')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer focus-ring ${
                activeQueueFilter === 'session'
                  ? 'bg-white/[0.1] text-white font-semibold border border-white/[0.14]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sessions ({actionQueue.filter((i) => ['session_review', 'session_schedule', 'prep_needed'].includes(i.type)).length})
            </button>
            <button
              onClick={() => setActiveQueueFilter('attention')}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer focus-ring ${
                activeQueueFilter === 'attention'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Attention ({actionQueue.filter((i) => i.type === 'student_attention').length})
            </button>
          </div>
        </div>

        <GlassCard className="divide-y divide-white/[0.06] p-0 overflow-hidden">
          {filteredQueue.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              No pending action items matching the active filter.
            </div>
          ) : (
            filteredQueue.map((item) => {
              const isUrgent = item.priority === 'urgent';
              const isHigh = item.priority === 'high';

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono ${
                          isUrgent
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/[0.06] text-neutral-200 border border-white/[0.12]'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="font-semibold text-neutral-100 font-mono">{item.courseCode}</span>
                      <span className="text-neutral-600" aria-hidden="true">·</span>
                      <span className="text-neutral-400 truncate">{item.title}</span>
                    </div>
                    <p className="text-xs text-neutral-300 line-clamp-1">{item.subtitle}</p>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleActionClick(item)}
                      className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white text-xs transition-all flex items-center gap-1.5 cursor-pointer focus-ring"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </GlassCard>
      </div>

      {/* 4. TEACHING QUEUE: Preparation, Approvals, Ready to Teach */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-300" />
            <h2 className="text-xs font-semibold tracking-wider text-neutral-200 uppercase">
              Teaching Queue · Instructional Preparation & Lifecycle
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('teacher_session_prep')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer focus-ring rounded"
          >
            <span>All ClassSessions</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sessions.slice(0, 4).map((s) => {
            const isApproved = s.status === 'APPROVED';
            const isReadyForReview = s.status === 'READY_FOR_REVIEW';
            const isScheduled = s.status === 'SCHEDULED';

            return (
              <div
                key={s.id}
                onClick={() => {
                  if (onNavigateToContext) {
                    onNavigateToContext('teacher_session_prep', { sessionId: s.id, classId: s.classId });
                  } else {
                    onNavigateTab('teacher_session_prep');
                  }
                }}
                className="p-4 rounded-xl border border-white/[0.08] glass-level-2-interactive cursor-pointer group space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-100 font-mono">{s.courseCode}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                      isApproved
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : isReadyForReview
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : isScheduled
                        ? 'bg-white/[0.08] text-white border border-white/[0.14]'
                        : 'bg-white/[0.04] text-neutral-400 border border-white/[0.06]'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-white transition-colors line-clamp-1">
                    {s.topic}
                  </h3>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    <span className="tabular-nums font-mono">{s.durationMinutes}</span> mins · <span className="tabular-nums font-mono">{s.sourceMaterials?.length || 0}</span> Sources Attached
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
                  <span>{isApproved ? 'Ready for classroom' : isReadyForReview ? 'Needs approval' : 'Draft stage'}</span>
                  <span className="text-neutral-200 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-medium">
                    <span>Open Plan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. REVIEW QUEUE: Submissions Awaiting Grading */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold tracking-wider text-neutral-200 uppercase">
              Review Queue · Problem Sets & Quizzes ({pendingGrading.length} Pending)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('teacher_review')}
            className="text-xs text-amber-400 hover:text-amber-200 flex items-center gap-1 transition-colors cursor-pointer focus-ring rounded"
          >
            <span>Open Review Queue</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <GlassCard className="divide-y divide-white/[0.06] p-0 overflow-hidden">
          {submissions.slice(0, 3).map((sub) => {
            const isPending = sub.status === 'submitted';

            return (
              <div
                key={sub.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-neutral-100">{sub.studentName}</span>
                    <span className="text-neutral-600" aria-hidden="true">·</span>
                    <span className="text-neutral-300 font-mono text-xs">{sub.className.split(':')[0]}</span>
                    <span className="text-neutral-600" aria-hidden="true">·</span>
                    <span className="text-neutral-400 text-xs">{sub.submittedAt}</span>
                  </div>
                  <h3 className="text-sm text-neutral-200 font-semibold truncate">{sub.assignmentTitle}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-1 italic">"{sub.content}"</p>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  {isPending ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToContext) {
                          onNavigateToContext('teacher_review', { submissionId: sub.id, classId: sub.classId });
                        } else {
                          onSelectSubmissionForGrading(sub);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs transition-all flex items-center gap-1.5 cursor-pointer focus-ring"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Grade Submission</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-500/30 tabular-nums font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{sub.grade}/100</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </GlassCard>
      </div>

      {/* 6. STUDENTS NEEDING ATTENTION: Evidence-Based Signals */}
      <GlassCard className="p-5 border-purple-500/20 bg-purple-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-300">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">
              Students Needing Follow-up ({attentionSignals.length} Detected Signals)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('teacher_attention')}
            className="text-xs text-purple-400 hover:text-purple-200 flex items-center gap-1 transition-colors cursor-pointer focus-ring rounded"
          >
            <span>All Attention Signals</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {attentionSignals.slice(0, 3).map((sig) => (
            <div
              key={sig.id}
              className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-100">{sig.studentName}</span>
                  <span className="text-neutral-400">· {sig.courseCode}</span>
                  <span className="text-purple-400 font-medium">[{sig.title}]</span>
                </div>
                <p className="text-[11px] text-neutral-300">{sig.description}</p>
                <p className="text-[10px] text-neutral-400 italic">Evidence: {sig.evidenceSnippet}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToContext) {
                    onNavigateToContext(sig.actionTarget, sig.contextPatch);
                  } else {
                    onNavigateTab(sig.actionTarget as any);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] self-start sm:self-center transition-colors shrink-0 cursor-pointer focus-ring"
              >
                {sig.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 7. RECENT CLASS ACTIVITY & POST-CLASS REVIEW */}
      {recentReview && (
        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                Recent Class Delivery & Post-Class Review
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToContext) {
                  onNavigateToContext('teacher_post_class_review', { sessionId: recentReview.sessionId });
                } else {
                  onNavigateTab('teacher_post_class_review');
                }
              }}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer focus-ring rounded"
            >
              <span>Full Analytics Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-neutral-100">{recentReview.sessionTopic}</div>
                <div className="text-xs text-neutral-400">
                  {recentReview.courseCode}: {recentReview.courseName} <span className="text-neutral-600">·</span> Delivered Oct 3 <span className="text-neutral-600">·</span> <span className="tabular-nums font-mono">{recentReview.durationMinutes}</span> mins
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-semibold tabular-nums font-mono">{recentReview.participationRate}% Attendance</span>
                <span className="text-neutral-600" aria-hidden="true">·</span>
                <span className="text-white font-semibold tabular-nums font-mono">{recentReview.quizAccuracy}% Pulse Accuracy</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 border-t border-white/[0.06] pt-2 leading-relaxed">
              {recentReview.summaryNotes}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] uppercase text-neutral-400 font-semibold">Suggested Follow-ups:</span>
              {recentReview.groundedNextActions.slice(0, 2).map((na) => (
                <button
                  key={na.id}
                  type="button"
                  onClick={() => {
                    if (onNavigateToContext) {
                      onNavigateToContext(na.actionTarget, na.contextPatch);
                    } else {
                      onNavigateTab(na.actionTarget as any);
                    }
                  }}
                  className="px-2.5 py-1 rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 text-[11px] flex items-center gap-1 cursor-pointer transition-colors focus-ring"
                >
                  <ArrowRight className="w-3 h-3 text-neutral-300" />
                  <span>{na.actionLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* 8. NEXT: Tomorrow & Next Unprepared Lesson */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Next in Curriculum Track & Tomorrow's Preparation
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('calendar')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer focus-ring rounded"
          >
            <span>Academic Calendar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs text-neutral-300 font-medium">
              Tomorrow · 09:00 AM · Lesson 1.2
            </div>
            <div className="text-sm font-semibold text-neutral-100">
              Gauss Theorem Applications & Electric Conductors
            </div>
            <div className="text-xs text-neutral-400">
              PHYS-301 · Unit 1: Electrostatics · Preparation recommended from NCERT Chapter 1
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onNavigateToContext) {
                onNavigateToContext('teacher_session_prep', { classId: 'class-phys-301', topic: 'Gauss Theorem Applications' });
              } else {
                onNavigateTab('teacher_session_prep');
              }
            }}
            className="px-3.5 py-2 rounded-xl border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer focus-ring"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Prepare Tomorrow's Class</span>
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
