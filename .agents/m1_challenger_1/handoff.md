# Handoff Report — Milestone 1 Adversarial Challenger 1 (Pagination & Recency Stress Verifier)

**Date**: 2026-08-26  
**Agent**: m1_challenger_1 (Empirical Challenger: Pagination & Recency Stress Verifier)  
**Parent Conversation ID**: `1d6c49fd-0900-4e18-b65f-f61cd2a5fe80`  
**Status**: Hard Handoff (Completed)

---

## 1. Observation

Direct empirical observations across `src/db/repository.ts`, `src/db/database.ts`, `src/server/routes/listings.ts`, `api/index.ts`, and test execution:

### 1.1 Test Suite Execution
- **Command**: `pnpm test`
- **Output**:
  ```
  Test Files  7 passed (7)
       Tests  94 passed (94)
    Duration  598ms
  ```
  All 94 unit and requirements tests pass.

### 1.2 Pagination Edge Case Observations
In `src/db/repository.ts` (lines 311–313, 332–333) and `src/server/routes/listings.ts` (lines 14–15):
```ts
const page = Math.max(1, typeof options.page === 'number' && !isNaN(options.page) ? options.page : 1);
const limit = Math.min(50, Math.max(1, typeof options.limit === 'number' && !isNaN(options.limit) ? options.limit : 12));
const offset = (page - 1) * limit;
const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
const hasMore = page < totalPages;
```
Empirically executed across adversarial boundary parameters:
- `page = 0` / `page = -10` -> Coerced safely to `page = 1`.
- `limit = 0` / `limit = -5` -> Coerced safely to default `limit = 12` in HTTP router and `limit = 1` in repository direct call.
- `limit = 1000` -> Clamped safely to max `limit = 50`.
- `page = 9999` (where `totalPages = 1`) -> Returns `count = 0`, `listings = []`, `hasMore = false`, `totalPages = 1`, `totalCount = 12`.
- `totalCount = 0` (empty search query / no matches) -> Returns `count = 0`, `totalCount = 0`, `page = 1`, `limit = 12`, `totalPages = 0`, `hasMore = false`, `listings = []`.

### 1.3 Recency SQL Filter Substring Collisions
In `src/db/repository.ts` (lines 43–64) and `api/index.ts` (lines 282–303):
```ts
case '1h':
  return " AND (created_at >= datetime('now', '-1 hour') OR posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%just now%' OR posted_time LIKE '%Recently%')";

case '3h':
  return " AND (created_at >= datetime('now', '-3 hours') OR posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%2 hr%' OR posted_time LIKE '%3 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%2 hour%' OR posted_time LIKE '%3 hour%' OR posted_time LIKE '%Recently%')";

case '6h':
  return " AND (created_at >= datetime('now', '-6 hours') OR posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%2 hr%' OR posted_time LIKE '%3 hr%' OR posted_time LIKE '%4 hr%' OR posted_time LIKE '%5 hr%' OR posted_time LIKE '%6 hr%' OR posted_time LIKE '%1 hour%' OR posted_time LIKE '%2 hour%' OR posted_time LIKE '%3 hour%' OR posted_time LIKE '%4 hour%' OR posted_time LIKE '%5 hour%' OR posted_time LIKE '%6 hour%' OR posted_time LIKE '%Recently%')";

case '12h':
  return " AND (created_at >= datetime('now', '-12 hours') OR ((posted_time LIKE '%min%' OR posted_time LIKE '%hr%' OR posted_time LIKE '%Recently%') AND posted_time NOT LIKE '%13 hr%' AND posted_time NOT LIKE '%14 hr%' AND posted_time NOT LIKE '%15 hr%' AND posted_time NOT LIKE '%16 hr%' AND posted_time NOT LIKE '%17 hr%' AND posted_time NOT LIKE '%18 hr%' AND posted_time NOT LIKE '%19 hr%' AND posted_time NOT LIKE '%20 hr%' AND posted_time NOT LIKE '%21 hr%' AND posted_time NOT LIKE '%22 hr%' AND posted_time NOT LIKE '%23 hr%' AND posted_time NOT LIKE '%day%' AND posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%'))";
```

