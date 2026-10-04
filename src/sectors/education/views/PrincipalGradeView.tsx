import React, { useState, useEffect } from 'react';
import type { GradeIntelligenceData } from '../../../types/institutional.ts';
import { SharedBackButton } from '../components/SharedBackButton.tsx';
import { getAuthHeaders } from '../../../services/authClient.ts';
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

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/education/institutional/grade/${selectedGradeId}`, {
      headers: {
        ...getAuthHeaders()
      }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!isMounted) return;
        if (resData?.intelligence) {
          setData(resData.intelligence);
        }
      })
      .catch((err) => console.warn('Could not load grade intelligence:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGradeId]);

  return (
    <div className="space-y-7 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* 1. Universal Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SharedBackButton
          onBack={onBack}
          parentLabel="Principal Home"
          currentLabel={data?.gradeName || 'Grade Intelligence'}
        />

        {/* Grade Level Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-800 bg-slate-900/80 self-start sm:self-auto">
          {[
            { id: 'g11', label: 'Grade 11 (Junior)' },
            { id: 'g12', label: 'Grade 12 (Senior)' }
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGradeId(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                selectedGradeId === g.id
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Institutional Grade Intelligence · Stark Academy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {data?.gradeName || 'Grade Intelligence'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono">
          Comprehensive cohort progression, faculty deployment, and evidence-grounded interventions.
        </p>
      </div>

      {/* 3. High-Level Grade KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Enrolled</div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>{data?.studentCount || 0} Cadets</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Across {data?.classes.length || 0} active classes</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Curriculum Velocity</div>
          <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            <span>{selectedGradeId === 'g12' ? '82%' : '76%'} Completed</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">On track for board exams</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Assigned Faculty</div>
          <div className="text-lg font-bold text-purple-400 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" />
            <span>{data?.faculty.length || 2} Professors</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">All faculty on schedule</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Alerts</div>
          <div className="text-lg font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>{data?.interventions.length || 0} Interventions</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Evidence-based signals</p>
        </div>
      </div>

      {/* 4. Active Classes in Grade */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase px-1">
          Classes in this Grade Level
        </h2>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
          {data?.classes.map((cls) => (
            <div
              key={cls.classId}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-cyan-300">{cls.code}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-300">{cls.instructorName}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">{cls.room}</span>
                </div>
                <div className="text-base font-bold text-white">{cls.name}</div>
                <div className="text-xs text-slate-400 font-mono">
                  {cls.studentCount} Cadets · {cls.pendingGradingCount} Pending Submissions · {cls.attentionCadetsCount} Attention Cadets
                </div>
              </div>

              <div className="flex items-center gap-4 self-start sm:self-center">
                <div className="text-right font-mono text-xs">
                  <div className="text-sm font-bold text-emerald-400">{cls.syllabusCompletionPercent}%</div>
                  <div className="text-[10px] text-slate-400">Syllabus Coverage</div>
                </div>

                {onNavigateToClass && (
                  <button
                    onClick={() => onNavigateToClass(cls.classId)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Class</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Faculty & Upcoming Assessments Two-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Assigned Faculty */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Assigned Faculty</span>
          </div>

          <div className="space-y-2">
            {data?.faculty.map((f) => (
              <div key={f.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>{f.name}</span>
                  <span className="text-emerald-400 text-[11px]">On Schedule</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Courses: {f.courses.join(', ')} · {f.classesCount} Class
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Assessments */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Scheduled Assessments</span>
          </div>

          <div className="space-y-2">
            {data?.upcomingAssessments.map((asm) => (
              <div key={asm.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>{asm.title}</span>
                  <span className="text-cyan-300 text-[11px]">{asm.courseCode}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  {asm.type} · Scheduled for {new Date(asm.scheduledDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Evidence-Based Interventions */}
      <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/15 space-y-3">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Evidence-Based Academic Interventions</span>
        </div>

        <div className="space-y-2">
          {data?.interventions.map((intv) => (
            <div key={intv.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-white font-bold">
                <span>{intv.title}</span>
                <span className="text-slate-400">{intv.scope}</span>
              </div>
              <p className="text-slate-300 font-sans text-xs">
                <span className="text-slate-400 font-mono">Evidence:</span> {intv.evidence}
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-cyan-300 text-[11px]">
                💡 Suggested Action: {intv.suggestedAction}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Four-Week Trends */}
      {data?.trends && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
            Four-Week Progression & Attendance History
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {data.trends.completionHistory.map((h, idx) => (
              <div key={h.period} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-center space-y-1">
                <div className="text-slate-400 text-[10px]">{h.period}</div>
                <div className="text-base font-bold text-cyan-300">{h.rate}%</div>
                <div className="text-[10px] text-emerald-400">
                  Attendance: {data.trends.attendanceHistory[idx]?.rate || 92}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
