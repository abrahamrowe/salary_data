#!/usr/bin/env python3
"""
Build script: reads salary_data.xlsx and Horizon Salary Benchmarking.xlsx,
cleans/normalizes the data, and writes salary-benchmarks/data.js
(a JS file that sets window.SALARY_DATA so the site works on file:// and GitHub Pages
without any fetch/CORS issues).

Run:  python3 build_data.py
"""
import json
import os
from collections import Counter

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_XLSX = os.path.join(HERE, "salary_data.xlsx")
RATES_XLSX = os.path.join(HERE, "Horizon Salary Benchmarking.xlsx")
OUT = os.path.join(HERE, "salary-benchmarks", "data.js")

# ----- date the data was built (passed in / hardcoded; no Date.now in static site) -----
GENERATED = "2026-06-20"

# Column order in the "All data" sheet (0-indexed within the row tuple)
# 0 Job Title | 1 Organization | 2 Date Published | 3 Job Link | 4 Cause Area
# 5 Experience | 6 Skill Set | 7 City and State | 8 Country
# 9 Salary - Low | 10 Salary High | 11 Salary Currency

# Canonical skill name normalization (merge case/duplicate variants)
SKILL_CANON = {
    "information security": "Information Security",
}

# Fixed location filter options (order shown in UI)
LOCATIONS = [
    "San Francisco Bay Area",
    "Washington DC",
    "London",
    "UK",
    "USA",
    "EU",
]


def canon_skill(tok):
    t = tok.strip()
    return SKILL_CANON.get(t.lower(), t)


def seniority_buckets(exp):
    """Map the (comma-separated) Experience field to one or more buckets."""
    e = (exp or "").lower()
    out = []
    if "junior" in e or "entry" in e:
        out.append("Junior")
    if "mid" in e:
        out.append("Mid")
    if "senior" in e:
        out.append("Senior")
    return out


def location_tags(city, country):
    """Which of the six location filters does this job satisfy?"""
    tags = []
    cl = (city or "").lower()
    if "san francisco" in cl:
        tags.append("San Francisco Bay Area")
    if "washington" in cl:  # dataset only uses 'Washington DC' (Seattle uses 'WA')
        tags.append("Washington DC")
    if "london" in cl:
        tags.append("London")
    co = (country or "").strip()
    if co == "UK":
        tags.append("UK")
    if co == "USA":
        tags.append("USA")
    if co == "EU":
        tags.append("EU")
    return tags


def load_rates():
    wb = openpyxl.load_workbook(RATES_XLSX, data_only=True)
    ws = wb["Exchange Rates"]
    rows = list(ws.iter_rows(values_only=True))
    # header: ('currency','Cur/USD','cur/GBP',...) -> col1 = units of <currency> per 1 USD
    units_per_usd = {}
    for r in rows[1:]:
        if r and r[0] in ("USD", "GBP", "EUR"):
            units_per_usd[r[0]] = float(r[1])
    wb.close()
    # usd_per_unit[c] = value of 1 unit of currency c expressed in USD
    usd_per_unit = {c: 1.0 / v for c, v in units_per_usd.items()}
    return units_per_usd, usd_per_unit


def main():
    units_per_usd, usd_per_unit = load_rates()

    wb = openpyxl.load_workbook(DATA_XLSX, data_only=True)
    ws = wb["All data"]
    raw = [r for r in ws.iter_rows(min_row=2, values_only=True) if any(c is not None for c in r)]
    wb.close()

    records = []
    skill_counter = Counter()
    cause_counter = Counter()
    dropped = 0

    for r in raw:
        cause = r[4]
        exp = r[5]
        skill = r[6]
        city = r[7]
        country = r[8]
        low = r[9]
        high = r[10]
        cur = r[11]

        # Must have a usable salary range, currency, experience and cause area
        if low is None or high is None or cur not in usd_per_unit or not exp or not cause:
            dropped += 1
            continue

        low = float(low)
        high = float(high)
        if low > high:  # fix the 12 swapped rows
            low, high = high, low

        buckets = seniority_buckets(exp)
        if not buckets:
            dropped += 1
            continue

        skills = sorted({canon_skill(t) for t in str(skill).split(",") if t.strip()}) if skill else []
        for s in skills:
            skill_counter[s] += 1
        cause_counter[cause] += 1

        records.append({
            "c": cause,
            "s": skills,
            "e": buckets,
            "l": location_tags(city, country),
            "lo": round(low, 2),
            "hi": round(high, 2),
            "cu": cur,
        })

    # Filter option lists
    causes = sorted(cause_counter, key=lambda x: (x == "Other", -cause_counter[x], x))
    skills = sorted(skill_counter)

    meta = {
        "generated": GENERATED,
        "totalJobs": len(records),
        "dropped": dropped,
        "unitsPerUsd": units_per_usd,   # how many units of currency per 1 USD (from Horizon sheet)
        "usdPerUnit": {k: round(v, 6) for k, v in usd_per_unit.items()},
        "causeAreas": causes,
        "skills": skills,
        "locations": LOCATIONS,
    }

    payload = {"meta": meta, "records": records}

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        f.write("// Auto-generated by build_data.py — do not edit by hand.\n")
        f.write("window.SALARY_DATA = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print(f"Wrote {OUT}")
    print(f"  records: {len(records)}  dropped: {dropped}")
    print(f"  cause areas: {len(causes)}  skills: {len(skills)}")
    print(f"  rates (units per USD): {units_per_usd}")
    print(f"  cause counts: {dict(cause_counter)}")


if __name__ == "__main__":
    main()
