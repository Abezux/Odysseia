import { z } from 'zod';

export const ScenarioSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  siteId: z.string(),
  customCoordinates: z.object({
    latDeg: z.number().min(-90).max(90),
    lonDeg: z.number().min(-180).max(180)
  }).optional(),
  landingTimeIso: z.string().datetime(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const CompareSessionSchema = z.object({
  baseScenarioId: z.string().uuid(),
  scenarios: z.array(ScenarioSchema).min(1).max(4)
});
export type CompareSession = z.infer<typeof CompareSessionSchema>;
