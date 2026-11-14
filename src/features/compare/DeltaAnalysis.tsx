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
      <div className="flex h-48 items-center justify-center rounded-lg border border-space-800 bg-space-900/30 p-6 text-center font-mono text-xs text-slate-500">
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
      <div className="flex h-48 items-center justify-center font-mono text-xs text-slate-500">
        Evaluating delta metrics...
      </div>
    );
  }

  // Delta calculations (Target - Baseline)
  const deltaScore = targetRes.scorecard.overallScore - baseRes.scorecard.overallScore;
  const deltaPower = targetRes.scorecard.powerScore - baseRes.scorecard.powerScore;
  const deltaComms = targetRes.scorecard.communicationScore - baseRes.scorecard.communicationScore;
  const deltaIllumPct = (targetRes.illuminationFraction - baseRes.illuminationFraction) * 100;
  const deltaDtePct = (targetRes.dteAvailabilityFraction - baseRes.dteAvailabilityFraction) * 100;
  const synodicHours = 29.53 * 24;
  const deltaIllumHours = (deltaIllumPct / 100) * synodicHours;
  const deltaDteHours = (deltaDtePct / 100) * synodicHours;
  const deltaBlackoutHours =
    targetRes.longestDteBlackoutHours - baseRes.longestDteBlackoutHours;

  return (
    <div className="flex flex-col space-y-4 rounded-lg border border-space-800 bg-space-900/60 p-4 font-mono text-xs text-slate-200">
      {/* Scenario Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-space-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-sans font-semibold text-slate-300">Baseline (A):</span>
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="rounded border border-space-700 bg-space-950 px-2 py-1 text-slate-200 focus:border-sun-amber focus:outline-none"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({sites[s.siteId]?.name ?? s.siteId})
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 font-bold">VS</div>

        <div className="flex items-center gap-2">
          <span className="font-sans font-semibold text-slate-300">Candidate (B):</span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="rounded border border-space-700 bg-space-950 px-2 py-1 text-slate-200 focus:border-sun-amber focus:outline-none"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({sites[s.siteId]?.name ?? s.siteId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delta Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Score Delta */}
        <div className="rounded border border-space-800 bg-space-950/60 p-2.5 text-center">
          <div className="text-[10px] text-slate-400 font-sans">Overall Score Delta</div>
          <div
            className={`text-base font-bold mt-1 ${
              deltaScore > 0 ? 'text-emerald-400' : deltaScore < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {deltaScore > 0 ? `+${deltaScore}` : deltaScore} pts
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            P: {deltaPower >= 0 ? `+${deltaPower}` : deltaPower} | C: {deltaComms >= 0 ? `+${deltaComms}` : deltaComms}
          </div>
        </div>

        {/* Illumination Delta */}
        <div className="rounded border border-space-800 bg-space-950/60 p-2.5 text-center">
          <div className="text-[10px] text-slate-400 font-sans">Sunlight Delta</div>
          <div
            className={`text-base font-bold mt-1 ${
              deltaIllumPct > 0 ? 'text-amber-400' : deltaIllumPct < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {deltaIllumPct > 0 ? `+${deltaIllumPct.toFixed(1)}%` : `${deltaIllumPct.toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {deltaIllumHours >= 0 ? `+${deltaIllumHours.toFixed(1)} hrs` : `${deltaIllumHours.toFixed(1)} hrs`} / month
          </div>
        </div>

        {/* DTE Delta */}
        <div className="rounded border border-space-800 bg-space-950/60 p-2.5 text-center">
          <div className="text-[10px] text-slate-400 font-sans">DTE Comms Delta</div>
          <div
            className={`text-base font-bold mt-1 ${
              deltaDtePct > 0 ? 'text-sky-400' : deltaDtePct < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {deltaDtePct > 0 ? `+${deltaDtePct.toFixed(1)}%` : `${deltaDtePct.toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {deltaDteHours >= 0 ? `+${deltaDteHours.toFixed(1)} hrs` : `${deltaDteHours.toFixed(1)} hrs`} / month
          </div>
        </div>

        {/* Blackout Delta */}
        <div className="rounded border border-space-800 bg-space-950/60 p-2.5 text-center">
          <div className="text-[10px] text-slate-400 font-sans">Max Blackout Delta</div>
          <div
            className={`text-base font-bold mt-1 ${
              deltaBlackoutHours < 0
                ? 'text-emerald-400' // Shorter blackout is positive!
                : deltaBlackoutHours > 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {deltaBlackoutHours > 0
              ? `+${deltaBlackoutHours.toFixed(1)} hrs`
              : `${deltaBlackoutHours.toFixed(1)} hrs`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {deltaBlackoutHours <= 0 ? 'Reduced blackout risk' : 'Elevated comms blackout'}
          </div>
        </div>
      </div>

      {/* Decision Summary */}
      <div className="rounded-lg border border-space-800 bg-space-950/80 p-3 text-slate-300">
        <div className="flex items-center gap-2 pb-1 text-xs font-semibold text-slate-100 font-sans">
          <span>Mission Planner Trade-off Synthesis</span>
          {deltaScore > 5 && (
            <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] text-emerald-400 border border-emerald-800">
              Candidate B Preferred
            </span>
          )}
          {deltaScore < -5 && (
            <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[9px] text-amber-400 border border-amber-800">
              Baseline A Preferred
            </span>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-slate-300">
          Comparing <strong className="text-slate-100">{targetSc.label}</strong> against{' '}
          <strong className="text-slate-100">{baseSc.label}</strong>:{' '}
          {deltaIllumPct > 0
            ? `Candidate B provides +${deltaIllumPct.toFixed(1)}% higher illumination (+${deltaIllumHours.toFixed(
                0
              )} hrs of direct sunlight), increasing solar energy harvesting. `
            : deltaIllumPct < 0
            ? `Candidate B receives ${Math.abs(deltaIllumPct).toFixed(1)}% less illumination (${Math.abs(
                deltaIllumHours
              ).toFixed(0)} fewer sunlit hours). `
            : 'Both scenarios exhibit identical illumination fractions. '}
          {deltaBlackoutHours < 0
            ? `Furthermore, communication blackout stretches are reduced by ${Math.abs(
                deltaBlackoutHours
              ).toFixed(1)} hours, lowering relay dependency.`
            : deltaBlackoutHours > 0
            ? `However, it experiences +${deltaBlackoutHours.toFixed(
                1
              )} hours longer continuous comms blackout, necessitating expanded on-board telemetry buffering or satellite relay.`
            : 'Communication availability and blackout durations are equivalent.'}
        </p>
      </div>
    </div>
  );
}
