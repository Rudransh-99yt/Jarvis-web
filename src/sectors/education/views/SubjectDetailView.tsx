import React, { useState } from 'react';
import type { EducationClass, Assignment } from '../../../types/education.ts';
import {
  BookOpen,
  Calendar,
  MapPin,
  Users,
  Layers,
  FileText,
  Radio,
  Video,
  PlayCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Flame,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { GlassCard, Badge, ProgressIndicator } from '../../../components/ui/index.ts';
import { glassTokens } from '../../../design-system/tokens.ts';

interface SubjectDetailViewProps {
  course: EducationClass;
  assignments: Assignment[];
  onSelectUnit: (unitId: string) => void;
  onOpenLesson: (unitId: string, lessonId: string) => void;
  onNavigateTab: (tab: 'classroom' | 'videos' | 'assignments' | 'knowledge' | 'classes' | 'my_learning') => void;
  onBack?: () => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  course,
  assignments,
  onSelectUnit,
  onOpenLesson,
  onNavigateTab,
  onBack: _onBack
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'tests' | 'resources' | 'progress'>('chapters');
  const [notice, setNotice] = useState<string | null>(null);

  const units = course.units || [];
  const courseAssignments = assignments.filter((a) => a.classId === course.id);
  const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
  const completedLessons = units.reduce(
    (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
    0
  );
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Active chapter & next lesson
  const currentChapter = units.find((u) => u.lessons?.some((l) => !l.isCompleted)) || units[0];
  const nextLesson = currentChapter?.lessons?.find((l) => !l.isCompleted) || currentChapter?.lessons?.[0];

  const handleDownload = (title: string) => {
    setNotice(`Downloaded material: ${title}`);
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-mono text-cyan-400/80">
          Viewing course syllabus: <span className="font-semibold text-cyan-300">{course.code}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('classroom')}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer focus-ring"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Smart Classroom</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{notice}</span>
        </div>
      )}

      {/* 2. Course Header Banner */}
      <GlassCard className="p-6 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="font-bold text-cyan-300">{course.code}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">{course.term}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">Lead Faculty: {course.instructorName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {course.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {course.description}
          </p>
        </div>

        {/* Compact Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06] text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Syllabus Chapters</div>
            <div className="text-white font-bold mt-0.5">{units.length} Units</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Lessons</div>
            <div className="text-cyan-300 font-bold mt-0.5">{totalLessons} Topics</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Curriculum Mastery</div>
            <div className="text-emerald-400 font-bold mt-0.5">{progressPct}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Cohort Schedule</div>
            <div className="text-slate-300 font-bold truncate mt-0.5">{course.schedule.split(' ')[0]}</div>
          </div>
        </div>
      </GlassCard>

      {/* 3. Deep Progressive Disclosure Tab Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md text-xs font-sans">
        <button
          type="button"
          onClick={() => setActiveTab('chapters')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus-ring select-none ${
            activeTab === 'chapters'
              ? 'bg-white/[0.12] text-white font-semibold border-t border-t-white/[0.25] border-x border-x-white/[0.10] border-b border-b-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chapters ({units.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus-ring select-none ${
            activeTab === 'overview'
              ? 'bg-white/[0.12] text-white font-semibold border-t border-t-white/[0.25] border-x border-x-white/[0.10] border-b border-b-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Course Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus-ring select-none ${
            activeTab === 'tests'
              ? 'bg-white/[0.12] text-white font-semibold border-t border-t-white/[0.25] border-x border-x-white/[0.10] border-b border-b-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Assignments & Tests ({courseAssignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus-ring select-none ${
            activeTab === 'resources'
              ? 'bg-white/[0.12] text-white font-semibold border-t border-t-white/[0.25] border-x border-x-white/[0.10] border-b border-b-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Formulas & Handouts ({course.materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus-ring select-none ${
            activeTab === 'progress'
              ? 'bg-white/[0.12] text-white font-semibold border-t border-t-white/[0.25] border-x border-x-white/[0.10] border-b border-b-white/[0.05] shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mastery Progress</span>
        </button>
      </div>

      {/* TAB 1: CHAPTERS INDEX */}
      {activeTab === 'chapters' && (
        <div className="space-y-4">
          {/* Quick Resume Card for Next Lesson */}
          {nextLesson && currentChapter && (
            <GlassCard level="lesson" highlight className="p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Recommended Next Lesson</span>
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Lesson {currentChapter.number}.{nextLesson.number}: {nextLesson.title}
                </h3>
                <p className="text-xs text-neutral-300 font-sans">
                  Unit {currentChapter.number}: {currentChapter.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenLesson(currentChapter.id, nextLesson.id)}
                className="px-5 py-2.5 rounded-xl glass-btn-primary text-xs font-semibold tracking-wider transition-all cursor-pointer shrink-0 focus-ring flex items-center gap-2 shadow-[0_4px_18px_rgba(6,182,212,0.3)]"
              >
                <PlayCircle className="w-4 h-4 text-cyan-200" />
                <span>Enter Study Room →</span>
              </button>
            </GlassCard>
          )}

          {/* Chapters Directory */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
              Curriculum Units ({units.length})
            </h2>

            <div className="space-y-3">
              {units.map((unit) => {
                const uTotal = unit.lessons?.length || 0;
                const uCompleted = unit.lessons?.filter((l) => l.isCompleted)?.length || 0;
                const uPct = uTotal > 0 ? Math.round((uCompleted / uTotal) * 100) : 0;

                return (
                  <GlassCard
                    key={unit.id}
                    onClick={() => onSelectUnit(unit.id)}
                    interactive
                    className="p-5 space-y-3 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                          <span className="font-bold">Unit {unit.number}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400">{uTotal} Lessons</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400">~{unit.estimatedHours}h study</span>
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                          {unit.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-center">
                        <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums">{uPct}%</span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {unit.description}
                    </p>

                    <ProgressIndicator value={uPct} size="sm" />
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSE OVERVIEW */}
      {activeTab === 'overview' && (
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Course Objectives & Curriculum Overview
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {course.description}
          </p>
          <div className="p-4 rounded-xl border border-white/[0.06] bg-slate-950/60 text-xs font-mono space-y-2">
            <div className="text-slate-400 font-bold uppercase">Classroom & Meeting Schedule</div>
            <div className="text-white">{course.schedule}</div>
            <div className="text-slate-400">Campus Location: {course.room}</div>
            <div className="text-slate-400">Enrolled Cadets: {course.studentCount} active students</div>
          </div>
        </GlassCard>
      )}

      {/* TAB 3: ASSIGNMENTS & TESTS */}
      {activeTab === 'tests' && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Coursework & Problem Sets ({courseAssignments.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('assignments')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer focus-ring rounded"
            >
              Open Full Ledger →
            </button>
          </div>

          <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden bg-slate-950/60">
            {courseAssignments.map((asg) => (
              <div key={asg.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-white">{asg.title}</div>
                  <div className="text-xs font-mono text-slate-400">Due {asg.dueDate} · {asg.category}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('assignments')}
                  className="px-3 py-1 rounded-lg border border-white/[0.08] bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700 cursor-pointer focus-ring"
                >
                  View Problem
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* TAB 4: RESOURCES & HANDOUTS */}
      {activeTab === 'resources' && (
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Course Formula Sheets & Materials
          </h2>
          <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden bg-slate-950/60">
            {course.materials.map((mat) => (
              <div key={mat.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">{mat.title}</div>
                    <div className="text-xs font-mono text-slate-400">{mat.type} · {mat.size}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(mat.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-slate-800 text-slate-200 text-xs font-mono hover:bg-slate-700 cursor-pointer focus-ring"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* TAB 5: MASTERY PROGRESS */}
      {activeTab === 'progress' && (
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Curriculum Completion Progress
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Total Topics Finished</span>
              <span className="text-cyan-300 font-bold tabular-nums">{completedLessons} / {totalLessons} ({progressPct}%)</span>
            </div>
            <ProgressIndicator value={progressPct} size="md" />
          </div>
        </GlassCard>
      )}
    </div>
  );
};
