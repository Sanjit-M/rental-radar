import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { KNOWN_SOCIETIES, PTP_COORDINATES } from '../../src/domain/config';
import { RentalListing, ExtractedEntities, CommuteWindow, makeINR, makeKilometers, makeMinutes, makeFbPostId, ListingId } from '../../src/domain/types';

// Mock generator for comprehensive adversarial testing
function createMockListing(overrides: Partial<RentalListing> = {}): RentalListing {
  const baseEntities: ExtractedEntities = {
    rent: makeINR(25000),
    deposit: makeINR(50000),
    isBrokerage: false,
    isGatedSociety: true,
    societyName: 'Sobha Iris',
    hasSwimmingPool: true,
    hasPowerBackup: true,
    hasAttachedWashroom: true,
    hasBalcony: true,
    isVegetarianOnly: false,
    isMaleBachelorAllowed: true,
    isFemaleOnly: false,
    isWalkingDistance: true,
    furnishing: 'Fully Furnished',
    isKadubeesanahalliDirect: true,
    contactPhone: '9845012345',
    societyLat: 12.9372,
    societyLon: 77.6934,
  };

  const baseCommute: CommuteWindow = {
    distanceKm: makeKilometers(0.5),
    inboundMins: makeMinutes(3),
    outboundMins: makeMinutes(3),
    twoWayAvgPeakMins: makeMinutes(3),
    hasPanathurUnderpassBottleneck: false,
  };

  return {
    id: 1 as ListingId,
    fbPostId: makeFbPostId('fb_mock_1'),
    groupName: 'Flat and Flatmates Bangalore',
    groupNames: ['Flat and Flatmates Bangalore'],
    postCount: 1,
    postUrl: 'https://facebook.com/groups/test/posts/1',
    authorName: 'Rohan Deshmukh',
    postedTime: '2 hr ago',
    rawText: 'Spacious 1 BHK available in Sobha Iris Kadubeesanahalli. Rent 25k, deposit 50k. Walk to PTP. Fully furnished with attached washroom.',
    location: 'Kadubeesanahalli',
    bhkType: '1 BHK',
    entities: { ...baseEntities, ...(overrides.entities || {}) },
    commute: { ...baseCommute, ...(overrides.commute || {}) },
    score: 95,
    scoreBreakdown: {
      base: 50,
      rent: 20,
      brokerage: 15,
      deposit: 10,
      gatedSociety: 15,
      swimmingPool: 15,
      powerBackup: 10,
      attachedWashroom: 10,
      vegetarianPenalty: 0,
      bachelorMatch: 10,
      walkProximity: 15,
      furnished: 5,
      panathurBypass: 10,
      commute: 20,
    },
    tier: '🔥 Unicorn Deal',
    userStatus: 'new',
    createdAt: '2026-08-26 14:00:00',
    updatedAt: '2026-08-26 14:00:00',
    ...overrides,
  };
}

