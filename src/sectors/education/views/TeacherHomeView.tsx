import React, { useState, useEffect } from 'react';
import type { EducationClass, Assignment, StudentSubmission } from '../../../types/education.ts';
import type { TeacherActionItem, StudentAttentionSignal, PostClassReviewReport } from '../../../types/teacher.ts';
import type { ClassSession } from '../../../types/classSession.ts';
import {
  BookOpen,
  Users,
  Clock,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Filter,
  Flame,
  ChevronRight,
  CheckCircle,
  FileCheck2,
  HelpCircle,
  MessageSquare
} from 'lucide-react';

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
  assignments,
  submissions,
  onSelectClass,
  onOpenCreateAssignmentModal,
  onSelectSubmissionForGrading,
  onNavigateTab,
  onNavigateToContext
}) => {
  const [actionQueue, setActionQueue] = useState<TeacherActionItem[]>([]);
  const [attentionSignals, setAttentionSignals] = useState<StudentAttentionSignal[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [recentReview, setRecentReview] = useState<PostClassReviewReport | null>(null);
  const [activeQueueFilter, setActiveQueueFilter] = useState<'all' | 'grading' | 'session' | 'attention'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const pendingGrading = submissions.filter((s) => s.status === 'submitted');
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
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
    <div className="space-y-8 max-w-4xl mx-auto w-full font-sans pb-12">
      {/* 1. Command Center Identity & Calm Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>Teacher Operating System · Command Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Today's Teaching Operations
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono">
          Dr. Helen Cho · {classes.length} Active Cohorts · {totalStudents} Cadets Enrolled · Stark Faculty of Physics
        </p>
      </div>

      {/* 2. TODAY: What matters to me right now? */}
      <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-950 p-6 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.12)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TODAY'S NEXT CLASS · 09:00 AM</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                {nextSession ? nextSession.status : 'READY TO TEACH'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {nextSession ? `${nextSession.courseCode}: ${nextSession.topic}` : `${primaryClass.code}: Harmonic Oscillators & Annihilation Algebra`}
            </h2>
            <div className="text-xs sm:text-sm text-slate-300 font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{primaryClass.name}</span>
              <span className="text-slate-600">·</span>
              <span>Room: {primaryClass.room || 'Quantum Hall 4B'}</span>
              <span className="text-slate-600">·</span>
              <span>{primaryClass.studentCount} Cadets</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('classroom')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Launch SmartBoard</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('teacher_session_prep')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Session Plan</span>
            </button>
          </div>
        </div>

        {/* Operational Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Scheduled Today</div>
            <div className="text-white font-bold">1 Lecture · 45 mins</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Preparation Status</div>
            <div className="text-emerald-400 font-bold">Approved & Synchronized</div>
          </div>
          <div>
            <div className="text-[10px] text-amber-400/80 uppercase tracking-wider">Pending Grading</div>
            <div className="text-amber-300 font-bold">{pendingGrading.length} Submissions</div>
          </div>
          <div>
            <div className="text-[10px] text-purple-400/80 uppercase tracking-wider">Attention Signals</div>
            <div className="text-purple-300 font-bold">{attentionSignals.length} Cadets Need Follow-up</div>
          </div>
        </div>
      </div>

      {/* 3. TEACHER ACTION QUEUE: Aggregated actionable work */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
              Teacher Action Queue ({actionQueue.length} Active Items)
            </h2>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActiveQueueFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeQueueFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({actionQueue.length})
            </button>
            <button
              onClick={() => setActiveQueueFilter('grading')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeQueueFilter === 'grading'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Grading ({actionQueue.filter((i) => i.type === 'grading').length})
            </button>
            <button
              onClick={() => setActiveQueueFilter('session')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeQueueFilter === 'session'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sessions ({actionQueue.filter((i) => ['session_review', 'session_schedule', 'prep_needed'].includes(i.type)).length})
            </button>
            <button
              onClick={() => setActiveQueueFilter('attention')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeQueueFilter === 'attention'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Attention ({actionQueue.filter((i) => i.type === 'student_attention').length})
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 backdrop-blur-sm">
          {filteredQueue.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500">
              No pending action items matching the active filter.
            </div>
          ) : (
            filteredQueue.map((item) => {
              const isUrgent = item.priority === 'urgent';
              const isHigh = item.priority === 'high';

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isUrgent
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="font-bold text-white">{item.courseCode}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400 truncate">{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans line-clamp-1">{item.subtitle}</p>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleActionClick(item)}
                      className="px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. TEACHING QUEUE: Preparation, Approvals, Ready to Teach */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
              Teaching Queue · Instructional Preparation & Lifecycle
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('teacher_session_prep')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
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
            const isDraft = s.status === 'DRAFT';

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
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition-all cursor-pointer group space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-cyan-300">{s.courseCode}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isApproved
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : isReadyForReview
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : isScheduled
                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-700/30 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-100 transition-colors line-clamp-1">
                    {s.topic}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {s.durationMinutes} mins · {s.sourceMaterials?.length || 0} Sources Attached
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>{isApproved ? 'Ready for classroom' : isReadyForReview ? 'Needs approval' : 'Draft stage'}</span>
                  <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
              Review Queue · Problem Sets & Quizzes ({pendingGrading.length} Pending)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('teacher_review')}
            className="text-xs font-mono text-amber-400 hover:text-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open Review Queue</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
          {submissions.slice(0, 3).map((sub) => {
            const isPending = sub.status === 'submitted';

            return (
              <div
                key={sub.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-white">{sub.studentName}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-300 font-semibold">{sub.className.split(':')[0]}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{sub.submittedAt}</span>
                  </div>
                  <h3 className="text-sm text-slate-200 font-semibold truncate">{sub.assignmentTitle}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1 italic font-mono">"{sub.content}"</p>
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
                      className="px-3.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Grade Submission</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{sub.grade}/100</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. STUDENTS NEEDING ATTENTION: Evidence-Based Signals */}
      <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-950/10 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-300">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
              Students Needing Follow-up ({attentionSignals.length} Detected Signals)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('teacher_attention')}
            className="text-xs font-mono text-purple-400 hover:text-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>All Attention Signals</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {attentionSignals.slice(0, 3).map((sig) => (
            <div
              key={sig.id}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{sig.studentName}</span>
                  <span className="text-slate-500">· {sig.courseCode}</span>
                  <span className="text-purple-400 font-semibold">[{sig.title}]</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans">{sig.description}</p>
                <p className="text-[10px] text-slate-400 italic">Evidence: {sig.evidenceSnippet}</p>
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
                className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] self-start sm:self-center transition-colors shrink-0 cursor-pointer"
              >
                {sig.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 7. RECENT CLASS ACTIVITY & POST-CLASS REVIEW */}
      {recentReview && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
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
              className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Full Analytics Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-white">{recentReview.sessionTopic}</div>
                <div className="text-xs font-mono text-slate-400">
                  {recentReview.courseCode}: {recentReview.courseName} · Delivered Oct 3 · {recentReview.durationMinutes} mins
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400 font-bold">{recentReview.participationRate}% Attendance</span>
                <span className="text-slate-600">·</span>
                <span className="text-cyan-400 font-bold">{recentReview.quizAccuracy}% Pulse Accuracy</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans border-t border-slate-800/60 pt-2">
              {recentReview.summaryNotes}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Suggested Follow-ups:</span>
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
                  className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                  <span>{na.actionLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. NEXT: Tomorrow & Next Unprepared Lesson */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Next in Curriculum Track & Tomorrow's Preparation
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Academic Calendar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-mono text-cyan-400 font-semibold">
              Tomorrow · 09:00 AM · Lesson 1.2
            </div>
            <div className="text-sm font-bold text-white">
              Gauss Theorem Applications & Electric Conductors
            </div>
            <div className="text-xs text-slate-400 font-mono">
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
            className="px-3.5 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Prepare Tomorrow's Class</span>
          </button>
        </div>
      </div>
    </div>
  );
};
