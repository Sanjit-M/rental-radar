# Rental Radar v2 — Test Infrastructure & Architecture

**Document Version**: 2.0.0  
**Target Workspace**: `/Users/nebulo/Workspace/rental-radar`  
**Test Runner**: Vitest (`vitest run` / `vitest`)  
**TypeScript Engine**: Node.js >= 22.0.0 / ESM / Strict Mode  
**Test Framework**: Vitest 1.6.1 + TypeScript 5.4.2  

---

## 1. Overview & Test Philosophy

Rental Radar v2 employs an **Opaque-Box Requirement-Driven Testing Architecture** structured around the 4-Tier Test Methodology. The test suite exercises real domain models, algorithmic invariants, interface contracts, and geospatial routing through production seams without relying on fragile module mocks (`vi.mock` / `jest.mock`).

### Core Testing Pillars:
1. **Behavioral Interface Verification**: Tests verify observable inputs, outputs, error return types, and business rules derived from `ORIGINAL_REQUEST.md` and `PROJECT.md`.
2. **Correct-by-Construction Type Safety**: Branded domain types (`INR`, `Kilometers`, `Minutes`, `FbPostId`, `ListingId`) and Result monads (`ok` / `err`) are verified across entity extraction, filtering, and scoring.
3. **Deterministic Arithmetic**: Point-by-point score breakdowns, boundary ratios (e.g. exactly 2.20x vs 2.21x deposit ratios), and commute time brackets are tested with strict mathematical precision.
4. **Progressive Testability & Isolation**: Tests are self-contained, independent of execution order, and executable in under 500ms.

---

## 2. Directory Layout & Test Inventory

```
rental-radar/
├── tests/
│   ├── e2e_requirements.test.ts  # 4-Tier Comprehensive E2E Requirements Suite (59 tests)
│   ├── scorer.test.ts            # Scoring Engine & Tier Categorization Unit Suite (3 tests)
│   ├── deduplicator.test.ts      # Multi-Signal Cross-Group Deduplication Suite (2 tests)
│   ├── commute.test.ts           # Weekday Peak Scooter Commute Simulator Suite (2 tests)
│   ├── filter.test.ts            # Locality, Gender, and BHK Filtering Suite (5 tests)
│   └── extractor.test.ts         # Branded Entity Extraction & Entity Dictionary Suite (6 tests)
├── TEST_INFRA.md                 # Test Infrastructure Specification (this file)
└── TEST_READY.md                 # E2E Test Suite Publication & Coverage Matrix
```

### Test File Responsibilities

| Test File | Test Count | Scope | Primary Contracts Tested |
|---|---|---|---|
| `tests/e2e_requirements.test.ts` | 59 | Complete 4-Tier E2E verification across all 5 core requirements (R1–R5) | Geospatial coordinates, deduplication, scoring algorithm, pagination API contracts, deployment verification |
| `tests/scorer.test.ts` | 3 | Focused unit tests for the 0–100 scoring engine | Unicorn deal threshold, broker penalties, vegetarian restrictions |
| `tests/deduplicator.test.ts` | 2 | Focused unit tests for duplicate detection & merging | Phone matching, multi-group consolidation |
| `tests/commute.test.ts` | 2 | Peak scooter traffic simulation unit tests | Kadubeesanahalli direct vs Panathur underpass congestion |
| `tests/filter.test.ts` | 5 | Locality, gender, and BHK filtering tests | Bellandur/Marathahalli exclusion, PTP corridor matching |
| `tests/extractor.test.ts` | 6 | Typed entity parsing and brand validation | Rent, deposit, brokerage, amenities, contact phone |
| **Total Test Suite** | **77 tests** | **100% Pass Rate** | **Execution Time: ~345ms** |

---

## 3. The 4-Tier Test Architecture

### Tier 1: Feature Coverage (>=5 tests per core requirement)
Verifies primary capability contracts for every feature in scope:
- **R1 Geospatial Map**: PTP anchor landmark coordinates (`12.9385, 77.6917`), 10+ society coordinates (`KNOWN_SOCIETIES`), score badge color mapping, WhatsApp/Facebook popup action links, and 3-way responsive view switching contracts.
- **R2 Deduplication & Recency**: Exact Facebook post ID matching, normalized contact phone + rent matching, contact phone + society matching, author + Jaccard 3-gram text similarity (>0.70), canonical record merging with `groupNames` and `postCount`, and recency time-window enum support (`1h`, `3h`, `6h`, `12h`, `24h`, `7d`, `all`).
- **R3 Scoring Algorithm**: Base 50 points, bachelor male match (+10) vs female-only (-25), zero brokerage (+15) vs broker fee (-30), low deposit (+10) vs high deposit ratio (-15), attached bath (+10) vs shared bath (-5), vegetarian penalty (-50), and walking proximity bonus (+15).
- **R4 Database Pagination & Edge API**: `PaginatedListingsResponse` envelope schema, SQL `LIMIT ? OFFSET ?` mathematical calculation, `totalPages` and `hasMore` metadata, public `/api/config` with `requiresPasscode: false`, and `/api/health`.
- **R5 Documentation & Deployment**: Complete emoji-free `README.md` validation, database schema index DDL validation, and Edge runtime export configuration.

