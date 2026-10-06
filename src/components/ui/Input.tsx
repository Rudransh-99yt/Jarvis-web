import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  icon,
  iconRight,
  error,
  label,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full bg-slate-900/60 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 backdrop-blur-md focus-ring transition-all ${
            icon ? 'pl-9' : 'pl-3'
          } ${iconRight ? 'pr-9' : 'pr-3'} ${
            error ? 'border-rose-500/50 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 text-slate-400 flex items-center justify-center">
            {iconRight}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-400 mt-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onChange,
  onClear,
  shortcut = '⌘K',
  placeholder = 'Search...',
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900/70 hover:bg-slate-900/90 focus:bg-slate-900 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg pl-9 pr-14 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 backdrop-blur-md focus-ring transition-all"
        {...props}
      />
      <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-auto">
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClear?.();
            }}
            className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : shortcut ? (
          <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
            {shortcut}
          </span>
        ) : null}
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
