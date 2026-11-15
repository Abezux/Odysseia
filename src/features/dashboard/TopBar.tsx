import React from 'react';
import { Menu, Search, Bell, Columns3, ArrowLeft } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { safeViewTransition } from '../../lib/viewTransition';
import { Icon } from '../../ui/Icon';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleMobileDrawer: () => void;
  onOpenAlertsMobile?: () => void;
  onBackToLanding: () => void;
  isRealLolaData?: boolean;
  horizonCoverageStatus?: 'COMPLETE' | 'PARTIAL' | 'SYNTHETIC';
  realAzimuthPercent?: number;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onToggleMobileDrawer,
  onOpenAlertsMobile,
  onBackToLanding,
  isRealLolaData = true,
  horizonCoverageStatus,
  realAzimuthPercent
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
          <Icon icon={Menu} size={18} />
        </button>

        {/* Search input: 384px wide, #1A1816, rounded-lg */}
        <div className="relative hidden w-64 sm:block md:w-80 lg:w-[384px]">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <Icon icon={Search} size={16} />
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
          <span
            className={
              horizonCoverageStatus === 'PARTIAL'
                ? 'text-amber'
                : isRealLolaData
                ? 'text-ink'
                : 'text-warning'
            }
          >
            {horizonCoverageStatus === 'PARTIAL'
              ? `LOLA 20M (PARTIAL ${realAzimuthPercent ?? 53}%)`
              : isRealLolaData
              ? 'LOLA 20M DEM'
              : 'MOCK HORIZON (OUTSIDE 80°S)'}
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
          <Icon icon={Bell} size={18} />
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
          <Icon icon={Columns3} size={16} className="text-amber" />
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
          <Icon icon={ArrowLeft} size={16} />
          <span>Odysseia</span>
        </button>
      </div>
    </header>
  );
}
