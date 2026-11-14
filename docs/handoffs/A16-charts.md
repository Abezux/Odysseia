# A16 Comparative Charts Handoff Report

## Deliverables
- `src/features/compare/MultiTimeline.tsx`: Synchronized multi-row SVG timeline strip across 29.53-day synodic lunar month:
  - Separate color-coded row for each comparative scenario.
  - Dual operational status tracks per scenario: Direct sunlight intervals (amber) and Direct-to-Earth communication links (emerald).
  - Common time axis with zoom presets (24h, 7d, 29.5d synodic month).
  - Global synchronized draggable "NOW" time cursor bound to `useTimeStore.setTime`.
  - Hover inspection crosshair with synchronized UTC timestamp tooltip.
- `src/features/compare/MetricBarCompare.tsx`: Grouped comparative metric bars comparing scenarios across:
  - Overall Feasibility Score (0-100 pts)
  - Solar Illumination Fraction (%)
  - Earth DTE Link Availability (%)
  - Max Continuous Sunlight (hrs)
  - Max Comms Blackout (hrs, lower is better)
  - Automatic `★ Best` highlight badge on top-performing scenario for each metric.

## Integration
- Consumes `useTimeStore` (`currentTime`, `setTime`) and `useScenarioStore` (`scenarios`).
- Evaluates celestial trajectories dynamically via `ephemerisEngine.sample()`.
