# Architectural Decision Records (ADR)

## ADR 0001: Technology Stack, Invariant Contracts, and Orchestration Model

- **Status**: Accepted
- **Date**: 2026-11-14
- **Deciders**: System Architect (A0), Orchestrator

### Context
Planning lunar missions to the south pole demands rapid, intuitive evaluation of solar power generation and direct-to-Earth (DTE) communication opportunities. Mission planners, educators, and the public require an accessible, 60-fps interactive tool that avoids the steep learning curve of existing analytical software (NASA Quickmap, Moon Trek, JPL Horizons). 

Key technical requirements include:
1. Accurate selenographic solar and terrestrial ephemeris, including optical libration and polar horizon projections.
2. Invariant data contracts shared byte-for-byte between procedural mock data and real LOLA elevation data.
3. Completely static, client-side execution (no backend server dependencies) deployable to GitHub Pages/Netlify/Vercel.
4. Clean separation of concerns across 24 specialized sub-agents organized into sequential waves.

### Decisions

1. **Core Application Stack**:
   - **Framework**: Vite + React 18 + TypeScript in strict mode. React 18 provides rock-solid compatibility with the React Three Fiber ecosystem.
   - **3D Graphics**: Three.js wrapped by `@react-three/fiber` and `@react-three/drei`. Handles both the 3D lunar globe and localized 3D surface elevation meshes.
   - **State Management**: Zustand for lean, un-opinionated store slices (`useTimeStore`, `useScenarioStore`, `useUIStore`) and URL query parameter two-way synchronization.
   - **Visual Styling**: Tailwind CSS with custom design tokens (Sun amber `#F59E0B`, Earth blue `#38BDF8`, shadow indigo `#6366F1`, comms green `#10B981`, warning red `#EF4444`).
   - **Charts & Projections**: D3 (scales, shapes, axes) powering custom SVG components (polar Sky Dial, multi-band elevation timeline strip, comparative bars).

2. **Ephemeris Engine & Reference Frames**:
   - Ephemeris calculation runs purely in-browser via `astronomy-engine` wrapped in selenographic coordinate transformations.
   - Ground truth verification is maintained offline against the NASA JPL Horizons system via Python script (`scripts/horizons/fetchHorizonsReference.py`) with golden test fixtures. Target error budget is $<0.1^\circ$.
   - **Local Coordinate Basis**: At the lunar poles, spherical azimuth exhibits a coordinate singularity ($\text{atan2}(\Delta \text{lon}, \Delta \text{lat})$ diverges). We construct a local East-North-Up (ENU) topocentric basis using the site's own longitude, defining North along the meridian of the site at $\text{lat} = \pm 90^\circ$ to guarantee continuous azimuth tracks.
   - The lunar body-fixed frame convention (Mean Earth/Polar Axis [ME] vs Principal Axis [PA]) is documented in `docs/EPHEMERIS.md`, and any systematic frame offset against JPL Horizons is quantified in `docs/VALIDATION.md`.

3. **Data Parity & Invariant Contracts**:
   - Canonical site catalog is located at `public/data/catalog.json`, authored by A4 and consumed exclusively via the `DataProvider` interface.
   - Mock and real datasets share the identical directory structure (`public/data/horizon/<siteId>.json`, `public/data/terrain/<siteId>.json`, `public/data/terrain/<siteId>.bin`).
   - The UI never branches on mock vs real data except to render a visible "Simulated terrain" badge when `manifest.source === 'mock'`. When custom coordinates lack local topography, the engine evaluates a $0^\circ$ smooth spherical horizon and flags the site with "Terrain not included".
   - Scale split: visual terrain tiles cover $\approx 20\text{ km} \times 20\text{ km}$ ($256 \times 256$ vertices), while horizon profile raycasting utilizes a coarser 50–100 km radius DEM offline (never shipped).

4. **Temporal Modeling**:
   - A lunar synodic day is defined as approximately $29.53$ Earth days. Analysis windows and metrics default to $29.53$ days rather than a terrestrial calendar month.

### Consequences
- **Positive**: High development velocity, deterministic testing, zero runtime backend failures, reproducible science, completely type-safe architecture.
- **Negative / Constraints**: Client hardware must support WebGL 2.0; large terrain heightmaps must be tightly bounded to avoid memory pressure on mobile devices.

