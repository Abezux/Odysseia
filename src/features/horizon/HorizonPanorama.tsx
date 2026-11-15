import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Sun, Globe, Compass, RotateCcw } from 'lucide-react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { dataProvider } from '../../lib/data';
import { ephemerisEngine } from '../../lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../lib/metrics/visibility';
import type { Site, HorizonProfile, EphemerisSample } from '../../contracts';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui';

// Deterministic subtle background stars
const BACKGROUND_STARS = Array.from({ length: 60 }, (_, i) => {
  const seed = (i + 1) * 48271 % 2147483647;
  const xPercent = (seed % 1000) / 10;
  const yPercent = ((seed * 7) % 700) / 10; // Top 70% of sky
  const r = 0.6 + ((seed * 13) % 10) / 10;
  const opacity = 0.2 + ((seed * 17) % 50) / 100;
  return { xPercent, yPercent, r, opacity };
});

export interface HorizonViewProps {
  hideDetails?: boolean;
  isFullscreen?: boolean;
}

export function HorizonView({
  hideDetails = false,
  isFullscreen = false
}: HorizonViewProps): React.JSX.Element {
  const { activeSiteId } = useScenarioStore();
  const { currentTime } = useTimeStore();

  const [site, setSite] = useState<Site | null>(null);
  const [horizon, setHorizon] = useState<HorizonProfile | null>(null);

  // Azimuth view & FOV
  const [centerAzimuth, setCenterAzimuth] = useState<number>(0); // 0° to 360° (Observer Heading)
  const [fovDegrees, setFovDegrees] = useState<number>(180); // 60° to 360°
  const [exaggeration, setExaggeration] = useState<1 | 2 | 4>(1); // Vertical slope exaggeration

  // Container dimensions (observed dynamically, clean in fullscreen without letterbox skew)
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 900,
    height: 480
  });

  // Interaction refs
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; az: number }>({ x: 0, az: 0 });
  const touchDistRef = useRef<number | null>(null);

  // ResizeObserver: remeasures container width and height cleanly without hardcoded offsets
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          width: Math.max(360, Math.round(rect.width)),
          height: Math.max(220, Math.round(rect.height))
        });
      }
    };

    measure();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.max(360, Math.round(width)),
            height: Math.max(220, Math.round(height))
          });
        }
      }
    });

    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Fetch site and horizon
  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      const cat = await dataProvider.getCatalog();
      const currentSite = cat.sites.find((s) => s.id === activeSiteId) || cat.sites[0];
      if (isCancelled) return;
      setSite(currentSite);

      const horiz = await dataProvider.getHorizon(currentSite.id);
      if (isCancelled) return;
      setHorizon(horiz);
    }
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [activeSiteId]);

  // Compute live ephemeris
  const ephemeris: EphemerisSample | null = useMemo(() => {
    if (!site) return null;
    return ephemerisEngine.sample(
      { latDeg: site.latDeg, lonDeg: site.lonDeg, elevationM: site.elevationM },
      currentTime
    );
  }, [site, currentTime]);

  // Elevation scale bounds: meaningful lunar horizon numbers (-3° to +25°)
  const minElev = -3;
  const maxElev = 25;
  const elevRange = maxElev - minElev; // 28°

  // Convert Elevation to Canvas Y (with optional slope exaggeration)
  const elevToY = useCallback(
    (elev: number, applyExaggeration = false): number => {
      const effectiveElev = applyExaggeration ? elev * exaggeration : elev;
      const fraction = (effectiveElev - minElev) / elevRange;
      return dimensions.height * (1 - Math.max(0, Math.min(1, fraction)));
    },
    [dimensions.height, elevRange, minElev, exaggeration]
  );

  // Convert Azimuth to Canvas X given current centerAzimuth and fovDegrees
  const azToX = useCallback(
    (az: number): number => {
      let delta = az - centerAzimuth;
      while (delta < -180) delta += 360;
      while (delta > 180) delta -= 360;
      const fraction = (delta + fovDegrees / 2) / fovDegrees;
      return fraction * dimensions.width;
    },
    [centerAzimuth, fovDegrees, dimensions.width]
  );

  // Drag to pan azimuth
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, az: centerAzimuth };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dAz = -(dx / dimensions.width) * fovDegrees;
    let newAz = (dragStartRef.current.az + dAz) % 360;
    if (newAz < 0) newAz += 360;
    setCenterAzimuth(newAz);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Wheel to zoom FOV (between 60° and 360°)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    setFovDegrees((prev) => {
      const next = prev * zoomFactor;
      return Math.max(60, Math.min(360, Math.round(next)));
    });
  };

  // Touch pinch to zoom FOV
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const ratio = touchDistRef.current / currentDist;
      setFovDegrees((prev) => Math.max(60, Math.min(360, Math.round(prev * ratio))));
      touchDistRef.current = currentDist;
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
  };

  // Reset to full 360° panorama
  const handleResetPanorama = () => {
    setFovDegrees(360);
    setCenterAzimuth(0);
    setExaggeration(1);
  };

  // Tracking buttons
  const handleTrackSun = () => {
    if (ephemeris) {
      setCenterAzimuth(ephemeris.sun.azimuthDeg);
    }
  };

  const handleTrackEarth = () => {
    if (ephemeris) {
      setCenterAzimuth(ephemeris.earth.azimuthDeg);
    }
  };

  // Generate terrain SVG path across the visible azimuth window
  const terrainPath = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const step = 0.5; // half-degree sampling for smooth skyline
    const startAz = centerAzimuth - fovDegrees / 2 - 2;
    const endAz = centerAzimuth + fovDegrees / 2 + 2;

    for (let az = startAz; az <= endAz; az += step) {
      let normalizedAz = az % 360;
      if (normalizedAz < 0) normalizedAz += 360;
      const elev = getHorizonThresholdAtAzimuth(horizon, normalizedAz);
      const x = azToX(az);
      const y = elevToY(elev, true);
      pts.push({ x, y });
    }

    if (pts.length === 0) return '';

    // Construct polygon extending to bottom of canvas
    let d = `M ${pts[0].x.toFixed(1)} ${dimensions.height} L ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length - 1].x.toFixed(1)} ${dimensions.height} Z`;

    return d;
  }, [horizon, centerAzimuth, fovDegrees, azToX, elevToY, dimensions.height]);

  // Elevation grid lines every 5° with -3° base and 0° true horizon
  const elevationGrid = [-3, 0, 5, 10, 15, 20, 25];

  // Azimuth compass ticks (every 15°, with N, NE, E, SE, S, SW, W, NW cardinal markers)
  const compassTicks = useMemo(() => {
    const ticks = [];
    const step = 15;
    for (let az = 0; az < 360; az += step) {
      const x = azToX(az);
      if (x >= -40 && x <= dimensions.width + 40) {
        let label = `${az}°`;
        if (az === 0) label = 'N (0°)';
        else if (az === 45) label = 'NE';
        else if (az === 90) label = 'E (90°)';
        else if (az === 135) label = 'SE';
        else if (az === 180) label = 'S (180°)';
        else if (az === 225) label = 'SW';
        else if (az === 270) label = 'W (270°)';
        else if (az === 315) label = 'NW';

        const isMajor = az % 45 === 0;
        ticks.push({ az, x, label, isMajor });
      }
    }
    return ticks;
  }, [azToX, dimensions.width]);

  if (!site || !ephemeris) {
    return (
      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber border-t-transparent" />
          <span>Generating panoramic horizon view...</span>
        </div>
      </div>
    );
  }

  // Live bodies telemetry
  const sunAz = ephemeris.sun.azimuthDeg;
  const sunEl = ephemeris.sun.elevationDeg;
  const sunTerr = getHorizonThresholdAtAzimuth(horizon, sunAz);
  const sunX = azToX(sunAz);
  const sunY = elevToY(sunEl, false);
  const isSunVisible = sunEl + 0.267 >= sunTerr && sunEl >= -0.267;
  const sunClearance = sunEl - sunTerr;

  const earthAz = ephemeris.earth.azimuthDeg;
  const earthEl = ephemeris.earth.elevationDeg;
  const earthTerr = getHorizonThresholdAtAzimuth(horizon, earthAz);
  const earthX = azToX(earthAz);
  const earthY = elevToY(earthEl, false);
  const isEarthVisible = earthEl >= earthTerr && earthEl >= 0;
  const earthClearance = earthEl - earthTerr;

  // Angular diameter pixel scales
  const pxPerDegree = dimensions.height / elevRange;
  const sunRadiusPx = Math.max(5, (ephemeris.sun.angularDiameterDeg / 2) * pxPerDegree);
  const earthRadiusPx = Math.max(12, (ephemeris.earth.angularDiameterDeg / 2) * pxPerDegree);

  return (
    <div
      ref={containerRef}
      data-tour="skyline-view"
      className="relative h-full w-full select-none overflow-hidden bg-[#0B0A09] font-mono"
    >
      {/* Slot Top-Left: First-Person Skyline Title & LOLA Profile Badge */}
      <div
        className={`pointer-events-none absolute z-panel flex items-center gap-2 transition-opacity duration-200 ${
          hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${isFullscreen ? 'top-4 left-4 mt-[200px]' : 'top-3 left-3 sm:top-4 sm:left-4'}`}
      >
        <span className="font-semibold text-ink font-sans text-xs hidden sm:inline">First-Person Skyline</span>
        <Badge
          variant={
            horizon === null
              ? 'neutral'
              : horizon.source === 'lola'
              ? horizon.coverageStatus === 'PARTIAL'
                ? 'warning'
                : 'success'
              : 'warning'
          }
          size="sm"
        >
          {horizon === null
            ? 'Smooth Horizon (0°)'
            : horizon.source === 'lola'
            ? horizon.coverageStatus === 'PARTIAL'
              ? `LOLA 20m Profile (PARTIAL ${horizon.realAzimuthBinPercent ?? 53}%)`
              : 'LOLA 20m Profile'
            : 'Mock Profile (Outside 80°S)'}
        </Badge>
      </div>

      {/* Slot Top-Center: Quick Orientation Presets & Tracking Controls (below Tabs) */}
      <div
        className={`absolute z-panel flex items-center gap-1 sm:gap-1.5 rounded-xl border border-panel-border bg-panel/90 p-1 shadow-md backdrop-blur-md transition-opacity duration-200 ${
          hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } top-13 sm:top-14 left-1/2 -translate-x-1/2`}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={handleTrackSun}
          className="text-[10px] h-6 px-1.5 sm:px-2 text-amber border-amber/30 hover:border-amber flex items-center gap-1"
          title="Rotate panorama to center the Sun"
        >
          <Icon icon={Sun} size={16} />
          <span className="hidden sm:inline">Sun</span>
          <span>({sunAz.toFixed(0)}°)</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleTrackEarth}
          className="text-[10px] h-6 px-1.5 sm:px-2 text-emerald border-emerald/30 hover:border-emerald flex items-center gap-1"
          title="Rotate panorama to center the Earth"
        >
          <Icon icon={Globe} size={16} />
          <span className="hidden sm:inline">Earth</span>
          <span>({earthAz.toFixed(0)}°)</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCenterAzimuth(0)}
          className={`text-[10px] h-6 px-1.5 ${
            Math.round(centerAzimuth) === 0 ? 'text-amber font-bold' : 'text-muted hover:text-ink'
          }`}
        >
          N
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCenterAzimuth(180)}
          className={`text-[10px] h-6 px-1.5 ${
            Math.round(centerAzimuth) === 180 ? 'text-amber font-bold' : 'text-muted hover:text-ink'
          }`}
        >
          S
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleResetPanorama}
          className="text-[10px] h-6 px-1.5 sm:px-2 text-muted hover:text-ink border-panel-border hover:border-amber/40 flex items-center gap-1"
          title="Reset to 360° full panorama facing North"
        >
          <Icon icon={RotateCcw} size={16} />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      </div>

      {/* Slot Top-Right: Vertical Exaggeration (1x | 2x | 4x) & FOV readout (below Toolbar) */}
      <div
        className={`absolute z-panel flex items-center gap-1.5 sm:gap-2 transition-opacity duration-200 ${
          hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } top-13 sm:top-14 right-3 sm:right-4`}
      >
        {/* Vertical Exaggeration Pill */}
        <div className="flex items-center rounded-xl border border-panel-border bg-panel/90 p-0.5 shadow-lg backdrop-blur-md">
          <span className="px-1.5 font-mono text-[9px] text-muted uppercase hidden sm:inline">Slope:</span>
          {([1, 2, 4] as const).map((factor) => (
            <button
              key={factor}
              type="button"
              onClick={() => setExaggeration(factor)}
              className={`rounded-lg px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-all focus:outline-none ${
                exaggeration === factor
                  ? 'bg-amber text-ground shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title={`Vertical slope exaggeration: ${factor}x`}
            >
              {factor}x
            </button>
          ))}
        </div>

        {/* FOV Pill */}
        <div className="flex items-center rounded-xl border border-panel-border bg-panel/90 px-2 py-0.5 sm:py-1 shadow-lg backdrop-blur-md text-[10px] font-mono text-muted">
          <span className="hidden sm:inline">FOV:</span>
          <span className="sm:ml-1 font-bold text-ink">{fovDegrees}°</span>
        </div>
      </div>

      {/* Panoramic SVG Canvas */}
      <div
        className="relative h-full w-full cursor-grab active:cursor-grabbing overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="h-full w-full overflow-hidden block select-none"
        >
          <defs>
            {/* Deep Space Sky Gradient */}
            <linearGradient id="deepSpaceSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B0A09" />
              <stop offset="60%" stopColor="#100E0D" />
              <stop offset="100%" stopColor="#161412" />
            </linearGradient>

            {/* Subtle Terrain Gradient: #141210 to #0B0A09 */}
            <linearGradient id="lunarTerrainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E1C1A" />
              <stop offset="25%" stopColor="#141210" />
              <stop offset="100%" stopColor="#0B0A09" />
            </linearGradient>

            {/* Sun Glow Filter */}
            <filter id="panoSunGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>

          {/* Sky Background */}
          <rect width={dimensions.width} height={dimensions.height} fill="url(#deepSpaceSky)" />

          {/* Subtle Deterministic Background Stars */}
          {BACKGROUND_STARS.map((star, idx) => (
            <circle
              key={idx}
              cx={(star.xPercent / 100) * dimensions.width}
              cy={(star.yPercent / 100) * dimensions.height}
              r={star.r}
              fill="#F4EFE8"
              opacity={star.opacity}
            />
          ))}

          {/* Elevation Horizontal Grid Lines (-3°, 0°, 5°, 10°, 15°, 20°, 25°) */}
          {elevationGrid.map((el) => {
            const y = elevToY(el, false);
            const isZero = el === 0;
            return (
              <g key={el}>
                <line
                  x1={0}
                  y1={y}
                  x2={dimensions.width}
                  y2={y}
                  stroke={isZero ? '#F5A524' : '#2E2A26'}
                  strokeWidth={isZero ? 1.5 : 0.8}
                  strokeDasharray={isZero ? undefined : '3,4'}
                  opacity={isZero ? 0.8 : 0.35}
                />
                <text
                  x={10}
                  y={y - 4}
                  className={`font-mono text-[9px] ${
                    isZero ? 'fill-amber font-bold' : 'fill-muted'
                  }`}
                >
                  {isZero ? '0° TRUE HORIZON' : el > 0 ? `+${el}°` : `${el}°`}
                </text>
              </g>
            );
          })}

          {/* Azimuth Compass Lines & Ticks */}
          {compassTicks.map((tick) => (
            <g key={tick.az}>
              <line
                x1={tick.x}
                y1={0}
                x2={tick.x}
                y2={dimensions.height}
                stroke="#2E2A26"
                strokeWidth={tick.isMajor ? 1 : 0.5}
                opacity={tick.isMajor ? 0.45 : 0.2}
              />
              <text
                x={tick.x}
                y={20}
                textAnchor="middle"
                className={`font-mono ${
                  tick.isMajor
                    ? 'fill-ink font-bold text-[10px]'
                    : 'fill-muted text-[8px]'
                }`}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Sun Disk (Rendered behind terrain silhouette) */}
          <g transform={`translate(${sunX.toFixed(1)}, ${sunY.toFixed(1)})`}>
            {/* Halo glow */}
            <circle
              r={sunRadiusPx * 3}
              fill="#F5A524"
              opacity={isSunVisible ? 0.35 : 0.08}
              filter="url(#panoSunGlow)"
            />
            {/* Core Sun Disk */}
            <circle
              r={sunRadiusPx}
              fill={isSunVisible ? '#FFD58A' : '#451A03'}
              stroke={isSunVisible ? '#F5A524' : '#2E2A26'}
              strokeWidth="1.5"
            />
            {/* Sun Label: elevation + azimuth */}
            <text
              x={sunRadiusPx + 5}
              y={3}
              className={`font-mono text-[10px] font-semibold ${
                isSunVisible ? 'fill-amber' : 'fill-muted'
              }`}
            >
              Sun {sunEl >= 0 ? `+${sunEl.toFixed(1)}°` : `${sunEl.toFixed(1)}°`} (Az {sunAz.toFixed(0)}°)
            </text>
          </g>

          {/* Earth Disk (Rendered behind terrain silhouette) */}
          <g transform={`translate(${earthX.toFixed(1)}, ${earthY.toFixed(1)})`}>
            {/* Earth atmosphere glow */}
            <circle
              r={earthRadiusPx * 1.5}
              fill="#38BDF8"
              opacity={isEarthVisible ? 0.25 : 0.05}
              filter="url(#panoSunGlow)"
            />
            {/* Earth Marble Body */}
            <circle
              r={earthRadiusPx}
              fill={isEarthVisible ? '#0369A1' : '#1A1816'}
              stroke={isEarthVisible ? '#38BDF8' : '#EF4444'}
              strokeWidth="1.5"
            />
            {/* Inner Earth Phase Shading */}
            <path
              d={`M 0 ${-earthRadiusPx} A ${earthRadiusPx} ${earthRadiusPx} 0 0 1 0 ${earthRadiusPx} A ${
                earthRadiusPx * Math.cos(ephemeris.earth.phaseFraction * Math.PI)
              } ${earthRadiusPx} 0 0 ${ephemeris.earth.phaseFraction > 0.5 ? 1 : 0} 0 ${-earthRadiusPx}`}
              fill="#38BDF8"
              opacity="0.8"
            />
            {/* Earth Label: elevation + azimuth */}
            <text
              x={earthRadiusPx + 6}
              y={3}
              className={`font-mono text-[10px] font-semibold ${
                isEarthVisible ? 'fill-sky-400' : 'fill-critical'
              }`}
            >
              Earth {earthEl >= 0 ? `+${earthEl.toFixed(1)}°` : `${earthEl.toFixed(1)}°`} (Az {earthAz.toFixed(0)}°)
            </text>
          </g>

          {/* Plotted Terrain Silhouette (Obscures Sun/Earth when below ridge crest) */}
          {terrainPath && (
            <path
              d={terrainPath}
              fill="url(#lunarTerrainGradient)"
              stroke="rgba(244, 239, 232, 0.45)"
              strokeWidth="1.5"
              className="transition-all duration-75"
            />
          )}

          {/* Center Observer Heading Marker & Reticle */}
          <g transform={`translate(${dimensions.width / 2}, 0)`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={dimensions.height}
              stroke="#F5A524"
              strokeWidth="0.8"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            {/* Center Reticle crosshair */}
            <g transform={`translate(0, ${elevToY(0, false)})`}>
              <circle r="4" fill="none" stroke="#F5A524" strokeWidth="1" opacity="0.7" />
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#F5A524" strokeWidth="1" opacity="0.7" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke="#F5A524" strokeWidth="1" opacity="0.7" />
            </g>
          </g>
        </svg>

        {/* Slot Bottom-Left: Overlay Telemetry HUD */}
        <div
          className={`pointer-events-none absolute z-panel flex flex-col gap-1.5 rounded-2xl border border-panel-border bg-panel/90 px-3 py-2 text-[10px] text-ink backdrop-blur-md transition-opacity duration-200 ${
            hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
          } ${isFullscreen ? 'bottom-[235px] left-4' : 'bottom-3 left-3 sm:bottom-4 sm:left-4'}`}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-amber">
              <Icon icon={Sun} size={16} />
              <span>Solar Line-of-Sight:</span>
            </span>
            <span className={isSunVisible ? 'text-emerald font-bold' : 'text-muted font-semibold'}>
              {isSunVisible ? `CLEAR (+${sunClearance.toFixed(2)}°)` : `OBSCURED (${sunClearance.toFixed(2)}°)`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Icon icon={Globe} size={16} />
              <span>Earth DTE Link:</span>
            </span>
            <span className={isEarthVisible ? 'text-emerald font-bold' : 'text-critical font-semibold'}>
              {isEarthVisible ? `LOCKED (+${earthClearance.toFixed(2)}°)` : `TERRAIN BLOCKED (${earthClearance.toFixed(2)}°)`}
            </span>
          </div>
        </div>

        {/* Slot Bottom-Right: Center Heading Readout HUD */}
        <div
          className={`pointer-events-none absolute z-panel flex items-center gap-2 rounded-2xl border border-panel-border bg-panel/90 px-3 py-1.5 text-[10px] text-muted backdrop-blur-md transition-opacity duration-200 ${
            hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
          } bottom-3 right-3 sm:bottom-4 sm:right-4`}
        >
          <Icon icon={Compass} size={16} className="text-amber" />
          <span>Observer Heading:</span>
          <span className="font-bold text-ink">{centerAzimuth.toFixed(1)}°</span>
          {exaggeration > 1 && (
            <span className="text-amber font-semibold">({exaggeration}x Exaggeration)</span>
          )}
          <span className="hidden sm:inline">(Drag to pan · Wheel to zoom)</span>
        </div>
      </div>
    </div>
  );
}