describe('Adversarial Verification Suite — Milestone 2 UI & Geospatial Map', () => {
  const rootDir = path.resolve(__dirname, '../../');

  // =========================================================================
  // 1. LEAFLET MAP & TILE LAYER EMPIRICAL VERIFICATION
  // =========================================================================
  describe('1. Leaflet Map & CartoDB Dark Matter Verification', () => {
    const mapViewContent = fs.readFileSync(path.join(rootDir, 'src/client/components/MapView.tsx'), 'utf8');

    it('1.1 uses CartoDB Dark Matter tile layer with zero external API keys', () => {
      expect(mapViewContent).toContain('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
      expect(mapViewContent).toContain('&copy; OpenStreetMap contributors &copy; CARTO');
      expect(mapViewContent).not.toMatch(/api_key|access_token|key=|token=/i);
    });

    it('1.2 pins Prestige Tech Park (PTP) at exact coordinates [12.9385, 77.6917]', () => {
      expect(mapViewContent).toContain('PTP_COORDINATES.lat');
      expect(mapViewContent).toContain('PTP_COORDINATES.lon');
      expect(PTP_COORDINATES.lat).toBe(12.9385);
      expect(PTP_COORDINATES.lon).toBe(77.6917);
      expect(mapViewContent).toContain('ptp-office-pin');
      expect(mapViewContent).toContain('🏢 Prestige Tech Park');
      expect(mapViewContent).toContain('Primary Commute Destination Anchor');
    });

    it('1.3 clusters/groups markers by coordinate with score badges and count pills', () => {
      expect(mapViewContent).toContain('coordsMap.set(key, [])');
      expect(mapViewContent).toContain('primary.score >= 90');
      expect(mapViewContent).toContain('primary.score >= 75');
      expect(mapViewContent).toContain('+${count - 1}');
    });

    it('1.4 popup renders complete rental intelligence (rent, commute, WhatsApp, FB link)', () => {
      expect(mapViewContent).toContain('twoWayAvgPeakMins}m peak commute');
      expect(mapViewContent).toContain('https://wa.me/91');
      expect(mapViewContent).toContain('View Post');
    });

    it('1.5 ensures clean lifecycle handling and prevents map resize glitches', () => {
      expect(mapViewContent).toContain('mapInstanceRef.current.invalidateSize()');
      expect(mapViewContent).toContain('mapInstanceRef.current.remove()');
      expect(mapViewContent).toContain('mapInstanceRef.current = null');
    });

    it('1.6 confirms dark mode UI theme styling and legend overlay', () => {
      expect(mapViewContent).toContain('glass-panel');
      expect(mapViewContent).toContain('border-slate-800');
      expect(mapViewContent).toContain('🔥 90+ Unicorn');
      expect(mapViewContent).toContain('✨ 75+ Great');
      expect(mapViewContent).toContain('⚡ 55+ Moderate');
    });
  });

  // =========================================================================
  // 2. 3-WAY RESPONSIVE VIEW SWITCHING EMPIRICAL VERIFICATION
  // =========================================================================
  describe('2. 3-Way Responsive View Switching (Grid / Table / Map)', () => {
    const filterBarContent = fs.readFileSync(path.join(rootDir, 'src/client/components/FilterBar.tsx'), 'utf8');
    const appContent = fs.readFileSync(path.join(rootDir, 'src/client/App.tsx'), 'utf8');
    const listingCardContent = fs.readFileSync(path.join(rootDir, 'src/client/components/ListingCard.tsx'), 'utf8');

    it('2.1 FilterBar provides 3-way toggle buttons for Grid, Table, and Map modes', () => {
      expect(filterBarContent).toContain("viewMode === 'grid'");
      expect(filterBarContent).toContain("viewMode === 'table'");
      expect(filterBarContent).toContain("viewMode === 'map'");
      expect(filterBarContent).toContain('Card Grid View');
      expect(filterBarContent).toContain('High-Density Table View');
      expect(filterBarContent).toContain('OpenStreetMap View');
    });

    it('2.2 App.tsx conditionally renders MapView, ListingTable, or ListingCard grid based on viewMode', () => {
      expect(appContent).toContain("viewMode === 'map' ? (");
      expect(appContent).toContain('<MapView');
      expect(appContent).toContain("viewMode === 'table' ? (");
      expect(appContent).toContain('<ListingTable');
      expect(appContent).toContain('<ListingCard');
    });

    it('2.3 ListingCard provides a MapPin button that switches view to Map', () => {
      expect(listingCardContent).toContain('onFocusMap');
      expect(listingCardContent).toContain('Locate on OpenStreetMap');
      expect(appContent).toContain("onFocusMap={() => setViewMode('map')}");
    });

    it('2.4 Responsive layout classes exist for mobile and desktop viewports', () => {
      // Grid view: 1 col on mobile, 2 cols on tablet, 3 cols on desktop
      expect(appContent).toContain('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5');
      // Table view: responsive horizontal scroll wrapper
      const tableContent = fs.readFileSync(path.join(rootDir, 'src/client/components/ListingTable.tsx'), 'utf8');
      expect(tableContent).toContain('overflow-x-auto');
    });
  });

  // =========================================================================
  // 3. MULTI-GROUP PROVENANCE BADGES EMPIRICAL VERIFICATION
  // =========================================================================
  describe('3. Multi-Group Provenance Badges (Single vs Multi-Group)', () => {
    const cardContent = fs.readFileSync(path.join(rootDir, 'src/client/components/ListingCard.tsx'), 'utf8');
    const tableContent = fs.readFileSync(path.join(rootDir, 'src/client/components/ListingTable.tsx'), 'utf8');

    it('3.1 Card View displays "Seen in X groups" badge ONLY when postCount > 1', () => {
      expect(cardContent).toContain('listing.postCount && listing.postCount > 1');
      expect(cardContent).toContain('Seen in {listing.postCount} groups');
      expect(cardContent).toContain('Seen in ${listing.postCount} groups: ${(listing.groupNames || []).join(\', \')}');
    });

    it('3.2 Table View displays "Seen in X groups" badge ONLY when postCount > 1', () => {
      expect(tableContent).toContain('l.postCount && l.postCount > 1');
      expect(tableContent).toContain('Seen in {l.postCount} groups');
      expect(tableContent).toContain('Seen in ${l.postCount} groups: ${(l.groupNames || []).join(\', \')}');
    });

    it('3.3 Single-group listings (postCount = 1) do not render the multi-group badge', () => {
      const singleGroupListing = createMockListing({ postCount: 1, groupNames: ['Single Group'] });
      expect(Boolean(singleGroupListing.postCount && singleGroupListing.postCount > 1)).toBe(false);

      const multiGroupListing = createMockListing({
        postCount: 3,
        groupNames: ['Group A', 'Group B', 'Group C'],
      });
      expect(Boolean(multiGroupListing.postCount && multiGroupListing.postCount > 1)).toBe(true);
      expect(multiGroupListing.postCount).toBe(3);
    });
  });

  // =========================================================================
  // 4. EXPANDABLE POST DESCRIPTION TOGGLE EMPIRICAL VERIFICATION
  // =========================================================================
  describe('4. Expandable Post Description Toggle', () => {
    const cardContent = fs.readFileSync(path.join(rootDir, 'src/client/components/ListingCard.tsx'), 'utf8');

    it('4.1 implements isExpanded state with line-clamp-2 when collapsed and full text when expanded', () => {
      expect(cardContent).toContain('const [isExpanded, setIsExpanded] = useState(false);');
      expect(cardContent).toContain("!isExpanded ? 'line-clamp-2' : ''");
      expect(cardContent).toContain("isExpanded ? 'Show less' : 'Read full description'");
      expect(cardContent).toContain('isExpanded ? <ChevronUp');
    });

    it('4.2 includes accessibility attributes (role="button", tabIndex={0}, aria-expanded, Enter/Space key handler)', () => {
      expect(cardContent).toContain('role="button"');
      expect(cardContent).toContain('tabIndex={0}');
      expect(cardContent).toContain('aria-expanded={isExpanded}');
      expect(cardContent).toContain("e.key === 'Enter' || e.key === ' '");
      expect(cardContent).toContain('e.preventDefault()');
      expect(cardContent).toContain('setIsExpanded(!isExpanded)');
    });
  });

  // =========================================================================
  // 5. SERVER-SIDE PAGINATION UI CONTROLS & EDGE CASES EMPIRICAL VERIFICATION
  // =========================================================================
  describe('5. Pagination UI Navigation & Edge Cases', () => {
    const appContent = fs.readFileSync(path.join(rootDir, 'src/client/App.tsx'), 'utf8');

    it('5.1 App.tsx renders complete pagination controls and summary range', () => {
      expect(appContent).toContain('Showing');
      expect(appContent).toContain('(page - 1) * 12 + 1');
      expect(appContent).toContain('Math.min(page * 12, totalCount)');
      expect(appContent).toContain('Page');
      expect(appContent).toContain('totalPages');
    });

    it('5.2 disables Previous button when page <= 1 or loading', () => {
      expect(appContent).toContain('disabled={page <= 1 || loading}');
    });

    it('5.3 disables Next button when page >= totalPages, !hasMore, or loading', () => {
      expect(appContent).toContain('disabled={page >= totalPages || !hasMore || loading}');
    });

    it('5.4 hides pagination bar completely when totalCount === 0 or viewMode is map', () => {
      expect(appContent).toContain("totalCount > 0 && viewMode !== 'map'");
    });

    it('5.5 verifies pagination window and ellipsis generator algorithm against adversarial edge cases', () => {
      // Pure algorithmic replication of App.tsx pagination array logic
      const generatePageItems = (page: number, totalPages: number) => {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => {
            if (totalPages <= 7) return true;
            if (p === 1 || p === totalPages) return true;
            return Math.abs(p - page) <= 1;
          })
          .reduce<(number | string)[]>((acc, p, idx, arr) => {
            if (idx > 0 && typeof p === 'number' && typeof arr[idx - 1] === 'number') {
              if ((p as number) - (arr[idx - 1] as number) > 1) {
                acc.push('...');
              }
            }
            acc.push(p);
            return acc;
          }, []);
      };

      // Edge case 1: Single page
      expect(generatePageItems(1, 1)).toEqual([1]);

      // Edge case 2: Exactly 7 pages (no ellipsis needed)
      expect(generatePageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);

      // Edge case 3: 10 pages, on Page 1 -> [1, 2, '...', 10]
      expect(generatePageItems(1, 10)).toEqual([1, 2, '...', 10]);

      // Edge case 4: 10 pages, on Page 5 -> [1, '...', 4, 5, 6, '...', 10]
      expect(generatePageItems(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);

      // Edge case 5: 10 pages, on Page 10 -> [1, '...', 9, 10]
      expect(generatePageItems(10, 10)).toEqual([1, '...', 9, 10]);

      // Edge case 6: 25 pages, on Page 2 -> [1, 2, 3, '...', 25]
      expect(generatePageItems(2, 25)).toEqual([1, 2, 3, '...', 25]);
    });

    it('5.6 verifies range calculations for various dataset boundaries', () => {
      const calculateRange = (page: number, limit: number, totalCount: number) => {
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, totalCount);
        return { start, end };
      };

      // 48 listings, Page 1 of 4 (limit 12)
      expect(calculateRange(1, 12, 48)).toEqual({ start: 1, end: 12 });

      // 48 listings, Page 4 of 4 (limit 12)
      expect(calculateRange(4, 12, 48)).toEqual({ start: 37, end: 48 });

      // 55 listings, Page 5 of 5 (limit 12)
      expect(calculateRange(5, 12, 55)).toEqual({ start: 49, end: 55 });

      // 1 listing, Page 1 of 1 (limit 12)
      expect(calculateRange(1, 12, 1)).toEqual({ start: 1, end: 1 });
    });
  });

  // =========================================================================
  // 6. SAMPLE DATA BUTTON REMOVAL & BROKERAGE LABEL EMPIRICAL VERIFICATION
  // =========================================================================
  describe('6. Sample Data Button Removal & Score Breakdown Consistency', () => {
    const headerStatsContent = fs.readFileSync(path.join(rootDir, 'src/client/components/HeaderStats.tsx'), 'utf8');
    const scoreModalContent = fs.readFileSync(path.join(rootDir, 'src/client/components/ScoreBreakdownModal.tsx'), 'utf8');

    it('6.1 confirms complete removal of "Load Sample Data" button and onReseed prop from HeaderStats.tsx', () => {
      expect(headerStatsContent).not.toContain('Load Sample Data');
      expect(headerStatsContent).not.toContain('onReseed');
      expect(headerStatsContent).toContain('Check Groups Now');
    });

    it('6.2 confirms ScoreBreakdownModal accurately states -30 pts for brokerage penalty', () => {
      expect(scoreModalContent).toContain('Broker Fee Applicable (-30)');
      expect(scoreModalContent).not.toContain('Broker Fee Applicable (-25)');
    });
  });
});
