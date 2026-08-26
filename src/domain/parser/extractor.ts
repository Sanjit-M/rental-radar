import { KNOWN_SOCIETIES } from '../config';
import { ExtractedEntities, FurnishingStatus, INR, makeINR } from '../types';

/**
 * Extracts monthly rent amount as branded INR.
 */
export function extractRent(text: string): INR | null {
  const textLower = text.toLowerCase();

  const patterns = [
    /\b(\d{1,2}(?:\.\d+)?)\s*k\s*(?:\/|\s*per\s*)?(?:month|pm)\b/i,
    /(?:rent|rent\s*is|rent\s*amount)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:\.\d+)?)\s*k\b/i,
    /(?:rent|rent\s*is|rent\s*amount)\s*[:=-]?\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}[,\d]{3,5})\b/i,
    /(?:₹|rs\.?|inr)\s*(\d{1,2}(?:\.\d+)?)\s*k\b/i,
    /(?:₹|rs\.?|inr)\s*(\d{4,5})\b/i,
    /\b(\d{4,5})\s*(?:\/|\s*per\s*)?(?:month|pm)\b/i,
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
 */
export function extractDeposit(text: string, rent: INR | null): INR | null {
  const textLower = text.toLowerCase();

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
 */
export function extractBrokerage(text: string): boolean {
  const textLower = text.toLowerCase();

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
 * Extracts society and amenity information.
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

  if (!isGatedSociety) {
    if (/\bgated\s*society\b|\bgated\s*community\b|\bapartment\s*complex\b|\bsociety\b/i.test(text)) {
      isGatedSociety = true;
      const match = text.match(/(?:society|apartment|complex)\s*[:=-]?\s*([A-Za-z0-9\s]{3,25})/i);
      if (match && match[1]) {
        societyName = match[1].trim();
      }
    }
  }

  if (!hasSwimmingPool && /\bswimming\s*pool\b|\bpool\b/i.test(text)) {
    hasSwimmingPool = true;
  }

  if (!hasPowerBackup && /\bpower\s*backup\b|\b100%\s*power\s*backup\b|\bdg\s*backup\b|\bgenerator\b|\bfull\s*backup\b/i.test(text)) {
    hasPowerBackup = true;
  }

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

export function extractAttachedWashroom(text: string): boolean {
  return /\battached\s*(?:washroom|bathroom|bath|toilet|restroom)\b|\bprivate\s*(?:washroom|bathroom|bath|toilet)\b|\bpersonal\s*(?:washroom|bathroom|bath)\b|\bwith\s*attached\s*bath\b/i.test(text);
}

export function extractBalcony(text: string): boolean {
  return /\bbalcon(?:y|ies)\b/i.test(text);
}

export function extractVegetarianOnly(text: string): boolean {
  return /\bveg\s*only\b|\bvegetarian\s*only\b|\bstrictly\s*veg\b|\bstrictly\s*vegetarian\b|\bno\s*non[\s-]?veg\b|\bvegetarian\s*flatmate\b/i.test(text);
}

export function extractGenderPreference(text: string): { isMaleBachelorAllowed: boolean; isFemaleOnly: boolean } {
  const textLower = text.toLowerCase();
  const isFemaleOnly = /\bfemale\s*only\b|\bfemales\s*only\b|\bgirls?\s*only\b|\blooking\s*for\s*(?:a\s*)?female\b|\bfor\s*female\b/i.test(textLower);
  const isMaleExplicit = /\bmale\s*(?:flatmate|bachelor|bachelors|professional)?\b|\bguys?\s*only\b|\bfor\s*male\b|\bfor\s*bachelors\b|\blooking\s*for\s*(?:a\s*)?male\b/i.test(textLower);
  
  return {
    isFemaleOnly,
    isMaleBachelorAllowed: isMaleExplicit || (!isFemaleOnly && !/family\s*only/i.test(textLower)),
  };
}

export function extractWalkingDistance(text: string): boolean {
  return /\bwalking\s*distance\b|\bwalk\s*to\s*ptp\b|\b2\s*mins?\s*walk\b|\b3\s*mins?\s*walk\b|\b5\s*mins?\s*walk\b|\bopposite\s*(?:to\s*)?ptp\b|\bopposite\s*prestige\s*tech\s*park\b|\bwalkable\b/i.test(text);
}

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

export function extractAllEntities(text: string): ExtractedEntities {
  const rent = extractRent(text);
  const deposit = extractDeposit(text, rent);
  const isBrokerage = extractBrokerage(text);
  const societyInfo = extractSocietyAndAmenities(text);
  const hasAttachedWashroom = extractAttachedWashroom(text);
  const hasBalcony = extractBalcony(text);
  const isVegetarianOnly = extractVegetarianOnly(text);
  const { isMaleBachelorAllowed, isFemaleOnly } = extractGenderPreference(text);
  const isWalkingDistance = extractWalkingDistance(text);
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
    isVegetarianOnly,
    isMaleBachelorAllowed,
    isFemaleOnly,
    isWalkingDistance,
    furnishing,
    isKadubeesanahalliDirect: societyInfo.isKadubeesanahalliDirect,
    contactPhone,
    societyLat: societyInfo.societyLat,
    societyLon: societyInfo.societyLon,
  };
}
