import React, { useState } from 'react';
import type { ClassSession } from '../../../types/classSession.ts';
import type { EducationClass } from '../../../types/education.ts';
import {
  Sparkles,
  PlusCircle,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Layers,
  ArrowRight,
  Filter,
  FileCheck2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Radio
} from 'lucide-react';

interface TeacherSessionsListViewProps {
  sessions: ClassSession[];
  classes: EducationClass[];
  onStartNewSession: () => void;
  onOpenSession: (sessionId: string) => void;
  onLaunchSmartboard: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const TeacherSessionsListView: React.FC<TeacherSessionsListViewProps> = ({
  sessions,
  classes,
  onStartNewSession,
  onOpenSession,
  onLaunchSmartboard,
  onDeleteSession
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const filteredSessions = sessions.filter((s) => {
    const matchClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter;
    const matchStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;
    return matchClass && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
            <Radio className="w-3.5 h-3.5" />
            <span>LIVE SESSION</span>
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Scheduled</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Approved & Ready</span>
          </span>
        );
      case 'READY_FOR_REVIEW':
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Needs Review</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Header Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div>
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Teacher Preparation · Class Session Manager</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Prepared Class Sessions
          </h1>
          <p className="text-xs sm:text-sm text-cyan-100/70 font-mono mt-1">
            Grounded AI instructional plans, SmartBoard presentations, quizzes, and homework ready for instant classroom execution.
          </p>
        </div>

        <button
          onClick={onStartNewSession}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-600/40 text-white text-xs font-mono font-bold tracking-wider transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-cyan-300" />
          <span>Prepare Tomorrow's Session</span>
        </button>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-cyan-400/60 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/30 text-cyan-200 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All Courses</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.code} · {cls.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/30 text-cyan-200 text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All States</option>
            <option value="APPROVED">Approved</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="READY_FOR_REVIEW">Needs Review</option>
            <option value="LIVE">Live Classroom</option>
          </select>
        </div>

        <span className="text-xs font-mono text-cyan-400/60">
          Showing {filteredSessions.length} session{filteredSessions.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* 3. Session Cards Vertical Stream */}
      {filteredSessions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-black/30 border border-dashed border-cyan-500/20 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-cyan-400/40 mx-auto" />
          <h3 className="text-sm font-bold text-white font-mono">No Prepared Sessions Found</h3>
          <p className="text-xs text-cyan-200/60 font-mono max-w-md mx-auto">
            Attach an NCERT chapter PDF, question paper, or lecture notes to automatically generate a complete classroom instructional package.
          </p>
          <button
            onClick={onStartNewSession}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create First Session</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="p-5 rounded-2xl bg-slate-950/60 border border-cyan-500/20 hover:border-cyan-400/50 hover:bg-slate-900/60 transition-all space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-base font-bold shrink-0">
                    ⚛️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {session.courseCode} · {session.subject}
                      </span>
                      {getStatusBadge(session.status)}
                    </div>
                    <h2 className="text-base font-bold text-white font-mono mt-0.5">
                      {session.topic}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/70">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {session.durationMinutes} mins
                  </span>
                  {session.scheduledAt && (
                    <>
                      <span aria-hidden="true" className="text-cyan-500/30">·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(session.scheduledAt).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Outputs Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-black/30 border border-cyan-500/10 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-200 truncate">
                    {session.lessonPlan ? 'Lesson Plan ✓' : 'No Lesson Plan'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-black/30 border border-cyan-500/10 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-200 truncate">
                    {session.presentation ? `${session.presentation.slides.length} Slides ✓` : 'No Slides'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-black/30 border border-cyan-500/10 flex items-center gap-2">
                  <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-200 truncate">
                    {session.quiz ? `${session.quiz.questions.length}Q Quiz ✓` : 'No Quiz'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-black/30 border border-cyan-500/10 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-200 truncate">
                    {session.homework ? `${session.homework.questions.length}Q Homework ✓` : 'No Homework'}
                  </span>
                </div>
              </div>

              {/* Source Documents & Actions Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400/60 truncate">
                  <span>Grounding:</span>
                  <span className="text-cyan-200 font-semibold truncate max-w-[280px]">
                    {session.sourceMaterials.length > 0
                      ? session.sourceMaterials.map((s) => s.title).join(', ')
                      : 'National Core Curriculum'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenSession(session.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    <span>{session.status === 'READY_FOR_REVIEW' ? 'Review & Edit' : 'View Session'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {['APPROVED', 'SCHEDULED', 'LIVE'].includes(session.status) && (
                    <button
                      onClick={() => onLaunchSmartboard(session.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer"
                      title="Launch directly into Smart Classroom"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>SmartBoard</span>
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/50 cursor-pointer transition-all"
                    title="Delete Session Draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
