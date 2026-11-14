import { z } from 'zod';

export const ScoreFactorSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  metricValue: z.string(),
  explanation: z.string()
});
export type ScoreFactor = z.infer<typeof ScoreFactorSchema>;

export const ScorecardSchema = z.object({
  overallScore: z.number().min(0).max(100),
  powerScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  thermalSurvivabilityScore: z.number().min(0).max(100),
  factors: z.array(ScoreFactorSchema),
  rulesVersion: z.literal('1.0.0')
});
export type Scorecard = z.infer<typeof ScorecardSchema>;
