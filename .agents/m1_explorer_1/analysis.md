# Implementation Strategy Report: Milestone 1 (API & Pagination)

**Author**: Milestone 1 Explorer (API & Pagination)  
**Date**: 2026-08-26  
**Target Milestone**: M1 (Backend & Data Engine)  
**Status**: Ready for Review & Implementation  

---

## 1. Executive Summary

Milestone 1 focuses on the **Backend & Data Engine** for Rental Radar v2. The primary objectives are:
1. **Server-Side SQL Pagination**: Implement `LIMIT` and `OFFSET` query pagination on `/api/listings` with default `page = 1` and `limit = 12`, returning the full `PaginatedListingsResponse` envelope (`count`, `totalCount`, `page`, `limit`, `totalPages`, `hasMore`, `listings`).
2. **Recency Time-Window Filtering**: Support query filtering across seven standardized time horizons (`'1h'`, `'3h'`, `'6h'`, `'12h'`, `'24h'`, `'7d'`, `'all'`) against both `created_at` timestamps and relative `posted_time` strings.
3. **Dual-Runtime Alignment**: Align the Vercel Edge Runtime handler (`api/index.ts`) and Node.js backend router (`src/server/routes/listings.ts` via `src/db/repository.ts`) to exact contract parity.
4. **Passcode Un-Gating for Scrapers**: Remove passcode restrictions on `/api/scrape/trigger` and `/api/scrape/seed` to enable seamless UI scraping workflows.
5. **Edge Latency Optimization (<15ms)**: Leverage `@libsql/client/web` single-roundtrip batch queries (`client.batch`) and composite database indexing on Turso/SQLite.

---

## 2. Codebase Investigation & Gap Analysis

### 2.1 File Matrix & Current State Comparison

| Component / File | Current State | Deficiencies / Required Changes |
|---|---|---|
| `api/index.ts` (Edge API) | Implements basic pagination & preliminary recency filter. | 1. Recency filter omits `'7d'` and uses overly broad pattern matching for `'12h'`/`'24h'`.<br>2. Executes separate unbatched HTTP roundtrips (`SELECT COUNT(*)` on every request, schema check loop).<br>3. Does not use LibSQL `client.batch` for count + data fetch. |
| `src/server/routes/listings.ts` (Node.js API) | Returns `{ count: listings.length, listings }` without envelope or pagination params. | 1. Ignores `page`, `limit`, and `recency` query parameters.<br>2. Missing `totalCount`, `totalPages`, `hasMore` envelope fields.<br>3. Does not run `deduplicateListings` on result slice. |
| `src/db/repository.ts` (Data Access Layer) | `getListings(options)` accepts `options.page` and `options.limit` but returns `RentalListing[]`. | 1. Completely ignores `options.recency`.<br>2. Lacks a dedicated `getPaginatedListings` method returning `PaginatedListingsResponse`.<br>3. Does not calculate `totalCount` prior to applying `LIMIT ? OFFSET ?`. |
| `src/server/app.ts` (Hono App & Middleware) | Passcode middleware blocks POST requests to `/api/scrape/*` if `DASHBOARD_PASSCODE` is configured. | 1. Blocks automated scrape triggers without header.<br>2. Violates Requirement R4 / F10 (passcode gate removal for scrapers). |
| `src/client/services/api.ts` & `src/client/App.tsx` | Frontend is already coded to consume `PaginatedListingsResponse` and pass pagination/recency params. | Fully compatible once backend contract is unified. |

---

## 3. Detailed Technical Analysis

### 3.1 Interface Contract: `/api/listings`

#### Request Query Parameters
| Parameter | Type | Default | Validation / Constraint |
|---|---|---|---|
| `page` | `number` | `1` | `Math.max(1, parseInt(val, 10) || 1)` |
| `limit` | `number` | `12` | `Math.min(50, Math.max(1, parseInt(val, 10) || 12))` |
| `recency` | `string` | `'all'` | Enum: `'1h' \| '3h' \| '6h' \| '12h' \| '24h' \| '7d' \| 'all'` |
| `minScore` | `number` | `undefined` | `parseInt(val, 10)` |
| `maxRent` | `number` | `undefined` | `parseInt(val, 10)` |
| `bhkType` | `string` | `undefined` | Filter matching `%${bhkType}%` (omitted if `'all'`) |
| `furnishing` | `string` | `undefined` | Exact match (omitted if `'all'`) |
| `userStatus` | `string` | `undefined` | Exact match (omitted if `'all'`) |
| `search` | `string` | `undefined` | Multi-field search across raw text, society, location, author, phone |
| `sortBy` | `string` | `'score_desc'` | Enum: `'score_desc' \| 'rent_asc' \| 'commute_asc' \| 'newest'` |

