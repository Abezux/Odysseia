import React, { useState } from 'react';
import type { Scenario, MetricsResult, Site } from '../../contracts';

export interface DeltaAnalysisProps {
  scenarios: Scenario[];
  results: Record<string, MetricsResult>;
  sites: Record<string, Site>;
}

export function DeltaAnalysis({
  scenarios,
  results,
  sites
}: DeltaAnalysisProps): React.JSX.Element {
  const [baseId, setBaseId] = useState<string>(scenarios[0]?.id ?? '');
  const [targetId, setTargetId] = useState<string>(
    scenarios[1]?.id ?? scenarios[0]?.id ?? ''
  );

  if (scenarios.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-panel-border bg-panel p-6 text-center font-mono text-xs text-muted">
        Add at least 2 scenarios to the comparison matrix to evaluate comparative trade-offs and deltas.
      </div>
    );
  }

  const baseSc = scenarios.find((s) => s.id === baseId) ?? scenarios[0];
  const targetSc = scenarios.find((s) => s.id === targetId) ?? scenarios[1];

  const baseRes = results[baseSc.id];
  const targetRes = results[targetSc.id];
  const baseSite = sites[baseSc.siteId];
  const targetSite = sites[targetSc.siteId];

  if (!baseRes || !targetRes || !baseSite || !targetSite) {
    return (
      <div className="flex h-48 items-center justify-center font-mono text-xs text-muted">
        Evaluating delta metrics...
      </div>
    );
  }

  // Delta calculations (Target - Baseline)
  const deltaScore = targetRes.scorecard.overallScore - baseRes.scorecard.overallScore;
  const deltaIllumPct = (targetRes.illuminationFraction - baseRes.illuminationFraction) * 100;
  const deltaDtePct = (targetRes.dteAvailabilityFraction - baseRes.dteAvailabilityFraction) * 100;
  const synodicHours = 29.53 * 24;
  const deltaIllumHours = (deltaIllumPct / 100) * synodicHours;
  const deltaDteHours = (deltaDtePct / 100) * synodicHours;
  const deltaBlackoutHours =
    targetRes.longestDteBlackoutHours - baseRes.longestDteBlackoutHours;

  const renderDeltaBadge = (val: number, unit = '', invertIsGood = false) => {
    const isPositive = val > 0;
    const isZero = Math.abs(val) < 0.05;
    const isGood = invertIsGood ? !isPositive : isPositive;

    if (isZero) return <span className="text-muted font-bold">0.0{unit}</span>;
    return (
      <span className={`font-bold font-mono ${isGood ? 'text-amber' : 'text-critical'}`}>
        {isPositive ? `+${val.toFixed(1)}` : val.toFixed(1)}
        {unit}
      </span>
    );
  };

  return (
    <div className="flex flex-col space-y-4 rounded-2xl border border-panel-border bg-panel p-6 font-mono text-xs text-ink select-none shadow-xl">
      {/* Scenario Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-panel-border pb-4">
        <div className="flex items-center gap-3">
          <span className="text-muted text-[11px] uppercase font-sans font-semibold">Baseline:</span>
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="rounded-lg border border-panel-border bg-[#161412] px-3 py-1.5 font-mono text-xs text-amber focus:border-amber focus:outline-none"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id} className="bg-panel text-ink">
                {sc.label} ({sites[sc.siteId]?.name})
              </option>
            ))}
          </select>
        </div>

        <span className="font-bold text-amber">VS</span>

        <div className="flex items-center gap-3">
          <span className="text-muted text-[11px] uppercase font-sans font-semibold">Comparison:</span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="rounded-lg border border-panel-border bg-[#161412] px-3 py-1.5 font-mono text-xs text-amber focus:border-amber focus:outline-none"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id} className="bg-panel text-ink">
                {sc.label} ({sites[sc.siteId]?.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bento Grid of Delta Metrics with best value highlighted in amber */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Score Delta */}
        <div className="rounded-xl border border-panel-border bg-[#161412] p-4 text-center">
          <div className="font-sans text-[10px] uppercase text-muted">Overall Score Delta</div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {renderDeltaBadge(deltaScore, ' pts')}
          </div>
          <div className="mt-1 text-[10px] text-muted font-mono">
            {baseRes.scorecard.overallScore} → {targetRes.scorecard.overallScore}/100
          </div>
        </div>

        {/* Sunlight Hours Delta */}
        <div className="rounded-xl border border-panel-border bg-[#161412] p-4 text-center">
          <div className="font-sans text-[10px] uppercase text-muted">Sunlight Duration Delta</div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {renderDeltaBadge(deltaIllumHours, ' hrs')}
          </div>
          <div className="mt-1 text-[10px] text-muted font-mono">
            {deltaIllumPct >= 0 ? `+${deltaIllumPct.toFixed(1)}%` : `${deltaIllumPct.toFixed(1)}%`} Synodic Month
          </div>
        </div>

        {/* DTE Hours Delta */}
        <div className="rounded-xl border border-panel-border bg-[#161412] p-4 text-center">
          <div className="font-sans text-[10px] uppercase text-muted">Comms Visibility Delta</div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {renderDeltaBadge(deltaDteHours, ' hrs')}
          </div>
          <div className="mt-1 text-[10px] text-muted font-mono">
            {deltaDtePct >= 0 ? `+${deltaDtePct.toFixed(1)}%` : `${deltaDtePct.toFixed(1)}%`} Direct LOS
          </div>
        </div>

        {/* Blackout Hours Delta */}
        <div className="rounded-xl border border-panel-border bg-[#161412] p-4 text-center">
          <div className="font-sans text-[10px] uppercase text-muted">Max Blackout Delta</div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {renderDeltaBadge(deltaBlackoutHours, ' hrs', true)}
          </div>
          <div className="mt-1 text-[10px] text-muted font-mono">
            {deltaBlackoutHours <= 0 ? 'Fewer blackout hours' : 'Longer blackout risk'}
          </div>
        </div>
      </div>

      {/* Quantitative Trade-off Verdict */}
      <div className="rounded-xl border border-panel-border bg-[#161412] p-4">
        <div className="font-sans text-xs font-semibold text-amber pb-1">
          Automated Trade-off Verdict
        </div>
        <p className="font-sans text-xs leading-relaxed text-muted mt-1">
          {deltaScore > 5
            ? `Target scenario "${targetSc.label}" demonstrates a superior mission operational margin (+${deltaScore} points overall), gaining ${Math.abs(
                deltaIllumHours
              ).toFixed(1)} hours of solar illumination.`
            : deltaScore < -5
            ? `Baseline scenario "${baseSc.label}" remains preferable for landing reliability, providing higher communications continuity and lower blackout risk.`
            : `Both scenarios offer balanced operational trade-offs within ±5 points of feasibility.`}
        </p>
      </div>
    </div>
  );
}
