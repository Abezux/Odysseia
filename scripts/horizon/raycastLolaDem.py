#!/usr/bin/env python3
"""
scripts/horizon/raycastLolaDem.py

NASA LOLA Polar Digital Elevation Model (LDEM_80S_20M) Topographic Raycaster.
Generates authentic 360-bin topocentric horizon elevation profiles for lunar sites.

Physics & Geodesy:
- Polar stereographic projection centered at South Pole (-90° lat, 0° lon)
- Datum: Spherical Moon (R = 1,737,400.0 m)
- Coordinate System: Mean Earth / Polar Axis (ME) of DE421
- Sub-pixel bilinear interpolation of terrain elevations
- Rigorous lunar spherical curvature correction: Delta_h = d^2 / (2 * R)
- Observer elevation: Ground elevation + 2.0 m instrument height
- Boundary & nodata detection for partial coverage reporting
"""

import os
import sys
import json
import math
import time
import subprocess
import numpy as np

LUNAR_RADIUS_M = 1737400.0
MAP_SCALE_M = 20.0
LINE_OFFSET = 15199.5
SAMPLE_OFFSET = 15199.5
RASTER_SHAPE = (30400, 30400)
DEFAULT_OBSERVER_HEIGHT_M = 2.0

class LolaDemRaycaster:
    def __init__(self, raw_dem_path: str):
        if not os.path.exists(raw_dem_path):
            raise FileNotFoundError(f"Raw DEM file not found at {raw_dem_path}")
        self.dem = np.memmap(raw_dem_path, dtype='<i2', mode='r', shape=RASTER_SHAPE)
        print(f"[LolaDemRaycaster] Memory-mapped LOLA DEM ({RASTER_SHAPE[0]}x{RASTER_SHAPE[1]}, int16)")

    def latlon_to_xy(self, lat_deg: float, lon_deg: float):
        phi = math.radians(lat_deg)
        lam = math.radians(lon_deg)
        # Polar stereographic from South Pole (-90°)
        # r = 2 * R * tan((pi/2 + phi) / 2)
        r = 2.0 * LUNAR_RADIUS_M * math.tan((math.pi / 2.0 + phi) / 2.0)
        x = r * math.sin(lam)
        y = r * math.cos(lam)
        return x, y

    def xy_to_linesample(self, x: float, y: float):
        sample = SAMPLE_OFFSET + x / MAP_SCALE_M
        line = LINE_OFFSET - y / MAP_SCALE_M
        return line, sample

    def sample_elevation(self, line: float, sample: float):
        """Bilinear interpolation of terrain elevation in meters."""
        if line < 0 or line >= RASTER_SHAPE[0] - 1 or sample < 0 or sample >= RASTER_SHAPE[1] - 1:
            return None

        l0 = int(math.floor(line))
        l1 = l0 + 1
        s0 = int(math.floor(sample))
        s1 = s0 + 1

        wl = line - l0
        ws = sample - s0

        # Read 2x2 neighborhood
        v00 = float(self.dem[l0, s0])
        v01 = float(self.dem[l0, s1])
        v10 = float(self.dem[l1, s0])
        v11 = float(self.dem[l1, s1])

        # Check for LOLA nodata
        if v00 <= -32000 or v01 <= -32000 or v10 <= -32000 or v11 <= -32000:
            return None

        # Scaling factor: 0.5 m per LSB integer
        top = (1.0 - ws) * v00 + ws * v01
        bot = (1.0 - ws) * v10 + ws * v11
        val = (1.0 - wl) * top + wl * bot
        return val * 0.5

    def raycast_site(
        self,
        site_id: str,
        lat_deg: float,
        lon_deg: float,
        search_radius_km: float = 120.0,
        observer_height_m: float = DEFAULT_OBSERVER_HEIGHT_M
    ):
        x0, y0 = self.latlon_to_xy(lat_deg, lon_deg)
        line0, sample0 = self.xy_to_linesample(x0, y0)
        ground_elev = self.sample_elevation(line0, sample0)

        if ground_elev is None:
            raise ValueError(f"Site {site_id} ({lat_deg}, {lon_deg}) is outside valid LOLA DEM coverage!")

        observer_alt = ground_elev + observer_height_m
        search_radius_m = search_radius_km * 1000.0

        elev_deg_list = []
        max_dist_km_list = []
        real_bins_count = 0

        # Distance step parameters
        # Near (d < 5 km): step 10 m
        # Mid (5 km <= d < 30 km): step 25 m
        # Far (d >= 30 km): step 50 m
        step_near = 10.0
        step_mid = 25.0
        step_far = 50.0

        for az in range(360):
            az_rad = math.radians(az)
            # Local bearing: in polar stereographic projection,
            # local North points in direction of site's longitude lambda.
            # Local East points 90° clockwise.
            # Vector along azimuth az:
            # x(d) = x0 + d * sin(lon_rad + az_rad)
            # y(d) = y0 + d * cos(lon_rad + az_rad)
            site_lon_rad = math.radians(lon_deg)
            bearing_rad = site_lon_rad + az_rad

            sin_b = math.sin(bearing_rad)
            cos_b = math.cos(bearing_rad)

            max_el = -90.0
            dist_reached = 0.0
            is_bin_complete = True

            d = 20.0  # Start 20m from observer
            while d <= search_radius_m:
                xd = x0 + d * sin_b
                yd = y0 + d * cos_b

                ld, sd = self.xy_to_linesample(xd, yd)
                hd = self.sample_elevation(ld, sd)

                if hd is None:
                    # Exited DEM raster
                    is_bin_complete = False
                    break

                dist_reached = d

                # Curvature drop
                curv_drop = (d * d) / (2.0 * LUNAR_RADIUS_M)
                delta_h = hd - observer_alt - curv_drop
                el_rad = math.atan2(delta_h, d)
                el_deg = math.degrees(el_rad)

                if el_deg > max_el:
                    max_el = el_deg

                # Adaptive stepping
                if d < 5000.0:
                    d += step_near
                elif d < 30000.0:
                    d += step_mid
                else:
                    d += step_far

            # Check if this bin achieved meaningful coverage (>80% of search radius or >40km)
            if is_bin_complete or dist_reached >= min(search_radius_m * 0.8, 40000.0):
                real_bins_count += 1

            if max_el == -90.0:
                # Geometric smooth horizon fallback if completely missing
                d_horiz = math.sqrt(2.0 * LUNAR_RADIUS_M * observer_height_m)
                curv_drop = (d_horiz * d_horiz) / (2.0 * LUNAR_RADIUS_M)
                fallback_deg = math.degrees(math.atan2(-observer_height_m - curv_drop, d_horiz))
                elev_deg_list.append(round(fallback_deg, 3))
            else:
                elev_deg_list.append(round(max_el, 3))

            max_dist_km_list.append(round(dist_reached / 1000.0, 1))

        real_percent = round((real_bins_count / 360.0) * 100.0, 1)
        coverage_status = "COMPLETE" if real_percent >= 99.0 else "PARTIAL"

        return {
            "siteId": site_id,
            "azStepDeg": 1,
            "elevDeg": elev_deg_list,
            "searchRadiusKm": search_radius_km,
            "demSource": "NASA_LOLA_LDEM_80S_20M",
            "source": "lola",
            "coverageStatus": coverage_status,
            "realAzimuthBinPercent": real_percent,
            "observerHeightM": observer_height_m,
            "groundElevationM": round(ground_elev, 1),
            "maxDistancePerBinKm": max_dist_km_list
        }

