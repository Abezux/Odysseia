import React from 'react';
import type { Scenario, MetricsResult } from '../../contracts';

export interface MetricBarCompareProps {
  scenarios: Scenario[];
  results: Record<string, MetricsResult>;
}

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  getValue: (res: MetricsResult) => number;
  formatValue: (val: number) => string;
  maxVal: number;
}

export function MetricBarCompare({
  scenarios,
  results
}: MetricBarCompareProps): React.JSX.Element {
  const metrics: MetricDef[] = [
    {
      key: 'overallScore',
      label: 'Overall Feasibility Score',
      unit: '/100',
      higherIsBetter: true,
      getValue: (res) => res.scorecard.overallScore,
      formatValue: (v) => `${v.toFixed(0)} pts`,
      maxVal: 100
    },
    {
      key: 'illumination',
      label: 'Solar Illumination Fraction',
      unit: '%',
      higherIsBetter: true,
      getValue: (res) => res.illuminationFraction * 100,
      formatValue: (v) => `${v.toFixed(1)}%`,
      maxVal: 100
    },
    {
      key: 'dte',
      label: 'Earth DTE Link Availability',
      unit: '%',
      higherIsBetter: true,
      getValue: (res) => res.dteAvailabilityFraction * 100,
      formatValue: (v) => `${v.toFixed(1)}%`,
      maxVal: 100
    },
    {
      key: 'sunlit',
      label: 'Max Continuous Sunlight',
      unit: 'hrs',
      higherIsBetter: true,
      getValue: (res) => res.longestSunlitStretchHours,
      formatValue: (v) => `${v.toFixed(1)} hrs`,
      maxVal: 708 // ~29.53 days max
    },
    {
      key: 'blackout',
      label: 'Max Comms Blackout',
      unit: 'hrs',
      higherIsBetter: false, // Shorter is better!
      getValue: (res) => res.longestDteBlackoutHours,
      formatValue: (v) => `${v.toFixed(1)} hrs`,
      maxVal: 708
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 font-mono text-xs text-slate-200">
      {metrics.map((m) => {
        // Find best scenario for this metric
        const validScenarios = scenarios.filter((sc) => results[sc.id]);
        let bestScenarioId: string | null = null;
        if (validScenarios.length > 0) {
          const vals = validScenarios.map((sc) => ({
            id: sc.id,
            val: m.getValue(results[sc.id])
          }));
          vals.sort((a, b) => (m.higherIsBetter ? b.val - a.val : a.val - b.val));
          bestScenarioId = vals[0].id;
        }

        return (
          <div
            key={m.key}
            className="flex flex-col rounded-lg border border-space-800 bg-space-900/50 p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-space-800 pb-1.5">
              <span className="font-sans font-semibold text-slate-200">{m.label}</span>
              <span className="text-[10px] text-slate-400">
                {m.higherIsBetter ? 'Higher is better' : 'Lower is better'}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {scenarios.map((sc) => {
                const res = results[sc.id];
                if (!res) {
                  return (
                    <div key={sc.id} className="flex items-center justify-between text-slate-500">
                      <span>{sc.label}</span>
                      <span>Pending...</span>
                    </div>
                  );
                }

                const val = m.getValue(res);
                const isBest = sc.id === bestScenarioId && validScenarios.length > 1;
                const widthPct = Math.min(100, Math.max(3, (val / m.maxVal) * 100));

                return (
                  <div key={sc.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: sc.themeColor }}
                        />
                        <span className="text-slate-300">{sc.label}</span>
                        {isBest && (
                          <span className="rounded bg-emerald-950/80 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-800/60">
                            ★ Best
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-100">{m.formatValue(val)}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded bg-space-950 border border-space-800/60">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: sc.themeColor
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
