# A10 Site Detail & Polar Sky Dial Handoff Report

## Deliverables
- `src/features/detail/SkyDial.tsx`: 2D SVG polar projection dial showing:
  - Local terrain horizon silhouette rendered directly from `HorizonProfile.elevDeg[360]`.
  - Cardinal directions (N, E, S, W) and concentric elevation rings (0°, 30°, 60°).
  - Live topocentric Sun and Earth disks with active visibility/LOS clearance styling and pulsing animations.
  - Smooth 0° horizon fallback when terrain profile is null.
- `src/features/detail/SiteDetailPanel.tsx`: Complete telemetry and site evaluation panel:
  - Header with site coordinates, elevation, category, and honest terrain source badging ("Simulated terrain (Mock)", "LOLA 20m/px DEM", or "Terrain not included").
  - Live countdown cards for next sunset/sunrise and next Earthset/Earthrise.
  - Interactive Overview vs. Technical telemetry mode toggle:
    - Overview mode: plain English operational summaries and power efficiency.
    - Technical mode: full astrometric vectors (azimuth, elevation, terrain elevation, clearance, distance, angular diameter, libration angles, sub-solar/sub-Earth coordinates, and synodic statistics).
  - Mission Feasibility Scorecard (0-100) with Power, Comms, and Thermal sub-scores, and weighted factor breakdown bars.
- `src/features/detail/index.ts`: Barrel export for `SiteDetailView` and `SkyDial`.

## Integration
- Consumes `useScenarioStore` (`activeSiteId`), `useTimeStore` (`currentTime`), `useUIStore` (`mode`, `toggleMode`).
- Fetches catalog and horizon via `dataProvider`.
- Evaluates metrics asynchronously via Web Worker `evaluateMetricsAsync`.