#### Response Format (`PaginatedListingsResponse`)
```json
{
  "count": 12,
  "totalCount": 48,
  "page": 1,
  "limit": 12,
  "totalPages": 4,
  "hasMore": true,
  "listings": [
    {
      "id": 1,
      "fbPostId": "fb_sobha_iris_01",
      "groupName": "Flat and Flatmates Bangalore",
      "groupNames": ["Flat and Flatmates Bangalore", "Rentals PTP"],
      "postCount": 2,
      "postUrl": "https://facebook.com/groups/flatandflatmatesbangalore/posts/10158829102",
      "authorName": "Rohan Deshmukh",
      "postedTime": "1 hr ago",
      "rawText": "...",
      "location": "Kadubeesanahalli",
      "bhkType": "3 BHK (Shared/Full)",
      "entities": { ... },
      "commute": { ... },
      "score": 95,
      "scoreBreakdown": { ... },
      "tier": "🔥 Unicorn Deal",
      "userStatus": "interested",
      "createdAt": "2026-08-26 14:00:00",
      "updatedAt": "2026-08-26 14:00:00"
    }
  ]
}
```

---

### 3.2 SQL Pagination & Total Count Strategy

#### Why `COUNT(*)` + `LIMIT / OFFSET` is Optimal:
1. **Window Function `COUNT(*) OVER()` vs Parameterized `COUNT(*)`**:
   - `SELECT *, COUNT(*) OVER() as full_count FROM listings LIMIT ? OFFSET ?` does not return `full_count` when 0 rows match the `WHERE` clause.
   - It requires scanning and constructing the window partition in memory even when only reading a small slice.
   - A dedicated `SELECT COUNT(*) as total FROM listings WHERE ...` query utilizes SQLite B-tree indexes (`idx_listings_score`, `idx_listings_created_at`) directly without row hydration.
2. **LibSQL Batch Execution for Edge Latency**:
   - With `@libsql/client/web`, executing `client.batch([countQuery, dataQuery], 'read')` packages both SQL statements into a single HTTP payload over HTTPS/WSS to Turso.
   - Network roundtrip overhead is reduced from $2 \times \text{RTT} \approx 24\text{ms}$ down to $1 \times \text{RTT} \approx 10\text{ms}$.

---

### 3.3 Recency Time-Window SQL Filtering

The recency filter must handle both database `created_at` timestamp records (SQLite `datetime('now')`) and relative text timestamps (`posted_time` strings such as `"1 hr ago"`, `"10 mins ago"`).

#### SQL Clause Mapping Matrix
```ts
export function buildRecencySqlCondition(recency: string): string {
  switch (recency) {
    case '1h':
      return " AND (created_at >= datetime('now', '-1 hour') OR posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%')";
    
    case '3h':
      return " AND (created_at >= datetime('now', '-3 hours') OR posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%2 hr%' OR posted_time LIKE '%3 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%2 hour%' OR posted_time LIKE '%3 hour%' OR posted_time LIKE '%Recently%')";
    
    case '6h':
      return " AND (created_at >= datetime('now', '-6 hours') OR posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%2 hr%' OR posted_time LIKE '%3 hr%' OR posted_time LIKE '%4 hr%' OR posted_time LIKE '%5 hr%' OR posted_time LIKE '%6 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%2 hour%' OR posted_time LIKE '%3 hour%' OR posted_time LIKE '%4 hour%' OR posted_time LIKE '%5 hour%' OR posted_time LIKE '%6 hour%' OR posted_time LIKE '%Recently%')";
    
    case '12h':
      return " AND (created_at >= datetime('now', '-12 hours') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%hr%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%13 hr%' AND posted_time NOT LIKE '%14 hr%' AND posted_time NOT LIKE '%15 hr%' AND posted_time NOT LIKE '%16 hr%' AND posted_time NOT LIKE '%17 hr%' AND posted_time NOT LIKE '%18 hr%' AND posted_time NOT LIKE '%19 hr%' AND posted_time NOT LIKE '%20 hr%' AND posted_time NOT LIKE '%21 hr%' AND posted_time NOT LIKE '%22 hr%' AND posted_time NOT LIKE '%23 hr%' AND posted_time NOT LIKE '%day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%'))";
    
    case '24h':
      return " AND (created_at >= datetime('now', '-24 hours') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%hr%' OR posted_time LIKE '%Recently%' OR posted_time LIKE '%1 day%') AND posted_time NOT LIKE '%2 day%' AND posted_time NOT LIKE '%3 day%' AND posted_time NOT LIKE '%4 day%' AND posted_time NOT LIKE '%5 day%' AND posted_time NOT LIKE '%6 day%' AND posted_time NOT LIKE '%7 day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%'))";
    
    case '7d':
      return " AND (created_at >= datetime('now', '-7 days') OR (posted_time NOT LIKE '%2 week%' AND posted_time NOT LIKE '%3 week%' AND posted_time NOT LIKE '%4 week%' AND posted_time NOT LIKE '%month%' AND posted_time NOT LIKE '%year%'))";
    
    case 'all':
    default:
      return '';
  }
}
```

