# Salary analysis sheets (for Datawrapper)

Aggregate salary tables generated from the site data by `build_analysis.py`.
All figures are **USD**, using the same method as the website: each job's
**midpoint** (average of advertised low and high) converted to USD, then
percentiles taken across jobs. Numbers match the page exactly.

Rates: 1 USD = 0.7557 GBP = 0.8718 EUR (as of 2026-06-20).

To regenerate after the data changes: `python3 build_analysis.py`.

## Files & which chart to use

| File | Shape | Datawrapper chart |
|---|---|---|
| `salary_ranges_by_cause_area.csv` | Category, 25th, Median, 75th (all roles) | **Dot plot** (connect dots) |
| `salary_ranges_by_skills.csv` | same, per skill | Dot plot |
| `salary_ranges_by_location.csv` | same, per location | Dot plot |
| `full_breakdown.csv` | Long format: every dimension × category × seniority, with Jobs (sample size) and the 10th/25th/median/75th/90th | Reference table, or filter to one seniority for a custom chart |

### Using the range sheets in Datawrapper
The three salary columns (25th / Median / 75th) are designed for a **Dot plot**:

1. New chart → upload/paste the CSV → chart type **Dot plot**.
2. Select all three value columns. Each becomes a dot per row.
3. In **Refine**, turn on **"Connect dots with a line"** so the 25th→75th span
   reads as a range with the **Median as the middle dot**.
4. Optionally color the Median column differently so the midpoint stands out.

(Datawrapper's *Range plot* only takes a start and an end — no midpoint marker —
which is why these are set up for a dot plot instead.)

## Things to know about the numbers

- **"All roles" combines every seniority.** A job open to several levels is
  counted in each, so seniority cuts (in `full_breakdown.csv`) overlap.
- **Skills and locations overlap; cause area does not.** A job has multiple
  skills, and locations nest (London ⊆ UK, San Francisco Bay Area ⊆ USA), so a
  job appears in several skill/location rows. Each job has exactly one cause area.
- **Location covers only the six tracked regions** (SF Bay Area, Washington DC,
  London, UK, USA, EU). Jobs elsewhere (e.g. remote/anywhere, other countries)
  are excluded from the location sheet but still counted in cause/skill sheets.
- **Sample sizes** for every category × seniority are in the `Jobs` column of
  `full_breakdown.csv`.
