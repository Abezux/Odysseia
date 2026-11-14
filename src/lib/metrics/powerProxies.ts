/**
 * Approximations for solar array power generation potential.
 * Note: These metrics are engineering proxies and not flight-rated radiometric models.
 */

const DEG2RAD = Math.PI / 180;

/**
 * Computes horizontal solar array power proxy:
 * P_horiz = max(0, sin(elevation)) if Sun is visible, else 0.
 * At the lunar south pole, solar elevation is low (~1.5°), so horizontal power is modest (~2.6%).
 */
export function computeHorizontalSolarPowerProxy(
  sunElevationDeg: number,
  isSunVisible: boolean
): number {
  if (!isSunVisible || sunElevationDeg <= 0) {
    return 0.0;
  }
  const rad = sunElevationDeg * DEG2RAD;
  return Number(Math.max(0, Math.min(1, Math.sin(rad))).toFixed(4));
}

/**
 * Computes vertical solar array power proxy (e.g. cylindrical or sun-tracking vertical panels):
 * P_vert = max(0, cos(elevation)) if Sun is visible, else 0.
 * At the lunar south pole, vertical panels capture near-normal grazing sunlight (~99.9% geometric factor).
 */
export function computeVerticalSolarPowerProxy(
  sunElevationDeg: number,
  isSunVisible: boolean
): number {
  if (!isSunVisible) {
    return 0.0;
  }
  const rad = Math.max(0, sunElevationDeg) * DEG2RAD;
  return Number(Math.max(0, Math.min(1, Math.cos(rad))).toFixed(4));
}
