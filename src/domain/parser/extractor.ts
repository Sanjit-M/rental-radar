import { KNOWN_SOCIETIES } from '../config';
import { ExtractedEntities, FurnishingStatus, INR, makeINR } from '../types';

/**
 * Extracts monthly rent amount as branded INR.
 *
 * @param text - The post text.
 * @returns Branded INR amount, or null if unspecified.
 */
export function extractRent(text: string): INR | null {
  const textLower = text.toLowerCase();

  const patterns = [
    // 18.5k / month or 22k/pm
    /\b(\d{1,2}(?:\.\d+)?)\s*k\s*(?:\/|\s*per\s*)?(?:month|pm)\b/i,
    // Rent: 22k or Rent - 22.5k or Rent 25k
    /(?:rent|rent\s*is|rent\s*amount)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:\.\d+)?)\s*k\b/i,
    // Rent: 22,000 or ₹22,000 or 22000 / month
    /(?:rent|rent\s*is|rent\s*amount)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}[,\d]{3,5})\b/i,
    // ₹ 22k or ₹22000
    /(?:₹|rs\.?|inr)\s*(\d{1,2}(?:\.\d+)?)\s*k\b/i,
    /(?:₹|rs\.?|inr)\s*(\d{4,5})\b/i,
    // Standalone 22000 per month
    /\b(\d{4,5})\s*(?:\/|\s*per\s*)?(?:month|pm)\b/i,
    // Standalone 22k if context implies price
    /\b(\d{1,2}(?:\.\d+)?)\s*k\b/i,
  ];

  for (const pat of patterns) {
    const match = textLower.match(pat);
    if (match && match[1]) {
      const valStr = match[1].replace(/,/g, '');
      const num = parseFloat(valStr);
      const val = valStr.includes('.') ? num * 1000 : num < 100 ? num * 1000 : num;
      if (val >= 5000 && val <= 100000) {
        return makeINR(val);
      }
    }
  }

  return null;
}

/**
 * Extracts security deposit as branded INR.
 *
 * @param text - The post text.
 * @param rent - Parsed monthly rent if available.
 * @returns Branded INR amount, or null if unspecified.
 */
export function extractDeposit(text: string, rent: INR | null): INR | null {
  const textLower = text.toLowerCase();

  // Pattern for months of rent
  const monthsMatch = textLower.match(/(?:deposit|advance|security)\s*[:=-]?\s*(\d{1,2})\s*(?:months?|months?\s*rent)\b/i);
  if (monthsMatch && monthsMatch[1]) {
    const months = parseInt(monthsMatch[1], 10);
    if (rent !== null) {
      return makeINR(months * rent);
    }
  }

  const patterns = [
    /(?:deposit|advance|security\s*deposit)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:\.\d+)?)\s*k\b/i,
    /(?:deposit|advance|security\s*deposit)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}[,\d]{3,6})\b/i,
  ];

  for (const pat of patterns) {
    const match = textLower.match(pat);
    if (match && match[1]) {
      const valStr = match[1].replace(/,/g, '');
      const num = parseFloat(valStr);
      const val = num < 100 ? num * 1000 : num;
      if (val >= 10000 && val <= 500000) {
        return makeINR(val);
      }
    }
  }

  return null;
}

/**
 * Detects whether brokerage applies or if the post is zero-brokerage/direct owner.
 *
 * @param text - The post text.
 * @returns True if broker fee applies, false if direct owner / flatmate.
 */
