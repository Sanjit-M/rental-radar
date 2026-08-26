# Rental Radar v2

Rental Radar is an automated rental post aggregator, cross-group deduplicator, and weekday peak scooter commute scoring platform tailored for engineers and professionals working at Prestige Tech Park (PTP), Kadubeesanahalli, and surrounding Bangalore tech corridors.

---

## 1. System Architecture

Rental Radar is structured as a full-stack, edge-compatible application built with TypeScript:

- **Backend Edge API**: Hono web framework running on the Vercel Edge Runtime (`api/index.ts`) for sub-15ms serverless responses globally, with parity Node.js server support (`src/server/index.ts`) for local development and scraping automation.
- **Database Layer**: Dual-mode SQLite and LibSQL client (`@libsql/client`). Supports local embedded storage (`file:data/listings.db`) and Turso Cloud SQLite over HTTPS/WSS.
- **Frontend Dashboard**: React 18 single-page application bundled with Vite 5 and styled with Tailwind CSS. Includes 3-way view toggling (Card Grid, High-Density Table, Geospatial Map).
- **Geospatial Mapping**: Leaflet OpenStreetMap integration utilizing CartoDB Dark Matter tiles, custom SVG/HTML score markers, and interactive listing popups without requiring third-party API keys or paid map subscriptions.
- **Intelligence Engines**:
  - `src/domain/scorer/ratingEngine.ts`: Pure, deterministic 0–100 scoring engine balancing financial parameters, housing constraints, amenities, and commute times.
  - `src/domain/parser/deduplicator.ts`: Multi-signal cross-group deduplication engine utilizing exact post IDs, contact numbers, author names, and Jaccard 3-gram text similarity.
  - `src/domain/commute/router.ts`: Weekday peak scooter commute calculator modeling Kadubeesanahalli access routes and Panathur railway underpass bottlenecks.

---

## 2. Key Features

### 2.1 Interactive Geospatial Map
- **CartoDB Dark Matter Integration**: High-performance vector tile layer rendered in a dark palette matching the dashboard theme. Operates without external API keys or rate limits.
- **Society Pinpoints**: Pre-mapped coordinates for major gated societies around PTP:
  - Sobha Iris
  - Sobha Hibiscus
  - Sobha Jasmine
  - Assetz East Point
  - Assetz Marq
  - Goyal Orchid Lakeview
  - Prestige Sunnyside
  - Divyasree 77 East
  - SJR Parkway Homes
  - Salarpuria Sattva
  - Umiya City / Velocity
  - Panathur Gated Societies
- **Score Badges & Popups**: Custom score markers indicating listing quality. Interactive popups provide rent, two-way peak commute duration, author info, society metadata, one-click WhatsApp links, and direct Facebook post URLs.
- **Responsive 3-Way Switching**: Seamlessly toggle between Card Grid View, High-Density Table View, and Geospatial Map View across desktop and mobile screens.

### 2.2 Cross-Group Deduplication & Recency Filtering
- **Multi-Signal Duplicate Detection**:
  - Identical Facebook post IDs.
  - Matching contact phone numbers combined with matching rent or society names.
  - Matching author names combined with high post body text similarity (>0.70 Jaccard 3-gram similarity).
  - High overall post body text similarity (>0.88 Jaccard 3-gram similarity).
- **Provenance Badges**: Merged canonical listing cards display a "Seen in X groups" badge listing all source Facebook groups.
- **7-Horizon Recency Filtering**: Filter listings across 7 time horizons on both server queries and client views:
  - Past 1 Hour (`1h`)
  - Past 3 Hours (`3h`)
  - Past 6 Hours (`6h`)
  - Past 12 Hours (`12h`)
  - Past 24 Hours (`24h`)
  - Past 7 Days (`7d`)
  - All Time (`all`)

### 2.3 Refined 0–100 Scoring Algorithm
The rating engine computes an objective 0–100 score based on verified rental criteria:

- **Base Score**: 50 points baseline.
- **Rent Evaluation**:
  - Rent <= 25,000 INR: +20 points
  - Rent 25,001 – 30,000 INR: 0 points
  - Rent > 30,000 INR: -20 points
- **Brokerage Policy**:
  - Zero Brokerage / Direct Owner: +15 points
  - Broker Fee Applicable: -30 points (strict penalty)
- **Security Deposit**:
  - Deposit <= 50,000 INR: +10 points
  - Deposit > 2.2x Monthly Rent: -15 points (high deposit ratio penalty)
- **Gated Community & Amenities**:
  - Gated Society: +15 points
  - Swimming Pool: +15 points
  - 100% Power Backup (DG): +10 points
- **Washroom Configuration**:
  - Attached / Dedicated Washroom: +10 points
  - Shared / Non-Dedicated Washroom: -5 points
- **Bachelor / Gender Compatibility**:
  - Bachelor Male Allowed: +10 points
  - Female Only / Gender Mismatch: -25 points