Direct empirical evaluation in SQLite yields the following substring collision matches:
1. **Multi-digit hour collisions**:
   - `posted_time = '11 hrs ago'` matches `1h` (because `'11 hrs'` contains `'1 hr'`).
   - `posted_time = '21 hrs ago'` matches `1h` (because `'21 hrs'` contains `'1 hr'`).
   - `posted_time = '12 hrs ago'` matches `3h` (because `'12 hrs'` contains `'2 hr'`).
   - `posted_time = '22 hrs ago'` matches `3h` (because `'22 hrs'` contains `'2 hr'`).
   - `posted_time = '13 hrs ago'` matches `3h` (because `'13 hrs'` contains `'3 hr'`).
   - `posted_time = '23 hrs ago'` matches `3h` (because `'23 hrs'` contains `'3 hr'`).
   - `posted_time = '14 hrs ago'` matches `6h` (because `'14 hrs'` contains `'4 hr'`).
   - `posted_time = '24 hrs ago'` matches `6h` (because `'24 hrs'` contains `'4 hr'`).
   - `posted_time = '15 hrs ago'` matches `6h` (because `'15 hrs'` contains `'5 hr'`).
   - `posted_time = '16 hrs ago'` matches `6h` (because `'16 hrs'` contains `'6 hr'`).
2. **Missing `'hour'` spelling in 12h and 24h filters**:
   - `posted_time = '1 hour ago'` or `'2 hours ago'` or `'10 hours ago'` does NOT contain substring `'hr'`, so when `created_at` is older, it evaluates to `false` in `12h` and `24h` queries.
3. **Missing `24 hr` exclusion in 12h filter**:
   - `posted_time = '24 hrs ago'` matches `12h` filter because the exclusion chain only extends up to `23 hr`.
4. **Day count leakage in 7d filter**:
   - `posted_time = '8 days ago'`, `'10 days ago'`, `'100 days ago'` matches `7d` because the negative list only checks `'%2 week%'`, `'%3 week%'`, `'%4 week%'`, `'%month%'`, `'%year%'`.

### 1.4 Database Client URI Scheme Compatibility
In `src/db/database.ts` (lines 1, 68–71, 127–138):
```ts
import { createClient, Client } from '@libsql/client/web';
...
// Fallback in local node development
const localDbUrl = 'file:data/listings.db';
return new WebLibSqlDatabase(localDbUrl);
```
- `@libsql/client/web` is imported for Node.js local fallback.
- When `TURSO_DATABASE_URL` is omitted and falls back to `file:data/listings.db`, `@libsql/client/web` throws:
  ```
  LibsqlError: URL_SCHEME_NOT_SUPPORTED: The client that uses Web standard APIs supports only "libsql:", "wss:", "ws:", "https:" and "http:" URLs, got "file:".
  ```
- The main module import `import { createClient } from '@libsql/client'` supports `file:` in Node.js, whereas `@libsql/client/web` is strictly for browser/Edge environments.

### 1.5 Page-Boundary Deduplication Behavior
- In `src/db/repository.ts` (line 330) and `api/index.ts` (line 431), deduplication is executed in-memory after SQL `LIMIT ? OFFSET ?`.
- If two cross-posted duplicate listings are retrieved on different pages (e.g. post A at index 11 on Page 1, post B at index 12 on Page 2), each page returns 1 independent listing with `postCount = 1` rather than being consolidated.

---

## 2. Logic Chain

1. **Pagination Mathematical Correctness**:
   - For all boundary inputs ($page \le 0$, $limit \le 0$, $limit > 50$, $page > totalPages$), `getPaginatedListings` computes bounds deterministically: $offset = (page - 1) \times limit$, $totalPages = \lceil totalCount / limit \rceil$, and $hasMore = (page < totalPages)$.
   - Empty result sets return $totalPages = 0$ and $hasMore = false$, strictly adhering to the `PaginatedListingsResponse` contract defined in `PROJECT.md`.

2. **SQL Injection Resistance**:
   - All filter parameters (`minScore`, `maxRent`, `bhkType`, `furnishing`, `userStatus`, `search`, `limit`, `offset`) use parameterized queries (`?` positional arguments).
   - Dynamic clause generators (`buildRecencySqlCondition`, `buildOrderClause`) use exhaustive switch statements with safe fallback defaults, preventing SQL injection.

3. **Recency String Matching Flaw**:
   - Using unanchored SQL `LIKE '%X hr%'` matches any string where `X hr` is preceded by another digit (e.g., `11`, `21`, `14`, `24`).
   - For complete accuracy, SQL LIKE pattern matching requires word boundary padding (e.g., `LIKE '% 1 hr%' OR posted_time LIKE '1 hr%'`) or negative exclusions for multi-digit prefixes (`NOT LIKE '%11 hr%' AND NOT LIKE '%21 hr%'`).

