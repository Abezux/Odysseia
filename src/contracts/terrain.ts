import { z } from 'zod';
import { DataSourceTypeSchema } from './horizon';

export const TerrainEncodingSchema = z.enum(['float32', 'uint16']);
export type TerrainEncoding = z.infer<typeof TerrainEncodingSchema>;

export const TerrainLODSchema = z.object({
  lod: z.number().int().nonnegative(),
  metersPerPixel: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  heightsFile: z.string().regex(/\.bin$/)
});
export type TerrainLOD = z.infer<typeof TerrainLODSchema>;

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
  source: DataSourceTypeSchema,
  demSource: z.string().optional(),
  encoding: TerrainEncodingSchema.optional().default('float32'),
  coverageStatus: z.enum(['COMPLETE', 'PARTIAL', 'SYNTHETIC']).optional(),
  lodLevels: z.array(TerrainLODSchema).optional()
});
export type TerrainManifest = z.infer<typeof TerrainManifestSchema>;
