import type { SiteLocation, EphemerisEngine, EphemerisSample } from '../../contracts';
import { getRawLunarEphemeris } from './astronomy';
import {
  computeTopocentricAzEl,
  computeAngularDiameterDeg,
  SUN_RADIUS_KM,
  EARTH_RADIUS_KM
} from './horizonMath';

export class SelenographicEphemerisEngine implements EphemerisEngine {
  /**
   * Evaluates instantaneous Sun and Earth positions, distances, and angular diameters
   * relative to a site's local topocentric horizontal plane.
   */
  sample(site: SiteLocation, t: Date): EphemerisSample {
    const raw = getRawLunarEphemeris(t);
    const elevM = site.elevationM ?? 0;

    // Topocentric calculation for Sun
    const sunTopo = computeTopocentricAzEl(
      site.latDeg,
      site.lonDeg,
      elevM,
      raw.subSolarLatDeg,
      raw.subSolarLonDeg,
      raw.sunDistanceKm
    );
    const sunAngularDia = computeAngularDiameterDeg(SUN_RADIUS_KM, sunTopo.topocentricDistanceKm);

    // Topocentric calculation for Earth
    const earthTopo = computeTopocentricAzEl(
      site.latDeg,
      site.lonDeg,
      elevM,
      raw.subEarthLatDeg,
      raw.subEarthLonDeg,
      raw.earthDistanceKm
    );
    const earthAngularDia = computeAngularDiameterDeg(
      EARTH_RADIUS_KM,
      earthTopo.topocentricDistanceKm
    );

    return {
      timestampIso: t.toISOString(),
      sun: {
        azimuthDeg: sunTopo.azimuthDeg,
        elevationDeg: sunTopo.elevationDeg,
        distanceKm: sunTopo.topocentricDistanceKm,
        angularDiameterDeg: sunAngularDia,
        isAboveSmoothHorizon: sunTopo.elevationDeg > 0
      },
      earth: {
        azimuthDeg: earthTopo.azimuthDeg,
        elevationDeg: earthTopo.elevationDeg,
        distanceKm: earthTopo.topocentricDistanceKm,
        angularDiameterDeg: earthAngularDia,
        phaseFraction: raw.earthPhaseFraction,
        isAboveSmoothHorizon: earthTopo.elevationDeg > 0
      },
      subSolarCoordinates: {
        latDeg: raw.subSolarLatDeg,
        lonDeg: raw.subSolarLonDeg
      },
      subEarthCoordinates: {
        latDeg: raw.subEarthLatDeg,
        lonDeg: raw.subEarthLonDeg
      },
      opticalLibrationDeg: {
        latitude: raw.opticalLibrationLatDeg,
        longitude: raw.opticalLibrationLonDeg
      }
    };
  }

  /**
   * Generates a sequential range of ephemeris samples across a given time window.
   */
  sampleRange(
    site: SiteLocation,
    start: Date,
    end: Date,
    stepSec: number = 3600
  ): EphemerisSample[] {
    const samples: EphemerisSample[] = [];
    const stepMs = Math.max(60, stepSec) * 1000;
    const startMs = start.getTime();
    const endMs = end.getTime();

    for (let curMs = startMs; curMs <= endMs; curMs += stepMs) {
      samples.push(this.sample(site, new Date(curMs)));
    }

    return samples;
  }
}

export const ephemerisEngine = new SelenographicEphemerisEngine();
