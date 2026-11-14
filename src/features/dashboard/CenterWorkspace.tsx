import React, { useState } from 'react';
import { useUIStore, type CenterTab } from '../../store/useUIStore';
import { MoonGlobeView } from '../globe';
import { TerrainView } from '../terrain';
import { HorizonView } from '../horizon';
import { Tabs, type TabItem } from '../../ui/Tabs';
import type { MetricsResult, Site } from '../../contracts';
import { safeViewTransition } from '../../lib/viewTransition';

const viewportTabs: TabItem[] = [
  { id: 'globe', label: '🌐 3D Moon Globe' },
  { id: 'terrain', label: '🏔️ 3D Local Terrain' },
  { id: 'horizon', label: '🔭 Horizon Panorama' }
];

interface CenterWorkspaceProps {
  metrics: MetricsResult | null;
  activeSite: Site | null;
}

export function CenterWorkspace({ metrics, activeSite }: CenterWorkspaceProps): React.JSX.Element {
  const { activeCenterTab, setActiveCenterTab } = useUIStore();

  // HUD layer controls state
  const [layers, setLayers] = useState({
    terminator: true,
    siteMarkers: true,
    earthVector: true,
    shadowMap: true,
    labels: true
  });

  const [isLayerHudOpen, setIsLayerHudOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleTabChange = (tabId: string) => {
    safeViewTransition(() => {
      setActiveCenterTab(tabId as CenterTab);
    });
  };

  const sunEl = metrics?.currentEphemeris.sun.elevationDeg ?? 1.8;
  const sunTerr = metrics?.sunTerrainElevationDeg ?? 0.5;
  const sunClearance = sunEl - sunTerr;
  const isSunlit = sunClearance >= 0;

  const earthEl = metrics?.currentEphemeris.earth.elevationDeg ?? 6.2;
  const earthTerr = metrics?.earthTerrainElevationDeg ?? 1.1;
  const earthClearance = earthEl - earthTerr;
  const isEarthVisible = earthClearance >= 0;

  const illumPct = metrics ? Math.round(metrics.illuminationFraction * 100) : 82;
  const dtePct = metrics ? Math.round(metrics.dteAvailabilityFraction * 100) : 94;

  const countdownText =
    metrics?.timeToNextSunsetHours !== null && metrics?.timeToNextSunsetHours !== undefined
      ? `${metrics.timeToNextSunsetHours.toFixed(1)}h`
      : metrics?.timeToNextSunriseHours !== null && metrics?.timeToNextSunriseHours !== undefined
      ? `${metrics.timeToNextSunriseHours.toFixed(1)}h`
      : 'CONT. LIGHT';

  const countdownLabel =
    metrics?.timeToNextSunsetHours !== null ? 'SUNSET IN' : 'SUNRISE IN';

  return (
    <main className="view-content flex flex-1 flex-col overflow-y-auto p-4 space-y-4 select-none">
      {/* 1. KPI Grid: 4 columns (sm:2, xl:4). Bold JetBrains Mono values */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Sun Elevation */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber text-base">
              ☀️
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                Sun Elevation
              </div>
              <div className="font-mono text-xl font-bold text-ink">
                {sunEl >= 0 ? `+${sunEl.toFixed(2)}°` : `${sunEl.toFixed(2)}°`}
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
              isSunlit
                ? 'bg-emerald/15 text-emerald border border-emerald/30'
                : 'bg-critical/15 text-critical border border-critical/30'
            }`}
          >
            {isSunlit ? 'CLEAR' : 'OCCLUDED'}
          </span>
        </div>

        {/* KPI 2: Earth Elevation */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber text-base">
              🌐
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                Earth Elevation
              </div>
              <div className="font-mono text-xl font-bold text-ink">
                {earthEl >= 0 ? `+${earthEl.toFixed(2)}°` : `${earthEl.toFixed(2)}°`}
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
              isEarthVisible
                ? 'bg-emerald/15 text-emerald border border-emerald/30'
                : 'bg-critical/15 text-critical border border-critical/30'
            }`}
          >
            {isEarthVisible ? 'LOS CLEAR' : 'BLACKOUT'}
          </span>
        </div>

        {/* KPI 3: Illumination % */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber text-base">
              ⚡
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                Illumination %
              </div>
              <div className="font-mono text-xl font-bold text-amber">
                {illumPct}%
              </div>
            </div>
          </div>
          <span className="rounded-full bg-panel border border-panel-border px-2.5 py-0.5 font-mono text-[10px] uppercase text-muted">
            SYNODIC
          </span>
        </div>

        {/* KPI 4: Next Event Countdown */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber text-base">
              ⏱️
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                {countdownLabel}
              </div>
              <div className="font-mono text-xl font-bold text-ink">
                {countdownText}
              </div>
            </div>
          </div>
          <span className="rounded-full bg-amber/15 text-amber border border-amber/30 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
            EVENT
          </span>
        </div>
      </div>

      {/* 2. Main Viewport Container: rounded-3xl, flexible height */}
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-3xl border border-panel-border bg-[#0B0A09] shadow-2xl transition-all duration-300 ${
          isMaximized ? 'fixed inset-4 z-50 h-[calc(100vh-32px)]' : 'h-[clamp(420px,calc(100vh-360px),720px)]'
        }`}
      >
        {/* Top-Center Floating Tab Switcher */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <Tabs
            tabs={viewportTabs}
            activeTab={activeCenterTab}
            onChange={handleTabChange}
          />
        </div>

        {/* Top-Left HUD: Layer Control Glass Panel */}
        <div className="absolute top-4 left-4 z-30 pointer-events-auto">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLayerHudOpen(!isLayerHudOpen)}
              className="flex items-center gap-2 rounded-xl glass-panel px-3 py-1.5 font-sans text-xs text-ink transition-colors hover:border-amber/50 focus:outline-none"
            >
              <span className="text-amber">≡</span>
              <span>Layers</span>
            </button>

            {isLayerHudOpen && (
              <div className="absolute left-0 mt-2 w-48 rounded-2xl glass-panel p-3 shadow-2xl space-y-2 z-40">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted pb-1 border-b border-panel-border">
                  Display Layers
                </div>
                {Object.entries(layers).map(([key, val]) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between text-xs text-ink capitalize">
                    <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                      className="accent-amber"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top-Right HUD: View Controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="flex h-8 w-8 items-center justify-center rounded-xl glass-panel text-muted hover:text-ink hover:border-amber/50 transition-colors focus:outline-none"
            title={isMaximized ? 'Restore Viewport' : 'Maximize Viewport'}
          >
            {isMaximized ? '↙' : '↗'}
          </button>
        </div>

        {/* 3D Canvas / Projection Viewport with Radial Gradient Vignette Mask */}
        <div className="relative h-full w-full">
          {activeCenterTab === 'globe' && <MoonGlobeView />}
          {activeCenterTab === 'terrain' && <TerrainView />}
          {activeCenterTab === 'horizon' && <HorizonView />}

          {/* Radial Edge Fade Mask */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 65%, rgba(11, 10, 9, 0.85) 100%)'
            }}
          />
        </div>
      </div>

      {/* 3. Analytics Bento Grid Below Viewport: 2 columns (1 under 1000px) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Card: Power & Darkness Forecast */}
        <div className="flex flex-col justify-between rounded-2xl border border-panel-border bg-panel p-5 shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-panel-border">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink">
                Power & Darkness Forecast
              </span>
              <span className="font-mono text-[11px] text-amber">
                {activeSite?.name || 'ACTIVE SITE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4 text-xs font-mono">
              <div className="rounded-xl border border-panel-border bg-[#161412] p-3">
                <div className="text-[10px] uppercase text-muted font-sans">Next Sunset</div>
                <div className="mt-1 text-base font-bold text-ink">
                  {metrics?.timeToNextSunsetHours ? `${metrics.timeToNextSunsetHours.toFixed(1)} hrs` : 'Continuous Light'}
                </div>
              </div>
              <div className="rounded-xl border border-panel-border bg-[#161412] p-3">
                <div className="text-[10px] uppercase text-muted font-sans">Max Sunlit Stretch</div>
                <div className="mt-1 text-base font-bold text-amber">
                  {metrics?.longestSunlitStretchHours ? `${metrics.longestSunlitStretchHours.toFixed(1)} hrs` : '184.2 hrs'}
                </div>
              </div>
            </div>

            {/* Illumination by lunar-day cohort */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase text-muted">
                <span>Illumination by lunar-day cohort</span>
                <span>4-Week Synodic Cycle</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { cohort: 'W1', pct: 92 },
                  { cohort: 'W2', pct: 88 },
                  { cohort: 'W3', pct: 74 },
                  { cohort: 'W4', pct: 68 }
                ].map((c) => (
                  <div key={c.cohort} className="flex flex-col items-center gap-1.5">
                    <div className="h-16 w-full rounded-md bg-[#161412] p-1 flex items-end">
                      <div
                        className="w-full rounded bg-amber transition-all duration-500"
                        style={{ height: `${c.pct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-muted">{c.cohort} ({c.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Sun & Earth Visibility */}
        <div className="flex flex-col justify-between rounded-2xl border border-panel-border bg-panel p-5 shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-panel-border">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink">
                Sun & Earth Visibility
              </span>
              <span className="font-mono text-[11px] text-muted">
                TOPOCENTRIC CLEARANCE
              </span>
            </div>

            {/* Vertical Bar Clearance Comparison */}
            <div className="space-y-3 py-4">
              {/* Sun bar */}
              <div>
                <div className="flex items-center justify-between font-mono text-xs pb-1">
                  <span className="text-muted">Solar Elevation vs Horizon</span>
                  <span className={sunClearance >= 0 ? 'text-emerald font-bold' : 'text-critical font-bold'}>
                    {sunClearance >= 0 ? `+${sunClearance.toFixed(2)}° Clearance` : `${sunClearance.toFixed(2)}° Occluded`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#161412] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, (sunEl + 2) * 15))}%` }}
                  />
                </div>
              </div>

              {/* Earth bar */}
              <div>
                <div className="flex items-center justify-between font-mono text-xs pb-1">
                  <span className="text-muted">Earth Elevation vs Horizon</span>
                  <span className={earthClearance >= 0 ? 'text-emerald font-bold' : 'text-critical font-bold'}>
                    {earthClearance >= 0 ? `+${earthClearance.toFixed(2)}° Margin` : `${earthClearance.toFixed(2)}° Occluded`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#161412] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, (earthEl + 2) * 10))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Summary Row of Two Metric Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-panel-border bg-[#161412] p-3 text-center">
                <div className="font-sans text-[10px] uppercase text-muted">Illuminated Window</div>
                <div className="font-mono text-lg font-bold text-amber mt-0.5">{illumPct}%</div>
              </div>
              <div className="rounded-xl border border-panel-border bg-[#161412] p-3 text-center">
                <div className="font-sans text-[10px] uppercase text-muted">Earth-Visible (DTE)</div>
                <div className="font-mono text-lg font-bold text-emerald mt-0.5">{dtePct}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
