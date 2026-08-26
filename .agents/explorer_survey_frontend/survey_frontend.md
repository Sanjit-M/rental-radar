# Frontend & UI Architecture Survey Report — Rental Radar v2

**Date**: 2026-08-26  
**Author**: Frontend & UI Explorer  
**Scope**: Complete investigation of frontend layout, views (Grid, Table, Map), cards, filters, society geospatial coordinates, responsiveness, and v2 upgrade requirements.

---

## 1. Executive Summary

Rental Radar is a high-performance React 18 + Vite + Tailwind CSS single-page dashboard designed to track, rank, and visualize rental listings around **Prestige Tech Park (PTP)** and **Kadubeesanahalli**, Bangalore.

### Core Strengths of Existing Frontend:
1. **Modern Dark Theme & Glassmorphism**: Clean visual presentation with Plus Jakarta Sans typography, custom glass panels (`.glass-panel`), and emerald green accents.
2. **Multi-dimensional Filtering**: Real-time filtering by search keywords, min score, max rent, BHK type, furnishing, and pipeline status.
3. **Interactive Commute & Rating Visualizations**: Branded rating badges with point-by-point math audit modals (`ScoreBreakdownModal`) and simulated weekday peak scooter commute pills (`CommutePill`).
4. **Pre-existing MapView Component**: A dedicated Leaflet + CartoDB Dark Matter map component (`MapView.tsx`) already exists in the codebase with custom score badges, PTP anchor marker, and interactive popups.

### Key Gaps to Address for Rental Radar v2:
1. **Map View Not Connected**: `MapView.tsx` is not wired into `App.tsx` or `FilterBar.tsx` (viewMode is strictly `'grid' | 'table'`).
2. **Missing Recency Filtering**: No UI control or state for 1h, 3h, 6h, 12h, 24h, 7d time-window filtering.
3. **No "Seen in X groups" Multi-Group Deduplication Badge**: Cross-posted listings merged by the deduplication engine lack visual multi-group indicators on cards and table rows.
4. **Description Expand/Collapse Missing**: Post raw text descriptions are clamped to 2 lines (`line-clamp-2`) without a click-to-expand toggle.
5. **"Load Sample Data" Button Still Present**: Header still exposes a sample data button that must be removed per R4.
6. **Missing Frontend Pagination Controls**: Server-side pagination is implemented on Edge API, but frontend lacks page state, previous/next controls, and page indicator.

---

## 2. Detailed Codebase & Component Analysis

### 2.1 UI Layout & Global Styling

| File | Role & Current Implementation |
|---|---|
| `index.html` | Imports Google Font `Plus Jakarta Sans` (weights 400–800). Configures dark root background `bg-slate-950 text-slate-100` and emerald text selection. |
| `src/client/index.css` | Implements `.glass-panel` (`rgba(17, 24, 39, 0.7)`, 12px blur, subtle 1px border) and `.glass-panel-hover` with green glow box shadow. Defines dark custom scrollbars. |
| `tailwind.config.js` | Configures `darkMode: 'class'` and custom `radar` color palette (emerald 50–900). |
| `src/client/App.tsx` | Main application shell. Fetches stats and listings, manages filter state, coordinates modals, and renders active views. |

### 2.2 Dashboard Header & Metrics (`src/client/components/HeaderStats.tsx`)

- **Sticky Top Bar**: `sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80`.
- **Branding**: "📍 PTP & Kadubeesanahalli Rental Radar" with green "Live" badge and descriptive subtitle.
- **Action Buttons**:
  - `Load Sample Data` (`onReseed`) — **Action Required: Remove per R4**.
  - `Check Groups Now` (`onTriggerScrape`) with animated spin icon during background scraper execution.
- **Metric Cards (6 Glass Panels)**:
  1. *Total Matches*: Total listings passing filters.
  2. *Unicorn Deals*: Score $\ge 90$ count with emerald highlight.
  3. *Avg Rent*: Formatted Indian Rupee currency (`₹24,500`).
  4. *Avg Peak Commute*: Two-way average peak scooter minutes (`11 mins`).
  5. *Gated Communities*: Verified gated society count.
  6. *Swimming Pools*: Verified pool count.

---

## 3. View Implementations (Grid, Table, Map)

