import React, { useState, useEffect } from 'react';
import type {
  LeaderboardEntry,
  LeaderboardScope,
  StudentEngagementStats
} from '../../../types/engagement.ts';
import {
  Trophy,
  Flame,
  Award,
  Users,
  Building,
  GraduationCap,
  Sparkles,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface EngagementLeaderboardViewProps {
  onBack: () => void;
  onNavigateToActivity: () => void;
  currentClassCode?: string;
}

export const EngagementLeaderboardView: React.FC<EngagementLeaderboardViewProps> = ({
  onBack,
  onNavigateToActivity,
  currentClassCode = 'PHYS-301'
}) => {
  const [activeScope, setActiveScope] = useState<LeaderboardScope>('class');
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<StudentEngagementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch leaderboard data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetch(`/api/education/engagement/leaderboard?scope=${activeScope}&classId=class-phys-301`).then((r) => r.json()),
      fetch('/api/education/engagement/stats?classId=class-phys-301').then((r) => r.json())
    ])
      .then(([lbData, statsData]) => {
        if (!isMounted) return;
        if (lbData?.entries) setEntries(lbData.entries);
        if (statsData?.stats) setStats(statsData.stats);
      })
      .catch((err) => console.warn('Failed to fetch leaderboard feed:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeScope]);

  const filteredEntries = entries.filter((e) =>
    e.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full font-sans pb-12">
      {/* 1. Page Header & Editorial Context (Unboxed Composition) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 font-medium tracking-wider uppercase">
            <Trophy className="w-3.5 h-3.5 text-neutral-400" />
            <span>Academic Consistency & Participation Standings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engagement Standings
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-xl">
            Points celebrate daily study consistency, completed lessons, and problem sets. Not an academic grade.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToActivity}
          className="flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white text-xs font-mono transition-colors shrink-0 cursor-pointer focus-ring"
        >
          <span>My Activity History</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>

      {/* 2. Personal Ranking KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Your Class Standing</div>
          <div className="text-lg font-bold text-white mt-1 tabular-nums">
            Rank #{stats ? stats.classRank : 5}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">In {currentClassCode}</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Engagement Points</div>
          <div className="text-lg font-bold text-white mt-1 tabular-nums">
            {stats ? stats.totalPoints : 1160} <span className="text-xs font-normal text-neutral-400">pts</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">+{stats ? stats.pointsThisWeek : 120} this week</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Active Study Streak</div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5 mt-1 tabular-nums">
            <Flame className="w-4 h-4 text-amber-400/90" />
            <span>{stats ? stats.streakDays : 5} Days</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Active today</div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Verified Actions</div>
          <div className="text-lg font-bold text-white mt-1 tabular-nums">
            {stats?.recentEvents.length || 6} Tasks
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Lessons & Quizzes</div>
        </div>
      </div>

      {/* 3. Controls & Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
        <div className="flex items-center gap-1 p-1 rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveScope('class')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer focus-ring ${
              activeScope === 'class'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Class</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScope('cohort')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer focus-ring ${
              activeScope === 'cohort'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Cohort Grade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScope('school')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer focus-ring ${
              activeScope === 'school'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>All Academy</span>
          </button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search cadets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/90 border border-white/[0.08] focus:border-white/[0.2] rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-100 placeholder:text-neutral-500 focus-ring transition-all font-mono"
          />
        </div>
      </div>

      {/* 4. Leaderboard Standings Table */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/[0.07] bg-black/40 text-[11px] font-mono uppercase tracking-wider text-neutral-400">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-6 sm:col-span-6 text-left">Cadet</div>
          <div className="col-span-4 sm:col-span-2 text-right">Points</div>
          <div className="hidden sm:block sm:col-span-3 text-right">Streak & Milestone</div>
        </div>

        {/* Table Rows */}
        {isLoading ? (
          <div className="p-10 text-center text-xs font-mono text-neutral-400">
            Loading verified standings...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-10 text-center text-xs font-mono text-neutral-500">
            No cadets found matching search.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredEntries.map((entry) => {
              return (
                <div
                  key={entry.studentId}
                  className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors ${
                    entry.isCurrentUser
                      ? 'bg-cyan-950/20 border-l-2 border-cyan-400/80'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 sm:col-span-1 text-center font-mono">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        entry.rank === 1
                          ? 'bg-amber-400 text-neutral-950 shadow-sm'
                          : entry.rank === 2
                          ? 'bg-neutral-300 text-neutral-950'
                          : entry.rank === 3
                          ? 'bg-neutral-600 text-neutral-100'
                          : 'text-neutral-500'
                      }`}
                    >
                      {entry.rank}
                    </span>
                  </div>

                  {/* Cadet Name & Badge */}
                  <div className="col-span-6 sm:col-span-6 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-xs font-mono font-bold text-neutral-200 shrink-0">
                      {entry.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${
                          entry.isCurrentUser ? 'text-white font-bold' : 'text-neutral-100'
                        }`}>
                          {entry.displayName}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/[0.08] text-neutral-300 border border-white/[0.14]">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500 truncate sm:hidden">
                        {entry.streakDays}-day streak · {entry.completedActivitiesCount} tasks
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="col-span-4 sm:col-span-2 text-right font-mono text-xs">
                    <span className="font-semibold text-white text-sm tabular-nums">{entry.points}</span>
                    <span className="text-neutral-500 ml-1">pts</span>
                  </div>

                  {/* Streak & Milestone (Desktop) */}
                  <div className="hidden sm:block sm:col-span-3 text-right font-mono text-xs text-neutral-400 truncate">
                    <div className="flex items-center justify-end gap-1.5 text-neutral-300">
                      <Flame className="w-3.5 h-3.5 text-amber-400/80" />
                      <span>{entry.streakDays}-day streak</span>
                    </div>
                    {entry.recentMilestone && (
                      <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                        {entry.recentMilestone}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Policy & Anti-Gaming Transparency Note */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] text-xs font-sans text-neutral-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-neutral-300">Authoritative Anti-Gaming Policy</span>
          <p className="leading-relaxed text-[11px] text-neutral-400 font-sans">
            Points are awarded strictly once per canonical lesson, completed quiz checkpoint, or submitted coursework. Refreshing pages, repeating actions, or fake timer clicks generate zero points. Private notes, chats, and individual assessment grades are never published.
          </p>
        </div>
      </div>
    </div>
  );
};
