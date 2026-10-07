/**
 * Pure calculation and gesture physics functions for the Mobile Prototype Suite.
 * Adheres to Emil Kowalski physics standards and strict TypeScript typing.
 */

import { RentalListing } from '../../domain/types';

/**
 * Computes rotational tilt in degrees based on horizontal drag distance.
 * Emil Kowalski curve: deltaX * 0.05deg
 */
export function computeCardTilt(deltaX: number): number {
  return deltaX * 0.05;
}

/**
 * Projects velocity handoff using momentum damping decay formula:
 * project(vy) = (vy * 1000) * 0.998 / (1 - 0.998)
 */
export function projectVelocity(vy: number): number {
  const decay = 0.998;
  return ((vy * 1000) * decay) / (1 - decay);
}

/**
 * Computes security deposit to rent multiple (e.g. 2.0x, 10.0x).
 * Returns null if deposit or rent is missing or zero.
 */
export function computeDepositMultiple(
  deposit: number | null | undefined,
  rent: number | null | undefined
): number | null {
  if (!deposit || !rent || rent <= 0) return null;
  return Number((deposit / rent).toFixed(1));
}

export type DepositSanityTier = 'normal' | 'moderate' | 'extortion';

export interface DepositSanityInfo {
  readonly tier: DepositSanityTier;
  readonly label: string;
  readonly color: string;
  readonly warningText: string;
}

/**
 * Categorizes deposit multiple into sanity tiers:
 * - <= 3.0x: Normal & Fair (Bengaluru Model Tenancy Act recommendation)
 * - 3.1x - 5.0x: Moderate Lock-in
 * - > 5.0x: Extortionate (10-month trap warning)
 */
export function getDepositSanityStatus(multiple: number | null): DepositSanityInfo {
  if (multiple === null) {
    return {
      tier: 'normal',
      label: 'Deposit Unspecified',
      color: 'text-slate-400',
      warningText: 'Confirm deposit with landlord before visiting.',
    };
  }
  if (multiple <= 3.0) {
    return {
      tier: 'normal',
      label: `${multiple}x Fair Deposit`,
      color: 'text-emerald-400',
      warningText: 'Strictly within 2-3 months fair cap. Low lock-in risk.',
    };
  }
  if (multiple <= 5.0) {
    return {
      tier: 'moderate',
      label: `${multiple}x Elevated Deposit`,
      color: 'text-amber-400',
      warningText: 'Higher than normal deposit. Negotiate down during visit.',
    };
  }
  return {
    tier: 'extortion',
    label: `${multiple}x Extortion Warning`,
    color: 'text-rose-400',
    warningText: 'High capital lock-in risk. Beware of landlord deductions.',
  };
}

export interface AlgorithmicScoreSummary {
  readonly total: number;
  readonly rentScore: number;
  readonly commuteScore: number;
  readonly depositScore: number;
  readonly societyScore: number;
  readonly trustScore: number;
  readonly grade: string;
  readonly tierBadge: string;
}

/**
 * Computes 100-point algorithmic score breakdown for a listing:
 * - Rent Value (/35)
 * - Commute Distance & Peak Penalty (/25)
 * - Deposit Sanity (/15)
 * - Society & Amenities (/15)
 * - Verification & Trust (/10)
 */
export function computeAlgorithmicScore(listing: RentalListing): AlgorithmicScoreSummary {
  // Rent Score (/35)
  const rent = listing.entities.rent ?? 30000;
  let rentScore = 35;
  if (rent > 40000) {
    rentScore = Math.max(10, 35 - Math.round((rent - 40000) / 1000));
  } else if (rent > 30000) {
    rentScore = Math.max(20, 35 - Math.round(((rent - 30000) / 10000) * 10));
  }

  // Commute Score (/25)
  const mins = listing.commute.twoWayAvgPeakMins;
  let commuteScore = 25;
  if (mins > 30) {
    commuteScore = 8;
  } else if (mins > 20) {
    commuteScore = 14;
  } else if (mins > 12) {
    commuteScore = 20;
  }

  // Deposit Sanity (/15)
  const depositRatio = computeDepositMultiple(listing.entities.deposit, listing.entities.rent);
  let depositScore = 15;
  if (depositRatio === null) {
    depositScore = 10;
  } else if (depositRatio > 5.0) {
    depositScore = 3;
  } else if (depositRatio > 3.0) {
    depositScore = 8;
  }

  // Society & Amenities (/15)
  let societyScore = 5;
  if (listing.entities.isGatedSociety) societyScore += 4;
  if (listing.entities.hasPowerBackup) societyScore += 3;
  if (listing.entities.hasSwimmingPool) societyScore += 3;
  societyScore = Math.min(15, societyScore);

  // Verification & Trust (/10)
  let trustScore = 4;
  if (listing.entities.contactPhone) trustScore += 2;
  if (!listing.entities.isBrokerage) trustScore += 2;
  if (listing.rawText.toLowerCase().includes('cauvery') || listing.rawText.toLowerCase().includes('kaveri')) {
    trustScore += 2;
  }
  trustScore = Math.min(10, trustScore);

  const total = rentScore + commuteScore + depositScore + societyScore + trustScore;

  let grade = 'B';
  let tierBadge = '⚡ Moderate Match';
  if (total >= 90) {
    grade = 'A+';
    tierBadge = '🔥 Unicorn Deal';
  } else if (total >= 75) {
    grade = 'A';
    tierBadge = '✨ Great Match';
  } else if (total >= 60) {
    grade = 'B';
    tierBadge = '⚡ Moderate Match';
  } else {
    grade = 'C';
    tierBadge = '⚠️ Low Match';
  }

  return {
    total,
    rentScore,
    commuteScore,
    depositScore,
    societyScore,
    trustScore,
    grade,
    tierBadge,
  };
}

/**
 * Formats an amount in INR with Indian numbering system (e.g. ₹24,000).
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹—';
  return `₹${amount.toLocaleString('en-IN')}`;
}
