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
  Radio,
  Users,
  MessageSquare
} from 'lucide-react';
import {
  GlassCard,
  Button,
  Badge,
  ProgressIndicator
} from '../../../components/ui/index.ts';
import { JarvisCore } from '../../../components/brand/JarvisCore.tsx';
import { useMagnificationRail } from '../../../design-system/useMagnification.ts';

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
  onOpenOpeningExperience?: () => void;
}

export const StudentHomeView: React.FC<StudentHomeViewProps> = ({
  classes,
  assignments,
  submissions,
  onSelectCourse,
  onOpenLesson,
  onNavigateTab,
  onOpenOpeningExperience
}) => {
  const {
    containerRef: quickActionsContainerRef,
    registerItem: registerQuickActionRef,
    handlePointerMove: handleQuickActionsPointerMove,
    handlePointerLeave: handleQuickActionsPointerLeave
  } = useMagnificationRail('quickActions');

  const {
    containerRef: tilesContainerRef,
    registerItem: registerTileRef,
    handlePointerMove: handleTilesPointerMove,
    handlePointerLeave: handleTilesPointerLeave
  } = useMagnificationRail('tiles');

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

        {/* Consistency & Standings Strip (Interactive Daily Sync Trigger) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl glass-level-2 border border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <button
              onClick={onOpenOpeningExperience}
              className="flex items-center gap-1.5 text-amber-400 font-medium hover:text-amber-300 transition-colors cursor-pointer group"
              title="Open Daily Sync Protocol & Milestone (Day 5)"
            >
              <Flame className="w-4 h-4 fill-amber-400/20 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="font-mono tabular-nums">5-Day</span> Study Streak
              <Sparkles className="w-3 h-3 text-amber-300 opacity-80" />
            </button>
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

          <div className="flex items-center gap-2 self-start sm:self-center">
            {onOpenOpeningExperience && (
              <Button
                size="sm"
                variant="glass"
                onClick={onOpenOpeningExperience}
                icon={<Sparkles className="w-3 h-3 text-cyan-300" />}
                className="text-cyan-300 hover:text-white"
              >
                Daily Protocol
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigateTab('engagement_leaderboard')}
              iconRight={<ArrowRight className="w-3.5 h-3.5 text-neutral-400" />}
              className="text-neutral-300 hover:text-white"
            >
              Standings
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Priority 1: CURRENT MISSION (Dominant Focal Anchor — Premium Media Learning Object) */}
      <GlassCard level="lesson" highlight className="p-5 sm:p-6 rounded-2xl relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="cyan" label="Current Mission" dot />
            <span className="text-neutral-500 hidden sm:inline">·</span>
            <span className="text-neutral-400 text-xs font-mono hidden sm:inline">PHYS-301 · Unit 2</span>
          </div>
          <span className="text-cyan-300 text-xs font-mono font-semibold tabular-nums">Topic 2.2 · 64% Complete</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left Column: Mission Content & Actions */}
          <div className="md:col-span-7 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 flex-wrap">
                <span className="font-mono text-neutral-200 font-semibold">{physClass?.code || 'PHYS-301'}</span>
                <span aria-hidden="true" className="text-neutral-600">/</span>
                <span className="text-neutral-300">{physUnit?.title || 'Quantum Harmonic Oscillators'}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                {activeLesson?.title || 'Creation & Annihilation Operator Dynamics'}
              </h2>

              <div className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap font-mono">
                <span>Dr. Aris Thorne</span>
                <span className="text-neutral-600">·</span>
                <span>Quantum Mechanics Lab</span>
                <span className="text-neutral-600">·</span>
                <span className="text-amber-400/90 font-medium">Next live session 09:00 AM</span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans pt-0.5">
                {activeLesson?.description ||
                  'Derive commutation relations [a, a†] = 1, construct the ladder operator spectrum, and calculate harmonic ground state zero-point energy.'}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>Lesson Progress: 18m 10s of 28m 40s</span>
                <span className="text-cyan-300 font-semibold">64%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 w-[64%]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {activeLesson && physUnit && physClass && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onOpenLesson(physClass.id, physUnit.id, activeLesson.id)}
                  icon={<PlayCircle className="w-4 h-4 text-cyan-200" />}
                  className="shadow-[0_4px_20px_rgba(6,182,212,0.3)]"
                >
                  Resume Lesson (18:10)
                </Button>
              )}

              <Button
                variant="glass"
                size="md"
                onClick={() => onNavigateTab('focus')}
                icon={<Flame className="w-4 h-4 text-amber-400" />}
              >
                25m Focus Lock
              </Button>

              <Button
                variant="ghost"
                size="md"
                onClick={() => onNavigateTab('notes')}
                icon={<Bookmark className="w-3.5 h-3.5 text-neutral-400" />}
              >
                Notes
              </Button>
            </div>
          </div>

          {/* Right Column: Visual Learning Media Object (Interactive Video / Waveform Canvas Poster) */}
          <div
            onClick={() => activeLesson && physUnit && physClass && onOpenLesson(physClass.id, physUnit.id, activeLesson.id)}
            className="md:col-span-5 relative rounded-xl overflow-hidden border border-white/[0.14] bg-neutral-950/80 shadow-lg group cursor-pointer aspect-video sm:aspect-[4/3] flex flex-col justify-between p-3.5 select-none"
          >
            {/* Background Quantum Harmonic Oscillator Graphic Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.25)_0%,transparent_70%)]" />
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 200 120" preserveAspectRatio="none">
              <path d="M 0 60 Q 30 10, 60 60 T 120 60 T 180 60 T 240 60" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M 0 60 Q 40 20, 80 60 T 160 60 T 240 60" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="100" cy="60" r="14" fill="none" stroke="#22d3ee" strokeWidth="0.75" />
            </svg>

            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/[0.15] text-[10px] font-mono text-cyan-300 uppercase tracking-wider backdrop-blur-md">
                Harmonic Oscillator
              </span>
              <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/[0.15] text-[10px] font-mono text-neutral-300 tabular-nums backdrop-blur-md">
                28:40 HD
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/50 backdrop-blur-md flex items-center justify-center text-cyan-200 group-hover:scale-110 group-hover:bg-cyan-500/30 transition-all shadow-[0_0_24px_rgba(6,182,212,0.4)]">
                <PlayCircle className="w-6 h-6 fill-cyan-400/30 text-white" />
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-neutral-300 bg-black/60 p-1.5 rounded-lg border border-white/[0.08] backdrop-blur-md">
              <span className="truncate">[a, a†] = 1 Derivation</span>
              <span className="text-cyan-300 shrink-0 font-medium">Click to Resume</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 3. Priority 2: NEXT BEST ACTION (Jarvis Intelligence — Confident, Contextual Assistant) */}
      <div className="p-4 sm:p-5 rounded-2xl glass-intelligence border border-white/[0.12] space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <JarvisCore size="xs" state="idle" label="Jarvis Academic Assistant" />
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
              Next Best Action
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">Priority 1 · High Impact</span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-semibold text-white">
            Master Commutation Relations Problem Set [a, a†] = 1
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
            You are already 78% through Chapter 2. Finishing this 15-minute diagnostic checkpoint unlocks Unit 3: Angular Momentum before Friday's lab session.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigateTab('assignments')}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-cyan-100" />}
          >
            Continue Problem Set
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateTab('notes')}
            className="text-neutral-300 hover:text-white"
          >
            Review Derivation Notes
          </Button>
        </div>
      </div>

      {/* 4. Priority 3: FAST ACTIONS (Liquid Glass Proximity Magnification Rail) */}
      <div className="space-y-2 pt-1">
        <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider px-1 font-semibold flex items-center justify-between">
          <span>Fast Actions Dock</span>
          <span className="text-[10px] text-neutral-400">Proximity Rail</span>
        </div>

        <div
          ref={quickActionsContainerRef}
          onPointerMove={handleQuickActionsPointerMove}
          onPointerLeave={handleQuickActionsPointerLeave}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1"
        >
          <div ref={registerQuickActionRef('qa-focus')} className="dock-magnifiable-horizontal shrink-0">
            <button
              onClick={() => onNavigateTab('focus')}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-medium cursor-pointer overflow-hidden group select-none"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>25m Focus Session</span>
            </button>
          </div>

          <div ref={registerQuickActionRef('qa-space')} className="dock-magnifiable-horizontal shrink-0">
            <button
              onClick={() => onNavigateTab('study_groups')}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-medium cursor-pointer overflow-hidden group select-none"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Join Study Space</span>
            </button>
          </div>

          <div ref={registerQuickActionRef('qa-classroom')} className="dock-magnifiable-horizontal shrink-0">
            <button
              onClick={() => onNavigateTab('classroom')}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-medium cursor-pointer overflow-hidden group select-none"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Live Classroom</span>
            </button>
          </div>

          <div ref={registerQuickActionRef('qa-notes')} className="dock-magnifiable-horizontal shrink-0">
            <button
              onClick={() => onNavigateTab('notes')}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-medium cursor-pointer overflow-hidden group select-none"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Bookmark className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Formulas & Notes</span>
            </button>
          </div>

          <div ref={registerQuickActionRef('qa-knowledge')} className="dock-magnifiable-horizontal shrink-0">
            <button
              onClick={() => onNavigateTab('knowledge')}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-medium cursor-pointer overflow-hidden group select-none"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Brain className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span>Knowledge RAG</span>
            </button>
          </div>
        </div>
      </div>

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

      {/* 5. Course Progression Tracks */}
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

      {/* 7. Section 6: Recent Knowledge & Study Resources with Physical Proximity Magnification */}
      <div className="space-y-3 pt-2 border-t border-white/[0.06]">
        <div className="text-xs font-semibold text-neutral-400 px-1 uppercase tracking-wider font-mono">
          Knowledge & Media Library
        </div>
        <div
          ref={tilesContainerRef}
          onPointerMove={handleTilesPointerMove}
          onPointerLeave={handleTilesPointerLeave}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
        >
          <div
            ref={registerTileRef('tile-notes')}
            className="dock-magnifiable-horizontal"
          >
            <button
              onClick={() => onNavigateTab('notes')}
              className="relative w-full h-full p-4 rounded-xl glass-level-2-interactive text-left transition-all cursor-pointer group border border-white/[0.07] shadow-sm overflow-hidden"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Bookmark className="w-4 h-4 text-purple-400 mb-2 transition-transform group-hover:scale-105" />
              <div className="font-semibold text-neutral-100 group-hover:text-white">Study Notes & Formulas</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Quick formula reference sheet</div>
            </button>
          </div>

          <div
            ref={registerTileRef('tile-knowledge')}
            className="dock-magnifiable-horizontal"
          >
            <button
              onClick={() => onNavigateTab('knowledge')}
              className="relative w-full h-full p-4 rounded-xl glass-level-2-interactive text-left transition-all cursor-pointer group border border-white/[0.07] shadow-sm overflow-hidden"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Brain className="w-4 h-4 text-cyan-400 mb-2 transition-transform group-hover:scale-105" />
              <div className="font-semibold text-neutral-100 group-hover:text-white">Knowledge Spaces</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Verified textbooks & RAG index</div>
            </button>
          </div>

          <div
            ref={registerTileRef('tile-videos')}
            className="dock-magnifiable-horizontal"
          >
            <button
              onClick={() => onNavigateTab('videos')}
              className="relative w-full h-full p-4 rounded-xl glass-level-2-interactive text-left transition-all cursor-pointer group border border-white/[0.07] shadow-sm overflow-hidden"
            >
              <div className="dock-specular-sheen" aria-hidden="true" />
              <Video className="w-4 h-4 text-teal-400 mb-2 transition-transform group-hover:scale-105" />
              <div className="font-semibold text-neutral-100 group-hover:text-white">Video Library</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">Transcript-grounded Q&A</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
