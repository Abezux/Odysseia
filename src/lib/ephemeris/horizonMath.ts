/**
 * Topocentric horizon projection and vector mathematics for the Moon.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
export const MOON_MEAN_RADIUS_KM = 1737.4;
export const SUN_RADIUS_KM = 696340.0;
export const EARTH_RADIUS_KM = 6371.0;

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface ENUBasis {
  east: Vector3D;
  north: Vector3D;
  up: Vector3D;
}

/**
 * Builds an orthonormal East-North-Up (ENU) topocentric basis at a given selenographic latitude/longitude.
 * At the exact poles (lat = ±90°), North is defined along the local meridian of the specified longitude,
 * ensuring continuous azimuth trajectories without mathematical singularity.
 */
export function getLocalENUBasis(latDeg: number, lonDeg: number): ENUBasis {
  const phi = latDeg * DEG2RAD;
  const lam = lonDeg * DEG2RAD;

  // Polar singularity handling: lat <= -89.999° or >= 89.999°
  if (latDeg <= -89.999) {
    return {
      east: { x: -Math.sin(lam), y: Math.cos(lam), z: 0 },
      north: { x: Math.cos(lam), y: Math.sin(lam), z: 0 },
      up: { x: 0, y: 0, z: -1 }
    };
  }

  if (latDeg >= 89.999) {
    return {
      east: { x: -Math.sin(lam), y: Math.cos(lam), z: 0 },
      north: { x: -Math.cos(lam), y: -Math.sin(lam), z: 0 },
      up: { x: 0, y: 0, z: 1 }
    };
  }

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosLam = Math.cos(lam);
  const sinLam = Math.sin(lam);

  return {
    east: {
      x: -sinLam,
      y: cosLam,
      z: 0
    },
    north: {
      x: -sinPhi * cosLam,
      y: -sinPhi * sinLam,
      z: cosPhi
    },
    up: {
      x: cosPhi * cosLam,
      y: cosPhi * sinLam,
      z: sinPhi
    }
  };
}

/**
 * Converts spherical coordinates (lat, lon, distance) into 3D Cartesian coordinates.
 */
export function sphericalToCartesian(latDeg: number, lonDeg: number, radiusKm: number): Vector3D {
  const phi = latDeg * DEG2RAD;
  const lam = lonDeg * DEG2RAD;
  const cosPhi = Math.cos(phi);

  return {
    x: radiusKm * cosPhi * Math.cos(lam),
    y: radiusKm * cosPhi * Math.sin(lam),
    z: radiusKm * Math.sin(phi)
  };
}

/**
 * Projects a target body vector into the topocentric ENU frame to obtain
 * local azimuth (clockwise from North, 0-360°) and elevation (-90 to +90°).
 */
export function computeTopocentricAzEl(
  siteLatDeg: number,
  siteLonDeg: number,
  siteElevationM: number = 0,
  bodySubLatDeg: number,
  bodySubLonDeg: number,
  bodyDistanceKm: number
): { azimuthDeg: number; elevationDeg: number; topocentricDistanceKm: number } {
  const siteRadiusKm = MOON_MEAN_RADIUS_KM + siteElevationM / 1000.0;
  const rSite = sphericalToCartesian(siteLatDeg, siteLonDeg, siteRadiusKm);
  const rBody = sphericalToCartesian(bodySubLatDeg, bodySubLonDeg, bodyDistanceKm);

  // Topocentric displacement vector: site -> body
  const rho: Vector3D = {
    x: rBody.x - rSite.x,
    y: rBody.y - rSite.y,
    z: rBody.z - rSite.z
  };

  const topocentricDistanceKm = Math.hypot(rho.x, rho.y, rho.z);
  const unitRho: Vector3D = {
    x: rho.x / topocentricDistanceKm,
    y: rho.y / topocentricDistanceKm,
    z: rho.z / topocentricDistanceKm
  };

  const basis = getLocalENUBasis(siteLatDeg, siteLonDeg);

  // Dot products with ENU unit vectors
  const uE = unitRho.x * basis.east.x + unitRho.y * basis.east.y + unitRho.z * basis.east.z;
  const uN = unitRho.x * basis.north.x + unitRho.y * basis.north.y + unitRho.z * basis.north.z;
  const uU = unitRho.x * basis.up.x + unitRho.y * basis.up.y + unitRho.z * basis.up.z;

  // Elevation: angle above local horizontal plane
  const elevationDeg = Math.asin(Math.max(-1, Math.min(1, uU))) * RAD2DEG;

  // Azimuth: clockwise angle from North: 0° = North, 90° = East, 180° = South, 270° = West
  let azimuthDeg = Math.atan2(uE, uN) * RAD2DEG;
  azimuthDeg = (azimuthDeg % 360 + 360) % 360;

  return { azimuthDeg, elevationDeg, topocentricDistanceKm };
}

/**
 * Computes apparent angular diameter of a spherical body from a given distance.
 */
export function computeAngularDiameterDeg(bodyRadiusKm: number, distanceKm: number): number {
  if (distanceKm <= bodyRadiusKm) return 180;
  return 2 * Math.asin(bodyRadiusKm / distanceKm) * RAD2DEG;
}
