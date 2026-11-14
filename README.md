# Odysseia — 3D Lunar Landing Site Navigator
> **NASA International Space Apps Challenge** | *Challenge: Missions to the Moon's South Pole*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.168.0-black.svg?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Odysseia** is an interactive, cinematic 3D mission-control application that enables mission planners, researchers, and educators to rapidly evaluate lunar landing sites and launch dates at the Moon's south pole. 

By modeling real-time topocentric solar illumination and direct-to-Earth (DTE) communication lines-of-sight against actual lunar topography, Odysseia turns complex planetary astrometry into actionable mission intelligence.

---

## 🌒 Operational Context

At the lunar south pole, the Moon's low axial tilt ($1.54^\circ$) keeps the Sun grazing the horizon ($0^\circ \text{ to } 3^\circ$), casting colossal shadows across crater rims. Simultaneously, optical libration causes Earth to oscillate along the horizon, creating frequent communication blackouts.

When launch windows slip or landing sites need re-targeting, mission planners must instantly weigh power availability against communications access. **Odysseia** provides a responsive, single-pane-of-glass comparison tool running entirely in the browser at 60 fps.

---

## ⚡ Key Capabilities

- **🌐 3D Moon Globe**: Interactive lunar globe with dynamic GLSL day/night terminator shading oriented to the live sub-solar point via IAU 2009 WGCCRE rotational elements.
- **🏔️ 3D Local Terrain Visualizer**: Three.js heightmap displacement using NASA LOLA 20m/px elevation data, featuring physically accurate directional solar shadows and an Earth-tracking lander antenna.
- **🔭 360° Horizon Panorama**: Mast-height cylindrical skyline viewer plotting raycasted terrain profiles and true-scale celestial disks with complementary lunar phase shading.
- **🧭 Polar Topocentric Sky Dial**: Polar projection dial visualizing local terrain skyline masks and clearance angles relative to cardinal directions.
- **⏱️ 29.53-Day Synodic Timeline**: Full lunar-month continuous elevation curves with shaded operational bands for sunlight harvesting and DTE link availability.
- **📊 Comparative Scenario Matrix**: Compare up to 4 concurrent landing scenarios side by side with pairwise trade-off delta analysis ($\Delta \text{Sunlight Hours}$, $\Delta \text{Blackout Hours}$).
- **🗓️ 1-Year Date-Sweep Heatmap**: Sweeps 48 landing epochs across 12 synodic cycles with single-click time scrubbing to prime launch windows.
- **⬇️ Data Export**: Instant client-side CSV downloads and formatted Markdown summaries for mission reports.
- **🔬 Dual Telemetry Modes**: Instant toggle between **Overview** (plain-language operational status) and **Technical** (astrometric angles, libration vectors, sub-body coordinates).

---

## 🔬 Astrometric Precision

Odysseia's ephemeris engine is verified offline against the **NASA JPL Horizons API** across 5 lunar surface locations:
- **Sun Elevation RMSE**: **$0.0018^\circ$** ($< 7$ arcseconds)
- **Earth Elevation RMSE**: **$0.0211^\circ$** ($< 1.3$ arcminutes)

Details and derivations are available in [`docs/EPHEMERIS.md`](docs/EPHEMERIS.md) and [`docs/VALIDATION.md`](docs/VALIDATION.md).

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation & Launch
```bash
# Clone the repository
git clone git@github.com:Abezux/Odysseia.git
cd Odysseia

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Verification & Test Suite
```bash
# Typecheck TypeScript
npm run typecheck

# Lint codebase
npm run lint

# Run Vitest test suite (48 automated unit & integration tests)
npm test

# Validate data contract integrity across all 19 landing sites
npm run validate:data

# Production build
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause time simulation |
| `←` / `→` | Step time backward / forward by 1 hour (`Shift` + `←`/`→` for 1 day) |
| `1` | Switch to **3D Moon Globe** |
| `2` | Switch to **3D Local Terrain** |
| `3` | Switch to **Horizon Panorama** |
| `m` / `M` | Toggle **Overview / Technical** mode |
| `c` / `C` | Toggle **Comparative Scenario Matrix** |
| `?` | Open **Interactive Mission Guide** |
| `Esc` | Close open overlays / modals |

---

## 📁 Repository Structure

```
├── public/                 # Static assets, LOLA 20m DEM tiles & horizon profiles
│   └── data/               # Canonical catalog.json, /horizon, /terrain
├── src/
│   ├── app/                # Application shell & typed layout slot containers
│   ├── contracts/          # Frozen TypeScript interfaces & Zod schemas
│   ├── features/
│   │   ├── compare/        # Multi-scenario grid, timeline, delta analysis, heatmap
│   │   ├── detail/         # Telemetry panel & Polar Sky Dial
│   │   ├── globe/          # 3D Three.js Moon globe & GLSL terminator shader
│   │   ├── horizon/        # 360° cylindrical first-person skyline panorama
│   │   ├── sites/          # Site catalog browser & custom coordinate modal
│   │   ├── terrain/        # 3D local LOLA DEM mesh & dynamic directional shadows
│   │   ├── time/           # Time controls, scrub slider, and speed presets
│   │   └── tour/           # Contextual interactive mission guide walkthrough
│   ├── lib/
│   │   ├── data/           # LRU-cached data loader & contract validator
│   │   ├── ephemeris/      # IAU 2009 selenographic transformations
│   │   ├── metrics/        # Solar/comms visibility solvers & feasibility scorecard
│   │   └── workers/        # Comlink Web Worker for non-blocking synodic analysis
│   ├── store/              # Zustand state slices (time, scenario, UI, URL sync)
│   └── ui/                 # Reusable mission-control component library & tokens
├── tests/                  # Vitest unit, contract, and integration test suites
└── docs/                   # Architectural decisions (ADRs), credits, validation, demo script
```

---

## 🛰️ Credits & Attribution

- **NASA Lunar Reconnaissance Orbiter (LRO) / LOLA**: Polar Digital Elevation Models (LDEM_875S_20M) courtesy of the LOLA Science Team.
- **NASA JPL Horizons**: Planetary ephemeris ground truth data via the JPL Horizons On-Line Ephemeris System.
- **USGS Astrogeology Science Center**: Gazetteer of Planetary Nomenclature for lunar landing sites.
- **IAU WGCCRE**: 2009 Report on Cartographic Coordinates and Rotational Elements.

Full credits and scientific literature citations are detailed in [`docs/CREDITS.md`](docs/CREDITS.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
