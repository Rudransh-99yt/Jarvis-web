import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'segmented' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'segmented',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`flex items-center gap-4 sm:gap-6 border-b border-white/[0.08] overflow-x-auto no-scrollbar ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 py-3 px-1 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-ring select-none ${
                isActive
                  ? 'border-white text-white font-semibold shadow-[0_1px_0_0_#ffffff]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-white/[0.15] text-white' : 'bg-white/[0.06] text-neutral-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Segmented control variant
  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md overflow-x-auto max-w-full ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-ring select-none ${
              isActive
                ? 'bg-white/[0.09] text-white font-semibold shadow-sm border border-white/[0.14]'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                isActive ? 'bg-white/[0.15] text-white' : 'bg-white/[0.06] text-neutral-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
