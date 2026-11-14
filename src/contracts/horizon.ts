import { z } from 'zod';

export const DataSourceTypeSchema = z.enum(['mock', 'lola']);
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;

export const HorizonProfileSchema = z.object({
  siteId: z.string().min(1),
  azStepDeg: z.literal(1),
  elevDeg: z.array(z.number().min(-15).max(90)).length(360),
  searchRadiusKm: z.number().positive(),
  demSource: z.string(),
  source: DataSourceTypeSchema
});
export type HorizonProfile = z.infer<typeof HorizonProfileSchema>;
