import { describe, it, expect } from 'vitest';
import { BANGALORE_CORRIDORS } from '../src/client/components/CorridorFilter';
import {
  RentalListing,
  makeINR,
  makeMinutes,
  makeKilometers,
  makeFbPostId,
  ListingId,
} from '../src/domain/types';

describe('Frontend Corridor Filter & Bangalore Tech Corridors', () => {
  it('BANGALORE_CORRIDORS constant contains expected 7 tech corridor definitions', () => {
    expect(BANGALORE_CORRIDORS).toHaveLength(7);
    const corridorIds = BANGALORE_CORRIDORS.map((c) => c.id);
    expect(corridorIds).toEqual([
      'all',
      'Kadubeesanahalli',
      'Prestige Tech Park',
      'Cessna',
      'Bellandur',
      'Marathahalli',
      'Boganahalli',
    ]);

    for (const corridor of BANGALORE_CORRIDORS) {
      expect(corridor.label).toBeTruthy();
      expect(corridor.subtext).toBeTruthy();
    }
  });

  const createMockListing = (overrides?: Partial<RentalListing> & {
    readonly isBrokerage?: boolean;
    readonly isFemaleOnly?: boolean;
    readonly isMaleBachelorAllowed?: boolean;
    readonly societyName?: string;
  }): RentalListing => {
    const isBrokerage = overrides?.isBrokerage ?? false;
    const isFemaleOnly = overrides?.isFemaleOnly ?? false;
    const isMaleBachelorAllowed = overrides?.isMaleBachelorAllowed ?? true;
    const societyName = overrides?.societyName ?? 'Prestige Tech Vista';

    return {
      id: 1 as ListingId,
      fbPostId: makeFbPostId('post_corridor_test_123'),
      groupName: 'Flat and Flatmates Bangalore',
      postUrl: 'https://facebook.com/groups/123/posts/456',
      authorName: 'Test Tenant',
      postedTime: '1 hour ago',
      rawText: overrides?.rawText ?? 'Spacious flat near Kadubeesanahalli bridge with balcony',
      location: overrides?.location ?? 'Kadubeesanahalli',
      landmark: overrides?.landmark ?? 'Near JP Morgan',
      bhkType: overrides?.bhkType ?? '2 BHK (Shared/Full)',
      entities: {
        rent: makeINR(25000),
        deposit: makeINR(50000),
        isBrokerage,
        isGatedSociety: true,
        societyName,
        hasSwimmingPool: true,
        hasPowerBackup: true,
        hasAttachedWashroom: true,
        hasBalcony: true,
        isVegetarianOnly: false,
        isMaleBachelorAllowed,
        isFemaleOnly,
        isWalkingDistance: true,
        furnishing: 'Fully Furnished',
        isKadubeesanahalliDirect: true,
        contactPhone: '9876543210',
      },
      commute: {
        distanceKm: makeKilometers(1.5),
        inboundMins: makeMinutes(10),
        outboundMins: makeMinutes(12),
        twoWayAvgPeakMins: makeMinutes(11),
        hasPanathurUnderpassBottleneck: false,
      },
      score: 85,
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
      tier: '✨ Great Match',
      userStatus: 'new',
      createdAt: '2026-10-06T10:00:00Z',
      updatedAt: '2026-10-06T10:00:00Z',
      ...overrides,
    };
  };

  const filterListingPredicate = (
    listing: RentalListing,
    selectedCorridor: string,
    search: string,
    zeroBrokerageOnly: boolean,
    bachelorFriendlyOnly: boolean
  ): boolean => {
    if (zeroBrokerageOnly && listing.entities.isBrokerage) return false;
    if (bachelorFriendlyOnly && (listing.entities.isFemaleOnly || !listing.entities.isMaleBachelorAllowed)) return false;
    if (selectedCorridor !== 'all' && search.trim()) {
      const text = `${listing.location} ${listing.landmark ?? ''} ${listing.entities.societyName ?? ''} ${listing.rawText}`.toLowerCase();
      if (!text.includes(selectedCorridor.toLowerCase())) return false;
    }
    return true;
  };

  it('filters out brokerage listings when zeroBrokerageOnly is true', () => {
    const directListing = createMockListing({ isBrokerage: false });
    const brokerListing = createMockListing({ isBrokerage: true });

    expect(filterListingPredicate(directListing, 'all', '', true, false)).toBe(true);
    expect(filterListingPredicate(brokerListing, 'all', '', true, false)).toBe(false);
    expect(filterListingPredicate(brokerListing, 'all', '', false, false)).toBe(true);
  });

  it('filters out non-bachelor-friendly listings when bachelorFriendlyOnly is true', () => {
    const bachelorListing = createMockListing({ isMaleBachelorAllowed: true, isFemaleOnly: false });
    const femaleOnlyListing = createMockListing({ isMaleBachelorAllowed: false, isFemaleOnly: true });
    const familyOnlyListing = createMockListing({ isMaleBachelorAllowed: false, isFemaleOnly: false });

    expect(filterListingPredicate(bachelorListing, 'all', '', false, true)).toBe(true);
    expect(filterListingPredicate(femaleOnlyListing, 'all', '', false, true)).toBe(false);
    expect(filterListingPredicate(familyOnlyListing, 'all', '', false, true)).toBe(false);
  });

  it('filters listings by selected corridor when search is also present', () => {
    const kbhListing = createMockListing({
      location: 'Kadubeesanahalli',
      rawText: 'Flat in Kadubeesanahalli near Cessna',
    });
    const bellandurListing = createMockListing({
      location: 'Bellandur',
      rawText: 'Green Glen Layout 2BHK',
      landmark: 'Near EcoSpace',
      societyName: 'Sobha Quartz',
    });

    expect(filterListingPredicate(kbhListing, 'Kadubeesanahalli', 'flat', false, false)).toBe(true);
    expect(filterListingPredicate(bellandurListing, 'Kadubeesanahalli', 'flat', false, false)).toBe(false);

    expect(filterListingPredicate(bellandurListing, 'Bellandur', 'flat', false, false)).toBe(true);
    expect(filterListingPredicate(kbhListing, 'Bellandur', 'flat', false, false)).toBe(false);

    expect(filterListingPredicate(kbhListing, 'all', 'flat', false, false)).toBe(true);
    expect(filterListingPredicate(bellandurListing, 'all', 'flat', false, false)).toBe(true);
  });
});
