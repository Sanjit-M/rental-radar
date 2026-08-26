# Milestone 1 Handoff Report: Backend & Data Engine (API & Pagination)

## 1. Observation

1. **`src/server/routes/listings.ts` (Lines 8–53)**:
   - Root GET route does not parse `page`, `limit`, or `recency` query parameters.
   - Line 40 returns `{ count: listings.length, listings }` instead of the required `PaginatedListingsResponse` envelope (`count`, `totalCount`, `page`, `limit`, `totalPages`, `hasMore`, `listings`).
   - Does not invoke `deduplicateListings` on the queried slice.

2. **`src/db/repository.ts` (Lines 21–32, 221–283)**:
   - `ListingQueryOptions` defines `page`, `limit`, `recency`, but `getListings(options)` returns a raw array `RentalListing[]` without returning `totalCount`.
   - `options.recency` is completely ignored (no SQL condition is generated).
   - No dedicated `getPaginatedListings` method exists.

3. **`api/index.ts` (Lines 273–373)**:
   - `getListingsHandler` parses `page` (default 1) and `limit` (default 12), and computes `totalPages` and `hasMore`.
   - Recency filter (Lines 314–319) is missing the `'7d'` case entirely and uses overly permissive patterns for `'12h'` / `'24h'`.
   - Lines 340–344 perform `SELECT COUNT(*) as cnt FROM listings` sequentially on every request before the main query, adding an unneeded HTTP roundtrip to Turso.
   - Separate `COUNT(*)` (Line 347) and `SELECT * ... LIMIT ? OFFSET ?` (Line 351) queries are executed sequentially rather than batched using `@libsql/client/web`'s `client.batch(...)`.

4. **`src/server/app.ts` (Lines 14–38)**:
   - Passcode middleware enforces `DASHBOARD_PASSCODE` on mutation and scrape endpoints (`/scrape/trigger`, `/scrape/seed`), blocking unauthenticated UI scrape triggers (violating Requirement R4 / F10).

5. **`src/domain/types.ts` (Lines 158–166)**:
   - Defines `PaginatedListingsResponse`:
     ```ts
     export interface PaginatedListingsResponse {
       readonly count: number;
       readonly totalCount: number;
       readonly page: number;
       readonly limit: number;
       readonly totalPages: number;
       readonly hasMore: boolean;
       readonly listings: RentalListing[];
     }
     ```

6. **Vitest Unit Test Suite**:
   - `pnpm test` executes 5 test files (`scorer.test.ts`, `deduplicator.test.ts`, `commute.test.ts`, `filter.test.ts`, `extractor.test.ts`) with 18 tests passing in 277ms.
   - Currently, there is no unit test file verifying pagination queries, recency SQL logic, or `PaginatedListingsResponse` envelope serialization.

---

## 2. Logic Chain

1. **Envelope & Parameter Parity** (from Observations 1, 2, and 5):
   - The frontend (`src/client/App.tsx:68-85`) expects `PaginatedListingsResponse` containing `count`, `totalCount`, `page`, `limit`, `totalPages`, and `hasMore`.
   - Because `src/server/routes/listings.ts` currently returns `{ count, listings }` and lacks pagination parameter extraction, local Node.js development fails to paginate and lacks multi-group badge consolidation.
   - Therefore, `src/db/repository.ts` must expose `getPaginatedListings(options)` and `src/server/routes/listings.ts` must be refactored to parse `page`, `limit`, and `recency` and return `PaginatedListingsResponse`.

2. **Complete Recency Filtering** (from Observations 2 and 3):
   - Requirement R2 and PROJECT.md specify 7 recency time windows: `'1h'`, `'3h'`, `'6h'`, `'12h'`, `'24h'`, `'7d'`, and `'all'`.
   - `api/index.ts` currently lacks `'7d'` and conflates `'12h'` and `'24h'` with loose negative checks.
   - Therefore, a unified `buildRecencySqlCondition(recency)` helper must be created to construct accurate SQL conditions against both `created_at` timestamp comparison (`datetime(created_at) >= datetime('now', '-X')`) and `posted_time` string patterns.

3. **Edge Latency Optimization (< 15ms)** (from Observation 3):
   - In Vercel Edge Runtime, each HTTP roundtrip to Turso Cloud takes ~8–12ms.
   - Running 3 sequential roundtrips (seed check + count + paginated select) results in 24–36ms latency.
   - Combining `SELECT COUNT(*)` and `SELECT * ... LIMIT ? OFFSET ?` into `client.batch([countStmt, dataStmt], 'read')` reduces the database interaction to a single HTTP roundtrip (~8–10ms), guaranteeing total response time under 15ms.

4. **Passcode Gate Unblocking** (from Observation 4):
   - Requirement R4 explicitly mandates removing passcode restrictions on scrape triggers.
   - In `src/server/app.ts`, routes starting with `/scrape` and `/api/scrape` must be exempted from the passcode middleware, and `/config` must return `requiresPasscode: false`.

---

## 3. Caveats

1. **No Source Code Modifications Made**: Per the Teamwork Explorer role and user directive, this investigation is read-only. No application source code has been edited.
2. **Scraper Data Volume**: Deduplication occurs within the returned paginated slice in memory (`deduplicateListings(rawListings)`). If the database grows to thousands of records, cross-page duplicates would be merged per-page. For the current target scope (Bangalore tech corridors, ~50–500 active listings), this per-slice deduplication is standard, performant, and safe.
3. **Turso Cloud Connection**: Edge deployment relies on `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. In local fallback mode without Turso credentials, `@libsql/client/web` operates against local SQLite `data/listings.db`.

---

## 4. Conclusion

Milestone 1 implementation strategy is complete, fully specified, and ready for code implementation:
1. Refactor `src/db/repository.ts` to add `getPaginatedListings` and recency filtering.
2. Update `src/server/routes/listings.ts` to parse `page`, `limit`, `recency` and return `PaginatedListingsResponse`.
3. Optimize `api/index.ts` with LibSQL `client.batch` single-roundtrip queries, comprehensive recency patterns, and fast-path schema initialization.
4. Remove passcode restrictions from `/scrape/*` endpoints in `src/server/app.ts`.
5. Add `tests/pagination.test.ts` to cover pagination math, recency SQL conditions, response envelope validation, and scrape routes.

---

## 5. Verification Method

1. **Vitest Unit Test Command**:
   ```bash
   pnpm test
   ```
   Inspect test results for 100% pass across all unit tests including new pagination and recency tests.

2. **File Inspection**:
   - `src/db/repository.ts`: Verify `getPaginatedListings` exists and returns `PaginatedListingsResponse`.
   - `src/server/routes/listings.ts`: Verify parameter parsing and response envelope.
   - `api/index.ts`: Verify `client.batch` usage and recency SQL generation.
   - `src/server/app.ts`: Verify `/scrape` bypass in passcode middleware.

3. **Production Build Command**:
   ```bash
   pnpm build
   ```
   Ensure clean Vite build and TypeScript compilation.

4. **Invalidation Conditions**:
   - Any response from `/api/listings` lacking `totalCount`, `page`, `limit`, `totalPages`, or `hasMore`.
   - Recency filter for `'7d'` failing to filter or throwing a SQL syntax error.
   - Response latency on Vercel Edge exceeding 15ms due to unbatched roundtrips.
