# Original User Request

## 2026-08-26T15:01:17Z

Build and deploy Rental Radar v2 with an interactive OpenStreetMap view, cross-group deduplication engine, recency filters, backend database pagination, refined scoring algorithms, and updated documentation.

Working directory: /Users/nebulo/Workspace/rental-radar
Integrity mode: demo

## Requirements

### R1. Interactive Geospatial Map (Leaflet + CartoDB Dark Matter)
Integrate a lightweight, responsive Leaflet map plotting known gated communities and society coordinates around Prestige Tech Park and Kadubeesanahalli. Markers must display custom score badges with hover popups containing rent, commute metrics, author info, and direct Facebook post links.

### R2. Cross-Group Deduplication & Recency Filtering
Implement a robust deduplication pipeline that detects cross-posted rental listings across Facebook groups (matching author names, contact phone numbers, and normalized text similarity). Deduplicated listings must be merged with a "Seen in X groups" badge and the latest timestamp. Support recency time-window filtering (1h, 3h, 6h, 12h, 24h, 7d, all).

### R3. Advanced Scoring Algorithm Updates
Update the 0–100 scoring engine with the refined criteria:
- Male/bachelor accommodation match: +10 pts (mismatch -25 pts)
- Strict brokerage penalty: -30 pts
- High deposit penalty (>2.2x monthly rent): -15 pts
- Non-dedicated / shared washroom penalty: -5 pts
- Vegetarian-only restriction penalty: -50 pts
- Proximity walking bonus (<500m to PTP gates): +15 pts

### R4. Backend Database Pagination & Edge API Optimization
Refactor /api/listings on SQLite and Turso to support server-side pagination (page, limit default 12, totalCount, totalPages, hasMore) using SQL LIMIT and OFFSET. Remove the "Load Sample Data" button, make post descriptions expandable on click, and remove passcode restrictions on scrape triggers.

### R5. Complete Documentation & Deployment Verification
Update README.md with complete, emoji-free instructions for local development and Vercel hosting. Verify that all Vitest unit tests pass and that the live Vercel Edge deployment serves the updated UI with zero errors.

## Acceptance Criteria

### Geospatial Map
- [ ] Leaflet map renders without external API keys in dark mode matching the dashboard theme.
- [ ] Pinpoints recognized societies with interactive popups showing score, rent, and one-click Facebook/WhatsApp links.
- [ ] Seamlessly switches between Map View, Grid View, and High-Density Table View on desktop and mobile.

### Deduplication & Recency
- [ ] Duplicate posts across multiple groups are merged into a single canonical record with a multi-group badge.
- [ ] Recency filter accurately filters listings by published timestamp on both backend and UI.

### Scoring Accuracy
- [ ] Vegetarian-restricted posts receive a -50 point penalty.
- [ ] Deposits exceeding 2.2x monthly rent receive a penalty.
- [ ] Dedicated washrooms and bachelor friendliness are scored according to specified rules.

### Performance & Packaging
- [ ] Backend pagination handles requests in < 15ms on Vercel Edge runtime.
- [ ] Post descriptions expand on click/tap.
- [ ] 100% of Vitest unit tests pass (pnpm test) and production build succeeds (pnpm build).
- [ ] Changes committed and pushed to GitHub main branch.
