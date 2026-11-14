# A13 First-Person Horizon Panorama Handoff Report

## Deliverables
- `src/features/horizon/HorizonPanorama.tsx`: 360° cylindrical panoramic skyline viewer featuring:
  - Interactive panning across 360° azimuth by dragging left/right with configurable FOV (90°, 120°, 180°).
  - Quick target-acquisition tracking: "Look at Sun", "Look at Earth", 0° North, 180° South.
  - Realistic terrain silhouette polygon generated directly from `HorizonProfile.elevDeg[360]`, rendering crater massifs and ridge crests.
  - Accurately scaled Sun and Earth disks (with optical angular diameters ~0.53° and ~1.9° respectively).
  - Earth illuminated with realistic phase rendering based on ephemeris `phaseFraction`.
  - Elevation grid lines (-5°, 0°, +5°, +10°, +15°, +20°) with 0° smooth geometric horizon line.
  - Compass reticle with major cardinal ticks (N, NE, E, SE, S, SW, W, NW).
  - Accurate physical occlusion: Sun and Earth disappear behind terrain silhouette when below local ridge crest.
  - Live clearance HUD and data source badging ("LOLA 20m Profile" vs "Simulated Profile (Mock)" vs "Smooth Horizon").
- `src/features/horizon/index.ts`: Barrel export for `HorizonView`.

## Integration
- Consumes `useScenarioStore.activeSiteId` and `useTimeStore.currentTime`.
- Evaluates ephemeris dynamically via `ephemerisEngine.sample()` and loads profiles through `dataProvider.getHorizon()`.
