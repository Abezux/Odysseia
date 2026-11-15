import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Sun, Globe } from 'lucide-react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { dataProvider } from '../../lib/data';
import { ephemerisEngine } from '../../lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../lib/metrics/visibility';
import type { Site, HorizonProfile, EphemerisSample } from '../../contracts';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui';

export function HorizonView(): React.JSX.Element {
  const { activeSiteId } = useScenarioStore();
  const { currentTime } = useTimeStore();

  const [site, setSite] = useState<Site | null>(null);
  const [horizon, setHorizon] = useState<HorizonProfile | null>(null);
  const [centerAzimuth, setCenterAzimuth] = useState<number>(0); // 0 to 360
  const [fovDegrees, setFovDegrees] = useState<number>(120); // Field of View (e.g. 90°, 120°, 180°)
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; az: number }>({ x: 0, az: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.max(400, entry.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
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

  // Dimensions & Scales
  const height = 400;
  const minElev = -6;
  const maxElev = 22;
  const elevRange = maxElev - minElev;

  // Convert Elevation to Canvas Y
  const elevToY = useCallback(
    (elev: number): number => {
      const fraction = (elev - minElev) / elevRange;
      return height * (1 - Math.max(0, Math.min(1, fraction)));
    },
    [height, elevRange, minElev]
  );

  // Convert Azimuth to Canvas X given current centerAzimuth and fovDegrees
  const azToX = useCallback(
    (az: number): number => {
      let delta = az - centerAzimuth;
      while (delta < -180) delta += 360;
      while (delta > 180) delta -= 360;
      const fraction = (delta + fovDegrees / 2) / fovDegrees;
      return fraction * containerWidth;
    },
    [centerAzimuth, fovDegrees, containerWidth]
  );

  // Pan interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, az: centerAzimuth };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dAz = -(dx / containerWidth) * fovDegrees;
    let newAz = (dragStartRef.current.az + dAz) % 360;
    if (newAz < 0) newAz += 360;
    setCenterAzimuth(newAz);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Jump handlers
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
    const pts: { x: number; y: number; az: number; elev: number }[] = [];
    const step = 0.5; // half-degree sampling for smooth skyline
    const startAz = centerAzimuth - fovDegrees / 2 - 2;
    const endAz = centerAzimuth + fovDegrees / 2 + 2;

    for (let az = startAz; az <= endAz; az += step) {
      let normalizedAz = az % 360;
      if (normalizedAz < 0) normalizedAz += 360;
      const elev = getHorizonThresholdAtAzimuth(horizon, normalizedAz);
      const x = azToX(az);
      const y = elevToY(elev);
      pts.push({ x, y, az: normalizedAz, elev });
    }

    if (pts.length === 0) return '';

    // Construct polygon extending to bottom of canvas
    let d = `M ${pts[0].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length - 1].x.toFixed(1)} ${height} Z`;

    return d;
  }, [horizon, centerAzimuth, fovDegrees, azToX, elevToY, height]);

  // Elevation grid lines (-5°, 0°, 5°, 10°, 15°, 20°)
  const elevationGrid = [-5, 0, 5, 10, 15, 20];

  // Azimuth compass ticks
  const compassTicks = useMemo(() => {
    const ticks = [];
    const step = 15;
    for (let az = 0; az < 360; az += step) {
      const x = azToX(az);
      if (x >= -40 && x <= containerWidth + 40) {
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
  }, [azToX, containerWidth]);

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
  const sunY = elevToY(sunEl);
  const isSunVisible = sunEl + 0.267 >= sunTerr && sunEl >= -0.267;
  const sunClearance = sunEl - sunTerr;

  const earthAz = ephemeris.earth.azimuthDeg;
  const earthEl = ephemeris.earth.elevationDeg;
  const earthTerr = getHorizonThresholdAtAzimuth(horizon, earthAz);
  const earthX = azToX(earthAz);
  const earthY = elevToY(earthEl);
  const isEarthVisible = earthEl >= earthTerr && earthEl >= 0;
  const earthClearance = earthEl - earthTerr;

  // Angular diameter scales
  // 1 degree = (height / elevRange) pixels
  const pxPerDegree = height / elevRange;
  const sunRadiusPx = Math.max(5, (ephemeris.sun.angularDiameterDeg / 2) * pxPerDegree);
  const earthRadiusPx = Math.max(12, (ephemeris.earth.angularDiameterDeg / 2) * pxPerDegree);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col select-none overflow-hidden bg-[#0B0A09] font-mono"
    >
      {/* Top Header & Navigation Bar */}
      <div className="flex items-center justify-between border-b border-panel-border bg-panel/90 px-4 py-2 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink font-sans">First-Person Skyline</span>
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

        {/* Quick Orientation Presets */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTrackSun}
            className="text-[10px] h-6 px-2 text-amber border-amber/30 hover:border-amber flex items-center gap-1.5"
          >
            <Icon icon={Sun} size={16} />
            <span>Look at Sun ({sunAz.toFixed(0)}°)</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTrackEarth}
            className="text-[10px] h-6 px-2 text-emerald border-emerald/30 hover:border-emerald flex items-center gap-1.5"
          >
            <Icon icon={Globe} size={16} />
            <span>Look at Earth ({earthAz.toFixed(0)}°)</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCenterAzimuth(0)}
            className="text-[10px] h-6 px-1.5 text-muted hover:text-ink"
          >
            N (0°)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCenterAzimuth(180)}
            className="text-[10px] h-6 px-1.5 text-muted hover:text-ink"
          >
            S (180°)
          </Button>

          {/* FOV Toggle */}
          <div className="ml-2 flex rounded-lg border border-panel-border bg-panel p-0.5">
            {[90, 120, 180].map((fov) => (
              <button
                key={fov}
                onClick={() => setFovDegrees(fov)}
                className={`px-1.5 py-0.5 text-[9px] rounded ${
                  fovDegrees === fov ? 'bg-amber text-amber-text font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                {fov}° FOV
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panoramic SVG Canvas */}
      <div
        className="relative flex-1 cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg
          width={containerWidth}
          height={height}
          className="h-full w-full overflow-visible touch-none"
        >
          <defs>
            {/* Deep Space Sky Gradient */}
            <linearGradient id="deepSpaceSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B0A09" />
              <stop offset="60%" stopColor="#12110F" />
              <stop offset="100%" stopColor="#1A1816" />
            </linearGradient>

            {/* Terrain Regolith Gradient */}
            <linearGradient id="lunarTerrain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E2A26" />
              <stop offset="25%" stopColor="#1A1816" />
              <stop offset="100%" stopColor="#12110F" />
            </linearGradient>

            {/* Sun Glow Filter */}
            <filter id="panoSunGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>

          {/* Sky Background */}
          <rect width={containerWidth} height={height} fill="url(#deepSpaceSky)" />

          {/* Elevation Horizontal Grid Lines */}
          {elevationGrid.map((el) => {
            const y = elevToY(el);
            const isZero = el === 0;
            return (
              <g key={el}>
                <line
                  x1={0}
                  y1={y}
                  x2={containerWidth}
                  y2={y}
                  stroke={isZero ? '#F5A524' : '#2E2A26'}
                  strokeWidth={isZero ? 1.2 : 0.8}
                  strokeDasharray={isZero ? '4,4' : '2,4'}
                  opacity={isZero ? 0.6 : 0.3}
                />
                <text
                  x={8}
                  y={y - 3}
                  className={`font-mono text-[9px] ${
                    isZero ? 'fill-amber font-bold' : 'fill-muted'
                  }`}
                >
                  {el > 0 ? `+${el}°` : `${el}°`}
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
                y2={height}
                stroke="#2E2A26"
                strokeWidth={tick.isMajor ? 1 : 0.5}
                opacity={tick.isMajor ? 0.5 : 0.25}
              />
              <text
                x={tick.x}
                y={18}
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
            {/* Sun Label */}
            <text
              x={sunRadiusPx + 4}
              y={3}
              className={`font-mono text-[10px] font-semibold ${
                isSunVisible ? 'fill-amber' : 'fill-muted'
              }`}
            >
              Sun {sunEl.toFixed(1)}°
            </text>
          </g>

          {/* Earth Disk (Rendered behind terrain silhouette) */}
          <g transform={`translate(${earthX.toFixed(1)}, ${earthY.toFixed(1)})`}>
            {/* Earth atmosphere glow */}
            <circle
              r={earthRadiusPx * 1.5}
              fill="#10B981"
              opacity={isEarthVisible ? 0.25 : 0.05}
              filter="url(#panoSunGlow)"
            />
            {/* Earth Marble Body */}
            <circle
              r={earthRadiusPx}
              fill={isEarthVisible ? '#065F46' : '#1A1816'}
              stroke={isEarthVisible ? '#10B981' : '#EF4444'}
              strokeWidth="1.5"
            />
            {/* Inner Earth Phase Shading */}
            <path
              d={`M 0 ${-earthRadiusPx} A ${earthRadiusPx} ${earthRadiusPx} 0 0 1 0 ${earthRadiusPx} A ${
                earthRadiusPx * Math.cos(ephemeris.earth.phaseFraction * Math.PI)
              } ${earthRadiusPx} 0 0 ${ephemeris.earth.phaseFraction > 0.5 ? 1 : 0} 0 ${-earthRadiusPx}`}
              fill="#10B981"
              opacity="0.8"
            />
            {/* Earth Label */}
            <text
              x={earthRadiusPx + 6}
              y={3}
              className={`font-mono text-[10px] font-semibold ${
                isEarthVisible ? 'fill-emerald' : 'fill-critical'
              }`}
            >
              Earth {earthEl.toFixed(1)}° ({Math.round(ephemeris.earth.phaseFraction * 100)}%)
            </text>
          </g>

          {/* Plotted Terrain Silhouette (Obscures Sun/Earth when below ridge crest) */}
          {terrainPath && (
            <path
              d={terrainPath}
              fill="url(#lunarTerrain)"
              stroke="rgba(244, 239, 232, 0.4)"
              strokeWidth="1.5"
              className="transition-all duration-75"
            />
          )}

          {/* Mast Horizon Level Indicator */}
          <line
            x1={0}
            y1={elevToY(0)}
            x2={containerWidth}
            y2={elevToY(0)}
            stroke="#8A847B"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />

          {/* Center Reticle crosshair */}
          <g transform={`translate(${containerWidth / 2}, ${height / 2})`}>
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#8A847B" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.6" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#8A847B" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.6" />
            <circle r="2" fill="none" stroke="#8A847B" strokeWidth="0.8" opacity="0.6" />
          </g>
        </svg>

        {/* Overlay Telemetry HUD (Bottom Left & Right) */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-2xl border border-panel-border bg-panel/90 px-3 py-2 text-[10px] text-ink backdrop-blur-md">
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
            <span className="flex items-center gap-1.5 text-emerald">
              <Icon icon={Globe} size={16} />
              <span>Earth DTE Link:</span>
            </span>
            <span className={isEarthVisible ? 'text-emerald font-bold' : 'text-critical font-semibold'}>
              {isEarthVisible ? `LOCKED (+${earthClearance.toFixed(2)}°)` : `TERRAIN BLOCKED (${earthClearance.toFixed(2)}°)`}
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-2xl border border-panel-border bg-panel/90 px-3 py-1.5 text-[10px] text-muted backdrop-blur-md">
          <span>Center Azimuth:</span>
          <span className="font-bold text-ink">{centerAzimuth.toFixed(1)}°</span>
          <span>(Drag left/right to pan)</span>
        </div>
      </div>
    </div>
  );
}
