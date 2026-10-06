import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { glassTokens } from '../../../design-system/tokens.ts';

interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

interface SharedBackButtonProps {
  onBack: () => void;
  parentLabel?: string;
  currentLabel?: string;
  hierarchySegments?: BreadcrumbSegment[];
  className?: string;
}

export const SharedBackButton: React.FC<SharedBackButtonProps> = ({
  onBack,
  parentLabel = 'Back',
  currentLabel,
  hierarchySegments,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 py-1.5 px-3 rounded-xl border border-white/[0.08] ${glassTokens.level2} text-xs text-slate-300 w-fit max-w-full ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-lg border border-white/[0.08] bg-slate-800/90 hover:bg-slate-700/90 hover:border-cyan-500/30 text-cyan-300 hover:text-white font-medium tracking-tight transition-all cursor-pointer group focus-ring shrink-0"
        aria-label={`Go back to ${parentLabel}`}
      >
        <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back</span>
      </button>

      {hierarchySegments && hierarchySegments.length > 0 ? (
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden text-slate-400 text-xs">
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          {hierarchySegments.map((segment, index) => {
            const isLast = index === hierarchySegments.length - 1;
            return (
              <React.Fragment key={`${segment.label}-${index}`}>
                {index > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                {segment.onClick && !isLast ? (
                  <button
                    type="button"
                    onClick={segment.onClick}
                    className="hover:text-cyan-300 transition-colors truncate max-w-[120px] sm:max-w-[200px] cursor-pointer"
                  >
                    {segment.label}
                  </button>
                ) : (
                  <span
                    className={`truncate max-w-[140px] sm:max-w-[240px] ${
                      isLast ? 'text-slate-100 font-medium' : ''
                    }`}
                  >
                    {segment.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ) : parentLabel ? (
        <span className="text-slate-400 truncate text-[11px] flex items-center gap-1.5">
          <span>to</span>
          <span className="text-slate-200 font-medium">{parentLabel}</span>
          {currentLabel && (
            <>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-100 font-medium truncate max-w-[180px] sm:max-w-[260px]">{currentLabel}</span>
            </>
          )}
        </span>
      ) : null}
    </div>
  );
};

