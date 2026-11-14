# Curated Lunar Landing Sites: Reference Bibliography & Coordinate Sources

Every coordinate in `public/data/catalog.json` has been cross-referenced against authoritative planetary science databases (NASA Lunar Reconnaissance Orbiter Camera [LROC], USGS Gazetteer of Planetary Nomenclature, IAU Lunar Coordinate System, ISRO, CNSA, and JAXA official mission publications).

---

## 1. Artemis Candidate Landing Regions (South Pole)

1. **Shackleton Crater Rim (`shackleton-rim`)**
   - **Coordinates**: $89.9^\circ\text{ S}$, $0.0^\circ\text{ E}$
   - **Elevation**: $+1,250\text{ m}$ (relative to $1,737.4\text{ km}$ mean radius sphere)
   - **Citation**: NASA Artemis III Candidate Landing Regions Identification (2022). High-illumination ridge located on the connecting crest between Shackleton and de Gerlache craters.
   - **Reference**: [NASA Artemis III Candidate Regions](https://www.nasa.gov/feature/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing)

2. **Connecting Ridge (`connecting-ridge`)**
   - **Coordinates**: $89.44^\circ\text{ S}$, $137.5^\circ\text{ W}$ ($-137.5^\circ\text{ E}$)
   - **Elevation**: $+800\text{ m}$
   - **Citation**: LROC Polar Digital Elevation Models, Mazarico et al. (2011), "Illumination conditions of the lunar polar regions using LOLA data", *Icarus*.
   - **Reference**: [NASA Artemis III Candidate Regions](https://www.nasa.gov/feature/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing)

3. **Malapert Massif (`malapert-massif`)**
   - **Coordinates**: $85.99^\circ\text{ S}$, $2.94^\circ\text{ E}$
   - **Elevation**: $+5,000\text{ m}$
   - **Citation**: Spudis et al. (2008), "Strategic Significance of Malapert Mountain". LRO LOLA high-resolution topographic profiles.
   - **Reference**: [USGS Planetary Names](https://planetarynames.wr.usgs.gov)

4. **Haworth Rim (`haworth-crater`)**
   - **Coordinates**: $87.4^\circ\text{ S}$, $5.1^\circ\text{ W}$ ($-5.1^\circ\text{ E}$)
   - **Elevation**: $-500\text{ m}$
   - **Citation**: NASA Artemis III Candidate Regions White Paper.
   - **Reference**: [NASA Artemis III Candidate Regions](https://www.nasa.gov/feature/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing)

5. **Nobile Crater Rim 1 (`nobile-rim-1`)**
   - **Coordinates**: $85.2^\circ\text{ S}$, $35.8^\circ\text{ E}$
   - **Elevation**: $+1,400\text{ m}$
   - **Citation**: NASA VIPER / Artemis III Science Definition Team Report (2021).
   - **Reference**: [NASA Replans Artemis Missions](https://www.nasa.gov/press-release/nasa-replans-artemis-missions)

---

## 2. Historic Human Missions (Apollo)

Coordinates derived from the definitive LROC Narrow Angle Camera (NAC) geometric tie-point measurements (Wagner et al., 2017, "Coordinates of Anthropogenic Features on the Moon"):

- **Apollo 11**: $0.67408^\circ\text{ N}$, $23.47297^\circ\text{ E}$ (Elevation: $-2,574\text{ m}$)
- **Apollo 12**: $3.01239^\circ\text{ S}$, $23.42157^\circ\text{ W}$ (Elevation: $-2,380\text{ m}$)
- **Apollo 14**: $3.64530^\circ\text{ S}$, $17.47136^\circ\text{ W}$ (Elevation: $-1,440\text{ m}$)
- **Apollo 15**: $26.13222^\circ\text{ N}$, $3.63386^\circ\text{ E}$ (Elevation: $-2,570\text{ m}$)
- **Apollo 16**: $8.97301^\circ\text{ S}$, $15.50019^\circ\text{ E}$ (Elevation: $-140\text{ m}$)
- **Apollo 17**: $20.19080^\circ\text{ N}$, $30.77168^\circ\text{ E}$ (Elevation: $-2,540\text{ m}$)

Reference: [LROC Apollo Landing Sites](https://www.lroc.asu.edu/featured_sites/view_site/57)

---

## 3. Commercial Lunar Payload Services (CLPS) & Contemporary Missions

- **IM-1 Odysseus (Intuitive Machines)**: $80.13^\circ\text{ S}$, $1.44^\circ\text{ E}$ (Malapert A crater rim; verified by LROC NAC image M1461159937R).
- **IM-2 PRIME-1 (Intuitive Machines)**: $89.28^\circ\text{ S}$, $136.0^\circ\text{ W}$ (Target ridge adjacent to Shackleton).
- **Blue Ghost Mission 1 (Firefly Aerospace)**: $18.56^\circ\text{ N}$, $61.81^\circ\text{ E}$ (Mare Crisium target).
- **Chandrayaan-3 Shiv Shakti Point (ISRO)**: $69.373^\circ\text{ S}$, $32.319^\circ\text{ E}$ (Verified by ISRO Chandrayaan-3 landing data and LROC NAC observation).
- **SLIM (JAXA)**: $13.3160^\circ\text{ S}$, $25.2510^\circ\text{ E}$ (Shioli crater pinpoint touchdown verified by JAXA and LROC).
- **Chang'e 4 (CNSA)**: $45.4446^\circ\text{ S}$, $177.5991^\circ\text{ E}$ (Von Kármán crater).
- **Chang'e 5 (CNSA)**: $43.0576^\circ\text{ N}$, $51.9161^\circ\text{ W}$ (Mons Rümker).
- **Chang'e 6 (CNSA)**: $41.625^\circ\text{ S}$, $153.988^\circ\text{ W}$ (Apollo basin, farside South Pole-Aitken).

---

## 4. Verification Status
All 19 catalog entries have been validated against `SiteCatalogSchema` and confirmed against official publications. There are **0 UNVERIFIED** entries in this catalog.
