# Handoff Report — Rental Radar v2 Specification & Requirements Mining

**Working Directory**: `/Users/nebulo/Workspace/rental-radar/.agents/spec_miner_survey`  
**Author**: Specification & Requirements Miner  
**Date**: 2026-08-26  
**Type**: Hard Handoff (Task Complete)

---

## 1. Observation

Direct code and test observations from `/Users/nebulo/Workspace/rental-radar`:

1. **R1 (Geospatial Map)**:
   - CartoDB Dark Matter tile layer configuration in `src/client/components/MapView.tsx:30-34`:
     ```ts
     L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
       attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
       subdomains: 'abcd',
       maxZoom: 20,
     }).addTo(map);
     ```
   - Known Society and PTP coordinates in `src/domain/config.ts:1-128`:
     - PTP Anchor: `lat: 12.9385, lon: 77.6917`
     - Sobha Iris: `lat: 12.9372, lon: 77.6934`
     - Sobha Hibiscus: `lat: 12.9358, lon: 77.6948`
     - Sobha Jasmine: `lat: 12.9365, lon: 77.6955`
     - Assetz Marq: `lat: 12.9410, lon: 77.6960`
     - Assetz East Point: `lat: 12.9422, lon: 77.6980`
     - Goyal Orchid Lakeview: `lat: 12.9320, lon: 77.6890`
     - Prestige Sunnyside: `lat: 12.9390, lon: 77.6950`
     - Divyasree 77 East: `lat: 12.9450, lon: 77.6880`
     - SJR Parkway Homes: `lat: 12.9315, lon: 77.6920`
     - Salarpuria Sattva: `lat: 12.9360, lon: 77.6900`
     - Umiya City / Velocity: `lat: 12.9375, lon: 77.6910`
     - Panathur Gated Society: `lat: 12.9340, lon: 77.7010`
   - Clustered marker score badges and hover popups in `src/client/components/MapView.tsx:85-176`.
   - Multi-view switching in `src/client/App.tsx:44,313-356` and `src/client/components/FilterBar.tsx:80-115`.

2. **R2 (Deduplication & Recency Filtering)**:
   - Jaccard 3-gram character similarity and multi-signal duplicate detector in `src/domain/parser/deduplicator.ts:6-66`.
   - Canonical record merging with `groupNames` and `postCount` in `src/domain/parser/deduplicator.ts:69-113`.
   - Multi-group badge rendering in `src/client/components/ListingCard.tsx:65-72`.
   - Recency intervals (`1h`, `3h`, `6h`, `12h`, `24h`, `7d`, `all`) in `api/index.ts:314-319` and `src/client/components/FilterBar.tsx:154-173`.

3. **R3 (Scoring Algorithm Exact Arithmetic)**:
   - Base score 50 in `src/domain/config.ts:185`.
   - Scoring rules and weight configurations in `src/domain/config.ts:184-208` and `src/domain/scorer/ratingEngine.ts:17-168`:
     - Male/bachelor match: `+10` (`bachelorMaleMatch: 10`, mismatch female-only: `-25` `bachelorMismatchPenalty: -25`)
     - Strict brokerage penalty: `-30` (`brokerageApplicable: -30`), Zero brokerage: `+15` (`noBrokerage: 15`)
     - High deposit penalty (> 2.2x rent): `-15` (`highDepositRatioPenalty: -15`), Low deposit (<= 50k): `+10` (`lowDeposit: 10`)
     - Non-dedicated / shared washroom: `-5` (`sharedWashroomPenalty: -5`), Attached washroom: `+10` (`attachedWashroom: 10`)
     - Vegetarian-only penalty: `-50` (`vegetarianOnlyPenalty: -50`)
     - Proximity walking bonus (< 500m / 0.6km): `+15` (`walkingProximityBonus: 15`)
     - Gated society: `+15`, Pool: `+15`, Power backup: `+10`, Furnishing: `+5`, Panathur bypass: `+10`
     - Peak commute: `<=7m: +20`, `8-12m: +10`, `13-18m: -5`, `>18m: -25`.
   - Rating tiers: `🔥 Unicorn Deal` (90–100), `✨ Great Match` (75–89), `⚡ Moderate Match` (55–74), `⚠️ Low Match` (<55).

