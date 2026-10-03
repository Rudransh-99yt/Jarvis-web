import React, { useState } from 'react';
import type { EducationClass, Assignment, StudentSubmission, AcademicInstitution } from '../../../types/education.ts';
import {
  ShieldAlert,
  Building2,
  Users,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  Radio,
  ArrowRight
} from 'lucide-react';

interface PrincipalExecutiveViewProps {
  institution?: AcademicInstitution;
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  onSelectCourse: (courseId: string) => void;
  onNavigateTab: (tab: 'classroom' | 'videos' | 'knowledge' | 'classes') => void;
}

export const PrincipalExecutiveView: React.FC<PrincipalExecutiveViewProps> = ({
  institution,
  classes,
  assignments,
  submissions,
  onSelectCourse,
  onNavigateTab
}) => {
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const totalUnits = classes.reduce((sum, c) => sum + (c.units?.length || 0), 0);
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');
  const pendingGrading = submissions.filter((s) => s.status === 'submitted');

  const avgGrade =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubmissions.length
        )
      : 94;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Academic Leadership · Dean / Executive View</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {institution?.name || 'Stark Academy of Science & Advanced Engineering'}
        </h1>
        <p className="text-xs sm:text-sm text-cyan-100/70 font-mono">
          Academic Cycle {institution?.currentAcademicYear || '2026–2027'} · {institution?.campus || 'Stark R&D Campus Sector 4'}
        </p>
      </div>

      {/* 2. Executive Indicators Hero */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-blue-950/30 to-black/80 p-6 backdrop-blur-md shadow-[0_0_25px_rgba(245,158,11,0.12)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-amber-400">Institutional Performance Status</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              Academic Operations: Nominal
            </h2>
            <p className="text-xs text-cyan-100/70">
              Overseeing {classes.length} active courses across {institution?.grades.length || 3} grade divisions.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('classroom')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer self-start sm:self-center shrink-0"
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            LIVE CLASSROOM MONITOR
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-cyan-500/15 text-xs font-mono">
          <div>
            <div className="text-[10px] text-cyan-400/50">TOTAL CADETS</div>
            <div className="text-white font-bold text-lg">{totalStudents}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">COURSES RUNNING</div>
            <div className="text-cyan-300 font-bold text-lg">{classes.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400/70">AVERAGE MASTERY</div>
            <div className="text-emerald-300 font-bold text-lg">{avgGrade}%</div>
          </div>
          <div>
            <div className="text-[10px] text-amber-400/70">GRADING BACKLOG</div>
            <div className="text-amber-300 font-bold text-lg">{pendingGrading.length}</div>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Academic Course Health (Vertical Stream) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Academic Course Performance ({classes.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-cyan-400/60">Click course for syllabus</span>
        </div>

        <div className="space-y-3">
          {classes.map((cls) => {
            const courseUnits = cls.units || [];
            const totalLessons = courseUnits.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
            const completedLessons = courseUnits.reduce(
              (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
              0
            );
            const courseMastery = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            return (
              <div
                key={cls.id}
                onClick={() => onSelectCourse(cls.id)}
                className="p-5 rounded-2xl border border-cyan-500/15 bg-black/40 hover:border-cyan-400/50 hover:bg-cyan-950/20 cursor-pointer transition-all space-y-3 backdrop-blur-sm group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
                      <span className="font-bold text-cyan-300">{cls.code}</span>
                      <span aria-hidden="true" className="text-cyan-500/40">·</span>
                      <span>Instructor: {cls.instructorName}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white group-hover:text-cyan-200 mt-0.5">
                      {cls.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-cyan-300">{courseMastery}% Mastery</div>
                    <div className="text-[10px] font-mono text-cyan-400/50">
                      {completedLessons}/{totalLessons} Topics Done
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-cyan-950/80 rounded-full h-1.5 overflow-hidden border border-cyan-500/20">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${courseMastery}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70 pt-1 border-t border-cyan-500/10">
                  <span>{cls.studentCount} Cadets Enrolled</span>
                  <span>{courseUnits.length} Units · {cls.assignmentsCount} Assignments</span>
                  <span>{cls.schedule}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Section 2: Grade Level Divisions */}
      {institution?.grades && institution.grades.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Grade Level Cohort Summary
            </h2>
          </div>

          <div className="space-y-2.5">
            {institution.grades.map((grade) => (
              <div
                key={grade.id}
                className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-white text-sm">{grade.name}</div>
                  <div className="text-xs text-cyan-400/60 mt-0.5">
                    {grade.classesCount} Classes · {grade.studentsCount} Students Enrolled
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold">
                  {grade.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
