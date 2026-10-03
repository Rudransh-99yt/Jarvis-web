import React from 'react';
import type { EducationClass, Assignment, StudentSubmission } from '../../../types/education.ts';
import {
  BookOpen,
  Users,
  Clock,
  Award,
  Radio,
  PlusCircle,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface TeacherHomeViewProps {
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  onSelectClass: (classId: string) => void;
  onOpenCreateAssignmentModal: () => void;
  onSelectSubmissionForGrading: (submission: StudentSubmission) => void;
  onNavigateTab: (tab: 'classes' | 'classroom' | 'videos' | 'assignments' | 'knowledge' | 'teacher_session_prep') => void;
}

export const TeacherHomeView: React.FC<TeacherHomeViewProps> = ({
  classes,
  assignments,
  submissions,
  onSelectClass,
  onOpenCreateAssignmentModal,
  onSelectSubmissionForGrading,
  onNavigateTab
}) => {
  const pendingGrading = submissions.filter((s) => s.status === 'submitted');
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
          Faculty Hub · Instructor Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Welcome back, Dr. Sarah
        </h1>
        <p className="text-xs sm:text-sm text-cyan-100/70 font-mono">
          Lead Theoretical Physicist · Managing {classes.length} active classes across {totalStudents} enrolled cadets.
        </p>
      </div>

      {/* 2. Command Hero Card (Vertical Anchor) */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/50 via-indigo-950/30 to-black/80 p-6 backdrop-blur-md shadow-[0_0_25px_rgba(59,130,246,0.12)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Teaching Station Online</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Next Live Lecture: PHYS-301 at 09:00 AM
            </h2>
            <p className="text-xs sm:text-sm text-cyan-100/70">
              Topic: Harmonic Oscillators & Annihilation Algebra (Quantum Hall 4B)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('teacher_session_prep')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-600/40 text-white text-xs font-mono font-bold tracking-wider transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              PREPARE TOMORROW'S CLASS
            </button>
            <button
              onClick={() => onNavigateTab('classroom')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              LAUNCH SMARTBOARD
            </button>
          </div>
        </div>

        {/* Real Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-cyan-500/15 text-xs font-mono">
          <div>
            <div className="text-[10px] text-cyan-400/50">ACTIVE CLASSES</div>
            <div className="text-white font-bold">{classes.length} Courses</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">TOTAL CADETS</div>
            <div className="text-cyan-300 font-bold">{totalStudents} Enrolled</div>
          </div>
          <div>
            <div className="text-[10px] text-amber-400/70">PENDING GRADING</div>
            <div className="text-amber-300 font-bold">{pendingGrading.length} Submissions</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400/70">GRADED WORK</div>
            <div className="text-emerald-300 font-bold">{gradedCount} Completed</div>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Student Grading Queue (Vertical Stream) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Student Grading Queue ({submissions.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('assignments')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            All Submissions <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {submissions.map((sub) => {
            const isPending = sub.status === 'submitted';

            return (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 hover:border-cyan-500/35 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400/80">
                    <span className="font-bold text-white">{sub.studentName}</span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span className="text-cyan-300 font-semibold">{sub.className.split(':')[0]}</span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span className="text-cyan-400/60">Submitted: {sub.submittedAt}</span>
                  </div>
                  <h3 className="text-xs sm:text-sm text-cyan-200 font-semibold truncate">
                    {sub.assignmentTitle}
                  </h3>
                  <p className="text-xs text-cyan-100/60 line-clamp-1 italic">"{sub.content}"</p>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  {isPending ? (
                    <button
                      onClick={() => onSelectSubmissionForGrading(sub)}
                      className="px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Grade Work
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold px-3 py-1 rounded bg-emerald-950/50 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Score: {sub.grade}/100
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Section 2: Managed Classes & Rosters (Vertical Stream) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Managed Teaching Classes ({classes.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('classes')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            Manage Rosters <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => onSelectClass(cls.id)}
              className="p-5 rounded-2xl border border-cyan-500/15 bg-black/40 hover:border-cyan-400/50 hover:bg-cyan-950/20 cursor-pointer transition-all space-y-3 backdrop-blur-sm group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
                    <span className="font-bold text-cyan-300 group-hover:text-cyan-200">{cls.code}</span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span>{cls.room}</span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span>{cls.schedule}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-cyan-100 mt-0.5">
                    {cls.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 group-hover:text-cyan-200">
                  <span>Class Manager</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              <div className="pt-2 border-t border-cyan-500/10 flex items-center justify-between text-xs font-mono text-cyan-400/70">
                <span>{cls.studentCount} Cadets Enrolled</span>
                <span>{cls.units?.length || 0} Units Published · {cls.assignmentsCount} Assignments</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
