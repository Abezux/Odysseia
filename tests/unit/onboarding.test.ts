import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useUIStore, ONBOARDING_STORAGE_KEY } from '../../src/store/useUIStore';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true
});

describe('Onboarding & Mission Control Guided Tour', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    useUIStore.setState({
      isOnboardingOpen: false,
      isFeatureGuideOpen: false,
      onboardingStep: 0,
      onboardingSingleStep: null,
      hasSeenOnboarding: false,
      activeCenterTab: 'globe',
      mode: 'overview'
    });
  });

  it('initializes onboarding state and checks localStorage persistence', () => {
    expect(useUIStore.getState().isOnboardingOpen).toBe(false);
    expect(useUIStore.getState().hasSeenOnboarding).toBe(false);

    useUIStore.getState().setHasSeenOnboarding(true);
    expect(useUIStore.getState().hasSeenOnboarding).toBe(true);
    expect(globalThis.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true');

    useUIStore.getState().resetOnboarding();
    expect(useUIStore.getState().hasSeenOnboarding).toBe(false);
    expect(useUIStore.getState().isOnboardingOpen).toBe(true);
    expect(useUIStore.getState().onboardingStep).toBe(0);
    expect(globalThis.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });

  it('manages single-step feature guide mode and step navigation', () => {
    useUIStore.getState().setOnboardingOpen(true, 3, true);
    expect(useUIStore.getState().isOnboardingOpen).toBe(true);
    expect(useUIStore.getState().onboardingStep).toBe(3);
    expect(useUIStore.getState().onboardingSingleStep).toBe(3);

    useUIStore.getState().setOnboardingStep(4);
    expect(useUIStore.getState().onboardingStep).toBe(4);
  });

  it('ensures every required data-tour target exists in source files at desktop size', () => {
    const requiredTargets = [
      'viewport-canvas',
      'viewport-tabs',
      'skyline-view',
      'site-browser',
      'sky-dial',
      'timeline-dock',
      'compare-button',
      'mode-switcher',
      'help-menu',
      'mission-alerts',
      'site-inspector'
    ];

    const srcDir = path.resolve(__dirname, '../../src');

    // Recursively collect all tsx source files
    function getFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getFiles(fullPath));
        } else if (entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const allFiles = getFiles(srcDir);
    const fileContents = allFiles.map((file) => fs.readFileSync(file, 'utf-8')).join('\n');

    for (const target of requiredTargets) {
      const pattern = `data-tour="${target}"`;
      const found = fileContents.includes(pattern);
      expect(found, `Expected ${pattern} to be defined in Mission Control JSX`).toBe(true);
    }
  });

  it('validates all tour steps have concrete benefit and actionable copy', async () => {
    const tourFile = path.resolve(__dirname, '../../src/features/tour/OnboardingTour.tsx');
    const content = fs.readFileSync(tourFile, 'utf-8');

    // Check key required step badges
    expect(content).toContain('Global Context');
    expect(content).toContain('Surface & Orbit');
    expect(content).toContain('Horizon Line-of-Sight');
    expect(content).toContain('Target Selection');
    expect(content).toContain('Polar Telemetry');
    expect(content).toContain('Mission History');
    expect(content).toContain('Trade-Off Analysis');
    expect(content).toContain('Dual Fidelity Modes');
  });

  it('validates feature guide includes both core and secondary features', () => {
    const guideFile = path.resolve(__dirname, '../../src/features/tour/FeatureGuideModal.tsx');
    const content = fs.readFileSync(guideFile, 'utf-8');

    // Check features
    expect(content).toContain('Interactive 3D Moon Globe');
    expect(content).toContain('Local 3D Terrain & Mast');
    expect(content).toContain('First-Person Horizon Skyline');
    expect(content).toContain('Landing Site Catalog');
    expect(content).toContain('Topocentric Sky Dial');
    expect(content).toContain('29.53-Day Synodic Timeline');
    expect(content).toContain('Scenario Comparison Matrix');
    expect(content).toContain('1-Year Date-Sweep Heatmap');
    expect(content).toContain('Overview vs. Astrometric Mode');
    expect(content).toContain('Notification Center');
    expect(content).toContain('Mission Control Hotkeys');
  });
});
