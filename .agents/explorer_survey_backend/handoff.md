# Handoff Report: Backend & Data Architecture Survey

## 1. Observation

### 1.1 Project Structure & Framework
- `package.json` specifies Node `>=22.0.0`, dependencies `@hono/node-server (^1.8.2)`, `@libsql/client (^0.17.4)`, `hono (^4.1.0)`, `leaflet (^1.9.4)`, `playwright (^1.42.1)`, `react (^18.2.0)`, `vite (^5.1.6)`, `vitest (^1.3.1)`.
- `vercel.json` configures `"buildCommand": "pnpm build"`, `"outputDirectory": "dist"`, and rewrites `/api/:path*` to `/api` and `/(.*)` to `/index.html`.
- `api/index.ts` is configured with `export const config = { runtime: 'edge' }`, implementing Hono with pure web fetch against `@libsql/client/web`.
- `src/server/index.ts` and `src/server/app.ts` provide local Node server execution using `@hono/node-server`.

### 1.2 Database Schema & Storage
- `src/db/database.ts` (lines 4–52) and `api/index.ts` (lines 42–80) define identical SQLite schema for `listings` and `scrape_logs`.
- Indexes created: `idx_listings_score` ON `listings(score DESC)`, `idx_listings_created_at` ON `listings(created_at DESC)`, `idx_listings_user_status` ON `listings(user_status)`.
- Dual-mode database connection: connects to remote Turso Cloud via `process.env.TURSO_DATABASE_URL` or falls back to `file:data/listings.db` locally.

### 1.3 `/api/listings` Implementation & Pagination
- In `api/index.ts` (lines 280–354) and `src/server/routes/listings.ts` (lines 8–53), `GET /api/listings` builds dynamic `WHERE` clauses for `minScore`, `maxRent`, `bhkType`, `furnishing`, `userStatus`, `search`, and `sortBy`.
- Both handlers execute `SELECT * FROM listings WHERE 1=1 ...` without `LIMIT` or `OFFSET` and return `{ count: listings.length, listings }`.
- Frontend `src/client/App.tsx` (lines 49–93) requests pagination params `page` and `limit=12` and expects `PaginatedListingsResponse` (`count`, `totalCount`, `page`, `limit`, `totalPages`, `hasMore`, `listings`).

### 1.4 Scoring Engine & Rental Attributes
- `src/domain/scorer/ratingEngine.ts` implements `computeListingScore`:
  - Base: 50 pts
  - Rent: $\le 25\text{k} \rightarrow +20$, $>30\text{k} \rightarrow -20$
  - Brokerage: Zero $\rightarrow +15$, Broker fee $\rightarrow -30$
  - Deposit: $> 2.2\times\text{rent} \rightarrow -15$, $\le 50\text{k} \rightarrow +10$
  - Gated society: $+15$, Pool: $+15$, Power backup: $+10$
  - Attached washroom: $+10$, Shared washroom: $-5$
  - Male bachelor match: $+10$, Female only mismatch: $-25$
  - Walking proximity ($< 500\text{m}$ / walkable): $+15$
  - Furnished: $+5$, Panathur direct bypass: $+10$
  - Weekday peak commute: $\le 7\text{m} \rightarrow +20$, $8-12\text{m} \rightarrow +10$, $13-18\text{m} \rightarrow -5$, $>18\text{m} \rightarrow -25$
  - Vegetarian-only restriction: direct $-50$ pt penalty
- Tiers: `🔥 Unicorn Deal` ($\ge 90$), `✨ Great Match` ($75-89$), `⚡ Moderate Match` ($55-74$), `⚠️ Low Match` ($<55$).

### 1.5 Scraping Triggers & Passcode Restrictions
- Passcode middleware in `api/index.ts` (lines 248–261) and `src/server/app.ts` (lines 15–38) blocks non-GET requests when `DASHBOARD_PASSCODE` is configured.
- Requirement R4 explicitly requires removing passcode restrictions on scrape triggers (`/api/scrape/trigger`, `/api/scrape/seed`).

