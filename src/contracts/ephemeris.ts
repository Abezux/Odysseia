import { z } from 'zod';

export const CelestialBodyPositionSchema = z.object({
  azimuthDeg: z.number().min(0).max(360),
  elevationDeg: z.number().min(-90).max(90),
  distanceKm: z.number().positive(),
  angularDiameterDeg: z.number().positive(),
  isAboveSmoothHorizon: z.boolean()
});
export type CelestialBodyPosition = z.infer<typeof CelestialBodyPositionSchema>;

export const EarthPositionSchema = CelestialBodyPositionSchema.extend({
  phaseFraction: z.number().min(0).max(1)
});
export type EarthPosition = z.infer<typeof EarthPositionSchema>;

export const EphemerisSampleSchema = z.object({
  timestampIso: z.string().datetime(),
  sun: CelestialBodyPositionSchema,
  earth: EarthPositionSchema,
  subSolarCoordinates: z.object({
    latDeg: z.number().min(-90).max(90),
    lonDeg: z.number().min(-180).max(180)
  }),
  subEarthCoordinates: z.object({
    latDeg: z.number().min(-90).max(90),
    lonDeg: z.number().min(-180).max(180)
  }),
  opticalLibrationDeg: z.object({
    longitude: z.number(),
    latitude: z.number()
  })
});
export type EphemerisSample = z.infer<typeof EphemerisSampleSchema>;
