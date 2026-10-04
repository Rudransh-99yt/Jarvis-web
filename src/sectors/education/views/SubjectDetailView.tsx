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
import { SharedBackButton } from '../components/SharedBackButton.tsx';

interface SubjectDetailViewProps {
  course: EducationClass;
  assignments: Assignment[];
  onSelectUnit: (unitId: string) => void;
  onOpenLesson: (unitId: string, lessonId: string) => void;
  onNavigateTab: (tab: 'classroom' | 'videos' | 'assignments' | 'knowledge' | 'classes' | 'my_learning') => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  course,
  assignments,
  onSelectUnit,
  onOpenLesson,
  onNavigateTab
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
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* 1. Universal Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SharedBackButton
          onBack={() => onNavigateTab('my_learning')}
          parentLabel="My Learning"
          currentLabel={course.name}
          hierarchySegments={[
            { label: 'My Learning', onClick: () => onNavigateTab('my_learning') },
            { label: course.code }
          ]}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('classroom')}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
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
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Syllabus Chapters</div>
            <div className="text-white font-bold">{units.length} Units</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Total Lessons</div>
            <div className="text-cyan-300 font-bold">{totalLessons} Topics</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Curriculum Mastery</div>
            <div className="text-emerald-400 font-bold">{progressPct}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Cohort Schedule</div>
            <div className="text-slate-300 font-bold truncate">{course.schedule.split(' ')[0]}</div>
          </div>
        </div>
      </div>

      {/* 3. Deep Progressive Disclosure Tab Bar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('chapters')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'chapters' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chapters ({units.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Course Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tests' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Assignments & Tests ({courseAssignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'resources' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Formulas & Handouts ({course.materials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'progress' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
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
            <div className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Recommended Next Lesson
                </span>
                <h3 className="text-base font-bold text-white">
                  Lesson {currentChapter.number}.{nextLesson.number}: {nextLesson.title}
                </h3>
                <p className="text-xs text-slate-300">
                  Unit {currentChapter.number}: {currentChapter.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenLesson(currentChapter.id, nextLesson.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-white text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shrink-0"
              >
                <PlayCircle className="w-4 h-4 text-cyan-300" />
                <span>Enter Study Room →</span>
              </button>
            </div>
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
                  <div
                    key={unit.id}
                    onClick={() => onSelectUnit(unit.id)}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-900/90 cursor-pointer transition-all space-y-3 group"
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
                        <span className="text-xs font-mono font-bold text-cyan-300">{uPct}%</span>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {unit.description}
                    </p>

                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${uPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Course Objectives & Curriculum Overview
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {course.description}
          </p>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-mono space-y-2">
            <div className="text-slate-400 font-bold uppercase">Classroom & Meeting Schedule</div>
            <div className="text-white">{course.schedule}</div>
            <div className="text-slate-400">Campus Location: {course.room}</div>
            <div className="text-slate-400">Enrolled Cadets: {course.studentCount} active students</div>
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS & TESTS */}
      {activeTab === 'tests' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Coursework & Problem Sets ({courseAssignments.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('assignments')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              Open Full Ledger →
            </button>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            {courseAssignments.map((asg) => (
              <div key={asg.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-900/40">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-white">{asg.title}</div>
                  <div className="text-xs font-mono text-slate-500">Due {asg.dueDate} · {asg.category}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('assignments')}
                  className="px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700"
                >
                  View Problem
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RESOURCES & HANDOUTS */}
      {activeTab === 'resources' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Course Formula Sheets & Materials
          </h2>
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            {course.materials.map((mat) => (
              <div key={mat.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">{mat.title}</div>
                    <div className="text-xs font-mono text-slate-500">{mat.type} · {mat.size}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(mat.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-mono hover:bg-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MASTERY PROGRESS */}
      {activeTab === 'progress' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Curriculum Completion Progress
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Total Topics Finished</span>
              <span className="text-cyan-300 font-bold">{completedLessons} / {totalLessons} ({progressPct}%)</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
