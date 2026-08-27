import { TARGET_LOCATIONS, EXCLUDED_LOCATIONS, UNDERPASS_BLOCKED_PATTERNS, KNOWN_SOCIETIES } from '../config';
import { BHKType, ValidatedPostDetails, Result, ok, err, FilterRejectionError } from '../types';

/**
 * Checks whether the post text indicates location after the Panathur railway underpass
 * (a major traffic bottleneck/trap).
 *
 * @param text - The post text.
 * @returns True if post is located after/beyond the underpass or in Balagere/Varthur.
 */
export function isAfterRailwayUnderpass(text: string): boolean {
  for (const pattern of UNDERPASS_BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether the post text explicitly matches the target perimeter
 * (Kadubeesanahalli, PTP, Cessna, PTP Back Gate, Boganahalli, Devarabisanahalli, Panathur, Marathahalli, Bellandur, ETV, Ecoworld, etc.)
 * or any verified society in KNOWN_SOCIETIES, and strictly excludes non-target locations
 * or posts located past the Panathur railway underpass.
 *
 * @param text - The raw or cleaned post text.
 * @returns Result with matched location name or FilterRejectionError.
 */
export function isValidLocation(text: string): Result<string, FilterRejectionError> {
  const textLower = text.toLowerCase();
  const textClean = textLower.replace(/[\s-]/g, '');

  // 1. Strict Underpass Trap Filter
  if (isAfterRailwayUnderpass(text)) {
    return err(new FilterRejectionError('Location is after Panathur railway underpass (traffic bottleneck)', text.slice(0, 100)));
  }

  // 2. Strict Overseas & Non-Bangalore Spam Filter
  const spamLocations = ['dubai', 'uae', 'rigga', 'deira', 'sharjah', 'bur dubai', 'muraqqabat', 'al barsha', 'nahda'];
  for (const spam of spamLocations) {
    if (new RegExp(`\\b${escapeRegExp(spam)}\\b`, 'i').test(textLower)) {
      return err(new FilterRejectionError(`Spam / non-Bangalore location: ${spam}`, text.slice(0, 100)));
    }
  }

  // 3. First check for Known Society Matches
  for (const [key, society] of Object.entries(KNOWN_SOCIETIES)) {
    if (textClean.includes(key) || textLower.includes(society.name.toLowerCase())) {
      return ok(society.name);
    }
  }

  // 4. Check for matched target area
  let matchedTarget: string | null = null;

  for (const target of TARGET_LOCATIONS) {
    // Avoid false positive on "PTP ADMIN" / "PTP GROUP"
    if (target === 'ptp' && /\bptp\s*(?:admin|moderator|group|rules?)\b/i.test(textLower) && !/\b(?:flat|room|bhk|rent|stay|near|in)\s+ptp\b/i.test(textLower)) {
      continue;
    }

    const targetPattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i');
    if (targetPattern.test(textLower)) {
      matchedTarget = capitalizeWords(target);
      break;
    }
  }

  // 5. If target location was found, verify it is not primarily in an excluded distant location
  if (matchedTarget) {
    for (const excl of EXCLUDED_LOCATIONS) {
      const explicitExclLocationPattern = new RegExp(`\\b(?:flat|room|apartment|house|stay|located)\\s+(?:in|at)\\s+${escapeRegExp(excl)}\\b`, 'i');
      if (explicitExclLocationPattern.test(textLower)) {
        const hasDirectTarget = /\b(?:in|at|near|opposite)\s+(?:kadubeesanahalli|kadubisanahalli|kadhubesanahalli|kadubeesanhalli|kadubisanahali|kadubeesanahali|ptp|prestige tech park|cessna|cessna park|boganahalli|bhoganahalli|boganahali|bhoganahali|devarabisanahalli|devarabeesanahalli|devarabeesanhalli|devarabisanahali|kariyammana agrahara|kariyammana|kariyamma agrahara|marathahalli|marathalli|marathahali|marathali)\b/i.test(textLower);
        if (!hasDirectTarget) {
          return err(new FilterRejectionError(`Excluded location: ${excl}`, text.slice(0, 100)));
        }
      }
    }

    return ok(matchedTarget);
  }

  // 6. No target location found: check if explicitly in an excluded location
  for (const excl of EXCLUDED_LOCATIONS) {
    const wordPattern = new RegExp(`\\b${escapeRegExp(excl)}\\b`, 'i');
    if (wordPattern.test(textLower)) {
      const negatedPattern = new RegExp(`(?:not|away from|except|excluding)\\s+(?:in\\s+)?${escapeRegExp(excl)}`, 'i');
      if (!negatedPattern.test(textLower)) {
        return err(new FilterRejectionError(`Excluded location: ${excl}`, text.slice(0, 100)));
      }
    }
  }

  return err(new FilterRejectionError('No target location match in Kadubeesanahalli / PTP / Cessna / Devarabisanahalli / Boganahalli / Kariyammana Agrahara / Marathahalli perimeter', text.slice(0, 100)));
}

/**
 * Checks whether the post is suitable for a Male flatmate seeker.
 * Filters out female-only or girls-only postings.
 *
 * @param text - The post text.
 * @returns True if post is suitable for male/co-ed seekers.
 */
export function isValidGender(text: string): boolean {
  const textLower = text.toLowerCase();

  // Explicit male / co-ed / any-gender inclusion overrides
  if (
    /\b(?:male|boy|boys|men|gentleman|gents|bachelor|bachelors|any\s*gender|co-ed|both\s+(?:male|genders?)|boys?\s*(?:and|or|\/)\s*girls?|male\s*(?:and|or|\/)\s*female|all\s+welcome|no\s+restriction)\b/i.test(textLower)
  ) {
    return true;
  }

  const femaleOnlyPatterns = [
    /\b(?:female|woman|women|girl|girls)\s+(?:only|flatmate|roommate|replacement|occupancy|tenant)\b/i,
    /\blooking\s+for\s+(?:a\s+)?(?:female|girl|woman)\b/i,
    /\bonly\s+for\s+(?:female|girls?|women)\b/i,
    /\b(?:only\s+female|only\s+girls?|only\s+women)\b/i,
    /\bfor\s+(?:female|girl|women)\s+only\b/i,
    /\bwomen\s+only\b/i,
    /\bgirls?\s+only\b/i,
    /\bfemale\s+only\b/i,
  ];

  for (const pattern of femaleOnlyPatterns) {
    if (pattern.test(textLower)) {
      return false;
    }
  }

  return true;
}

/**
 * Detects matching BHK type or flatmate occupancy.
 *
 * @param text - The post text.
 * @returns Result with matched BHKType or FilterRejectionError.
 */
export function isValidBHK(text: string): Result<BHKType, FilterRejectionError> {
  const textLower = text.toLowerCase();

  if (/\b(?:3\s*bhk|3\s*bedroom|master\s*bedroom)\b/i.test(textLower) || /\bin\s*(?:a\s*)?3\s*bhk\b/i.test(textLower)) {
    return ok('3 BHK (Shared/Full)');
  }

  if (/\b(?:2\s*bhk|2\s*bedroom)\b/i.test(textLower) || /\bin\s*(?:a\s*)?2\s*bhk\b/i.test(textLower)) {
    return ok('2 BHK (Shared/Full)');
  }

  if (/\b(?:1\s*bhk|1\s*rk|studio|single\s*room|private\s*room|1\s*bedroom|independent\s+flat|independent\s+house)\b/i.test(textLower)) {
    return ok('1 BHK');
  }

  if (
    /\b(?:flatmate|roommate|occupancy|pre-occupied|preoccupied|room\s+available|room\s+for\s+rent|furnished\s+room|spacious\s+room|independent\s+room|single\s+occupancy|sharing\s+room)\b/i.test(
      textLower
    )
  ) {
    return ok('Private Room / Flatmate');
  }

  return err(new FilterRejectionError('BHK type not matching 1/2/3 BHK or flatmate room'));
}

/**
 * Verifies if post is an offering rather than a pure seeker or spam ad.
 *
 * @param text - The post text.
 * @returns True if post is a valid rental offering.
 */
export function isRentalOffering(text: string): boolean {
  const textLower = text.toLowerCase();

  const spamKeywords = [
    'selling my bike',
    'selling car',
    'laptop for sale',
    'job opening',
    'hiring',
    'interiors design',
  ];
  if (spamKeywords.some((k) => textLower.includes(k))) {
    return false;
  }

  const pureSeekerPatterns = [
    /^looking for (?:a )?(?:1\s*bhk|flat|apartment|room)\b/i,
    /^i need a (?:1\s*bhk|flat|apartment|room)\b/i,
    /^urgently required (?:1\s*bhk|flat)\b/i,
    /^searching for flat\b/i,
  ];

  for (const pattern of pureSeekerPatterns) {
    if (pattern.test(textLower.trim())) {
      if (/\b(?:flatmate|roommate|replacement|pre-occupied|occupancy|available|vacan(?:cy|t))\b/i.test(textLower)) {
        return true;
      }
      return false;
    }
  }

  return true;
}

/**
 * Executes the complete filter pipeline, returning typed Result monad.
 *
 * @param text - Raw post text.
 * @returns Result with ValidatedPostDetails or FilterRejectionError.
 */
export function passesAllFilters(text: string): Result<ValidatedPostDetails, FilterRejectionError> {
  if (!isRentalOffering(text)) {
    return err(new FilterRejectionError('Not a rental offering'));
  }

  if (!isValidGender(text)) {
    return err(new FilterRejectionError('Female-only post excluded'));
  }

  const locResult = isValidLocation(text);
  if (locResult._tag === 'err') {
    return locResult;
  }

  const bhkResult = isValidBHK(text);
  if (bhkResult._tag === 'err') {
    return bhkResult;
  }

  return ok({
    location: locResult.value,
    bhkType: bhkResult.value,
  });
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (l) => l.toUpperCase());
}

