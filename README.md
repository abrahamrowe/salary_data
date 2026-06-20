# High Impact Jobs Salary Benchmarks

A static, client-side web app showing salary percentiles (junior / mid / senior)
from high-impact job postings, with filters for cause area, skills, and
location, and a USD / GBP / EUR currency toggle. Two tabs — a benchmarks table +
chart, and a sortable listing of the filtered jobs.

## Deploying on GitHub Pages

The site is the `salary-benchmarks/` folder — static HTML/CSS/JS with the data
embedded in `data.js`. No backend, no build step.

`.github/workflows/deploy.yml` publishes that folder to GitHub Pages on every
push to `main`; enable it under **Settings → Pages → Source: GitHub Actions**.
(Or serve the `salary-benchmarks/` folder from any static host.)
