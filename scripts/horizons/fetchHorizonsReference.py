#!/usr/bin/env python3
"""
scripts/horizons/fetchHorizonsReference.py

Queries the NASA JPL Horizons API for 5 independent benchmark test coordinates
(including lat = -89.9° and -90.0° south pole cases) across 4 lunar phases,
producing golden validation fixtures for offline unit testing.
"""

import urllib.request
import urllib.parse
import json
import os
import re
import datetime

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
        "id": "apollo_11",
        "name": "Apollo 11 Tranquillity Base",
        "lat": 0.67408,
        "lon": 23.47297,
        "elev_km": -2.574
    },
    {
        "id": "malapert_massif",
        "name": "Malapert Massif",
        "lat": -85.99,
        "lon": 2.94,
        "elev_km": 5.0
    },
    {
        "id": "chandrayaan_3",
        "name": "Chandrayaan-3 Shiv Shakti Point",
        "lat": -69.373,
        "lon": 32.319,
        "elev_km": -1.8
    }
]

TEST_DATES = [
    "2026-06-01 00:00",
    "2026-06-08 00:00",
    "2026-06-15 00:00",
    "2026-06-22 00:00"
]

def query_horizons(command_id: str, lon: float, lat: float, elev_km: float, date_str: str):
    """Queries JPL Horizons API for apparent topocentric Azimuth and Elevation."""
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
    req = urllib.request.Request(url, headers={"User-Agent": "LunarSiteCompare-Validator/1.0"})
    
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        res_text = data.get("result", "")
        
        soe_idx = res_text.find("$$SOE")
        eoe_idx = res_text.find("$$EOE")
        if soe_idx == -1 or eoe_idx == -1:
            raise ValueError(f"No ephemeris data block found in Horizons response for {command_id} at {lat},{lon}")
        
        table_str = res_text[soe_idx + 5:eoe_idx].strip()
        lines = [line.strip() for line in table_str.splitlines() if line.strip()]
        if not lines:
            raise ValueError("Empty ephemeris table")
        
        # Take first line corresponding to the start timestamp
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

def main():
    print("[fetchHorizonsReference] Querying NASA JPL Horizons for golden fixtures...")
    fixtures = []
    
    for site in TEST_SITES:
        print(f"  Fetching for site: {site['id']} ({site['lat']}°, {site['lon']}°)...")
        for date_str in TEST_DATES:
            iso_date = date_str.replace(" ", "T") + ":00.000Z"
            
            # Fetch Sun (Command 10)
            sun_az, sun_el = query_horizons("10", site["lon"], site["lat"], site["elev_km"], date_str)
            
            # Fetch Earth (Command 399)
            earth_az, earth_el = query_horizons("399", site["lon"], site["lat"], site["elev_km"], date_str)
            
            fixtures.append({
                "siteId": site["id"],
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
    
    out_dir = os.path.join(os.path.dirname(__file__), "../../tests/fixtures/horizons")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "horizons_golden.json")
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "generatedAt": "2026-11-14T11:00:00Z",
            "source": "NASA JPL Horizons On-Line Ephemeris System (DE441)",
            "benchmarkCount": len(fixtures),
            "fixtures": fixtures
        }, f, indent=2)
    
    print(f"[fetchHorizonsReference] Successfully saved {len(fixtures)} golden fixtures to {out_path}")

if __name__ == "__main__":
    main()
