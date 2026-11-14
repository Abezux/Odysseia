# A17 Delta Analysis & Date-Sweep Heatmap Handoff Report

## Deliverables
- `src/features/compare/DeltaAnalysis.tsx`: Pairwise trade-off differential analysis between Baseline (A) and Candidate (B):
  - Quantitative deltas: $\Delta$ Overall Score, $\Delta$ Sunlight %, $\Delta$ Sunlight Hours, $\Delta$ DTE %, $\Delta$ DTE Hours, $\Delta$ Max Blackout Hours.
  - Automated mission planner synthesis text highlighting specific power vs. communication trade-offs and recommending appropriate scenario architectures.
- `src/features/compare/DateSweepHeatmap.tsx`: 1-year annual launch window date-sweep feasibility heatmap:
  - 12 synodic cycles × 4 seasonal quarters (48 candidate landing epochs).
  - Evaluates topocentric solar and terrestrial geometry for any selected lunar site.
  - Color-coded cells with interactive hover inspection and direct click-to-scrub time integration.
- `src/features/compare/exportUtils.ts`: Data export utilities:
  - CSV report generation and automatic browser file download (`downloadComparisonCsv`).
  - Markdown table generation and clipboard copy (`copyComparisonMarkdown`).

## Integration
- Consumes `useScenarioStore`, `useTimeStore`, and `dataProvider`.
- Evaluates metrics via `ephemerisEngine` and `computeMissionScorecard`.
