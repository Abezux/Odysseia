import React, { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useTimeStore } from '../../store/useTimeStore';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui';

const SPEED_PRESETS = [1, 100, 1000, 10000];

export function TimeControlsBar(): React.JSX.Element {
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

  // Sync internal input text when currentTime changes externally
  useEffect(() => {
    setIsoInput(currentTime.toISOString().slice(0, 16));
  }, [currentTime]);

  // Real-time animation loop when playback is active
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTick = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTick) / 1000;
      lastTick = now;

      // Advance by elapsed real seconds * speed multiplier
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

  // Slider scrub value representing hours relative to the current day
  const scrubValue =
    currentTime.getUTCHours() +
    currentTime.getUTCMinutes() / 60 +
    currentTime.getUTCSeconds() / 3600;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = parseFloat(e.target.value);
    const newDate = new Date(currentTime);
    const totalSec = Math.floor(hours * 3600);
    newDate.setUTCHours(0, 0, totalSec, 0);
    setTime(newDate);
  };

  return (
    <div
      role="region"
      aria-label="Time Controls"
      className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-ink"
    >
      {/* 1. Date & Time Picker */}
      <div className="flex items-center gap-2">
        <label htmlFor="time-iso-picker" className="text-muted text-[11px] uppercase">
          UTC Epoch:
        </label>
        <input
          id="time-iso-picker"
          type="datetime-local"
          value={isoInput}
          onChange={handleIsoChange}
          className="rounded-lg border border-panel-border bg-panel px-2.5 py-1 text-amber focus:border-amber focus:outline-none"
        />
        <Button variant="ghost" size="sm" onClick={resetToNow} title="Reset to current UTC time">
          Now
        </Button>
      </div>

      {/* 2. Step Navigation */}
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" onClick={() => stepTime(-86400)}>
          -1d
        </Button>
        <Button variant="secondary" size="sm" onClick={() => stepTime(-3600)}>
          -1h
        </Button>
        <Button
          variant={isPlaying ? 'primary' : 'secondary'}
          size="sm"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
          className="flex items-center gap-1.5"
        >
          <Icon icon={isPlaying ? Pause : Play} size={16} />
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => stepTime(3600)}>
          +1h
        </Button>
        <Button variant="secondary" size="sm" onClick={() => stepTime(86400)}>
          +1d
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => stepTime(29.53 * 86400)}
          title="Step one synodic lunar day (29.53 days)"
        >
          +29.5d
        </Button>
      </div>

      {/* 3. Playback Speed Selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted">Speed:</span>
        {SPEED_PRESETS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => setPlaybackSpeed(speed)}
            className={`rounded px-1.5 py-0.5 text-[11px] transition-colors ${
              playbackSpeed === speed
                ? 'bg-amber text-amber-text font-bold'
                : 'text-muted hover:text-ink hover:bg-white/5'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* 4. Diurnal Scrubber */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-[10px] text-muted">0h</span>
        <input
          type="range"
          min="0"
          max="24"
          step="0.1"
          value={scrubValue}
          onChange={handleSliderChange}
          aria-label="Daily hour scrub"
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded bg-[#2E2A26] accent-amber"
        />
        <span className="text-[10px] text-muted">24h</span>
      </div>
    </div>
  );
}
