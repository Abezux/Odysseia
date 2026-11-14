# A15 Comparative Grid Handoff Report

## Deliverables
- `src/features/compare/CompareGrid.tsx`: Multi-scenario comparative column grid supporting up to 4 scenarios:
  - Editable inline scenario label and custom theme color indicator.
  - Landing date/time epoch picker with instant recalculation.
  - Overall Feasibility Scorecard badge and Sub-Score bars (Power, Comms, Thermal).
  - Live instantaneous illumination, DTE status, and vertical solar proxy at landing epoch.
  - 29.53-day synodic month metrics (illumination %, DTE availability %, max sunlit period, max blackout period).
  - Direct "Select Scenario" activation button and removal trigger.
  - Add Scenario slot card when fewer than 4 scenarios exist.
- `src/features/compare/CompareView.tsx`: Integrated parent modal container housing sub-navigation tabs, export buttons, and close trigger.

## Integration
- Consumes `useScenarioStore` (`scenarios`, `updateScenario`, `removeScenario`, `setActiveScenario`).
- Evaluates scenarios asynchronously via `evaluateMetricsAsync` worker client.
