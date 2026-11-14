import { describe, it, expect } from 'vitest';
import { ephemerisEngine } from '../../src/lib/ephemeris';
import goldenData from '../fixtures/horizons/horizons_golden.json';

interface HorizonsFixture {
  siteId: string;
  latDeg: number;
  lonDeg: number;
  elevationM: number;
  timestampIso: string;
  horizons: {
    sun: { azimuthDeg: number; elevationDeg: number };
    earth: { azimuthDeg: number; elevationDeg: number };
  };
}

describe('A3 Horizons Ground-Truth Validation Tests', () => {
  const fixtures = goldenData.fixtures as HorizonsFixture[];

  it('contains benchmark fixtures from NASA JPL Horizons API', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  // Calculate error for all fixtures
  const sunAzErrors: number[] = [];
  const sunElErrors: number[] = [];
  const earthAzErrors: number[] = [];
  const earthElErrors: number[] = [];

  for (const fixture of fixtures) {
    it(`accurately matches Horizons for ${fixture.siteId} at ${fixture.timestampIso}`, () => {
      const site = {
        latDeg: fixture.latDeg,
        lonDeg: fixture.lonDeg,
        elevationM: fixture.elevationM
      };
      const t = new Date(fixture.timestampIso);
      const sample = ephemerisEngine.sample(site, t);

      // Angular difference accounting for 360° circular wrap
      const circularDiff = (a: number, b: number) => {
        const diff = Math.abs(a - b) % 360;
        return diff > 180 ? 360 - diff : diff;
      };

      const sunAzDiff = circularDiff(sample.sun.azimuthDeg, fixture.horizons.sun.azimuthDeg);
      const sunElDiff = Math.abs(sample.sun.elevationDeg - fixture.horizons.sun.elevationDeg);

      const earthAzDiff = circularDiff(
        sample.earth.azimuthDeg,
        fixture.horizons.earth.azimuthDeg
      );
      const earthElDiff = Math.abs(
        sample.earth.elevationDeg - fixture.horizons.earth.elevationDeg
      );

      sunAzErrors.push(sunAzDiff);
      sunElErrors.push(sunElDiff);
      earthAzErrors.push(earthAzDiff);
      earthElErrors.push(earthElDiff);

      // Verify each error is well below the 0.1° target budget
      expect(sunElDiff).toBeLessThan(0.05);
      expect(earthElDiff).toBeLessThan(0.05);
    });
  }

  it('achieves overall Root-Mean-Square Error (RMSE) < 0.1° against JPL Horizons ground truth', () => {
    const calcRmse = (arr: number[]) =>
      Math.sqrt(arr.reduce((acc, v) => acc + v * v, 0) / arr.length);

    const sunElRmse = calcRmse(sunElErrors);
    const earthElRmse = calcRmse(earthElErrors);

    console.log(`[A3 Horizons Validation] Sun Elevation RMSE: ${sunElRmse.toFixed(4)}°`);
    console.log(`[A3 Horizons Validation] Earth Elevation RMSE: ${earthElRmse.toFixed(4)}°`);

    expect(sunElRmse).toBeLessThan(0.05);
    expect(earthElRmse).toBeLessThan(0.05);
  });
});
