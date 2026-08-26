# Milestone 1 Review Report: API & Contract Conformance

**Reviewer**: Milestone 1 Reviewer 2 (`m1_reviewer_2`)  
**Roles**: Reviewer, Adversarial Critic  
**Timestamp**: 2026-08-26T15:24:00Z  
**Verdict**: **APPROVE**  

---

## 1. Observation

1. **`GET /api/listings` Query Parameters & Response Format**:
   - In `src/server/routes/listings.ts` (lines 8–60) and `api/index.ts` (lines 307–460), the endpoint accepts query parameters: `page`, `limit`, `recency`, `minScore`, `maxRent`, `bhkType`, `furnishing`, `userStatus`, `search`, and `sortBy`.
   - Default pagination values are `page = 1` and `limit = 12` (clamped between 1 and 50).
   - In `src/db/repository.ts` (lines 310–344) and `api/index.ts` (lines 433–444), the response envelope conforms strictly to `PaginatedListingsResponse`:
     ```json
     {
       "count": 12,
       "totalCount": 48,
       "page": 1,
       "limit": 12,
       "totalPages": 4,
       "hasMore": true,
       "listings": [...]
     }
     ```
   - Mathematical calculations: `totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit)` and `hasMore = page < totalPages`.

2. **Deduplication Merging Behavior**:
   - In `src/domain/parser/deduplicator.ts` (lines 74–113), `deduplicateListings` iterates over listing slices and consolidates duplicate entries based on:
     - Exact `fbPostId` match (line 37)
     - Matching normalized `contactPhone` + identical `rent` or `societyName` (lines 40–49)
     - Matching `authorName` (non-generic) + Jaccard 3-gram similarity > 0.70 (lines 52–59)
     - High text body similarity > 0.88 (lines 62–64)
   - Merging logic consolidates unique group names into `groupNames: string[]` and sets `postCount: groupNames.length` (lines 82–95). Single unique listings return `groupNames: [current.groupName]` and `postCount: 1` (lines 104–108). Missing phone numbers on canonical records are backfilled from duplicates (lines 98–101).

3. **Scoring Engine Weights and Penalties (R3 & `PROJECT.md`)**:
   - `src/domain/config.ts` (lines 184–209) and `src/domain/scorer/ratingEngine.ts` (lines 17–168) implement the exact refined scoring rules:
     - Base score: `50` (`baseScore: 50`)
     - Male/bachelor accommodation match: `+10` (`bachelorMaleMatch: 10`), mismatch (strictly female only): `-25` (`bachelorMismatchPenalty: -25`)
     - Strict brokerage penalty: `-30` (`brokerageApplicable: -30`), zero brokerage: `+15` (`noBrokerage: 15`)
     - High deposit penalty (>2.2x monthly rent): `-15` (`highDepositRatioPenalty: -15`), low deposit (<=50k): `+10` (`lowDeposit: 10`)
     - Shared/non-dedicated washroom penalty: `-5` (`sharedWashroomPenalty: -5`), attached washroom: `+10` (`attachedWashroom: 10`)
     - Strict vegetarian-only restriction penalty: `-50` (`vegetarianOnlyPenalty: -50`) applied directly and clamped
     - Proximity walking bonus (<500m / walking distance): `+15` (`walkingProximityBonus: 15`)
     - Gated society: `+15`, Pool: `+15`, Power backup: `+10`, Furnished: `+5`, Panathur bypass: `+10`
     - Commute duration: `<=7m` (`+20`), `8-12m` (`+10`), `13-18m` (`-5`), `>18m` (`-25`)
     - Clamping: Scores are strictly bounded in `[0, 100]`.
     - Tiers: `🔥 Unicorn Deal` (>=90), `✨ Great Match` (75–89), `⚡ Moderate Match` (55–74), `⚠️ Low Match` (<55).

4. **Passcode Gate Removal for Scraper Endpoints**:
   - In `src/server/app.ts` (lines 21–30), requests to `/scrape/*`, `/api/scrape/*`, `/health`, and `/config` bypass passcode enforcement even if `DASHBOARD_PASSCODE` is set.
   - `GET /config` and `GET /api/config` in both Node (`src/server/app.ts:50–59`) and Edge (`api/index.ts:269–277`) return `{ requiresPasscode: false }`.

