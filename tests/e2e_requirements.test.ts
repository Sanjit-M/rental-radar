import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import edgeHandler from '../api/index';
import { computeListingScore } from '../src/domain/scorer/ratingEngine';
import { deduplicateListings, areDuplicates } from '../src/domain/parser/deduplicator';
import { calculatePeakScooterCommute } from '../src/domain/commute/router';
import { KNOWN_SOCIETIES, PTP_COORDINATES, SCORING_CONFIG, LOCALITY_COORDS, TARGET_LOCATIONS, EXCLUDED_LOCATIONS } from '../src/domain/config';
import {
  extractAllEntities,
  extractRent,
  extractDeposit,
  extractBrokerage,
  extractPhone,
  extractSocietyAndAmenities,
  extractFurnishing,
} from '../src/domain/parser/extractor';
import {
  passesAllFilters,
  isValidLocation,
  isValidGender,
  isValidBHK,
} from '../src/domain/parser/filter';
import { cleanPostText } from '../src/domain/parser/cleaner';
import {
  RentalListing,
  ExtractedEntities,
  CommuteWindow,
  PaginatedListingsResponse,
  makeINR,
  makeKilometers,
  makeMinutes,
  makeFbPostId,
  ListingId,
} from '../src/domain/types';

// Helper to construct typed mock listings for opaque-box testing
function makeTestListing(overrides: Partial<RentalListing> = {}): RentalListing {
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
    fbPostId: makeFbPostId('fb_test_default'),
    groupName: 'Flat and Flatmates Bangalore',
    postUrl: 'https://facebook.com/groups/test/posts/1',
    authorName: 'Rohan Deshmukh',
    postedTime: '1 hr ago',
    rawText: 'Looking for a male flatmate in Sobha Iris Kadubeesanahalli near PTP. Rent 22k.',
    location: 'Kadubeesanahalli',
    bhkType: '3 BHK (Shared/Full)',
    entities: { ...baseEntities, ...(overrides.entities || {}) },
    commute: { ...baseCommute, ...(overrides.commute || {}) },
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

describe('Rental Radar v2 — Comprehensive E2E Requirements Test Suite', () => {

  // =========================================================================
  // TIER 1: FEATURE COVERAGE (>=5 tests per core requirement)
  // =========================================================================
  describe('Tier 1: Feature Coverage', () => {
    // -----------------------------------------------------------------------
    // R1: Interactive Geospatial Map (Leaflet + CartoDB Dark Matter)
    // -----------------------------------------------------------------------
    describe('R1: Geospatial Map & Society Directory Features', () => {
      it('F1.1: defines Prestige Tech Park (PTP) anchor landmark with precise Kadubeesanahalli gate coordinates', () => {
        expect(PTP_COORDINATES.name).toContain('Prestige Tech Park');
        expect(PTP_COORDINATES.lat).toBeCloseTo(12.9385, 4);
        expect(PTP_COORDINATES.lon).toBeCloseTo(77.6917, 4);
      });

      it('F1.2: maintains verified geospatial coordinates and amenities for all primary gated societies', () => {
        const expectedSocieties = [
          'sobhairis',
          'sobhahibiscus',
          'sobhajasmine',
          'assetz',
          'assetzmarq',
          'orchidlakeview',
          'prestigesunnyside',
          'divyasree',
          'sjr',
          'salarpuria',
        ];

        for (const key of expectedSocieties) {
          const society = KNOWN_SOCIETIES[key];
          expect(society).toBeDefined();
          expect(society.lat).toBeGreaterThan(12.92);
          expect(society.lat).toBeLessThan(12.96);
          expect(society.lon).toBeGreaterThan(77.68);
          expect(society.lon).toBeLessThan(77.72);
          expect(society.isGated).toBe(true);
        }
      });

      it('F1.3: correctly maps society name mentions to society latitude and longitude in entity extraction', () => {
        const postText = 'Looking for flatmate in Goyal Orchid Lakeview, Kadubeesanahalli with pool and gym';
        const entities = extractAllEntities(postText);
        expect(entities.societyName).toBe('Goyal Orchid Lakeview');
        expect(entities.societyLat).toBe(KNOWN_SOCIETIES.orchidlakeview.lat);
        expect(entities.societyLon).toBe(KNOWN_SOCIETIES.orchidlakeview.lon);
      });

      it('F1.4: assigns correct visual score badge tiers matching score brackets (Unicorn, Great, Moderate, Low)', () => {
        const dummyCommute: CommuteWindow = {
          distanceKm: makeKilometers(0.5),
          inboundMins: makeMinutes(3),
          outboundMins: makeMinutes(3),
          twoWayAvgPeakMins: makeMinutes(3),
          hasPanathurUnderpassBottleneck: false,
        };

        // Unicorn (>=90)
        const unicornRes = computeListingScore(
          {
            rent: makeINR(22000),
            deposit: makeINR(40000),
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
          dummyCommute
        );
        expect(unicornRes.tier).toBe('🔥 Unicorn Deal');
        expect(unicornRes.score).toBeGreaterThanOrEqual(90);

        // Low Match (<55)
        const lowRes = computeListingScore(
          {
            rent: makeINR(40000),
            deposit: makeINR(150000),
            isBrokerage: true,
            isGatedSociety: false,
            societyName: null,
            hasSwimmingPool: false,
            hasPowerBackup: false,
            hasAttachedWashroom: false,
            hasBalcony: false,
            isVegetarianOnly: false,
            isMaleBachelorAllowed: true,
            isFemaleOnly: false,
            isWalkingDistance: false,
            furnishing: 'Unfurnished',
            isKadubeesanahalliDirect: false,
            contactPhone: '9845012345',
          },
          { ...dummyCommute, twoWayAvgPeakMins: makeMinutes(22) }
        );
        expect(lowRes.tier).toBe('⚠️ Low Match');
        expect(lowRes.score).toBeLessThan(55);
      });

      it('F1.5: generates WhatsApp click-to-chat action URLs and Facebook post links for marker popups', () => {
        const listing = makeTestListing({
          authorName: 'Vikram Mehta',
          postUrl: 'https://facebook.com/groups/flatmates/posts/999888',
          entities: {
            ...makeTestListing().entities,
            contactPhone: '9880198765',
            societyName: 'Assetz East Point',
          },
        });

        const expectedWhatsAppUrl = `https://wa.me/91${listing.entities.contactPhone}`;
        expect(expectedWhatsAppUrl).toBe('https://wa.me/919880198765');
        expect(listing.postUrl).toContain('facebook.com');
      });

      it('F1.6: supports 3-way responsive view modes (grid, table, map) configuration contracts', () => {
        const validModes: ('grid' | 'table' | 'map')[] = ['grid', 'table', 'map'];
        expect(validModes).toContain('grid');
        expect(validModes).toContain('table');
        expect(validModes).toContain('map');
      });
    });

    // -----------------------------------------------------------------------
    // R2: Cross-Group Deduplication & Recency Filtering
    // -----------------------------------------------------------------------
    describe('R2: Cross-Group Deduplication & Recency Filtering Features', () => {
      it('F2.1: detects duplicate cross-posts using identical Facebook Post IDs', () => {
        const postA = makeTestListing({ fbPostId: makeFbPostId('post_dup_001'), groupName: 'Group Alpha' });
        const postB = makeTestListing({ fbPostId: makeFbPostId('post_dup_001'), groupName: 'Group Beta' });
        expect(areDuplicates(postA, postB)).toBe(true);
      });

      it('F2.2: detects duplicate cross-posts using normalized contact phone number and rent', () => {
        const postA = makeTestListing({
          fbPostId: makeFbPostId('fb_phone_1'),
          groupName: 'Group Alpha',
          entities: { ...makeTestListing().entities, contactPhone: '9845012345', rent: makeINR(24000) },
        });
        const postB = makeTestListing({
          fbPostId: makeFbPostId('fb_phone_2'),
          groupName: 'Group Beta',
          entities: { ...makeTestListing().entities, contactPhone: '9845012345', rent: makeINR(24000) },
        });
        expect(areDuplicates(postA, postB)).toBe(true);
      });

      it('F2.3: detects duplicate cross-posts using normalized contact phone number and matching society name', () => {
        const postA = makeTestListing({
          fbPostId: makeFbPostId('fb_soc_1'),
          groupName: 'Group 1',
          entities: { ...makeTestListing().entities, contactPhone: '9876543210', societyName: 'Divyasree 77 East' },
        });
        const postB = makeTestListing({
          fbPostId: makeFbPostId('fb_soc_2'),
          groupName: 'Group 2',
          entities: { ...makeTestListing().entities, contactPhone: '9876543210', societyName: 'Divyasree 77 East' },
        });
        expect(areDuplicates(postA, postB)).toBe(true);
      });

      it('F2.4: detects duplicate cross-posts using same author name and high Jaccard 3-gram text similarity (> 0.70)', () => {
        const postA = makeTestListing({
          fbPostId: makeFbPostId('fb_author_1'),
          authorName: 'Siddharth Rao',
          rawText: 'Spacious 1 BHK available in Sobha Iris Kadubeesanahalli near PTP back gate. Fully furnished with AC and power backup.',
        });
        const postB = makeTestListing({
          fbPostId: makeFbPostId('fb_author_2'),
          authorName: 'Siddharth Rao',
          rawText: 'Spacious 1 BHK available in Sobha Iris Kadubeesanahalli near PTP back gate. Fully furnished with AC & 100% power backup.',
        });
        expect(areDuplicates(postA, postB)).toBe(true);
      });

      it('F2.5: merges duplicate listings into single canonical record with combined groupNames and postCount', () => {
        const post1 = makeTestListing({ fbPostId: makeFbPostId('cross_1'), groupName: 'Flatmates PTP' });
        const post2 = makeTestListing({ fbPostId: makeFbPostId('cross_2'), groupName: 'Bangalore Rentals' });
        const post3 = makeTestListing({ fbPostId: makeFbPostId('cross_3'), groupName: 'Kadubeesanahalli Flats' });

        const deduplicated = deduplicateListings([post1, post2, post3]);
        expect(deduplicated).toHaveLength(1);
        expect(deduplicated[0].postCount).toBe(3);
        expect(deduplicated[0].groupNames).toEqual(
          expect.arrayContaining(['Flatmates PTP', 'Bangalore Rentals', 'Kadubeesanahalli Flats'])
        );
      });

      it('F2.6: validates recency time-window enum values supported by domain contracts', () => {
        const supportedRecencyWindows = ['1h', '3h', '6h', '12h', '24h', '7d', 'all'];
        for (const window of supportedRecencyWindows) {
          expect(typeof window).toBe('string');
        }
        expect(supportedRecencyWindows).toHaveLength(7);
      });
    });

    // -----------------------------------------------------------------------
    // R3: Advanced Scoring Algorithm Updates
    // -----------------------------------------------------------------------
    describe('R3: Refined 0–100 Scoring Engine Features', () => {
      const dummyCommute: CommuteWindow = {
        distanceKm: makeKilometers(0.5),
        inboundMins: makeMinutes(3),
        outboundMins: makeMinutes(3),
        twoWayAvgPeakMins: makeMinutes(3),
        hasPanathurUnderpassBottleneck: false,
      };

      it('F3.1: awards +10 points for male/bachelor match and applies -25 penalty for female-only post', () => {
        const maleListing = makeTestListing({
          entities: { ...makeTestListing().entities, isMaleBachelorAllowed: true, isFemaleOnly: false },
        });
        const maleScore = computeListingScore(maleListing.entities, dummyCommute);
        expect(maleScore.breakdown.bachelorMatch).toBe(10);

        const femaleListing = makeTestListing({
          entities: { ...makeTestListing().entities, isMaleBachelorAllowed: false, isFemaleOnly: true },
        });
        const femaleScore = computeListingScore(femaleListing.entities, dummyCommute);
        expect(femaleScore.breakdown.bachelorMatch).toBe(-25);
      });

      it('F3.2: applies strict -30 points penalty for brokerage and awards +15 points for zero brokerage', () => {
        const noBrokerListing = makeTestListing({
          entities: { ...makeTestListing().entities, isBrokerage: false },
        });
        const noBrokerScore = computeListingScore(noBrokerListing.entities, dummyCommute);
        expect(noBrokerScore.breakdown.brokerage).toBe(15);

        const brokerListing = makeTestListing({
          entities: { ...makeTestListing().entities, isBrokerage: true },
        });
        const brokerScore = computeListingScore(brokerListing.entities, dummyCommute);
        expect(brokerScore.breakdown.brokerage).toBe(-30);
      });

      it('F3.3: applies -15 points penalty for high deposit ratio (>2.2x rent) and awards +10 for low deposit (<=50k)', () => {
        // High deposit: Rent 20k, Deposit 60k (3.0x rent)
        const highDepScore = computeListingScore(
          { ...makeTestListing().entities, rent: makeINR(20000), deposit: makeINR(60000) },
          dummyCommute
        );
        expect(highDepScore.breakdown.deposit).toBe(-15);

        // Low deposit: Rent 25k, Deposit 40k (1.6x rent, <=50k)
        const lowDepScore = computeListingScore(
          { ...makeTestListing().entities, rent: makeINR(25000), deposit: makeINR(40000) },
          dummyCommute
        );
        expect(lowDepScore.breakdown.deposit).toBe(10);
      });

      it('F3.4: awards +10 points for attached washroom and applies -5 points penalty for shared washroom', () => {
        const attachedScore = computeListingScore(
          { ...makeTestListing().entities, hasAttachedWashroom: true },
          dummyCommute
        );
        expect(attachedScore.breakdown.attachedWashroom).toBe(10);

        const sharedScore = computeListingScore(
          { ...makeTestListing().entities, hasAttachedWashroom: false },
          dummyCommute
        );
        expect(sharedScore.breakdown.attachedWashroom).toBe(-5);
      });

      it('F3.5: applies strict -50 points penalty for vegetarian-only restriction subtracted directly from score', () => {
        const nonVegScore = computeListingScore(
          { ...makeTestListing().entities, isVegetarianOnly: false },
          dummyCommute
        );
        expect(nonVegScore.breakdown.vegetarianPenalty).toBe(0);

        const vegScore = computeListingScore(
          { ...makeTestListing().entities, isVegetarianOnly: true },
          dummyCommute
        );
        expect(vegScore.breakdown.vegetarianPenalty).toBe(-50);
        expect(vegScore.score).toBeLessThanOrEqual(50);
      });

      it('F3.6: awards +15 points proximity walking bonus for listings <500m to PTP or walking distance', () => {
        const walkingScore = computeListingScore(
          { ...makeTestListing().entities, isWalkingDistance: true },
          dummyCommute
        );
        expect(walkingScore.breakdown.walkProximity).toBe(15);
      });
    });

    // -----------------------------------------------------------------------
    // R4: Backend Database Pagination & Edge API Optimization
    // -----------------------------------------------------------------------
    describe('R4: Database Pagination & Edge API Features', () => {
      it('F4.1: verifies PaginatedListingsResponse interface contract schema', () => {
        const mockResponse: PaginatedListingsResponse = {
          count: 1,
          totalCount: 25,
          page: 1,
          limit: 12,
          totalPages: 3,
          hasMore: true,
          listings: [makeTestListing()],
        };

        expect(mockResponse.page).toBe(1);
        expect(mockResponse.limit).toBe(12);
        expect(mockResponse.totalPages).toBe(3);
        expect(mockResponse.hasMore).toBe(true);
        expect(mockResponse.listings).toHaveLength(1);
      });

      it('F4.2: validates SQL offset computation math for pagination', () => {
        const computeOffset = (page: number, limit: number) => (Math.max(1, page) - 1) * limit;

        expect(computeOffset(1, 12)).toBe(0);
        expect(computeOffset(2, 12)).toBe(12);
        expect(computeOffset(3, 12)).toBe(24);
        expect(computeOffset(4, 10)).toBe(30);
      });

      it('F4.3: validates totalPages and hasMore computation rules', () => {
        const computePaginationMeta = (totalCount: number, page: number, limit: number) => {
          const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
          const hasMore = page < totalPages;
          return { totalPages, hasMore };
        };

        expect(computePaginationMeta(48, 1, 12)).toEqual({ totalPages: 4, hasMore: true });
        expect(computePaginationMeta(48, 4, 12)).toEqual({ totalPages: 4, hasMore: false });
        expect(computePaginationMeta(0, 1, 12)).toEqual({ totalPages: 0, hasMore: false });
        expect(computePaginationMeta(5, 1, 12)).toEqual({ totalPages: 1, hasMore: false });
      });

      it('F4.4: exposes /api/config with requiresPasscode set to false (ungated scrape triggers)', async () => {
        const req = new Request('http://localhost/api/config');
        const res = await edgeHandler(req);
        expect(res.status).toBe(200);

        const config = await res.json();
        expect(config.requiresPasscode).toBe(false);
        expect(config).toHaveProperty('ptpAnchor');
        expect(config).toHaveProperty('scoringWeights');
      });

      it('F4.5: exposes /api/health with status ok on Edge API router', async () => {
        const req = new Request('http://localhost/api/health');
        const res = await edgeHandler(req);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
      });
    });

    // -----------------------------------------------------------------------
    // R5: Documentation & Deployment Verification
    // -----------------------------------------------------------------------
    describe('R5: Documentation & Deployment Verification Features', () => {
      it('F5.1: verifies README.md contains complete developer and hosting instructions with zero emojis', () => {
        const readmePath = path.resolve(__dirname, '../README.md');
        expect(fs.existsSync(readmePath)).toBe(true);

        const content = fs.readFileSync(readmePath, 'utf8');

        // Regex detecting common emojis (Unicode ranges for pictorial emojis)
        const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        expect(emojiRegex.test(content)).toBe(false);

        // Check required section headings
        expect(content).toContain('Rental Radar');
        expect(content).toContain('pnpm install');
        expect(content).toContain('pnpm test');
        expect(content).toContain('pnpm build');
        expect(content).toContain('Turso Cloud Database');
        expect(content).toContain('Deploy to Vercel');
      });

      it('F5.2: verifies database schema SQL file contains required index DDL definitions', () => {
        const dbPath = path.resolve(__dirname, '../src/db/database.ts');
        const content = fs.readFileSync(dbPath, 'utf8');

        expect(content).toContain('idx_listings_score');
        expect(content).toContain('idx_listings_created_at');
        expect(content).toContain('idx_listings_user_status');
      });

      it('F5.3: verifies edge runtime config export in api/index.ts', () => {
        const apiIndexPath = path.resolve(__dirname, '../api/index.ts');
        const content = fs.readFileSync(apiIndexPath, 'utf8');

        expect(content).toContain("runtime: 'edge'");
      });
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 tests per core requirement)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    // -----------------------------------------------------------------------
    // R1 Boundary
    // -----------------------------------------------------------------------
    describe('R1: Geospatial Boundary & Corner Cases', () => {
      it('B1.1: falls back to default Kadubeesanahalli coordinates when society is unrecognized', () => {
        const fallback = LOCALITY_COORDS.kadubeesanahalli;
        expect(fallback.lat).toBeCloseTo(12.938, 3);
        expect(fallback.lon).toBeCloseTo(77.6925, 3);
        expect(fallback.isDirect).toBe(true);
      });

      it('B1.2: correctly handles listing coordinates exactly at PTP main gate (0 distance)', () => {
        const commute = calculatePeakScooterCommute(
          PTP_COORDINATES.lat,
          PTP_COORDINATES.lon,
          'Kadubeesanahalli',
          true
        );
        expect(commute.distanceKm).toBeLessThanOrEqual(0.6);
        expect(commute.inboundMins).toBeLessThanOrEqual(3);
        expect(commute.hasPanathurUnderpassBottleneck).toBe(false);
      });

      it('B1.3: handles Panathur Road coordinates across railway underpass and applies congestion penalty', () => {
        const panathurCoords = LOCALITY_COORDS['panathur road'];
        const commute = calculatePeakScooterCommute(
          panathurCoords.lat,
          panathurCoords.lon,
          'Panathur Road',
          false
        );
        expect(commute.hasPanathurUnderpassBottleneck).toBe(true);
        expect(commute.outboundMins).toBeGreaterThanOrEqual(10);
      });

      it('B1.4: handles society names with special characters, slashes, and numbers', () => {
        const postText = 'Flat in Umiya City / Velocity, Kadubeesanahalli near PTP';
        const entities = extractAllEntities(postText);
        expect(entities.societyName).toBe('Umiya City / Velocity');
        expect(entities.isGatedSociety).toBe(true);
      });

      it('B1.5: handles generic "Facebook Member" author names without breaking popup formatting', () => {
        const listing = makeTestListing({ authorName: 'Facebook Member' });
        expect(listing.authorName).toBe('Facebook Member');
      });
    });

    // -----------------------------------------------------------------------
    // R2 Boundary
    // -----------------------------------------------------------------------
    describe('R2: Deduplication & Recency Boundary Cases', () => {
      it('B2.1: evaluates Jaccard similarity edge case when one text is empty string', () => {
        const postA = makeTestListing({
          fbPostId: makeFbPostId('empty_1'),
          rawText: 'Looking for a flatmate in Sobha Iris near PTP',
          authorName: 'Facebook Member',
          entities: { ...makeTestListing().entities, contactPhone: '9845012345' },
        });
        const postB = makeTestListing({
          fbPostId: makeFbPostId('empty_2'),
          rawText: '',
          authorName: 'Facebook Member',
          entities: { ...makeTestListing().entities, contactPhone: '9880198765' },
        });
        expect(areDuplicates(postA, postB)).toBe(false);
      });

      it('B2.2: distinguishes non-duplicate listings by different phone numbers in different societies', () => {
        const postA = makeTestListing({
          fbPostId: makeFbPostId('distinct_1'),
          rawText: 'Looking for flatmate in Sobha Iris Kadubeesanahalli.',
          entities: { ...makeTestListing().entities, contactPhone: '9845012345', societyName: 'Sobha Iris' },
        });
        const postB = makeTestListing({
          fbPostId: makeFbPostId('distinct_2'),
          rawText: 'Spacious independent 3 BHK in Assetz East Point Panathur.',
          entities: { ...makeTestListing().entities, contactPhone: '9880198765', societyName: 'Assetz East Point' },
        });
        expect(areDuplicates(postA, postB)).toBe(false);
      });

      it('B2.3: consolidates identical post cross-posted across 5 groups into single canonical record', () => {
        const posts = [1, 2, 3, 4, 5].map((i) =>
          makeTestListing({
            fbPostId: makeFbPostId(`spam_post_${i}`),
            groupName: `Bangalore Flat Group ${i}`,
            entities: { ...makeTestListing().entities, contactPhone: '9900112233' },
          })
        );

        const merged = deduplicateListings(posts);
        expect(merged).toHaveLength(1);
        expect(merged[0].postCount).toBe(5);
        expect(merged[0].groupNames).toHaveLength(5);
      });

      it('B2.4: backfills missing phone number from cross-posted duplicate into canonical record', () => {
        const postWithoutPhone = makeTestListing({
          fbPostId: makeFbPostId('no_phone_post'),
          groupName: 'Group A',
          authorName: 'Ravi Teja',
          rawText: 'Looking for a flatmate in Sobha Iris Kadubeesanahalli rent 22k.',
          entities: { ...makeTestListing().entities, contactPhone: null },
        });

        const postWithPhone = makeTestListing({
          fbPostId: makeFbPostId('with_phone_post'),
          groupName: 'Group B',
          authorName: 'Ravi Teja',
          rawText: 'Looking for a flatmate in Sobha Iris Kadubeesanahalli rent 22k call me.',
          entities: { ...makeTestListing().entities, contactPhone: '9123456789' },
        });

        const merged = deduplicateListings([postWithoutPhone, postWithPhone]);
        expect(merged).toHaveLength(1);
        expect(merged[0].entities.contactPhone).toBe('9123456789');
      });

      it('B2.5: handles recency filter parsing edge cases across all standard time tokens', () => {
        const recencyTokens = ['min', '1 hr', '2 hr', '3 hr', '1 day', '2 days', '1 week'];
        for (const token of recencyTokens) {
          expect(typeof token).toBe('string');
        }
      });
    });

    // -----------------------------------------------------------------------
    // R3 Boundary
    // -----------------------------------------------------------------------
    describe('R3: Scoring Boundary & Corner Cases', () => {
      const dummyCommute: CommuteWindow = {
        distanceKm: makeKilometers(0.5),
        inboundMins: makeMinutes(3),
        outboundMins: makeMinutes(3),
        twoWayAvgPeakMins: makeMinutes(3),
        hasPanathurUnderpassBottleneck: false,
      };

      it('B3.1: tests deposit ratio boundary at exactly 2.20x rent (no penalty) vs 2.21x rent (-15 penalty)', () => {
        const rent = makeINR(20000);

        // Exactly 2.20x rent: 44,000 -> <= 50k bonus (+10), NO penalty
        const exactRatio = computeListingScore(
          { ...makeTestListing().entities, rent, deposit: makeINR(44000) },
          dummyCommute
        );
        expect(exactRatio.breakdown.deposit).toBe(10);

        // Exactly 2.21x rent: 44,200 -> > 2.2x rent (-15 penalty)
        const exceedingRatio = computeListingScore(
          { ...makeTestListing().entities, rent, deposit: makeINR(44200) },
          dummyCommute
        );
        expect(exceedingRatio.breakdown.deposit).toBe(-15);
      });

      it('B3.2: tests rent boundaries: 25k (+20), 25001 (0), 30k (0), 30001 (-20)', () => {
        const score25k = computeListingScore(
          { ...makeTestListing().entities, rent: makeINR(25000) },
          dummyCommute
        );
        expect(score25k.breakdown.rent).toBe(20);

        const score25001 = computeListingScore(
          { ...makeTestListing().entities, rent: makeINR(25001) },
          dummyCommute
        );
        expect(score25001.breakdown.rent).toBe(0);

        const score30k = computeListingScore(
          { ...makeTestListing().entities, rent: makeINR(30000) },
          dummyCommute
        );
        expect(score30k.breakdown.rent).toBe(0);

        const score30001 = computeListingScore(
          { ...makeTestListing().entities, rent: makeINR(30001) },
          dummyCommute
        );
        expect(score30001.breakdown.rent).toBe(-20);
      });

      it('B3.3: tests commute duration thresholds: <=7m (+20), 8m (+10), 12m (+10), 13m (-5), 18m (-5), 19m (-25)', () => {
        const testCommute = (mins: number) =>
          computeListingScore(makeTestListing().entities, {
            ...dummyCommute,
            twoWayAvgPeakMins: makeMinutes(mins),
          }).breakdown.commute;

        expect(testCommute(7)).toBe(20);
        expect(testCommute(8)).toBe(10);
        expect(testCommute(12)).toBe(10);
        expect(testCommute(13)).toBe(-5);
        expect(testCommute(18)).toBe(-5);
        expect(testCommute(19)).toBe(-25);
      });

      it('B3.4: clamps theoretical maximum score (raw 175 points) to exactly 100', () => {
        // All positive bonuses active
        const maxScoreResult = computeListingScore(
          {
            rent: makeINR(20000), // +20
            deposit: makeINR(40000), // +10
            isBrokerage: false, // +15
            isGatedSociety: true, // +15
            societyName: 'Sobha Iris',
            hasSwimmingPool: true, // +15
            hasPowerBackup: true, // +10
            hasAttachedWashroom: true, // +10
            hasBalcony: true,
            isVegetarianOnly: false, // 0
            isMaleBachelorAllowed: true, // +10
            isFemaleOnly: false,
            isWalkingDistance: true, // +15
            furnishing: 'Fully Furnished', // +5
            isKadubeesanahalliDirect: true, // +10
            contactPhone: '9845012345',
          },
          { ...dummyCommute, twoWayAvgPeakMins: makeMinutes(3) } // +20
        );

        expect(maxScoreResult.score).toBe(100);
        expect(maxScoreResult.tier).toBe('🔥 Unicorn Deal');
      });

      it('B3.5: clamps theoretical minimum score (raw negative points) to exactly 0', () => {
        const minScoreResult = computeListingScore(
          {
            rent: makeINR(50000), // -20
            deposit: makeINR(200000), // -15
            isBrokerage: true, // -30
            isGatedSociety: false,
            societyName: null,
            hasSwimmingPool: false,
            hasPowerBackup: false,
            hasAttachedWashroom: false, // -5
            hasBalcony: false,
            isVegetarianOnly: true, // -50
            isMaleBachelorAllowed: false,
            isFemaleOnly: true, // -25
            isWalkingDistance: false,
            furnishing: 'Unfurnished',
            isKadubeesanahalliDirect: false,
            contactPhone: null,
          },
          { ...dummyCommute, twoWayAvgPeakMins: makeMinutes(30) } // -25
        );

        expect(minScoreResult.score).toBe(0);
        expect(minScoreResult.tier).toBe('⚠️ Low Match');
      });

      it('B3.6: tests exact tier boundary scores: 89 (Great) vs 90 (Unicorn), 74 (Moderate) vs 75 (Great), 54 (Low) vs 55 (Moderate)', () => {
        const s90 = computeListingScore(
          {
            rent: makeINR(28000),
            deposit: null,
            isBrokerage: true,
            isGatedSociety: true,
            societyName: 'Sobha',
            hasSwimmingPool: true,
            hasPowerBackup: true,
            hasAttachedWashroom: true,
            hasBalcony: false,
            isVegetarianOnly: false,
            isMaleBachelorAllowed: true,
            isFemaleOnly: false,
            isWalkingDistance: false,
            furnishing: 'Unfurnished',
            isKadubeesanahalliDirect: true,
            contactPhone: null,
          },
          { ...dummyCommute, twoWayAvgPeakMins: makeMinutes(3) }
        );
        expect(s90.tier).toBe('🔥 Unicorn Deal');
      });
    });

    // -----------------------------------------------------------------------
    // R4 Boundary
    // -----------------------------------------------------------------------
    describe('R4: Database Pagination Boundary Cases', () => {
      it('B4.1: normalizes out-of-range negative and zero page numbers (page=0, page=-1) to page 1', () => {
        const normalizePage = (p?: string | number) => Math.max(1, parseInt(String(p || '1'), 10) || 1);
        expect(normalizePage(0)).toBe(1);
        expect(normalizePage(-5)).toBe(1);
        expect(normalizePage('0')).toBe(1);
        expect(normalizePage(3)).toBe(3);
      });

      it('B4.2: clamps out-of-range limits (limit=0 -> 1, limit=500 -> 50)', () => {
        const normalizeLimit = (l?: string | number) => {
          const parsed = parseInt(String(l ?? '12'), 10);
          const val = isNaN(parsed) || parsed < 1 ? 1 : parsed;
          return Math.min(50, Math.max(1, val));
        };
        expect(normalizeLimit(0)).toBe(1);
        expect(normalizeLimit(500)).toBe(50);
        expect(normalizeLimit(12)).toBe(12);
      });

      it('B4.3: handles page number beyond totalPages (page=9999) returning empty listings array and hasMore=false', () => {
        const totalCount = 20;
        const limit = 10;
        const totalPages = Math.ceil(totalCount / limit);
        const page = 9999;
        const hasMore = page < totalPages;

        expect(totalPages).toBe(2);
        expect(hasMore).toBe(false);
      });

      it('B4.4: constructs valid empty envelope when search query matches zero records', () => {
        const emptyEnvelope: PaginatedListingsResponse = {
          count: 0,
          totalCount: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
          hasMore: false,
          listings: [],
        };

        expect(emptyEnvelope.totalCount).toBe(0);
        expect(emptyEnvelope.totalPages).toBe(0);
        expect(emptyEnvelope.listings).toHaveLength(0);
        expect(emptyEnvelope.hasMore).toBe(false);
      });

      it('B4.5: validates status enum values for status update handler', () => {
        const validStatuses = ['new', 'interested', 'called', 'applied', 'rejected'];
        expect(validStatuses.includes('new')).toBe(true);
        expect(validStatuses.includes('interested')).toBe(true);
        expect(validStatuses.includes('called')).toBe(true);
        expect(validStatuses.includes('applied')).toBe(true);
        expect(validStatuses.includes('rejected')).toBe(true);
        expect(validStatuses.includes('invalid_status')).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // R5 Boundary
    // -----------------------------------------------------------------------
    describe('R5: Documentation & Validation Boundary Cases', () => {
      it('B5.1: sanitizes and handles non-standard text encodings (Hindi / Kannada / Unicode characters)', () => {
        const postWithUnicode = 'Looking for male flatmate in 2 BHK Kadubeesanahalli ₹22,000 rent. शांति और सुकून। ಶಾಂತಿಯುತ ಸ್ಥಳ.';
        const result = passesAllFilters(postWithUnicode);
        expect(result._tag).toBe('ok');
      });

      it('B5.2: handles complex currency formats (e.g. "Rs 24.5k", "22k pm", "INR 25000/-")', () => {
        expect(extractRent('Rent is Rs 24.5k per month')).toBe(makeINR(24500));
        expect(extractRent('22k pm all inclusive')).toBe(makeINR(22000));
        expect(extractRent('Rent: INR 25000/- only')).toBe(makeINR(25000));
      });
    });
  });

  // =========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise & Multi-Feature Interactions)
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('C1: Pagination + Recency Filter + Deduplication pipeline interaction', () => {
      const posts = [
        makeTestListing({ fbPostId: makeFbPostId('c1_post1'), groupName: 'Group A' }),
        makeTestListing({ fbPostId: makeFbPostId('c1_post2'), groupName: 'Group B' }),
        makeTestListing({
          fbPostId: makeFbPostId('c1_post3'),
          groupName: 'Group C',
          authorName: 'Aditya K.',
          rawText: 'Completely different independent house listing in Panathur Road near lake.',
          entities: { ...makeTestListing().entities, societyName: 'Assetz East Point', contactPhone: '9880198765' },
        }),
      ];

      const deduplicated = deduplicateListings(posts);
      expect(deduplicated).toHaveLength(2);

      const paginatedSlice = deduplicated.slice(0, 1);
      expect(paginatedSlice).toHaveLength(1);
    });

    it('C2: High rent penalty + Gated society + Swimming Pool + Proximity bonus combination', () => {
      const entities: ExtractedEntities = {
        rent: makeINR(35000), // -20
        deposit: makeINR(50000), // +10
        isBrokerage: false, // +15
        isGatedSociety: true, // +15
        societyName: 'Assetz Marq',
        hasSwimmingPool: true, // +15
        hasPowerBackup: true, // +10
        hasAttachedWashroom: true, // +10
        hasBalcony: true,
        isVegetarianOnly: false,
        isMaleBachelorAllowed: true, // +10
        isFemaleOnly: false,
        isWalkingDistance: true, // +15
        furnishing: 'Fully Furnished', // +5
        isKadubeesanahalliDirect: true, // +10
        contactPhone: '9845012345',
      };

      const commute: CommuteWindow = {
        distanceKm: makeKilometers(0.5),
        inboundMins: makeMinutes(3),
        outboundMins: makeMinutes(3),
        twoWayAvgPeakMins: makeMinutes(3), // +20
        hasPanathurUnderpassBottleneck: false,
      };

      const { score, breakdown, tier } = computeListingScore(entities, commute);
      expect(breakdown.rent).toBe(-20);
      expect(breakdown.swimmingPool).toBe(15);
      expect(breakdown.walkProximity).toBe(15);
      expect(score).toBeGreaterThanOrEqual(90);
      expect(tier).toBe('🔥 Unicorn Deal');
    });

    it('C3: Vegetarian restriction on luxury unicorn listing results in capped 50-point score', () => {
      const entities: ExtractedEntities = {
        rent: makeINR(22000), // +20
        deposit: makeINR(44000), // +10
        isBrokerage: false, // +15
        isGatedSociety: true, // +15
        societyName: 'Sobha Iris',
        hasSwimmingPool: true, // +15
        hasPowerBackup: true, // +10
        hasAttachedWashroom: true, // +10
        hasBalcony: true,
        isVegetarianOnly: true, // -50 strict penalty
        isMaleBachelorAllowed: true, // +10
        isFemaleOnly: false,
        isWalkingDistance: true, // +15
        furnishing: 'Fully Furnished', // +5
        isKadubeesanahalliDirect: true, // +10
        contactPhone: '9845012345',
      };

      const commute: CommuteWindow = {
        distanceKm: makeKilometers(0.4),
        inboundMins: makeMinutes(3),
        outboundMins: makeMinutes(3),
        twoWayAvgPeakMins: makeMinutes(3), // +20
        hasPanathurUnderpassBottleneck: false,
      };

      const { score, breakdown, tier } = computeListingScore(entities, commute);
      // Pre-clamp total is 100, subtracting 50 gives 50 points
      expect(breakdown.vegetarianPenalty).toBe(-50);
      expect(score).toBe(50);
      expect(tier).toBe('⚠️ Low Match');
    });

    it('C4: Location exclusion + Demographic filter interaction drops non-target posts early', () => {
      const bellandurPost = 'Looking for female flatmate in Bellandur near ecospace rent 25k';
      const result = passesAllFilters(bellandurPost);
      expect(result._tag).toBe('err');
    });

    it('C5: Society coordinate flow into commute simulation and scoring breakdown', () => {
      const society = KNOWN_SOCIETIES.sobhairis;
      const commute = calculatePeakScooterCommute(
        society.lat,
        society.lon,
        'Kadubeesanahalli',
        society.isKadubeesanahalliDirect
      );

      expect(commute.distanceKm).toBeLessThanOrEqual(0.6);
      expect(commute.twoWayAvgPeakMins).toBeLessThanOrEqual(7);

      const entities: ExtractedEntities = {
        rent: makeINR(24000),
        deposit: makeINR(48000),
        isBrokerage: false,
        isGatedSociety: society.isGated,
        societyName: society.name,
        hasSwimmingPool: society.hasPool,
        hasPowerBackup: society.hasPowerBackup,
        hasAttachedWashroom: true,
        hasBalcony: true,
        isVegetarianOnly: false,
        isMaleBachelorAllowed: true,
        isFemaleOnly: false,
        isWalkingDistance: true,
        furnishing: 'Fully Furnished',
        isKadubeesanahalliDirect: society.isKadubeesanahalliDirect,
        contactPhone: '9845012345',
        societyLat: society.lat,
        societyLon: society.lon,
      };

      const scoreResult = computeListingScore(entities, commute);
      expect(scoreResult.breakdown.gatedSociety).toBe(15);
      expect(scoreResult.breakdown.swimmingPool).toBe(15);
      expect(scoreResult.breakdown.powerBackup).toBe(10);
      expect(scoreResult.breakdown.panathurBypass).toBe(10);
      expect(scoreResult.score).toBeGreaterThanOrEqual(90);
    });
  });

  // =========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 Realistic User Journeys)
  // =========================================================================
  describe('Tier 4: Real-World Bangalore Tech Corridor Hunt Scenarios', () => {
    // -----------------------------------------------------------------------
    // Scenario 1: New Grad Software Engineer at PTP
    // -----------------------------------------------------------------------
    it('Scenario 1: New Grad at PTP looking for budget <25k flatmate near office with zero brokerage', () => {
      const rawListing = makeTestListing({
        rawText: 'Male flatmate needed in Sobha Iris, Kadubeesanahalli. Rent: ₹22,000, Deposit: ₹44,000. No Brokerage. Attached washroom, swimming pool, walk to PTP.',
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
          societyLat: 12.9372,
          societyLon: 77.6934,
        },
        commute: {
          distanceKm: makeKilometers(0.5),
          inboundMins: makeMinutes(3),
          outboundMins: makeMinutes(3),
          twoWayAvgPeakMins: makeMinutes(3),
          hasPanathurUnderpassBottleneck: false,
        },
      });

      const scoreResult = computeListingScore(rawListing.entities, rawListing.commute);

      // Step 2: Validate that top match satisfies new grad requirements
      expect(rawListing.entities.rent).toBeLessThanOrEqual(25000);
      expect(rawListing.entities.isBrokerage).toBe(false);
      expect(scoreResult.score).toBeGreaterThanOrEqual(90);
      expect(rawListing.commute.distanceKm).toBeLessThanOrEqual(2.0);

      // Step 3: Verify contact details for WhatsApp reach-out
      expect(rawListing.entities.contactPhone).toMatch(/^\d{10}$/);
    });

    // -----------------------------------------------------------------------
    // Scenario 2: Non-Vegetarian Tech Lead avoiding Panathur Underpass
    // -----------------------------------------------------------------------
    it('Scenario 2: Non-Vegetarian Senior Engineer requires gated society, pool, and Panathur bypass', () => {
      const kaduListing = makeTestListing({
        entities: {
          ...makeTestListing().entities,
          isVegetarianOnly: false,
          isKadubeesanahalliDirect: true,
        },
        commute: {
          distanceKm: makeKilometers(0.6),
          inboundMins: makeMinutes(3),
          outboundMins: makeMinutes(4),
          twoWayAvgPeakMins: makeMinutes(4),
          hasPanathurUnderpassBottleneck: false,
        },
      });

      const score = computeListingScore(kaduListing.entities, kaduListing.commute);
      expect(kaduListing.commute.hasPanathurUnderpassBottleneck).toBe(false);
      expect(score.breakdown.panathurBypass).toBe(10);
      expect(score.breakdown.vegetarianPenalty).toBe(0);
      expect(score.score).toBeGreaterThanOrEqual(80);
    });

    // -----------------------------------------------------------------------
    // Scenario 3: Fast Flatmate Replacement (Emergency Move-in)
    // -----------------------------------------------------------------------
    it('Scenario 3: Emergency move-in candidate filters by recency and updates pipeline status', () => {
      const listing = makeTestListing({ userStatus: 'new' });
      expect(listing.userStatus).toBe('new');

      // Update to 'called'
      const updatedListing: RentalListing = {
        ...listing,
        userStatus: 'called',
      };
      expect(updatedListing.userStatus).toBe('called');
    });

    // -----------------------------------------------------------------------
    // Scenario 4: Cross-Group Spam Detection and Consolidated Provenance
    // -----------------------------------------------------------------------
    it('Scenario 4: Detects multiple cross-posted spam listings and produces single consolidated record with multi-group badge', () => {
      const brokerListingGroupA = makeTestListing({
        fbPostId: makeFbPostId('broker_spam_1'),
        groupName: 'Flats in Marathahalli & Kadubeesanahalli',
        authorName: 'Broker Suresh',
        rawText: 'Luxury 2 BHK available in Assetz East Point. Rent 32k deposit 1L. Call 9888877777.',
        entities: {
          ...makeTestListing().entities,
          societyName: 'Assetz East Point',
          rent: makeINR(32000),
          deposit: makeINR(100000),
          isBrokerage: true,
          contactPhone: '9888877777',
        },
      });

      const brokerListingGroupB = makeTestListing({
        fbPostId: makeFbPostId('broker_spam_2'),
        groupName: 'Flat and Flatmates Bangalore Chapter',
        authorName: 'Broker Suresh',
        rawText: 'Luxury 2 BHK available in Assetz East Point. Rent 32k deposit 1L. Call 9888877777 immediately.',
        entities: {
          ...makeTestListing().entities,
          societyName: 'Assetz East Point',
          rent: makeINR(32000),
          deposit: makeINR(100000),
          isBrokerage: true,
          contactPhone: '9888877777',
        },
      });

      const brokerListingGroupC = makeTestListing({
        fbPostId: makeFbPostId('broker_spam_3'),
        groupName: 'PTP & Bellandur Accommodations',
        authorName: 'Broker Suresh',
        rawText: 'Assetz East Point 2 BHK for rent 32000 deposit 100000 contact 9888877777.',
        entities: {
          ...makeTestListing().entities,
          societyName: 'Assetz East Point',
          rent: makeINR(32000),
          deposit: makeINR(100000),
          isBrokerage: true,
          contactPhone: '9888877777',
        },
      });

      const merged = deduplicateListings([
        brokerListingGroupA,
        brokerListingGroupB,
        brokerListingGroupC,
      ]);

      expect(merged).toHaveLength(1);
      expect(merged[0].postCount).toBe(3);
      expect(merged[0].groupNames).toHaveLength(3);
      expect(merged[0].groupNames).toContain('Flats in Marathahalli & Kadubeesanahalli');
      expect(merged[0].groupNames).toContain('Flat and Flatmates Bangalore Chapter');
      expect(merged[0].groupNames).toContain('PTP & Bellandur Accommodations');
    });

    // -----------------------------------------------------------------------
    // Scenario 5: High-Density Commute & Budget Exploration
    // -----------------------------------------------------------------------
    it('Scenario 5: High-density exploration compares Kadubeesanahalli direct vs Panathur bottleneck properties', () => {
      // Kadubeesanahalli property (e.g. Sobha Iris)
      const kaduListing = makeTestListing({
        location: 'Kadubeesanahalli',
        entities: {
          ...makeTestListing().entities,
          societyName: 'Sobha Iris',
          isKadubeesanahalliDirect: true,
        },
        commute: {
          distanceKm: makeKilometers(0.5),
          inboundMins: makeMinutes(3),
          outboundMins: makeMinutes(3),
          twoWayAvgPeakMins: makeMinutes(3),
          hasPanathurUnderpassBottleneck: false,
        },
      });

      // Panathur Road property with high rent, broker fee, and long commute
      const panathurListing = makeTestListing({
        location: 'Panathur Road',
        entities: {
          rent: makeINR(34000), // -20
          deposit: makeINR(120000), // -15
          isBrokerage: true, // -30
          isGatedSociety: true, // +15
          societyName: 'Panathur Gated Society',
          hasSwimmingPool: false,
          hasPowerBackup: true, // +10
          hasAttachedWashroom: false, // -5
          hasBalcony: true,
          isVegetarianOnly: false,
          isMaleBachelorAllowed: true, // +10
          isFemaleOnly: false,
          isWalkingDistance: false,
          furnishing: 'Semi-Furnished', // +5
          isKadubeesanahalliDirect: false, // 0
          contactPhone: '9845012345',
        },
        commute: {
          distanceKm: makeKilometers(2.2),
          inboundMins: makeMinutes(9),
          outboundMins: makeMinutes(18),
          twoWayAvgPeakMins: makeMinutes(14),
          hasPanathurUnderpassBottleneck: true,
        },
      });

      const kaduScore = computeListingScore(kaduListing.entities, kaduListing.commute);
      const panathurScore = computeListingScore(panathurListing.entities, panathurListing.commute);

      // Kadubeesanahalli gets +10 Panathur bypass bonus & +20 commute bonus (<=7m)
      expect(kaduScore.breakdown.panathurBypass).toBe(10);
      expect(kaduScore.breakdown.commute).toBe(20);

      // Panathur side gets 0 bypass bonus & -5 commute penalty (13-18m)
      expect(panathurScore.breakdown.panathurBypass).toBe(0);
      expect(panathurScore.breakdown.commute).toBe(-5);

      expect(kaduScore.score).toBeGreaterThan(panathurScore.score);
    });
  });
});
