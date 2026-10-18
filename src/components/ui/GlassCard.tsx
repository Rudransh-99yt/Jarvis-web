import React from 'react';

export type GlassLevel = 'ambient' | '1' | '2' | '3' | 'elevated' | 'lesson' | 'schedule' | 'intelligence';

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
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...props
}) => {
  const levelClass = {
    'ambient': 'glass-ambient',
    '1': 'glass-level-1',
    '2': interactive ? 'glass-level-2-interactive' : 'glass-level-2',
    '3': 'glass-level-3',
    'elevated': 'glass-elevated',
    'lesson': 'glass-lesson-card',
    'schedule': 'glass-schedule-card',
    'intelligence': 'glass-intelligence',
  }[level];

  const isInteractive = interactive || Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }
    if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e as any);
    }
  };

  return (
    <div
      role={isInteractive && !role ? 'button' : role}
      tabIndex={isInteractive && tabIndex === undefined ? 0 : tabIndex}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`rounded-xl ${levelClass} ${highlight ? 'glass-highlight' : ''} ${
        isInteractive
          ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 focus-ring select-none'
          : ''
      } ${className}`}
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
          {icon && <div className="text-neutral-300 shrink-0">{icon}</div>}
          <div className="min-w-0">
            {title && <h3 className="text-sm sm:text-base font-semibold text-neutral-100 truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-neutral-400 truncate mt-0.5">{subtitle}</p>}
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
