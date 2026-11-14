import { describe, it, expect } from 'vitest';
import {
  interpolateHorizonElevation,
  isSunVisible,
  isEarthVisible,
  getHorizonThresholdAtAzimuth
} from '../../src/lib/metrics/visibility';
import { analyzeSynodicWindow } from '../../src/lib/metrics/eventSearch';
import type { HorizonProfile, SiteLocation } from '../../src/contracts';

describe('A6a Visibility & Rise/Set Solvers Unit Tests', () => {
  const dummyProfile: HorizonProfile = {
    siteId: 'test-site',
    azStepDeg: 1,
    elevDeg: new Array(360).fill(2.0),
    searchRadiusKm: 50,
    demSource: 'MOCK',
    source: 'mock'
  };
  // Give a slope between bin 359 (4°) and bin 0 (2°)
  dummyProfile.elevDeg[359] = 4.0;
  dummyProfile.elevDeg[0] = 2.0;

  it('interpolates horizon elevation smoothly across circular boundary (359.5°)', () => {
    const elev = interpolateHorizonElevation(dummyProfile.elevDeg, 359.5);
    // Midpoint between 4.0 and 2.0 is 3.0
    expect(elev).toBeCloseTo(3.0, 4);
  });

  it('falls back to 0° smooth horizon when horizon profile is null', () => {
    const threshold = getHorizonThresholdAtAzimuth(null, 180);
    expect(threshold).toBe(0.0);

    // Sun center at -0.1°, upper limb at +0.167° -> visible over 0° smooth horizon
    expect(isSunVisible(180, -0.1, null)).toBe(true);
    // Sun center at -0.5°, upper limb at -0.233° -> obscured
    expect(isSunVisible(180, -0.5, null)).toBe(false);

    // Earth at +0.1° -> visible
    expect(isEarthVisible(180, 0.1, null)).toBe(true);
    // Earth at -0.1° -> obscured
    expect(isEarthVisible(180, -0.1, null)).toBe(false);
  });

  it('correctly accounts for ~0.267° solar upper limb against terrain', () => {
    // Horizon threshold at 90° is 2.0°
    // Sun center at 1.8° -> upper limb is 1.8 + 0.267 = 2.067° >= 2.0° (visible)
    expect(isSunVisible(90, 1.8, dummyProfile)).toBe(true);
    // Sun center at 1.5° -> upper limb is 1.767° < 2.0° (obscured)
    expect(isSunVisible(90, 1.5, dummyProfile)).toBe(false);
  });

  it('analyzes synodic window for Apollo 11 equatorial conditions', () => {
    const apollo11: SiteLocation = { latDeg: 0.67408, lonDeg: 23.47297, elevationM: -2574 };
    const analysis = analyzeSynodicWindow(
      apollo11,
      null, // smooth horizon
      new Date('2026-06-01T00:00:00.000Z'),
      29.53
    );

    // Illumination fraction should be ~50%
    expect(analysis.illuminationFraction).toBeGreaterThan(0.4);
    expect(analysis.illuminationFraction).toBeLessThan(0.6);

    // Earth is always visible from Mare Tranquillitatis nearside (DTE availability = 1.0, 0 blackout)
    expect(analysis.dteAvailabilityFraction).toBe(1.0);
    expect(analysis.longestDteBlackoutHours).toBe(0);
    expect(analysis.timeToNextEarthsetHours).toBeNull();

    // Timeline windows populated
    expect(analysis.timelineWindows.length).toBeGreaterThan(0);
  });
});
