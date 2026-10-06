import React from 'react';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  dot?: boolean;
  unboxed?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  label,
  dot = true,
  unboxed = false,
  className = '',
  size = 'md',
}) => {
  const dotColor = {
    info: 'bg-cyan-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    neutral: 'bg-slate-400',
  }[variant];

  const textColor = {
    info: 'text-cyan-300',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    danger: 'text-rose-300',
    neutral: 'text-slate-300',
  }[variant];

  const boxedStyles = {
    info: 'bg-cyan-500/10 border-cyan-500/25',
    success: 'bg-emerald-500/10 border-emerald-500/25',
    warning: 'bg-amber-500/10 border-amber-500/25',
    danger: 'bg-rose-500/10 border-rose-500/25',
    neutral: 'bg-slate-800/60 border-white/[0.08]',
  }[variant];

  const sizeStyles = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  if (unboxed) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium ${textColor} ${className}`}>
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border backdrop-blur-sm ${sizeStyles} ${boxedStyles} ${textColor} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span>{label}</span>
    </span>
  );
};
