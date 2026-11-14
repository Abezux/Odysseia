import React from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';
import type { Scenario, MetricsResult, Site } from '../../contracts';
import { Badge } from '../../ui/Badge';

export interface CompareGridProps {
  scenarios: Scenario[];
  results: Record<string, MetricsResult>;
  sites: Record<string, Site>;
  isLoading: boolean;
  onAddScenarioClick?: () => void;
}

export function CompareGrid({
  scenarios,
  results,
  sites,
  isLoading: _isLoading,
  onAddScenarioClick
}: CompareGridProps): React.JSX.Element {
  const { activeScenarioId, setActiveScenario, removeScenario, updateScenario } =
    useScenarioStore();

  const handleDateChange = (scenarioId: string, newDateIso: string) => {
    const d = new Date(newDateIso);
    if (!isNaN(d.getTime())) {
      updateScenario(scenarioId, { landingTimeIso: d.toISOString() });
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4 font-mono text-xs text-ink select-none">
      {/* Scenario Columns */}
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 pb-2">
        {scenarios.map((sc) => {
          const res = results[sc.id];
          const site = sites[sc.siteId];
          const isActive = sc.id === activeScenarioId;

          const sunEl = res?.currentEphemeris.sun.elevationDeg ?? 0;
          const earthEl = res?.currentEphemeris.earth.elevationDeg ?? 0;
          const powerProxy = res?.solarPowerProxyVertical ?? 0;
          const overallScore = res?.scorecard.overallScore ?? 50;

          return (
            <div
              key={sc.id}
              onClick={() => setActiveScenario(sc.id)}
              className={`flex flex-col justify-between rounded-2xl border bg-panel p-5 shadow-lg transition-all cursor-pointer ${
                isActive
                  ? 'border-amber shadow-[0_0_20px_rgba(245,165,36,0.15)] bg-[#201D1A]'
                  : 'border-panel-border hover:border-muted/50'
              }`}
            >
              <div className="space-y-4">
                {/* Header: Site Inspector Style */}
                <div className="flex items-start justify-between border-b border-panel-border pb-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sc.themeColor }}
                    />
                    <input
                      type="text"
                      value={sc.label}
                      onChange={(e) => updateScenario(sc.id, { label: e.target.value })}
                      className="bg-transparent font-sans text-xs font-bold text-ink focus:outline-none focus:ring-1 focus:ring-amber rounded px-1 -ml-1 truncate"
                      title="Click to rename scenario"
                    />
                  </div>

                  {scenarios.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeScenario(sc.id);
                      }}
                      className="text-muted hover:text-critical p-1 transition-colors text-xs"
                      title="Remove scenario"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Site Metadata & Coordinates in JetBrains Mono */}
                <div className="border-b border-panel-border pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold text-ink">
                      {site?.name ?? sc.siteId}
                    </span>
                    {site && (
                      <Badge variant="neutral" size="sm">
                        {site.agencyOrOperator}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted">
                    {site
                      ? `${Math.abs(site.latDeg).toFixed(2)}°${site.latDeg >= 0 ? 'N' : 'S'}, ${Math.abs(
                          site.lonDeg
                        ).toFixed(2)}°${site.lonDeg >= 0 ? 'E' : 'W'} (${site.elevationM ?? 0}m)`
                      : 'Coordinates unavailable'}
                  </div>
                </div>

                {/* Landing Date Epoch Picker */}
                <div className="border-b border-panel-border pb-3">
                  <label className="text-[10px] text-muted uppercase tracking-wider block mb-1">
                    Landing Epoch (UTC)
                  </label>
                  <input
                    type="datetime-local"
                    value={sc.landingTimeIso.slice(0, 16)}
                    onChange={(e) => handleDateChange(sc.id, e.target.value)}
                    className="w-full rounded-lg border border-panel-border bg-[#161412] px-2 py-1 font-mono text-[11px] text-amber focus:border-amber focus:outline-none"
                  />
                </div>

                {/* Site Inspector 3-Column Stats Row & Gauges */}
                <div className="grid grid-cols-3 gap-2 font-mono text-center">
                  <div className="rounded-xl border border-panel-border bg-[#161412] p-2">
                    <div className="text-[9px] uppercase text-muted font-sans">Sun Elev</div>
                    <div className="mt-1 text-xs font-bold text-ink">
                      {sunEl >= 0 ? `+${sunEl.toFixed(1)}°` : `${sunEl.toFixed(1)}°`}
                    </div>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-[#2E2A26] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber"
                        style={{ width: `${Math.min(100, Math.max(0, (sunEl + 2) * 20))}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-panel-border bg-[#161412] p-2">
                    <div className="text-[9px] uppercase text-muted font-sans">Earth Elev</div>
                    <div className="mt-1 text-xs font-bold text-ink">
                      {earthEl >= 0 ? `+${earthEl.toFixed(1)}°` : `${earthEl.toFixed(1)}°`}
                    </div>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-[#2E2A26] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald"
                        style={{ width: `${Math.min(100, Math.max(0, (earthEl + 2) * 10))}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-panel-border bg-[#161412] p-2">
                    <div className="text-[9px] uppercase text-muted font-sans">Power Proxy</div>
                    <div className="mt-1 text-xs font-bold text-amber">
                      {Math.round(powerProxy * 100)}%
                    </div>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-[#2E2A26] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber"
                        style={{ width: `${Math.round(powerProxy * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Scorecard Metric Breakdown */}
                {res ? (
                  <div className="space-y-2 pt-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Illumination:</span>
                      <span className="text-amber font-bold">
                        {Math.round(res.illuminationFraction * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">DTE Availability:</span>
                      <span className="text-emerald font-bold">
                        {Math.round(res.dteAvailabilityFraction * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Max Dark Stretch:</span>
                      <span className="text-ink font-bold">
                        {res.longestDarkStretchHours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Max DTE Blackout:</span>
                      <span className="text-ink font-bold">
                        {res.longestDteBlackoutHours.toFixed(1)} hrs
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center font-mono text-[11px] text-muted">
                    Computing ephemeris...
                  </div>
                )}
              </div>

              {/* Overall Feasibility Score */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-panel-border bg-[#161412] p-2.5">
                <span className="font-sans text-[11px] font-semibold text-muted">Feasibility</span>
                <span
                  className={`font-mono text-sm font-bold ${
                    overallScore >= 75
                      ? 'text-emerald'
                      : overallScore >= 50
                      ? 'text-amber'
                      : 'text-critical'
                  }`}
                >
                  {overallScore}/100
                </span>
              </div>
            </div>
          );
        })}

        {/* Empty Scenario Slot Trigger (up to 4) */}
        {scenarios.length < 4 && onAddScenarioClick && (
          <button
            type="button"
            onClick={onAddScenarioClick}
            className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-panel-border bg-panel/30 p-6 text-center transition-all hover:border-amber hover:bg-panel/60 focus:outline-none"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber/15 text-amber text-xl">
              +
            </div>
            <span className="mt-3 font-sans text-xs font-semibold text-ink">
              Add Comparative Site
            </span>
            <span className="mt-1 font-mono text-[10px] text-muted">
              {4 - scenarios.length} slots available
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
