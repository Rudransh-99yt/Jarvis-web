import React from 'react';
import { ArrowLeft, ChevronRight, Home, Building2, BookOpen, Layers, FileText } from 'lucide-react';
import { glassTokens } from '../../../design-system/tokens.ts';

export interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'institution' | 'academic_year' | 'batch' | 'subject' | 'unit' | 'lesson' | 'section';
  onClick?: () => void;
  active?: boolean;
}

interface EducationBreadcrumbsProps {
  items: BreadcrumbItem[];
  onHomeClick?: () => void;
  onBack?: () => void;
  backLabel?: string;
}

export const EducationBreadcrumbs: React.FC<EducationBreadcrumbsProps> = ({
  items,
  onHomeClick,
  onBack,
  backLabel
}) => {
  if (items.length === 0) return null;

  const getIcon = (type: BreadcrumbItem['type']) => {
    switch (type) {
      case 'institution':
        return <Building2 className="w-3.5 h-3.5 text-neutral-300 shrink-0" />;
      case 'subject':
        return <BookOpen className="w-3.5 h-3.5 text-neutral-300 shrink-0" />;
      case 'unit':
        return <Layers className="w-3.5 h-3.5 text-neutral-300 shrink-0" />;
      case 'lesson':
        return <FileText className="w-3.5 h-3.5 text-neutral-300 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <nav aria-label="Education Breadcrumb" className={`flex items-center flex-wrap gap-1.5 text-xs text-neutral-400 py-1.5 px-3 rounded-xl border border-white/[0.08] ${glassTokens.level2}`}>
      {onBack && (
        <>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors py-1 px-2 rounded-lg cursor-pointer focus-ring bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono mr-0.5"
            title={backLabel ? `Back to ${backLabel}` : 'Back to previous view'}
            aria-label={backLabel ? `Back to ${backLabel}` : 'Back to previous view'}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-300" />
            <span className="font-medium">Back</span>
          </button>
          <span className="text-white/[0.15] select-none mx-0.5">|</span>
        </>
      )}

      {onHomeClick && (
        <button
          onClick={onHomeClick}
          className="flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors p-1 rounded-md cursor-pointer focus-ring"
          title="Education Home"
        >
          <Home className="w-3.5 h-3.5 text-neutral-300" />
          <span className="hidden sm:inline font-medium">Home</span>
        </button>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const icon = getIcon(item.type);

        return (
          <React.Fragment key={item.id || index}>
            <ChevronRight className="w-3 h-3 text-neutral-600 shrink-0" />
            {isLast || !item.onClick ? (
              <span className={`flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-[320px] ${isLast ? 'text-neutral-100 font-medium' : 'text-neutral-300'}`}>
                {icon}
                <span className="truncate">{item.label}</span>
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors truncate max-w-[160px] sm:max-w-[240px] text-left cursor-pointer focus-ring rounded-md p-0.5"
                title={item.label}
              >
                {icon}
                <span className="truncate">{item.label}</span>
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
