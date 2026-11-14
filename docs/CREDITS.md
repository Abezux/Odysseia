# Credits, Citations & Attributions

**LunarSite Compare** was built for the **NASA International Space Apps Challenge: *"Missions to the Moon's South Pole"***.

We gratefully acknowledge the scientific datasets, planetary ephemerides, coordinate frame specifications, and open-source software libraries that made this application possible.

---

## 1. Planetary Science & Ephemeris Data

### **NASA Lunar Reconnaissance Orbiter (LRO) / LOLA Instrument**
- **Instrument**: Lunar Orbiter Laser Altimeter (LOLA) aboard NASA's Lunar Reconnaissance Orbiter.
- **Dataset**: LOLA Polar Digital Elevation Model (LDEM_875S_20M) at 20 meters per pixel, covering latitudes $87.5^\circ\text{S} \text{ to } 90^\circ\text{S}$.
- **Citation**: Smith, D. E., Zuber, M. T., Neumann, G. A., et al. (2010). *Initial observations from the Lunar Orbiter Laser Altimeter (LOLA) on board the Lunar Reconnaissance Orbiter*. Geophysical Research Letters, 37(18).
- **Archive**: NASA Planetary Data System (PDS) Geosciences Node.

### **NASA JPL Horizons System**
- **System**: Solar System Dynamics Group, Jet Propulsion Laboratory, California Institute of Technology.
- **Role**: Used as the definitive ground-truth reference for topocentric solar and terrestrial azimuth, elevation, distance, and angular diameter validation.
- **Citation**: Giorgini, J. D., Yeomans, D. K., Chamberlin, A. B., et al. (1996). *JPL's On-Line Solar System Data Service and Ephemeris Computation System*. Bulletin of the American Astronomical Society, 28, 1158.
- **Validation**: Reached Root-Mean-Square Error (RMSE) of $0.0018^\circ$ (Sun) and $0.0211^\circ$ (Earth) against Horizons output.

### **IAU Working Group on Cartographic Coordinates and Rotational Elements (WGCCRE)**
- **Specification**: 2009 Report on Cartographic Coordinates and Rotational Elements of the Planets and Satellites.
- **Parameters**: Lunar orientation angles ($RA_0 = 269.9949^\circ$, $DEC_0 = 66.5392^\circ$, $W = 38.3213^\circ$, plus nutation/precession terms) used to define the Mean Earth / Polar Axis (ME) selenographic reference frame.
- **Citation**: Archinal, B. A., et al. (2011). *Report of the IAU Working Group on Cartographic Coordinates and Rotational Elements: 2009*. Celestial Mechanics and Dynamical Astronomy, 109(2), 101-135.

### **USGS Astrogeology Science Center**
- **Resource**: Gazetteer of Planetary Nomenclature.
- **Role**: Curated selenographic coordinates, feature names, and elevations for lunar south pole candidate landing sites and Apollo/CLPS heritage targets.

---

## 2. Core Libraries & Computational Engines

- **Astronomy Engine**: Authored by Don Cross ([github.com/cosinekitty/astronomy](https://github.com/cosinekitty/astronomy)). Pure JavaScript / TypeScript implementation of high-precision solar system positions, nutation, and ecliptic coordinates.
- **Three.js**: Created by Ricardo Cabello (mrdoob) and contributors ([threejs.org](https://threejs.org/)). High-performance WebGL 3D rendering.
- **React Three Fiber & Drei**: Developed by Poimandres ([pmnd.rs](https://pmnd.rs/)). Declarative Three.js component architecture for React.
- **Comlink**: Developed by Google Chrome Labs ([github.com/GoogleChromeLabs/comlink](https://github.com/GoogleChromeLabs/comlink)). RPC-based Web Worker abstraction for non-blocking synodic metrics computation.
- **D3.js**: Authored by Mike Bostock ([d3js.org](https://d3js.org/)). Scales, interpolators, and shapes powering the Polar Sky Dial and Multi-Row Elevation Timelines.
- **Zustand**: Developed by Poimandres. Fast, minimalist state management powering time, scenario, and UI state slices.
- **Zod**: Created by Colin McDonnell. Runtime schema definition and data contract validation.
- **Tailwind CSS**: Utility-first CSS styling framework.

---

## 3. Mission Planning Context & References

- **NASA Artemis III Candidate Landing Regions**: NASA Headquarters ([nasa.gov/artemis](https://www.nasa.gov/artemis)).
- **NASA Commercial Lunar Payload Services (CLPS)**: Science Mission Directorate ([nasa.gov/clps](https://www.nasa.gov/commercial-lunar-payload-services/)).
- **Mazarico, E., et al. (2011)**: *Illumination conditions of the lunar polar regions from Lunar Orbiter Laser Altimeter (LOLA) data*. Icarus, 211(2), 1066-1081.
- **De Rosa, D., et al. (2012)**: *Characterisation of potential landing sites for the European Space Agency's Lunar Lander*. Planetary and Space Science, 74(1), 224-246.
