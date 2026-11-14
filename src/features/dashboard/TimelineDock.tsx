import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useTimeStore } from '../../store/useTimeStore';
import { TimelineStripView } from '../timeline/TimelineStrip';
import type { MetricsResult } from '../../contracts';
import { Icon } from '../../ui/Icon';

interface TimelineDockProps {
  metrics: MetricsResult | null;
}

const SPEED_OPTIONS = [
  { label: '1x (Real-time)', value: 1 },
  { label: '100x', value: 100 },
  { label: '1,000x (Fast)', value: 1000 },
  { label: '10,000x (Synodic Sweep)', value: 10000 }
];

export function TimelineDock({ metrics }: TimelineDockProps): React.JSX.Element {
  const {
    currentTime,
    playbackSpeed,
    isPlaying,
    setTime,
    stepTime,
    setPlaybackSpeed,
    togglePlay,
    resetToNow
  } = useTimeStore();

  const [isoInput, setIsoInput] = useState(currentTime.toISOString().slice(0, 16));

  // Sync internal input text when currentTime changes
  useEffect(() => {
    setIsoInput(currentTime.toISOString().slice(0, 16));
  }, [currentTime]);

  // Real-time animation loop when playing
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastTick = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTick) / 1000;
      lastTick = now;
      stepTime(deltaSec * playbackSpeed);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, stepTime]);

  const handleIsoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIsoInput(val);
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      setTime(parsed);
    }
  };

  const sunEl = metrics?.currentEphemeris.sun.elevationDeg ?? 0;
  const sunTerr = metrics?.sunTerrainElevationDeg ?? 0;
  const sunClearance = sunEl - sunTerr;

  const earthEl = metrics?.currentEphemeris.earth.elevationDeg ?? 0;
  const earthTerr = metrics?.earthTerrainElevationDeg ?? 0;
  const earthClearance = earthEl - earthTerr;

  return (
    <footer className="w-full shrink-0 p-3 pt-0 select-none z-20">
      <div className="glass-panel rounded-3xl p-3.5 w-full flex flex-col xl:flex-row items-center justify-between gap-4 shadow-2xl">
        {/* Left: Play/Pause, Step Back/Forward, ONE Speed Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 font-sans text-xs font-semibold transition-all ${
              isPlaying
                ? 'bg-amber text-amber-text shadow-sm shadow-amber/20 font-bold'
                : 'border border-panel-border bg-panel text-ink hover:border-amber/50'
            }`}
          >
            <Icon icon={isPlaying ? Pause : Play} size={16} />
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Step buttons */}
          <div className="flex items-center rounded-lg border border-panel-border bg-panel p-0.5">
            <button
              type="button"
              onClick={() => stepTime(-86400)}
              className="rounded px-2 py-1 font-mono text-[11px] text-muted hover:text-ink hover:bg-white/5 transition-colors"
              title="Step -1 day"
            >
              -1d
            </button>
            <button
              type="button"
              onClick={() => stepTime(-3600)}
              className="rounded px-2 py-1 font-mono text-[11px] text-muted hover:text-ink hover:bg-white/5 transition-colors"
              title="Step -1 hour"
            >
              -1h
            </button>
            <button
              type="button"
              onClick={() => stepTime(3600)}
              className="rounded px-2 py-1 font-mono text-[11px] text-muted hover:text-ink hover:bg-white/5 transition-colors"
              title="Step +1 hour"
            >
              +1h
            </button>
            <button
              type="button"
              onClick={() => stepTime(86400)}
              className="rounded px-2 py-1 font-mono text-[11px] text-muted hover:text-ink hover:bg-white/5 transition-colors"
              title="Step +1 day"
            >
              +1d
            </button>
          </div>

          {/* ONE Speed Dropdown */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="rounded-lg border border-panel-border bg-panel px-2.5 py-1.5 font-mono text-xs text-ink transition-colors focus:border-amber focus:outline-none"
            aria-label="Playback speed"
          >
            {SPEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-panel text-ink">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Synodic Strip & Mono Readout of Angles at Playhead */}
        <div className="flex flex-1 flex-col w-full min-w-0 px-2">
          {/* Clearance Angle Mono Readout */}
          <div className="flex items-center justify-between pb-1 font-mono text-[10px] uppercase text-muted">
            <div className="flex items-center gap-3">
              <span>
                SUN CLEARANCE:{' '}
                <span className={sunClearance >= 0 ? 'text-amber font-bold' : 'text-critical font-bold'}>
                  {sunClearance >= 0 ? `+${sunClearance.toFixed(2)}°` : `${sunClearance.toFixed(2)}°`}
                </span>
              </span>
              <span>·</span>
              <span>
                EARTH MARGIN:{' '}
                <span className={earthClearance >= 0 ? 'text-emerald font-bold' : 'text-critical font-bold'}>
                  {earthClearance >= 0 ? `+${earthClearance.toFixed(2)}°` : `${earthClearance.toFixed(2)}°`}
                </span>
              </span>
            </div>
            <span className="text-muted/70">29.53-DAY SYNODIC MONTH</span>
          </div>

          {/* Integrated Multi-track SVG Timeline Strip */}
          <TimelineStripView />
        </div>

        {/* Right: Date Picker, Reset to Epoch, and UTC Timestamp */}
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            <div className="font-mono text-xs font-bold text-ink">
              {currentTime.toISOString().replace('T', ' ').slice(0, 19)} UTC
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="datetime-local"
                value={isoInput}
                onChange={handleIsoChange}
                className="rounded-lg border border-panel-border bg-panel px-2 py-1 font-mono text-[11px] text-amber transition-colors focus:border-amber focus:outline-none"
              />
              <button
                type="button"
                onClick={resetToNow}
                className="flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel px-2.5 py-1 font-mono text-[11px] text-muted hover:text-ink hover:border-amber/50 transition-colors"
                title="Reset simulation to current real-world time"
              >
                <Icon icon={RotateCcw} size={16} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
