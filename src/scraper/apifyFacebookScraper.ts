import fs from 'fs';
import path from 'path';
import os from 'os';
import { ScrapedPost } from '../domain/types';
import { parseStorageState } from './browserSession';

export const DEFAULT_APIFY_FB_GROUPS = [
  'https://www.facebook.com/groups/1265072124774804/', // Flats & Flatmates Kadubeesanahalli / Bellandur
  'https://www.facebook.com/groups/flatandflatmatesbangalore/',
  'https://www.facebook.com/groups/flatswithoutbrokersbangalore/',
  'https://www.facebook.com/groups/kadubeesanahalliflats/',
  'https://www.facebook.com/groups/prestigetechparkrentals/',
];

/**
 * Retrieves Facebook cookies for Apify from environment or local storage.
 */
function getFbCookiesForApify(): any[] | undefined {
  if (process.env.APIFY_FB_COOKIES) {
    const parsed = parseStorageState(process.env.APIFY_FB_COOKIES);
    if (parsed?.cookies?.length) return parsed.cookies;
  }
  if (process.env.FB_SESSION_STORAGE) {
    const parsed = parseStorageState(process.env.FB_SESSION_STORAGE);
    if (parsed?.cookies?.length) return parsed.cookies;
  }
  const localPath = path.join(os.homedir(), '.fb_rental_profile', 'storageState.json');
  if (fs.existsSync(localPath)) {
    try {
      const state = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        return state.cookies;
      }
    } catch {
      // Ignore
    }
  }
  return undefined;
}

/**
 * Ingests recent Facebook group posts using the Apify Facebook Group Actor.
 * Uses Apify's rotating Indian residential proxy network to bypass datacenter IP walls.
 *
 * @param apiToken - Apify API token.
 * @param groupUrls - Optional target Facebook group URLs.
 * @returns Array of ScrapedPost records.
 */
export async function fetchFacebookViaApify(
  apiToken: string,
  groupUrls: string[] = DEFAULT_APIFY_FB_GROUPS
): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  if (!apiToken || apiToken.trim() === '') {
    console.log('ℹ️ [Apify] APIFY_API_TOKEN not configured. Skipping Apify Facebook actor run.');
    return posts;
  }

  try {
    const actorId = process.env.APIFY_ACTOR_ID || 'apify~facebook-groups-scraper';
    console.log(`🤖 [Apify] Dispatching ${actorId} via Indian Residential Proxies for ${groupUrls.length} groups...`);

    const endpoint = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(apiToken.trim())}&timeout=120`;

    const cookies = getFbCookiesForApify();
    const payload: any = {
      startUrls: groupUrls.map((url) => ({ url })),
      resultsLimit: Number(process.env.APIFY_RESULTS_LIMIT) || 20,
      viewOption: 'CHRONOLOGICAL',
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyCountry: 'IN', // Route via Indian Residential Proxy
      },
    };

    if (cookies && cookies.length > 0) {
      payload.cookies = cookies;
      console.log(`🍪 [Apify] Injected ${cookies.length} session cookies into Apify actor.`);
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`⚠️ [Apify] Scraper actor returned status ${res.status}: ${errText.slice(0, 200)}`);
      return posts;
    }

    const items: any = await res.json();
    if (!Array.isArray(items)) {
      console.warn('⚠️ [Apify] Expected array of dataset items but received:', typeof items);
      return posts;
    }

    console.log(`✅ [Apify] Successfully received ${items.length} raw Facebook posts from Apify.`);

    for (const item of items) {
      const rawText = item.text || item.postText || item.message || '';
      if (!rawText || rawText.trim().length < 15) continue;

      const postId = item.postId || item.id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const postUrl = item.url || item.postUrl || `https://www.facebook.com/groups/posts/${postId}`;
      const authorName = item.user?.name || item.authorName || item.userName || 'Facebook User';

      let postedTime = 'Just now';
      if (item.time) {
        const d = new Date(item.time);
        if (!isNaN(d.getTime())) {
          postedTime =
            d.toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }) + ' IST';
        }
      }

      let imageUrls: string[] = [];
      if (Array.isArray(item.images)) {
        for (const img of item.images) {
          if (typeof img === 'string') imageUrls.push(img);
          else if (img?.url) imageUrls.push(img.url);
          else if (img?.link) imageUrls.push(img.link);
        }
      }
      if (Array.isArray(item.media)) {
        for (const m of item.media) {
          if (typeof m === 'string') imageUrls.push(m);
          else if (m?.url) imageUrls.push(m.url);
          else if (m?.thumbnail) imageUrls.push(m.thumbnail);
        }
      }
      if (item.imageUrl) imageUrls.push(item.imageUrl);
      if (item.image) imageUrls.push(item.image);

      posts.push({
        postId,
        postUrl,
        authorName,
        postedTime,
        rawText,
        groupName: item.groupName || 'Facebook Group',
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
    }
  } catch (err: any) {
    console.warn('⚠️ [Apify] Error during Apify Facebook scrape:', err?.message || String(err));
  }

  return posts;
}
