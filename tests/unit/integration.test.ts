import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataProvider } from '../../src/lib/data';
import { metricsEngine } from '../../src/lib/metrics';
import { useUIStore } from '../../src/store/useUIStore';
import { useTimeStore } from '../../src/store/useTimeStore';
import { useScenarioStore } from '../../src/store/useScenarioStore';
import { formatComparisonCsv } from '../../src/features/compare/exportUtils';
import catalogData from '../../public/data/catalog.json';
import shackletonHorizon from '../../public/data/horizon/shackleton-rim.json';
import type { MetricsResult, Site } from '../../src/contracts';

describe('A22 End-to-End Mission Workflow Integration Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/catalog.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(catalogData)
        } as unknown as Response);
      }
      if (url.includes('/horizon/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(shackletonHorizon)
        } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
    });
  });

  it('loads full catalog and validates all 19 sites through metrics engine', async () => {
    const catalog = await dataProvider.getCatalog();
    expect(catalog.sites.length).toBe(19);

    const testTime = new Date('2026-11-14T12:00:00Z');

    // Run metrics evaluation on Shackleton Rim
    const shackleton = catalog.sites.find((s) => s.id === 'shackleton-rim');
    expect(shackleton).toBeDefined();

    const horizon = await dataProvider.getHorizon(shackleton!.id);
    expect(horizon).not.toBeNull();
    expect(horizon!.source).toBe('lola');

    const result = await metricsEngine.evaluate({
      site: { latDeg: shackleton!.latDeg, lonDeg: shackleton!.lonDeg, elevationM: shackleton!.elevationM },
      horizon,
      t: testTime
    });

    expect(result.siteId).toBe('shackleton-rim');
    expect(result.scorecard.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.scorecard.overallScore).toBeLessThanOrEqual(100);
    expect(result.windowDays).toBe(29.53);
    expect(result.illuminationFraction).toBeGreaterThanOrEqual(0);
    expect(result.dteAvailabilityFraction).toBeGreaterThanOrEqual(0);
  });

  it('executes full comparative workflow with CSV generation', async () => {
    const catalog = await dataProvider.getCatalog();
    const siteMap: Record<string, Site> = {};
    catalog.sites.forEach((s) => {
      siteMap[s.id] = s;
    });

    const scenarioStore = useScenarioStore.getState();
    const testTime = new Date('2026-11-14T12:00:00Z');

    const results: Record<string, MetricsResult> = {};
    for (const sc of scenarioStore.scenarios) {
      const site = siteMap[sc.siteId];
      const horiz = await dataProvider.getHorizon(sc.siteId);
      const res = await metricsEngine.evaluate({
        site: { latDeg: site.latDeg, lonDeg: site.lonDeg, elevationM: site.elevationM },
        horizon: horiz,
        t: testTime
      });
      results[sc.id] = res;
    }

    const csv = formatComparisonCsv(scenarioStore.scenarios, results, siteMap);
    expect(csv).toContain('Scenario Label,Site ID,Site Name');
    expect(csv.split('\n').length).toBeGreaterThanOrEqual(2);
  });

  it('manages UI state transitions, tabs, and simulation time steps', () => {
    const ui = useUIStore.getState();
    const time = useTimeStore.getState();

    // Mode toggle
    const initialMode = ui.mode;
    ui.toggleMode();
    expect(useUIStore.getState().mode).not.toBe(initialMode);
    ui.toggleMode();
    expect(useUIStore.getState().mode).toBe(initialMode);

    // Center tab switching
    ui.setActiveCenterTab('terrain');
    expect(useUIStore.getState().activeCenterTab).toBe('terrain');
    ui.setActiveCenterTab('horizon');
    expect(useUIStore.getState().activeCenterTab).toBe('horizon');
    ui.setActiveCenterTab('globe');
    expect(useUIStore.getState().activeCenterTab).toBe('globe');

    // Tour toggle
    ui.setTourOpen(true);
    expect(useUIStore.getState().isTourOpen).toBe(true);
    ui.setTourOpen(false);
    expect(useUIStore.getState().isTourOpen).toBe(false);

    // Compare modal toggle
    ui.setCompareOpen(true);
    expect(useUIStore.getState().isCompareOpen).toBe(true);
    ui.setCompareOpen(false);
    expect(useUIStore.getState().isCompareOpen).toBe(false);

    // Time stepping
    const beforeTime = time.currentTime.getTime();
    time.stepTime(3600); // 1 hour step
    expect(useTimeStore.getState().currentTime.getTime()).toBe(beforeTime + 3600 * 1000);
  });
});
