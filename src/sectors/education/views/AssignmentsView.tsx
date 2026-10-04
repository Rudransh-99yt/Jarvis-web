import React, { useState } from 'react';
import type { Assignment, StudentSubmission, EducationRole, EducationClass } from '../../../types/education.ts';
import {
  Award,
  Calendar,
  CheckCircle,
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
  Sparkles
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
  // If a grading submission was passed directly, select its assignment
  const initialAsgId = selectedSubmissionForGrading
    ? selectedSubmissionForGrading.assignmentId
    : null;

  const [selectedAsgId, setSelectedAsgId] = useState<string | null>(initialAsgId);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filtered Assignments for Index View
  const filteredAssignments = assignments.filter((asg) => {
    const sub = submissions.find((s) => s.assignmentId === asg.id && s.studentId === 'student-1');
    const matchesSearch =
      asg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asg.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asg.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

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
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
            Jarvis Academic · Assignments & Assessment Ledger
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Assignments & Coursework
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {currentRole === 'teacher'
              ? 'Review submissions, evaluate cadet responses, and distribute new assessments.'
              : 'Track deadlines, review problem sets, and submit coursework.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {currentRole === 'teacher' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <PlusCircle className="w-4 h-4 text-cyan-300" />
              <span>+ Create Assignment</span>
            </button>
          )}

          {selectedAsgId && (
            <button
              onClick={() => setSelectedAsgId(null)}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Primary Surface: Dedicated Detail View OR Compact Index Table */}
      {selectedAsg ? (
        /* DEDICATED ASSIGNMENT WORKSPACE */
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

            <div className="text-right font-mono shrink-0">
              <div className="text-sm font-bold text-cyan-300">{selectedAsg.maxScore} Max Points</div>
              <div className="text-[11px] text-slate-500">
                {currentRole === 'student'
                  ? userSubmission
                    ? userSubmission.status === 'graded'
                      ? `Score: ${userSubmission.grade} / ${selectedAsg.maxScore}`
                      : 'Submitted for grading'
                    : 'Awaiting submission'
                  : `${asgSubmissions.length} cadet submissions`}
              </div>
            </div>
          </div>

          {/* Academic Context Actions Strip */}
          {onNavigateToContext && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-bold text-cyan-400">Context:</span>
                <span>{selectedAsg.className.split(':')[0]}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">Lesson & Reference Hub</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    onNavigateToContext('lesson_workspace', {
                      classId: selectedAsg.classId,
                      courseId: selectedAsg.classId,
                      unitId: 'unit-phys-2',
                      lessonId: 'les-phys-202',
                      assignmentId: selectedAsg.id
                    })
                  }
                  className="px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700 text-xs transition-colors cursor-pointer"
                >
                  Open Lesson
                </button>
                <button
                  onClick={() =>
                    onNavigateToContext('focus', {
                      classId: selectedAsg.classId,
                      assignmentId: selectedAsg.id,
                      topic: selectedAsg.title
                    })
                  }
                  className="px-3 py-1.5 min-h-[36px] rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 text-xs transition-colors cursor-pointer"
                >
                  Start Focus Block (45m)
                </button>
                <button
                  onClick={() =>
                    onNavigateToContext('community', {
                      classId: selectedAsg.classId,
                      assignmentId: selectedAsg.id
                    })
                  }
                  className="px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors cursor-pointer"
                >
                  Discuss
                </button>
              </div>
            </div>
          )}

          {/* Instructions and Brief */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Problem Description & Instructions
            </h3>
            <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-950/70 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-mono">
              {selectedAsg.instructions || selectedAsg.description}
            </div>
          </div>

          {/* Student Submission Card */}
          {currentRole === 'student' && (
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Your Submission
                </h3>
                {userSubmission ? (
                  <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {userSubmission.status === 'graded' ? 'Graded' : 'Submitted for Grading'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Pending Submission
                  </span>
                )}
              </div>

              {userSubmission ? (
                <div className="space-y-3 text-xs font-mono">
                  <div className="text-slate-400 text-[11px]">
                    Submitted at: {new Date(userSubmission.submittedAt || '').toLocaleString()}
                  </div>
                  <div className="p-4 rounded-lg bg-black/60 border border-slate-800 text-slate-200 font-mono text-xs whitespace-pre-line">
                    {userSubmission.content}
                  </div>
                  {userSubmission.status === 'graded' && (
                    <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                      <div className="text-emerald-400 font-bold text-sm">
                        Final Score: {userSubmission.grade} / {selectedAsg.maxScore} pts
                      </div>
                      <div className="text-slate-300 text-xs font-sans">
                        Instructor Feedback: "{userSubmission.feedback}"
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="w-full py-3 min-h-[44px] rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                >
                  <Send className="w-4 h-4 text-cyan-300" />
                  <span>Submit Your Assignment Work</span>
                </button>
              )}
            </div>
          )}

          {/* Teacher Submissions Ledger */}
          {currentRole === 'teacher' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Cadet Submissions ({asgSubmissions.length})
                </h3>
              </div>

              {asgSubmissions.length === 0 ? (
                <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500 font-mono">
                  No submissions recorded yet for this assignment.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {asgSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-bold text-white font-mono">{sub.studentName}</div>
                        <div className="text-xs text-slate-400 line-clamp-1 italic font-mono">"{sub.content}"</div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                        {sub.status === 'graded' ? (
                          <div className="text-right font-mono text-xs">
                            <span className="text-emerald-400 font-bold">
                              {sub.grade} / {selectedAsg.maxScore}
                            </span>
                            <div className="text-[10px] text-slate-500">Graded</div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setGradingSubmission(sub)}
                            className="px-3.5 py-1.5 min-h-[36px] rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono tracking-wider transition-all cursor-pointer"
                          >
                            Review & Grade
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* COMPACT SCANABLE ASSIGNMENTS INDEX TABLE */
        <div className="space-y-4">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({assignments.length})
              </button>
              <button
                onClick={() => setFilterMode('pending')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'pending' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterMode('submitted')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'submitted' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Submitted
              </button>
              <button
                onClick={() => setFilterMode('graded')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  filterMode === 'graded' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Graded
              </button>
            </div>

            <div className="relative min-w-0 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Assignments Table / Rows */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
            {filteredAssignments.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-mono font-bold text-slate-300">No Assignments Match Filter</div>
                <div className="text-xs text-slate-500 font-mono">
                  {searchQuery ? `No results for "${searchQuery}".` : 'No assignments in this category.'}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredAssignments.map((asg) => {
                  const sub = submissions.find((s) => s.assignmentId === asg.id && s.studentId === 'student-1');

                  return (
                    <div
                      key={asg.id}
                      onClick={() => setSelectedAsgId(asg.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-cyan-300 group-hover:text-cyan-200">
                            {asg.className.split(':')[0]}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400">{asg.category}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-amber-400/90">Due {asg.dueDate}</span>
                        </div>
                        <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-cyan-100 transition-colors truncate">
                          {asg.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {asg.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 self-start sm:self-center">
                        <div className="text-right font-mono text-xs">
                          {currentRole === 'student' ? (
                            sub ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span>
                                  {sub.status === 'graded' ? `${sub.grade} / ${asg.maxScore} pts` : 'Submitted'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span>Assigned · {asg.maxScore} pts</span>
                              </div>
                            )
                          ) : (
                            <div className="text-slate-300">
                              <span className="font-bold text-cyan-300">{asg.submittedCount || 0}</span>
                              <span className="text-slate-500"> / {asg.totalEnrolled || 3} submitted</span>
                            </div>
                          )}
                        </div>

                        <span className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 group-hover:text-white group-hover:border-cyan-500/40 transition-colors">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Teacher Create Assignment */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono tracking-wider text-white uppercase">
                  Create New Assignment
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">TARGET COURSE</label>
                <select
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">
                      {c.code}: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ASSIGNMENT TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quantum Harmonic Oscillator Problem Set"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">CATEGORY</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                  >
                    <option value="Worksheet">Worksheet</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Exam">Exam</option>
                    <option value="Project">Project</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">DUE DATE</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">MAX SCORE</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">SHORT BRIEF</label>
                <input
                  type="text"
                  placeholder="Overview description..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">FULL INSTRUCTIONS & PROBLEMS</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed requirements, problem text, and grading criteria..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 min-h-[40px] rounded-lg border border-slate-700 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 min-h-[40px] rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold shadow-md cursor-pointer"
                >
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Student Submit Work Modal */}
      {isSubmitModalOpen && selectedAsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono text-cyan-400">COURSEWORK SUBMISSION</div>
                <h3 className="text-sm font-bold text-white truncate">{selectedAsg.title}</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">WRITTEN SOLUTION & DERIVATIONS</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Provide your step-by-step mathematical derivation, code solution, or written answer..."
                  value={studentContent}
                  onChange={(e) => setStudentContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">OPTIONAL ATTACHMENT</label>
                <input
                  type="text"
                  placeholder="e.g. quantum_ladder_proof.pdf"
                  value={attachedFileName}
                  onChange={(e) => setAttachedFileName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 min-h-[40px] rounded-lg border border-slate-700 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 min-h-[40px] rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold shadow-md cursor-pointer"
                >
                  Submit Final Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Teacher Review & Grade Submission */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono text-cyan-400">EVALUATION DESK</div>
                <h3 className="text-sm font-bold text-white">Grading: {gradingSubmission.studentName}</h3>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 text-slate-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Student Submission Body</div>
                <div className="text-xs leading-relaxed whitespace-pre-line font-mono">{gradingSubmission.content}</div>
              </div>

              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-1">SCORE (OUT OF {selectedAsg?.maxScore || 100})</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedAsg?.maxScore || 100}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-500 min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">WRITTEN FEEDBACK</label>
                  <textarea
                    rows={4}
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-500 text-xs font-sans"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    className="px-4 py-2 min-h-[40px] rounded-lg border border-slate-700 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 min-h-[40px] rounded-lg border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold shadow-md cursor-pointer"
                  >
                    Publish Grade & Notify Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