- **Proximity & Commute**:
  - Walking Distance / Distance <= 600m: +15 points (walking bonus)
  - Direct Kadubeesanahalli Access (Panathur underpass bypass): +10 points
  - Average Peak Commute <= 7 mins: +20 points
  - Average Peak Commute 8–12 mins: +10 points
  - Average Peak Commute 13–18 mins: -5 points
  - Average Peak Commute > 18 mins: -25 points
- **Furnishing**:
  - Fully Furnished or Semi-Furnished: +5 points
- **Vegetarian Restriction**:
  - Strict Vegetarian-Only Requirement: -50 points penalty applied to final score
- **Score Clamping & Rating Tiers**:
  - Score bounded to [0, 100].
  - 90–100: Unicorn Deal
  - 75–89: Great Match
  - 55–74: Moderate Match
  - 0–54: Low Match

### 2.4 Backend Database Pagination & Edge API
- **SQL LIMIT & OFFSET**: Server-side pagination executing indexed database queries.
- **Envelope Metadata**: Response includes `count`, `totalCount`, `page`, `limit`, `totalPages`, and `hasMore`.
- **Sub-15ms Edge Latency**: Optimized queries running on Vercel Edge Runtime.
- **Scrape Route Un-Gating**: Scrape trigger endpoints (`/api/scrape/trigger` and `/api/scrape/seed`) operate without passcode restrictions for automated workflows.
- **Expandable Descriptions**: Clean click-to-expand UI interaction for post descriptions in cards.

---

## 3. Environment Variables

Configure the following environment variables in `.env` (local) or Vercel Project Settings (cloud):

| Variable | Required | Description | Example |
|---|---|---|---|
| `TURSO_DATABASE_URL` | Optional (Local) / Required (Cloud) | LibSQL/Turso database connection URL. Defaults to `file:data/listings.db` locally. | `libsql://rental-radar-xxx.turso.io` or `https://...` |
| `TURSO_AUTH_TOKEN` | Required if using Turso | JWT authentication token generated by Turso CLI. | `eyJhbGciOi...` |
| `DASHBOARD_PASSCODE` | Optional | Admin passcode protecting listing status mutations. Scrape routes remain open. | `secret_passcode_123` |
| `FB_SESSION_STORAGE` | Optional (Scraper) | Base64-encoded Playwright browser storage state for Facebook scraper automation. | `eyJjb29raWVzIjp...` |

---

## 4. Local Development Setup

### Prerequisites
- Node.js >= 22.0.0
- pnpm >= 9.0.0

### Step 1: Clone and Install
```bash
git clone https://github.com/Sanjit-M/rental-radar.git
cd rental-radar
pnpm install
```

### Step 2: Run Development Servers
You can run the frontend application directly with Vite, or run the Node.js backend server alongside Vite:

```bash
# Option A: Start Vite frontend (runs on http://localhost:3000 or http://localhost:5173)
pnpm dev

# Option B: Start local Node.js API server (runs on http://localhost:3001)
pnpm server
```

The frontend dashboard will be accessible at `http://localhost:3000` or `http://localhost:5173`.

### Step 3: Facebook Session Authentication (Optional Scraper Tooling)
To set up authenticated Facebook session state for the Playwright scraper:

```bash
# Open interactive browser to log into Facebook
pnpm auth

# Export session state to base64 string for GitHub Actions / environment variables
pnpm auth:export

# Run manual scrape cycle from command line
pnpm scrape
```

---

## 5. Database Configuration

Rental Radar supports both local file storage and Turso Cloud database instances:

### Local File SQLite
By default, if `TURSO_DATABASE_URL` is omitted, the application uses `@libsql/client` pointing to `file:data/listings.db`. Schema migrations and indexes are automatically applied on initialization.

### Turso Cloud Database
1. Install Turso CLI and authenticate:
   ```bash
   brew install tursodatabase/tap/turso
   turso auth signup # or turso auth login
   ```
2. Create database and obtain connection details:
   ```bash
   turso db create rental-radar
   turso db show rental-radar --url
   turso db tokens create rental-radar
   ```
3. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your environment.

---

## 6. Cloud Deployment & Vercel Hosting

### Deploy to Vercel
1. Push your code to GitHub.
2. Navigate to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel automatically detects Vite settings using the included `vercel.json` and build command:
   - Build Command: `pnpm build`
   - Output Directory: `dist`
4. Under Vercel **Project Settings -> Environment Variables**, add:
   - `TURSO_DATABASE_URL`: Your Turso cloud database URL.
   - `TURSO_AUTH_TOKEN`: Your Turso authentication token.
   - `DASHBOARD_PASSCODE`: Optional passcode for status updates.
5. Ensure **Settings -> Deployment Protection -> Vercel Authentication** is **Disabled** so that the `/api/listings` endpoints and webhooks can be accessed publicly.

---

## 7. Testing & Verification

Rental Radar contains a comprehensive Vitest test suite covering domain scoring, peak commute routing, entity extraction, deduplication, server-side pagination, frontend UI components, and end-to-end requirements.

### Run Unit and Integration Tests
```bash
pnpm test
```

### Run Production Build Verification
```bash
pnpm build
```

---

## 8. License

Private / MIT License. Developed for automated rental intelligence in Bangalore tech corridors.
