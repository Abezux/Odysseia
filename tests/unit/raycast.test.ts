import { describe, it, expect } from 'vitest';
import {
  computeCurvatureDrop,
  computeGeometricHorizonAngleDeg,
  computeRayElevationDeg,
  raycastHorizon,
  LUNAR_MEAN_RADIUS_M
} from '../../src/lib/dem/raycast';
import shackletonHorizon from '../../public/data/horizon/shackleton-rim.json';

describe('Raycaster Geometric Verification & Topographic Unit Tests', () => {
  it('accurately computes lunar spherical curvature drop', () => {
    // drop = d^2 / (2 * R) where R = 1737400 m
    // At d = 10 km: 100,000,000 / 3,474,800 = 28.7786 m
    expect(computeCurvatureDrop(10000)).toBeCloseTo(28.7786, 3);
    // At d = 50 km: 2,500,000,000 / 3,474,800 = 719.4659 m
    expect(computeCurvatureDrop(50000)).toBeCloseTo(719.4659, 3);
    // At d = 100 km: 10,000,000,000 / 3,474,800 = 2877.8635 m
    expect(computeCurvatureDrop(100000)).toBeCloseTo(2877.8635, 3);
  });

  it('matches theoretical geometric horizon angle on a flat lunar sphere', () => {
    // Over a perfectly flat sphere of radius 1737.4 km,
    // with observer height h0 = 2.0 m:
    // d_horiz = sqrt(2 * R * h0) = 2636.21 m
    // alpha_horiz = -arctan(sqrt(2 * h0 / R)) = -0.086937° (~ -5.22 arcmin)
    const expectedAngle = computeGeometricHorizonAngleDeg(2.0, LUNAR_MEAN_RADIUS_M);
    expect(expectedAngle).toBeCloseTo(-0.0869, 3);

    // Raycast across flat surface h(x,y) = 0
    const flatSampler = () => 0.0;
    const result = raycastHorizon(flatSampler, {
      observerX: 0,
      observerY: 0,
      observerBaseHeightM: 0,
      observerHeightM: 2.0,
      searchRadiusM: 30000.0,
      stepSizeNearM: 10.0,
      stepSizeFarM: 50.0
    });

    expect(result.isComplete).toBe(true);
    expect(result.validBins).toBe(360);

    // Every bin should detect the geometric horizon at ~ -0.087° (within step quantization tolerance)
    for (let az = 0; az < 360; az++) {
      expect(result.elevationDeg[az]).toBeCloseTo(expectedAngle, 2);
    }
  });

  it('accurately resolves an isolated conical peak at known distance and azimuth', () => {
    // Observer at origin (0, 0), base height 0 m, eye height 2 m.
    // Isolated cone centered at (x = 20,000 m, y = 0 m), i.e. Azimuth = 90° (East).
    // Cone base radius = 2,000 m, peak height = 1,500 m.
    const peakX = 20000;
    const peakY = 0;
    const peakHeight = 1500;
    const coneRadius = 2000;

    const coneSampler = (x: number, y: number) => {
      const distToPeak = Math.hypot(x - peakX, y - peakY);
      if (distToPeak < coneRadius) {
        return peakHeight * (1.0 - distToPeak / coneRadius);
      }
      return 0.0;
    };

    const result = raycastHorizon(coneSampler, {
      observerX: 0,
      observerY: 0,
      observerBaseHeightM: 0,
      observerHeightM: 2.0,
      searchRadiusM: 40000.0,
      stepSizeNearM: 10.0,
      stepSizeFarM: 20.0 // fine step to resolve peak apex
    });

    // Exact theoretical elevation to cone peak at d = 20,000 m:
    // drop = 20000^2 / (2 * 1737400) = 115.115 m
    // deltaH = 1500 - 2 - 115.115 = 1382.885 m
    // el = atan2(1382.885, 20000) * 180 / PI = 3.9547°
    const theoreticalPeakEl = computeRayElevationDeg(
      peakHeight,
      0,
      2.0,
      peakX,
      LUNAR_MEAN_RADIUS_M
    );

    // Azimuth 90° should be the maximum elevation and match theoretical angle
    expect(result.elevationDeg[90]).toBeCloseTo(theoreticalPeakEl, 1);

    // Azimuth 270° (opposite direction) should only see the flat horizon (~ -0.087°)
    expect(result.elevationDeg[270]).toBeLessThan(0);
    expect(result.elevationDeg[270]).toBeCloseTo(-0.087, 2);
  });

  it('validates angular continuity across 360 bins for a synthetic ridge', () => {
    // Synthetic ridge creating a smooth sinusoidal horizon profile
    const ridgeSampler = (x: number, y: number) => {
      const d = Math.hypot(x, y);
      const theta = Math.atan2(x, y); // bearing from North
      if (d > 10000 && d < 25000) {
        const ringFraction = Math.sin(((d - 10000) / 15000) * Math.PI);
        return 800 * ringFraction * (1 + 0.5 * Math.cos(2 * theta));
      }
      return 0;
    };

    const result = raycastHorizon(ridgeSampler, {
      observerX: 0,
      observerY: 0,
      observerBaseHeightM: 0,
      observerHeightM: 2.0,
      searchRadiusM: 30000.0
    });

    expect(result.elevationDeg.length).toBe(360);

    // Ensure no NaNs or Infinities
    for (let i = 0; i < 360; i++) {
      expect(Number.isFinite(result.elevationDeg[i])).toBe(true);
      // Check continuity: adjacent bins must differ by < 1.0°
      const next = (i + 1) % 360;
      const diff = Math.abs(result.elevationDeg[next] - result.elevationDeg[i]);
      expect(diff).toBeLessThan(1.0);
    }
  });

  it('validates Shackleton rim horizon features match morphology', () => {
    expect(shackletonHorizon.siteId).toBe('shackleton-rim');
    expect(shackletonHorizon.elevDeg.length).toBe(360);
    expect(shackletonHorizon.source).toBe('lola');
    expect(shackletonHorizon.coverageStatus).toBe('COMPLETE');
    expect(shackletonHorizon.realAzimuthBinPercent).toBe(100);

    // Malapert Massif shoulder towards North (~0° to 15° azimuth) shows positive elevation above horizontal
    const northEl = shackletonHorizon.elevDeg[0];
    expect(northEl).toBeGreaterThan(0.0);

    // Opposite crater rim towards SE (~120° to 150° azimuth) rises significantly
    const oppositeRimEl = shackletonHorizon.elevDeg[135];
    expect(oppositeRimEl).toBeGreaterThan(5.0);

    // Check all values are within realistic lunar polar bounds (-15° to +30°)
    for (const el of shackletonHorizon.elevDeg) {
      expect(el).toBeGreaterThan(-15);
      expect(el).toBeLessThan(30);
    }
  });
});
