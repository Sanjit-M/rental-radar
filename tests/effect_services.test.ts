import { describe, it, expect } from 'vitest';
import { Effect, Layer } from 'effect';
import { ListingScorer, ListingScorerLive } from '../src/domain/services/ScorerService';
import { ListingDeduplicator, ListingDeduplicatorLive } from '../src/domain/services/DeduplicatorService';
import {
  ListingRepository,
  ListingRepositoryLive,
  ListingNotFoundError,
  RepositoryError,
} from '../src/domain/services/RepositoryService';
import {
  ExtractedEntities,
  CommuteWindow,
  RentalListing,
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
  ListingId,
} from '../src/domain/types';

describe('Effect-TS Domain & Repository Services', () => {
  const baseEntities: ExtractedEntities = {
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
  };

  const baseCommute: CommuteWindow = {
    distanceKm: makeKilometers(0.4),
    inboundMins: makeMinutes(3),
    outboundMins: makeMinutes(3),
    twoWayAvgPeakMins: makeMinutes(3),
    hasPanathurUnderpassBottleneck: false,
  };

  describe('ListingScorer Service', () => {
    it('computes rating score via Effect service tag and live layer', async () => {
      const program = Effect.gen(function* () {
        const scorer = yield* ListingScorer;
        return yield* scorer.scoreListing(baseEntities, baseCommute);
      }).pipe(Effect.provide(ListingScorerLive));

      const result = await Effect.runPromise(program);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.tier).toBe('🔥 Unicorn Deal');
      expect(result.breakdown.rent).toBe(20);
      expect(result.breakdown.swimmingPool).toBe(15);
    });
  });

  describe('ListingDeduplicator Service', () => {
    it('deduplicates cross-posted listings via Effect service', async () => {
      const post1: RentalListing = {
        id: 101 as ListingId,
        fbPostId: makeFbPostId('post_101'),
        groupName: 'Group Bangalore Flats',
        postUrl: 'https://fb.com/101',
        authorName: 'Rahul Verma',
        postedTime: '1 hr ago',
        rawText: 'Spacious 2BHK room available near PTP Cessna park. Rent 22k.',
        location: 'Kadubeesanahalli',
        bhkType: '2 BHK (Shared/Full)',
        entities: baseEntities,
        commute: baseCommute,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const post2: RentalListing = {
        ...post1,
        id: 102 as ListingId,
        fbPostId: makeFbPostId('post_102'),
        groupName: 'Flatmates Kadubeesanahalli',
      };

      const program = Effect.gen(function* () {
        const dedupe = yield* ListingDeduplicator;
        return yield* dedupe.deduplicate([post1, post2]);
      }).pipe(Effect.provide(ListingDeduplicatorLive));

      const canonical = await Effect.runPromise(program);
      expect(canonical).toHaveLength(1);
      expect(canonical[0]?.postCount).toBe(2);
      expect(canonical[0]?.groupNames).toContain('Group Bangalore Flats');
      expect(canonical[0]?.groupNames).toContain('Flatmates Kadubeesanahalli');
    });
  });

  describe('ListingRepository Service & Tagged Errors', () => {
    it('returns tagged ListingNotFoundError when a listing ID does not exist', async () => {
      const program = Effect.gen(function* () {
        const repo = yield* ListingRepository;
        return yield* repo.getListingById(999999);
      }).pipe(Effect.provide(ListingRepositoryLive));

      const exit = await Effect.runPromiseExit(program);
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const failure = exit.cause;
        expect(JSON.stringify(failure)).toContain('ListingNotFoundError');
      }
    });

    it('fetches dashboard stats as a typed Effect', async () => {
      const program = Effect.gen(function* () {
        const repo = yield* ListingRepository;
        return yield* repo.getStats();
      }).pipe(Effect.provide(ListingRepositoryLive));

      const stats = await Effect.runPromise(program);
      expect(stats).toHaveProperty('totalListings');
      expect(stats).toHaveProperty('unicornMatches');
      expect(typeof stats.totalListings).toBe('number');
    });
  });
});
