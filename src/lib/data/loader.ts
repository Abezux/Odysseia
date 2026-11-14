import type {
  DataProvider,
  SiteCatalog,
  HorizonProfile,
  TerrainManifest
} from '../../contracts';
import {
  SiteCatalogSchema,
  HorizonProfileSchema,
  TerrainManifestSchema
} from '../../contracts';

export class LocalDataProvider implements DataProvider {
  private catalogCache: SiteCatalog | null = null;
  private horizonCache = new Map<string, HorizonProfile | null>();
  private terrainCache = new Map<
    string,
    { manifest: TerrainManifest; heights: Float32Array } | null
  >();

  private baseUrl: string;

  constructor(baseUrl: string = '/data') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Retrieves and validates the canonical SiteCatalog.
   */
  async getCatalog(): Promise<SiteCatalog> {
    if (this.catalogCache) {
      return this.catalogCache;
    }

    const res = await fetch(`${this.baseUrl}/catalog.json`);
    if (!res.ok) {
      throw new Error(`Failed to load catalog.json: HTTP ${res.status}`);
    }

    const json = await res.json();
    const parsed = SiteCatalogSchema.parse(json);
    this.catalogCache = parsed;
    return parsed;
  }

  /**
   * Retrieves and validates a 360-bin HorizonProfile for a specific site.
   * Returns null if missing or for custom landing coordinates.
   */
  async getHorizon(siteId: string): Promise<HorizonProfile | null> {
    if (this.horizonCache.has(siteId)) {
      return this.horizonCache.get(siteId)!;
    }

    try {
      const res = await fetch(`${this.baseUrl}/horizon/${siteId}.json`);
      if (res.status === 404) {
        this.horizonCache.set(siteId, null);
        return null;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      const parsed = HorizonProfileSchema.parse(json);
      this.horizonCache.set(siteId, parsed);
      return parsed;
    } catch {
      this.horizonCache.set(siteId, null);
      return null;
    }
  }

  /**
   * Retrieves and validates the 3D TerrainManifest and binary Float32Array heights buffer.
   * Returns null if missing.
   */
  async getTerrain(
    siteId: string
  ): Promise<{ manifest: TerrainManifest; heights: Float32Array } | null> {
    if (this.terrainCache.has(siteId)) {
      return this.terrainCache.get(siteId)!;
    }

    try {
      const manifestRes = await fetch(`${this.baseUrl}/terrain/${siteId}.json`);
      if (manifestRes.status === 404) {
        this.terrainCache.set(siteId, null);
        return null;
      }
      if (!manifestRes.ok) {
        throw new Error(`HTTP ${manifestRes.status}`);
      }

      const manifestJson = await manifestRes.json();
      const manifest = TerrainManifestSchema.parse(manifestJson);

      const binRes = await fetch(`${this.baseUrl}/terrain/${manifest.heightsFile}`);
      if (!binRes.ok) {
        throw new Error(`Failed to fetch binary heights: HTTP ${binRes.status}`);
      }

      const arrayBuffer = await binRes.arrayBuffer();
      const expectedElements = manifest.width * manifest.height;
      if (arrayBuffer.byteLength !== expectedElements * 4) {
        throw new Error(
          `Buffer size mismatch: expected ${expectedElements * 4} bytes, got ${arrayBuffer.byteLength}`
        );
      }

      const heights = new Float32Array(arrayBuffer);
      const result = { manifest, heights };
      this.terrainCache.set(siteId, result);
      return result;
    } catch {
      this.terrainCache.set(siteId, null);
      return null;
    }
  }

  /**
   * Clears in-memory caches.
   */
  clearCache(): void {
    this.catalogCache = null;
    this.horizonCache.clear();
    this.terrainCache.clear();
  }
}

export const dataProvider = new LocalDataProvider();
