# Rental Radar v2 — Backend & Data Architecture Survey

## Executive Summary

This document presents a comprehensive technical audit and architectural survey of the backend, data layer, API layer, scoring engine, deduplication mechanisms, scraping pipeline, and test infrastructure of **Rental Radar**.

---

## 1. Project Architecture & Runtime Configuration

### 1.1 Architecture & Framework Overview
- **Frontend Stack**: Vite 5.1.6 + React 18.2.0 + Tailwind CSS 3.4.1 (TypeScript).
- **Backend Stack**: Hono 4.1.0.
  - **Local Development Server**: `@hono/node-server` via `tsx src/server/index.ts` (listening on port `3000` or `PORT`).
  - **Cloud Deployment**: Vercel Edge Runtime via `api/index.ts` (`export const config = { runtime: 'edge' }`).
- **Monorepo / Routing Topology**:
  - `vercel.json` routes all `/api/:path*` traffic to `/api/index.ts` and rewrites all non-API paths `/(.*)` to `dist/index.html`.
  - Client application makes fetch requests directly to `/api/listings`, `/api/stats`, `/api/scrape/trigger`, `/api/scrape/seed`, `/api/config`.

### 1.2 Package & Dependency Manifest (`package.json`)
- **Node Engine**: `>=22.0.0`
- **Core Dependencies**:
  - `@hono/node-server` (`^1.8.2`): Standalone Node.js server for Hono.
  - `@libsql/client` (`^0.17.4`): Web/HTTP client for Turso / LibSQL SQLite.
  - `hono` (`^4.1.0`): Ultra-fast web standard framework for Edge / Node.
  - `leaflet` (`^1.9.4`) & `@types/leaflet` (`^1.9.22`): Geospatial map rendering with CartoDB Dark Matter tiles.
  - `lucide-react` (`^0.359.0`): UI icons.
  - `playwright` (`^1.42.1`): Headless browser automation for Facebook group scraping (used in CLI / GitHub Actions).
  - `react` (`^18.2.0`) & `react-dom` (`^18.2.0`).
  - `clsx` (`^2.1.0`) & `tailwind-merge` (`^2.2.1`).
- **Dev Dependencies**:
  - `vite` (`^5.1.6`), `@vitejs/plugin-react` (`^4.2.1`).
  - `vitest` (`^1.3.1`): Unit testing suite.
  - `tsx` (`^4.7.1`): TypeScript execution for server and scraper scripts.
  - `tailwindcss` (`^3.4.1`), `autoprefixer` (`^10.4.18`), `postcss` (`^8.4.35`).
  - `typescript` (`^5.4.2`).

---

## 2. Database Schema & Data Layer

### 2.1 Storage Technology
- **Database Engine**: SQLite / LibSQL using `@libsql/client/web`.
- **Dual Execution Modes**:
  1. **Production (Turso Cloud SQLite)**: When `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are defined, `@libsql/client/web` communicates over HTTPS/REST to Turso Cloud (compatible with Vercel Edge Runtime without C-bindings).
  2. **Local Development (Local SQLite)**: When `TURSO_DATABASE_URL` is absent, falls back to `file:data/listings.db`.

### 2.2 Schema Definitions (`src/db/database.ts` & `api/index.ts`)

#### Table: `listings`
```sql
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fb_post_id TEXT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  post_url TEXT NOT NULL,
  author_name TEXT NOT NULL,
  posted_time TEXT NOT NULL DEFAULT 'Recently',
  raw_text TEXT NOT NULL,
  location TEXT NOT NULL,
  bhk_type TEXT NOT NULL,
  rent INTEGER,
  deposit INTEGER,
  is_brokerage INTEGER NOT NULL,
  is_gated_society INTEGER NOT NULL,
  society_name TEXT,
  has_swimming_pool INTEGER NOT NULL,
  has_power_backup INTEGER NOT NULL,
  has_attached_washroom INTEGER NOT NULL,
  has_balcony INTEGER NOT NULL,
  furnishing TEXT NOT NULL,
  is_kadubeesanahalli_direct INTEGER NOT NULL,
  contact_phone TEXT,
  distance_km REAL NOT NULL,
  inbound_mins INTEGER NOT NULL,
  outbound_mins INTEGER NOT NULL,
  two_way_avg_peak_mins INTEGER NOT NULL,
  has_panathur_underpass_bottleneck INTEGER NOT NULL,
  score INTEGER NOT NULL,
  score_breakdown TEXT NOT NULL,
  tier TEXT NOT NULL,
  user_status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_score ON listings(score DESC);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_user_status ON listings(user_status);
