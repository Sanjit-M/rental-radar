## 2026-08-26T15:21:08Z
You are Milestone 2 Worker (Geospatial Map & Frontend UI) for Rental Radar v2.
Your working directory is: /Users/nebulo/Workspace/rental-radar/.agents/m2_worker_1
The authoritative user request is located at: /Users/nebulo/Workspace/rental-radar/.agents/ORIGINAL_REQUEST.md
The project scope is located at: /Users/nebulo/Workspace/rental-radar/PROJECT.md
The project workspace root is: /Users/nebulo/Workspace/rental-radar

Read /Users/nebulo/Workspace/rental-radar/.agents/ORIGINAL_REQUEST.md and /Users/nebulo/Workspace/rental-radar/PROJECT.md.
Also review the survey findings in:
- /Users/nebulo/Workspace/rental-radar/.agents/explorer_survey_frontend/handoff.md
- /Users/nebulo/Workspace/rental-radar/.agents/m1_challenger_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership for Milestone 2:
- `src/client/components/HeaderStats.tsx`
- `src/client/components/ListingCard.tsx`
- `src/client/components/ListingTable.tsx`
- `src/client/components/FilterBar.tsx`
- `src/client/components/MapView.tsx`
- `src/client/components/ScoreBreakdownModal.tsx`
- `src/client/services/api.ts`
- `src/client/App.tsx`
- `src/db/database.ts`
- `src/db/repository.ts`
- `api/index.ts`

Implementation Tasks:
1. **Remove "Load Sample Data" Button**:
   - In `src/client/components/HeaderStats.tsx`, remove the "Load Sample Data" button per Requirement R4 / Feature F12.
2. **Expandable Post Descriptions**:
   - In `src/client/components/ListingCard.tsx`, implement click/tap expansion toggle on post descriptions (`line-clamp-2` when collapsed, full text when expanded, with expand indicator) per Requirement R4 / Feature F11.
3. **Multi-Group Provenance Badges**:
   - In `src/client/components/ListingCard.tsx` and `src/client/components/ListingTable.tsx`, render a clean "Seen in X groups" badge (`postCount > 1`) showing group count and tooltip or list of `groupNames` per Requirement R2 / Feature F6.
4. **Geospatial Map Integration (Leaflet + CartoDB Dark Matter)**:
   - In `src/client/App.tsx` and `src/client/components/FilterBar.tsx`, add 3-way view switching (`'grid' | 'table' | 'map'`).
   - Wire `<MapView>` in `src/client/App.tsx` with Leaflet container invalidation on tab switch.
   - Verify markers render with custom score badges, popups with rent, commute time, author, direct Facebook post link, and WhatsApp link per Requirement R1 / Features F1–F4.
5. **Recency Filtering UI**:
   - In `src/client/components/FilterBar.tsx` and `src/client/services/api.ts`, add recency dropdown (`'all'`, `'1h'`, `'3h'`, `'6h'`, `'12h'`, `'24h'`, `'7d'`) wired to API queries per Requirement R2 / Feature F7.
6. **Server-Side Pagination UI**:
   - In `src/client/App.tsx`, implement page navigation controls (Previous, Next, page numbers, showing `Page X of Y` and `Showing N of Total listings`) utilizing `PaginatedListingsResponse` (`page`, `limit`, `totalPages`, `totalCount`, `hasMore`).
7. **Score Breakdown Modal Label Fix**:
   - In `src/client/components/ScoreBreakdownModal.tsx`, update brokerage label to `-30` pts.
8. **Recency String Boundary & Database Client Polish**:
   - In `src/db/repository.ts` and `api/index.ts`, refine `buildRecencySqlCondition` word boundary matches for `1h`, `3h`, `6h`, `12h`, `24h`, `7d` to avoid substring collision on multi-digit numbers (`11 hr`, `14 hr`, `24 hr`).
   - In `src/db/database.ts`, ensure `@libsql/client` handles Node `file:` fallback cleanly.
9. **Verification**:
   - Run `pnpm test` (all unit and E2E tests must pass 100%).
   - Run `pnpm build` (clean Vite build, zero TypeScript errors).

Deliver a structured handoff report at `/Users/nebulo/Workspace/rental-radar/.agents/m2_worker_1/handoff.md`.
Send a message when finished with verification results and handoff path.
