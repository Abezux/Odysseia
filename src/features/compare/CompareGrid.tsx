import React from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';
import type { Scenario, MetricsResult, Site } from '../../contracts';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

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
  isLoading,
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
    <div className="flex h-full flex-col space-y-4 font-mono text-xs text-slate-200">
      {/* Scenario Columns */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-x-auto overflow-y-auto sm:grid-cols-2 lg:grid-cols-4 pb-2">
        {scenarios.map((sc) => {
          const res = results[sc.id];
          const site = sites[sc.siteId];
          const isActive = sc.id === activeScenarioId;

          return (
            <div
              key={sc.id}
              className={`flex flex-col rounded-lg border bg-space-900/60 p-3.5 transition-all ${
                isActive
                  ? 'border-sun-amber shadow-md shadow-sun-amber/10'
                  : 'border-space-800 hover:border-space-700'
              }`}
            >
              {/* Header: Theme color pill, Label & Remove Button */}
              <div className="flex items-center justify-between border-b border-space-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: sc.themeColor }}
                  />
                  <input
                    type="text"
                    value={sc.label}
                    onChange={(e) => updateScenario(sc.id, { label: e.target.value })}
                    className="bg-transparent font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-sun-amber rounded px-1 -ml-1 text-xs"
                    title="Click to rename scenario"
                  />
                </div>

                {scenarios.length > 1 && (
                  <button
                    onClick={() => removeScenario(sc.id)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors text-sm"
                    title="Remove scenario from comparison"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Site Details */}
              <div className="pt-2 pb-2 border-b border-space-800/80">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-semibold text-slate-200">
                    {site?.name ?? sc.siteId}
                  </span>
                  {site && (
                    <Badge variant="neutral" size="sm">
                      {site.agencyOrOperator}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {sc.customCoordinates
                    ? `${sc.customCoordinates.latDeg.toFixed(2)}°, ${sc.customCoordinates.lonDeg.toFixed(2)}°`
                    : site
                    ? `${site.latDeg.toFixed(2)}°, ${site.lonDeg.toFixed(2)}° (${site.elevationM ?? 0}m)`
                    : 'Coordinates unavailable'}
                </div>
              </div>

              {/* Landing Date Epoch Picker */}
              <div className="py-2.5 border-b border-space-800/80">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Landing Epoch (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={sc.landingTimeIso.slice(0, 16)}
                  onChange={(e) => handleDateChange(sc.id, e.target.value)}
                  className="w-full rounded border border-space-700 bg-space-950 px-2 py-1 text-[11px] text-slate-200 focus:border-sun-amber focus:outline-none"
                />
              </div>

              {/* Scorecard Gauge & Sub-scores */}
              {isLoading || !res ? (
                <div className="flex flex-1 items-center justify-center py-8 text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-sun-amber border-t-transparent" />
                    <span>Evaluating...</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-3 pt-3">
                  {/* Overall Score Badge */}
                  <div className="flex items-center justify-between rounded bg-space-950/70 p-2 border border-space-800">
                    <span className="text-[11px] font-sans font-medium text-slate-300">
                      Overall Feasibility
                    </span>
                    <Badge
                      variant={
                        res.scorecard.overallScore >= 70
                          ? 'success'
                          : res.scorecard.overallScore >= 40
                          ? 'warning'
                          : 'danger'
                      }
                      size="md"
                    >
                      {res.scorecard.overallScore}/100
                    </Badge>
                  </div>

                  {/* Sub-Score Bars */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                    <div className="rounded bg-space-950/50 p-1 border border-space-800/60">
                      <div className="text-slate-400 font-sans">Power</div>
                      <div className="font-bold text-amber-400">{res.scorecard.powerScore}</div>
                    </div>
                    <div className="rounded bg-space-950/50 p-1 border border-space-800/60">
                      <div className="text-slate-400 font-sans">Comms</div>
                      <div className="font-bold text-sky-400">
                        {res.scorecard.communicationScore}
                      </div>
                    </div>
                    <div className="rounded bg-space-950/50 p-1 border border-space-800/60">
                      <div className="text-slate-400 font-sans">Thermal</div>
                      <div className="font-bold text-emerald-400">
                        {res.scorecard.thermalSurvivabilityScore}
                      </div>
                    </div>
                  </div>

                  {/* Instantaneous Status at Epoch */}
                  <div className="rounded bg-space-950/40 p-2 border border-space-800/60 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Sun Status:</span>
                      <span
                        className={
                          res.currentEphemeris.sun.elevationDeg + 0.267 >=
                          res.sunTerrainElevationDeg
                            ? 'text-amber-400 font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        {res.currentEphemeris.sun.elevationDeg >= -0.267
                          ? `${res.currentEphemeris.sun.elevationDeg.toFixed(1)}° (Lit)`
                          : 'In Shadow'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Earth Link:</span>
                      <span
                        className={
                          res.currentEphemeris.earth.elevationDeg >=
                          res.earthTerrainElevationDeg
                            ? 'text-emerald-400 font-semibold'
                            : 'text-rose-400'
                        }
                      >
                        {res.currentEphemeris.earth.elevationDeg >= 0
                          ? `${res.currentEphemeris.earth.elevationDeg.toFixed(1)}° (LOS)`
                          : 'Blackout'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Vertical Solar Proxy:</span>
                      <span className="text-amber-300 font-semibold">
                        {(res.solarPowerProxyVertical * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* 29.53d Synodic Month Metrics */}
                  <div className="space-y-1 text-[11px] text-slate-300 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Illumination Fraction:</span>
                      <span className="font-semibold text-slate-100">
                        {(res.illuminationFraction * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">DTE Availability:</span>
                      <span className="font-semibold text-slate-100">
                        {(res.dteAvailabilityFraction * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Sunlit Stretch:</span>
                      <span className="font-semibold text-slate-100">
                        {res.longestSunlitStretchHours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Comms Blackout:</span>
                      <span className="font-semibold text-slate-100">
                        {res.longestDteBlackoutHours.toFixed(1)} hrs
                      </span>
                    </div>
                  </div>

                  {/* Set Active Button */}
                  <div className="pt-2 mt-auto">
                    <Button
                      variant={isActive ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setActiveScenario(sc.id)}
                      className="w-full text-[11px]"
                    >
                      {isActive ? '✓ Active Scenario' : 'Select Scenario'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Scenario Slot Card (if < 4) */}
        {scenarios.length < 4 && onAddScenarioClick && (
          <div
            onClick={onAddScenarioClick}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-space-800 bg-space-900/20 p-6 text-center hover:border-space-600 hover:bg-space-900/40 cursor-pointer transition-all min-h-[300px]"
          >
            <div className="h-10 w-10 rounded-full border border-space-700 bg-space-800 flex items-center justify-center text-slate-300 font-bold text-lg mb-2">
              +
            </div>
            <div className="font-sans font-semibold text-slate-300 text-xs">
              Add Comparative Scenario
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Compare up to 4 lunar landing sites or dates simultaneously
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
