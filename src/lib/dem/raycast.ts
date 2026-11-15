/**
 * Core geometric and raycasting functions for lunar digital elevation models.
 * Used for horizon mask generation, geometric validation, and unit tests.
 */

export const LUNAR_MEAN_RADIUS_M = 1737400.0;
export const DEFAULT_OBSERVER_HEIGHT_M = 2.0;

/**
 * Computes lunar spherical curvature drop at a given ground distance.
 * drop = d^2 / (2 * R)
 */
export function computeCurvatureDrop(
  distanceM: number,
  lunarRadiusM: number = LUNAR_MEAN_RADIUS_M
): number {
  return (distanceM * distanceM) / (2.0 * lunarRadiusM);
}

/**
 * Computes the theoretical geometric horizon angle over a smooth sphere.
 * alpha_horiz = -arctan(sqrt(2 * h0 / R))
 */
export function computeGeometricHorizonAngleDeg(
  observerHeightM: number = DEFAULT_OBSERVER_HEIGHT_M,
  lunarRadiusM: number = LUNAR_MEAN_RADIUS_M
): number {
  const dHoriz = Math.sqrt(2.0 * lunarRadiusM * observerHeightM);
  const drop = computeCurvatureDrop(dHoriz, lunarRadiusM);
  const tanAlpha = -(observerHeightM + drop) / dHoriz;
  return Math.atan(tanAlpha) * (180.0 / Math.PI);
}

/**
 * Computes topocentric apparent elevation angle of a terrain point from an observer.
 */
export function computeRayElevationDeg(
  terrainHeightM: number,
  observerBaseHeightM: number,
  observerHeightM: number,
  distanceM: number,
  lunarRadiusM: number = LUNAR_MEAN_RADIUS_M
): number {
  if (distanceM <= 0) return 0;
  const drop = computeCurvatureDrop(distanceM, lunarRadiusM);
  const deltaH = terrainHeightM - (observerBaseHeightM + observerHeightM) - drop;
  return Math.atan2(deltaH, distanceM) * (180.0 / Math.PI);
}

export interface TerrainSampler {
  sample(xM: number, yM: number): number | null;
}

export interface RaycastOptions {
  observerX: number;
  observerY: number;
  observerBaseHeightM: number;
  observerHeightM?: number;
  searchRadiusM: number;
  azStepDeg?: number;
  stepSizeNearM?: number;
  stepSizeFarM?: number;
  lunarRadiusM?: number;
}

export interface RaycastResult {
  azimuthDeg: number[];
  elevationDeg: number[];
  maxDistanceM: number[];
  isComplete: boolean;
  validBins: number;
}

/**
 * Performs a 360-azimuth radial raycast over a topocentric grid or elevation function.
 */
export function raycastHorizon(
  sampler: (xM: number, yM: number) => number | null,
  options: RaycastOptions
): RaycastResult {
  const observerHeightM = options.observerHeightM ?? DEFAULT_OBSERVER_HEIGHT_M;
  const azStepDeg = options.azStepDeg ?? 1;
  const numBins = Math.round(360 / azStepDeg);
  const lunarRadiusM = options.lunarRadiusM ?? LUNAR_MEAN_RADIUS_M;

  const stepNear = options.stepSizeNearM ?? 20.0;
  const stepFar = options.stepSizeFarM ?? 100.0;
  const transitionDist = 10000.0; // 10 km

  const azList: number[] = [];
  const elList: number[] = [];
  const maxDistList: number[] = [];
  let validBins = 0;

  for (let b = 0; b < numBins; b++) {
    const az = b * azStepDeg;
    const rad = (az * Math.PI) / 180.0;
    const sinAz = Math.sin(rad);
    const cosAz = Math.cos(rad);

    let maxEl = -90.0;
    let distReached = 0;
    let d = 20.0; // start 20m out from observer

    let hadValidSamples = false;

    while (d <= options.searchRadiusM) {
      const x = options.observerX + d * sinAz;
      const y = options.observerY + d * cosAz;

      const h = sampler(x, y);
      if (h === null || isNaN(h)) {
        // Nodata or out of raster bounds reached
        break;
      }

      hadValidSamples = true;
      distReached = d;

      const el = computeRayElevationDeg(
        h,
        options.observerBaseHeightM,
        observerHeightM,
        d,
        lunarRadiusM
      );

      if (el > maxEl) {
        maxEl = el;
      }

      // Adaptive step size
      const currentStep = d < transitionDist ? stepNear : stepFar;
      d += currentStep;
    }

    azList.push(az);
    if (hadValidSamples) {
      elList.push(Math.round(maxEl * 1000) / 1000);
      maxDistList.push(Math.round(distReached));
      validBins++;
    } else {
      // Smooth geometric horizon fallback if entire ray is missing
      const fallback = computeGeometricHorizonAngleDeg(observerHeightM, lunarRadiusM);
      elList.push(Math.round(fallback * 1000) / 1000);
      maxDistList.push(0);
    }
  }

  return {
    azimuthDeg: azList,
    elevationDeg: elList,
    maxDistanceM: maxDistList,
    isComplete: validBins === numBins,
    validBins
  };
}
