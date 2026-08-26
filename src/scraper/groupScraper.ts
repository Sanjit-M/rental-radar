import { passesAllFilters } from '../domain/parser/filter';
import { extractAllEntities } from '../domain/parser/extractor';
import { calculatePeakScooterCommute } from '../domain/commute/router';
import { computeListingScore } from '../domain/scorer/ratingEngine';
import { cleanPostText, generatePostId, parseFacebookTimestamp } from '../domain/parser/cleaner';
import { listingRepository } from '../db/repository';
import { hasExistingSession, createPersistentContext } from './browserSession';
import { RentalListing, FbPostId, UserListingStatus } from '../domain/types';

/** Target Facebook Group and Recent Chronological Search Sources to monitor. */
export const TARGET_FB_SOURCES = [
  // 1-8: Chronological / Recent Search Feeds for Kadubeesanahalli & PTP Corridors
  {
    name: 'Search: Kadubeesanahalli Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kadubeesanahalli Flatmate',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%20flatmate&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Prestige Tech Park Flat',
    url: 'https://www.facebook.com/search/posts/?q=Prestige%20Tech%20Park%20flat&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: PTP Flat',
    url: 'https://www.facebook.com/search/posts/?q=PTP%20flat&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kadubeesanahalli Room',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%20room&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Cessna Business Park Flatmate',
    url: 'https://www.facebook.com/search/posts/?q=Cessna%20Business%20Park%20flatmate&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Boganahalli Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=Boganahalli%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Panathur PTP Flatmate',
    url: 'https://www.facebook.com/search/posts/?q=Panathur%20PTP%20flatmate&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  // 9-20: Major Active Bangalore Rental Groups
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
  {
    name: 'Flatmates Bangalore East',
    url: 'https://www.facebook.com/groups/flatmatesbangaloreeast/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Rentals Without Broker',
    url: 'https://www.facebook.com/groups/bangalorerentalswithoutbroker/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flats and Flatmates',
    url: 'https://www.facebook.com/groups/bangaloreflatsflatmates/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'ORR Bangalore Rentals',
    url: 'https://www.facebook.com/groups/orrbangalorerentals/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Marathahalli Bellandur Rentals',
    url: 'https://www.facebook.com/groups/marathahallibellandurrentals/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Bachelor Flats',
    url: 'https://www.facebook.com/groups/bangalorebachelorflats/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Prestige Tech Park Rentals',
    url: 'https://www.facebook.com/groups/prestigetechparkrentals/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bellandur / Kadubeesanahalli',
    url: 'https://www.facebook.com/groups/flatsandflatmatesbellandurkadubeesanahalli/?sorting_setting=CHRONOLOGICAL',
  },
];
export const TARGET_FB_GROUPS = TARGET_FB_SOURCES;

/**
 * Pipeline processor: Cleans, filters, extracts, calculates peak commute,
 * scores, and persists a single Facebook rental post.
 */
export async function processPost(
  rawText: string,
  groupName: string,
  authorName: string = 'Anonymous Group Participant',
  postedTime: string = 'Recently',
  postUrl: string = '',
  fbPostIdOverride?: FbPostId,
  initialStatus: UserListingStatus = 'new'
): Promise<RentalListing | null> {
  // Strict check: Require exact direct Facebook post permalink per Q2 (Option A)
  if (!postUrl || (!postUrl.includes('/posts/') && !postUrl.includes('story_fbid=') && !postUrl.includes('/permalink/'))) {
    return null;
  }

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

  // 4. Rating Meter Calculation (Uncapped mathematical score)
  const { score, breakdown, tier } = computeListingScore(entities, commute);

  const fbPostId = fbPostIdOverride || generatePostId(groupName, authorName, clean);

  const listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> = {
    fbPostId,
    groupName,
    postUrl,
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
 * Executes a full headless scrape cycle across all 20 target Facebook sources.
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
    const msg = 'No Facebook session found. Run `pnpm auth` to authenticate your account.';
    await listingRepository.logScrapeRun('no_session', 0, 0, msg);
    return { status: 'no_session', scanned: 0, matched: 0, message: msg };
  }

  try {
    const context = await createPersistentContext(headless);
    const page = await context.newPage();

    for (const source of TARGET_FB_SOURCES) {
      try {
        console.log(`🔍 Scraping source: ${source.name}`);
        await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(3000 + Math.random() * 2000);

        // Detect if redirected to login page or checkpoint
        const currentUrl = page.url();
        const pageTitle = await page.title();
        if (currentUrl.includes('login') || currentUrl.includes('checkpoint') || pageTitle.toLowerCase().includes('log in')) {
          console.warn(`⚠️ Facebook session invalid or login required when accessing ${source.name}.`);
          continue;
        }

        // Scroll gently 3 times to load dynamic feed content
        for (let i = 0; i < 3; i++) {
          await page.mouse.wheel(0, 1200);
          await page.waitForTimeout(2000 + Math.random() * 1000);
        }

        // Expand any truncated "See more" text buttons before extracting
        try {
          const seeMoreButtons = await page.$$('div[role="button"]:has-text("See more"), div[role="button"]:has-text("See More"), span:has-text("See more")');
          for (const btn of seeMoreButtons.slice(0, 15)) {
            try {
              await btn.click({ timeout: 500 });
            } catch {
              // Ignore unclickable buttons
            }
          }
        } catch {
          // Ignore failure to expand buttons
        }

        const elements = await page.$$('[role="feed"] > div, [role="article"], div[data-ad-preview="message"], div[data-pagelet*="FeedUnit"], div[class*="x1yztbdb"]');
        for (const el of elements) {
          scannedCount++;
          try {
            const text = await el.innerText();
            if (!text || text.trim().length < 35) continue;

            const lowerText = text.toLowerCase();

            // 1. Author Name Extraction (Prioritize real name, fallback to Anonymous Group Participant if masked)
            let authorName = 'Anonymous Group Participant';
            if (
              lowerText.includes('anonymous participant') ||
              lowerText.includes('anonymous post') ||
              lowerText.includes('anonymous member')
            ) {
              authorName = 'Anonymous Group Participant';
            } else {
              const authorEl = await el.$(
                'h2 a, h3 a, h4 a, a[role="link"] > span, strong > span, a[attributionsrc] span, span[dir="auto"] strong'
              );
              if (authorEl) {
                const nameText = (await authorEl.innerText()).trim();
                if (nameText && nameText.length > 1 && !nameText.toLowerCase().includes('sponsored') && !nameText.toLowerCase().includes('suggested')) {
                  authorName = nameText;
                }
              }
            }

            // 2. Exact Post Time & Absolute IST Conversion
            let postedTimeRaw = 'Recently';
            const abbrEl = await el.$('abbr');
            if (abbrEl) {
              const utime = await abbrEl.getAttribute('data-utime');
              if (utime) {
                postedTimeRaw = utime;
              } else {
                const abbrText = (await abbrEl.innerText()).trim();
                if (abbrText) postedTimeRaw = abbrText;
              }
            } else {
              const timeEl = await el.$(
                'a[href*="/posts/"] span, a[href*="/permalink/"] span, a[href*="story_fbid="] span, span[id*="jsc_c"]'
              );
              if (timeEl) {
                const timeText = (await timeEl.innerText()).trim();
                if (timeText && timeText.length > 0) {
                  postedTimeRaw = timeText;
                }
              }
            }

            // Fallback: check if text lines contain publication date (e.g. "· 14 August at 12:11 ·")
            if (postedTimeRaw === 'Recently') {
              const lines = text.split('\n').slice(0, 5);
              for (const line of lines) {
                if (line.match(/\d{1,2}\s+[A-Za-z]+\s+at\s+\d{1,2}:\d{2}|yesterday\s+at\s+\d{1,2}:\d{2}|\d+\s*(?:hrs?|mins?|days?)\s*ago/i)) {
                  postedTimeRaw = line.trim();
                  break;
                }
              }
            }
            const { formattedIST } = parseFacebookTimestamp(postedTimeRaw);

            // 3. Exact Post Permalink Extraction (Clean tracking params)
            let postUrl = '';
            const linkEls = await el.$$(
              'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], a[role="link"]:has(abbr), a[role="link"]:has(span[id*="jsc_c"])'
            );
            for (const link of linkEls) {
              const href = await link.getAttribute('href');
              if (href && (href.includes('/posts/') || href.includes('story_fbid=') || href.includes('/permalink/'))) {
                try {
                  const absoluteHref = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
                  const urlObj = new URL(absoluteHref);
                  urlObj.searchParams.delete('__cft__[0]');
                  urlObj.searchParams.delete('__tn__');
                  urlObj.searchParams.delete('eid');
                  urlObj.searchParams.delete('rdid');
                  postUrl = urlObj.toString();
                  if (postUrl) break;
                } catch {
                  postUrl = href.split('?')[0];
                  if (postUrl) break;
                }
              }
            }

            // Strict Post-Only Filter per Q2 (Option A): Drop if no direct post permalink
            if (!postUrl) {
              continue;
            }

            const matched = await processPost(text, source.name, authorName, formattedIST, postUrl);
            if (matched) {
              matchedCount++;
              console.log(`  ✨ Matched: [${matched.score} pts] ${matched.authorName} - ${matched.entities.societyName || matched.location} (${matched.bhkType}) [${matched.postedTime}]`);
            }
          } catch {
            // Skip broken individual elements
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error scraping source ${source.name}:`, message);
      }
    }

    await context.close();
    const finalStatus = scannedCount > 0 ? 'success' : 'no_posts_found';
    await listingRepository.logScrapeRun(finalStatus, scannedCount, matchedCount);
    return { status: finalStatus, scanned: scannedCount, matched: matchedCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await listingRepository.logScrapeRun('error', scannedCount, matchedCount, message);
    return { status: 'error', error: message, scanned: scannedCount, matched: matchedCount };
  }
}


