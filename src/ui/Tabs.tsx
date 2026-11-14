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
      className={`inline-flex rounded-md border border-space-700 bg-space-950/60 p-1 select-none ${className}`}
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
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sun-amber/50 ${
              isActive
                ? 'bg-space-800 text-slate-100 shadow-sm border border-space-600/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-space-900/50'
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
