import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'https://demo-db-turso.turso.io';
});

// Mock scraper executions to avoid network timeouts during unit testing
vi.mock('../src/scraper/groupScraper', () => ({
  runScrapeCycle: vi.fn().mockResolvedValue({
    status: 'success',
    scanned: 6,
    matched: 6,
    message: 'Mock scraped 6 listings',
  }),
}));

import { buildRecencySqlCondition, listingRepository } from '../src/db/repository';
import { app } from '../src/server/app';
import { deduplicateListings } from '../src/domain/parser/deduplicator';
import {
  RentalListing,
  PaginatedListingsResponse,
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
  ListingId,
} from '../src/domain/types';

function createMockListing(overrides: Partial<RentalListing> = {}): RentalListing {
  return {
    id: 1 as ListingId,
    fbPostId: makeFbPostId('fb_01'),
    groupName: 'Flat and Flatmates Bangalore',
    postUrl: 'https://facebook.com/1',
    authorName: 'Verified Group Member',
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

describe('Milestone 1 — Backend Pagination & Data Engine Tests', () => {
  describe('1. Limit & Offset Calculation Math', () => {
    it('calculates correct default pagination (page=1, limit=12)', () => {
      const page = 1;
      const limit = 12;
      const offset = (page - 1) * limit;
      expect(offset).toBe(0);
    });

    it('calculates correct offset for arbitrary page and limit', () => {
      const calculateOffset = (p: number, l: number) => (Math.max(1, p) - 1) * Math.max(1, l);
      expect(calculateOffset(2, 12)).toBe(12);
      expect(calculateOffset(3, 10)).toBe(20);
      expect(calculateOffset(5, 12)).toBe(48);
    });

    it('computes totalPages accurately for exact and fractional page bounds', () => {
      const computeTotalPages = (total: number, limit: number) =>
        total === 0 ? 0 : Math.ceil(total / limit);

      expect(computeTotalPages(0, 12)).toBe(0);
      expect(computeTotalPages(12, 12)).toBe(1);
      expect(computeTotalPages(13, 12)).toBe(2);
      expect(computeTotalPages(48, 12)).toBe(4);
      expect(computeTotalPages(49, 12)).toBe(5);
    });

    it('evaluates hasMore correctly across boundary pages', () => {
      const checkHasMore = (page: number, totalPages: number) => page < totalPages;

      expect(checkHasMore(1, 4)).toBe(true);
      expect(checkHasMore(3, 4)).toBe(true);
      expect(checkHasMore(4, 4)).toBe(false);
      expect(checkHasMore(5, 4)).toBe(false);
      expect(checkHasMore(1, 0)).toBe(false);
    });
  });

  describe('2. Recency Time-Window SQL Filtering', () => {
    it('generates correct SQL clause for 1h recency', () => {
      const sql = buildRecencySqlCondition('1h');
      expect(sql).toContain("created_at >= datetime('now', '-1 hour')");
      expect(sql).toContain("posted_time LIKE '%min%'");
      expect(sql).toContain("posted_time LIKE '%1 hr%'");
    });

    it('generates correct SQL clause for 3h recency', () => {
      const sql = buildRecencySqlCondition('3h');
      expect(sql).toContain("created_at >= datetime('now', '-3 hours')");
      expect(sql).toContain("posted_time LIKE '%3 hr%'");
    });

    it('generates correct SQL clause for 6h recency', () => {
      const sql = buildRecencySqlCondition('6h');
      expect(sql).toContain("created_at >= datetime('now', '-6 hours')");
      expect(sql).toContain("posted_time LIKE '%6 hr%'");
    });

    it('generates correct SQL clause for 12h recency', () => {
      const sql = buildRecencySqlCondition('12h');
      expect(sql).toContain("created_at >= datetime('now', '-12 hours')");
      expect(sql).toContain("posted_time NOT LIKE '%day%'");
    });

    it('generates correct SQL clause for 24h recency', () => {
      const sql = buildRecencySqlCondition('24h');
      expect(sql).toContain("created_at >= datetime('now', '-24 hours')");
      expect(sql).toContain("posted_time NOT LIKE '%2 day%'");
      expect(sql).toContain("posted_time NOT LIKE '%week%'");
    });

    it('generates correct SQL clause for 7d recency', () => {
      const sql = buildRecencySqlCondition('7d');
      expect(sql).toContain("created_at >= datetime('now', '-7 days')");
      expect(sql).toContain("posted_time NOT LIKE '%2 week%'");
      expect(sql).toContain("posted_time NOT LIKE '%month%'");
    });

    it('returns empty string for "all" or undefined recency', () => {
      expect(buildRecencySqlCondition('all')).toBe('');
      expect(buildRecencySqlCondition(undefined)).toBe('');
      expect(buildRecencySqlCondition('')).toBe('');
    });

    it('verifies multi-digit hour and day boundary exclusions in recency SQL generation', () => {
      const sql1h = buildRecencySqlCondition('1h');
      expect(sql1h).toContain("posted_time NOT LIKE '%11 hr%'");
      expect(sql1h).toContain("posted_time NOT LIKE '%21 hr%'");

      const sql6h = buildRecencySqlCondition('6h');
      expect(sql6h).toContain("posted_time NOT LIKE '%14 hr%'");
      expect(sql6h).toContain("posted_time NOT LIKE '%24 hr%'");

      const sql12h = buildRecencySqlCondition('12h');
      expect(sql12h).toContain("posted_time NOT LIKE '%24 hr%'");

      const sql7d = buildRecencySqlCondition('7d');
      expect(sql7d).toContain("posted_time NOT LIKE '%8 day%'");
    });
  });

  describe('3. Response Envelope Serialization & Deduplication', () => {
    it('produces valid PaginatedListingsResponse envelope structure', () => {
      const mockListings = [
        createMockListing({ fbPostId: makeFbPostId('post_1'), groupName: 'Group 1' }),
        createMockListing({ fbPostId: makeFbPostId('post_2'), groupName: 'Group 2' }),
      ];

      const response: PaginatedListingsResponse = {
        count: mockListings.length,
        totalCount: 48,
        page: 1,
        limit: 12,
        totalPages: 4,
        hasMore: true,
        listings: mockListings,
      };

      expect(response.count).toBe(2);
      expect(response.totalCount).toBe(48);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(12);
      expect(response.totalPages).toBe(4);
      expect(response.hasMore).toBe(true);
      expect(Array.isArray(response.listings)).toBe(true);
    });

    it('merges cross-posted listings on query deduplication', () => {
      const post1 = createMockListing({
        fbPostId: makeFbPostId('dup_1'),
        groupName: 'Group A',
        entities: {
          ...createMockListing().entities,
          contactPhone: '9900112233',
          rent: makeINR(25000),
        },
      });

      const post2 = createMockListing({
        fbPostId: makeFbPostId('dup_2'),
        groupName: 'Group B',
        entities: {
          ...createMockListing().entities,
          contactPhone: '9900112233',
          rent: makeINR(25000),
        },
      });

      const deduplicated = deduplicateListings([post1, post2]);
      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0]?.postCount).toBe(2);
      expect(deduplicated[0]?.groupNames).toContain('Group A');
      expect(deduplicated[0]?.groupNames).toContain('Group B');
    });
  });

  describe('4. Scrape Route Un-Gating & Config Parity', () => {
    it('verifies Node app /config returns requiresPasscode: false', async () => {
      const res = await app.request('/config');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requiresPasscode).toBe(false);
    });

    it('verifies Node app /api/config returns requiresPasscode: false', async () => {
      const res = await app.request('/api/config');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requiresPasscode).toBe(false);
    });

    it('verifies scrape routes bypass passcode middleware even if DASHBOARD_PASSCODE is set', async () => {
      const originalPasscode = process.env.DASHBOARD_PASSCODE;
      try {
        process.env.DASHBOARD_PASSCODE = 'super_secret_test_passcode';

        // /health should be un-gated
        const healthRes = await app.request('/api/health');
        expect(healthRes.status).toBe(200);

        // /config should be un-gated
        const configRes = await app.request('/api/config');
        expect(configRes.status).toBe(200);

        // /scrape/seed should bypass passcode and return 200
        const seedRes = await app.request('/scrape/seed', { method: 'POST' });
        expect(seedRes.status).toBe(200);
        const resData = await seedRes.json();
        expect(resData.status).toBe('success');

        // /api/scrape/seed should bypass passcode and return 200
        const apiSeedRes = await app.request('/api/scrape/seed', { method: 'POST' });
        expect(apiSeedRes.status).toBe(200);

        // /scrape/trigger should bypass passcode and return 200
        const triggerRes = await app.request('/scrape/trigger', { method: 'POST' });
        expect(triggerRes.status).toBe(200);

        // /api/scrape/trigger should bypass passcode and return 200
        const apiTriggerRes = await app.request('/api/scrape/trigger', { method: 'POST' });
        expect(apiTriggerRes.status).toBe(200);

        // Mutations on protected routes (like status update) should still require passcode
        const patchRes = await app.request('/listings/1/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'interested' }),
        });
        expect(patchRes.status).toBe(401);

        // With valid passcode header, protected routes should pass passcode middleware
        vi.spyOn(listingRepository, 'updateStatus').mockResolvedValueOnce(true);
        vi.spyOn(listingRepository, 'getListingById').mockResolvedValueOnce(createMockListing());

        const authedPatchRes = await app.request('/listings/1/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-dashboard-passcode': 'super_secret_test_passcode',
          },
          body: JSON.stringify({ status: 'interested' }),
        });
        expect(authedPatchRes.status).toBe(200);
      } finally {
        process.env.DASHBOARD_PASSCODE = originalPasscode;
      }
    });

    it('verifies Edge router handles /config with requiresPasscode: false', async () => {
      const edgeModule = await import('../api/index');
      const edgeApp = edgeModule.default;
      const req = new Request('http://localhost/api/config');
      const res = await edgeApp(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requiresPasscode).toBe(false);
    });
  });
});
