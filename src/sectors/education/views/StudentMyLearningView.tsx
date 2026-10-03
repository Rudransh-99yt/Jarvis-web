import React, { useState } from 'react';
import type { EducationClass } from '../../../types/education.ts';
import { BookOpen, Layers, Clock, CheckCircle2, ChevronRight, PlayCircle, Award, Sparkles, Filter } from 'lucide-react';

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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
          Student Curriculum · My Learning Tracks
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Academic Courses & Progressive Mastery
        </h1>
        <p className="text-xs sm:text-sm text-cyan-100/70">
          Track your chapter progression, unit mastery, and enrolled syllabi across all academic departments.
        </p>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg border border-cyan-500/20 bg-black/60 font-mono text-xs w-fit">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            selectedFilter === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
              : 'text-cyan-400/60 hover:text-cyan-200'
          }`}
        >
          All Courses ({classes.length})
        </button>
        <button
          onClick={() => setSelectedFilter('in_progress')}
          className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
            selectedFilter === 'in_progress'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
              : 'text-cyan-400/60 hover:text-cyan-200'
          }`}
        >
          Active Tracks
        </button>
      </div>

      {/* 3. Single Vertical Column of Enrolled Courses */}
      <div className="space-y-6">
        {classes.map((cls) => {
          const units = cls.units || [];
          const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
          const completedLessons = units.reduce(
            (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
            0
          );
          const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

          return (
            <div
              key={cls.id}
              className="p-6 rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4 hover:border-cyan-400/40 transition-all"
            >
              {/* Top Course Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
                    <span className="font-bold text-cyan-300">{cls.code}</span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span>{cls.term}</span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span>{cls.room}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{cls.name}</h2>
                  <div className="text-xs text-cyan-100/60 font-mono">
                    Instructor: {cls.instructorName} · Schedule: {cls.schedule}
                  </div>
                </div>

                <button
                  onClick={() => onSelectCourse(cls.id)}
                  className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all shrink-0 cursor-pointer self-start sm:self-center"
                >
                  <span>Open Course Hub</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Course Overall Progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-cyan-400/70">Mastery Progress</span>
                  <span className="text-cyan-300 font-bold">
                    {overallPct}% ({completedLessons}/{totalLessons} Topics Done)
                  </span>
                </div>
                <div className="w-full bg-cyan-950/60 rounded-full h-2 overflow-hidden border border-cyan-500/20">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>

              {/* Units & Chapters List inside Course */}
              <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                <div className="text-[11px] font-mono text-cyan-400/60 uppercase tracking-wider">
                  Course Chapters ({units.length})
                </div>

                <div className="space-y-2">
                  {units.map((unit) => {
                    const unitCompletedLessons = unit.lessons?.filter((l) => l.isCompleted)?.length || 0;
                    const unitTotal = unit.lessons?.length || 0;
                    const isUnitDone = unit.isCompleted || (unitTotal > 0 && unitCompletedLessons === unitTotal);

                    return (
                      <div
                        key={unit.id}
                        onClick={() => onSelectUnit(cls.id, unit.id)}
                        className="p-3.5 rounded-xl border border-cyan-500/10 bg-black/30 hover:border-cyan-500/35 hover:bg-cyan-950/20 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            {isUnitDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                            )}
                            <span className="text-xs font-mono font-bold text-white group-hover:text-cyan-200 truncate">
                              Unit {unit.number}: {unit.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-cyan-400/60 font-mono pl-6">
                            {unitCompletedLessons}/{unitTotal} topics completed · ~{unit.estimatedHours} hrs
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-cyan-400/60 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
