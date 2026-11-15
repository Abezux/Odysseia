#!/usr/bin/env python3
"""
scripts/horizons/fetchHorizonsReference.py

Queries the NASA JPL Horizons REST API for 10 independent selenographic sites
(including south polar candidate sites, exact pole singularity, equatorial,
and farside locations) across 10 distinct astronomical dates throughout 2026,
producing an expanded 100-fixture golden validation dataset (400 observables).
"""

import urllib.request
import urllib.parse
import json
import os
import re
import datetime
import time

HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"

TEST_SITES = [
    {
        "id": "shackleton_rim",
        "name": "Shackleton Crater Rim",
        "lat": -89.9,
        "lon": 0.0,
        "elev_km": 1.25
    },
    {
        "id": "exact_south_pole",
        "name": "Exact Lunar South Pole",
        "lat": -90.0,
        "lon": 0.0,
        "elev_km": 0.0
    },
    {
        "id": "connecting_ridge",
        "name": "Connecting Ridge Peak",
        "lat": -89.44,
        "lon": -137.5,
        "elev_km": 1.68
    },
    {
        "id": "malapert_massif",
        "name": "Malapert Massif Peak",
        "lat": -85.99,
        "lon": 2.94,
        "elev_km": 5.0
    },
    {
        "id": "haworth_crater",
        "name": "Haworth Crater Floor (PSR)",
        "lat": -87.4,
        "lon": -5.1,
        "elev_km": -3.5
    },
    {
        "id": "nobile_rim_1",
        "name": "Nobile Rim 1 (VIPER / Artemis)",
        "lat": -85.2,
        "lon": 35.8,
        "elev_km": 4.2
    },
    {
        "id": "im_1_odysseus",
        "name": "IM-1 Odysseus Landing Site",
        "lat": -80.13,
        "lon": 1.44,
        "elev_km": 2.4
    },
    {
        "id": "chandrayaan_3",
        "name": "Chandrayaan-3 Shiv Shakti Point",
        "lat": -69.373,
        "lon": 32.319,
        "elev_km": -1.8
    },
    {
        "id": "apollo_11",
        "name": "Apollo 11 Tranquillity Base",
        "lat": 0.67408,
        "lon": 23.47297,
        "elev_km": -2.574
    },
    {
        "id": "change_4",
        "name": "Chang'e 4 Von Kármán (Farside)",
        "lat": -45.4446,
        "lon": 177.5991,
        "elev_km": -5.9
    }
]

TEST_DATES = [
    "2026-01-15 12:00",
    "2026-02-28 06:00",
    "2026-03-20 18:00",
    "2026-04-15 00:00",
    "2026-06-01 00:00",
    "2026-06-21 12:00",
    "2026-08-15 06:00",
    "2026-09-23 00:00",
    "2026-11-15 12:00",
    "2026-12-21 18:00"
]


def query_horizons(command_id: str, lon: float, lat: float, elev_km: float, date_str: str):
    """Queries JPL Horizons REST API for topocentric apparent Azimuth and Elevation."""
    start_dt = datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M")
    stop_dt = start_dt + datetime.timedelta(hours=1)
    stop_str = stop_dt.strftime("%Y-%m-%d %H:%M")

    params = {
        "format": "json",
        "COMMAND": f"'{command_id}'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon},{lat},{elev_km}'",
        "START_TIME": f"'{date_str}'",
        "STOP_TIME": f"'{stop_str}'",
        "STEP_SIZE": "'1 h'",
        "QUANTITIES": "'4'"
    }

    url = HORIZONS_URL + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "LunarSiteCompare-Validator/2.0"})

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                res_text = data.get("result", "")

                soe_idx = res_text.find("$$SOE")
                eoe_idx = res_text.find("$$EOE")
                if soe_idx == -1 or eoe_idx == -1:
                    raise ValueError(f"No ephemeris block in Horizons response: {command_id} at {lat},{lon}")

                table_str = res_text[soe_idx + 5:eoe_idx].strip()
                lines = [line.strip() for line in table_str.splitlines() if line.strip()]
                if not lines:
                    raise ValueError("Empty ephemeris table")

                tokens = re.split(r"\s+", lines[0])
                nums = []
                for t in tokens:
                    try:
                        nums.append(float(t))
                    except ValueError:
                        continue

                if len(nums) < 2:
                    raise ValueError(f"Unable to parse azimuth and elevation from line: {lines[0]}")

                azimuth_deg = nums[-2]
                elevation_deg = nums[-1]
                return azimuth_deg, elevation_deg
        except Exception as e:
            if attempt == 2:
                raise e
            time.sleep(1.0)


def main():
    print(f"[fetchHorizonsReference] Querying NASA JPL Horizons for {len(TEST_SITES)} sites x {len(TEST_DATES)} dates (100 benchmark points)...")
    fixtures = []
    total = len(TEST_SITES) * len(TEST_DATES)
    count = 0

    for site in TEST_SITES:
        print(f"  Fetching for site: {site['id']} ({site['lat']}°N, {site['lon']}°E)...")
        for date_str in TEST_DATES:
            iso_date = date_str.replace(" ", "T") + ":00.000Z"

            # Query Sun (Command 10)
            sun_az, sun_el = query_horizons("10", site["lon"], site["lat"], site["elev_km"], date_str)

            # Query Earth (Command 399)
            earth_az, earth_el = query_horizons("399", site["lon"], site["lat"], site["elev_km"], date_str)

            fixtures.append({
                "siteId": site["id"],
                "siteName": site["name"],
                "latDeg": site["lat"],
                "lonDeg": site["lon"],
                "elevationM": site["elev_km"] * 1000.0,
                "timestampIso": iso_date,
                "horizons": {
                    "sun": {
                        "azimuthDeg": sun_az,
                        "elevationDeg": sun_el
                    },
                    "earth": {
                        "azimuthDeg": earth_az,
                        "elevationDeg": earth_el
                    }
                }
            })
            count += 1
            if count % 10 == 0:
                print(f"    Progress: {count}/{total} points retrieved...")

    out_dir = os.path.join(os.path.dirname(__file__), "../../tests/fixtures/horizons")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "horizons_golden.json")

    output = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": "NASA JPL Horizons On-Line Ephemeris System (DE441/LE441)",
        "benchmarkCount": len(fixtures),
        "observableCount": len(fixtures) * 4,
        "sites": [s["id"] for s in TEST_SITES],
        "dates": TEST_DATES,
        "timeScale": "UTC (Horizons input UT / astronomy-engine TT conversion)",
        "fixtures": fixtures
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Successfully generated {len(fixtures)} benchmark fixtures in {out_path} ({os.path.getsize(out_path):,} bytes).")


if __name__ == "__main__":
    main()
