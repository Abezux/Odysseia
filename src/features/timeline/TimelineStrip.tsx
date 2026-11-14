import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTimeStore } from '../../store/useTimeStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { dataProvider } from '../../lib/data';
import { ephemerisEngine } from '../../lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../lib/metrics/visibility';
import type { Site, HorizonProfile } from '../../contracts';
import { Button } from '../../ui/Button';

type ZoomPreset = '24h' | '7d' | '29.5d';

const ZOOM_DURATIONS: Record<ZoomPreset, number> = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 86400 * 1000,
  '29.5d': 29.53 * 86400 * 1000
};

export function TimelineStripView(): React.JSX.Element {
  const { currentTime, setTime } = useTimeStore();
  const { activeSiteId } = useScenarioStore();

  const [site, setSite] = useState<Site | null>(null);
  const [horizon, setHorizon] = useState<HorizonProfile | null>(null);
  const [zoom, setZoom] = useState<ZoomPreset>('29.5d');
  const [windowCenter, setWindowCenter] = useState<number>(currentTime.getTime());
  const [hoverData, setHoverData] = useState<{
    x: number;
    time: Date;
    sunEl: number;
    sunTerr: number;
    earthEl: number;
    earthTerr: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const isDraggingRef = useRef<boolean>(false);

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

  // Fetch active site & horizon
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

  // Keep window centered when switching zoom
  const handleZoomChange = (newZoom: ZoomPreset) => {
    setZoom(newZoom);
    setWindowCenter(currentTime.getTime());
  };

  const handleCenterOnNow = () => {
    setWindowCenter(currentTime.getTime());
  };

  const durationMs = ZOOM_DURATIONS[zoom];
  const windowStartMs = windowCenter - durationMs / 2;

  // Layout Dimensions
  const height = 150;
  const margin = { top: 18, right: 24, bottom: 36, left: 44 };
  const plotWidth = containerWidth - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Time to X scale
  const timeToX = useCallback(
    (tMs: number): number => {
      const fraction = (tMs - windowStartMs) / durationMs;
      return margin.left + Math.max(0, Math.min(1, fraction)) * plotWidth;
    },
    [windowStartMs, durationMs, margin.left, plotWidth]
  );

  // X to Time scale
  const xToTime = useCallback(
    (x: number): Date => {
      const fraction = (x - margin.left) / plotWidth;
      const clampedFraction = Math.max(0, Math.min(1, fraction));
      return new Date(windowStartMs + clampedFraction * durationMs);
    },
    [margin.left, plotWidth, windowStartMs, durationMs]
  );

  // Sample points across visible window
  const samples = useMemo(() => {
    if (!site) return [];
    const numSamples = Math.min(180, Math.max(60, Math.floor(plotWidth / 5)));
    const pts = [];

    for (let i = 0; i <= numSamples; i++) {
      const tMs = windowStartMs + (i / numSamples) * durationMs;
      const t = new Date(tMs);
      const ephem = ephemerisEngine.sample(
        { latDeg: site.latDeg, lonDeg: site.lonDeg, elevationM: site.elevationM },
        t
      );

      const sunTerr = getHorizonThresholdAtAzimuth(horizon, ephem.sun.azimuthDeg);
      const earthTerr = getHorizonThresholdAtAzimuth(horizon, ephem.earth.azimuthDeg);

      const isSunlit = ephem.sun.elevationDeg + 0.267 >= sunTerr && ephem.sun.elevationDeg >= -0.267;
      const isDte = ephem.earth.elevationDeg >= earthTerr && ephem.earth.elevationDeg >= 0;

      pts.push({
        tMs,
        t,
        sunEl: ephem.sun.elevationDeg,
        sunTerr,
        isSunlit,
        earthEl: ephem.earth.elevationDeg,
        earthTerr,
        isDte
      });
    }
    return pts;
  }, [site, horizon, windowStartMs, durationMs, plotWidth]);

  // Elevation range & Y scale
  const { minElev, maxElev } = useMemo(() => {
    if (samples.length === 0) return { minElev: -5, maxElev: 15 };
    let min = -4;
    let max = 10;
    for (const s of samples) {
      if (s.sunEl < min) min = s.sunEl;
      if (s.sunEl > max) max = s.sunEl;
      if (s.earthEl < min) min = s.earthEl;
      if (s.earthEl > max) max = s.earthEl;
      if (s.sunTerr > max) max = s.sunTerr;
    }
    return { minElev: Math.floor(min - 1), maxElev: Math.ceil(max + 2) };
  }, [samples]);

  const elevToY = useCallback(
    (elevDeg: number): number => {
      const fraction = (elevDeg - minElev) / (maxElev - minElev);
      return margin.top + (1 - Math.max(0, Math.min(1, fraction))) * (plotHeight - 14);
    },
    [minElev, maxElev, margin.top, plotHeight]
  );

  // SVG Paths
  const { sunPath, earthPath, sunTerrPath } = useMemo(() => {
    if (samples.length === 0) return { sunPath: '', earthPath: '', sunTerrPath: '' };

    let sp = '';
    let ep = '';
    let stp = '';

    samples.forEach((s, idx) => {
      const x = timeToX(s.tMs).toFixed(1);
      const sy = elevToY(s.sunEl).toFixed(1);
      const ey = elevToY(s.earthEl).toFixed(1);
      const sty = elevToY(s.sunTerr).toFixed(1);

      if (idx === 0) {
        sp += `M ${x} ${sy}`;
        ep += `M ${x} ${ey}`;
        stp += `M ${x} ${sty}`;
      } else {
        sp += ` L ${x} ${sy}`;
        ep += ` L ${x} ${ey}`;
        stp += ` L ${x} ${sty}`;
      }
    });

    return { sunPath: sp, earthPath: ep, sunTerrPath: stp };
  }, [samples, timeToX, elevToY]);

  // Mouse / Scrub Interaction
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const clampedX = Math.max(margin.left, Math.min(containerWidth - margin.right, mouseX));
    const targetTime = xToTime(clampedX);

    if (isDraggingRef.current) {
      setTime(targetTime);
    }

    // Hover tooltip calculations
    if (site) {
      const ephem = ephemerisEngine.sample(
        { latDeg: site.latDeg, lonDeg: site.lonDeg, elevationM: site.elevationM },
        targetTime
      );
      const sunTerr = getHorizonThresholdAtAzimuth(horizon, ephem.sun.azimuthDeg);
      const earthTerr = getHorizonThresholdAtAzimuth(horizon, ephem.earth.azimuthDeg);

      setHoverData({
        x: clampedX,
        time: targetTime,
        sunEl: ephem.sun.elevationDeg,
        sunTerr,
        earthEl: ephem.earth.elevationDeg,
        earthTerr
      });
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handlePointerLeave = () => {
    isDraggingRef.current = false;
    setHoverData(null);
  };

  // Time Axis Ticks
  const timeTicks = useMemo(() => {
    const ticks = [];
    const count = Math.max(4, Math.floor(plotWidth / 120));
    for (let i = 0; i <= count; i++) {
      const tMs = windowStartMs + (i / count) * durationMs;
      const d = new Date(tMs);
      const x = timeToX(tMs);
      const label =
        zoom === '24h'
          ? d.toISOString().slice(11, 16) + ' UTC'
          : `${d.toISOString().slice(5, 10)} ${d.toISOString().slice(11, 16)}`;
      ticks.push({ x, label });
    }
    return ticks;
  }, [windowStartMs, durationMs, plotWidth, timeToX, zoom]);

  const nowX = timeToX(currentTime.getTime());
  const zeroElevY = elevToY(0);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col w-full rounded-lg border border-space-800 bg-space-950/80 p-2.5 font-mono select-none"
    >
      {/* Header Controls: Presets, Now Button, Legend */}
      <div className="flex items-center justify-between pb-2 border-b border-space-800 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-300 font-sans pr-1">Elevation Timeline</span>
          <div className="flex rounded border border-space-700 bg-space-900 p-0.5">
            <button
              onClick={() => handleZoomChange('24h')}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                zoom === '24h' ? 'bg-space-700 text-sun-amber font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => handleZoomChange('7d')}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                zoom === '7d' ? 'bg-space-700 text-sun-amber font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => handleZoomChange('29.5d')}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                zoom === '29.5d' ? 'bg-space-700 text-sun-amber font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              29.5d Synodic
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCenterOnNow}
            title="Center timeline on current time"
            className="text-[10px] py-0.5 h-6"
          >
            Center on Now
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 bg-sun-amber rounded-sm" />
            <span className="text-slate-300">Sun Elev</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 bg-earth-blue rounded-sm" />
            <span className="text-slate-300">Earth Elev</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-3 border-b-2 border-dashed border-indigo-400" />
            <span className="text-slate-400">Terrain</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300">DTE / Sun Band</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full pt-1">
        <svg
          width={containerWidth}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="cursor-crosshair overflow-visible touch-none"
        >
          {/* Plot Background */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="#080C16"
            stroke="#1E2942"
            strokeWidth="1"
          />

          {/* Elevation Grid Lines */}
          <line
            x1={margin.left}
            y1={zeroElevY}
            x2={margin.left + plotWidth}
            y2={zeroElevY}
            stroke="#38BDF8"
            strokeOpacity="0.3"
            strokeDasharray="3,3"
            strokeWidth="1"
          />
          <text
            x={margin.left - 5}
            y={zeroElevY + 3}
            textAnchor="end"
            className="fill-sky-400/80 font-mono text-[9px]"
          >
            0°
          </text>

          {/* Min and Max Elev Labels */}
          <text
            x={margin.left - 5}
            y={margin.top + 10}
            textAnchor="end"
            className="fill-slate-500 font-mono text-[9px]"
          >
            {maxElev}°
          </text>
          <text
            x={margin.left - 5}
            y={margin.top + plotHeight - 16}
            textAnchor="end"
            className="fill-slate-500 font-mono text-[9px]"
          >
            {minElev}°
          </text>

          {/* Time Vertical Grid Lines */}
          {timeTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={margin.top}
                x2={tick.x}
                y2={margin.top + plotHeight}
                stroke="#1E2942"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={margin.top + plotHeight + 14}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[9px]"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Operational Bands at bottom of plot: Sunlit & DTE */}
          {samples.length > 1 && (
            <g>
              {samples.slice(0, -1).map((s, idx) => {
                const nextS = samples[idx + 1];
                const x1 = timeToX(s.tMs);
                const x2 = timeToX(nextS.tMs);
                const w = Math.max(1, x2 - x1);
                const bandY = margin.top + plotHeight - 12;

                return (
                  <g key={idx}>
                    {/* Solar Band */}
                    <rect
                      x={x1}
                      y={bandY}
                      width={w}
                      height={5}
                      fill={s.isSunlit ? '#F59E0B' : '#1E293B'}
                      opacity={s.isSunlit ? 0.9 : 0.4}
                    />
                    {/* DTE Band */}
                    <rect
                      x={x1}
                      y={bandY + 6}
                      width={w}
                      height={5}
                      fill={s.isDte ? '#10B981' : '#991B1B'}
                      opacity={s.isDte ? 0.9 : 0.4}
                    />
                  </g>
                );
              })}
              {/* Band Labels */}
              <text
                x={margin.left - 5}
                y={margin.top + plotHeight - 8}
                textAnchor="end"
                className="fill-amber-500 font-mono text-[7px]"
              >
                SUN
              </text>
              <text
                x={margin.left - 5}
                y={margin.top + plotHeight - 2}
                textAnchor="end"
                className="fill-emerald-500 font-mono text-[7px]"
              >
                DTE
              </text>
            </g>
          )}

          {/* Terrain Profile along Solar Azimuth (Dashed Purple) */}
          {sunTerrPath && (
            <path
              d={sunTerrPath}
              fill="none"
              stroke="#818CF8"
              strokeDasharray="2,2"
              strokeWidth="1"
              opacity="0.75"
            />
          )}

          {/* Earth Elevation Curve */}
          {earthPath && (
            <path
              d={earthPath}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              opacity="0.9"
            />
          )}

          {/* Sun Elevation Curve */}
          {sunPath && (
            <path
              d={sunPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              opacity="0.95"
            />
          )}

          {/* Hover Indicator Crosshair */}
          {hoverData && (
            <g>
              <line
                x1={hoverData.x}
                y1={margin.top}
                x2={hoverData.x}
                y2={margin.top + plotHeight}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.8"
              />
            </g>
          )}

          {/* Current "Now" Cursor */}
          {nowX >= margin.left && nowX <= margin.left + plotWidth && (
            <g className="transition-all duration-75">
              <line
                x1={nowX}
                y1={margin.top - 4}
                x2={nowX}
                y2={margin.top + plotHeight + 4}
                stroke="#EF4444"
                strokeWidth="2"
              />
              <polygon
                points={`${nowX - 5},${margin.top - 6} ${nowX + 5},${margin.top - 6} ${nowX},${margin.top}`}
                fill="#EF4444"
              />
              <text
                x={nowX}
                y={margin.top - 8}
                textAnchor="middle"
                className="fill-rose-400 font-mono text-[8px] font-bold tracking-wider"
              >
                NOW
              </text>
            </g>
          )}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoverData && (
          <div
            className="pointer-events-none absolute z-20 rounded border border-space-700 bg-space-900/95 px-2.5 py-1.5 shadow-lg text-[10px] text-slate-200"
            style={{
              left: Math.min(containerWidth - 180, Math.max(margin.left, hoverData.x - 70)),
              top: 24
            }}
          >
            <div className="font-bold text-slate-100 border-b border-space-800 pb-0.5">
              {hoverData.time.toISOString().replace('T', ' ').slice(0, 19)} UTC
            </div>
            <div className="pt-1 flex items-center justify-between gap-3">
              <span className="text-amber-400">Sun Elev:</span>
              <span className="font-semibold">{hoverData.sunEl.toFixed(2)}° (Terr: {hoverData.sunTerr.toFixed(2)}°)</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sky-400">Earth Elev:</span>
              <span className="font-semibold">{hoverData.earthEl.toFixed(2)}° (Terr: {hoverData.earthTerr.toFixed(2)}°)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
