# Data Provenance & Reproduction Guide

## 1. NASA PDS Source Products
All real topographic horizons in Odysseia are generated from the primary digital elevation model published by the Lunar Reconnaissance Orbiter (LRO) Lunar Orbiter Laser Altimeter (LOLA) team:

- **Product ID**: `LDEM_80S_20M`
- **Data Set**: `LRO-L-LOLA-4-GDR-V1.0`
- **PDS Repository**: Washington University in St. Louis (WUSTL) PDS Geosciences Node
- **Direct PDS Label**: `https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/jp2/ldem_80s_20m_jp2.lbl`
- **Direct PDS Image (JP2)**: `https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/jp2/ldem_80s_20m.jp2`
- **Product Version**: 2.1
- **Projection**: Polar Stereographic true at South Pole ($-90^\circ\text{ lat}$, $0^\circ\text{ lon}$)
- **Grid Size**: $30,400 \times 30,400$ pixels ($608 \text{ km} \times 608 \text{ km}$)
- **Resolution**: 20.0 meters per pixel
- **Vertical Units**: 0.5 meters per LSB (16-bit signed integer) relative to lunar reference radius $R = 1,737,400\text{ m}$.

---

## 2. Reproduction Pipeline

To reproduce the horizon profiles from scratch on a clean environment:

1. **Setup Python Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install numpy pillow scipy glymur packaging
   ```

2. **Download Raw NASA DEM** (stored in `data/raw/` which is gitignored):
   ```bash
   mkdir -p data/raw
   aria2c -x 16 -s 16 -k 1M -c -d data/raw -o ldem_80s_20m.jp2 \
     https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/jp2/ldem_80s_20m.jp2
   ```

3. **Decompress to Memory-Mapped Binary Raster**:
   ```bash
   .venv/bin/python -c "
   import glymur, numpy as np
   jp2 = glymur.Jp2k('data/raw/ldem_80s_20m.jp2')
   mm = np.memmap('data/raw/ldem_80s_20m.raw', dtype='<i2', mode='w+', shape=(30400, 30400))
   for i in range(0, 30400, 2000):
       mm[i:min(i+2000, 30400), :] = jp2[i:min(i+2000, 30400), :]
   mm.flush()
   "
   ```

4. **Execute Topographic Raycasting**:
   ```bash
   .venv/bin/python scripts/horizon/raycastLolaDem.py
   ```
   Outputs are written to `public/data/horizon/<siteId>.json`.

5. **Run Verification & Test Suite**:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

---

## 3. Coarser LOLA Dataset Evaluation for Non-Polar Sites (For User Decision)
For the 12 non-polar sites currently labeled `SYNTHETIC` (e.g. Apollo 11–17, Chang'e 4–6, SLIM, Chandrayaan-3, Blue Ghost 1), the following real LOLA datasets are evaluated:

| Product Name | Lat Coverage | Resolution | Raw Size | Web Profile Size (12 Sites) | Sites Covered |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `LDEM_60S_60M` | $60^\circ\text{S}$ to $90^\circ\text{S}$ | 60 m/pix | 258 MB (JP2) | ~48 kB | Adds Chandrayaan-3 ($-69.37^\circ\text{S}$) |
| `LDEM_45S_100M`| $45^\circ\text{S}$ to $90^\circ\text{S}$ | 100 m/pix | 290 MB (JP2) | ~48 kB | Adds Chang'e-4 ($-45.44^\circ\text{S}$) & Chang'e-6 ($-41.63^\circ\text{S}$) |
| `LDEM_128` (Global)| $90^\circ\text{S}$ to $90^\circ\text{N}$ | 128 pix/deg (~237 m/pix) | 486 MB (IMG) | ~48 kB | **All 12 remaining sites** worldwide |
| `SLDEM2015` (Global Hyb)| $60^\circ\text{S}$ to $60^\circ\text{N}$ | 512 pix/deg (~59 m/pix) | ~8.5 GB (Tiles) | ~48 kB | Apollo 11–17, SLIM, Blue Ghost 1, Chang'e 5 |

*Note: As approved, these products are evaluated but not yet downloaded or applied, awaiting explicit user directive.*

---

## 4. Phase 2: 3D Local Terrain Meshes Pipeline
1. **Extraction Script**: `scripts/dem/cropLolaTerrainTiles.py`
2. **Input**: `data/raw/ldem_80s_20m.raw` (uncompressed 16-bit LOLA DEM, gitignored).
3. **Outputs**:
   - `public/data/terrain/<siteId>.json` (manifest with bounds, elevation relief, lodLevels).
   - `public/data/terrain/<siteId>.bin` (LOD 1 Overview, 250x250 uint16, 122 KB, ~94 KB Brotli).
   - `public/data/terrain/<siteId>-lod0.bin` (LOD 0 Detail, 1000x1000 uint16, 1.95 MB, ~960 KB Brotli).
4. **Reproduction Command**:
   ```bash
   .venv/bin/python scripts/dem/cropLolaTerrainTiles.py
   ```

---

## 5. Phase 3: Authentic NASA LRO Global Lunar Surface
1. **Source Product**: NASA Scientific Visualization Studio (SVS) - Studio Ernie Wright: CGI Moon Kit (SVS 4720).
2. **Original Map**: `lroc_color_poles_4k.tif` (4096 × 2048 Equirectangular Color / Albedo Mosaic).
3. **Repository URL**: `https://svs.gsfc.nasa.gov/4720`
4. **Attribution**: NASA / Goddard Space Flight Center / Arizona State University (LROC) / Ernie Wright (NASA SVS).
5. **License**: NASA Open Data Policy / Public Domain (U.S. Government Work).
6. **Coordinate Reference**: Mean Earth / Polar Axis (ME) frame.
   - Longitude: $-180^\circ$ (left) to $+180^\circ$ (right), with Prime Meridian ($0^\circ$) at center ($x = 2048$, $u = 0.5$).
   - Latitude: $+90^\circ$ (top row, $v = 1.0$) to $-90^\circ$ (bottom row, $v = 0.0$).
7. **Processing Script**: `scripts/textures/processGlobeTexture.py`
8. **Generated Web Assets**:
   - `public/textures/moon-lroc-wac-4k.webp`: $4096 \times 2048$, 1.19 MB (LOD 0 for desktop).
   - `public/textures/moon-lroc-wac-2k.webp`: $2048 \times 1024$, 282 KB (LOD 1 for mobile / low bandwidth).
   - `public/textures/moon-texture-manifest.json`: metadata manifest and checksums.
9. **Reproduction Command**:
   ```bash
   .venv/bin/python scripts/textures/processGlobeTexture.py
   ```


