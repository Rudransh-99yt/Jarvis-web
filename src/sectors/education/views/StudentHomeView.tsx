import React from 'react';
import type { EducationClass, Assignment, StudentSubmission } from '../../../types/education.ts';
import {
  Sparkles,
  PlayCircle,
  Clock,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Radio,
  FileCheck2,
  Brain,
  Video,
  Flame,
  Layers,
  Target,
  Calendar
} from 'lucide-react';

interface StudentHomeViewProps {
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  onSelectCourse: (courseId: string) => void;
  onOpenLesson: (courseId: string, unitId: string, lessonId: string) => void;
  onNavigateTab: (
    tab:
      | 'my_learning'
      | 'classroom'
      | 'videos'
      | 'assignments'
      | 'knowledge'
      | 'calendar'
      | 'focus'
      | 'workspace'
  ) => void;
}

export const StudentHomeView: React.FC<StudentHomeViewProps> = ({
  classes,
  assignments,
  submissions,
  onSelectCourse,
  onOpenLesson,
  onNavigateTab
}) => {
  const submittedIds = new Set(submissions.map((s) => s.assignmentId));
  const pendingAssignments = assignments.filter((a) => !submittedIds.has(a.id));

  // Derive "Continue Learning" target (active lesson in PHYS-301 Unit 2: Quantum Harmonic Oscillators)
  const physClass = classes.find((c) => c.id === 'class-phys-301') || classes[0];
  const physUnit = physClass?.units?.find((u) => u.id === 'unit-phys-2') || physClass?.units?.[0];
  const activeLesson = physUnit?.lessons.find((l) => !l.isCompleted) || physUnit?.lessons[0];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
          Jarvis Education · Cadet Dashboard
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Good morning, Alex Chen
        </h1>
        <p className="text-xs sm:text-sm text-cyan-100/70 font-mono">
          Here is your primary learning path and academic priorities for today.
        </p>
      </div>

      {/* 2. Primary Action: Continue Learning Hero (Vertical Anchor) */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-black/80 p-6 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.12)] space-y-4">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Continue Learning · Academic Streak: 8 Days</span>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-mono text-cyan-300 font-bold">
            {physClass?.code} · {physUnit?.title || 'Unit 2: Quantum Harmonic Oscillators'}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Lesson {activeLesson?.number || 2}: {activeLesson?.title || 'Creation & Annihilation Operator Algebra'}
          </h2>
          <p className="text-xs sm:text-sm text-cyan-100/70 line-clamp-2">
            {activeLesson?.description ||
              'Derive commutation relations [a, a†] = 1, construct the ladder operator spectrum, and calculate harmonic ground state zero-point energy.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-cyan-400/70 pt-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {activeLesson?.durationMinutes || 45} mins
          </span>
          <span aria-hidden="true" className="text-cyan-500/40">·</span>
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            Video Lecture & Transcript Included
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          {activeLesson && physUnit && physClass && (
            <button
              onClick={() => onOpenLesson(physClass.id, physUnit.id, activeLesson.id)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-[1.01] cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-cyan-300 animate-pulse" />
              RESUME LESSON WORKSPACE
            </button>
          )}

          <button
            onClick={() => onNavigateTab('focus')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-cyan-500/30 bg-black/60 hover:bg-cyan-500/10 text-cyan-300 text-xs font-mono tracking-wider transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            START 25-MIN FOCUS BLOCK
          </button>
        </div>
      </div>

      {/* 3. Section 1: Today's Priorities & Urgent Deadlines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Today's Urgent Priorities ({pendingAssignments.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('assignments')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            All Assignments <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {pendingAssignments.slice(0, 3).map((asg) => (
            <div
              key={asg.id}
              className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 hover:border-cyan-500/35 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400/80">
                  <span className="font-bold text-cyan-300">{asg.className.split(':')[0]}</span>
                  <span aria-hidden="true" className="text-cyan-500/40">·</span>
                  <span className="text-amber-400">Due {asg.dueDate}</span>
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{asg.title}</h3>
                <p className="text-xs text-cyan-100/60 line-clamp-1">{asg.description}</p>
              </div>

              <button
                onClick={() => onNavigateTab('assignments')}
                className="px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono tracking-wider transition-all shrink-0 self-start sm:self-center cursor-pointer"
              >
                Submit Work
              </button>
            </div>
          ))}

          {pendingAssignments.length === 0 && (
            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-center space-y-1">
              <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
              <div className="text-xs font-bold text-emerald-300 font-mono">All Caught Up!</div>
              <div className="text-[11px] text-emerald-400/60">No pending assignments due today.</div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Section 2: Enrolled Courses & Curriculum Progress (Vertical Stream) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Enrolled Course Progress ({classes.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('my_learning')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            Full Curriculum Map <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {classes.map((cls) => {
            const units = cls.units || [];
            const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
            const completedLessons = units.reduce(
              (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
              0
            );
            const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            return (
              <div
                key={cls.id}
                onClick={() => onSelectCourse(cls.id)}
                className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 hover:border-cyan-400/50 hover:bg-cyan-950/20 cursor-pointer transition-all space-y-3 backdrop-blur-sm group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-300 group-hover:text-cyan-200">
                        {cls.code}
                      </span>
                      <span aria-hidden="true" className="text-cyan-500/40">·</span>
                      <span className="text-xs font-mono text-cyan-400/60">{cls.instructorName}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-100 mt-0.5">
                      {cls.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono text-cyan-300 font-bold">{progressPct}% Complete</div>
                    <div className="text-[10px] font-mono text-cyan-400/50">
                      {completedLessons}/{totalLessons} Topics Done
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-cyan-950/60 rounded-full h-1.5 overflow-hidden border border-cyan-500/20">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Section 3: Recommended Quick Jump Actions */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-cyan-400/60 px-1">
          Quick Workspaces
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigateTab('classroom')}
            className="p-4 rounded-xl border border-cyan-500/15 bg-black/30 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-left transition-all group cursor-pointer"
          >
            <Radio className="w-4 h-4 text-emerald-400 mb-2 animate-pulse" />
            <div className="text-xs font-bold text-white font-mono">Live Smart Classroom</div>
            <div className="text-[11px] text-cyan-400/60 mt-0.5">Interactive live broadcast</div>
          </button>

          <button
            onClick={() => onNavigateTab('videos')}
            className="p-4 rounded-xl border border-cyan-500/15 bg-black/30 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-left transition-all group cursor-pointer"
          >
            <Video className="w-4 h-4 text-cyan-400 mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-white font-mono">Video Discovery & Q&A</div>
            <div className="text-[11px] text-cyan-400/60 mt-0.5">Transcript-grounded search</div>
          </button>

          <button
            onClick={() => onNavigateTab('workspace')}
            className="p-4 rounded-xl border border-cyan-500/15 bg-black/30 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-left transition-all group cursor-pointer"
          >
            <Brain className="w-4 h-4 text-cyan-400 mb-2 group-hover:scale-105 transition-transform" />
            <div className="text-xs font-bold text-white font-mono">My Study Notes</div>
            <div className="text-[11px] text-cyan-400/60 mt-0.5">Personal formula sheets</div>
          </button>
        </div>
      </div>
    </div>
  );
};