export function extractBrokerage(text: string): boolean {
  const textLower = text.toLowerCase();

  // Explicit "No Brokerage" variations
  const noBrokeragePatterns = [
    /\bno\s*brokerage\b/i,
    /\bzero\s*brokerage\b/i,
    /\bwithout\s*brokerage\b/i,
    /\b0\s*brokerage\b/i,
    /\bdirect\s*(?:from\s*)?owner\b/i,
    /\bowner\s*post\b/i,
    /\bflatmate\s*replacement\b/i,
    /\bno\s*broker\b/i,
  ];
  for (const pat of noBrokeragePatterns) {
    if (pat.test(textLower)) {
      return false;
    }
  }

  // Explicit Brokerage mentions
  const brokeragePatterns = [
    /\bbrokerage\s*applicable\b/i,
    /\bbrokerage\s*charges\b/i,
    /\bbrokerage\s*:\s*\w+/i,
    /\bbroker\s*fee\b/i,
    /\bbroker\s*contact\b/i,
    /\bcontact\s*broker\b/i,
    /\b15\s*days\s*brokerage\b/i,
    /\b1\s*month\s*brokerage\b/i,
    /\bhalf\s*month\s*brokerage\b/i,
  ];
  for (const pat of brokeragePatterns) {
    if (pat.test(textLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts gated society recognition, swimming pool, power backup, and geographic anchors.
 *
 * @param text - The post text.
 * @returns Object with verified society and amenity flags.
 */
export function extractSocietyAndAmenities(text: string) {
  const textClean = text.toLowerCase().replace(/[\s-]/g, '');

  let isGatedSociety = false;
  let societyName: string | null = null;
  let hasSwimmingPool = false;
  let hasPowerBackup = false;
  let isKadubeesanahalliDirect = true;
  let societyLat: number | undefined;
  let societyLon: number | undefined;

  // 1. Match known gated societies
  for (const [key, data] of Object.entries(KNOWN_SOCIETIES)) {
    if (textClean.includes(key)) {
      isGatedSociety = true;
      societyName = data.name;
      hasSwimmingPool = data.hasPool;
      hasPowerBackup = data.hasPowerBackup;
      isKadubeesanahalliDirect = data.isKadubeesanahalliDirect;
      societyLat = data.lat;
      societyLon = data.lon;
      break;
    }
  }

  // 2. Generic gated community check
  if (!isGatedSociety) {
    if (/\bgated\s*society\b|\bgated\s*community\b|\bapartment\s*complex\b|\bsociety\b/i.test(text)) {
      isGatedSociety = true;
      const match = text.match(/(?:society|apartment|complex)\s*[:=-]?\s*([A-Za-z0-9\s]{3,25})/i);
      if (match && match[1]) {
        societyName = match[1].trim();
      }
    }
  }

  // 3. Pool check
  if (!hasSwimmingPool && /\bswimming\s*pool\b|\bpool\b/i.test(text)) {
    hasSwimmingPool = true;
  }

  // 4. Power backup check
  if (!hasPowerBackup && /\bpower\s*backup\b|\b100%\s*power\s*backup\b|\bdg\s*backup\b|\bgenerator\b|\bfull\s*backup\b/i.test(text)) {
    hasPowerBackup = true;
  }

  // 5. Panathur Underpass check
  if (text.toLowerCase().includes('panathur') && !text.toLowerCase().includes('kadubeesanahalli')) {
    isKadubeesanahalliDirect = false;
  }

  return {
    isGatedSociety,
    societyName,
    hasSwimmingPool,
    hasPowerBackup,
    isKadubeesanahalliDirect,
    societyLat,
    societyLon,
  };
}

/**
 * Detects presence of an attached/private bathroom.
 *
 * @param text - The post text.
 * @returns True if private/attached washroom is available.
 */
export function extractAttachedWashroom(text: string): boolean {
  return /\battached\s*(?:washroom|bathroom|bath|toilet|restroom)\b|\bprivate\s*(?:washroom|bathroom|bath|toilet)\b|\bpersonal\s*(?:washroom|bathroom|bath)\b|\bwith\s*attached\s*bath\b/i.test(text);
}

/**
 * Detects presence of a dedicated room or flat balcony.
 *
 * @param text - The post text.
 * @returns True if balcony is mentioned.
 */
export function extractBalcony(text: string): boolean {
  return /\bbalcon(?:y|ies)\b/i.test(text);
}

/**
 * Detects furnishing level.
 *
 * @param text - The post text.
 * @returns FurnishingStatus enum string.
 */
export function extractFurnishing(text: string): FurnishingStatus {
  const textLower = text.toLowerCase();
  if (/\bfully\s*furnished\b|\bfull\s*furnished\b|\bwell\s*furnished\b/i.test(textLower)) {
    return 'Fully Furnished';
  }
  if (/\bsemi\s*furnished\b|\bsemi-furnished\b/i.test(textLower)) {
    return 'Semi-Furnished';
  }
  if (/\bunfurnished\b|\braw\s*flat\b|\bun-furnished\b/i.test(textLower)) {
    return 'Unfurnished';
  }
  return 'Unknown';
}

/**
 * Normalizes Indian 10-digit phone number.
 *
 * @param text - The post text.
 * @returns Clean 10-digit number string or null.
 */
export function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+91[\-\s]?)?([6-9]\d{4}[\-\s]?\d{5})\b/);
  if (match && match[0]) {
    const clean = match[0].replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
      return clean.slice(2);
    }
    if (clean.length === 10) {
      return clean;
    }
  }
  return null;
}

/**
 * Aggregates all extracted properties into a single immutable ExtractedEntities record.
 *
 * @param text - The post text.
 * @returns Full ExtractedEntities structure.
 */
export function extractAllEntities(text: string): ExtractedEntities {
  const rent = extractRent(text);
  const deposit = extractDeposit(text, rent);
  const isBrokerage = extractBrokerage(text);
  const societyInfo = extractSocietyAndAmenities(text);
  const hasAttachedWashroom = extractAttachedWashroom(text);
  const hasBalcony = extractBalcony(text);
  const furnishing = extractFurnishing(text);
  const contactPhone = extractPhone(text);

  return {
    rent,
    deposit,
    isBrokerage,
    isGatedSociety: societyInfo.isGatedSociety,
    societyName: societyInfo.societyName,
    hasSwimmingPool: societyInfo.hasSwimmingPool,
    hasPowerBackup: societyInfo.hasPowerBackup,
    hasAttachedWashroom,
    hasBalcony,
    furnishing,
    isKadubeesanahalliDirect: societyInfo.isKadubeesanahalliDirect,
    contactPhone,
    societyLat: societyInfo.societyLat,
    societyLon: societyInfo.societyLon,
  };
}
