# PTP & Kadubeesanahalli Rental Radar

An automated, 100% free intelligence system designed to scrape, filter, parse, and score rental accommodations (1 BHK, 2 BHK, 3 BHK, and private flatmate rooms) near Prestige Tech Park (PTP) and Kadubeesanahalli, Bangalore.

Built with a Unified Full-Stack TypeScript architecture using Playwright, Dual-Mode SQLite (Local `node:sqlite` + Turso Cloud), Hono Serverless, React, Vite, and Tailwind CSS.

---

## Quickstart Commands

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install project dependencies |
| `pnpm test` | Run Vitest unit test suites |
| `pnpm build` | Compile TypeScript and build production bundle |
| `pnpm auth:setup` | One-time interactive Facebook browser authentication |
| `pnpm auth:export` | Export Facebook session cookies string for GitHub Secrets |
| `pnpm server` | Start local Hono backend API server (Port 3001) |
| `pnpm dev` | Start React frontend Vite development server (Port 3000) |
| `pnpm scrape` | Trigger an immediate manual Facebook group scrape cycle |

---

## Free Cloud Deployment Architecture

```text
┌────────────────────────────────────────────────────────┐
│ GitHub Actions (Free Unlimited / 2,000 min/mo)         │
│  - Hourly Cron Trigger (0 * * * *)                     │
│  - Playwright Headless Scraper                         │
│  - Injects FB_SESSION_STORAGE secret                   │
└──────────────────────────┬─────────────────────────────┘
                           │ Syncs new listings
                           ▼
┌────────────────────────────────────────────────────────┐
│ Turso Cloud SQLite (100% Free Tier)                    │
│  - 9 GB Storage & 1 Billion Row Reads/Month            │
│  - Instant global latency                              │
└──────────────────────────┬─────────────────────────────┘
                           │ Queries / Updates
                           ▼
┌────────────────────────────────────────────────────────┐
│ Vercel Serverless & CDN (100% Free Tier)               │
│  - Hono Serverless API (/api/*)                        │
│  - React + Vite Dashboard SPA                          │
│  - Passcode Gate (DASHBOARD_PASSCODE)                  │
└────────────────────────────────────────────────────────┘
```

---

## 100% Free Setup & Deployment Guide

### Step 1: Create Free Turso Database
Turso provides 9 GB of cloud SQLite storage and 1 billion row reads/month for free.

