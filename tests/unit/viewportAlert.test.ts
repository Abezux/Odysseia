import { describe, it, expect } from 'vitest';
import {
  BROWSER_INSTRUCTIONS,
  detectBrowser
} from '../../src/ui/ViewportTelemetryAlert';

describe('Viewport Telemetry Error Alert & Graphics Acceleration Setup', () => {
  it('provides comprehensive browser guidance including Chrome, Firefox, Safari, and Linux', () => {
    const ids = BROWSER_INSTRUCTIONS.map((b) => b.id);
    expect(ids).toContain('chrome');
    expect(ids).toContain('firefox');
    expect(ids).toContain('safari');
    expect(ids).toContain('linux');
  });

  it('specifies the exact 4-step sequence for Chrome / Edge / Chromium', () => {
    const chrome = BROWSER_INSTRUCTIONS.find((b) => b.id === 'chrome');
    expect(chrome).toBeDefined();
    expect(chrome!.steps.length).toBe(4);

    // Step 1: Settings
    expect(chrome!.steps[0].action.toLowerCase()).toContain('settings');
    expect(chrome!.steps[0].highlight).toBe('chrome://settings/system');

    // Step 2: System
    expect(chrome!.steps[1].action.toLowerCase()).toContain('system');

    // Step 3: Turn on "Use graphics acceleration when available"
    expect(chrome!.steps[2].action).toBe('Turn on "Use graphics acceleration when available"');
    expect(chrome!.steps[2].highlight).toBe('Use graphics acceleration when available');

    // Step 4: Relaunch browser and try
    expect(chrome!.steps[3].action.toLowerCase()).toContain('relaunch');
    expect(chrome!.steps[3].description.toLowerCase()).toContain('reload odysseia');
  });

  it('specifies Firefox hardware acceleration steps in Performance settings', () => {
    const firefox = BROWSER_INSTRUCTIONS.find((b) => b.id === 'firefox');
    expect(firefox).toBeDefined();
    expect(firefox!.steps.length).toBe(4);

    expect(firefox!.steps[0].action.toLowerCase()).toContain('settings');
    expect(firefox!.steps[1].action.toLowerCase()).toContain('performance');
    expect(firefox!.steps[2].action).toBe('Turn on "Use hardware acceleration when available"');
    expect(firefox!.steps[3].action.toLowerCase()).toContain('relaunch');
  });

  it('specifies Safari macOS developer menu and WebGL feature flags', () => {
    const safari = BROWSER_INSTRUCTIONS.find((b) => b.id === 'safari');
    expect(safari).toBeDefined();
    expect(safari!.steps.length).toBe(4);

    expect(safari!.steps[0].action.toLowerCase()).toContain('settings');
    expect(safari!.steps[1].action.toLowerCase()).toContain('web developers');
    expect(safari!.steps[2].action.toLowerCase()).toContain('webgl');
    expect(safari!.steps[3].action.toLowerCase()).toContain('relaunch');
  });

  it('specifies Linux Chromium GPU flags for software override & rasterization', () => {
    const linux = BROWSER_INSTRUCTIONS.find((b) => b.id === 'linux');
    expect(linux).toBeDefined();
    expect(linux!.steps.length).toBe(4);

    expect(linux!.steps[0].highlight).toBe('chrome://flags/#ignore-gpu-blocklist');
    expect(linux!.steps[1].highlight).toBe('chrome://flags/#enable-gpu-rasterization');
  });

  it('auto-detects browser family from navigator.userAgent', () => {
    const originalNavigator = globalThis.navigator;

    try {
      // Mock Firefox
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0' },
        writable: true,
        configurable: true
      });
      expect(detectBrowser()).toBe('firefox');

      // Mock Safari
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' },
        writable: true,
        configurable: true
      });
      expect(detectBrowser()).toBe('safari');

      // Mock Chrome
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
        writable: true,
        configurable: true
      });
      expect(detectBrowser()).toBe('chrome');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true
      });
    }
  });
});
