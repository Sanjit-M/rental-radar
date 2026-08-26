import { TARGET_LOCATIONS, EXCLUDED_LOCATIONS } from '../config';
import { BHKType, ValidatedPostDetails, Result, ok, err, FilterRejectionError } from '../types';

/**
 * Checks whether the post text explicitly matches Kadubeesanahalli / PTP area
 * and strictly excludes non-target locations (e.g. Bellandur, Marathahalli).
 *
 * @param text - The raw or cleaned post text.
 * @returns Result with matched location name or FilterRejectionError.
 */
export function isValidLocation(text: string): Result<string, FilterRejectionError> {
  const textLower = text.toLowerCase();

  // 1. Check for hard-excluded locations (unless explicitly negated)
  for (const excl of EXCLUDED_LOCATIONS) {
    const wordPattern = new RegExp(`\\b${escapeRegExp(excl)}\\b`, 'i');
    if (wordPattern.test(textLower)) {
      const negatedPattern = new RegExp(`(?:not|away from|except|excluding)\\s+(?:in\\s+)?${escapeRegExp(excl)}`, 'i');
      if (!negatedPattern.test(textLower)) {
        return err(new FilterRejectionError(`Excluded location: ${excl}`, text.slice(0, 100)));
      }
    }
  }

  // 2. Check for target allowed locations
  for (const target of TARGET_LOCATIONS) {
    const targetPattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i');
    if (targetPattern.test(textLower)) {
      return ok(capitalizeWords(target));
    }
  }

  return err(new FilterRejectionError('No target location match near PTP / Kadubeesanahalli', text.slice(0, 100)));
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

  const femalePatterns = [
    /\b(?:only\s+)?female(?:s)?(?:\s+only)?\b/i,
    /\b(?:only\s+)?girl(?:s)?(?:\s+only)?\b/i,
    /\blooking for (?:a )?female\b/i,
    /\blooking for (?:a )?girl\b/i,
    /\bfemale flatmate\b/i,
    /\bgirl flatmate\b/i,
    /\bfor female\b/i,
    /\bfor girl\b/i,
    /\bwomen only\b/i,
  ];

  for (const pattern of femalePatterns) {
    if (pattern.test(textLower)) {
      if (/\b(?:male|female|any)\s+(?:or|\/)\s+(?:male|female|any)\b/i.test(textLower)) {
        return true;
      }
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

  if (/\b(?:1\s*bhk|1\s*rk|studio|single\s*room|private\s*room|1\s*bedroom)\b/i.test(textLower)) {
    return ok('1 BHK');
  }

  if (/\b(?:flatmate|roommate|occupancy|pre-occupied|preoccupied)\b/i.test(textLower)) {
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
    /^looking for (?:a )?(?:1\s*bhk|flat|apartment|room)/i,
    /^i need a (?:1\s*bhk|flat|apartment|room)/i,
    /^urgently required (?:1\s*bhk|flat)/i,
    /^searching for flat/i,
  ];

  for (const pattern of pureSeekerPatterns) {
    if (pattern.test(textLower.trim())) {
      if (/\blooking for (?:a )?(?:male\s+)?flatmate (?:in|for) (?:my|our|a pre-occupied)\b/i.test(textLower)) {
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
