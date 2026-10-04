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
import { SharedBackButton } from '../components/SharedBackButton.tsx';

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
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* 1. Universal Back Navigation */}
      <SharedBackButton
        onBack={onBack}
        parentLabel="Student Home"
        currentLabel="Cadet Engagement Leaderboard"
        hierarchySegments={[
          { label: 'Education', onClick: onBack },
          { label: 'Engagement' },
          { label: 'Leaderboard' }
        ]}
      />

      {/* 2. Personal Ranking Hero */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Academic Consistency & Participation Standings</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Engagement Leaderboard
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Points celebrate daily study consistency, completed lessons, and problem sets. Not an academic grade.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToActivity}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-colors shrink-0 cursor-pointer"
          >
            <span>My Activity History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Student KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs font-mono">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Your Class Standing</div>
            <div className="text-lg font-bold text-amber-300 mt-0.5">
              Rank #{stats ? stats.classRank : 5}
            </div>
            <div className="text-[10px] text-slate-500">In {currentClassCode}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Engagement Points</div>
            <div className="text-lg font-bold text-cyan-300 mt-0.5">
              {stats ? stats.totalPoints : 1160} pts
            </div>
            <div className="text-[10px] text-cyan-500/80">+{stats ? stats.pointsThisWeek : 120} this week</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Active Study Streak</div>
            <div className="text-lg font-bold text-orange-400 flex items-center gap-1 mt-0.5">
              <Flame className="w-4 h-4 fill-orange-400" />
              <span>{stats ? stats.streakDays : 5} Days</span>
            </div>
            <div className="text-[10px] text-orange-500/80">Active today</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase">Verified Actions</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {stats?.recentEvents.length || 6} Tasks
            </div>
            <div className="text-[10px] text-emerald-500/80">Lessons & Quizzes</div>
          </div>
        </div>
      </div>

      {/* 3. Controls & Scope Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-800 bg-slate-950 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveScope('class')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeScope === 'class'
                ? 'bg-slate-800 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Class</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScope('cohort')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeScope === 'cohort'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Cohort Grade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScope('school')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeScope === 'school'
                ? 'bg-slate-800 text-purple-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>All Academy</span>
          </button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cadets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* 4. Leaderboard Standings Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono uppercase tracking-wider text-slate-400">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-6 sm:col-span-6 text-left">Cadet</div>
          <div className="col-span-4 sm:col-span-2 text-right">Points</div>
          <div className="hidden sm:block sm:col-span-3 text-right">Streak & Milestone</div>
        </div>

        {/* Table Rows */}
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">
            Loading verified standings...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            No cadets found matching search.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredEntries.map((entry) => {
              const isTop3 = entry.rank <= 3;
              return (
                <div
                  key={entry.studentId}
                  className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors ${
                    entry.isCurrentUser
                      ? 'bg-cyan-950/30 border-l-2 border-cyan-400'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 sm:col-span-1 text-center font-mono">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        entry.rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : entry.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : entry.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {entry.rank}
                    </span>
                  </div>

                  {/* Cadet Name & Badge */}
                  <div className="col-span-6 sm:col-span-6 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-cyan-300 shrink-0">
                      {entry.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${
                          entry.isCurrentUser ? 'text-cyan-200 font-bold' : 'text-white'
                        }`}>
                          {entry.displayName}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate sm:hidden">
                        {entry.streakDays}-day streak · {entry.completedActivitiesCount} tasks
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="col-span-4 sm:col-span-2 text-right font-mono text-xs">
                    <span className="font-bold text-cyan-300 text-sm">{entry.points}</span>
                    <span className="text-slate-500 ml-1">pts</span>
                  </div>

                  {/* Streak & Milestone (Desktop) */}
                  <div className="hidden sm:block sm:col-span-3 text-right font-mono text-xs text-slate-400 truncate">
                    <div className="flex items-center justify-end gap-1.5 text-orange-400/90">
                      <Flame className="w-3.5 h-3.5 fill-orange-400" />
                      <span>{entry.streakDays}-day streak</span>
                    </div>
                    {entry.recentMilestone && (
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
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
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-mono text-slate-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-300">Authoritative Anti-Gaming Policy</span>
          <p className="leading-relaxed text-[11px] text-slate-400">
            Points are awarded strictly once per canonical lesson, completed quiz checkpoint, or submitted coursework. Refreshing pages, repeating actions, or fake timer clicks generate zero points. Private notes, chats, and individual assessment grades are never published.
          </p>
        </div>
      </div>
    </div>
  );
};