1. Install the Turso CLI or sign up at [turso.tech](https://turso.tech):
   ```bash
   brew install tursodatabase/tap/turso
   turso auth signup # or turso auth login
   ```
2. Create a new database:
   ```bash
   turso db create rental-radar
   ```
3. Retrieve your database URL and Auth Token:
   ```bash
   turso db show rental-radar --url
   # Output: libsql://rental-radar-[username].turso.io

   turso db tokens create rental-radar
   # Output: [Your Turso Auth Token]
   ```

---

### Step 2: Deploy Frontend & API to Vercel
1. Push this repository to your GitHub account (already live at `https://github.com/Sanjit-M/rental-radar`).
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"** -> Import `rental-radar`.
3. Under **Environment Variables**, add:
   - `TURSO_DATABASE_URL` = `libsql://rental-radar-[username].turso.io`
   - `TURSO_AUTH_TOKEN` = `[Your Turso Auth Token]`
   - `DASHBOARD_PASSCODE` = `[Choose a secret PIN/Passcode to protect your dashboard]`
4. Click **Deploy**. Vercel will build and launch your dashboard with a free `https://rental-radar-*.vercel.app` URL.

---

### Step 3: Setup Automated Hourly Facebook Scraping
To scrape private/joined Facebook groups headlessly in GitHub Actions:

1. **Log in locally once**:
   ```bash
   pnpm auth:setup
   ```
   A browser window will open. Log into your Facebook account, then press `ENTER` in your terminal.

2. **Export session cookies**:
   ```bash
   pnpm auth:export
   ```
   This will print a base64 encoded string containing your active session cookies (`c_user`, `xs`, `datr`).

3. **Add GitHub Repository Secrets**:
   Go to your GitHub repo -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:
   - `FB_SESSION_STORAGE` = `[Paste the exported string]`
   - `TURSO_DATABASE_URL` = `libsql://rental-radar-[username].turso.io`
   - `TURSO_AUTH_TOKEN` = `[Your Turso Auth Token]`

4. **Done!** GitHub Actions will now automatically trigger `.github/workflows/scraper.yml` every hour, scraping all target Facebook groups and syncing high-scoring rental leads directly into your Turso database.

---

## Local Development (Offline & Dual-Mode)

During local development, you do not need internet access or cloud credentials. The app automatically falls back to local `node:sqlite` in `data/listings.db`:

```bash
# Terminal 1: Start backend server
pnpm server

# Terminal 2: Start frontend
pnpm dev
```
Open **http://localhost:3000** in your browser.

---

## Key Domain Features

1. **Weekday Peak Scooter Commute Engine (IST)**:
   - Simulates Monday–Friday rush hour commute times for Prestige Tech Park:
     - **11:00 AM – 1:00 PM IST (Inbound to PTP)**: 1.30x baseline travel time.
     - **4:00 PM – 6:00 PM IST (Outbound from PTP)**: 1.65x baseline travel time.
     - **Panathur Underpass Penalty**: Automatically applies an +8 minute penalty if a property requires crossing the single-lane Panathur Railway Underpass bottleneck.

2. **0–100 Rating Meter & Classification**:
   - Starting from a baseline of **50 points**:
     - **Rent**: <= 25,000 (+20) | 25,001–30,000 (0) | > 30,000 (-20)
     - **Brokerage**: Zero Brokerage / Direct Owner (+15) | Broker Fee (-25)
     - **Security Deposit**: <= 2 months / <= 50,000 (+10) | > 1 Lakh / > 5 months (-10)
     - **Gated Society**: Sobha Iris, Assetz East Point, Prestige Sunnyside, Goyal Orchid, etc. (+15)
     - **Amenities**: Swimming Pool (+15), 100% DG Power Backup (+10), Attached Bathroom (+10), Furnished (+5)
     - **Route**: Panathur S-bend / Underpass Bypass (+10)
     - **Peak Commute**: <= 7 mins (+20), 8–12 mins (+10), 13–18 mins (-5), > 18 mins (-25)
   - **Tiers**: Unicorn Deal (90–100), Great Match (75–89), Moderate Match (55–74), Low Match (<55).

3. **Strict Location & Demographic Filtering**:
   - Automatically drops posts mentioning Bellandur, Marathahalli, Green Glen Layout, Kariyammana Agrahara, and generic ORR.
   - Filters out female-only/girls-only listings while supporting male and co-ed searches.

4. **Direct Contact Actions**:
   - Direct WhatsApp message link pre-populated with society name and inquiry text.
   - One-click telephone dialer.
   - Direct link to original Facebook post.
   - Point-by-point score calculation audit modal.

---

## Repository Layout

```text
rental-radar/
├── .github/workflows/           # Automated CI/CD
│   └── scraper.yml              # Hourly Facebook scraper cron workflow
├── api/                         # Vercel Serverless Adapter
│   └── index.ts                 # Hono Vercel function entry point
├── CONTEXT.md                   # Ubiquitous domain glossary
├── docs/adr/                    # Architectural Decision Records
│   ├── 0001-native-sqlite-storage.md
│   ├── 0002-weekday-peak-traffic-commute-engine.md
│   ├── 0003-local-persistent-playwright-session.md
│   └── 0004-vercel-turso-github-actions-free-deployment.md
├── src/
│   ├── domain/                  # Pure Shared Domain Layer
│   │   ├── prelude.ts           # Ambient Result monad, branded types, defect helpers
│   │   ├── types.ts             # Domain models (RentalListing, CommuteWindow, etc.)
│   │   ├── config.ts            # PTP coordinates, traffic multipliers, scoring weights
│   │   ├── parser/              # Pure Regex & NLP extraction
│   │   ├── commute/             # Weekday 11am-1pm & 4pm-6pm IST traffic simulator
│   │   └── scorer/              # 0-100 rating computation & tier assignment
│   ├── db/                      # Dual-Mode Storage (node:sqlite / Turso LibSQL)
│   │   ├── database.ts          # Schema, connection & client switch
│   │   └── repository.ts        # Filter queries & status updates
│   ├── scraper/                 # Playwright Ingestion
│   │   ├── authSetup.ts         # One-time login helper
│   │   ├── exportSession.ts     # Cookie exporter for GitHub Secrets
│   │   ├── browserSession.ts    # Dual local / secret session manager
│   │   ├── groupScraper.ts      # Facebook group crawler
│   │   └── seedData.ts          # Realistic fixtures
│   ├── server/                  # Hono Local & Serverless API
│   │   ├── routes/              # /api/listings, /api/stats, /api/scrape
│   │   └── index.ts             # Backend entry point (Port 3001)
│   └── client/                  # React + Vite + Tailwind CSS UI
│       ├── components/          # Header, FilterBar, ListingCard, Table, Modals
│       └── App.tsx              # Main Dashboard
└── tests/                       # Vitest Unit Tests (RGR TDD)
```