## ADR 0002: Computational Engine Architecture, Solar Upper Limb Modeling, and Real-Time 3D Rendering

- **Status**: Accepted
- **Date**: 2026-11-14
- **Deciders**: Orchestrator, A6a, A6b, A7, A8, A19

### Context
Evaluating landing feasibility at the lunar south pole requires terrain-aware visibility calculations where the Sun skims within a few degrees of the horizon. We needed fast, sub-minute accuracy for rise/set events across a 29.53-day synodic cycle while keeping the UI responsive at 60 fps.

### Decisions
1. **Solar Disk and Terrain Horizon Modeling**:
   - The Sun is modeled as a finite spherical disk of angular radius $\approx 0.267^\circ$ ($\approx 0.534^\circ$ diameter). Sunrise occurs when the upper limb reaches the terrain horizon ($el + 0.267^\circ \ge \text{terrainElevation}$); sunset occurs when the upper limb dips below the skyline.
   - For Direct-to-Earth (DTE) communication, the line of sight requires the center of Earth to exceed the terrain obstacle.
   - When a site lacks local topographic profiles (e.g. custom coordinates), the engine falls back to a $0^\circ$ smooth spherical horizon and flags the site with "Terrain not included".
2. **Sub-Minute Event Solvers**:
   - A 1-hour interval bracket scan is combined with bisection root-finding down to a 30-second tolerance to locate exact rise, set, and blackout transition times.
3. **Power Generation Proxies**:
   - Horizontal panel proxy: $\max(0, \sin(el))$ when Sun is visible.
   - Vertical panel proxy: $\max(0, \cos(el))$ when Sun is visible. Vertical arrays capture near-normal radiation from the grazing polar sun, providing realistic power proxies for polar mission architectures.
4. **Non-Blocking Compute**:
   - Heavy 29.53-day window computations are wrapped in a Web Worker via Comlink, with seamless main-thread fallback in headless/test environments.
5. **Interactive 3D Globe**:
   - Three.js / React Three Fiber renders the lunar sphere with custom GLSL terminator shading oriented dynamically toward the live sub-solar point.
   - All 19 landing sites are plotted as interactive 3D pins with category color-coding and pulse highlights.

## ADR 0003: Feature Views Architecture, Polar Sky Projections, and Slot Composition

- **Status**: Accepted
- **Date**: 2026-11-14
- **Deciders**: Orchestrator, A10, A11, A12, A13, A14

### Context
Users need multiple synchronized spatial perspectives to evaluate a lunar polar landing site: global context (where is the site on the Moon), local 3D topography (what does the crater look like from orbit), skyline silhouette (what does the horizon look like to an astronaut or lander mast), polar dial (where are the Sun and Earth relative to local cardinal axes), and continuous time history (when do illumination and DTE comms windows occur over a synodic month).

### Decisions
1. **Polar Sky Dial Projection (A10)**:
   - Modeled as a polar SVG projection ($r$ represents elevation $-10^\circ \to +90^\circ$, $\theta$ represents azimuth clockwise from North).
   - The local terrain silhouette is plotted directly from `HorizonProfile.elevDeg[360]`, rendering the physical horizon mask. Live Sun and Earth markers visually convey clearance, occultation, and libration loop status.
2. **360° Cylindrical Horizon Panorama (A13)**:
   - Plotted as a first-person skyline viewer with interactive continuous horizontal panning and configurable field of view (90°, 120°, 180°).
   - Accurate optical angular diameters (~0.53° Sun, ~1.9° Earth) with complementary lunar phase illumination on the Earth disk. Celestial bodies accurately disappear behind the plotted terrain silhouette when below local ridge crests.
3. **3D Local Terrain Displacement (A12)**:
   - Three.js `PlaneGeometry` vertex displacement using binary `Float32Array` heightmaps from `dataProvider.getTerrain()`.
   - Directional solar lighting matches real-time topocentric azimuth and elevation angles, casting dynamic shadows across crater rims.
   - Includes procedural lander marker with Earth-tracking antenna dish and interactive vertical exaggeration (1.0x to 4.0x).
