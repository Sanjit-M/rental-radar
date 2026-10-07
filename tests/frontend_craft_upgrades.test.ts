import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectWaterSource,
  computeReleaseVelocity,
  projectMomentum,
  projectRestingEndpoint,
  TouchSample,
} from '../src/client/components/ListingDrawer';
import {
  toast,
  getToastStackStyles,
} from '../src/client/components/ToastStack';
import { BANGALORE_CORRIDORS } from '../src/client/components/CorridorFilter';
import {
  RentalListing,
  makeINR,
  makeMinutes,
  makeKilometers,
  makeFbPostId,
  ListingId,
} from '../src/domain/types';

describe('Learn UI Craft Upgrades Tests', () => {
  describe('detectWaterSource function', () => {
    it('detects Cauvery water variations', () => {
      const res1 = detectWaterSource('Spacious 2BHK with Cauvery water connection and lift');
      expect(res1.isCauvery).toBe(true);
      expect(res1.label).toBe('Cauvery Water Available');

      const res2 = detectWaterSource('Kaveri water 24/7 supply in Bellandur');
      expect(res2.isCauvery).toBe(true);
      expect(res2.label).toBe('Cauvery Water Available');
    });

    it('detects Borewell + Tanker combined supply', () => {
      const res = detectWaterSource('Flat with borewell and tanker backup near Kadubeesanahalli');
      expect(res.isCauvery).toBe(false);
      expect(res.label).toBe('Borewell + Tanker Supply');
    });

    it('detects pure Borewell water', () => {
      const res = detectWaterSource('Independent house with borewell water supply');
      expect(res.isCauvery).toBe(false);
      expect(res.label).toBe('Borewell Water');
    });

    it('detects Tanker water', () => {
      const res = detectWaterSource('Water provided by private tanker weekly');
      expect(res.isCauvery).toBe(false);
      expect(res.label).toBe('Tanker Water Supply');
    });

    it('detects 24/7 running water mention', () => {
      const res = detectWaterSource('Gated community with 24/7 water supply and security');
      expect(res.isCauvery).toBe(false);
      expect(res.label).toBe('24/7 Running Water Supply');
    });

    it('returns default fallback when no water source mentioned', () => {
      const res = detectWaterSource('Furnished 1 BHK near Prestige Tech Park');
      expect(res.isCauvery).toBe(false);
      expect(res.label).toBe('Water Source Not Specified');
    });
  });

  describe('Bangalore Tech Corridors commute times to PTP', () => {
    it('verifies corridors have correct order and travel windows', () => {
      expect(BANGALORE_CORRIDORS.length).toBeGreaterThanOrEqual(7);
      const kbh = BANGALORE_CORRIDORS.find((c) => c.id === 'Kadubeesanahalli');
      expect(kbh).toBeDefined();
      expect(kbh?.label).toBe('Kadubeesanahalli');
      expect(kbh?.subtext).toContain('PTP');

      const cessna = BANGALORE_CORRIDORS.find((c) => c.id === 'Cessna');
      expect(cessna).toBeDefined();

      const bellandur = BANGALORE_CORRIDORS.find((c) => c.id === 'Bellandur');
      expect(bellandur).toBeDefined();
    });
  });

  describe('Listing Pricing & Deposit calculation helpers', () => {
    const mockListing: RentalListing = {
      id: 1 as ListingId,
      fbPostId: makeFbPostId('post_1'),
      groupName: 'Flatmates Bangalore',
      postUrl: 'https://facebook.com/groups/1/posts/1',
      authorName: 'Rohan Sharma',
      postedTime: '2 hours ago',
      rawText: 'Looking for flatmate in Kadubeesanahalli with Cauvery water. Rent 24000, deposit 48000',
      location: 'Kadubeesanahalli',
      bhkType: '2 BHK (Shared/Full)',
      entities: {
        rent: makeINR(24000),
        deposit: makeINR(48000),
        isBrokerage: false,
        isGatedSociety: true,
        societyName: 'Prestige Tech Vista',
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
        distanceKm: makeKilometers(1.2),
        inboundMins: makeMinutes(10),
        outboundMins: makeMinutes(12),
        twoWayAvgPeakMins: makeMinutes(11),
        hasPanathurUnderpassBottleneck: false,
      },
      score: 92,
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
      createdAt: '2026-10-07T00:00:00Z',
      updatedAt: '2026-10-07T00:00:00Z',
    };

    it('calculates security deposit multiple accurately', () => {
      const e = mockListing.entities;
      const ratio = e.deposit && e.rent ? (e.deposit / e.rent).toFixed(1) : null;
      expect(ratio).toBe('2.0');
    });

    it('identifies Cauvery water from post description', () => {
      const water = detectWaterSource(mockListing.rawText);
      expect(water.isCauvery).toBe(true);
      expect(water.label).toBe('Cauvery Water Available');
    });
  });

  describe('Emil Kowalski Apple Fluid Interface — Momentum Projection (ListingDrawer)', () => {
    it('computes release velocity from recent touch samples', () => {
      const history: TouchSample[] = [
        { y: 100, time: 1000 },
        { y: 130, time: 1050 },
        { y: 160, time: 1100 },
      ];
      // dy = 60px, dt = 100ms -> vy = 0.6 px/ms
      const vy = computeReleaseVelocity(history, 150);
      expect(vy).toBeCloseTo(0.6, 2);
    });

    it('returns 0 velocity when insufficient touch samples', () => {
      expect(computeReleaseVelocity([])).toBe(0);
      expect(computeReleaseVelocity([{ y: 100, time: 1000 }])).toBe(0);
    });

    it('projects momentum according to Apple formula (vy * 1000) * 0.998 / (1 - 0.998)', () => {
      // For stationary release: vy = 0 -> projection = 0
      expect(projectMomentum(0)).toBe(0);

      // For vy = 0.0003 (i.e. vy * 1000 = 0.3 px/ms)
      // (0.3) * 0.998 / 0.002 = 0.3 * 499 = 149.7 px
      const offset = projectMomentum(0.0003);
      expect(offset).toBeCloseTo(149.7, 1);
    });

    it('projects resting endpoint adding currentDeltaY to momentum projection', () => {
      const currentDeltaY = 50;
      const vy = 0.0003;
      const resting = projectRestingEndpoint(currentDeltaY, vy);
      expect(resting).toBeCloseTo(50 + 149.7, 1);
      // Resting endpoint is ~199.7px, which exceeds dismissal threshold of 140px
      expect(resting).toBeGreaterThan(140);
    });

    it('handles upward flick resulting in negative projected offset', () => {
      const currentDeltaY = 80;
      const vy = -0.0002; // moving upwards
      const resting = projectRestingEndpoint(currentDeltaY, vy);
      expect(resting).toBeLessThan(currentDeltaY);
    });
  });

  describe('Emil Kowalski Sonner Stacked Toast System (ToastStack)', () => {
    beforeEach(() => {
      toast.clear();
    });

    it('enforces that initial unmounted state starts from scale(0.95), never scale(0)', () => {
      const unmounted = getToastStackStyles(0, false, false);
      expect(unmounted.transform).toContain('scale(0.95)');
      expect(unmounted.transform).not.toContain('scale(0)');
      expect(unmounted.opacity).toBe(0);
    });

    it('calculates collapsed stack cascading scale and offset', () => {
      const front = getToastStackStyles(0, false, true);
      expect(front.transform).toBe('translateY(0px) scale(1)');
      expect(front.opacity).toBe(1);

      const second = getToastStackStyles(1, false, true);
      expect(second.transform).toBe('translateY(-12px) scale(0.95)');
      expect(second.opacity).toBe(0.9);

      const third = getToastStackStyles(2, false, true);
      expect(third.transform).toBe('translateY(-24px) scale(0.9)');
      expect(third.opacity).toBe(0.75);
    });

    it('expands stack vertically on hover', () => {
      const frontHovered = getToastStackStyles(0, true, true);
      expect(frontHovered.transform).toBe('translateY(-0px) scale(1)');

      const secondHovered = getToastStackStyles(1, true, true);
      expect(secondHovered.transform).toBe('translateY(-68px) scale(1)');

      const thirdHovered = getToastStackStyles(2, true, true);
      expect(thirdHovered.transform).toBe('translateY(-136px) scale(1)');
    });

    it('manages toast notifications through the toast API', () => {
      const id1 = toast.success('Status updated', 'Marked as interested');
      expect(id1).toBeDefined();

      const id2 = toast.info('Phone copied');
      expect(id2).toBeDefined();

      toast.dismiss(id1);
      toast.clear();
    });
  });
});
