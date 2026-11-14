import React, { useState, useMemo } from 'react';
import { useTimeStore } from '../../store/useTimeStore';
import { ephemerisEngine } from '../../lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../lib/metrics/visibility';
import { computeMissionScorecard } from '../../lib/metrics/scorecard';
import type { Site, HorizonProfile } from '../../contracts';

export interface DateSweepHeatmapProps {
  sites: Record<string, Site>;
  horizons: Record<string, HorizonProfile | null>;
  defaultSiteId?: string;
}

interface HeatmapCell {
  epoch: Date;
  label: string;
  score: number;
  illuminationPct: number;
  dtePct: number;
  sunElev: number;
  earthElev: number;
}

export function DateSweepHeatmap({
  sites,
  horizons,
  defaultSiteId
}: DateSweepHeatmapProps): React.JSX.Element {
  const { setTime } = useTimeStore();
  const siteList = useMemo(() => Object.values(sites), [sites]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    defaultSiteId ?? siteList[0]?.id ?? 'shackleton-rim'
  );
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const site = sites[selectedSiteId] ?? siteList[0];
  const horizon = horizons[selectedSiteId] ?? null;

  // Generate 12 synodic months × 4 quarter intervals (48 landing epochs across a full year)
  const heatmapData = useMemo(() => {
    if (!site) return [];
    const baseEpoch = new Date('2026-11-14T12:00:00Z');
    const synodicMs = 29.53 * 86400 * 1000;
    const rows = [];

    for (let m = 0; m < 12; m++) {
      const cycleStartMs = baseEpoch.getTime() + m * synodicMs;
      const cycleStartDate = new Date(cycleStartMs);
      const rowLabel = `${cycleStartDate.toLocaleString('default', {
        month: 'short'
      })} ${cycleStartDate.getUTCFullYear()}`;

      const cols: HeatmapCell[] = [];
      const stepsInCycle = 4; // 4 quarters per synodic month

      for (let step = 0; step < stepsInCycle; step++) {
        const epochMs = cycleStartMs + (step / stepsInCycle) * synodicMs;
        const epoch = new Date(epochMs);

        // Fast evaluation: sample at epoch + check illumination & DTE
        const ephem = ephemerisEngine.sample(
          { latDeg: site.latDeg, lonDeg: site.lonDeg, elevationM: site.elevationM },
          epoch
        );
        const sunTerr = getHorizonThresholdAtAzimuth(horizon, ephem.sun.azimuthDeg);
        const earthTerr = getHorizonThresholdAtAzimuth(horizon, ephem.earth.azimuthDeg);

        const isSunlit = ephem.sun.elevationDeg + 0.267 >= sunTerr && ephem.sun.elevationDeg >= -0.267;
        const isDte = ephem.earth.elevationDeg >= earthTerr && ephem.earth.elevationDeg >= 0;

        // Approximate synodic window stats for scorecard
        const illumFraction = isSunlit ? 0.75 : 0.25;
        const dteFraction = isDte ? 0.9 : 0.4;
        const longestSunlit = isSunlit ? 280 : 80;
        const longestDark = isSunlit ? 60 : 250;
        const longestBlackout = isDte ? 40 : 180;

        const scorecard = computeMissionScorecard({
          timeToNextSunsetHours: isSunlit ? 120 : null,
          timeToNextSunriseHours: isSunlit ? null : 40,
          timeToNextEarthsetHours: isDte ? 200 : null,
          timeToNextEarthriseHours: isDte ? null : 20,
          illuminationFraction: illumFraction,
          dteAvailabilityFraction: dteFraction,
          longestSunlitStretchHours: longestSunlit,
          longestDarkStretchHours: longestDark,
          longestDteBlackoutHours: longestBlackout,
          timelineWindows: []
        });

        cols.push({
          epoch,
          label: `Q${step + 1} (${epoch.toISOString().slice(5, 10)})`,
          score: scorecard.overallScore,
          illuminationPct: Math.round(illumFraction * 100),
          dtePct: Math.round(dteFraction * 100),
          sunElev: ephem.sun.elevationDeg,
          earthElev: ephem.earth.elevationDeg
        });
      }

      rows.push({ monthIndex: m, label: rowLabel, cols });
    }

    return rows;
  }, [site, horizon]);

  const getScoreColor = (score: number): string => {
    if (score >= 75) return 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50';
    if (score >= 60) return 'bg-emerald-800 hover:bg-emerald-700 border-emerald-700/50';
    if (score >= 45) return 'bg-amber-700 hover:bg-amber-600 border-amber-600/50';
    return 'bg-space-800 hover:bg-space-700 border-space-700/50';
  };

  return (
    <div className="flex flex-col space-y-3 rounded-lg border border-space-800 bg-space-900/60 p-4 font-mono text-xs text-slate-200">
      {/* Header & Site Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-space-800 pb-2.5">
        <div>
          <span className="font-sans font-semibold text-slate-100 text-sm">
            Synodic Date-Sweep Feasibility Heatmap
          </span>
          <div className="text-[10px] text-slate-400">
            1-Year annual launch window sweep (12 synodic cycles × 4 seasonal quarters)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-[11px]">Target Site:</label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="rounded border border-space-700 bg-space-950 px-2.5 py-1 text-slate-200 focus:border-sun-amber focus:outline-none text-[11px]"
          >
            {siteList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.agencyOrOperator})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 pt-1">
        {heatmapData.map((row) => (
          <div
            key={row.monthIndex}
            className="flex flex-col rounded border border-space-800/80 bg-space-950/60 p-2 space-y-1.5"
          >
            <div className="font-sans font-semibold text-slate-300 text-[11px] border-b border-space-800 pb-1">
              {row.label}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {row.cols.map((cell, idx) => (
                <div
                  key={idx}
                  onClick={() => setTime(cell.epoch)}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`flex flex-col items-center justify-center rounded border p-1 text-center cursor-pointer transition-all ${getScoreColor(
                    cell.score
                  )}`}
                  title={`Click to scrub to ${cell.epoch.toISOString().slice(0, 10)}`}
                >
                  <span className="text-[9px] text-slate-300">Q{idx + 1}</span>
                  <span className="font-bold text-[11px] text-slate-100">{cell.score}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hovered Cell Detail HUD */}
      <div className="flex items-center justify-between rounded border border-space-800 bg-space-950/80 px-3 py-2 text-[11px] text-slate-300">
        {hoveredCell ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-100">
              {hoveredCell.epoch.toISOString().slice(0, 10)} (Score: {hoveredCell.score}/100)
            </span>
            <span>Sun Elevation: <strong className="text-amber-400">{hoveredCell.sunElev.toFixed(1)}°</strong></span>
            <span>Earth Elevation: <strong className="text-sky-400">{hoveredCell.earthElev.toFixed(1)}°</strong></span>
            <span className="text-emerald-400 font-semibold">Click to scrub time</span>
          </div>
        ) : (
          <span className="text-slate-500">
            Hover over any quarter cell to inspect celestial elevations, or click to scrub simulation time.
          </span>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-600" /> &gt;75
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-800" /> 60-74
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-700" /> 45-59
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-space-800" /> &lt;45
          </span>
        </div>
      </div>
    </div>
  );
}
