import React from 'react';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading intelligence...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center space-y-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <div className="absolute w-4 h-4 rounded-full bg-white/[0.08] blur-sm" />
      </div>
      <p className="text-xs font-mono text-neutral-400 animate-pulse">{label}</p>
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'button';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    card: 'h-28 w-full rounded-xl',
    circle: 'w-10 h-10 rounded-full shrink-0',
    button: 'h-9 w-24 rounded-lg',
  }[variant];

  return (
    <div
      className={`bg-white/[0.04] border border-white/[0.04] animate-pulse ${variantStyles} ${className}`}
    />
  );
};
