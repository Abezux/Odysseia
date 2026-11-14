import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTimeStore } from '../../store/useTimeStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { dataProvider } from '../../lib/data';
import { ephemerisEngine } from '../../lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../lib/metrics/visibility';
import type { Site, HorizonProfile } from '../../contracts';

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

  const durationMs = ZOOM_DURATIONS[zoom];
  const windowStartMs = windowCenter - durationMs / 2;

  // Layout Dimensions
  const height = 110;
  const margin = { top: 12, right: 18, bottom: 28, left: 36 };
  const plotWidth = Math.max(100, containerWidth - margin.left - margin.right);
  const plotHeight = Math.max(40, height - margin.top - margin.bottom);

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
    const numSamples = Math.min(140, Math.max(50, Math.floor(plotWidth / 6)));
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
    if (samples.length === 0) return { minElev: -4, maxElev: 12 };
    let min = -3;
    let max = 8;
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
      return margin.top + (1 - Math.max(0, Math.min(1, fraction))) * (plotHeight - 10);
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
      const ySun = elevToY(s.sunEl).toFixed(1);
      const yEarth = elevToY(s.earthEl).toFixed(1);
      const ySunTerr = elevToY(s.sunTerr).toFixed(1);

      if (idx === 0) {
        sp = `M ${x} ${ySun}`;
        ep = `M ${x} ${yEarth}`;
        stp = `M ${x} ${ySunTerr}`;
      } else {
        sp += ` L ${x} ${ySun}`;
        ep += ` L ${x} ${yEarth}`;
        stp += ` L ${x} ${ySunTerr}`;
      }
    });

    return { sunPath: sp, earthPath: ep, sunTerrPath: stp };
  }, [samples, timeToX, elevToY]);

  // Operational Bands
  const bands = useMemo(() => {
    if (samples.length < 2) return [];
    const res: Array<{ xStart: number; xEnd: number; isSunlit: boolean; isDte: boolean }> = [];

    let currentStart = samples[0].tMs;
    let currentSunlit = samples[0].isSunlit;
    let currentDte = samples[0].isDte;

    for (let i = 1; i < samples.length; i++) {
      const s = samples[i];
      if (s.isSunlit !== currentSunlit || s.isDte !== currentDte) {
        res.push({
          xStart: timeToX(currentStart),
          xEnd: timeToX(s.tMs),
          isSunlit: currentSunlit,
          isDte: currentDte
        });
        currentStart = s.tMs;
        currentSunlit = s.isSunlit;
        currentDte = s.isDte;
      }
    }

    res.push({
      xStart: timeToX(currentStart),
      xEnd: timeToX(samples[samples.length - 1].tMs),
      isSunlit: currentSunlit,
      isDte: currentDte
    });

    return res;
  }, [samples, timeToX]);

  // Drag interaction
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setTime(xToTime(x));
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (isDraggingRef.current) {
      setTime(xToTime(x));
    }

    // Update hover data
    if (x >= margin.left && x <= margin.left + plotWidth && samples.length > 0) {
      const t = xToTime(x);
      const nearest = samples.reduce((prev, curr) =>
        Math.abs(curr.tMs - t.getTime()) < Math.abs(prev.tMs - t.getTime()) ? curr : prev
      );

      setHoverData({
        x,
        time: t,
        sunEl: nearest.sunEl,
        sunTerr: nearest.sunTerr,
        earthEl: nearest.earthEl,
        earthTerr: nearest.earthTerr
      });
    } else {
      setHoverData(null);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const playheadX = timeToX(currentTime.getTime());
  const zeroElevY = elevToY(0);

  return (
    <div ref={containerRef} className="relative w-full flex flex-col select-none">
      {/* Legend & Controls Row */}
      <div className="flex items-center justify-between pb-1 text-[10px] font-mono text-muted">
        {/* Zoom selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted/80">WINDOW:</span>
          {(['24h', '7d', '29.5d'] as ZoomPreset[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => {
                setZoom(z);
                setWindowCenter(currentTime.getTime());
              }}
              className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                zoom === z
                  ? 'bg-amber text-amber-text font-bold'
                  : 'bg-panel border border-panel-border text-muted hover:text-ink'
              }`}
            >
              {z}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-amber" />
            <span>Sun</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-emerald" />
            <span>Earth</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-3 border-b-2 border-dashed border-ink/40" />
            <span>Horizon</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber/30" />
            <span>Lit Band</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas with Chart Tokens */}
      <div className="relative w-full">
        <svg
          width={containerWidth}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            isDraggingRef.current = false;
            setHoverData(null);
          }}
          className="cursor-crosshair overflow-visible touch-none"
        >
          {/* Plot Background (Industrial Dark panel) */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="#12110F"
            stroke="#2E2A26"
            strokeWidth="1"
            rx="4"
          />

          {/* Zero Horizon Reference Line */}
          <line
            x1={margin.left}
            y1={zeroElevY}
            x2={margin.left + plotWidth}
            y2={zeroElevY}
            stroke="rgba(244, 239, 232, 0.25)"
            strokeDasharray="3,3"
            strokeWidth="1"
          />
          <text
            x={margin.left - 6}
            y={zeroElevY + 3}
            fill="#8A847B"
            fontSize="9"
            fontFamily="JetBrains Mono"
            textAnchor="end"
          >
            0°
          </text>

          {/* Operational Bands at Bottom of Chart */}
          {bands.map((b, idx) => {
            const bandW = Math.max(1, b.xEnd - b.xStart);
            const bandY = margin.top + plotHeight - 12;
            return (
              <g key={idx}>
                {/* Sunlight bar */}
                <rect
                  x={b.xStart}
                  y={bandY}
                  width={bandW}
                  height={5}
                  fill={b.isSunlit ? '#F5A524' : 'rgba(244, 239, 232, 0.08)'}
                />
                {/* Comms bar */}
                <rect
                  x={b.xStart}
                  y={bandY + 6}
                  width={bandW}
                  height={5}
                  fill={b.isDte ? '#10B981' : 'rgba(239, 68, 68, 0.25)'}
                />
              </g>
            );
          })}

          {/* Terrain Elevation Silhouette Path */}
          {sunTerrPath && (
            <path
              d={sunTerrPath}
              fill="none"
              stroke="rgba(244, 239, 232, 0.4)"
              strokeDasharray="4,3"
              strokeWidth="1.2"
            />
          )}

          {/* Sun Elevation Line (Amber) */}
          {sunPath && <path d={sunPath} fill="none" stroke="#F5A524" strokeWidth="2" />}

          {/* Earth Elevation Line (Emerald) */}
          {earthPath && <path d={earthPath} fill="none" stroke="#10B981" strokeWidth="1.8" />}

          {/* Scrubbable Playhead Needle (Amber) */}
          {playheadX >= margin.left && playheadX <= margin.left + plotWidth && (
            <g className="pointer-events-none">
              <line
                x1={playheadX}
                y1={margin.top - 2}
                x2={playheadX}
                y2={margin.top + plotHeight + 4}
                stroke="#F5A524"
                strokeWidth="2"
              />
              <circle cx={playheadX} cy={margin.top} r="4" fill="#F5A524" />
            </g>
          )}

          {/* Hover Inspector Crosshair */}
          {hoverData && (
            <line
              x1={hoverData.x}
              y1={margin.top}
              x2={hoverData.x}
              y2={margin.top + plotHeight}
              stroke="rgba(244, 239, 232, 0.4)"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoverData && (
          <div
            className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 z-40 rounded-xl glass-panel px-3 py-1.5 font-mono text-[10px] text-ink shadow-2xl space-y-0.5"
            style={{ left: hoverData.x }}
          >
            <div className="font-bold text-amber">
              {hoverData.time.toISOString().replace('T', ' ').slice(0, 16)} UTC
            </div>
            <div>
              Sun: <span className="text-amber">+{hoverData.sunEl.toFixed(1)}°</span> (Terr: {hoverData.sunTerr.toFixed(1)}°)
            </div>
            <div>
              Earth: <span className="text-emerald">+{hoverData.earthEl.toFixed(1)}°</span> (Terr: {hoverData.earthTerr.toFixed(1)}°)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default TimelineStripView;
