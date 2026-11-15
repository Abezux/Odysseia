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

  constructor(baseUrl?: string) {
    const defaultBase =
      typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
        ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`
        : '/data';
    this.baseUrl = (baseUrl ?? defaultBase).replace(/\/$/, '');
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
   * Retrieves and validates the 3D TerrainManifest and binary heights buffer for a given LOD level.
   * Returns null if missing.
   */
  async getTerrain(
    siteId: string,
    lod: number = 1
  ): Promise<{ manifest: TerrainManifest; heights: Float32Array } | null> {
    const cacheKey = `${siteId}-lod${lod}`;
    if (this.terrainCache.has(cacheKey)) {
      return this.terrainCache.get(cacheKey)!;
    }

    try {
      const manifestRes = await fetch(`${this.baseUrl}/terrain/${siteId}.json`);
      if (manifestRes.status === 404) {
        this.terrainCache.set(cacheKey, null);
        return null;
      }
      if (!manifestRes.ok) {
        throw new Error(`HTTP ${manifestRes.status}`);
      }

      const manifestJson = await manifestRes.json();
      const manifest = TerrainManifestSchema.parse(manifestJson);

      let targetFile = manifest.heightsFile;
      let targetWidth = manifest.width;
      let targetHeight = manifest.height;
      let targetMpp = manifest.metersPerPixel;

      if (manifest.lodLevels && manifest.lodLevels.length > 0) {
        const matchingLod = manifest.lodLevels.find((l) => l.lod === lod) ?? manifest.lodLevels[0];
        targetFile = matchingLod.heightsFile;
        targetWidth = matchingLod.width;
        targetHeight = matchingLod.height;
        targetMpp = matchingLod.metersPerPixel;
      }

      const binRes = await fetch(`${this.baseUrl}/terrain/${targetFile}`);
      if (!binRes.ok) {
        throw new Error(`Failed to fetch binary heights: HTTP ${binRes.status}`);
      }

      const arrayBuffer = await binRes.arrayBuffer();
      const expectedElements = targetWidth * targetHeight;
      const isUint16 = manifest.encoding === 'uint16';
      const expectedBytes = expectedElements * (isUint16 ? 2 : 4);

      if (arrayBuffer.byteLength !== expectedBytes) {
        throw new Error(
          `Buffer size mismatch: expected ${expectedBytes} bytes, got ${arrayBuffer.byteLength}`
        );
      }

      let heights: Float32Array;
      if (isUint16) {
        const u16 = new Uint16Array(arrayBuffer);
        heights = new Float32Array(expectedElements);
        const minE = manifest.minElevationM;
        const range = manifest.maxElevationM - minE;
        const scale = range > 0 ? range / 65535.0 : 0;
        for (let i = 0; i < expectedElements; i++) {
          heights[i] = minE + u16[i] * scale;
        }
      } else {
        heights = new Float32Array(arrayBuffer);
      }

      const effectiveManifest: TerrainManifest = {
        ...manifest,
        width: targetWidth,
        height: targetHeight,
        metersPerPixel: targetMpp,
        heightsFile: targetFile
      };

      const result = { manifest: effectiveManifest, heights };
      this.terrainCache.set(cacheKey, result);
      return result;
    } catch {
      this.terrainCache.set(cacheKey, null);
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
