# Milestone 1 Investigation Report: Scraper Un-gating and Data Seeding

## Executive Summary
This investigation analyzes the passcode authorization gate, scraper route definitions, and data seeding pipelines across both **Vercel Edge Runtime** (`api/index.ts`) and **Local Node.js Runtime** (`src/server/app.ts`, `src/server/routes/scrape.ts`, `src/scraper/groupScraper.ts`). We verified that Edge mode is already un-gated but lacks `/api/scrape/seed` route parity, while Node mode currently enforces passcode authentication on all mutation requests (including `POST /api/scrape/trigger` and `POST /api/scrape/seed`) when `DASHBOARD_PASSCODE` is set in the environment. Recommendations and exact patches are provided to guarantee full requirement R4/F10 compliance and seamless dual-mode scraper operation.

---

## 1. Architectural Architecture & Dual-Mode Execution Overview

Rental Radar v2 operates in two distinct server execution environments:

```
                                  ┌──────────────────────────────┐
                                  │   Client Frontend (Vite)     │
                                  └──────────────┬───────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │                                                 │
                        ▼                                                 ▼
          ┌───────────────────────────┐                     ┌───────────────────────────┐
          │     Vercel Edge API       │                     │    Node.js Local Server   │
          │      (api/index.ts)       │                     │    (src/server/app.ts)    │
          ├───────────────────────────┤                     ├───────────────────────────┤
          │ • Runtime: Vercel Edge    │                     │ • Runtime: Node.js        │
          │ • DB: LibSQL / Turso Web  │                     │ • DB: LibSQL Web/Local DB │
          │ • Scraper: Direct Seeding │                     │ • Scraper: Playwright +   │
          │   of Verified Fixtures    │                     │   Fallback Seeding        │
          └───────────────────────────┘                     └───────────────────────────┘
```

### Dual Modes:
1. **Edge Runtime (`api/index.ts`)**:
   - Configured with `export const config = { runtime: 'edge' }`.
   - Utilizes `@libsql/client/web` for direct HTTP/WebSocket SQL execution against Turso or local LibSQL instances.
   - Headless browser automation (Playwright/Chromium) cannot run in the Edge environment; therefore, scraping triggers execute `seedData(client)`, which filters, parses, computes scooter commute metrics, scores, and upserts the 6 realistic Bangalore/PTP accommodation fixtures from `src/scraper/seedData.ts`.
2. **Local Node.js Runtime (`src/server/app.ts`, `src/server/index.ts`)**:
   - Runs standard Node.js server via `@hono/node-server`.
   - Connects to SQLite (`data/listings.db`) or Turso via `src/db/database.ts`.
   - Has full access to Playwright browser automation via `src/scraper/groupScraper.ts`. When a Facebook session exists (`hasExistingSession()`), it crawls the 4 target FB groups. When no session exists, it gracefully falls back to `seedInitialData()`.

---

## 2. Passcode Gate & Middleware Audit

### Node.js Server (`src/server/app.ts`)
In `src/server/app.ts` (lines 14–38), the passcode middleware currently checks every incoming request:

```typescript
// Passcode Gate Middleware (Protects mutation/scrape endpoints if DASHBOARD_PASSCODE is configured)
app.use('*', async (c, next) => {
  const passcode = process.env.DASHBOARD_PASSCODE;
  if (!passcode) {
    return next();
  }

  // Health and config are always public
  const path = c.req.path;
  if (path.endsWith('/health') || path.endsWith('/config')) {
    return next();
  }

  // Check header or query parameter
  const clientPasscode = c.req.header('x-dashboard-passcode') || c.req.query('passcode');
  if (clientPasscode !== passcode) {
    // If it's a GET request without passcode, allow read-only
    if (c.req.method === 'GET' && !process.env.STRICT_READ_LOCK) {
      return next();
    }
    return c.json({ error: 'Unauthorized: Invalid or missing dashboard passcode' }, 401);
  }

  return next();
});
```