### 3.1 Grid View (`src/client/components/ListingCard.tsx`)
- **Layout**: 3-column responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`).
- **Header**: Author name with Indigo user icon, relative posted timestamp (`1 hr ago`, `2 hrs ago`).
- **Title & Badge**: BHK type tag, society/locality name, clickable `RatingBadge` opening `ScoreBreakdownModal`.
- **Pricing**: Monthly rent in large mono typography (`₹22,000 / month`), deposit indicator (`Dep: ₹45,000`).
- **Commute Pill**: `CommutePill.tsx` showing 2-way peak average, distance in km, 11 AM inbound, 5 PM outbound, and Panathur Underpass bottleneck alert.
- **Amenity Badges**: Broker Fee / Zero Brokerage, Gated, Swimming Pool, 100% DG Backup, Attached Bath, Furnishing status.
- **Description**: Currently `<p className="text-xs text-slate-400 line-clamp-2 italic mb-4">"{listing.rawText}"</p>`.
- **Contact Actions**: WhatsApp button (`wa.me` with prefilled inquiry message), Direct Call button (`tel:`), and Facebook post link (`postUrl`).
- **Status Pipeline Dropdown**: Direct update between `New`, `Interested`, `Called`, `Applied`, `Rejected`.

### 3.2 High-Density Table View (`src/client/components/ListingTable.tsx`)
- **Layout**: Glass panel with horizontal overflow container (`overflow-x-auto`).
- **Columns**: Score, Author / Posted, Society / Locality, Type, Rent, Phone, Brokerage, Peak Commute, Amenities, Status, Actions.
- **Optimized for Quick Auditing**: Quick inline status dropdowns, amenity icon tooltips, and one-click contact buttons.

### 3.3 Interactive Geospatial Map (`src/client/components/MapView.tsx`)
- **Leaflet & CartoDB Dark Matter**:
  - Tile layer: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` (clean dark mode, no API keys, OSM data).
  - Center anchor: `[12.9385, 77.6917]` (PTP Main Gate) at zoom level 15.
- **Custom DivIcons**:
  - `ptp-office-pin`: Green gradient anchor badge for Prestige Tech Park.
  - `society-marker-pin`: Color-coded pill markers based on rating score (Emerald $\ge 90$, Blue $\ge 75$, Amber $< 75$) with score value and cluster badge (`+count`).
- **Interactive Marker Popups**:
  - Displays Society name, author name, posted time, rent, peak commute minutes, BHK type, furnishing.
  - Interactive direct action buttons: Green "WhatsApp" button and slate "View Post" button.
- **Current Deficiencies**:
  - Not integrated into `App.tsx` or `FilterBar.tsx`.
  - Needs resize trigger (`map.invalidateSize()`) on view mode activation.

---

## 4. Filter Toolbar & Recency Filtering (`src/client/components/FilterBar.tsx`)

### Existing Controls:
- **Search input**: Debounced/instant search matching text, society names, locations, authors, and phone numbers.
- **Sort Dropdown**: `Rating Score (High to Low)`, `Rent (Lowest first)`, `Peak Commute (Shortest first)`, `Recently Discovered`.
- **Sliders**:
  - Min Score: 0 to 90 pts (step 5).
  - Max Rent: ₹15,000 to ₹50,000 (step ₹2,500).
- **Dropdowns**:
  - BHK Type: All, 1 BHK, 2 BHK, 3 BHK, Flatmate.
  - Furnishing: Any, Fully Furnished, Semi-Furnished, Unfurnished.
  - Pipeline Status: All, New, Interested, Called, Applied, Rejected.

### Required Enhancements for v2:
1. **Recency Filter Dropdown**:
   - Options: `All Time`, `Past 1 Hour`, `Past 3 Hours`, `Past 6 Hours`, `Past 12 Hours`, `Past 24 Hours`, `Past 7 Days`.
   - Parameter: `recency: 'all' | '1h' | '3h' | '6h' | '12h' | '24h' | '7d'`.
2. **3-Way View Mode Switcher**:
   - Grid (`LayoutGrid`), Table (`List`), Map (`MapPin` or `Map`).

---

## 5. Society Coordinates & Geographic Layout

All recognized societies and anchor points around Kadubeesanahalli and Prestige Tech Park:

| Key | Society / Locality Name | Latitude | Longitude | Direct PTP Access? | Key Amenities |
|---|---|---|---|---|---|
| `ptp` | **Prestige Tech Park Anchor** | `12.9385` | `77.6917` | Yes (0m) | Anchor Campus |
| `sobhairis` | Sobha Iris | `12.9372` | `77.6934` | Yes (Walkable) | Pool, DG Backup, Gated |
| `sobhahibiscus` | Sobha Hibiscus | `12.9358` | `77.6948` | Yes | Pool, DG Backup, Gated |
| `sobhajasmine` | Sobha Jasmine | `12.9365` | `77.6955` | Yes | Pool, DG Backup, Gated |
| `assetzmarq` | Assetz Marq | `12.9410` | `77.6960` | Yes | Pool, DG Backup, Gated |
| `assetz` | Assetz East Point | `12.9422` | `77.6980` | Yes | Pool, DG Backup, Gated |
| `orchidlakeview` | Goyal Orchid Lakeview | `12.9320` | `77.6890` | Yes | Pool, DG Backup, Gated |
| `prestigesunnyside` | Prestige Sunnyside | `12.9390` | `77.6950` | Yes | Pool, DG Backup, Gated |
| `divyasree` | Divyasree 77 East | `12.9450` | `77.6880` | Yes | Pool, DG Backup, Gated |
| `sjr` | SJR Parkway Homes | `12.9315` | `77.6920` | Yes | Pool, DG Backup, Gated |
| `salarpuria` | Salarpuria Sattva | `12.9360` | `77.6900` | Yes | Pool, DG Backup, Gated |
| `umiyacity` | Umiya City / Velocity | `12.9375` | `77.6910` | Yes | DG Backup, Gated |
| `panathuroasis` | Panathur Gated Society | `12.9340` | `77.7010` | No (Panathur Underpass) | Pool, DG Backup, Gated |
| `kadubeesanahalli` | Kadubeesanahalli Locality | `12.9380` | `77.6925` | Yes | Central Hub |

