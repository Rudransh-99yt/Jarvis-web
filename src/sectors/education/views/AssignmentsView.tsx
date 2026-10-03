import React, { useState } from 'react';
import type { Assignment, StudentSubmission, EducationRole, EducationClass } from '../../../types/education.ts';
import { Award, Calendar, CheckCircle, Clock, FileText, PlusCircle, Send, X, AlertCircle } from 'lucide-react';

interface AssignmentsViewProps {
  assignments: Assignment[];
  submissions: StudentSubmission[];
  classes: EducationClass[];
  currentRole: EducationRole;
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
  onCreateAssignment,
  onSubmitWork,
  onGradeSubmission,
  initialCreateModalOpen = false,
  selectedSubmissionForGrading = null,
  onClearSelectedGradingSubmission
}) => {
  const [selectedAsgId, setSelectedAsgId] = useState<string>(assignments[0]?.id || '');
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

  const selectedAsg = assignments.find((a) => a.id === selectedAsgId) || assignments[0];
  const userSubmission = submissions.find((s) => s.assignmentId === selectedAsg?.id && s.studentId === 'student-1');
  const asgSubmissions = submissions.filter((s) => s.assignmentId === selectedAsg?.id);

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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-cyan-500/20 bg-black/40 p-4 rounded-xl backdrop-blur-md">
        <div>
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
            Jarvis Academic // Assignment Manager & Submissions
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Assignments, Problem Sets & Grading
          </h1>
        </div>

        {currentRole === 'teacher' ? (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider transition-all self-start md:self-auto shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            CREATE NEW ASSIGNMENT
          </button>
        ) : (
          <div className="text-xs font-mono text-cyan-400/70">
            Current Student: <strong className="text-cyan-300">Alex Chen</strong>
          </div>
        )}
      </div>

      {/* Main Grid: Assignment List & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0">
        {/* Left Column (5 cols): Assignment List */}
        <div className="space-y-3 lg:col-span-5 min-w-0">
          <h2 className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase px-1">
            All Assignments ({assignments.length})
          </h2>

          {assignments.map((asg) => {
            const isSelected = asg.id === selectedAsgId;
            const sub = submissions.find((s) => s.assignmentId === asg.id && s.studentId === 'student-1');

            return (
              <div
                key={asg.id}
                onClick={() => setSelectedAsgId(asg.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/50 to-black/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-cyan-500/15 bg-black/30 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                    {asg.className.split(':')[0]}
                  </span>
                  <span className="text-xs font-mono text-cyan-400">Due: {asg.dueDate}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{asg.title}</h3>
                <p className="text-xs text-cyan-100/60 line-clamp-1 mt-1">{asg.description}</p>

                <div className="pt-2 mt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-cyan-400/70">{asg.maxScore} Points Max</span>
                  {currentRole === 'student' ? (
                    sub ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {sub.status === 'graded' ? `Graded: ${sub.grade}/${asg.maxScore}` : 'Submitted'}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Assigned
                      </span>
                    )
                  ) : (
                    <span className="text-cyan-300 font-bold">
                      Submissions: {asg.submittedCount || 0} / {asg.totalEnrolled || 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column (7 cols): Assignment Detailed View */}
        {selectedAsg && (
          <div className="space-y-6 lg:col-span-7 min-w-0">
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/10 pb-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{selectedAsg.className}</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">{selectedAsg.title}</h2>
                  <div className="text-xs text-cyan-400/60 font-mono mt-0.5">Category: {selectedAsg.category}</div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-cyan-300 font-bold">Due: {selectedAsg.dueDate}</div>
                  <div className="text-[11px] text-cyan-400/50 font-mono">{selectedAsg.maxScore} Total Points</div>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
                  Instructions & Requirements
                </h3>
                <div className="p-4 rounded-lg border border-cyan-500/10 bg-black/30 text-xs text-cyan-100/80 leading-relaxed whitespace-pre-line font-mono">
                  {selectedAsg.instructions}
                </div>
              </div>

              {/* Student Submission Card */}
              {currentRole === 'student' && (
                <div className="p-4 rounded-lg border border-cyan-500/20 bg-cyan-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono tracking-widest text-cyan-300 font-bold uppercase">
                      Your Submission Status
                    </h3>
                    {userSubmission ? (
                      <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {userSubmission.status === 'graded' ? 'Graded' : 'Submitted'}
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Pending Submission
                      </span>
                    )}
                  </div>

                  {userSubmission ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="text-cyan-400/60">Submitted at: {new Date(userSubmission.submittedAt || '').toLocaleString()}</div>
                      <div className="p-3 rounded bg-black/40 border border-cyan-500/10 text-cyan-100">
                        {userSubmission.content}
                      </div>
                      {userSubmission.status === 'graded' && (
                        <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                          <div className="text-emerald-400 font-bold">Grade: {userSubmission.grade} / {selectedAsg.maxScore}</div>
                          <div className="text-cyan-200">Instructor Feedback: "{userSubmission.feedback}"</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsSubmitModalOpen(true)}
                      className="w-full py-2.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      SUBMIT YOUR WORK
                    </button>
                  )}
                </div>
              )}

              {/* Teacher Roster Submissions Review */}
              {currentRole === 'teacher' && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
                    Student Submissions ({asgSubmissions.length})
                  </h3>

                  {asgSubmissions.length === 0 ? (
                    <div className="p-4 rounded-lg border border-cyan-500/10 bg-black/20 text-center text-xs text-cyan-400/50 font-mono">
                      No student submissions recorded yet for this assignment.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {asgSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-lg border border-cyan-500/15 bg-black/30 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-white font-mono">{sub.studentName}</div>
                            <div className="text-[11px] text-cyan-100/60 line-clamp-1 italic">"{sub.content}"</div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {sub.status === 'graded' ? (
                              <div className="text-right">
                                <span className="text-xs font-mono text-emerald-400 font-bold">
                                  {sub.grade} / {selectedAsg.maxScore}
                                </span>
                                <div className="text-[10px] text-cyan-400/40 font-mono">Graded</div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setGradingSubmission(sub)}
                                className="px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono tracking-wider"
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
          </div>
        )}
      </div>

      {/* MODAL 1: Teacher Create Assignment */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-black/95 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Create New Assignment
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-cyan-400/60 hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-cyan-400/80 mb-1">TARGET CLASS</label>
                <select
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">
                      {c.code}: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">ASSIGNMENT TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quantum Harmonic Oscillator Problem Set"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-cyan-400/80 mb-1">CATEGORY</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full rounded border border-cyan-500/30 bg-black/80 px-2 py-2 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="Worksheet">Worksheet</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Exam">Exam</option>
                    <option value="Project">Project</option>
                  </select>
                </div>

                <div>
                  <label className="block text-cyan-400/80 mb-1">DUE DATE</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full rounded border border-cyan-500/30 bg-black/80 px-2 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-cyan-400/80 mb-1">MAX SCORE</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(Number(e.target.value))}
                    className="w-full rounded border border-cyan-500/30 bg-black/80 px-2 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">DESCRIPTION</label>
                <input
                  type="text"
                  placeholder="Brief summary of assignment goals"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">STEP-BY-STEP INSTRUCTIONS</label>
                <textarea
                  rows={4}
                  required
                  placeholder="1. Write Hamiltonian...\n2. Derive ladder operators...\n3. Attach PDF calculations."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded border border-cyan-500/20 text-cyan-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider"
                >
                  PUBLISH ASSIGNMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Student Submit Work */}
      {isSubmitModalOpen && selectedAsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-black/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Submit Work: {selectedAsg.title}
                </h3>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-cyan-400/60 hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-cyan-400/80 mb-1">SUBMISSION PROOF / RESPONSE NOTES</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Explain your derivations, formulas, or written answers here..."
                  value={studentContent}
                  onChange={(e) => setStudentContent(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">ATTACHED FILE NAME (OPTIONAL SCAN / PDF)</label>
                <input
                  type="text"
                  placeholder="e.g., Alex_Chen_Quantum_Derivation.pdf"
                  value={attachedFileName}
                  onChange={(e) => setAttachedFileName(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded border border-cyan-500/20 text-cyan-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider"
                >
                  TRANSMIT SUBMISSION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Teacher Review & Grade Submission */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-black/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Grade Submission: {gradingSubmission.studentName}
                </h3>
              </div>
              <button
                onClick={() => {
                  setGradingSubmission(null);
                  if (onClearSelectedGradingSubmission) onClearSelectedGradingSubmission();
                }}
                className="text-cyan-400/60 hover:text-cyan-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="text-cyan-400/70">STUDENT RESPONSE:</div>
              <div className="p-3 rounded bg-black/60 border border-cyan-500/20 text-cyan-100 italic">
                "{gradingSubmission.content}"
              </div>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-cyan-400/80 mb-1">NUMERICAL SCORE (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">INSTRUCTOR FEEDBACK</label>
                <textarea
                  rows={3}
                  required
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGradingSubmission(null);
                    if (onClearSelectedGradingSubmission) onClearSelectedGradingSubmission();
                  }}
                  className="px-4 py-2 rounded border border-cyan-500/20 text-cyan-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold tracking-wider"
                >
                  SAVE & RETURN GRADE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
