import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  width?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className = '',
  width = 'w-56',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 ${width} rounded-xl glass-level-3 p-1.5 shadow-2xl z-50 animate-scale-in`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                item.danger
                  ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                  : 'text-slate-200 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.icon && <span className="shrink-0 text-slate-400">{item.icon}</span>}
                <div className="min-w-0">
                  <div className="truncate">{item.label}</div>
                  {item.description && (
                    <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                  )}
                </div>
              </div>
              {item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
