import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

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
      className={`flex flex-wrap items-center gap-2 py-1.5 px-2.5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md font-mono text-xs text-slate-300 w-fit max-w-full ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 hover:text-white text-cyan-300 font-bold tracking-tight transition-all cursor-pointer group"
        aria-label={`Go back to ${parentLabel}`}
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>← Back</span>
      </button>

      {hierarchySegments && hierarchySegments.length > 0 ? (
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden text-slate-400">
          <span className="text-slate-600 hidden sm:inline">|</span>
          {hierarchySegments.map((segment, index) => {
            const isLast = index === hierarchySegments.length - 1;
            return (
              <React.Fragment key={`${segment.label}-${index}`}>
                {index > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                {segment.onClick && !isLast ? (
                  <button
                    type="button"
                    onClick={segment.onClick}
                    className="hover:text-cyan-300 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                  >
                    {segment.label}
                  </button>
                ) : (
                  <span
                    className={`truncate max-w-[140px] sm:max-w-[240px] ${
                      isLast ? 'text-white font-semibold' : ''
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
        <span className="text-slate-400 truncate text-[11px]">
          to <span className="text-slate-200 font-medium">{parentLabel}</span>
          {currentLabel && (
            <>
              <span className="text-slate-600 mx-1.5">·</span>
              <span className="text-white font-semibold">{currentLabel}</span>
            </>
          )}
        </span>
      ) : null}
    </div>
  );
};
