import { SCORING_CONFIG } from '../config';
import { ExtractedEntities, CommuteWindow, ScoringBreakdown, RatingTier } from '../types';

/**
 * Result of computing rating score for a rental listing.
 */
export interface ScoredListingResult {
  readonly score: number;
  readonly breakdown: ScoringBreakdown;
  readonly tier: RatingTier;
}

/**
 * Pure, deterministic scoring algorithm mapping property features, financial parameters,
 * and weekday peak commute into a 0–100 rating meter.
 *
 * @param entities - Extracted property features and financial figures.
 * @param commute - Peak commute calculations.
 * @returns ScoredListingResult containing final score, itemized breakdown, and tier.
 */
export function computeListingScore(
  entities: ExtractedEntities,
  commute: CommuteWindow
): ScoredListingResult {
  const cfg = SCORING_CONFIG;
  let total = cfg.baseScore;

  let rentPoints = 0;
  let brokeragePoints = 0;
  let depositPoints = 0;
  let gatedPoints = 0;
  let poolPoints = 0;
  let powerBackupPoints = 0;
  let attachedWashroomPoints = 0;
  let furnishedPoints = 0;
  let panathurBypassPoints = 0;
  let commutePoints = 0;

  // 1. Rent Evaluation
  if (entities.rent !== null) {
    if (entities.rent <= 25000) {
      rentPoints = cfg.rentLe25k;
    } else if (entities.rent <= 30000) {
      rentPoints = cfg.rent25kTo30k;
    } else {
      rentPoints = cfg.rentGt30k;
    }
  }
  total += rentPoints;

  // 2. Brokerage Evaluation
  if (entities.isBrokerage) {
    brokeragePoints = cfg.brokerageApplicable;
  } else {
    brokeragePoints = cfg.noBrokerage;
  }
  total += brokeragePoints;

  // 3. Security Deposit Ratio Evaluation
  if (entities.deposit !== null) {
    if (entities.deposit <= 50000 || (entities.rent !== null && entities.deposit <= 2 * entities.rent)) {
      depositPoints = cfg.lowDeposit;
    } else if (entities.deposit > 100000 || (entities.rent !== null && entities.deposit > 5 * entities.rent)) {
      depositPoints = cfg.highDeposit;
    }
  }
  total += depositPoints;

  // 4. Gated Society & Amenities
  if (entities.isGatedSociety) {
    gatedPoints = cfg.gatedSociety;
    total += cfg.gatedSociety;
  }

  if (entities.hasSwimmingPool) {
    poolPoints = cfg.swimmingPool;
    total += cfg.swimmingPool;
  }

  if (entities.hasPowerBackup) {
    powerBackupPoints = cfg.powerBackup;
    total += cfg.powerBackup;
  }

  if (entities.hasAttachedWashroom) {
    attachedWashroomPoints = cfg.attachedWashroom;
    total += cfg.attachedWashroom;
  }

  if (entities.furnishing === 'Fully Furnished' || entities.furnishing === 'Semi-Furnished') {
    furnishedPoints = cfg.furnished;
    total += cfg.furnished;
  }

  // 5. Panathur S-Bend / Underpass Bypass
  if (entities.isKadubeesanahalliDirect) {
    panathurBypassPoints = cfg.panathurBypassBonus;
    total += cfg.panathurBypassBonus;
  }

  // 6. Weekday Peak Commute Time (Two-way average)
  if (commute.twoWayAvgPeakMins <= 7) {
    commutePoints = cfg.commuteLe7min;
  } else if (commute.twoWayAvgPeakMins <= 12) {
    commutePoints = cfg.commute8To12min;
  } else if (commute.twoWayAvgPeakMins <= 18) {
    commutePoints = cfg.commute13To18min;
  } else {
    commutePoints = cfg.commuteGt18min;
  }
  total += commutePoints;

  // Clamping to [0, 100]
  const finalScore = Math.max(0, Math.min(100, total));

  // Determine Tier
  let tier: RatingTier = '⚠️ Low Match';
  if (finalScore >= 90) {
    tier = '🔥 Unicorn Deal';
  } else if (finalScore >= 75) {
    tier = '✨ Great Match';
  } else if (finalScore >= 55) {
    tier = '⚡ Moderate Match';
  }

  const breakdown: ScoringBreakdown = {
    base: cfg.baseScore,
    rent: rentPoints,
    brokerage: brokeragePoints,
    deposit: depositPoints,
    gatedSociety: gatedPoints,
    swimmingPool: poolPoints,
    powerBackup: powerBackupPoints,
    attachedWashroom: attachedWashroomPoints,
    furnished: furnishedPoints,
    panathurBypass: panathurBypassPoints,
    commute: commutePoints,
  };

  return { score: finalScore, breakdown, tier };
}
