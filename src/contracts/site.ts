import { z } from 'zod';

export const SiteStatusSchema = z.enum([
  'past_success',
  'past_failure',
  'active',
  'planned',
  'candidate_region',
  'custom'
]);
export type SiteStatus = z.infer<typeof SiteStatusSchema>;

export const SiteCategorySchema = z.enum([
  'apollo',
  'artemis_candidate',
  'clps',
  'international',
  'custom'
]);
export type SiteCategory = z.infer<typeof SiteCategorySchema>;

export const SiteSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  name: z.string().min(2),
  agencyOrOperator: z.string().min(2),
  category: SiteCategorySchema,
  status: SiteStatusSchema,
  latDeg: z.number().min(-90).max(90),
  lonDeg: z.number().min(-180).max(180),
  elevationM: z.number().optional(),
  description: z.string(),
  referenceUrl: z.string().url(),
  isSouthPoleRegion: z.boolean(),
  tags: z.array(z.string())
});
export type Site = z.infer<typeof SiteSchema>;

export const SiteCatalogSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  generatedAtIso: z.string().datetime(),
  sites: z.array(SiteSchema).min(5)
});
export type SiteCatalog = z.infer<typeof SiteCatalogSchema>;
