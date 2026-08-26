# Dispatch Log

## 2026-08-26T15:02:22Z
You are Specification & Requirements Miner for Rental Radar v2.
Your working directory is: /Users/nebulo/Workspace/rental-radar/.agents/spec_miner_survey
The authoritative user request is at: /Users/nebulo/Workspace/rental-radar/.agents/ORIGINAL_REQUEST.md
The project workspace root is: /Users/nebulo/Workspace/rental-radar

Read /Users/nebulo/Workspace/rental-radar/.agents/ORIGINAL_REQUEST.md and examine the project codebase to extract exact specifications, formulas, edge cases, and acceptance constraints.
Specifically mine:
1. R1: Leaflet + CartoDB Dark Matter tile spec, society coordinates around Prestige Tech Park & Kadubeesanahalli, marker score badges, hover popups (rent, commute metrics, author, direct FB links), view switching (Map, Grid, Table).
2. R2: Cross-group deduplication algorithm (author name normalization, phone number extraction & normalization, text similarity metric/threshold), multi-group badge ("Seen in X groups"), canonical record merging, recency time-window filter intervals (1h, 3h, 6h, 12h, 24h, 7d, all).
3. R3: Scoring formula exact arithmetic:
   - Base 0-100
   - Male/bachelor match: +10 pts (mismatch: -25 pts)
   - Strict brokerage penalty: -30 pts
   - High deposit penalty (>2.2x monthly rent): -15 pts
   - Non-dedicated / shared washroom penalty: -5 pts
   - Vegetarian-only restriction penalty: -50 pts
   - Proximity walking bonus (<500m to PTP gates): +15 pts
4. R4: `/api/listings` pagination API contract (query params: page, limit default 12; response JSON: items/listings, page, limit, totalCount, totalPages, hasMore), SQL LIMIT/OFFSET execution, removal of Sample Data button, expand/collapse post descriptions, removal of scrape passcode.
5. R5: Documentation requirements (emoji-free README.md, dev instructions, Vercel Edge hosting), Vitest 100% pass, git main branch commit.
