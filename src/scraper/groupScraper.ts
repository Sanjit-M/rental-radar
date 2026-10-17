import type { Page, ElementHandle } from 'playwright';
import { passesAllFilters, isValidLocation, isValidBHK } from '../domain/parser/filter';
import { extractAllEntities } from '../domain/parser/extractor';
import { calculatePeakScooterCommute } from '../domain/commute/router';
import { computeListingScore } from '../domain/scorer/ratingEngine';
import { cleanPostText, generatePostId, parseFacebookTimestamp, extractAuthorFromText, extractDateFromPostText } from '../domain/parser/cleaner';
import { listingRepository } from '../db/repository';
import { hasExistingSession, createPersistentContext, enableFastNetworkInterception } from './browserSession';
import { RentalListing, FbPostId, UserListingStatus, BHKType } from '../domain/types';

/** Target Facebook Group and Recent Chronological Search Sources strictly for core perimeter. */
export const TARGET_FB_SOURCES = [
  // Core Chronological Search Feeds across the target localities
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

  // 25 Active High-Traffic Bangalore Flatmate Facebook Groups (All Chronological)
  {
    name: 'Flat and Flatmates Bellandur, Kadubeesanahalli (200k)',
    url: 'https://www.facebook.com/groups/591413389157630/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flat and Flatmates Bangalore (145k)',
    url: 'https://www.facebook.com/groups/507116087403813/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bengaluru (130k)',
    url: 'https://www.facebook.com/groups/flatsandflatmatesbangaluru/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Find My Room Bangalore (105k)',
    url: 'https://www.facebook.com/groups/findmyroombangalore/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats Without Brokers Bangalore (100k)',
    url: 'https://www.facebook.com/groups/697855465840944/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flat and Flatmates Bangalore (94k)',
    url: 'https://www.facebook.com/groups/329320681157074/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flat and Flatmates Bangalore (86k)',
    url: 'https://www.facebook.com/groups/1703473933213030/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats Without Brokers Bangalore (72k)',
    url: 'https://www.facebook.com/groups/876779221120021/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bangalore (63k)',
    url: 'https://www.facebook.com/groups/1918733344819133/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bengaluru (39k)',
    url: 'https://www.facebook.com/groups/FlatsandFlatmatesBengaluru/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flatmates Community (39k)',
    url: 'https://www.facebook.com/groups/636932320207695/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flat and Flatmates Bangalore (39k)',
    url: 'https://www.facebook.com/groups/224322741398603/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bangalore (35k)',
    url: 'https://www.facebook.com/groups/184612851933582/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Rentals & Flatmates (35k)',
    url: 'https://www.facebook.com/groups/147988655894011/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bangalore (33k)',
    url: 'https://www.facebook.com/groups/434238014108725/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flat Seekers & Offers (32k)',
    url: 'https://www.facebook.com/groups/1402333569809567/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats Without Broker Bangalore (31k)',
    url: 'https://www.facebook.com/groups/380069852631811/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flat & Roommates (27k)',
    url: 'https://www.facebook.com/groups/929554973876448/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flat and Flatmates Bangalore (27k)',
    url: 'https://www.facebook.com/groups/193688959165052/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bangalore (24k)',
    url: 'https://www.facebook.com/groups/513083563341035/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flatmates Bangalore (23k)',
    url: 'https://www.facebook.com/groups/1110321379331221/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flats & Rooms (23k)',
    url: 'https://www.facebook.com/groups/867324518317770/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bangalore (22k)',
    url: 'https://www.facebook.com/groups/781559679246306/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Bangalore Flatmates Community (21k)',
    url: 'https://www.facebook.com/groups/650663023927752/?sorting_setting=CHRONOLOGICAL',
  },
  {
    name: 'Flats and Flatmates Bangalore (21k)',
    url: 'https://www.facebook.com/groups/457653071101288/?sorting_setting=CHRONOLOGICAL',
  },
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

  // Reject stale posts from past years (2025, 2024, 2023) or past months/years
  if (/\b202[0-5]\b/.test(clean) || /\b\d+\s+(?:months?|years?)\s+ago\b/i.test(clean)) {
    return null;
  }

  // Reject posts older than 7 days if createdAtISO is explicit
  if (createdAtISO) {
    const postDate = new Date(createdAtISO);
    if (!isNaN(postDate.getTime()) && Date.now() - postDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
  }

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
  if (
    !postUrl ||
    !postUrl.startsWith('https://www.facebook.com/') ||
    postUrl.includes('fb_') ||
    postUrl.includes('manual_') ||
    postUrl.includes('seed_')
  ) {
    return null;
  }
  const finalPostUrl = postUrl;
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

async function expandSeeMoreButtons(page: Page, limit: number): Promise<void> {
  try {
    const seeMoreButtons = await page.$$('div[role="button"]:has-text("See more"), span:has-text("See more")');
    await Promise.all(
      seeMoreButtons.slice(0, limit).map((btn) => btn.click({ timeout: 300 }).catch(() => {}))
    );
  } catch {
    // Ignore
  }
}

async function scrollFeedStep(page: Page, stepIndex: number, totalSteps: number): Promise<void> {
  if (stepIndex >= totalSteps) return;
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(900);
  if (stepIndex % 3 === 0) {
    await expandSeeMoreButtons(page, 8);
  }
  await scrollFeedStep(page, stepIndex + 1, totalSteps);
}

function resolveCanonicalPostUrl(rawHrefs: ReadonlyArray<string | null>): string {
  for (const rawHref of rawHrefs) {
    if (!rawHref) continue;
    const href = rawHref.startsWith('http') ? rawHref : `https://www.facebook.com${rawHref}`;

    try {
      const urlObj = new URL(href);
      if (!urlObj.hostname.includes('facebook.com')) continue;

      const multiPermalinks = urlObj.searchParams.get('multi_permalinks');
      if (multiPermalinks && /^\d+$/.test(multiPermalinks)) {
        const groupMatch = urlObj.pathname.match(/\/groups\/([^\/?#]+)/);
        if (groupMatch && groupMatch[1]) {
          return `https://www.facebook.com/groups/${groupMatch[1]}/posts/${multiPermalinks}/`;
        }
      }

      const postsMatch = urlObj.pathname.match(/\/groups\/([^\/?#]+)\/posts\/([^\/?#]+)/);
      if (postsMatch && postsMatch[1] && postsMatch[2]) {
        return `https://www.facebook.com/groups/${postsMatch[1]}/posts/${postsMatch[2]}/`;
      }

      const permalinkMatch = urlObj.pathname.match(/\/groups\/([^\/?#]+)\/permalink\/([^\/?#]+)/);
      if (permalinkMatch && permalinkMatch[1] && permalinkMatch[2]) {
        return `https://www.facebook.com/groups/${permalinkMatch[1]}/posts/${permalinkMatch[2]}/`;
      }

      if (urlObj.pathname.includes('permalink.php') && urlObj.searchParams.has('story_fbid')) {
        const storyFbid = urlObj.searchParams.get('story_fbid');
        const id = urlObj.searchParams.get('id');
        if (storyFbid) {
          return id
            ? `https://www.facebook.com/permalink.php?story_fbid=${storyFbid}&id=${id}`
            : `https://www.facebook.com/permalink.php?story_fbid=${storyFbid}`;
        }
      }

      const userPostMatch = urlObj.pathname.match(/^\/([^\/?#]+)\/posts\/([^\/?#]+)/);
      if (
        userPostMatch &&
        userPostMatch[1] &&
        userPostMatch[2] &&
        !['groups', 'events', 'watch', 'marketplace'].includes(userPostMatch[1])
      ) {
        return `https://www.facebook.com/${userPostMatch[1]}/posts/${userPostMatch[2]}/`;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }
  return '';
}

async function processSingleDomElement(
  el: ElementHandle<SVGElement | HTMLElement>,
  sourceName: string,
  seenUrls: Set<string>
): Promise<boolean> {
  try {
    const text = await el.innerText().catch(() => '');
    if (!text || text.trim().length < 35) return false;

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

    let postedTimeRaw: string | null = null;
    const timeAnchors = await el.$$(
      'a[role="link"][aria-label], a[href*="/posts/"][aria-label], a[href*="/permalink/"][aria-label], a[href*="story_fbid="][aria-label], a[aria-label]'
    );
    const ariaLabels = await Promise.all(timeAnchors.map((anchor) => anchor.getAttribute('aria-label')));
    for (const label of ariaLabels) {
      if (
        label &&
        (/\d/.test(label) ||
          label.includes('Yesterday') ||
          label.includes('ago') ||
          label.includes('at') ||
          label.includes('m') ||
          label.includes('h') ||
          label.includes('d'))
      ) {
        postedTimeRaw = label;
        break;
      }
    }

    if (!postedTimeRaw) {
      const abbrEl = await el.$('abbr');
      if (abbrEl) {
        const [titleAttr, utimeAttr, abbrText] = await Promise.all([
          abbrEl.getAttribute('title'),
          abbrEl.getAttribute('data-utime'),
          abbrEl.innerText().catch(() => ''),
        ]);
        postedTimeRaw = titleAttr || utimeAttr || abbrText;
      }
    }

    if (/\b202[0-5]\b/.test(text.slice(0, 500)) || /\b\d+\s+(?:months?|years?)\s+ago\b/i.test(text.slice(0, 500))) {
      return false;
    }

    if (!postedTimeRaw) {
      const fromText = extractDateFromPostText(text);
      if (fromText) {
        const ageMillis = Date.now() - fromText.date.getTime();
        if (ageMillis > 7 * 24 * 60 * 60 * 1000) return false;
        postedTimeRaw = fromText.formattedIST;
      }
    }

    let parsedDate = new Date();
    let formattedPostedTime = 'Recently';

    if (postedTimeRaw) {
      const parsed = parseFacebookTimestamp(postedTimeRaw);
      if (parsed) {
        parsedDate = parsed.date;
        formattedPostedTime = parsed.formattedIST;
        const postAgeMillis = Date.now() - parsedDate.getTime();
        const maxAgeMillis = 7 * 24 * 60 * 60 * 1000;
        if (postAgeMillis > maxAgeMillis) return false;
      }
    }

    const linkEls = await el.$$(
      'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], a[href*="multi_permalinks="], a[role="link"]'
    );
    const rawHrefs = await Promise.all(linkEls.map((link) => link.getAttribute('href')));
    const postUrl = resolveCanonicalPostUrl(rawHrefs);

    if (!postUrl || !postUrl.startsWith('https://www.facebook.com/') || postUrl.includes('fb_')) {
      return false;
    }

    const imageUrls: string[] = [];
    const seenImgSrcs = new Set<string>();
    try {
      const imgEls = await el.$$('img, [role="img"] img, div[class*="scaledImageFit"] img, a[href*="/photo"] img');
      const imgSrcs = await Promise.all(imgEls.map((img) => img.getAttribute('src')));
      for (const src of imgSrcs) {
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

    if (seenUrls.has(postUrl)) return false;
    seenUrls.add(postUrl);

    const matchedListing = await processPost(
      text,
      sourceName,
      authorName,
      formattedPostedTime,
      postUrl,
      parsedDate.toISOString(),
      undefined,
      'new',
      imageUrls
    );

    if (matchedListing) {
      console.log(
        `  ✨ Matched: [${matchedListing.score} pts] ${matchedListing.authorName} - ${matchedListing.entities.societyName || matchedListing.location} (${matchedListing.bhkType}) [${matchedListing.postedTime}]`
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Scrapes a single target Facebook source using a dedicated worker page.
 */
async function scrapeSourceWorker(
  source: { name: string; url: string },
  page: Page,
  seenUrls: Set<string>
): Promise<{ scanned: number; matched: number }> {
  try {
    console.log(`🔍 [Worker] Scraping: ${source.name}`);
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);

    const currentUrl = page.url();
    if (currentUrl.includes('/login.php') || currentUrl.includes('/checkpoint/')) {
      console.warn(`⚠️ [Worker] Facebook session invalid or login required for ${source.name}.`);
      return { scanned: 0, matched: 0 };
    }

    try {
      const closeBtn = await page.$(
        'div[aria-label="Close"], [aria-label="Decline optional cookies"], [aria-label="Allow all cookies"]'
      );
      if (closeBtn) await closeBtn.click({ timeout: 1000 });
    } catch {
      // Ignore
    }

    await scrollFeedStep(page, 0, 12);
    await expandSeeMoreButtons(page, 15);

    let elements = await page.$$(
      'div[data-pagelet*="Feed"] div[role="feed"] > div, [role="feed"] > div, [role="article"], div[data-ad-preview="message"], div[class*="x1yztbdb"]'
    );

    if (!elements || elements.length === 0) {
      const anchorCount = await page.$$eval(
        'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="]',
        (anchors) =>
          anchors
            .map((a) =>
              a.closest('div[role="article"], div[role="main"] > div > div > div > div, div[class*="x1yztbdb"]')
            )
            .filter(Boolean).length
      );
      if (anchorCount > 0) {
        elements = await page.$$('div[role="article"], div[role="main"] > div > div > div > div');
      }
    }

    const pageTitle = await page.title().catch(() => '');
    console.log(`🔍 [Worker] ${source.name} | DOM Elements: ${elements.length} | Title: "${pageTitle}" | URL: ${page.url()}`);

    const matchResults = await Promise.all(
      elements.map((el) => processSingleDomElement(el, source.name, seenUrls))
    );
    return {
      scanned: elements.length,
      matched: matchResults.filter(Boolean).length,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`⚠️ [Worker] Error on ${source.name}:`, message);
    return { scanned: 0, matched: 0 };
  }
}

async function drainSourcesQueue(
  sourcesQueue: Array<{ name: string; url: string }>,
  page: Page,
  seenUrls: Set<string>,
  acc: { scanned: number; matched: number } = { scanned: 0, matched: 0 }
): Promise<{ scanned: number; matched: number }> {
  const source = sourcesQueue.shift();
  if (!source) return acc;
  const res = await scrapeSourceWorker(source, page, seenUrls);
  return drainSourcesQueue(sourcesQueue, page, seenUrls, {
    scanned: acc.scanned + res.scanned,
    matched: acc.matched + res.matched,
  });
}

/**
 * Executes a full multi-source rental ingestion cycle:
 * 1. Public Telegram Channels (Zero-Auth, 100% open).
 * 2. Local/CI Playwright 4-Worker Concurrent Pool across target Facebook sources.
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

  console.log('🔄 [Rental Radar] Starting Facebook Ingestion Cycle...');

  if (hasExistingSession()) {
    try {
      const context = await createPersistentContext(headless);
      const NUM_WORKERS = 4;
      const sourcesQueue = [...TARGET_FB_SOURCES];

      console.log(`🚀 [Playwright] Launching ${NUM_WORKERS} concurrent worker tabs across ${sourcesQueue.length} target Facebook sources...`);

      const workerPromises = Array.from({ length: NUM_WORKERS }, async () => {
        const page = await context.newPage();
        await enableFastNetworkInterception(page);
        const workerTotals = await drainSourcesQueue(sourcesQueue, page, seenUrls);
        scannedCount += workerTotals.scanned;
        matchedCount += workerTotals.matched;
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




