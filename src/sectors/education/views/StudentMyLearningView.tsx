import React, { useState } from 'react';
import type { EducationClass, CourseUnit } from '../../../types/education.ts';
import {
  Layers,
  Clock,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  Video,
  BookOpen,
  ArrowRight,
  Flame,
  ChevronDown
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
  const [selectedCourseId, setSelectedCourseId] = useState<string>(classes[0]?.id || 'class-phys-301');
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

  const activeCourse = classes.find((c) => c.id === selectedCourseId) || classes[0];
  const units = activeCourse?.units || [];

  const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
  const completedLessons = units.reduce(
    (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
    0
  );
  const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Active chapter and next lesson
  const currentChapter = units.find((u) => u.lessons?.some((l) => !l.isCompleted)) || units[0];
  const nextLesson = currentChapter?.lessons?.find((l) => !l.isCompleted) || currentChapter?.lessons?.[0];

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-cyan-400/80 tracking-wider uppercase font-semibold">
          Curriculum Progression · Canonical Academic Hierarchy
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          My Learning
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono">
          Structured syllabus sequence from Course to Chapter to Lesson.
        </p>
      </div>

      {/* 2. Course Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto text-xs font-mono">
        {classes.map((cls) => {
          const isSelected = cls.id === activeCourse?.id;
          return (
            <button
              key={cls.id}
              onClick={() => {
                setSelectedCourseId(cls.id);
                setExpandedUnitId(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`} />
              <span>{cls.code}</span>
              <span className="text-[10px] text-slate-500">({cls.units?.length || 0} ch)</span>
            </button>
          );
        })}
      </div>

      {/* 3. Course Progression Overview Card */}
      {activeCourse && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-0.5">
              <div className="text-xs font-mono text-cyan-400">
                {activeCourse.code} · {activeCourse.term} · {activeCourse.instructorName}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {activeCourse.name}
              </h2>
            </div>

            <div className="text-right font-mono">
              <div className="text-base font-bold text-cyan-300">{overallPct}% Completed</div>
              <div className="text-xs text-slate-400">
                {completedLessons} of {totalLessons} Lessons Finished
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {/* Current Chapter & Next Lesson Anchor */}
          {currentChapter && nextLesson && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 font-semibold uppercase">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Next Up: Chapter {currentChapter.number}</span>
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  Lesson {currentChapter.number}.{nextLesson.number}: {nextLesson.title}
                </div>
                <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <span>{nextLesson.durationMinutes} mins</span>
                  {nextLesson.videoId && <span>· Video lecture included</span>}
                </div>
              </div>

              <button
                onClick={() => onOpenLesson(activeCourse.id, currentChapter.id, nextLesson.id)}
                className="px-4 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
              >
                <PlayCircle className="w-4 h-4 text-cyan-300" />
                <span>Study Lesson</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Sequential Chapters & Lessons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Course Chapters ({units.length})</span>
          </div>
          <span className="text-xs font-mono text-slate-400">Sequential Syllabus Track</span>
        </div>

        <div className="space-y-3">
          {units.map((unit) => {
            const unitDone = unit.lessons?.filter((l) => l.isCompleted)?.length || 0;
            const unitTotal = unit.lessons?.length || 0;
            const unitPct = unitTotal > 0 ? Math.round((unitDone / unitTotal) * 100) : 0;
            const isExpanded = expandedUnitId === unit.id;

            return (
              <div
                key={unit.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all shadow-sm"
              >
                {/* Chapter Row Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors">
                  <div
                    onClick={() => onSelectUnit(activeCourse.id, unit.id)}
                    className="space-y-1 min-w-0 cursor-pointer flex-1 group"
                  >
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-cyan-300">Chapter {unit.number}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400">~{unit.estimatedHours} hrs</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400">{unitTotal} lessons</span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                      {unit.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-1">
                      {unit.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <div className="text-right font-mono text-xs">
                      <div className="text-cyan-300 font-bold">{unitPct}%</div>
                      <div className="text-[10px] text-slate-500">{unitDone}/{unitTotal} done</div>
                    </div>

                    <button
                      onClick={() => onSelectUnit(activeCourse.id, unit.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                    >
                      Chapter Overview
                    </button>

                    <button
                      onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse lessons' : 'Expand lessons'}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Lessons Sequence */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
                    <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold mb-2">
                      Chapter {unit.number} Lessons
                    </div>

                    {unit.lessons?.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => onOpenLesson(activeCourse.id, unit.id, lesson.id)}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {lesson.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center shrink-0 text-[10px] font-mono text-slate-400">
                              {lesson.number}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-xs font-bold font-mono text-white group-hover:text-cyan-200 truncate">
                              Lesson {unit.number}.{lesson.number}: {lesson.title}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {lesson.durationMinutes} mins {lesson.videoId && '· Video included'}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-mono text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1 shrink-0">
                          <span>Study</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
