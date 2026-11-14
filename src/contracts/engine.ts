import type { SiteCatalog } from './site';
import type { HorizonProfile } from './horizon';
import type { TerrainManifest } from './terrain';
import type { EphemerisSample } from './ephemeris';
import type { MetricsResult } from './metrics';

export interface SiteLocation {
  latDeg: number;
  lonDeg: number;
  elevationM?: number;
}

export interface EphemerisEngine {
  sample(site: SiteLocation, t: Date): EphemerisSample;
  sampleRange(site: SiteLocation, start: Date, end: Date, stepSec: number): EphemerisSample[];
}

export interface MetricsEngine {
  evaluate(args: {
    site: SiteLocation;
    horizon: HorizonProfile | null; // null = custom site, smooth horizon
    t: Date;
    windowDays?: number; // default 29.53 (synodic lunar day)
  }): Promise<MetricsResult>;
}

export interface DataProvider {
  getCatalog(): Promise<SiteCatalog>;
  getHorizon(siteId: string): Promise<HorizonProfile | null>;
  getTerrain(siteId: string): Promise<{ manifest: TerrainManifest; heights: Float32Array } | null>;
}
