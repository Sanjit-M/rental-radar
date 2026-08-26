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
