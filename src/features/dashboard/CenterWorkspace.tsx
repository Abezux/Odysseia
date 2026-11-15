import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Globe,
  Mountain,
  Compass,
  Sun,
  Radio,
  BatteryCharging,
  Timer,
  Layers,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw
} from 'lucide-react';
import { useUIStore, type CenterTab } from '../../store/useUIStore';
import { useTimeStore } from '../../store/useTimeStore';
import { HorizonView } from '../horizon';
import { Tabs, type TabItem } from '../../ui/Tabs';

const MoonGlobeView = React.lazy(() =>
  import('../globe').then((m) => ({ default: m.MoonGlobeView }))
);
const TerrainView = React.lazy(() =>
  import('../terrain').then((m) => ({ default: m.TerrainView }))
);
import { SkyDial } from '../detail/SkyDial';
import { TimelineStripView } from '../timeline/TimelineStrip';
import type { MetricsResult, Site, HorizonProfile } from '../../contracts';
import { safeViewTransition } from '../../lib/viewTransition';
import { Icon } from '../../ui/Icon';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import { PortalPopover } from '../../ui/PortalPopover';

const viewportTabs: TabItem[] = [
  { id: 'globe', label: '3D Moon Globe', icon: <Icon icon={Globe} size={16} /> },
  { id: 'terrain', label: '3D Local Terrain', icon: <Icon icon={Mountain} size={16} /> },
  { id: 'horizon', label: 'Horizon Panorama', icon: <Icon icon={Compass} size={16} /> }
];

interface CenterWorkspaceProps {
  metrics: MetricsResult | null;
  activeSite: Site | null;
  horizon?: HorizonProfile | null;
}

