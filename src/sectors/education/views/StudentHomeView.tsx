import React from 'react';
import type { EducationClass, Assignment, StudentSubmission } from '../../../types/education.ts';
import {
  PlayCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Video,
  Flame,
  Layers,
  Sparkles,
  Calendar,
  Bookmark,
  Trophy,
  Brain,
  Radio
} from 'lucide-react';
import {
  GlassCard,
  Button,
  Badge,
  ProgressIndicator
} from '../../../components/ui/index.ts';

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
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-8">
      {/* 1. Page Header & Atmospheric Context */}
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-neutral-400 tracking-wider uppercase font-medium">
            Cadet Alex Chen <span className="text-neutral-500">·</span> Grade 12 Advanced Physics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-100 tracking-tight">
            Good morning, Alex
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            Here is your curated academic focus and active learning track for today.
          </p>
        </div>

        {/* Consistency & Standings Strip (Level 2 Content Glass, Zero-Pill Metadata) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl glass-level-2 border border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Flame className="w-4 h-4 fill-amber-400/20 text-amber-400" />
              <span className="font-mono tabular-nums">5-Day</span> Study Streak
            </div>
            <span aria-hidden="true" className="text-neutral-600 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5 text-neutral-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Class Rank <strong className="font-mono tabular-nums text-white">#5</strong></span>
              <span className="text-neutral-500 text-[11px]">(PHYS-301)</span>
            </div>
            <span aria-hidden="true" className="text-neutral-600 hidden sm:inline">·</span>
            <div className="text-neutral-300">
              <strong className="font-mono tabular-nums text-white">1,160</strong> pts verified
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateTab('engagement_leaderboard')}
            iconRight={<ArrowRight className="w-3.5 h-3.5 text-neutral-400" />}
            className="self-start sm:self-center text-neutral-300 hover:text-white"
          >
            Standings & History
          </Button>
        </div>
      </div>

      {/* 2. Priority 1: Continue Learning (Dominant Focal Anchor, Lesson Glass with specular highlight) */}
      <GlassCard level="lesson" highlight className="p-6 rounded-2xl space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs">
          <Badge variant="cyan" label="Continue Learning" dot />
          <span className="text-neutral-400 text-xs font-mono">Active Track</span>
        </div>

        <div className="space-y-2">
          {/* Breadcrumb Path: Subject → Chapter → Lesson */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 flex-wrap">
            <span className="font-mono text-neutral-200 font-semibold">{physClass?.code || 'PHYS-301'}</span>
            <span aria-hidden="true" className="text-neutral-600">/</span>
            <span className="text-neutral-300">{physUnit?.title || 'Quantum Harmonic Oscillators'}</span>
            <span aria-hidden="true" className="text-neutral-600">/</span>
            <span className="text-neutral-100 font-medium">{activeLesson?.title || 'Creation & Annihilation Operator Dynamics'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight">
            Lesson {activeLesson?.number || 2}: {activeLesson?.title || 'Creation & Annihilation Operator Dynamics'}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans max-w-2xl">
            {activeLesson?.description ||
              'Derive commutation relations [a, a†] = 1, construct the ladder operator spectrum, and calculate harmonic ground state zero-point energy.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 pt-1">
          <span className="flex items-center gap-1.5 font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            {activeLesson?.durationMinutes || 45} mins
          </span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-neutral-400" />
            Lecture video & transcript included
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          {activeLesson && physUnit && physClass && (
            <Button
              variant="primary"
              size="md"
              onClick={() => onOpenLesson(physClass.id, physUnit.id, activeLesson.id)}
              icon={<PlayCircle className="w-4 h-4 text-cyan-300" />}
            >
              Continue Lesson
            </Button>
          )}

          <Button
            variant="glass"
            size="md"
            onClick={() => onNavigateTab('focus')}
            icon={<Flame className="w-4 h-4 text-amber-400" />}
          >
            Start Focus Session (25m)
          </Button>
        </div>
      </GlassCard>

      {/* 3. Priority 2: Today's Classes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-300" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Today's Schedule ({todayClasses.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('calendar')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Full Schedule</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {todayClasses.map((cls, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl glass-schedule-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono tabular-nums text-white font-semibold">{cls.time}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="font-mono text-neutral-300">{cls.code}</span>
                </div>
                <h3 className="text-sm font-medium text-neutral-100 truncate">{cls.name}</h3>
                <div className="text-xs text-neutral-400 font-mono">{cls.room}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => onNavigateTab('classroom')}
                  icon={<Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
                  className="text-emerald-300 hover:text-emerald-200 border-emerald-500/30"
                >
                  Join Classroom
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelectCourse(cls.classId)}
                >
                  Syllabus
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Priority 3: Due Soon / Pending Work */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Due Soon ({pendingAssignments.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('assignments')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Assignments Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {pendingAssignments.slice(0, 2).map((asg) => (
            <div
              key={asg.id}
              className="p-4 rounded-xl glass-schedule-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-medium text-neutral-300">{asg.className.split(':')[0]}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-amber-400 font-medium">Due {asg.dueDate}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-neutral-400 font-mono tabular-nums">{asg.maxScore} pts</span>
                </div>
                <h3 className="text-sm font-semibold text-neutral-100 truncate">{asg.title}</h3>
                <p className="text-xs text-neutral-400 line-clamp-1">{asg.description}</p>
              </div>

              <Button
                size="sm"
                variant="glass"
                onClick={() => onNavigateTab('assignments')}
                className="text-amber-300 border-amber-500/30 self-start sm:self-center"
              >
                Submit Work
              </Button>
            </div>
          ))}

          {pendingAssignments.length === 0 && (
            <div className="p-4 rounded-xl glass-level-2 border border-emerald-500/20 text-center space-y-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
              <div className="text-xs font-semibold text-emerald-300">All Caught Up!</div>
              <div className="text-[11px] text-neutral-400">No coursework due in the next 48 hours.</div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Priority 4: Your Next Best Action */}
      <GlassCard level="2" className="p-5 border border-cyan-500/20 shadow-[0_4px_20px_-2px_rgba(6,182,212,0.06)] space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Your Next Best Action</span>
        </div>

        <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
          "Review harmonic oscillator ladder commutation relations [a, a†] = 1 for 20 minutes before today's 09:00 AM Physics lecture."
        </p>

        <div className="flex items-center gap-3 pt-1">
          <Button
            size="sm"
            variant="glass"
            onClick={() => onNavigateTab('focus')}
            className="text-neutral-200 border-white/[0.14]"
          >
            Start 20m Focus Session
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateTab('notes')}
          >
            Open Notes & Formulas
          </Button>
        </div>
      </GlassCard>

      {/* 6. Section 5: Course Progression Tracks */}
      <div className="space-y-3 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-neutral-300" />
            <h2 className="text-sm font-semibold text-neutral-200">
              Curriculum Progress ({classes.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('my_learning')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
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
                className="p-3.5 rounded-xl glass-level-2-interactive border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer group space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-neutral-200 font-semibold">{cls.code}</span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="text-neutral-200 font-medium truncate">{cls.name}</span>
                  </div>
                  <div className="text-xs text-neutral-400 shrink-0 font-mono tabular-nums">
                    <span className="text-neutral-200 font-semibold">{progressPct}%</span> ({completedLessons}/{totalLessons} lessons)
                  </div>
                </div>

                <ProgressIndicator value={progressPct} showPercentage={false} size="sm" />
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Section 6: Recent Knowledge & Study Resources */}
      <div className="space-y-3 pt-2 border-t border-white/[0.06]">
        <div className="text-xs font-semibold text-neutral-400 px-1 uppercase tracking-wider font-mono">
          Knowledge & Media Library
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            onClick={() => onNavigateTab('notes')}
            className="p-3.5 rounded-xl glass-level-2-interactive text-left transition-all cursor-pointer group border border-white/[0.06]"
          >
            <Bookmark className="w-4 h-4 text-neutral-300 mb-2" />
            <div className="font-semibold text-neutral-100 group-hover:text-white">Study Notes & Formulas</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Quick formula reference sheet</div>
          </button>

          <button
            onClick={() => onNavigateTab('knowledge')}
            className="p-3.5 rounded-xl glass-level-2-interactive text-left transition-all cursor-pointer group border border-white/[0.06]"
          >
            <Brain className="w-4 h-4 text-neutral-300 mb-2" />
            <div className="font-semibold text-neutral-100 group-hover:text-white">Knowledge Spaces</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Verified textbooks & RAG index</div>
          </button>

          <button
            onClick={() => onNavigateTab('videos')}
            className="p-3.5 rounded-xl glass-level-2-interactive text-left transition-all cursor-pointer group border border-white/[0.06]"
          >
            <Video className="w-4 h-4 text-neutral-300 mb-2" />
            <div className="font-semibold text-neutral-100 group-hover:text-white">Video Library</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Transcript-grounded Q&A</div>
          </button>
        </div>
      </div>
    </div>
  );
};
