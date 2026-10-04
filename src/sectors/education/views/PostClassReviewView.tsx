import React, { useState, useEffect } from 'react';
import type { PostClassReviewReport, GroundedNextAction } from '../../../types/teacher.ts';
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Users,
  Sparkles,
  ArrowRight,
  MessageSquare,
  FileCheck2,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  Radio,
  FileText
} from 'lucide-react';
import { SharedBackButton } from '../components/SharedBackButton.tsx';

interface PostClassReviewViewProps {
  sessionId?: string;
  onBack: () => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const PostClassReviewView: React.FC<PostClassReviewViewProps> = ({
  sessionId = 'session-phys-101',
  onBack,
  onNavigateToContext
}) => {
  const [report, setReport] = useState<PostClassReviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/education/teacher/post-class-review?sessionId=${sessionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.report) setReport(data.report);
      })
      .catch((err) => console.warn('Could not load post-class review:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleExecuteAction = (action: GroundedNextAction) => {
    setExecutedActions((prev) => ({ ...prev, [action.id]: true }));
    if (onNavigateToContext) {
      onNavigateToContext(action.actionTarget, action.contextPatch);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full font-sans">
      {/* 1. Universal Back Navigation */}
      <SharedBackButton
        onBack={onBack}
        parentLabel="Teacher Command Center"
        currentLabel="Post-Class Review & Analytics"
        hierarchySegments={[
          { label: 'Faculty Hub', onClick: onBack },
          { label: report?.courseCode || 'PHYS-301' },
          { label: 'Post-Class Review' }
        ]}
      />

      {/* 2. Hero Header */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed Classroom Session · Delivered Successfully</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {report?.sessionTopic || 'Coulomb’s Law, Electric Fields & Gauss Surface Flux'}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {report?.courseCode}: {report?.courseName} · Completed Oct 3 at 09:45 AM
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <span className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{report?.durationMinutes || 45} mins taught</span>
            </span>
          </div>
        </div>

        {/* Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs font-mono">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Class Attendance</div>
            <div className="text-lg font-bold text-cyan-300 mt-0.5">
              {report?.activeParticipants || 28} / {report?.totalStudents || 32}
            </div>
            <div className="text-[10px] text-emerald-400/80">{report?.participationRate || 88}% In-Room Cadets</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Diagnostic Accuracy</div>
            <div className="text-lg font-bold text-purple-300 mt-0.5">
              {report?.quizAccuracy || 82}% Avg
            </div>
            <div className="text-[10px] text-purple-400/80">Pulse Quiz on Tablets</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Teaching Sequence</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {report?.taughtStagesCount || 4} of 4 Stages
            </div>
            <div className="text-[10px] text-slate-400">100% Objectives Covered</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Follow-up Actions</div>
            <div className="text-lg font-bold text-amber-300 mt-0.5">
              {report?.groundedNextActions.length || 4} Grounded
            </div>
            <div className="text-[10px] text-amber-400/80">Evidence-Backed</div>
          </div>
        </div>
      </div>

      {/* 3. What Was Taught & Addressed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Worked Examples */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Completed Derivations & Examples</span>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            {report?.completedWorkedExamples.map((ex, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">#{idx + 1}</span>
                <span className="leading-relaxed">{ex}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Misconceptions Addressed */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>Misconceptions Clarified</span>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            {report?.addressedMisconceptions.map((misc, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 flex items-start gap-2">
                <span className="text-purple-400 font-bold shrink-0">·</span>
                <span className="leading-relaxed">{misc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Grounded Next Actions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Grounded Pedagogical Next Actions ({report?.groundedNextActions.length || 0})
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Based on formative tablet quiz signals</span>
        </div>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
          {report?.groundedNextActions.map((action) => {
            const isDone = executedActions[action.id];

            return (
              <div
                key={action.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                        action.type === 'reteach'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : action.type === 'practice'
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                          : action.type === 'prep'
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {action.type}
                    </span>
                    <span className="text-slate-400">{action.reason}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white leading-relaxed">{action.action}</h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteAction(action)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all shrink-0 cursor-pointer ${
                    isDone
                      ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                      : 'border border-cyan-500/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200'
                  }`}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Action Initiated</span>
                    </>
                  ) : (
                    <>
                      <span>{action.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