```

#### Table: `scrape_logs`
```sql
CREATE TABLE IF NOT EXISTS scrape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  items_scanned INTEGER NOT NULL,
  items_matched INTEGER NOT NULL,
  error_message TEXT,
  ran_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.3 Repository Pattern (`src/db/repository.ts`)
- `listingRepository.upsertListing`: Upserts a listing using `ON CONFLICT(fb_post_id) DO UPDATE SET ...`.
- `listingRepository.getListings(options)`: Dynamic query builder applying filters (`minScore`, `maxRent`, `bhkType`, `furnishing`, `userStatus`, `search`, `sortBy`).
- `listingRepository.getListingById(id)`: Fetches single listing by numeric ID.
- `listingRepository.updateStatus(id, status)`: Updates pipeline status (`new`, `interested`, `called`, `applied`, `rejected`).
- `listingRepository.getStats()`: Computes aggregate metrics (unicorn matches, great matches, average rent, average commute, gated count, pool count, direct owner count).
- `listingRepository.logScrapeRun(status, scanned, matched, error)`: Appends an audit log into `scrape_logs`.

---

## 3. `/api/listings` Implementation & Query Execution

### 3.1 Dual Endpoint Handlers
- **Vercel Edge Handler**: `api/index.ts` (`getListingsHandler`, lines 280–354).
- **Node Development Handler**: `src/server/routes/listings.ts` (lines 8–53).

### 3.2 Current Query Logic & Supported Parameters
Both implementations construct dynamic SQL filters based on:
1. `minScore`: `AND score >= ?`
2. `maxRent`: `AND (rent <= ? OR rent IS NULL)`
3. `bhkType`: `AND bhk_type LIKE ?`
4. `furnishing`: `AND furnishing = ?`
5. `userStatus`: `AND user_status = ?`
6. `search`: `AND (raw_text LIKE ? OR society_name LIKE ? OR location LIKE ? OR author_name LIKE ? OR contact_phone LIKE ?)`
7. `sortBy`:
   - `rent_asc`: `ORDER BY CASE WHEN rent IS NULL THEN 999999 ELSE rent END ASC`
   - `commute_asc`: `ORDER BY two_way_avg_peak_mins ASC`
   - `newest`: `ORDER BY created_at DESC`
   - `score_desc` (default): `ORDER BY score DESC, created_at DESC`

### 3.3 Gaps & Requirements Identified for v2:
- **Server-Side Pagination**:
  - `api/index.ts` and `src/server/routes/listings.ts` do not currently perform SQL `LIMIT` and `OFFSET` queries.
  - The API currently returns `{ count: listings.length, listings }`.
  - It needs to accept `page` (default 1) and `limit` (default 12), compute `totalCount`, `totalPages`, `hasMore`, and return the standard `PaginatedListingsResponse` envelope:
    ```typescript
    {
      count: number;
      totalCount: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
      listings: RentalListing[];
    }
    ```
- **Recency Filter Support**:
  - Parameter `recency` (`1h`, `3h`, `6h`, `12h`, `24h`, `7d`, `all`) passed by the frontend filter bar must be translated into datetime window constraints on `created_at` (e.g. `datetime('now', '-1 hour')`).

---

## 4. Scoring Engine & Rental Post Attributes

### 4.1 Scoring Engine Logic (`src/domain/scorer/ratingEngine.ts`)
The scoring engine is a pure, deterministic function `computeListingScore(entities, commute)` using configuration constants from `src/domain/config.ts`:

