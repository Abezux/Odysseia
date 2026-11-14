import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalDataProvider } from '../../src/lib/data/loader';
import catalogData from '../../public/data/catalog.json';
import shackletonHorizon from '../../public/data/horizon/shackleton-rim.json';
import shackletonManifest from '../../public/data/terrain/shackleton-rim.json';

describe('A8 Data Provider Unit Tests', () => {
  let provider: LocalDataProvider;

  beforeEach(() => {
    provider = new LocalDataProvider('/data');
    vi.restoreAllMocks();
  });

  it('loads and validates the catalog', async () => {
    // Mock global fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/catalog.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(catalogData)
        } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
    });

    const catalog = await provider.getCatalog();
    expect(catalog.sites.length).toBe(19);

    // Test caching: second call should not trigger fetch
    await provider.getCatalog();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('loads and validates a horizon profile', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/horizon/shackleton-rim.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(shackletonHorizon)
        } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
    });

    const profile = await provider.getHorizon('shackleton-rim');
    expect(profile).not.toBeNull();
    expect(profile?.siteId).toBe('shackleton-rim');
    expect(profile?.elevDeg.length).toBe(360);

    // Non-existent or custom site returns null gracefully
    const missing = await provider.getHorizon('custom-site-xyz');
    expect(missing).toBeNull();
  });

  it('loads terrain manifest and binary Float32 heights buffer', async () => {
    const floatHeights = new Float32Array(256 * 256).fill(1250.0);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/terrain/shackleton-rim.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(shackletonManifest)
        } as unknown as Response);
      }
      if (url.includes('shackleton-rim.bin')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(floatHeights.buffer)
        } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as unknown as Response);
    });

    const terrain = await provider.getTerrain('shackleton-rim');
    expect(terrain).not.toBeNull();
    expect(terrain?.manifest.width).toBe(256);
    expect(terrain?.heights.length).toBe(256 * 256);
  });
});
