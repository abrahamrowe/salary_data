# High Impact Jobs Salary Benchmarks

A static web app that shows salary percentiles (junior / mid / senior) from a
dataset of high-impact job postings, with filters for cause area, skill set, and
location, and a currency toggle (USD / GBP / EUR). No backend — it runs entirely
in the browser and is hosted on GitHub Pages.

**Live site:** _add your GitHub Pages URL here once deployed._

---

## What it does

- Table of **Junior, Mid, Senior** (and an "All roles" total) showing the 10th,
  25th, median, 75th and 90th percentiles, plus a "typical advertised range" and
  the number of jobs sampled.
- A box-and-whisker **chart** of the ranges by seniority.
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

## Project layout

```
salary-benchmarks/      ← the deployable static site
  index.html
  styles.css
  app.js
  data.js               ← generated; sets window.SALARY_DATA
build_data.py           ← regenerates salary-benchmarks/data.js from the xlsx
serve.py                ← local preview server
.github/workflows/      ← GitHub Pages deploy workflow
salary_data.xlsx        ← raw source (git-ignored; keep local)
```

> **Privacy note:** `data.js` is anonymized — it contains salary ranges, cause
> area, skills, seniority and location tags, but **not** organization names, job
> titles, or links. The raw `salary_data.xlsx` does contain those, so it is
> git-ignored by default. Don't commit it to a public repo.

---

## Run locally

```bash
python3 serve.py
# open http://127.0.0.1:8765
```

(Or just open `salary-benchmarks/index.html` directly — the data is embedded as
JS, so it works from `file://` too.)

## Rebuild the data

After editing `salary_data.xlsx`:

```bash
pip3 install openpyxl       # one-time
python3 build_data.py       # rewrites salary-benchmarks/data.js
```

### Updating exchange rates

Rates are mid-market values baked into the site at build time. To refresh them,
edit `UNITS_PER_USD` and `RATE_DATE` near the top of `build_data.py` (values are
units of each currency per 1 USD), then rerun `python3 build_data.py`. The date
you set is shown to users on the page.

---

## Deploy to GitHub Pages

A workflow is included at `.github/workflows/deploy.yml` that publishes the
`salary-benchmarks/` folder on every push to `main`.

1. Create a new empty repo on GitHub (e.g. `salary-benchmarks`).
2. From this folder:
   ```bash
   git init
   git add .
   git commit -m "Salary benchmarks web app"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The Actions tab will show the deploy; when it's green, your site is live at
   `https://<you>.github.io/<repo>/`.

(If you prefer no Actions: move the four files from `salary-benchmarks/` into a
`docs/` folder, push, then set **Settings → Pages → Source: Deploy from a branch →
main → /docs**.)