#### Defect Identification:
- If `DASHBOARD_PASSCODE` is set in the environment, any `POST` request to `/scrape/trigger`, `/api/scrape/trigger`, `/scrape/seed`, or `/api/scrape/seed` without an `x-dashboard-passcode` header or `?passcode=` query parameter is blocked with `401 Unauthorized`.
- This violates **Requirement R4** ("remove passcode restrictions on scrape triggers") and **Feature F10** ("Passcode Gate Removal for Scrapers: Remove passcode restriction on `/api/scrape/trigger` and `/api/scrape/seed`").

### Edge API (`api/index.ts`)
- `api/index.ts` has **no passcode middleware** whatsoever.
- Line 267 explicitly advertises: `requiresPasscode: false`.
- Endpoints `POST /scrape/trigger` and `POST /api/scrape/trigger` (lines 418–430) are completely public and execute without restriction.

---

## 3. Scraper & Seeding Route Comparison Matrix

| Route Endpoint | Edge API (`api/index.ts`) | Node.js Server (`src/server/app.ts` + `routes/scrape.ts`) | Status / Parity Gap |
| :--- | :--- | :--- | :--- |
| `POST /api/scrape/trigger` | ✅ Mounted (lines 428–429). Runs `seedData(client)`. Public. | ✅ Mounted (line 64). Runs `runScrapeCycle(true)`. ⚠️ **Blocked by passcode if env set.** | Passcode exemption required in Node. |
| `POST /scrape/trigger` | ✅ Mounted (line 428). Runs `seedData(client)`. Public. | ✅ Mounted (line 63). Runs `runScrapeCycle(true)`. ⚠️ **Blocked by passcode if env set.** | Passcode exemption required in Node. |
| `POST /api/scrape/seed` | ❌ **Missing from `api/index.ts`** (Returns 404). | ✅ Mounted (lines 21–32). Runs `seedInitialData()`. ⚠️ **Blocked by passcode if env set.** | Route missing in Edge; passcode exemption needed in Node. |
| `POST /scrape/seed` | ❌ **Missing from `api/index.ts`** (Returns 404). | ✅ Mounted (lines 21–32). Runs `seedInitialData()`. ⚠️ **Blocked by passcode if env set.** | Route missing in Edge; passcode exemption needed in Node. |
| `GET /api/config` | Returns `{ requiresPasscode: false, ... }` | Returns `{ requiresPasscode: Boolean(process.env.DASHBOARD_PASSCODE), ... }` | Recommend aligning Node `requiresPasscode: false` or keeping boolean strictly for non-scrape admin locks. |

---

## 4. Scraper & Data Seeding Execution Flow

### A. Edge Seeding Pipeline (`api/index.ts:168–254`)
1. **Trigger**: `POST /api/scrape/trigger` (or auto-seed when `COUNT(*) === 0` in `GET /api/listings`).
2. **Schema Verification**: Calls `ensureSchema(client)` to initialize `listings` table and DDL indexes.
3. **Pipeline Loop**: For each post in `SEED_POSTS`:
   - `cleanPostText(post.text)`
   - `passesAllFilters(clean)`: verifies location match (`Kadubeesanahalli`, `PTP`, etc.) and BHK structure.
   - `extractAllEntities(clean)`: extracts rent, deposit, brokerage, society, amenities, washroom, etc.
   - `calculatePeakScooterCommute(lat, lon, location, directKadubeesanahalli)`: computes inbound, outbound, two-way peak commute minutes and Panathur bottlenecks.
   - `computeListingScore(entities, commute)`: calculates deterministic 0–100 score, tier, and breakdown.
   - `INSERT INTO listings ... ON CONFLICT(fb_post_id) DO UPDATE ...`
4. **Response**:
   ```json
   {
     "status": "success",
     "scanned": 6,
     "matched": 6,
     "message": "Synced 6 verified listings to cloud database."
   }
   ```

