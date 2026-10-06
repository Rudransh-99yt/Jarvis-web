import React from 'react';

export type BadgeVariant = 'info' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple';

export interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
  dot?: boolean;
  unboxed?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  label,
  children,
  dot = true,
  unboxed = false,
  className = '',
  size = 'md',
}) => {
  const content = children !== undefined ? children : label;

  const dotColor = {
    info: 'bg-cyan-400',
    cyan: 'bg-cyan-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    neutral: 'bg-slate-400',
    purple: 'bg-purple-400',
  }[variant];

  const textColor = {
    info: 'text-cyan-300',
    cyan: 'text-cyan-300',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    danger: 'text-rose-300',
    neutral: 'text-slate-300',
    purple: 'text-purple-300',
  }[variant];

  const boxedStyles = {
    info: 'bg-cyan-500/10 border-cyan-500/25',
    cyan: 'bg-cyan-500/10 border-cyan-500/25',
    success: 'bg-emerald-500/10 border-emerald-500/25',
    warning: 'bg-amber-500/10 border-amber-500/25',
    danger: 'bg-rose-500/10 border-rose-500/25',
    neutral: 'bg-slate-800/60 border-white/[0.08]',
    purple: 'bg-purple-500/10 border-purple-500/25',
  }[variant];

  const sizeStyles = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  if (unboxed) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium ${textColor} ${className}`}>
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
        <span>{content}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border backdrop-blur-sm ${sizeStyles} ${boxedStyles} ${textColor} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span>{content}</span>
    </span>
  );
};
