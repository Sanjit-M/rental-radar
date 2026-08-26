# Handoff Report: Frontend & UI Exploration for Rental Radar v2

**Role**: Frontend & UI Explorer  
**Working Directory**: `/Users/nebulo/Workspace/rental-radar/.agents/explorer_survey_frontend`  
**Target Milestone**: Survey & Exploration  
**Date**: 2026-08-26  

---

## 1. Observation

Direct observations from inspecting the codebase:

1. **Leaflet Dependency & Map Component**:
   - `package.json` lines 25 & 33: `"leaflet": "^1.9.4"`, `"@types/leaflet": "^1.9.22"`.
   - `src/client/components/MapView.tsx` lines 1–197: Implements an interactive OpenStreetMap component with CartoDB Dark Matter tile layer (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`), PTP anchor pin (`[12.9385, 77.6917]`), score pills, and rich popups with WhatsApp and Facebook links.
   - `src/client/App.tsx` lines 28 & 202–219: `viewMode` state is currently restricted to `useState<'grid' | 'table'>('grid')`, and only `<div className="grid ...">` or `<ListingTable>` is conditionally rendered. `MapView` is not imported or rendered.
   - `src/client/components/FilterBar.tsx` lines 19–20 & 74–88: `viewMode: 'grid' | 'table'` only exposes two toggle buttons for grid and table.

2. **Sample Data Button**:
   - `src/client/components/HeaderStats.tsx` lines 44–50:
     ```tsx
     <button
       onClick={onReseed}
       title="Reset with Kadubeesanahalli sample data"
       className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors"
     >
       Load Sample Data
     </button>
     ```
   - Requirement R4 explicitly mandates: *"Remove the 'Load Sample Data' button"*.

3. **Listing Description Truncation**:
   - `src/client/components/ListingCard.tsx` lines 146–148:
     ```tsx
     <p className="text-xs text-slate-400 line-clamp-2 italic mb-4">
       "{listing.rawText}"
     </p>
     ```
   - Description has no click handler or expansion state.

4. **Multi-Group Deduplication Representation**:
   - `src/domain/types.ts` lines 139–140: `RentalListing` contains optional fields `groupNames?: string[]` and `postCount?: number`.
   - Neither `src/client/components/ListingCard.tsx` nor `src/client/components/ListingTable.tsx` currently renders a `"Seen in X groups"` badge when `postCount > 1`.

5. **Recency Filtering & Pagination**:
   - `src/client/components/FilterBar.tsx` lines 93–178: Contains filters for Min Score, Max Rent, BHK Type, Furnishing, and User Pipeline Status, but lacks a Recency filter (`1h`, `3h`, `6h`, `12h`, `24h`, `7d`, `all`).
   - `src/client/App.tsx` lines 44–68: `fetchListings` does not pass `recency`, and `App.tsx` lacks UI controls for server-side pagination (`page`, `limit`, `totalPages`, `totalCount`).
   - `api/index.ts` lines 278–370: Backend API already supports `page`, `limit`, `recency`, `totalCount`, `totalPages`, and `hasMore`.

6. **Society Coordinates & Localities**:
   - `src/domain/config.ts` lines 19–128 (`KNOWN_SOCIETIES`) and 130–139 (`LOCALITY_COORDS`) define coordinates for 12 societies and 6 localities centered around `12.9385, 77.6917`.

---

## 2. Logic Chain

1. **Geospatial Map Integration (R1)**:
   - *Observation*: `MapView.tsx` exists and renders correctly with Leaflet and CartoDB Dark Matter, but is unreferenced in `App.tsx` and `FilterBar.tsx`.
   - *Reasoning*: Expanding `viewMode` to `'grid' | 'table' | 'map'`, adding a `MapPin` icon toggle button in `FilterBar.tsx`, and rendering `<MapView>` when `viewMode === 'map'` in `App.tsx` will fulfill R1 without new dependencies.

2. **Deduplication UI & Recency (R2)**:
   - *Observation*: `RentalListing` carries `postCount` and `groupNames`, but UI does not display them; `FilterBar.tsx` lacks a recency selector.
   - *Reasoning*: Adding a `"Seen in X groups"` badge to `ListingCard.tsx` and `ListingTable.tsx` and adding a Recency dropdown in `FilterBar.tsx` wired to `api.getListings({ recency })` will fulfill R2.

3. **Description Expandability & Sample Data Cleanup (R4)**:
   - *Observation*: `ListingCard.tsx` hardcodes `line-clamp-2`; `HeaderStats.tsx` renders `<button onClick={onReseed}>Load Sample Data</button>`.
   - *Reasoning*: Introducing a local `isExpanded` boolean state on `ListingCard.tsx` with a toggle click handler and removing the `Load Sample Data` button from `HeaderStats.tsx` will fulfill R4.

4. **Pagination Controls (R4)**:
   - *Observation*: Backend `/api/listings` returns `{ totalCount, page, limit, totalPages, hasMore, listings }`, but `App.tsx` does not display page navigation.
   - *Reasoning*: Storing `page` state in `App.tsx`, passing it to `api.getListings`, and rendering a bottom pagination bar with Previous/Next and page numbers will enable complete server-side navigation.

---

## 3. Caveats

- Leaflet map instances in single-page React apps require container dimensions to be fully computed upon mount. When switching tabs between Table/Grid and Map view, `map.invalidateSize()` must be triggered or called in a `useEffect` on `viewMode === 'map'` to prevent partial gray tile rendering.
- No other caveats identified. All prerequisite data models, scoring types, coordinates, and CSS styling classes are in place.

---

## 4. Conclusion

The Rental Radar frontend is structurally sound, clean, and modern. Implementing the v2 frontend requirements requires no heavy refactoring or new dependencies (Leaflet and Lucide icons are already installed).

The implementation roadmap consists of:
1. **`src/client/components/HeaderStats.tsx`**: Remove the "Load Sample Data" button.
2. **`src/client/components/FilterBar.tsx`**: Add 3rd view toggle button (`map`), add Recency filter dropdown (`all`, `1h`, `3h`, `6h`, `12h`, `24h`, `7d`).
3. **`src/client/components/ListingCard.tsx`**: Add expandable description toggle (`line-clamp-2` $\leftrightarrow$ full text), add "Seen in X groups" multi-group badge.
4. **`src/client/components/ListingTable.tsx`**: Add "Seen in X groups" multi-group badge in Society/Locality column.
5. **`src/client/components/MapView.tsx`**: Ensure `map.invalidateSize()` is invoked when visible.
6. **`src/client/services/api.ts` & `src/client/App.tsx`**: Wire `'map'` view mode, wire `recency` filter parameter, and implement pagination controls (`page`, `limit`, `totalPages`, `totalCount`).

---

## 5. Verification Method

To independently verify these findings:
1. **Type & Test Verification**:
   ```bash
   npx vitest run
   npx tsc --noEmit
   ```
   *Expected result*: All 18 unit tests pass; TypeScript compiles with zero errors.
2. **Component File Inspections**:
   - `src/client/components/MapView.tsx` — inspect Leaflet tile layer URL and marker popup markup.
   - `src/client/components/HeaderStats.tsx:44-50` — confirm presence of `Load Sample Data` button.
   - `src/client/components/ListingCard.tsx:147` — confirm `line-clamp-2` static description.
   - `src/client/App.tsx:28` — confirm `useState<'grid' | 'table'>('grid')`.
