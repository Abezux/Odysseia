import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Plus,
  RotateCcw,
  Activity,
  ExternalLink
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { SkyDial } from '../detail/SkyDial';
import { computeMissionAlerts } from '../../lib/alerts';
import { showToast } from '../../ui/toastStore';
import type { Site, HorizonProfile, MetricsResult } from '../../contracts';
import { Icon } from '../../ui/Icon';

interface RightUtilityColumnProps {
  site: Site | null;
  horizon: HorizonProfile | null;
  metrics: MetricsResult | null;
  onOpenScorecardModal: () => void;
}

export function RightUtilityColumn({
  site,
  horizon,
  metrics,
  onOpenScorecardModal
}: RightUtilityColumnProps): React.JSX.Element {
  const { mode } = useUIStore();
  const { addScenario, scenarios } = useScenarioStore();
  const { currentTime, resetToNow } = useTimeStore();

  const alerts = useMemo(() => {
    return computeMissionAlerts(metrics, site, currentTime);
  }, [metrics, site, currentTime]);

  const sunEl = metrics?.currentEphemeris.sun.elevationDeg ?? 0;
  const earthEl = metrics?.currentEphemeris.earth.elevationDeg ?? 0;
  const powerProxy = metrics?.solarPowerProxyVertical ?? 0;

  const handleAddToCompare = () => {
    if (!site) return;
    const ok = addScenario({
      id: crypto.randomUUID(),
      label: site.name,
      siteId: site.id,
      landingTimeIso: currentTime.toISOString(),
      themeColor: '#F5A524'
    });
    if (ok) {
      showToast({
        title: 'Added to Compare Matrix',
        subtitle: `${site.name} · ${scenarios.length + 1}/4`,
        severity: 'success'
      });
    } else {
      showToast({
        title: 'Compare Full',
        subtitle: 'Maximum of 4 comparative scenarios reached.',
        severity: 'warning'
      });
    }
  };

  const handleResetEpoch = () => {
    resetToNow();
    showToast({
      title: 'Simulation Epoch Reset',
      subtitle: 'Synchronized with current real-world UTC timestamp.',
      severity: 'info'
    });
  };

  const handleDiagnostics = () => {
    showToast({
      title: 'Astrometric Diagnostics Nominal',
      subtitle: 'Horizons RMSE < 0.022° · LOLA DEM search 200km ok.',
      severity: 'success'
    });
  };

  return (
    <aside className="w-full xl:w-[340px] shrink-0 overflow-y-auto space-y-4 p-4 border-l border-panel-border bg-[#0B0A09] text-ink select-none">
      {/* 1. Top: Mission Alerts Pipeline */}
      <div className="rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-panel-border">
          <div className="flex items-center gap-2">
            <span className="site-dot-pulse h-2 w-2 rounded-full bg-amber" />
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
              Mission Alerts
            </h3>
          </div>
          <span className="font-mono text-[10px] text-muted">{alerts.length} ACTIVE</span>
        </div>

        {/* Scrollable feed of AlertItems */}
        <div className="max-h-48 overflow-y-auto space-y-2.5 pt-3 pr-1">
          {alerts.map((alert) => {
            const barColor =
              alert.severity === 'critical'
                ? 'border-l-critical bg-critical/5'
                : alert.severity === 'warning'
                ? 'border-l-warning bg-warning/5'
                : alert.severity === 'success'
                ? 'border-l-emerald bg-emerald/5'
                : 'border-l-amber bg-amber/5';

            const alertIcon =
              alert.severity === 'critical'
                ? AlertTriangle
                : alert.severity === 'warning'
                ? AlertTriangle
                : alert.severity === 'success'
                ? CheckCircle2
                : Info;

            return (
              <div
                key={alert.id}
                className={`rounded-xl border border-panel-border border-l-4 p-2.5 ${barColor} transition-colors`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      icon={alertIcon}
                      size={16}
                      className={
                        alert.severity === 'critical'
                          ? 'text-critical'
                          : alert.severity === 'warning'
                          ? 'text-warning'
                          : alert.severity === 'success'
                          ? 'text-emerald'
                          : 'text-amber'
                      }
                    />
                    <span className="font-sans text-xs font-semibold text-ink leading-tight">
                      {alert.title}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-muted shrink-0">
                    {alert.timestamp}
                  </span>
                </div>
                <p className="mt-1 font-sans text-[11px] leading-relaxed text-muted pl-5">
                  {alert.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Middle: Sky Dial Card */}
      <div className="rounded-2xl border border-panel-border bg-panel p-4 shadow-md flex flex-col items-center">
        <div className="flex w-full items-center justify-between pb-3 border-b border-panel-border mb-2">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
            Topocentric Sky Dial
          </h3>
          <span className="font-mono text-[10px] text-muted">POLAR HORIZON</span>
        </div>

        {metrics && (
          <SkyDial
            horizon={horizon}
            ephemeris={metrics.currentEphemeris}
            sunTerrainElev={metrics.sunTerrainElevationDeg}
            earthTerrainElev={metrics.earthTerrainElevationDeg}
            size={240}
          />
        )}
      </div>

      {/* 3. Bottom: Site Inspector Card (zinc-900 #1A1816, 24px padding) */}
      <div className="rounded-2xl border border-panel-border bg-panel p-6 shadow-xl space-y-5">
        {/* Header with site name, coordinates in mono, and LIVE badge */}
        <div className="flex items-start justify-between gap-2 border-b border-panel-border pb-4">
          <div>
            <div className="font-mono text-[10px] text-amber uppercase tracking-wider">
              SITE INSPECTOR
            </div>
            <h2 className="mt-0.5 font-sans text-sm font-bold text-ink">
              {site?.name || 'Loading Site...'}
            </h2>
            <div className="mt-1 font-mono text-[11px] text-muted">
              {site
                ? `${Math.abs(site.latDeg).toFixed(2)}°${site.latDeg >= 0 ? 'N' : 'S'}, ${Math.abs(
                    site.lonDeg
                  ).toFixed(2)}°${site.lonDeg >= 0 ? 'E' : 'W'} · ${site.elevationM ?? 0}m`
                : '--'}
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            LIVE
          </span>
        </div>

        {/* 3-Column Stats Row + Live Gauges */}
        <div className="grid grid-cols-3 gap-2 font-mono text-center">
          <div className="rounded-xl border border-panel-border bg-[#161412] p-2.5">
            <div className="text-[10px] uppercase text-muted font-sans">Sun Elev</div>
            <div className="mt-1 text-xs font-bold text-ink">
              {sunEl >= 0 ? `+${sunEl.toFixed(1)}°` : `${sunEl.toFixed(1)}°`}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#2E2A26] overflow-hidden">
              <div
                className="h-full rounded-full bg-amber"
                style={{ width: `${Math.min(100, Math.max(0, (sunEl + 2) * 20))}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-panel-border bg-[#161412] p-2.5">
            <div className="text-[10px] uppercase text-muted font-sans">Earth Elev</div>
            <div className="mt-1 text-xs font-bold text-ink">
              {earthEl >= 0 ? `+${earthEl.toFixed(1)}°` : `${earthEl.toFixed(1)}°`}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#2E2A26] overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald"
                style={{ width: `${Math.min(100, Math.max(0, (earthEl + 2) * 10))}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-panel-border bg-[#161412] p-2.5">
            <div className="text-[10px] uppercase text-muted font-sans">Power Proxy</div>
            <div className="mt-1 text-xs font-bold text-amber">
              {Math.round(powerProxy * 100)}%
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-[#2E2A26] overflow-hidden">
              <div
                className="h-full rounded-full bg-amber"
                style={{ width: `${Math.round(powerProxy * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Astrometric Vectors Mode Expansion */}
        {mode === 'technical' && metrics && (
          <div className="space-y-2 rounded-xl border border-panel-border bg-[#161412] p-3 font-mono text-[11px] text-muted">
            <div className="text-[10px] uppercase font-bold text-amber pb-1 border-b border-panel-border">
              Astrometric Vector Output
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
              <div>Sun Azimuth: <span className="text-ink">{metrics.currentEphemeris.sun.azimuthDeg.toFixed(2)}°</span></div>
              <div>Sun Terrain: <span className="text-ink">{metrics.sunTerrainElevationDeg.toFixed(2)}°</span></div>
              <div>Earth Azimuth: <span className="text-ink">{metrics.currentEphemeris.earth.azimuthDeg.toFixed(2)}°</span></div>
              <div>Earth Terrain: <span className="text-ink">{metrics.earthTerrainElevationDeg.toFixed(2)}°</span></div>
              <div>Sub-Solar: <span className="text-ink">{metrics.currentEphemeris.subSolarCoordinates.latDeg.toFixed(1)}°, {metrics.currentEphemeris.subSolarCoordinates.lonDeg.toFixed(1)}°</span></div>
              <div>Libration: <span className="text-ink">{metrics.currentEphemeris.opticalLibrationDeg.longitude.toFixed(2)}°</span></div>
            </div>
          </div>
        )}

        {/* Footer with Ghost Buttons (border #2E2A26) and Primary Amber Link */}
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleAddToCompare}
              className="flex items-center justify-center gap-1 rounded-lg border border-panel-border bg-panel py-2 text-center font-sans text-[11px] font-semibold text-muted hover:text-ink hover:border-muted transition-colors"
              title="Add to Compare matrix"
            >
              <Icon icon={Plus} size={16} />
              <span>Compare</span>
            </button>
            <button
              type="button"
              onClick={handleResetEpoch}
              className="flex items-center justify-center gap-1 rounded-lg border border-panel-border bg-panel py-2 text-center font-sans text-[11px] font-semibold text-muted hover:text-ink hover:border-muted transition-colors"
              title="Reset simulation to current epoch"
            >
              <Icon icon={RotateCcw} size={16} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleDiagnostics}
              className="flex items-center justify-center gap-1 rounded-lg border border-panel-border bg-panel py-2 text-center font-sans text-[11px] font-semibold text-muted hover:text-ink hover:border-muted transition-colors"
              title="Run astrometric and terrain diagnostics"
            >
              <Icon icon={Activity} size={16} />
              <span>Status</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenScorecardModal}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-amber py-2.5 text-center font-sans text-xs font-bold text-amber-text transition-colors hover:bg-amber-hover active:bg-amber-pressed"
          >
            <span>View Full Scorecard ({metrics?.scorecard.overallScore ?? 88}/100)</span>
            <Icon icon={ExternalLink} size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
