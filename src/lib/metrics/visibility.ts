import type { HorizonProfile } from '../../contracts';

export const SUN_ANGULAR_RADIUS_DEG = 0.267; // Half of ~0.534° solar diameter

/**
 * Linearly interpolates the terrain horizon elevation at any floating-point azimuth angle.
 * Supports smooth circular wrapping between 359° and 0° (North).
 */
export function interpolateHorizonElevation(
  elevDeg: number[],
  azimuthDeg: number
): number {
  if (elevDeg.length !== 360) {
    throw new Error(`Invalid HorizonProfile: expected 360 bins, got ${elevDeg.length}`);
  }

  // Normalize azimuth to [0, 360)
  const normAz = ((azimuthDeg % 360) + 360) % 360;
  const lowerIndex = Math.floor(normAz);
  const upperIndex = (lowerIndex + 1) % 360;
  const fraction = normAz - lowerIndex;

  const lowerElev = elevDeg[lowerIndex];
  const upperElev = elevDeg[upperIndex];

  return lowerElev + fraction * (upperElev - lowerElev);
}

/**
 * Evaluates the terrain obstacle elevation at a given azimuth.
 * If horizon is null (e.g. custom site without local DEM), falls back to 0° smooth sphere horizon.
 */
export function getHorizonThresholdAtAzimuth(
  horizon: HorizonProfile | null,
  azimuthDeg: number
): number {
  if (!horizon) {
    return 0.0;
  }
  return interpolateHorizonElevation(horizon.elevDeg, azimuthDeg);
}

/**
 * Evaluates whether the Sun is visible above the local skyline.
 * The Sun is considered visible if its upper limb (center elevation + 0.267°)
 * exceeds the local terrain horizon elevation at the Sun's azimuth.
 */
export function isSunVisible(
  sunAzimuthDeg: number,
  sunElevationDeg: number,
  horizon: HorizonProfile | null
): boolean {
  const threshold = getHorizonThresholdAtAzimuth(horizon, sunAzimuthDeg);
  return sunElevationDeg + SUN_ANGULAR_RADIUS_DEG >= threshold;
}

/**
 * Evaluates whether the Earth is visible for Direct-To-Earth (DTE) communication.
 * DTE line of sight requires the center of the Earth disk to be above the local skyline.
 */
export function isEarthVisible(
  earthAzimuthDeg: number,
  earthElevationDeg: number,
  horizon: HorizonProfile | null
): boolean {
  const threshold = getHorizonThresholdAtAzimuth(horizon, earthAzimuthDeg);
  return earthElevationDeg >= threshold;
}
