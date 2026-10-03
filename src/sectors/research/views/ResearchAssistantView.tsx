import React, { useState } from 'react';
import type {
  ResearchProject,
  ResearchQuestion,
  ResearchInvestigationResult,
  ResearchAssistantMode,
  EvidenceCitation
} from '../../../types/research.ts';
import {
  Sparkles,
  Search,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Plus,
  Layers,
  FileCheck2,
  FileText,
  HelpCircle,
  Copy,
  Check,
  Send
} from 'lucide-react';

interface ResearchAssistantViewProps {
  project: ResearchProject;
  questions: ResearchQuestion[];
  onAddEvidence: (item: {
    knowledgeSourceId: string;
    knowledgeSpaceId: string;
    sourceTitle: string;
    chunkId: string;
    chunkText: string;
    citation: EvidenceCitation;
    relevance: number;
    userNote?: string;
    questionId?: string;
  }) => Promise<void>;
  initialQuestion?: ResearchQuestion | null;
}

export const ResearchAssistantView: React.FC<ResearchAssistantViewProps> = ({
  project,
  questions,
  onAddEvidence,
  initialQuestion
}) => {
  const [query, setQuery] = useState(initialQuestion ? initialQuestion.question : project.researchQuestion);
  const [mode, setMode] = useState<ResearchAssistantMode>('investigate');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(initialQuestion ? initialQuestion.id : '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchInvestigationResult | null>(null);
  const [lockedEvidenceIds, setLockedEvidenceIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modes: Array<{ id: ResearchAssistantMode; label: string; desc: string }> = [
    { id: 'investigate', label: 'Investigate', desc: 'Deep grounded inquiry across all sources' },
    { id: 'summarize', label: 'Summarize Evidence', desc: 'Factual digest of core findings' },
    { id: 'compare', label: 'Compare Sources', desc: 'Contrast theorems and formulations' },
    { id: 'supporting_evidence', label: 'Supporting Data', desc: 'Extract direct affirmations & proofs' },
    { id: 'conflicting_evidence', label: 'Boundary & Tension', desc: 'Identify contradictions or edge limits' },
    { id: 'outline', label: 'Research Outline', desc: 'Hierarchical structure for technical report' },
    { id: 'report', label: 'Draft Report Brief', desc: 'Executive brief with findings' }
  ];

  const handleRunInvestigation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/research/projects/${project.id}/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          mode,
          questionId: selectedQuestionId || undefined,
          workspaceId: project.workspaceId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.json();
        setErrorMessage(err.error?.message || 'Investigation query failed');
      }
    } catch (err: any) {
      console.error('Research Assistant query error:', err);
      setErrorMessage(err.message || 'Investigation query failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockEvidence = async (ev: ResearchInvestigationResult['extractedEvidence'][0]) => {
    try {
      await onAddEvidence({
        knowledgeSourceId: ev.knowledgeSourceId,
        knowledgeSpaceId: ev.knowledgeSpaceId,
        sourceTitle: ev.sourceTitle,
        chunkId: ev.chunkId,
        chunkText: ev.chunkText,
        citation: ev.citation,
        relevance: ev.relevance,
        userNote: `Extracted via Research Assistant (${mode}) for: "${query}"`,
        questionId: selectedQuestionId || undefined
      });
      setLockedEvidenceIds((prev) => [...prev, ev.chunkId]);
    } catch (err) {
      console.error('Failed to lock evidence:', err);
    }
  };

  const copyAnswer = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 font-mono">
      {/* Mode Selector Ribbon */}
      <div className="rounded-xl border border-cyan-500/20 bg-black/60 p-2 backdrop-blur-md">
        <div className="text-[10px] text-cyan-400/60 uppercase tracking-wider mb-2 px-1">
          SELECT INVESTIGATION PROTOCOL:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                mode === m.id
                  ? 'border border-cyan-400/80 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'border border-cyan-500/15 bg-black/40 text-cyan-400/60 hover:text-cyan-300 hover:bg-white/5'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-red-300 text-xs font-mono flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Query Bar */}
      <form onSubmit={handleRunInvestigation} className="rounded-xl border border-cyan-500/30 bg-black/80 p-4 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI RESEARCH ASSISTANT // GROUNDED INGESTION CORE</span>
          </label>

          {questions.length > 0 && (
            <select
              value={selectedQuestionId}
              onChange={(e) => {
                const qid = e.target.value;
                setSelectedQuestionId(qid);
                const q = questions.find((item) => item.id === qid);
                if (q) setQuery(q.question);
              }}
              className="text-[11px] px-2 py-1 rounded border border-cyan-500/30 bg-black text-cyan-200 focus:outline-none focus:border-cyan-400 max-w-xs truncate"
            >
              <option value="">Link To Tracked Question...</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pose a technical research question, comparative inquiry, or hypothesis to synthesize..."
            className="flex-1 px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-xs text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 leading-relaxed"
          />

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="sm:w-36 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/80 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 text-cyan-200 text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-1 animate-pulse">
                <span>SYNTHESIZING</span>
              </span>
            ) : (
              <>
                <span>SYNTHESIZE</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-cyan-400/60">
          <span className="uppercase font-bold">Project Prompts:</span>
          <button
            type="button"
            onClick={() => setQuery(project.researchQuestion)}
            className="px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 hover:border-cyan-400 truncate max-w-xs"
          >
            Primary Hypothesis
          </button>
          {questions.slice(0, 2).map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setSelectedQuestionId(q.id);
                setQuery(q.question);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-400 truncate max-w-xs"
            >
              {q.title}
            </button>
          ))}
        </div>
      </form>

      {/* Investigation Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Main Answer Card */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-black/95 to-slate-950/95 p-5 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                {result.isGrounded ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>GROUNDED SYNTHESIS (100% VERIFIED EXCERPTS)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>INSUFFICIENT EVIDENCE DETECTED</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-cyan-400/70">
                  Confidence: <strong className="text-cyan-200">{Math.round(result.confidence * 100)}%</strong>
                </span>
                <span className="text-cyan-400/40">•</span>
                <span className="text-cyan-400/70 font-mono text-[10px]">
                  Engine: <strong className="text-cyan-300">{result.modelUsed}</strong>
                </span>
                <button
                  onClick={copyAnswer}
                  className="flex items-center gap-1 px-2 py-0.5 rounded border border-cyan-500/20 hover:border-cyan-400 text-[10px] text-cyan-300 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Answer Content */}
            <div className="mt-4 text-xs font-sans text-slate-100 whitespace-pre-wrap leading-relaxed">
              {result.answer}
            </div>

            {/* Sources Used Badges */}
            {result.sourcesUsed && result.sourcesUsed.length > 0 && (
              <div className="mt-4 pt-3 border-t border-cyan-500/10 flex flex-wrap items-center gap-2 text-[10px]">
                <span className="uppercase text-cyan-400/60 font-bold">Verified Sources Used:</span>
                {result.sourcesUsed.map((title) => (
                  <span
                    key={title}
                    className="flex items-center gap-1 px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-mono"
                  >
                    <BookOpen className="w-2.5 h-2.5" />
                    <span className="truncate max-w-xs">{title}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Evidence and Citations Cards */}
          {result.extractedEvidence && result.extractedEvidence.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                <div className="flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                  <span>EXTRACTED GROUNDED EVIDENCE ({result.extractedEvidence.length})</span>
                </div>
                <span className="text-[10px] text-cyan-400/60">Directly linkable to project evidence records</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.extractedEvidence.map((ev, idx) => {
                  const isLocked = lockedEvidenceIds.includes(ev.chunkId);
                  const relPct = Math.round(ev.relevance * 100);

                  return (
                    <div
                      key={ev.chunkId || idx}
                      className="rounded-xl border border-cyan-500/20 bg-black/80 p-3.5 backdrop-blur-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px] pb-2 border-b border-cyan-500/10">
                          <span className="font-bold text-white truncate max-w-[200px]">
                            {ev.sourceTitle}
                          </span>
                          <span className="text-cyan-300 font-bold text-[10px]">
                            {relPct}% MATCH
                          </span>
                        </div>

                        <div className="mt-2 text-[10px] text-cyan-400/60">
                          {ev.citation.section ? `Section: ${ev.citation.section}` : 'General'}
                          {ev.citation.page ? ` • Page ${ev.citation.page}` : ''}
                        </div>

                        <p className="mt-2 text-[11px] text-cyan-100/90 italic line-clamp-3 font-sans">
                          "{ev.chunkText}"
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-cyan-500/10 flex items-center justify-between">
                        <span className="text-[9px] text-cyan-500/60">Chunk ID: {ev.chunkId}</span>
                        <button
                          onClick={() => handleLockEvidence(ev)}
                          disabled={isLocked}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            isLocked
                              ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 cursor-default'
                              : 'border border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>LOCKED TO EVIDENCE</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>LOCK EVIDENCE</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
