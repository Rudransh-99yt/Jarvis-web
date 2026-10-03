import React, { useState } from 'react';
import type { ResearchQuestion, ResearchQuestionPriority, ResearchQuestionStatus } from '../../../types/research.ts';
import {
  HelpCircle,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Archive,
  Flame,
  Search,
  MessageSquare,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface ResearchQuestionsPanelProps {
  questions: ResearchQuestion[];
  projectId: string;
  onCreateQuestion: (data: {
    title: string;
    question: string;
    priority: ResearchQuestionPriority;
    notes?: string;
  }) => Promise<void>;
  onInvestigateQuestion: (question: ResearchQuestion) => void;
  onUpdateQuestionStatus?: (questionId: string, status: ResearchQuestionStatus, answer?: string) => Promise<void>;
}

export const ResearchQuestionsPanel: React.FC<ResearchQuestionsPanelProps> = ({
  questions,
  onCreateQuestion,
  onInvestigateQuestion,
  onUpdateQuestionStatus
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | ResearchQuestionStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [priority, setPriority] = useState<ResearchQuestionPriority>('high');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !questionText.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateQuestion({
        title: title.trim(),
        question: questionText.trim(),
        priority,
        notes: notes.trim()
      });
      setTitle('');
      setQuestionText('');
      setNotes('');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: ResearchQuestionPriority) => {
    switch (p) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border border-red-500/50 bg-red-950/60 text-red-300 font-bold">
            <Flame className="w-2.5 h-2.5" /> CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-300 font-bold">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
            MEDIUM
          </span>
        );
      case 'low':
        return (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-400">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: ResearchQuestionStatus) => {
    switch (status) {
      case 'answered':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> ANSWERED
          </span>
        );
      case 'investigating':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold animate-pulse">
            <Clock className="w-3.5 h-3.5" /> INVESTIGATING
          </span>
        );
      case 'open':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" /> OPEN
          </span>
        );
      case 'archived':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
            <Archive className="w-3.5 h-3.5" /> ARCHIVED
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black/60 text-xs text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1">
            {(['all', 'open', 'investigating', 'answered'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all ${
                  filterStatus === st
                    ? 'border border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                    : 'border border-cyan-500/20 bg-black/40 text-cyan-400/60 hover:text-cyan-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD QUESTION</span>
          </button>
        </div>
      </div>

      {/* Question Cards List */}
      {filteredQuestions.length === 0 ? (
        <div className="rounded-xl border border-cyan-500/20 bg-black/40 p-8 text-center backdrop-blur-md">
          <HelpCircle className="w-10 h-10 text-cyan-500/40 mx-auto mb-2" />
          <div className="text-sm font-bold text-white">No Research Questions Found</div>
          <p className="text-xs text-cyan-400/60 mt-1">
            Add targeted questions to systematically investigate this project's hypothesis.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-black/80 to-slate-950/80 p-4 backdrop-blur-md transition-all hover:border-cyan-400/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-cyan-500/10">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(q.priority)}
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {q.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(q.status)}
                  <span className="text-[10px] text-cyan-500/60">{q.id}</span>
                </div>
              </div>

              <p className="mt-2.5 text-xs text-cyan-100 font-sans leading-relaxed">
                {q.question}
              </p>

              {q.answer && (
                <div className="mt-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-xs font-sans text-emerald-100">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> GROUNDED SYNTHESIS / ANSWER:
                  </div>
                  {q.answer}
                </div>
              )}

              {q.notes && (
                <div className="mt-2 text-[11px] text-cyan-400/70 italic">
                  Note: {q.notes}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-cyan-500/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[10px] text-cyan-400/60">
                  <span>Linked Evidence: <strong>{q.linkedEvidenceIds?.length || 0}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {onUpdateQuestionStatus && q.status !== 'answered' && (
                    <button
                      onClick={() => onUpdateQuestionStatus(q.id, 'investigating')}
                      className="px-2.5 py-1 rounded border border-cyan-500/20 hover:border-cyan-400 text-[10px] text-cyan-300"
                    >
                      Mark Investigating
                    </button>
                  )}

                  <button
                    onClick={() => onInvestigateQuestion(q)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span>INVESTIGATE WITH JARVIS</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <HelpCircle className="w-4 h-4" />
                <span>ADD RESEARCH QUESTION</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  QUESTION TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Toroidal Boundary Flux Containment"
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  RESEARCH QUESTION *
                </label>
                <textarea
                  required
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Detailed scientific inquiry to ground against project knowledge spaces..."
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                    PRIORITY
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ResearchQuestionPriority)}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                    INITIAL NOTES
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Hypothesis or keywords..."
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-cyan-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg border border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold"
                >
                  {isSubmitting ? 'Creating...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
