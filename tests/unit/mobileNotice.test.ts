import { describe, it, expect, afterEach } from 'vitest';
import { isPhoneSizedDevice } from '../../src/features/dashboard/MobileNoticeModal';

describe('Mission Control Mobile Notice Device Detection', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    });
  });

  it('does NOT trigger on desktop with a fine pointer regardless of window width', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 500,
        innerHeight: 800,
        matchMedia: (query: string) => ({
          matches: query.includes('fine'), // fine pointer
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        })
      },
      writable: true,
      configurable: true
    });

    expect(isPhoneSizedDevice()).toBe(false);
  });

  it('does NOT trigger on tablets in landscape mode', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1024,
        innerHeight: 768,
        matchMedia: (query: string) => ({
          matches: query.includes('coarse'), // touch pointer
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        })
      },
      writable: true,
      configurable: true
    });

    expect(isPhoneSizedDevice()).toBe(false);
  });

  it('triggers on phone-sized touch screens (coarse pointer, width < 768px)', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 390,
        innerHeight: 844,
        matchMedia: (query: string) => ({
          matches: query.includes('coarse'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        })
      },
      writable: true,
      configurable: true
    });

    expect(isPhoneSizedDevice()).toBe(true);
  });
});
