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
  const clean = rawText.trim().toLowerCase();
  const now = referenceTime.getTime();

  // 1. Minutes: "15m", "15 mins", "15 min", "15 minutes ago"
  const minMatch = clean.match(/^(\d+)\s*(?:m|min|mins|minutes?)(?:\s*ago)?$/);
  if (minMatch && minMatch[1]) {
    const mins = parseInt(minMatch[1], 10);
    const date = new Date(now - mins * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 2. Hours: "2h", "2 hrs", "2 hr", "2 hours ago"
  const hrMatch = clean.match(/^(\d+)\s*(?:h|hr|hrs|hours?)(?:\s*ago)?$/);
  if (hrMatch && hrMatch[1]) {
    const hrs = parseInt(hrMatch[1], 10);
    const date = new Date(now - hrs * 60 * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 3. Days: "1d", "2d", "1 day ago"
  const dayMatch = clean.match(/^(\d+)\s*(?:d|day|days?)(?:\s*ago)?$/);
  if (dayMatch && dayMatch[1]) {
    const days = parseInt(dayMatch[1], 10);
    const date = new Date(now - days * 24 * 60 * 60 * 1000);
    return { date, formattedIST: formatToIST(date) };
  }

  // 4. "Just now" or "Recently"
  if (clean.includes('just now') || clean.includes('recently')) {
    return { date: referenceTime, formattedIST: formatToIST(referenceTime) };
  }

  // 5. Try native Date parse
  const parsed = new Date(rawText);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed, formattedIST: formatToIST(parsed) };
  }

  return { date: referenceTime, formattedIST: formatToIST(referenceTime) };
}