4. **Multi-Scale Elevation Timeline Strip (A11)**:
   - Evaluates continuous topocentric elevation curves against local terrain lines across presets: 24h, 7d, and 29.53d synodic lunar month.
   - Features dual operational bands (Sunlit vs. Shadow, DTE Connected vs. Blackout) and a synced draggable "NOW" time scrub cursor.
5. **Decoupled Shell Layout (`AppSlots`)**:
   - The main shell (`Layout.tsx`) exposes five typed slots (`TopBarSlot`, `LeftSidebarSlot`, `CenterViewSlot`, `RightDetailSlot`, `BottomTimelineSlot`), allowing feature views to be swapped, toggled, or tested independently without layout coupling.

## ADR 0004: Comparative System Architecture, Delta Analysis, and Date-Sweep Heatmaps

- **Status**: Accepted
- **Date**: 2026-11-14
- **Deciders**: Orchestrator, A15, A16, A17

### Context
Lunar landing mission planning rarely occurs on a fixed launch date or single site candidate. Planners need to rapidly compare up to 4 candidate scenarios (either different sites at the same epoch, or different launch dates for the same site), evaluating illumination stretches, communication blackouts, and scorecard deltas.

### Decisions
1. **Multi-Scenario Architecture (A15)**:
   - Up to 4 scenarios stored in `useScenarioStore` with individual landing epochs, site IDs, and unique theme colors.
   - Asynchronous evaluation offloaded to Web Workers via `evaluateMetricsAsync`.
2. **Multi-Row Synodic Timelines & Grouped Metric Bars (A16)**:
   - Multi-row synchronized SVG timeline strips aligned to the common 29.53-day synodic month, enabling instant visual comparison of solar and comms intervals with a unified draggable time cursor.
   - Grouped comparative bars with automatic "Best" tagging across key indicators (score, illumination, comms availability, max sunlit hours, max blackout hours).
3. **Pairwise Delta Analysis & Automated Synthesis (A17)**:
   - Mathematical delta calculations ($\Delta \text{Sunlight Hours}$, $\Delta \text{DTE Hours}$, $\Delta \text{Blackout Hours}$, $\Delta \text{Score}$) between baseline and candidate scenarios.
   - Automated mission planner synthesis text highlighting specific power vs. communication trade-offs.
4. **1-Year Annual Date-Sweep Heatmap (A17)**:
   - 12 synodic cycles × 4 seasonal quarters (48 candidate epochs) computing solar and Earth topocentric geometry. Interactive calendar heatmap enables single-click time scrubbing to optimal launch windows.
5. **Export Pipeline (A17)**:
   - Client-side CSV generation and download (`downloadComparisonCsv`) and Markdown table export to system clipboard (`copyComparisonMarkdown`).

## ADR 0005: Onboarding Architecture, Accessibility Standards, and Verification Gates

- **Status**: Accepted
- **Date**: 2026-11-14
- **Deciders**: Orchestrator, A20, A21a, A21b, A22, A23

### Context
To support diverse audiences—from NASA flight dynamics engineers to high school educators and students—the application requires clear, accessible onboarding, comprehensive keyboard navigation, and reproducible automated verification gates.

### Decisions
1. **Interactive Guided Tour (A21a)**:
   - A 6-step contextual onboarding modal (`GuidedTour.tsx`) walks users through the south pole challenge, terminator physics, sky dial interpretation, timeline reading, and comparative analysis. Triggerable via the TopBar `🚀 Guide` button or global shortcut `?`.
2. **Global Keyboard Accessibility (A21b)**:
   - Unified keyboard event listeners support `Space` (Play/Pause), `←/→` (Step time), `1/2/3` (View selection), `m` (Mode toggle), and `c` (Compare matrix toggle), safely ignoring user input inside text fields.
3. **4-Stage Automated Quality Gate**:
   - Every release must pass TypeScript compilation (`tsc --noEmit`), strict ESLint (`--max-warnings 0`), Vitest test suite (`48+ tests`), and JSON schema validation (`validateData.ts`).
4. **Scientific Transparency & Attribution (A23)**:
   - All mathematical formulas, error budgets against JPL Horizons, data sources (LOLA LDEM), and third-party tools are documented in `README.md`, `docs/DEMO.md`, `docs/CREDITS.md`, and `docs/EPHEMERIS.md`.
