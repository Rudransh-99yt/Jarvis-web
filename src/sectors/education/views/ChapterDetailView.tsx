import React, { useState } from 'react';
import type { EducationClass, CourseUnit } from '../../../types/education.ts';
import {
  Layers,
  Clock,
  CheckCircle2,
  PlayCircle,
  Video,
  FileText,
  Brain,
  HelpCircle,
  Radio,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface ChapterDetailViewProps {
  course: EducationClass;
  unit: CourseUnit;
  onOpenLesson: (lessonId: string) => void;
  onBackToCourse: () => void;
  onOpenQuiz?: (quizId: string) => void;
  onLaunchStudyAssistant?: (topic: string) => void;
}

export const ChapterDetailView: React.FC<ChapterDetailViewProps> = ({
  course,
  unit,
  onOpenLesson,
  onBackToCourse,
  onOpenQuiz,
  onLaunchStudyAssistant
}) => {
  const completedCount = unit.lessons?.filter((l) => l.isCompleted)?.length || 0;
  const totalCount = unit.lessons?.length || 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCourse}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {course.code} Course Hub</span>
        </button>

        {onLaunchStudyAssistant && (
          <button
            onClick={() => onLaunchStudyAssistant(unit.title)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Chapter Tutor</span>
          </button>
        )}
      </div>

      {/* 2. Chapter Hero Card */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/50 via-blue-950/30 to-black/70 backdrop-blur-md space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
            <span className="font-bold text-cyan-300">{course.code}</span>
            <span aria-hidden="true" className="text-cyan-500/40">·</span>
            <span>Unit {unit.number}</span>
            <span aria-hidden="true" className="text-cyan-500/40">·</span>
            <span>~{unit.estimatedHours} Hours Required</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{unit.title}</h1>
          <p className="text-xs sm:text-sm text-cyan-100/70 leading-relaxed max-w-2xl">
            {unit.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-cyan-500/15">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-cyan-400/70">Chapter Mastery</span>
            <span className="text-cyan-300 font-bold">
              {progressPct}% ({completedCount}/{totalCount} Lessons Done)
            </span>
          </div>
          <div className="w-full bg-cyan-950/80 rounded-full h-2 overflow-hidden border border-cyan-500/30">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Section 1: Learning Objectives */}
      {unit.learningObjectives && unit.learningObjectives.length > 0 && (
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Chapter Learning Objectives
            </h3>
          </div>

          <div className="space-y-2">
            {unit.learningObjectives.map((obj, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-cyan-500/10 bg-black/30 flex items-start gap-3"
              >
                <div className="h-5 w-5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs text-cyan-100/80 leading-relaxed">{obj}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Section 2: Sequential Lessons (Clean Vertical Rows) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Lessons in this Chapter ({unit.lessons?.length || 0})
            </h2>
          </div>
          <span className="text-xs font-mono text-cyan-400/60">Sequential Study Sequence</span>
        </div>

        <div className="space-y-2.5">
          {unit.lessons?.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => onOpenLesson(lesson.id)}
              className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 hover:border-cyan-400/50 hover:bg-cyan-950/20 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm group"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/70">
                  <span className="font-bold text-cyan-300">
                    Lesson {unit.number}.{lesson.number}
                  </span>
                  <span aria-hidden="true" className="text-cyan-500/40">·</span>
                  <span>{lesson.durationMinutes} mins</span>
                  {lesson.videoId && (
                    <>
                      <span aria-hidden="true" className="text-cyan-500/40">·</span>
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video Included
                      </span>
                    </>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200">
                  {lesson.title}
                </h3>
                <p className="text-xs text-cyan-100/70 line-clamp-1">{lesson.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {lesson.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLesson(lesson.id);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  >
                    <PlayCircle className="w-4 h-4 text-cyan-300" />
                    <span>START LESSON</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
