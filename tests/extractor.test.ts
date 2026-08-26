import { describe, it, expect } from 'vitest';
import {
  extractRent,
  extractDeposit,
  extractBrokerage,
  extractSocietyAndAmenities,
  extractFurnishing,
  extractPhone,
  extractAllEntities,
} from '../src/domain/parser/extractor';
import { makeINR } from '../src/domain/types';

describe('Entity Extractor Engine (Branded & Typed)', () => {
  it('extracts rent in multiple formats as branded INR', () => {
    expect(extractRent('Rent: ₹22,000 per month')).toBe(makeINR(22000));
    expect(extractRent('Rent is 25k including maintenance')).toBe(makeINR(25000));
    expect(extractRent('18.5k / month')).toBe(makeINR(18500));
    expect(extractRent('₹28000 rent')).toBe(makeINR(28000));
  });

  it('extracts security deposit correctly', () => {
    expect(extractDeposit('Security deposit: ₹50,000', makeINR(25000))).toBe(makeINR(50000));
    expect(extractDeposit('Advance - 45k', makeINR(20000))).toBe(makeINR(45000));
    expect(extractDeposit('Deposit: 2 months rent', makeINR(20000))).toBe(makeINR(40000));
  });

  it('differentiates No Brokerage vs Brokerage Applicable', () => {
    expect(extractBrokerage('No brokerage, direct from owner')).toBe(false);
    expect(extractBrokerage('Zero brokerage flatmate replacement')).toBe(false);
    expect(extractBrokerage('Flatmate needed in 3 BHK')).toBe(false);

    expect(extractBrokerage('Brokerage applicable: 15 days')).toBe(true);
    expect(extractBrokerage('Contact broker: 9876543210')).toBe(true);
  });

  it('extracts known society details and amenities', () => {
    const res = extractSocietyAndAmenities('Flat in Sobha Iris, Kadubeesanahalli with swimming pool');
    expect(res.isGatedSociety).toBe(true);
    expect(res.societyName).toBe('Sobha Iris');
    expect(res.hasSwimmingPool).toBe(true);
    expect(res.hasPowerBackup).toBe(true);
    expect(res.isKadubeesanahalliDirect).toBe(true);
  });

  it('extracts phone numbers cleanly', () => {
    expect(extractPhone('Contact me at +91 9845012345')).toBe('9845012345');
    expect(extractPhone('Call Vikram on 9880198765')).toBe('9880198765');
  });

  it('extracts full entity dictionary with branded types', () => {
    const post = `
      Male flatmate needed in Assetz East Point, Kadubeesanahalli.
      Rent: ₹24,000 | Deposit: ₹48,000
      No Brokerage. Fully furnished room with attached washroom & balcony.
      Swimming pool, 100% power backup available.
      Call 9845112233
    `;
    const entities = extractAllEntities(post);
    expect(entities.rent).toBe(makeINR(24000));
    expect(entities.deposit).toBe(makeINR(48000));
    expect(entities.isBrokerage).toBe(false);
    expect(entities.isGatedSociety).toBe(true);
    expect(entities.hasSwimmingPool).toBe(true);
    expect(entities.hasPowerBackup).toBe(true);
    expect(entities.hasAttachedWashroom).toBe(true);
    expect(entities.hasBalcony).toBe(true);
    expect(entities.furnishing).toBe('Fully Furnished');
    expect(entities.contactPhone).toBe('9845112233');
  });
});
