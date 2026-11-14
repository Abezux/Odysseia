import { describe, it, expect } from 'vitest';
import { metricsEngine } from '../../src/lib/metrics';
import {
  computeHorizontalSolarPowerProxy,
  computeVerticalSolarPowerProxy
} from '../../src/lib/metrics/powerProxies';
import { computeMissionScorecard } from '../../src/lib/metrics/scorecard';
import type { SynodicWindowAnalysis } from '../../src/lib/metrics/eventSearch';
import type { SiteLocation, HorizonProfile } from '../../src/contracts';

describe('A6b Metrics Engine, Proxies & Scorecard Unit Tests', () => {
  it('calculates solar power proxies correctly', () => {
    // 0° grazing elevation with Sun visible
    const horiz0 = computeHorizontalSolarPowerProxy(0, true);
    expect(horiz0).toBe(0.0);

    const vert0 = computeVerticalSolarPowerProxy(0, true);
    expect(vert0).toBe(1.0); // Vertical panel faces normal to grazing ray

    // 30° elevation
    const horiz30 = computeHorizontalSolarPowerProxy(30, true);
    expect(horiz30).toBeCloseTo(0.5, 3); // sin(30°) = 0.5

    // Obscured by terrain
    expect(computeHorizontalSolarPowerProxy(30, false)).toBe(0.0);
    expect(computeVerticalSolarPowerProxy(30, false)).toBe(0.0);
  });

  it('generates a transparent Mission Viability Scorecard', () => {
    const mockAnalysis: SynodicWindowAnalysis = {
      timeToNextSunsetHours: 120,
      timeToNextSunriseHours: null,
      timeToNextEarthsetHours: null,
      timeToNextEarthriseHours: null,
      longestSunlitStretchHours: 350,
      longestDarkStretchHours: 24,
      illuminationFraction: 0.85,
      dteAvailabilityFraction: 0.95,
      longestDteBlackoutHours: 12,
      timelineWindows: []
    };

    const scorecard = computeMissionScorecard(mockAnalysis);
    expect(scorecard.overallScore).toBeGreaterThan(80);
    expect(scorecard.powerScore).toBeGreaterThan(80);
    expect(scorecard.communicationScore).toBeGreaterThan(90);
    expect(scorecard.rulesVersion).toBe('1.0.0');
    expect(scorecard.factors.length).toBeGreaterThanOrEqual(4);
  });

  it('evaluates complete MetricsResult conforming to MetricsResultSchema', async () => {
    const site: SiteLocation = { latDeg: -89.9, lonDeg: 0.0, elevationM: 1250 };
    const horizon: HorizonProfile = {
      siteId: 'shackleton-rim',
      azStepDeg: 1,
      elevDeg: new Array(360).fill(1.5),
      searchRadiusKm: 80,
      demSource: 'MOCK',
      source: 'mock'
    };

    const result = await metricsEngine.evaluate({
      site,
      horizon,
      t: new Date('2026-11-14T12:00:00.000Z'),
      windowDays: 29.53
    });

    expect(result.siteId).toBe('shackleton-rim');
    expect(result.windowDays).toBe(29.53);
    expect(result.currentEphemeris).toBeDefined();
    expect(result.scorecard).toBeDefined();
    expect(result.timelineWindows.length).toBeGreaterThan(0);
    expect(result.solarPowerProxyHorizontal).toBeGreaterThanOrEqual(0);
    expect(result.solarPowerProxyVertical).toBeGreaterThanOrEqual(0);
  });
});
