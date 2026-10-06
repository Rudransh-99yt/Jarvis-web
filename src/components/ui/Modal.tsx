import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button.tsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Floating Glass Surface (Level 3) */}
      <div
        ref={modalRef}
        className={`relative w-full ${widthClasses} rounded-2xl glass-level-3 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 animate-scale-in ${className}`}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
            <div className="min-w-0">
              {title && <h2 className="text-base sm:text-lg font-semibold text-slate-100 truncate">{title}</h2>}
              {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
            </div>
            <IconButton
              size="sm"
              variant="ghost"
              label="Close modal"
              onClick={onClose}
              className="shrink-0 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        )}

        {/* Content */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain flex-1 text-sm text-slate-200">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-black/25 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
