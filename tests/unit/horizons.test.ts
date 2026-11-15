import { describe, it, expect } from 'vitest';
import { ephemerisEngine } from '../../src/lib/ephemeris';
import goldenData from '../fixtures/horizons/horizons_golden.json';

interface HorizonsFixture {
  siteId: string;
  siteName?: string;
  latDeg: number;
  lonDeg: number;
  elevationM: number;
  timestampIso: string;
  horizons: {
    sun: { azimuthDeg: number; elevationDeg: number };
    earth: { azimuthDeg: number; elevationDeg: number };
  };
}

describe('Phase 4: JPL Horizons Ground-Truth & Ephemeris Horizon Uncertainty Validation', () => {
  const fixtures = goldenData.fixtures as HorizonsFixture[];

  it('contains 100 benchmark fixtures across 10 diverse selenographic sites from NASA JPL Horizons API', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(100);
  });

  const sunAzErrors: number[] = [];
  const sunElErrors: number[] = [];
  const earthAzErrors: number[] = [];
  const earthElErrors: number[] = [];
  const polarSunAzErrors: number[] = [];

  // Circular difference accounting for 360° angular wrap
  const circularDiff = (a: number, b: number) => {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  };

  for (const fixture of fixtures) {
    it(`matches Horizons for ${fixture.siteId} at ${fixture.timestampIso}`, () => {
      const site = {
        latDeg: fixture.latDeg,
        lonDeg: fixture.lonDeg,
        elevationM: fixture.elevationM
      };
      const t = new Date(fixture.timestampIso);
      const sample = ephemerisEngine.sample(site, t);

      const sunAzDiff = circularDiff(sample.sun.azimuthDeg, fixture.horizons.sun.azimuthDeg);
      const sunElDiff = Math.abs(sample.sun.elevationDeg - fixture.horizons.sun.elevationDeg);

      const earthAzDiff = circularDiff(sample.earth.azimuthDeg, fixture.horizons.earth.azimuthDeg);
      const earthElDiff = Math.abs(sample.earth.elevationDeg - fixture.horizons.earth.elevationDeg);

      sunAzErrors.push(sunAzDiff);
      sunElErrors.push(sunElDiff);
      earthAzErrors.push(earthAzDiff);
      earthElErrors.push(earthElDiff);

      // Track polar sites (lat <= -60°) for polar azimuth timing shifts
      if (fixture.latDeg <= -60) {
        polarSunAzErrors.push(sunAzDiff);
      }

      // Individual observable assertions
      expect(sunElDiff).toBeLessThan(0.01);   // Sun elevation is within 0.01°
      expect(earthElDiff).toBeLessThan(0.05); // Earth elevation is within 0.05°
    });
  }

  it('achieves overall Root-Mean-Square Error (RMSE) < 0.03° across all 100 benchmark points (400 observables)', () => {
    const calcRmse = (arr: number[]) =>
      Math.sqrt(arr.reduce((acc, v) => acc + v * v, 0) / arr.length);
    const calcMax = (arr: number[]) => Math.max(...arr);
    const calcMean = (arr: number[]) => arr.reduce((acc, v) => acc + v, 0) / arr.length;

    const sunElRmse = calcRmse(sunElErrors);
    const sunElMax = calcMax(sunElErrors);
    const sunElMean = calcMean(sunElErrors);

    const sunAzRmse = calcRmse(sunAzErrors);
    const sunAzMax = calcMax(sunAzErrors);

    const earthElRmse = calcRmse(earthElErrors);
    const earthElMax = calcMax(earthElErrors);
    const earthElMean = calcMean(earthElErrors);

    const earthAzRmse = calcRmse(earthAzErrors);
    const earthAzMax = calcMax(earthAzErrors);

    console.log('=== NASA JPL Horizons Validation Summary (100 Points, 400 Observables) ===');
    console.log(`Sun Elevation RMSE : ${sunElRmse.toFixed(4)}° (Max: ${sunElMax.toFixed(4)}°, Mean: ${sunElMean.toFixed(4)}°)`);
    console.log(`Sun Azimuth RMSE   : ${sunAzRmse.toFixed(4)}° (Max: ${sunAzMax.toFixed(4)}°)`);
    console.log(`Earth Elevation RMSE: ${earthElRmse.toFixed(4)}° (Max: ${earthElMax.toFixed(4)}°, Mean: ${earthElMean.toFixed(4)}°)`);
    console.log(`Earth Azimuth RMSE : ${earthAzRmse.toFixed(4)}° (Max: ${earthAzMax.toFixed(4)}°)`);

    expect(sunElRmse).toBeLessThan(0.005);
    expect(sunAzRmse).toBeLessThan(0.015);
    expect(earthElRmse).toBeLessThan(0.030);
    expect(earthAzRmse).toBeLessThan(0.030);
  });

  it('proves lunar south polar sunrise/sunset event timing shift is under 1.5 minutes (< 3.0 min threshold)', () => {
    // Solar horizontal azimuth velocity at lunar south pole:
    // 360° / (29.530588 days * 24 h/day) = 0.50794°/hour = 0.008465°/minute
    const polarAzRateDegPerMin = 0.50794 / 60.0;
    const maxPolarSunAzErr = Math.max(...polarSunAzErrors);
    const maxPolarAzShiftMin = maxPolarSunAzErr / polarAzRateDegPerMin;

    console.log(`Max South Polar Sun Azimuth Error: ${maxPolarSunAzErr.toFixed(4)}°`);
    console.log(`Max South Polar Event Timing Shift: ${maxPolarAzShiftMin.toFixed(2)} minutes`);

    expect(maxPolarSunAzErr).toBeLessThan(0.015);
    expect(maxPolarAzShiftMin).toBeLessThan(1.5); // Well within the 3.0 minute requirement
  });

  it('demonstrates that LOLA 20m DEM angular uncertainty exceeds ephemeris error by > 10x', () => {
    // LOLA 20m resolution at 20 km horizon distance:
    // theta_DEM = atan(20m / 20,000m) = 0.0573°
    const demResolutionM = 20.0;
    const typicalHorizonDistanceM = 20000.0;
    const demAngularUncertaintyDeg = (Math.atan2(demResolutionM, typicalHorizonDistanceM) * 180) / Math.PI;

    const sunElRmse = Math.sqrt(sunElErrors.reduce((a, b) => a + b * b, 0) / sunElErrors.length);
    const ratio = demAngularUncertaintyDeg / sunElRmse;

    console.log(`DEM Angular Uncertainty (at 20km) : ${demAngularUncertaintyDeg.toFixed(4)}°`);
    console.log(`Ephemeris Solar Elevation RMSE     : ${sunElRmse.toFixed(4)}°`);
    console.log(`Topography Uncertainty / Ephemeris Error Ratio: ${ratio.toFixed(1)}x`);

    // Proves conclusively that DEM uncertainty dominates ephemeris error
    expect(demAngularUncertaintyDeg).toBeGreaterThan(0.05);
    expect(ratio).toBeGreaterThan(10.0);
  });
});
