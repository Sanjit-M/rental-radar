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
 * Handles tokens like "28m", "2h", "Yesterday at 1:15 AM", "August 25 at 10:00 AM", etc.
 *
 * @param rawText - The raw timestamp text extracted from the post element.
 * @param referenceTime - Current reference time (defaults to Date.now()).
 * @returns Object with native Date and formatted IST string.
 */
export function parseFacebookTimestamp(
  rawText: string,
  referenceTime: Date = new Date()
): { date: Date; formattedIST: string } {
  let clean = rawText.trim();
  const now = referenceTime.getTime();

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

  // 2. Minutes: "15m", "15 mins", "15 min", "15 minutes ago"
  const minMatch = lower.match(/(\d+)\s*(?:m|min|mins|minutes?)(?:\s*ago)?/);
  if (minMatch && minMatch[1]) {
    const mins = parseInt(minMatch[1], 10);
    const date = new Date(now - mins * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 3. Hours: "2h", "2 hrs", "2 hr", "2 hours ago"
  const hrMatch = lower.match(/(\d+)\s*(?:h|hr|hrs|hours?)(?:\s*ago)?/);
  if (hrMatch && hrMatch[1]) {
    const hrs = parseInt(hrMatch[1], 10);
    const date = new Date(now - hrs * 60 * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 4. Days: "1d", "2d", "1 day ago"
  const dayMatch = lower.match(/(\d+)\s*(?:d|day|days?)(?:\s*ago)?/);
  if (dayMatch && dayMatch[1]) {
    const days = parseInt(dayMatch[1], 10);
    const date = new Date(now - days * 24 * 60 * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 5. "Yesterday at 11:30 pm"
  const yesterdayMatch = lower.match(/yesterday\s+at\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
  if (yesterdayMatch && yesterdayMatch[1] && yesterdayMatch[2]) {
    let hrs = parseInt(yesterdayMatch[1], 10);
    const mins = parseInt(yesterdayMatch[2], 10);
    const meridiem = yesterdayMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hrs < 12) hrs += 12;
    if (meridiem === 'am' && hrs === 12) hrs = 0;

    const date = new Date(referenceTime);
    date.setDate(date.getDate() - 1);
    date.setHours(hrs, mins, 0, 0);
    return { date, formattedIST: formatToIST(date) };
  }

  // 6. "14 August at 12:11" or "August 14 at 12:11" or "14 Aug at 12:11 PM"
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'
  ];
  const monthPattern = monthNames.join('|');

  // Format A: "14 August at 12:11"
  const dateAtTimeRegex = new RegExp(`(\\d{1,2})\\s+(${monthPattern})(?:\\s+(\\d{4}))?\\s+at\\s+(\\d{1,2}):(\\d{2})(?:\\s*(am|pm))?`, 'i');
  const matchA = clean.match(dateAtTimeRegex);
  if (matchA && matchA[1] && matchA[2] && matchA[4] && matchA[5]) {
    const day = parseInt(matchA[1], 10);
    const monthStr = matchA[2].toLowerCase();
    const year = matchA[3] ? parseInt(matchA[3], 10) : referenceTime.getFullYear();
    let hrs = parseInt(matchA[4], 10);
    const mins = parseInt(matchA[5], 10);
    const meridiem = matchA[6]?.toLowerCase();
    if (meridiem === 'pm' && hrs < 12) hrs += 12;
    if (meridiem === 'am' && hrs === 12) hrs = 0;

    const monthIndex = monthNames.findIndex((m) => monthStr.startsWith(m.slice(0, 3))) % 12;
    const date = new Date(year, monthIndex, day, hrs, mins, 0, 0);
    return { date, formattedIST: formatToIST(date) };
  }

  // Format B: "August 14 at 12:11"
  const monthAtTimeRegex = new RegExp(`(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\s+at\\s+(\\d{1,2}):(\\d{2})(?:\\s*(am|pm))?`, 'i');
  const matchB = clean.match(monthAtTimeRegex);
  if (matchB && matchB[1] && matchB[2] && matchB[4] && matchB[5]) {
    const monthStr = matchB[1].toLowerCase();
    const day = parseInt(matchB[2], 10);
    const year = matchB[3] ? parseInt(matchB[3], 10) : referenceTime.getFullYear();
    let hrs = parseInt(matchB[4], 10);
    const mins = parseInt(matchB[5], 10);
    const meridiem = matchB[6]?.toLowerCase();
    if (meridiem === 'pm' && hrs < 12) hrs += 12;
    if (meridiem === 'am' && hrs === 12) hrs = 0;

    const monthIndex = monthNames.findIndex((m) => monthStr.startsWith(m.slice(0, 3))) % 12;
    const date = new Date(year, monthIndex, day, hrs, mins, 0, 0);
    return { date, formattedIST: formatToIST(date) };
  }

  // 7. "Just now" or "Recently"
  if (lower.includes('just now') || lower.includes('recently')) {
    return { date: referenceTime, formattedIST: formatToIST(referenceTime) };
  }

  // 8. Try native Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed, formattedIST: formatToIST(parsed) };
  }

  return { date: referenceTime, formattedIST: formatToIST(referenceTime) };
}