| Rule / Feature | Condition | Points Delta |
|---|---|---|
| **Base Score** | Initial baseline | `+50 pts` |
| **Rent $\le$ 25k** | `rent <= 25000` | `+20 pts` |
| **Rent 25k–30k** | `25000 < rent <= 30000` | `0 pts` |
| **Rent > 30k** | `rent > 30000` | `-20 pts` |
| **Zero Brokerage** | `isBrokerage === false` | `+15 pts` |
| **Broker Fee Applicable** | `isBrokerage === true` | `-30 pts` (strict penalty) |
| **Low Deposit** | `deposit <= 50000` | `+10 pts` |
| **High Deposit Ratio** | `deposit > 2.2 * rent` | `-15 pts` (strict penalty) |
| **Gated Society** | `isGatedSociety === true` | `+15 pts` |
| **Swimming Pool** | `hasSwimmingPool === true` | `+15 pts` |
| **100% Power Backup** | `hasPowerBackup === true` | `+10 pts` |
| **Attached Washroom** | `hasAttachedWashroom === true` | `+10 pts` |
| **Shared Washroom** | `hasAttachedWashroom === false` | `-5 pts` (penalty) |
| **Male/Bachelor Match** | `isMaleBachelorAllowed === true` | `+10 pts` |
| **Female Only (Mismatch)** | `isFemaleOnly === true` | `-25 pts` |
| **Walking Proximity** | `isWalkingDistance === true` OR `distance <= 0.6 km` | `+15 pts` |
| **Furnished Flat** | Fully / Semi-Furnished | `+5 pts` |
| **Panathur Bypass** | `isKadubeesanahalliDirect === true` | `+10 pts` |
| **Peak Commute $\le$ 7 min** | `twoWayAvgPeakMins <= 7` | `+20 pts` |
| **Peak Commute 8–12 min** | `8 <= twoWayAvgPeakMins <= 12` | `+10 pts` |
| **Peak Commute 13–18 min** | `13 <= twoWayAvgPeakMins <= 18` | `-5 pts` |
| **Peak Commute > 18 min** | `twoWayAvgPeakMins > 18` | `-25 pts` |
| **Vegetarian-Only Penalty** | `isVegetarianOnly === true` | `-50 pts` (applied directly) |

### 4.2 Score Clamping & Rating Tiers
- Scores are strictly clamped between `[0, 100]`.
- **Tiers**:
  - `🔥 Unicorn Deal`: Score $\ge 90$
  - `✨ Great Match`: Score $75 - 89$
  - `⚡ Moderate Match`: Score $55 - 74$
  - `⚠️ Low Match`: Score $< 55$

### 4.3 Entity Extraction Pipeline (`src/domain/parser/`)
- **`cleaner.ts`**: Strips Facebook reaction noise, comment controls, timestamp lines.
- **`filter.ts`**:
  - `isValidLocation`: Requires Kadubeesanahalli, Prestige Tech Park, Cessna, Panathur Road near PTP; rejects Bellandur, Marathahalli, Green Glen Layout, Kariyammana Agrahara, Sarjapur, HSR, etc.
  - `isValidGender`: Rejects female-only / girls-only postings.
  - `isValidBHK`: Identifies 1 BHK, 2 BHK, 3 BHK, or Private Room / Flatmate.
  - `isRentalOffering`: Filters out spam, item sales, and pure flat seeker posts.
- **`extractor.ts`**:
  - Regex parsers for monthly rent and security deposit.
  - Zero-brokerage vs broker contact detection.
  - Gated society name matching against `KNOWN_SOCIETIES` (Sobha Iris, Sobha Hibiscus, Assetz East Point, Assetz Marq, Goyal Orchid Lakeview, Prestige Sunnyside, Divyasree 77 East, SJR Parkway Homes, Salarpuria Sattva, Umiya City).
  - Attached vs shared washroom detection.
  - Vegetarian-only restriction detection (`/veg only|vegetarian only|strictly veg/i`).
  - Contact phone number extraction (10-digit Indian mobile format).
- **`commute/router.ts`**:
  - Haversine distance from PTP main gate (`12.9385, 77.6917`).
  - Road distance adjustment (1.35x winding factor).
  - 11:00 AM – 1:00 PM IST inbound peak multiplier (1.30x).
  - 4:00 PM – 6:00 PM IST outbound peak multiplier (1.65x).
  - Panathur Railway Underpass (RUB) choke point delay (+8 mins).

---

## 5. Scraping Triggers & Passcode Restrictions

### 5.1 Current Passcode Protection Implementation
- `api/index.ts` (lines 248–261) and `src/server/app.ts` (lines 15–38):
  - Middleware checks `process.env.DASHBOARD_PASSCODE`.
  - Public routes: `/health`, `/api/health`, `/config`, `/api/config`.
  - Reads `x-dashboard-passcode` header or `?passcode=` query string.
  - Non-GET requests (such as `/api/scrape/trigger`, `/api/scrape/seed`, `/api/listings/:id/status`) return `401 Unauthorized` if passcode is invalid.
- **Requirement R4 Change**:
  - Remove passcode restrictions on scrape triggers (`/api/scrape/trigger`, `/api/scrape/seed`) so automated triggers and user-initiated scans work out-of-the-box without requiring a passcode.

### 5.2 Scrape Triggers
- **Local/CLI Playwright**:
  - `src/scraper/groupScraper.ts` monitors 4 Facebook groups:
    - *Flat and Flatmates Bangalore*
    - *Bangalore Flatmates*
    - *Flats Without Brokers Bangalore*
    - *Flats and Flatmates Kadubeesanahalli*
  - Automatically loads realistic seed fixtures (`src/scraper/seedData.ts`) if no persistent Facebook session profile exists.
