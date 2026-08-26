import { passesAllFilters } from '../domain/parser/filter';
import { extractAllEntities } from '../domain/parser/extractor';
import { calculatePeakScooterCommute } from '../domain/commute/router';
import { computeListingScore } from '../domain/scorer/ratingEngine';
import { cleanPostText, generatePostId } from '../domain/parser/cleaner';
import { listingRepository } from '../db/repository';
import { hasExistingSession, createPersistentContext } from './browserSession';
import { SEED_POSTS } from './seedData';
import { RentalListing, FbPostId, UserListingStatus } from '../domain/types';

/** Target Facebook Group URLs to monitor. */
export const TARGET_FB_GROUPS = [
  {
    name: 'Flat and Flatmates Bangalore',
    url: 'https://www.facebook.com/groups/flatandflatmatesbangalore/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flatmates',
    url: 'https://www.facebook.com/groups/bangaloreflatmates/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats Without Brokers Bangalore',
    url: 'https://www.facebook.com/groups/flatswithoutbrokerbangalore/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Kadubeesanahalli',
    url: 'https://www.facebook.com/groups/kadubeesanahalliflats/?sorting_setting=CHRONOLOGICAL',
  },
];

/**
 * Pipeline processor: Cleans, filters, extracts, calculates peak commute,
 * scores, and persists a single Facebook rental post.
 *
 * @param rawText - Raw post body text.
 * @param groupName - Name of the source group.
 * @param authorName - Author name or fallback.
 * @param postedTime - When the post was published (e.g. "2h ago").
 * @param postUrl - Direct permalink URL.
 * @param fbPostIdOverride - Optional explicit FbPostId.
 * @param initialStatus - Initial pipeline tracking status.
 * @returns Persisted RentalListing entity or null if filtered out.
 */
export async function processPost(
  rawText: string,
  groupName: string,
  authorName: string = 'Facebook Member',
  postedTime: string = 'Recently',
  postUrl: string = '',
  fbPostIdOverride?: FbPostId,
  initialStatus: UserListingStatus = 'new'
): Promise<RentalListing | null> {
  const clean = cleanPostText(rawText);

  // 1. Filter Validation via Result monad
  const filterResult = passesAllFilters(clean);
  if (filterResult._tag === 'err') {
    return null;
  }

  const { location, bhkType } = filterResult.value;

  // 2. Entity Extraction
  const entities = extractAllEntities(clean);

  // 3. Weekday Peak Commute Simulation
  const commute = calculatePeakScooterCommute(
    entities.societyLat,
    entities.societyLon,
    location,
    entities.isKadubeesanahalliDirect
  );

  // 4. Rating Meter Calculation
  const { score, breakdown, tier } = computeListingScore(entities, commute);

  const fbPostId = fbPostIdOverride || generatePostId(groupName, authorName, clean);

  const listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> = {
    fbPostId,
    groupName,
    postUrl: postUrl || `https://facebook.com/groups/search/?q=${encodeURIComponent(location)}`,
    authorName,
    postedTime,
    rawText: clean,
    location,
    bhkType,
    entities,
    commute,
    score,
    scoreBreakdown: breakdown,
    tier,
    userStatus: initialStatus,
  };

  return listingRepository.upsertListing(listing);
}

/**
 * Seeds initial realistic Kadubeesanahalli / PTP accommodation fixtures.
 *
 * @returns Count of seeded listings.
 */
export async function seedInitialData(): Promise<number> {
  let count = 0;
  for (const item of SEED_POSTS) {
    const result = await processPost(
      item.text,
      item.groupName,
      item.authorName,
      item.postedTime,
      item.postUrl,
      item.fbPostId as unknown as FbPostId,
      item.userStatus
    );
    if (result) count++;
  }
  return count;
}

/**
 * Executes a full headless scrape cycle across all target Facebook groups.
 *
 * @param headless - Whether to run Chromium headlessly.
 * @returns Scrape summary statistics.
 */
export async function runScrapeCycle(headless: boolean = true): Promise<{
  status: string;
  scanned: number;
  matched: number;
  message?: string;
  error?: string;
}> {
  let scannedCount = 0;
  let matchedCount = 0;

  if (!hasExistingSession()) {
    console.log('⚠️ No saved Facebook session profile found. Seeding realistic sample listings...');
    matchedCount = await seedInitialData();
    const msg = 'No Facebook session found. Loaded realistic seed listings. Run `pnpm auth` to authenticate your account.';
    await listingRepository.logScrapeRun('seed_loaded', SEED_POSTS.length, matchedCount, msg);
    return { status: 'seed_loaded', scanned: SEED_POSTS.length, matched: matchedCount, message: msg };
  }

  try {
    const context = await createPersistentContext(headless);
    const page = await context.newPage();

    for (const group of TARGET_FB_GROUPS) {
      try {
        console.log(`🔍 Scraping group: ${group.name}`);
        await page.goto(group.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(3000 + Math.random() * 2000);

        // Scroll gently 3 times
        for (let i = 0; i < 3; i++) {
          await page.mouse.wheel(0, 1200);
          await page.waitForTimeout(2000 + Math.random() * 1000);
        }

        const elements = await page.$$('[role="feed"] > div, [role="article"], div[data-ad-preview="message"]');
        for (const el of elements) {
          scannedCount++;
          try {
            const text = await el.innerText();
            if (!text || text.trim().length < 35) continue;

            // Extract Author Name
            let authorName = 'Facebook Member';
            const authorEl = await el.$('h2 strong, h3 strong, a[role="link"] > strong, span[dir="auto"] strong');
            if (authorEl) {
              const nameText = await authorEl.innerText();
              if (nameText && nameText.trim().length > 1) {
                authorName = nameText.trim();
              }
            }

            // Extract Post Time
            let postedTime = 'Recently';
            const timeEl = await el.$('abbr, a[href*="/posts/"] span, a[href*="/permalink/"] span, span[id*="jsc_c"]');
            if (timeEl) {
              const timeText = await timeEl.innerText();
              if (timeText && timeText.trim().length > 0) {
                postedTime = timeText.trim();
              }
            }

            // Extract Permalink
            let postUrl = '';
            const linkEl = await el.$('a[href*="/posts/"], a[href*="/permalink/"]');
            if (linkEl) {
              const href = await linkEl.getAttribute('href');
              if (href) postUrl = href.split('?')[0];
            }

            const matched = await processPost(text, group.name, authorName, postedTime, postUrl);
            if (matched) matchedCount++;
          } catch {
            // Skip broken individual elements
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error scraping group ${group.name}:`, message);
      }
    }

    await context.close();
    await listingRepository.logScrapeRun('success', scannedCount, matchedCount);
    return { status: 'success', scanned: scannedCount, matched: matchedCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await listingRepository.logScrapeRun('error', scannedCount, matchedCount, message);
    return { status: 'error', error: message, scanned: scannedCount, matched: matchedCount };
  }
}
