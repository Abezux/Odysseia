# A21a Guided Tour Handoff Report

## Deliverables
- `src/features/tour/GuidedTour.tsx`: 6-step interactive onboarding modal:
  1. *NASA Challenge Context*: Grazing polar illumination, crater rim shadows, and Earth libration loops.
  2. *Interactive 3D Moon Globe*: Dynamic terminator shader, 19 site pins, sub-solar and sub-Earth vectors.
  3. *Topocentric Sky Dial & Horizon Profiling*: Raycasted 20m LOLA DEM horizon profiles, solar upper limb threshold (+0.267°), and DTE line-of-sight clearance.
  4. *29.53-Day Synodic Timeline Strip*: Continuous elevation trajectories, operational sunlight and comms bands, and interactive time scrubbing.
  5. *Comparative Matrix & Date-Sweep Heatmap*: Up to 4 simultaneous scenarios, pairwise trade-off deltas, 1-year launch window calendar heatmap, and CSV export.
  6. *Dual Telemetry Modes & Mission Navigation*: Overview vs. Technical mode toggle, simulation controls, and keyboard shortcuts.
- `src/features/tour/index.ts`: Barrel export for `GuidedTour`.

## Integration
- Bound to `useUIStore.isTourOpen` and `setTourOpen`.
- Accessible via the TopBar `🚀 Guide (?)` button and global keyboard shortcut `?`.
