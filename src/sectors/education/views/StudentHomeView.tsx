import React from 'react';
import type { EducationClass, Assignment, StudentSubmission } from '../../../types/education.ts';
import {
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
  Sparkles,
  Calendar,
  Compass,
  CheckCircle2,
  Bookmark,
  Trophy,
  Award
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
      | 'classes'
      | 'classroom'
      | 'videos'
      | 'assignments'
      | 'knowledge'
      | 'calendar'
      | 'focus'
      | 'workspace'
      | 'notes'
      | 'study_groups'
      | 'engagement_leaderboard'
      | 'engagement_activity'
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

  // Canonical Current Learning Target (Course → Chapter/Unit → Lesson)
  const physClass = classes.find((c) => c.id === 'class-phys-301') || classes[0];
  const physUnit = physClass?.units?.find((u) => u.id === 'unit-phys-2') || physClass?.units?.[0];
  const activeLesson = physUnit?.lessons.find((l) => !l.isCompleted) || physUnit?.lessons[0];

  // Deterministic Today's Schedule for Student
  const todayClasses = [
    {
      time: '09:00 AM',
      code: 'PHYS-301',
      name: 'Advanced Quantum & Classical Electrodynamics',
      room: 'Quantum Hall 4B · SmartBoard Ready',
      classId: 'class-phys-301'
    },
    {
      time: '01:00 PM',
      code: 'MATH-240',
      name: 'Multivariable Calculus & Differential Forms',
      room: 'Turing Annex 201',
      classId: 'class-math-240'
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans">
      {/* 1. Quiet Header & Status */}
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400/80 tracking-wider uppercase font-semibold">
            Cadet Alex Chen · Grade 12 Advanced Physics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Good morning, Alex
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            Here is what you need to focus on next today.
          </p>
        </div>

        {/* Student Personal OS: Engagement & Study Consistency Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400/20" />
              <span className="font-bold">5-Day Study Streak</span>
            </div>
            <span aria-hidden="true" className="text-slate-700 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Class Rank <strong className="text-white">#5</strong></span>
              <span className="text-slate-500 text-[11px]">(PHYS-301)</span>
            </div>
            <span aria-hidden="true" className="text-slate-700 hidden sm:inline">·</span>
            <div className="text-slate-300">
              <strong className="text-cyan-300">1,160</strong> pts verified
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('engagement_leaderboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:text-white text-cyan-300 text-xs font-mono transition-colors cursor-pointer self-start sm:self-center"
          >
            <span>Standings & History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Priority 1: Continue Learning (The Dominant Focal Anchor) */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-black/70 p-6 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.1)] space-y-4">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
            <PlayCircle className="w-3.5 h-3.5 text-cyan-300" />
            <span>Continue Learning</span>
          </div>
          <span className="text-slate-400 text-[11px]">Active Academic Track</span>
        </div>

        <div className="space-y-1.5">
          {/* Breadcrumb Path: Subject → Chapter → Lesson */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300">
            <span className="font-bold">{physClass?.code || 'PHYS-301'}</span>
            <span aria-hidden="true" className="text-slate-600">→</span>
            <span className="text-slate-300">{physUnit?.title || 'Quantum Harmonic Oscillators'}</span>
            <span aria-hidden="true" className="text-slate-600">→</span>
            <span className="text-white font-semibold">{activeLesson?.title || 'Creation & Annihilation Operator Dynamics'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Lesson {activeLesson?.number || 2}: {activeLesson?.title || 'Creation & Annihilation Operator Dynamics'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed font-sans">
            {activeLesson?.description ||
              'Derive commutation relations [a, a†] = 1, construct the ladder operator spectrum, and calculate harmonic ground state zero-point energy.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {activeLesson?.durationMinutes || 45} mins
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            Lecture video & transcript included
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          {activeLesson && physUnit && physClass && (
            <button
              onClick={() => onOpenLesson(physClass.id, physUnit.id, activeLesson.id)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/25 to-blue-500/25 hover:from-cyan-500/35 hover:to-blue-500/35 text-cyan-100 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-cyan-300" />
              <span>Continue Lesson</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('focus')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-cyan-500/25 bg-black/60 hover:bg-cyan-500/10 text-cyan-300 text-xs font-mono tracking-wider transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Start Focus Session (25m)</span>
          </button>
        </div>
      </div>

      {/* 3. Priority 2: Today's Classes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
              Today's Classes ({todayClasses.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Full Schedule</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {todayClasses.map((cls, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-cyan-300">{cls.time}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300 font-semibold">{cls.code}</span>
                </div>
                <h3 className="text-sm font-medium text-white truncate">{cls.name}</h3>
                <div className="text-xs font-mono text-slate-400">{cls.room}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  onClick={() => onNavigateTab('classroom')}
                  className="px-3.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Join Classroom</span>
                </button>
                <button
                  onClick={() => onSelectCourse(cls.classId)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                >
                  <span>Syllabus</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Priority 3: Due Soon / Urgent Work */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
              Due Soon ({pendingAssignments.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('assignments')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Assignments Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {pendingAssignments.slice(0, 2).map((asg) => (
            <div
              key={asg.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-cyan-300">{asg.className.split(':')[0]}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-amber-400 font-semibold">Due {asg.dueDate}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{asg.maxScore} pts</span>
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{asg.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1">{asg.description}</p>
              </div>

              <button
                onClick={() => onNavigateTab('assignments')}
                className="px-4 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-medium tracking-wider transition-all shrink-0 self-start sm:self-center cursor-pointer"
              >
                Submit Work
              </button>
            </div>
          ))}

          {pendingAssignments.length === 0 && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-center space-y-1">
              <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
              <div className="text-xs font-bold text-emerald-300 font-mono">All Caught Up!</div>
              <div className="text-[11px] text-slate-400 font-mono">No coursework due in the next 48 hours.</div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Priority 4: Your Next Best Action */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>Your Next Best Action</span>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          "Review harmonic oscillator ladder commutation relations [a, a†] = 1 for 20 minutes before today's 09:00 AM Physics lecture."
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => onNavigateTab('focus')}
            className="px-4 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
          >
            Start 20m Focus Session
          </button>
          <button
            onClick={() => onNavigateTab('notes')}
            className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
          >
            Open Notes & Formulas
          </button>
        </div>
      </div>

      {/* 6. Section 5: Deeper Academic Progression (Course Tracks) */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
              Curriculum Progress ({classes.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('my_learning')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>My Learning Tracks</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
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
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70 transition-all cursor-pointer group space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-cyan-300 group-hover:text-cyan-200">{cls.code}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-300 font-medium truncate">{cls.name}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 shrink-0">
                    <span className="text-cyan-300 font-bold">{progressPct}%</span> ({completedLessons}/{totalLessons} lessons)
                  </div>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
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

      {/* 7. Section 6: Recent Knowledge & Study Resources */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1 font-semibold">
          Recent Knowledge & Media
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <button
            onClick={() => onNavigateTab('notes')}
            className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70 text-left transition-all cursor-pointer group"
          >
            <Bookmark className="w-4 h-4 text-cyan-400 mb-2" />
            <div className="font-bold text-white group-hover:text-cyan-200">Study Notes & Formulas</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Quick formula reference sheet</div>
          </button>

          <button
            onClick={() => onNavigateTab('knowledge')}
            className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70 text-left transition-all cursor-pointer group"
          >
            <Brain className="w-4 h-4 text-cyan-400 mb-2" />
            <div className="font-bold text-white group-hover:text-cyan-200">Knowledge Spaces</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Verified textbooks & RAG index</div>
          </button>

          <button
            onClick={() => onNavigateTab('videos')}
            className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70 text-left transition-all cursor-pointer group"
          >
            <Video className="w-4 h-4 text-cyan-400 mb-2" />
            <div className="font-bold text-white group-hover:text-cyan-200">Video Library</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Transcript-grounded Q&A</div>
          </button>
        </div>
      </div>
    </div>
  );
};
