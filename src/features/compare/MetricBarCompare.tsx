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
      maxVal: 708
    },
    {
      key: 'darkness',
      label: 'Longest Darkness Stretch',
      unit: 'hrs',
      higherIsBetter: false,
      getValue: (res) => res.longestDarkStretchHours,
      formatValue: (v) => `${v.toFixed(1)} hrs`,
      maxVal: 708
    },
    {
      key: 'blackout',
      label: 'Max DTE Blackout Duration',
      unit: 'hrs',
      higherIsBetter: false,
      getValue: (res) => res.longestDteBlackoutHours,
      formatValue: (v) => `${v.toFixed(1)} hrs`,
      maxVal: 708
    }
  ];

  return (
    <div className="flex flex-col space-y-4 rounded-2xl border border-panel-border bg-panel p-6 font-mono text-xs text-ink select-none shadow-xl">
      <div className="flex items-center justify-between border-b border-panel-border pb-3">
        <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-ink">
          Grouped Metric Comparison
        </h3>
        <span className="font-mono text-[11px] text-muted">
          SYNODIC MONTH RUNTIME
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((m) => {
          // Identify best value among scenarios
          const validScenarios = scenarios.filter((sc) => results[sc.id]);
          let bestVal: number | null = null;
          if (validScenarios.length > 0) {
            const vals = validScenarios.map((sc) => m.getValue(results[sc.id]));
            bestVal = m.higherIsBetter ? Math.max(...vals) : Math.min(...vals);
          }

          return (
            <div key={m.key} className="rounded-xl border border-panel-border bg-[#161412] p-4">
              <div className="flex items-center justify-between pb-2.5">
                <span className="font-sans text-xs font-semibold text-ink">{m.label}</span>
                <span className="font-mono text-[10px] text-muted">
                  {m.higherIsBetter ? 'Higher is better' : 'Lower is better'}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {scenarios.map((sc) => {
                  const res = results[sc.id];
                  if (!res) {
                    return (
                      <div key={sc.id} className="text-[10px] text-muted">
                        {sc.label}: Computing...
                      </div>
                    );
                  }

                  const val = m.getValue(res);
                  const widthPct = Math.min(100, Math.max(3, (val / m.maxVal) * 100));
                  const isBest = bestVal !== null && Math.abs(val - bestVal) < 0.001;

                  return (
                    <div key={sc.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: sc.themeColor }}
                          />
                          <span className="text-muted truncate max-w-[140px]">{sc.label}</span>
                        </span>
                        <span className={`font-bold ${isBest ? 'text-amber' : 'text-ink'}`}>
                          {m.formatValue(val)}
                        </span>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-[#2E2A26] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: isBest ? '#F5A524' : sc.themeColor
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
    </div>
  );
}
