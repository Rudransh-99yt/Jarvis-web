import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl glass-level-2 border border-white/[0.06] ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-400 mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-sm sm:text-base font-semibold text-neutral-100 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-neutral-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
