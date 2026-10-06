import React from 'react';

export type GlassLevel = '1' | '2' | '3';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel;
  interactive?: boolean;
  highlight?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  level = '2',
  interactive = false,
  highlight = false,
  children,
  className = '',
  ...props
}) => {
  const levelClass = {
    '1': 'glass-level-1',
    '2': interactive ? 'glass-level-2-interactive cursor-pointer' : 'glass-level-2',
    '3': 'glass-level-3',
  }[level];

  return (
    <div
      className={`rounded-xl ${levelClass} ${highlight ? 'glass-highlight' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-white/[0.06] ${className}`} {...props}>
      {(title || subtitle || icon) ? (
        <div className="flex items-center gap-3 min-w-0">
          {icon && <div className="text-cyan-400 shrink-0">{icon}</div>}
          <div className="min-w-0">
            {title && <h3 className="text-sm sm:text-base font-semibold text-slate-100 truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
      ) : children}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 border-t border-white/[0.06] flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
};
