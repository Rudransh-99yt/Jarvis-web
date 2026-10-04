import React, { useState, useEffect } from 'react';
import type { StudentAttentionSignal } from '../../../types/teacher.ts';
import type { EducationClass } from '../../../types/education.ts';
import {
  AlertTriangle,
  Clock,
  Filter,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Calendar,
  MessageSquare,
  Sparkles,
  FileCheck2,
  ShieldCheck,
  Search
} from 'lucide-react';
import { SharedBackButton } from '../components/SharedBackButton.tsx';

interface TeacherAttentionViewProps {
  classes: EducationClass[];
  onBack: () => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const TeacherAttentionView: React.FC<TeacherAttentionViewProps> = ({
  classes,
  onBack,
  onNavigateToContext
}) => {
  const [signals, setSignals] = useState<StudentAttentionSignal[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [handledSignals, setHandledSignals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const query = selectedClassFilter !== 'all' ? `?classId=${selectedClassFilter}` : '';
    fetch(`/api/education/teacher/attention${query}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.signals) setSignals(data.signals);
      })
      .catch((err) => console.warn('Could not load student attention signals:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedClassFilter]);

  const filteredSignals = signals.filter((s) => {
    const matchType = selectedTypeFilter === 'all' || s.signalType === selectedTypeFilter;
    const matchSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const handleActionClick = (signal: StudentAttentionSignal) => {
    setHandledSignals((prev) => ({ ...prev, [signal.id]: true }));
    if (onNavigateToContext) {
      onNavigateToContext(signal.actionTarget, signal.contextPatch);
    }
  };

  const getSignalBadge = (type: string) => {
    switch (type) {
      case 'missed_work':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Missed Work
          </span>
        );
      case 'practice_difficulty':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            Practice Difficulty Detected
          </span>
        );
      case 'low_activity':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-500/10 text-slate-300 border border-slate-500/30">
            Low Recent Activity
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Needs Follow-up
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full font-sans">
      {/* 1. Universal Back Navigation */}
      <SharedBackButton
        onBack={onBack}
        parentLabel="Teacher Command Center"
        currentLabel="Evidence-Based Student Attention & Follow-up"
        hierarchySegments={[
          { label: 'Faculty Hub', onClick: onBack },
          { label: 'Cadet Support' },
          { label: 'Follow-up Signals' }
        ]}
      />

      {/* 2. Hero Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Evidence-Backed Follow-up Indicators</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Cadets Needing Attention
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Factual academic signals derived from assignment turn-ins, practice checkpoints, and activity logs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <span className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300">
              {filteredSignals.length} Active Signals
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 font-mono leading-relaxed">
          Jarvis does not label or diagnose students. Every signal contains verifiable source timestamps, academic context, and a specific pedagogical action.
        </p>
      </div>

      {/* 3. Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Managed Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.code} — {cls.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Signal Types</option>
            <option value="missed_work">Missed Work</option>
            <option value="practice_difficulty">Practice Difficulty</option>
            <option value="low_activity">Low Recent Activity</option>
            <option value="unresolved_feedback">Needs Follow-up</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cadet or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* 4. Signals List */}
      <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">Loading verified signals...</div>
        ) : filteredSignals.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            No active follow-up signals matching the selected criteria.
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isHandled = handledSignals[signal.id];

            return (
              <div
                key={signal.id}
                className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-white text-sm">{signal.studentName}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-300 font-semibold">{signal.courseCode}</span>
                    <span className="text-slate-600">·</span>
                    {getSignalBadge(signal.signalType)}
                  </div>

                  <p className="text-sm font-medium text-slate-200 leading-relaxed font-sans">
                    {signal.description}
                  </p>

                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 text-xs font-mono text-slate-400 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Evidence Log</div>
                    <div className="text-slate-300">{signal.evidenceSnippet}</div>
                    <div className="text-[10px] text-slate-500">Source: {signal.source} · Detected {new Date(signal.detectedAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleActionClick(signal)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                      isHandled
                        ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                        : 'border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {isHandled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Action Dispatched</span>
                      </>
                    ) : (
                      <>
                        <span>{signal.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
