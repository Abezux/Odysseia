# LunarSite Compare — 3-Minute Scripted Pitch & Demonstration Guide

This guide provides a structured, time-stamped demonstration script for judges, mission planners, and educators evaluating **LunarSite Compare** for the NASA Space Apps Challenge.

---

## Pitch Outline (Total: 3:00)

- **0:00 – 0:40**: The Problem & South Pole Operational Constraints
- **0:40 – 1:20**: The 3D Mission Control Interface & Terrain-Aware Horizons
- **1:20 – 2:15**: Rapid Scenario Comparison & Date-Sweep Heatmap
- **2:15 – 3:00**: Scientific Validation & Extensibility

---

## Walkthrough Script

### **1. The Problem: Extreme Lighting & Comms at the South Pole (0:00 – 0:40)**
- **Speaker**: *"Missions to the Moon's south pole face extreme environmental hurdles. Because the Moon's spin axis is tilted only 1.54° relative to the ecliptic, the Sun never rises high in the sky. It grazes the horizon, casting colossal shadows. Meanwhile, Earth oscillates along the horizon due to libration. A rover or lander might have line-of-sight to Earth on Tuesday, but be plunged into a 40-hour blackout by Thursday when local mountains block the signal.*
- *Existing NASA tools like QuickMap and JPL Horizons provide raw data, but require navigating disconnected interfaces. When a launch date slips, engineers and planners need an intuitive, instant tool to evaluate alternatives. That is LunarSite Compare."*

### **2. Live Tour: Global Context to Terrain Skyline (0:40 – 1:20)**
- **Action**: Open the app. The 3D Moon Globe appears with its dynamic day/night terminator.
- **Speaker**: *"Here is our mission control interface. The 3D globe displays real-time day/night terminator shading oriented dynamically toward the Sun. 19 landing sites are plotted across Artemis candidates, CLPS targets, and Apollo heritage locations.*
- *Click on **Shackleton Crater Rim**. On the right, the telemetry panel updates instantly. The **Polar Sky Dial** projects the sky above the site, displaying a real terrain horizon raycasted from 20-meter LOLA digital elevation models. The Sun is currently 1.5° above the horizon—clearing local terrain—while Earth is at 6.2° elevation with direct line-of-sight.*
- *Now switch to the **3D Local Terrain** tab (Press '2'). You are looking at a 5-kilometer elevation tile. Watch how the directional sunlight casts long shadows across the crater rim. Our procedural lander model's antenna points directly toward Earth in real time.*
- *Next, switch to the **Horizon Panorama** tab (Press '3'). Drag across the horizon to see the skyline exactly as an astronaut or lander mast would see it."*

### **3. Scenario Comparison & Date-Sweep Heatmap (1:20 – 2:15)**
- **Action**: Click the `📊 Compare` button in the top bar (or press `C`).
- **Speaker**: *"Now suppose our mission faces a launch delay or we need to evaluate an alternative landing site. Click **Compare**.*
- *We have **Shackleton Rim Baseline** alongside **Malapert Plateau Alternative**. The comparative grid compares their feasibility scorecards side-by-side. Shackleton achieves an 88/100 with 82% illumination, while Malapert achieves an 82/100.*
- *Switch to the **Multi-Row Timeline** tab. Both scenarios are aligned across the 29.53-day synodic lunar month. Notice how Malapert suffers almost zero comms blackouts due to its massive 5,000-meter elevation, while Shackleton experiences an intermittent 24-hour blackout behind the crater wall.*
- *Open the **Pairwise Delta Analysis** tab. The automated synthesis engine calculates that Malapert offers +18 hours of communication availability at the cost of 12% lower illumination.*
- *Now check the **Date-Sweep Heatmap** tab. It sweeps 48 landing epochs across a full year of synodic cycles. Click on any green cell to immediately jump the simulation to that prime launch window!*
- *Finally, click **Export CSV** to download the complete comparative data matrix for team analysis."*

### **4. Scientific Rigor & Accuracy (2:15 – 3:00)**
- **Speaker**: *"Under the hood, this is not a mock animation. Our ephemeris engine uses IAU 2009 WGCCRE lunar rotational parameters, and we validated topocentric angles against the **NASA JPL Horizons API ground truth** across multiple sites and lunar phases.*
- *Our error against JPL Horizons is just **0.0018° for Sun elevation** and **0.0211° for Earth elevation**—well within our sub-0.1° target.*
- *The app runs completely client-side in the browser, with Web Workers offloading heavy calculations so the UI never drops below 60 frames per second.*
- *LunarSite Compare transforms complex planetary astrometry into an intuitive, accessible mission planning platform for NASA engineers, educators, and the next generation of space explorers."*
