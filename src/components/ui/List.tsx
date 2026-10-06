import React from 'react';

export interface ListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  action,
  onClick,
  className = '',
  active = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-lg transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:bg-white/[0.05]' : ''
      } ${
        active
          ? 'bg-slate-800/80 border border-cyan-500/30 text-white'
          : 'border border-transparent'
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="text-cyan-400 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-medium text-slate-100 truncate">{title}</div>
          {subtitle && <div className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export interface ListProps {
  children: React.ReactNode;
  className?: string;
  divided?: boolean;
}

export const List: React.FC<ListProps> = ({
  children,
  className = '',
  divided = false,
}) => {
  return (
    <div className={`space-y-1 ${divided ? 'divide-y divide-white/[0.04]' : ''} ${className}`}>
      {children}
    </div>
  );
};
