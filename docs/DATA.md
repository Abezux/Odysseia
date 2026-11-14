# Lunar Topography & LOLA Elevation Data Pipeline

**Author**: Agent A18 (LOLA DEM Pipeline)  
**Data Origin**: NASA Planetary Data System (PDS) Geosciences Node  
**Mission**: Lunar Reconnaissance Orbiter (LRO) / Lunar Orbiter Laser Altimeter (LOLA)  

---

## 1. Authoritative Dataset Sources & Citations

1. **LOLA Polar Digital Elevation Model (LDEM)**:
   - **Product Identifier**: `LDEM_875S_20M` (Polar stereographic projection, 20 meters/pixel, south pole region from $87.5^\circ\text{ S}$ to $90.0^\circ\text{ S}$).
   - **PDS Node**: Washington University in St. Louis (WUSTL) PDS Geosciences Node.
   - **PDS URL**: [LOLA GDR Polar Data](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/)
   - **DOI**: [10.17189/1520643](https://doi.org/10.17189/1520643)
   - **Reference Radius**: $1,737,400.0\text{ m}$ spherical datum.
   - **Citation**: Smith, D. E., et al. (2010), "Initial observations from the Lunar Orbiter Laser Altimeter (LOLA) on the Lunar Reconnaissance Orbiter (LRO)", *Geophysical Research Letters*, 37, L18204.

2. **LRO Camera (LROC) NAC High-Resolution DEMs**:
   - Arizona State University / NASA LROC Team.
   - Used for geometric ground-truth registration of Apollo landing sites and candidate Artemis landing sites.
   - **URL**: [LROC Planetary Data System](https://wms.lroc.asu.edu/lroc/rdr_product_select)

---

## 2. File Format Specification (Contract Section 4)

All terrain heightmaps adhere strictly to the frozen data contract:

### 1. Manifest (`public/data/terrain/<siteId>.json`)
```json
{
  "siteId": "shackleton-rim",
  "width": 256,
  "height": 256,
  "metersPerPixel": 20.0,
  "centerLat": -89.9,
  "centerLon": 0.0,
  "elevationUnit": "m",
  "referenceRadiusM": 1737400,
  "heightsFile": "shackleton-rim.bin",
  "minElevationM": -3296.8,
  "maxElevationM": 1290.7,
  "source": "lola"
}
```

### 2. Binary Elevation Buffer (`public/data/terrain/<siteId>.bin`)
- **Encoding**: 32-bit floating point (`Float32`), Little-Endian, IEEE 754.
- **Ordering**: Row-major ($y = 0$ is the Northernmost row, $x = 0$ is the Westernmost column).
- **Size**: Exactly $4 \times \text{width} \times \text{height}$ bytes ($4 \times 256 \times 256 = 262,144$ bytes).
- **Units**: Meters above the mean lunar reference sphere ($R = 1,737,400\text{ m}$).

---

## 3. Topographic Scale Separation (Rule MUST FIX #5)

To prevent visual terrain meshes and horizon calculations from compromising each other:
1. **Local Visual Terrain Tile (`A18`)**:
   - Extent: $256 \times 256$ vertices at 20 m/pixel ($\approx 5.12\text{ km} \times 5.12\text{ km}$ area).
   - Designed for 60-fps Three.js real-time rendering, shadow mapping, and lander hazard visualization.
2. **Coarse Horizon Raycasting DEM (`A19`)**:
   - Extent: $50\text{ km} - 100\text{ km}$ radius.
   - Used exclusively offline in `scripts/horizon/computeHorizonProfiles.py` with lunar curvature raycasting ($R = 1,737.4\text{ km}$).
   - The large regional DEM is never shipped in the client bundle; only the resulting 360-element JSON profile is shipped.
