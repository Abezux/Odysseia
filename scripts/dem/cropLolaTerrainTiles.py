#!/usr/bin/env python3
"""
scripts/dem/cropLolaTerrainTiles.py

Extracts authentic 20 km x 20 km terrain heightmaps from NASA LOLA LDEM_80S_20M
for South Polar landing sites.
Generates 16-bit quantized (Uint16) elevation tiles in two LODs:
  - LOD 1 (Overview): 250 x 250 cells at 80 m/pixel (125,000 bytes, ~94 KB Brotli)
  - LOD 0 (Detail): 1000 x 1000 cells at 20 m/pixel (2,000,000 bytes, ~960 KB Brotli)
Both cover the exact same 20.0 km x 20.0 km ground area.
"""

import os
import sys
import json
import math
import numpy as np

LUNAR_RADIUS_M = 1737400.0
MAP_SCALE_M = 20.0
LINE_OFFSET = 15199.5
SAMPLE_OFFSET = 15199.5
RASTER_SHAPE = (30400, 30400)

NON_POLAR_SITES = [
    "apollo-11", "apollo-12", "apollo-14", "apollo-15", "apollo-16", "apollo-17",
    "blue-ghost-1", "chandrayaan-3", "change-4", "change-5", "change-6", "slim"
]

def latlon_to_linesample(lat_deg: float, lon_deg: float):
    phi = math.radians(lat_deg)
    lam = math.radians(lon_deg)
    r = 2.0 * LUNAR_RADIUS_M * math.tan((math.pi / 2.0 + phi) / 2.0)
    x = r * math.sin(lam)
    y = r * math.cos(lam)
    line = LINE_OFFSET - y / MAP_SCALE_M
    sample = SAMPLE_OFFSET + x / MAP_SCALE_M
    return line, sample

