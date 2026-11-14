import { z } from 'zod';
import { EphemerisSampleSchema } from './ephemeris';
import { ScorecardSchema } from './scorecard';

export const TimelineWindowSchema = z.object({
  startIso: z.string().datetime(),
  endIso: z.string().datetime(),
  durationHours: z.number().nonnegative(),
  type: z.enum(['sunlit', 'dark', 'dte_connected', 'dte_blackout'])
});
export type TimelineWindow = z.infer<typeof TimelineWindowSchema>;

export const MetricsResultSchema = z.object({
  siteId: z.string(),
  evaluationTimeIso: z.string().datetime(),
  windowStartIso: z.string().datetime(),
  windowEndIso: z.string().datetime(),
  windowDays: z.number().positive().default(29.53),
  currentEphemeris: EphemerisSampleSchema,
  sunTerrainElevationDeg: z.number(),
  earthTerrainElevationDeg: z.number(),
  timeToNextSunsetHours: z.number().nullable(),
  timeToNextSunriseHours: z.number().nullable(),
  timeToNextEarthsetHours: z.number().nullable(),
  timeToNextEarthriseHours: z.number().nullable(),
  solarPowerProxyHorizontal: z.number().min(0).max(1),
  solarPowerProxyVertical: z.number().min(0).max(1),
  longestSunlitStretchHours: z.number().nonnegative(),
  longestDarkStretchHours: z.number().nonnegative(),
  illuminationFraction: z.number().min(0).max(1),
  dteAvailabilityFraction: z.number().min(0).max(1),
  longestDteBlackoutHours: z.number().nonnegative(),
  timelineWindows: z.array(TimelineWindowSchema),
  scorecard: ScorecardSchema
});
export type MetricsResult = z.infer<typeof MetricsResultSchema>;
