# Core CMCI consultation room logistics

Logistics plan and store map for the 65 Core CMCI stores in the CVS pre-fab consultation room program. See `AGENTS.md` for context, decisions, rebuild steps, and open items.

- `deliverables/` Excel workbooks, KML, interactive map HTML
- `scripts/` build scripts (Python) and the browser geocoding snippet
- `data/` address list, Census geocode matches, state outlines
- `index.html`, `styles.css`, `app.js` employee-facing logistics control board
- `site-data/tracker.json` publishable tracker data generated from the logistics workbook
- `assets/core-cmci-logo.jpg` verified Core CMCI logo embedded in the branded Master Dashboard

The Master Dashboard includes dedicated submenu views for Clusters 145 through 149. Cluster selections update the portfolio metrics, store schedule, workload summary, and map together.

## Tracker refresh

1. Update the logistics workbook.
2. Run `python scripts/export_tracker_data.py`.
3. Review the tracker locally through an HTTP server.
4. Commit the workbook and generated tracker data together so the page and source control remain aligned.

The repository and any hosted site must remain access-controlled. The source package contains store addresses and program dates.
