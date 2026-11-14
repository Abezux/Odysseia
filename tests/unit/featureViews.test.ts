import { describe, it, expect } from 'vitest';
import { ephemerisEngine } from '../../src/lib/ephemeris';
import { getHorizonThresholdAtAzimuth } from '../../src/lib/metrics/visibility';
import type { HorizonProfile } from '../../src/contracts';

describe('Wave 3 Feature Views Unit Tests', () => {
  const dummyHorizon: HorizonProfile = {
    siteId: 'test-site',
    azStepDeg: 1,
    elevDeg: new Array(360).fill(2.5),
    searchRadiusKm: 50,
    demSource: 'TEST_DEM',
    source: 'mock'
  };

  it('correctly maps polar dial coordinates for Zenith and Cardinal Directions', () => {
    const cx = 140;
    const cy = 140;
    const padding = 24;
    const maxR = cx - padding; // 116
    const minElev = -10;
    const maxElev = 90;

    const elevToRadius = (elev: number) => {
      const clamped = Math.max(minElev, Math.min(maxElev, elev));
      return maxR * ((maxElev - clamped) / (maxElev - minElev));
    };

    const polarToXY = (azimuthDeg: number, elevDeg: number): [number, number] => {
      const r = elevToRadius(elevDeg);
      const rad = ((azimuthDeg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };

    // Zenith (90° elevation) should map to center (cx, cy)
    const [zx, zy] = polarToXY(0, 90);
    expect(zx).toBeCloseTo(cx, 4);
    expect(zy).toBeCloseTo(cy, 4);

    // North (azimuth 0°, elevation 0°) should be straight UP from center
    const [nx, ny] = polarToXY(0, 0);
    expect(nx).toBeCloseTo(cx, 4);
    expect(ny).toBeLessThan(cy); // Up is -Y in SVG

    // East (azimuth 90°, elevation 0°) should be straight RIGHT from center
    const [ex, ey] = polarToXY(90, 0);
    expect(ex).toBeGreaterThan(cx); // Right is +X
    expect(ey).toBeCloseTo(cy, 4);

    // South (azimuth 180°, elevation 0°) should be straight DOWN from center
    const [sx, sy] = polarToXY(180, 0);
    expect(sx).toBeCloseTo(cx, 4);
    expect(sy).toBeGreaterThan(cy); // Down is +Y

    // West (azimuth 270°, elevation 0°) should be straight LEFT from center
    const [wx, wy] = polarToXY(270, 0);
    expect(wx).toBeLessThan(cx); // Left is -X
    expect(wy).toBeCloseTo(cy, 4);
  });

  it('correctly identifies terrain horizon thresholds and visibility', () => {
    expect(getHorizonThresholdAtAzimuth(dummyHorizon, 45)).toBe(2.5);
    expect(getHorizonThresholdAtAzimuth(null, 45)).toBe(0); // smooth horizon fallback
  });

  it('evaluates timeline synodic period durations', () => {
    const synodicMs = 29.53 * 86400 * 1000;
    const start = new Date('2026-11-14T12:00:00Z');
    const end = new Date(start.getTime() + synodicMs);

    expect(end.getTime() - start.getTime()).toBe(synodicMs);

    // Verify ephemeris sampling works at both ends
    const site = { latDeg: -89.9, lonDeg: 0, elevationM: 1000 };
    const sampleStart = ephemerisEngine.sample(site, start);
    const sampleEnd = ephemerisEngine.sample(site, end);

    expect(sampleStart.sun.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(sampleEnd.sun.azimuthDeg).toBeGreaterThanOrEqual(0);
  });
});
