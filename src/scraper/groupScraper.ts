import { passesAllFilters, isValidLocation, isValidBHK } from '../domain/parser/filter';
import { extractAllEntities } from '../domain/parser/extractor';
import { calculatePeakScooterCommute } from '../domain/commute/router';
import { computeListingScore } from '../domain/scorer/ratingEngine';
import { cleanPostText, generatePostId, parseFacebookTimestamp, extractAuthorFromText } from '../domain/parser/cleaner';
import { listingRepository } from '../db/repository';
import { hasExistingSession, createPersistentContext, enableFastNetworkInterception } from './browserSession';
import { RentalListing, FbPostId, UserListingStatus, BHKType } from '../domain/types';
import { scrapePublicTelegramChannels } from './telegramScraper';
import { fetchFacebookViaApify } from './apifyFacebookScraper';

/** Target Facebook Group and Recent Chronological Search Sources strictly for core perimeter. */
export const TARGET_FB_SOURCES = [
  // Core Chronological Search Feeds across the 5 target localities
  {
    name: 'Search: Kadubeesanahalli 1BHK',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%201BHK&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kadubeesanahalli 2BHK',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%202BHK&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kadubeesanahalli 3BHK',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%203BHK&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kadubeesanahalli Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kadubeesanahalli Flatmate',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%20flatmate&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kadubeesanahalli Bachelor Flat',
    url: 'https://www.facebook.com/search/posts/?q=Kadubeesanahalli%20bachelor%20flat&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Prestige Tech Park Flat',
    url: 'https://www.facebook.com/search/posts/?q=Prestige%20Tech%20Park%20flat&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Prestige Tech Park 1BHK 2BHK',
    url: 'https://www.facebook.com/search/posts/?q=Prestige%20Tech%20Park%201BHK%202BHK&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Prestige Tech Park Flatmate',
    url: 'https://www.facebook.com/search/posts/?q=Prestige%20Tech%20Park%20flatmate&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: PTP Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=PTP%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: PTP Back Gate Flat',
    url: 'https://www.facebook.com/search/posts/?q=PTP%20Back%20Gate%20flat&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Cessna Business Park Flatmate',
    url: 'https://www.facebook.com/search/posts/?q=Cessna%20Business%20Park%20flatmate&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Cessna Park Flat for Rent',
    url: 'https://www.facebook.com/search/posts/?q=Cessna%20Park%20flat%20for%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Devarabisanahalli Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=Devarabisanahalli%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Devarabisanahalli 1BHK 2BHK',
    url: 'https://www.facebook.com/search/posts/?q=Devarabisanahalli%201BHK%202BHK&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Boganahalli Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=Boganahalli%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Bhoganahalli Flat PTP',
    url: 'https://www.facebook.com/search/posts/?q=Bhoganahalli%20flat%20PTP&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kariyammana Agrahara Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=Kariyammana%20Agrahara%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Kariyammana Agrahara 1BHK 2BHK',
    url: 'https://www.facebook.com/search/posts/?q=Kariyammana%20Agrahara%201BHK%202BHK&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Marathahalli Near PTP Flat Rent',
    url: 'https://www.facebook.com/search/posts/?q=Marathahalli%20near%20PTP%20flat%20rent&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },
  {
    name: 'Search: Marathahalli 1BHK Rent PTP',
    url: 'https://www.facebook.com/search/posts/?q=Marathahalli%201BHK%20rent%20PTP&filters=eyJycF9jaHJvbm9fc29ydDoiIntcIm5hbWVcIjpcImNocm9ub3NvcnRcIn0ifQ%3D%3D',
  },

  // Active Core Groups
  {
    name: 'Flats and Flatmates Kadubeesanahalli / PTP',
    url: 'https://www.facebook.com/groups/1265072124774804/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flat and Flatmates Bangalore',
    url: 'https://www.facebook.com/groups/flatandflatmatesbangalore/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats Without Brokers Bangalore',
    url: 'https://www.facebook.com/groups/flatswithoutbrokersbangalore/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flatmates',
    url: 'https://www.facebook.com/groups/bangaloreflatmates/?sorting_setting=CHRONOLOGICAL',
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
  authorName: string = 'Facebook Group Member',
  postedTime: string = 'Recently',
  postUrl: string = '',
  createdAtISO?: string,
  fbPostIdOverride?: FbPostId,
  initialStatus: UserListingStatus = 'new',
  imageUrls?: string[],
  bypassFilters: boolean = false
): Promise<RentalListing | null> {
  const clean = cleanPostText(rawText);

  let location = 'Kadubeesanahalli';
  let bhkType: BHKType = '2 BHK (Shared/Full)';

  // 1. Filter Validation via Result monad
  const filterResult = passesAllFilters(clean);
  if (filterResult._tag === 'ok') {
    location = filterResult.value.location;
    bhkType = filterResult.value.bhkType;
  } else if (!bypassFilters) {
    return null;
  } else {
    // Best-effort fallback when bypassing filters
    const locMatch = isValidLocation(clean);
    if (locMatch._tag === 'ok') location = locMatch.value;
    const bhkMatch = isValidBHK(clean);
    if (bhkMatch._tag === 'ok') bhkType = bhkMatch.value;
  }

  // 2. Entity Extraction with image attachments
  const entities = extractAllEntities(clean, imageUrls);

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
  const finalPostUrl = postUrl || `https://www.facebook.com/groups/posts/${fbPostId}`;
  const images = entities.imageUrls || imageUrls || [];
  const title = `${bhkType} in ${entities.societyName || location}`;
  const summary = clean.slice(0, 250);

  const listing: Omit<RentalListing, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string | undefined } = {
    fbPostId,
    groupName,
    postUrl: finalPostUrl,
    authorName,
    postedTime,
    rawText: clean,
    location,
    landmark: entities.landmark || undefined,
    title,
    summary,
    imageUrls: images.length > 0 ? images : undefined,
    bhkType,
    entities,
    commute,
    score,
    scoreBreakdown: breakdown,
    tier,
    userStatus: initialStatus,
    createdAt: createdAtISO,
  };

  return listingRepository.upsertListing(listing);
}

/**
 * Scrapes a single target Facebook source using a dedicated worker page.
 */
async function scrapeSourceWorker(
  source: { name: string; url: string },
  page: any,
  seenUrls: Set<string>
): Promise<{ scanned: number; matched: number }> {
  let scanned = 0;
  let matched = 0;

  try {
    console.log(`🔍 [Worker] Scraping: ${source.name}`);
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);

    // Detect if redirected to dedicated login page or checkpoint
    const currentUrl = page.url();
    if (currentUrl.includes('/login.php') || currentUrl.includes('/checkpoint/')) {
      console.warn(`⚠️ [Worker] Facebook session invalid or login required for ${source.name}.`);
      return { scanned: 0, matched: 0 };
    }

    // Dismiss any login or cookie modal overlay if present
    try {
      const closeBtn = await page.$('div[aria-label="Close"], [aria-label="Decline optional cookies"], [aria-label="Allow all cookies"]');
      if (closeBtn) await closeBtn.click({ timeout: 1000 });
    } catch {
      // Ignore
    }

    // Scroll 12 times smoothly to load deep virtualized feed content (covering 7-10 days)
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(900);

      // Expand visible "See more" text buttons on every 3rd scroll
      if (i % 3 === 0) {
        try {
          const seeMoreButtons = await page.$$('div[role="button"]:has-text("See more"), span:has-text("See more")');
          for (const btn of seeMoreButtons.slice(0, 8)) {
            await btn.click({ timeout: 300 }).catch(() => {});
          }
        } catch {
          // Ignore
        }
      }
    }

    // Final pass to expand remaining "See more" buttons
    try {
      const seeMoreButtons = await page.$$('div[role="button"]:has-text("See more"), span:has-text("See more")');
      for (const btn of seeMoreButtons.slice(0, 15)) {
        await btn.click({ timeout: 300 }).catch(() => {});
      }
    } catch {
      // Ignore
    }

    // Two-Tier DOM Extraction:
    // Tier 1: Primary semantic containers
    let elements = await page.$$(
      'div[data-pagelet*="Feed"] div[role="feed"] > div, [role="feed"] > div, [role="article"], div[data-ad-preview="message"], div[class*="x1yztbdb"]'
    );

    // Tier 2: Anchor-Anchored fallback if primary container returns 0 elements
    if (!elements || elements.length === 0) {
      const anchorParents = await page.$$eval(
        'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="]',
        (anchors: any[]) => anchors.map((a: any) => a.closest('div[role="article"], div[role="main"] > div > div > div > div, div[class*="x1yztbdb"]')).filter(Boolean)
      );
      if (anchorParents && anchorParents.length > 0) {
        elements = await page.$$('div[role="article"], div[role="main"] > div > div > div > div');
      }
    }

    const pageTitle = await page.title().catch(() => '');
    console.log(`🔍 [Worker] ${source.name} | DOM Elements: ${elements.length} | Title: "${pageTitle}" | URL: ${page.url()}`);

    for (const el of elements) {
      scanned++;
      try {
        const text = await el.innerText().catch(() => '');
        if (!text || text.trim().length < 35) continue;

        // 1. Author Name Extraction (Two-Tier Resolution)
        let authorName = '';
        const authorEl = await el.$(
          'h2 a, h3 a, h4 a, a[role="link"] > span[dir="auto"], strong > span, a[attributionsrc] span, span[dir="auto"] strong'
        );
        if (authorEl) {
          const nameText = (await authorEl.innerText().catch(() => '')).trim();
          if (
            nameText &&
            nameText.length > 1 &&
            !nameText.toLowerCase().includes('sponsored') &&
            !nameText.toLowerCase().includes('suggested') &&
            !nameText.toLowerCase().includes('anonymous')
          ) {
            authorName = nameText;
          }
        }

        if (!authorName) {
          authorName = extractAuthorFromText(text) || 'Facebook Group Member';
        }

        // 2. Exact Post Time & Absolute IST Conversion
        let postedTimeRaw: string | null = null;
        const timeAnchors = await el.$$(
          'a[role="link"][aria-label], a[href*="/posts/"][aria-label], a[href*="/permalink/"][aria-label], a[href*="story_fbid="][aria-label], a[aria-label]'
        );
        for (const anchor of timeAnchors) {
          const label = await anchor.getAttribute('aria-label');
          if (label && (/\d/.test(label) || label.includes('Yesterday') || label.includes('ago') || label.includes('at') || label.includes('m') || label.includes('h') || label.includes('d'))) {
            postedTimeRaw = label;
            break;
          }
        }

        if (!postedTimeRaw) {
          const abbrEl = await el.$('abbr');
          if (abbrEl) {
            postedTimeRaw = (await abbrEl.getAttribute('title')) || (await abbrEl.getAttribute('data-utime')) || (await abbrEl.innerText().catch(() => ''));
          }
        }

        if (!postedTimeRaw) {
          const lines = text.split('\n').slice(0, 5);
          for (const line of lines) {
            if (line.match(/\d{1,2}\s+[A-Za-z]+\s+at\s+\d{1,2}:\d{2}|yesterday\s+at\s+\d{1,2}:\d{2}|\d+\s*(?:hrs?|mins?|days?|m|h|d)\s*ago/i)) {
              postedTimeRaw = line.trim();
              break;
            }
          }
        }

        // Option A Strict Drop: If no verifiable publication timestamp found, reject post
        if (!postedTimeRaw) continue;

        const parsedTimestamp = parseFacebookTimestamp(postedTimeRaw);
        if (!parsedTimestamp) continue;

        // Ingestion-Time 7-Day Cutoff: Drop posts older than 7 days (168 hours)
        const postAgeMillis = Date.now() - parsedTimestamp.date.getTime();
        const maxAgeMillis = 7 * 24 * 60 * 60 * 1000;
        if (postAgeMillis > maxAgeMillis) continue;

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

        // Extract photo attachments (up to 10 property images, excluding profile avatars & icons)
        const imageUrls: string[] = [];
        const seenImgSrcs = new Set<string>();
        try {
          // Extract from all image elements within the post element
          const imgEls = await el.$$('img, [role="img"] img, div[class*="scaledImageFit"] img, a[href*="/photo"] img');
          for (const img of imgEls) {
            const src = await img.getAttribute('src');
            if (
              src &&
              (src.includes('fbcdn') || src.includes('scontent') || src.startsWith('http')) &&
              !src.includes('emoji') &&
              !src.includes('rsrc.php') &&
              !src.includes('static.xx') &&
              !src.includes('/p48x48/') &&
              !src.includes('/p50x50/') &&
              !src.includes('/s100x100/') &&
              !src.includes('/s150x150/') &&
              !src.includes('/p160x160/')
            ) {
              if (!seenImgSrcs.has(src) && imageUrls.length < 10) {
                seenImgSrcs.add(src);
                imageUrls.push(src);
              }
            }
          }
        } catch {
          // Ignore
        }

        const effectivePostUrl = postUrl || `https://www.facebook.com/groups/posts/fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Atomic deduplication check
        if (seenUrls.has(effectivePostUrl)) continue;
        seenUrls.add(effectivePostUrl);

        const matchedListing = await processPost(
          text,
          source.name,
          authorName,
          parsedTimestamp.formattedIST,
          effectivePostUrl,
          parsedTimestamp.date.toISOString(),
          undefined,
          'new',
          imageUrls
        );

        if (matchedListing) {
          matched++;
          console.log(`  ✨ Matched: [${matchedListing.score} pts] ${matchedListing.authorName} - ${matchedListing.entities.societyName || matchedListing.location} (${matchedListing.bhkType}) [${matchedListing.postedTime}]`);
        }
      } catch {
        // Skip broken elements
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`⚠️ [Worker] Error on ${source.name}:`, message);
  }

  return { scanned, matched };
}

/**
 * Executes a full multi-source rental ingestion cycle:
 * 1. Public Telegram Channels (Zero-Auth, 100% open).
 * 2. Facebook Groups via Apify Indian Residential Proxies (if APIFY_API_TOKEN configured).
 * 3. Local/CI Playwright 4-Worker Concurrent Pool across target Facebook sources.
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
  const startTime = Date.now();
  const seenUrls = new Set<string>();

  console.log('🔄 [Rental Radar] Starting Multi-Source Ingestion Cycle...');

  // Phase 1: Public Telegram Channels Ingestion
  try {
    console.log('📱 [Multi-Source] Scraping open Bangalore Telegram rental channels...');
    const telegramPosts = await scrapePublicTelegramChannels();
    console.log(`📱 [Telegram] Retrieved ${telegramPosts.length} recent posts from public channels.`);

    for (const post of telegramPosts) {
      if (seenUrls.has(post.postUrl)) continue;
      seenUrls.add(post.postUrl);
      scannedCount++;

      const matchedListing = await processPost(
        post.rawText,
        post.groupName,
        post.authorName,
        post.postedTime,
        post.postUrl,
        undefined,
        undefined,
        'new',
        post.imageUrls
      );

      if (matchedListing) {
        matchedCount++;
        console.log(
          `  ✨ [Telegram Match]: [${matchedListing.score} pts] ${matchedListing.authorName} - ${matchedListing.entities.societyName || matchedListing.location} (${matchedListing.bhkType}) [${matchedListing.postedTime}]`
        );
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [Telegram] Error during Telegram channel ingestion:', err?.message || String(err));
  }

  // Phase 2: Apify Facebook Ingestion via Indian Residential Proxies (if configured)
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (apifyToken && apifyToken.trim() !== '') {
    try {
      console.log('🌐 [Multi-Source] Ingesting Facebook groups via Apify Indian Residential Proxies...');
      const apifyPosts = await fetchFacebookViaApify(apifyToken);

      for (const post of apifyPosts) {
        if (seenUrls.has(post.postUrl)) continue;
        seenUrls.add(post.postUrl);
        scannedCount++;

        const matchedListing = await processPost(
          post.rawText,
          post.groupName,
          post.authorName,
          post.postedTime,
          post.postUrl,
          undefined,
          undefined,
          'new',
          post.imageUrls
        );

        if (matchedListing) {
          matchedCount++;
          console.log(
            `  ✨ [Apify FB Match]: [${matchedListing.score} pts] ${matchedListing.authorName} - ${matchedListing.entities.societyName || matchedListing.location} (${matchedListing.bhkType}) [${matchedListing.postedTime}]`
          );
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [Apify] Error during Apify Facebook ingestion:', err?.message || String(err));
    }
  }

  // Phase 3: Playwright 4-Worker Concurrent Browser Pool
  if (hasExistingSession()) {
    try {
      const context = await createPersistentContext(headless);
      const NUM_WORKERS = 4;
      const sourcesQueue = [...TARGET_FB_SOURCES];

      console.log(`🚀 [Playwright] Launching ${NUM_WORKERS} concurrent worker tabs across ${sourcesQueue.length} target Facebook sources...`);

      const workerPromises = Array.from({ length: NUM_WORKERS }, async () => {
        const page = await context.newPage();
        await enableFastNetworkInterception(page);

        while (sourcesQueue.length > 0) {
          const source = sourcesQueue.shift();
          if (!source) break;

          const res = await scrapeSourceWorker(source, page, seenUrls);
          scannedCount += res.scanned;
          matchedCount += res.matched;
        }

        await page.close().catch(() => {});
      });

      await Promise.all(workerPromises);
      await context.close().catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('⚠️ [Playwright] Error during browser scrape:', message);
    }
  } else {
    console.log('ℹ️ [Playwright] No local Facebook session cookies found; skipping direct Playwright browser crawl.');
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Completed multi-source scrape cycle in ${elapsedSec}s. Total Scanned: ${scannedCount}, Matched: ${matchedCount}`);

  const finalStatus = scannedCount > 0 ? 'success' : 'no_posts_found';
  await listingRepository.logScrapeRun(finalStatus, scannedCount, matchedCount);
  return { status: finalStatus, scanned: scannedCount, matched: matchedCount };
}



