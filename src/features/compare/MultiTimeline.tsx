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
  const plotWidth = Math.max(100, containerWidth - margin.left - margin.right);
  const rowHeight = 44;
  const svgHeight = margin.top + scenarios.length * rowHeight + margin.bottom;

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

  // Sample data points across window for each scenario
  const scenarioTracks = useMemo(() => {
    const numSamples = Math.min(120, Math.max(40, Math.floor(plotWidth / 6)));
    return scenarios.map((sc) => {
      const site = sites[sc.siteId];
      const horiz = horizons[sc.siteId];
      if (!site) return { scenario: sc, site: null, samples: [] };

      const lat = sc.customCoordinates?.latDeg ?? site.latDeg;
      const lon = sc.customCoordinates?.lonDeg ?? site.lonDeg;
      const elev = site.elevationM;

      const pts = [];
      for (let i = 0; i <= numSamples; i++) {
        const tMs = windowStartMs + (i / numSamples) * durationMs;
        const t = new Date(tMs);
        const ephem = ephemerisEngine.sample({ latDeg: lat, lonDeg: lon, elevationM: elev }, t);

        const sunTerr = getHorizonThresholdAtAzimuth(horiz, ephem.sun.azimuthDeg);
        const earthTerr = getHorizonThresholdAtAzimuth(horiz, ephem.earth.azimuthDeg);

        const isSunlit = ephem.sun.elevationDeg + 0.267 >= sunTerr && ephem.sun.elevationDeg >= -0.267;
        const isDte = ephem.earth.elevationDeg >= earthTerr && ephem.earth.elevationDeg >= 0;

        pts.push({ tMs, isSunlit, isDte });
      }

      return { scenario: sc, site, samples: pts };
    });
  }, [scenarios, sites, horizons, windowStartMs, durationMs, plotWidth]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x >= margin.left) {
      setTime(xToTime(x));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (isDraggingRef.current && x >= margin.left) {
      setTime(xToTime(x));
    }

    if (x >= margin.left && x <= margin.left + plotWidth) {
      setHoverData({ x, time: xToTime(x) });
    } else {
      setHoverData(null);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const playheadX = timeToX(currentTime.getTime());

  // Time Axis Ticks
  const timeTicks = useMemo(() => {
    const ticksCount = 6;
    const ticks = [];
    for (let i = 0; i <= ticksCount; i++) {
      const tMs = windowStartMs + (i / ticksCount) * durationMs;
      const d = new Date(tMs);
      const x = timeToX(tMs);
      const label =
        zoom === '24h'
          ? d.toISOString().slice(11, 16)
          : `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
      ticks.push({ x, label });
    }
    return ticks;
  }, [windowStartMs, durationMs, zoom, timeToX]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col space-y-3 rounded-2xl border border-panel-border bg-panel p-5 font-mono text-xs text-ink select-none shadow-xl"
    >
      {/* Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-panel-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted uppercase font-sans font-semibold">Timeline Window:</span>
          {(['24h', '7d', '29.5d'] as ZoomPreset[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => {
                setZoom(z);
                setWindowCenter(currentTime.getTime());
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                zoom === z
                  ? 'bg-amber text-amber-text font-bold'
                  : 'bg-[#161412] border border-panel-border text-muted hover:text-ink'
              }`}
            >
              {z === '29.5d' ? '29.5d Synodic' : z}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-amber" />
            <span className="text-muted">Solar Illumination</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-emerald" />
            <span className="text-muted">DTE Radio Link</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-critical/40" />
            <span className="text-muted">Blackout / Shadow</span>
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
          onPointerLeave={() => {
            isDraggingRef.current = false;
            setHoverData(null);
          }}
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
                stroke="#2E2A26"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={svgHeight - margin.bottom + 14}
                textAnchor="middle"
                className="fill-muted font-mono text-[10px]"
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
                  fill={rowIdx % 2 === 0 ? '#1A1816' : '#141210'}
                  rx="6"
                />

                {/* Left Label */}
                <circle cx={12} cy={y + 14} r={5} fill={sc.themeColor} />
                <text
                  x={24}
                  y={y + 16}
                  className="fill-ink font-mono text-[11px] font-bold"
                >
                  {sc.label.length > 18 ? sc.label.slice(0, 16) + '...' : sc.label}
                </text>
                <text
                  x={24}
                  y={y + 30}
                  className="fill-muted font-mono text-[9px]"
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
                            fill={s.isSunlit ? '#F5A524' : 'rgba(244, 239, 232, 0.08)'}
                            opacity={s.isSunlit ? 0.95 : 0.4}
                          />
                          {/* DTE band */}
                          <rect
                            x={x1}
                            y={y + 20}
                            width={w}
                            height={12}
                            fill={s.isDte ? '#10B981' : 'rgba(239, 68, 68, 0.25)'}
                            opacity={s.isDte ? 0.95 : 0.4}
                          />
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}

          {/* Scrubbable Playhead (Amber) */}
          {playheadX >= margin.left && playheadX <= margin.left + plotWidth && (
            <g className="pointer-events-none">
              <line
                x1={playheadX}
                y1={margin.top - 4}
                x2={playheadX}
                y2={svgHeight - margin.bottom + 4}
                stroke="#F5A524"
                strokeWidth="2"
              />
              <circle cx={playheadX} cy={margin.top - 4} r="4" fill="#F5A524" />
            </g>
          )}

          {/* Hover Crosshair */}
          {hoverData && (
            <line
              x1={hoverData.x}
              y1={margin.top}
              x2={hoverData.x}
              y2={svgHeight - margin.bottom}
              stroke="rgba(244, 239, 232, 0.4)"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Hover Time Tooltip */}
        {hoverData && (
          <div
            className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 z-40 rounded-xl glass-panel px-2.5 py-1 font-mono text-[10px] text-ink shadow-lg"
            style={{ left: hoverData.x }}
          >
            {hoverData.time.toISOString().replace('T', ' ').slice(0, 16)} UTC
          </div>
        )}
      </div>
    </div>
  );
}