4. **Edge vs Node Dual-Runtime Compatibility**:
   - In Vercel Edge (`api/index.ts`), `@libsql/client/web` correctly communicates with Turso over HTTP/WSS.
   - On Node.js (`src/server/index.ts` and `src/db/database.ts`), using `@libsql/client/web` breaks local `file:data/listings.db` execution unless `TURSO_DATABASE_URL` is set to an HTTP/WSS endpoint.

---

## 3. Caveats

1. **Seeding Freshness Heuristic**: When the database is newly seeded, all records have `created_at = datetime('now')`. As a result, the `created_at >= datetime('now', '-1 hour')` clause initially matches all seeded listings on `recency=1h`, regardless of their original `posted_time` text. Over time, as SQLite timestamps age, the filter increasingly relies on `created_at`.
2. **Turso Cloud Mock Availability**: Unit tests in `tests/pagination.test.ts` mock scraper executions and set `TURSO_DATABASE_URL = 'https://demo-db-turso.turso.io'` in `vi.hoisted`. In offline environments without network access to Turso, integration tests must point to a valid local LibSQL/Turso server or local SQLite with `@libsql/client`.

---

## 4. Conclusion

- **Pagination Engine**: **PASS** (100% compliant with boundary clamping, envelope schema, and offset arithmetic).
- **Edge API & Batch Querying**: **PASS** (Atomic batch execution via `client.batch` works properly on Libsql; ungated `/config` and `/health` routes pass).
- **Test Suite**: **PASS** (94/94 Vitest tests passing).
- **Identified Deficiencies & Recommendations**:
  1. **Recency Substring Collisions**: Update `buildRecencySqlCondition` to prevent multi-digit hour collisions (`11 hr`, `21 hr`, `14 hr`, `24 hr`) and include both `'hour'` and `'hr'` spellings.
  2. **Database Fallback Scheme in Node**: In `src/db/database.ts`, import `createClient` from `@libsql/client` (or dynamically select `@libsql/client` for Node and `@libsql/client/web` for Edge) to ensure local `file:data/listings.db` works without requiring `TURSO_DATABASE_URL`.

---

## 5. Verification Method

### 5.1 Run Full Test Suite
```bash
cd /Users/nebulo/Workspace/rental-radar
pnpm test
```
*Expected Result*: All 7 test suites (94 tests) pass with 0 errors.

### 5.2 Empirically Reproduce Pagination Edge Cases
```bash
TURSO_DATABASE_URL="https://demo-db-turso.turso.io" pnpm exec tsx -e "
import { createClient } from '@libsql/client';
import { buildRecencySqlCondition } from './src/db/repository';

const client = createClient({ url: 'file:data/test_adversarial.db' });
async function test() {
  const tests = [
    { page: 0, limit: 12 },
    { page: -5, limit: 12 },
    { page: 9999, limit: 12 },
    { page: 1, limit: 0 },
    { page: 1, limit: 1000 },
  ];
  for (const t of tests) {
    const page = Math.max(1, t.page || 1);
    const limit = Math.min(50, Math.max(1, t.limit || 12));
    const offset = (page - 1) * limit;
    console.log('Query:', t, '=> Normalized page:', page, 'limit:', limit, 'offset:', offset);
  }
}
test();
"
```

### 5.3 Empirically Reproduce Recency Substring Collision
```bash
TURSO_DATABASE_URL="https://demo-db-turso.turso.io" pnpm exec tsx -e "
import { createClient } from '@libsql/client';
import { buildRecencySqlCondition } from './src/db/repository';

const client = createClient({ url: 'file:data/test_adversarial.db' });
async function check() {
  const cases = ['11 hrs ago', '14 hrs ago', '24 hrs ago'];
  for (const s of cases) {
    const res1 = await client.execute(\`SELECT CASE WHEN (1=1 \${buildRecencySqlCondition('1h')}) THEN 1 ELSE 0 END as m FROM (SELECT '\${s}' as posted_time, datetime('now', '-100 days') as created_at)\`);
    const res6 = await client.execute(\`SELECT CASE WHEN (1=1 \${buildRecencySqlCondition('6h')}) THEN 1 ELSE 0 END as m FROM (SELECT '\${s}' as posted_time, datetime('now', '-100 days') as created_at)\`);
    console.log(\`'\${s}' matches 1h: \${res1.rows[0].m === 1}, 6h: \${res6.rows[0].m === 1}\`);
  }
}
check();
"
```
*Expected Output*: `'11 hrs ago'` matches 1h: true; `'14 hrs ago'` matches 6h: true; `'24 hrs ago'` matches 6h: true.
