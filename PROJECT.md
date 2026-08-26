# Project: Rental Radar v2

## Architecture
Rental Radar v2 is a full-stack high-performance rental intelligence platform for Bangalore tech corridors (Prestige Tech Park, Kadubeesanahalli, Marathahalli, Panathur, Bellandur).
- **Backend**: Hono web framework running on Vercel Edge Runtime (`api/index.ts`) and Node.js (`src/server/index.ts`).
- **Database**: SQLite / LibSQL dual-mode (Turso cloud over HTTPS/WSS and local `data/listings.db`).
- **Domain Engine**:
  - `src/domain/scorer/ratingEngine.ts`: Deterministic 0–100 scoring engine evaluating rent, deposit ratio, brokerage, vegetarian restrictions, washroom types, bachelor friendliness, walking proximity, and peak commute times.
  - `src/domain/parser/deduplicator.ts`: Multi-signal cross-group deduplication engine utilizing exact post ID matching, normalized contact numbers, and Jaccard 3-gram text similarity.
  - `src/domain/config.ts`: Society coordinates, locality anchors, scoring weights, and commute matrices.
- **Frontend**: Vite 5 + React 18 + Tailwind CSS.
  - `src/client/App.tsx`: Main dashboard state, view switcher (`'grid' | 'table' | 'map'`), pagination controls.
  - `src/client/components/MapView.tsx`: Interactive OpenStreetMap Leaflet component with CartoDB Dark Matter tiles, custom score markers, and popups.
  - `src/client/components/ListingCard.tsx`: Grid view card with expandable descriptions and multi-group badges.
  - `src/client/components/ListingTable.tsx`: High-density tabular view with multi-group badges.
  - `src/client/components/FilterBar.tsx`: Dynamic filters including Recency time windows, BHK, Rent, Score, Furnishing, Status, and View Mode.
  - `src/client/components/HeaderStats.tsx`: Key rental metrics and real-time dashboard header.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | CartoDB Dark Matter Leaflet Map | Interactive OpenStreetMap in dark theme without external API keys | M2 | R1 |
| F2 | Society Coordinate Pinpoints & Score Badges | Markers for recognized societies around PTP with score pill badges | M2 | R1 |
| F3 | Interactive Marker Popups | Rich popups showing rent, commute, author info, WhatsApp & FB links | M2 | R1 |
| F4 | 3-Way Responsive View Switching | Seamless toggle between Map View, Grid View, and High-Density Table View | M2 | R1 |
| F5 | Cross-Group Deduplication Engine | Detect and merge cross-posted listings across FB groups by author, phone, text similarity | M1 | R2 |
| F6 | Multi-Group "Seen in X groups" Badge | Display multi-group provenance badge on canonical listings in cards & table | M2 | R2 |
| F7 | Recency Time-Window Filtering | Filter listings by publication recency (1h, 3h, 6h, 12h, 24h, 7d, all) | M1, M2 | R2 |
| F8 | Refined 0–100 Scoring Algorithm | Implement -50 veg penalty, -30 broker penalty, -15 deposit penalty (>2.2x), +15 walking (<500m), +10 bachelor match, -5 shared washroom | M1 | R3 |
| F9 | Server-Side Database Pagination | SQL LIMIT / OFFSET on `/api/listings` with `page`, `limit` (default 12), `totalCount`, `totalPages`, `hasMore` | M1 | R4 |
| F10 | Passcode Gate Removal for Scrapers | Remove passcode restriction on `/api/scrape/trigger` and `/api/scrape/seed` | M1 | R4 |
| F11 | Expandable Post Descriptions | Click/tap to expand truncated post descriptions in UI | M2 | R4 |
| F12 | Sample Data Button Removal | Remove "Load Sample Data" button from header | M2 | R4 |
| F13 | Complete Emoji-Free Documentation | Comprehensive `README.md` for local development and Vercel hosting without emojis | M3 | R5 |
| F14 | 100% Vitest Unit Test & Build Verification | All unit tests pass (`pnpm test`) and production build succeeds (`pnpm build`) | M3, E2E | R5 |
| F15 | Comprehensive E2E Test Suite | 4-Tier requirement-driven opaque-box test suite + Tier 5 adversarial tests | E2E | R1–R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend & Data Engine | Server-side SQL pagination, recency query filtering, scrape passcode ungate, scoring engine validation, and deduplication pipeline | none | DONE |
| M2 | Geospatial Map & Frontend UI | Leaflet CartoDB Dark Matter map view, 3-way view toggle, recency filter UI, expandable descriptions, multi-group badge, sample data button removal, and pagination controls | M1 | DONE |
| M3 | Documentation, Verification & Build | Emoji-free README.md, Vitest test suite validation, production build verification, and deployment readiness | M1, M2 | DONE |
| E2E | E2E Testing Track | Independent requirement-driven test suite (Tiers 1–4) publishing TEST_READY.md, followed by Tier 5 adversarial verification | none (parallel) | DONE (130 tests passed) |

