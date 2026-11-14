import { z } from 'zod';
import { DataSourceTypeSchema } from './horizon';

export const TerrainManifestSchema = z.object({
  siteId: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  metersPerPixel: z.number().positive(),
  centerLat: z.number().min(-90).max(90),
  centerLon: z.number().min(-180).max(180),
  elevationUnit: z.literal('m'),
  referenceRadiusM: z.literal(1737400),
  heightsFile: z.string().regex(/\.bin$/),
  minElevationM: z.number(),
  maxElevationM: z.number(),
  source: DataSourceTypeSchema
});
export type TerrainManifest = z.infer<typeof TerrainManifestSchema>;
