import React, { useState } from 'react';
import type { CopilotProposal, CopilotCommandIntent } from '../../../types/copilot.ts';
import { Sparkles, Check, X, Send, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  sessionId: string;
  courseCode?: string;
  selectedEquation?: string;
  onProposalApplied?: (proposal: CopilotProposal) => void;
}

export const TeachingCopilotTray: React.FC<Props> = ({
  sessionId,
  courseCode = 'PHYS-301',
  selectedEquation,
  onProposalApplied
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeProposal, setActiveProposal] = useState<CopilotProposal | null>(null);
  const [safeReply, setSafeReply] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSendCommand = async (cmd: string, targetIntent?: CopilotCommandIntent) => {
    if (!cmd.trim()) return;
    setIsProcessing(true);
    setSafeReply(null);
    setActiveProposal(null);

    try {
      const res = await fetch('/api/education/copilot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          context: { classSessionId: sessionId, courseCode },
          options: { selectedEquation, targetIntent }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Command execution failed');
      }

      if (data.immediateReply) {
        setSafeReply(data.immediateReply);
        setIsExpanded(true);
      } else if (data.proposal) {
        setActiveProposal(data.proposal);
        setIsExpanded(true);
      }
    } catch (err: any) {
      setNotice(err?.message || 'Failed to process command');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setIsProcessing(false);
      setCommandText('');
    }
  };

  const handleReviewProposal = async (decision: 'APPROVE' | 'REJECT') => {
    if (!activeProposal) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/education/copilot/proposals/${activeProposal.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setNotice(decision === 'APPROVE' ? 'Action approved and executed on SmartBoard!' : 'Proposal declined.');
        if (decision === 'APPROVE' && onProposalApplied) {
          onProposalApplied(data.proposal);
        }
        setActiveProposal(null);
      }
    } catch {
      setNotice('Error reviewing proposal.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-3 transition-all duration-200">
      <div className="bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-200 font-sans">
        {/* Notice Strip */}
        {notice && (
          <div className="bg-cyan-500 text-black text-xs font-mono font-bold px-3 py-1 text-center animate-fade-in">
            {notice}
          </div>
        )}

        {/* Expanded Proposal / Safe Reply Surface */}
        {isExpanded && (
          <div className="p-3.5 border-b border-slate-800/80 max-h-56 overflow-y-auto space-y-2.5 text-xs">
            {safeReply && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-cyan-500/30 text-slate-200 leading-relaxed font-sans">
                {safeReply}
              </div>
            )}

            {activeProposal && (
              <div className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 font-hud text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {activeProposal.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    NEEDS APPROVAL
                  </span>
                </div>
                <p className="text-slate-300 text-xs font-sans leading-normal">{activeProposal.summary}</p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleReviewProposal('REJECT')}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                  <button
                    onClick={() => handleReviewProposal('APPROVE')}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve & Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Suggestion Chips Tray */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-b border-slate-900 text-[11px] font-mono text-slate-300">
          <button
            onClick={() => handleSendCommand('Explain this derivation in detail', 'EXPLAIN_CONCEPT')}
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-cyan-300 whitespace-nowrap cursor-pointer transition-colors"
          >
            ⚡ Explain
          </button>
          <button
            onClick={() => handleSendCommand('Plot this equation on canvas', 'CREATE_GRAPH')}
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-cyan-300 whitespace-nowrap cursor-pointer transition-colors"
          >
            📈 Plot Graph
          </button>
          <button
            onClick={() => handleSendCommand('Start formative 2-question quiz pulse', 'START_QUIZ')}
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-amber-300 whitespace-nowrap cursor-pointer transition-colors"
          >
            ❓ Launch Quiz
          </button>
          <button
            onClick={() => handleSendCommand('Summarize board notes into revision sheet', 'SUMMARIZE_BOARD')}
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-purple-300 whitespace-nowrap cursor-pointer transition-colors"
          >
            📝 Summarize
          </button>
        </div>

        {/* Input Bar & Collapse Toggle */}
        <div className="flex items-center gap-2 p-2.5">
          <div className="flex-1 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              placeholder="Ask Jarvis Teaching Copilot..."
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCommand(commandText)}
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
            />
            {commandText.trim() && (
              <button
                onClick={() => handleSendCommand(commandText)}
                disabled={isProcessing}
                className="text-cyan-400 hover:text-cyan-300 p-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
            title={isExpanded ? 'Collapse Copilot Panel' : 'Expand Copilot Panel'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
