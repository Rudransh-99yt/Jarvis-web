import React, { useState } from 'react';
import type { Assignment, StudentSubmission, EducationClass } from '../../../types/education.ts';
import {
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  ArrowRight,
  Send,
  X,
  Award,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { SharedBackButton } from '../components/SharedBackButton.tsx';

interface TeacherReviewViewProps {
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  onBack: () => void;
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  selectedSubmission?: StudentSubmission | null;
  onSelectSubmission?: (sub: StudentSubmission | null) => void;
}

export const TeacherReviewView: React.FC<TeacherReviewViewProps> = ({
  classes,
  assignments,
  submissions,
  onBack,
  onGradeSubmission,
  selectedSubmission,
  onSelectSubmission
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active grading modal state
  const [activeSub, setActiveSub] = useState<StudentSubmission | null>(selectedSubmission || null);
  const [gradeInput, setGradeInput] = useState<string>(selectedSubmission?.grade ? String(selectedSubmission.grade) : '90');
  const [feedbackInput, setFeedbackInput] = useState<string>(selectedSubmission?.feedback || '');

  const filteredSubmissions = submissions.filter((s) => {
    const matchClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter;
    const matchStatus =
      selectedStatusFilter === 'all'
        ? true
        : selectedStatusFilter === 'pending'
        ? s.status === 'submitted'
        : s.status === 'graded';
    const matchSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchStatus && matchSearch;
  });

  const pendingCount = submissions.filter((s) => s.status === 'submitted').length;
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  const handleOpenGrading = (sub: StudentSubmission) => {
    setActiveSub(sub);
    setGradeInput(sub.grade !== undefined ? String(sub.grade) : '90');
    setFeedbackInput(sub.feedback || 'Excellent physical intuition and step-by-step mathematical derivation.');
  };

  const handleSubmitGrade = () => {
    if (!activeSub) return;
    const gradeNum = parseInt(gradeInput, 10) || 0;
    onGradeSubmission(activeSub.id, gradeNum, feedbackInput);
    setActiveSub(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full font-sans">
      {/* 1. Universal Back Navigation */}
      <SharedBackButton
        onBack={onBack}
        parentLabel="Teacher Command Center"
        currentLabel="Review Queue & Student Assessment"
        hierarchySegments={[
          { label: 'Faculty Hub', onClick: onBack },
          { label: 'Review & Grade' }
        ]}
      />

      {/* 2. Header & KPI Strip */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Assessment Ledger & Review Queue</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Evaluation & Grading Command
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Evaluate student problem sets, assign rubrics, and publish verified academic feedback.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">
              {pendingCount} Awaiting Review
            </span>
            <span className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold">
              {gradedCount} Completed
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  selectedStatusFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('pending')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  selectedStatusFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('graded')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  selectedStatusFilter === 'graded'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Graded ({gradedCount})
              </button>
            </div>

            {/* Class Filter */}
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Managed Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* 3. Submissions Table / Queue */}
      <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            No submissions found matching criteria.
          </div>
        ) : (
          filteredSubmissions.map((sub) => {
            const isPending = sub.status === 'submitted';

            return (
              <div
                key={sub.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-white text-sm">{sub.studentName}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-300 font-semibold">{sub.className.split(':')[0]}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">Turned in {sub.submittedAt}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-200">{sub.assignmentTitle}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 italic font-mono bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                    "{sub.content}"
                  </p>

                  {sub.feedback && (
                    <div className="text-[11px] font-mono text-emerald-400/90 pt-0.5">
                      Feedback: {sub.feedback}
                    </div>
                  )}
                </div>

                <div className="shrink-0 self-start sm:self-center font-mono text-xs">
                  {isPending ? (
                    <button
                      type="button"
                      onClick={() => handleOpenGrading(sub)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold tracking-wider transition-all cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Grade Now</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenGrading(sub)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{sub.grade}/100 Graded</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Inline Grading Dialog / Drawer */}
      {activeSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-5 shadow-2xl animate-fade-in font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  Grading Review · {activeSub.className.split(':')[0]}
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">{activeSub.studentName}</h2>
                <div className="text-xs text-slate-400 font-mono">{activeSub.assignmentTitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSub(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Submission Payload */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-slate-400">Student Submission Payload</label>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {activeSub.content}
              </div>
            </div>

            {/* Score & Rubric */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">Score / Max Score</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400">/ 100 Pts</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[10px]">Turned In</label>
                <div className="text-slate-300 py-2">{activeSub.submittedAt}</div>
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-1.5 font-mono text-xs">
              <label className="text-slate-400 font-bold uppercase text-[10px]">Instructor Evaluation & Feedback</label>
              <textarea
                rows={3}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Provide constructive feedback and pointers on derivations..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSub(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-mono hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitGrade}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 text-xs font-mono font-bold transition-all shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Evaluation & Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
