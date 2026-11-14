import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTimeStore } from '../../store/useTimeStore';
import { ephemerisEngine } from '../../lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../lib/metrics/visibility';
import type { Scenario, Site, HorizonProfile } from '../../contracts';

export interface MultiTimelineProps {
  scenarios: Scenario[];
  sites: Record<string, Site>;
  horizons: Record<string, HorizonProfile | null>;
}

type ZoomPreset = '24h' | '7d' | '29.5d';

const ZOOM_DURATIONS: Record<ZoomPreset, number> = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 86400 * 1000,
  '29.5d': 29.53 * 86400 * 1000
};

export function MultiTimeline({
  scenarios,
  sites,
  horizons
}: MultiTimelineProps): React.JSX.Element {
  const { currentTime, setTime } = useTimeStore();
  const [zoom, setZoom] = useState<ZoomPreset>('29.5d');
  const [windowCenter, setWindowCenter] = useState<number>(currentTime.getTime());
  const [hoverData, setHoverData] = useState<{ x: number; time: Date } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const isDraggingRef = useRef<boolean>(false);

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

  const durationMs = ZOOM_DURATIONS[zoom];
  const windowStartMs = windowCenter - durationMs / 2;

  const rowHeaderWidth = 180;
  const margin = { top: 20, right: 20, bottom: 25, left: rowHeaderWidth };
  const plotWidth = Math.max(200, containerWidth - margin.left - margin.right);

  const timeToX = useCallback(
    (tMs: number): number => {
      const fraction = (tMs - windowStartMs) / durationMs;
      return margin.left + Math.max(0, Math.min(1, fraction)) * plotWidth;
    },
    [windowStartMs, durationMs, margin.left, plotWidth]
  );

  const xToTime = useCallback(
    (x: number): Date => {
      const fraction = (x - margin.left) / plotWidth;
      const clampedFraction = Math.max(0, Math.min(1, fraction));
      return new Date(windowStartMs + clampedFraction * durationMs);
    },
    [margin.left, plotWidth, windowStartMs, durationMs]
  );

  // Compute intervals for each scenario across visible window
  const scenarioTracks = useMemo(() => {
    const numSamples = Math.min(160, Math.max(60, Math.floor(plotWidth / 5)));
    return scenarios.map((sc) => {
      const site = sites[sc.siteId];
      const horizon = horizons[sc.siteId] ?? null;
      if (!site) return { scenario: sc, samples: [] };

      const lat = sc.customCoordinates?.latDeg ?? site.latDeg;
      const lon = sc.customCoordinates?.lonDeg ?? site.lonDeg;
      const elev = site.elevationM;

      const samples = [];
      for (let i = 0; i < numSamples; i++) {
        const tMs = windowStartMs + (i / numSamples) * durationMs;
        const t = new Date(tMs);
        const ephem = ephemerisEngine.sample({ latDeg: lat, lonDeg: lon, elevationM: elev }, t);
        const sunTerr = getHorizonThresholdAtAzimuth(horizon, ephem.sun.azimuthDeg);
        const earthTerr = getHorizonThresholdAtAzimuth(horizon, ephem.earth.azimuthDeg);

        const isSunlit = ephem.sun.elevationDeg + 0.267 >= sunTerr && ephem.sun.elevationDeg >= -0.267;
        const isDte = ephem.earth.elevationDeg >= earthTerr && ephem.earth.elevationDeg >= 0;

        samples.push({ tMs, isSunlit, isDte });
      }

      return { scenario: sc, site, samples };
    });
  }, [scenarios, sites, horizons, windowStartMs, durationMs, plotWidth]);

  // Pointer interactions
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
    setHoverData({ x: clampedX, time: targetTime });
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

  const rowHeight = 44;
  const svgHeight = margin.top + scenarios.length * rowHeight + margin.bottom;
  const nowX = timeToX(currentTime.getTime());

  return (
    <div
      ref={containerRef}
      className="flex flex-col space-y-3 rounded-lg border border-space-800 bg-space-950/70 p-3 font-mono text-xs select-none"
    >
      {/* Controls Bar */}
      <div className="flex items-center justify-between border-b border-space-800 pb-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 font-sans">Multi-Scenario Synodic Strip</span>
          <div className="flex rounded border border-space-700 bg-space-900 p-0.5">
            <button
              onClick={() => {
                setZoom('24h');
                setWindowCenter(currentTime.getTime());
              }}
              className={`px-2 py-0.5 text-[10px] rounded ${
                zoom === '24h' ? 'bg-space-700 text-sun-amber font-semibold' : 'text-slate-400'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => {
                setZoom('7d');
                setWindowCenter(currentTime.getTime());
              }}
              className={`px-2 py-0.5 text-[10px] rounded ${
                zoom === '7d' ? 'bg-space-700 text-sun-amber font-semibold' : 'text-slate-400'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => {
                setZoom('29.5d');
                setWindowCenter(currentTime.getTime());
              }}
              className={`px-2 py-0.5 text-[10px] rounded ${
                zoom === '29.5d' ? 'bg-space-700 text-sun-amber font-semibold' : 'text-slate-400'
              }`}
            >
              29.5d Synodic Month
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-sun-amber" />
            <span className="text-slate-300">Sunlit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-comms-green" />
            <span className="text-slate-300">DTE Link</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-rose-900" />
            <span className="text-slate-400">Blackout / Shadow</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full">
        <svg
          width={containerWidth}
          height={svgHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="cursor-crosshair overflow-visible touch-none"
        >
          {/* Vertical Grid Lines */}
          {timeTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={margin.top}
                x2={tick.x}
                y2={svgHeight - margin.bottom}
                stroke="#1E2942"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={svgHeight - margin.bottom + 14}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[9px]"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Scenario Rows */}
          {scenarioTracks.map((st, rowIdx) => {
            const y = margin.top + rowIdx * rowHeight;
            const sc = st.scenario;
            const site = st.site;

            return (
              <g key={sc.id}>
                {/* Row Background */}
                <rect
                  x={0}
                  y={y}
                  width={containerWidth}
                  height={rowHeight - 4}
                  fill={rowIdx % 2 === 0 ? '#0B0F19' : '#080C16'}
                  rx="4"
                />

                {/* Left Label */}
                <circle
                  cx={12}
                  cy={y + 14}
                  r={5}
                  fill={sc.themeColor}
                />
                <text
                  x={24}
                  y={y + 16}
                  className="fill-slate-100 font-mono text-[11px] font-bold"
                >
                  {sc.label.length > 18 ? sc.label.slice(0, 16) + '...' : sc.label}
                </text>
                <text
                  x={24}
                  y={y + 30}
                  className="fill-slate-400 font-mono text-[9px]"
                >
                  {site?.name ?? sc.siteId}
                </text>

                {/* Sub-Tracks: Sun (top) & Comms (bottom) */}
                {st.samples.length > 1 && (
                  <g>
                    {st.samples.slice(0, -1).map((s, idx) => {
                      const nextS = st.samples[idx + 1];
                      const x1 = timeToX(s.tMs);
                      const x2 = timeToX(nextS.tMs);
                      const w = Math.max(1, x2 - x1);

                      return (
                        <g key={idx}>
                          {/* Solar band */}
                          <rect
                            x={x1}
                            y={y + 6}
                            width={w}
                            height={12}
                            fill={s.isSunlit ? '#F59E0B' : '#1E293B'}
                            opacity={s.isSunlit ? 0.95 : 0.3}
                          />
                          {/* DTE band */}
                          <rect
                            x={x1}
                            y={y + 20}
                            width={w}
                            height={12}
                            fill={s.isDte ? '#10B981' : '#881337'}
                            opacity={s.isDte ? 0.95 : 0.3}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}

          {/* Hover Crosshair */}
          {hoverData && (
            <line
              x1={hoverData.x}
              y1={margin.top}
              x2={hoverData.x}
              y2={svgHeight - margin.bottom}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.8"
            />
          )}

          {/* Draggable "NOW" cursor */}
          {nowX >= margin.left && nowX <= margin.left + plotWidth && (
            <g>
              <line
                x1={nowX}
                y1={margin.top - 4}
                x2={nowX}
                y2={svgHeight - margin.bottom + 4}
                stroke="#EF4444"
                strokeWidth="2"
              />
              <polygon
                points={`${nowX - 4},${margin.top - 6} ${nowX + 4},${margin.top - 6} ${nowX},${margin.top}`}
                fill="#EF4444"
              />
              <text
                x={nowX}
                y={margin.top - 8}
                textAnchor="middle"
                className="fill-rose-400 font-mono text-[8px] font-bold"
              >
                NOW
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoverData && (
          <div
            className="pointer-events-none absolute z-20 rounded border border-space-700 bg-space-950/95 px-2.5 py-1 text-[10px] text-slate-200 shadow-lg"
            style={{
              left: Math.min(containerWidth - 170, Math.max(margin.left, hoverData.x - 60)),
              top: 0
            }}
          >
            {hoverData.time.toISOString().replace('T', ' ').slice(0, 19)} UTC
          </div>
        )}
      </div>
    </div>
  );
}
