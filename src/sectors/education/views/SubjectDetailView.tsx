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
  ArrowLeft
} from 'lucide-react';

interface SubjectDetailViewProps {
  course: EducationClass;
  assignments: Assignment[];
  onSelectUnit: (unitId: string) => void;
  onOpenLesson: (unitId: string, lessonId: string) => void;
  onNavigateTab: (tab: 'classroom' | 'videos' | 'assignments' | 'knowledge' | 'classes') => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  course,
  assignments,
  onSelectUnit,
  onOpenLesson,
  onNavigateTab
}) => {
  const [notice, setNotice] = useState<string | null>(null);

  const units = course.units || [];
  const courseAssignments = assignments.filter((a) => a.classId === course.id);
  const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
  const completedLessons = units.reduce(
    (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
    0
  );
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleDownload = (title: string) => {
    setNotice(`Downloaded material: ${title}`);
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. Back Navigation & Course Identity */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigateTab('classes')}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Courses</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('classroom')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Join Live Classroom</span>
          </button>
          <button
            onClick={() => onNavigateTab('videos')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span>Course Videos</span>
          </button>
        </div>
      </div>

      {/* 2. Course Header Hero Card */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/50 via-blue-950/30 to-black/70 backdrop-blur-md space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
            <span className="font-bold text-cyan-300">{course.code}</span>
            <span aria-hidden="true" className="text-cyan-500/40">·</span>
            <span>{course.term}</span>
            <span aria-hidden="true" className="text-cyan-500/40">·</span>
            <span>{course.room}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{course.name}</h1>
          <p className="text-xs sm:text-sm text-cyan-100/70 leading-relaxed max-w-2xl">
            {course.description}
          </p>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-cyan-500/15 text-xs font-mono">
          <div>
            <div className="text-[10px] text-cyan-400/50">INSTRUCTOR</div>
            <div className="text-white font-bold truncate">{course.instructorName}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">SCHEDULE</div>
            <div className="text-white font-bold truncate">{course.schedule}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">ENROLLED</div>
            <div className="text-white font-bold truncate">{course.studentCount} Cadets</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">MASTERY</div>
            <div className="text-cyan-300 font-bold truncate">
              {progressPct}% ({completedLessons}/{totalLessons} Done)
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-cyan-950/80 rounded-full h-2 overflow-hidden border border-cyan-500/20 mt-2">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          {notice}
        </div>
      )}

      {/* 3. Section 1: Complete Course Curriculum (Vertical Unit Sequence) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Curriculum Units & Syllabus ({units.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-cyan-400/60">{totalLessons} total lessons</span>
        </div>

        <div className="space-y-4">
          {units.map((unit) => {
            const unitDoneCount = unit.lessons?.filter((l) => l.isCompleted)?.length || 0;
            const unitTotal = unit.lessons?.length || 0;
            const unitPct = unitTotal > 0 ? Math.round((unitDoneCount / unitTotal) * 100) : 0;

            return (
              <div
                key={unit.id}
                className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4"
              >
                {/* Unit Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/70">
                      <span className="font-bold text-cyan-300">Unit {unit.number}</span>
                      <span aria-hidden="true" className="text-cyan-500/40">·</span>
                      <span>~{unit.estimatedHours} Hours</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">{unit.title}</h3>
                    <p className="text-xs text-cyan-100/70 mt-0.5">{unit.description}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-cyan-300">{unitPct}%</div>
                      <div className="text-[10px] font-mono text-cyan-400/50">
                        {unitDoneCount}/{unitTotal} Done
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectUnit(unit.id)}
                      className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Chapter Overview</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lesson Topics List in Unit */}
                <div className="space-y-2">
                  {unit.lessons?.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => onOpenLesson(unit.id, lesson.id)}
                      className="p-3 rounded-lg border border-cyan-500/10 bg-black/30 hover:border-cyan-400/40 hover:bg-cyan-950/20 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {lesson.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-cyan-500/40 flex items-center justify-center shrink-0 text-[10px] font-mono text-cyan-400">
                            {lesson.number}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold font-mono text-white group-hover:text-cyan-200 truncate">
                            {lesson.title}
                          </div>
                          <div className="text-[11px] text-cyan-400/60 font-mono">
                            {lesson.durationMinutes} mins {lesson.videoId && '· Video Lecture Included'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLesson(unit.id, lesson.id);
                        }}
                        className="text-xs font-mono text-cyan-400 hover:text-cyan-200 p-1 flex items-center gap-1 shrink-0"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="hidden sm:inline">Start</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Section 2: Course Materials & Lecture Notes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Course Syllabi & Reference Notes ({course.materials?.length || 0})
            </h2>
          </div>
        </div>

        <div className="space-y-2.5">
          {course.materials?.map((mat) => (
            <div
              key={mat.id}
              className="p-3.5 rounded-xl border border-cyan-500/15 bg-black/40 backdrop-blur-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold text-white truncate">{mat.title}</div>
                  <div className="text-[10px] text-cyan-400/60 font-mono">
                    Size: {mat.size} · Uploaded: {mat.uploadedAt}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(mat.title)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Section 3: Subject Assignments */}
      {courseAssignments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                Active Assignments for {course.code} ({courseAssignments.length})
              </h2>
            </div>
          </div>

          <div className="space-y-2.5">
            {courseAssignments.map((asg) => (
              <div
                key={asg.id}
                className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400/80">
                    <span className="text-amber-400 font-bold">Due {asg.dueDate}</span>
                    <span aria-hidden="true" className="text-cyan-500/40">·</span>
                    <span>Max {asg.maxScore} pts</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{asg.title}</h3>
                  <p className="text-xs text-cyan-100/60 line-clamp-1">{asg.description}</p>
                </div>

                <button
                  onClick={() => onNavigateTab('assignments')}
                  className="px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all shrink-0 self-start sm:self-center cursor-pointer"
                >
                  View Assignment →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
