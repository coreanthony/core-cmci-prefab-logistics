# Core CMCI consultation room logistics

Logistics plan and store map for the 65 Core CMCI stores in the CVS pre-fab consultation room program. See `AGENTS.md` for context, decisions, rebuild steps, and open items.

- `deliverables/` Excel workbooks, KML, interactive map HTML
- `scripts/` build scripts (Python) and the browser geocoding snippet
- `data/` address list, Census geocode matches, state outlines
- `index.html`, `styles.css`, `app.js` employee-facing logistics control board
- `site-data/tracker.json` publishable tracker data generated from the logistics workbook
- `assets/core-cmci-logo.jpg` verified Core CMCI logo embedded in the branded Master Dashboard

The Master Dashboard includes dedicated named submenu views for Clusters 145 through 149. Cluster selections update the portfolio metrics, store schedule, store-to-store logistics plan, workload summary, and map together.

The logistics plan sequences stores by cluster and MSD, then uses the nearest next stop where multiple stores share an MSD. Route mileage is a planning estimate based on straight-line distance multiplied by 1.18, with travel time carried at 52 mph. Legs at 240 miles or 4.5 hours receive a one-night hotel allowance. These values are planning controls, not live traffic results, dispatch instructions, or reservations.

Selecting any store row or map marker opens a full detail panel. Source-backed fields come from the logistics workbook. PM phone, store manager, nearest cross street, traffic window, receiving window, tool list, and field notes are maintained separately in `site-data/store-enrichment.json`, keyed by CS number, so workbook refreshes do not overwrite verified field intelligence.

Completed-work photos and store sign-off are submitted through the repository's `Store completion record` issue form. After review, link the issue and approved photo URLs in the store's enrichment record using `completionIssueUrl`, `completionPhotos`, `completionStatus`, `signedByName`, `signedByTitle`, `signedAt`, and `signOffNotes`.

Long-haul hotel selections are maintained in the destination store's enrichment record using `hotelName`, `hotelAddress`, `hotelCheckIn`, `hotelCheckOut`, `hotelRooms`, `hotelConfirmation`, and `hotelStatus`. Blank hotel fields display as unconfirmed and must not be treated as a reservation.

## Tracker refresh

1. Update the logistics workbook.
2. Run `python scripts/export_tracker_data.py`.
3. Review the tracker locally through an HTTP server.
4. Commit the workbook and generated tracker data together so the page and source control remain aligned.

The GitHub Pages site is public. Treat all published store, schedule, routing, and completion information accordingly.
