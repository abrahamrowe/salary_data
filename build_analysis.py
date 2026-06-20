#!/usr/bin/env python3
"""
Generate Datawrapper-ready CSVs from the built site data.

Reads salary-benchmarks/data.js (the same cleaned, anonymized records the website
uses) and writes aggregate salary tables to analysis/ — by cause area, skill, and
location, broken down by seniority. All figures are USD, using the same midpoint
percentile method as the site, so the numbers match the page exactly.

Run:  python3 build_analysis.py
"""
import csv
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_JS = os.path.join(HERE, "salary-benchmarks", "data.js")
OUT_DIR = os.path.join(HERE, "analysis")

SMALL_N = 5  # in the chart-ready "median" sheets, blank cells thinner than this
SENIORITY = ["Junior", "Mid", "Senior"]


def load():
    txt = open(DATA_JS, encoding="utf-8").read()
    payload = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
    return payload["meta"], payload["records"]


def percentile(vals, p):
    n = len(vals)
    if n == 0:
        return None
    if n == 1:
        return vals[0]
    idx = (n - 1) * p
    lo, hi = math.floor(idx), math.ceil(idx)
    if lo == hi:
        return vals[lo]
    return vals[lo] + (vals[hi] - vals[lo]) * (idx - lo)


def main():
    meta, records = load()
    usd_per_unit = meta["usdPerUnit"]  # value of 1 unit of currency in USD

    # midpoint salary in USD for each record
    for r in records:
        mid = (r["lo"] + r["hi"]) / 2.0
        r["_usd"] = mid * usd_per_unit[r["cu"]]

    def stats(recs):
        mids = sorted(r["_usd"] for r in recs)
        return {
            "n": len(mids),
            "p10": percentile(mids, 0.10),
            "p25": percentile(mids, 0.25),
            "p50": percentile(mids, 0.50),
            "p75": percentile(mids, 0.75),
            "p90": percentile(mids, 0.90),
        }

    def rnd(v):
        return "" if v is None else int(round(v))

    # dimension: (file slug, column header, function -> list of categories a record belongs to, ordered category list)
    dims = [
        ("cause_area", "Cause area", lambda r: [r["c"]], meta["causeAreas"]),
        ("skills", "Skill", lambda r: r["s"], meta["skills"]),
        ("location", "Location", lambda r: r["l"], meta["locations"]),
    ]

    os.makedirs(OUT_DIR, exist_ok=True)
    blanked = []
    full_rows = []

    for slug, header, keyfn, cats in dims:
        # group records per category for this dimension
        by_cat = {c: [] for c in cats}
        for r in records:
            for c in keyfn(r):
                if c in by_cat:
                    by_cat[c].append(r)

        # compute per category: All + per seniority
        rows = []
        for c in cats:
            recs = by_cat[c]
            s_all = stats(recs)
            per = {sen: stats([r for r in recs if sen in r["e"]]) for sen in SENIORITY}
            rows.append((c, s_all, per))

        # sort categories by overall median (desc); categories with no jobs last
        rows.sort(key=lambda x: (x[1]["p50"] is None, -(x[1]["p50"] or 0)))

        # 1) chart-ready: median salary by seniority (grouped bar / column)
        with open(os.path.join(OUT_DIR, f"median_salary_by_{slug}.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow([header, "Junior", "Mid", "Senior", "All roles"])
            for c, s_all, per in rows:
                cells = []
                for sen in SENIORITY:
                    st = per[sen]
                    if 0 < st["n"] < SMALL_N:
                        cells.append("")  # too few to chart a meaningful median
                        blanked.append(f"{header} / {c} / {sen} (n={st['n']})")
                    else:
                        cells.append(rnd(st["p50"]))
                w.writerow([c] + cells + [rnd(s_all["p50"])])

        # 2) chart-ready: salary spread for all roles (range / dot plot)
        with open(os.path.join(OUT_DIR, f"salary_ranges_by_{slug}.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow([header, "Jobs", "25th percentile", "Median", "75th percentile"])
            for c, s_all, per in rows:
                w.writerow([c, s_all["n"], rnd(s_all["p25"]), rnd(s_all["p50"]), rnd(s_all["p75"])])

        # accumulate the full long-format breakdown
        for c, s_all, per in rows:
            for sen in SENIORITY:
                st = per[sen]
                full_rows.append([header, c, sen, st["n"], rnd(st["p10"]), rnd(st["p25"]),
                                  rnd(st["p50"]), rnd(st["p75"]), rnd(st["p90"])])
            full_rows.append([header, c, "All roles", s_all["n"], rnd(s_all["p10"]), rnd(s_all["p25"]),
                              rnd(s_all["p50"]), rnd(s_all["p75"]), rnd(s_all["p90"])])

    # 3) full breakdown (long / tidy) — every dimension, category, seniority
    with open(os.path.join(OUT_DIR, "full_breakdown.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Dimension", "Category", "Seniority", "Jobs",
                    "10th", "25th", "Median", "75th", "90th"])
        w.writerows(full_rows)

    rate = meta["unitsPerUsd"]
    print(f"Wrote CSVs to {OUT_DIR}/")
    print(f"  {len(records)} jobs · USD · rates as of {meta['rateDate']} "
          f"(1 USD = {rate['GBP']} GBP = {rate['EUR']} EUR)")
    print(f"  blanked {len(blanked)} small (<{SMALL_N}) cells in the median sheets:")
    for b in blanked:
        print(f"    - {b}")


if __name__ == "__main__":
    main()
