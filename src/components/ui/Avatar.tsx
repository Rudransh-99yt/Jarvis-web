import React from 'react';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  className = '',
}) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  }[size];

  const statusSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  }[size];

  const statusColors = {
    online: 'bg-emerald-400',
    offline: 'bg-neutral-500',
    busy: 'bg-amber-400',
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`rounded-full object-cover border border-white/[0.14] shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${sizeClasses}`}
        />
      ) : (
        <div
          className={`rounded-full bg-gradient-to-b from-white/[0.10] to-white/[0.03] backdrop-blur-md border border-white/[0.16] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center font-mono font-medium text-neutral-200 ${sizeClasses}`}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-black ${statusSizeClasses} ${statusColors[status]}`}
        />
      )}
    </div>
  );
};
