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
| `median_salary_by_cause_area.csv` | Category × Junior / Mid / Senior / All roles (median salary) | **Grouped column or bar chart** |
| `median_salary_by_skills.csv` | same, per skill | Grouped column or bar chart |
| `median_salary_by_location.csv` | same, per location | Grouped column or bar chart |
| `salary_ranges_by_cause_area.csv` | Category, Jobs, 25th, Median, 75th (all roles) | **Range plot** (or dot plot / bar) |
| `salary_ranges_by_skills.csv` | same, per skill | Range plot |
| `salary_ranges_by_location.csv` | same, per location | Range plot |
| `full_breakdown.csv` | Long format: every dimension × category × seniority with Jobs and the 10th/25th/median/75th/90th | Anything — filter to one seniority for custom range plots, or use as a reference table |

### Using them in Datawrapper
1. **New chart → Upload data** (or copy-paste the CSV).
2. For the `median_*` files: pick **Grouped column chart**. The first column
   (Cause area / Skill / Location) becomes the category; the Junior / Mid /
   Senior / All roles columns become the grouped bars. Deselect "All roles" if
   you only want the three seniority bars side by side.
3. For the `salary_ranges_*` files: pick **Range plot**, map *25th percentile*
   and *75th percentile* as the range and *Median* as the dot. The *Jobs* column
   can be shown in the tooltip.

## Things to know about the numbers

- **Median sheets blank very small cells.** Where a category/seniority combo has
  fewer than 5 jobs, the median is left blank to avoid a misleading bar. (Only
  one cell is affected: Skill "Other" / Senior, n=3.) The `Jobs` column in the
  range sheets and the full breakdown show every sample size.
- **"All roles" is not the sum of the seniority columns.** A job open to several
  levels is counted in each, so the three seniority bars overlap in membership.
- **Skills and locations overlap; cause area does not.** A job has multiple
  skills, and locations nest (London ⊆ UK, San Francisco Bay Area ⊆ USA), so a
  job appears in several skill/location rows. Each job has exactly one cause area.
- **Location covers only the six tracked regions** (SF Bay Area, Washington DC,
  London, UK, USA, EU). Jobs elsewhere (e.g. remote/anywhere, other countries)
  are excluded from the location sheets but still counted in cause/skill sheets.
