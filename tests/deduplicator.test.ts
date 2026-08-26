import { describe, it, expect } from 'vitest';
import { deduplicateListings, areDuplicates } from '../src/domain/parser/deduplicator';
import { RentalListing, makeINR, makeKilometers, makeMinutes, makeFbPostId, ListingId } from '../src/domain/types';

function createMockListing(overrides: Partial<RentalListing>): RentalListing {
  return {
    id: 1 as ListingId,
    fbPostId: makeFbPostId('fb_01'),
    groupName: 'Flat and Flatmates Bangalore',
    postUrl: 'https://facebook.com/1',
    authorName: 'Rohan Deshmukh',
    postedTime: '1 hr ago',
    rawText: 'Looking for a male flatmate in Sobha Iris Kadubeesanahalli near PTP. Rent 22k.',
    location: 'Kadubeesanahalli',
    bhkType: '3 BHK (Shared/Full)',
    entities: {
      rent: makeINR(22000),
      deposit: makeINR(44000),
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
    },
    commute: {
      distanceKm: makeKilometers(0.5),
      inboundMins: makeMinutes(3),
      outboundMins: makeMinutes(3),
      twoWayAvgPeakMins: makeMinutes(3),
      hasPanathurUnderpassBottleneck: false,
    },
    score: 100,
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

describe('Cross-Group Deduplication Engine', () => {
  it('detects duplicate cross-posts by phone number and rent', () => {
    const postA = createMockListing({ fbPostId: makeFbPostId('post_1'), groupName: 'Group A' });
    const postB = createMockListing({ fbPostId: makeFbPostId('post_2'), groupName: 'Group B' });

    expect(areDuplicates(postA, postB)).toBe(true);
  });

  it('merges cross-posted listings and counts groups', () => {
    const postA = createMockListing({ fbPostId: makeFbPostId('post_1'), groupName: 'Group A' });
    const postB = createMockListing({ fbPostId: makeFbPostId('post_2'), groupName: 'Group B' });
    const uniquePost = createMockListing({
      fbPostId: makeFbPostId('post_3'),
      groupName: 'Group C',
      authorName: 'Aditya K.',
      rawText: 'Completely different listing in Assetz East Point.',
      entities: {
        ...postA.entities,
        societyName: 'Assetz East Point',
        contactPhone: '9880198765',
      },
    });

    const deduplicated = deduplicateListings([postA, postB, uniquePost]);
    expect(deduplicated.length).toBe(2);
    expect(deduplicated[0]?.postCount).toBe(2);
    expect(deduplicated[0]?.groupNames).toContain('Group A');
    expect(deduplicated[0]?.groupNames).toContain('Group B');
  });
});