def get_git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"]).decode().strip()
    except Exception:
        return "unknown"

def main():
    raw_dem_path = os.path.join(os.path.dirname(__file__), "../../data/raw/ldem_80s_20m.raw")
    if not os.path.exists(raw_dem_path):
        print(f"Error: Raw DEM file not ready at {raw_dem_path}")
        sys.exit(1)

    raycaster = LolaDemRaycaster(raw_dem_path)

    # Catalog sites
    catalog_path = os.path.join(os.path.dirname(__file__), "../../public/data/catalog.json")
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    sites = catalog.get("sites", catalog)

    # Radii for sensitivity sweep
    sweep_radii = [60.0, 120.0, 200.0, 300.0]
    optimal_radius = 120.0

    out_dir = os.path.join(os.path.dirname(__file__), "../../public/data/horizon")
    os.makedirs(out_dir, exist_ok=True)
    git_commit = get_git_commit()
    gen_date = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    polar_results = {}

    for site in sites:
        site_id = site["id"]
        lat = site["latDeg"] if "latDeg" in site else site["latitude"]
        lon = site["lonDeg"] if "lonDeg" in site else site["longitude"]

        if lat > -80.0:
            print(f"Skipping {site_id} (lat={lat:.2f} > -80°S, outside LOLA 80S coverage)")
            continue

        print(f"\n==================================================")
        print(f"Processing Polar Site: {site_id} (lat={lat:.2f}°, lon={lon:.2f}°)")
        print(f"==================================================")

        # 1. Sweep across radii
        sweep_data = {}
        for r in sweep_radii:
            t0 = time.time()
            profile = raycaster.raycast_site(site_id, lat, lon, search_radius_km=r)
            elapsed = time.time() - t0
            sweep_data[r] = profile
            print(f"  Radius {r:5.0f} km: min={min(profile['elevDeg']):.2f}°, max={max(profile['elevDeg']):.2f}°, realBins={profile['realAzimuthBinPercent']}%, time={elapsed:.2f}s")

        polar_results[site_id] = sweep_data

        # 2. Save production profile at optimal radius
        prod_profile = sweep_data[optimal_radius]
        prod_profile["generationDate"] = gen_date
        prod_profile["gitCommit"] = git_commit

        out_path = os.path.join(out_dir, f"{site_id}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(prod_profile, f, indent=2)
        print(f"Saved production profile to {out_path} ({prod_profile['coverageStatus']} - {prod_profile['realAzimuthBinPercent']}%)")

    # Output summary JSON for sensitivity analysis and validation docs
    summary_path = os.path.join(out_dir, "_sweep_summary.json")
    # Simplify summary
    simplified = {}
    for sid, sdata in polar_results.items():
        simplified[sid] = {}
        for r, p in sdata.items():
            simplified[sid][str(r)] = {
                "minElev": min(p["elevDeg"]),
                "maxElev": max(p["elevDeg"]),
                "meanElev": round(float(np.mean(p["elevDeg"])), 3),
                "coverageStatus": p["coverageStatus"],
                "realAzimuthBinPercent": p["realAzimuthBinPercent"],
                "elevDeg": p["elevDeg"]
            }

    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(simplified, f, indent=2)
    print(f"\nSaved sweep summary to {summary_path}")

if __name__ == "__main__":
    main()
