import { ScrapedPost } from '../domain/types';

export const DEFAULT_APIFY_FB_GROUPS = [
  'https://www.facebook.com/groups/1265072124774804/', // Flats & Flatmates Kadubeesanahalli / Bellandur
  'https://www.facebook.com/groups/flatandflatmatesbangalore/',
  'https://www.facebook.com/groups/flatswithoutbrokersbangalore/',
  'https://www.facebook.com/groups/kadubeesanahalliflats/',
  'https://www.facebook.com/groups/prestigetechparkrentals/',
];

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
    console.log(`🤖 [Apify] Dispatching Facebook Groups Scraper actor via Indian Residential Proxies for ${groupUrls.length} groups...`);

    // Apify run-sync-get-dataset-items endpoint launches actor and waits for JSON results
    const endpoint = `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(apiToken.trim())}&timeout=120`;

    const payload = {
      startUrls: groupUrls.map((url) => ({ url })),
      resultsLimit: 15,
      viewOption: 'CHRONOLOGICAL',
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyCountry: 'IN', // Route via Indian Residential Proxy
      },
    };

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
