import { RentalListing } from '../types';

/**
 * Calculates Jaccard character 3-gram similarity between two text snippets.
 */
function calculateTextSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const getNGrams = (str: string, n = 3) => {
    const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const set = new Set<string>();
    for (let i = 0; i <= clean.length - n; i++) {
      set.add(clean.slice(i, i + n));
    }
    return set;
  };

  const setA = getNGrams(a);
  const setB = getNGrams(b);
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  setA.forEach((item) => {
    if (setB.has(item)) intersection++;
  });

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Determines whether two rental listings are duplicate cross-posts.
 */
export function areDuplicates(a: RentalListing, b: RentalListing): boolean {
  // 1. Exact Facebook Post ID
  if (a.fbPostId === b.fbPostId) return true;

  // 2. Same contact phone number & similar location/society
  if (a.entities.contactPhone && b.entities.contactPhone) {
    if (a.entities.contactPhone === b.entities.contactPhone) {
      if (a.entities.rent && b.entities.rent && a.entities.rent === b.entities.rent) {
        return true;
      }
      if (a.entities.societyName && b.entities.societyName && a.entities.societyName === b.entities.societyName) {
        return true;
      }
    }
  }

  // 3. Same author name and high text similarity
  if (
    a.authorName !== 'Facebook Member' &&
    b.authorName !== 'Facebook Member' &&
    a.authorName.toLowerCase() === b.authorName.toLowerCase()
  ) {
    const similarity = calculateTextSimilarity(a.rawText, b.rawText);
    if (similarity > 0.70) return true;
  }

  // 4. Very high text similarity across entire post body
  const rawSimilarity = calculateTextSimilarity(a.rawText, b.rawText);
  if (rawSimilarity > 0.88) return true;

  return false;
}

/**
 * Merges an array of rental listings, consolidating cross-posted duplicates.
 *
 * @param listings - Raw list of listings.
 * @returns Deduplicated list of canonical listings with merged groupNames and postCount.
 */
export function deduplicateListings(listings: RentalListing[]): RentalListing[] {
  const merged: RentalListing[] = [];

  for (const current of listings) {
    const existingIndex = merged.findIndex((m) => areDuplicates(m, current));

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      const groups = new Set<string>([
        existing.groupName,
        ...(existing.groupNames || []),
        current.groupName,
        ...(current.groupNames || []),
      ]);

      const groupNames = Array.from(groups);

      // Merge into canonical listing keeping highest score & most complete entity info
      merged[existingIndex] = {
        ...existing,
        groupNames,
        postCount: groupNames.length,
        // Prefer explicit phone number if available
        entities: {
          ...existing.entities,
          contactPhone: existing.entities.contactPhone || current.entities.contactPhone,
          societyName: existing.entities.societyName || current.entities.societyName,
        },
      };
    } else {
      merged.push({
        ...current,
        groupNames: [current.groupName],
        postCount: 1,
      });
    }
  }

  return merged;
}
