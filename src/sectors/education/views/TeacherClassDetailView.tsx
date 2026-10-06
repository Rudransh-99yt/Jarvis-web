import React, { useState, useEffect } from 'react';
import type { EducationClass, Assignment, CourseUnit } from '../../../types/education.ts';
import type { ClassIntelligenceData } from '../../../types/teacher.ts';
import type { ClassroomIntelligence } from '../../../types/classroomIntelligence.ts';
import {
  Layers,
  Users,
  Clock,
  Radio,
  PlusCircle,
  FileText,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  History,
  CheckCircle,
  ArrowRight,
  Brain,
  Lightbulb,
  Target,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { ClassMessagingDeck } from './ClassMessagingDeck.tsx';
import { FileUploadModal } from '../../../components/files/FileUploadModal.tsx';
import type { FileRecord } from '../../../types/storage.ts';

interface TeacherClassDetailViewProps {
  course: EducationClass;
  assignments: Assignment[];
  onBackToClasses: () => void;
  onOpenUnit: (unitId: string) => void;
  onOpenCreateUnitModal: () => void;
  onOpenCreateLessonModal: (unitId: string) => void;
  onNavigateTab: (tab: any) => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export type ClassIntelligenceTab =
  | 'overview'
  | 'today'
  | 'teaching'
  | 'students'
  | 'assignments'
  | 'assessments'
  | 'community'
  | 'knowledge'
  | 'history'
  | 'intelligence';

export const TeacherClassDetailView: React.FC<TeacherClassDetailViewProps> = ({
  course,
  assignments,
  onBackToClasses,
  onOpenUnit,
  onOpenCreateUnitModal,
  onOpenCreateLessonModal,
  onNavigateTab,
  onNavigateToContext
}) => {
  const [activeTab, setActiveTab] = useState<ClassIntelligenceTab>('overview');
  const [intelligence, setIntelligence] = useState<ClassIntelligenceData | null>(null);
  const [deepIntelligence, setDeepIntelligence] = useState<ClassroomIntelligence | null>(null);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const units = course.units || [];
  const courseAssignments = assignments.filter((a) => a.classId === course.id);

  // Load authoritative Class Intelligence & Deep Classroom Intelligence
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/education/teacher/class-intelligence/${course.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.intelligence) setIntelligence(data.intelligence);
      })
      .catch((err) => console.warn('Could not load class intelligence:', err));

    fetch(`/api/education/intelligence/classes/${course.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.intelligence) setDeepIntelligence(data.intelligence);
      })
      .catch((err) => console.warn('Could not load deep classroom intelligence:', err));

    return () => {
      isMounted = false;
    };
  }, [course.id]);

  const handleRefreshAiAnalysis = async () => {
    if (!deepIntelligence) return;
    setIsRefreshingAi(true);
    try {
      const res = await fetch(`/api/education/intelligence/sessions/${deepIntelligence.classSessionId}/interpret`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.aiInterpretation) {
          setDeepIntelligence((prev) => (prev ? { ...prev, aiInterpretation: data.aiInterpretation } : null));
          setNotice('AI Pedagogical Analysis re-synthesized from verified classroom evidence.');
          setTimeout(() => setNotice(null), 3500);
        }
      }
    } catch (err) {
      console.error('Failed to refresh AI analysis:', err);
    } finally {
      setIsRefreshingAi(false);
    }
  };

  const handleLaunchSmartBoard = () => {
    onNavigateTab('classroom');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* 1. Class Intelligence Hero Banner */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black/70 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="font-bold text-cyan-300">{course.code}</span>
              <span aria-hidden="true" className="text-cyan-500/40">·</span>
              <span className="text-cyan-400/80">{course.term || 'Fall 2026'}</span>
              <span aria-hidden="true" className="text-cyan-500/40">·</span>
              <span className="text-cyan-400/60">{course.room || 'Quantum Hall 4B'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">{course.name}</h1>
            <p className="text-xs sm:text-sm text-cyan-100/70 max-w-2xl mt-1">{course.description}</p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={handleLaunchSmartBoard}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Launch SmartBoard</span>
            </button>
            <button
              onClick={onOpenCreateUnitModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              <span>Add Chapter</span>
            </button>
          </div>
        </div>

        {/* Operational Overview Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-cyan-500/15 text-xs font-mono">
          <div>
            <div className="text-[10px] text-cyan-400/50 uppercase tracking-wider">Schedule</div>
            <div className="text-white font-bold">{course.schedule}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50 uppercase tracking-wider">Cadets Enrolled</div>
            <div className="text-cyan-300 font-bold">{course.studentCount} Active</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50 uppercase tracking-wider">Curriculum Progress</div>
            <div className="text-cyan-300 font-bold">
              {intelligence?.syllabusCompletionPercent || 25}% Syllabus Covered
            </div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50 uppercase tracking-wider">Active Problem Sets</div>
            <div className="text-cyan-300 font-bold">{courseAssignments.length} Published</div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          {notice}
        </div>
      )}

      {/* 3. Class Intelligence Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-cyan-500/15 pb-2 text-xs font-mono">
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'today', label: 'Today', icon: Clock },
          { id: 'teaching', label: `Teaching (${units.length})`, icon: Layers },
          { id: 'students', label: `Cadets (${course.studentCount})`, icon: Users },
          { id: 'assignments', label: `Assignments (${courseAssignments.length})`, icon: FileSpreadsheet },
          { id: 'assessments', label: 'Assessments', icon: HelpCircle },
          { id: 'intelligence', label: 'Intelligence', icon: Brain },
          { id: 'community', label: 'Comm Link', icon: MessageSquare },
          { id: 'knowledge', label: `Materials (${course.materials?.length || 0})`, icon: FileText },
          { id: 'history', label: 'History', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ClassIntelligenceTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'border border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'border border-cyan-500/15 bg-black/40 text-cyan-400/70 hover:text-cyan-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Surfaces */}

      {/* TAB 1: OVERVIEW — What is happening? What needs attention? What was recently taught? What is coming next? */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Question 1: What is happening today? */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>What is happening today?</span>
            </div>
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">
                  {intelligence?.upcomingClassSession?.topic || 'Harmonic Oscillators & Annihilation Algebra'}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  Scheduled for 09:00 AM in {course.room || 'Quantum Hall 4B'} · Status: APPROVED
                </div>
              </div>
              <button
                onClick={handleLaunchSmartBoard}
                className="px-3.5 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
              >
                Launch SmartBoard
              </button>
            </div>
          </div>

          {/* Question 2: What needs attention? */}
          <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-950/10 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-purple-400" />
                <span>What needs attention? ({intelligence?.attentionCadetsCount || 3} Cadets Detected)</span>
              </div>
              <button
                onClick={() => {
                  if (onNavigateToContext) {
                    onNavigateToContext('teacher_attention', { classId: course.id });
                  } else {
                    onNavigateTab('teacher_attention' as any);
                  }
                }}
                className="text-xs font-mono text-purple-400 hover:text-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View Signals</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-white">Maya Lin</span> · Practice difficulty detected (64% on Operator Algebra)
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Targeted Review
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-white">Marcus Vance</span> · Missed problem set due Oct 2
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Reminder Sent
                </span>
              </div>
            </div>
          </div>

          {/* Question 3: What was recently taught? */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>What was recently taught?</span>
              </div>
              <button
                onClick={() => {
                  if (onNavigateToContext) {
                    onNavigateToContext('teacher_post_class_review', { sessionId: 'session-phys-101' });
                  } else {
                    onNavigateTab('teacher_post_class_review' as any);
                  }
                }}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Post-Class Review</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1.5">
              <div className="text-sm font-bold text-white">
                {intelligence?.recentClassSession?.topic || 'Coulomb’s Law, Electric Fields & Gauss Surface Flux'}
              </div>
              <div className="text-xs font-mono text-slate-400">
                Delivered on Oct 3 · 45 mins · 88% Cadet Attendance · 82% Pulse Quiz Accuracy
              </div>
              <p className="text-xs text-slate-300 pt-1 font-sans">
                Derived Coulomb law vector form and modeled cylindrical Gaussian surface flux.
              </p>
            </div>
          </div>

          {/* Question 4: What is coming next? */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>What is coming next?</span>
              </div>
              <button
                onClick={() => {
                  if (onNavigateToContext) {
                    onNavigateToContext('teacher_session_prep', { classId: course.id });
                  } else {
                    onNavigateTab('teacher_session_prep' as any);
                  }
                }}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>AI Session Prep</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">
                  Lesson 1.2: Gauss Theorem Applications & Conductors
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  Scheduled for tomorrow · NCERT Chapter 1 textbook reference attached
                </div>
              </div>
              <button
                onClick={() => {
                  if (onNavigateToContext) {
                    onNavigateToContext('teacher_session_prep', { classId: course.id });
                  } else {
                    onNavigateTab('teacher_session_prep' as any);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold transition-colors cursor-pointer shrink-0"
              >
                Prepare Next Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TODAY */}
      {activeTab === 'today' && (
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
            <div>
              <h3 className="text-base font-bold text-white font-mono">Today's Class Session</h3>
              <p className="text-xs text-slate-400">PHYS-301 · 09:00 AM - 09:45 AM · Room: {course.room}</p>
            </div>
            <button
              onClick={handleLaunchSmartBoard}
              className="px-4 py-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Start Live Presentation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Preparation</div>
              <div className="text-emerald-400 font-bold mt-0.5">Approved & Ready</div>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Interactive Quiz</div>
              <div className="text-purple-400 font-bold mt-0.5">5 Questions Loaded</div>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="text-[10px] text-slate-500 uppercase">Expected Cadets</div>
              <div className="text-cyan-300 font-bold mt-0.5">{course.studentCount} Cadets</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEACHING (Curriculum Units & Lessons) */}
      {activeTab === 'teaching' && (
        <div className="space-y-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300">UNIT {unit.number}</span>
                    <span className="text-xs font-mono text-cyan-400/50">• {unit.lessons?.length || 0} Lessons</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{unit.title}</h3>
                  <p className="text-xs text-cyan-100/60 mt-0.5">{unit.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenCreateLessonModal(unit.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    + Add Topic
                  </button>
                </div>
              </div>

              {/* Lessons List in Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {unit.lessons?.map((les) => (
                  <div
                    key={les.id}
                    className="p-3 rounded-lg border border-cyan-500/10 bg-black/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-white truncate">
                        {unit.number}.{les.number}: {les.title}
                      </div>
                      <div className="text-[10px] text-cyan-400/60 font-mono">
                        {les.durationMinutes} mins {les.videoId && '• Video Attached'}
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenUnit(unit.id)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-200 p-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {units.length === 0 && (
            <div className="p-8 rounded-xl border border-cyan-500/20 bg-black/30 text-center space-y-3">
              <Layers className="w-8 h-8 text-cyan-400/50 mx-auto" />
              <div className="text-sm font-bold text-white font-mono">No Curriculum Units Created Yet</div>
              <p className="text-xs text-cyan-100/60 max-w-md mx-auto">
                Build your course hierarchy by creating chapters and adding lesson topics with attached videos and notes.
              </p>
              <button
                onClick={onOpenCreateUnitModal}
                className="px-4 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                + Create First Unit
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STUDENTS / ROSTER */}
      {activeTab === 'students' && (
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Enrolled Cadet Roster ({course.studentCount})
            </h3>
            <span className="text-xs font-mono text-cyan-400/60">Cohort: Fall 2026</span>
          </div>

          <div className="space-y-2.5">
            {course.studentIds.map((sid, idx) => (
              <div
                key={sid}
                className="p-3.5 rounded-lg border border-cyan-500/15 bg-black/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center font-mono text-cyan-300 text-xs font-bold">
                    {idx === 0 ? 'AC' : 'ML'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono">
                      {idx === 0 ? 'Alex Chen' : 'Maya Lin'}
                    </div>
                    <div className="text-[10px] text-cyan-400/50 font-mono">
                      ID: {sid} • Department: Applied Physics
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Active & Enrolled
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Course Assignments ({courseAssignments.length})
            </h3>
            <button
              onClick={() => onNavigateTab('assignments')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Assignment Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
            {courseAssignments.map((asg) => (
              <div key={asg.id} className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-mono text-cyan-400 font-bold">Due {asg.dueDate}</div>
                  <div className="text-sm font-bold text-white">{asg.title}</div>
                  <div className="text-xs text-slate-400 font-mono">Max Score: {asg.maxScore} pts</div>
                </div>
                <button
                  onClick={() => onNavigateTab('teacher_review')}
                  className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono transition-colors cursor-pointer"
                >
                  Review Submissions
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ASSESSMENTS */}
      {activeTab === 'assessments' && (
        <div className="p-5 rounded-xl border border-purple-500/20 bg-black/40 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono tracking-wider text-purple-300 uppercase">
              Formative Assessments & Live Quizzes
            </h3>
            <button
              onClick={handleLaunchSmartBoard}
              className="px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 text-xs font-mono cursor-pointer"
            >
              SmartBoard Polls
            </button>
          </div>

          <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 space-y-1">
            <div className="text-sm font-bold text-white">Quantum Annihilation Operator Diagnostic</div>
            <div className="text-xs font-mono text-slate-400">5 Questions · Formative Checkpoint · 82% Class Accuracy</div>
          </div>
        </div>
      )}

      {/* TAB 7: COMMUNITY */}
      {activeTab === 'community' && (
        <ClassMessagingDeck
          currentClass={course}
          currentRole="teacher"
          workspaceId="ws-stark-core"
        />
      )}

      {/* TAB 8: KNOWLEDGE / MATERIALS */}
      {activeTab === 'knowledge' && (
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Course Syllabi & Lecture Notes ({course.materials?.length || 0})
            </h3>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Material
            </button>
          </div>

          <div className="space-y-2.5">
            {course.materials?.map((mat) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-lg border border-cyan-500/10 bg-black/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-mono font-bold text-white">{mat.title}</div>
                    <div className="text-[10px] text-cyan-400/60 font-mono">
                      Size: {mat.size} • Uploaded: {mat.uploadedAt}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: HISTORY */}
      {activeTab === 'history' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
          <h3 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
            Delivered Class Sessions History
          </h3>

          <div className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white">
                Coulomb’s Law, Electric Fields & Gauss Surface Flux
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">
                Delivered on Oct 3, 2026 · 45 mins · 28/32 Cadets Attended
              </div>
            </div>
            <button
              onClick={() => {
                if (onNavigateToContext) {
                  onNavigateToContext('teacher_post_class_review', { sessionId: 'session-phys-101' });
                } else {
                  onNavigateTab('teacher_post_class_review' as any);
                }
              }}
              className="px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-colors cursor-pointer shrink-0"
            >
              View Post-Class Review
            </button>
          </div>
        </div>
      )}

      {/* TAB 10: CLASSROOM INTELLIGENCE */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {/* Header & Evidence Window */}
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/80 via-cyan-950/20 to-black/80 backdrop-blur-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold uppercase tracking-wider">Classroom Intelligence Engine</span>
                  <span className="text-cyan-500/40">·</span>
                  <span className="text-cyan-400/80">{deepIntelligence?.sessionTopic || 'Active Session'}</span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight mt-1">
                  Evidence-Backed Insights & Pedagogical Next Steps
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRefreshAiAnalysis}
                  disabled={isRefreshingAi}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAi ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isRefreshingAi ? 'Analyzing...' : 'Re-Analyze with AI'}</span>
                </button>
              </div>
            </div>

            {/* Evidence Dimensions Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-cyan-500/10 text-xs font-mono">
              {deepIntelligence?.metrics.evidenceDimensions?.map((dim, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/10">
                  <div className="flex items-center justify-between text-[10px] text-cyan-400/60 uppercase">
                    <span>{dim.dimension}</span>
                    <span className={dim.status === 'sufficient' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {dim.status}
                    </span>
                  </div>
                  <div className="text-white font-bold mt-1 text-sm">
                    {dim.scorePercent !== undefined ? `${dim.scorePercent}%` : `${dim.evidenceCount} items`}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5" title={dim.sourceDescription}>
                    {dim.sourceDescription}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1: What Happened (Deterministic Metrics) */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
            <h3 className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>1. Verified Classroom Evidence & Metrics</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Participation</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {deepIntelligence?.metrics.participation.participationRate || 88}%
                </div>
                <div className="text-[10px] text-slate-500">
                  {deepIntelligence?.metrics.participation.activeParticipants || 28}/{deepIntelligence?.metrics.participation.totalEnrolled || 32} cadets present
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Assessment Accuracy</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {deepIntelligence?.metrics.assessment.averageScorePercent || 74}%
                </div>
                <div className="text-[10px] text-slate-500">
                  Median score: {deepIntelligence?.metrics.assessment.medianScorePercent || 76}%
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Board Derivations</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {deepIntelligence?.metrics.board.recognizedFormulasCount || 4} Formulas
                </div>
                <div className="text-[10px] text-slate-500">
                  {deepIntelligence?.metrics.board.releasedPagesCount || 3} pages released to cadets
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Problem Sets</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {deepIntelligence?.metrics.assignments.submissionsCount || 28} Submissions
                </div>
                <div className="text-[10px] text-slate-500">
                  {deepIntelligence?.metrics.assignments.pendingGradingCount || 3} awaiting grading
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: What Students Understood vs Where They Struggled */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm space-y-3">
              <h3 className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Concept Strengths (Mastered)</span>
              </h3>
              <div className="space-y-2">
                {deepIntelligence?.strengths?.map((str, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{str.concept}</span>
                      <span className="text-emerald-400 font-mono">{str.observedMasteryPercent}%</span>
                    </div>
                    <div className="text-[11px] text-emerald-200/70 font-mono">
                      {str.evidenceSummary}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Misconceptions */}
            <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-950/10 backdrop-blur-sm space-y-3">
              <h3 className="text-xs font-mono font-bold tracking-wider text-rose-300 uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Identified Difficulties & Misconceptions</span>
              </h3>
              <div className="space-y-2">
                {deepIntelligence?.misconceptions?.map((misc, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-black/40 border border-rose-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{misc.concept}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono uppercase">
                        {misc.severity} Difficulty
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-200/80 font-mono">
                      <span className="font-bold text-rose-300">OBSERVED: </span>
                      {misc.observedEvidence}
                    </div>
                    {misc.aiHypothesis && (
                      <div className="text-[11px] text-amber-200/80 font-mono bg-amber-950/20 p-2 rounded border border-amber-500/20">
                        <span className="font-bold text-amber-300">AI INFERENCE: </span>
                        {misc.aiHypothesis}
                      </div>
                    )}
                    {misc.suggestedRemediation && (
                      <div className="text-[10px] text-cyan-300 font-mono">
                        Suggested: {misc.suggestedRemediation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Recommended Teacher Actions */}
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-sm space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span>Recommended Pedagogical Actions</span>
            </h3>

            <div className="space-y-2.5">
              {deepIntelligence?.recommendedTeacherActions?.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono uppercase">
                        {act.priority}
                      </span>
                      <span>{act.action}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{act.reason}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (onNavigateToContext) {
                        onNavigateToContext(act.actionTarget, act.contextPatch);
                      } else {
                        onNavigateTab(act.actionTarget as any);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <span>{act.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Carry-Forward Signals for Tomorrow's Session Prep */}
          <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-950/10 backdrop-blur-sm space-y-3">
            <h3 className="text-xs font-mono font-bold tracking-wider text-purple-300 uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Carry-Forward Teaching Signals (Next Session)</span>
            </h3>

            <div className="space-y-2">
              {deepIntelligence?.recommendedNextLessonActions?.map((signal, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-black/40 border border-purple-500/20 space-y-1.5">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Revisit: {signal.concept}</span>
                    <span className="text-[10px] text-purple-300 font-mono">Board Page {signal.recommendedReviewSlideOrBoardPage || 2}</span>
                  </div>
                  <p className="text-[11px] text-purple-200/70 font-mono">{signal.reason}</p>
                  {signal.suggestedDiagnosticQuestions && (
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Diagnostic Prompt: "{signal.suggestedDiagnosticQuestions[0]}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Pedagogical Synthesis Summary */}
          {deepIntelligence?.aiInterpretation && (
            <div className="p-5 rounded-xl border border-cyan-500/20 bg-cyan-950/10 backdrop-blur-sm space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="font-bold uppercase tracking-wider">AI Pedagogical Synthesis</span>
                <span className="text-cyan-500/40">·</span>
                <span className="text-[10px] text-cyan-400/60 font-mono">Model: {deepIntelligence.aiInterpretation.model}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                {deepIntelligence.aiInterpretation.summaryText}
              </p>
              <div className="pt-2 border-t border-cyan-500/10 space-y-1">
                {deepIntelligence.aiInterpretation.pedagogicalAdvice?.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-mono text-cyan-200/80">
                    <span className="text-cyan-400">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(fileRecord: FileRecord) => {
          course.materials.push({
            id: fileRecord.id,
            title: fileRecord.originalName,
            type: fileRecord.extension === 'pdf' ? 'pdf' : 'notes',
            url: `/api/files/${fileRecord.id}/download`,
            uploadedAt: 'Just now',
            size: `${(fileRecord.sizeBytes / 1024).toFixed(1)} KB`
          });
          setNotice(`Uploaded '${fileRecord.originalName}' to course materials.`);
          setTimeout(() => setNotice(null), 3500);
        }}
        workspaceId="ws-stark-core"
        defaultAssociations={{ classId: course.id }}
        title={`Upload Material for ${course.code}`}
        description="Attach PDFs, notes, or reference problem sets to this syllabus."
      />
    </div>
  );
};