4. **R4 (Database Pagination & API Optimization)**:
   - Edge function handler in `api/index.ts:273-373` with `page` (default 1), `limit` (default 12), `totalCount`, `totalPages`, `hasMore`, and SQL `LIMIT ? OFFSET ?`.
   - Two-line description clamping with click expansion toggle in `src/client/components/ListingCard.tsx:35,175-189`.
   - Removal of sample data button from UI in `src/client/App.tsx:187-195`.
   - Passcode protection removed (`requiresPasscode: false`) for seamless scraping in `api/index.ts:267,418-430`.

5. **R5 (Testing & Documentation)**:
   - `pnpm test` executed: 5 test suites passed, 18 tests passed (100% pass rate in 231ms).
   - `pnpm build` executed: compiled with TypeScript and Vite in 1.05s with 0 errors.

---

## 2. Logic Chain

1. From **Observation 1**, Leaflet utilizes standard CartoDB Dark Matter vector raster tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) which require zero external API keys and fit the dark theme. All society coordinates are mapped deterministically around Prestige Tech Park (`12.9385, 77.6917`).
2. From **Observation 2**, cross-group deduplication relies on a 4-tier evaluation: exact post ID, phone match with identical rent/society, author match with Jaccard 3-gram text similarity > 0.70, or body text similarity > 0.88. Merged listings preserve all unique group names, allowing the UI to render the "Seen in X groups" badge.
3. From **Observation 3**, scoring arithmetic is strictly deterministic starting from base 50, applying all 11 penalty/bonus factors, clamping pre-penalty scores between 0 and 100, subtracting the -50 vegetarian penalty if applicable, and clamping the final result to [0, 100].
4. From **Observation 4**, pagination is implemented on both backend (`api/index.ts` / `src/db/repository.ts`) using SQL `LIMIT` and `OFFSET`, and frontend (`src/client/App.tsx` and `src/client/services/api.ts`) returning the canonical envelope `{ count, totalCount, page, limit, totalPages, hasMore, listings }`.
5. From **Observation 5**, all existing test suites (`tests/commute.test.ts`, `tests/scorer.test.ts`, `tests/deduplicator.test.ts`, `tests/filter.test.ts`, `tests/extractor.test.ts`) are 100% passing and production builds complete cleanly.

---

## 3. Caveats

- **Facebook Authentication**: Scraping real-time private groups requires a valid session cookie string exported via `pnpm auth:export` and set as `FB_SESSION_STORAGE`. When running without a session, the scraper cleanly falls back to realistic seed fixtures in `src/scraper/seedData.ts`.
- **Database Dual-Mode**: In local dev, SQLite operates via `@libsql/client/web` on `file:data/listings.db`. In Vercel production, it connects via HTTPS/WSS to Turso using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- **No other caveats**: All requirement specifications are fully mined, verified, and documented.

---

## 4. Conclusion

The Rental Radar v2 specifications across Geospatial Mapping (R1), Deduplication & Recency (R2), Scoring Engine Arithmetic (R3), Database Pagination & Edge API (R4), and Documentation & Testing (R5) have been completely mined and documented in `spec_report.md`. The domain logic, database schemas, formulas, coordinate registries, and API contracts are fully enumerated and ready for orchestrator consumption.

---

## 5. Verification Method

To independently verify the mined specifications:
1. **Run Unit Tests**:
   ```bash
   pnpm test
   ```
   *Expected result*: 5 test files passed, 18 tests passed (100% pass).

2. **Run Production Build**:
   ```bash
   pnpm build
   ```
   *Expected result*: `tsc && vite build` succeeds with zero errors.

3. **Inspect Specification Artifacts**:
   - `/Users/nebulo/Workspace/rental-radar/.agents/spec_miner_survey/spec_report.md`
   - `/Users/nebulo/Workspace/rental-radar/.agents/spec_miner_survey/handoff.md`
   - `/Users/nebulo/Workspace/rental-radar/.agents/spec_miner_survey/BRIEFING.md`
   - `/Users/nebulo/Workspace/rental-radar/.agents/spec_miner_survey/progress.md`
