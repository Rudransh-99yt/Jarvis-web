import React, { useState } from 'react';
import type { EducationClass } from '../../../types/education.ts';
import {
  BookOpen,
  Layers,
  Clock,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  Award,
  Sparkles,
  ArrowRight,
  Flame
} from 'lucide-react';

interface StudentMyLearningViewProps {
  classes: EducationClass[];
  onSelectCourse: (courseId: string) => void;
  onSelectUnit: (courseId: string, unitId: string) => void;
  onOpenLesson: (courseId: string, unitId: string, lessonId: string) => void;
}

export const StudentMyLearningView: React.FC<StudentMyLearningViewProps> = ({
  classes,
  onSelectCourse,
  onSelectUnit,
  onOpenLesson
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'in_progress'>('all');

  // Derive immediate next action (first uncompleted lesson across active courses)
  const activeClass = classes.find((c) => c.id === 'class-phys-301') || classes[0];
  const activeUnit = activeClass?.units?.find((u) => u.lessons?.some((l) => !l.isCompleted)) || activeClass?.units?.[0];
  const nextLesson = activeUnit?.lessons?.find((l) => !l.isCompleted) || activeUnit?.lessons?.[0];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
          Curriculum Progression · Fall 2026
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          My Learning Tracks
        </h1>
        <p className="text-xs sm:text-sm text-cyan-100/70 font-mono">
          Pick up where you left off or dive into a specific course syllabus.
        </p>
      </div>

      {/* 2. Primary Next Action Anchor */}
      {activeClass && activeUnit && nextLesson && (
        <div className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-black/60 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">Recommended Next Lesson</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-400/60">
              {activeClass.code} · Unit {activeUnit.number}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg font-bold text-white tracking-tight truncate">
                Lesson {activeUnit.number}.{nextLesson.number}: {nextLesson.title}
              </h2>
              <p className="text-xs text-cyan-100/70 line-clamp-1">
                {nextLesson.description}
              </p>
            </div>

            <button
              onClick={() => onOpenLesson(activeClass.id, activeUnit.id, nextLesson.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all shrink-0 cursor-pointer self-start sm:self-center"
            >
              <PlayCircle className="w-4 h-4 text-cyan-300" />
              <span>Continue Lesson</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Filter Bar & Track Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            Enrolled Course Tracks ({classes.length})
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg border border-cyan-500/20 bg-black/60 font-mono text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-200 font-bold'
                  : 'text-cyan-400/60 hover:text-white'
              }`}
            >
              All Tracks
            </button>
            <button
              onClick={() => setSelectedFilter('in_progress')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                selectedFilter === 'in_progress'
                  ? 'bg-cyan-500/20 text-cyan-200 font-bold'
                  : 'text-cyan-400/60 hover:text-white'
              }`}
            >
              In Progress
            </button>
          </div>
        </div>

        {/* Compact Course Rows (Progressive Disclosure) */}
        <div className="space-y-3">
          {classes.map((cls) => {
            const units = cls.units || [];
            const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
            const completedLessons = units.reduce(
              (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
              0
            );
            const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            const currentUnit = units.find((u) => u.lessons?.some((l) => !l.isCompleted)) || units[0];

            return (
              <div
                key={cls.id}
                onClick={() => onSelectCourse(cls.id)}
                className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 hover:border-cyan-400/35 hover:bg-cyan-950/20 transition-all cursor-pointer group space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
                      <span className="font-bold text-cyan-300">{cls.code}</span>
                      <span aria-hidden="true" className="text-cyan-500/40">·</span>
                      <span>{cls.term}</span>
                      <span aria-hidden="true" className="text-cyan-500/40">·</span>
                      <span className="truncate">{cls.schedule}</span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                      {cls.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <div className="text-right font-mono text-xs hidden sm:block">
                      <div className="text-cyan-300 font-bold">{overallPct}%</div>
                      <div className="text-[10px] text-cyan-400/60">{completedLessons}/{totalLessons} topics</div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1 transition-all">
                      <span>Course Hub</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Current Topic Kicker */}
                <div className="space-y-1.5 pt-1 border-t border-cyan-500/10">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400/60">
                    <span className="truncate">
                      Active: {currentUnit ? `Unit ${currentUnit.number}: ${currentUnit.title}` : 'Syllabus Complete'}
                    </span>
                    <span className="sm:hidden text-cyan-300 font-bold">{overallPct}%</span>
                  </div>
                  <div className="w-full bg-cyan-950/80 rounded-full h-1.5 overflow-hidden border border-cyan-500/20">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
