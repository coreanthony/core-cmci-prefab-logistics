# Codex handoff: Core CMCI pre-fab consultation room logistics

Owner: Anthony (COO, Core CMCI). Session date: 2026-09-25.

## Goal
Core CMCI is the general contractor (GC) for 65 CVS stores in a pre-fab consultation room rollout. The source workbook listed every GC (Apex, Stratus, Mirabelli, etc.). We keep only rows where `GC == "Core CMCI"`, then plan logistics and map the stores.

## What exists (all in `deliverables/`)
| File | What it is |
|---|---|
| `Pre-fab Consultation Room - Core CMCI Only.xlsx` | Original workbook filtered to 65 Core CMCI rows. `Rejected Candidates` tab untouched (it has no GC column). CSD formulas (`=T{r}+7`) rewritten for new row numbers; freeze pane moved from A138 to A2. |
| `Pre-fab Consultation Room - Core CMCI Logistics Plan.xlsx` | Same workbook plus tabs: `Assumptions`, `Logistics Plan`, `Region Summary`, `Map Data`, `Open Items`. Live formulas. |
| `Core CMCI Store Map.kml` | Pins for Google My Maps / Earth, one folder per region. |
| `store_map_artifact.html` | Interactive Leaflet map (no tile server, draws its own state outlines). Published privately on claude.ai as an Artifact. |

## Key facts and decisions
- 65 stores: 64 TX, 1 LA (New Orleans). MSD (start date) range 2026-10-05 to 2026-11-30. 199 units total using default of 3 where config unknown.
- 15 rows tagged "Combined Project" (not Core) were removed with the other GCs. Confirm with Anthony if any belong to Core.
- Regions (metro clusters): DFW 16, Houston 24, Austin/Central 10 (Killeen included), San Antonio 8, South TX 5 (RGV + Corpus), Outlier 2 (Amarillo, New Orleans).
- Logistics Plan dates are formulas: Deliver-by = WORKDAY(MSD, -buffer); Ship-by = WORKDAY(Deliver-by, -transit days by region). Look-ups pull MSD, labor, status, config live from `Current List` by CS# (INDEX/MATCH), so sorting the plan is safe.
- ASSUMPTIONS THAT ARE PLACEHOLDERS (yellow cells on `Assumptions`): 3 business days delivery buffer, transit 2/2/2/2/3/4 days by region, 1 install day per store, default 3 units. Ship-from point and vendor lead time are unknown.
- 30 of 65 stores are "Not Validated Yet" and have no unit config or labor model.
- Peak load is 10 stores/week (weeks of 10/26, 11/2, 11/16, 11/30) which is 2 crews at 1 install day per store.

## Geocoding (how pins were made)
- Sandbox egress blocks geocoders, so lookups ran in the user's Chrome on the Census geocoder page (same-origin fetch, `scripts/geocode_browser.js`), then OpenStreetMap Nominatim for the misses.
- 52 stores: Census address match (`data/census_matches.json`, lat/lon). 6 stores: OSM CVS store match with street number agreement. 2 stores flagged verify (right number, different street): CS# 190026 Round Rock (3000 RM 1431 pinned at 3000 Sendero Springs Dr) and CS# 189422 Weslaco (1602 E Hwy 83 pinned at 1602 E 6th St). 5 stores are road-only approximations: 189171 Katy, 189423 League City, 189471 Huntsville, 189978 Edinburg, 189984 Cibolo. Overrides are hard-coded in the `OSM` dict in `scripts/build_map.py`.
- OSM tiles return 403 for `file://` pages, and published Artifacts block all non-CDN hosts, so the map draws Texas and neighbor state outlines from `data/states_geo.json` (built from `us-atlas` 10m via `topojson-client`, coordinates rounded to 2 decimals).

## Rebuild
Requires Python 3 (`pandas`, `openpyxl`, `zipcodes`, `numpy`), Node (`npm i leaflet@1.9.4 us-atlas@3 topojson-client`), LibreOffice for formula recalculation checks.
1. `scripts/build_plan.py` reads the Core-only workbook and writes the Logistics Plan workbook (path constants at the top; currently `/mnt/user-data/outputs/`).
2. `scripts/build_map.py` re-uses the top half of `build_plan.py` via `exec`, applies coordinate overrides, writes KML, `recs.json`, and the `Map Data` tab.
3. `scripts/build_artifact.py` reads `recs.json`, `data/states_geo.json`, and `node_modules/leaflet/dist/leaflet.css` and writes `artifact.html`.
Known mess for cleanup: hard-coded absolute paths, the `exec` hack between scripts, `have.json` and `addr.json` expected in the working directory. Refactor into one package with a config for paths before extending.

## Open items for the next agent
1. Replace ZIP/road fallbacks for the 7 flagged stores with real coordinates once Anthony supplies them.
2. Replace placeholder transit/buffer assumptions when the vendor ship-from point and lead times are known.
3. Tie regional unit totals to the vendor PO once the 30 unvalidated configs are confirmed.
4. Decide handling of the 15 "Combined Project" rows and the `Rejected Candidates` tab.
5. Optional: swap the drawn basemap for real tiles only outside the Artifact sandbox (use a provider that allows `file://` referers, not OSM).

## Data caution
The workbooks contain CVS store addresses and program dates. Confirm the repo is private before committing `deliverables/` and `data/`.