---

### 3.4 Cross-Group Deduplication & Pagination Interaction

- In the database, each scraped post has a unique `fb_post_id` and records its origin `group_name`.
- When fetching a page with `LIMIT 12 OFFSET 0`, `rawListings` contains up to 12 rows.
- `deduplicateListings(rawListings)` consolidates identical cross-posts appearing within that result slice, merging `groupNames` and incrementing `postCount`.
- The returned `count` reflects `listings.length` ($\le 12$), while `totalCount` reflects the total raw matching rows in the database.
- `totalPages` is `totalCount === 0 ? 0 : Math.ceil(totalCount / limit)`.
- `hasMore` is `page < totalPages`.

---

### 3.5 Passcode Gate Removal for Scrape Endpoints

In `src/server/app.ts`:
- Modify the passcode gate middleware to bypass all `/scrape/*` and `/api/scrape/*` routes unconditionally.
- Update `/config` and `/api/config` endpoints to report `requiresPasscode: false`.

---

## 4. Edge Latency Optimization (< 15ms)

To achieve strict $<15\text{ms}$ latency on Vercel Edge Runtime:
1. **Zero Cold-Start Schema Checks**: Keep an in-isolate flag `schemaReady`. When initialized, subsequent requests execute 0 schema DDL statements.
2. **Batched DDL on Cold Start**: When cold initialization is required, execute all DDL statements in a single batch `client.batch(statements, 'write')` instead of sequential roundtrips.
3. **Single Batched Read Request**: Execute `COUNT(*)` and `SELECT * ... LIMIT ? OFFSET ?` inside `client.batch([countStmt, dataStmt], 'read')`.
4. **Conditional Auto-Seed**: Do not query `SELECT COUNT(*) FROM listings` on every request. Only invoke auto-seed if `totalCount === 0` on an unfiltered root query.
5. **Database Indexing**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_listings_score ON listings(score DESC);
   CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_listings_score_created ON listings(score DESC, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_listings_user_status ON listings(user_status);
   ```

---

## 5. Step-by-Step Implementation Strategy

### Step 1: Update `src/db/repository.ts`
- Implement `getPaginatedListings(options: ListingQueryOptions): Promise<PaginatedListingsResponse>`.
- Add `buildRecencySqlCondition` to support `options.recency`.
- Run `deduplicateListings` on the queried slice before returning.

### Step 2: Update `src/server/routes/listings.ts`
- Parse `page` (default 1), `limit` (default 12), and `recency` (default `'all'`).
- Call `listingRepository.getPaginatedListings(options)`.
- Return the full `PaginatedListingsResponse` envelope.

### Step 3: Refactor `api/index.ts` (Vercel Edge API)
- Batch `ensureSchema` on cold start via `client.batch`.
- Use `buildRecencySqlCondition` for complete recency filtering including `'7d'`.
- Combine `COUNT(*)` and paginated `SELECT` into `client.batch([countSql, dataSql], 'read')`.
- Remove redundant pre-count query before every request.

### Step 4: Remove Passcode Restriction in `src/server/app.ts`
- Exempt `/scrape` and `/api/scrape` from passcode middleware.
- Return `requiresPasscode: false` from `/config`.

### Step 5: Add Comprehensive Vitest Unit Tests (`tests/pagination.test.ts`)
- Test pagination default values, offset math, boundary conditions (`hasMore`, `totalPages`).
- Test recency SQL generation for all 7 options.
- Test `PaginatedListingsResponse` JSON envelope structure.
- Test passcode exemption for scrape endpoints.

---

## 6. Verification Plan

1. **Unit Test Execution**:
   ```bash
   pnpm test
   ```
   Verify 100% pass rate across existing test suites (`scorer.test.ts`, `deduplicator.test.ts`, `commute.test.ts`, `filter.test.ts`, `extractor.test.ts`) and new `pagination.test.ts`.

2. **Edge API Simulation & Latency Benchmark**:
   - Verify that `/api/listings?page=1&limit=12&recency=24h` returns valid `PaginatedListingsResponse` in $<15\text{ms}$.
   - Verify `/api/scrape/trigger` executes successfully without `x-dashboard-passcode`.

3. **Production Build Verification**:
   ```bash
   pnpm build
   ```
   Confirm TypeScript type checking and Vite bundle creation succeed without errors.
