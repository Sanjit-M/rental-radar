# PTP & Kadubeesanahalli Rental Radar

An automated, local-first intelligence system designed to scrape, filter, parse, and score rental accommodations (1 BHK, 2 BHK, 3 BHK, and private flatmate rooms) near Prestige Tech Park (PTP) and Kadubeesanahalli, Bangalore.

Built with a Unified Full-Stack TypeScript architecture using Playwright, Node Native SQLite, Hono, React, Vite, and Tailwind CSS.

---

## Quickstart Commands

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install project dependencies |
| `pnpm test` | Run Vitest unit test suites |
| `pnpm build` | Compile TypeScript and build production bundle |
| `pnpm auth:setup` | One-time interactive Facebook browser authentication |
| `pnpm server` | Start local Hono backend API server (Port 3001) |
| `pnpm dev` | Start React frontend Vite development server (Port 3000) |
| `pnpm scrape` | Trigger an immediate manual Facebook group scrape cycle |

---

## Local Setup & Development

### 1. Prerequisites
- Node.js v22+ (v25+ supported with native `node:sqlite`)
- pnpm package manager (`brew install pnpm` or `npm install -g pnpm`)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Sanjit-M/rental-radar.git
cd rental-radar

# Install dependencies
pnpm install

# Run automated tests
pnpm test
```

### 3. Running Locally
In terminal 1, start the backend API server:
```bash
pnpm server
```

In terminal 2, start the React frontend dashboard:
```bash
pnpm dev
```
Open **http://localhost:3000** in your browser.

---

## Facebook Group Ingestion & Scraping

### Step 1: One-Time Authentication Setup
To scrape your joined Facebook rental groups safely without hardcoding credentials:
```bash
pnpm auth:setup
```
1. A Chromium browser window will launch.
2. Log into your Facebook account.
3. Return to the terminal and press `ENTER` to save the persistent browser context to `~/.fb_rental_profile`.

### Step 2: Running Scrape Jobs
- **Manual CLI**: Run `pnpm scrape` anytime or schedule via cron/launchd.
- **In-App Trigger**: Click "Check Groups Now" on the dashboard header.

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
├── CONTEXT.md                   # Ubiquitous domain glossary
├── docs/adr/                    # Architectural Decision Records
│   ├── 0001-native-sqlite-storage.md
│   ├── 0002-weekday-peak-traffic-commute-engine.md
│   └── 0003-local-persistent-playwright-session.md
├── src/
│   ├── domain/                  # Pure Shared Domain
│   │   ├── prelude.ts           # Ambient Result monad, branded types, defect helpers
│   │   ├── types.ts             # Domain models (RentalListing, CommuteWindow, etc.)
│   │   ├── config.ts            # PTP coordinates, traffic multipliers, scoring weights
│   │   ├── parser/              # Pure Regex & NLP extraction
│   │   ├── commute/             # Weekday 11am-1pm & 4pm-6pm IST traffic simulator
│   │   └── scorer/              # 0-100 rating computation & tier assignment
│   ├── db/                      # Node Native SQLite (DatabaseSync)
│   │   ├── database.ts          # Schema & connection
│   │   └── repository.ts        # Filter queries & status updates
│   ├── scraper/                 # Playwright Ingestion
│   │   ├── authSetup.ts         # One-time login helper
│   │   ├── browserSession.ts    # Session loader (~/.fb_rental_profile)
│   │   ├── groupScraper.ts      # Facebook group crawler
│   │   └── seedData.ts          # Realistic fixtures
│   ├── server/                  # Hono Local Backend API
│   │   ├── routes/              # /api/listings, /api/stats, /api/scrape
│   │   └── index.ts             # Backend entry point (Port 3001)
│   └── client/                  # React + Vite + Tailwind CSS UI
│       ├── components/          # Header, FilterBar, ListingCard, ListingTable, Modals
│       └── App.tsx              # Main Dashboard
└── tests/                       # Vitest Unit Tests (RGR TDD)
```
