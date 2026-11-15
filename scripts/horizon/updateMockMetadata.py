#!/usr/bin/env python3
"""
scripts/horizon/updateMockMetadata.py

Updates metadata for the 12 non-polar lunar sites outside LOLA 80S coverage.
Explicitly labels them with:
  source: "mock"
  demSource: "MOCK HORIZON (OUTSIDE LOLA 80S)"
  coverageStatus: "SYNTHETIC"
  realAzimuthBinPercent: 0.0
  observerHeightM: 2.0
"""

import os
import json

NON_POLAR_SITES = [
    "apollo-11",
    "apollo-12",
    "apollo-14",
    "apollo-15",
    "apollo-16",
    "apollo-17",
    "blue-ghost-1",
    "chandrayaan-3",
    "change-4",
    "change-5",
    "change-6",
    "slim"
]

def main():
    horizon_dir = os.path.join(os.path.dirname(__file__), "../../public/data/horizon")
    for site_id in NON_POLAR_SITES:
        filepath = os.path.join(horizon_dir, f"{site_id}.json")
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found")
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        data["source"] = "mock"
        data["demSource"] = "MOCK HORIZON (OUTSIDE LOLA 80S)"
        data["coverageStatus"] = "SYNTHETIC"
        data["realAzimuthBinPercent"] = 0.0
        data["observerHeightM"] = 2.0

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Updated mock metadata for {site_id}")

if __name__ == "__main__":
    main()
