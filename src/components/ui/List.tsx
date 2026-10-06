import React from 'react';

export interface ListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  action,
  badge,
  active = false,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 sm:p-3.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
        onClick ? 'cursor-pointer hover:bg-white/[0.05]' : ''
      } ${
        active
          ? 'bg-white/[0.08] border border-white/[0.14] text-white'
          : 'border border-transparent text-neutral-200'
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="text-neutral-400 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-medium truncate">{title}</div>
          {subtitle && <div className="text-[11px] text-neutral-400 truncate mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {(badge || action) && (
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          {action}
        </div>
      )}
    </div>
  );
};

export interface ListProps {
  children: React.ReactNode;
  className?: string;
}

export const List: React.FC<ListProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {children}
    </div>
  );
};
