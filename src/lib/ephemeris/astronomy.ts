import * as Astronomy from 'astronomy-engine';

export interface SelenographicBodiesRaw {
  subSolarLatDeg: number;
  subSolarLonDeg: number;
  sunDistanceKm: number;
  subEarthLatDeg: number;
  subEarthLonDeg: number;
  earthDistanceKm: number;
  opticalLibrationLatDeg: number;
  opticalLibrationLonDeg: number;
  earthPhaseFraction: number;
}

const AU_TO_KM = 149597870.7;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

function rotateZ(v: Vector3, angleRad: number): Vector3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: c * v.x + s * v.y,
    y: -s * v.x + c * v.y,
    z: v.z
  };
}

function rotateX(v: Vector3, angleRad: number): Vector3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    x: v.x,
    y: c * v.y + s * v.z,
    z: -s * v.y + c * v.z
  };
}

/**
 * Transforms a vector in equatorial J2000 (EQJ) coordinates to Moon body-fixed (Mean Earth/Polar Axis) frame
 * using the IAU WGCCRE lunar rotational parameters from astronomy-engine.
 */
function j2000ToMoonBodyFixed(vJ2000: Vector3, t: Date): Vector3 {
  const time = Astronomy.MakeTime(t);
  const axis = Astronomy.RotationAxis(Astronomy.Body.Moon, time);

  const raRad = (axis.ra * 15.0) * DEG2RAD;
  const decRad = axis.dec * DEG2RAD;
  const wRad = axis.spin * DEG2RAD;

  // IAU standard rotation matrix: R = Rz(W) * Rx(pi/2 - dec) * Rz(pi/2 + ra)
  let v = rotateZ(vJ2000, Math.PI / 2 + raRad);
  v = rotateX(v, Math.PI / 2 - decRad);
  v = rotateZ(v, wRad);
  return v;
}

/**
 * Computes sub-solar and sub-earth positions on the Moon, distances,
 * and libration parameters for a given UTC Date using astronomy-engine.
 */
export function getRawLunarEphemeris(t: Date): SelenographicBodiesRaw {
  const time = Astronomy.MakeTime(t);

  // 1. Earth Position & Libration
  // astronomy-engine Libration(t) returns sub-earth coordinates (elat, elon) directly in the ME frame
  const lib = Astronomy.Libration(t);
  const earthDistKm = lib.dist_km;
  let normEarthLon = lib.elon;
  if (normEarthLon > 180) normEarthLon -= 360;

  // 2. Exact Sun Position in Moon Body-Fixed Frame
  // Vector from Moon center to Sun center in J2000
  const sunGeo = Astronomy.GeoVector(Astronomy.Body.Sun, time, false);
  const moonGeo = Astronomy.GeoMoon(time);
  const sunFromMoonAU: Vector3 = {
    x: sunGeo.x - moonGeo.x,
    y: sunGeo.y - moonGeo.y,
    z: sunGeo.z - moonGeo.z
  };

  const sunDistKm = Math.hypot(sunFromMoonAU.x, sunFromMoonAU.y, sunFromMoonAU.z) * AU_TO_KM;

  // Transform Moon->Sun vector into Moon Body-Fixed frame
  const sunBodyFixed = j2000ToMoonBodyFixed(sunFromMoonAU, t);
  const sunDistNorm = Math.hypot(sunBodyFixed.x, sunBodyFixed.y, sunBodyFixed.z);

  const subSolarLatDeg = Math.asin(sunBodyFixed.z / sunDistNorm) * RAD2DEG;
  let subSolarLonDeg = Math.atan2(sunBodyFixed.y, sunBodyFixed.x) * RAD2DEG;
  if (subSolarLonDeg > 180) subSolarLonDeg -= 360;

  // 3. Earth Phase as seen from Moon
  const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, time);
  const earthPhaseFraction = Math.max(0, Math.min(1, 1 - moonIllum.phase_fraction));

  return {
    subSolarLatDeg,
    subSolarLonDeg,
    sunDistanceKm: sunDistKm,
    subEarthLatDeg: lib.elat,
    subEarthLonDeg: normEarthLon,
    earthDistanceKm: earthDistKm,
    opticalLibrationLatDeg: lib.elat,
    opticalLibrationLonDeg: normEarthLon,
    earthPhaseFraction
  };
}
