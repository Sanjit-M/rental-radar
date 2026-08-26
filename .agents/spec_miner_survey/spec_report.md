# Rental Radar v2 — Comprehensive Specification & Requirements Report

**Mining Date**: 2026-08-26  
**Target Workspace**: `/Users/nebulo/Workspace/rental-radar`  
**Authoritative Sources**: `ORIGINAL_REQUEST.md`, Codebase Source (`src/domain/`, `src/db/`, `src/scraper/`, `src/server/`, `src/client/`, `api/`), Test Suites (`tests/`), Architectural Decision Records (`docs/adr/`).

---

## 1. Executive Summary & Specification Architecture

Rental Radar v2 is an automated intelligence and geospatial filtering engine for rental accommodations and flatmate vacancies in the Kadubeesanahalli / Prestige Tech Park (PTP) corridor, Bangalore.

### Core Architectural Pillars
1. **Interactive Geospatial Map (R1)**: OpenStreetMap client rendered with Leaflet and CartoDB Dark Matter tiles, plotting verified gated communities around PTP with score badges, hover popups, commute metrics, and direct action triggers (WhatsApp, FB post).
2. **Cross-Group Deduplication & Recency (R2)**: Multi-signal deduplication engine (phone normalization, author matching, Jaccard 3-gram character text similarity) merging cross-posts into canonical records with multi-group badges, paired with 7-window recency filtering (`1h`, `3h`, `6h`, `12h`, `24h`, `7d`, `all`).
3. **Refined 0–100 Scoring Engine (R3)**: Deterministic scoring system with base 50, strictly calibrated penalties (brokerage -30, high deposit ratio -15, shared washroom -5, vegetarian -50) and bonuses (bachelor match +10, walk proximity +15, zero brokerage +15, low rent +20, pool +15, DG backup +10, peak commute up to +20).
4. **Backend Database Pagination & Edge API (R4)**: Serverless SQL `LIMIT` / `OFFSET` pagination over SQLite/Turso Edge (`page`, `limit` default 12, `totalCount`, `totalPages`, `hasMore`), UI description expansion, removal of sample data button, and removal of passcode restrictions.
5. **Documentation & Deployment Verification (R5)**: 100% Vitest unit test pass, emoji-free developer documentation, and Vercel Edge hosting readiness.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1 Geospatial Map | CartoDB Dark Matter Tile Layer | Dark theme basemap tiles without requiring external API keys | Tile URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`, subdomains `abcd`, maxZoom `20` | High-contrast dark vector map tiles | Fallback to OpenStreetMap standard tiles if CDN unreachable | `src/client/components/MapView.tsx:30` |
| 2 | R1 Geospatial Map | Prestige Tech Park Anchor | Fixed central landmark marker for origin/destination routing at Kadubeesanahalli | PTP Coordinates: `lat: 12.9385, lon: 77.6917` | DivIcon anchor badge with green gradient and popup | Defaults to Kadubeesanahalli center if coordinates missing | `src/domain/config.ts:2`, `MapView.tsx:37` |
| 3 | R1 Geospatial Map | Society Coordinate Directory | Verified coordinates and amenities for 12+ gated communities around PTP | Society lookup string (e.g., 'sobhairis', 'assetz', 'orchidlakeview') | Society record `{ name, lat, lon, hasPool, isGated, hasPowerBackup, isKadubeesanahalliDirect }` | Locality coordinate fallback `{ lat: 12.9380, lon: 77.6925 }` | `src/domain/config.ts:9-139` |
| 4 | R1 Geospatial Map | Clustered Coordinate Badging | Aggregates multiple listings sharing the same society lat/lon | Array of listings matching `lat, lon` | Single map marker displaying highest score and `+N` badge | Displays single badge if count is 1 | `MapView.tsx:85-139` |
| 5 | R1 Geospatial Map | Marker Score Badging & Tiers | Dynamic CSS color gradients on map pins matching score tiers | Score value (0–100) | Gradient: 90+ Emerald (`🔥`), 75–89 Blue (`✨`), <75 Amber (`⚡`) | Low scores default to Amber badge | `MapView.tsx:104-139` |
| 6 | R1 Geospatial Map | Interactive Marker Popups | Rich Leaflet popups containing rent, commute, author, and one-click actions | User click/hover on society pin | HTML popup with WhatsApp link, FB post link, rent, commute time | Missing phone hides WhatsApp action | `MapView.tsx:141-176` |
| 7 | R1 Geospatial Map | Multi-View Mode Switching | Seamless switching between Card Grid, Table, and OpenStreetMap | `viewMode: 'grid' \| 'table' \| 'map'` state | Render corresponding view component | Defaults to `'grid'` | `App.tsx:44,313-356`, `FilterBar.tsx:80-115` |
| 8 | R2 Deduplication | Exact Facebook Post ID Match | Identifies identical post references | `a.fbPostId === b.fbPostId` | `true` (Duplicate) | Falls through to next check if distinct | `src/domain/parser/deduplicator.ts:36` |
| 9 | R2 Deduplication | Contact Phone Cross-Post Matching | Matches listings with same 10-digit phone and matching rent OR society | `contactPhone`, `rent`, `societyName` | `true` (Duplicate) | Distinct phone numbers proceed to text similarity | `deduplicator.ts:39-49` |
| 10 | R2 Deduplication | Author & Text Similarity Match | Matches identical author with Jaccard 3-gram similarity > 0.70 | `authorName`, `rawText` (excluding generic "Facebook Member") | `true` (Duplicate) | Falls through to raw body similarity | `deduplicator.ts:51-60` |
| 11 | R2 Deduplication | Raw Body Jaccard 3-Gram | Matches cross-posts with high text similarity (> 0.88) | `rawText` of listing A and B | Similarity score `[0.0, 1.0]` | Returns `0.0` on empty strings | `deduplicator.ts:6-30,62-65` |
| 12 | R2 Deduplication | Canonical Record Merging | Merges duplicate listings into single record with combined group names | Array of `RentalListing` | Deduplicated list with `groupNames: string[]` and `postCount: number` | Preserves single listing if unique | `deduplicator.ts:69-113` |
| 13 | R2 Deduplication | Multi-Group UI Badge | Displays "Seen in X groups" pill with hover tooltip listing groups | `postCount > 1`, `groupNames` | Pill: `<Layers /> X groups` with group names tooltip | Hidden if `postCount <= 1` | `ListingCard.tsx:65-72` |
| 14 | R2 Recency Filter | Recency Time Windows | Filters listings by publication timeframe on backend & frontend | `recency: '1h' \| '3h' \| '6h' \| '12h' \| '24h' \| '7d' \| 'all'` | Filtered listings array | `'all'` bypasses recency filter | `api/index.ts:314-319`, `FilterBar.tsx:154-173` |
| 15 | R3 Scoring Engine | Baseline Score | Starting score for valid listings in target geography | Cleaned post passing location and BHK filters | Base `50` points | N/A | `src/domain/config.ts:185`, `ratingEngine.ts:22` |
| 16 | R3 Scoring Engine | Rent Pricing Score | Financial evaluation of monthly rent | Rent amount in INR (`<=25k`, `25k-30k`, `>30k`) | `+20`, `0`, or `-20` points | Null rent yields `0` points | `ratingEngine.ts:38-48` |
| 17 | R3 Scoring Engine | Strict Brokerage Penalty & Bonus | Penalizes broker fees and awards direct owner listings | `isBrokerage: boolean` | `+15` (Zero Brokerage) or `-30` (Broker Fee) | N/A | `ratingEngine.ts:50-56` |
| 18 | R3 Scoring Engine | High Deposit Ratio Penalty | Penalizes security deposits exceeding 2.2x monthly rent | `deposit: INR`, `rent: INR` | `-15` (if `deposit > 2.2 * rent`), `+10` (if `deposit <= 50k`) | Null deposit yields `0` points | `ratingEngine.ts:58-66` |
| 19 | R3 Scoring Engine | Gated Society & Amenities | Awards points for gated communities, pools, and power backup | `isGatedSociety`, `hasSwimmingPool`, `hasPowerBackup` | Gated: `+15`, Pool: `+15`, DG Backup: `+10` | `0` for absent amenities | `ratingEngine.ts:68-83` |
| 20 | R3 Scoring Engine | Dedicated vs Shared Washroom | Penalizes shared bathrooms and rewards attached bathrooms | `hasAttachedWashroom: boolean` | Attached: `+10`, Shared / Non-dedicated: `-5` | N/A | `ratingEngine.ts:84-90` |
| 21 | R3 Scoring Engine | Bachelor / Male Match | Demographics alignment for male bachelor accommodation | `isMaleBachelorAllowed`, `isFemaleOnly` | Bachelor Match: `+10`, Female Only: `-25` | `0` for generic ungendered | `ratingEngine.ts:92-98` |
| 22 | R3 Scoring Engine | Walking Proximity Bonus | Rewards walking distance (< 500m / 0.6km) to PTP gates | `isWalkingDistance: boolean` or `distanceKm <= 0.6` | `+15` points | `0` for distant properties | `ratingEngine.ts:100-104` |
| 23 | R3 Scoring Engine | Furnishing & Route Bonus | Rewards furnished units and Panathur Underpass bypass | `furnishing`, `isKadubeesanahalliDirect` | Furnished: `+5`, Panathur Bypass: `+10` | `0` if unfurnished / through underpass | `ratingEngine.ts:106-116` |
| 24 | R3 Scoring Engine | Peak Scooter Commute Score | Evaluates 11am-1pm & 4pm-6pm IST weekday peak travel time | `twoWayAvgPeakMins` (`<=7m`, `8-12m`, `13-18m`, `>18m`) | `<=7m: +20`, `8-12m: +10`, `13-18m: -5`, `>18m: -25` | N/A | `ratingEngine.ts:118-128` |
| 25 | R3 Scoring Engine | Strict Vegetarian Penalty | Imposes severe penalty on vegetarian-only restrictions | `isVegetarianOnly: boolean` | `-50` points subtracted after base clamp | `0` if non-veg allowed | `ratingEngine.ts:133-138` |
| 26 | R3 Scoring Engine | Score Clamping & Tiering | Restricts final score to [0, 100] and assigns visual rating tier | Computed raw total | `score: number` [0, 100], `tier: RatingTier` | Clamped to 0 min and 100 max | `ratingEngine.ts:130-149` |
| 27 | R4 Pagination API | `/api/listings` Pagination Contract | Server-side pagination query with metadata envelope | Query params: `page` (default 1), `limit` (default 12), filters | JSON: `{ count, totalCount, page, limit, totalPages, hasMore, listings }` | Returns 500 with error JSON on failure | `api/index.ts:273-373` |
| 28 | R4 Pagination API | SQL LIMIT & OFFSET Execution | Efficient SQL-level pagination for SQLite and Turso Cloud | `LIMIT ? OFFSET ?` with `offset = (page - 1) * limit` | Subset of matching database rows | Clamped limit (1 to 50) | `api/index.ts:351-353`, `repository.ts:272-279` |
| 29 | R4 UI Optimization | Expandable Post Descriptions | Two-line truncation (`line-clamp-2`) with click/tap full expansion | User click on post description card | Toggles `isExpanded: boolean` | Shows full raw text on expansion | `ListingCard.tsx:35,175-189` |
| 30 | R4 UI Optimization | Sample Data Button Removal | Cleaner dashboard header without cluttering sample data button | N/A | Header contains only "Check Groups Now" manual scrape trigger | N/A | `App.tsx:187-195` |
| 31 | R4 Security & Access | Scrape Passcode Removal | Removes passcode barrier on scrape endpoints and UI triggers | `requiresPasscode: false` in `/config` | Publicly accessible scraper and listings API | N/A | `api/index.ts:267,418-430` |
| 32 | R5 Quality & Testing | Full Vitest Unit Test Suite | Complete automated test coverage of domain logic | `pnpm test` (Vitest) | 100% pass across all test suites (5 files, 18 tests) | Exits with non-zero code on test failure | `tests/*.test.ts`, `package.json:13` |
| 33 | R5 Documentation | Emoji-Free README Documentation | Complete local setup and Vercel hosting instructions without emojis | Markdown documentation | Standardized text format | N/A | `README.md` |

---

## 3. Detailed Specifications by Requirement Area

### R1. Interactive Geospatial Map (Leaflet + CartoDB Dark Matter)

#### Basemap Specification
- **Library**: Leaflet (`leaflet` ^1.9.4, `@types/leaflet` ^1.9.22).
- **Tile URL**: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- **Subdomains**: `'abcd'`
- **Attribution**: `&copy; OpenStreetMap contributors &copy; CARTO`
- **Max Zoom**: `20`, Initial Zoom: `15`, Centered at PTP Anchor (`12.9385, 77.6917`).
- **Zero API Key Requirement**: Fully functional without external Mapbox/Google API keys.

#### Known Society & Landmark Coordinate Directory
| Society / Landmark Key | Canonical Name | Latitude | Longitude | Swimming Pool | 100% DG Backup | Kadubeesanahalli Direct (Avoids RUB) |
|---|---|---|---|---|---|---|
| `ptp` (Anchor) | Prestige Tech Park Main Gate | 12.9385 | 77.6917 | — | — | Yes |
| `sobhairis` | Sobha Iris | 12.9372 | 77.6934 | Yes | Yes | Yes |
| `sobhahibiscus` | Sobha Hibiscus | 12.9358 | 77.6948 | Yes | Yes | Yes |
| `sobhajasmine` | Sobha Jasmine | 12.9365 | 77.6955 | Yes | Yes | Yes |
| `assetzmarq` | Assetz Marq | 12.9410 | 77.6960 | Yes | Yes | Yes |
| `assetz` | Assetz East Point | 12.9422 | 77.6980 | Yes | Yes | Yes |
| `orchidlakeview` | Goyal Orchid Lakeview | 12.9320 | 77.6890 | Yes | Yes | Yes |
| `prestigesunnyside` | Prestige Sunnyside | 12.9390 | 77.6950 | Yes | Yes | Yes |
| `divyasree` | Divyasree 77 East | 12.9450 | 77.6880 | Yes | Yes | Yes |
| `sjr` | SJR Parkway Homes | 12.9315 | 77.6920 | Yes | Yes | Yes |
| `salarpuria` | Salarpuria Sattva | 12.9360 | 77.6900 | Yes | Yes | Yes |
| `umiyacity` | Umiya City / Velocity | 12.9375 | 77.6910 | No | Yes | Yes |
| `panathuroasis` | Panathur Gated Society | 12.9340 | 77.7010 | Yes | Yes | No (Crosses RUB) |
| `kadubeesanahalli` | Kadubeesanahalli Central | 12.9380 | 77.6925 | — | — | Yes |
| `cessna` | Cessna Business Park | 12.9368 | 77.6910 | — | — | Yes |
| `bhoganahalli` | Bhoganahalli (near PTP) | 12.9310 | 77.6970 | — | — | Yes |

#### Marker & Popup Contract
- **Clustering**: Groups listings with matching coordinates to prevent pin overlap (`coordsMap.set("${lat},${lon}", [...listings])`). Displays a `+N` badge for clustered posts.
- **Color Coding**:
  - Score $\ge 90$: Emerald gradient (`#10b981` to `#047857`)
  - Score $75 - 89$: Blue gradient (`#3b82f6` to `#1d4ed8`)
  - Score $< 75$: Amber gradient (`#f59e0b` to `#b45309`)
- **Popup Fields**:
  - Society Name / Locality Title
  - Author Name & Relative Publication Time
  - Monthly Rent (`₹XX,XXX/mo` or `Contact`)
  - Two-way average peak scooter commute (`XXm peak commute`)
  - BHK Type & Furnishing status
  - One-click WhatsApp action (`https://wa.me/91${phone}?text=...`)
  - Direct Facebook Post permalink (`target="_blank"`)

---

### R2. Cross-Group Deduplication & Recency Filtering

#### Deduplication Multi-Signal Pipeline
Two listings $A$ and $B$ are flagged as duplicate cross-posts if ANY of the following rules evaluate to `true`:
1. **Exact Facebook Post ID**:
   $$\text{fbPostId}_A == \text{fbPostId}_B$$
2. **Phone Number & Listing Identity**:
   $$(\text{phone}_A == \text{phone}_B) \land (\text{rent}_A == \text{rent}_B \lor \text{society}_A == \text{society}_B)$$
3. **Author Identity & Text Similarity**:
   $$(\text{author}_A == \text{author}_B \land \text{author}_A \ne \text{"Facebook Member"}) \land \text{Jaccard3Gram}(\text{text}_A, \text{text}_B) > 0.70$$
4. **Overall Body Similarity**:
   $$\text{Jaccard3Gram}(\text{text}_A, \text{text}_B) > 0.88$$

#### Jaccard Character 3-Gram Calculation
Given cleaned strings $S_A$ and $S_B$ (lowercased, alphanumeric only):
$$\text{NGrams}(S, 3) = \{ S[i..i+2] \mid 0 \le i \le |S| - 3 \}$$
$$\text{Similarity}(S_A, S_B) = \frac{|\text{NGrams}(S_A) \cap \text{NGrams}(S_B)|}{|\text{NGrams}(S_A) \cup \text{NGrams}(S_B)|}$$

#### Canonical Record Merging Algorithm
When merging duplicate listings:
- `groupNames` is populated with the union of all group names where the post appeared.
- `postCount` is set to `groupNames.length`.
- Missing phone numbers or society names are backfilled from other cross-posted instances.
- UI renders the multi-group badge `<Layers /> {postCount} groups`.

#### Recency Time-Window Filtering Contract
| Query Value | Interval Description | Backend SQL Filter on `posted_time` |
|---|---|---|
| `all` | All Time | No recency filter applied |
| `1h` | Past 1 Hour | `(posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%')` |
| `3h` | Past 3 Hours | `(posted_time LIKE '%min%' OR posted_time LIKE '%1 hr%' OR posted_time LIKE '%2 hr%' OR posted_time LIKE '%3 hr%')` |
| `6h` | Past 6 Hours | `(posted_time LIKE '%min%' OR posted_time LIKE '%hr%' AND NOT posted_time LIKE '%day%')` |
| `12h` | Past 12 Hours | `(posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%')` |
| `24h` | Past 24 Hours | `(posted_time NOT LIKE '%week%' AND posted_time NOT LIKE '%month%')` |
| `7d` | Past 7 Days | `(posted_time NOT LIKE '%month%')` |

---

### R3. Advanced Scoring Algorithm Updates (0–100 Exact Arithmetic)

#### Mathematical Formula Definition
$$\text{PreClampScore} = \text{Base} + \Delta\text{Rent} + \Delta\text{Brokerage} + \Delta\text{Deposit} + \Delta\text{Gated} + \Delta\text{Pool} + \Delta\text{Power} + \Delta\text{Washroom} + \Delta\text{Bachelor} + \Delta\text{Walk} + \Delta\text{Furnished} + \Delta\text{Panathur} + \Delta\text{Commute}$$

$$\text{ClampedBase} = \max(0, \min(100, \text{PreClampScore}))$$

$$\text{FinalScore} = \max(0, \min(100, \text{ClampedBase} + \text{Penalty}_{\text{Vegetarian}}))$$

#### Scoring Parameter Breakdown Table
| Criterion | Condition | Point Value | Configuration Key |
|---|---|---|---|
| **Base Score** | Valid listing passing filters | `+50` | `baseScore` |
| **Rent (<= 25k)** | $\text{Rent} \le ₹25,000$ | `+20` | `rentLe25k` |
| **Rent (25k–30k)** | $₹25,001 \le \text{Rent} \le ₹30,000$ | `0` | `rent25kTo30k` |
| **Rent (> 30k)** | $\text{Rent} > ₹30,000$ | `-20` | `rentGt30k` |
| **Zero Brokerage** | Direct owner or flatmate replacement | `+15` | `noBrokerage` |
| **Brokerage Applicable** | Broker fee / commission mentioned | `-30` | `brokerageApplicable` |
| **Low Security Deposit** | $\text{Deposit} \le ₹50,000$ | `+10` | `lowDeposit` |
| **High Deposit Ratio Penalty** | $\text{Deposit} > 2.2 \times \text{Rent}$ | `-15` | `highDepositRatioPenalty` |
| **Gated Community** | Verified gated society | `+15` | `gatedSociety` |
| **Swimming Pool** | Swimming pool amenity present | `+15` | `swimmingPool` |
| **100% DG Power Backup** | Full power backup generator | `+10` | `powerBackup` |
| **Attached Washroom** | Private attached bathroom | `+10` | `attachedWashroom` |
| **Shared Washroom Penalty** | Shared / common bathroom | `-5` | `sharedWashroomPenalty` |
| **Bachelor / Male Match** | Male flatmate / bachelor allowed | `+10` | `bachelorMaleMatch` |
| **Demographic Mismatch** | Strictly female-only post | `-25` | `bachelorMismatchPenalty` |
| **Walking Proximity Bonus** | Distance $< 500\text{m}$ ($0.6\text{km}$) or walking mentioned | `+15` | `walkingProximityBonus` |
| **Furnishing** | Fully or Semi-Furnished | `+5` | `furnished` |
| **Panathur Bypass** | Avoids Panathur Railway Underpass (RUB) | `+10` | `panathurBypassBonus` |
| **Peak Commute ($\le 7$ min)** | Two-way avg peak commute $\le 7$ mins | `+20` | `commuteLe7min` |
| **Peak Commute (8–12 min)** | Two-way avg peak commute $8 - 12$ mins | `+10` | `commute8To12min` |
| **Peak Commute (13–18 min)** | Two-way avg peak commute $13 - 18$ mins | `-5` | `commute13To18min` |
| **Peak Commute (> 18 min)** | Two-way avg peak commute $> 18$ mins | `-25` | `commuteGt18min` |
| **Vegetarian-Only Penalty** | Strictly veg / no non-veg permitted | `-50` | `vegetarianOnlyPenalty` |

#### Rating Tiers
- **🔥 Unicorn Deal**: $90 - 100$
- **✨ Great Match**: $75 - 89$
- **⚡ Moderate Match**: $55 - 74$
- **⚠️ Low Match**: $< 55$

---

### R4. Backend Database Pagination & Edge API Optimization

#### API Endpoint Specification: `GET /api/listings`
- **Runtime**: Vercel Edge Runtime (`export const config = { runtime: 'edge' }`).
- **Database Driver**: `@libsql/client/web` using standard web `fetch` API.

#### Request Parameters
| Parameter | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `page` | Integer | `1` | $\ge 1$ | 1-indexed target page number |
| `limit` | Integer | `12` | $1 \le \text{limit} \le 50$ | Maximum listings to return per page |
| `minScore` | Integer | `undefined` | $0 \le \text{score} \le 100$ | Filter by minimum rating score |
| `maxRent` | Integer | `undefined` | $> 0$ | Filter by maximum monthly rent in INR |
| `bhkType` | String | `'all'` | Enum or substring | `'1 BHK'`, `'2 BHK'`, `'3 BHK'`, `'Private Room'` |
| `furnishing` | String | `'all'` | Enum | `'Fully Furnished'`, `'Semi-Furnished'`, `'Unfurnished'` |
| `userStatus` | String | `'all'` | Enum | `'new'`, `'interested'`, `'called'`, `'applied'`, `'rejected'` |
| `recency` | String | `'all'` | Enum | `'1h'`, `'3h'`, `'6h'`, `'12h'`, `'24h'`, `'7d'`, `'all'` |
| `search` | String | `undefined` | String | Free-text search matching raw text, society, author, phone |
| `sortBy` | String | `'score_desc'` | Enum | `'score_desc'`, `'rent_asc'`, `'commute_asc'`, `'newest'` |

#### Response Envelope JSON Schema
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
      "groupNames": ["Flat and Flatmates Bangalore", "Flats Without Brokers Bangalore"],
      "postCount": 2,
      "postUrl": "https://facebook.com/groups/...",
      "authorName": "Rohan Deshmukh",
      "postedTime": "1 hr ago",
      "rawText": "Looking for a Male flatmate in Sobha Iris...",
      "location": "Kadubeesanahalli",
      "bhkType": "3 BHK (Shared/Full)",
      "entities": {
        "rent": 22000,
        "deposit": 45000,
        "isBrokerage": false,
        "isGatedSociety": true,
        "societyName": "Sobha Iris",
        "hasSwimmingPool": true,
        "hasPowerBackup": true,
        "hasAttachedWashroom": true,
        "hasBalcony": true,
        "isVegetarianOnly": false,
        "isMaleBachelorAllowed": true,
        "isFemaleOnly": false,
        "isWalkingDistance": true,
        "furnishing": "Fully Furnished",
        "isKadubeesanahalliDirect": true,
        "contactPhone": "9845012345",
        "societyLat": 12.9372,
        "societyLon": 77.6934
      },
      "commute": {
        "distanceKm": 0.5,
        "inboundMins": 3,
        "outboundMins": 3,
        "twoWayAvgPeakMins": 3,
        "hasPanathurUnderpassBottleneck": false
      },
      "score": 100,
      "scoreBreakdown": {
        "base": 50,
        "rent": 20,
        "brokerage": 15,
        "deposit": 10,
        "gatedSociety": 15,
        "swimmingPool": 15,
        "powerBackup": 10,
        "attachedWashroom": 10,
        "vegetarianPenalty": 0,
        "bachelorMatch": 10,
        "walkProximity": 15,
        "furnished": 5,
        "panathurBypass": 10,
        "commute": 20
      },
      "tier": "🔥 Unicorn Deal",
      "userStatus": "new",
      "createdAt": "2026-08-26 14:00:00",
      "updatedAt": "2026-08-26 14:00:00"
    }
  ]
}
```

#### SQL Implementation Details
```sql
-- 1. Total Count Query
SELECT COUNT(*) as total FROM listings WHERE 1=1 [filters];

-- 2. Paginated Data Fetch Query
SELECT * FROM listings WHERE 1=1 [filters] ORDER BY [sort] LIMIT ? OFFSET ?;
```
`offset` computation: `(page - 1) * limit`.

---

### R5. Documentation & Deployment Verification

1. **README.md Requirements**:
   - Zero emoji characters throughout the document.
   - Exact local commands: `pnpm install`, `pnpm test`, `pnpm build`, `pnpm server`, `pnpm dev`, `pnpm scrape`.
   - Clear Turso SQLite cloud database provisioning steps.
   - Vercel deployment with Edge Serverless function configuration.
2. **Vitest Verification**:
   - 100% of Vitest unit tests pass (`pnpm test`) across `tests/commute.test.ts`, `tests/scorer.test.ts`, `tests/deduplicator.test.ts`, `tests/filter.test.ts`, and `tests/extractor.test.ts`.
3. **Build & Type Check**:
   - `pnpm build` (`tsc && vite build`) executes cleanly with zero TypeScript or bundling errors.

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Rent Extractor | `'Rent is 18.5k / month'` | Correctly parses decimal thousands into `18500` INR. |
| 2 | Rent Extractor | `'Rent: ₹28000 rent pm'` | Correctly parses currency symbol and commas into `28000` INR. |
| 3 | Deposit Extractor | `'Deposit: 2 months rent'` with rent `₹20,000` | Calculates deposit as $2 \times 20,000 = ₹40,000$ INR. |
| 4 | Deposit Extractor | `'Advance: 1.5 Lakh'` | Parses into `150000` INR. |
| 5 | Deposit Penalty | Rent `₹30,000`, Deposit `₹1,00,000` ($3.33\times$ rent) | Applies `-15` high deposit ratio penalty ($100k > 2.2 \times 30k$). |
| 6 | Brokerage Extractor | `'No brokerage, direct from owner'` | Evaluates `isBrokerage: false`, awards `+15` bonus. |
| 7 | Brokerage Extractor | `'Brokerage applicable: 15 days'` | Evaluates `isBrokerage: true`, applies strict `-30` penalty. |
| 8 | Vegetarian Penalty | Post contains `'Strictly veg only flatmate needed'` | Triggers `-50` point penalty deducted directly from score. |
| 9 | Demographic Filter | Post contains `'Female flatmate needed for 2 BHK'` | Filter rejects post immediately (`FilterRejectionError`). |
| 10 | Location Filter | Post contains `'1 BHK in Bellandur near ecospace'` | Excluded location filter drops post (`FilterRejectionError`). |
| 11 | Location Filter | Post contains `'Kadubeesanahalli near PTP back gate'` | Passed location filter, resolved to `Kadubeesanahalli`. |
| 12 | Underpass Commute | Listing in Panathur (`isKadubeesanahalliDirect: false`) | Adds $+8$ minute Panathur bottleneck penalty to evening commute. |
| 13 | Coordinate Clustered Pin | 4 listings in Sobha Iris (`12.9372, 77.6934`) | Clustered on single Leaflet marker showing top score and `+3` badge. |
| 14 | Deduplication Text | Two posts with identical phone `9845012345` and rent `₹22,000` | Merged into single canonical record with `postCount: 2`. |
| 15 | Deduplication Jaccard | Different phone, same author, Jaccard 3-gram text similarity $0.78$ | Recognized as cross-post duplicate and merged. |
| 16 | Deduplication Disjoint | Completely different property in Assetz East Point vs Sobha Iris | Kept as distinct records (`postCount: 1`). |
| 17 | Pagination Offset | Page 3 with Limit 12 | SQL executes `LIMIT 12 OFFSET 24`. |
| 18 | Pagination Boundary | Page number exceeding total pages (e.g. `page=99`) | Returns `count: 0`, `listings: []`, `hasMore: false`. |
| 19 | UI Description Expansion | Long Facebook description (> 300 chars) | Rendered as 2 lines truncated by default; expands to full text on tap. |
| 20 | Score Clamping | Listing scoring raw 115 points (all positive bonuses) | Clamped to maximum 100 points (`🔥 Unicorn Deal`). |
| 21 | Score Clamping | High rent + broker + long commute raw -35 points | Clamped to minimum 0 points (`⚠️ Low Match`). |
