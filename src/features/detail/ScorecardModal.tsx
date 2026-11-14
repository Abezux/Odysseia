import React from 'react';
import { X } from 'lucide-react';
import type { Site, MetricsResult } from '../../contracts';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site | null;
  metrics: MetricsResult | null;
}

export function ScorecardModal({
  isOpen,
  onClose,
  site,
  metrics
}: ScorecardModalProps): React.JSX.Element | null {
  if (!isOpen || !site || !metrics) return null;

  const { scorecard } = metrics;
  const score = scorecard.overallScore;

  const scoreBadgeVariant = score >= 75 ? 'success' : score >= 50 ? 'warning' : 'critical';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorecard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0A09]/80 backdrop-blur-md select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-panel-border pb-4">
          <div>
            <div className="font-mono text-[10px] text-amber uppercase tracking-wider">
              FEASIBILITY EVALUATION
            </div>
            <h2 id="scorecard-modal-title" className="text-xl font-bold text-ink mt-0.5">
              {site.name} Scorecard
            </h2>
            <div className="mt-1 font-mono text-xs text-muted">
              {Math.abs(site.latDeg).toFixed(3)}°{site.latDeg >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(site.lonDeg).toFixed(3)}°{site.lonDeg >= 0 ? 'E' : 'W'} ·{' '}
              {site.agencyOrOperator} · Rules v{scorecard.rulesVersion}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={scoreBadgeVariant} size="lg">
              Score: {score}/100
            </Badge>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-panel-border bg-panel text-muted hover:text-ink hover:border-muted transition-colors"
              title="Close modal"
              aria-label="Close modal"
            >
              <Icon icon={X} size={16} />
            </button>
          </div>
        </div>

        {/* Sub-scores 3-Column Bento */}
        <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <div className="font-sans text-[11px] text-muted">Solar Power</div>
            <div className="mt-1 text-2xl font-bold text-amber">{scorecard.powerScore}</div>
            <div className="text-[10px] text-muted">weight: 40%</div>
          </div>
          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <div className="font-sans text-[11px] text-muted">Direct Earth LOS</div>
            <div className="mt-1 text-2xl font-bold text-emerald">{scorecard.communicationScore}</div>
            <div className="text-[10px] text-muted">weight: 35%</div>
          </div>
          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <div className="font-sans text-[11px] text-muted">Thermal Resilience</div>
            <div className="mt-1 text-2xl font-bold text-ink">{scorecard.thermalSurvivabilityScore}</div>
            <div className="text-[10px] text-muted">weight: 25%</div>
          </div>
        </div>

        {/* Detailed Factor Breakdown */}
        <div className="space-y-4">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            Evaluation Factors ({scorecard.factors.length})
          </h3>
          <div className="space-y-3">
            {scorecard.factors.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-panel-border bg-panel/60 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold text-ink">{f.name}</span>
                  <span className="text-amber">
                    {f.metricValue} ·{' '}
                    <span className="font-bold text-ink">{f.score} pts</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#12110F]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      f.score >= 70
                        ? 'bg-emerald'
                        : f.score >= 40
                        ? 'bg-amber'
                        : 'bg-critical'
                    }`}
                    style={{ width: `${f.score}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted leading-relaxed">{f.explanation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Synodic Environmental Summary */}
        <div className="rounded-2xl border border-panel-border bg-panel/40 p-4 font-mono text-xs space-y-2">
          <div className="font-sans text-xs font-semibold text-ink">
            Synodic Period Statistics ({metrics.windowDays} Days)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-muted">
            <div>
              Illumination:{' '}
              <span className="text-amber font-semibold">
                {Math.round(metrics.illuminationFraction * 100)}%
              </span>
            </div>
            <div>
              DTE Coverage:{' '}
              <span className="text-emerald font-semibold">
                {Math.round(metrics.dteAvailabilityFraction * 100)}%
              </span>
            </div>
            <div>
              Max Sunlit Stretch:{' '}
              <span className="text-ink font-semibold">
                {metrics.longestSunlitStretchHours.toFixed(1)} hrs
              </span>
            </div>
            <div>
              Max Darkness Stretch:{' '}
              <span className="text-ink font-semibold">
                {metrics.longestDarkStretchHours.toFixed(1)} hrs
              </span>
            </div>
            <div>
              Max Comms Blackout:{' '}
              <span className="text-critical font-semibold">
                {metrics.longestDteBlackoutHours.toFixed(1)} hrs
              </span>
            </div>
            <div>
              Vert Solar Proxy:{' '}
              <span className="text-amber font-semibold">
                {(metrics.solarPowerProxyVertical * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Scorecard
          </Button>
        </div>
      </div>
    </div>
  );
}
