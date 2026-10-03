import React, { useState } from 'react';
import type { ResearchNote, ResearchQuestion, EvidenceRecord } from '../../../types/research.ts';
import {
  FileText,
  Plus,
  Tag,
  Search,
  Trash2,
  Calendar,
  Layers,
  HelpCircle,
  FileCheck2
} from 'lucide-react';

interface NotesPanelProps {
  notes: ResearchNote[];
  questions: ResearchQuestion[];
  evidence: EvidenceRecord[];
  onCreateNote: (data: {
    title: string;
    content: string;
    tags: string[];
    linkedQuestionIds: string[];
    linkedEvidenceIds: string[];
  }) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  questions,
  evidence,
  onCreateNote,
  onDeleteNote
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredNotes = notes.filter((n) => {
    const query = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      n.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      const tags = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await onCreateNote({
        title: title.trim(),
        content: content.trim(),
        tags,
        linkedQuestionIds: selectedQuestionIds,
        linkedEvidenceIds: selectedEvidenceIds
      });

      setTitle('');
      setContent('');
      setTagInput('');
      setSelectedQuestionIds([]);
      setSelectedEvidenceIds([]);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search research notes..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black/60 text-xs text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold transition-all self-end sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>NEW RESEARCH NOTE</span>
        </button>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-cyan-500/20 bg-black/40 p-8 text-center backdrop-blur-md">
          <FileText className="w-10 h-10 text-cyan-500/40 mx-auto mb-2" />
          <div className="text-sm font-bold text-white">No Research Notes Recorded</div>
          <p className="text-xs text-cyan-400/60 mt-1">
            Capture analytical insights, derivation steps, and working hypotheses linked to questions and evidence.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-black/90 to-slate-950/90 p-4 backdrop-blur-md flex flex-col justify-between hover:border-cyan-400/50 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-cyan-500/10">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                    {note.title}
                  </h4>
                  <span className="text-[10px] text-cyan-500/60">{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>

                <p className="mt-2.5 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>

                {/* Linked Questions & Evidence Pills */}
                {(note.linkedQuestionIds.length > 0 || note.linkedEvidenceIds.length > 0) && (
                  <div className="mt-3 pt-2.5 border-t border-cyan-500/10 flex flex-wrap gap-1.5 text-[10px]">
                    {note.linkedQuestionIds.map((qid) => {
                      const q = questions.find((item) => item.id === qid);
                      return (
                        <span key={qid} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                          <HelpCircle className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[120px]">{q ? q.title : qid}</span>
                        </span>
                      );
                    })}
                    {note.linkedEvidenceIds.map((eid) => (
                      <span key={eid} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/40 text-emerald-300">
                        <FileCheck2 className="w-2.5 h-2.5" />
                        <span>Evidence #{eid.slice(-4)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-cyan-400/60">
                <div className="flex flex-wrap gap-1">
                  {note.tags && note.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      #{tag}
                    </span>
                  ))}
                </div>

                {onDeleteNote && (
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="text-red-400/60 hover:text-red-300 transition-colors p-1"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>COMPOSE RESEARCH NOTE</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  NOTE TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Toroidal Cohesion & Zero-Point Calculations"
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  NOTE CONTENT *
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Analytical observations, derivation steps, empirical correlations..."
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  TAGS (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. Plasma, Harmonics, Stokes"
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {questions.length > 0 && (
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                    LINK TO RESEARCH QUESTIONS
                  </label>
                  <div className="max-h-28 overflow-y-auto space-y-1 p-1">
                    {questions.map((q) => {
                      const isLinked = selectedQuestionIds.includes(q.id);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            setSelectedQuestionIds(
                              isLinked
                                ? selectedQuestionIds.filter((id) => id !== q.id)
                                : [...selectedQuestionIds, q.id]
                            );
                          }}
                          className={`w-full flex items-center justify-between p-1.5 rounded border text-left text-[11px] ${
                            isLinked ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200' : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="truncate">{q.title}</span>
                          <span>{isLinked ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  {isSubmitting ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
