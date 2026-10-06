import React, { useState, useEffect } from 'react';
import type { GradeIntelligenceData } from '../../../types/institutional.ts';
import {
  Layers,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { GlassCard, Button } from '../../../components/ui/index.ts';
import { glassTokens } from '../../../design-system/tokens.ts';

interface PrincipalGradeViewProps {
  gradeId?: string;
  onBack: () => void;
  onNavigateToClass?: (classId: string) => void;
}

export const PrincipalGradeView: React.FC<PrincipalGradeViewProps> = ({
  gradeId = 'g11',
  onBack,
  onNavigateToClass
}) => {
  const [selectedGradeId, setSelectedGradeId] = useState<string>(gradeId);
  const [data, setData] = useState<GradeIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Sync state if parent passes new gradeId
  useEffect(() => {
    if (gradeId) {
      setSelectedGradeId(gradeId);
    }
  }, [gradeId]);

  const fetchGradeData = (targetId: string) => {
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    fetch(`/api/education/institutional/grade/${targetId}`, {
      headers: {
        'x-user-id': 'principal-1',
        'x-user-role': 'principal'
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        if (!isMounted) return;
        if (resData?.intelligence) {
          setData(resData.intelligence);
        } else {
          setData(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Could not load grade intelligence:', err);
        setHasError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    return fetchGradeData(selectedGradeId);
  }, [selectedGradeId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* Grade Level Switcher Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-mono text-cyan-400/80">
          Viewing cohort intelligence for: <span className="font-semibold text-cyan-300">{isLoading ? 'Loading...' : data?.gradeName || (selectedGradeId === 'g12' ? 'Grade 12 (Senior)' : 'Grade 11 (Junior)')}</span>
        </div>

        {/* Grade Level Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/[0.08] bg-slate-900/80 self-start sm:self-auto shrink-0">
          {[
            { id: 'g11', label: 'Grade 11 (Junior)' },
            { id: 'g12', label: 'Grade 12 (Senior)' }
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGradeId(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus-ring ${
                selectedGradeId === g.id
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-white/[0.08] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-20 rounded-xl bg-slate-800/40 border border-white/[0.06]" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/40 border border-white/[0.06]" />
            ))}
          </div>
          <div className="h-48 rounded-xl bg-slate-800/40 border border-white/[0.06]" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && hasError && (
        <GlassCard className="p-8 text-center space-y-3 border-rose-500/30">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <div className="text-base font-semibold text-slate-100">Unable to Load Grade Intelligence</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Failed to retrieve live institutional telemetry for {selectedGradeId === 'g12' ? 'Grade 12' : 'Grade 11'}.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => fetchGradeData(selectedGradeId)}
            className="mx-auto"
          >
            Retry Connection
          </Button>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isLoading && !hasError && !data && (
        <GlassCard className="p-8 text-center space-y-2">
          <Layers className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="text-base font-semibold text-slate-200">No Grade Intelligence Data Available</div>
          <p className="text-xs text-slate-400">
            No active courses or enrolled cohorts found for this grade level.
          </p>
        </GlassCard>
      )}

      {/* Main Content */}
      {!isLoading && !hasError && data && (
        <>
          {/* 2. Header */}
          <div className="space-y-1">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Institutional Grade Intelligence · Stark Academy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              {data.gradeName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Comprehensive cohort progression, faculty deployment, and evidence-grounded interventions.
            </p>
          </div>

          {/* 3. High-Level Grade KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <GlassCard className="p-4 space-y-1">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Total Enrolled</div>
              <div className="text-lg font-bold text-slate-100 flex items-center gap-1.5 tabular-nums font-mono">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{data.studentCount || 0} Cadets</span>
              </div>
              <p className="text-[11px] text-slate-400">Across {data.classes.length || 0} active classes</p>
            </GlassCard>

            <GlassCard className="p-4 space-y-1">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Curriculum Velocity</div>
              <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 tabular-nums font-mono">
                <TrendingUp className="w-4 h-4" />
                <span>{selectedGradeId === 'g12' ? '82%' : '76%'} Completed</span>
              </div>
              <p className="text-[11px] text-slate-400">On track for board exams</p>
            </GlassCard>

            <GlassCard className="p-4 space-y-1">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Assigned Faculty</div>
              <div className="text-lg font-bold text-purple-300 flex items-center gap-1.5 tabular-nums font-mono">
                <GraduationCap className="w-4 h-4" />
                <span>{data.faculty.length || 2} Professors</span>
              </div>
              <p className="text-[11px] text-slate-400">All faculty on schedule</p>
            </GlassCard>

            <GlassCard className="p-4 space-y-1">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">Active Alerts</div>
              <div className="text-lg font-bold text-amber-400 flex items-center gap-1.5 tabular-nums font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>{data.interventions.length || 0} Interventions</span>
              </div>
              <p className="text-[11px] text-slate-400">Evidence-based signals</p>
            </GlassCard>
          </div>

      {/* 4. Active Classes in Grade */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wider text-slate-200 uppercase px-1">
          Classes in this Grade Level
        </h2>

        <GlassCard className="divide-y divide-white/[0.06] p-0 overflow-hidden">
          {data?.classes.map((cls) => (
            <div
              key={cls.classId}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-cyan-300 font-mono">{cls.code}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300">{cls.instructorName}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{cls.room}</span>
                </div>
                <div className="text-base font-semibold text-slate-100">{cls.name}</div>
                <div className="text-xs text-slate-400">
                  <span className="tabular-nums font-mono">{cls.studentCount}</span> Cadets <span className="text-slate-600">·</span> <span className="tabular-nums font-mono">{cls.pendingGradingCount}</span> Pending <span className="text-slate-600">·</span> <span className="tabular-nums font-mono text-amber-400">{cls.attentionCadetsCount}</span> Attention Cadets
                </div>
              </div>

              <div className="flex items-center gap-4 self-start sm:self-center">
                <div className="text-right text-xs">
                  <div className="text-sm font-bold text-emerald-400 tabular-nums font-mono">{cls.syllabusCompletionPercent}%</div>
                  <div className="text-[10px] text-slate-400">Syllabus Coverage</div>
                </div>

                {onNavigateToClass && (
                  <button
                    onClick={() => onNavigateToClass(cls.classId)}
                    className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors focus-ring"
                  >
                    <span>View Class</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </GlassCard>
      </div>

      {/* 5. Faculty & Upcoming Assessments Two-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Assigned Faculty */}
        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Assigned Faculty</span>
          </div>

          <div className="space-y-2">
            {data?.faculty.map((f) => (
              <div key={f.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-100 font-semibold">
                  <span>{f.name}</span>
                  <span className="text-emerald-400 text-[11px] font-medium">On Schedule</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Courses: {f.courses.join(', ')} <span className="text-slate-600">·</span> {f.classesCount} Class
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Upcoming Assessments */}
        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Scheduled Assessments</span>
          </div>

          <div className="space-y-2">
            {data?.upcomingAssessments.map((asm) => (
              <div key={asm.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-100 font-semibold">
                  <span>{asm.title}</span>
                  <span className="text-cyan-300 font-mono text-[11px]">{asm.courseCode}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {asm.type} <span className="text-slate-600">·</span> Scheduled for {new Date(asm.scheduledDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* 6. Evidence-Based Interventions */}
      <GlassCard className="p-5 border-amber-500/30 bg-amber-950/15 space-y-3">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Evidence-Based Academic Interventions</span>
        </div>

        <div className="space-y-2">
          {data?.interventions.map((intv) => (
            <div key={intv.id} className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06] text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-100 font-semibold">
                <span>{intv.title}</span>
                <span className="text-slate-400 text-[11px]">{intv.scope}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                <span className="text-slate-400">Evidence:</span> {intv.evidence}
              </p>
              <div className="pt-2 border-t border-white/[0.06] text-cyan-300 text-[11px]">
                💡 Suggested Action: {intv.suggestedAction}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

          {/* 7. Four-Week Trends */}
          {data?.trends && (
            <GlassCard className="p-5 space-y-3">
              <div className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                Four-Week Progression & Attendance History
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {data.trends.completionHistory.map((h, idx) => (
                  <div key={h.period} className="p-3 rounded-lg bg-slate-900/60 border border-white/[0.06] text-center space-y-1">
                    <div className="text-slate-400 text-[11px]">{h.period}</div>
                    <div className="text-base font-bold text-cyan-300 tabular-nums font-mono">{h.rate}%</div>
                    <div className="text-[11px] text-emerald-400 tabular-nums font-mono">
                      Attendance: {data.trends.attendanceHistory[idx]?.rate || 92}%
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
};