5. **Build and Test Verification Results**:
   - `pnpm test` output:
     ```
     Test Files  7 passed (7)
          Tests  94 passed (94)
     ```
   - `pnpm build` output:
     ```
     $ tsc && vite build
     vite v5.4.21 building for production...
     ✓ 1494 modules transformed.
     dist/index.html                   1.03 kB │ gzip:   0.59 kB
     dist/assets/index-jhEll-Hv.css   41.36 kB │ gzip:  11.93 kB
     dist/assets/index-Br7HAw06.js   345.69 kB │ gzip: 102.45 kB
     ✓ built in 1.04s
     ```

6. **Integrity & Anti-Cheat Check**:
   - No hardcoded test responses, fake bypasses, or facade mock endpoints were detected in source code.
   - SQL queries and scoring formulas are purely dynamic and deterministic.

---

## 2. Logic Chain

1. **API Envelope Completeness**:
   - Observation 1 demonstrates that both Node.js (`src/server/routes/listings.ts`) and Edge Runtime (`api/index.ts`) route handlers calculate SQL `COUNT(*)` alongside paginated `SELECT ... LIMIT ? OFFSET ?`.
   - The returned object strictly fulfills the `PaginatedListingsResponse` schema documented in `PROJECT.md` Section 53 (`count`, `totalCount`, `page`, `limit`, `totalPages`, `hasMore`, `listings`).

2. **Deduplication Correctness**:
   - Observation 2 confirms that multi-group cross-posts are correctly matched via multiple independent signals (post ID, phone + rent/society, author + n-gram similarity, high text similarity).
   - Merged listings correctly output `groupNames` as an array of unique group names and `postCount` as the length of that array, satisfying Requirement R2 / Feature F5.

3. **Scoring Conformance**:
   - Observation 3 proves that all 6 refined scoring requirements from R3 are implemented with exact point weights matching `PROJECT.md`.
   - The vegetarian restriction applies a strict -50 point deduction directly against the score, correctly demoting even high-end listings to <=50 points (Low Match tier).

4. **Dual-Runtime Parity**:
   - Both Node.js runtime (`src/server/routes/listings.ts` + `src/db/repository.ts`) and Vercel Edge runtime (`api/index.ts`) provide identical query filtering, recency SQL handling across all 7 horizons (`1h`, `3h`, `6h`, `12h`, `24h`, `7d`, `all`), batch querying, and response serialization.

5. **Test & Build Stability**:
   - Observation 5 confirms that all 7 test suites (94 total tests) pass without flaky behaviors, and the full production bundle compiles cleanly.

---

## 3. Caveats

- In test environments without live Turso cloud credentials, `@libsql/client/web` is mocked or routed to local/test databases via environment variables. This does not affect runtime production deployments where `TURSO_DATABASE_URL` is supplied over HTTPS/WSS.
- No caveats regarding contract compliance, scoring accuracy, or deduplication merging.

---

## 4. Conclusion & Verdict

**Verdict**: **APPROVE**

Milestone 1 (Backend & Data Engine) fully satisfies all architectural contracts and functional requirements specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`. The pagination API, deduplication pipeline, refined scoring rules, and scraper un-gating are robust, fully tested, and ready for Milestone 2 frontend integration.

---

## 5. Verification Method

To independently verify the implementation:

1. **Execute Unit and Integration Tests**:
   ```bash
   pnpm test
   ```
   *Expected*: 7 test files pass, 94 tests pass.

2. **Execute Production Build**:
   ```bash
   pnpm build
   ```
   *Expected*: Exit code 0, TypeScript type checking and Vite bundler complete with zero errors.

3. **Verify API Contract & Scoring Rules**:
   - Inspect `src/domain/scorer/ratingEngine.ts` and `src/domain/config.ts` to confirm weights and penalty values.
   - Inspect `src/domain/parser/deduplicator.ts` to confirm `groupNames` and `postCount` merging.
   - Inspect `src/server/routes/listings.ts` and `api/index.ts` to confirm `PaginatedListingsResponse` envelope serialization.
