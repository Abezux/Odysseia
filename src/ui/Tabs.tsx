import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="View tabs"
      className={`inline-flex rounded-full border border-panel-border bg-panel p-1 select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-sans font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 ${
              isActive
                ? 'bg-amber text-amber-text font-semibold shadow-sm'
                : 'text-muted hover:text-ink hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
