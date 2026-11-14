import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { safeViewTransition } from '../../lib/viewTransition';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleMobileDrawer: () => void;
  onOpenAlertsMobile?: () => void;
  onBackToLanding: () => void;
  isRealLolaData?: boolean;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onToggleMobileDrawer,
  onOpenAlertsMobile,
  onBackToLanding,
  isRealLolaData = true
}: TopBarProps): React.JSX.Element {
  const { mode, setMode, setCompareOpen, isCompareOpen } = useUIStore();
  const { scenarios } = useScenarioStore();
  const { playbackSpeed } = useTimeStore();

  const handleModeChange = (newMode: 'overview' | 'technical') => {
    safeViewTransition(() => {
      setMode(newMode);
    });
  };

  const handleCompareClick = () => {
    safeViewTransition(() => {
      setCompareOpen(!isCompareOpen);
    });
  };

  return (
    <header className="view-toolbar flex h-16 w-full shrink-0 items-center justify-between border-b border-panel-border bg-[#0B0A09]/95 px-4 backdrop-blur-md z-30 select-none">
      {/* Left: Mobile Hamburger + 384px Search Input + Mode Switcher */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger (under 820px) */}
        <button
          type="button"
          onClick={onToggleMobileDrawer}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-panel-border bg-panel text-muted hover:text-ink md:hidden focus:outline-none"
          title="Open landing site drawer"
          aria-label="Open landing site drawer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search input: 384px wide, #1A1816, rounded-lg */}
        <div className="relative hidden w-64 sm:block md:w-80 lg:w-[384px]">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search site, coordinates, agency..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-panel-border bg-panel py-2 pl-9 pr-3 font-mono text-xs text-ink placeholder:text-muted transition-colors focus:border-amber focus:outline-none"
          />
        </div>

        {/* Mode Switcher: Pill container #1A1816 with 1px border; Overview | Astrometric */}
        <div className="flex items-center rounded-full border border-panel-border bg-panel p-1 scale-90 md:scale-100 transition-transform">
          <button
            type="button"
            onClick={() => handleModeChange('overview')}
            className={`rounded-full px-3.5 py-1 text-xs font-sans transition-all focus:outline-none ${
              mode === 'overview'
                ? 'bg-amber text-amber-text font-semibold shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('technical')}
            className={`rounded-full px-3.5 py-1 text-xs font-sans transition-all focus:outline-none ${
              mode === 'technical'
                ? 'bg-amber text-amber-text font-semibold shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            Astrometric
          </button>
        </div>
      </div>

      {/* Right: Live-status text + Notification Bell + Compare (n) + Back to Odysseia */}
      <div className="flex items-center gap-3">
        {/* Mono Live Status Text */}
        <div className="hidden items-center gap-2 font-mono text-[11px] text-muted xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
          <span>SIM LIVE · {playbackSpeed}X</span>
          <span>·</span>
          <span className={isRealLolaData ? 'text-ink' : 'text-warning'}>
            {isRealLolaData ? 'LOLA 20M DEM' : 'MOCK HORIZON'}
          </span>
        </div>

        {/* Notification Bell with Amber Pulse Dot */}
        <button
          type="button"
          onClick={onOpenAlertsMobile}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-panel-border bg-panel text-muted hover:text-ink transition-colors focus:outline-none"
          title="Mission Alert Feed"
          aria-label="Mission Alert Feed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* Amber Pulse Dot */}
          <span className="site-dot-pulse absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber" />
        </button>

        {/* Compare (n) Button with count badge */}
        <button
          type="button"
          onClick={handleCompareClick}
          className="flex items-center gap-2 rounded-lg border border-panel-border bg-panel px-3 py-1.5 font-sans text-xs font-semibold text-ink transition-all hover:border-amber/60 hover:bg-[#221F1C] focus:outline-none"
          title="Open Comparative Scenario Matrix"
        >
          <svg className="h-3.5 w-3.5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span>Compare</span>
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber px-1 font-mono text-[10px] font-bold text-amber-text">
            {scenarios.length}
          </span>
        </button>

        {/* Back to Odysseia Link */}
        <button
          type="button"
          onClick={() => {
            safeViewTransition(onBackToLanding);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-amber hover:border-amber/40 focus:outline-none"
          title="Return to Odysseia Landing Page"
        >
          <span>←</span>
          <span>Odysseia</span>
        </button>
      </div>
    </header>
  );
}
