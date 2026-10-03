import React, { useState } from 'react';
import type { KnowledgeSpace, KnowledgeSource, GroundedQueryResponse } from '../../../types/education.ts';
import {
  Sparkles,
  FileText,
  PlusCircle,
  BookOpen,
  Search,
  Quote,
  CheckCircle2,
  X,
  Layers,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  Hash
} from 'lucide-react';

interface ExtendedKnowledgeSource extends KnowledgeSource {
  status?: 'pending' | 'processing' | 'ready' | 'failed';
  chunkCount?: number;
  contentHash?: string;
}

interface KnowledgeWorkspaceViewProps {
  knowledgeSpaces: KnowledgeSpace[];
  activeSpaceId?: string;
  onSelectSpace: (id: string) => void;
  onCreateSpace: (title: string, description: string, category: string) => void;
  onAddSource: (spaceId: string, title: string, fullText: string, type: 'pdf' | 'notes' | 'lecture' | 'web') => void;
  onDeleteSource?: (spaceId: string, sourceId: string) => void;
  onReindexSource?: (spaceId: string, sourceId: string) => void;
  onQueryGrounded: (spaceId: string, query: string) => Promise<GroundedQueryResponse>;
}

export const KnowledgeWorkspaceView: React.FC<KnowledgeWorkspaceViewProps> = ({
  knowledgeSpaces,
  activeSpaceId,
  onSelectSpace,
  onCreateSpace,
  onAddSource,
  onDeleteSource,
  onReindexSource,
  onQueryGrounded
}) => {
  const currentSpace = knowledgeSpaces.find((s) => s.id === activeSpaceId) || knowledgeSpaces[0];

  const [selectedSource, setSelectedSource] = useState<ExtendedKnowledgeSource | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<{
    sourceTitle: string;
    excerpt: string;
    location?: string;
    score?: number;
  } | null>(null);

  const [isCreateSpaceModal, setIsCreateSpaceModal] = useState<boolean>(false);
  const [isAddSourceModal, setIsAddSourceModal] = useState<boolean>(false);

  // Form states
  const [newSpaceTitle, setNewSpaceTitle] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const [newSpaceCategory, setNewSpaceCategory] = useState('Physics');

  const [newSrcTitle, setNewSrcTitle] = useState('');
  const [newSrcType, setNewSrcType] = useState<'pdf' | 'notes' | 'lecture' | 'web'>('notes');
  const [newSrcText, setNewSrcText] = useState('');

  // Q&A State
  const [queryInput, setQueryInput] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryHistory, setQueryHistory] = useState<GroundedQueryResponse[]>([]);

  const handleAskQuestion = async (queryText: string) => {
    if (!queryText.trim() || !currentSpace) return;
    setIsQuerying(true);

    try {
      const response = await onQueryGrounded(currentSpace.id, queryText);
      setQueryHistory((prev) => [response, ...prev]);
      setQueryInput('');
    } catch (err) {
      console.error('Grounded query error:', err);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleCreateSpaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceTitle.trim()) return;
    onCreateSpace(newSpaceTitle.trim(), newSpaceDesc.trim(), newSpaceCategory);
    setIsCreateSpaceModal(false);
    setNewSpaceTitle('');
    setNewSpaceDesc('');
  };

  const handleAddSourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSpace || !newSrcTitle.trim() || !newSrcText.trim()) return;
    onAddSource(currentSpace.id, newSrcTitle.trim(), newSrcText.trim(), newSrcType);
    setIsAddSourceModal(false);
    setNewSrcTitle('');
    setNewSrcText('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-cyan-500/20 bg-black/40 p-4 rounded-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            Jarvis Knowledge Engine // Grounded Multi-Source RAG
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Source-Grounded Knowledge & Research Workspaces
          </h1>
        </div>

        <button
          onClick={() => setIsCreateSpaceModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider transition-all self-start md:self-auto shadow-[0_0_15px_rgba(6,182,212,0.15)]"
        >
          <PlusCircle className="w-4 h-4 text-cyan-400" />
          + NEW KNOWLEDGE SPACE
        </button>
      </div>

      {/* Main Grid: Workspaces, Sources, Grounded Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Knowledge Spaces & Sources Directory */}
        <div className="space-y-6 lg:col-span-4">
          {/* Space Selector Carousel */}
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-3">
            <h2 className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              Select Knowledge Space
            </h2>

            <div className="space-y-2">
              {knowledgeSpaces.map((space) => {
                const isSelected = space.id === currentSpace?.id;

                return (
                  <div
                    key={space.id}
                    onClick={() => onSelectSpace(space.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/60 to-black/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'border-cyan-500/10 bg-black/30 hover:border-cyan-500/25'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white font-mono">{space.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                        {space.sources.length} sources
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-100/60 line-clamp-1">{space.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sources Directory in Current Space */}
          {currentSpace && (
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-xs font-mono tracking-widest text-cyan-300 font-bold uppercase">
                    Indexed Sources ({currentSpace.sources.length})
                  </h2>
                </div>
                <button
                  onClick={() => setIsAddSourceModal(true)}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
                >
                  + Add Source
                </button>
              </div>

              <div className="space-y-2">
                {currentSpace.sources.map((src: ExtendedKnowledgeSource) => {
                  const status = src.status || 'ready';
                  const isReady = status === 'ready';

                  return (
                    <div
                      key={src.id}
                      className="p-3 rounded-lg border border-cyan-500/10 bg-black/30 hover:border-cyan-400/30 transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => setSelectedSource(src)}
                          className="space-y-0.5 cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="text-xs font-semibold text-white font-mono line-clamp-1">
                              {src.title}
                            </span>
                          </div>
                          <p className="text-[10px] text-cyan-100/60 line-clamp-1">{src.summary}</p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                            isReady
                              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400'
                              : status === 'processing'
                              ? 'border-amber-500/30 bg-amber-950/30 text-amber-400 animate-pulse'
                              : 'border-rose-500/30 bg-rose-950/30 text-rose-400'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      {/* Source Metadata Bar */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/50 pt-1 border-t border-cyan-500/10">
                        <div className="flex items-center gap-2">
                          <span>{src.type.toUpperCase()}</span>
                          <span>•</span>
                          <span>~{src.tokenCount} tokens</span>
                          {src.chunkCount !== undefined && (
                            <>
                              <span>•</span>
                              <span>{src.chunkCount} chunks</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {onReindexSource && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReindexSource(currentSpace.id, src.id);
                              }}
                              title="Re-index document"
                              className="hover:text-cyan-200 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteSource && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSource(currentSpace.id, src.id);
                              }}
                              title="Delete source"
                              className="hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (8 cols): Grounded Q&A & Synthesizer */}
        {currentSpace && (
          <div className="space-y-6 lg:col-span-8">
            {/* Grounded Query Box */}
            <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                  ACTIVE GROUNDED SPACE: {currentSpace.category}
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">{currentSpace.title}</h2>
                <p className="text-xs text-cyan-100/70 mt-1">{currentSpace.description}</p>
              </div>

              {/* Quick Suggested Prompts */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-cyan-400/70 uppercase">
                  Suggested Grounded Inquiries:
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentSpace.suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskQuestion(q)}
                      className="px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/30 hover:border-cyan-400/40 hover:bg-cyan-950/60 text-cyan-200 text-xs text-left transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inquiry Input Bar */}
              <div className="flex items-center gap-2 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Ask Jarvis anything grounded in ${currentSpace.sources.length} indexed sources...`}
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAskQuestion(queryInput);
                    }}
                    className="w-full rounded-lg border border-cyan-500/30 bg-black/60 pl-9 pr-4 py-2.5 text-xs text-white placeholder-cyan-400/40 outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <button
                  onClick={() => handleAskQuestion(queryInput)}
                  disabled={isQuerying || !queryInput.trim()}
                  className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs font-mono tracking-wider transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isQuerying ? 'QUERYING...' : 'SYNTHESIZE'}
                </button>
              </div>
            </div>

            {/* Grounded Responses Feed */}
            <div className="space-y-4">
              {queryHistory.length === 0 ? (
                <div className="p-8 rounded-xl border border-cyan-500/10 bg-black/30 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-cyan-400/40 mx-auto" />
                  <h3 className="text-sm font-mono font-bold text-cyan-300">
                    No Grounded Queries in Current Session
                  </h3>
                  <p className="text-xs text-cyan-100/60 max-w-md mx-auto">
                    Type a question above or click one of the suggested prompts to experience source-grounded answers with citations from indexed PDFs and notes.
                  </p>
                </div>
              ) : (
                queryHistory.map((res, idx) => {
                  const isUngrounded = res.citations.length === 0 || res.confidence < 0.2;

                  return (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-black/50 backdrop-blur-sm space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Quote className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-cyan-200 font-mono">Q: {res.query}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              !isUngrounded
                                ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400'
                                : 'border-amber-500/30 bg-amber-950/30 text-amber-400'
                            }`}
                          >
                            Confidence: {Math.round(res.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Insufficient Evidence Warning Banner */}
                      {isUngrounded && (
                        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-300 text-xs font-mono flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>
                            Notice: Insufficient evidence found in indexed sources. Jarvis has refused to fabricate ungrounded claims.
                          </span>
                        </div>
                      )}

                      <div className="text-xs text-cyan-100/90 leading-relaxed font-mono whitespace-pre-line">
                        {res.answer}
                      </div>

                      {/* Citations / Source References */}
                      {res.citations && res.citations.length > 0 && (
                        <div className="p-3 rounded-lg border border-cyan-500/15 bg-black/40 space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Verified Source Citations ({res.citations.length})
                          </div>
                          <div className="space-y-1.5">
                            {res.citations.map((cite, cIdx) => (
                              <div
                                key={cIdx}
                                onClick={() => setSelectedCitation(cite)}
                                className="text-[11px] font-mono text-cyan-400/80 pl-2 border-l-2 border-cyan-500/40 hover:border-cyan-400 hover:text-cyan-200 cursor-pointer transition-all"
                              >
                                <strong className="text-cyan-200">
                                  [{cIdx + 1}] {cite.sourceTitle}
                                </strong>
                                {cite.location ? ` (${cite.location})` : ''}: "{cite.excerpt}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Source Document Inspector */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-xl border border-cyan-500/30 bg-black/95 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">{selectedSource.title}</h3>
                  <div className="text-[10px] text-cyan-400/60 font-mono">
                    Type: {selectedSource.type.toUpperCase()} • Indexed Tokens: ~{selectedSource.tokenCount}
                    {selectedSource.contentHash && ` • Hash: ${selectedSource.contentHash.slice(0, 12)}...`}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedSource(null)} className="text-cyan-400/60 hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Executive Summary</div>
              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-100/90 font-mono">
                {selectedSource.summary}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Full Document Text Content</div>
              <div className="p-4 rounded-lg bg-black/60 border border-cyan-500/10 text-xs text-cyan-100/80 font-mono whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto">
                {selectedSource.fullText}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setSelectedSource(null)}
                className="px-4 py-2 rounded border border-cyan-500/20 text-cyan-400 hover:bg-white/5 text-xs font-mono"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Citation Excerpt Inspector */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-black/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Quote className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold font-mono text-white">{selectedCitation.sourceTitle}</h3>
                  {selectedCitation.location && (
                    <div className="text-[10px] text-cyan-400/60 font-mono">{selectedCitation.location}</div>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedCitation(null)} className="text-cyan-400/60 hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Citation Excerpt</div>
              <div className="p-4 rounded-lg bg-black/60 border border-cyan-500/20 text-xs text-cyan-100/90 font-mono leading-relaxed italic">
                "{selectedCitation.excerpt}"
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-2 rounded border border-cyan-500/20 text-cyan-400 hover:bg-white/5 text-xs font-mono"
              >
                Close Citation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create New Knowledge Space */}
      {isCreateSpaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-black/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Create Knowledge Workspace
                </h3>
              </div>
              <button onClick={() => setIsCreateSpaceModal(false)} className="text-cyan-400/60 hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSpaceSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-cyan-400/80 mb-1">WORKSPACE TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., General Relativity & Tensor Calculus"
                  value={newSpaceTitle}
                  onChange={(e) => setNewSpaceTitle(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">CATEGORY</label>
                <select
                  value={newSpaceCategory}
                  onChange={(e) => setNewSpaceCategory(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                >
                  <option value="Physics">Physics</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Engineering">Engineering</option>
                </select>
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Explain what topics and source documents this space will synthesize..."
                  value={newSpaceDesc}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSpaceModal(false)}
                  className="px-4 py-2 rounded border border-cyan-500/20 text-cyan-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider"
                >
                  CREATE WORKSPACE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Source Document */}
      {isAddSourceModal && currentSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-black/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Add Source Document: {currentSpace.title}
                </h3>
              </div>
              <button onClick={() => setIsAddSourceModal(false)} className="text-cyan-400/60 hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSourceSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-cyan-400/80 mb-1">SOURCE TITLE / FILENAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Lecture 08: Dirac Notation & Hilbert Space.md"
                  value={newSrcTitle}
                  onChange={(e) => setNewSrcTitle(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">DOCUMENT FORMAT</label>
                <select
                  value={newSrcType}
                  onChange={(e) => setNewSrcType(e.target.value as any)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400"
                >
                  <option value="notes">Lecture Notes (Plain Text)</option>
                  <option value="pdf">PDF Document Extract</option>
                  <option value="lecture">Markdown Document (.md)</option>
                  <option value="web">Web Article / Transcript</option>
                </select>
              </div>

              <div>
                <label className="block text-cyan-400/80 mb-1">RAW TEXT / DOCUMENT CONTENTS</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste notes, mathematical definitions, markdown headers, or article excerpts here..."
                  value={newSrcText}
                  onChange={(e) => setNewSrcText(e.target.value)}
                  className="w-full rounded border border-cyan-500/30 bg-black/80 px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSourceModal(false)}
                  className="px-4 py-2 rounded border border-cyan-500/20 text-cyan-400 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider"
                >
                  INDEX DOCUMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
