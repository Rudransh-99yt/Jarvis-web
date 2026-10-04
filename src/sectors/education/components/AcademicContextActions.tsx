// JARVIS EDUCATION OS — PHASE D: ACADEMIC CONTEXT ACTIONS BAR
// Provides seamless "Open in Context" progressive disclosure actions across views.

import React, { useState } from 'react';
import type { AcademicContext, LearningLink } from '../../../types/academicContext.ts';
import {
  Compass,
  BookOpen,
  Timer,
  FileText,
  MessageSquare,
  FileCheck2,
  HelpCircle,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Link2
} from 'lucide-react';

interface AcademicContextActionsProps {
  context?: AcademicContext;
  currentView?: string;
  onNavigate: (view: string, contextPatch?: Partial<AcademicContext>) => void;
  onStartFocusTarget?: (target: {
    type: string;
    id: string;
    title: string;
    courseId?: string;
    courseCode?: string;
    chapterId?: string;
    lessonId?: string;
    context?: string;
  }) => void;
  compact?: boolean;
  className?: string;
}

export const AcademicContextActions: React.FC<AcademicContextActionsProps> = ({
  context,
  currentView,
  onNavigate,
  onStartFocusTarget,
  compact = false,
  className = ''
}) => {
  const [showAllLinks, setShowAllLinks] = useState(false);

  if (!context && !compact) {
    return null;
  }

  const courseCode = context?.courseCode || 'PHYS-301';
  const unitTitle = context?.unitTitle || context?.chapterTitle || 'Quantum Foundations';
  const lessonTitle = context?.lessonTitle || (context?.metadata?.topic as string) || 'Schrödinger Dynamics';

  const handleStartFocus = () => {
    if (onStartFocusTarget) {
      onStartFocusTarget({
        type: context?.lessonId ? 'lesson' : context?.classSessionId ? 'class_session' : 'course',
        id: context?.lessonId || context?.classSessionId || context?.courseId || 'les-phys-101',
        title: lessonTitle,
        courseId: context?.courseId || context?.classId || 'class-phys-301',
        courseCode,
        chapterId: context?.unitId || context?.chapterId,
        lessonId: context?.lessonId,
        context: `${courseCode} · ${lessonTitle}`
      });
    } else {
      onNavigate('focus', context);
    }
  };

  return (
    <div
      className={`rounded-xl border border-cyan-500/20 bg-gradient-to-r from-slate-950/80 via-cyan-950/20 to-black/60 backdrop-blur-md p-2.5 sm:p-3 text-xs font-mono transition-all ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Academic Hierarchy Locus Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-cyan-300 min-w-0 flex-1">
          <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-300">
            <Compass className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>{courseCode}</span>
          </div>

          <ChevronRight className="w-3 h-3 text-cyan-500/50 shrink-0" />
          <span className="text-cyan-100/70 truncate hidden sm:inline max-w-[140px] text-[11px]">
            {unitTitle}
          </span>

          <ChevronRight className="w-3 h-3 text-cyan-500/50 shrink-0 hidden sm:inline" />
          <span className="text-white font-medium truncate max-w-[200px] text-[11px]">
            {lessonTitle}
          </span>
        </div>

        {/* Contextual "Open In..." Actions Strip */}
        <div className="flex items-center flex-wrap gap-1.5 shrink-0">
          {/* Action 1: Study Lesson Workspace */}
          {currentView !== 'lesson_workspace' && (
            <button
              onClick={() => onNavigate('lesson_workspace', context)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-200 text-[11px] transition-all cursor-pointer"
              title="Open full lesson sequence with video, formulas, and practice"
            >
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>Study</span>
            </button>
          )}

          {/* Action 2: Start Context-Aware Focus */}
          {currentView !== 'focus' && (
            <button
              onClick={handleStartFocus}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20 text-amber-200 text-[11px] transition-all cursor-pointer"
              title="Start timed Pomodoro or Study Lock focused on this lesson"
            >
              <Timer className="w-3 h-3 text-amber-400" />
              <span>Focus (25m)</span>
            </button>
          )}

          {/* Action 3: Workspace Notes */}
          {currentView !== 'workspace' && (
            <button
              onClick={() => onNavigate('workspace', context)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-200 text-[11px] transition-all cursor-pointer"
              title="Open Notion-style block editor and notes for this topic"
            >
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>Notes</span>
            </button>
          )}

          {/* Action 4: Community Discussion */}
          {currentView !== 'community' && (
            <button
              onClick={() => onNavigate('community', context)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-200 text-[11px] transition-all cursor-pointer"
              title="Discuss with peers in the course Discord channel"
            >
              <MessageSquare className="w-3 h-3 text-indigo-400" />
              <span>Discuss</span>
            </button>
          )}

          {/* Action 5: Assignment */}
          {currentView !== 'assignments' && (
            <button
              onClick={() => onNavigate('assignments', context)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-200 text-[11px] transition-all cursor-pointer"
              title="View associated homework and problem sets"
            >
              <FileCheck2 className="w-3 h-3 text-emerald-400" />
              <span>Assignment</span>
            </button>
          )}

          {/* Action 6: Knowledge Space / RAG */}
          {currentView !== 'knowledge' && (
            <button
              onClick={() => onNavigate('knowledge', context)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[11px] transition-all cursor-pointer"
              title="Query grounded course textbooks and verified sources"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>Sources</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
