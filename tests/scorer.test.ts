import { describe, it, expect } from 'vitest';
import { computeListingScore } from '../src/domain/scorer/ratingEngine';
import { ExtractedEntities, CommuteWindow, makeINR, makeKilometers, makeMinutes } from '../src/domain/types';

describe('Rating & Scorer Engine (Branded Types & Pure Domain)', () => {
  it('awards Unicorn Deal (90+) for low rent, gated + pool, no brokerage, short peak commute', () => {
    const entities: ExtractedEntities = {
      rent: makeINR(22000),
      deposit: makeINR(44000),
      isBrokerage: false,
      isGatedSociety: true,
      societyName: 'Sobha Iris',
      hasSwimmingPool: true,
      hasPowerBackup: true,
      hasAttachedWashroom: true,
      hasBalcony: true,
      furnishing: 'Fully Furnished',
      isKadubeesanahalliDirect: true,
      contactPhone: '9845012345',
    };

    const commute: CommuteWindow = {
      distanceKm: makeKilometers(0.8),
      inboundMins: makeMinutes(3),
      outboundMins: makeMinutes(5),
      twoWayAvgPeakMins: makeMinutes(4),
      hasPanathurUnderpassBottleneck: false,
    };

    const { score, breakdown, tier } = computeListingScore(entities, commute);
    expect(score).toBeGreaterThanOrEqual(90);
    expect(tier).toBe('🔥 Unicorn Deal');
    expect(breakdown.rent).toBe(20);
    expect(breakdown.brokerage).toBe(15);
    expect(breakdown.gatedSociety).toBe(15);
    expect(breakdown.swimmingPool).toBe(15);
    expect(breakdown.commute).toBe(20);
  });

  it('penalizes high rent (>30k), broker fees, high deposit, and long commute', () => {
    const entities: ExtractedEntities = {
      rent: makeINR(38000),
      deposit: makeINR(150000),
      isBrokerage: true,
      isGatedSociety: false,
      societyName: null,
      hasSwimmingPool: false,
      hasPowerBackup: false,
      hasAttachedWashroom: false,
      hasBalcony: false,
      furnishing: 'Unfurnished',
      isKadubeesanahalliDirect: false,
      contactPhone: '9900112233',
    };

    const commute: CommuteWindow = {
      distanceKm: makeKilometers(4.2),
      inboundMins: makeMinutes(16),
      outboundMins: makeMinutes(24),
      twoWayAvgPeakMins: makeMinutes(20),
      hasPanathurUnderpassBottleneck: true,
    };

    const { score, breakdown, tier } = computeListingScore(entities, commute);
    expect(score).toBeLessThan(50);
    expect(tier).toBe('⚠️ Low Match');
    expect(breakdown.rent).toBe(-20);
    expect(breakdown.brokerage).toBe(-25);
    expect(breakdown.deposit).toBe(-10);
    expect(breakdown.commute).toBe(-25);
  });
});
