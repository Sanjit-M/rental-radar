import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  computeCardTilt,
  projectVelocity,
  computeDepositMultiple,
  getDepositSanityStatus,
  computeAlgorithmicScore,
  formatINR,
} from '../src/client/prototype/gestureMath';
import { PROTOTYPE_LISTINGS } from '../src/client/prototype/mockData';
import { PROTOTYPE_VARIANTS } from '../src/client/prototype/ProtoPicker';

describe('Mobile Platform Prototype Suite Tests', () => {
  // ─── 1. Gesture Physics & Emil Kowalski Curves ───────────────────────────
  describe('1. Emil Kowalski Gesture Physics & Math', () => {
    it('computes rotational tilt correctly based on horizontal drag offset', () => {
      expect(computeCardTilt(0)).toBe(0);
      expect(computeCardTilt(100)).toBe(5); // 100 * 0.05 = 5 deg
      expect(computeCardTilt(-100)).toBe(-5);
      expect(computeCardTilt(200)).toBe(10);
    });

    it('projects velocity handoff using momentum damping decay formula', () => {
      // project(vy) = (vy * 1000) * 0.998 / (1 - 0.998)
      // 0.998 / 0.002 = 499
      const vy = 0.5; // 0.5 px/ms
      const projected = projectVelocity(vy);
      expect(projected).toBeCloseTo(249500, -1);

      expect(projectVelocity(0)).toBe(0);
      expect(projectVelocity(-0.2)).toBeCloseTo(-99800, -1);
    });

    it('formats INR numbers cleanly with Indian numbering grouping', () => {
      expect(formatINR(24000)).toBe('₹24,000');
      expect(formatINR(150000)).toBe('₹1,50,000');
      expect(formatINR(null)).toBe('₹—');
      expect(formatINR(undefined)).toBe('₹—');
    });
  });

  // ─── 2. Deposit Sanity Gauge Math ─────────────────────────────────────────
  describe('2. Deposit Sanity Gauge Logic', () => {
    it('computes deposit-to-rent multiple correctly', () => {
      expect(computeDepositMultiple(48000, 24000)).toBe(2.0);
      expect(computeDepositMultiple(70000, 28000)).toBe(2.5);
      expect(computeDepositMultiple(300000, 30000)).toBe(10.0);
      expect(computeDepositMultiple(null, 25000)).toBeNull();
      expect(computeDepositMultiple(50000, null)).toBeNull();
      expect(computeDepositMultiple(50000, 0)).toBeNull();
    });

    it('categorizes deposit into normal, moderate, and extortion tiers', () => {
      const normal = getDepositSanityStatus(2.0);
      expect(normal.tier).toBe('normal');
      expect(normal.label).toContain('Fair Deposit');

      const normalLimit = getDepositSanityStatus(3.0);
      expect(normalLimit.tier).toBe('normal');

      const moderate = getDepositSanityStatus(4.0);
      expect(moderate.tier).toBe('moderate');
      expect(moderate.label).toContain('Elevated Deposit');

      const extortion = getDepositSanityStatus(10.0);
      expect(extortion.tier).toBe('extortion');
      expect(extortion.label).toContain('Extortion Warning');

      const missing = getDepositSanityStatus(null);
      expect(missing.tier).toBe('normal');
      expect(missing.label).toContain('Unspecified');
    });
  });

  // ─── 3. 100-Point Algorithmic Score Breakdown ─────────────────────────────
  describe('3. 100-Point Algorithmic Score Breakdown', () => {
    it('computes scoring dimensions for benchmark listings', () => {
      const listing = PROTOTYPE_LISTINGS[0];
      expect(listing).toBeDefined();
      if (!listing) return;

      const score = computeAlgorithmicScore(listing);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);

      expect(score.rentScore).toBeGreaterThanOrEqual(0);
      expect(score.rentScore).toBeLessThanOrEqual(35);

      expect(score.commuteScore).toBeGreaterThanOrEqual(0);
      expect(score.commuteScore).toBeLessThanOrEqual(25);

      expect(score.depositScore).toBeGreaterThanOrEqual(0);
      expect(score.depositScore).toBeLessThanOrEqual(15);

      expect(score.societyScore).toBeGreaterThanOrEqual(0);
      expect(score.societyScore).toBeLessThanOrEqual(15);

      expect(score.trustScore).toBeGreaterThanOrEqual(0);
      expect(score.trustScore).toBeLessThanOrEqual(10);

      expect(['A+', 'A', 'B', 'C']).toContain(score.grade);
    });

    it('rewards low deposit multiples and penalizes high deposits', () => {
      const baseListing = PROTOTYPE_LISTINGS[0]!;
      const fairListing = {
        ...baseListing,
        entities: {
          ...baseListing.entities,
          deposit: 48000 as any,
          rent: 24000 as any,
        },
      };
      const extortionListing = {
        ...baseListing,
        entities: {
          ...baseListing.entities,
          deposit: 240000 as any, // 10x
          rent: 24000 as any,
        },
      };

      const fairScore = computeAlgorithmicScore(fairListing);
      const extortionScore = computeAlgorithmicScore(extortionListing);

      expect(fairScore.depositScore).toBeGreaterThan(extortionScore.depositScore);
    });
  });

  // ─── 4. Tab 1: Explore Feed & Quick Filter Engine ────────────────────────
  describe('4. Tab 1: Explore Feed & Filter Capabilities', () => {
    it('verifies MobilePlatformPrototype.tsx implements Explore features', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobilePlatformPrototype.tsx');
      const content = fs.readFileSync(file, 'utf8');

      // Top commute scrubber
      expect(content).toContain('maxCommuteScrubber');
      expect(content).toContain('Commute to PTP');

      // Live rent frequency histogram
      expect(content).toContain('Live Rent Histogram');
      expect(content).toContain('histogramBuckets');

      // Quick filter chips: Cauvery Only, Direct Landlord, Gated, 2BHK, < 35k
      expect(content).toContain('filterCauveryOnly');
      expect(content).toContain('filterDirectLandlord');
      expect(content).toContain('filterGatedSociety');
      expect(content).toContain('filter2BHK');
      expect(content).toContain('filterUnder35k');

      // Dual view mode toggle: Gesture swipe deck vs continuous scroll feed
      expect(content).toContain('exploreViewMode');
      expect(content).toContain('deck');
      expect(content).toContain('feed');

      // Pinned thumb actions: WhatsApp, Call, FB Post, Inspect
      expect(content).toContain('https://wa.me/91');
      expect(content).toContain('tel:');
      expect(content).toContain('Inspect');
    });
  });

  // ─── 5. Tab 2: Corridors & Spatial Transit Matrix ─────────────────────────
  describe('5. Tab 2: Corridors & Spatial Transit Matrix', () => {
    it('verifies East Bengaluru corridors and Panathur Underpass Choke Point', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobilePlatformPrototype.tsx');
      const content = fs.readFileSync(file, 'utf8');

      // 6 East Bengaluru corridors
      expect(content).toContain('Kadubeesanahalli');
      expect(content).toContain('Bellandur');
      expect(content).toContain('Marathahalli');
      expect(content).toContain('Panathur');
      expect(content).toContain('Varthur');
      expect(content).toContain('Whitefield');

      // Panathur S-Cross Underpass choke point live alert
      expect(content).toContain('Panathur S-Cross Choke Point Alert');
      expect(content).toContain('Railway Underpass');

      // Scooter travel isochrones (10m, 20m, 30m, 40m)
      expect(content).toContain('PTP Scooter Travel Isochrones');
      expect(content).toContain('activeIsochroneRing');

      // Corridor water and rent scorecards
      expect(content).toContain('Corridor Water & Rent Scorecards');
      expect(content).toContain('cauveryPct');
      expect(content).toContain('avgRent');
    });
  });

  // ─── 6. Tab 3: Ledger & 10-Point Authenticity Audit ───────────────────────
  describe('6. Tab 3: Ledger & 10-Point Authenticity Audit', () => {
    it('verifies 10-point authenticity & inspection checklist items', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobilePlatformPrototype.tsx');
      const content = fs.readFileSync(file, 'utf8');

      // 10-point authenticity items
      expect(content).toContain('FB Profile Credibility');
      expect(content).toContain('Deposit Sanity Gauge');
      expect(content).toContain('Cauvery Water Line Audit');
      expect(content).toContain('Maintenance Fee Transparency');
      expect(content).toContain('BESCOM Power Backup');
      expect(content).toContain('Food / Dietary Restriction Autonomy');
      expect(content).toContain('Bachelor Friendliness');
      expect(content).toContain('Brokerage Transparency');
      expect(content).toContain('Lock-in Period Sanity');
      expect(content).toContain('Walking / Commute Distance Guarantee');

      // Uncropped Facebook post preview proof container
      expect(content).toContain('Uncropped Facebook Post Proof');
    });
  });

  // ─── 7. Tab 4: Pipeline Workflow & Counter-Tracker ───────────────────────
  describe('7. Tab 4: Pipeline Workflow & Negotiations', () => {
    it('verifies 4-stage pipeline, private notes, and WhatsApp shortlist export', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobilePlatformPrototype.tsx');
      const content = fs.readFileSync(file, 'utf8');

      // 4-stage pipeline
      expect(content).toContain('1. Shortlisted');
      expect(content).toContain('2. Contacted Landlord');
      expect(content).toContain('3. Visit Scheduled');
      expect(content).toContain('4. Offer Sent');

      // Private inspection notes
      expect(content).toContain('Private Inspection Notes');
      expect(content).toContain('inspectionNotes');

      // Rent offer counter-tracker
      expect(content).toContain('Rent Offer Tracker');
      expect(content).toContain('rentOffers');

      // WhatsApp shortlist export
      expect(content).toContain('Export WhatsApp');
      expect(content).toContain('handleExportShortlistWhatsApp');
      expect(content).toContain('https://wa.me/?text=');
    });
  });

  // ─── 8. Tab 5: Ops Telemetry & Database Status ───────────────────────────
  describe('8. Tab 5: Ops Telemetry & Database Status', () => {
    it('verifies scraper telemetry, Turso status, and passcode actions', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobilePlatformPrototype.tsx');
      const content = fs.readFileSync(file, 'utf8');

      // Facebook group scraper telemetry
      expect(content).toContain('Facebook Scraper Telemetry');
      expect(content).toContain('SCRAPER_GROUPS');
      expect(content).toContain('Flat and Flatmates Bangalore');

      // Turso cloud database sync status
      expect(content).toContain('Turso Cloud LibSQL');
      expect(content).toContain('sin / bom');

      // Passcode gate & actions
      expect(content).toContain('Passcode-Protected Scrape Engine');
      expect(content).toContain('Trigger Live Scrape');
      expect(content).toContain('Seed Test Batch');
    });
  });

  // ─── 9. Mobile Spotlight Search ───────────────────────────────────────────
  describe('9. Mobile Spotlight Search Sheet', () => {
    it('verifies MobileSpotlight.tsx handles instant society and locality querying', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobileSpotlight.tsx');
      const content = fs.readFileSync(file, 'utf8');

      expect(content).toContain('Spotlight Search');
      expect(content).toContain('Sobha Dream Acres');
      expect(content).toContain('Prestige Tech Vista');
      expect(content).toContain('Kadubeesanahalli');
      expect(content).toContain('Cauvery Water');
      expect(content).toContain('Zero Brokerage');
    });
  });

  // ─── 10. Two-Stage Vaul Bottom Sheet ──────────────────────────────────────
  describe('10. Two-Stage Vaul Inspection Bottom Sheet', () => {
    it('verifies half and full snap stages with tactile grab handle', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobilePlatformPrototype.tsx');
      const content = fs.readFileSync(file, 'utf8');

      // Snap stages
      expect(content).toContain('half');
      expect(content).toContain('full');
      expect(content).toContain('closed');

      // Sheet tabs
      expect(content).toContain('10-Point Ledger');
      expect(content).toContain('Score (100pt)');
      expect(content).toContain('FB Post Proof');

      // Height styling
      expect(content).toContain("sheetStage === 'half' ? '54vh' : '88vh'");
    });
  });

  // ─── 11. Harness & Default Variant Integration ───────────────────────────
  describe('11. Prototype Harness & Default Variant', () => {
    it('verifies ProtoPicker defaults to Unified Platform with 4 variants', () => {
      expect(PROTOTYPE_VARIANTS.length).toBe(4);
      expect(PROTOTYPE_VARIANTS[0]?.id).toBe('unified-platform');
      expect(PROTOTYPE_VARIANTS[0]?.label).toBe('Unified Platform');
    });

    it('verifies MobilePrototypeHarness supports iPhone 16 Pro and Full Surface views', () => {
      const file = path.resolve(__dirname, '../src/client/prototype/MobilePrototypeHarness.tsx');
      const content = fs.readFileSync(file, 'utf8');

      expect(content).toContain('iPhone 16 Pro');
      expect(content).toContain('Full Surface');
      expect(content).toContain('MobilePlatformPrototype');
      expect(content).toContain('unified-platform');
    });
  });
});
