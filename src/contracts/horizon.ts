import { z } from 'zod';

export const DataSourceTypeSchema = z.enum(['mock', 'lola']);
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;

export const CoverageStatusSchema = z.enum(['COMPLETE', 'PARTIAL', 'SYNTHETIC']);
export type CoverageStatus = z.infer<typeof CoverageStatusSchema>;

export const HorizonProfileSchema = z.object({
  siteId: z.string().min(1),
  azStepDeg: z.literal(1),
  elevDeg: z.array(z.number().min(-15).max(90)).length(360),
  searchRadiusKm: z.number().positive(),
  demSource: z.string(),
  source: DataSourceTypeSchema,
  coverageStatus: CoverageStatusSchema.optional(),
  realAzimuthBinPercent: z.number().min(0).max(100).optional(),
  observerHeightM: z.number().optional(),
  maxDistancePerBinKm: z.array(z.number()).length(360).optional(),
  generationDate: z.string().optional(),
  gitCommit: z.string().optional()
});
export type HorizonProfile = z.infer<typeof HorizonProfileSchema>;
