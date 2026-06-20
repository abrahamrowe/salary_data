# High Impact Jobs Salary Benchmarks

A static web app that shows salary percentiles (junior / mid / senior) from a
dataset of high-impact job postings, with filters for cause area, skill set, and
location, and a currency toggle (USD / GBP / EUR). No backend — it runs entirely
in the browser, so it can be served from any static host.

---

## What it does

- Two tabs, sharing the same filters and currency toggle:
  - **Benchmarks** — a table of Junior / Mid / Senior (and an "All roles" total)
    showing the 10th, 25th, median, 75th and 90th percentiles, a "typical
    advertised range", and the number of jobs sampled, plus a box-and-whisker chart.
  - **Job listings** — every filtered job, sortable, with title (linked to the
    posting), organization, cause area, seniority, skills, location, salary range
    in the selected currency, and posting date.
- **Filters** (all multi-select): Cause area, Skill set, Location
  (San Francisco Bay Area, Washington DC, London, UK, USA, EU).
- **Currency** toggle (USD default), converted at mid-market rates shown on the page.

### How the numbers are calculated
- Percentiles use each job's **midpoint** (average of advertised low and high),
  converted to the selected currency.
- "Typical advertised range" = median of advertised lows → median of advertised highs.
- A job open to several seniority levels is counted in each, so "All roles" is not
  the sum of the rows.
- Filters: AND across categories, OR within a category.

---

## How it's built

```
salary-benchmarks/      ← the static site (deploy this folder)
  index.html
  styles.css
  app.js                ← all logic; reads window.SALARY_DATA
  data.js               ← generated; sets window.SALARY_DATA
build_data.py           ← regenerates salary-benchmarks/data.js from the xlsx
serve.py                ← local preview server
salary_data.xlsx        ← raw source (git-ignored; the source of truth)
```

The data is embedded as a JS file (`data.js` sets `window.SALARY_DATA`) rather than
fetched, so the site works both when served and when opened directly from
`file://`. `app.js` does all filtering, percentile math, currency conversion, and
rendering client-side; there is no server or build step beyond regenerating
`data.js`.

> **Note on what's published:** `data.js` includes each job's title,
> organization, and link to the (public) posting, since the Job listings tab
> displays them. The raw `salary_data.xlsx` is git-ignored to keep a single source
> of truth in the repo.

### Run locally

```bash
python3 serve.py        # then open http://127.0.0.1:8765
```

(Or just open `salary-benchmarks/index.html` directly.)

### Rebuild the data

After editing `salary_data.xlsx`:

```bash
pip3 install openpyxl    # one-time
python3 build_data.py    # rewrites salary-benchmarks/data.js
```

### Exchange rates

Rates are mid-market values baked in at build time. To refresh them, edit
`UNITS_PER_USD` and `RATE_DATE` near the top of `build_data.py` (values are units
of each currency per 1 USD), then rerun `python3 build_data.py`. The date you set
is shown to users on the page.
