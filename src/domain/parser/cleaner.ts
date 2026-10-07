import { FbPostId, makeFbPostId } from '../types';

/**
 * Strips noise, reaction metrics, and extraneous controls from Facebook feed post text.
 *
 * @param text - The raw scraped post text.
 * @returns Cleaned multi-line text.
 */
export function cleanPostText(text: string): string {
  const lines = text.split('\n');
  const cleaned: string[] = [];

  const ignorePatterns = [
    /^like\b/i,
    /^reply\b/i,
    /^share\b/i,
    /^comment\b/i,
    /^view more comments/i,
    /^write a comment/i,
    /^all reactions/i,
    /^\d+\s*(?:h|hr|hrs|d|days?|w|mins?)$/i,
    /^top fan\b/i,
    /^group member\b/i,
    /^see more\b/i,
    /^see translation\b/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (ignorePatterns.some((pattern) => pattern.test(trimmed))) continue;
    cleaned.push(trimmed);
  }

  return cleaned.join('\n');
}

/**
 * Generates a stable deterministic Facebook Post ID hash if direct permalink ID is absent.
 *
 * @param groupName - The Facebook group name.
 * @param authorName - The author's name.
 * @param text - Cleaned post text.
 * @returns Branded FbPostId string.
 */
export function generatePostId(groupName: string, authorName: string, text: string): FbPostId {
  const sample = text.slice(0, 150).replace(/\s+/g, '');
  const combined = `${groupName}:${authorName}:${sample}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }

  return makeFbPostId(`fb_${Math.abs(hash).toString(36)}`);
}

/**
 * Formats a JavaScript Date into an exact Indian Standard Time (IST) string.
 * Example: "27 Aug 2026, 01:15 AM IST"
 *
 * @param date - The Date object to format.
 * @returns Formatted string in Indian Standard Time with IST suffix.
 */
export function formatToIST(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return new Intl.DateTimeFormat('en-IN', options).format(date) + ' IST';
}

/**
 * Parses raw Facebook relative or absolute timestamp text into an exact Date object.
 * Handles tokens like "28m", "2h", "Yesterday at 1:15 AM", "16 August at 11:54", "Friday, 16 August at 11:54 · 🌐", etc.
 *
 * @param rawText - The raw timestamp text extracted from the post element or aria-label.
 * @param referenceTime - Current reference time (defaults to Date.now()).
 * @returns Object with native Date and formatted IST string, or null if unparseable.
 */
export function parseFacebookTimestamp(
  rawText: string,
  referenceTime: Date = new Date()
): { date: Date; formattedIST: string } | null {
  if (!rawText || typeof rawText !== 'string') return null;

  let clean = rawText.trim();
  const now = referenceTime.getTime();

  // Normalize Indic / Kannada numerals (೦-೯, ०-९ -> 0-9)
  const indicDigits: Record<string, string> = {
    '೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4',
    '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9',
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  clean = clean.replace(/[೦-೯०-९]/g, (ch) => indicDigits[ch] || ch);

  // Normalize Kannada / regional time units (e.g. "10ನಿ" -> "10m", "2ಗಂ" -> "2h", "1ದಿನ" -> "1d")
  clean = clean.replace(/(\d+)\s*(?:ನಿ|ನಿಮಿಷ|ನಿಮಿಷಗಳ\s*ಹಿಂದೆ)/gi, '$1m');
  clean = clean.replace(/(\d+)\s*(?:ಗಂ|ಗಂಟೆ|ಗಂಟೆಗಳ\s*ಹಿಂದೆ)/gi, '$1h');
  clean = clean.replace(/(\d+)\s*(?:ದಿನ|ದಿನಗಳ\s*ಹಿಂದೆ)/gi, '$1d');

  // Strip leading weekday names e.g. "Friday, 16 August at 11:54" -> "16 August at 11:54"
  clean = clean.replace(/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,\s]+/i, '').trim();

  // Strip trailing icons, privacy symbols, bullets, or dots e.g. " · 🌐" or " · 👥"
  clean = clean.replace(/[·•\s🌐👥🔒]+$/g, '').trim();

  // If text contains bullet / interpunct separator, extract the date part: e.g. "· 14 August at 12:11 ·"
  const bulletMatch = clean.match(/[·•]\s*([A-Za-z0-9\s:,]+(?:am|pm)?)\s*[·•]?/i);
  if (bulletMatch && bulletMatch[1]) {
    clean = bulletMatch[1].trim();
  }

  const lower = clean.toLowerCase();

  // 1. Unix timestamp (epoch seconds / millis)
  if (/^\d{10,13}$/.test(clean)) {
    const epoch = parseInt(clean, 10);
    const date = new Date(epoch < 1e11 ? epoch * 1000 : epoch);
    return { date, formattedIST: formatToIST(date) };
  }

  // 2. Explicit Calendar Dates (e.g., "5 July 2025", "28 March 2024 at 11:54 AM", "16 August")
  // MUST precede single-letter relative matchers ('m', 'h', 'd') to avoid "28 March" matching "28m"
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'
  ];
  const monthPattern = monthNames.join('|');

  // Format A: "16 August", "5 July 2025", "16 August at 11:54"
  const dateAtTimeRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})(?:[\\s,]+(\\d{4}))?(?:\\s+at\\s+(\\d{1,2}):(\\d{2})(?:\\s*(am|pm))?)?\\b`, 'i');
  const matchA = clean.match(dateAtTimeRegex);
  if (matchA && matchA[1] && matchA[2]) {
    const day = parseInt(matchA[1], 10);
    const monthStr = matchA[2].toLowerCase();
    const year = matchA[3] ? parseInt(matchA[3], 10) : referenceTime.getFullYear();
    let hrs = matchA[4] ? parseInt(matchA[4], 10) : 12;
    const mins = matchA[5] ? parseInt(matchA[5], 10) : 0;
    const meridiem = matchA[6]?.toLowerCase();
    if (meridiem === 'pm' && hrs < 12) hrs += 12;
    if (meridiem === 'am' && hrs === 12) hrs = 0;

    const monthIndex = monthNames.findIndex((m) => monthStr.startsWith(m.slice(0, 3))) % 12;
    const date = new Date(year, monthIndex, day, hrs, mins, 0, 0);
    return { date, formattedIST: formatToIST(date) };
  }

  // Format B: "August 16", "July 5, 2025", "August 16 at 11:54"
  const monthAtTimeRegex = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:[\\s,]+(\\d{4}))?(?:\\s+at\\s+(\\d{1,2}):(\\d{2})(?:\\s*(am|pm))?)?\\b`, 'i');
  const matchB = clean.match(monthAtTimeRegex);
  if (matchB && matchB[1] && matchB[2]) {
    const monthStr = matchB[1].toLowerCase();
    const day = parseInt(matchB[2], 10);
    const year = matchB[3] ? parseInt(matchB[3], 10) : referenceTime.getFullYear();
    let hrs = matchB[4] ? parseInt(matchB[4], 10) : 12;
    const mins = matchB[5] ? parseInt(matchB[5], 10) : 0;
    const meridiem = matchB[6]?.toLowerCase();
    if (meridiem === 'pm' && hrs < 12) hrs += 12;
    if (meridiem === 'am' && hrs === 12) hrs = 0;

    const monthIndex = monthNames.findIndex((m) => monthStr.startsWith(m.slice(0, 3))) % 12;
    const date = new Date(year, monthIndex, day, hrs, mins, 0, 0);
    return { date, formattedIST: formatToIST(date) };
  }

  // 3. "Yesterday at 11:30 pm" or "Yesterday"
  const yesterdayMatch = lower.match(/\byesterday(?:\s+at\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?)?\b/i);
  if (yesterdayMatch) {
    let hrs = yesterdayMatch[1] ? parseInt(yesterdayMatch[1], 10) : 12;
    const mins = yesterdayMatch[2] ? parseInt(yesterdayMatch[2], 10) : 0;
    const meridiem = yesterdayMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hrs < 12) hrs += 12;
    if (meridiem === 'am' && hrs === 12) hrs = 0;

    const date = new Date(referenceTime);
    date.setDate(date.getDate() - 1);
    date.setHours(hrs, mins, 0, 0);
    return { date, formattedIST: formatToIST(date) };
  }

  // 4. "Just now"
  if (lower.includes('just now')) {
    return { date: referenceTime, formattedIST: formatToIST(referenceTime) };
  }

  // 5. Minutes: "15m", "15 mins", "15 min", "15 minutes ago"
  // Strictly prevent matching month names like "March" as "m"
  const minMatch = lower.match(/\b(\d+)\s*(?:m|min|mins|minutes?)(?:\s*ago)?\b/);
  if (minMatch && minMatch[1]) {
    const mins = parseInt(minMatch[1], 10);
    const date = new Date(now - mins * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 6. Hours: "2h", "2 hrs", "2 hr", "2 hours ago"
  const hrMatch = lower.match(/\b(\d+)\s*(?:h|hr|hrs|hours?)(?:\s*ago)?\b/);
  if (hrMatch && hrMatch[1]) {
    const hrs = parseInt(hrMatch[1], 10);
    const date = new Date(now - hrs * 60 * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 7. Days: "1d", "2d", "1 day ago"
  const dayMatch = lower.match(/\b(\d+)\s*(?:d|day|days?)(?:\s*ago)?\b/);
  if (dayMatch && dayMatch[1]) {
    const days = parseInt(dayMatch[1], 10);
    const date = new Date(now - days * 24 * 60 * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 8. Try native Date parser only if string contains explicit numbers & letters and NO relative tokens
  if (/\d/.test(clean) && /[a-z]/i.test(clean) && !/\b(?:m|min|h|hr|d|day)\b/.test(clean)) {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return { date: parsed, formattedIST: formatToIST(parsed) };
    }
  }

  // No silent execution-time fallback: return null if timestamp is unverified
  return null;
}

/**
 * Scans the header of a post text for explicit publication dates or past year markers.
 * Used when Facebook's DOM obfuscates the time anchor element.
 */
export function extractDateFromPostText(
  rawText: string,
  referenceTime: Date = new Date()
): { date: Date; formattedIST: string } | null {
  if (!rawText) return null;
  const header = rawText.slice(0, 400);

  // 1. Explicit calendar date: "5 July 2025", "28 March 2024", "18 Feb 2024"
  const fullDateMatch = header.match(
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:[,\s]+\d{4})?(?:\s+at\s+\d{1,2}:\d{2}(?:\s*(?:am|pm))?)?)\b/i
  );
  if (fullDateMatch && fullDateMatch[1]) {
    const parsed = parseFacebookTimestamp(fullDateMatch[1], referenceTime);
    if (parsed) return parsed;
  }

  // 2. Explicit past year marker e.g. "2023", "2024", "2025"
  const pastYearMatch = header.match(/\b(202[0-5])\b/);
  if (pastYearMatch && pastYearMatch[1]) {
    const yr = parseInt(pastYearMatch[1], 10);
    const date = new Date(yr, 0, 1);
    return { date, formattedIST: formatToIST(date) };
  }

  // 3. Explicit older relative units e.g. "2 months ago", "1 year ago", "3 weeks ago"
  const relativePast = header.match(/\b(\d+)\s+(months?|years?|weeks?)\s+ago/i);
  if (relativePast && relativePast[1] && relativePast[2]) {
    const count = parseInt(relativePast[1], 10);
    const unit = relativePast[2].toLowerCase();
    const millis = unit.startsWith('year')
      ? count * 365 * 24 * 60 * 60 * 1000
      : unit.startsWith('month')
      ? count * 30 * 24 * 60 * 60 * 1000
      : count * 7 * 24 * 60 * 60 * 1000;
    const date = new Date(referenceTime.getTime() - millis);
    return { date, formattedIST: formatToIST(date) };
  }

  return null;
}

/**
 * Extracts poster author name from post contact signatures in text when DOM author is masked.
 * e.g. "CONTACT: Khalid – 9013088827" -> "Khalid"
 */
export function extractAuthorFromText(rawText: string): string | null {
  if (!rawText) return null;

  const patterns = [
    /(?:contact|reach out to|call|whatsapp|ping|posted by|dm|owner|author|name is|myself|this is)\s*[:–-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
  ];

  const stopWords = new Set([
    'on', 'at', 'for', 'or', 'and', 'if', 'via', 'to', 'in', 'is', 'me', 'us', 'the',
    'flat', 'rent', 'male', 'female', 'room', 'bhk', 'broker', 'deposit', 'price',
    'prestige', 'sobha', 'details', 'visit', 'photos', 'pics', 'info', 'call', 'dm',
    'whatsapp', 'phone', 'mobile', 'number', 'name', 'contact', 'brokerage', 'without', 'with', 'any', 'no'
  ]);

  for (const pat of patterns) {
    const match = rawText.match(pat);
    if (match && match[1]) {
      const words = match[1].trim().split(/\s+/);
      // Remove trailing stop words e.g. "Deepak on" -> ["Deepak"]
      while (words.length > 0 && stopWords.has(words[words.length - 1]!.toLowerCase())) {
        words.pop();
      }
      if (words.length > 0) {
        const candidate = words.join(' ');
        if (candidate.length > 1 && !stopWords.has(candidate.toLowerCase()) && !stopWords.has(words[0]!.toLowerCase())) {
          return candidate;
        }
      }
    }
  }

  return null;
}


