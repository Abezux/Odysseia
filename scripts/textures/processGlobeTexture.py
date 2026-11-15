#!/usr/bin/env python3
"""
processGlobeTexture.py - Prepares Web-optimized NASA LROC Global Lunar Textures

Source: NASA Scientific Visualization Studio (SVS) - Studio Ernie Wright: CGI Moon Kit (SVS 4720)
Original Product: lroc_color_poles_4k.tif (4096 x 2048 Equirectangular Color / Albedo Mosaic)
Credit: NASA / GSFC / Arizona State University (LROC) / Ernie Wright
License: NASA Open Data Policy / Public Domain (U.S. Government Work)

Outputs:
  - public/textures/moon-lroc-wac-4k.webp (~1.19 MB)
  - public/textures/moon-lroc-wac-2k.webp (~282 KB)
  - public/textures/moon-texture-manifest.json
"""

import os
import sys
import json
import subprocess
from datetime import datetime, timezone
from PIL import Image

RAW_DIR = "data/raw"
OUTPUT_DIR = "public/textures"
SOURCE_TIF = os.path.join(RAW_DIR, "lroc_color_poles_4k.tif")
SVS_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif"


def get_git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
    except Exception:
        return "unknown"


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if not os.path.exists(SOURCE_TIF):
        print(f"Downloading raw 4K LROC texture from {SVS_URL}...")
        cmd = ["aria2c", "-x", "8", "-s", "8", "-k", "1M", "-c", "-d", RAW_DIR, "-o", "lroc_color_poles_4k.tif", SVS_URL]
        subprocess.check_call(cmd)

    print(f"Opening {SOURCE_TIF}...")
    img = Image.open(SOURCE_TIF)
    w, h = img.size
    print(f"Source image loaded: {w}x{h}, mode={img.mode}")

    # 1. 4K WebP export (quality=85, method=6)
    out_4k = os.path.join(OUTPUT_DIR, "moon-lroc-wac-4k.webp")
    print(f"Generating 4K WebP: {out_4k}...")
    img.save(out_4k, "WEBP", quality=85, method=6)
    size_4k = os.path.getsize(out_4k)
    print(f"4K WebP generated: {size_4k / (1024 * 1024):.2f} MB ({size_4k:,} bytes)")

    # 2. 2K WebP export (quality=85, method=6)
    out_2k = os.path.join(OUTPUT_DIR, "moon-lroc-wac-2k.webp")
    print(f"Generating 2K WebP: {out_2k}...")
    img_2k = img.resize((2048, 1024), Image.Resampling.LANCZOS)
    img_2k.save(out_2k, "WEBP", quality=85, method=6)
    size_2k = os.path.getsize(out_2k)
    print(f"2K WebP generated: {size_2k / 1024:.1f} KB ({size_2k:,} bytes)")

    # 3. Metadata manifest
    manifest = {
        "datasetName": "NASA SVS Lunar Reconnaissance Orbiter Camera (LROC) Global Morphology Mosaic",
        "productId": "LROC_COLOR_POLES_4K",
        "svsId": 4720,
        "sourceUrl": SVS_URL,
        "license": "Public Domain (NASA Open Data Policy / U.S. Government Work)",
        "attribution": "NASA/GSFC/Arizona State University (LROC) / Ernie Wright (NASA SVS)",
        "projection": "Equirectangular (ME frame)",
        "bounds": {
            "minLonDeg": -180.0,
            "maxLonDeg": 180.0,
            "minLatDeg": -90.0,
            "maxLatDeg": 90.0
        },
        "primeMeridianPosition": "center (x = width / 2, u = 0.5)",
        "resolution": {
            "lod0": {"width": 4096, "height": 2048, "file": "moon-lroc-wac-4k.webp", "bytes": size_4k},
            "lod1": {"width": 2048, "height": 1024, "file": "moon-lroc-wac-2k.webp", "bytes": size_2k}
        },
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "gitCommit": get_git_commit()
    }

    manifest_path = os.path.join(OUTPUT_DIR, "moon-texture-manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest saved to {manifest_path}")


if __name__ == "__main__":
    main()
