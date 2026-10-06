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
  Sparkles,
  BookOpen,
  Award
} from 'lucide-react';
import { GlassCard, ProgressIndicator } from '../../../components/ui/index.ts';
import { glassTokens } from '../../../design-system/tokens.ts';

interface ChapterDetailViewProps {
  course: EducationClass;
  unit: CourseUnit;
  onOpenLesson: (lessonId: string) => void;
  onBackToCourse: () => void;
  onOpenPractice?: (lessonId: string) => void;
  onOpenQuiz?: (quizId: string) => void;
  onLaunchStudyAssistant?: (topic: string) => void;
}

export const ChapterDetailView: React.FC<ChapterDetailViewProps> = ({
  course,
  unit,
  onOpenLesson,
  onBackToCourse: _onBackToCourse,
  onOpenPractice,
  onOpenQuiz,
  onLaunchStudyAssistant
}) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'practice' | 'overview' | 'resources'>('lessons');

  const completedCount = unit.lessons?.filter((l) => l.isCompleted)?.length || 0;
  const totalCount = unit.lessons?.length || 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      {/* 1. Chapter Header */}
      <GlassCard className="p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="font-bold text-cyan-300">{course.code}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">Unit {unit.number}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">~{unit.estimatedHours} Hours Estimated</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {unit.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {unit.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Chapter Mastery</span>
            <span className="text-cyan-300 font-bold tabular-nums">{completedCount} / {totalCount} Topics Finished ({progressPct}%)</span>
          </div>
          <ProgressIndicator value={progressPct} size="md" />
        </div>
      </GlassCard>

      {/* 3. Progressive Disclosure Tabs */}
      <div className={`flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-white/[0.08] ${glassTokens.level2} font-mono text-xs`}>
        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus-ring ${
            activeTab === 'lessons' ? 'bg-slate-800 text-white font-bold border border-white/[0.08]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Lessons ({totalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus-ring ${
            activeTab === 'practice' ? 'bg-slate-800 text-white font-bold border border-white/[0.08]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Practice & Checkpoints</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus-ring ${
            activeTab === 'overview' ? 'bg-slate-800 text-white font-bold border border-white/[0.08]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Learning Objectives</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus-ring ${
            activeTab === 'resources' ? 'bg-slate-800 text-white font-bold border border-white/[0.08]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Formulas & References</span>
        </button>
      </div>

      {/* TAB 1: LESSONS LIST */}
      {activeTab === 'lessons' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Curriculum Lessons ({totalCount})
            </h2>
            <span className="text-xs font-mono text-slate-500">Click to enter Study Room</span>
          </div>

          <GlassCard className="divide-y divide-white/[0.06] p-0 overflow-hidden shadow-sm">
            {unit.lessons?.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => onOpenLesson(lesson.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.03] cursor-pointer transition-colors group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="pt-0.5">
                    {lesson.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-700 bg-slate-800 inline-block shrink-0" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="font-bold text-cyan-300">Topic {unit.number}.{lesson.number}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {lesson.durationMinutes} min
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-cyan-200 transition-colors">
                      {lesson.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-1">
                      {lesson.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center font-mono text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenPractice) onOpenPractice(lesson.id);
                      else onOpenLesson(lesson.id);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs transition-colors cursor-pointer focus-ring"
                  >
                    Practice
                  </button>

                  <span className="flex items-center gap-1 text-cyan-400 group-hover:text-cyan-300 font-medium">
                    <span>Study Room</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {/* TAB 2: PRACTICE & CHECKPOINTS */}
      {activeTab === 'practice' && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Diagnostic Practice Checkpoints (+10 pts each)
            </h2>
          </div>

          <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden bg-slate-950/60">
            {unit.lessons?.map((lesson) => (
              <div
                key={lesson.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{lesson.title} Checkpoint</div>
                  <div className="text-xs font-mono text-slate-400">Conceptual verification & derivations</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPractice) onOpenPractice(lesson.id);
                    else onOpenLesson(lesson.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-mono cursor-pointer focus-ring"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Practice Test</span>
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* TAB 3: LEARNING OBJECTIVES */}
      {activeTab === 'overview' && (
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Core Unit Objectives & Competencies
          </h2>
          <div className="space-y-2.5">
            {unit.learningObjectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed font-sans">{obj}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* TAB 4: RESOURCES & REFERENCES */}
      {activeTab === 'resources' && (
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Formulas, Reference Readings & Proofs
          </h2>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-slate-950/60 text-xs font-mono space-y-2 text-slate-300">
            <div className="text-cyan-300 font-bold uppercase">Formulas Sheet</div>
            <div>• Time-Dependent Schrödinger: iℏ ∂Ψ/∂t = ĤΨ</div>
            <div>• Probability Density: P(x,t) = |Ψ(x,t)|²</div>
            <div>• Normalization Condition: ∫ |Ψ|² dV = 1</div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
