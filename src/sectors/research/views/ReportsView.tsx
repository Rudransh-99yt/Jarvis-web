import React, { useState } from 'react';
import type { ResearchReport, ResearchQuestion } from '../../../types/research.ts';
import {
  FileText,
  Sparkles,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  FileCheck2,
  Layers,
  Copy,
  Check
} from 'lucide-react';

interface ReportsViewProps {
  reports: ResearchReport[];
  questions: ResearchQuestion[];
  projectId: string;
  projectTitle: string;
  onGenerateReport: (data: { title?: string; questionId?: string }) => Promise<void>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  questions,
  projectTitle,
  onGenerateReport
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    reports.length > 0 ? reports[0].id : null
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0] || null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateReport({
        questionId: selectedQuestionId || undefined
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = () => {
    if (!activeReport) return;
    const text = `# ${activeReport.title}
Generated: ${new Date(activeReport.generatedAt).toLocaleString()}
Research Question: ${activeReport.researchQuestion}

## Executive Summary
${activeReport.executiveSummary}

## Key Grounded Findings
${activeReport.findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Stated Limitations
${activeReport.limitations.map((l, i) => `- ${l}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 font-mono">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-cyan-500/20 bg-black/60 backdrop-blur-md">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>GROUNDED RESEARCH REPORTS & FINDINGS</span>
          </h3>
          <p className="text-[11px] text-cyan-400/60 mt-0.5">
            Synthesized technical briefings with direct evidence linkages and stated limitations.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {questions.length > 0 && (
            <select
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black text-cyan-200 focus:outline-none focus:border-cyan-400 max-w-xs"
            >
              <option value="">Anchor on Primary Hypothesis</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 text-xs font-bold tracking-wider transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>{isGenerating ? 'SYNTHESIZING REPORT...' : 'GENERATE REPORT'}</span>
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-cyan-500/20 bg-black/40 p-12 text-center backdrop-blur-md">
          <FileText className="w-12 h-12 text-cyan-500/40 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white">No Reports Generated Yet</h4>
          <p className="text-xs text-cyan-400/60 mt-1 max-w-md mx-auto">
            Click "GENERATE REPORT" above to synthesize an executive research briefing derived from your project's grounded evidence and verified sources.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Reports Sidebar List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-[10px] text-cyan-400/60 uppercase tracking-wider mb-1 px-1">
              ARCHIVED PROJECT REPORTS ({reports.length})
            </div>
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  (activeReport?.id === report.id)
                    ? 'border-cyan-400/80 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'border-cyan-500/15 bg-black/40 text-slate-300 hover:border-cyan-500/40 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-cyan-400/60 mb-1">
                  <span>{new Date(report.generatedAt).toLocaleDateString()}</span>
                  <span className="font-mono">{report.id}</span>
                </div>
                <div className="text-xs font-bold text-white line-clamp-1">
                  {report.title}
                </div>
                <div className="mt-1 text-[11px] text-cyan-300/70 italic line-clamp-1">
                  "{report.researchQuestion}"
                </div>
              </button>
            ))}
          </div>

          {/* Active Report Viewer */}
          {activeReport && (
            <div className="lg:col-span-8 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-black/95 to-slate-950/95 p-6 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-5">
              {/* Header */}
              <div className="pb-4 border-b border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-cyan-400/60 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>JARVIS SCIENTIFIC SYNTHESIS REPORT // {activeReport.id}</span>
                  </div>
                  <h2 className="mt-1 text-base sm:text-lg font-bold text-white leading-tight">
                    {activeReport.title}
                  </h2>
                </div>

                <button
                  onClick={copyReport}
                  className="flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-400 bg-black text-xs text-cyan-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Brief' : 'Copy Brief'}</span>
                </button>
              </div>

              {/* Research Question Banner */}
              <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/30 text-xs">
                <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider block mb-0.5">
                  RESEARCH QUESTION ANCHOR:
                </span>
                <span className="text-cyan-100 font-sans italic">
                  "{activeReport.researchQuestion}"
                </span>
              </div>

              {/* Executive Summary */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-cyan-300 font-bold mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>I. EXECUTIVE SUMMARY</span>
                </h4>
                <div className="p-4 rounded-lg border border-cyan-500/15 bg-black/60 text-xs font-sans text-slate-100 leading-relaxed">
                  {activeReport.executiveSummary}
                </div>
              </div>

              {/* Key Findings */}
              {activeReport.findings && activeReport.findings.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-cyan-300 font-bold mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>II. KEY GROUNDED FINDINGS</span>
                  </h4>
                  <div className="space-y-2">
                    {activeReport.findings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-cyan-500/10 bg-black/40 text-xs font-sans text-slate-200 flex items-start gap-2.5"
                      >
                        <span className="text-cyan-400 font-mono font-bold">{idx + 1}.</span>
                        <div className="leading-relaxed">{finding}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence References & Source Citations */}
              {activeReport.sourceCitations && activeReport.sourceCitations.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-cyan-300 font-bold mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>III. VERIFIED SOURCE CITATIONS</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeReport.sourceCitations.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-cyan-500/15 bg-black/60 text-[11px]"
                      >
                        <div className="font-bold text-white truncate">{c.sourceTitle}</div>
                        <div className="mt-1 text-cyan-200/80 italic font-sans text-[10px] line-clamp-2">
                          "{c.excerpt}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stated Limitations */}
              {activeReport.limitations && activeReport.limitations.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>IV. BOUNDARY CONDITIONS & LIMITATIONS</span>
                  </h4>
                  <ul className="space-y-1.5 p-3 rounded-lg border border-amber-500/20 bg-amber-950/10 text-xs font-sans text-amber-200/90 list-disc list-inside">
                    {activeReport.limitations.map((limit, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {limit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-cyan-400/50">
                <span>Timestamp: {new Date(activeReport.generatedAt).toISOString()}</span>
                <span>Evidence References: {activeReport.evidenceReferences.length} Records</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
