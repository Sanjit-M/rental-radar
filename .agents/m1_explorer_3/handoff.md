# Milestone 1 Handoff Report: Scraper Un-gating and Data Seeding

## 1. Observation

1. **Passcode Middleware in `src/server/app.ts` (lines 14–38)**:
   ```typescript
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
   - Observed that when `process.env.DASHBOARD_PASSCODE` is set, any `POST` request to `/scrape/trigger`, `/api/scrape/trigger`, `/scrape/seed`, or `/api/scrape/seed` without `x-dashboard-passcode` receives `HTTP 401 { error: 'Unauthorized: Invalid or missing dashboard passcode' }`.

2. **Edge API Route Definitions in `api/index.ts` (lines 418–430)**:
   ```typescript
   // Scrape / Seed Endpoints (Unrestricted for seamless UI triggers)
   const triggerRouteHandler = async (c: any) => {
     try {
       const client = getDbClient();
       const count = await seedData(client);
       return c.json({ status: 'success', scanned: count, matched: count, message: `Synced ${count} verified listings to cloud database.` });
     } catch (err: any) {
       return c.json({ status: 'error', message: err?.message || String(err) }, 500);
     }
   };

   app.post('/scrape/trigger', triggerRouteHandler);
   app.post('/api/scrape/trigger', triggerRouteHandler);
   ```
   - Observed that `api/index.ts` has no passcode middleware and exposes `/scrape/trigger` and `/api/scrape/trigger`.
   - Observed that `api/index.ts` **does not define** `/scrape/seed` or `/api/scrape/seed`.

3. **Node.js Scrape Routes in `src/server/routes/scrape.ts` (lines 6–32)**:
   ```typescript
   scrapeRouter.post('/trigger', async (c) => {
     try {
       const { runScrapeCycle } = await import('../../scraper/groupScraper');
       const result = await runScrapeCycle(true);
       return c.json({
         status: result.status,
         message: result.message || `Scraped ${result.scanned} posts, found ${result.matched} matches near PTP.`,
         scanned: result.scanned,
         matched: result.matched,
       });
     } catch (err: any) {
       return c.json({ status: 'error', message: err?.message || String(err) }, 500);
     }
   });

   scrapeRouter.post('/seed', async (c) => {
     try {
       const count = await seedInitialData();
       return c.json({
         status: 'success',
         count,
         message: `Successfully loaded ${count} verified Kadubeesanahalli / PTP listings.`,
       });
     } catch (err: any) {
       return c.json({ status: 'error', message: err?.message || String(err) }, 500);
     }
   });
   ```
   - Observed that Node mode exposes both `/trigger` and `/seed` mounted under `/scrape` and `/api/scrape` in `src/server/app.ts:63-64`.

4. **Frontend API Service in `src/client/services/api.ts` (lines 62–80)**:
   ```typescript
   async triggerScrape(): Promise<{ status: string; message: string }> {
     const res = await fetch(`${API_BASE}/scrape/trigger`, {
       method: 'POST',
       headers: getHeaders(),
     });
     if (res.status === 401) throw new Error('AUTH_REQUIRED');
     if (!res.ok) throw new Error('Failed to trigger scrape');
     return res.json();
   },

   async reseedData(): Promise<{ status: string; count: number }> {
     const res = await fetch(`${API_BASE}/scrape/seed`, {
       method: 'POST',
       headers: getHeaders(),
     });
     if (res.status === 401) throw new Error('AUTH_REQUIRED');
     if (!res.ok) throw new Error('Failed to reseed listings');
     return res.json();
   }
   ```
   - Observed that `api.reseedData()` issues a `POST` request to `/api/scrape/seed`.

5. **Unit Test Suite Output (`pnpm test`)**:
   - `vitest run` passes 18/18 unit tests across 5 test suites (`scorer.test.ts`, `deduplicator.test.ts`, `commute.test.ts`, `filter.test.ts`, `extractor.test.ts`).

---

## 2. Logic Chain

1. **Passcode Gate Analysis**:
   - *From Observation 1*: In `src/server/app.ts`, any non-GET request that does not match `path.endsWith('/health')` or `path.endsWith('/config')` is intercepted by the passcode gate if `DASHBOARD_PASSCODE` is set in the environment.
   - *From Requirement R4 / Feature F10*: Scraper triggers (`/api/scrape/trigger` and `/api/scrape/seed`) must NOT require passcode authorization.
   - *Deduction*: `src/server/app.ts` must be updated to exempt `/scrape/trigger`, `/api/scrape/trigger`, `/scrape/seed`, `/api/scrape/seed` (or all `/scrape/*` routes) from the passcode check.

2. **Route Parity Analysis**:
   - *From Observation 2 & 4*: The frontend `api.reseedData()` calls `POST /api/scrape/seed`. In `src/server/routes/scrape.ts` (Node mode), this endpoint exists and runs `seedInitialData()`. However, in `api/index.ts` (Edge mode), this endpoint is missing, returning a 404 error if called on Vercel.
   - *Deduction*: `api/index.ts` must define `app.post('/scrape/seed', triggerRouteHandler)` and `app.post('/api/scrape/seed', triggerRouteHandler)` to ensure route parity.

3. **Dual-Mode Scraper Compatibility**:
   - *From Observation 2 & 3*:
     - In Edge mode, `seedData(client)` directly executes the domain parser, commute router, and rating engine on the 6 verified fixtures in `SEED_POSTS` and upserts them into LibSQL/Turso.
     - In Node mode, `runScrapeCycle()` checks for an active Playwright browser session (`hasExistingSession()`). If absent, it logs a notice and invokes `seedInitialData()`, ensuring seamless local development without requiring live Facebook credentials.
   - *Deduction*: Both execution modes already implement safe and deterministic fallback seeding; un-gating the endpoints and aligning routes will complete Milestone 1 requirements.

---

## 3. Caveats

- In local Node mode with Playwright session files present (`.fb_rental_profile`), `runScrapeCycle` will execute real browser scraping. Without session files, it automatically falls back to `seedInitialData()`. This fallback is intentional and verified.
- Passcode gating on status mutations (`PATCH /api/listings/:id/status`) in Node mode remains gated if `DASHBOARD_PASSCODE` is active, whereas in Edge mode all endpoints are open (`requiresPasscode: false`). If status updates in Node mode should also be un-gated or kept behind passcode, this is configurable via `DASHBOARD_PASSCODE`.
- No other caveats.

---

## 4. Conclusion

Milestone 1 scraper un-gating and data seeding requires two concise, targeted updates:
1. Update `src/server/app.ts` passcode middleware to exempt `/scrape/*` routes from the passcode gate.
2. Add route handlers for `POST /scrape/seed` and `POST /api/scrape/seed` in `api/index.ts` pointing to `triggerRouteHandler`.

---

## 5. Verification Method

1. **Verify Unit Tests**:
   ```bash
   pnpm test
   ```
2. **Verify Node Server Scraper Un-gating with Passcode Enabled**:
   ```bash
   DASHBOARD_PASSCODE=testpasscode pnpm dev:server
   curl -X POST http://localhost:3001/api/scrape/trigger
   curl -X POST http://localhost:3001/api/scrape/seed
   ```
   *Pass Condition*: Both curl requests return HTTP 200 with JSON response payloads (e.g. `{"status": "seed_loaded", ...}` or `{"status": "success", ...}`), with zero 401 Unauthorized errors.
3. **Verify Edge API Route Parity**:
   Inspect `api/index.ts` to confirm `/scrape/seed` and `/api/scrape/seed` are mapped to `triggerRouteHandler`.
