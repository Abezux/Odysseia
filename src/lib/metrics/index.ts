import type {
  MetricsEngine,
  SiteLocation,
  HorizonProfile,
  MetricsResult
} from '../../contracts';
import { MetricsResultSchema } from '../../contracts';
import { ephemerisEngine } from '../ephemeris';
import { isSunVisible, getHorizonThresholdAtAzimuth } from './visibility';
import { analyzeSynodicWindow } from './eventSearch';
import {
  computeHorizontalSolarPowerProxy,
  computeVerticalSolarPowerProxy
} from './powerProxies';
import { computeMissionScorecard } from './scorecard';

export * from './visibility';
export * from './eventSearch';
export * from './powerProxies';
export * from './scorecard';

export class DefaultMetricsEngine implements MetricsEngine {
  async evaluate(args: {
    site: SiteLocation;
    horizon: HorizonProfile | null;
    t: Date;
    windowDays?: number;
  }): Promise<MetricsResult> {
    const { site, horizon, t, windowDays = 29.53 } = args;

    // 1. Instantaneous Ephemeris
    const currentEphemeris = ephemerisEngine.sample(site, t);

    // 2. Horizon Terrain Thresholds
    const sunTerrainElevationDeg = getHorizonThresholdAtAzimuth(
      horizon,
      currentEphemeris.sun.azimuthDeg
    );
    const earthTerrainElevationDeg = getHorizonThresholdAtAzimuth(
      horizon,
      currentEphemeris.earth.azimuthDeg
    );

    const sunVis = isSunVisible(
      currentEphemeris.sun.azimuthDeg,
      currentEphemeris.sun.elevationDeg,
      horizon
    );

    // 3. Solar Power Proxies
    const solarPowerProxyHorizontal = computeHorizontalSolarPowerProxy(
      currentEphemeris.sun.elevationDeg,
      sunVis
    );
    const solarPowerProxyVertical = computeVerticalSolarPowerProxy(
      currentEphemeris.sun.elevationDeg,
      sunVis
    );

    // 4. Synodic Window Analysis
    const windowAnalysis = analyzeSynodicWindow(site, horizon, t, windowDays);

    // 5. Scorecard
    const scorecard = computeMissionScorecard(windowAnalysis);

    const windowMs = windowDays * 24 * 3600 * 1000;
    const windowEnd = new Date(t.getTime() + windowMs);

    const result: MetricsResult = {
      siteId: horizon?.siteId ?? 'custom-site',
      evaluationTimeIso: t.toISOString(),
      windowStartIso: t.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      windowDays,
      currentEphemeris,
      sunTerrainElevationDeg: Number(sunTerrainElevationDeg.toFixed(2)),
      earthTerrainElevationDeg: Number(earthTerrainElevationDeg.toFixed(2)),
      timeToNextSunsetHours: windowAnalysis.timeToNextSunsetHours,
      timeToNextSunriseHours: windowAnalysis.timeToNextSunriseHours,
      timeToNextEarthsetHours: windowAnalysis.timeToNextEarthsetHours,
      timeToNextEarthriseHours: windowAnalysis.timeToNextEarthriseHours,
      solarPowerProxyHorizontal,
      solarPowerProxyVertical,
      longestSunlitStretchHours: windowAnalysis.longestSunlitStretchHours,
      longestDarkStretchHours: windowAnalysis.longestDarkStretchHours,
      illuminationFraction: windowAnalysis.illuminationFraction,
      dteAvailabilityFraction: windowAnalysis.dteAvailabilityFraction,
      longestDteBlackoutHours: windowAnalysis.longestDteBlackoutHours,
      timelineWindows: windowAnalysis.timelineWindows,
      scorecard
    };

    // Validate with frozen schema
    return MetricsResultSchema.parse(result);
  }
}

export const metricsEngine = new DefaultMetricsEngine();
