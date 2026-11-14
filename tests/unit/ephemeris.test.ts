import { describe, it, expect } from 'vitest';
import { ephemerisEngine } from '../../src/lib/ephemeris';
import type { SiteLocation } from '../../src/contracts';

describe('A2 Ephemeris Engine Unit Tests', () => {
  const testDate = new Date('2026-11-14T12:00:00.000Z');

  it('implements EphemerisEngine sample interface cleanly', () => {
    const site: SiteLocation = { latDeg: -89.9, lonDeg: 0.0, elevationM: 1250 };
    const sample = ephemerisEngine.sample(site, testDate);

    expect(sample).toBeDefined();
    expect(sample.timestampIso).toBe(testDate.toISOString());
    expect(sample.sun.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(sample.sun.azimuthDeg).toBeLessThan(360);
    expect(sample.sun.elevationDeg).toBeGreaterThan(-90);
    expect(sample.sun.elevationDeg).toBeLessThan(90);
    expect(sample.earth.angularDiameterDeg).toBeGreaterThan(1.5);
    expect(sample.earth.angularDiameterDeg).toBeLessThan(2.2);
    expect(sample.sun.angularDiameterDeg).toBeGreaterThan(0.5);
    expect(sample.sun.angularDiameterDeg).toBeLessThan(0.6);
  });

  it('maintains continuous azimuth and elevation at the exact South Pole (-89.9° vs -90.0°)', () => {
    const siteNearPole: SiteLocation = { latDeg: -89.9, lonDeg: 0.0 };
    const siteExactPole: SiteLocation = { latDeg: -90.0, lonDeg: 0.0 };

    const sampleNear = ephemerisEngine.sample(siteNearPole, testDate);
    const sampleExact = ephemerisEngine.sample(siteExactPole, testDate);

    // Azimuth difference must be negligible (< 0.1°)
    const azDiff = Math.abs(sampleNear.sun.azimuthDeg - sampleExact.sun.azimuthDeg);
    expect(azDiff).toBeLessThan(0.1);

    // Elevation difference must be approximately 0.1° (matching latitude step)
    const elDiff = Math.abs(sampleNear.sun.elevationDeg - sampleExact.sun.elevationDeg);
    expect(elDiff).toBeLessThan(0.15);
  });

  it('evaluates Apollo 11 equatorial coordinates correctly', () => {
    const apollo11: SiteLocation = {
      latDeg: 0.67408,
      lonDeg: 23.47297,
      elevationM: -2574
    };
    const sample = ephemerisEngine.sample(apollo11, testDate);

    // From Apollo 11 nearside, Earth is high in the sky (elevation > 50°)
    expect(sample.earth.elevationDeg).toBeGreaterThan(50);
    expect(sample.earth.isAboveSmoothHorizon).toBe(true);
  });

  it('produces sequential range samples with sampleRange()', () => {
    const site: SiteLocation = { latDeg: -89.9, lonDeg: 0.0 };
    const start = new Date('2026-11-14T00:00:00.000Z');
    const end = new Date('2026-11-15T00:00:00.000Z');
    const stepSec = 3600 * 4; // Every 4 hours = 7 samples

    const range = ephemerisEngine.sampleRange(site, start, end, stepSec);
    expect(range.length).toBe(7);
    expect(range[0].timestampIso).toBe(start.toISOString());
    expect(range[range.length - 1].timestampIso).toBe(end.toISOString());
  });

  it('calculates Earth optical libration within astronomical bounds (±10°)', () => {
    const site: SiteLocation = { latDeg: -85.99, lonDeg: 2.94 };
    const sample = ephemerisEngine.sample(site, testDate);

    expect(Math.abs(sample.opticalLibrationDeg.latitude)).toBeLessThan(10);
    expect(Math.abs(sample.opticalLibrationDeg.longitude)).toBeLessThan(10);
  });
});
