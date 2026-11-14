import React, { useMemo, useCallback } from 'react';
import type { HorizonProfile, EphemerisSample } from '../../contracts';

export interface SkyDialProps {
  horizon: HorizonProfile | null;
  ephemeris: EphemerisSample;
  sunTerrainElev: number;
  earthTerrainElev: number;
  size?: number;
}

export function SkyDial({
  horizon,
  ephemeris,
  sunTerrainElev,
  earthTerrainElev,
  size = 280
}: SkyDialProps): React.JSX.Element {
  const cx = size / 2;
  const cy = size / 2;
  const padding = 24;
  const maxR = cx - padding;
  const minElev = -10; // degrees
  const maxElev = 90; // degrees

  // Map elevation (-10 to 90) to radius (maxR to 0)
  const elevToRadius = useCallback(
    (elev: number): number => {
      const clampedElev = Math.max(minElev, Math.min(maxElev, elev));
      return maxR * ((maxElev - clampedElev) / (maxElev - minElev));
    },
    [maxR, minElev, maxElev]
  );

  // Map azimuth (0=N, 90=E, 180=S, 270=W) & elevation to (x, y)
  const polarToXY = useCallback(
    (azimuthDeg: number, elevDeg: number): [number, number] => {
      const r = elevToRadius(elevDeg);
      const rad = ((azimuthDeg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    },
    [cx, cy, elevToRadius]
  );

  // Geometric 0° horizon radius
  const zeroR = elevToRadius(0);

  // Compute terrain silhouette polygon
  const terrainPath = useMemo(() => {
    if (!horizon || !horizon.elevDeg || horizon.elevDeg.length < 360) {
      return null;
    }
    const points: string[] = [];
    for (let az = 0; az < 360; az++) {
      const elev = horizon.elevDeg[az];
      const [x, y] = polarToXY(az, elev);
      points.push(`${az === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    points.push('Z');
    return points.join(' ');
  }, [horizon, polarToXY]);

  // Sun position
  const sunAz = ephemeris.sun.azimuthDeg;
  const sunEl = ephemeris.sun.elevationDeg;
  const [sunX, sunY] = polarToXY(sunAz, sunEl);
  const isSunUp = sunEl + 0.267 >= sunTerrainElev && sunEl >= -0.267;

  // Earth position
  const earthAz = ephemeris.earth.azimuthDeg;
  const earthEl = ephemeris.earth.elevationDeg;
  const [earthX, earthY] = polarToXY(earthAz, earthEl);
  const isEarthUp = earthEl >= earthTerrainElev && earthEl >= 0;

  return (
    <div className="relative flex flex-col items-center select-none">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          <radialGradient id="skyDialGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1E2942" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#0B0F19" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#05070D" stopOpacity="0.95" />
          </radialGradient>
          <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>

        {/* Sky Background circle */}
        <circle cx={cx} cy={cy} r={maxR} fill="url(#skyDialGlow)" stroke="#1E2942" strokeWidth="1" />

        {/* Elevation Rings: 0°, 30°, 60° */}
        <circle
          cx={cx}
          cy={cy}
          r={elevToRadius(60)}
          fill="none"
          stroke="#1E2942"
          strokeDasharray="2,2"
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={elevToRadius(30)}
          fill="none"
          stroke="#1E2942"
          strokeDasharray="2,2"
          strokeWidth="1"
        />
        {/* Geometric 0° Horizon Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={zeroR}
          fill="none"
          stroke="#38BDF8"
          strokeOpacity="0.25"
          strokeWidth="1.2"
        />

        {/* Cardinal Axis Crosshairs */}
        <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="#1E2942" strokeWidth="1" />
        <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#1E2942" strokeWidth="1" />

        {/* Cardinal Direction Labels */}
        <text
          x={cx}
          y={cy - maxR - 7}
          textAnchor="middle"
          className="fill-slate-400 font-mono text-[10px] font-bold"
        >
          N (0°)
        </text>
        <text
          x={cx + maxR + 8}
          y={cy + 3}
          textAnchor="start"
          className="fill-slate-400 font-mono text-[10px] font-bold"
        >
          E (90°)
        </text>
        <text
          x={cx}
          y={cy + maxR + 14}
          textAnchor="middle"
          className="fill-slate-400 font-mono text-[10px] font-bold"
        >
          S (180°)
        </text>
        <text
          x={cx - maxR - 8}
          y={cy + 3}
          textAnchor="end"
          className="fill-slate-400 font-mono text-[10px] font-bold"
        >
          W (270°)
        </text>

        {/* Elevation Ring Labels */}
        <text
          x={cx + 3}
          y={cy - elevToRadius(30) + 3}
          className="fill-slate-600 font-mono text-[8px]"
        >
          30°
        </text>
        <text
          x={cx + 3}
          y={cy - elevToRadius(60) + 3}
          className="fill-slate-600 font-mono text-[8px]"
        >
          60°
        </text>
        <text
          x={cx + 3}
          y={cy - zeroR + 3}
          className="fill-sky-500/50 font-mono text-[8px]"
        >
          0°
        </text>

        {/* Terrain Horizon Silhouette */}
        {terrainPath ? (
          <path
            d={terrainPath}
            fill="none"
            stroke="#6366F1"
            strokeWidth="1.75"
            strokeOpacity="0.9"
            className="transition-all duration-300"
          />
        ) : (
          /* Fallback smooth horizon ring at 0° */
          <circle
            cx={cx}
            cy={cy}
            r={zeroR}
            fill="none"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        )}

        {/* Direction ray from zenith to bodies */}
        <line
          x1={cx}
          y1={cy}
          x2={sunX}
          y2={sunY}
          stroke={isSunUp ? '#F59E0B' : '#78350F'}
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="2,3"
        />
        <line
          x1={cx}
          y1={cy}
          x2={earthX}
          y2={earthY}
          stroke={isEarthUp ? '#38BDF8' : '#075985'}
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="2,3"
        />

        {/* Earth Marker */}
        <g transform={`translate(${earthX.toFixed(2)}, ${earthY.toFixed(2)})`} className="cursor-pointer">
          {isEarthUp && (
            <circle
              r="7"
              fill="none"
              stroke="#10B981"
              strokeWidth="1"
              strokeOpacity="0.6"
              className="animate-ping"
            />
          )}
          <circle
            r="5"
            fill={isEarthUp ? '#38BDF8' : '#1E2942'}
            stroke={isEarthUp ? '#10B981' : '#EF4444'}
            strokeWidth="1.5"
          />
          <text
            x="8"
            y="3"
            className="fill-sky-300 font-mono text-[9px] font-semibold"
          >
            Earth {earthEl.toFixed(1)}°
          </text>
        </g>

        {/* Sun Marker */}
        <g transform={`translate(${sunX.toFixed(2)}, ${sunY.toFixed(2)})`} className="cursor-pointer">
          {isSunUp && (
            <circle
              r="8"
              fill="#F59E0B"
              opacity="0.3"
              filter="url(#sunGlow)"
            />
          )}
          <circle
            r="5"
            fill={isSunUp ? '#F59E0B' : '#78350F'}
            stroke={isSunUp ? '#FCD34D' : '#451A03'}
            strokeWidth="1.5"
          />
          <text
            x="8"
            y="3"
            className="fill-amber-300 font-mono text-[9px] font-semibold"
          >
            Sun {sunEl.toFixed(1)}°
          </text>
        </g>

        {/* Center Zenith crosshair */}
        <circle cx={cx} cy={cy} r="1.5" fill="#94A3B8" />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-slate-500 font-mono text-[7px]"
        >
          Zenith
        </text>
      </svg>

      {/* Legend below SkyDial */}
      <div className="flex items-center justify-between w-full px-2 pt-2 text-[10px] font-mono text-slate-400 border-t border-space-800">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-sun-amber" />
          <span>Sun: {isSunUp ? 'Visible' : 'Terrain Obscured'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-earth-blue" />
          <span>Earth: {isEarthUp ? 'DTE Line-of-Sight' : 'Blackout'}</span>
        </div>
      </div>
    </div>
  );
}
