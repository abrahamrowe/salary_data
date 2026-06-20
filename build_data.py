#!/usr/bin/env python3
"""
Build script: reads salary_data.xlsx, cleans/normalizes the data, and writes
salary-benchmarks/data.js (a JS file that sets window.SALARY_DATA so the site
works on file:// and GitHub Pages without any fetch/CORS issues).

Run:  python3 build_data.py
"""
import json
import os
from collections import Counter

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_XLSX = os.path.join(HERE, "salary_data.xlsx")
OUT = os.path.join(HERE, "salary-benchmarks", "data.js")

# ----- Exchange rates: mid-market, units of currency per 1 USD -----
# Update these and RATE_DATE whenever you refresh the rates, then rerun this script.
RATE_DATE = "2026-06-20"
UNITS_PER_USD = {
    "USD": 1.0,
    "GBP": 0.7557,  # mid-market USD->GBP (Wise/Xe/TradingEconomics consensus, 2026-06-20)
    "EUR": 0.8718,  # mid-market USD->EUR (Wise/Xe/TradingEconomics consensus, 2026-06-20)
}

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


def main():
    usd_per_unit = {c: 1.0 / v for c, v in UNITS_PER_USD.items()}

    wb = openpyxl.load_workbook(DATA_XLSX, data_only=True)
    ws = wb["All data"]
    raw = [r for r in ws.iter_rows(min_row=2, values_only=True) if any(c is not None for c in r)]
    wb.close()

    records = []
    skill_counter = Counter()
    cause_counter = Counter()
    dropped = 0
    date_min = None
    date_max = None

    for r in raw:
        cause = r[4]
        date_pub = r[2]
        exp = r[5]
        skill = r[6]
        city = r[7]
        country = r[8]
        low = r[9]
        high = r[10]
        cur = r[11]

        # Must have a usable salary range, currency, experience and cause area
        if low is None or high is None or cur not in UNITS_PER_USD or not exp or not cause:
            dropped += 1
            continue

        low = float(low)
        high = float(high)
        if low > high:  # fix the handful of swapped rows
            low, high = high, low

        buckets = seniority_buckets(exp)
        if not buckets:
            dropped += 1
            continue

        # track date range over the jobs we actually keep
        if date_pub is not None and hasattr(date_pub, "year"):
            if date_min is None or date_pub < date_min:
                date_min = date_pub
            if date_max is None or date_pub > date_max:
                date_max = date_pub

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

    def label(d):
        return d.strftime("%b %Y") if d else ""

    meta = {
        "totalJobs": len(records),
        "rateDate": RATE_DATE,
        "unitsPerUsd": {k: round(v, 4) for k, v in UNITS_PER_USD.items()},
        "usdPerUnit": {k: round(v, 6) for k, v in usd_per_unit.items()},
        "dateMin": date_min.strftime("%Y-%m-%d") if date_min else None,
        "dateMax": date_max.strftime("%Y-%m-%d") if date_max else None,
        "dateRangeLabel": (label(date_min) + " – " + label(date_max)) if date_min else "",
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
    print(f"  date range: {meta['dateRangeLabel']}  ({meta['dateMin']} .. {meta['dateMax']})")
    print(f"  cause areas: {len(causes)}  skills: {len(skills)}")
    print(f"  rates (units per USD) as of {RATE_DATE}: {UNITS_PER_USD}")


if __name__ == "__main__":
    main()
