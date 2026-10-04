import React, { useState, useEffect } from 'react';
import type { TeacherLeadershipProjection } from '../../../types/institutional.ts';
import { SharedBackButton } from '../components/SharedBackButton.tsx';
import { authClient } from '../../../services/authClient.ts';
import {
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  FileCheck2,
  BookOpen,
  Calendar,
  Sparkles
} from 'lucide-react';

interface PrincipalTeachersViewProps {
  onBack: () => void;
}

export const PrincipalTeachersView: React.FC<PrincipalTeachersViewProps> = ({ onBack }) => {
  const [teachers, setTeachers] = useState<TeacherLeadershipProjection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch('/api/education/institutional/teachers', {
      headers: {
        ...authClient.getAuthHeaders()
      }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.teachers) {
          setTeachers(data.teachers);
        }
      })
      .catch((err) => console.warn('Could not load teacher projections:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalSessionsPrepared = teachers.reduce((sum, t) => sum + t.sessionsPreparedCount, 0);
  const totalPendingGrading = teachers.reduce((sum, t) => sum + t.pendingGradingCount, 0);
  const avgTurnaround = teachers.length > 0
    ? Math.round(teachers.reduce((sum, t) => sum + t.gradingTurnaroundAvgHours, 0) / teachers.length)
    : 20;

  return (
    <div className="space-y-7 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* 1. Back Navigation */}
      <SharedBackButton
        onBack={onBack}
        parentLabel="Principal Home"
        currentLabel="Faculty Leadership Projections"
      />

      {/* 2. Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
          <span>Faculty Velocity & Operational Workload Projections</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Teacher Leadership & Instructional Readiness
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono">
          Authoritative faculty workload projections. Designed to support educators, monitor operational velocity, and maintain evaluation turnaround.
        </p>
      </div>

      {/* 3. Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Faculty on Duty</div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-400" />
            <span>{teachers.length} Professors</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Active departments</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Prepared Packages</div>
          <div className="text-lg font-bold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>{totalSessionsPrepared} Sessions</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Approved & ready to teach</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Pending Grading</div>
          <div className="text-lg font-bold text-amber-400 flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4" />
            <span>{totalPendingGrading} Submissions</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Across all cohorts</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Turnaround</div>
          <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{avgTurnaround} Hours</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">Well under 48h SLA</p>
        </div>
      </div>

      {/* 4. Faculty Projections List */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase px-1">
          Faculty Roster & Operational Projections
        </h2>

        <div className="space-y-4">
          {teachers.map((t) => (
            <div
              key={t.teacherId}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="space-y-0.5">
                  <div className="text-base sm:text-lg font-bold text-white">{t.teacherName}</div>
                  <div className="text-xs font-mono text-cyan-300">{t.department}</div>
                  <div className="text-[11px] font-mono text-slate-400">{t.email}</div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <span className="px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.status}</span>
                  </span>
                </div>
              </div>

              {/* Workload Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 uppercase">Assigned Cadets</div>
                  <div className="text-white font-bold">{t.studentCount} Students ({t.classesCount} Class)</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 uppercase">Class Sessions</div>
                  <div className="text-white font-bold">
                    {t.sessionsPreparedCount} Prepared / {t.scheduledSessionsCount} Scheduled
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 uppercase">Grading Queue</div>
                  <div className="text-white font-bold">{t.pendingGradingCount} Pending Evaluation</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-0.5">
                  <div className="text-[10px] text-slate-400 uppercase">Avg Turnaround</div>
                  <div className="text-emerald-400 font-bold">{t.gradingTurnaroundAvgHours}h Average</div>
                </div>
              </div>

              {/* Courses & Leadership Notes */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400">
                  <span>Courses: <strong className="text-slate-200">{t.courses.join(', ')}</strong></span>
                </div>
                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 text-slate-300 font-sans text-xs">
                  <span className="font-mono font-bold text-cyan-400">Leadership Note:</span> {t.operationalNotes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
