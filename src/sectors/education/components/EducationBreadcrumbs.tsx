import React from 'react';
import { ChevronRight, Home, Building2, BookOpen, Layers, FileText } from 'lucide-react';

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
}

export const EducationBreadcrumbs: React.FC<EducationBreadcrumbsProps> = ({ items, onHomeClick }) => {
  if (items.length === 0) return null;

  const getIcon = (type: BreadcrumbItem['type']) => {
    switch (type) {
      case 'institution':
        return <Building2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'subject':
        return <BookOpen className="w-3.5 h-3.5 text-cyan-400" />;
      case 'unit':
        return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case 'lesson':
        return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return null;
    }
  };

  return (
    <nav aria-label="Education Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs font-mono text-cyan-400/60 py-1.5 px-3 rounded-lg border border-cyan-500/15 bg-black/40 backdrop-blur-sm">
      {onHomeClick && (
        <button
          onClick={onHomeClick}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-200 hover:underline transition-colors p-1 rounded"
          title="Education Home"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Education</span>
        </button>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const icon = getIcon(item.type);

        return (
          <React.Fragment key={item.id || index}>
            <ChevronRight className="w-3 h-3 text-cyan-500/30 shrink-0" />
            {isLast || !item.onClick ? (
              <span className={`flex items-center gap-1.5 font-bold truncate max-w-[200px] sm:max-w-[320px] ${isLast ? 'text-white' : 'text-cyan-300'}`}>
                {icon}
                <span className="truncate">{item.label}</span>
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="flex items-center gap-1.5 text-cyan-400/80 hover:text-cyan-200 hover:underline transition-colors truncate max-w-[160px] sm:max-w-[240px] text-left"
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
