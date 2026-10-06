import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  options,
  label,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-neutral-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          ref={ref}
          className={`w-full appearance-none bg-white/[0.04] border border-white/[0.08] focus:border-white/[0.22] rounded-lg pl-3 pr-9 py-2 text-xs sm:text-sm text-neutral-100 backdrop-blur-md focus-ring transition-all cursor-pointer ${
            error ? 'border-rose-500/50 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-neutral-900 text-neutral-100">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 text-neutral-400 pointer-events-none flex items-center justify-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="text-xs text-rose-400 mt-1">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
