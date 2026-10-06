import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'glass',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[32px] rounded-lg',
    md: 'text-xs sm:text-sm px-3.5 py-2 gap-2 min-h-[40px] rounded-lg',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 min-h-[44px] rounded-xl',
  }[size];

  const variantStyles = {
    primary: 'bg-white/[0.12] hover:bg-white/[0.18] text-white font-medium shadow-sm border border-white/[0.2] active:scale-[0.98]',
    secondary: 'bg-white/[0.05] hover:bg-white/[0.09] text-neutral-200 border border-white/[0.08] hover:border-white/[0.16] active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-white/[0.05] text-neutral-300 hover:text-white border border-transparent active:scale-[0.98]',
    glass: 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white border border-white/[0.08] hover:border-white/[0.16] backdrop-blur-md shadow-sm active:scale-[0.98]',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 active:scale-[0.98]',
  }[variant];

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center font-medium transition-all duration-150 whitespace-nowrap cursor-pointer select-none focus-ring disabled:opacity-40 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!isLoading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  variant = 'glass',
  size = 'md',
  label,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs rounded-lg min-w-[32px] min-h-[32px]',
    md: 'w-10 h-10 text-sm rounded-lg min-w-[40px] min-h-[40px]',
    lg: 'w-11 h-11 text-base rounded-xl min-w-[44px] min-h-[44px]',
  }[size];

  const variantStyles = {
    primary: 'bg-white/[0.12] hover:bg-white/[0.18] text-white font-medium shadow-sm border border-white/[0.2] active:scale-[0.98]',
    secondary: 'bg-white/[0.05] hover:bg-white/[0.09] text-neutral-200 border border-white/[0.08] active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-white/[0.05] text-neutral-300 hover:text-white border border-transparent active:scale-[0.98]',
    glass: 'bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] backdrop-blur-md active:scale-[0.98]',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-[0.98]',
  }[variant];

  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none focus-ring disabled:opacity-40 disabled:cursor-not-allowed ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
