import React, { useState, useEffect } from 'react';
import type { StudentEngagementEvent, StudentEngagementStats } from '../../../types/engagement.ts';
import {
  CheckCircle2,
  Clock,
  BookOpen,
  HelpCircle,
  FileText,
  Timer,
  Award,
  Sparkles,
  Flame,
  ArrowRight
} from 'lucide-react';
import { SharedBackButton } from '../components/SharedBackButton.tsx';

interface EngagementActivityViewProps {
  onBack: () => void;
  onNavigateToLeaderboard: () => void;
}

export const EngagementActivityView: React.FC<EngagementActivityViewProps> = ({
  onBack,
  onNavigateToLeaderboard
}) => {
  const [events, setEvents] = useState<StudentEngagementEvent[]>([]);
  const [stats, setStats] = useState<StudentEngagementStats | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetch('/api/education/engagement/my-activity').then((r) => r.json()),
      fetch('/api/education/engagement/stats').then((r) => r.json())
    ])
      .then(([actData, statsData]) => {
        if (!isMounted) return;
        if (actData?.activity) setEvents(actData.activity);
        if (statsData?.stats) setStats(statsData.stats);
      })
      .catch((err) => console.warn('Failed to load activity ledger:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterType === 'all') return true;
    if (filterType === 'lessons') return e.type === 'lesson_completed';
    if (filterType === 'practice') return e.type === 'practice_completed';
    if (filterType === 'quizzes') return e.type === 'quiz_completed';
    if (filterType === 'assignments') return ['assignment_submitted', 'assignment_on_time'].includes(e.type);
    if (filterType === 'focus') return e.type === 'focus_completed';
    return true;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return <BookOpen className="w-4 h-4 text-cyan-400" />;
      case 'practice_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'quiz_completed':
        return <HelpCircle className="w-4 h-4 text-purple-400" />;
      case 'assignment_submitted':
      case 'assignment_on_time':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'focus_completed':
        return <Timer className="w-4 h-4 text-indigo-400" />;
      default:
        return <Award className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* 1. Universal Back Navigation */}
      <SharedBackButton
        onBack={onBack}
        parentLabel="Engagement Leaderboard"
        currentLabel="My Verified Activity History"
        hierarchySegments={[
          { label: 'Education' },
          { label: 'Engagement', onClick: onNavigateToLeaderboard },
          { label: 'My Activity' }
        ]}
      />

      {/* 2. Header & Points Breakdown */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Transparent Accomplishment Ledger</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Where Did My Points Come From?
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Every point is awarded by verified server-authoritative milestones.
            </p>
          </div>

          <div className="text-right font-mono shrink-0">
            <div className="text-2xl font-bold text-cyan-300">
              {stats ? stats.totalPoints : 1160} <span className="text-xs text-slate-400 font-normal">pts</span>
            </div>
            <div className="text-[11px] text-slate-500">Total Lifetime Points</div>
          </div>
        </div>

        {/* Category Breakdown Chips */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-xs">
            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Lessons</div>
              <div className="text-sm font-bold text-cyan-300">+{stats.breakdown.lessons} pts</div>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Practice</div>
              <div className="text-sm font-bold text-emerald-400">+{stats.breakdown.practice} pts</div>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Quizzes</div>
              <div className="text-sm font-bold text-purple-400">+{stats.breakdown.quizzes} pts</div>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Assignments</div>
              <div className="text-sm font-bold text-amber-300">+{stats.breakdown.assignments} pts</div>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Focus Mode</div>
              <div className="text-sm font-bold text-indigo-300">+{stats.breakdown.focus} pts</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterType === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Activity ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('lessons')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterType === 'lessons' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Lessons
        </button>
        <button
          type="button"
          onClick={() => setFilterType('practice')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterType === 'practice' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Practice
        </button>
        <button
          type="button"
          onClick={() => setFilterType('quizzes')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterType === 'quizzes' ? 'bg-slate-800 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Quizzes
        </button>
        <button
          type="button"
          onClick={() => setFilterType('assignments')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterType === 'assignments' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Assignments
        </button>
        <button
          type="button"
          onClick={() => setFilterType('focus')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filterType === 'focus' ? 'bg-slate-800 text-indigo-300 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Focus
        </button>
      </div>

      {/* 4. Chronological Ledger Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">
            Loading activity history...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            No activities recorded in this category.
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 shrink-0 mt-0.5">
                  {getEventIcon(ev.type)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-white truncate">{ev.title}</span>
                    {ev.courseCode && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {ev.courseCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {ev.description}
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span>{new Date(ev.occurredAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold">
                  +{ev.points} pts
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
