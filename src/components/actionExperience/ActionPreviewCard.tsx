import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Zap,
  ArrowRight,
  Download,
  PlayCircle,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import type {
  ActionPreviewData,
  ActionResultData,
  ActionExecutionState
} from '../../types/actionExperience.ts';

interface ActionPreviewCardProps {
  preview: ActionPreviewData;
  executionState: ActionExecutionState;
  result?: ActionResultData;
  currentExecutionStep?: string;
  onProceed?: () => void;
  onConfirm?: (pendingActionId?: string) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onUndo?: () => void;
  onStartPractice?: () => void;
  onDownloadPdf?: () => void;
  onViewKnowledge?: () => void;
  className?: string;
}

export const ActionPreviewCard: React.FC<ActionPreviewCardProps> = ({
  preview,
  executionState,
  result,
  currentExecutionStep,
  onProceed,
  onConfirm,
  onCancel,
  onRetry,
  onUndo,
  onStartPractice,
  onDownloadPdf,
  onViewKnowledge,
  className = ''
}) => {
  const [isUndone, setIsUndone] = useState(result?.isUndone || false);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (result?.isUndone !== undefined) {
      setIsUndone(result.isUndone);
    }
  }, [result?.isUndone]);

  const handleUndoClick = async () => {
    if (!onUndo || isUndone || isUndoing) return;
    setIsUndoing(true);
    try {
      await onUndo();
      setIsUndone(true);
    } finally {
      setIsUndoing(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'READ_ONLY':
        return {
          label: 'Immediate · Read-Only',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        };
      case 'LOW_RISK_WRITE':
        return {
          label: 'Low-Risk Action',
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        };
      case 'HIGH_RISK_WRITE':
        return {
          label: 'Confirmation Required · High Risk',
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300'
        };
      case 'EXTERNAL_ACTION':
        return {
          label: 'Confirmation Required · External',
          bg: 'bg-purple-500/15 border-purple-500/40 text-purple-300'
        };
      default:
        return {
          label: risk,
          bg: 'bg-neutral-500/10 border-neutral-500/30 text-neutral-300'
        };
    }
  };

  const riskBadge = getRiskBadge(preview.riskLevel);

  return (
    <div
      className={`rounded-xl border font-sans text-xs transition-all overflow-hidden ${
        executionState === 'EXECUTING'
          ? 'border-cyan-400/50 bg-black/70 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
          : executionState === 'COMPLETED'
          ? 'border-emerald-500/30 bg-black/60 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
          : executionState === 'FAILED'
          ? 'border-rose-500/40 bg-black/70'
          : executionState === 'CANCELLED'
          ? 'border-neutral-700/40 bg-black/40 opacity-75'
          : executionState === 'CONFIRMATION_REQUIRED'
          ? 'border-amber-500/40 bg-black/70 shadow-[0_0_18px_rgba(245,158,11,0.12)]'
          : 'border-cyan-500/30 bg-black/60'
      } ${className}`}
    >
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            {executionState === 'EXECUTING' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                executionState === 'COMPLETED'
                  ? 'bg-emerald-400'
                  : executionState === 'FAILED'
                  ? 'bg-rose-400'
                  : executionState === 'CANCELLED'
                  ? 'bg-neutral-500'
                  : executionState === 'CONFIRMATION_REQUIRED'
                  ? 'bg-amber-400'
                  : 'bg-cyan-400'
              }`}
            />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-neutral-300">
            Jarvis Action // {executionState.replace('_', ' ')}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${riskBadge.bg}`}
        >
          {riskBadge.label}
        </span>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-3.5">
        {/* Title & Rationale */}
        <div>
          <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
            {preview.title}
          </h4>
          <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
            {preview.rationale}
          </p>
        </div>

        {/* 1. SOURCE BLOCK */}
        <div className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-start gap-2.5">
          <div className="p-1 rounded bg-cyan-950/60 border border-cyan-500/30 shrink-0 mt-0.5">
            {preview.source.type === 'EXISTING_VERIFIED' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : preview.source.type === 'ADAPTED' ? (
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Source
            </div>
            <div className="text-xs font-medium text-neutral-200 truncate">
              {preview.source.title}
            </div>
            {preview.source.details && (
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {preview.source.details}
              </div>
            )}
          </div>
        </div>

        {/* 2. PLAN BLOCK */}
        <div className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            <span>Execution Plan</span>
            <span>{preview.plan.totalItems} Items Total</span>
          </div>

          <div className="text-xs text-neutral-200 font-medium">
            {preview.plan.summary}
          </div>

          {/* Novelty Mode & Availability Callout */}
          {(preview.plan.noveltyMode || preview.plan.unseenAvailable !== undefined || preview.plan.previouslySeen !== undefined) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] text-neutral-300 font-mono">
              {preview.plan.noveltyMode && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
                  MODE: {preview.plan.noveltyMode.replace('_', ' ')}
                </span>
              )}
              {preview.plan.unseenAvailable !== undefined && (
                <span className="text-emerald-400/90">
                  {preview.plan.unseenAvailable} unseen available
                </span>
              )}
              {preview.plan.previouslySeen !== undefined && preview.plan.previouslySeen > 0 && (
                <span className="text-neutral-400">
                  ({preview.plan.previouslySeen} seen previously)
                </span>
              )}
            </div>
          )}

          {/* Breakdown Badges: Reused vs Adapted vs Newly Generated vs Review */}
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
            {preview.plan.reusedItems > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {preview.plan.reusedItems} Reused (Verified)
              </span>
            )}

            {preview.plan.adaptedItems !== undefined && preview.plan.adaptedItems > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                <Layers className="w-3 h-3 text-cyan-400" />
                {preview.plan.adaptedItems} Adapted
              </span>
            )}

            {preview.plan.generatedItems > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {preview.plan.generatedItems} Newly Generated
              </span>
            )}

            {preview.plan.reviewItems !== undefined && preview.plan.reviewItems > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <RotateCcw className="w-3 h-3 text-amber-400" />
                {preview.plan.reviewItems} Review (Past)
              </span>
            )}

            {preview.plan.reusedItems === 0 && preview.plan.generatedItems === 0 && (
              <span className="text-neutral-400">Standard execution</span>
            )}
          </div>
        </div>


        {/* 3. EXECUTION STATES CONTENT */}

        {/* State: CONFIRMATION REQUIRED */}
        {executionState === 'CONFIRMATION_REQUIRED' && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/20 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 text-[11px] font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Explicit Confirmation Required</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              This action modifies state or executes external communications. Server authority requires explicit confirmation before proceeding.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => onConfirm?.(preview.pendingActionId)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Execute</span>
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* State: EXECUTING */}
        {executionState === 'EXECUTING' && (
          <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="font-semibold">
                {currentExecutionStep || 'Executing action…'}
              </span>
            </div>
            <div className="h-1 w-full bg-cyan-950 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* State: COMPLETED */}
        {executionState === 'COMPLETED' && (
          <div className="space-y-3 pt-1">
            {/* Result Header */}
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{result?.title || 'Practice Set Ready'}</span>
                </div>
                {result?.subtitle && (
                  <p className="text-[11px] text-emerald-200/80">
                    {result.subtitle}
                  </p>
                )}
              </div>

              {/* Counts Badge */}
              {result?.totalCount !== undefined && (
                <div className="text-[11px] font-mono text-neutral-300 shrink-0">
                  <span className="font-bold text-white">{result.totalCount}</span> questions (
                  <span className="text-emerald-400">{result.reusedCount || 0} reused</span>
                  {result.generatedCount !== undefined && result.generatedCount > 0
                    ? ` · ${result.generatedCount} generated`
                    : ''}
                  )
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onStartPractice && (
                <button
                  onClick={onStartPractice}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Start Practice</span>
                </button>
              )}

              {onDownloadPdf && (
                <button
                  onClick={onDownloadPdf}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              )}

              {onViewKnowledge && (
                <button
                  onClick={onViewKnowledge}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-300" />
                  <span>View Knowledge</span>
                </button>
              )}

              {/* Safe Undo Button: ONLY when action is genuinely reversible */}
              {preview.canUndo && onUndo && (
                <div className="ml-auto">
                  {isUndone ? (
                    <span className="text-[10px] font-mono text-neutral-500 italic">
                      Action Reverted
                    </span>
                  ) : (
                    <button
                      onClick={handleUndoClick}
                      disabled={isUndoing}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/30 border border-white/10 text-neutral-400 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Safely reverse this local creation"
                    >
                      <RotateCcw className={`w-3 h-3 ${isUndoing ? 'animate-spin' : ''}`} />
                      <span>{preview.undoLabel || 'Undo'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Next Best Action Card (Deterministic) */}
            {result?.nextBestAction && (
              <div className="p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-950/15 flex items-center justify-between gap-3 font-sans">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase">
                    <ChevronRight className="w-3 h-3 text-cyan-400" />
                    <span>Next Recommended Action</span>
                  </div>
                  <div className="text-xs font-semibold text-white truncate">
                    {result.nextBestAction.title}
                  </div>
                  <div className="text-[10px] text-neutral-400 line-clamp-1">
                    {result.nextBestAction.rationale}
                  </div>
                </div>

                {onStartPractice && result.nextBestAction.actionType === 'start_practice' && (
                  <button
                    onClick={onStartPractice}
                    className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono shrink-0 transition-colors cursor-pointer"
                  >
                    Launch →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* State: FAILED */}
        {executionState === 'FAILED' && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/20 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Jarvis couldn't complete this action.</span>
            </div>
            <p className="text-[11px] text-rose-200/80">
              {result?.errorMessage || 'An error occurred during execution. Verification boundaries prevented state corruption.'}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Action</span>
              </button>
            )}
          </div>
        )}

        {/* State: CANCELLED */}
        {executionState === 'CANCELLED' && (
          <div className="p-2.5 rounded-lg border border-neutral-700/50 bg-neutral-900/40 text-[11px] text-neutral-400 flex items-center gap-2">
            <XCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Action was cancelled by user. No system or knowledge state was changed.</span>
          </div>
        )}

        {/* State: PREVIEW (Initial prompt to proceed) */}
        {executionState === 'PREVIEW' && onProceed && (
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            <span className="text-[10px] font-mono text-neutral-400">
              Ready to execute
            </span>
            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-2.5 py-1 rounded text-neutral-400 hover:text-neutral-200 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={onProceed}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Use these questions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