### 1.6 Deduplication & Multi-Group Aggregation
- `src/domain/parser/deduplicator.ts` implements `areDuplicates` using exact `fbPostId`, phone number + rent/society matching, and Jaccard 3-gram character text similarity ($> 0.70$ with author name, $> 0.88$ overall).
- `deduplicateListings` merges duplicates into canonical records with `groupNames: string[]` and `postCount: number`.
- `ListingCard.tsx` (lines 65–72) renders the multi-group badge `<Layers /> X groups`.

### 1.7 Tests & Build Verification
- Running `pnpm test` executes Vitest v1.6.1 across 5 test suites (`tests/commute.test.ts`, `tests/deduplicator.test.ts`, `tests/scorer.test.ts`, `tests/filter.test.ts`, `tests/extractor.test.ts`).
- Verbatim result: **5 test files passed (5), 18 tests passed (18), Duration 258ms**.
- Running `pnpm build` executes `tsc && vite build` and completes in 1.10s with 0 errors.

---

## 2. Logic Chain

1. **Observation 1.1 & 1.2** establish that the backend utilizes Hono and `@libsql/client/web` to operate seamlessly across both local Node.js and Vercel Edge Runtime using a unified SQLite schema.
2. **Observation 1.3** reveals a direct gap between the API response format (`{ count, listings }`) and the frontend's expected pagination contract (`PaginatedListingsResponse` with `page`, `limit`, `totalCount`, `totalPages`, `hasMore`). Implementing SQL `LIMIT` and `OFFSET` in `/api/listings` and supporting `recency` filtering will satisfy Requirement R4.
3. **Observation 1.4** demonstrates that the scoring engine in `src/domain/scorer/ratingEngine.ts` and `src/domain/config.ts` aligns accurately with the v2 specification (including -50 vegetarian penalty, -30 broker penalty, -15 deposit penalty, and +15 walking bonus).
4. **Observation 1.5** identifies that the passcode middleware restricts `/api/scrape/trigger` and `/api/scrape/seed`. Removing these route restrictions from the middleware fulfills Requirement R4.
5. **Observation 1.6 & 1.7** confirm that deduplication logic and unit test coverage are sound, passing with 100% success rate across all 18 Vitest test cases.

---

## 3. Caveats

- **Playwright Execution Scope**: Playwright browser scraping only runs in Node.js environments (CLI and GitHub Actions workflow) and cannot run inside Vercel Edge Runtime. On Edge, `/api/scrape/trigger` seeds/resyncs verified fixtures into Turso SQLite.
- **In-Memory vs Database Deduplication**: Because SQLite stores posts with individual `fb_post_id`s, deduplication across groups occurs in domain memory when listings are processed/queried.

---

## 4. Conclusion

The Rental Radar backend and data layer architecture is cleanly structured, strongly typed, and ready for v2 feature deployment. The necessary backend modifications are localized and well-defined:
1. Refactor `/api/listings` in `api/index.ts` and `src/server/routes/listings.ts` to implement SQL `LIMIT` / `OFFSET` pagination and `recency` datetime filtering returning `PaginatedListingsResponse`.
2. Allow unrestricted access to `/api/scrape/trigger` and `/api/scrape/seed` in the passcode middleware.
3. Maintain 100% pass rate on all Vitest unit tests.

---

## 5. Verification Method

To independently verify the observations and findings in this report:

1. **Run Unit Test Suite**:
   ```bash
   pnpm test
   ```
   *Expected*: All 5 test suites and 18 tests pass with 0 errors.

2. **Verify Production Build**:
   ```bash
   pnpm build
   ```
   *Expected*: TypeScript compilation (`tsc`) and Vite bundling complete successfully with exit code 0.

3. **Inspect Database & API Code**:
   - Inspect `api/index.ts` and `src/server/routes/listings.ts` for `/api/listings` query structure.
   - Inspect `src/domain/scorer/ratingEngine.ts` for scoring weights and penalties.
   - Inspect `src/domain/parser/deduplicator.ts` for cross-group duplicate detection.
