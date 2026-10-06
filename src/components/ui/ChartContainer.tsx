import React from 'react';

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  action,
  children,
  footer,
  className = '',
}) => {
  return (
    <div className={`rounded-xl glass-level-2 overflow-hidden flex flex-col ${className}`}>
      <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-100 tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4 sm:p-5 flex-1 min-h-[160px] flex items-center justify-center">
        {children}
      </div>
      {footer && (
        <div className="px-4 py-3 border-t border-white/[0.06] bg-slate-950/30 text-xs text-slate-400 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};
