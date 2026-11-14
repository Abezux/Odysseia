import React, { useState, useMemo } from 'react';
import { useTimeStore } from '../../store/useTimeStore';
import { ephemerisEngine } from '../../lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../lib/metrics/visibility';
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
      })} '${cycleStartDate.getFullYear().toString().slice(2)}`;

      const cols: HeatmapCell[] = [];
      for (let q = 0; q < 4; q++) {
        const epochMs = cycleStartMs + (q * synodicMs) / 4;
        const epochDate = new Date(epochMs);

        const ephem = ephemerisEngine.sample(
          { latDeg: site.latDeg, lonDeg: site.lonDeg, elevationM: site.elevationM },
          epochDate
        );

        const sunTerr = getHorizonThresholdAtAzimuth(horizon, ephem.sun.azimuthDeg);
        const earthTerr = getHorizonThresholdAtAzimuth(horizon, ephem.earth.azimuthDeg);

        const sunClearance = ephem.sun.elevationDeg - sunTerr;
        const earthClearance = ephem.earth.elevationDeg - earthTerr;

        const isSunlit = sunClearance >= -0.267;
        const isDte = earthClearance >= 0;

        const baseScore = site.isSouthPoleRegion ? 72 : 55;
        const score = Math.min(
          100,
          Math.max(
            15,
            Math.round(
              baseScore +
                (isSunlit ? 18 : -25) +
                (isDte ? 10 : -15) +
                Math.sin(m * 0.5) * 6
            )
          )
        );

        cols.push({
          epoch: epochDate,
          label: `${rowLabel} Q${q + 1}`,
          score,
          illuminationPct: isSunlit ? 85 : 15,
          dtePct: isDte ? 95 : 5,
          sunElev: ephem.sun.elevationDeg,
          earthElev: ephem.earth.elevationDeg
        });
      }
      rows.push({ monthIndex: m, label: rowLabel, cols });
    }
    return rows;
  }, [site, horizon]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-amber text-amber-text border-amber font-bold';
    if (score >= 60) return 'bg-emerald/20 text-emerald border-emerald/40';
    if (score >= 45) return 'bg-[#1E1B18] text-muted border-panel-border';
    return 'bg-[#161412] text-critical/80 border-critical/30';
  };

  return (
    <div className="flex flex-col space-y-4 rounded-2xl border border-panel-border bg-panel p-6 font-mono text-xs text-ink select-none shadow-xl">
      {/* Header & Site Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-panel-border pb-3">
        <div>
          <span className="font-sans font-bold text-ink text-xs uppercase tracking-wider">
            Synodic Date-Sweep Feasibility Heatmap
          </span>
          <div className="text-[10px] text-muted font-mono mt-0.5">
            1-Year annual launch window sweep (12 synodic cycles × 4 seasonal quarters)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-muted text-[11px] font-sans">Target Site:</label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="rounded-lg border border-panel-border bg-[#161412] px-3 py-1.5 text-ink focus:border-amber focus:outline-none text-[11px]"
          >
            {siteList.map((s) => (
              <option key={s.id} value={s.id} className="bg-panel text-ink">
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
            className="flex flex-col rounded-xl border border-panel-border bg-[#161412] p-2.5 space-y-2"
          >
            <div className="font-mono font-bold text-muted text-[11px] border-b border-panel-border pb-1">
              {row.label}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {row.cols.map((cell, idx) => (
                <div
                  key={idx}
                  onClick={() => setTime(cell.epoch)}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-1 text-center cursor-pointer transition-all ${getScoreColor(
                    cell.score
                  )}`}
                  title={`Click to scrub to ${cell.epoch.toISOString().slice(0, 10)}`}
                >
                  <span className="text-[9px] opacity-80">Q{idx + 1}</span>
                  <span className="font-bold text-[11px] font-mono">{cell.score}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hovered Cell Detail HUD */}
      <div className="flex items-center justify-between rounded-xl border border-panel-border bg-[#161412] px-4 py-2.5 text-[11px] text-muted font-mono">
        {hoveredCell ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-amber">
              {hoveredCell.epoch.toISOString().slice(0, 10)} (Score: {hoveredCell.score}/100)
            </span>
            <span>
              Sun: <span className="text-ink">+{hoveredCell.sunElev.toFixed(1)}°</span>
            </span>
            <span>
              Earth: <span className="text-ink">+{hoveredCell.earthElev.toFixed(1)}°</span>
            </span>
            <span>
              Illumination: <span className="text-ink">{hoveredCell.illuminationPct}%</span>
            </span>
          </div>
        ) : (
          <span>Hover over any quarterly cell to inspect epoch details, or click to jump simulation time.</span>
        )}
      </div>
    </div>
  );
}
