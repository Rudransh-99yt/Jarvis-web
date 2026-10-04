import React, { useState } from 'react';
import type { Assignment, StudentSubmission, EducationRole, EducationClass } from '../../../types/education.ts';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  PlusCircle,
  Send,
  X,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Filter,
  Search,
  BookOpen,
  Timer,
  Award,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface AssignmentsViewProps {
  assignments: Assignment[];
  submissions: StudentSubmission[];
  classes: EducationClass[];
  currentRole: EducationRole;
  onNavigateToContext?: (view: string, context?: any) => void;
  onCreateAssignment: (data: {
    classId: string;
    title: string;
    description: string;
    instructions: string;
    dueDate: string;
    maxScore: number;
    category?: 'Worksheet' | 'Lab Report' | 'Exam' | 'Project';
  }) => void;
  onSubmitWork: (data: {
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    attachments?: Array<{ name: string; size: string }>;
  }) => void;
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  initialCreateModalOpen?: boolean;
  selectedSubmissionForGrading?: StudentSubmission | null;
  onClearSelectedGradingSubmission?: () => void;
}

type SortField = 'dueDate' | 'course' | 'status' | 'title';
type SortOrder = 'asc' | 'desc';

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments,
  submissions,
  classes,
  currentRole,
  onNavigateToContext,
  onCreateAssignment,
  onSubmitWork,
  onGradeSubmission,
  initialCreateModalOpen = false,
  selectedSubmissionForGrading = null,
  onClearSelectedGradingSubmission
}) => {
  const initialAsgId = selectedSubmissionForGrading ? selectedSubmissionForGrading.assignmentId : null;

  const [selectedAsgId, setSelectedAsgId] = useState<string | null>(initialAsgId);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(initialCreateModalOpen);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [gradingSubmission, setGradingSubmission] = useState<StudentSubmission | null>(selectedSubmissionForGrading);

  // Create Assignment Form State
  const [newTitle, setNewTitle] = useState('');
  const [newClassId, setNewClassId] = useState(classes[0]?.id || '');
  const [newCategory, setNewCategory] = useState<'Worksheet' | 'Lab Report' | 'Exam' | 'Project'>('Worksheet');
  const [newDueDate, setNewDueDate] = useState('2026-10-24');
  const [newMaxScore, setNewMaxScore] = useState(100);
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  // Student Submit Form State
  const [studentContent, setStudentContent] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');

  // Teacher Grade Form State
  const [gradeScore, setGradeScore] = useState<number>(95);
  const [gradeFeedback, setGradeFeedback] = useState<string>('Excellent analytical work and clear step-by-step derivation.');

  const selectedAsg = assignments.find((a) => a.id === selectedAsgId) || null;
  const userSubmission = selectedAsg
    ? submissions.find((s) => s.assignmentId === selectedAsg.id && s.studentId === 'student-1')
    : null;
  const asgSubmissions = selectedAsg
    ? submissions.filter((s) => s.assignmentId === selectedAsg.id)
    : [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstructions.trim()) return;

    onCreateAssignment({
      classId: newClassId,
      title: newTitle.trim(),
      description: newDescription.trim() || newTitle.trim(),
      instructions: newInstructions.trim(),
      dueDate: newDueDate,
      maxScore: Number(newMaxScore),
      category: newCategory
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewInstructions('');
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsg || !studentContent.trim()) return;

    onSubmitWork({
      assignmentId: selectedAsg.id,
      studentId: 'student-1',
      studentName: 'Alex Chen',
      content: studentContent.trim(),
      attachments: attachedFileName ? [{ name: attachedFileName, size: '1.4 MB' }] : undefined
    });

    setIsSubmitModalOpen(false);
    setStudentContent('');
    setAttachedFileName('');
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    onGradeSubmission(gradingSubmission.id, gradeScore, gradeFeedback);
    setGradingSubmission(null);
    if (onClearSelectedGradingSubmission) {
      onClearSelectedGradingSubmission();
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Resolve Linked Lesson name if available
  const getLinkedLessonName = (asg: Assignment) => {
    if (asg.lessonId) {
      const cls = classes.find((c) => c.id === asg.classId);
      if (cls && cls.units) {
        for (const u of cls.units) {
          const l = u.lessons?.find((les) => les.id === asg.lessonId);
          if (l) return `Lesson ${u.number}.${l.number}: ${l.title}`;
        }
      }
      return 'Unit 1 · Foundation Lesson';
    }
    return 'Unit Practice Set';
  };

  // Filtered & Sorted Assignments
  const filteredAssignments = assignments
    .filter((asg) => {
      const sub = submissions.find((s) => s.assignmentId === asg.id && s.studentId === 'student-1');
      const matchesSearch =
        asg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asg.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asg.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (courseFilter !== 'all' && asg.classId !== courseFilter) return false;

      if (filterMode === 'pending') {
        return !sub || sub.status === 'submitted';
      }
      if (filterMode === 'submitted') {
        return sub && sub.status === 'submitted';
      }
      if (filterMode === 'graded') {
        return sub && sub.status === 'graded';
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'dueDate') {
        comparison = a.dueDate.localeCompare(b.dueDate);
      } else if (sortField === 'course') {
        comparison = a.className.localeCompare(b.className);
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'status') {
        const subA = submissions.find((s) => s.assignmentId === a.id && s.studentId === 'student-1');
        const subB = submissions.find((s) => s.assignmentId === b.id && s.studentId === 'student-1');
        const statusWeight = (s?: StudentSubmission) => (!s ? 0 : s.status === 'submitted' ? 1 : 2);
        comparison = statusWeight(subA) - statusWeight(subB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Academic Assessment Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Assignments & Coursework
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {currentRole === 'teacher'
              ? 'Review submissions, evaluate cadet responses, and distribute assessments.'
              : 'Track deadlines, complete problem sets, and enter focused study blocks.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {currentRole === 'teacher' && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <PlusCircle className="w-4 h-4 text-cyan-300" />
              <span>+ Create Assignment</span>
            </button>
          )}

          {selectedAsgId && (
            <button
              type="button"
              onClick={() => setSelectedAsgId(null)}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Content Surface */}
      {selectedAsg ? (
        /* DEDICATED ASSIGNMENT DETAIL WORKSPACE */
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-6 animate-fade-in">
          {/* Header Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="font-bold text-cyan-300">{selectedAsg.className.split(':')[0]}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-400">{selectedAsg.category}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-amber-400">Due {selectedAsg.dueDate}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {selectedAsg.title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToContext) {
                    onNavigateToContext('focus', {
                      classId: selectedAsg.classId,
                      assignmentId: selectedAsg.id,
                      topic: selectedAsg.title
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-mono transition-colors"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Start Focus (45m)</span>
              </button>

              {onNavigateToContext && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToContext('lesson_workspace', {
                      classId: selectedAsg.classId,
                      courseId: selectedAsg.classId,
                      unitId: selectedAsg.unitId || 'unit-phys-1',
                      lessonId: selectedAsg.lessonId || 'les-phys-101'
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Lesson</span>
                </button>
              )}

              <div className="text-right font-mono shrink-0 pl-2">
                <div className="text-sm font-bold text-cyan-300">{selectedAsg.maxScore} Max Points</div>
              </div>
            </div>
          </div>

          {/* Description & Problem Instructions */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Problem Statement & Instructions
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                {selectedAsg.instructions}
              </p>
            </div>
          </div>

          {/* Student Submission Card */}
          {currentRole === 'student' && (
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Your Submission Status
                  </span>
                </div>

                {userSubmission ? (
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    userSubmission.status === 'graded'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {userSubmission.status === 'graded' ? `Graded: ${userSubmission.grade} / ${selectedAsg.maxScore}` : 'Submitted'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Not Submitted
                  </span>
                )}
              </div>

              {userSubmission ? (
                <div className="space-y-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                    <div className="text-slate-400">Response:</div>
                    <div className="text-white font-sans text-sm">{userSubmission.content}</div>
                  </div>

                  {userSubmission.feedback && (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 space-y-1">
                      <div className="text-emerald-400 font-bold">Faculty Feedback:</div>
                      <div className="text-emerald-200 font-sans text-sm">{userSubmission.feedback}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-400">
                    Submit your solution equations, derivation steps, and answer explanations.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Work</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Teacher Grading View */}
          {currentRole === 'teacher' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Cadet Submissions ({asgSubmissions.length})
              </h3>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                {asgSubmissions.map((sub) => (
                  <div key={sub.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white font-mono">{sub.studentName}</div>
                      <div className="text-xs text-slate-400 font-mono italic">"{sub.content}"</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.status === 'graded' ? (
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {sub.grade} / {selectedAsg.maxScore} pts
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGradingSubmission(sub)}
                          className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono cursor-pointer"
                        >
                          Review & Grade
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ACADEMIC LEDGER TABULAR VIEW */
        <div className="space-y-4">
          {/* Controls Bar: Filters & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({assignments.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('pending')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'pending' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('submitted')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'submitted' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Submitted
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('graded')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'graded' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Graded
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Course filter dropdown */}
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="all">All Courses</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
          </div>

          {/* Tabular Ledger */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <button
                type="button"
                onClick={() => toggleSort('title')}
                className="col-span-4 text-left flex items-center gap-1 hover:text-cyan-300 transition-colors"
              >
                <span>Assignment & Category</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => toggleSort('course')}
                className="col-span-2 text-left flex items-center gap-1 hover:text-cyan-300 transition-colors"
              >
                <span>Course</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => toggleSort('dueDate')}
                className="col-span-2 text-left flex items-center gap-1 hover:text-cyan-300 transition-colors"
              >
                <span>Due Date</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => toggleSort('status')}
                className="col-span-2 text-left flex items-center gap-1 hover:text-cyan-300 transition-colors"
              >
                <span>Status & Points</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <div className="col-span-2 text-right">Context Actions</div>
            </div>

            {/* Table Rows */}
            {filteredAssignments.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-mono font-bold text-slate-300">No Assignments Match Filter</div>
                <div className="text-xs text-slate-500 font-mono">
                  {searchQuery ? `No results for "${searchQuery}".` : 'No assignments in this ledger view.'}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredAssignments.map((asg) => {
                  const sub = submissions.find((s) => s.assignmentId === asg.id && s.studentId === 'student-1');
                  const linkedLesson = getLinkedLessonName(asg);

                  return (
                    <div
                      key={asg.id}
                      className="p-4 sm:p-5 md:grid md:grid-cols-12 gap-3 items-center hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Column 1: Assignment Title & Category */}
                      <div
                        onClick={() => setSelectedAsgId(asg.id)}
                        className="md:col-span-4 space-y-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            {asg.category}
                          </span>
                          <span className="text-xs text-slate-400 font-mono truncate">
                            {linkedLesson}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors truncate">
                          {asg.title}
                        </h3>
                      </div>

                      {/* Column 2: Course */}
                      <div className="md:col-span-2 text-xs font-mono text-slate-300 truncate">
                        <span className="font-bold text-cyan-400">{asg.className.split(':')[0]}</span>
                        <div className="text-[11px] text-slate-500 truncate">{asg.className.split(':')[1] || ''}</div>
                      </div>

                      {/* Column 3: Due Date */}
                      <div className="md:col-span-2 text-xs font-mono text-amber-400/90 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                        <span>{asg.dueDate}</span>
                      </div>

                      {/* Column 4: Status & Points */}
                      <div className="md:col-span-2 font-mono text-xs">
                        {currentRole === 'student' ? (
                          sub ? (
                            <div className="space-y-0.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                sub.status === 'graded'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{sub.status === 'graded' ? `${sub.grade} / ${asg.maxScore} pts` : 'Submitted'}</span>
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-amber-300 border border-amber-500/30 font-medium">
                                <Clock className="w-3 h-3" />
                                <span>Pending · {asg.maxScore} pts</span>
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="text-slate-300">
                            <span className="font-bold text-cyan-300">{asg.submittedCount || 0}</span>
                            <span className="text-slate-500"> / {asg.totalEnrolled || 3} submitted</span>
                          </div>
                        )}
                      </div>

                      {/* Column 5: Contextual Action Buttons */}
                      <div className="md:col-span-2 flex items-center justify-end gap-1.5 pt-3 md:pt-0">
                        {onNavigateToContext && (
                          <button
                            type="button"
                            title="Start Focus Block for this assignment"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToContext('focus', {
                                classId: asg.classId,
                                assignmentId: asg.id,
                                topic: asg.title
                              });
                            }}
                            className="p-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-mono transition-colors"
                          >
                            <Timer className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onNavigateToContext && (
                          <button
                            type="button"
                            title="Open associated lesson workspace"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToContext('lesson_workspace', {
                                classId: asg.classId,
                                courseId: asg.classId,
                                unitId: asg.unitId || 'unit-phys-1',
                                lessonId: asg.lessonId || 'les-phys-101'
                              });
                            }}
                            className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedAsgId(asg.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Submit Modal */}
      {isSubmitModalOpen && selectedAsg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">
                Submit Solution: {selectedAsg.title}
              </h3>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Your Derivation & Answer</label>
                <textarea
                  rows={5}
                  value={studentContent}
                  onChange={(e) => setStudentContent(e.target.value)}
                  placeholder="Enter your step-by-step reasoning and solution derivation..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Attachment (Optional filename)</label>
                <input
                  type="text"
                  value={attachedFileName}
                  onChange={(e) => setAttachedFileName(e.target.value)}
                  placeholder="e.g. quantum_harmonics_derivation.pdf"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold"
                >
                  Submit for Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Grade Modal */}
      {gradingSubmission && selectedAsg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">
                Grade Submission: {gradingSubmission.studentName}
              </h3>
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs font-mono space-y-1">
              <div className="text-slate-500">Student Response:</div>
              <div className="text-slate-200">{gradingSubmission.content}</div>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">
                  Grade Score (Max {selectedAsg.maxScore})
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedAsg.maxScore}
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Feedback to Cadet</label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-amber-400/50 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-mono font-bold"
                >
                  Submit Grade & Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Create Assignment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">Create New Assignment</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Electromagnetic Tensor Field Derivations"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Target Class</label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="Worksheet">Worksheet</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Exam">Exam</option>
                    <option value="Project">Project</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300">Max Score</label>
                  <input
                    type="number"
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Instructions</label>
                <textarea
                  rows={4}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Outline the required problem questions and grading rubric..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold"
                >
                  Publish to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