---

## 6. Server-Side Pagination Integration

### Backend API Schema (`/api/listings`):
```typescript
export interface PaginatedListingsResponse {
  readonly count: number;
  readonly totalCount: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasMore: boolean;
  readonly listings: RentalListing[];
}
```

### Required Frontend Changes:
1. **API Client (`src/client/services/api.ts`)**:
   - Update return type of `getListings` to `Promise<PaginatedListingsResponse>`.
2. **App State (`src/client/App.tsx`)**:
   - Add `page: number` (default `1`), `limit: number` (default `12`), `totalPages: number`, `totalCount: number`, `hasMore: boolean`.
   - Reset `page` to `1` whenever any filter changes.
   - Render clean pagination controls at the bottom of listings view:
     - "Showing X of Y listings"
     - "Previous" (disabled on page 1)
     - Page number indicators
     - "Next" (disabled on last page)

---

## 7. Concrete UI Upgrade Specifications

### 7.1 Cross-Group Deduplication Badge in `ListingCard.tsx`
```tsx
{listing.postCount && listing.postCount > 1 && (
  <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/30 font-medium mb-3">
    <Layers className="w-3 h-3 text-purple-400" />
    <span>Seen in {listing.postCount} groups</span>
  </div>
)}
```

### 7.2 Expandable Raw Description in `ListingCard.tsx`
```tsx
const [isExpanded, setIsExpanded] = useState(false);

// ... in JSX:
<div className="mb-4">
  <p
    onClick={() => setIsExpanded(!isExpanded)}
    className={`text-xs text-slate-400 italic cursor-pointer transition-colors hover:text-slate-200 ${
      isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
    }`}
  >
    "{listing.rawText}"
  </p>
  <button
    type="button"
    onClick={() => setIsExpanded(!isExpanded)}
    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold mt-1 flex items-center gap-0.5"
  >
    {isExpanded ? 'Show less' : 'Read full description...'}
  </button>
</div>
```

### 7.3 View Mode Switcher in `FilterBar.tsx`
```tsx
<div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
  <button
    onClick={() => onViewModeChange('grid')}
    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
    title="Card Grid View"
  >
    <LayoutGrid className="w-3.5 h-3.5" />
  </button>
  <button
    onClick={() => onViewModeChange('table')}
    className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
    title="Table View"
  >
    <List className="w-3.5 h-3.5" />
  </button>
  <button
    onClick={() => onViewModeChange('map')}
    className={`p-1.5 rounded ${viewMode === 'map' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
    title="Interactive Map View"
  >
    <MapPin className="w-3.5 h-3.5" />
  </button>
</div>
```

### 7.4 Rendering MapView in `App.tsx`
```tsx
{viewMode === 'grid' ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {listings.map((listing) => (
      <ListingCard
        key={listing.id}
        listing={listing}
        onStatusChange={handleStatusChange}
        onOpenScoreModal={setInspectListing}
      />
    ))}
  </div>
) : viewMode === 'table' ? (
  <ListingTable
    listings={listings}
    onStatusChange={handleStatusChange}
    onOpenScoreModal={setInspectListing}
  />
) : (
  <MapView
    listings={listings}
    onSelectListing={setInspectListing}
    onStatusChange={handleStatusChange}
  />
)}
```

---

## 8. Summary Checklist for Frontend Implementation

| Requirement | Component(s) Involved | Action Description |
|---|---|---|
| **R1. Map View Integration** | `App.tsx`, `FilterBar.tsx`, `MapView.tsx` | Add `'map'` to `viewMode`, add Map button with `MapPin` icon in `FilterBar`, render `MapView` in `App.tsx`, ensure Leaflet `invalidateSize` triggers on tab switch. |
| **R2. Recency Filtering** | `FilterBar.tsx`, `App.tsx`, `api.ts` | Add recency dropdown (`1h, 3h, 6h, 12h, 24h, 7d, all`), wire to `api.getListings({ recency })`. |
| **R2. Multi-Group Deduplication Badge** | `ListingCard.tsx`, `ListingTable.tsx` | Display "Seen in X groups" badge when `listing.postCount > 1` or `listing.groupNames.length > 1`. |
| **R4. Expandable Descriptions** | `ListingCard.tsx` | Add toggle state `isExpanded` with click-to-expand behavior. |
| **R4. Remove Sample Data Button** | `HeaderStats.tsx`, `App.tsx` | Remove "Load Sample Data" button from header bar and cleanup unused props. |
| **R4. Server-Side Pagination** | `App.tsx`, `api.ts` | Handle paginated responses (`page`, `limit`, `totalPages`, `totalCount`, `hasMore`), add pagination navigation controls in UI. |