def main():
    raw_path = os.path.join(os.path.dirname(__file__), "../../data/raw/ldem_80s_20m.raw")
    if not os.path.exists(raw_path):
        print(f"Error: Raw DEM file not found at {raw_path}")
        sys.exit(1)

    dem = np.memmap(raw_path, dtype='<i2', mode='r', shape=RASTER_SHAPE)
    catalog_path = os.path.join(os.path.dirname(__file__), "../../public/data/catalog.json")
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    sites = catalog.get("sites", catalog)
    out_dir = os.path.join(os.path.dirname(__file__), "../../public/data/terrain")
    os.makedirs(out_dir, exist_ok=True)

    summary = []

    for s in sites:
        sid = s["id"]
        lat = s.get("latDeg") if "latDeg" in s else s.get("latitude")
        lon = s.get("lonDeg") if "lonDeg" in s else s.get("longitude")

        if lat > -80.0:
            # Update non-polar manifest to be explicitly MOCK
            manifest_path = os.path.join(out_dir, f"{sid}.json")
            if os.path.exists(manifest_path):
                with open(manifest_path, "r", encoding="utf-8") as f:
                    m = json.load(f)
                m["source"] = "mock"
                m["demSource"] = "SYNTHETIC TERRAIN (OUTSIDE LOLA 80S)"
                m["coverageStatus"] = "SYNTHETIC"
                with open(manifest_path, "w", encoding="utf-8") as f:
                    json.dump(m, f, indent=2)
            continue

        print(f"\nProcessing Polar Site: {sid} (lat={lat:.2f}°, lon={lon:.2f}°)")
        line_c, samp_c = latlon_to_linesample(lat, lon)
        l0 = int(round(line_c - 500))
        l1 = l0 + 1000
        s0 = int(round(samp_c - 500))
        s1 = s0 + 1000

        # Boundary check
        is_clipped = False
        tile_1000 = np.zeros((1000, 1000), dtype=np.float32)

        # Calculate overlap with valid DEM bounds [0, 30400]
        src_l0 = max(0, l0)
        src_l1 = min(RASTER_SHAPE[0], l1)
        src_s0 = max(0, s0)
        src_s1 = min(RASTER_SHAPE[1], s1)

        dst_l0 = src_l0 - l0
        dst_l1 = dst_l0 + (src_l1 - src_l0)
        dst_s0 = src_s0 - s0
        dst_s1 = dst_s0 + (src_s1 - src_s0)

        raw_crop = dem[src_l0:src_l1, src_s0:src_s1].astype(np.float32) * 0.5
        tile_1000[dst_l0:dst_l1, dst_s0:dst_s1] = raw_crop

        if src_l0 > l0 or src_l1 < l1 or src_s0 > s0 or src_s1 < s1:
            is_clipped = True
            # Pad clipped rows with edge values
            if dst_l0 > 0:
                tile_1000[:dst_l0, :] = tile_1000[dst_l0:dst_l0+1, :]
            print(f"  Note: Site {sid} clipped by DEM boundary; edge padded.")

        # Replace any nodata values (<= -30000m) with median of valid area
        valid_mask = tile_1000 > -30000.0
        if not np.all(valid_mask):
            med_val = float(np.median(tile_1000[valid_mask]))
            tile_1000[~valid_mask] = med_val

        min_e = float(tile_1000.min())
        max_e = float(tile_1000.max())
        elev_range = max_e - min_e
        if elev_range < 1e-3:
            elev_range = 1.0

        # 1. Detail LOD 0 (1000 x 1000 at 20 m/pixel)
        quant_1000 = np.clip(np.round((tile_1000 - min_e) / elev_range * 65535), 0, 65535).astype(np.uint16)
        lod0_bin_path = os.path.join(out_dir, f"{sid}-lod0.bin")
        quant_1000.tofile(lod0_bin_path)

        # 2. Overview LOD 1 (250 x 250 at 80 m/pixel, 4x decimation)
        # 4x4 block averaging
        tile_250 = tile_1000.reshape(250, 4, 250, 4).mean(axis=(1, 3))
        quant_250 = np.clip(np.round((tile_250 - min_e) / elev_range * 65535), 0, 65535).astype(np.uint16)
        # Default heights file is LOD 1 for instant responsive loading
        lod1_bin_path = os.path.join(out_dir, f"{sid}.bin")
        quant_250.tofile(lod1_bin_path)

        cov_status = "PARTIAL" if is_clipped else "COMPLETE"

        manifest = {
            "siteId": sid,
            "width": 250,
            "height": 250,
            "metersPerPixel": 80.0,
            "centerLat": lat,
            "centerLon": lon,
            "elevationUnit": "m",
            "referenceRadiusM": 1737400,
            "heightsFile": f"{sid}.bin",
            "minElevationM": round(min_e, 1),
            "maxElevationM": round(max_e, 1),
            "source": "lola",
            "demSource": "NASA_LOLA_LDEM_80S_20M",
            "encoding": "uint16",
            "coverageStatus": cov_status,
            "lodLevels": [
                {
                    "lod": 1,
                    "metersPerPixel": 80.0,
                    "width": 250,
                    "height": 250,
                    "heightsFile": f"{sid}.bin"
                },
                {
                    "lod": 0,
                    "metersPerPixel": 20.0,
                    "width": 1000,
                    "height": 1000,
                    "heightsFile": f"{sid}-lod0.bin"
                }
            ]
        }

        manifest_path = os.path.join(out_dir, f"{sid}.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        lod1_size_kb = os.path.getsize(lod1_bin_path) / 1024.0
        lod0_size_kb = os.path.getsize(lod0_bin_path) / 1024.0

        print(f"  Saved {sid}.json: {cov_status} | Elevation [{min_e:.1f}m, {max_e:.1f}m]")
        print(f"  LOD 1 (Overview, 80m/px): {lod1_bin_path} ({lod1_size_kb:.1f} KB)")
        print(f"  LOD 0 (Detail, 20m/px):   {lod0_bin_path} ({lod0_size_kb:.1f} KB)")

        summary.append({
            "siteId": sid,
            "status": cov_status,
            "minElevationM": round(min_e, 1),
            "maxElevationM": round(max_e, 1),
            "reliefM": round(max_e - min_e, 1),
            "lod1SizeKB": round(lod1_size_kb, 1),
            "lod0SizeKB": round(lod0_size_kb, 1)
        })

    summary_file = os.path.join(out_dir, "_terrain_summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"\nAll polar terrain tiles generated. Summary saved to {summary_file}")

if __name__ == "__main__":
    main()
