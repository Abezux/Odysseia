import type { SiteLocation, HorizonProfile, TimelineWindow } from '../../contracts';
import { ephemerisEngine } from '../ephemeris';
import { isSunVisible, isEarthVisible } from './visibility';

export interface SynodicWindowAnalysis {
  timeToNextSunsetHours: number | null;
  timeToNextSunriseHours: number | null;
  timeToNextEarthsetHours: number | null;
  timeToNextEarthriseHours: number | null;
  longestSunlitStretchHours: number;
  longestDarkStretchHours: number;
  illuminationFraction: number;
  dteAvailabilityFraction: number;
  longestDteBlackoutHours: number;
  timelineWindows: TimelineWindow[];
}

/**
 * Uses bisection root-finding to pinpoint the exact moment of a visibility state transition.
 */
function findTransitionRoot(
  site: SiteLocation,
  horizon: HorizonProfile | null,
  tA: number,
  tB: number,
  isSun: boolean,
  toleranceSec = 30
): number {
  let low = tA;
  let high = tB;
  const initialVis = isSun
    ? isSunVisible(
        ephemerisEngine.sample(site, new Date(low)).sun.azimuthDeg,
        ephemerisEngine.sample(site, new Date(low)).sun.elevationDeg,
        horizon
      )
    : isEarthVisible(
        ephemerisEngine.sample(site, new Date(low)).earth.azimuthDeg,
        ephemerisEngine.sample(site, new Date(low)).earth.elevationDeg,
        horizon
      );

  while (high - low > toleranceSec * 1000) {
    const mid = Math.floor((low + high) / 2);
    const sample = ephemerisEngine.sample(site, new Date(mid));
    const midVis = isSun
      ? isSunVisible(sample.sun.azimuthDeg, sample.sun.elevationDeg, horizon)
      : isEarthVisible(sample.earth.azimuthDeg, sample.earth.elevationDeg, horizon);

    if (midVis === initialVis) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

/**
 * Computes event countdowns, illumination fraction, DTE communication windows,
 * and continuous stretch metrics across a synodic lunar day (default 29.53 days).
 */
export function analyzeSynodicWindow(
  site: SiteLocation,
  horizon: HorizonProfile | null,
  evalTime: Date,
  windowDays = 29.53
): SynodicWindowAnalysis {
  const windowMs = windowDays * 24 * 3600 * 1000;
  const startMs = evalTime.getTime();
  const endMs = startMs + windowMs;

  // Evaluation sampling step: 1 hour intervals provide reliable bracketing
  const stepMs = 3600 * 1000;
  const totalSteps = Math.ceil(windowMs / stepMs);

  const initialSample = ephemerisEngine.sample(site, evalTime);
  const initialSunVis = isSunVisible(
    initialSample.sun.azimuthDeg,
    initialSample.sun.elevationDeg,
    horizon
  );
  const initialEarthVis = isEarthVisible(
    initialSample.earth.azimuthDeg,
    initialSample.earth.elevationDeg,
    horizon
  );

  let timeToNextSunsetHours: number | null = null;
  let timeToNextSunriseHours: number | null = null;
  let timeToNextEarthsetHours: number | null = null;
  let timeToNextEarthriseHours: number | null = null;

  // Track state transitions across the window
  const sunIntervals: { start: number; end: number; visible: boolean }[] = [];
  const earthIntervals: { start: number; end: number; visible: boolean }[] = [];

  let curSunStart = startMs;
  let curSunVis = initialSunVis;

  let curEarthStart = startMs;
  let curEarthVis = initialEarthVis;

  let prevT = startMs;

  for (let i = 1; i <= totalSteps; i++) {
    const curT = Math.min(endMs, startMs + i * stepMs);
    const sample = ephemerisEngine.sample(site, new Date(curT));

    const sVis = isSunVisible(sample.sun.azimuthDeg, sample.sun.elevationDeg, horizon);
    const eVis = isEarthVisible(sample.earth.azimuthDeg, sample.earth.elevationDeg, horizon);

    // Sun transition
    if (sVis !== curSunVis) {
      const transitionMs = findTransitionRoot(
        site,
        horizon,
        prevT,
        curT,
        true
      );
      sunIntervals.push({ start: curSunStart, end: transitionMs, visible: curSunVis });

      if (curSunVis && timeToNextSunsetHours === null) {
        timeToNextSunsetHours = (transitionMs - startMs) / (3600 * 1000);
      } else if (!curSunVis && timeToNextSunriseHours === null) {
        timeToNextSunriseHours = (transitionMs - startMs) / (3600 * 1000);
      }

      curSunStart = transitionMs;
      curSunVis = sVis;
    }

    // Earth transition
    if (eVis !== curEarthVis) {
      const transitionMs = findTransitionRoot(
        site,
        horizon,
        prevT,
        curT,
        false
      );
      earthIntervals.push({ start: curEarthStart, end: transitionMs, visible: curEarthVis });

      if (curEarthVis && timeToNextEarthsetHours === null) {
        timeToNextEarthsetHours = (transitionMs - startMs) / (3600 * 1000);
      } else if (!curEarthVis && timeToNextEarthriseHours === null) {
        timeToNextEarthriseHours = (transitionMs - startMs) / (3600 * 1000);
      }

      curEarthStart = transitionMs;
      curEarthVis = eVis;
    }

    prevT = curT;
  }

  // Close trailing intervals
  sunIntervals.push({ start: curSunStart, end: endMs, visible: curSunVis });
  earthIntervals.push({ start: curEarthStart, end: endMs, visible: curEarthVis });

  // Calculate cumulative durations and longest stretches
  let totalSunlitMs = 0;
  let longestSunlitMs = 0;
  let longestDarkMs = 0;

  for (const interval of sunIntervals) {
    const dur = interval.end - interval.start;
    if (interval.visible) {
      totalSunlitMs += dur;
      if (dur > longestSunlitMs) longestSunlitMs = dur;
    } else {
      if (dur > longestDarkMs) longestDarkMs = dur;
    }
  }

  let totalEarthMs = 0;
  let longestEarthBlackoutMs = 0;

  for (const interval of earthIntervals) {
    const dur = interval.end - interval.start;
    if (interval.visible) {
      totalEarthMs += dur;
    } else {
      if (dur > longestEarthBlackoutMs) longestEarthBlackoutMs = dur;
    }
  }

  const illuminationFraction = Math.max(0, Math.min(1, totalSunlitMs / windowMs));
  const dteAvailabilityFraction = Math.max(0, Math.min(1, totalEarthMs / windowMs));

  // Build TimelineWindow array
  const timelineWindows: TimelineWindow[] = [];

  for (const s of sunIntervals) {
    timelineWindows.push({
      startIso: new Date(s.start).toISOString(),
      endIso: new Date(s.end).toISOString(),
      durationHours: Number(((s.end - s.start) / (3600 * 1000)).toFixed(2)),
      type: s.visible ? 'sunlit' : 'dark'
    });
  }

  for (const e of earthIntervals) {
    timelineWindows.push({
      startIso: new Date(e.start).toISOString(),
      endIso: new Date(e.end).toISOString(),
      durationHours: Number(((e.end - e.start) / (3600 * 1000)).toFixed(2)),
      type: e.visible ? 'dte_connected' : 'dte_blackout'
    });
  }

  return {
    timeToNextSunsetHours:
      timeToNextSunsetHours !== null ? Number(timeToNextSunsetHours.toFixed(2)) : null,
    timeToNextSunriseHours:
      timeToNextSunriseHours !== null ? Number(timeToNextSunriseHours.toFixed(2)) : null,
    timeToNextEarthsetHours:
      timeToNextEarthsetHours !== null ? Number(timeToNextEarthsetHours.toFixed(2)) : null,
    timeToNextEarthriseHours:
      timeToNextEarthriseHours !== null ? Number(timeToNextEarthriseHours.toFixed(2)) : null,
    longestSunlitStretchHours: Number((longestSunlitMs / (3600 * 1000)).toFixed(2)),
    longestDarkStretchHours: Number((longestDarkMs / (3600 * 1000)).toFixed(2)),
    illuminationFraction: Number(illuminationFraction.toFixed(3)),
    dteAvailabilityFraction: Number(dteAvailabilityFraction.toFixed(3)),
    longestDteBlackoutHours: Number((longestEarthBlackoutMs / (3600 * 1000)).toFixed(2)),
    timelineWindows
  };
}
