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
  let vegetarianPenalty = 0;
  let bachelorMatchPoints = 0;
  let walkProximityPoints = 0;
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

  // 2. Brokerage Evaluation (-30 strict penalty if broker fee)
  if (entities.isBrokerage) {
    brokeragePoints = cfg.brokerageApplicable;
  } else {
    brokeragePoints = cfg.noBrokerage;
  }
  total += brokeragePoints;

  // 3. Security Deposit Ratio Evaluation (>2.2x monthly rent = -15 penalty)
  if (entities.deposit !== null) {
    if (entities.rent !== null && entities.deposit > 2.2 * entities.rent) {
      depositPoints = cfg.highDepositRatioPenalty;
    } else if (entities.deposit <= 50000) {
      depositPoints = cfg.lowDeposit;
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

  // 5. Washroom Dedicated (+10) vs Shared (-5)
  if (entities.hasAttachedWashroom) {
    attachedWashroomPoints = cfg.attachedWashroom;
  } else {
    attachedWashroomPoints = cfg.sharedWashroomPenalty;
  }
  total += attachedWashroomPoints;

  // 6. Bachelor / Male Match (+10 if male/bachelor allowed, -25 if female only)
  if (entities.isFemaleOnly) {
    bachelorMatchPoints = cfg.bachelorMismatchPenalty;
  } else if (entities.isMaleBachelorAllowed) {
    bachelorMatchPoints = cfg.bachelorMaleMatch;
  }
  total += bachelorMatchPoints;

  // 7. Walking Proximity to PTP Gates (<500m or walking distance mentioned)
  if (entities.isWalkingDistance || commute.distanceKm <= 0.6) {
    walkProximityPoints = cfg.walkingProximityBonus;
    total += walkProximityPoints;
  }

  // 8. Furnishing
  if (entities.furnishing === 'Fully Furnished' || entities.furnishing === 'Semi-Furnished') {
    furnishedPoints = cfg.furnished;
    total += cfg.furnished;
  }

  // 9. Panathur S-Bend / Underpass Bypass
  if (entities.isKadubeesanahalliDirect) {
    panathurBypassPoints = cfg.panathurBypassBonus;
    total += cfg.panathurBypassBonus;
  }

  // 10. Weekday Peak Commute Time (Two-way average)
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

  // Clamping pre-penalty score to [0, 100]
  const clampedBase = Math.max(0, Math.min(100, total));

  // 11. Strict Vegetarian Penalty applied directly to clamped score
  if (entities.isVegetarianOnly) {
    vegetarianPenalty = cfg.vegetarianOnlyPenalty;
  }

  const finalScore = Math.max(0, Math.min(100, clampedBase + vegetarianPenalty));

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
    vegetarianPenalty,
    bachelorMatch: bachelorMatchPoints,
    walkProximity: walkProximityPoints,
    furnished: furnishedPoints,
    panathurBypass: panathurBypassPoints,
    commute: commutePoints,
  };

  return { score: finalScore, breakdown, tier };
}