export function CenterWorkspace({ metrics, activeSite, horizon = null }: CenterWorkspaceProps): React.JSX.Element {
  const { activeCenterTab, setActiveCenterTab, mode } = useUIStore();
  const {
    currentTime,
    playbackSpeed,
    isPlaying,
    stepTime,
    setPlaybackSpeed,
    togglePlay,
    resetToNow
  } = useTimeStore();

  const viewportRef = useRef<HTMLDivElement>(null);

  // Fullscreen state with native API + fallback
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hide details toggle state with localStorage persistence
  const [hideDetails, setHideDetails] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('lunar_fullscreen_hide_details');
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  // HUD layer controls state
  const [layers, setLayers] = useState({
    celestialBodies: true,
    orbitPath: false,
    labels: true,
    starfield: true,
    siteMarkers: true,
    terminator: true,
    earthVector: true,
    shadowMap: true
  });
  const [isLayerHudOpen, setIsLayerHudOpen] = useState(false);
  const layersBtnRef = useRef<HTMLButtonElement>(null);

  const toggleHideDetails = () => {
    setHideDetails((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lunar_fullscreen_hide_details', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleFullscreen = useCallback(async () => {
    if (!viewportRef.current) return;

    if (!document.fullscreenElement && !isFullscreen) {
      try {
        if (viewportRef.current.requestFullscreen) {
          await viewportRef.current.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } catch {
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      } catch {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  // Sync native fullscreenchange event with state
  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      window.dispatchEvent(new Event('resize'));
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Keyboard shortcuts: F for fullscreen, H for hide details, Esc for exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        toggleHideDetails();
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, isFullscreen]);

  const handleTabChange = (tabId: string) => {
    safeViewTransition(() => {
      setActiveCenterTab(tabId as CenterTab);
    });
  };

  const sunEl = metrics?.currentEphemeris.sun.elevationDeg ?? 1.8;
  const sunTerr = metrics?.sunTerrainElevationDeg ?? 0.5;
  const sunClearance = sunEl - sunTerr;
  const isSunlit = sunClearance >= 0;

  const earthEl = metrics?.currentEphemeris.earth.elevationDeg ?? 6.2;
  const earthTerr = metrics?.earthTerrainElevationDeg ?? 1.1;
  const earthClearance = earthEl - earthTerr;
  const isEarthVisible = earthClearance >= 0;

  const illumPct = metrics ? Math.round(metrics.illuminationFraction * 100) : 82;
  const dtePct = metrics ? Math.round(metrics.dteAvailabilityFraction * 100) : 94;

  const countdownText =
    metrics?.timeToNextSunsetHours !== null && metrics?.timeToNextSunsetHours !== undefined
      ? `${metrics.timeToNextSunsetHours.toFixed(1)}h`
      : metrics?.timeToNextSunriseHours !== null && metrics?.timeToNextSunriseHours !== undefined
      ? `${metrics.timeToNextSunriseHours.toFixed(1)}h`
      : 'CONT. LIGHT';

  const countdownLabel =
    metrics?.timeToNextSunsetHours !== null ? 'SUNSET IN' : 'SUNRISE IN';

  return (
    <main className="view-content flex flex-1 flex-col overflow-y-auto p-4 space-y-4 select-none">
      {/* 1. KPI Grid: 4 columns (sm:2, xl:4). Bold JetBrains Mono values */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Sun Elevation */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <Icon icon={Sun} size={20} />
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                Sun Elevation
              </div>
              <div className="font-mono text-xl font-bold text-ink">
                {sunEl >= 0 ? `+${sunEl.toFixed(2)}°` : `${sunEl.toFixed(2)}°`}
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
              isSunlit
                ? 'bg-emerald/15 text-emerald border border-emerald/30'
                : 'bg-critical/15 text-critical border border-critical/30'
            }`}
          >
            {isSunlit ? 'CLEAR' : 'OCCLUDED'}
          </span>
        </div>

        {/* KPI 2: Earth Elevation */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <Icon icon={Radio} size={20} />
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                Earth Elevation
              </div>
              <div className="font-mono text-xl font-bold text-ink">
                {earthEl >= 0 ? `+${earthEl.toFixed(2)}°` : `${earthEl.toFixed(2)}°`}
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
              isEarthVisible
                ? 'bg-emerald/15 text-emerald border border-emerald/30'
                : 'bg-critical/15 text-critical border border-critical/30'
            }`}
          >
            {isEarthVisible ? 'LOS CLEAR' : 'BLACKOUT'}
          </span>
        </div>

        {/* KPI 3: Illumination % */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <Icon icon={BatteryCharging} size={20} />
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                Illumination %
              </div>
              <div className="font-mono text-xl font-bold text-amber">
                {illumPct}%
              </div>
            </div>
          </div>
          <span className="rounded-full bg-panel border border-panel-border px-2.5 py-0.5 font-mono text-[10px] uppercase text-muted">
            SYNODIC
          </span>
        </div>

        {/* KPI 4: Next Event Countdown */}
        <div className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
              <Icon icon={Timer} size={20} />
            </div>
            <div>
              <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted">
                {countdownLabel}
              </div>
              <div className="font-mono text-xl font-bold text-ink">
                {countdownText}
              </div>
            </div>
          </div>
          <span className="rounded-full bg-amber/15 text-amber border border-amber/30 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
            EVENT
          </span>
        </div>
      </div>

      {/* 2. Main Viewport Container: rounded-3xl, flexible height (or Fullscreen overlay) */}
      <div
        ref={viewportRef}
        data-tour="viewport-canvas"
        className={`relative flex w-full flex-col overflow-hidden rounded-3xl border border-panel-border bg-[#0B0A09] shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-0'
            : 'h-[clamp(420px,calc(100vh-360px),720px)]'
        }`}
      >


        {/* ======================================================== */}
        {/* UNIFIED VIEWPORT OVERLAY SLOTS LAYER                     */}
        {/* ======================================================== */}
        <div className="pointer-events-none absolute inset-0 z-overlay p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
          {/* TOP SLOTS ROW: Top-Left, Top-Center, Top-Right */}
          <div className="flex items-start justify-between w-full gap-2">
            {/* Top-Left Slot: In Fullscreen, Site Card */}
            <div className="slot-top-left flex flex-col items-start gap-2 max-w-[280px]">
              {isFullscreen && (
                <div
                  className={`pointer-events-auto w-72 max-h-[35vh] overflow-y-auto rounded-2xl glass-panel p-3.5 shadow-2xl space-y-2 transition-opacity duration-250 ${
                    hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-panel-border pb-2">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-amber">
                        MISSION SITE
                      </div>
                      <h3 className="font-sans text-xs font-bold text-ink leading-tight">
                        {activeSite?.name || 'Active Landing Site'}
                      </h3>
                    </div>
                    <span className="flex items-center gap-1 rounded-full border border-emerald/40 bg-emerald/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                      LIVE
                    </span>
                  </div>

                  <div className="font-mono text-[10px] text-muted flex items-center justify-between">
                    <span>
                      {activeSite
                        ? `${Math.abs(activeSite.latDeg).toFixed(2)}°${activeSite.latDeg >= 0 ? 'N' : 'S'}, ${Math.abs(
                            activeSite.lonDeg
                          ).toFixed(2)}°${activeSite.lonDeg >= 0 ? 'E' : 'W'}`
                        : '--'}
                    </span>
                    <span>{activeSite?.elevationM ?? 0}m</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] pt-1">
                    <div className="rounded-lg bg-[#141210] p-1.5 border border-panel-border">
                      <div className="text-[9px] text-muted font-sans">Sun Elev</div>
                      <div className="text-amber font-semibold">{sunEl.toFixed(1)}°</div>
                    </div>
                    <div className="rounded-lg bg-[#141210] p-1.5 border border-panel-border">
                      <div className="text-[9px] text-muted font-sans">Earth Elev</div>
                      <div className="text-emerald font-semibold">{earthEl.toFixed(1)}°</div>
                    </div>
                  </div>

                  {/* Astrometric extra vectors when in technical mode */}
                  {mode === 'technical' && metrics && (
                    <div className="border-t border-panel-border pt-1.5 font-mono text-[9px] text-muted space-y-0.5">
                      <div className="flex justify-between">
                        <span>Sub-Solar:</span>
                        <span className="text-ink">
                          {metrics.currentEphemeris.subSolarCoordinates.latDeg.toFixed(1)}°,{' '}
                          {metrics.currentEphemeris.subSolarCoordinates.lonDeg.toFixed(1)}°
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clearance:</span>
                        <span className={sunClearance >= 0 ? 'text-emerald' : 'text-critical'}>
                          {sunClearance.toFixed(1)}°
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top-Center Slot: Tab Switcher */}
            <div
              data-tour="viewport-tabs"
              className={`slot-top-center pointer-events-auto flex flex-col items-center gap-1.5 transition-opacity duration-250 ${
                isFullscreen && hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <Tabs
                tabs={viewportTabs}
                activeTab={activeCenterTab}
                onChange={handleTabChange}
              />
            </div>

            {/* Top-Right Slot: Viewport Toolbar Row */}
            <div className="slot-top-right pointer-events-auto flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Layer Control Button */}
                <div
                  className={`relative transition-opacity duration-250 ${
                    hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <button
                    ref={layersBtnRef}
                    type="button"
                    onClick={() => setIsLayerHudOpen(!isLayerHudOpen)}
                    className="flex h-8 items-center gap-1.5 rounded-xl glass-panel px-2.5 sm:px-3 text-xs text-ink hover:border-amber/50 transition-colors focus:outline-none"
                    aria-label="Toggle display layers"
                    title="Display layers"
                  >
                    <Icon icon={Layers} size={16} className="text-amber" />
                    <span className="hidden sm:inline">Layers</span>
                  </button>

                  <PortalPopover
                    isOpen={isLayerHudOpen}
                    onClose={() => setIsLayerHudOpen(false)}
                    anchorRef={layersBtnRef}
                    align="end"
                  >
                    <div className="w-48 rounded-2xl glass-panel p-3 shadow-2xl space-y-2 border border-panel-border bg-[#141210]/95 backdrop-blur-xl">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted pb-1 border-b border-panel-border">
                        Display Layers
                      </div>
                      {Object.entries(layers).map(([key, val]) => (
                        <label key={key} className="flex cursor-pointer items-center justify-between text-xs text-ink capitalize">
                          <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })}
                            className="accent-amber"
                          />
                        </label>
                      ))}
                    </div>
                  </PortalPopover>
                </div>

                {/* Hide / Show Details Toggle (Always visible in normal flow) */}
                <button
                  type="button"
                  onClick={toggleHideDetails}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl glass-panel text-ink transition-all focus:outline-none ${
                    hideDetails ? 'opacity-40 hover:opacity-100' : 'opacity-100 hover:border-amber/50'
                  }`}
                  title={hideDetails ? 'Show details (H)' : 'Hide details (H)'}
                  aria-label={hideDetails ? 'Show details' : 'Hide details'}
                >
                  <Icon icon={hideDetails ? EyeOff : Eye} size={16} />
                </button>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl glass-panel text-ink transition-all focus:outline-none ${
                    hideDetails ? 'opacity-40 hover:opacity-100' : 'opacity-100 hover:border-amber/50'
                  }`}
                  title={isFullscreen ? 'Exit fullscreen (F or Esc)' : 'Enter fullscreen (F)'}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <Icon icon={isFullscreen ? Minimize2 : Maximize2} size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* CENTER CANVAS AREA: COMPLETELY UNOBSTRUCTED */}
          <div className="flex-1 pointer-events-none" />

          {/* BOTTOM SLOTS ROW: Bottom-Left (SkyDial), Bottom-Center (Timeline), Bottom-Right (Spacer) */}
          {isFullscreen && (
            <div className="flex items-end justify-between w-full gap-2">
              {/* Bottom-Left: Compact Sky Dial Card */}
              <div className="slot-bottom-left flex flex-col items-start gap-2 max-w-[240px]">
                <div
                  className={`pointer-events-auto w-48 rounded-2xl glass-panel p-2.5 shadow-2xl space-y-1.5 transition-opacity duration-250 ${
                    hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted border-b border-panel-border pb-1">
                    Topocentric Sky Dial
                  </div>
                  {metrics && (
                    <div className="flex justify-center">
                      <SkyDial
                        horizon={horizon}
                        ephemeris={metrics.currentEphemeris}
                        sunTerrainElev={metrics.sunTerrainElevationDeg}
                        earthTerrainElev={metrics.earthTerrainElevationDeg}
                        size={typeof window !== 'undefined' && window.innerHeight < 800 ? 120 : 140}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom-Center: Compact Timeline Bar */}
              <div
                className={`slot-bottom-center pointer-events-auto flex-1 max-w-2xl mx-2 sm:mx-4 rounded-2xl glass-panel p-2.5 shadow-2xl flex flex-col gap-1.5 transition-opacity duration-250 ${
                  hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
                  {/* Play & Step Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex h-7 items-center gap-1 rounded-lg bg-amber px-2.5 text-xs font-bold text-amber-text transition-colors hover:bg-amber-hover"
                      title={isPlaying ? 'Pause' : 'Play'}
                      aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                    >
                      <Icon icon={isPlaying ? Pause : Play} size={16} />
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => stepTime(-3600)}
                      className="flex h-7 items-center justify-center rounded-lg border border-panel-border bg-panel px-2 text-muted hover:text-ink text-[10px]"
                      title="Step -1 hour"
                      aria-label="Step -1 hour"
                    >
                      <Icon icon={SkipBack} size={16} />
                      <span className="ml-1">-1h</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => stepTime(3600)}
                      className="flex h-7 items-center justify-center rounded-lg border border-panel-border bg-panel px-2 text-muted hover:text-ink text-[10px]"
                      title="Step +1 hour"
                      aria-label="Step +1 hour"
                    >
                      <Icon icon={SkipForward} size={16} />
                      <span className="ml-1">+1h</span>
                    </button>
                  </div>

                  {/* Playback Speed */}
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    aria-label="Simulation speed"
                    className="h-7 rounded-lg border border-panel-border bg-panel px-2 text-[10px] text-amber font-mono focus:border-amber focus:outline-none"
                  >
                    <option value={1} className="bg-panel text-ink">1x</option>
                    <option value={100} className="bg-panel text-ink">100x</option>
                    <option value={1000} className="bg-panel text-ink">1,000x</option>
                    <option value={10000} className="bg-panel text-ink">10,000x</option>
                  </select>

                  {/* Current Time in Mono + Reset to Now */}
                  <div className="flex items-center gap-2 text-muted">
                    <span className="text-ink font-semibold">
                      {currentTime.toISOString().replace('T', ' ').slice(0, 16)} UTC
                    </span>
                    <button
                      type="button"
                      onClick={resetToNow}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-panel-border bg-panel text-muted hover:text-amber"
                      title="Reset Epoch to Now"
                      aria-label="Reset epoch"
                    >
                      <Icon icon={RotateCcw} size={16} />
                    </button>
                  </div>
                </div>

                {/* Multi-Track Synodic Timeline Strip */}
                <div className="h-16 w-full overflow-hidden">
                  <TimelineStripView />
                </div>
              </div>

              {/* Bottom-Right Spacer for layout balance */}
              <div className="slot-bottom-right w-48 pointer-events-none hidden sm:block" />
            </div>
          )}
        </div>

        {/* 3D Canvas / Projection Viewport with Radial Gradient Vignette Mask */}
        <div className="relative h-full w-full">
          <ErrorBoundary
            title="Viewport Telemetry Alert"
            isWebGLError={true}
            onSwitchToHorizon={() => setActiveCenterTab('horizon')}
            onReset={() => {
              // Retry current viewport renderer
            }}
          >
            <React.Suspense fallback={<div className="h-full w-full bg-[#0B0A09]" />}>
              {activeCenterTab === 'globe' && (
                <MoonGlobeView
                  layers={layers}
                  hideDetails={hideDetails}
                  isFullscreen={isFullscreen}
                />
              )}
              {activeCenterTab === 'terrain' && (
                <TerrainView
                  hideDetails={hideDetails}
                  isFullscreen={isFullscreen}
                />
              )}
              {activeCenterTab === 'horizon' && (
                <HorizonView
                  hideDetails={hideDetails}
                  isFullscreen={isFullscreen}
                />
              )}
            </React.Suspense>
          </ErrorBoundary>

          {/* Radial Edge Fade Mask (only in non-fullscreen) */}
          {!isFullscreen && (
            <div
              className="pointer-events-none absolute inset-0 z-mask"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 65%, rgba(11, 10, 9, 0.85) 100%)'
              }}
            />
          )}
        </div>
      </div>

      {/* 3. Analytics Bento Grid Below Viewport: 2 columns (1 under 1000px) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Card: Power & Darkness Forecast */}
        <div className="flex flex-col justify-between rounded-2xl border border-panel-border bg-panel p-5 shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-panel-border">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink">
                Power & Darkness Forecast
              </span>
              <span className="font-mono text-[11px] text-amber">
                {activeSite?.name || 'ACTIVE SITE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 font-mono">
              <div className="rounded-xl border border-panel-border bg-[#141210] p-3">
                <div className="font-sans text-[11px] text-muted uppercase">Next Sunset</div>
                <div className="mt-1 font-mono text-base font-bold text-ink">
                  {metrics?.timeToNextSunsetHours !== null && metrics?.timeToNextSunsetHours !== undefined
                    ? `${metrics.timeToNextSunsetHours.toFixed(1)} hrs`
                    : 'Continuous Light'}
                </div>
              </div>
              <div className="rounded-xl border border-panel-border bg-[#141210] p-3">
                <div className="font-sans text-[11px] text-muted uppercase">Max Sunlit Stretch</div>
                <div className="mt-1 font-mono text-base font-bold text-amber">
                  {metrics?.longestSunlitStretchHours ? `${metrics.longestSunlitStretchHours.toFixed(1)} hrs` : '708.7 hrs'}
                </div>
              </div>
            </div>

            {/* Synthetic Cohort Bar Distribution across synodic month */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between font-mono text-[10px] text-muted">
                <span>ILLUMINATION BY LUNAR-DAY COHORT</span>
                <span>4-WEEK SYNODIC CYCLE</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-full rounded-lg bg-amber shadow-sm shadow-amber/20" />
                  <span className="text-muted">W1 (92%)</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-10 w-full rounded-lg bg-amber shadow-sm shadow-amber/20" />
                  <span className="text-muted">W2 (88%)</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-9 w-full rounded-lg bg-amber/80" />
                  <span className="text-muted">W3 (74%)</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-8 w-full rounded-lg bg-amber/70" />
                  <span className="text-muted">W4 (68%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Sun & Earth Visibility Multi-Range Windows */}
        <div className="flex flex-col justify-between rounded-2xl border border-panel-border bg-panel p-5 shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-panel-border">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink">
                Sun & Earth Visibility
              </span>
              <span className="font-mono text-[11px] text-muted">
                TOPOCENTRIC CLEARANCE
              </span>
            </div>

            <div className="space-y-4 py-4">
              {/* Solar Elevation Clearance Sparkline/Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-ink">Solar Elevation vs Horizon</span>
                  <span className={sunClearance >= 0 ? 'text-emerald' : 'text-critical'}>
                    {sunClearance >= 0 ? `+${sunClearance.toFixed(2)}° Clearance` : `${sunClearance.toFixed(2)}° Occluded`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#141210]">
                  <div
                    className="h-full rounded-full bg-amber transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, illumPct))}%` }}
                  />
                </div>
              </div>

              {/* Earth Elevation Line-of-Sight Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-ink">Earth Elevation vs Horizon</span>
                  <span className={earthClearance >= 0 ? 'text-emerald' : 'text-critical'}>
                    {earthClearance >= 0 ? `+${earthClearance.toFixed(2)}° Clearance` : `${earthClearance.toFixed(2)}° Occluded`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#141210]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isEarthVisible ? 'bg-emerald' : 'bg-critical'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, dtePct))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stat Counters Row */}
            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-center">
              <div className="rounded-xl border border-panel-border bg-[#141210] p-2.5">
                <div className="text-[10px] text-muted font-sans">ILLUMINATED WINDOW</div>
                <div className="mt-0.5 text-base font-bold text-amber">{illumPct}%</div>
              </div>
              <div className="rounded-xl border border-panel-border bg-[#141210] p-2.5">
                <div className="text-[10px] text-muted font-sans">EARTH-VISIBLE (DTE)</div>
                <div className="mt-0.5 text-base font-bold text-emerald">{dtePct}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
