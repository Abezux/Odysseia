import { describe, it, expect } from 'vitest';
import {
  SiteCatalogSchema,
  HorizonProfileSchema,
  TerrainManifestSchema,
  EphemerisSampleSchema,
  MetricsResultSchema,
  ScorecardSchema,
  ScenarioSchema
} from '../../src/contracts';

describe('Contracts Runtime Validation', () => {
  it('exports all Zod schemas successfully', () => {
    expect(SiteCatalogSchema).toBeDefined();
    expect(HorizonProfileSchema).toBeDefined();
    expect(TerrainManifestSchema).toBeDefined();
    expect(EphemerisSampleSchema).toBeDefined();
    expect(MetricsResultSchema).toBeDefined();
    expect(ScorecardSchema).toBeDefined();
    expect(ScenarioSchema).toBeDefined();
  });

  it('validates a minimal HorizonProfile according to frozen schema', () => {
    const mockHorizon = {
      siteId: 'shackleton-test',
      azStepDeg: 1 as const,
      elevDeg: new Array(360).fill(1.5),
      searchRadiusKm: 50,
      demSource: 'LOLA_DEM_20M',
      source: 'mock' as const
    };
    const parsed = HorizonProfileSchema.parse(mockHorizon);
    expect(parsed.elevDeg).toHaveLength(360);
    expect(parsed.source).toBe('mock');
  });

  it('validates TerrainManifest schema with min/max elevation', () => {
    const mockManifest = {
      siteId: 'shackleton-test',
      width: 256,
      height: 256,
      metersPerPixel: 20,
      centerLat: -89.9,
      centerLon: 0.0,
      elevationUnit: 'm' as const,
      referenceRadiusM: 1737400 as const,
      heightsFile: 'shackleton-test.bin',
      minElevationM: -3200,
      maxElevationM: 1100,
      source: 'mock' as const
    };
    const parsed = TerrainManifestSchema.parse(mockManifest);
    expect(parsed.width).toBe(256);
  });
});
