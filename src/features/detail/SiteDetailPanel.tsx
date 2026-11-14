import React, { useEffect, useState, useMemo } from 'react';
import { Compass, Sliders } from 'lucide-react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { useUIStore } from '../../store/useUIStore';
import { dataProvider } from '../../lib/data';
import { evaluateMetricsAsync } from '../../lib/workers/workerClient';
import type { Site, HorizonProfile, MetricsResult } from '../../contracts';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui';
import { SkyDial } from './SkyDial';

export function SiteDetailView(): React.JSX.Element {
  const { activeSiteId } = useScenarioStore();
  const { currentTime } = useTimeStore();
  const { mode, toggleMode } = useUIStore();

  const [site, setSite] = useState<Site | null>(null);
  const [horizon, setHorizon] = useState<HorizonProfile | null>(null);
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load site and horizon profile when activeSiteId changes
  useEffect(() => {
    let isCancelled = false;
    async function loadSiteData() {
      setIsLoading(true);
      const cat = await dataProvider.getCatalog();
      const currentSite = cat.sites.find((s) => s.id === activeSiteId) || cat.sites[0];
      if (isCancelled) return;
      setSite(currentSite);

      const horiz = await dataProvider.getHorizon(currentSite.id);
      if (isCancelled) return;
      setHorizon(horiz);
      setIsLoading(false);
    }
    loadSiteData();
    return () => {
      isCancelled = true;
    };
  }, [activeSiteId]);

  // Evaluate metrics whenever site, horizon, or currentTime changes
  useEffect(() => {
    let isCancelled = false;
    if (!site) return;

    evaluateMetricsAsync({
      site: {
        latDeg: site.latDeg,
        lonDeg: site.lonDeg,
        elevationM: site.elevationM
      },
      horizon,
      t: currentTime
    }).then((res) => {
      if (!isCancelled) {
        setMetrics(res);
      }
    }).catch((err) => {
      console.error('[SiteDetailView] Metrics evaluation failed:', err);
    });

    return () => {
      isCancelled = true;
    };
  }, [site, horizon, currentTime]);

  const scoreBadgeVariant = useMemo(() => {
    if (!metrics) return 'neutral';
    const s = metrics.scorecard.overallScore;
    if (s >= 75) return 'success';
    if (s >= 50) return 'warning';
    return 'danger';
  }, [metrics]);

  if (isLoading || !site || !metrics) {
    return (
      <div className="flex h-full items-center justify-center p-6 font-mono text-xs text-muted">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber border-t-transparent" />
          <span>Computing ephemeris & horizon metrics...</span>
        </div>
      </div>
    );
  }

  const { currentEphemeris, sunTerrainElevationDeg, earthTerrainElevationDeg, scorecard } = metrics;
  const isSunVisible =
    currentEphemeris.sun.elevationDeg + 0.267 >= sunTerrainElevationDeg &&
    currentEphemeris.sun.elevationDeg >= -0.267;
  const isEarthVisible =
    currentEphemeris.earth.elevationDeg >= earthTerrainElevationDeg &&
    currentEphemeris.earth.elevationDeg >= 0;

  const sunClearanceDeg = currentEphemeris.sun.elevationDeg - sunTerrainElevationDeg;
  const earthClearanceDeg = currentEphemeris.earth.elevationDeg - earthTerrainElevationDeg;

  return (
    <div className="flex h-full flex-col overflow-y-auto space-y-4 pr-1 text-ink">
      {/* 1. Header & Badges */}
      <div className="border-b border-panel-border pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-ink">{site.name}</h2>
            <div className="flex items-center gap-2 pt-0.5 font-mono text-[11px] text-muted">
              <span>{site.agencyOrOperator}</span>
              <span className="opacity-40">/</span>
              <span>
                {site.latDeg >= 0 ? `${site.latDeg.toFixed(3)}°N` : `${Math.abs(site.latDeg).toFixed(3)}°S`},{' '}
                {site.lonDeg >= 0 ? `${site.lonDeg.toFixed(3)}°E` : `${Math.abs(site.lonDeg).toFixed(3)}°W`}
              </span>
              <span className="opacity-40">/</span>
              <span>{site.elevationM !== undefined ? `${site.elevationM} m` : 'Datum'}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMode}
            title="Toggle between Overview and Technical telemetry mode"
            className="text-[11px] font-mono capitalize flex items-center gap-1.5"
          >
            <Icon icon={mode === 'overview' ? Compass : Sliders} size={16} />
            <span>Mode: {mode === 'overview' ? 'Overview' : 'Technical'}</span>
          </Button>
        </div>

        {/* Data Fidelity / Terrain Source Badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {horizon === null ? (
            <Badge variant="neutral" size="sm">
              Terrain not included (smooth 0°)
            </Badge>
          ) : horizon.source === 'mock' ? (
            <Badge variant="warning" size="sm">
              Simulated terrain (Mock)
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              LOLA 20m/px DEM ({horizon.searchRadiusKm}km search)
            </Badge>
          )}

          {site.isSouthPoleRegion && (
            <Badge variant="warning" size="sm">
              South Pole Region
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Real-time Countdown Chips */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        {/* Sun Countdown */}
        <div className="flex flex-col rounded-2xl border border-panel-border bg-panel p-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Solar Status</span>
            <span
              className={`h-2 w-2 rounded-full ${
                isSunVisible ? 'bg-amber shadow-sm shadow-amber/50' : 'bg-[#2E2A26]'
              }`}
            />
          </div>
          <div className="mt-1 font-semibold text-ink">
            {isSunVisible ? (
              <span className="text-amber">Sunlit</span>
            ) : (
              <span className="text-muted">In Shadow</span>
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-muted">
            {isSunVisible
              ? metrics.timeToNextSunsetHours !== null
                ? `Sunset in ${metrics.timeToNextSunsetHours.toFixed(1)} hrs`
                : 'Continuous sunlight'
              : metrics.timeToNextSunriseHours !== null
              ? `Sunrise in ${metrics.timeToNextSunriseHours.toFixed(1)} hrs`
              : 'Permanent shadow'}
          </div>
        </div>

        {/* Earth Countdown */}
        <div className="flex flex-col rounded-2xl border border-panel-border bg-panel p-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>DTE Comms Link</span>
            <span
              className={`h-2 w-2 rounded-full ${
                isEarthVisible ? 'bg-emerald shadow-sm shadow-emerald/50' : 'bg-critical'
              }`}
            />
          </div>
          <div className="mt-1 font-semibold text-ink">
            {isEarthVisible ? (
              <span className="text-emerald">Direct Earth LOS</span>
            ) : (
              <span className="text-critical">Blackout</span>
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-muted">
            {isEarthVisible
              ? metrics.timeToNextEarthsetHours !== null
                ? `Earthset in ${metrics.timeToNextEarthsetHours.toFixed(1)} hrs`
                : 'Continuous LOS'
              : metrics.timeToNextEarthriseHours !== null
              ? `Earthrise in ${metrics.timeToNextEarthriseHours.toFixed(1)} hrs`
              : 'Permanent blackout'}
          </div>
        </div>
      </div>

      {/* 3. Polar Sky Dial (Horizon Silhouette & Sub-body Angles) */}
      <div className="rounded-2xl border border-panel-border bg-panel p-3">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold text-ink">Topocentric Sky Dial</span>
          <span className="font-mono text-[10px] text-muted">Azimuth / Elevation Polar View</span>
        </div>
        <SkyDial
          horizon={horizon}
          ephemeris={currentEphemeris}
          sunTerrainElev={sunTerrainElevationDeg}
          earthTerrainElev={earthTerrainElevationDeg}
          size={260}
        />
      </div>

      {/* 4. Telemetry (Overview vs Technical) */}
      {mode === 'overview' ? (
        <div className="space-y-2.5">
          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <h4 className="text-xs font-semibold text-amber">Solar Power Environment</h4>
            <p className="mt-1 text-xs leading-relaxed text-ink">
              {isSunVisible
                ? `Sun is at ${currentEphemeris.sun.elevationDeg.toFixed(
                    1
                  )}° elevation (${sunClearanceDeg.toFixed(
                    1
                  )}° above local terrain). Vertical solar panels operate at ${Math.round(
                    metrics.solarPowerProxyVertical * 100
                  )}% efficiency.`
                : `Sun is currently obscured behind the local crater rim (${Math.abs(
                    sunClearanceDeg
                  ).toFixed(1)}° below ridge crest). Lander must operate on battery/fuel cell reserves.`}
            </p>
          </div>

          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <h4 className="text-xs font-semibold text-emerald">Earth Direct Communications</h4>
            <p className="mt-1 text-xs leading-relaxed text-ink">
              {isEarthVisible
                ? `Earth is positioned ${currentEphemeris.earth.elevationDeg.toFixed(
                    1
                  )}° above the horizon with ${earthClearanceDeg.toFixed(
                    1
                  )}° clearance over terrain, providing high-bandwidth direct link.`
                : `Direct-to-Earth communication is blocked by local topography. Surface missions require orbital relay satellites or must store data until Earth rises.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 font-mono text-[11px]">
          {/* Detailed Astrometric Readings */}
          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <div className="text-xs font-semibold text-amber font-sans pb-1.5 border-b border-panel-border">
              Solar Astrometric Vector
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-muted">
              <div>Azimuth: <span className="text-ink">{currentEphemeris.sun.azimuthDeg.toFixed(2)}°</span></div>
              <div>Elevation: <span className="text-ink">{currentEphemeris.sun.elevationDeg.toFixed(2)}°</span></div>
              <div>Terrain Elev: <span className="text-ink">{sunTerrainElevationDeg.toFixed(2)}°</span></div>
              <div>Terrain Clearance: <span className={sunClearanceDeg >= 0 ? 'text-emerald' : 'text-critical'}>{sunClearanceDeg.toFixed(2)}°</span></div>
              <div>Solar Distance: <span className="text-ink">{(currentEphemeris.sun.distanceKm / 1e6).toFixed(3)}M km</span></div>
              <div>Diameter: <span className="text-ink">{currentEphemeris.sun.angularDiameterDeg.toFixed(3)}°</span></div>
              <div>Sub-Solar Lat/Lon: <span className="text-ink">{currentEphemeris.subSolarCoordinates.latDeg.toFixed(2)}°, {currentEphemeris.subSolarCoordinates.lonDeg.toFixed(2)}°</span></div>
              <div>Vert Proxy: <span className="text-amber">{(metrics.solarPowerProxyVertical * 100).toFixed(1)}%</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <div className="text-xs font-semibold text-emerald font-sans pb-1.5 border-b border-panel-border">
              Earth Astrometric & Libration Vector
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-muted">
              <div>Azimuth: <span className="text-ink">{currentEphemeris.earth.azimuthDeg.toFixed(2)}°</span></div>
              <div>Elevation: <span className="text-ink">{currentEphemeris.earth.elevationDeg.toFixed(2)}°</span></div>
              <div>Terrain Elev: <span className="text-ink">{earthTerrainElevationDeg.toFixed(2)}°</span></div>
              <div>LOS Margin: <span className={earthClearanceDeg >= 0 ? 'text-emerald' : 'text-critical'}>{earthClearanceDeg.toFixed(2)}°</span></div>
              <div>Earth Phase: <span className="text-ink">{Math.round(currentEphemeris.earth.phaseFraction * 100)}%</span></div>
              <div>Distance: <span className="text-ink">{Math.round(currentEphemeris.earth.distanceKm).toLocaleString()} km</span></div>
              <div>Libration (lon/lat): <span className="text-ink">{currentEphemeris.opticalLibrationDeg.longitude.toFixed(2)}°, {currentEphemeris.opticalLibrationDeg.latitude.toFixed(2)}°</span></div>
              <div>Sub-Earth Lat/Lon: <span className="text-ink">{currentEphemeris.subEarthCoordinates.latDeg.toFixed(2)}°, {currentEphemeris.subEarthCoordinates.lonDeg.toFixed(2)}°</span></div>
            </div>
          </div>

          {/* Synodic Window Statistics */}
          <div className="rounded-2xl border border-panel-border bg-panel p-3">
            <div className="text-xs font-semibold text-ink font-sans pb-1.5 border-b border-panel-border">
              Synodic Window ({metrics.windowDays}d Month Analysis)
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-muted">
              <div>Illumination: <span className="text-amber">{Math.round(metrics.illuminationFraction * 100)}%</span></div>
              <div>DTE Availability: <span className="text-emerald">{Math.round(metrics.dteAvailabilityFraction * 100)}%</span></div>
              <div>Max Sunlit: <span className="text-ink">{metrics.longestSunlitStretchHours.toFixed(1)} hrs</span></div>
              <div>Max Darkness: <span className="text-ink">{metrics.longestDarkStretchHours.toFixed(1)} hrs</span></div>
              <div>Max Blackout: <span className="text-ink">{metrics.longestDteBlackoutHours.toFixed(1)} hrs</span></div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Mission Scorecard */}
      <div className="rounded-2xl border border-panel-border bg-panel p-3">
        <div className="flex items-center justify-between pb-2 border-b border-panel-border">
          <div>
            <h4 className="text-xs font-semibold text-ink">Mission Feasibility Scorecard</h4>
            <div className="font-mono text-[10px] text-muted">Rules v{scorecard.rulesVersion}</div>
          </div>
          <Badge variant={scoreBadgeVariant} size="md">
            Score: {scorecard.overallScore}/100
          </Badge>
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-3 gap-2 py-3 text-center font-mono text-xs border-b border-panel-border">
          <div className="rounded-xl bg-[#12110F] p-2 border border-panel-border">
            <div className="text-[10px] text-muted font-sans">Power</div>
            <div className="text-sm font-bold text-amber">{scorecard.powerScore}</div>
          </div>
          <div className="rounded-xl bg-[#12110F] p-2 border border-panel-border">
            <div className="text-[10px] text-muted font-sans">Comms</div>
            <div className="text-sm font-bold text-emerald">{scorecard.communicationScore}</div>
          </div>
          <div className="rounded-xl bg-[#12110F] p-2 border border-panel-border">
            <div className="text-[10px] text-muted font-sans">Thermal</div>
            <div className="text-sm font-bold text-ink">{scorecard.thermalSurvivabilityScore}</div>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-2 pt-2.5">
          {scorecard.factors.map((f, i) => (
            <div key={i} className="text-[11px]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-muted">{f.name}</span>
                <span className="text-ink font-semibold">{f.metricValue} ({f.score} pts)</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#12110F]">
                <div
                  className={`h-full rounded-full ${
                    f.score >= 70 ? 'bg-emerald' : f.score >= 40 ? 'bg-amber' : 'bg-critical'
                  }`}
                  style={{ width: `${f.score}%` }}
                />
              </div>
              <div className="text-[10px] text-muted mt-0.5">{f.explanation}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
