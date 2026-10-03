import React from 'react';
import type { EducationClass, Assignment, StudentSubmission } from '../../../types/education.ts';
import { Users, BookOpen, PlusCircle, CheckCircle, Clock, Award, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface TeacherDashboardProps {
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  onNavigateTab: (tab: 'classes' | 'assignments' | 'knowledge' | 'study') => void;
  onOpenCreateAssignmentModal: () => void;
  onSelectSubmissionForGrading: (submission: StudentSubmission) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  classes,
  assignments,
  submissions,
  onNavigateTab,
  onOpenCreateAssignmentModal,
  onSelectSubmissionForGrading
}) => {
  const pendingGrading = submissions.filter((s) => s.status === 'submitted');
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-black/60 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono tracking-wider uppercase mb-1">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Jarvis Academic Workspace // Instructor Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Instructor Command Deck: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Dr. Sarah</span>
            </h1>
            <p className="text-sm text-cyan-100/70 mt-1 max-w-xl">
              Managing <strong className="text-cyan-300">{classes.length} active classes</strong> and {assignments.length} published assignments for Fall 2026.
            </p>
          </div>

          <button
            onClick={onOpenCreateAssignmentModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            CREATE NEW ASSIGNMENT
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>CLASSES TAUGHT</span>
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{classes.length}</div>
          <div className="text-[11px] text-cyan-400/50 mt-1">Physics & Mathematics</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>TOTAL STUDENTS</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 mt-2 font-mono">
            {classes.reduce((sum, c) => sum + c.studentCount, 0)}
          </div>
          <div className="text-[11px] text-cyan-400/50 mt-1">Across all cohorts</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>PENDING GRADING</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2 font-mono">{pendingGrading.length}</div>
          <div className="text-[11px] text-amber-400/50 mt-1">Submissions awaiting review</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>GRADED WORK</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2 font-mono">{gradedCount}</div>
          <div className="text-[11px] text-emerald-400/50 mt-1">Reviewed & feedback returned</div>
        </div>
      </div>

      {/* Main Dual Grid: Submissions to Grade & Managed Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Submissions / Grading Queue */}
        <div className="space-y-6 lg:col-span-7">
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Student Submissions & Grading Queue
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('assignments')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                All Assignments <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {submissions.map((sub) => {
                const isPending = sub.status === 'submitted';

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-lg border border-cyan-500/15 bg-black/30 hover:border-cyan-500/35 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{sub.studentName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                          {sub.className.split(':')[0]}
                        </span>
                      </div>
                      <h3 className="text-xs text-cyan-200 font-semibold">{sub.assignmentTitle}</h3>
                      <p className="text-xs text-cyan-100/60 line-clamp-1 italic">"{sub.content}"</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                      {isPending ? (
                        <button
                          onClick={() => onSelectSubmissionForGrading(sub)}
                          className="px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono tracking-wider transition-all flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Grade Work
                        </button>
                      ) : (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Score: {sub.grade}/100
                          </span>
                          <div className="text-[10px] text-cyan-400/50 font-mono mt-0.5">Feedback returned</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Managed Class Roster */}
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Managed Academic Classes
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('classes')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                Class Manager <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-lg border border-cyan-500/20 bg-gradient-to-b from-blue-950/20 to-black/40 hover:border-cyan-400/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{cls.code}</span>
                    <span className="text-[10px] font-mono text-cyan-400/50">{cls.room}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{cls.name}</h3>
                  <div className="text-xs text-cyan-100/60">{cls.schedule}</div>
                  <div className="pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono text-cyan-400/70">
                    <span>{cls.studentCount} Students Enrolled</span>
                    <span>{cls.assignmentsCount} Assignments</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Published Assignments Overview */}
        <div className="space-y-6 lg:col-span-5">
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Published Assignments
                </h2>
              </div>
              <button
                onClick={onOpenCreateAssignmentModal}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                + Create
              </button>
            </div>

            <div className="space-y-3">
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="p-3.5 rounded-lg border border-cyan-500/10 bg-black/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{asg.title}</span>
                    <span className="text-[10px] font-mono text-cyan-400/60">{asg.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
                    <span>Due: {asg.dueDate}</span>
                    <span>Max: {asg.maxScore} pts</span>
                  </div>
                  <div className="pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-cyan-300">
                      Submissions: <strong>{asg.submittedCount || 0}</strong> / {asg.totalEnrolled || 3}
                    </span>
                    <span className="text-emerald-400">
                      Graded: <strong>{asg.gradedCount || 0}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
