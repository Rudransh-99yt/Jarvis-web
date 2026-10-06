import React from 'react';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading intelligent telemetry...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-cyan-400 animate-spin" />
        <div className="absolute w-5 h-5 rounded-full bg-cyan-500/20 blur-sm" />
      </div>
      <p className="text-xs font-mono text-slate-400 animate-pulse tracking-wide">
        {label}
      </p>
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
}) => {
  const variantStyles = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full w-10 h-10 shrink-0',
    rectangular: 'rounded-xl w-full h-24',
  }[variant];

  return (
    <div
      style={{ width, height }}
      className={`bg-slate-800/40 border border-white/[0.04] animate-pulse ${variantStyles} ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-5 rounded-xl glass-level-2 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width="36px" height="36px" />
        <div className="space-y-1.5 flex-1">
          <Skeleton variant="text" width="60%" height="14px" />
          <Skeleton variant="text" width="40%" height="10px" />
        </div>
      </div>
      <Skeleton variant="rectangular" height="60px" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton variant="text" width="30%" height="12px" />
        <Skeleton variant="text" width="20%" height="12px" />
      </div>
    </div>
  );
};
