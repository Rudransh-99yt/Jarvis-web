import React, { useState } from 'react';
import type { EvidenceRecord, ResearchQuestion } from '../../../types/research.ts';
import {
  FileCheck2,
  Search,
  ExternalLink,
  Tag,
  BookOpen,
  Trash2,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface EvidencePanelProps {
  evidence: EvidenceRecord[];
  questions: ResearchQuestion[];
  onDeleteEvidence?: (evidenceId: string) => Promise<void>;
  onNavigateToAssistant?: () => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  questions,
  onDeleteEvidence,
  onNavigateToAssistant
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('all');

  const filteredEvidence = evidence.filter((ev) => {
    const matchesSearch =
      ev.sourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.chunkText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.userNote && ev.userNote.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesQuestion = selectedQuestionId === 'all' || ev.questionId === selectedQuestionId;
    return matchesSearch && matchesQuestion;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence records..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black/60 text-xs text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedQuestionId}
            onChange={(e) => setSelectedQuestionId(e.target.value)}
            className="w-full sm:w-60 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black/80 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All Linked Questions ({evidence.length})</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Evidence Cards */}
      {filteredEvidence.length === 0 ? (
        <div className="rounded-xl border border-cyan-500/20 bg-black/40 p-8 text-center backdrop-blur-md">
          <FileCheck2 className="w-10 h-10 text-cyan-500/40 mx-auto mb-2" />
          <div className="text-sm font-bold text-white">No Evidence Records Found</div>
          <p className="text-xs text-cyan-400/60 mt-1 max-w-md mx-auto">
            Grounded evidence is automatically extracted when investigating queries with the AI Research Assistant, or can be locked directly from verified source citations.
          </p>
          {onNavigateToAssistant && (
            <button
              onClick={onNavigateToAssistant}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>LAUNCH RESEARCH INVESTIGATION</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((ev) => {
            const relevancePct = Math.round(ev.relevance * 100);
            const linkedQuestion = questions.find((q) => q.id === ev.questionId);

            return (
              <div
                key={ev.id}
                className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-black/90 to-slate-950/90 p-4 backdrop-blur-md transition-all hover:border-cyan-400/50"
              >
                {/* Header: Source and Relevance */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{ev.sourceTitle}</span>
                        <span title="Verified RAG Chunk">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                        </span>
                      </div>
                      <div className="text-[10px] text-cyan-400/60">
                        {ev.citation.section ? `Section: ${ev.citation.section}` : ''}
                        {ev.citation.page ? ` • Page ${ev.citation.page}` : ''}
                        {` • Space ID: ${ev.knowledgeSpaceId || 'ks-quantum'}`}
                      </div>
                    </div>
                  </div>

                  {/* Relevance Score Meter */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[9px] text-cyan-400/60 uppercase">GROUNDED RELEVANCE</div>
                      <div className="text-xs font-bold text-cyan-300">{relevancePct}% MATCH</div>
                    </div>
                    <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden border border-cyan-500/20">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                        style={{ width: `${relevancePct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Verbatim Excerpt */}
                <div className="mt-3 p-3 rounded-lg border border-cyan-500/15 bg-black/60 text-xs font-mono text-cyan-100/90 leading-relaxed border-l-2 border-l-cyan-400">
                  <div className="text-[9px] text-cyan-400/50 uppercase tracking-widest mb-1">
                    VERIFIED CHUNK EXCERPT [{ev.chunkId}]:
                  </div>
                  "{ev.chunkText}"
                </div>

                {/* User Note */}
                {ev.userNote && (
                  <div className="mt-2.5 p-2 rounded bg-cyan-950/20 border border-cyan-500/10 text-xs text-cyan-300/80">
                    <span className="text-[10px] uppercase font-bold text-cyan-400/70 mr-1.5">ANALYST NOTE:</span>
                    {ev.userNote}
                  </div>
                )}

                {/* Footer Metadata & Actions */}
                <div className="mt-3 pt-2.5 border-t border-cyan-500/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-cyan-400/60">
                  <div className="flex items-center gap-2">
                    {linkedQuestion && (
                      <span className="px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-950/40 text-cyan-300 truncate max-w-xs">
                        Question: {linkedQuestion.title}
                      </span>
                    )}
                    {ev.tags && ev.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span>Locked: {new Date(ev.createdAt).toLocaleDateString()}</span>
                    {onDeleteEvidence && (
                      <button
                        onClick={() => onDeleteEvidence(ev.id)}
                        className="text-red-400/60 hover:text-red-300 transition-colors p-1"
                        title="Delete evidence record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