### B. Node.js Seeding & Scraper Pipeline (`src/scraper/groupScraper.ts`)
1. **Trigger**: `POST /api/scrape/trigger` or `POST /api/scrape/seed`.
2. **Mode Determination**:
   - Checks `hasExistingSession()`.
   - **No session profile**: Outputs notice to console and executes `seedInitialData()`.
   - **Session profile exists**: Launches Playwright persistent browser context, navigates through 4 target Facebook groups (`TARGET_FB_GROUPS`), scrolls feeds, extracts post cards, and calls `processPost()`.
3. **Database Insertion**: Calls `listingRepository.upsertListing(listing)`.
4. **Audit Logging**: Inserts execution log into `scrape_logs` table (`listingRepository.logScrapeRun`).
5. **Response**:
   - If seeded: `{ status: "seed_loaded", scanned: 6, matched: 6, message: "..." }`
   - If scraped: `{ status: "success", scanned: N, matched: M, message: "..." }`
   - For `/api/scrape/seed`: `{ status: "success", count: 6, message: "Successfully loaded 6 verified Kadubeesanahalli / PTP listings." }`

---

## 5. Auto-Seeding & Database Self-Healing Audit

Both runtimes feature resilient auto-seeding on initial boot:
- **`api/index.ts` (lines 339–344)**:
  ```typescript
  const allRows = await client.execute('SELECT COUNT(*) as cnt FROM listings');
  const totalInDb = Number(allRows.rows[0]?.cnt || 0);
  if (totalInDb === 0) {
    await seedData(client);
  }
  ```
- **`src/server/routes/listings.ts` (lines 30–38)**:
  ```typescript
  if (listings.length === 0 && !search && minScore === undefined && maxRent === undefined) {
    const allCount = (await listingRepository.getListings()).length;
    if (allCount === 0) {
      console.log('📦 Database is empty. Auto-seeding initial listings...');
      await seedInitialData();
      listings = await listingRepository.getListings(options);
    }
  }
  ```
Both paths guarantee that the first time a user opens the application on an empty database (locally or on Vercel), verified listings are populated and scored without manual intervention.

---

## 6. Proposed Code Changes

### Proposed Change 1: Un-gate Scrape Routes in `src/server/app.ts`

**Target File**: `src/server/app.ts` (lines 21–25)

#### Before:
```typescript
  // Health and config are always public
  const path = c.req.path;
  if (path.endsWith('/health') || path.endsWith('/config')) {
    return next();
  }
```

#### After:
```typescript
  // Health, config, and scraper/seed routes are always un-gated (Requirement R4)
  const path = c.req.path;
  if (
    path.endsWith('/health') ||
    path.endsWith('/config') ||
    path.endsWith('/scrape/trigger') ||
    path.endsWith('/scrape/seed') ||
    path.includes('/scrape/')
  ) {
    return next();
  }
```

---

### Proposed Change 2: Add Seed Route Aliases in `api/index.ts`

**Target File**: `api/index.ts` (after line 430)

#### Before:
```typescript
app.post('/scrape/trigger', triggerRouteHandler);
app.post('/api/scrape/trigger', triggerRouteHandler);
```

#### After:
```typescript
app.post('/scrape/trigger', triggerRouteHandler);
app.post('/api/scrape/trigger', triggerRouteHandler);
app.post('/scrape/seed', triggerRouteHandler);
app.post('/api/scrape/seed', triggerRouteHandler);
```

---

## 7. Verification Method

1. **Unit Tests**:
   ```bash
   pnpm test
   ```
2. **Local Node API Scraper & Passcode Test**:
   ```bash
   DASHBOARD_PASSCODE=secret123 pnpm dev:server
   curl -X POST http://localhost:3001/api/scrape/trigger
   curl -X POST http://localhost:3001/api/scrape/seed
   ```
   *Expected Result*: Returns HTTP 200 with JSON payload and no 401 Unauthorized error.
3. **Edge Route Parity Test**:
   Test both `/api/scrape/trigger` and `/api/scrape/seed` against the Edge handler.