---

## Interface Contracts

### Backend API ↔ Frontend Client: `/api/listings`
- **Query Parameters**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `12`)
  - `recency` (string enum: `'1h' | '3h' | '6h' | '12h' | '24h' | '7d' | 'all'`, default: `'all'`)
  - `minScore` (number, optional)
  - `maxRent` (number, optional)
  - `bhkType` (string, optional)
  - `furnishing` (string, optional)
  - `userStatus` (string, optional)
  - `search` (string, optional)
  - `sortBy` (string, optional: `'score' | 'rent_asc' | 'rent_desc' | 'created_at'`)
- **Response Format (`PaginatedListingsResponse`)**:
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
        "id": "list_123",
        "fbPostId": "fb_456",
        "societyName": "Sobha Iris",
        "locality": "Kadubeesanahalli",
        "bhkType": "1BHK",
        "rent": 24000,
        "deposit": 50000,
        "brokerage": 0,
        "furnishing": "Fully Furnished",
        "genderPreference": "bachelor_male",
        "washroomType": "attached",
        "isVegetarianOnly": false,
        "walkingDistanceMeters": 350,
        "score": 92,
        "ratingTier": "🔥 Unicorn Deal",
        "groupNames": ["Flatmates Bangalore", "Rentals PTP"],
        "postCount": 2,
        "createdAt": "2026-08-26T14:30:00Z"
      }
    ]
  }
  ```

### Scoring Engine Contract: `computeListingScore`
- **Input**: `ExtractedListing`, `CommuteSummary`
- **Weights & Penalties**:
  - Base score: `50`
  - Male bachelor match: `+10` (mismatch: `-25`)
  - Brokerage: zero `+15`, broker fee `-30`
  - Deposit: $> 2.2\times\text{rent} \rightarrow -15$, $\le 50\text{k} \rightarrow +10$
  - Washroom: attached `+10`, shared/non-dedicated `-5`
  - Vegetarian only: `-50`
  - Proximity walking bonus (< 500m): `+15`
  - Gated society: `+15`, Pool: `+15`, Power backup: `+10`
  - Commute duration: $\le 7\text{m} \rightarrow +20$, $8-12\text{m} \rightarrow +10$, $13-18\text{m} \rightarrow -5$, $>18\text{m} \rightarrow -25$
- **Output**: `ScoreResult` with `totalScore` bounded in `[0, 100]`.

---

## Code Layout
- `api/index.ts`: Vercel Edge Runtime Hono API router and Turso/SQLite handlers
- `src/server/routes/listings.ts`: Node.js local API router for listings
- `src/server/app.ts`: Hono application setup and middleware
- `src/db/database.ts`: SQLite schema, indexes, and connection factory
- `src/db/repository.ts`: Data access layer for queries, pagination, and deduplication
- `src/domain/config.ts`: Constants, society coordinates, weights, commute metrics
- `src/domain/scorer/ratingEngine.ts`: Scoring engine and tier categorization
- `src/domain/parser/deduplicator.ts`: Multi-group duplicate detection and canonical record merging
- `src/client/App.tsx`: Main React UI root, view mode state, pagination state
- `src/client/components/MapView.tsx`: Leaflet CartoDB Dark Matter map view
- `src/client/components/ListingCard.tsx`: Grid card component with expandable description and badges
- `src/client/components/ListingTable.tsx`: Table row component with multi-group badges
- `src/client/components/FilterBar.tsx`: Filter controls with recency and 3-way view switcher
- `src/client/components/HeaderStats.tsx`: Header metrics without sample data button
- `src/client/services/api.ts`: Frontend client API client
- `tests/`: Vitest unit and integration test suites
- `README.md`: Project documentation (emoji-free)