- **Vercel Serverless / Edge**:
  - In `api/index.ts`, `/api/scrape/trigger` and `/api/scrape/seed` seed/resync verified listings directly into the SQLite/Turso database.
- **GitHub Actions Automation**:
  - `.github/workflows/scraper.yml` runs hourly (`cron: '0 * * * *'`), boots Playwright Chromium on Ubuntu, injects `FB_SESSION_STORAGE`, runs `pnpm scrape`, and syncs directly to Turso Cloud SQLite.

---

## 6. Cross-Group Deduplication & Recency Engine

### 6.1 Deduplication Logic (`src/domain/parser/deduplicator.ts`)
- `areDuplicates(a: RentalListing, b: RentalListing): boolean`:
  1. **Exact Facebook Post ID Match**: `a.fbPostId === b.fbPostId`
  2. **Phone Number + Rent/Society Match**: Same 10-digit phone AND (identical rent OR identical society).
  3. **Author Name + Text Similarity**: Same author name AND Jaccard 3-gram character similarity $> 0.70$.
  4. **High Text Similarity**: Jaccard 3-gram character similarity $> 0.88$.
- `deduplicateListings(listings: RentalListing[])`:
  - Merges duplicate listings into a canonical entity.
  - Merges all distinct group names into `groupNames: string[]`.
  - Sets `postCount: groupNames.length`.
  - Merges contact numbers and society details into the canonical record.

### 6.2 Storage & Identification
- `fb_post_id` in `src/domain/parser/cleaner.ts` hashes `groupName:authorName:sampleText`. Because `groupName` is included in the hash, cross-posts from different groups receive distinct `fb_post_id` keys and are safely persisted in SQLite without conflict.
- The deduplication engine operates on query results to consolidate cross-posted records before rendering.
- The UI (`ListingCard.tsx`) renders the `Seen in X groups` badge (`<Layers /> {listing.postCount} groups`) with a tooltip listing all source groups.

---

## 7. Testing & Verification Infrastructure

### 7.1 Vitest Suite (`tests/`)
The test suite consists of 5 modular domain test files:
1. `tests/commute.test.ts` (2 tests): Validates peak hour multipliers, Haversine distance, and Panathur Underpass bottleneck delay.
2. `tests/deduplicator.test.ts` (2 tests): Validates phone+rent duplicate detection and group name consolidation.
3. `tests/scorer.test.ts` (3 tests): Validates Unicorn Deal tier (90+), brokerage/deposit/commute penalties, and the -50 point vegetarian penalty.
4. `tests/filter.test.ts` (5 tests): Validates location allowlists, non-target location rejections (Bellandur, Marathahalli), gender filtering, and BHK classification.
5. `tests/extractor.test.ts` (6 tests): Validates rent regex extraction, deposit calculation, zero-brokerage detection, society amenities, and phone extraction.

### 7.2 Execution & Verification Results
- Command: `pnpm test` (running `vitest run`)
- Result: **5/5 test files passed, 18/18 tests passed (0 failures, duration 258ms)**.
- Production Build: `pnpm build` (`tsc && vite build`) executes cleanly in 1.10s with zero TypeScript compilation errors.

---

## 8. Summary of Findings & Actionable Recommendations

| Area | Current State | Requirement for v2 | Impact / Action |
|---|---|---|---|
| **API Pagination** | Full array returned without LIMIT/OFFSET | SQL LIMIT & OFFSET with `PaginatedListingsResponse` | Refactor `/api/listings` in `api/index.ts` and `src/server/routes/listings.ts` |
| **Recency Filtering** | Not handled in backend SQL | 1h, 3h, 6h, 12h, 24h, 7d time windows | Add datetime filter to SQL WHERE clause |
| **Passcode Gates** | Blocks scrape endpoints | Remove passcode restrictions on scrape triggers | Update middleware in `api/index.ts` & `src/server/app.ts` |
| **Scoring Engine** | Implemented with refined v2 rules | Maintain strict -50 veg penalty, -30 broker, -15 deposit | Fully verified by `tests/scorer.test.ts` |
| **Deduplication** | Implemented in `deduplicator.ts` | Merge cross-posts, show multi-group badge | Integrates with paginated listings pipeline |
| **OpenStreetMap View** | Leaflet + CartoDB Dark Matter | Clean map with interactive popups & score badges | Fully functional in `src/client/components/MapView.tsx` |
| **Vitest Tests** | 18 passing tests | 100% pass rate maintained | All tests pass |
