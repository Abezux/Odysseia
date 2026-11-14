import { describe, it, expect } from 'vitest';
import { formatComparisonCsv } from '../../src/features/compare/exportUtils';
import { useScenarioStore } from '../../src/store/useScenarioStore';
import type { Scenario, MetricsResult, Site } from '../../src/contracts';

describe('Wave 4 Comparative System Unit Tests', () => {
  const dummySiteA: Site = {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim',
    agencyOrOperator: 'NASA Artemis',
    category: 'artemis_candidate',
    status: 'candidate_region',
    latDeg: -89.9,
    lonDeg: 0.0,
    elevationM: 1250,
    description: 'High-illumination polar ridge.',
    referenceUrl: 'https://moon.nasa.gov',
    isSouthPoleRegion: true,
    tags: ['polar', 'ridge']
  };

  const dummySiteB: Site = {
    id: 'malapert-plateau',
    name: 'Malapert Plateau',
    agencyOrOperator: 'NASA Artemis',
    category: 'artemis_candidate',
    status: 'candidate_region',
    latDeg: -86.0,
    lonDeg: 0.0,
    elevationM: 5000,
    description: 'Elevated massif with persistent Earth visibility.',
    referenceUrl: 'https://moon.nasa.gov',
    isSouthPoleRegion: true,
    tags: ['polar', 'massif']
  };

  const dummyResultA: MetricsResult = {
    siteId: 'shackleton-rim',
    evaluationTimeIso: '2026-11-14T12:00:00.000Z',
    windowStartIso: '2026-11-14T12:00:00.000Z',
    windowEndIso: '2026-12-14T00:43:12.000Z',
    windowDays: 29.53,
    currentEphemeris: {
      timestampIso: '2026-11-14T12:00:00.000Z',
      sun: {
        azimuthDeg: 120,
        elevationDeg: 1.5,
        distanceKm: 149597870,
        angularDiameterDeg: 0.533,
        isAboveSmoothHorizon: true
      },
      earth: {
        azimuthDeg: 45,
        elevationDeg: 6.2,
        distanceKm: 384400,
        angularDiameterDeg: 1.9,
        isAboveSmoothHorizon: true,
        phaseFraction: 0.65
      },
      subSolarCoordinates: { latDeg: -1.2, lonDeg: 30 },
      subEarthCoordinates: { latDeg: 4.5, lonDeg: -2.1 },
      opticalLibrationDeg: { longitude: 4.5, latitude: -2.1 }
    },
    sunTerrainElevationDeg: 0.8,
    earthTerrainElevationDeg: 0.5,
    timeToNextSunsetHours: 120,
    timeToNextSunriseHours: null,
    timeToNextEarthsetHours: null,
    timeToNextEarthriseHours: null,
    solarPowerProxyHorizontal: 0.026,
    solarPowerProxyVertical: 0.999,
    longestSunlitStretchHours: 240,
    longestDarkStretchHours: 50,
    illuminationFraction: 0.82,
    dteAvailabilityFraction: 0.95,
    longestDteBlackoutHours: 24,
    timelineWindows: [],
    scorecard: {
      overallScore: 88,
      powerScore: 85,
      communicationScore: 92,
      thermalSurvivabilityScore: 87,
      factors: [],
      rulesVersion: '1.0.0'
    }
  };

  const dummyResultB: MetricsResult = {
    ...dummyResultA,
    siteId: 'malapert-plateau',
    illuminationFraction: 0.70,
    dteAvailabilityFraction: 0.98,
    longestDteBlackoutHours: 12,
    scorecard: {
      overallScore: 82,
      powerScore: 74,
      communicationScore: 96,
      thermalSurvivabilityScore: 76,
      factors: [],
      rulesVersion: '1.0.0'
    }
  };

  const scenarios: Scenario[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      label: 'Shackleton Baseline',
      siteId: 'shackleton-rim',
      landingTimeIso: '2026-11-14T12:00:00.000Z',
      themeColor: '#F59E0B'
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      label: 'Malapert Alternative',
      siteId: 'malapert-plateau',
      landingTimeIso: '2026-11-14T12:00:00.000Z',
      themeColor: '#38BDF8'
    }
  ];

  it('correctly generates CSV comparison rows with exact numerical formatting', () => {
    const csv = formatComparisonCsv(
      scenarios,
      {
        [scenarios[0].id]: dummyResultA,
        [scenarios[1].id]: dummyResultB
      },
      {
        'shackleton-rim': dummySiteA,
        'malapert-plateau': dummySiteB
      }
    );

    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // Header + 2 scenario rows
    expect(lines[0]).toContain('Scenario Label,Site ID,Site Name');
    expect(lines[1]).toContain('"Shackleton Baseline",shackleton-rim,"Shackleton Crater Rim"');
    expect(lines[1]).toContain('88,85,92,87,82.0,95.0,240.0,50.0,24.0');
    expect(lines[2]).toContain('"Malapert Alternative",malapert-plateau,"Malapert Plateau"');
    expect(lines[2]).toContain('82,74,96,76,70.0,98.0');
  });

  it('enforces maximum 4 scenarios limit in useScenarioStore', () => {
    // Reset scenarios to base
    while (useScenarioStore.getState().scenarios.length > 1) {
      const s = useScenarioStore.getState().scenarios[1];
      useScenarioStore.getState().removeScenario(s.id);
    }

    expect(useScenarioStore.getState().scenarios.length).toBe(1);

    const addOk2 = useScenarioStore.getState().addScenario({
      id: '33333333-3333-4333-8333-333333333333',
      label: 'Scenario 2',
      siteId: 'shackleton-rim',
      landingTimeIso: '2026-11-14T12:00:00.000Z',
      themeColor: '#10B981'
    });
    const addOk3 = useScenarioStore.getState().addScenario({
      id: '44444444-4444-4444-8444-444444444444',
      label: 'Scenario 3',
      siteId: 'shackleton-rim',
      landingTimeIso: '2026-11-14T12:00:00.000Z',
      themeColor: '#38BDF8'
    });
    const addOk4 = useScenarioStore.getState().addScenario({
      id: '55555555-5555-4555-8555-555555555555',
      label: 'Scenario 4',
      siteId: 'shackleton-rim',
      landingTimeIso: '2026-11-14T12:00:00.000Z',
      themeColor: '#A855F7'
    });

    expect(addOk2).toBe(true);
    expect(addOk3).toBe(true);
    expect(addOk4).toBe(true);
    expect(useScenarioStore.getState().scenarios.length).toBe(4);

    // Attempting to add a 5th scenario must fail
    const addOk5 = useScenarioStore.getState().addScenario({
      id: '66666666-6666-4666-8666-666666666666',
      label: 'Scenario 5',
      siteId: 'shackleton-rim',
      landingTimeIso: '2026-11-14T12:00:00.000Z',
      themeColor: '#EF4444'
    });
    expect(addOk5).toBe(false);
    expect(useScenarioStore.getState().scenarios.length).toBe(4);
  });
});