### Tier 2: Boundary & Corner Cases (>=5 tests per core requirement)
Verifies resilience against extreme inputs and boundary conditions:
- **R1 Boundary**: Coordinate fallback when society is unrecognized, 0m distance at PTP main gate, Panathur underpass bottleneck detection, and complex society names with special characters.
- **R2 Boundary**: Empty text Jaccard comparisons, disjoint listing differentiation, 5-group cross-post merge consolidation, and phone backfilling from cross-posts.
- **R3 Boundary**: Exact deposit ratio boundary ($2.20\times$ rent with no penalty vs $2.21\times$ rent with $-15$ penalty), rent price thresholds ($25\text{k}, 25001, 30\text{k}, 30001$), commute duration thresholds ($7\text{m}, 8\text{m}, 12\text{m}, 13\text{m}, 18\text{m}, 19\text{m}$), theoretical maximum score clamping ($100$), theoretical minimum score clamping ($0$), and tier boundary scores ($90, 75, 55$).
- **R4 Boundary**: Normalization of negative and zero page numbers (`page=0, page=-1` $\rightarrow 1$), limit clamping (`limit=0` $\rightarrow 1$, `limit=500` $\rightarrow 50$), out-of-bounds page requests (`page=9999`), empty search query response envelopes, and status enum validation.
- **R5 Boundary**: Non-standard unicode and multi-lingual text handling (Hindi/Kannada), and complex currency notation parsing.

### Tier 3: Cross-Feature Combinations (Pairwise & Multi-Feature Interactions)
Verifies correct interaction between subsystems:
- **C1**: Server-side pagination over recent listings combined with multi-group deduplication.
- **C2**: High rent penalty combined with gated society amenities, swimming pool, and walking proximity bonus.
- **C3**: Vegetarian-only restriction applied to a luxury unicorn listing, verifying score clamping prior to $-50$ point penalty deduction.
- **C4**: Location exclusion and demographic filtering interactions dropping invalid listings before entity parsing.
- **C5**: Society coordinate flow through peak commute simulator into rating engine breakdown.

### Tier 4: Real-World Bangalore Tech Corridor Hunt Scenarios (5 Realistic User Journeys)
End-to-end integration workloads modeling realistic apartment hunting in the Kadubeesanahalli/PTP corridor:
- **Scenario 1**: New Grad Software Engineer at PTP seeking budget $<₹25,000$ flatmate vacancy near office with zero brokerage.
- **Scenario 2**: Non-Vegetarian Senior Engineer requiring gated society, swimming pool, DG backup, and Panathur bypass route.
- **Scenario 3**: Fast flatmate replacement emergency move-in filtering by recency and updating pipeline status to `called`.
- **Scenario 4**: Cross-group spam investigator detecting broker listings posted across 3 different Facebook groups and generating a consolidated card with multi-group badge.
- **Scenario 5**: High-density commute explorer comparing Kadubeesanahalli direct vs Panathur underpass bottleneck properties.

---

## 4. Execution Commands

```bash
# Run the complete test suite once
pnpm test

# Run tests in interactive watch mode
pnpm test:watch

# Verify production build and TypeScript compilation
pnpm build
```

---

## 5. Continuous Integration (CI) Verification Matrix

| Metric | Target Requirement | Measured Value | Status |
|---|---|---|---|
| Vitest Test Files | All suites in `tests/` | 6 / 6 files passed | PASS |
| Total Vitest Tests | $\ge 70$ tests | 77 / 77 tests passed | PASS |
| Test Execution Time | $< 2.0\text{s}$ | $345\text{ms}$ | PASS |
| Production Build | Zero type errors & Vite bundling | $1.14\text{s}$ | PASS |
| Emoji Check | Zero pictorial emojis in `README.md` | 0 emojis detected | PASS |
